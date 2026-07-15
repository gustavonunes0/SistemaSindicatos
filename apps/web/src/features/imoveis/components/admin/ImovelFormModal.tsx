import { zodResolver } from '@hookform/resolvers/zod';
import { criarImovelSchema, type CriarImovelInput } from '@sindprf/types';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
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
    <section className="imovel-admin-periodos">
      <h3 className="imovel-secao-titulo">Disponibilidade</h3>
      <p className="area-subtitulo">
        Bloqueie ou marque reservas para o calendário dos afiliados.
      </p>

      <div className="form-grid">
        <label>
          Início
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <label>
          Fim
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </label>
        <label>
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'BLOQUEADO' | 'RESERVADO')}
          >
            <option value="BLOQUEADO">Indisponível</option>
            <option value="RESERVADO">Reservado</option>
          </select>
        </label>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <button
        type="button"
        className="botao-primario"
        disabled={criarPeriodo.isPending}
        onClick={onBloquear}
      >
        {criarPeriodo.isPending ? 'Salvando…' : 'Adicionar período'}
      </button>

      {periodos && periodos.length > 0 && (
        <ul className="imovel-periodos-lista">
          {periodos.map((periodo) => (
            <li key={periodo.id}>
              <span>
                {formatarData(periodo.inicio)} — {formatarData(periodo.fim)} ·{' '}
                {periodo.tipo === 'BLOQUEADO' ? 'Indisponível' : 'Reservado'}
              </span>
              <button
                type="button"
                className="botao-link botao-perigo-texto"
                disabled={removerPeriodo.isPending}
                onClick={() => removerPeriodo.mutate({ imovelId, periodoId: periodo.id })}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
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
  const inputFotosRef = useRef<HTMLInputElement>(null);
  const [arquivosPendentes, setArquivosPendentes] = useState<File[]>([]);
  const editando = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
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
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar apartamento' : 'Novo apartamento'}
      descricao="Cadastre o imóvel, fotos e, após salvar, os períodos de disponibilidade."
      tamanho="xl"
    >
      {editando && isLoading ? (
        <EstadoCarregando mensagem="Carregando imóvel…" />
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
            <label>
              Título
              <input type="text" {...register('titulo')} autoComplete="off" />
              {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
            </label>

            <label>
              Endereço
              <input type="text" {...register('endereco')} autoComplete="off" />
              {errors.endereco && <span className="erro">{errors.endereco.message}</span>}
            </label>

            <label>
              Valor por dia (R$)
              <input type="number" step="0.01" min="0" {...register('valor')} />
              {errors.valor && <span className="erro">{errors.valor.message}</span>}
            </label>

            <label>
              Descrição
              <textarea rows={4} {...register('descricao')} />
              {errors.descricao && <span className="erro">{errors.descricao.message}</span>}
            </label>

            <label>
              Comodidades
              <textarea
                rows={3}
                {...register('comodidadesTexto')}
                placeholder="Uma comodidade por linha (ex.: Wi-Fi, Garagem)"
              />
            </label>

            <div className="campo">
              <span className="campo-rotulo">Fotos</span>
              <input
                ref={inputFotosRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(evento) => onSelecionarFotos(evento.target.files)}
              />
              {uploadFotos.isPending && <span>Enviando fotos…</span>}
              {uploadFotos.isError && <span className="erro">Erro ao enviar as fotos.</span>}

              {!id && arquivosPendentes.length > 0 && (
                <p className="imovel-fotos-pendentes">
                  {arquivosPendentes.length} foto(s) serão enviadas ao salvar.
                </p>
              )}

              {fotos.length > 0 && (
                <div className="imovel-admin-fotos">
                  {fotos.map((foto) => (
                    <figure key={foto.id}>
                      <img src={urlDaApi(foto.url)} alt="" />
                      <button
                        type="button"
                        className="botao-link botao-perigo-texto"
                        disabled={removerFoto.isPending}
                        onClick={() => removerFoto.mutate({ imovelId: id!, fotoId: foto.id })}
                      >
                        Remover
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </div>

            <label className="campo-checkbox">
              <input type="checkbox" {...register('ativo')} />
              Apartamento ativo (visível para afiliados aprovados)
            </label>

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

          {id && <ImovelPeriodosAdmin imovelId={id} />}
        </>
      )}
    </Modal>
  );
}
