import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { formatarMoeda } from '../../../lib/moeda';
import { urlDaApi } from '../../../lib/urls';
import { useImovel } from '../hooks';
import { CalendarioDisponibilidade } from './CalendarioDisponibilidade';
import { SolicitarAluguelForm } from '../../solicitacoes/components/SolicitarAluguelForm';

export function ImovelDetalhePage() {
  const { id = '' } = useParams();
  const { data: imovel, isLoading, isError } = useImovel(id);
  const [fotoAtiva, setFotoAtiva] = useState(0);

  if (isLoading) {
    return (
      <AreaLayout tipo="afiliado" titulo="Imóvel">
        <p className="estado-carregando">Carregando imóvel…</p>
      </AreaLayout>
    );
  }

  if (isError || !imovel) {
    return (
      <AreaLayout tipo="afiliado" titulo="Imóvel não encontrado">
        <div className="estado-vazio">
          <p>Este imóvel não está mais disponível.</p>
          <Link to="/afiliado/imoveis" className="botao-primario">
            Voltar aos imóveis
          </Link>
        </div>
      </AreaLayout>
    );
  }

  const fotos = imovel.fotos ?? [];
  const indiceCapa = Math.min(fotoAtiva, Math.max(fotos.length - 1, 0));
  const fotoPrincipal = fotos[indiceCapa];

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={imovel.titulo}
      acoes={<Link to="/afiliado/imoveis">← Apartamentos</Link>}
    >
      <article className="imovel-detalhe">
        {fotoPrincipal ? (
          <div className="imovel-galeria">
            <img
              className="imovel-galeria-principal"
              src={urlDaApi(fotoPrincipal.url)}
              alt={`Foto ${indiceCapa + 1} de ${fotos.length}`}
            />
            {fotos.length > 1 && (
              <div className="imovel-galeria-miniaturas">
                {fotos.map((foto, indice) => (
                  <button
                    key={foto.id}
                    type="button"
                    className={indice === indiceCapa ? 'ativa' : undefined}
                    onClick={() => setFotoAtiva(indice)}
                    aria-label={`Ver foto ${indice + 1}`}
                  >
                    <img src={urlDaApi(foto.url)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="imovel-sem-foto">Fotos em breve</div>
        )}

        <div className="imovel-detalhe-info">
          <p className="imovel-detalhe-valor">{formatarMoeda(imovel.valor)}</p>
          <p className="imovel-detalhe-endereco">{imovel.endereco}</p>
          <p className="imovel-detalhe-descricao">{imovel.descricao}</p>

          {imovel.comodidades.length > 0 && (
            <>
              <h2 className="imovel-secao-titulo">Comodidades</h2>
              <ul className="imovel-comodidades">
                {imovel.comodidades.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <CalendarioDisponibilidade imovelId={imovel.id} />

        <SolicitarAluguelForm imovelId={imovel.id} imovelTitulo={imovel.titulo} />
      </article>
    </AreaLayout>
  );
}
