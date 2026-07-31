import { zodResolver } from '@hookform/resolvers/zod';
import {
  criarConvenioSchema,
  MODELO_DECLARACAO_ROTULO,
  modeloDeclaracaoSchema,
  type CriarConvenioInput,
} from '@sindprf/types';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { paraInputData } from '../../../../lib/datas';
import { urlDaApi } from '../../../../lib/urls';
import { useUploadCapa } from '../../../noticias/hooks';
import {
  useAtualizarConvenio,
  useConvenioAdmin,
  useCriarConvenio,
} from '../../hooks';

const modelosDeclaracao = modeloDeclaracaoSchema.options;

type ConvenioFormValues = z.input<typeof criarConvenioSchema>;

type ConvenioFormModalProps = {
  aberto: boolean;
  id?: string;
  onFechar: () => void;
};

export function ConvenioFormModal({ aberto, id, onFechar }: ConvenioFormModalProps) {
  const { data: convenioExistente, isLoading } = useConvenioAdmin(aberto ? id : undefined);
  const criar = useCriarConvenio();
  const atualizar = useAtualizarConvenio();
  const uploadLogo = useUploadCapa();
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const editando = Boolean(id);

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
      emiteDeclaracao: false,
      modeloDeclaracao: null,
      destinoDeclaracao: null,
      textoComplementar: null,
    },
  });

  useEffect(() => {
    if (!aberto) return;
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
        emiteDeclaracao: convenioExistente.emiteDeclaracao,
        modeloDeclaracao: convenioExistente.modeloDeclaracao,
        destinoDeclaracao: convenioExistente.destinoDeclaracao ?? '',
        textoComplementar: convenioExistente.textoComplementar ?? '',
      });
      return;
    }
    if (!id) {
      reset({
        nome: '',
        categoria: '',
        descricao: '',
        logoUrl: null,
        link: null,
        contato: null,
        vigenciaInicio: null,
        vigenciaFim: null,
        ativo: true,
        emiteDeclaracao: false,
        modeloDeclaracao: null,
        destinoDeclaracao: null,
        textoComplementar: null,
      });
    }
  }, [aberto, id, convenioExistente, reset]);

  const logoUrl = watch('logoUrl');
  const emiteDeclaracao = watch('emiteDeclaracao');
  const logoUrlValida = typeof logoUrl === 'string' ? logoUrl : null;
  const salvando = criar.isPending || atualizar.isPending;

  const onSubmit = (dados: CriarConvenioInput) => {
    const opcoes = { onSuccess: onFechar };
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

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar convênio' : 'Novo convênio'}
      descricao="Cadastre o parceiro e defina se o benefício fica visível para afiliados."
      tamanho="lg"
    >
      {editando && isLoading ? (
        <EstadoCarregando mensagem="Carregando convênio…" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
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

          <fieldset className="convenio-declaracao-fieldset">
            <legend>Declaração para afiliados</legend>
            <label className="campo-checkbox">
              <input type="checkbox" {...register('emiteDeclaracao')} />
              Permitir emissão de declaração/autorização em PDF
            </label>

            {emiteDeclaracao && (
              <>
                <label>
                  Modelo do documento
                  <select {...register('modeloDeclaracao')}>
                    <option value="">Selecione…</option>
                    {modelosDeclaracao.map((modelo) => (
                      <option key={modelo} value={modelo}>
                        {MODELO_DECLARACAO_ROTULO[modelo]}
                      </option>
                    ))}
                  </select>
                  {errors.modeloDeclaracao && (
                    <span className="erro">{errors.modeloDeclaracao.message}</span>
                  )}
                </label>

                <label>
                  Destino (nome do parceiro no texto)
                  <input
                    type="text"
                    {...register('destinoDeclaracao')}
                    placeholder="Ex.: Unimed Ceará, Sistema FECOMÉRCIO (SESC/SENAC)"
                    autoComplete="off"
                  />
                  {errors.destinoDeclaracao && (
                    <span className="erro">{errors.destinoDeclaracao.message}</span>
                  )}
                </label>

                <label>
                  Texto complementar (opcional)
                  <textarea
                    rows={3}
                    {...register('textoComplementar')}
                    placeholder="Ex.: isenção de taxa de credencial para dependentes…"
                  />
                  {errors.textoComplementar && (
                    <span className="erro">{errors.textoComplementar.message}</span>
                  )}
                </label>
              </>
            )}
          </fieldset>

          {(criar.isError || atualizar.isError) && (
            <p className="erro">Erro ao salvar o convênio. Tente novamente.</p>
          )}

          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar convênio'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
