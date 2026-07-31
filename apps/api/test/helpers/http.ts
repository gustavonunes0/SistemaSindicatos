import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarApp } from '../../src/bootstrap';

export async function iniciarAppTeste(): Promise<INestApplication> {
  return criarApp();
}

export function http(app: INestApplication) {
  return request(app.getHttpServer());
}

export async function loginAdmin(app: INestApplication): Promise<string> {
  const senha = process.env.SEED_ADMIN_SENHA ?? 'Admin@123';
  const res = await http(app)
    .post('/auth/login')
    .send({ login: 'admin@sindprf.local', senha })
    .expect(200);

  return res.body.accessToken as string;
}

export async function criarImovelTeste(
  app: INestApplication,
  tokenAdmin: string,
): Promise<string> {
  const res = await http(app)
    .post('/imoveis')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({
      titulo: 'Apartamento teste E2E',
      descricao: 'Imóvel criado automaticamente nos testes de integração.',
      endereco: 'Rua Teste, 100 — Fortaleza/CE',
      valor: 150,
      comodidades: ['Wi-Fi'],
      ativo: true,
    })
    .expect(201);

  return res.body.id as string;
}

export async function criarEleicaoTeste(
  app: INestApplication,
  tokenAdmin: string,
): Promise<string> {
  const agora = Date.now();
  const res = await http(app)
    .post('/eleicoes')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({
      titulo: 'Eleição teste E2E',
      inicio: new Date(agora - 60_000).toISOString(),
      fim: new Date(agora + 60 * 60_000).toISOString(),
    })
    .expect(201);

  return res.body.id as string;
}

export type SessaoAfiliado = {
  accessToken: string;
  afiliadoId: string;
  email: string;
};

export async function cadastrarEAprovarAfiliado(
  app: INestApplication,
  tokenAdmin: string,
  sufixo: string,
  cpf: string,
): Promise<SessaoAfiliado> {
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

  const lista = await http(app)
    .get('/afiliados')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .expect(200);

  const afiliado = (lista.body as { id: string; user: { email: string } }[]).find(
    (item) => item.user.email === email,
  );
  if (!afiliado) {
    throw new Error('Afiliado de teste não encontrado após cadastro');
  }

  await http(app)
    .patch(`/afiliados/${afiliado.id}/status`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ status: 'APROVADO' })
    .expect(200);

  const login = await http(app)
    .post('/auth/login')
    .send({ login: cpf, senha: 'Senha@1234' })
    .expect(200);

  return {
    accessToken: login.body.accessToken as string,
    afiliadoId: afiliado.id,
    email,
  };
}
