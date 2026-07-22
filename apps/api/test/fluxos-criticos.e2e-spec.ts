import type { INestApplication } from '@nestjs/common';
import {
  cadastrarEAprovarAfiliado,
  criarEleicaoTeste,
  criarImovelTeste,
  http,
  iniciarAppTeste,
  loginAdmin,
  type SessaoAfiliado,
} from './helpers/http';
import { gerarCpfValido } from './helpers/cpf';

describe('Fluxos críticos (e2e)', () => {
  let app: INestApplication;
  let tokenAdmin: string;

  beforeAll(async () => {
    app = await iniciarAppTeste();
    tokenAdmin = await loginAdmin(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Autenticação', () => {
    it('login admin retorna tokens', async () => {
      const senha = process.env.SEED_ADMIN_SENHA ?? 'Admin@123';
      const res = await http(app)
        .post('/auth/login')
        .send({ email: 'admin@sindprf.local', senha })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(res.body.user.role).toBe('ADMIN');
    });

    it('credenciais inválidas retornam 401', async () => {
      await http(app)
        .post('/auth/login')
        .send({ email: 'admin@sindprf.local', senha: 'senha-errada' })
        .expect(401);
    });
  });

  describe('Afiliados', () => {
    it('cadastro + aprovação admin libera acesso', async () => {
      const sufixo = Date.now().toString();
      const sessao = await cadastrarEAprovarAfiliado(app, tokenAdmin, sufixo, gerarCpfValido());

      const me = await http(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${sessao.accessToken}`)
        .expect(200);

      expect(me.body.afiliado.status).toBe('APROVADO');
    });
  });

  describe('Solicitação de aluguel', () => {
    it('afiliado aprovado abre solicitação com mensagem inicial', async () => {
      const sufixo = `sol-${Date.now()}`;
      const sessao = await cadastrarEAprovarAfiliado(app, tokenAdmin, sufixo, gerarCpfValido());
      const imovelId = await criarImovelTeste(app, tokenAdmin);

      const res = await http(app)
        .post('/solicitacoes')
        .set('Authorization', `Bearer ${sessao.accessToken}`)
        .send({
          imovelId,
          inicioDesejado: '2026-12-01T00:00:00.000Z',
          fimDesejado: '2026-12-07T23:59:59.000Z',
          mensagemInicial: 'Gostaria de reservar para férias.',
        })
        .expect(201);

      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.status).toBe('ABERTA');

      const mensagens = await http(app)
        .get(`/solicitacoes/${res.body.id}/mensagens`)
        .set('Authorization', `Bearer ${sessao.accessToken}`)
        .expect(200);

      expect(mensagens.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Eleição', () => {
    // Um único afiliado aprovado é reaproveitado entre os testes independentes
    // (cada um cria sua própria eleição, então não há conflito de comparecimento).
    // Evita estourar o rate limit de /auth/login (10 tentativas/60s).
    let afiliadoComum: SessaoAfiliado;

    beforeAll(async () => {
      afiliadoComum = await cadastrarEAprovarAfiliado(
        app,
        tokenAdmin,
        `eleicao-comum-${Date.now()}`,
        gerarCpfValido(),
      );
    });

    async function criarChapaHomologada(
      eleicaoId: string,
      numero: number,
      nome: string,
    ): Promise<string> {
      const res = await http(app)
        .post(`/eleicoes/${eleicaoId}/chapas`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ numero, nome })
        .expect(201);
      const chapaId = res.body.id as string;

      await http(app)
        .patch(`/eleicoes/${eleicaoId}/chapas/${chapaId}/homologar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'HOMOLOGADA', justificativa: 'Documentação completa e regular.' })
        .expect(200);

      return chapaId;
    }

    async function sincronizarEAbrir(eleicaoId: string): Promise<void> {
      await http(app)
        .post(`/eleicoes/${eleicaoId}/elegiveis/sincronizar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);
      await http(app)
        .post(`/eleicoes/${eleicaoId}/abrir`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);
    }

    it('fluxo feliz completo: homologação, voto, encerramento e apuração', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      const chapa1 = await criarChapaHomologada(eleicaoId, 1, 'Chapa Renovação');
      await criarChapaHomologada(eleicaoId, 2, 'Chapa Alternativa');

      await sincronizarEAbrir(eleicaoId);

      const statusAntes = await http(app)
        .get(`/eleicoes/${eleicaoId}/meu-status`)
        .set('Authorization', `Bearer ${afiliadoComum.accessToken}`)
        .expect(200);
      expect(statusAntes.body).toMatchObject({ elegivel: true, jaVotou: false });

      const votoRes = await http(app)
        .post(`/eleicoes/${eleicaoId}/votar`)
        .set('Authorization', `Bearer ${afiliadoComum.accessToken}`)
        .send({ chapaId: chapa1 })
        .expect(201);
      expect(votoRes.body.protocolo).toEqual(expect.any(String));

      const statusDepois = await http(app)
        .get(`/eleicoes/${eleicaoId}/meu-status`)
        .set('Authorization', `Bearer ${afiliadoComum.accessToken}`)
        .expect(200);
      expect(statusDepois.body).toMatchObject({
        jaVotou: true,
        protocolo: votoRes.body.protocolo,
      });

      await http(app)
        .post(`/eleicoes/${eleicaoId}/votar`)
        .set('Authorization', `Bearer ${afiliadoComum.accessToken}`)
        .send({ chapaId: chapa1 })
        .expect(409);

      await http(app)
        .post(`/eleicoes/${eleicaoId}/encerrar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      const apuracaoRes = await http(app)
        .post(`/eleicoes/${eleicaoId}/apurar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      expect(apuracaoRes.body.porAclamacao).toBe(false);
      expect(apuracaoRes.body.totalVotos).toBe(1);
      const resultadoChapa1 = apuracaoRes.body.resultados.find(
        (item: { chapaId: string }) => item.chapaId === chapa1,
      );
      expect(resultadoChapa1).toMatchObject({ totalVotos: 1, percentual: 100 });
    });

    it('dois votos concorrentes do mesmo afiliado: só um é gravado', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      const chapa1 = await criarChapaHomologada(eleicaoId, 1, 'Chapa Única Concorrência');

      await sincronizarEAbrir(eleicaoId);

      const votar = () =>
        http(app)
          .post(`/eleicoes/${eleicaoId}/votar`)
          .set('Authorization', `Bearer ${afiliadoComum.accessToken}`)
          .send({ chapaId: chapa1 });

      const [primeiro, segundo] = await Promise.all([votar(), votar()]);
      const statuses = [primeiro.status, segundo.status].sort();
      expect(statuses).toEqual([201, 409]);
    });

    it('abrir() bloqueado enquanto houver chapa não homologada', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      await http(app)
        .post(`/eleicoes/${eleicaoId}/chapas`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ numero: 1, nome: 'Chapa Pendente' })
        .expect(201);

      await http(app)
        .post(`/eleicoes/${eleicaoId}/abrir`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(409);
    });

    it('impugnação deferida vira chapa não homologada automaticamente', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      const chapa1 = await criarChapaHomologada(eleicaoId, 1, 'Chapa Impugnada');

      const contestacaoRes = await http(app)
        .post(`/eleicoes/${eleicaoId}/chapas/${chapa1}/contestacoes`)
        .set('Authorization', `Bearer ${afiliadoComum.accessToken}`)
        .send({ motivo: 'Candidato não cumpre o tempo mínimo de filiação exigido pelo estatuto.' })
        .expect(201);
      expect(contestacaoRes.body.tipo).toBe('IMPUGNACAO');

      await http(app)
        .patch(`/eleicoes/${eleicaoId}/contestacoes/${contestacaoRes.body.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'DEFERIDA', decisao: 'Procede: documentação comprova filiação insuficiente.' })
        .expect(200);

      const detalhe = await http(app)
        .get(`/eleicoes/admin/${eleicaoId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      const chapaAtualizada = detalhe.body.chapas.find(
        (item: { id: string }) => item.id === chapa1,
      );
      expect(chapaAtualizada.status).toBe('NAO_HOMOLOGADA');
    });

    it('chapa única homologada é resolvida por aclamação, sem votação', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      const chapaUnica = await criarChapaHomologada(eleicaoId, 1, 'Chapa Única Aclamação');

      const aclamacaoRes = await http(app)
        .post(`/eleicoes/${eleicaoId}/aclamacao`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ chapaId: chapaUnica })
        .expect(201);
      expect(aclamacaoRes.body.porAclamacao).toBe(true);
      const resultadoChapaUnica = aclamacaoRes.body.resultados.find(
        (item: { chapaId: string }) => item.chapaId === chapaUnica,
      );
      expect(resultadoChapaUnica).toMatchObject({ percentual: 100 });

      const resultadoRes = await http(app)
        .get(`/eleicoes/${eleicaoId}/resultado`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(resultadoRes.body.porAclamacao).toBe(true);

      await http(app)
        .post(`/eleicoes/${eleicaoId}/votar`)
        .set('Authorization', `Bearer ${afiliadoComum.accessToken}`)
        .send({ chapaId: chapaUnica })
        .expect(409);
    });

    it('afiliado fora da lista de elegíveis não pode votar', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      const chapa1 = await criarChapaHomologada(eleicaoId, 1, 'Chapa Elegibilidade');

      await http(app)
        .post(`/eleicoes/${eleicaoId}/abrir`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      await http(app)
        .post(`/eleicoes/${eleicaoId}/votar`)
        .set('Authorization', `Bearer ${afiliadoComum.accessToken}`)
        .send({ chapaId: chapa1 })
        .expect(403);
    });

    it('afiliado pendente (não aprovado) não acessa rotas de votação', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      const sufixo = `eleicao-pendente-${Date.now()}`;
      const cpf = gerarCpfValido();
      const email = `e2e.${sufixo}@test.local`;

      await http(app)
        .post('/afiliados/cadastro')
        .send({
          nome: `Afiliado E2E ${sufixo}`,
          cpf,
          matricula: `E2E${sufixo.slice(-6)}`,
          telefone: '85999990000',
          email,
          senha: 'Senha@1234',
        })
        .expect(201);

      const login = await http(app)
        .post('/auth/login')
        .send({ email, senha: 'Senha@1234' })
        .expect(200);
      const tokenPendente = login.body.accessToken as string;

      await http(app)
        .get(`/eleicoes/${eleicaoId}/meu-status`)
        .set('Authorization', `Bearer ${tokenPendente}`)
        .expect(403);
    });

    it('resultado não vaza durante ABERTA, nem para admin', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      await criarChapaHomologada(eleicaoId, 1, 'Chapa Sigilo');
      await sincronizarEAbrir(eleicaoId);

      await http(app)
        .get(`/eleicoes/${eleicaoId}/resultado`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(409);
    });

    it('transições inválidas retornam 409', async () => {
      const eleicaoId = await criarEleicaoTeste(app, tokenAdmin);
      await criarChapaHomologada(eleicaoId, 1, 'Chapa Transição');

      await http(app)
        .post(`/eleicoes/${eleicaoId}/apurar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(409);

      await sincronizarEAbrir(eleicaoId);

      await http(app)
        .post(`/eleicoes/${eleicaoId}/abrir`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(409);

      await http(app)
        .post(`/eleicoes/${eleicaoId}/encerrar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      await http(app)
        .post(`/eleicoes/${eleicaoId}/apurar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      await http(app)
        .post(`/eleicoes/${eleicaoId}/abrir`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(409);
    });
  });
});
