import { zodResolver } from '@hookform/resolvers/zod';
import {
  cadastroAfiliadoSchema,
  ESTADO_CIVIL_ROTULO,
  TIPO_DOCUMENTO_FILIACAO_ROTULO,
  ufSchema,
  type CadastroAfiliadoInput,
  type EstadoCivil,
  type TipoDocumentoFiliacao,
} from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import { Logo } from '../../../components/ui/Logo';
import { useMarca } from '../../../lib/marca';
import { useSeo } from '../../../lib/seo';
import type { DocumentosCadastro } from '../api';
import { useCadastroAfiliado } from '../hooks';

type CadastroFormValues = z.input<typeof cadastroAfiliadoSchema>;

const etapas = [
  {
    titulo: 'Cadastro no sistema',
    texto: 'Preencha identificação e crie a senha de acesso.',
  },
  {
    titulo: 'Documentação para análise',
    texto: 'Anexe as cópias nesta página para o sindicato conferir.',
  },
  {
    titulo: 'Acesso liberado',
    texto: 'Após a aprovação, entre com o e-mail e a senha cadastrados.',
  },
] as const;

const TIPOS_DOCUMENTO = Object.entries(TIPO_DOCUMENTO_FILIACAO_ROTULO) as [
  TipoDocumentoFiliacao,
  string,
][];
const ESTADOS_CIVIS = Object.entries(ESTADO_CIVIL_ROTULO) as [EstadoCivil, string][];
const UFS = ufSchema.options;
const DOCUMENTO_MAX_BYTES = 8 * 1024 * 1024;
const MIMES_DOCUMENTO = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function mensagemDeErro(erro: unknown): string {
  if (isAxiosError(erro) && erro.response?.status === 409) {
    return 'Este e-mail, CPF ou matrícula já está cadastrado. Se já solicitou filiação, aguarde a análise ou entre em contato com o sindicato.';
  }
  if (isAxiosError(erro) && erro.response?.status === 400) {
    return 'Há campos inválidos. Confira o CPF (11 dígitos) e preencha todos os obrigatórios.';
  }
  return 'Não foi possível enviar a solicitação. Verifique a conexão e tente de novo.';
}

