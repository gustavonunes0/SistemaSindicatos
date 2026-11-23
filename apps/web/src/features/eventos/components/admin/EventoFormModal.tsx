import { zodResolver } from '@hookform/resolvers/zod';
import type { CriarEventoInput } from '@sindprf/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { urlDaApi } from '../../../../lib/urls';
import { paraInputDataEvento } from '../../formatarDataEvento';
import {
  useAtualizarEvento,
  useCriarEvento,
  useEventoAdmin,
  useRemoverFotoEvento,
  useUploadFotosEvento,
} from '../../hooks';

const formularioSchema = z.object({
  titulo: z.string().trim().min(3, 'Informe o título do evento'),
  descricao: z.string().optional(),
  local: z.string().optional(),
  dataEventoTexto: z.string().optional(),
  ativo: z.boolean(),
});
type FormularioEvento = z.infer<typeof formularioSchema>;

type EventoFormModalProps = {
  aberto: boolean;
  id?: string;
  onFechar: () => void;
};

export function EventoFormModal({ aberto, id, onFechar }: EventoFormModalProps) {
  const editando = Boolean(id);
  const { data: eventoExistente, isLoading } = useEventoAdmin(id);
  const criar = useCriarEvento();
  const atualizar = useAtualizarEvento();
  const uploadFotos = useUploadFotosEvento();
  const removerFoto = useRemoverFotoEvento();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const inputFotosRef = useRef<HTMLInputElement>(null);
  const [arquivosPendentes, setArquivosPendentes] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormularioEvento>({
    resolver: zodResolver(formularioSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      local: '',
      dataEventoTexto: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (!aberto) return;
    if (id && eventoExistente) {
      reset({
        titulo: eventoExistente.titulo,
        descricao: eventoExistente.descricao ?? '',
        local: eventoExistente.local ?? '',
        dataEventoTexto: paraInputDataEvento(eventoExistente.dataEvento),
        ativo: eventoExistente.ativo,
      });
      setArquivosPendentes([]);
      return;
    }
    if (!id) {
      reset({
        titulo: '',
        descricao: '',
        local: '',
        dataEventoTexto: '',
        ativo: true,
      });
      setArquivosPendentes([]);
    }
  }, [aberto, id, eventoExistente, reset]);

  const previas = useMemo(
    () => arquivosPendentes.map((arquivo) => ({ arquivo, url: URL.createObjectURL(arquivo) })),
    [arquivosPendentes],
  );
  useEffect(() => {
    return () => previas.forEach((previa) => URL.revokeObjectURL(previa.url));
  }, [previas]);

  const salvando = criar.isPending || atualizar.isPending || uploadFotos.isPending;

  const montarPayload = (dados: FormularioEvento): CriarEventoInput => ({
    titulo: dados.titulo,
    descricao: dados.descricao?.trim() ? dados.descricao.trim() : null,
    local: dados.local?.trim() ? dados.local.trim() : null,
    dataEvento: dados.dataEventoTexto ? new Date(`${dados.dataEventoTexto}T00:00:00.000Z`) : null,
    ativo: dados.ativo,
  });

  const onSubmit = (dados: FormularioEvento) => {
    const payload = montarPayload(dados);
    if (id) {
      atualizar.mutate({ id, ...payload }, { onSuccess: onFechar });
      return;
    }
    criar.mutate(payload, {
      onSuccess: (evento) => {
        if (arquivosPendentes.length > 0) {
          uploadFotos.mutate(
            { id: evento.id, arquivos: arquivosPendentes },
            { onSuccess: onFechar },
          );
        } else {
          onFechar();
        }
      },
    });
  };

  const onSelecionarFotos = (lista: FileList | null) => {
    if (!lista?.length) return;
    const arquivos = Array.from(lista);
    if (id) {
      uploadFotos.mutate({ id, arquivos });
    } else {
      setArquivosPendentes((atual) => [...atual, ...arquivos]);
    }
    if (inputFotosRef.current) inputFotosRef.current.value = '';
  };

  const fotos = eventoExistente?.fotos ?? [];

  return (
    <>
      <Modal
        aberto={aberto}
        onFechar={onFechar}
        titulo={editando ? 'Editar evento' : 'Novo evento'}
        descricao="Cadastre o evento e envie as fotos da galeria para os filiados."
        tamanho="xl"
      >
        {editando && isLoading ? (
          <EstadoCarregando mensagem="Carregando evento…" />
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="form-area form-area--modal evento-form"
          >
            <fieldset className="evento-form-bloco">
              <legend>Dados do evento</legend>

              <label className="campo">
                <span className="campo-rotulo">Título</span>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Ex.: Confraternização de fim de ano"
                  {...register('titulo')}
                />
                {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
              </label>

              <div className="evento-form-linha">
                <label className="campo">
                  <span className="campo-rotulo">Data</span>
                  <input type="date" {...register('dataEventoTexto')} />
                </label>
                <label className="campo">
                  <span className="campo-rotulo">Local</span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Ex.: Sede do sindicato"
                    {...register('local')}
                  />
                  {errors.local && <span className="erro">{errors.local.message}</span>}
                </label>
              </div>

              <label className="campo">
                <span className="campo-rotulo">Descrição</span>
                <textarea
                  rows={4}
                  placeholder="Conte um pouco sobre o evento."
                  {...register('descricao')}
                />
                {errors.descricao && <span className="erro">{errors.descricao.message}</span>}
              </label>

              <label className="campo-checkbox">
                <input type="checkbox" {...register('ativo')} />
                <span>Visível para os filiados</span>
              </label>
            </fieldset>

            <fieldset className="evento-form-bloco">
              <legend>Galeria de fotos</legend>
              <p className="texto-secundario evento-form-nota">
                A primeira foto vira a capa na listagem. JPG, PNG ou WebP — até 40 fotos.
              </p>

              <input
                ref={inputFotosRef}
                id="evento-fotos"
                className="visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(evento) => onSelecionarFotos(evento.target.files)}
              />
              <label htmlFor="evento-fotos" className="evento-fotos-drop">
                <strong>Escolher fotos</strong>
                <span>Você pode selecionar várias de uma vez</span>
              </label>

              {uploadFotos.isPending && <p role="status">Enviando fotos…</p>}
              {uploadFotos.isError && <p className="erro">Erro ao enviar as fotos.</p>}

              {(fotos.length > 0 || previas.length > 0) && (
                <ul className="evento-fotos-grade">
                  {fotos.map((foto, indice) => (
                    <li key={foto.id}>
                      <img src={urlDaApi(foto.url)} alt={`Foto ${indice + 1}`} />
                      {indice === 0 && <span className="evento-foto-capa">Capa</span>}
                      {id && (
                        <button
                          type="button"
                          className="evento-foto-remover"
                          aria-label="Remover foto"
                          onClick={() =>
                            pedirConfirmacao({
                              titulo: 'Remover foto?',
                              descricao: 'A imagem será excluída da galeria do evento.',
                              confirmarRotulo: 'Remover',
                              tom: 'perigo',
                              onConfirmar: () =>
                                removerFoto.mutateAsync({ eventoId: id, fotoId: foto.id }),
                            })
                          }
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                  {previas.map((previa, indice) => (
                    <li key={`${previa.arquivo.name}-${indice}`}>
                      <img src={previa.url} alt={previa.arquivo.name} />
                      <button
                        type="button"
                        className="evento-foto-remover"
                        aria-label="Remover da seleção"
                        onClick={() =>
                          setArquivosPendentes((atual) =>
                            atual.filter((_, i) => i !== indice),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            {(criar.isError || atualizar.isError) && (
              <p className="erro">Não foi possível salvar o evento. Tente novamente.</p>
            )}

            <div className="form-acoes">
              <button type="button" className="botao-secundario" onClick={onFechar}>
                Cancelar
              </button>
              <button type="submit" className="botao-primario" disabled={salvando}>
                {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar evento'}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {modalConfirmacao}
    </>
  );
}
