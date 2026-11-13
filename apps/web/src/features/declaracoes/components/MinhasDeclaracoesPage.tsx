import { MODELO_DECLARACAO_ROTULO, STATUS_DECLARACAO_ROTULO } from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../lib/datas';
import {
  useBaixarDeclaracao,
  useEmitirDeclaracaoFiliacao,
  useMinhasDeclaracoes,
} from '../hooks';

async function mensagemErroEmissao(erro: unknown): Promise<string> {
  if (isAxiosError(erro)) {
    let dados = erro.response?.data as unknown;
    if (typeof Blob !== 'undefined' && dados instanceof Blob) {
      try {
        dados = JSON.parse(await dados.text()) as unknown;
      } catch {
        dados = null;
      }
    }
    const msg =
      dados && typeof dados === 'object' && 'message' in dados
        ? (dados as { message?: unknown }).message
        : undefined;
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (Array.isArray(msg) && typeof msg[0] === 'string') return msg[0];
  }
  return 'Não foi possível emitir a declaração. Tente novamente.';
}

export function MinhasDeclaracoesPage() {
  const { data: declaracoes, isLoading, isError } = useMinhasDeclaracoes();
  const baixar = useBaixarDeclaracao();
  const emitir = useEmitirDeclaracaoFiliacao();
  const [erroEmissao, setErroEmissao] = useState<string | null>(null);

  const onEmitirFiliacao = () => {
    setErroEmissao(null);
    emitir.mutate(undefined, {
      onError: (erro) => {
        void mensagemErroEmissao(erro).then(setErroEmissao);
      },
    });
  };

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Minhas declarações"
      descricao="Emita a declaração de filiação ou acompanhe as emitidas por convênio."
    >
      <div className="declaracao-filiacao-acao">
        <div>
          <h2 className="titulo-secao-inline">Declaração de filiação</h2>
          <p className="texto-secundario">
            Documento simples atestando que você é filiado ao sindicato, no modelo oficial.
          </p>
        </div>
        <button
          type="button"
          className="botao-primario"
          disabled={emitir.isPending}
          onClick={onEmitirFiliacao}
        >
          {emitir.isPending ? 'Emitindo…' : 'Emitir declaração de filiação'}
        </button>
      </div>
      {erroEmissao && <p className="erro">{erroEmissao}</p>}

      {isLoading && !declaracoes && <EstadoCarregando />}
      {isError && !declaracoes && <p className="erro">Erro ao carregar suas declarações.</p>}

      {declaracoes && declaracoes.length === 0 && (
        <div className="estado-vazio">
          <p>Você ainda não tem declarações emitidas por convênio.</p>
          <Link to="/afiliado/convenios" className="botao-secundario">
            Ver convênios
          </Link>
        </div>
      )}

      {declaracoes && declaracoes.length > 0 && (
        <ul className="lista-declaracoes">
          {declaracoes.map((declaracao) => (
            <li key={declaracao.id} className="card-declaracao">
              <div>
                <h2>{declaracao.convenioNome}</h2>
                <p className="texto-secundario">
                  {MODELO_DECLARACAO_ROTULO[declaracao.modelo]} · emitida em{' '}
                  {formatarData(declaracao.emitidaEm)} · código {declaracao.codigo}
                </p>
                {declaracao.dependenteNome && (
                  <p className="texto-secundario">Dependente: {declaracao.dependenteNome}</p>
                )}
                <span className={`badge badge-declaracao-${declaracao.status.toLowerCase()}`}>
                  {STATUS_DECLARACAO_ROTULO[declaracao.status]}
                </span>
              </div>

              <div className="card-declaracao-acoes">
                {declaracao.temArquivoAssinado ? (
                  <button
                    type="button"
                    className="botao-primario"
                    disabled={baixar.isPending}
                    onClick={() => baixar.mutate({ id: declaracao.id, versao: 'assinada' })}
                  >
                    Baixar assinada
                  </button>
                ) : (
                  <span className="texto-secundario">
                    A versão assinada aparece aqui assim que o sindicato devolver.
                  </span>
                )}

                {declaracao.temArquivoOriginal && (
                  <button
                    type="button"
                    className="botao-secundario"
                    disabled={baixar.isPending}
                    onClick={() => baixar.mutate({ id: declaracao.id, versao: 'original' })}
                  >
                    Baixar original
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AreaLayout>
  );
}
