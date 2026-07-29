import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';

type Tutorial = {
  id: string;
  titulo: string;
  grupo: string;
  resumo: string;
  rota: string;
  acao: string;
  passos: string[];
  dicas?: string[];
};

const TUTORIAIS: Tutorial[] = [
  {
    id: 'afiliados',
    titulo: 'Aprovar e gerenciar afiliados',
    grupo: 'Operação',
    resumo: 'O afiliado se cadastra no site. No admin você aprova, inativa ou redefine a senha.',
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
      'Novos afiliados também podem surgir automaticamente na importação do D8.',
      'O cadastro público fica em /cadastro — o admin não cria afiliado manualmente nesta tela.',
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
    resumo: 'Crie a eleição, cadastre chapas e candidatos, homologue, abra a votação e apure.',
    rota: '/admin/eleicoes',
    acao: 'Abrir eleições',
    passos: [
      'Em Eleições, clique em Nova eleição e preencha título, prazos e regras.',
      'Abra a eleição criada e cadastre as chapas.',
      'Inclua os candidatos em cada chapa.',
      'Homologue as chapas e sincronize ou ajuste a lista de elegíveis.',
      'Quando for a hora, abra a votação; ao terminar, encerre e apure (ou use aclamação se houver uma chapa).',
    ],
    dicas: [
      'Contestações e comissão eleitoral ficam no detalhe da eleição.',
      'Só avance de etapa quando a anterior estiver concluída.',
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
      return (
        item.titulo.toLowerCase().includes(termo) ||
        item.resumo.toLowerCase().includes(termo) ||
        item.passos.some((passo) => passo.toLowerCase().includes(termo))
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
                    <ol className="tut-passos">
                      {tutorial.passos.map((passo) => (
                        <li key={passo}>{passo}</li>
                      ))}
                    </ol>

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
