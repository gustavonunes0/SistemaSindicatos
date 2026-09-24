import {
  ESTADO_CIVIL_ROTULO,
  TIPO_DOCUMENTO_FILIACAO_ROTULO,
  type AfiliadoFicha,
} from '@sindprf/types';
import { Children, useEffect, useState, type ReactNode } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import type { AfiliadoAdmin } from '../../api';
import { baixarPropostaFiliacao, obterArquivoDocumentoAfiliado } from '../../api';
import { useAbrirDocumentoAfiliado, useAtualizarStatusAfiliado, useFichaAfiliadoAdmin } from '../../hooks';

type Props = {
  afiliado: AfiliadoAdmin | null;
  onFechar: () => void;
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function formatarCpf(cpf: string): string {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatarTelefone(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length === 11) return digitos.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (digitos.length === 10) return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return numero;
}

function enderecoCompleto(ficha: AfiliadoFicha): string | null {
  if (!ficha.endereco) return null;
  const linha = [ficha.endereco, ficha.complemento, ficha.bairro].filter(Boolean).join(', ');
  const cidade = [ficha.cidade, ficha.uf].filter(Boolean).join('/');
  const cep = ficha.cep ? `CEP ${ficha.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : null;
  return [linha, cidade, cep].filter(Boolean).join(' — ');
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  const itens = Children.toArray(children);
  if (itens.length === 0) return null;
  return (
    <section>
      <h3>{titulo}</h3>
      <dl className="analise-filiacao-dados">{itens}</dl>
    </section>
  );
}

function rotuloStatus(status: AfiliadoAdmin['status']): string {
  if (status === 'PENDENTE') return 'Pendente';
  if (status === 'APROVADO') return 'Aprovado';
  return 'Inativo';
}

export function AfiliadoAnaliseModal({ afiliado, onFechar }: Props) {
  const ficha = useFichaAfiliadoAdmin(afiliado?.id ?? null);
  const abrir = useAbrirDocumentoAfiliado();
  const atualizarStatus = useAtualizarStatusAfiliado();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const dados = ficha.data;
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewErro, setPreviewErro] = useState(false);
  const [previewCarregando, setPreviewCarregando] = useState(false);
  const [baixandoProposta, setBaixandoProposta] = useState(false);
  const [erroProposta, setErroProposta] = useState(false);

  const documentoSelecionado =
    dados?.documentos.find((item) => item.id === documentoId) ?? dados?.documentos[0] ?? null;

  useEffect(() => {
    setDocumentoId(null);
  }, [afiliado?.id]);

  useEffect(() => {
    if (!afiliado || !documentoSelecionado) {
      setPreviewUrl(null);
      return;
    }

    let cancelado = false;
    let objectUrl: string | null = null;
    setPreviewUrl(null);
    setPreviewCarregando(true);
    setPreviewErro(false);

    void obterArquivoDocumentoAfiliado(afiliado.id, documentoSelecionado, 'visualizar')
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (cancelado) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelado) setPreviewErro(true);
      })
      .finally(() => {
        if (!cancelado) setPreviewCarregando(false);
      });

    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [afiliado, documentoSelecionado]);

  async function baixarProposta() {
    if (!afiliado) return;
    setBaixandoProposta(true);
    setErroProposta(false);
    try {
      await baixarPropostaFiliacao(afiliado.id);
    } catch {
      setErroProposta(true);
    } finally {
      setBaixandoProposta(false);
    }
  }

  function decidir(status: 'APROVADO' | 'INATIVO' | 'PENDENTE') {
    if (!afiliado) return;
    const pedidos = {
      APROVADO: {
        titulo: 'Aprovar sindicalizado?',
        descricao: `${afiliado.nome} passará a ter acesso à área do sindicalizado.`,
        confirmarRotulo: 'Aprovar',
        tom: 'primario' as const,
      },
      INATIVO: {
        titulo: 'Inativar sindicalizado?',
        descricao: `${afiliado.nome} perderá o acesso à área do sindicalizado.`,
        confirmarRotulo: 'Inativar',
        tom: 'perigo' as const,
      },
      PENDENTE: {
        titulo: 'Reabrir filiação?',
        descricao: `${afiliado.nome} voltará para o status pendente.`,
        confirmarRotulo: 'Reabrir',
        tom: 'primario' as const,
      },
    };
    const pedido = pedidos[status];
    pedirConfirmacao({
      ...pedido,
      onConfirmar: async () => {
        await atualizarStatus.mutateAsync({ id: afiliado.id, status });
        onFechar();
      },
    });
  }

  const ehImagem = documentoSelecionado?.mimeType.startsWith('image/') ?? false;

  return (
    <>
      <Modal
        aberto={Boolean(afiliado)}
        titulo={afiliado ? afiliado.nome : 'Analisar filiação'}
        descricao="Confira a ficha e os documentos na mesma tela antes de decidir."
        tamanho="analise"
        onFechar={onFechar}
      >
        {afiliado && (
          <div className="analise-filiacao">
            <div className="analise-resumo">
              <span className={`badge badge-${afiliado.status.toLowerCase()}`}>
                {rotuloStatus(afiliado.status)}
              </span>
              <span>{formatarCpf(afiliado.cpf)}</span>
              <span>Matrícula {afiliado.matricula}</span>
              <span>{afiliado.user.email}</span>
            </div>

            {ficha.isLoading && <p>Carregando ficha de filiação…</p>}
            {ficha.isError && (
              <p className="erro">Não foi possível carregar a ficha desta solicitação.</p>
            )}

            {dados && (
              <div className="analise-layout">
                <div className="analise-ficha">
                  <Grupo titulo="Identificação">
                    <Dado
                      rotulo="Tipo"
                      valor={
                        dados.categoria === 'PENSIONISTA'
                          ? 'Pensionista'
                          : dados.categoria === 'SERVIDOR'
                            ? 'Filiado(a) — servidor PRF'
                            : 'Não informado'
                      }
                    />
                    <Dado rotulo="CPF" valor={formatarCpf(dados.cpf)} />
                    <Dado rotulo="Matrícula" valor={dados.matricula} />
                    <Dado
                      rotulo="Nascimento"
                      valor={dados.dataNascimento && formatarData(dados.dataNascimento)}
                    />
                    <Dado
                      rotulo="RG"
                      valor={
                        dados.rg && [dados.rg, dados.orgaoExpedidor].filter(Boolean).join(' — ')
                      }
                    />
                    <Dado rotulo="Naturalidade" valor={dados.naturalidade} />
                    <Dado
                      rotulo="Estado civil"
                      valor={dados.estadoCivil && ESTADO_CIVIL_ROTULO[dados.estadoCivil]}
                    />
                    <Dado rotulo="Nome da mãe" valor={dados.nomeMae} />
                    <Dado rotulo="Nome do pai" valor={dados.nomePai} />
                    <Dado rotulo="Cônjuge" valor={dados.conjuge} />
                  </Grupo>

                  <Grupo titulo="Contato">
                    <Dado rotulo="Endereço" valor={enderecoCompleto(dados)} />
                    <Dado rotulo="Celular" valor={dados.celular && formatarTelefone(dados.celular)} />
                    <Dado
                      rotulo="Celular 2"
                      valor={dados.celular2 && formatarTelefone(dados.celular2)}
                    />
                    <Dado
                      rotulo="Telefone fixo"
                      valor={dados.telefone && formatarTelefone(dados.telefone)}
                    />
                    <Dado rotulo="E-mail pessoal" valor={dados.email} />
                    <Dado rotulo="E-mail funcional" valor={dados.emailFuncional} />
                  </Grupo>

                  <Grupo titulo="Vínculo">
                    <Dado rotulo="Lotação SIAPE" valor={dados.lotacaoSiape} />
                    <Dado rotulo="Lotação de atividade" valor={dados.lotacaoAtividade} />
                    <Dado rotulo="Instituidor da pensão" valor={dados.instituidorPensao} />
                    <Dado
                      rotulo="Admissão"
                      valor={dados.dataAdmissao && formatarData(dados.dataAdmissao)}
                    />
                    <Dado rotulo="Solicitado em" valor={formatarData(dados.createdAt)} />
                    <Dado
                      rotulo="Aceite do estatuto"
                      valor={dados.aceiteEstatutoEm && formatarData(dados.aceiteEstatutoEm)}
                    />
                  </Grupo>

                  {dados.dependentes.length > 0 && (
                    <section>
                      <h3>Dependentes</h3>
                      <ul className="analise-dependentes">
                        {dados.dependentes.map((dependente) => (
                          <li key={dependente.id}>
                            <strong>{dependente.nome}</strong>
                            <span>
                              {dependente.parentesco} · {formatarData(dependente.dataNascimento)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>

                <section className="analise-viewer" aria-labelledby="documentos-filiacao-titulo">
                  <div className="analise-viewer-topo">
                    <h3 id="documentos-filiacao-titulo">Documentos</h3>
                    {documentoSelecionado && (
                      <button
                        type="button"
                        className="botao-link-acao"
                        disabled={abrir.isPending}
                        onClick={() =>
                          abrir.mutate({
                            afiliadoId: afiliado.id,
                            documento: documentoSelecionado,
                            modo: 'baixar',
                          })
                        }
                      >
                        Baixar
                      </button>
                    )}
                  </div>

                  {dados.documentos.length === 0 ? (
                    <div className="estado-vazio estado-vazio--compacto">
                      <p>Nenhum documento foi anexado nesta solicitação.</p>
                    </div>
                  ) : (
                    <>
                      <div className="analise-doc-abas" role="tablist" aria-label="Documentos enviados">
                        {dados.documentos.map((documento) => (
                          <button
                            key={documento.id}
                            type="button"
                            role="tab"
                            aria-selected={documento.id === documentoSelecionado?.id}
                            className={
                              documento.id === documentoSelecionado?.id
                                ? 'analise-doc-aba analise-doc-aba--ativa'
                                : 'analise-doc-aba'
                            }
                            onClick={() => setDocumentoId(documento.id)}
                          >
                            {TIPO_DOCUMENTO_FILIACAO_ROTULO[documento.tipo]}
                          </button>
                        ))}
                      </div>

                      {documentoSelecionado && (
                        <p className="analise-doc-meta">
                          {documentoSelecionado.nomeOriginal} ·{' '}
                          {formatarTamanho(documentoSelecionado.tamanhoBytes)}
                        </p>
                      )}

                      <div className="analise-doc-quadro">
                        {previewCarregando && <p>Abrindo documento…</p>}
                        {previewErro && (
                          <p className="erro">Não foi possível abrir este documento.</p>
                        )}
                        {previewUrl && ehImagem && (
                          <img
                            src={previewUrl}
                            alt={
                              documentoSelecionado
                                ? TIPO_DOCUMENTO_FILIACAO_ROTULO[documentoSelecionado.tipo]
                                : 'Documento'
                            }
                          />
                        )}
                        {previewUrl && !ehImagem && (
                          <iframe title="Documento da filiação" src={previewUrl} />
                        )}
                      </div>
                    </>
                  )}
                  {abrir.isError && (
                    <p className="erro">Não foi possível baixar o documento. Tente novamente.</p>
                  )}
                </section>
              </div>
            )}

            <div className="analise-acoes">
              <div className="analise-acoes-proposta">
                <button
                  type="button"
                  className="botao-secundario"
                  disabled={baixandoProposta || !dados}
                  onClick={() => void baixarProposta()}
                >
                  {baixandoProposta ? 'Gerando proposta…' : 'Baixar proposta de filiação'}
                </button>
                {erroProposta && (
                  <p className="erro">Não foi possível gerar a proposta. Tente novamente.</p>
                )}
              </div>
              <div className="analise-acoes-decisao">
                {afiliado.status !== 'APROVADO' && (
                  <button
                    type="button"
                    className="botao-primario"
                    disabled={atualizarStatus.isPending}
                    onClick={() => decidir('APROVADO')}
                  >
                    Aprovar
                  </button>
                )}
                {afiliado.status !== 'INATIVO' && (
                  <button
                    type="button"
                    className="botao-perigo"
                    disabled={atualizarStatus.isPending}
                    onClick={() => decidir('INATIVO')}
                  >
                    Inativar
                  </button>
                )}
                {afiliado.status === 'INATIVO' && (
                  <button
                    type="button"
                    className="botao-secundario"
                    disabled={atualizarStatus.isPending}
                    onClick={() => decidir('PENDENTE')}
                  >
                    Reabrir
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
      {modalConfirmacao}
    </>
  );
}
