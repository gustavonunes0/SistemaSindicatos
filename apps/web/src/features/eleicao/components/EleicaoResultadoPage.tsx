import { Link, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../lib/datas';
import { useEleicao, useResultado } from '../hooks';

export function EleicaoResultadoPage() {
  const { id = '' } = useParams();
  const { data: eleicao } = useEleicao(id);
  const { data: resultado, isLoading, isError } = useResultado(id);

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={eleicao ? `Resultado — ${eleicao.titulo}` : 'Resultado'}
      acoes={<Link to="/afiliado/eleicoes">← Eleições</Link>}
    >
      {isLoading && <EstadoCarregando mensagem="Carregando resultado…" />}
      {isError && (
        <p className="erro">O resultado ainda não está disponível para esta eleição.</p>
      )}

      {resultado && (
        <>
          <p className="dash-secao-ajuda">
            {resultado.porAclamacao
              ? 'Resultado por aclamação — sem escrutínio secreto.'
              : `Apuração eletrônica em ${formatarDataHora(resultado.apuradoEm)} — o resultado oficial soma os votos presenciais apurados pela Comissão Eleitoral.`}
          </p>

          {resultado.resultados.map((item) => (
            <div className="resultado-linha" key={item.chapaId}>
              <div className="resultado-linha-topo">
                <span>
                  Chapa {item.numero} — {item.nome}
                </span>
                <span>
                  {item.totalVotos} votos ({item.percentual.toFixed(1)}%)
                </span>
              </div>
              <div className="resultado-barra-trilho">
                <div
                  className="resultado-barra-preenchimento"
                  style={{ width: `${item.percentual}%` }}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </AreaLayout>
  );
}
