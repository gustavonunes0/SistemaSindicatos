import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
    titulo: 'Aprovar e gerenciar afiliados',
    grupo: 'Operação',
    resumo: 'A filiação é presencial. No admin você aprova, inativa ou redefine a senha.',
    rota: '/admin/afiliados',
    acao: 'Abrir afiliados',
    passos: [
      'Abra Afiliados no menu lateral.',
      'Filtre por status (Pendente, Aprovado ou Inativo) para achar o cadastro.',
      'Em Pendente, use Aprovar para liberar o acesso do afiliado.',
      'Se precisar, use Inativar ou Reabrir conforme a situação.',
      'Em Senha, defina uma nova senha quando o afiliado precisar recuperar o acesso.',
    ],
    dicas: [
      'Não há cadastro online no site — o interessado baixa os formulários em /cadastro e comparece à secretaria.',
      'Novos afiliados também podem surgir automaticamente na importação do D8.',
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
      'Novos CPF geram usuário com senha temporária (padrão Sindprf@D8 / variável D8_SENHA_TEMP).',
    ],
  },
  {
    id: 'solicitacoes',
    titulo: 'Atender solicitações de locação',
    grupo: 'Operação',
    resumo: 'O afiliado pede o apartamento. Você acompanha a fila, muda o status e responde no chat.',
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
          'Na lista, clique em Gerenciar para abrir o detalhe.',
        ],
      },
      {
        titulo: '2. Cadastrar chapas e candidatos',
        passos: [
          'Na seção Chapas, clique em Nova chapa (só funciona enquanto a eleição está Agendada).',
          'Informe Número (inteiro ≥ 1, único na eleição), Nome da chapa e, se quiser, Slogan.',
          'Clique em Cadastrar chapa. A chapa nasce como Aguardando homologação.',
          'No card da chapa, em Candidatos, clique em + Candidato.',
          'Preencha Nome, Cargo (ex.: Presidente, Vice-presidente) e, se quiser, Foto (URL).',
          'Repita para todas as chapas e candidatos. Depois que a votação abrir, não dá mais para alterar chapas nem candidatos.',
        ],
      },
      {
        titulo: '3. Homologar as chapas',
        passos: [
          'Em cada chapa com status Aguardando homologação, preencha Justificativa da decisão (mínimo 5 caracteres).',
          'Clique em Homologar (vira Homologada) ou Não homologar (vira Não homologada).',
          'Ao decidir, o sistema grava a justificativa e abre prazo de 3 dias úteis para contestação (pula sábado e domingo; não considera feriados).',
          'Confira no topo: quantas chapas estão homologadas e quantas pendentes.',
        ],
      },
      {
        titulo: '4. Contestações (impugnações e recursos)',
        passos: [
          'Quem cria a contestação é o afiliado, no prazo de 3 dias úteis após a homologação.',
          'Chapa Homologada → afiliado pode Impugnar; chapa Não homologada → afiliado pode Recorrer.',
          'No painel Impugnações e recursos, abra cada item com status Aberta.',
          'Escreva a Decisão e clique em Deferir ou Indeferir.',
          'Deferir impugnação torna a chapa Não homologada; deferir recurso torna a chapa Homologada.',
        ],
      },
      {
        titulo: '5. Comissão Eleitoral e elegíveis',
        passos: [
          'Em Comissão Eleitoral, informe o ID do usuário ADMIN, escolha Titular ou Suplente e clique em Adicionar. Isso é registro/auditoria — não muda permissões.',
          'Em Elegíveis, clique em Sincronizar aprovados para incluir todos os afiliados aprovados que ainda não estão na lista (não remove quem já está).',
          'Ajuste manualmente: use Incluir afiliado aprovado ou Remover, conforme quem aderiu ao voto eletrônico (Art. 38 §3º).',
          'Não é possível remover quem já votou. Use as abas Todos / Já votaram / Pendentes e a busca por nome ou matrícula.',
        ],
      },
      {
        titulo: '6. Abrir votação ou aclamação',
        passos: [
          'Antes de abrir: nenhuma chapa pode estar Aguardando homologação, e não pode haver contestação Aberta ainda dentro do prazo.',
          'Na seção Ação desta fase, clique em Abrir votação e confirme. A eleição passa para Aberta.',
          'Alternativa: se houver exatamente 1 chapa Homologada, use Resolver por aclamação — a eleição vai direto para Apurada · aclamação, sem urna.',
          'A abertura é sempre manual. O sistema pode encerrar sozinho depois do horário de Fim, mas nunca abre sozinho.',
        ],
      },
      {
        titulo: '7. Encerrar e apurar',
        passos: [
          'Com a eleição Aberta, clique em Encerrar votação quando for fechar as urnas (ou aguarde o fim do prazo).',
          'Com status Encerrada, clique em Apurar votos.',
          'O Resultado eletrônico mostra os votos por chapa homologada. Some manualmente os votos presenciais da Comissão para a proclamação oficial.',
          'Editar ou excluir a eleição só é possível enquanto ela estiver Agendada.',
        ],
      },
    ],
    dicas: [
      'Linha do tempo no topo: Preparação → Votação → Encerrada → Apurada.',
      'Não há resultado parcial enquanto a votação está Aberta — nem para o admin.',
      'O painel de contestações não mostra o nome da chapa; cruze pelo motivo e pela data.',
      'Sincronizar elegíveis traz todos os aprovados — revise a lista antes de abrir a urna.',
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
    resumo: 'Cadastre imóveis para locação, com fotos, valor e períodos indisponíveis.',
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
  const [filtroGrupo, setFiltroGrupo] = useState<'todos' | (typeof GRUPOS)[number]>('todos');
  const [busca, setBusca] = useState('');
  const [abertoId, setAbertoId] = useState<string | null>(TUTORIAIS[0]?.id ?? null);

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
