import { zodResolver } from '@hookform/resolvers/zod';
import { criarConvenioSchema, type CriarConvenioInput } from '@sindprf/types';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { paraInputData } from '../../../../lib/datas';
import { urlDaApi } from '../../../../lib/urls';
import { useUploadCapa } from '../../../noticias/hooks';
import {
  useAtualizarConvenio,
  useConvenioAdmin,
  useCriarConvenio,
} from '../../hooks';

type ConvenioFormValues = z.input<typeof criarConvenioSchema>;

export function ConvenioFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: convenioExistente, isLoading } = useConvenioAdmin(id);
  const criar = useCriarConvenio();
  const atualizar = useAtualizarConvenio();
  const uploadLogo = useUploadCapa();
  const inputLogoRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConvenioFormValues, unknown, CriarConvenioInput>({
    resolver: zodResolver(criarConvenioSchema),
    defaultValues: {
      nome: '',
      categoria: '',
      descricao: '',
      logoUrl: null,
      link: null,
      contato: null,
      vigenciaInicio: null,
      vigenciaFim: null,
      ativo: true,
    },
  });

  useEffect(() => {
    if (convenioExistente) {
      reset({
        nome: convenioExistente.nome,
        categoria: convenioExistente.categoria,
        descricao: convenioExistente.descricao,
        logoUrl: convenioExistente.logoUrl,
        link: convenioExistente.link ?? '',
        contato: convenioExistente.contato ?? '',
        vigenciaInicio: paraInputData(convenioExistente.vigenciaInicio),
        vigenciaFim: paraInputData(convenioExistente.vigenciaFim),
        ativo: convenioExistente.ativo,
      });
    }
  }, [convenioExistente, reset]);

  const logoUrl = watch('logoUrl');
  const logoUrlValida = typeof logoUrl === 'string' ? logoUrl : null;
  const salvando = criar.isPending || atualizar.isPending;

  const onSubmit = (dados: CriarConvenioInput) => {
    const opcoes = { onSuccess: () => navigate('/admin/convenios') };
    if (id) {
      atualizar.mutate({ id, ...dados }, opcoes);
    } else {
      criar.mutate(dados, opcoes);
    }
  };

  const onSelecionarLogo = (arquivo: File | undefined) => {
    if (arquivo) {
      uploadLogo.mutate(arquivo, {
        onSuccess: ({ url }) => setValue('logoUrl', url, { shouldDirty: true }),
      });
    }
  };

  if (id && isLoading) {
    return (
      <AreaLayout tipo="admin" titulo="Editar convênio">
        <p className="estado-carregando">Carregando convênio…</p>
      </AreaLayout>
    );
  }

  return (
    <AreaLayout
      tipo="admin"
      titulo={id ? 'Editar convênio' : 'Novo convênio'}
      acoes={<Link to="/admin/convenios">← Voltar</Link>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area">
        <div className="form-grid">
          <label>
            Nome do parceiro
            <input type="text" {...register('nome')} autoComplete="off" />
            {errors.nome && <span className="erro">{errors.nome.message}</span>}
          </label>

          <label>
            Categoria
            <input
              type="text"
              {...register('categoria')}
              placeholder="Ex.: Saúde, Educação"
              autoComplete="off"
            />
            {errors.categoria && <span className="erro">{errors.categoria.message}</span>}
          </label>
        </div>

        <label>
          Descrição do benefício
          <textarea rows={4} {...register('descricao')} />
          {errors.descricao && <span className="erro">{errors.descricao.message}</span>}
        </label>

        <div className="campo">
          <span className="campo-rotulo">Logo (opcional)</span>
          {logoUrlValida && (
            <img className="logo-preview" src={urlDaApi(logoUrlValida)} alt="Logo do parceiro" />
          )}
          <input
            ref={inputLogoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(evento) => onSelecionarLogo(evento.target.files?.[0])}
          />
          {uploadLogo.isPending && <span>Enviando imagem…</span>}
          {uploadLogo.isError && <span className="erro">Erro ao enviar a imagem.</span>}
          {logoUrlValida && (
            <button
              type="button"
              className="botao-link"
              onClick={() => {
                setValue('logoUrl', null, { shouldDirty: true });
                if (inputLogoRef.current) inputLogoRef.current.value = '';
              }}
            >
              Remover logo
            </button>
          )}
        </div>

        <div className="form-grid">
          <label>
            Link do parceiro
            <input type="url" {...register('link')} placeholder="https://" />
            {errors.link && <span className="erro">{errors.link.message}</span>}
          </label>

          <label>
            Contato
            <input type="text" {...register('contato')} placeholder="Telefone ou e-mail" />
            {errors.contato && <span className="erro">{errors.contato.message}</span>}
          </label>
        </div>

        <div className="form-grid">
          <label>
            Início da vigência
            <input type="date" {...register('vigenciaInicio')} />
            {errors.vigenciaInicio && (
              <span className="erro">{errors.vigenciaInicio.message}</span>
            )}
          </label>

          <label>
            Fim da vigência
            <input type="date" {...register('vigenciaFim')} />
            {errors.vigenciaFim && <span className="erro">{errors.vigenciaFim.message}</span>}
          </label>
        </div>

        <label className="campo-checkbox">
          <input type="checkbox" {...register('ativo')} />
          Convênio ativo (visível para afiliados aprovados)
        </label>

        <div className="form-acoes">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando…' : id ? 'Salvar alterações' : 'Cadastrar convênio'}
          </button>
        </div>
      </form>
    </AreaLayout>
  );
}
