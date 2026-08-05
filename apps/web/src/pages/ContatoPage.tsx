import { zodResolver } from '@hookform/resolvers/zod';
import {
  CONTATO_ASSUNTO_ROTULO,
  enviarContatoResultadoSchema,
  enviarContatoSchema,
  type ContatoAssunto,
  type EnviarContatoInput,
} from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../lib/http';
import { telefonePrincipalTel, useMarca } from '../lib/marca';
import { useSeo } from '../lib/seo';

const assuntos = Object.entries(CONTATO_ASSUNTO_ROTULO) as Array<[ContatoAssunto, string]>;

function mensagemErro(erro: unknown): string {
  if (isAxiosError(erro)) {
    const data = erro.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (erro.response?.status === 503) {
      return 'O envio por e-mail está temporariamente indisponível. Use os canais ao lado.';
    }
  }
  return 'Não foi possível enviar a mensagem. Verifique a conexão e tente de novo.';
}

export function ContatoPage() {
  const marca = useMarca();
  useSeo({
    title: `Contato — ${marca.nome}`,
    description: `Fale com o ${marca.nomeCompleto}. Envie uma mensagem ou use telefone e e-mail.`,
  });

  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnviarContatoInput>({
    resolver: zodResolver(enviarContatoSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      assunto: 'duvida',
      mensagem: '',
    },
  });

  async function onSubmit(dados: EnviarContatoInput) {
    setSucesso(null);
    setErroEnvio(null);
    try {
      const { data } = await api.post('/contato', dados);
      const resultado = enviarContatoResultadoSchema.parse(data);
      setSucesso(resultado.message);
      reset({ nome: '', email: '', telefone: '', assunto: 'duvida', mensagem: '' });
    } catch (erro) {
      setErroEnvio(mensagemErro(erro));
    }
  }

  return (
    <main className="contato-page">
      <section className="contato-hero" aria-labelledby="contato-titulo">
        <div className="contato-hero-inner">
          <p className="eyebrow contato-hero-eyebrow">SINDPRF-CE</p>
          <h1 id="contato-titulo">Contato</h1>
          <span className="contato-faixa" aria-hidden="true" />
          <p className="contato-hero-texto">
            Fale com a equipe do sindicato. Envie sua mensagem pelo formulário ou use os canais
            oficiais.
          </p>
        </div>
      </section>

      <section className="secao contato-secao">
        <div className="secao-inner contato-layout">
          <div className="contato-form-painel">
            <header className="contato-form-cabecalho">
              <p className="eyebrow">Mensagem</p>
              <h2>Fale conosco</h2>
              <p>
                Preencha os campos abaixo. Respondemos no e-mail informado, em horário comercial.
              </p>
            </header>

            <form
              className="contato-form"
              onSubmit={(event) => {
                void handleSubmit(onSubmit)(event);
              }}
              noValidate
            >
              <div className="contato-form-grid">
                <label>
                  Nome completo
                  <input type="text" autoComplete="name" {...register('nome')} />
                  {errors.nome && <span className="erro">{errors.nome.message}</span>}
                </label>

                <label>
                  E-mail
                  <input type="email" autoComplete="email" {...register('email')} />
                  {errors.email && <span className="erro">{errors.email.message}</span>}
                </label>

                <label>
                  Telefone <span className="contato-opcional">(opcional)</span>
                  <input type="tel" autoComplete="tel" {...register('telefone')} />
                  {errors.telefone && <span className="erro">{errors.telefone.message}</span>}
                </label>

                <label>
                  Assunto
                  <select {...register('assunto')}>
                    {assuntos.map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                  {errors.assunto && <span className="erro">{errors.assunto.message}</span>}
                </label>

                <label className="contato-form-mensagem">
                  Mensagem
                  <textarea rows={6} {...register('mensagem')} />
                  {errors.mensagem && <span className="erro">{errors.mensagem.message}</span>}
                </label>
              </div>

              {erroEnvio && <p className="erro">{erroEnvio}</p>}
              {sucesso && (
                <p className="contato-sucesso" role="status">
                  {sucesso}
                </p>
              )}

              <div className="contato-form-acoes">
                <button type="submit" className="botao-primario" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando…' : 'Enviar mensagem'}
                </button>
                <a className="botao-secundario" href={`mailto:${marca.contato.email}`}>
                  Abrir e-mail
                </a>
              </div>
            </form>
          </div>

          <aside className="contato-canais" aria-label="Canais de atendimento">
            <div className="contato-canal">
              <h3>E-mail</h3>
              <p>
                <a href={`mailto:${marca.contato.email}`}>{marca.contato.email}</a>
              </p>
            </div>

            <div className="contato-canal">
              <h3>Telefones</h3>
              <ul className="contato-telefones">
                {marca.contato.telefones.map((telefone, indice) => (
                  <li key={telefone}>
                    {indice === 0 ? (
                      <a href={`tel:${telefonePrincipalTel(marca)}`}>{telefone}</a>
                    ) : (
                      telefone
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="contato-canal">
              <h3>Sede</h3>
              <p>{marca.sede.endereco}</p>
              <p>CEP {marca.sede.cep}</p>
            </div>

            <div className="contato-canal contato-canal--horario">
              <h3>Horário</h3>
              <p>Segunda a sexta, das 8h às 17h</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
