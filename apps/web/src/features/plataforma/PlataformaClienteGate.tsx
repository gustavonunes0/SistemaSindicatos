import type { ReactNode } from 'react';
import { RequireRole } from '../auth/components/guards';
import { PlataformaClientePage } from './PlataformaClientePage';

function protegidaPlataforma(element: ReactNode) {
  return <RequireRole role="SUPERADMIN">{element}</RequireRole>;
}

export function PlataformaClienteGate() {
  return protegidaPlataforma(<PlataformaClientePage />);
}
