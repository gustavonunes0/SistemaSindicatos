import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdicionarMembroComissaoInput,
  AtualizarCandidatoInput,
  AtualizarChapaInput,
  AtualizarEleicaoInput,
  Chapa,
  CriarCandidatoInput,
  CriarChapaInput,
  CriarContestacaoInput,
  CriarEleicaoInput,
  EleicaoAdminDetalhe,
  EleicaoResumo,
  ElegivelResumo,
  HomologarChapaInput,
  IncluirElegivelInput,
  ResolverContestacaoInput,
} from '@sindprf/types';
import * as eleicaoApi from './api';

function upsertChapa(chapas: Chapa[], chapa: Chapa): Chapa[] {
  const indice = chapas.findIndex((item) => item.id === chapa.id);
  if (indice < 0) {
    return [...chapas, chapa].sort((a, b) => a.numero - b.numero);
  }
  const proxima = [...chapas];
  proxima[indice] = chapa;
  return proxima;
}

function gravarListaAdmin(
  queryClient: ReturnType<typeof useQueryClient>,
  lista: EleicaoResumo[],
) {
  queryClient.setQueryData(['eleicoes', 'admin'], lista);
}

function aplicarResumoNaLista(
  queryClient: ReturnType<typeof useQueryClient>,
  resumo: EleicaoResumo,
) {
  const atual = queryClient.getQueryData<EleicaoResumo[]>(['eleicoes', 'admin']) ?? [];
  const existe = atual.some((item) => item.id === resumo.id);
  gravarListaAdmin(
    queryClient,
    existe
      ? atual.map((item) => (item.id === resumo.id ? resumo : item))
      : [resumo, ...atual],
  );
}

function aplicarResumoNoDetalhe(
  queryClient: ReturnType<typeof useQueryClient>,
  eleicaoId: string,
  resumo: EleicaoResumo,
) {
  queryClient.setQueryData<EleicaoAdminDetalhe>(['eleicoes', 'admin', eleicaoId], (atual) =>
    atual ? { ...atual, ...resumo } : atual,
  );
}

function aplicarChapaNoDetalhe(
  queryClient: ReturnType<typeof useQueryClient>,
  eleicaoId: string,
  chapa: Chapa,
) {
  queryClient.setQueryData<EleicaoAdminDetalhe>(['eleicoes', 'admin', eleicaoId], (atual) =>
    atual ? { ...atual, chapas: upsertChapa(atual.chapas, chapa) } : atual,
  );
}

/** Invalida só o que o afiliado/público precisa — sem refetch storm no admin. */
function invalidarVisaoPublica(
  queryClient: ReturnType<typeof useQueryClient>,
  eleicaoId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['eleicoes', 'lista'] });
  if (eleicaoId) {
    void queryClient.invalidateQueries({ queryKey: ['eleicoes', 'detalhe', eleicaoId] });
  }
}

// ---- Admin: eleição ----

export function useEleicoesAdmin() {
  return useQuery({
    queryKey: ['eleicoes', 'admin'],
    queryFn: eleicaoApi.listarEleicoesAdmin,
    staleTime: 60_000,
  });
}

export function useEleicaoAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['eleicoes', 'admin', id],
    queryFn: () => eleicaoApi.buscarEleicaoAdmin(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCriarEleicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarEleicaoInput) => eleicaoApi.criarEleicao(input),
    onSuccess: (criada) => {
      aplicarResumoNaLista(queryClient, criada);
      invalidarVisaoPublica(queryClient);
    },
  });
}

export function useAtualizarEleicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarEleicaoInput & { id: string }) =>
      eleicaoApi.atualizarEleicao(id, input),
    onSuccess: (atualizada) => {
      aplicarResumoNaLista(queryClient, atualizada);
      aplicarResumoNoDetalhe(queryClient, atualizada.id, atualizada);
      invalidarVisaoPublica(queryClient, atualizada.id);
    },
  });
}

export function useRemoverEleicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eleicaoApi.removerEleicao,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['eleicoes', 'admin'] });
      const anterior = queryClient.getQueryData<EleicaoResumo[]>(['eleicoes', 'admin']);
      if (anterior) {
        gravarListaAdmin(
          queryClient,
          anterior.filter((item) => item.id !== id),
        );
      }
      queryClient.removeQueries({ queryKey: ['eleicoes', 'admin', id] });
      return { anterior };
    },
    onError: (_erro, _id, ctx) => {
      if (ctx?.anterior) gravarListaAdmin(queryClient, ctx.anterior);
    },
    onSettled: (_data, _erro, id) => {
      invalidarVisaoPublica(queryClient, id);
    },
  });
}

