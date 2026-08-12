import { useMemo, useState } from 'react';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { useAfiliadosAdmin } from '../../../afiliado/hooks';
import {
  useElegiveis,
  useIncluirElegivel,
  useRemoverElegivel,
  useSincronizarElegiveis,
} from '../../hooks';

type ElegiveisAdminPanelProps = {
  eleicaoId: string;
};

type FiltroElegivel = 'todos' | 'votaram' | 'pendentes';

export function ElegiveisAdminPanel({ eleicaoId }: ElegiveisAdminPanelProps) {
  const { data: elegiveis, isLoading } = useElegiveis(eleicaoId);
  const { data: afiliadosPaginados } = useAfiliadosAdmin({
    status: 'APROVADO',
    limit: 500,
    page: 1,
  });
  const afiliados = afiliadosPaginados?.items;
  const sincronizar = useSincronizarElegiveis(eleicaoId);
  const incluir = useIncluirElegivel(eleicaoId);
  const remover = useRemoverElegivel(eleicaoId);
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const [afiliadoId, setAfiliadoId] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroElegivel>('todos');

  const total = elegiveis?.length ?? 0;
  const compareceram = elegiveis?.filter((item) => item.compareceu).length ?? 0;
  const pendentes = total - compareceram;
  const percentual = total > 0 ? Math.round((compareceram / total) * 100) : 0;

  const idsElegiveis = useMemo(
    () => new Set(elegiveis?.map((item) => item.afiliadoId) ?? []),
    [elegiveis],
  );

  const candidatosInclusao = useMemo(
    () => (afiliados ?? []).filter((afiliado) => !idsElegiveis.has(afiliado.id)),
    [afiliados, idsElegiveis],
  );

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (elegiveis ?? []).filter((item) => {
      if (filtro === 'votaram' && !item.compareceu) return false;
      if (filtro === 'pendentes' && item.compareceu) return false;
      if (!termo) return true;
      return (
        item.nome.toLowerCase().includes(termo) ||
        item.matricula.toLowerCase().includes(termo)
      );
    });
  }, [elegiveis, busca, filtro]);

  return (
    <section className="eleicao-admin-bloco" aria-labelledby="eleicao-elegiveis-titulo">
      <div className="eleicao-admin-bloco-cabecalho">
        <div>
          <h2 id="eleicao-elegiveis-titulo">Eleitores</h2>
          <p>
            Quem pode votar pela urna eletrônica. Sincronizar traz todos os filiados aprovados —
            depois remova quem não aderiu ao voto eletrônico (Art. 38 §3º do Estatuto).
          </p>
        </div>
        <button
          type="button"
          className="botao-secundario"
          disabled={sincronizar.isPending}
          onClick={() =>
            pedirConfirmacao({
              titulo: 'Sincronizar elegíveis?',
              descricao:
                'Inclui todos os afiliados com status aprovado que ainda não estão na lista. Não remove quem já está cadastrado.',
              confirmarRotulo: 'Sincronizar',
              tom: 'primario',
              onConfirmar: () => sincronizar.mutateAsync(),
            })
          }
        >
          {sincronizar.isPending ? 'Sincronizando…' : 'Sincronizar aprovados'}
        </button>
      </div>

      <div className="eleicao-painel-metricas" aria-label="Resumo dos elegíveis">
        <div className="eleicao-painel-metrica">
          <span className="eleicao-painel-metrica-rotulo">Na lista</span>
          <strong>{total}</strong>
        </div>
        <div className="eleicao-painel-metrica">
          <span className="eleicao-painel-metrica-rotulo">Já votaram</span>
          <strong>{compareceram}</strong>
        </div>
        <div className="eleicao-painel-metrica">
          <span className="eleicao-painel-metrica-rotulo">Pendentes</span>
          <strong>{pendentes}</strong>
        </div>
        <div className="eleicao-painel-metrica eleicao-painel-metrica--progresso">
          <div className="eleicao-painel-metrica-topo">
            <span className="eleicao-painel-metrica-rotulo">Comparecimento</span>
            <strong>{percentual}%</strong>
          </div>
          <div
            className="eleicao-progresso"
            role="progressbar"
            aria-valuenow={percentual}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${percentual}%` }} />
          </div>
        </div>
      </div>

      <div className="eleicao-painel-ferramentas">
        <form
          className="eleicao-painel-incluir"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (!afiliadoId.trim()) return;
            incluir.mutate(
              { afiliadoId: afiliadoId.trim() },
              { onSuccess: () => setAfiliadoId('') },
            );
          }}
        >
          <label>
            Incluir afiliado aprovado
            <select
              value={afiliadoId}
              onChange={(evento) => setAfiliadoId(evento.target.value)}
              disabled={candidatosInclusao.length === 0}
            >
              <option value="">
                {candidatosInclusao.length === 0
                  ? 'Nenhum afiliado disponível para incluir'
                  : 'Selecione um afiliado…'}
              </option>
              {candidatosInclusao.map((afiliado) => (
                <option key={afiliado.id} value={afiliado.id}>
                  {afiliado.nome} · {afiliado.matricula}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="botao-secundario"
            disabled={incluir.isPending || !afiliadoId}
          >
            {incluir.isPending ? 'Incluindo…' : 'Incluir'}
          </button>
        </form>
        {incluir.isError && <p className="erro">Não foi possível incluir este afiliado.</p>}
      </div>

      {isLoading && <EstadoCarregando mensagem="Carregando elegíveis…" />}

      {elegiveis && elegiveis.length === 0 && (
        <div className="eleicao-admin-vazio">
          <p>Nenhum afiliado elegível ainda.</p>
          <button
            type="button"
            className="botao-primario"
            disabled={sincronizar.isPending}
            onClick={() => sincronizar.mutate()}
          >
            Sincronizar com afiliados aprovados
          </button>
        </div>
      )}

      {elegiveis && elegiveis.length > 0 && (
        <>
          <div className="eleicao-painel-filtros">
            <div className="eleicao-painel-filtros-abas" role="tablist" aria-label="Filtrar elegíveis">
              {(
                [
                  { valor: 'todos', rotulo: `Todos (${total})` },
                  { valor: 'votaram', rotulo: `Já votaram (${compareceram})` },
                  { valor: 'pendentes', rotulo: `Pendentes (${pendentes})` },
                ] as const
              ).map((aba) => (
                <button
                  key={aba.valor}
                  type="button"
                  role="tab"
                  aria-selected={filtro === aba.valor}
                  className={
                    filtro === aba.valor
                      ? 'botao-filtro botao-filtro--ativo'
                      : 'botao-filtro'
                  }
                  onClick={() => setFiltro(aba.valor)}
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>
            <label className="eleicao-painel-busca">
              <span className="visually-hidden">Buscar por nome ou matrícula</span>
              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar nome ou matrícula…"
              />
            </label>
          </div>

          {listaFiltrada.length === 0 ? (
            <div className="eleicao-admin-vazio">
              <p>Nenhum elegível corresponde a este filtro.</p>
            </div>
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela eleicao-painel-tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Matrícula</th>
                    <th>Comparecimento</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.map((elegivel) => (
                    <tr key={elegivel.afiliadoId}>
                      <td>
                        <strong className="eleicao-painel-nome">{elegivel.nome}</strong>
                      </td>
                      <td>
                        <span className="eleicao-painel-matricula">{elegivel.matricula}</span>
                      </td>
                      <td>
                        <span
                          className={
                            elegivel.compareceu
                              ? 'eleicao-admin-voto eleicao-admin-voto--sim'
                              : 'eleicao-admin-voto eleicao-admin-voto--nao'
                          }
                        >
                          {elegivel.compareceu ? 'Votou' : 'Pendente'}
                        </span>
                      </td>
                      <td className="tabela-acoes">
                        <button
                          type="button"
                          className="botao-link-acao botao-link-acao--perigo"
                          disabled={remover.isPending || elegivel.compareceu}
                          title={
                            elegivel.compareceu
                              ? 'Não é possível remover quem já votou'
                              : 'Remover da lista'
                          }
                          onClick={() =>
                            pedirConfirmacao({
                              titulo: 'Remover elegível?',
                              descricao: `${elegivel.nome} deixará de poder votar eletronicamente nesta eleição.`,
                              confirmarRotulo: 'Remover',
                              onConfirmar: () => remover.mutateAsync(elegivel.afiliadoId),
                            })
                          }
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalConfirmacao}
    </section>
  );
}
