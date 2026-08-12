import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { StatusEleicao } from '@sindprf/types';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarDataHora } from '../../../../lib/datas';
import {
  useAbrirEleicao,
  useApurarEleicao,
  useContestacoes,
  useEleicaoAdmin,
  useEncerrarEleicao,
  useRemoverEleicao,
  useResolverAclamacao,
  useResultado,
} from '../../hooks';
import { rotuloStatusEleicaoCurto } from '../../rotulos';
import { ResultadoChapas } from '../ResultadoChapas';
import { ChapasAdminPanel } from './ChapasAdminPanel';
import { ComissaoEleitoralPanel } from './ComissaoEleitoralPanel';
import { ContestacoesAdminPanel } from './ContestacoesAdminPanel';
import { ElegiveisAdminPanel } from './ElegiveisAdminPanel';
import { EleicaoFormModal } from './EleicaoFormModal';

type AbaId = 'chapas' | 'eleitores' | 'contestacoes' | 'comissao';

const fases: { id: StatusEleicao; rotulo: string; ajuda: string }[] = [
  { id: 'AGENDADA', rotulo: 'Preparação', ajuda: 'Chapas, homologação e eleitores' },
  { id: 'ABERTA', rotulo: 'Votação', ajuda: 'Urna eletrônica aberta' },
  { id: 'ENCERRADA', rotulo: 'Urnas fechadas', ajuda: 'Aguardando apuração' },
  { id: 'APURADA', rotulo: 'Apurada', ajuda: 'Resultado divulgado' },
];

type ItemPreparo = {
  rotulo: string;
  pronto: boolean;
  ajuda: string;
  aba: AbaId;
};

