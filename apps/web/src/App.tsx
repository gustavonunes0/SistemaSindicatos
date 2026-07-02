import { healthCheckSchema, type HealthCheck } from '@sindprf/types';

const health: HealthCheck = healthCheckSchema.parse({
  status: 'ok',
  timestamp: new Date().toISOString(),
});

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Sindicato PRF</h1>
      <p>Monorepo funcionando. Status do front: {health.status}</p>
    </main>
  );
}
