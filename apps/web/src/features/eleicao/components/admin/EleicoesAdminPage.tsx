import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../../lib/datas';
import { useEleicoesAdmin } from '../../hooks';
import { rotuloStatusEleicaoCurto } from '../../rotulos';
import { EleicaoFormModal } from './EleicaoFormModal';

const proximaAcao = {
  AGENDADA: 'Preparação — cadastre chapas, homologue e defina os eleitores',
  ABERTA: 'Urna aberta — acompanhe o comparecimento',
  ENCERRADA: 'Urna fechada — apure os votos',
  APURADA: 'Resultado disponível para os filiados',
} as const;

const roteiro = [
  {
    titulo: 'Criar a eleição',
    texto: 'Defina título e o período em que a urna eletrônica fica aberta.',
  },
  {
    titulo: 'Cadastrar chapas e candidatos',
    texto: 'Número, nome e composição de cada chapa. Depois da abertura isso trava.',
  },
  {
    titulo: 'Homologar as chapas',
    texto: 'Cada decisão exige justificativa e abre 3 dias úteis para contestação.',
  },
  {
    titulo: 'Julgar impugnações e recursos',
    texto: 'Nenhuma contestação pode ficar em aberto dentro do prazo.',
  },
  {
    titulo: 'Definir eleitores e Comissão',
    texto: 'Sincronize os aprovados, remova quem não aderiu e registre a Comissão Eleitoral.',
  },
  {
    titulo: 'Abrir, encerrar e apurar',
    texto: 'Com chapa única, declare a eleita por aclamação em vez de abrir a urna.',
  },
];

export function EleicoesAdminPage() {
  const { data: eleicoes, isLoading, isError } = useEleicoesAdmin();
  const [modalAberto, setModalAberto] = useState(false);
  const [roteiroAberto, setRoteiroAberto] = useState(false);

  return (
    <AreaLayout
      tipo="admin"
      titulo="Eleições"
      descricao="Conduza o processo eleitoral: chapas, homologação, urna eletrônica e apuração."
      acoes={
        <button type="button" className="botao-primario" onClick={() => setModalAberto(true)}>
          Nova eleição
        </button>
      }
    >
      <section className={`eleicao-roteiro ${roteiroAberto ? 'eleicao-roteiro--aberto' : ''}`}>
        <button
          type="button"
          className="eleicao-roteiro-cabecalho"
          aria-expanded={roteiroAberto}
          onClick={() => setRoteiroAberto((aberto) => !aberto)}
        >
          <span>
            <span className="eleicao-roteiro-eyebrow">Passo a passo</span>
            <strong>Como conduzir uma eleição</strong>
            <span className="eleicao-roteiro-resumo">
              Seis etapas, da criação à apuração — na ordem exigida pelo Estatuto.
            </span>
          </span>
          <span className="eleicao-roteiro-sinal" aria-hidden="true">
            {roteiroAberto ? '−' : '+'}
          </span>
        </button>

        {roteiroAberto && (
          <div className="eleicao-roteiro-corpo">
            <ol className="eleicao-roteiro-etapas">
              {roteiro.map((etapa, indice) => (
                <li key={etapa.titulo}>
                  <span className="eleicao-roteiro-numero" aria-hidden="true">
                    {indice + 1}
                  </span>
                  <span>
                    <strong>{etapa.titulo}</strong>
                    <span>{etapa.texto}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link to="/admin/tutoriais?tutorial=eleicoes" className="botao-secundario">
              Ver o tutorial detalhado
            </Link>
          </div>
        )}
      </section>

      {isLoading && <EstadoCarregando mensagem="Carregando eleições…" />}
      {isError && <p className="erro">Não foi possível carregar as eleições. Tente novamente.</p>}

      {eleicoes && eleicoes.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhuma eleição cadastrada ainda.</p>
          <button type="button" className="botao-primario" onClick={() => setModalAberto(true)}>
            Criar a primeira
          </button>
        </div>
      )}

      {eleicoes && eleicoes.length > 0 && (
        <ul className="eleicao-admin-lista">
          {eleicoes.map((eleicao) => (
            <li key={eleicao.id}>
              <Link className="eleicao-admin-item" to={`/admin/eleicoes/${eleicao.id}`}>
                <div className="eleicao-admin-item-topo">
                  <h2 className="eleicao-admin-item-titulo">{eleicao.titulo}</h2>
                  <span className={`badge badge-eleicao-${eleicao.status.toLowerCase()}`}>
                    {rotuloStatusEleicaoCurto[eleicao.status]}
                    {eleicao.resolvidaPorAclamacao ? ' · aclamação' : ''}
                  </span>
                </div>
                <p className="eleicao-admin-item-ajuda">{proximaAcao[eleicao.status]}</p>
                <dl className="eleicao-admin-item-meta">
                  <div>
                    <dt>Início</dt>
                    <dd>{formatarDataHora(eleicao.inicio)}</dd>
                  </div>
                  <div>
                    <dt>Fim</dt>
                    <dd>{formatarDataHora(eleicao.fim)}</dd>
                  </div>
                </dl>
                <span className="eleicao-admin-item-cta">Gerenciar</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <EleicaoFormModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </AreaLayout>
  );
}
