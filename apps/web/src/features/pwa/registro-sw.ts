import { registerSW } from 'virtual:pwa-register';

type Listener = () => void;

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
let precisaAtualizar = false;
const listeners = new Set<Listener>();

function notificar() {
  for (const listener of listeners) {
    listener();
  }
}

/** Registra o service worker e avisa a UI quando houver nova versão. */
export function registrarServiceWorker() {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      precisaAtualizar = true;
      notificar();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      const verificar = () => {
        void registration.update();
      };

      // PWA costuma ficar aberta por horas — checa de tempo em tempo e ao voltar ao app.
      window.setInterval(verificar, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          verificar();
        }
      });
    },
  });
}

export function precisaAtualizarPwa(): boolean {
  return precisaAtualizar;
}

export function subscribeAtualizacaoPwa(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function aplicarAtualizacaoPwa(): Promise<void> {
  if (!updateSW) return;
  await updateSW(true);
}
