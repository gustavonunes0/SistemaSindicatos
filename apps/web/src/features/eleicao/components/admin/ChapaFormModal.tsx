import { zodResolver } from '@hookform/resolvers/zod';
import { criarChapaSchema, type Chapa, type CriarChapaInput } from '@sindprf/types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Modal } from '../../../../components/ui/Modal';
import { useAtualizarChapa, useCriarChapa } from '../../hooks';

type ChapaFormValues = z.input<typeof criarChapaSchema>;

type ChapaFormModalProps = {
  aberto: boolean;
  eleicaoId: string;
  chapa?: Chapa;
  onFechar: () => void;
};

const valoresIniciais: ChapaFormValues = { numero: 1, nome: '', slogan: '' };

export function ChapaFormModal({ aberto, eleicaoId, chapa, onFechar }: ChapaFormModalProps) {
  const criar = useCriarChapa(eleicaoId);
  const atualizar = useAtualizarChapa(eleicaoId);
  const editando = Boolean(chapa);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChapaFormValues, unknown, CriarChapaInput>({
    resolver: zodResolver(criarChapaSchema),
    defaultValues: valoresIniciais,
  });

  // Só popula a partir da chapa em edição. O estado em branco de criação já
  // vem de `defaultValues` — reset ao fechar (ver `fechar`), não ao abrir.
  useEffect(() => {
    if (!aberto || !chapa) return;
    reset({ numero: chapa.numero, nome: chapa.nome, slogan: chapa.slogan ?? '' });
  }, [aberto, chapa, reset]);

  const salvando = criar.isPending || atualizar.isPending;

  const fechar = () => {
    reset(valoresIniciais);
    onFechar();
  };

  const onSubmit = (dados: CriarChapaInput) => {
    const opcoes = { onSuccess: fechar };
    if (chapa) {
      atualizar.mutate({ chapaId: chapa.id, ...dados }, opcoes);
    } else {
      criar.mutate(dados, opcoes);
    }
  };

  return (
    <Modal aberto={aberto} onFechar={fechar} titulo={editando ? 'Editar chapa' : 'Nova chapa'} tamanho="md">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
        <div className="form-grid">
          <label>
            Número
            <input type="number" min={1} {...register('numero', { valueAsNumber: true })} />
            {errors.numero && <span className="erro">{errors.numero.message}</span>}
          </label>

          <label>
            Nome da chapa
            <input type="text" {...register('nome')} autoComplete="off" />
            {errors.nome && <span className="erro">{errors.nome.message}</span>}
          </label>
        </div>

        <label>
          Slogan (opcional)
          <input type="text" {...register('slogan')} autoComplete="off" />
        </label>

        {(criar.isError || atualizar.isError) && (
          <p className="erro">Erro ao salvar a chapa. Tente novamente.</p>
        )}

        <div className="form-acoes">
          <button type="button" className="botao-secundario" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar chapa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