export function useAbrirEleicao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eleicaoApi.abrirEleicao(eleicaoId),
    onSuccess: (resumo) => {
      aplicarResumoNaLista(queryClient, resumo);
      aplicarResumoNoDetalhe(queryClient, eleicaoId, resumo);
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useEncerrarEleicao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eleicaoApi.encerrarEleicao(eleicaoId),
    onSuccess: (resumo) => {
      aplicarResumoNaLista(queryClient, resumo);
      aplicarResumoNoDetalhe(queryClient, eleicaoId, resumo);
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useApurarEleicao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eleicaoApi.apurarEleicao(eleicaoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin'], exact: true });
      void queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId], exact: true });
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'detalhe', eleicaoId, 'resultado'],
      });
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useResolverAclamacao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chapaId: string) => eleicaoApi.resolverAclamacao(eleicaoId, chapaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin'], exact: true });
      void queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId], exact: true });
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'detalhe', eleicaoId, 'resultado'],
      });
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

// ---- Admin: chapas/candidatos ----

export function useCriarChapa(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarChapaInput) => eleicaoApi.criarChapa(eleicaoId, input),
    onSuccess: (chapa) => {
      aplicarChapaNoDetalhe(queryClient, eleicaoId, chapa);
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useAtualizarChapa(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapaId, ...input }: AtualizarChapaInput & { chapaId: string }) =>
      eleicaoApi.atualizarChapa(eleicaoId, chapaId, input),
    onSuccess: (chapa) => {
      aplicarChapaNoDetalhe(queryClient, eleicaoId, chapa);
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useRemoverChapa(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chapaId: string) => eleicaoApi.removerChapa(eleicaoId, chapaId),
    onMutate: async (chapaId) => {
      await queryClient.cancelQueries({ queryKey: ['eleicoes', 'admin', eleicaoId] });
      const anterior = queryClient.getQueryData<EleicaoAdminDetalhe>([
        'eleicoes',
        'admin',
        eleicaoId,
      ]);
      if (anterior) {
        queryClient.setQueryData<EleicaoAdminDetalhe>(['eleicoes', 'admin', eleicaoId], {
          ...anterior,
          chapas: anterior.chapas.filter((chapa) => chapa.id !== chapaId),
        });
      }
      return { anterior };
    },
    onError: (_erro, _chapaId, ctx) => {
      if (ctx?.anterior) {
        queryClient.setQueryData(['eleicoes', 'admin', eleicaoId], ctx.anterior);
      }
    },
    onSettled: () => {
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useHomologarChapa(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapaId, ...input }: HomologarChapaInput & { chapaId: string }) =>
      eleicaoApi.homologarChapa(eleicaoId, chapaId, input),
    onSuccess: (chapa) => {
      aplicarChapaNoDetalhe(queryClient, eleicaoId, chapa);
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useCriarCandidato(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapaId, ...input }: CriarCandidatoInput & { chapaId: string }) =>
      eleicaoApi.criarCandidato(eleicaoId, chapaId, input),
    onSuccess: (chapa) => {
      aplicarChapaNoDetalhe(queryClient, eleicaoId, chapa);
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useAtualizarCandidato(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      chapaId,
      candidatoId,
      ...input
    }: AtualizarCandidatoInput & { chapaId: string; candidatoId: string }) =>
      eleicaoApi.atualizarCandidato(eleicaoId, chapaId, candidatoId, input),
    onSuccess: (chapa) => {
      aplicarChapaNoDetalhe(queryClient, eleicaoId, chapa);
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

export function useRemoverCandidato(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapaId, candidatoId }: { chapaId: string; candidatoId: string }) =>
      eleicaoApi.removerCandidato(eleicaoId, chapaId, candidatoId),
    onSuccess: (_resultado, { chapaId, candidatoId }) => {
      queryClient.setQueryData<EleicaoAdminDetalhe>(['eleicoes', 'admin', eleicaoId], (atual) => {
        if (!atual) return atual;
        return {
          ...atual,
          chapas: atual.chapas.map((chapa) =>
            chapa.id !== chapaId
              ? chapa
              : {
                  ...chapa,
                  candidatos: chapa.candidatos.filter((candidato) => candidato.id !== candidatoId),
                },
          ),
        };
      });
      invalidarVisaoPublica(queryClient, eleicaoId);
    },
  });
}

// ---- Admin: elegibilidade ----

export function useElegiveis(eleicaoId: string) {
  return useQuery({
    queryKey: ['eleicoes', 'admin', eleicaoId, 'elegiveis'],
    queryFn: () => eleicaoApi.listarElegiveis(eleicaoId),
    staleTime: 30_000,
  });
}

function atualizarTotalElegiveis(
  queryClient: ReturnType<typeof useQueryClient>,
  eleicaoId: string,
  delta: number,
) {
  queryClient.setQueryData<EleicaoAdminDetalhe>(['eleicoes', 'admin', eleicaoId], (atual) =>
    atual
      ? { ...atual, totalElegiveis: Math.max(0, atual.totalElegiveis + delta) }
      : atual,
  );
}

