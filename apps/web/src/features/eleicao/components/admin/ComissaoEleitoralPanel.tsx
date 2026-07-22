import { useState } from 'react';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
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
  const [userId, setUserId] = useState('');
  const [titular, setTitular] = useState(true);

  return (
    <section className="painel-secao">
      <div className="dash-secao-cabecalho">
        <h2 className="painel-secao-titulo">Comissão Eleitoral</h2>
        <p className="dash-secao-ajuda">
          Registro dos administradores designados como membros da Comissão Eleitoral desta
          eleição (Art. 38 §4º), para auditoria — não altera permissões de acesso.
        </p>
      </div>

      <form
        className="form-linha"
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
          ID do usuário ADMIN
          <input
            type="text"
            value={userId}
            onChange={(evento) => setUserId(evento.target.value)}
          />
        </label>
        <label className="campo-checkbox">
          <input
            type="checkbox"
            checked={titular}
            onChange={(evento) => setTitular(evento.target.checked)}
          />
          Titular
        </label>
        <button type="submit" className="botao-secundario" disabled={adicionar.isPending}>
          Adicionar
        </button>
      </form>
      {adicionar.isError && <p className="erro">Não foi possível adicionar este usuário.</p>}

      {isLoading && <EstadoCarregando mensagem="Carregando comissão…" />}
      {membros && membros.length === 0 && <p>Nenhum membro designado ainda.</p>}

      {membros && membros.length > 0 && (
        <ul className="candidatos-lista">
          {membros.map((membro) => (
            <li key={membro.userId}>
              <span>
                {membro.email} {membro.titular ? '(titular)' : '(suplente)'}
              </span>
              <button
                type="button"
                className="botao-link"
                disabled={remover.isPending}
                onClick={() => remover.mutate(membro.userId)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
