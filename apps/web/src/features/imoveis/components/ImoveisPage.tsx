import { useState } from 'react';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useDebounce } from '../../../lib/useDebounce';
import { useImoveis } from '../hooks';
import { ImovelCard } from './ImovelCard';

export function ImoveisPage() {
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca.trim(), 350);

  const { data: imoveis, isLoading, isError } = useImoveis({
    busca: buscaDebounced || undefined,
  });

  return (
    <AreaLayout tipo="afiliado" titulo="Apartamentos">
      <p className="area-subtitulo">
        Imóveis disponíveis para afiliados — consulte fotos e disponibilidade.
      </p>

      <div className="imoveis-filtros">
        <label className="campo-busca">
          <span className="sr-only">Buscar imóvel</span>
          <input
            type="search"
            placeholder="Buscar por título, endereço ou descrição"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </label>
      </div>

      {isLoading && <EstadoCarregando mensagem="Carregando imóveis…" />}
      {isError && (
        <p className="erro">Não foi possível carregar os imóveis. Tente novamente em instantes.</p>
      )}

      {imoveis && imoveis.length === 0 && (
        <div className="estado-vazio">
          {buscaDebounced ? (
            <p>Nenhum imóvel corresponde à sua busca. Ajuste o termo e tente de novo.</p>
          ) : (
            <p>Ainda não há imóveis cadastrados. Volte em breve.</p>
          )}
        </div>
      )}

      {imoveis && imoveis.length > 0 && (
        <div className="imoveis-grid">
          {imoveis.map((imovel) => (
            <ImovelCard key={imovel.id} imovel={imovel} />
          ))}
        </div>
      )}
    </AreaLayout>
  );
}
