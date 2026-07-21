import axios from 'axios';
import { buscarChaveVapid, registrarInscricaoPush } from './api';
import {
  chaveVapidParaUint8Array,
  marcarPushAtivadoLocal,
  marcarPushOptOut,
  obterSubscriptionAtual,
  pushSuportado,
  subscriptionParaInput,
  usuarioDesativouPush,
} from './push';

export function mensagemErroPush(erro: unknown): string {
  if (axios.isAxiosError(erro) && erro.response?.status === 404) {
    return 'Push não está configurado na API (VAPID). Avise a equipe técnica.';
  }
  if (erro instanceof Error) {
    return erro.message;
  }
  return 'Não foi possível ativar os alertas.';
}

/** Inscreve no push e registra na API. Respeita opt-out explícito do usuário. */
export async function ativarPushNoticias(): Promise<boolean> {
  if (!pushSuportado() || usuarioDesativouPush()) {
    return false;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  if (Notification.permission === 'default') {
    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') {
      return false;
    }
  }

  const publicKey = await buscarChaveVapid();
  const registro = await navigator.serviceWorker.ready;

  const existente = await registro.pushManager.getSubscription();
  if (existente) {
    await existente.unsubscribe();
  }

  const subscription = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: chaveVapidParaUint8Array(publicKey) as BufferSource,
  });

  const input = subscriptionParaInput(subscription);
  if (!input) {
    throw new Error('Inscrição inválida');
  }

  await registrarInscricaoPush(input);
  marcarPushOptOut(false);
  marcarPushAtivadoLocal(true);
  return true;
}

/** Mantém inscrição se já houver permissão; cria se faltar subscription. */
export async function garantirPushNoticiasAtivo(): Promise<boolean> {
  if (!pushSuportado() || usuarioDesativouPush()) {
    return false;
  }
  if (Notification.permission === 'denied') {
    return false;
  }
  if (Notification.permission === 'granted') {
    const subscription = await obterSubscriptionAtual();
    if (subscription) {
      const input = subscriptionParaInput(subscription);
      if (input) {
        await registrarInscricaoPush(input);
        marcarPushAtivadoLocal(true);
        return true;
      }
    }
  }
  return ativarPushNoticias();
}
