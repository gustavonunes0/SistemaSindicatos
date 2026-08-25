import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';

type TutorialEtapa = {
  titulo: string;
  passos: string[];
};

type Tutorial = {
  id: string;
  titulo: string;
  grupo: string;
  resumo: string;
  rota: string;
  acao: string;
  /** Passos simples (tutoriais curtos). */
  passos?: string[];
  /** Etapas nomeadas (tutoriais longos, ex.: eleição). */
  etapas?: TutorialEtapa[];
  dicas?: string[];
};

const TUTORIAIS: Tutorial[] = [
  {
    id: 'afiliados',
    titulo: 'Aprovar e gerenciar filiados',
    grupo: 'Operação',
    resumo: 'Cadastre o sindicalizado na secretaria, aprove solicitações do site e redefina senhas.',
    rota: '/admin/afiliados',
    acao: 'Abrir filiados',
    passos: [
      'Abra filiados no menu lateral.',
      'Quem se cadastra no site entra como Pendente. Use Aprovar para liberar o acesso.',
      'Em Cadastrar filiado, crie o acesso na hora (útil após a filiação presencial).',
      'Filtre por status (Pendente, Aprovado ou Inativo) para achar um cadastro.',
      'Se precisar, use Inativar ou Reabrir. Em Senha, defina uma nova senha de acesso.',
    ],
    dicas: [
      'O público solicita filiação em /cadastro. O login só funciona depois da aprovação.',
      'Novos filiados também podem surgir automaticamente na importação do D8.',
    ],
  },
  {
    id: 'balancetes',
    titulo: 'Importar balancete Fortes',
    grupo: 'Financeiro',
    resumo: 'Envie o PDF mensal do Fortes Contábil para ver receitas e despesas por categoria.',
    rota: '/admin/financeiro/balancetes',
    acao: 'Abrir balancetes',
    passos: [
      'Vá em Financeiro → Balancetes (ou use a subnav do módulo).',
      'Arraste o PDF do balancete ou clique em Escolher PDF.',
      'Clique em Importar mês. A competência é lida do período do arquivo.',
      'Abra o mês na lista para ver o resultado e as categorias.',
      'Expanda uma categoria para conferir as contas contábeis do Fortes.',
    ],
    dicas: [
      'Reimportar o mesmo mês substitui os dados anteriores.',
      'Use o filtro Receitas / Despesas e Expandir tudo no detalhe do mês.',
    ],
  },
  {
    id: 'd8',
    titulo: 'Importar D8 (SIAPE)',
    grupo: 'Financeiro',
    resumo: 'Importe o extrato de mensalidade sindical e sincronize a base de afiliados.',
    rota: '/admin/financeiro/d8',
    acao: 'Abrir D8',
    passos: [
      'Vá em Financeiro → D8 (SIAPE).',
      'Escolha o tipo: Servidor ou Pensionista.',
      'Selecione o PDF do D8 e clique em Importar PDF.',
      'Abra a competência na lista para analisar arrecadação e linhas.',
      'Confira afiliados sem desconto e linhas sem cadastro, se houver.',
    ],
    dicas: [
      'Quem aparece no D8 fica aprovado; aprovados/inativos ausentes na competência podem ser inativados.',
      'Novos CPF geram usuário com login = CPF e senha = matrícula SIAPE.',
    ],
  },
  {
    id: 'solicitacoes',
    titulo: 'Atender solicitações de locação',
    grupo: 'Operação',
    resumo: 'Fluxo legado de chat de locação. A reserva dos afiliados agora é feita pelo link externo abre.ai/sindprfcereserva.',
    rota: '/admin/solicitacoes',
    acao: 'Abrir solicitações',
    passos: [
      'Abra Solicitações no menu.',
      'Filtre por status (Aberta, Em andamento ou Fechada).',
      'Clique na solicitação para ver os detalhes e o período desejado.',
      'Altere o status conforme o andamento do atendimento.',
      'Responda o afiliado pelo chat da solicitação.',
    ],
  },
  {
    id: 'eleicoes',
    titulo: 'Cadastrar e conduzir uma eleição',
    grupo: 'Operação',
    resumo:
      'Fluxo completo: criar a eleição, chapas, candidatos, homologação, elegíveis, votação e apuração (ou aclamação).',
    rota: '/admin/eleicoes',
    acao: 'Abrir eleições',
    etapas: [
      {
        titulo: '1. Criar a eleição',
        passos: [
          'Em Eleições, clique em Nova eleição.',
          'Preencha o Título (mínimo 3 caracteres), por exemplo: Eleição da Diretoria — Triênio 2028/2030.',
          'Informe Início da votação e Fim da votação (o fim precisa ser depois do início).',
          'Opcional: datas de inscrição de chapas — são só informativas; o cadastro de chapas no admin não fica bloqueado por elas.',
          'Clique em Criar eleição. O status inicial será Agendada.',
          'Na lista, clique em Gerenciar para abrir o detalhe da eleição.',
        ],
      },
      {
        titulo: '2. Cadastrar chapas e candidatos',
        passos: [
          'Na aba Chapas, clique em Nova chapa (só funciona enquanto a eleição está Agendada).',
          'Informe Número (inteiro ≥ 1, único na eleição), Nome da chapa e, se quiser, Slogan.',
          'Clique em Cadastrar chapa. A chapa nasce como Aguardando homologação.',
          'No card da chapa, clique em Adicionar candidato.',
          'Preencha Nome, Cargo (ex.: Presidente, Vice-presidente) e, se quiser, Foto (URL).',
          'Repita para todas as chapas. Depois que a urna abrir, chapas e candidatos ficam travados.',
        ],
      },
      {
        titulo: '3. Homologar as chapas',
        passos: [
          'Ainda na aba Chapas, em cada chapa Aguardando homologação preencha Justificativa da decisão (mínimo 5 caracteres).',
          'Clique em Homologar ou Não homologar.',
          'A decisão grava a justificativa e abre prazo de 3 dias úteis para contestação (pula sábado e domingo; não considera feriados).',
          'A pendência "Homologação decidida" no cartão da fase atual só fica verde quando nenhuma chapa está aguardando.',
        ],
      },
      {
        titulo: '4. Julgar impugnações e recursos',
        passos: [
          'Quem registra a contestação é o filiado, no prazo de 3 dias úteis após a homologação.',
          'Chapa homologada → o filiado pode Impugnar; chapa não homologada → pode Recorrer.',
          'Na aba Impugnações, cada item mostra a chapa contestada e o motivo.',
          'Escreva a Decisão da Comissão e clique em Deferir ou Indeferir.',
          'Deferir impugnação derruba a homologação; deferir recurso homologa a chapa.',
        ],
      },
      {
        titulo: '5. Definir eleitores e registrar a Comissão',
        passos: [
          'Na aba Eleitores, clique em Sincronizar aprovados para incluir todos os filiados aprovados que ainda não estão na lista.',
          'Ajuste a lista: inclua pelo seletor ou remova quem não aderiu ao voto eletrônico (Art. 38 §3º). Quem já votou não pode ser removido.',
          'Use as abas Todos / Já votaram / Pendentes e a busca por nome ou matrícula.',
          'Na aba Comissão, escolha o administrador pelo e-mail, marque Titular ou Suplente e clique em Adicionar. É registro de auditoria — não muda permissões.',
        ],
      },
      {
        titulo: '6. Abrir a urna (ou declarar aclamação)',
        passos: [
          'No cartão da fase atual, confira as quatro pendências: chapas cadastradas, homologação decidida, contestações resolvidas e lista de eleitores.',
          'Com tudo verde, clique em Abrir votação e confirme. A eleição passa para Aberta.',
          'Chapa única: se só uma chapa foi homologada, aparece o bloco Chapa única — clique em Declarar eleita por aclamação e a eleição vai direto para apurada, sem urna (Art. 38).',
          'A abertura é sempre manual. O sistema pode encerrar sozinho depois do horário de Fim, mas nunca abre sozinho.',
        ],
      },
      {
        titulo: '7. Encerrar e apurar',
        passos: [
          'Com a eleição Aberta, acompanhe a barra de comparecimento na aba Eleitores.',
          'Clique em Encerrar votação quando fechar as urnas (ou aguarde o fim do prazo).',
          'Com status Encerrada, clique em Apurar votos. O resultado passa a aparecer para os filiados.',
          'Some os votos presenciais conferidos pela Comissão ao resultado eletrônico para a proclamação oficial.',
        ],
      },
    ],
    dicas: [
      'Linha do tempo no topo: Preparação → Votação → Urnas fechadas → Apurada.',
      'Não há resultado parcial enquanto a votação está Aberta — nem para o administrador.',
      'Editar ou excluir a eleição só é possível enquanto ela estiver Agendada.',
      'O filiado vê a cédula só se estiver na lista de eleitores; ao votar ele recebe um protocolo que comprova o comparecimento sem revelar o voto.',
    ],
  },
  {
    id: 'noticias',
    titulo: 'Publicar uma notícia',
    grupo: 'Conteúdo',
    resumo: 'Crie comunicados com título, capa e texto para o site público.',
    rota: '/admin/noticias',
    acao: 'Abrir notícias',
    passos: [
      'Abra Notícias e clique em Nova notícia.',
      'Preencha o título e o conteúdo no editor.',
      'Opcional: envie uma imagem de capa.',
      'Escolha o status: Rascunho (só admin) ou Publicado (aparece no site).',
      'Salve. Depois você pode editar ou excluir na lista.',
    ],
  },
  {
    id: 'convenios',
    titulo: 'Cadastrar um convênio',
    grupo: 'Conteúdo',
    resumo: 'Cadastre parceiros e benefícios para a categoria.',
    rota: '/admin/convenios',
    acao: 'Abrir convênios',
    passos: [
      'Abra Convênios e clique em Novo convênio.',
      'Informe nome, categoria e descrição do benefício.',
      'Opcional: logo, link, contato e vigência.',
      'Marque se o convênio está ativo e salve.',
      'Use Editar ou Excluir na lista quando precisar atualizar.',
    ],
  },
  {
    id: 'imoveis',
    titulo: 'Cadastrar um apartamento',
    grupo: 'Conteúdo',
    resumo: 'Cadastro interno de imóveis (legado). Filiados reservam pelo link oficial abre.ai/sindprfcereserva.',
    rota: '/admin/imoveis',
    acao: 'Abrir apartamentos',
    passos: [
      'Abra Apartamentos e clique em Novo apartamento.',
      'Preencha título, endereço, valor por dia e comodidades.',
      'Adicione fotos e marque se está ativo.',
      'Salve o cadastro.',
      'Na edição, inclua períodos bloqueados ou reservados para controlar a agenda.',
    ],
  },
];

