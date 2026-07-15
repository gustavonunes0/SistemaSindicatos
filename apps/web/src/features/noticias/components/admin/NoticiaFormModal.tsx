import { zodResolver } from '@hookform/resolvers/zod';
import { criarNoticiaSchema, type CriarNoticiaInput } from '@sindprf/types';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { RichTextEditor } from '../../../../components/ui/RichTextEditor';
import { urlDaApi } from '../../../../lib/urls';
import { useAtualizarNoticia, useCriarNoticia, useNoticiaAdmin, useUploadCapa } from '../../hooks';

type NoticiaFormValues = z.input<typeof criarNoticiaSchema>;

type NoticiaFormModalProps = {
  aberto: boolean;
  id?: string;
  onFechar: () => void;
};

export function NoticiaFormModal({ aberto, id, onFechar }: NoticiaFormModalProps) {
  const { data: noticiaExistente, isLoading } = useNoticiaAdmin(aberto ? id : undefined);
  const criar = useCriarNoticia();
  const atualizar = useAtualizarNoticia();
  const uploadCapa = useUploadCapa();
  const inputCapaRef = useRef<HTMLInputElement>(null);
  const editando = Boolean(id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NoticiaFormValues, unknown, CriarNoticiaInput>({
    resolver: zodResolver(criarNoticiaSchema),
    defaultValues: { titulo: '', conteudo: '', capaUrl: null, status: 'RASCUNHO' },
  });

  useEffect(() => {
    if (!aberto) return;
    if (noticiaExistente) {
      reset({
        titulo: noticiaExistente.titulo,
        conteudo: noticiaExistente.conteudo,
        capaUrl: noticiaExistente.capaUrl,
        status: noticiaExistente.status,
      });
      return;
    }
    if (!id) {
      reset({ titulo: '', conteudo: '', capaUrl: null, status: 'RASCUNHO' });
    }
  }, [aberto, id, noticiaExistente, reset]);

  const capaUrl = watch('capaUrl');
  const salvando = criar.isPending || atualizar.isPending;

  const onSubmit = (dados: CriarNoticiaInput) => {
    const opcoes = { onSuccess: onFechar };
    if (id) {
      atualizar.mutate({ id, ...dados }, opcoes);
    } else {
      criar.mutate(dados, opcoes);
    }
  };

  const onSelecionarCapa = (arquivo: File | undefined) => {
    if (arquivo) {
      uploadCapa.mutate(arquivo, {
        onSuccess: ({ url }) => setValue('capaUrl', url, { shouldDirty: true }),
      });
    }
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar notícia' : 'Nova notícia'}
      descricao={
        editando
          ? 'Atualize o conteúdo e o status de publicação.'
          : 'Preencha os dados e salve como rascunho ou já publique.'
      }
      tamanho="xl"
    >
      {editando && isLoading ? (
        <EstadoCarregando mensagem="Carregando notícia…" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
          <label>
            Título
            <input type="text" {...register('titulo')} />
            {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
          </label>

          <div className="campo">
            <span className="campo-rotulo">Capa</span>
            {capaUrl && <img className="capa-preview" src={urlDaApi(capaUrl)} alt="Capa atual" />}
            <input
              ref={inputCapaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(evento) => onSelecionarCapa(evento.target.files?.[0])}
            />
            {uploadCapa.isPending && <span>Enviando imagem…</span>}
            {uploadCapa.isError && <span className="erro">Erro ao enviar a imagem.</span>}
            {capaUrl && (
              <button
                type="button"
                className="botao-link"
                onClick={() => {
                  setValue('capaUrl', null, { shouldDirty: true });
                  if (inputCapaRef.current) {
                    inputCapaRef.current.value = '';
                  }
                }}
              >
                Remover capa
              </button>
            )}
          </div>

          <div className="campo">
            <span className="campo-rotulo">Conteúdo</span>
            <Controller
              name="conteudo"
              control={control}
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.conteudo && <span className="erro">{errors.conteudo.message}</span>}
          </div>

          <label>
            Status
            <select {...register('status')}>
              <option value="RASCUNHO">Rascunho</option>
              <option value="PUBLICADO">Publicado</option>
            </select>
          </label>

          {(criar.isError || atualizar.isError) && (
            <p className="erro">Erro ao salvar a notícia. Tente novamente.</p>
          )}

          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
