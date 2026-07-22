import { useState } from 'react';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import {
  useElegiveis,
  useIncluirElegivel,
  useRemoverElegivel,
  useSincronizarElegiveis,
} from '../../hooks';

type ElegiveisAdminPanelProps = {
  eleicaoId: string;
};

export function ElegiveisAdminPanel({ eleicaoId }: ElegiveisAdminPanelProps) {
  const { data: elegiveis, isLoading } = useElegiveis(eleicaoId);
  const sincronizar = useSincronizarElegiveis(eleicaoId);
  const incluir = useIncluirElegivel(eleicaoId);
  const remover = useRemoverElegivel(eleicaoId);
  const [afiliadoId, setAfiliadoId] = useState('');

  const compareceram = elegiveis?.filter((item) => item.compareceu).length ?? 0;

  return (
    <section className="painel-secao">
      <div className="dash-secao-cabecalho">
        <h2 className="painel-secao-titulo">Elegíveis</h2>
        <p className="dash-secao-ajuda">
          Quem vota eletronicamente nesta eleição. A sincronização inclui todo afiliado aprovado
          — ajuste manualmente para refletir apenas quem manifestou adesão ao voto eletrônico
          (Art. 38 §3º do Estatuto).
        </p>
      </div>

      <button
        type="button"
        className="botao-secundario"
        disabled={sincronizar.isPending}
        onClick={() => sincronizar.mutate()}
      >
        {sincronizar.isPending ? 'Sincronizando…' : 'Sincronizar com afiliados aprovados'}
      </button>

      <form
        className="form-linha"
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
          Incluir afiliado por ID
          <input
            type="text"
            value={afiliadoId}
            onChange={(evento) => setAfiliadoId(evento.target.value)}
            placeholder="ID do afiliado"
          />
        </label>
        <button type="submit" className="botao-secundario" disabled={incluir.isPending}>
          Incluir
        </button>
      </form>
      {incluir.isError && <p className="erro">Não foi possível incluir este afiliado.</p>}

      {isLoading && <EstadoCarregando mensagem="Carregando elegíveis…" />}

      {elegiveis && elegiveis.length === 0 && <p>Nenhum afiliado elegível ainda.</p>}

      {elegiveis && elegiveis.length > 0 && (
        <>
          <p>
            {compareceram} de {elegiveis.length} já votaram (comparecimento, sem revelar a
            escolha).
          </p>
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Matrícula</th>
                  <th>Votou</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {elegiveis.map((elegivel) => (
                  <tr key={elegivel.afiliadoId}>
                    <td>{elegivel.nome}</td>
                    <td>{elegivel.matricula}</td>
                    <td>{elegivel.compareceu ? 'Sim' : 'Não'}</td>
                    <td className="tabela-acoes">
                      <button
                        type="button"
                        className="botao-perigo"
                        disabled={remover.isPending}
                        onClick={() => remover.mutate(elegivel.afiliadoId)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
