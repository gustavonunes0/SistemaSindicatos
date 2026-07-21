import { useEffect, useState } from 'react';
import { ativarPushNoticias, garantirPushNoticiasAtivo, mensagemErroPush } from '../ativar-push-noticias';
import { cancelarInscricaoPush } from '../api';
import {
  marcarPushAtivadoLocal,
  marcarPushOptOut,
  obterSubscriptionAtual,
  pushSuportado,
  usuarioDesativouPush,
} from '../push';

type EstadoPush = 'indisponivel' | 'desativado' | 'ativado' | 'carregando';

function estadoInicial(): EstadoPush {
  if (!pushSuportado()) return 'indisponivel';
  if (usuarioDesativouPush() || Notification.permission === 'denied') return 'desativado';
  return 'carregando';
}

export function usePushNoticias() {
  const [estado, setEstado] = useState<EstadoPush>(estadoInicial);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSuportado()) {
      setEstado('indisponivel');
      return;
    }

    let cancelado = false;
    void (async () => {
      try {
        const ativo = await garantirPushNoticiasAtivo();
        if (cancelado) return;
        setEstado(ativo ? 'ativado' : 'desativado');
        if (!ativo && !usuarioDesativouPush()) {
          marcarPushAtivadoLocal(false);
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
      const ok = await ativarPushNoticias();
      setEstado(ok ? 'ativado' : 'desativado');
      if (!ok) {
        setErro(
          Notification.permission === 'denied'
            ? 'Notificações bloqueadas no navegador. Libere nas configurações do site.'
            : 'Não foi possível ativar os alertas.',
        );
      }
    } catch (e) {
      setEstado('desativado');
      setErro(mensagemErroPush(e));
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
      marcarPushOptOut(true);
      marcarPushAtivadoLocal(false);
      setEstado('desativado');
    } catch (e) {
      setEstado('ativado');
      setErro(mensagemErroPush(e));
    }
  }

  return { estado, erro, ativar, desativar, suportado: estado !== 'indisponivel' };
}

/** Ativa alertas ao entrar no site (opt-out). Roda uma vez por montagem do layout público. */
export function usePushNoticiasPorPadrao(): void {
  useEffect(() => {
    if (!pushSuportado() || usuarioDesativouPush()) return;
    void garantirPushNoticiasAtivo().catch(() => undefined);
  }, []);
}
