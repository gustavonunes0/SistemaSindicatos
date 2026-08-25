import {
  ESTADO_CIVIL_ROTULO,
  TIPO_DOCUMENTO_FILIACAO_ROTULO,
  type AfiliadoFicha,
} from '@sindprf/types';
import { Modal } from '../../../../components/ui/Modal';
import { formatarData } from '../../../../lib/datas';
import type { AfiliadoAdmin } from '../../api';
import { useAbrirDocumentoAfiliado, useFichaAfiliadoAdmin } from '../../hooks';

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

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function enderecoCompleto(ficha: AfiliadoFicha): string | null {
  if (!ficha.endereco) return null;
  const linha = [ficha.endereco, ficha.complemento, ficha.bairro].filter(Boolean).join(', ');
  const cidade = [ficha.cidade, ficha.uf].filter(Boolean).join('/');
  const cep = ficha.cep ? `CEP ${ficha.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : null;
  return [linha, cidade, cep].filter(Boolean).join(' — ');
}

export function AfiliadoAnaliseModal({ afiliado, onFechar }: Props) {
  const ficha = useFichaAfiliadoAdmin(afiliado?.id ?? null);
  const abrir = useAbrirDocumentoAfiliado();
  const dados = ficha.data;

  return (
    <Modal
      aberto={Boolean(afiliado)}
      titulo={afiliado ? `Analisar filiação de ${afiliado.nome}` : 'Analisar filiação'}
      descricao="Confira a ficha e os documentos enviados antes de aprovar a solicitação."
      tamanho="lg"
      onFechar={onFechar}
    >
      {afiliado && (
        <div className="analise-filiacao">
          {ficha.isLoading && <p>Carregando ficha de filiação…</p>}
          {ficha.isError && (
            <p className="erro">Não foi possível carregar a ficha desta solicitação.</p>
          )}

          {dados && (
            <>
              <section aria-labelledby="dados-filiacao-titulo">
                <h3 id="dados-filiacao-titulo">Dados da filiação</h3>
                <dl className="analise-filiacao-dados">
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
                    rotulo="Data de nascimento"
                    valor={dados.dataNascimento && formatarData(dados.dataNascimento)}
                  />
                  <Dado
                    rotulo="RG"
                    valor={
                      dados.rg &&
                      [dados.rg, dados.orgaoExpedidor].filter(Boolean).join(' — ')
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
                  <Dado rotulo="Endereço" valor={enderecoCompleto(dados)} />
                  <Dado rotulo="Lotação SIAPE" valor={dados.lotacaoSiape} />
                  <Dado rotulo="Lotação de atividade" valor={dados.lotacaoAtividade} />
                  <Dado rotulo="Instituidor da pensão" valor={dados.instituidorPensao} />
                  <Dado
                    rotulo="Data de admissão"
                    valor={dados.dataAdmissao && formatarData(dados.dataAdmissao)}
                  />
                  <Dado
                    rotulo="Celular"
                    valor={dados.celular && formatarTelefone(dados.celular)}
                  />
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
                  <Dado rotulo="Solicitado em" valor={formatarData(dados.createdAt)} />
                  <Dado
                    rotulo="Aceite do estatuto"
                    valor={dados.aceiteEstatutoEm && formatarData(dados.aceiteEstatutoEm)}
                  />
                </dl>
              </section>

              {dados.dependentes.length > 0 && (
                <section aria-labelledby="dependentes-filiacao-titulo">
                  <h3 id="dependentes-filiacao-titulo">Dependentes legais</h3>
                  <ul className="analise-documentos-lista">
                    {dados.dependentes.map((dependente) => (
                      <li key={dependente.id}>
                        <div>
                          <strong>{dependente.nome}</strong>
                          <span>
                            {dependente.parentesco} · nascido em{' '}
                            {formatarData(dependente.dataNascimento)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-labelledby="documentos-filiacao-titulo">
                <h3 id="documentos-filiacao-titulo">Documentos enviados</h3>

                {dados.documentos.length === 0 ? (
                  <div className="estado-vazio estado-vazio--compacto">
                    <p>Nenhum documento foi anexado nesta solicitação.</p>
                  </div>
                ) : (
                  <ul className="analise-documentos-lista">
                    {dados.documentos.map((documento) => (
                      <li key={documento.id}>
                        <div>
                          <strong>{TIPO_DOCUMENTO_FILIACAO_ROTULO[documento.tipo]}</strong>
                          <span>
                            {documento.nomeOriginal} · {formatarTamanho(documento.tamanhoBytes)}
                          </span>
                        </div>
                        <div className="analise-documento-acoes">
                          <button
                            type="button"
                            className="botao-secundario"
                            disabled={abrir.isPending}
                            onClick={() =>
                              abrir.mutate({
                                afiliadoId: afiliado.id,
                                documento,
                                modo: 'visualizar',
                              })
                            }
                          >
                            Visualizar
                          </button>
                          <button
                            type="button"
                            className="botao-link-acao"
                            disabled={abrir.isPending}
                            onClick={() =>
                              abrir.mutate({ afiliadoId: afiliado.id, documento, modo: 'baixar' })
                            }
                          >
                            Baixar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {abrir.isError && (
                  <p className="erro">Não foi possível abrir o documento. Tente novamente.</p>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
