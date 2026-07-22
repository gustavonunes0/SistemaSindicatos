import { zodResolver } from '@hookform/resolvers/zod';
import { criarCandidatoSchema, type Candidato, type CriarCandidatoInput } from '@sindprf/types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Modal } from '../../../../components/ui/Modal';
import { useAtualizarCandidato, useCriarCandidato } from '../../hooks';

type CandidatoFormValues = z.input<typeof criarCandidatoSchema>;

type CandidatoFormModalProps = {
  aberto: boolean;
  eleicaoId: string;
  chapaId: string;
  candidato?: Candidato;
  onFechar: () => void;
};

const valoresIniciais: CandidatoFormValues = { nome: '', cargo: '', fotoUrl: null };

export function CandidatoFormModal({
  aberto,
  eleicaoId,
  chapaId,
  candidato,
  onFechar,
}: CandidatoFormModalProps) {
  const criar = useCriarCandidato(eleicaoId);
  const atualizar = useAtualizarCandidato(eleicaoId);
  const editando = Boolean(candidato);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CandidatoFormValues, unknown, CriarCandidatoInput>({
    resolver: zodResolver(criarCandidatoSchema),
    defaultValues: valoresIniciais,
  });

  // Só popula a partir do candidato em edição. O estado em branco de criação
  // já vem de `defaultValues` — reset ao fechar (ver `fechar`), não ao abrir.
  useEffect(() => {
    if (!aberto || !candidato) return;
    reset({ nome: candidato.nome, cargo: candidato.cargo, fotoUrl: candidato.fotoUrl });
  }, [aberto, candidato, reset]);

  const salvando = criar.isPending || atualizar.isPending;

  const fechar = () => {
    reset(valoresIniciais);
    onFechar();
  };

  const onSubmit = (dados: CriarCandidatoInput) => {
    const opcoes = { onSuccess: fechar };
    if (candidato) {
      atualizar.mutate({ chapaId, candidatoId: candidato.id, ...dados }, opcoes);
    } else {
      criar.mutate({ chapaId, ...dados }, opcoes);
    }
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={fechar}
      titulo={editando ? 'Editar candidato' : 'Novo candidato'}
      tamanho="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
        <div className="form-grid">
          <label>
            Nome
            <input type="text" {...register('nome')} autoComplete="off" />
            {errors.nome && <span className="erro">{errors.nome.message}</span>}
          </label>

          <label>
            Cargo
            <input
              type="text"
              {...register('cargo')}
              placeholder="Ex.: Presidente, Vice-presidente"
              autoComplete="off"
            />
            {errors.cargo && <span className="erro">{errors.cargo.message}</span>}
          </label>
        </div>

        <label>
          Foto (URL, opcional)
          <input type="url" {...register('fotoUrl')} placeholder="https://" />
          {errors.fotoUrl && <span className="erro">{errors.fotoUrl.message}</span>}
        </label>

        {(criar.isError || atualizar.isError) && (
          <p className="erro">Erro ao salvar o candidato. Tente novamente.</p>
        )}

        <div className="form-acoes">
          <button type="button" className="botao-secundario" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Adicionar candidato'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
