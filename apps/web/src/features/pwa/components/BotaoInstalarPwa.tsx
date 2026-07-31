import { usePwaInstall } from '../hooks';

export function BotaoInstalarPwa() {
  const {
    visivel,
    podeInstalarAndroid,
    ios,
    iosInstrucoesAbertas,
    instalar,
    abrirInstrucoesIos,
    fecharInstrucoesIos,
    dispensar,
  } = usePwaInstall();

  if (!visivel) {
    return null;
  }

  const onAcao = () => {
    if (podeInstalarAndroid) {
      void instalar();
      return;
    }
    if (ios) {
      abrirInstrucoesIos();
    }
  };

  return (
    <>
      <aside className="pwa-instalar-bar" aria-label="Instalar aplicativo">
        <div className="pwa-instalar-texto">
          <strong>Instalar no celular</strong>
          <span>Acesso rápido à área do sindicalizado, offline básico.</span>
        </div>
        <div className="pwa-instalar-acoes">
          <button type="button" className="botao-primario pwa-instalar-botao" onClick={onAcao}>
            Adicionar à tela inicial
          </button>
          <button type="button" className="pwa-instalar-fechar" onClick={dispensar} aria-label="Fechar">
            ✕
          </button>
        </div>
      </aside>

      {iosInstrucoesAbertas && (
        <div className="pwa-ios-overlay" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-titulo">
          <div className="pwa-ios-painel">
            <h2 id="pwa-ios-titulo">Adicionar à Tela de Início</h2>
            <p>No Safari, toque em <strong>Compartilhar</strong> (ícone de exportar) e escolha{' '}
              <strong>Adicionar à Tela de Início</strong>.</p>
            <button type="button" className="botao-primario" onClick={fecharInstrucoesIos}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
