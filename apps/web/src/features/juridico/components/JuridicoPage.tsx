import { AreaLayout } from '../../../components/layout/AreaLayout';
import { GRUPOS_CONSULTA_JURIDICA } from '../consultas';
import { JuridicoAcoesAdminPanel } from './admin/JuridicoAcoesAdminPanel';
import { MinhasAcoesJuridicas } from './MinhasAcoesJuridicas';

type Props = {
  tipo: 'admin' | 'afiliado';
};

export function JuridicoPage({ tipo }: Props) {
  const descricaoAdmin =
    'Importe a planilha de ações, acompanhe o cadastro e acesse os portais oficiais da Justiça Federal.';
  const descricaoAfiliado =
    'Consulte suas ações vinculadas ao CPF e acesse os portais oficiais da Justiça Federal.';

  return (
    <AreaLayout
      tipo={tipo}
      titulo="Jurídico"
      descricao={tipo === 'admin' ? descricaoAdmin : descricaoAfiliado}
    >
      <div className="juridico-secoes">
        {tipo === 'admin' && <JuridicoAcoesAdminPanel />}
        {tipo === 'afiliado' && <MinhasAcoesJuridicas />}

        {GRUPOS_CONSULTA_JURIDICA.map((grupo) => (
          <section key={grupo.sigla} aria-labelledby={`juridico-${grupo.sigla}`}>
            <header className="juridico-secao-topo">
              <div>
                <p className="eyebrow">{grupo.sigla}</p>
                <h2 id={`juridico-${grupo.sigla}`}>{grupo.nome}</h2>
                <p className="texto-secundario">{grupo.nota}</p>
              </div>
            </header>

            <ul className="lista-juridico">
              {grupo.consultas.map((consulta) => (
                <li key={consulta.id} className="card-juridico">
                  <div className="card-juridico-corpo">
                    <h3>{consulta.titulo}</h3>
                    <p className="texto-secundario">{consulta.descricao}</p>
                  </div>
                  <a
                    className="botao-primario"
                    href={consulta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir consulta
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AreaLayout>
  );
}
