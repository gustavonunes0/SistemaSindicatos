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
      {isLoading && !formularios && <EstadoCarregando mensagem="Carregando formulários…" />}
      {isError && !formularios && <p className="erro">Erro ao carregar os formulários.</p>}

      {formularios && formularios.length === 0 && (
        <div className="estado-vazio formularios-vazio">
          <p className="eyebrow">Nada por agora</p>
          <h2>Nenhum formulário disponível</h2>
          <p>
            Quando o sindicato publicar uma pesquisa ou solicitação, ela aparece aqui para você
            responder.
          </p>
        </div>
      )}

      {formularios && formularios.length > 0 && (
        <ul className="lista-formularios">
          {formularios.map((formulario) => (
            <li key={formulario.id} className="card-formulario">
              <div className="card-formulario-corpo">
                <div className="card-formulario-topo">
                  {formulario.jaRespondeu ? (
                    <span className="badge badge-formulario-publicado">Respondido</span>
                  ) : (
                    <span className="badge badge-formulario-rascunho">Pendente</span>
                  )}
                  <span className="card-formulario-meta">
                    {formulario.totalCampos}{' '}
                    {formulario.totalCampos === 1 ? 'pergunta' : 'perguntas'}
                  </span>
                </div>
                <h2>{formulario.titulo}</h2>
                {formulario.descricao && (
                  <p className="texto-secundario card-formulario-descricao">
                    {formulario.descricao}
                  </p>
                )}
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
