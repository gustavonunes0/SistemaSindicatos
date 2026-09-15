import { useEffect, useMemo, useState } from 'react';
import type { EleicaoAdminDetalhe, StatusEleicao } from '@sindprf/types';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { numeroCedula } from '../../rotulos';
import { useContagemVotos, useDefinirVotosPresenciais } from '../../hooks';

type VotosPresenciaisAdminPanelProps = {
  eleicao: EleicaoAdminDetalhe;
};

function podeLancarPresencial(status: StatusEleicao): boolean {
  return status === 'ABERTA' || status === 'ENCERRADA';
}

export function VotosPresenciaisAdminPanel({ eleicao }: VotosPresenciaisAdminPanelProps) {
  const habilitado = podeLancarPresencial(eleicao.status) || eleicao.status === 'APURADA';
  const { data: contagem, isLoading, isError } = useContagemVotos(eleicao.id, habilitado);
  const salvar = useDefinirVotosPresenciais(eleicao.id);
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const chapasHomologadas = useMemo(
    () => eleicao.chapas.filter((chapa) => chapa.status === 'HOMOLOGADA'),
    [eleicao.chapas],
  );

  const [quantidades, setQuantidades] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!contagem) return;
    setQuantidades(
      Object.fromEntries(contagem.chapas.map((chapa) => [chapa.chapaId, chapa.presenciais])),
    );
  }, [contagem]);

  const totalPresencialInformado = useMemo(
    () => Object.values(quantidades).reduce((soma, valor) => soma + (Number(valor) || 0), 0),
    [quantidades],
  );

  const somenteLeitura = eleicao.status === 'APURADA';

  const salvarLancamentos = () => {
    pedirConfirmacao({
      titulo: 'Salvar votos presenciais?',
      descricao:
        'Os totais informados substituem o lançamento anterior de cédulas em papel. Cada voto continua anônimo — não há vínculo com o eleitor.',
      confirmarRotulo: 'Salvar lançamento',
      tom: 'primario',
      onConfirmar: async () => {
        await salvar.mutateAsync({
          lancamentos: chapasHomologadas.map((chapa) => ({
            chapaId: chapa.id,
            quantidade: Math.max(0, Number(quantidades[chapa.id] ?? 0)),
          })),
        });
      },
    });
  };

  if (isLoading) {
    return <EstadoCarregando mensagem="Carregando contagem de votos…" />;
  }

  if (isError || !contagem) {
    return <p className="erro">Não foi possível carregar a contagem de votos.</p>;
  }

  return (
    <section className="eleicao-admin-bloco" aria-labelledby="eleicao-presencial-titulo">
      <div className="eleicao-admin-bloco-cabecalho">
        <div>
          <h2 id="eleicao-presencial-titulo">Votos presenciais em papel</h2>
          <p>
            Informe, por chapa, quantas cédulas em papel a Comissão Eleitoral conferiu. O sistema
            grava votos anônimos (sem identificar quem votou) e soma automaticamente na apuração
            junto com a urna eletrônica.
          </p>
        </div>
      </div>

      {chapasHomologadas.length === 0 ? (
        <p className="eleicao-painel-vazio">Homologue ao menos uma chapa para lançar votos.</p>
      ) : (
        <>
          <div className="tabela-wrapper">
            <table className="tabela eleicao-presencial-tabela">
              <thead>
                <tr>
                  <th>Chapa</th>
                  <th>Urna eletrônica</th>
                  <th>Cédulas em papel</th>
                  <th>Total parcial</th>
                </tr>
              </thead>
              <tbody>
                {chapasHomologadas.map((chapa) => {
                  const linha = contagem.chapas.find((item) => item.chapaId === chapa.id);
                  const eletronicos = linha?.eletronicos ?? 0;
                  const presencial = Math.max(0, Number(quantidades[chapa.id] ?? 0));
                  return (
                    <tr key={chapa.id}>
                      <td>
                        <strong>{numeroCedula(chapa.numero)}</strong> {chapa.nome}
                      </td>
                      <td>{eletronicos}</td>
                      <td>
                        {somenteLeitura ? (
                          presencial
                        ) : (
                          <input
                            type="number"
                            min={0}
                            max={10000}
                            inputMode="numeric"
                            className="eleicao-presencial-input"
                            value={quantidades[chapa.id] ?? 0}
                            onChange={(event) =>
                              setQuantidades((atual) => ({
                                ...atual,
                                [chapa.id]: Number(event.target.value),
                              }))
                            }
                          />
                        )}
                      </td>
                      <td>{eletronicos + presencial}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Totais</th>
                  <td>{contagem.totalEletronicos}</td>
                  <td>{somenteLeitura ? contagem.totalPresenciais : totalPresencialInformado}</td>
                  <td>
                    {contagem.totalEletronicos +
                      (somenteLeitura ? contagem.totalPresenciais : totalPresencialInformado)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {!somenteLeitura && podeLancarPresencial(eleicao.status) && (
            <div className="eleicao-presencial-acoes">
              <button
                type="button"
                className="botao-primario"
                disabled={salvar.isPending}
                onClick={salvarLancamentos}
              >
                {salvar.isPending ? 'Salvando…' : 'Salvar votos presenciais'}
              </button>
              {salvar.isError && (
                <p className="erro">Não foi possível salvar. Confira os valores e tente de novo.</p>
              )}
            </div>
          )}

          {somenteLeitura && (
            <p className="eleicao-painel-aviso">
              Eleição apurada — os totais abaixo compõem o resultado oficial divulgado.
            </p>
          )}
        </>
      )}

      {modalConfirmacao}
    </section>
  );
}
