import { zodResolver } from '@hookform/resolvers/zod';
import { cadastroAfiliadoSchema, type CadastroAfiliadoInput } from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Logo } from '../../../components/ui/Logo';
import { filiacao } from '../../../lib/filiacao';
import { marca } from '../../../lib/marca';
import { useSeo } from '../../../lib/seo';
import { useCadastroAfiliado } from '../hooks';

const etapas = [
  {
    titulo: 'Cadastro no sistema',
    texto: 'Preencha identificação e crie a senha de acesso.',
  },
  {
    titulo: 'Documentação na secretaria',
    texto: 'Leve os formulários e documentos listados abaixo à sede.',
  },
  {
    titulo: 'Acesso liberado',
    texto: 'Após a aprovação, entre com o e-mail e a senha cadastrados.',
  },
] as const;

function mensagemDeErro(erro: unknown): string {
  if (isAxiosError(erro) && erro.response?.status === 409) {
    return 'Este e-mail, CPF ou matrícula já está cadastrado. Se já solicitou afiliação, aguarde a análise ou entre em contato com o sindicato.';
  }
  if (isAxiosError(erro) && erro.response?.status === 400) {
    return 'Há campos inválidos. Confira o CPF (11 dígitos) e preencha todos os obrigatórios.';
  }
  return 'Não foi possível enviar a solicitação. Verifique a conexão e tente de novo.';
}

function normalizarCadastro(dados: CadastroAfiliadoInput): CadastroAfiliadoInput {
  const telefone = dados.telefone?.replace(/\D/g, '');
  return {
    ...dados,
    nome: dados.nome.trim(),
    matricula: dados.matricula.trim(),
    email: dados.email.trim().toLowerCase(),
    telefone: telefone && telefone.length > 0 ? telefone : undefined,
  };
}

