import { useCallback, useEffect, useState } from 'react';
import {
  aplicarAtualizacaoPwa,
  precisaAtualizarPwa,
  subscribeAtualizacaoPwa,
} from '../registro-sw';

export function BotaoAtualizarPwa() {
  const [visivel, setVisivel] = useState(precisaAtualizarPwa);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    return subscribeAtualizacaoPwa(() => {
      setVisivel(precisaAtualizarPwa());
    });
  }, []);

  const atualizar = useCallback(async () => {
    setAplicando(true);
    try {
      await aplicarAtualizacaoPwa();
    } catch {
      setAplicando(false);
    }
  }, []);

  if (!visivel) {
    return null;
  }

  return (
    <aside className="pwa-barra-fixixa pwa-atualizar-bar" aria-label="Atualização disponível">
      <div className="pwa-instalar-texto">
        <strong>Nova versão disponível</strong>
        <span>Atualize para ver as últimas mudanças do site.</span>
      </div>
      <div className="pwa-instalar-acoes">
        <button
          type="button"
          className="botao-primario pwa-instalar-botao"
          onClick={() => void atualizar()}
          disabled={aplicando}
        >
          {aplicando ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>
    </aside>
  );
}
