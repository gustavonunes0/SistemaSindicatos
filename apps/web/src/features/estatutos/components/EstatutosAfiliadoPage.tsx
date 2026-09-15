import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../lib/datas';
import * as estatutosApi from '../api';
import { useEstatutos } from '../hooks';

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EstatutosAfiliadoPage() {
  const { data: estatutos, isLoading, isError } = useEstatutos();

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Estatutos"
      descricao="Consulte e baixe os documentos oficiais do estatuto sindical."
    >
      {isLoading && !estatutos && <EstadoCarregando mensagem="Carregando estatutos…" />}
      {isError && !estatutos && <p className="erro">Não foi possível carregar os estatutos.</p>}

      {estatutos && estatutos.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum estatuto disponível no momento.</p>
        </div>
      )}

      {estatutos && estatutos.length > 0 && (
        <ul className="lista-estatutos">
          {estatutos.map((item) => (
            <li key={item.id} className="lista-estatutos-item">
              <div>
                <h2>{item.titulo}</h2>
                <p className="texto-secundario">
                  PDF · {formatarTamanho(item.tamanhoBytes)} · atualizado em{' '}
                  {formatarData(item.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                className="botao-primario"
                onClick={() => void estatutosApi.abrirEstatuto(item.id, item.nomeOriginal, 'afiliado')}
              >
                Abrir PDF
              </button>
            </li>
          ))}
        </ul>
      )}
    </AreaLayout>
  );
}
