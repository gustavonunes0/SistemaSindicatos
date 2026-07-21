import { useEffect, useState } from 'react';
import {
  buscarChaveVapid,
  cancelarInscricaoPush,
  registrarInscricaoPush,
} from '../api';
import {
  chaveVapidParaUint8Array,
  marcarPushAtivadoLocal,
  obterSubscriptionAtual,
  pushAtivadoLocal,
  pushSuportado,
} from '../push';

type EstadoPush = 'indisponivel' | 'desativado' | 'ativado' | 'carregando';

export function usePushNoticias() {
  const [estado, setEstado] = useState<EstadoPush>(() =>
    pushSuportado() ? (pushAtivadoLocal() ? 'ativado' : 'desativado') : 'indisponivel',
  );
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSuportado()) {
      setEstado('indisponivel');
      return;
    }

    let cancelado = false;
    void (async () => {
      try {
        const sub = await obterSubscriptionAtual();
        if (cancelado) return;
        if (sub && Notification.permission === 'granted') {
          marcarPushAtivadoLocal(true);
          setEstado('ativado');
        } else {
          marcarPushAtivadoLocal(false);
          setEstado('desativado');
        }
      } catch {
        if (!cancelado) setEstado('desativado');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  async function ativar(): Promise<void> {
    if (!pushSuportado()) return;
    setErro(null);
    setEstado('carregando');

    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setEstado('desativado');
        setErro('Permissão de notificação negada.');
        return;
      }

      const publicKey = await buscarChaveVapid();
      const registro = await navigator.serviceWorker.ready;
      let subscription = await registro.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chaveVapidParaUint8Array(publicKey) as BufferSource,
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Inscrição inválida');
      }

      await registrarInscricaoPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      marcarPushAtivadoLocal(true);
      setEstado('ativado');
    } catch (e) {
      setEstado('desativado');
      setErro(e instanceof Error ? e.message : 'Não foi possível ativar os alertas.');
    }
  }

  async function desativar(): Promise<void> {
    if (!pushSuportado()) return;
    setErro(null);
    setEstado('carregando');

    try {
      const subscription = await obterSubscriptionAtual();
      if (subscription) {
        await cancelarInscricaoPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      marcarPushAtivadoLocal(false);
      setEstado('desativado');
    } catch (e) {
      setEstado('ativado');
      setErro(e instanceof Error ? e.message : 'Não foi possível desativar os alertas.');
    }
  }

  return { estado, erro, ativar, desativar, suportado: estado !== 'indisponivel' };
}