export function useSincronizarElegiveis(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eleicaoApi.sincronizarElegiveis(eleicaoId),
    onSuccess: (resultado) => {
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'admin', eleicaoId, 'elegiveis'],
      });
      if (resultado.incluidos > 0) {
        atualizarTotalElegiveis(queryClient, eleicaoId, resultado.incluidos);
      }
    },
  });
}

export function useIncluirElegivel(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IncluirElegivelInput) => eleicaoApi.incluirElegivel(eleicaoId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'admin', eleicaoId, 'elegiveis'],
      });
      atualizarTotalElegiveis(queryClient, eleicaoId, 1);
    },
  });
}

export function useRemoverElegivel(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (afiliadoId: string) => eleicaoApi.removerElegivel(eleicaoId, afiliadoId),
    onMutate: async (afiliadoId) => {
      await queryClient.cancelQueries({
        queryKey: ['eleicoes', 'admin', eleicaoId, 'elegiveis'],
      });
      const anterior = queryClient.getQueryData<ElegivelResumo[]>([
        'eleicoes',
        'admin',
        eleicaoId,
        'elegiveis',
      ]);
      if (anterior) {
        queryClient.setQueryData(
          ['eleicoes', 'admin', eleicaoId, 'elegiveis'],
          anterior.filter((item) => item.afiliadoId !== afiliadoId),
        );
        atualizarTotalElegiveis(queryClient, eleicaoId, -1);
      }
      return { anterior };
    },
    onError: (_erro, _id, ctx) => {
      if (ctx?.anterior) {
        queryClient.setQueryData(
          ['eleicoes', 'admin', eleicaoId, 'elegiveis'],
          ctx.anterior,
        );
        atualizarTotalElegiveis(queryClient, eleicaoId, 1);
      }
    },
  });
}

// ---- Admin: contestações ----

export function useContestacoes(eleicaoId: string) {
  return useQuery({
    queryKey: ['eleicoes', 'admin', eleicaoId, 'contestacoes'],
    queryFn: () => eleicaoApi.listarContestacoes(eleicaoId),
    staleTime: 30_000,
  });
}

export function useResolverContestacao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contestacaoId,
      ...input
    }: ResolverContestacaoInput & { contestacaoId: string }) =>
      eleicaoApi.resolverContestacao(eleicaoId, contestacaoId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'admin', eleicaoId, 'contestacoes'],
      });
      // Homologação da chapa pode ter mudado — atualiza só o detalhe admin.
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'admin', eleicaoId],
        exact: true,
      });
    },
  });
}

// ---- Admin: comissão eleitoral ----

export function useComissao(eleicaoId: string) {
  return useQuery({
    queryKey: ['eleicoes', 'admin', eleicaoId, 'comissao'],
    queryFn: () => eleicaoApi.listarComissao(eleicaoId),
    staleTime: 60_000,
  });
}

export function useAdministradores() {
  return useQuery({
    queryKey: ['eleicoes', 'admin', 'usuarios'],
    queryFn: eleicaoApi.listarAdministradores,
    staleTime: 5 * 60_000,
  });
}

export function useAdicionarMembroComissao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdicionarMembroComissaoInput) =>
      eleicaoApi.adicionarMembroComissao(eleicaoId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'admin', eleicaoId, 'comissao'],
      });
    },
  });
}

export function useRemoverMembroComissao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => eleicaoApi.removerMembroComissao(eleicaoId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'admin', eleicaoId, 'comissao'],
      });
    },
  });
}

// ---- Afiliado ----

export function useEleicoes() {
  return useQuery({
    queryKey: ['eleicoes', 'lista'],
    queryFn: eleicaoApi.listarEleicoes,
    staleTime: 60_000,
  });
}

export function useEleicao(id: string) {
  return useQuery({
    queryKey: ['eleicoes', 'detalhe', id],
    queryFn: () => eleicaoApi.buscarEleicao(id),
    staleTime: 30_000,
  });
}

export function useMeuStatusVotacao(id: string) {
  return useQuery({
    queryKey: ['eleicoes', 'detalhe', id, 'meu-status'],
    queryFn: () => eleicaoApi.buscarMeuStatusVotacao(id),
  });
}

export function useVotar(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chapaId: string) => eleicaoApi.votar(id, chapaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['eleicoes', 'detalhe', id, 'meu-status'],
      });
    },
  });
}

export function useCriarContestacaoChapa(eleicaoId: string) {
  return useMutation({
    mutationFn: ({ chapaId, motivo }: CriarContestacaoInput & { chapaId: string }) =>
      eleicaoApi.criarContestacaoChapa(eleicaoId, chapaId, { motivo }),
  });
}

export function useResultado(id: string, enabled = true) {
  return useQuery({
    queryKey: ['eleicoes', 'detalhe', id, 'resultado'],
    queryFn: () => eleicaoApi.buscarResultado(id),
    enabled,
  });
}
