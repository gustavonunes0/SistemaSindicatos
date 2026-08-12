import { useMemo, useState } from 'react';
import type { MembroComissao } from '@sindprf/types';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import {
  useAdicionarMembroComissao,
  useAdministradores,
  useComissao,
  useRemoverMembroComissao,
} from '../../hooks';

type ComissaoEleitoralPanelProps = {
  eleicaoId: string;
};

export function ComissaoEleitoralPanel({ eleicaoId }: ComissaoEleitoralPanelProps) {
  const { data: membros, isLoading } = useComissao(eleicaoId);
  const { data: administradores } = useAdministradores();
  const adicionar = useAdicionarMembroComissao(eleicaoId);
  const remover = useRemoverMembroComissao(eleicaoId);
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [userId, setUserId] = useState('');
  const [titular, setTitular] = useState(true);

  const titulares = (membros ?? []).filter((membro) => membro.titular);
  const suplentes = (membros ?? []).filter((membro) => !membro.titular);

  const disponiveis = useMemo(() => {
    const jaNaComissao = new Set((membros ?? []).map((membro) => membro.userId));
    return (administradores ?? []).filter((admin) => !jaNaComissao.has(admin.id));
  }, [administradores, membros]);

  const confirmarRemocao = (membro: MembroComissao) =>
    pedirConfirmacao({
      titulo: membro.titular ? 'Remover titular?' : 'Remover suplente?',
      descricao: `${membro.email} deixará de constar na Comissão Eleitoral desta eleição.`,
      confirmarRotulo: 'Remover',
      onConfirmar: () => remover.mutateAsync(membro.userId),
    });

  return (
    <section className="eleicao-admin-bloco" aria-labelledby="eleicao-comissao-titulo">
      <div className="eleicao-admin-bloco-cabecalho">
        <div>
          <h2 id="eleicao-comissao-titulo">Comissão Eleitoral</h2>
          <p>
            Registro dos administradores designados para conduzir esta eleição (Art. 38 §4º). Serve
            como trilha de auditoria — não altera permissões de acesso.
          </p>
        </div>
      </div>

      <div className="eleicao-painel-ferramentas">
        <form
          className="eleicao-painel-incluir"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (!userId) return;
            adicionar.mutate({ userId, titular }, { onSuccess: () => setUserId('') });
          }}
        >
          <label>
            Designar administrador
            <select
              value={userId}
              onChange={(evento) => setUserId(evento.target.value)}
              disabled={disponiveis.length === 0}
            >
              <option value="">
                {disponiveis.length === 0
                  ? 'Todos os administradores já estão na comissão'
                  : 'Selecione um administrador…'}
              </option>
              {disponiveis.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.email}
                </option>
              ))}
            </select>
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

          <button type="submit" className="botao-secundario" disabled={adicionar.isPending || !userId}>
            {adicionar.isPending ? 'Adicionando…' : 'Adicionar'}
          </button>
        </form>
        {adicionar.isError && (
          <p className="erro">Não foi possível adicionar este administrador. Tente novamente.</p>
        )}
      </div>

      {isLoading && <EstadoCarregando mensagem="Carregando comissão…" />}

      {membros && membros.length === 0 && (
        <div className="eleicao-admin-vazio">
          <p>Nenhum membro designado ainda. Escolha um administrador acima para começar.</p>
        </div>
      )}

      {membros && membros.length > 0 && (
        <div className="eleicao-comissao-grupos">
          <GrupoComissao
            titulo="Titulares"
            membros={titulares}
            vazio="Nenhum titular designado."
            removendo={remover.isPending}
            onRemover={confirmarRemocao}
          />
          <GrupoComissao
            titulo="Suplentes"
            membros={suplentes}
            vazio="Nenhum suplente designado."
            removendo={remover.isPending}
            onRemover={confirmarRemocao}
          />
        </div>
      )}

      {modalConfirmacao}
    </section>
  );
}

type GrupoComissaoProps = {
  titulo: string;
  membros: MembroComissao[];
  vazio: string;
  removendo: boolean;
  onRemover: (membro: MembroComissao) => void;
};

function GrupoComissao({ titulo, membros, vazio, removendo, onRemover }: GrupoComissaoProps) {
  return (
    <div className="eleicao-comissao-grupo">
      <h3>{titulo}</h3>
      {membros.length === 0 ? (
        <p className="eleicao-admin-resumo">{vazio}</p>
      ) : (
        <ul className="eleicao-comissao-lista">
          {membros.map((membro) => (
            <li key={membro.userId}>
              <strong>{membro.email}</strong>
              <button
                type="button"
                className="botao-link-acao botao-link-acao--perigo"
                disabled={removendo}
                onClick={() => onRemover(membro)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
