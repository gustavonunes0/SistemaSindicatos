import { zodResolver } from '@hookform/resolvers/zod';
import { criarImovelSchema, type CriarImovelInput } from '@sindprf/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import { urlDaApi } from '../../../../lib/urls';
import {
  useAtualizarImovel,
  useCriarImovel,
  useCriarPeriodoImovel,
  useImovelAdmin,
  usePeriodosAdmin,
  useRemoverFotoImovel,
  useRemoverPeriodoImovel,
  useUploadFotosImovel,
} from '../../hooks';

const imovelFormSchema = criarImovelSchema.extend({
  comodidadesTexto: z.string().optional(),
});

type ImovelFormValues = z.input<typeof imovelFormSchema>;

function parseComodidades(texto: string | undefined): string[] {
  if (!texto) return [];
  return texto
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ImovelPeriodosAdmin({ imovelId }: { imovelId: string }) {
  const { data: periodos } = usePeriodosAdmin(imovelId);
  const criarPeriodo = useCriarPeriodoImovel();
  const removerPeriodo = useRemoverPeriodoImovel();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [tipo, setTipo] = useState<'BLOQUEADO' | 'RESERVADO'>('BLOQUEADO');
  const [erro, setErro] = useState<string | null>(null);

  const onBloquear = () => {
    setErro(null);
    if (!inicio || !fim) {
      setErro('Informe as datas de início e fim.');
      return;
    }
    criarPeriodo.mutate(
      {
        imovelId,
        inicio: new Date(`${inicio}T00:00:00`),
        fim: new Date(`${fim}T23:59:59`),
        tipo,
      },
      {
        onSuccess: () => {
          setInicio('');
          setFim('');
        },
        onError: () => setErro('Não foi possível cadastrar o período. Verifique sobreposição.'),
      },
    );
  };

  return (
    <section className="imovel-form-bloco">
      <header className="imovel-form-bloco-topo">
        <h3>Disponibilidade</h3>
        <p className="texto-secundario">
          Marque os intervalos em que o apartamento não pode ser reservado.
        </p>
      </header>

      <div className="imovel-periodo-form">
        <label className="campo">
          <span className="campo-rotulo">Início</span>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Fim</span>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Motivo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="BLOQUEADO">Indisponível</option>
            <option value="RESERVADO">Reservado</option>
          </select>
        </label>
        <button
          type="button"
          className="botao-secundario"
          disabled={criarPeriodo.isPending}
          onClick={onBloquear}
        >
          {criarPeriodo.isPending ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>

      {erro && <p className="erro">{erro}</p>}

      {periodos && periodos.length > 0 ? (
        <ul className="imovel-periodos-lista">
          {periodos.map((periodo) => (
            <li key={periodo.id}>
              <span>
                <span
                  className={`badge ${
                    periodo.tipo === 'BLOQUEADO' ? 'badge-inativo' : 'badge-ativo'
                  }`}
                >
                  {periodo.tipo === 'BLOQUEADO' ? 'Indisponível' : 'Reservado'}
                </span>{' '}
                {formatarData(periodo.inicio)} — {formatarData(periodo.fim)}
              </span>
              <button
                type="button"
                className="botao-link botao-perigo-texto"
                disabled={removerPeriodo.isPending}
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Remover período?',
                    descricao: `O período de ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)} será removido do calendário.`,
                    confirmarRotulo: 'Remover',
                    onConfirmar: () =>
                      removerPeriodo.mutateAsync({ imovelId, periodoId: periodo.id }),
                  })
                }
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="texto-secundario imovel-form-nota">
          Nenhum período cadastrado — o apartamento aparece livre o ano todo.
        </p>
      )}
      {modalConfirmacao}
    </section>
  );
}

type ImovelFormModalProps = {
  aberto: boolean;
  id?: string;
  onFechar: () => void;
};

export function ImovelFormModal({ aberto, id, onFechar }: ImovelFormModalProps) {
  const { data: imovelExistente, isLoading } = useImovelAdmin(aberto ? id : undefined);
  const criar = useCriarImovel();
  const atualizar = useAtualizarImovel();
  const uploadFotos = useUploadFotosImovel();
  const removerFoto = useRemoverFotoImovel();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const inputFotosRef = useRef<HTMLInputElement>(null);
  const [arquivosPendentes, setArquivosPendentes] = useState<File[]>([]);
  const editando = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ImovelFormValues, unknown, ImovelFormValues>({
    resolver: zodResolver(imovelFormSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      endereco: '',
      valor: 0,
      comodidadesTexto: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (!aberto) return;
    if (imovelExistente) {
      reset({
        titulo: imovelExistente.titulo,
        descricao: imovelExistente.descricao,
        endereco: imovelExistente.endereco,
        valor: imovelExistente.valor,
        comodidadesTexto: imovelExistente.comodidades.join('\n'),
        ativo: imovelExistente.ativo,
      });
      return;
    }
    if (!id) {
      reset({
        titulo: '',
        descricao: '',
        endereco: '',
        valor: 0,
        comodidadesTexto: '',
        ativo: true,
      });
      setArquivosPendentes([]);
    }
  }, [aberto, id, imovelExistente, reset]);

  // Miniatura das fotos ainda não enviadas: sem isso o admin escolhe às cegas.
  const previas = useMemo(
    () => arquivosPendentes.map((arquivo) => ({ arquivo, url: URL.createObjectURL(arquivo) })),
    [arquivosPendentes],
  );
  useEffect(() => {
    return () => previas.forEach((previa) => URL.revokeObjectURL(previa.url));
  }, [previas]);

  const comodidades = parseComodidades(watch('comodidadesTexto'));
  const salvando = criar.isPending || atualizar.isPending || uploadFotos.isPending;

  const montarPayload = (dados: ImovelFormValues): CriarImovelInput => ({
    titulo: dados.titulo,
    descricao: dados.descricao,
    endereco: dados.endereco,
    valor: Number(dados.valor),
    comodidades: parseComodidades(dados.comodidadesTexto),
    ativo: dados.ativo ?? true,
  });

  const onSubmit = (dados: ImovelFormValues) => {
    const payload = montarPayload(dados);

    if (id) {
      atualizar.mutate({ id, ...payload }, { onSuccess: onFechar });
      return;
    }

    criar.mutate(payload, {
      onSuccess: (imovel) => {
        if (arquivosPendentes.length > 0) {
          uploadFotos.mutate(
            { id: imovel.id, arquivos: arquivosPendentes },
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

  const fotos = imovelExistente?.fotos ?? [];

  return (
    <>
      <Modal
        aberto={aberto}
        onFechar={onFechar}
        titulo={editando ? 'Editar apartamento' : 'Novo apartamento'}
        descricao="Os dados abaixo são o que o filiado vê ao consultar o apartamento."
        tamanho="xl"
      >
        {editando && isLoading ? (
          <EstadoCarregando mensagem="Carregando imóvel…" />
        ) : (
          <>
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="form-area form-area--modal imovel-form"
            >
              <fieldset className="imovel-form-bloco">
                <legend>Identificação</legend>

                <label className="campo">
                  <span className="campo-rotulo">Título</span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Ex.: Apartamento 302 — Praia do Futuro"
                    {...register('titulo')}
                  />
                  {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
                </label>

                <div className="imovel-form-linha">
                  <label className="campo">
                    <span className="campo-rotulo">Endereço</span>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Rua, número, bairro e cidade"
                      {...register('endereco')}
                    />
                    {errors.endereco && <span className="erro">{errors.endereco.message}</span>}
                  </label>

                  <label className="campo">
                    <span className="campo-rotulo">Valor por dia</span>
                    <div className="campo-com-prefixo">
                      <span aria-hidden="true">R$</span>
                      <input type="number" step="0.01" min="0" {...register('valor')} />
                    </div>
                    {errors.valor && <span className="erro">{errors.valor.message}</span>}
                  </label>
                </div>

                <label className="campo">
                  <span className="campo-rotulo">Descrição</span>
                  <textarea
                    rows={4}
                    placeholder="Quantos quartos, capacidade, o que está incluso e regras da casa."
                    {...register('descricao')}
                  />
                  {errors.descricao && <span className="erro">{errors.descricao.message}</span>}
                </label>

                <label className="campo">
                  <span className="campo-rotulo">Comodidades</span>
                  <textarea
                    rows={3}
                    placeholder={'Wi-Fi\nGaragem\nAr-condicionado'}
                    {...register('comodidadesTexto')}
                  />
                  <span className="campo-ajuda">
                    Uma por linha ou separadas por vírgula. Viram etiquetas na página do
                    apartamento.
                  </span>
                  {comodidades.length > 0 && (
                    <ul className="imovel-comodidades imovel-comodidades--previa">
                      {comodidades.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </label>
              </fieldset>

              <fieldset className="imovel-form-bloco">
                <legend>Fotos</legend>
                <p className="texto-secundario imovel-form-nota">
                  A primeira foto vira a capa na listagem. JPG, PNG ou WebP.
                </p>

                <input
                  ref={inputFotosRef}
                  id="imovel-fotos"
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(evento) => onSelecionarFotos(evento.target.files)}
                />
                <label htmlFor="imovel-fotos" className="imovel-fotos-drop">
                  <strong>Escolher fotos</strong>
                  <span>Você pode selecionar várias de uma vez</span>
                </label>

                {uploadFotos.isPending && <p role="status">Enviando fotos…</p>}
                {uploadFotos.isError && <p className="erro">Erro ao enviar as fotos.</p>}

                {(fotos.length > 0 || previas.length > 0) && (
                  <ul className="imovel-fotos-grade">
                    {fotos.map((foto, indice) => (
                      <li key={foto.id}>
                        <img src={urlDaApi(foto.url)} alt={`Foto ${indice + 1}`} />
                        {indice === 0 && <span className="imovel-foto-capa">Capa</span>}
                        <button
                          type="button"
                          className="imovel-foto-remover"
                          aria-label={`Remover foto ${indice + 1}`}
                          disabled={removerFoto.isPending}
                          onClick={() =>
                            pedirConfirmacao({
                              titulo: 'Remover foto?',
                              descricao:
                                'A foto será excluída permanentemente deste apartamento.',
                              confirmarRotulo: 'Remover',
                              onConfirmar: () =>
                                removerFoto.mutateAsync({ imovelId: id!, fotoId: foto.id }),
                            })
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}

                    {previas.map((previa, indice) => (
                      <li key={previa.url} className="imovel-foto--pendente">
                        <img src={previa.url} alt={previa.arquivo.name} />
                        <span className="imovel-foto-capa">Ao salvar</span>
                        <button
                          type="button"
                          className="imovel-foto-remover"
                          aria-label={`Remover ${previa.arquivo.name}`}
                          onClick={() =>
                            setArquivosPendentes((atual) =>
                              atual.filter((_, posicao) => posicao !== indice),
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

              <fieldset className="imovel-form-bloco">
                <legend>Publicação</legend>
                <label className="imovel-form-switch">
                  <input type="checkbox" {...register('ativo')} />
                  <span>
                    <strong>Visível para os filiados</strong>
                    <small>
                      Desmarque para tirar da listagem sem apagar o cadastro, as fotos ou os
                      períodos.
                    </small>
                  </span>
                </label>
              </fieldset>

              {(criar.isError || atualizar.isError) && (
                <p className="erro">Erro ao salvar o apartamento. Tente novamente.</p>
              )}

              <div className="form-acoes">
                <button type="button" className="botao-secundario" onClick={onFechar}>
                  Cancelar
                </button>
                <button type="submit" className="botao-primario" disabled={salvando}>
                  {salvando
                    ? 'Salvando…'
                    : editando
                      ? 'Salvar alterações'
                      : 'Cadastrar apartamento'}
                </button>
              </div>
            </form>

            {id ? (
              <ImovelPeriodosAdmin imovelId={id} />
            ) : (
              <p className="texto-secundario imovel-form-nota">
                Os períodos de bloqueio ficam disponíveis assim que o apartamento for salvo.
              </p>
            )}
          </>
        )}
      </Modal>
      {modalConfirmacao}
    </>
  );
}
