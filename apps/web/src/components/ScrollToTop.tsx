import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Em SPA a posição de scroll persiste entre rotas — força o topo a cada mudança de path. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
