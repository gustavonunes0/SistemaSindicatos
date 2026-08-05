import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { TenantBootstrap } from './features/tenant/TenantBootstrap';
import { useTenantStore } from './features/tenant/store';
import { router } from './router';
import { platformRouter } from './router-plataforma';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function AppRouter() {
  const tipo = useTenantStore((s) => s.tenant?.tipo);
  return <RouterProvider router={tipo === 'PLATAFORMA' ? platformRouter : router} />;
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