export function EleicaoDetalheAdminPage() {
  const { id } = useParams<{ id: string }>();
  const eleicaoId = id!;
  const navigate = useNavigate();
  const { data: eleicao, isLoading, isError } = useEleicaoAdmin(eleicaoId);
  const { data: contestacoes } = useContestacoes(eleicaoId);
  const { data: resultado } = useResultado(eleicaoId, eleicao?.status === 'APURADA');
  const abrir = useAbrirEleicao(eleicaoId);
  const encerrar = useEncerrarEleicao(eleicaoId);
  const apurar = useApurarEleicao(eleicaoId);
  const aclamacao = useResolverAclamacao(eleicaoId);
  const removerEleicao = useRemoverEleicao();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const [modalEleicao, setModalEleicao] = useState(false);
  const [aba, setAba] = useState<AbaId | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  if (isLoading) {
    return (
      <AreaLayout tipo="admin" titulo="Eleição">
        <EstadoCarregando mensagem="Carregando eleição…" />
      </AreaLayout>
    );
  }

  if (isError || !eleicao) {
    return (
      <AreaLayout
        tipo="admin"
        titulo="Eleição"
        acoes={
          <Link to="/admin/eleicoes" className="botao-link-acao">
            ← Eleições
          </Link>
        }
      >
        <p className="erro">Não foi possível carregar esta eleição.</p>
      </AreaLayout>
    );
  }

  const chapasHomologadas = eleicao.chapas.filter((chapa) => chapa.status === 'HOMOLOGADA');
  const chapasPendentes = eleicao.chapas.filter((chapa) => chapa.status === 'INSCRITA').length;
  const contestacoesPendentes = (contestacoes ?? []).filter((contestacao) => {
    if (contestacao.status !== 'ABERTA') return false;
    const chapa = eleicao.chapas.find((item) => item.id === contestacao.chapaId);
    return Boolean(chapa?.prazoContestacaoFim && new Date() <= chapa.prazoContestacaoFim);
  }).length;

  const preparo: ItemPreparo[] = [
    {
      rotulo: 'Chapas cadastradas',
      pronto: eleicao.chapas.length > 0,
      ajuda: 'Cadastre as chapas concorrentes e seus candidatos.',
      aba: 'chapas',
    },
    {
      rotulo: 'Homologação decidida',
      pronto: chapasPendentes === 0,
      ajuda: `${chapasPendentes} chapa${chapasPendentes === 1 ? '' : 's'} aguardando decisão da Comissão.`,
      aba: 'chapas',
    },
    {
      rotulo: 'Impugnações e recursos resolvidos',
      pronto: contestacoesPendentes === 0,
      ajuda: `${contestacoesPendentes} contestação${contestacoesPendentes === 1 ? '' : 'ões'} em aberto dentro do prazo.`,
      aba: 'contestacoes',
    },
    {
      rotulo: 'Lista de eleitores definida',
      pronto: eleicao.totalElegiveis > 0,
      ajuda: 'Sincronize os aprovados e deixe só quem aderiu ao voto eletrônico.',
      aba: 'eleitores',
    },
  ];

  const prontoParaAbrir = preparo.every((item) => item.pronto);
  const podeAclamacao = eleicao.status === 'AGENDADA' && chapasHomologadas.length === 1;
  const percentualComparecimento =
    eleicao.totalElegiveis > 0
      ? Math.min(100, Math.round((eleicao.totalComparecimentos / eleicao.totalElegiveis) * 100))
      : 0;
  const indiceFase = fases.findIndex((fase) => fase.id === eleicao.status);
  const abaAtiva = aba ?? (eleicao.status === 'ABERTA' ? 'eleitores' : 'chapas');

  const abas: { id: AbaId; rotulo: string; contador?: number }[] = [
    { id: 'chapas', rotulo: 'Chapas', contador: eleicao.chapas.length },
    { id: 'eleitores', rotulo: 'Eleitores', contador: eleicao.totalElegiveis },
    { id: 'contestacoes', rotulo: 'Impugnações', contador: contestacoes?.length ?? 0 },
    { id: 'comissao', rotulo: 'Comissão' },
  ];

  const executarAcao = async (acao: () => Promise<unknown>) => {
    setErroAcao(null);
    try {
      await acao();
    } catch {
      setErroAcao(
        'A ação não foi concluída. Confira as pendências acima e tente de novo — o servidor recusa a abertura enquanto houver chapa sem homologação ou contestação no prazo.',
      );
    }
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo={eleicao.titulo}
      descricao={`Votação de ${formatarDataHora(eleicao.inicio)} até ${formatarDataHora(eleicao.fim)}`}
      acoes={
        <>
          <Link to="/admin/eleicoes" className="botao-link-acao">
            ← Eleições
          </Link>
          <Link to="/admin/tutoriais?tutorial=eleicoes" className="botao-secundario">
            Passo a passo
          </Link>
          {eleicao.status === 'AGENDADA' && (
            <>
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setModalEleicao(true)}
              >
                Editar
              </button>
              <button
                type="button"
                className="botao-perigo"
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Excluir eleição?',
                    descricao: `A eleição "${eleicao.titulo}" e suas chapas serão removidas permanentemente.`,
                    confirmarRotulo: 'Excluir',
                    onConfirmar: async () => {
                      await removerEleicao.mutateAsync(eleicaoId);
                      navigate('/admin/eleicoes');
                    },
                  })
                }
              >
                Excluir
              </button>
            </>
          )}
        </>
      }
    >
      <ol className="eleicao-fases" aria-label="Fases da eleição">
        {fases.map((fase, indice) => {
          const estado =
            indice < indiceFase ? 'concluida' : indice === indiceFase ? 'atual' : 'pendente';
          return (
            <li key={fase.id} className={`eleicao-fase-item eleicao-fase-item--${estado}`}>
              <span className="eleicao-fase-marca" aria-hidden="true" />
              <span className="eleicao-fase-rotulo">{fase.rotulo}</span>
              <span className="eleicao-fase-ajuda">{fase.ajuda}</span>
              {estado === 'atual' && <span className="visually-hidden">(fase atual)</span>}
            </li>
          );
        })}
      </ol>

      <section className="eleicao-passo" aria-labelledby="eleicao-passo-titulo">
        <div className="eleicao-passo-cabecalho">
          <p className="eyebrow">
            Fase atual · {rotuloStatusEleicaoCurto[eleicao.status]}
            {eleicao.resolvidaPorAclamacao ? ' por aclamação' : ''}
          </p>
          <h2 id="eleicao-passo-titulo">
            {eleicao.status === 'AGENDADA' && 'Abrir a votação'}
            {eleicao.status === 'ABERTA' && 'Acompanhar o comparecimento'}
            {eleicao.status === 'ENCERRADA' && 'Apurar os votos'}
            {eleicao.status === 'APURADA' && 'Proclamar o resultado'}
          </h2>
          <p className="eleicao-passo-texto">
            {eleicao.status === 'AGENDADA' &&
              'Resolva as pendências abaixo. A urna só abre por decisão da Comissão — o sistema nunca abre sozinho.'}
            {eleicao.status === 'ABERTA' &&
              'Os eleitores da lista já podem votar. Não há resultado parcial nesta fase, nem para o administrador.'}
            {eleicao.status === 'ENCERRADA' &&
              'A urna está fechada. Apure quando a Comissão Eleitoral estiver reunida — a contagem é registrada e não muda depois.'}
            {eleicao.status === 'APURADA' &&
              'Some os votos presenciais conferidos pela Comissão ao resultado eletrônico abaixo para a proclamação oficial.'}
          </p>
        </div>

        {eleicao.status === 'AGENDADA' && (
          <ul className="eleicao-passo-checklist">
            {preparo.map((item) => (
              <li
                key={item.rotulo}
                className={`eleicao-passo-item ${item.pronto ? 'eleicao-passo-item--pronto' : ''}`}
              >
                <span className="eleicao-passo-item-marca" aria-hidden="true">
                  {item.pronto ? '✓' : '!'}
                </span>
                <span className="eleicao-passo-item-texto">
                  <strong>{item.rotulo}</strong>
                  {!item.pronto && (
                    <>
                      <span>{item.ajuda}</span>
                      <button
                        type="button"
                        className="botao-link-acao"
                        onClick={() => setAba(item.aba)}
                      >
                        Resolver agora
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {(eleicao.status === 'ABERTA' || eleicao.status === 'ENCERRADA') && (
          <div className="eleicao-passo-comparecimento">
            <div className="eleicao-passo-comparecimento-topo">
              <span className="eleicao-metrica-rotulo">Comparecimento eletrônico</span>
              <strong>
                {eleicao.totalComparecimentos} de {eleicao.totalElegiveis} eleitores (
                {percentualComparecimento}%)
              </strong>
            </div>
            <div
              className="eleicao-progresso"
              role="progressbar"
              aria-valuenow={percentualComparecimento}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Comparecimento eletrônico"
            >
              <span style={{ width: `${percentualComparecimento}%` }} />
            </div>
          </div>
        )}

        {erroAcao && <p className="erro">{erroAcao}</p>}

        {eleicao.status !== 'APURADA' && (
          <div className="eleicao-passo-acoes">
            {eleicao.status === 'AGENDADA' && (
              <button
                type="button"
                className="botao-primario"
                disabled={abrir.isPending || !prontoParaAbrir}
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Abrir votação?',
                    descricao:
                      'A partir de agora os eleitores da lista podem votar, e chapas e candidatos ficam travados.',
                    confirmarRotulo: 'Abrir votação',
                    tom: 'primario',
                    onConfirmar: () => executarAcao(() => abrir.mutateAsync()),
                  })
                }
              >
                Abrir votação
              </button>
            )}

            {eleicao.status === 'ABERTA' && (
              <button
                type="button"
                className="botao-primario"
                disabled={encerrar.isPending}
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Encerrar votação?',
                    descricao: 'Ninguém mais consegue votar depois disso.',
                    confirmarRotulo: 'Encerrar votação',
                    onConfirmar: () => executarAcao(() => encerrar.mutateAsync()),
                  })
                }
              >
                Encerrar votação
              </button>
            )}

            {eleicao.status === 'ENCERRADA' && (
              <button
                type="button"
                className="botao-primario"
                disabled={apurar.isPending}
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Apurar votos?',
                    descricao:
                      'Conta os votos eletrônicos por chapa e divulga o resultado aos filiados. A contagem não pode ser refeita.',
                    confirmarRotulo: 'Apurar votos',
                    tom: 'primario',
                    onConfirmar: () => executarAcao(() => apurar.mutateAsync()),
                  })
                }
              >
                Apurar votos
              </button>
            )}

            {eleicao.status === 'AGENDADA' && !prontoParaAbrir && (
              <p className="eleicao-passo-bloqueio">
                Resolva as pendências marcadas para liberar a abertura.
              </p>
            )}
          </div>
        )}

        {podeAclamacao && (
          <div className="eleicao-passo-alternativa">
            <h3>Chapa única</h3>
            <p>
              Só a chapa {chapasHomologadas[0]!.numero} — {chapasHomologadas[0]!.nome} foi homologada.
              Pelo Art. 38 do Estatuto ela pode ser declarada eleita por aclamação em Assembleia, sem
              urna.
            </p>
            <button
              type="button"
              className="botao-secundario"
              disabled={aclamacao.isPending}
              onClick={() =>
                pedirConfirmacao({
                  titulo: 'Declarar eleita por aclamação?',
                  descricao: `A chapa "${chapasHomologadas[0]!.nome}" será declarada eleita e a eleição passa direto para apurada, sem votação.`,
                  confirmarRotulo: 'Declarar eleita',
                  tom: 'primario',
                  onConfirmar: () =>
                    executarAcao(() => aclamacao.mutateAsync(chapasHomologadas[0]!.id)),
                })
              }
            >
              Declarar eleita por aclamação
            </button>
          </div>
        )}
      </section>

      {eleicao.status === 'APURADA' && resultado && (
        <section className="eleicao-admin-bloco" aria-labelledby="eleicao-resultado-titulo">
          <div className="eleicao-admin-bloco-cabecalho">
            <div>
              <h2 id="eleicao-resultado-titulo">Resultado eletrônico</h2>
              <p>
                {resultado.porAclamacao
                  ? 'Eleição resolvida por aclamação — sem escrutínio secreto.'
                  : `Apurado em ${formatarDataHora(resultado.apuradoEm)} · ${resultado.totalVotos} votos na urna eletrônica.`}
              </p>
            </div>
          </div>
          <ResultadoChapas resultado={resultado} />
        </section>
      )}

      <div className="eleicao-abas" role="tablist" aria-label="Gestão da eleição">
        {abas.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`aba-${item.id}`}
            aria-selected={abaAtiva === item.id}
            aria-controls={`painel-${item.id}`}
            className={`eleicao-aba ${abaAtiva === item.id ? 'eleicao-aba--ativa' : ''}`}
            onClick={() => setAba(item.id)}
          >
            {item.rotulo}
            {item.contador !== undefined && (
              <span className="eleicao-aba-contador">{item.contador}</span>
            )}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`painel-${abaAtiva}`}
        aria-labelledby={`aba-${abaAtiva}`}
        className="eleicao-painel"
      >
        {abaAtiva === 'chapas' && <ChapasAdminPanel eleicao={eleicao} />}
        {abaAtiva === 'eleitores' && <ElegiveisAdminPanel eleicaoId={eleicaoId} />}
        {abaAtiva === 'contestacoes' && (
          <ContestacoesAdminPanel eleicaoId={eleicaoId} chapas={eleicao.chapas} />
        )}
        {abaAtiva === 'comissao' && <ComissaoEleitoralPanel eleicaoId={eleicaoId} />}
      </div>

      <EleicaoFormModal
        aberto={modalEleicao}
        id={eleicaoId}
        onFechar={() => setModalEleicao(false)}
      />
      {modalConfirmacao}
    </AreaLayout>
  );
}
