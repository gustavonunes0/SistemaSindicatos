import { zodResolver } from '@hookform/resolvers/zod';
import { criarAlertaSchema, type CriarAlertaInput } from '@sindprf/types';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { paraInputDataHora } from '../../../../lib/datas';
import { urlDaApi } from '../../../../lib/urls';
import {
  useAlertaAdmin,
  useAtualizarAlerta,
  useCriarAlerta,
  useUploadImagemAlerta,
} from '../../hooks';

type AlertaFormValues = z.input<typeof criarAlertaSchema>;

type AlertaFormModalProps = {
  aberto: boolean;
  id?: string;
  onFechar: () => void;
};

/** Padrão: começa agora e vale por uma semana. */
function periodoSugerido() {
  const inicio = new Date();
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 7);
  return { inicioEm: paraInputDataHora(inicio), fimEm: paraInputDataHora(fim) };
}

function valoresVazios(): AlertaFormValues {
  return {
    titulo: '',
    mensagem: '',
    imagemUrl: null,
    linkUrl: null,
    linkTexto: null,
    publico: 'TODOS',
    ativo: true,
    ...periodoSugerido(),
  };
}

export function AlertaFormModal({ aberto, id, onFechar }: AlertaFormModalProps) {
  const { data: existente, isLoading } = useAlertaAdmin(aberto ? id : undefined);
  const criar = useCriarAlerta();
  const atualizar = useAtualizarAlerta();
  const upload = useUploadImagemAlerta();
  const inputImagemRef = useRef<HTMLInputElement>(null);
  const editando = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AlertaFormValues, unknown, CriarAlertaInput>({
    resolver: zodResolver(criarAlertaSchema),
    defaultValues: valoresVazios(),
  });

  useEffect(() => {
    if (!aberto) return;
    if (existente) {
      reset({
        titulo: existente.titulo,
        mensagem: existente.mensagem,
        imagemUrl: existente.imagemUrl,
        linkUrl: existente.linkUrl,
        linkTexto: existente.linkTexto,
        publico: existente.publico,
        ativo: existente.ativo,
        inicioEm: paraInputDataHora(existente.inicioEm),
        fimEm: paraInputDataHora(existente.fimEm),
      });
      return;
    }
    if (!id) {
      reset(valoresVazios());
    }
  }, [aberto, id, existente, reset]);

  const imagemUrl = watch('imagemUrl');
  const salvando = criar.isPending || atualizar.isPending;

  const onSubmit = (dados: CriarAlertaInput) => {
    const opcoes = { onSuccess: onFechar };
    if (id) {
      atualizar.mutate({ id, ...dados }, opcoes);
    } else {
      criar.mutate(dados, opcoes);
    }
  };

  const onSelecionarImagem = (arquivo: File | undefined) => {
    if (arquivo) {
      upload.mutate(arquivo, {
        onSuccess: ({ url }) => setValue('imagemUrl', url, { shouldDirty: true }),
      });
    }
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar alerta' : 'Novo alerta'}
      descricao="O aviso aparece como popup no site e na área do filiado durante o período definido."
      tamanho="lg"
    >
      {editando && isLoading ? (
        <EstadoCarregando mensagem="Carregando alerta…" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
          <label>
            Título
            <input type="text" {...register('titulo')} />
            {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
          </label>

          <label>
            Mensagem
            <textarea rows={5} {...register('mensagem')} />
            {errors.mensagem && <span className="erro">{errors.mensagem.message}</span>}
          </label>

          <div className="campo">
            <span className="campo-rotulo">Imagem (opcional)</span>
            {imagemUrl && (
              <img className="capa-preview" src={urlDaApi(imagemUrl)} alt="Imagem do alerta" />
            )}
            <input
              ref={inputImagemRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(evento) => onSelecionarImagem(evento.target.files?.[0])}
            />
            {upload.isPending && <span>Enviando imagem…</span>}
            {upload.isError && <span className="erro">Erro ao enviar a imagem.</span>}
            {imagemUrl && (
              <button
                type="button"
                className="botao-link"
                onClick={() => {
                  setValue('imagemUrl', null, { shouldDirty: true });
                  if (inputImagemRef.current) {
                    inputImagemRef.current.value = '';
                  }
                }}
              >
                Remover imagem
              </button>
            )}
          </div>

          <div className="form-grid">
            <label>
              Aparece a partir de
              <input type="datetime-local" {...register('inicioEm')} />
              {errors.inicioEm && <span className="erro">{errors.inicioEm.message}</span>}
            </label>
            <label>
              Some em
              <input type="datetime-local" {...register('fimEm')} />
              {errors.fimEm && <span className="erro">{errors.fimEm.message}</span>}
            </label>
          </div>

          <label>
            Quem vê
            <select {...register('publico')}>
              <option value="TODOS">Todos os visitantes</option>
              <option value="FILIADOS">Somente filiados aprovados</option>
            </select>
          </label>

          <div className="form-grid">
            <label>
              Link do botão (opcional)
              <input type="url" placeholder="https://…" {...register('linkUrl')} />
              {errors.linkUrl && <span className="erro">{errors.linkUrl.message}</span>}
            </label>
            <label>
              Texto do botão
              <input type="text" placeholder="Saiba mais" {...register('linkTexto')} />
            </label>
          </div>

          <label className="campo-checkbox">
            <input type="checkbox" {...register('ativo')} />
            Alerta ativo
          </label>

          {(criar.isError || atualizar.isError) && (
            <p className="erro">Erro ao salvar o alerta. Tente novamente.</p>
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
