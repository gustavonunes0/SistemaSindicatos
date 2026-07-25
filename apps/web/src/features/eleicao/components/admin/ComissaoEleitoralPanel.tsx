import { useMemo, useState } from 'react';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import {
  useAdicionarMembroComissao,
  useComissao,
  useRemoverMembroComissao,
} from '../../hooks';

type ComissaoEleitoralPanelProps = {
  eleicaoId: string;
};

export function ComissaoEleitoralPanel({ eleicaoId }: ComissaoEleitoralPanelProps) {
  const { data: membros, isLoading } = useComissao(eleicaoId);
  const adicionar = useAdicionarMembroComissao(eleicaoId);
  const remover = useRemoverMembroComissao(eleicaoId);
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [userId, setUserId] = useState('');
  const [titular, setTitular] = useState(true);

  const titulares = useMemo(
    () => (membros ?? []).filter((membro) => membro.titular),
    [membros],
  );
  const suplentes = useMemo(
    () => (membros ?? []).filter((membro) => !membro.titular),
    [membros],
  );

  return (
    <section className="eleicao-admin-bloco" aria-labelledby="eleicao-comissao-titulo">
      <div className="eleicao-admin-bloco-cabecalho">
        <div>
          <h2 id="eleicao-comissao-titulo">Comissão Eleitoral</h2>
          <p>
            Registro dos administradores designados como membros da Comissão Eleitoral desta
            eleição (Art. 38 §4º), para auditoria — não altera permissões de acesso.
          </p>
        </div>
      </div>

      <div className="eleicao-painel-metricas eleicao-painel-metricas--compacta">
        <div className="eleicao-painel-metrica">
          <span className="eleicao-painel-metrica-rotulo">Membros</span>
          <strong>{membros?.length ?? 0}</strong>
        </div>
        <div className="eleicao-painel-metrica">
          <span className="eleicao-painel-metrica-rotulo">Titulares</span>
          <strong>{titulares.length}</strong>
        </div>
        <div className="eleicao-painel-metrica">
          <span className="eleicao-painel-metrica-rotulo">Suplentes</span>
          <strong>{suplentes.length}</strong>
        </div>
      </div>

      <div className="eleicao-painel-ferramentas">
        <form
          className="eleicao-painel-incluir eleicao-painel-incluir--comissao"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (!userId.trim()) return;
            adicionar.mutate(
              { userId: userId.trim(), titular },
              { onSuccess: () => setUserId('') },
            );
          }}
        >
          <label>
            Designar administrador
            <input
              type="text"
              value={userId}
              onChange={(evento) => setUserId(evento.target.value)}
              placeholder="ID do usuário com perfil ADMIN"
              autoComplete="off"
            />
          </label>
          <fieldset className="eleicao-painel-papel">
            <legend>Papel</legend>
            <label className={titular ? 'ativo' : undefined}>
              <input
                type="radio"
                name="papel-comissao"
                checked={titular}
                onChange={() => setTitular(true)}
              />
              Titular
            </label>
            <label className={!titular ? 'ativo' : undefined}>
              <input
                type="radio"
                name="papel-comissao"
                checked={!titular}
                onChange={() => setTitular(false)}
              />
              Suplente
            </label>
          </fieldset>
          <button
            type="submit"
            className="botao-secundario"
            disabled={adicionar.isPending || !userId.trim()}
          >
            {adicionar.isPending ? 'Adicionando…' : 'Adicionar'}
          </button>
        </form>
        {adicionar.isError && (
          <p className="erro">
            Não foi possível adicionar. Confira se o ID existe, é ADMIN e ainda não está na
            comissão.
          </p>
        )}
      </div>

      {isLoading && <EstadoCarregando mensagem="Carregando comissão…" />}

      {membros && membros.length === 0 && (
        <div className="eleicao-admin-vazio">
          <p>Nenhum membro designado ainda. Informe o ID de um administrador para começar.</p>
        </div>
      )}

      {membros && membros.length > 0 && (
        <div className="eleicao-comissao-grupos">
          <div className="eleicao-comissao-grupo">
            <h3>Titulares</h3>
            {titulares.length === 0 ? (
              <p className="eleicao-admin-resumo">Nenhum titular designado.</p>
            ) : (
              <ul className="eleicao-comissao-lista">
                {titulares.map((membro) => (
                  <li key={membro.userId}>
                    <div className="eleicao-comissao-membro">
                      <span className="badge badge-chapa-homologada">Titular</span>
                      <strong>{membro.email}</strong>
                    </div>
                    <button
                      type="button"
                      className="botao-perigo"
                      disabled={remover.isPending}
                      onClick={() =>
                        pedirConfirmacao({
                          titulo: 'Remover titular?',
                          descricao: `${membro.email} deixará de constar na Comissão Eleitoral desta eleição.`,
                          confirmarRotulo: 'Remover',
                          onConfirmar: () => remover.mutateAsync(membro.userId),
                        })
                      }
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="eleicao-comissao-grupo">
            <h3>Suplentes</h3>
            {suplentes.length === 0 ? (
              <p className="eleicao-admin-resumo">Nenhum suplente designado.</p>
            ) : (
              <ul className="eleicao-comissao-lista">
                {suplentes.map((membro) => (
                  <li key={membro.userId}>
                    <div className="eleicao-comissao-membro">
                      <span className="badge badge-eleicao-agendada">Suplente</span>
                      <strong>{membro.email}</strong>
                    </div>
                    <button
                      type="button"
                      className="botao-perigo"
                      disabled={remover.isPending}
                      onClick={() =>
                        pedirConfirmacao({
                          titulo: 'Remover suplente?',
                          descricao: `${membro.email} deixará de constar na Comissão Eleitoral desta eleição.`,
                          confirmarRotulo: 'Remover',
                          onConfirmar: () => remover.mutateAsync(membro.userId),
                        })
                      }
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {modalConfirmacao}
    </section>
  );
}
