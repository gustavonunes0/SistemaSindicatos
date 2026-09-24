import { zodResolver } from '@hookform/resolvers/zod';
import { criarNoticiaSchema, type CriarNoticiaInput } from '@sindprf/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { RichTextEditor } from '../../../../components/ui/RichTextEditor';
import { urlDaApi } from '../../../../lib/urls';
import {
  useAtualizarNoticia,
  useCriarNoticia,
  useNoticiaAdmin,
  useUploadAnexo,
  useUploadCapa,
} from '../../hooks';

type EnvioPendente<T> = {
  geracao: number;
  arquivo: File;
  promessa: Promise<T>;
};

function useEnvioArquivo<T>(enviar: (arquivo: File) => Promise<T>) {
  const geracao = useRef(0);
  const pendente = useRef<EnvioPendente<T> | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(false);

  const selecionar = useCallback(
    (arquivo: File | undefined) => {
      if (!arquivo) return;
      const atual = ++geracao.current;
      setNome(arquivo.name);
      setErro(false);
      setEnviando(true);
      const promessa = enviar(arquivo);
      pendente.current = { geracao: atual, arquivo, promessa };
      void promessa.then(
        () => {
          if (geracao.current === atual) setEnviando(false);
        },
        () => {
          if (geracao.current === atual) {
            setEnviando(false);
            setErro(true);
          }
        },
      );
    },
    [enviar],
  );

  const limpar = useCallback(() => {
    geracao.current += 1;
    pendente.current = null;
    setNome(null);
    setEnviando(false);
    setErro(false);
  }, []);

  const aguardar = useCallback(async (): Promise<T | null> => {
    const atual = pendente.current;
    if (!atual || atual.geracao !== geracao.current) return null;
    try {
      return await atual.promessa;
    } catch {
      if (geracao.current !== atual.geracao) return null;
      setEnviando(true);
      setErro(false);
      const nova = enviar(atual.arquivo);
      pendente.current = { ...atual, promessa: nova };
      try {
        const resultado = await nova;
        if (geracao.current === atual.geracao) setEnviando(false);
        return resultado;
      } catch (falha) {
        if (geracao.current === atual.geracao) {
          setEnviando(false);
          setErro(true);
        }
        throw falha;
      }
    }
  }, [enviar]);

  return { nome, enviando, erro, temArquivo: nome !== null, selecionar, limpar, aguardar };
}

type NoticiaFormValues = z.input<typeof criarNoticiaSchema>;

type NoticiaFormModalProps = {
  aberto: boolean;
  id?: string;
  onFechar: () => void;
};

const valoresVazios: NoticiaFormValues = {
  titulo: '',
  conteudo: '',
  capaUrl: null,
  anexoUrl: null,
  anexoNome: null,
  status: 'RASCUNHO',
  destaque: false,
};