export function CadastroAfiliadoPage() {
  useSeo({
    title: `Solicitar afiliação | ${marca.nome}`,
    description: `Cadastro de afiliado do ${marca.nomeCompleto}.`,
  });

  const cadastro = useCadastroAfiliado();
  const [sucesso, setSucesso] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CadastroAfiliadoInput>({
    resolver: zodResolver(cadastroAfiliadoSchema),
  });

  return (
    <main className="cadastro-page">
      <aside className="cadastro-painel" aria-label="Sobre a afiliação">
        <div className="cadastro-painel-topo">
          <Link to="/" className="cadastro-voltar">
            ← Voltar ao site
          </Link>
          <Logo variante="auth" />
          <p className="cadastro-marca">{marca.nome}</p>
          <h1 className="cadastro-painel-titulo">Afiliação ao sindicato</h1>
          <p className="cadastro-painel-texto">
            Filie-se ao {marca.nome} e participe da luta da categoria. O formulário abaixo inicia o
            cadastro no sistema; a filiação se completa com a entrega dos documentos na secretaria (
            {filiacao.sede.endereco}).
          </p>
        </div>

        <ol className="cadastro-etapas">
          {etapas.map((etapa, indice) => {
            const feita = sucesso && indice === 0;
            const atual = !sucesso && indice === 0;
            return (
              <li
                key={etapa.titulo}
                className={[
                  'cadastro-etapa',
                  feita ? 'cadastro-etapa--feita' : '',
                  atual ? 'cadastro-etapa--atual' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="cadastro-etapa-indice" aria-hidden="true">
                  {feita ? '✓' : indice + 1}
                </span>
                <div>
                  <strong>{etapa.titulo}</strong>
                  <p>{etapa.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <section className="cadastro-docs" aria-label="Documentos necessários">
          <h2 className="cadastro-docs-titulo">Documentos necessários</h2>
          <p className="cadastro-docs-intro">
            Faça o download dos formulários e compareça à secretaria com as cópias abaixo.
          </p>

          <p className="cadastro-docs-subtitulo">Formulários</p>
          <ul className="cadastro-docs-lista">
            {filiacao.formularios.map((item) => (
              <li key={item.url}>
                <a href={item.url} download>
                  {item.rotulo}
                </a>
              </li>
            ))}
          </ul>

          <p className="cadastro-docs-subtitulo">Levar na secretaria</p>
          <ul className="cadastro-docs-lista">
            {filiacao.documentos.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p className="cadastro-docs-contato">
            Dúvidas: {filiacao.contato.telefones.join(' / ')}
            <br />
            <a href={`mailto:${filiacao.contato.email}`}>{filiacao.contato.email}</a>
          </p>
        </section>
      </aside>

      <section className="cadastro-conteudo">
        {sucesso ? (
          <div className="cadastro-sucesso">
            <p className="eyebrow">Solicitação recebida</p>
            <h2>Cadastro enviado para análise</h2>
            <p>
              Guardamos seus dados com status pendente. Complete a filiação levando os formulários e
              documentos à secretaria do {marca.nome}. O acesso ao sistema é liberado após a
              aprovação.
            </p>
            <div className="cadastro-sucesso-acoes">
              <Link to="/login" className="botao-primario">
                Ir para o login
              </Link>
              <Link to="/" className="botao-secundario">
                Voltar ao site
              </Link>
            </div>
          </div>
        ) : (
          <>
            <header className="cadastro-cabecalho">
              <p className="eyebrow">Nova afiliação</p>
              <h2>Solicitar afiliação</h2>
              <p>
                Preencha com os mesmos dados da sua identificação funcional. Campos com * são
                obrigatórios. Em seguida, baixe os formulários e leve a documentação à secretaria —
                a lista completa está no painel de filiação.
              </p>
            </header>

            <form
              className="cadastro-form"
              onSubmit={handleSubmit((dados) =>
                cadastro.mutate(normalizarCadastro(dados), {
                  onSuccess: () => setSucesso(true),
                }),
              )}
              noValidate
            >
              <div className="cadastro-formulario">
                <fieldset className="cadastro-grupo">
                  <legend>Identificação</legend>
                  <div className="cadastro-grade">
                    <label className="cadastro-campo-cheio">
                      Nome completo *
                      <input type="text" autoComplete="name" {...register('nome')} />
                      {errors.nome && <span className="erro">{errors.nome.message}</span>}
                    </label>

                    <label>
                      CPF *
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="000.000.000-00"
                        {...register('cpf')}
                      />
                      {errors.cpf && <span className="erro">{errors.cpf.message}</span>}
                    </label>

                    <label>
                      Matrícula PRF *
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="Número da matrícula"
                        {...register('matricula')}
                      />
                      {errors.matricula && <span className="erro">{errors.matricula.message}</span>}
                    </label>
                  </div>
                </fieldset>

                <fieldset className="cadastro-grupo">
                  <legend>Contato</legend>
                  <div className="cadastro-grade">
                    <label>
                      Telefone
                      <input
                        type="tel"
                        autoComplete="tel"
                        placeholder="(85) 90000-0000"
                        {...register('telefone', {
                          setValueAs: (valor: string) => {
                            const limpo = valor.replace(/\D/g, '');
                            return limpo.length > 0 ? limpo : undefined;
                          },
                        })}
                      />
                      {errors.telefone && <span className="erro">{errors.telefone.message}</span>}
                    </label>

                    <label>
                      E-mail *
                      <input type="email" autoComplete="email" {...register('email')} />
                      {errors.email && <span className="erro">{errors.email.message}</span>}
                    </label>
                  </div>
                </fieldset>

                <fieldset className="cadastro-grupo">
                  <legend>Acesso</legend>
                  <div className="cadastro-grade">
                    <label className="cadastro-campo-cheio">
                      Senha *
                      <input
                        type="password"
                        autoComplete="new-password"
                        {...register('senha')}
                      />
                      <span className="campo-ajuda">
                        Mínimo de 8 caracteres. Use-a após a aprovação.
                      </span>
                      {errors.senha && <span className="erro">{errors.senha.message}</span>}
                    </label>
                  </div>
                </fieldset>

                {cadastro.isError && (
                  <p className="erro cadastro-erro-form" role="alert">
                    {mensagemDeErro(cadastro.error)}
                  </p>
                )}

                <div className="cadastro-acoes">
                  <button type="submit" className="botao-primario" disabled={cadastro.isPending}>
                    {cadastro.isPending ? 'Enviando solicitação…' : 'Solicitar afiliação'}
                  </button>
                  <p className="cadastro-rodape-form">
                    Já tem cadastro? <Link to="/login">Entrar</Link>
                  </p>
                </div>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
