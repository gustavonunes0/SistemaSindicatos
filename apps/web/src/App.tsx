import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { TenantBootstrap } from './features/tenant/TenantBootstrap';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantBootstrap>
        <RouterProvider router={router} />
      </TenantBootstrap>
    </QueryClientProvider>
  );
}
