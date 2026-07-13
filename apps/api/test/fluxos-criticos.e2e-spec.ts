import type { INestApplication } from '@nestjs/common';
import {
  cadastrarEAprovarAfiliado,
  criarImovelTeste,
  http,
  iniciarAppTeste,
  loginAdmin,
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

  describe.skip('Eleição (módulo pendente — Fase 4)', () => {
    it('segundo voto do mesmo afiliado retorna 409', () => {
      // Implementar quando o módulo eleicao estiver disponível.
    });
  });
});
