import { usePushNoticias } from '../hooks/usePushNoticias';

export function BotaoAlertasNoticia() {
  const { estado, erro, ativar, desativar, suportado } = usePushNoticias();

  if (!suportado) {
    return null;
  }

  return (
    <aside className="push-alertas" aria-label="Alertas de notícias">
      <div className="push-alertas-texto">
        <strong>Alertas no celular</strong>
        <span>
          {estado === 'ativado'
            ? 'Você recebe aviso quando uma notícia for publicada.'
            : 'Ative para ser avisado ao publicar uma notícia.'}
        </span>
      </div>
      <div className="push-alertas-acoes">
        {estado === 'ativado' ? (
          <button type="button" className="botao-secundario" onClick={() => void desativar()}>
            Desativar alertas
          </button>
        ) : (
          <button
            type="button"
            className="botao-primario"
            disabled={estado === 'carregando'}
            onClick={() => void ativar()}
          >
            {estado === 'carregando' ? 'Ativando…' : 'Ativar alertas'}
          </button>
        )}
      </div>
      {erro && <p className="push-alertas-erro">{erro}</p>}
    </aside>
  );
}
