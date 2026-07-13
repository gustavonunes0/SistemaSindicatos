import { useCallback, useEffect, useState } from 'react';

function detectarIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function detectarInstalado(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [instalado, setInstalado] = useState(false);
  const [iosInstrucoesAbertas, setIosInstrucoesAbertas] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    setInstalado(detectarInstalado());
    setIos(detectarIos());

    const onBeforeInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setPromptEvent(event);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const instalar = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setInstalado(true);
    }
    setPromptEvent(null);
  }, [promptEvent]);

  const abrirInstrucoesIos = useCallback(() => {
    setIosInstrucoesAbertas(true);
  }, []);

  const fecharInstrucoesIos = useCallback(() => {
    setIosInstrucoesAbertas(false);
  }, []);

  const dispensar = useCallback(() => {
    setDispensado(true);
  }, []);

  const visivel =
    !instalado &&
    !dispensado &&
    (Boolean(promptEvent) || (ios && !detectarInstalado()));

  return {
    visivel,
    podeInstalarAndroid: Boolean(promptEvent),
    ios,
    iosInstrucoesAbertas,
    instalar,
    abrirInstrucoesIos,
    fecharInstrucoesIos,
    dispensar,
  };
}
