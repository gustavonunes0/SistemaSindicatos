import { vapidPublicKeySchema, type PushSubscriptionInput } from '@sindprf/types';
import { api } from '../../lib/http';

export async function buscarChaveVapid(): Promise<string> {
  const { data } = await api.get('/push/vapid-public-key');
  return vapidPublicKeySchema.parse(data).publicKey;
}

export async function registrarInscricaoPush(input: PushSubscriptionInput): Promise<void> {
  await api.post('/push/subscribe', input);
}

export async function cancelarInscricaoPush(endpoint: string): Promise<void> {
  await api.post('/push/unsubscribe', { endpoint });
}
