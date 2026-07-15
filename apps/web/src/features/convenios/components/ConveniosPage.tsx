import { useState } from 'react';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useDebounce } from '../../../lib/useDebounce';
import { AguardandoAprovacao } from '../../afiliado/components/AguardandoAprovacao';
import { useMe } from '../../auth/hooks';
import { useCategoriasConvenios, useConvenios } from '../hooks';
import { ConvenioCard } from './ConvenioCard';

export function ConveniosPage() {
  const { data: me, isLoading: carregandoMe } = useMe();
  const aprovado = me?.afiliado?.status === 'APROVADO';
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const buscaDebounced = useDebounce(busca.trim(), 350);

  const { data: categorias } = useCategoriasConvenios(aprovado);
  const {
    data: convenios,
    isLoading,
    isError,
  } = useConvenios(
    {
      busca: buscaDebounced || undefined,
      categoria: categoria || undefined,
    },
    aprovado,
  );

  const temFiltro = Boolean(buscaDebounced || categoria);

  return (
    <AreaLayout tipo="afiliado" titulo="Convênios">
      <p className="area-subtitulo">Benefícios e descontos exclusivos para afiliados.</p>

      {carregandoMe && <EstadoCarregando mensagem="Carregando…" />}

      {!carregandoMe && !aprovado && <AguardandoAprovacao recurso="Os convênios" />}

      {!carregandoMe && aprovado && (
        <>
          <div className="convenios-filtros">
            <label className="campo-busca">
              <span className="sr-only">Buscar convênio</span>
              <input
                type="search"
                placeholder="Buscar por nome ou benefício"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            </label>

            <label className="campo-categoria">
              <span className="sr-only">Filtrar por categoria</span>
              <select value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>
                <option value="">Todas as categorias</option>
                {categorias?.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading && <EstadoCarregando mensagem="Carregando convênios…" />}
          {isError && (
            <p className="erro">
              Não foi possível carregar os convênios. Tente novamente em instantes.
            </p>
          )}

          {convenios && convenios.length === 0 && (
            <div className="estado-vazio">
              {temFiltro ? (
                <p>Nenhum convênio corresponde à sua busca. Ajuste os filtros e tente de novo.</p>
              ) : (
                <p>Ainda não há convênios disponíveis. Volte em breve.</p>
              )}
            </div>
          )}

          {convenios && convenios.length > 0 && (
            <div className="convenios-grid">
              {convenios.map((convenio) => (
                <ConvenioCard key={convenio.id} convenio={convenio} />
              ))}
            </div>
          )}
        </>
      )}
    </AreaLayout>
  );
}