export function NoticiaFormModal({ aberto, id, onFechar }: NoticiaFormModalProps) {
  const { data: noticiaExistente, isLoading } = useNoticiaAdmin(aberto ? id : undefined);
  const criar = useCriarNoticia();
  const atualizar = useAtualizarNoticia();
  const uploadCapa = useUploadCapa();
  const uploadAnexo = useUploadAnexo();
  const enviarCapa = useCallback(
    (arquivo: File) => uploadCapa.mutateAsync(arquivo),
    [uploadCapa],
  );
  const enviarAnexo = useCallback(
    (arquivo: File) => uploadAnexo.mutateAsync(arquivo),
    [uploadAnexo],
  );
  const capa = useEnvioArquivo(enviarCapa);
  const anexo = useEnvioArquivo(enviarAnexo);
  const inputCapaRef = useRef<HTMLInputElement>(null);
  const inputAnexoRef = useRef<HTMLInputElement>(null);
  const sessao = useRef<string | null>(null);
  const [mensagemSalvar, setMensagemSalvar] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [capaLocalUrl, setCapaLocalUrl] = useState<string | null>(null);
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
    defaultValues: valoresVazios,
  });

  useEffect(() => {
    if (!aberto) {
      sessao.current = null;
      capa.limpar();
      anexo.limpar();
      setMensagemSalvar(null);
      setErroSalvar(null);
      setCapaLocalUrl((atual) => {
        if (atual) URL.revokeObjectURL(atual);
        return null;
      });
      return;
    }
    if (noticiaExistente) {
      if (sessao.current === noticiaExistente.id) return;
      sessao.current = noticiaExistente.id;
      reset({
        titulo: noticiaExistente.titulo,
        conteudo: noticiaExistente.conteudo,
        capaUrl: noticiaExistente.capaUrl,
        anexoUrl: noticiaExistente.anexoUrl,
        anexoNome: noticiaExistente.anexoNome,
        status: noticiaExistente.status,
        destaque: noticiaExistente.destaque,
      });
      return;
    }
    if (!id && sessao.current !== 'nova') {
      sessao.current = 'nova';
      reset(valoresVazios);
    }
  }, [aberto, id, noticiaExistente, reset, capa.limpar, anexo.limpar]);

  const capaUrl = watch('capaUrl');
  const anexoUrl = watch('anexoUrl');
  const anexoNome = watch('anexoNome');

  const onSubmit = async (dados: CriarNoticiaInput) => {
    setErroSalvar(null);
    const rotuloSalvar =
      anexo.temArquivo && capa.temArquivo
        ? 'Enviando arquivos e salvando…'
        : anexo.temArquivo
          ? 'Enviando o PDF e salvando…'
          : capa.temArquivo
            ? 'Enviando a capa e salvando…'
            : 'Salvando…';
    setMensagemSalvar(rotuloSalvar);
    try {
      let capaEnviada: { url: string } | null = null;
      let anexoEnviado: { url: string; nome: string } | null = null;
      try {
        capaEnviada = await capa.aguardar();
      } catch {
        setErroSalvar('Não foi possível enviar a imagem de capa. A notícia não foi salva.');
        return;
      }
      try {
        anexoEnviado = await anexo.aguardar();
      } catch {
        setErroSalvar('Não foi possível enviar o PDF. A notícia não foi salva.');
        return;
      }
      const payload: CriarNoticiaInput = {
        ...dados,
        capaUrl: capaEnviada?.url ?? dados.capaUrl ?? null,
        anexoUrl: anexo.temArquivo ? (anexoEnviado?.url ?? null) : (dados.anexoUrl ?? null),
        anexoNome: anexo.temArquivo ? (anexoEnviado?.nome ?? null) : (dados.anexoNome ?? null),
      };
      if (capaEnviada) setValue('capaUrl', capaEnviada.url, { shouldDirty: true });
      if (anexoEnviado) {
        setValue('anexoUrl', anexoEnviado.url, { shouldDirty: true });
        setValue('anexoNome', anexoEnviado.nome, { shouldDirty: true });
      }
      if (id) {
        await atualizar.mutateAsync({ id, ...payload });
      } else {
        await criar.mutateAsync(payload);
      }
      onFechar();
    } catch {
      setErroSalvar('Erro ao salvar a notícia. Tente novamente.');
    } finally {
      setMensagemSalvar(null);
    }
  };

  const onSelecionarCapa = (arquivo: File | undefined) => {
    capa.selecionar(arquivo);
    setCapaLocalUrl((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return arquivo ? URL.createObjectURL(arquivo) : null;
    });
  };

  const removerCapa = () => {
    capa.limpar();
    setCapaLocalUrl((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return null;
    });
    setValue('capaUrl', null, { shouldDirty: true });
    if (inputCapaRef.current) inputCapaRef.current.value = '';
  };

  const removerAnexo = () => {
    anexo.limpar();
    setValue('anexoUrl', null, { shouldDirty: true });
    setValue('anexoNome', null, { shouldDirty: true });
    if (inputAnexoRef.current) inputAnexoRef.current.value = '';
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
            {(capaLocalUrl || (capaUrl && !capa.temArquivo)) && (
              <img
                className="capa-preview"
                src={capaLocalUrl ?? urlDaApi(capaUrl ?? '')}
                alt="Capa atual"
              />
            )}
            <input
              ref={inputCapaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(evento) => onSelecionarCapa(evento.target.files?.[0])}
            />
            {capa.nome && (
              <span className="noticia-arquivo-status">
                {capa.nome}
                {capa.enviando ? ' · enviando…' : capa.erro ? ' · falhou, tentaremos de novo ao salvar' : ' · pronta'}
              </span>
            )}
            {(capaUrl || capa.temArquivo) && (
              <button type="button" className="botao-link" onClick={removerCapa}>
                Remover capa
              </button>
            )}
          </div>

          <div className="campo">
            <span className="campo-rotulo">Anexo (PDF)</span>
            {(anexo.nome || anexoUrl) && (
              <div className="noticia-anexo-preview">
                {anexoUrl && !anexo.temArquivo ? (
                  <a href={urlDaApi(anexoUrl)} target="_blank" rel="noreferrer">
                    {anexoNome || 'Anexo.pdf'}
                  </a>
                ) : (
                  <span>{anexo.nome}</span>
                )}
                {anexo.temArquivo && (
                  <span className="noticia-arquivo-status">
                    {anexo.enviando
                      ? 'Enviando o PDF. Pode salvar agora: ele entra junto com a notícia.'
                      : anexo.erro
                        ? 'O envio falhou. Ao salvar, tentamos de novo.'
                        : 'PDF pronto. Ele será gravado ao salvar a notícia.'}
                  </span>
                )}
              </div>
            )}
            <input
              ref={inputAnexoRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(evento) => anexo.selecionar(evento.target.files?.[0])}
            />
            {(anexoUrl || anexo.temArquivo) && (
              <button type="button" className="botao-link" onClick={removerAnexo}>
                Remover anexo
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

          <label className="campo-checkbox">
            <input type="checkbox" {...register('destaque')} />
            <span>
              Destacar na home
              <small>Aparece no carrossel da página inicial junto com posts do Instagram.</small>
            </span>
          </label>

          {erroSalvar && <p className="erro">{erroSalvar}</p>}

          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={onFechar} disabled={Boolean(mensagemSalvar)}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={Boolean(mensagemSalvar)}>
              {mensagemSalvar ?? 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
