import { zodResolver } from '@hookform/resolvers/zod';
import { criarNoticiaSchema, type CriarNoticiaInput } from '@sindprf/types';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RichTextEditor } from '../../../../components/ui/RichTextEditor';
import { urlDaApi } from '../../../../lib/urls';
import { useAtualizarNoticia, useCriarNoticia, useNoticiaAdmin, useUploadCapa } from '../../hooks';

// Valores do formulário antes do parse (status é opcional por ter default no schema).
type NoticiaFormValues = z.input<typeof criarNoticiaSchema>;

export function NoticiaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: noticiaExistente, isLoading } = useNoticiaAdmin(id);
  const criar = useCriarNoticia();
  const atualizar = useAtualizarNoticia();
  const uploadCapa = useUploadCapa();
  const inputCapaRef = useRef<HTMLInputElement>(null);

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
    if (noticiaExistente) {
      reset({
        titulo: noticiaExistente.titulo,
        conteudo: noticiaExistente.conteudo,
        capaUrl: noticiaExistente.capaUrl,
        status: noticiaExistente.status,
      });
    }
  }, [noticiaExistente, reset]);

  const capaUrl = watch('capaUrl');
  const salvando = criar.isPending || atualizar.isPending;

  const onSubmit = (dados: CriarNoticiaInput) => {
    const opcoes = { onSuccess: () => navigate('/admin/noticias') };
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

  if (id && isLoading) {
    return (
      <main className="area-page">
        <p>Carregando notícia…</p>
      </main>
    );
  }

  return (
    <main className="area-page">
      <header className="area-header">
        <h1>{id ? 'Editar notícia' : 'Nova notícia'}</h1>
        <Link to="/admin/noticias">← Voltar</Link>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-noticia">
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
            render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} />}
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

        <button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </main>
  );
}
