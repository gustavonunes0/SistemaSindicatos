import { zodResolver } from '@hookform/resolvers/zod';
import { criarContestacaoSchema, type CriarContestacaoInput } from '@sindprf/types';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { useCriarContestacaoChapa } from '../hooks';

type ContestarChapaModalProps = {
  aberto: boolean;
  eleicaoId: string;
  chapaId: string;
  chapaNome: string;
  tipoProvavel: 'IMPUGNACAO' | 'RECURSO';
  onFechar: () => void;
};

export function ContestarChapaModal({
  aberto,
  eleicaoId,
  chapaId,
  chapaNome,
  tipoProvavel,
  onFechar,
}: ContestarChapaModalProps) {
  const criar = useCriarContestacaoChapa(eleicaoId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CriarContestacaoInput>({
    resolver: zodResolver(criarContestacaoSchema),
    defaultValues: { motivo: '' },
  });

  const onSubmit = (dados: CriarContestacaoInput) => {
    criar.mutate(
      { chapaId, ...dados },
      {
        onSuccess: () => {
          reset();
          onFechar();
        },
      },
    );
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={tipoProvavel === 'IMPUGNACAO' ? 'Impugnar chapa' : 'Recorrer da não homologação'}
      descricao={`Chapa "${chapaNome}". A Comissão Eleitoral analisará seu pedido dentro do prazo estatutário.`}
      tamanho="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
        <label>
          Motivo
          <textarea rows={4} {...register('motivo')} />
          {errors.motivo && <span className="erro">{errors.motivo.message}</span>}
        </label>

        {criar.isError && <p className="erro">Não foi possível registrar. Verifique o prazo.</p>}

        <div className="form-acoes">
          <button type="button" className="botao-secundario" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="botao-primario" disabled={criar.isPending}>
            {criar.isPending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