const GRUPOS = ['Operação', 'Financeiro', 'Conteúdo'] as const;

export function TutoriaisAdminPage() {
  const [parametros] = useSearchParams();
  const [filtroGrupo, setFiltroGrupo] = useState<'todos' | (typeof GRUPOS)[number]>('todos');
  const [busca, setBusca] = useState('');
  const [abertoId, setAbertoId] = useState<string | null>(TUTORIAIS[0]?.id ?? null);

  // Permite chegar direto no tutorial certo a partir de outra tela (?tutorial=eleicoes).
  const tutorialPedido = parametros.get('tutorial');
  useEffect(() => {
    if (tutorialPedido && TUTORIAIS.some((item) => item.id === tutorialPedido)) {
      setAbertoId(tutorialPedido);
    }
  }, [tutorialPedido]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return TUTORIAIS.filter((item) => {
      if (filtroGrupo !== 'todos' && item.grupo !== filtroGrupo) return false;
      if (!termo) return true;
      const passosSimples = item.passos ?? [];
      const passosEtapas = item.etapas?.flatMap((etapa) => [etapa.titulo, ...etapa.passos]) ?? [];
      return (
        item.titulo.toLowerCase().includes(termo) ||
        item.resumo.toLowerCase().includes(termo) ||
        passosSimples.some((passo) => passo.toLowerCase().includes(termo)) ||
        passosEtapas.some((passo) => passo.toLowerCase().includes(termo))
      );
    });
  }, [busca, filtroGrupo]);

  return (
    <AreaLayout
      tipo="admin"
      titulo="Tutoriais"
      descricao="Passo a passo para cadastrar, importar e operar cada módulo do sistema."
    >
      <section className="tut-intro">
        <p className="eyebrow">Ajuda do admin</p>
        <h2 className="tut-intro-titulo">Como cadastrar cada coisa</h2>
        <p className="tut-intro-texto">
          Escolha um tutorial, siga os passos na ordem e use o botão para ir direto à tela
          correspondente.
        </p>
      </section>

      <div className="tut-toolbar" role="search" aria-label="Filtrar tutoriais">
        <div className="tut-segmentos" role="tablist" aria-label="Grupo">
          <button
            type="button"
            role="tab"
            aria-selected={filtroGrupo === 'todos'}
            className={`tut-segmento ${filtroGrupo === 'todos' ? 'tut-segmento--ativo' : ''}`}
            onClick={() => setFiltroGrupo('todos')}
          >
            Todos
          </button>
          {GRUPOS.map((grupo) => (
            <button
              key={grupo}
              type="button"
              role="tab"
              aria-selected={filtroGrupo === grupo}
              className={`tut-segmento ${filtroGrupo === grupo ? 'tut-segmento--ativo' : ''}`}
              onClick={() => setFiltroGrupo(grupo)}
            >
              {grupo}
            </button>
          ))}
        </div>

        <label className="tut-busca">
          Buscar
          <input
            type="search"
            value={busca}
            placeholder="Ex.: balancete, notícia, eleição…"
            onChange={(event) => setBusca(event.target.value)}
          />
        </label>
      </div>

      {filtrados.length === 0 ? (
        <div className="estado-vazio">
          <p>Nenhum tutorial corresponde aos filtros.</p>
        </div>
      ) : (
        <ul className="tut-lista">
          {filtrados.map((tutorial) => {
            const aberto = abertoId === tutorial.id;
            return (
              <li key={tutorial.id} className={`tut-item ${aberto ? 'tut-item--aberto' : ''}`}>
                <button
                  type="button"
                  className="tut-item-cabecalho"
                  aria-expanded={aberto}
                  onClick={() => setAbertoId(aberto ? null : tutorial.id)}
                >
                  <span className="tut-item-texto">
                    <span className="tut-item-grupo">{tutorial.grupo}</span>
                    <strong className="tut-item-titulo">{tutorial.titulo}</strong>
                    <span className="tut-item-resumo">{tutorial.resumo}</span>
                  </span>
                  <span className="tut-item-chevron" aria-hidden="true">
                    {aberto ? '−' : '+'}
                  </span>
                </button>

                {aberto && (
                  <div className="tut-item-corpo">
                    {tutorial.etapas && tutorial.etapas.length > 0 ? (
                      <div className="tut-etapas">
                        {tutorial.etapas.map((etapa) => (
                          <section key={etapa.titulo} className="tut-etapa">
                            <h3 className="tut-etapa-titulo">{etapa.titulo}</h3>
                            <ol className="tut-passos">
                              {etapa.passos.map((passo) => (
                                <li key={passo}>{passo}</li>
                              ))}
                            </ol>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <ol className="tut-passos">
                        {(tutorial.passos ?? []).map((passo) => (
                          <li key={passo}>{passo}</li>
                        ))}
                      </ol>
                    )}

                    {tutorial.dicas && tutorial.dicas.length > 0 && (
                      <aside className="tut-dicas">
                        <p className="tut-dicas-titulo">Atenção</p>
                        <ul>
                          {tutorial.dicas.map((dica) => (
                            <li key={dica}>{dica}</li>
                          ))}
                        </ul>
                      </aside>
                    )}

                    <Link to={tutorial.rota} className="botao-primario tut-item-acao">
                      {tutorial.acao}
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AreaLayout>
  );
}
