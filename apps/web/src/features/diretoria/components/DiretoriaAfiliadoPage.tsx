import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useMe } from '../../../auth/hooks';
import { useFormulariosDisponiveis } from '../../../formularios/hooks';
import { useRecursosDiretoria } from '../../hooks';

export function DiretoriaAfiliadoPage() {
  const { data: me, isLoading: carregandoMe } = useMe();
  const ehDiretor = Boolean(me?.afiliado?.diretor);
  const recursos = useRecursosDiretoria();
  const formularios = useFormulariosDisponiveis();

  const formulariosDiretoria =
    formularios.data?.filter((item) => item.publico === 'DIRETORIA') ?? [];

  if (carregandoMe) {
    return (
      <AreaLayout tipo="afiliado" titulo="Diretoria">
        <EstadoCarregando />
      </AreaLayout>
    );
  }

  if (!ehDiretor) {
    return (
      <AreaLayout
        tipo="afiliado"
        titulo="Diretoria"
        descricao="Área reservada aos membros da diretoria."
      >
        <div className="estado-vazio">
          <p>Você não está marcado como diretor neste sindicato.</p>
          <Link to="/afiliado">Voltar à visão geral</Link>
        </div>
      </AreaLayout>
    );
  }

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Diretoria"
      descricao="Links e formulários exclusivos para a diretoria."
    >
      <section className="painel-secao">
        <h2 className="painel-secao-titulo">Links</h2>
        {recursos.isLoading && <EstadoCarregando mensagem="Carregando links…" />}
        {recursos.isError && <p className="erro">Não foi possível carregar os links.</p>}
        {recursos.data && recursos.data.length === 0 && (
          <p className="estado-vazio-texto">Nenhum link disponível no momento.</p>
        )}
        {recursos.data && recursos.data.length > 0 && (
          <nav className="painel-atalhos">
            {recursos.data.map((recurso) => (
              <a
                key={recurso.id}
                href={recurso.url}
                target="_blank"
                rel="noreferrer"
                className="painel-atalho"
              >
                <span className="painel-atalho-titulo">{recurso.titulo}</span>
                <span className="painel-atalho-desc">
                  {recurso.descricao?.trim() || 'Abrir link externo'}
                </span>
              </a>
            ))}
          </nav>
        )}
      </section>

      <section className="painel-secao">
        <h2 className="painel-secao-titulo">Formulários da diretoria</h2>
        {formularios.isLoading && <EstadoCarregando mensagem="Carregando formulários…" />}
        {formulariosDiretoria.length === 0 && !formularios.isLoading && (
          <p className="estado-vazio-texto">
            Nenhum formulário exclusivo publicado. Os formulários gerais continuam em{' '}
            <Link to="/afiliado/formularios">Formulários</Link>.
          </p>
        )}
        {formulariosDiretoria.length > 0 && (
          <ul className="lista-formularios">
            {formulariosDiretoria.map((formulario) => (
              <li key={formulario.id} className="card-formulario">
                <div className="card-formulario-corpo">
                  <h2>{formulario.titulo}</h2>
                  {formulario.descricao && (
                    <p className="texto-secundario card-formulario-descricao">
                      {formulario.descricao}
                    </p>
                  )}
                </div>
                {formulario.urlExterna ? (
                  <a
                    href={formulario.urlExterna}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="botao-primario"
                  >
                    Abrir formulário
                  </a>
                ) : (
                  <Link to={`/formularios/${formulario.slug}`} className="botao-primario">
                    {formulario.jaRespondeu ? 'Ver formulário' : 'Responder'}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AreaLayout>
  );
}
