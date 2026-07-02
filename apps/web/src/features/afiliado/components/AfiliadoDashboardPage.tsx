import { useLogout, useMe } from '../../auth/hooks';

const descricaoStatus = {
  PENDENTE: 'Sua afiliação está em análise.',
  APROVADO: 'Afiliação ativa.',
  INATIVO: 'Sua afiliação está inativa. Entre em contato com o sindicato.',
} as const;

export function AfiliadoDashboardPage() {
  const { data, isLoading, isError } = useMe();
  const logout = useLogout();

  return (
    <main className="area-page">
      <header className="area-header">
        <h1>Área do afiliado</h1>
        <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending}>
          Sair
        </button>
      </header>

      {isLoading && <p>Carregando…</p>}
      {isError && <p className="erro">Erro ao carregar seus dados.</p>}
      {data?.afiliado && (
        <>
          <p>Olá, {data.afiliado.nome}.</p>
          <p>{descricaoStatus[data.afiliado.status]}</p>
        </>
      )}
    </main>
  );
}
