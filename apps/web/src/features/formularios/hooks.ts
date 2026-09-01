import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AtualizarFormularioInput,
  CriarFormularioInput,
  EnviarRespostaInput,
  Formulario,
  FormularioExternoInput,
  FormularioListagem,
} from '@sindprf/types';
import { useAuthStore } from '../auth/store';
import * as formulariosApi from './api';

const CHAVE_ADMIN = ['formularios', 'admin'] as const;

function gravarLista(
  queryClient: ReturnType<typeof useQueryClient>,
  lista: FormularioListagem[],
) {
  queryClient.setQueryData([...CHAVE_ADMIN], lista);
}

/** Converte o formulário completo na linha enxuta que a tabela do admin usa. */
function paraLinhaDaTabela(
  formulario: Formulario,
  totalRespostas: number,
): FormularioListagem {
  const { campos, ...resto } = formulario;
  return { ...resto, totalCampos: campos.length, totalRespostas };
}

export function useFormulariosAdmin() {
  return useQuery({
    queryKey: [...CHAVE_ADMIN],
    queryFn: formulariosApi.listarFormulariosAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useFormularioAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['formularios', 'admin', id],
    queryFn: () => formulariosApi.buscarFormularioAdmin(id!),
    enabled: Boolean(id),
  });
}

export function useRespostasFormulario(formularioId: string | undefined) {
  return useQuery({
    queryKey: ['formularios', 'respostas', formularioId],
    queryFn: () => formulariosApi.listarRespostas(formularioId!),
    enabled: Boolean(formularioId),
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useCriarFormulario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarFormularioInput) => formulariosApi.criarFormulario(input),
    onSuccess: (criado) => {
      queryClient.setQueryData(['formularios', 'admin', criado.id], criado);
      const atual = queryClient.getQueryData<FormularioListagem[]>([...CHAVE_ADMIN]) ?? [];
      gravarLista(queryClient, [paraLinhaDaTabela(criado, 0), ...atual]);
    },
  });
}

export function useSalvarFormularioExterno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: FormularioExternoInput & { id?: string }) =>
      id
        ? formulariosApi.atualizarFormularioExterno(id, input)
        : formulariosApi.criarFormularioExterno(input),
    onSuccess: (salvo) => {
      queryClient.setQueryData(['formularios', 'admin', salvo.id], salvo);
      const atual = queryClient.getQueryData<FormularioListagem[]>([...CHAVE_ADMIN]) ?? [];
      const existente = atual.find((item) => item.id === salvo.id);
      const linha = paraLinhaDaTabela(salvo, existente?.totalRespostas ?? 0);
      gravarLista(
        queryClient,
        existente
          ? atual.map((item) => (item.id === salvo.id ? linha : item))
          : [linha, ...atual],
      );
      void queryClient.invalidateQueries({ queryKey: ['formularios', 'disponiveis'] });
    },
  });
}

export function useAtualizarFormulario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarFormularioInput & { id: string }) =>
      formulariosApi.atualizarFormulario(id, input),
    onSuccess: (atualizado) => {
      queryClient.setQueryData(['formularios', 'admin', atualizado.id], atualizado);
      const atual = queryClient.getQueryData<FormularioListagem[]>([...CHAVE_ADMIN]) ?? [];
      gravarLista(
        queryClient,
        atual.map((linha) =>
          linha.id === atualizado.id
            ? paraLinhaDaTabela(atualizado, linha.totalRespostas)
            : linha,
        ),
      );
    },
  });
}

export function useRemoverFormulario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: formulariosApi.removerFormulario,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [...CHAVE_ADMIN] });
      const anterior = queryClient.getQueryData<FormularioListagem[]>([...CHAVE_ADMIN]);
      if (anterior) {
        gravarLista(
          queryClient,
          anterior.filter((linha) => linha.id !== id),
        );
      }
      queryClient.removeQueries({ queryKey: ['formularios', 'admin', id] });
      return { anterior };
    },
    onError: (_erro, _id, ctx) => {
      if (ctx?.anterior) gravarLista(queryClient, ctx.anterior);
    },
  });
}

export function useRemoverResposta(formularioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: formulariosApi.removerResposta,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['formularios', 'respostas', formularioId],
      });
      void queryClient.invalidateQueries({ queryKey: [...CHAVE_ADMIN] });
    },
  });
}

export function useFormulariosDisponiveis() {
  return useQuery({
    queryKey: ['formularios', 'disponiveis'],
    queryFn: formulariosApi.listarFormulariosDisponiveis,
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
}

/**
 * O que a pessoa pode fazer com o formulário depende de quem está logada, então
 * o usuário entra na chave — trocar de conta não reaproveita cache alheio.
 */
export function useFormularioPublico(slug: string | undefined) {
  const userId = useAuthStore((estado) => estado.user?.id);

  return useQuery({
    queryKey: ['formularios', 'publico', slug, userId ?? 'anonimo'],
    queryFn: () => formulariosApi.buscarFormularioPublico(slug!),
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useEnviarResposta(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EnviarRespostaInput) => formulariosApi.enviarResposta(slug!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['formularios', 'publico', slug] });
      void queryClient.invalidateQueries({ queryKey: ['formularios', 'disponiveis'] });
    },
  });
}

export function useUploadArquivoFormulario(slug: string | undefined) {
  return useMutation({
    mutationFn: (arquivo: File) => formulariosApi.uploadArquivoFormulario(slug!, arquivo),
  });
}
