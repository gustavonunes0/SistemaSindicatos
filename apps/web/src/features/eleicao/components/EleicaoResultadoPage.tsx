import { Link, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../lib/datas';
import { useEleicao, useResultado } from '../hooks';
import { ResultadoChapas } from './ResultadoChapas';

export function EleicaoResultadoPage() {
  const { id = '' } = useParams();
  const { data: eleicao } = useEleicao(id);
  const { data: resultado, isLoading, isError } = useResultado(id);

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={eleicao ? eleicao.titulo : 'Resultado'}
      descricao="Apuração da urna eletrônica"
      acoes={
        <Link to="/afiliado/eleicoes" className="botao-link-acao">
          ← Eleições
        </Link>
      }
    >
      {isLoading && <EstadoCarregando mensagem="Carregando resultado…" />}
      {isError && (
        <div className="estado-vazio">
          <p>O resultado desta eleição ainda não foi divulgado.</p>
        </div>
      )}

      {resultado && (
        <section className="resultado-painel">
          <header className="resultado-painel-cabecalho">
            <p className="eyebrow">Apuração</p>
            <h2>
              {resultado.porAclamacao ? 'Chapa eleita por aclamação' : 'Votos por chapa'}
            </h2>
            <p className="resultado-painel-texto">
              {resultado.porAclamacao
                ? 'Havia uma única chapa homologada, declarada eleita sem escrutínio secreto (Art. 38 do Estatuto).'
                : `Apurado em ${formatarDataHora(resultado.apuradoEm)}. O resultado oficial soma os votos presenciais conferidos pela Comissão Eleitoral.`}
            </p>
          </header>

          {!resultado.porAclamacao && (
            <dl className="resultado-painel-numeros">
              <div>
                <dt>Votos na urna eletrônica</dt>
                <dd>{resultado.totalVotos}</dd>
              </div>
              <div>
                <dt>Chapas apuradas</dt>
                <dd>{resultado.resultados.length}</dd>
              </div>
            </dl>
          )}

          <ResultadoChapas resultado={resultado} />
        </section>
      )}
    </AreaLayout>
  );
}
