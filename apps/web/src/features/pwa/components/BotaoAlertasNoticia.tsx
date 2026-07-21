import { usePushNoticias } from '../hooks/usePushNoticias';

export function BotaoAlertasNoticia() {
  const { estado, erro, ativar, desativar, suportado } = usePushNoticias();

  if (!suportado) {
    return null;
  }

  const carregando = estado === 'carregando';
  const mostrarComoAtivo = estado === 'ativado' || carregando;

  return (
    <aside className="push-alertas" aria-label="Alertas de notícias">
      <div className="push-alertas-texto">
        <strong>Alertas de notícias</strong>
        <span>
          {mostrarComoAtivo
            ? carregando
              ? 'Ativando alertas neste aparelho…'
              : 'Ativos por padrão neste aparelho. Você recebe aviso ao publicar uma notícia.'
            : 'Alertas desativados. Toque em reativar para voltar a receber novidades.'}
        </span>
      </div>
      <div className="push-alertas-acoes">
        {mostrarComoAtivo ? (
          <button
            type="button"
            className="botao-secundario"
            disabled={carregando}
            onClick={() => void desativar()}
          >
            Desativar alertas
          </button>
        ) : (
          <button
            type="button"
            className="botao-primario"
            disabled={carregando}
            onClick={() => void ativar()}
          >
            Reativar alertas
          </button>
        )}
      </div>
      {erro && <p className="push-alertas-erro">{erro}</p>}
    </aside>
  );
}
