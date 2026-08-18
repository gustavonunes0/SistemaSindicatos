import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useFormulariosDisponiveis } from '../hooks';

export function MeusFormulariosPage() {
  const { data: formularios, isLoading, isError } = useFormulariosDisponiveis();

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Formulários"
      descricao="Formulários abertos para participação dos filiados."
    >
      {isLoading && !formularios && <EstadoCarregando />}
      {isError && !formularios && <p className="erro">Erro ao carregar os formulários.</p>}

      {formularios && formularios.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum formulário disponível no momento.</p>
        </div>
      )}

      {formularios && formularios.length > 0 && (
        <ul className="lista-formularios">
          {formularios.map((formulario) => (
            <li key={formulario.id} className="card-formulario">
              <div>
                <h2>{formulario.titulo}</h2>
                {formulario.descricao && (
                  <p className="texto-secundario">{formulario.descricao}</p>
                )}
                <p className="texto-secundario">
                  {formulario.totalCampos} pergunta(s)
                  {formulario.jaRespondeu && ' · você já respondeu'}
                </p>
              </div>
              <Link
                to={`/formularios/${formulario.slug}`}
                className={formulario.jaRespondeu ? 'botao-secundario' : 'botao-primario'}
              >
                {formulario.jaRespondeu ? 'Ver formulário' : 'Responder'}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AreaLayout>
  );
}
