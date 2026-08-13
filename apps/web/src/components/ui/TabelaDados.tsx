import {
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

/**
 * Único recurso ligado: ordenação. Ela é `manual` porque quem ordena é o banco,
 * junto com a paginação — ordenar só as linhas da página atual mentiria para o
 * usuário. Sem modelo de linhas ordenado, o bundle fica com o mínimo do TanStack.
 */
const recursos = tableFeatures({ rowSortingFeature });

export type ColunaTabela<T extends RowData> = ColumnDef<typeof recursos, T>;

type TabelaDadosProps<T extends RowData> = {
  colunas: ColunaTabela<T>[];
  dados: T[];
  chaveLinha: (item: T) => string;
  /** Rótulo lido por leitores de tela; a tabela não tem legenda visível. */
  descricao: string;
  ordenacao?: SortingState;
  onOrdenacaoChange?: OnChangeFn<SortingState>;
  /** Escurece a tabela enquanto uma nova página é buscada. */
  atualizando?: boolean;
  rodape?: ReactNode;
};

function rotuloOrdenacao(sentido: false | 'asc' | 'desc') {
  if (sentido === 'asc') return 'ascending' as const;
  if (sentido === 'desc') return 'descending' as const;
  return 'none' as const;
}

export function TabelaDados<T extends RowData>({
  colunas,
  dados,
  chaveLinha,
  descricao,
  ordenacao,
  onOrdenacaoChange,
  atualizando = false,
  rodape,
}: TabelaDadosProps<T>) {
  const tabela = useTable({
    features: recursos,
    columns: colunas,
    data: dados,
    getRowId: chaveLinha,
    manualSorting: true,
    enableSorting: Boolean(onOrdenacaoChange),
    // Sem estado "sem ordenação": a consulta sempre manda uma coluna e um
    // sentido, então o cabeçalho precisa refletir exatamente isso.
    enableSortingRemoval: false,
    enableMultiSort: false,
    // As colunas são de exibição (o servidor entrega o valor pronto), então o
    // TanStack não consegue inferir a direção inicial: fixamos crescente.
    sortDescFirst: false,
    state: { sorting: ordenacao ?? [] },
    onSortingChange: onOrdenacaoChange,
  });

  return (
    <div className={atualizando ? 'tabela-painel tabela-painel--atualizando' : 'tabela-painel'}>
      <div className="tabela-rolagem" aria-busy={atualizando}>
        <table className="tabela" aria-label={descricao}>
          <thead>
            {tabela.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                {grupo.headers.map((header) => {
                  const ordenavel = header.column.getCanSort();
                  const sentido = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={ordenavel ? rotuloOrdenacao(sentido) : undefined}
                      className={sentido ? 'tabela-th tabela-th--ordenada' : 'tabela-th'}
                    >
                      {ordenavel ? (
                        <button
                          type="button"
                          className="tabela-ordenar"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <tabela.FlexRender header={header} />
                          <span className="tabela-ordenar-seta" aria-hidden="true">
                            {sentido === 'asc' ? '↑' : sentido === 'desc' ? '↓' : '↕'}
                          </span>
                        </button>
                      ) : (
                        <tabela.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tabela.getRowModel().rows.map((linha) => (
              <tr key={linha.id}>
                {linha.getAllCells().map((celula) => (
                  <td key={celula.id}>
                    <tabela.FlexRender cell={celula} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rodape}
    </div>
  );
}
