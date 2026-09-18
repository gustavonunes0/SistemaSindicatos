import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../lib/datas';
import { useMinhasAcoesJuridicas } from '../hooks';

export function MinhasAcoesJuridicas() {
  const { data: acoes, isLoading, isError } = useMinhasAcoesJuridicas();

  return (
    <section className="juridico-minhas-acoes" aria-labelledby="juridico-minhas-acoes-titulo">
      <header className="juridico-secao-topo">
        <div>
          <p className="eyebrow">Acompanhamento</p>
          <h2 id="juridico-minhas-acoes-titulo">Minhas ações</h2>
          <p className="texto-secundario">
            Processos vinculados ao seu CPF conforme a planilha atualizada pelo jurídico do
            sindicato.
          </p>
        </div>
      </header>

      {isLoading && !acoes && <EstadoCarregando />}
      {isError && !acoes && <p className="erro">Erro ao carregar suas ações.</p>}

      {acoes && acoes.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhuma ação cadastrada para o seu CPF no momento.</p>
        </div>
      )}

      {acoes && acoes.length > 0 && (
        <ul className="lista-juridico-acoes">
          {acoes.map((acao) => (
            <li key={acao.id} className="card-juridico-acao">
              <div>
                <p className="juridico-acao-numero">{acao.numeroAcao}</p>
                <h3>{acao.nome}</h3>
                <p className="texto-secundario">Atualizado em {formatarData(acao.updatedAt)}</p>
              </div>
              <span className="badge badge-juridico-status">{acao.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
