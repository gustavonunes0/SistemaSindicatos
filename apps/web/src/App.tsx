import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { TenantBootstrap } from './features/tenant/TenantBootstrap';
import { useTenantStore } from './features/tenant/store';
import { router } from './router';
import { platformRouter } from './router-plataforma';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function hostEhPlataforma(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h === 'sindigest.stellarsolucoes.com.br' || h.startsWith('sindigest.');
}

function AppRouter() {
  const tipo = useTenantStore((s) => s.tenant?.tipo);
  const plataforma = tipo === 'PLATAFORMA' || (!tipo && hostEhPlataforma());
  return <RouterProvider router={plataforma ? platformRouter : router} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantBootstrap>
        <AppRouter />
      </TenantBootstrap>
    </QueryClientProvider>
  );
}
