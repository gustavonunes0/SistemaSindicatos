import { useEffect, type ReactNode } from 'react';
import { aplicarBrandingNoDocumento, resolverMarca } from '../../lib/marca';
import { useTenantStore } from './store';

function hostEhPlataforma(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h === 'sindigest.stellarsolucoes.com.br' || h.startsWith('sindigest.');
}

function TelaCarregamento({ plataforma }: { plataforma: boolean }) {
  if (plataforma) {
    return (
      <div className="boot-screen boot-screen--stellar" role="status" aria-live="polite">
        <div className="boot-stellar-glow" aria-hidden="true" />
        <img
          src="/marca/stellar-logo-dark.png"
          alt="Stellar"
          className="boot-logo-wordmark"
          width={180}
          height={26}
          decoding="async"
        />
        <p className="boot-produto">SindiGest</p>
        <div className="boot-spinner" aria-hidden="true" />
        <p className="boot-texto">Preparando sua experiência…</p>
      </div>
    );
  }

  return (
    <div className="boot-screen boot-screen--sindicato" role="status" aria-live="polite">
      <div className="boot-marca-faixa" aria-hidden="true" />
      <p className="boot-produto boot-produto--ink">Carregando</p>
      <div className="boot-spinner boot-spinner--ink" aria-hidden="true" />
      <p className="boot-texto boot-texto--ink">Carregando sua experiência…</p>
    </div>
  );
}

function TelaDominioAusente({ detalhe }: { detalhe?: string | null }) {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const plataforma = hostEhPlataforma();
  const ehRede =
    Boolean(detalhe) &&
    /network|timeout|failed to fetch|ECONNREFUSED|ERR_NETWORK/i.test(detalhe ?? '');

  return (
    <div
      className={`boot-screen boot-screen--erro ${plataforma ? 'boot-screen--erro-stellar' : 'boot-screen--erro-sindicato'}`}
      role="alert"
    >
      {plataforma ? <div className="boot-stellar-glow" aria-hidden="true" /> : null}

      {plataforma ? (
        <img
          src="/marca/stellar-logo-dark.png"
          alt="Stellar"
          className="boot-logo-wordmark"
          width={160}
          height={23}
          decoding="async"
        />
      ) : (
        <div className="boot-marca-faixa" aria-hidden="true" />
      )}

      <p className={`boot-produto ${plataforma ? '' : 'boot-produto--ink'}`}>
        {plataforma ? 'SindiGest' : 'Acesso'}
      </p>

      <div className="boot-erro-painel">
        <p className="boot-erro-codigo">{ehRede ? 'API' : '404'}</p>
        <h1 className="boot-erro-titulo">
          {ehRede ? 'Não foi possível conectar' : 'Domínio não encontrado'}
        </h1>
        <p className="boot-erro-texto">
          {ehRede ? (
            <>A API não respondeu. Verifique se o serviço está no ar e tente novamente.</>
          ) : (
            <>
              O host <strong className="boot-erro-host">{host || '—'}</strong> não está vinculado a
              um tenant ativo nesta plataforma.
            </>
          )}
        </p>

        {!ehRede ? (
          <ul className="boot-erro-lista">
            <li>Confirme se o DNS (A/CNAME) aponta para a VPS correta.</li>
            <li>Cadastre o host no painel Stellar (SindiGest → cliente → domínios).</li>
            <li>Se acabou de cadastrar, aguarde alguns segundos e tente de novo.</li>
          </ul>
        ) : null}

        {detalhe && !ehRede ? <p className="boot-erro-detalhe">{detalhe}</p> : null}

        <div className="boot-erro-acoes">
          <button type="button" className="boot-erro-btn" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
          {plataforma ? (
            <a
              className="boot-erro-link"
              href="https://www.stellarsolucoes.com.br/"
              target="_blank"
              rel="noreferrer"
            >
              stellarsolucoes.com.br
            </a>
          ) : (
            <a
              className="boot-erro-link"
              href="https://sindigest.stellarsolucoes.com.br/"
              target="_blank"
              rel="noreferrer"
            >
              Abrir SindiGest
            </a>
          )}
        </div>
      </div>
    </div>
  );
}


/** Carrega o tenant do Host atual (bootstrap). */
export function TenantBootstrap({ children }: { children: ReactNode }) {
  const carregar = useTenantStore((s) => s.carregar);
  const carregando = useTenantStore((s) => s.carregando);
  const erro = useTenantStore((s) => s.erro);
  const tenant = useTenantStore((s) => s.tenant);
  const plataformaHint = hostEhPlataforma() || tenant?.tipo === 'PLATAFORMA';

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    // Aplica fallback imediatamente; troca para branding do tenant quando chegar.
    aplicarBrandingNoDocumento(resolverMarca());
  }, [tenant]);

  // Erro definitivo: domínio inválido / API fora.
  if (!carregando && (erro || !tenant)) {
    return <TelaDominioAusente detalhe={erro} />;
  }

  // Primeira pintura: splash curto só até ter tenant; evita bloquear se já houver cache.
  if (carregando && !tenant) {
    return <TelaCarregamento plataforma={plataformaHint} />;
  }

  return children;
}