function DocumentosNecessarios({
  endereco,
  cep,
  formularios,
  documentos,
  telefones,
  email,
}: {
  endereco: string;
  cep: string;
  formularios: { url: string; rotulo: string }[];
  documentos: string[];
  telefones: string[];
  email: string;
}) {
  return (
    <section className="cadastro-docs cadastro-docs--conteudo" aria-label="Documentos necessários">
      <h2 className="cadastro-docs-titulo">Documentos necessários</h2>
      <p className="cadastro-docs-intro">
        Baixe os formulários necessários e anexe as cópias no cadastro. A secretaria poderá pedir
        a apresentação dos originais em {endereco}. CEP {cep}.
      </p>

      <div className="cadastro-docs-colunas">
        <div>
          <p className="cadastro-docs-subtitulo">Formulários</p>
          <ul className="cadastro-docs-lista">
            {formularios.map((item) => (
              <li key={item.url}>
                <a href={item.url} download>
                  {item.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="cadastro-docs-subtitulo">Anexar para análise</p>
          <ul className="cadastro-docs-lista">
            {documentos.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="cadastro-docs-contato">
        Dúvidas: {telefones.join(' / ')} · <a href={`mailto:${email}`}>{email}</a>
      </p>
    </section>
  );
}

export function CadastroAfiliadoPage() {
  const marca = useMarca();
  const filiacao = marca.filiacao;
  const formularios = filiacao?.formularios ?? [];
  const documentos = filiacao?.documentos ?? [];

  useSeo({
    title: `Solicitar filiação | ${marca.nome}`,
    description: `Cadastro de afiliado do ${marca.nomeCompleto}.`,
  });

  const cadastro = useCadastroAfiliado();
  const [sucesso, setSucesso] = useState(false);
  const [documentosCadastro, setDocumentosCadastro] = useState<DocumentosCadastro>({});
  const [erroDocumento, setErroDocumento] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CadastroFormValues, unknown, CadastroAfiliadoInput>({
    resolver: zodResolver(cadastroAfiliadoSchema),
    defaultValues: { dependentes: [], aceiteEstatuto: false },
  });
  const dependentes = useFieldArray({ control, name: 'dependentes' });

  const docsProps = {
    endereco: marca.sede.endereco,
    cep: marca.sede.cep,
    formularios,
    documentos,
    telefones: marca.contato.telefones,
    email: marca.contato.email,
  };

  const selecionarDocumento = (tipo: TipoDocumentoFiliacao, arquivo?: File): boolean => {
    setErroDocumento(null);
    if (!arquivo) {
      setDocumentosCadastro((atual) => {
        const proximo = { ...atual };
        delete proximo[tipo];
        return proximo;
      });
      return true;
    }
    if (!MIMES_DOCUMENTO.has(arquivo.type)) {
      setErroDocumento('Envie os documentos em PDF, JPG, PNG ou WebP.');
      return false;
    }
    if (arquivo.size > DOCUMENTO_MAX_BYTES) {
      setErroDocumento(`O arquivo “${arquivo.name}” ultrapassa o limite de 8 MB.`);
      return false;
    }
    setDocumentosCadastro((atual) => ({ ...atual, [tipo]: arquivo }));
    return true;
  };

  return (
    <main className="cadastro-page">
      <aside className="cadastro-painel" aria-label="Sobre a filiação">
        <div className="cadastro-painel-topo">
          <Link to="/" className="cadastro-voltar">
            ← Voltar ao site
          </Link>
          <Logo variante="auth" />
          <p className="cadastro-marca">{marca.nome}</p>
          <h1 className="cadastro-painel-titulo">Afiliação ao sindicato</h1>
          <p className="cadastro-painel-texto">
            Filie-se ao {marca.nome} e participe da luta da categoria. Preencha seus dados e envie
            a documentação necessária para análise do sindicato.
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
      </aside>

      <section className="cadastro-conteudo">
        {sucesso ? (
          <div className="cadastro-sucesso">
            <p className="eyebrow">Solicitação recebida</p>
            <h2>Cadastro enviado para análise</h2>
            <p>
              Guardamos seus dados e documentos com status pendente. O {marca.nome} fará a análise
              e poderá solicitar os originais. O acesso ao sistema é liberado após a aprovação.
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
              <p className="eyebrow">Nova filiação</p>
              <h2>Solicitar filiação</h2>
              <p>
                Preencha com os mesmos dados da sua identificação funcional. Campos com * são
                obrigatórios.
              </p>
            </header>

            <div className="cadastro-corpo">
              <DocumentosNecessarios {...docsProps} />

              <form
                className="cadastro-form"
                onSubmit={handleSubmit((dados) =>
                  cadastro.mutate(
                    { dados, documentos: documentosCadastro },
                    { onSuccess: () => setSucesso(true) },
                  ),
                )}
                noValidate
              >
                <div className="cadastro-formulario">
                  <fieldset className="cadastro-grupo">
                    <legend>Dados pessoais</legend>
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
                        Data de nascimento *
                        <input type="date" autoComplete="bday" {...register('dataNascimento')} />
                        {errors.dataNascimento && (
                          <span className="erro">{errors.dataNascimento.message}</span>
                        )}
                      </label>

                      <label>
                        RG *
                        <input type="text" autoComplete="off" {...register('rg')} />
                        {errors.rg && <span className="erro">{errors.rg.message}</span>}
                      </label>

                      <label>
                        Órgão expedidor *
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="SSP/CE"
                          {...register('orgaoExpedidor')}
                        />
                        {errors.orgaoExpedidor && (
                          <span className="erro">{errors.orgaoExpedidor.message}</span>
                        )}
                      </label>

                      <label>
                        Naturalidade *
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Cidade onde nasceu"
                          {...register('naturalidade')}
                        />
                        {errors.naturalidade && (
                          <span className="erro">{errors.naturalidade.message}</span>
                        )}
                      </label>

                      <label>
                        Estado civil *
                        <select defaultValue="" {...register('estadoCivil')}>
                          <option value="" disabled>
                            Selecione…
                          </option>
                          {ESTADOS_CIVIS.map(([valor, rotulo]) => (
                            <option key={valor} value={valor}>
                              {rotulo}
                            </option>
                          ))}
                        </select>
                        {errors.estadoCivil && (
                          <span className="erro">{errors.estadoCivil.message}</span>
                        )}
                      </label>

                      <label>
                        Cônjuge
                        <input type="text" autoComplete="off" {...register('conjuge')} />
                        {errors.conjuge && <span className="erro">{errors.conjuge.message}</span>}
                      </label>

                      <label>
                        Nome da mãe *
                        <input type="text" autoComplete="off" {...register('nomeMae')} />
                        {errors.nomeMae && <span className="erro">{errors.nomeMae.message}</span>}
                      </label>

                      <label>
                        Nome do pai
                        <input type="text" autoComplete="off" {...register('nomePai')} />
                        {errors.nomePai && <span className="erro">{errors.nomePai.message}</span>}
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="cadastro-grupo">
                    <legend>Endereço</legend>
                    <div className="cadastro-grade">
                      <label className="cadastro-campo-cheio">
                        Logradouro e número *
                        <input
                          type="text"
                          autoComplete="street-address"
                          placeholder="Rua, avenida, número"
                          {...register('endereco')}
                        />
                        {errors.endereco && <span className="erro">{errors.endereco.message}</span>}
                      </label>

                      <label>
                        Complemento
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Apto, bloco"
                          {...register('complemento')}
                        />
                        {errors.complemento && (
                          <span className="erro">{errors.complemento.message}</span>
                        )}
                      </label>

                      <label>
                        Bairro *
                        <input type="text" autoComplete="off" {...register('bairro')} />
                        {errors.bairro && <span className="erro">{errors.bairro.message}</span>}
                      </label>

                      <label>
                        Cidade *
                        <input type="text" autoComplete="address-level2" {...register('cidade')} />
                        {errors.cidade && <span className="erro">{errors.cidade.message}</span>}
                      </label>

                      <label>
                        UF *
                        <select defaultValue="" {...register('uf')}>
                          <option value="" disabled>
                            Selecione…
                          </option>
                          {UFS.map((sigla) => (
                            <option key={sigla} value={sigla}>
                              {sigla}
                            </option>
                          ))}
                        </select>
                        {errors.uf && <span className="erro">{errors.uf.message}</span>}
                      </label>

                      <label>
                        CEP *
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          placeholder="60000-000"
                          {...register('cep')}
                        />
                        {errors.cep && <span className="erro">{errors.cep.message}</span>}
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="cadastro-grupo">
                    <legend>Dados funcionais</legend>
                    <div className="cadastro-grade">
                      <label>
                        Matrícula PRF *
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Número da matrícula"
                          {...register('matricula')}
                        />
                        {errors.matricula && (
                          <span className="erro">{errors.matricula.message}</span>
                        )}
                      </label>

                      <label>
                        Data de admissão *
                        <input type="date" {...register('dataAdmissao')} />
                        {errors.dataAdmissao && (
                          <span className="erro">{errors.dataAdmissao.message}</span>
                        )}
                      </label>

                      <label>
                        Lotação SIAPE *
                        <input type="text" autoComplete="off" {...register('lotacaoSiape')} />
                        {errors.lotacaoSiape && (
                          <span className="erro">{errors.lotacaoSiape.message}</span>
                        )}
                      </label>

                      <label>
                        Lotação de atividade
                        <input type="text" autoComplete="off" {...register('lotacaoAtividade')} />
                        {errors.lotacaoAtividade && (
                          <span className="erro">{errors.lotacaoAtividade.message}</span>
                        )}
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="cadastro-grupo">
                    <legend>Contato</legend>
                    <div className="cadastro-grade">
                      <label>
                        Celular *
                        <input
                          type="tel"
                          autoComplete="tel"
                          placeholder="(85) 90000-0000"
                          {...register('celular')}
                        />
                        {errors.celular && <span className="erro">{errors.celular.message}</span>}
                      </label>

                      <label>
                        Celular 2
                        <input type="tel" autoComplete="off" {...register('celular2')} />
                        {errors.celular2 && <span className="erro">{errors.celular2.message}</span>}
                      </label>

                      <label>
                        Telefone fixo
                        <input
                          type="tel"
                          autoComplete="off"
                          placeholder="(85) 3000-0000"
                          {...register('telefone')}
                        />
                        {errors.telefone && (
                          <span className="erro">{errors.telefone.message}</span>
                        )}
                      </label>

                      <label>
                        E-mail pessoal *
                        <input type="email" autoComplete="email" {...register('email')} />
                        <span className="campo-ajuda">É com ele que você entra no sistema.</span>
                        {errors.email && <span className="erro">{errors.email.message}</span>}
                      </label>

                      <label>
                        E-mail funcional
                        <input type="email" autoComplete="off" {...register('emailFuncional')} />
                        {errors.emailFuncional && (
                          <span className="erro">{errors.emailFuncional.message}</span>
                        )}
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="cadastro-grupo">
                    <legend>Dependentes legais</legend>
                    <p className="cadastro-grupo-intro">
                      Opcional. Inclua quem depende de você legalmente, como cônjuge e filhos.
                    </p>

                    {dependentes.fields.map((campo, indice) => (
                      <div key={campo.id} className="cadastro-dependente">
                        <div className="cadastro-grade">
                          <label className="cadastro-campo-cheio">
                            Nome do dependente *
                            <input
                              type="text"
                              autoComplete="off"
                              {...register(`dependentes.${indice}.nome`)}
                            />
                            {errors.dependentes?.[indice]?.nome && (
                              <span className="erro">
                                {errors.dependentes[indice]?.nome?.message}
                              </span>
                            )}
                          </label>

                          <label>
                            Grau de parentesco *
                            <input
                              type="text"
                              autoComplete="off"
                              placeholder="Filho(a), cônjuge…"
                              {...register(`dependentes.${indice}.parentesco`)}
                            />
                            {errors.dependentes?.[indice]?.parentesco && (
                              <span className="erro">
                                {errors.dependentes[indice]?.parentesco?.message}
                              </span>
                            )}
                          </label>

                          <label>
                            Data de nascimento *
                            <input
                              type="date"
                              {...register(`dependentes.${indice}.dataNascimento`)}
                            />
                            {errors.dependentes?.[indice]?.dataNascimento && (
                              <span className="erro">
                                {errors.dependentes[indice]?.dataNascimento?.message}
                              </span>
                            )}
                          </label>
                        </div>

                        <button
                          type="button"
                          className="botao-link-acao"
                          onClick={() => dependentes.remove(indice)}
                        >
                          Remover dependente
                        </button>
                      </div>
                    ))}

                    {dependentes.fields.length < 10 && (
                      <button
                        type="button"
                        className="botao-secundario"
                        onClick={() =>
                          dependentes.append({ nome: '', parentesco: '', dataNascimento: '' })
                        }
                      >
                        Adicionar dependente
                      </button>
                    )}
                  </fieldset>

                  <fieldset className="cadastro-grupo">
                    <legend>Acesso</legend>
                    <div className="cadastro-grade">
                      <label className="cadastro-campo-cheio">
                        Senha *
                        <input type="password" autoComplete="new-password" {...register('senha')} />
                        <span className="campo-ajuda">
                          Mínimo de 8 caracteres. Use-a após a aprovação.
                        </span>
                        {errors.senha && <span className="erro">{errors.senha.message}</span>}
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="cadastro-grupo">
                    <legend>Documentação para análise</legend>
                    <p className="cadastro-grupo-intro">
                      Anexe os documentos disponíveis. Formatos aceitos: PDF, JPG, PNG ou WebP, até
                      8 MB por arquivo.
                    </p>
                    <div className="cadastro-documentos-grade">
                      {TIPOS_DOCUMENTO.map(([tipo, rotulo]) => (
                        <label key={tipo} className="cadastro-documento-campo">
                          <span>{rotulo}</span>
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            disabled={cadastro.isPending}
                            onChange={(evento) => {
                              const valido = selecionarDocumento(
                                tipo,
                                evento.target.files?.[0],
                              );
                              if (!valido) {
                                evento.target.value = '';
                              }
                            }}
                          />
                          {documentosCadastro[tipo] && (
                            <small>{documentosCadastro[tipo]?.name}</small>
                          )}
                        </label>
                      ))}
                    </div>
                    {erroDocumento && (
                      <p className="erro" role="alert">
                        {erroDocumento}
                      </p>
                    )}
                  </fieldset>

                  <fieldset className="cadastro-grupo">
                    <legend>Declaração</legend>
                    <label className="cadastro-aceite">
                      <input type="checkbox" {...register('aceiteEstatuto')} />
                      <span>
                        Declaro aceitar as condições constantes do Estatuto do {marca.nome},
                        comprometendo-me a cumpri-las e fazer com que sejam cumpridas na esfera da
                        minha responsabilidade, autorizando, inclusive, o desconto em folha de
                        pagamento da mensalidade social em favor do {marca.nomeCompleto}, decidido
                        em Assembleia.
                      </span>
                    </label>
                    {errors.aceiteEstatuto && (
                      <span className="erro">{errors.aceiteEstatuto.message}</span>
                    )}
                  </fieldset>

                  {cadastro.isError && (
                    <p className="erro cadastro-erro-form" role="alert">
                      {mensagemDeErro(cadastro.error)}
                    </p>
                  )}

                  <div className="cadastro-acoes">
                    <button type="submit" className="botao-primario" disabled={cadastro.isPending}>
                      {cadastro.isPending ? 'Enviando solicitação…' : 'Solicitar filiação'}
                    </button>
                    <p className="cadastro-rodape-form">
                      Já tem cadastro? <Link to="/login">Entrar</Link>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
