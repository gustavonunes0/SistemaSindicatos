import { useState } from 'react';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useEventos } from '../hooks';
import { EventoCard } from './EventoCard';

export function EventosPage() {
  const [busca, setBusca] = useState('');
  const { data: eventos, isLoading, isError } = useEventos({
    ...(busca.trim() ? { busca: busca.trim() } : {}),
  });

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Eventos"
      descricao="Veja as galerias dos eventos do sindicato e baixe as fotos."
    >
      <label className="campo evento-busca">
        <span className="campo-rotulo">Buscar</span>
        <input
          type="search"
          value={busca}
          placeholder="Título, local ou descrição…"
          onChange={(event) => setBusca(event.target.value)}
        />
      </label>

      {isLoading && <EstadoCarregando mensagem="Carregando eventos…" />}
      {isError && <p className="erro">Não foi possível carregar os eventos.</p>}

      {eventos && eventos.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum evento publicado no momento.</p>
        </div>
      )}

      {eventos && eventos.length > 0 && (
        <div className="eventos-grid">
          {eventos.map((evento) => (
            <EventoCard key={evento.id} evento={evento} />
          ))}
        </div>
      )}
    </AreaLayout>
  );
}
