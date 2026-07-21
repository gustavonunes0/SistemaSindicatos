import type { PushSubscriptionInput } from '@sindprf/types';

const STORAGE_KEY = 'sindprf-push-ativado';
const OPT_OUT_KEY = 'sindprf-push-opt-out';

export function pushSuportado(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function chaveVapidParaUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const saida = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    saida[i] = raw.charCodeAt(i);
  }
  return saida;
}

export function marcarPushAtivadoLocal(ativo: boolean): void {
  if (ativo) {
    localStorage.setItem(STORAGE_KEY, '1');
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function pushAtivadoLocal(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

/** Usuário escolheu desativar alertas — não reativar automaticamente. */
export function usuarioDesativouPush(): boolean {
  return localStorage.getItem(OPT_OUT_KEY) === '1';
}

export function marcarPushOptOut(optOut: boolean): void {
  if (optOut) {
    localStorage.setItem(OPT_OUT_KEY, '1');
  } else {
    localStorage.removeItem(OPT_OUT_KEY);
  }
}

export async function obterSubscriptionAtual(): Promise<PushSubscription | null> {
  const registro = await navigator.serviceWorker.ready;
  return registro.pushManager.getSubscription();
}

export function subscriptionParaInput(subscription: PushSubscription): PushSubscriptionInput | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}
