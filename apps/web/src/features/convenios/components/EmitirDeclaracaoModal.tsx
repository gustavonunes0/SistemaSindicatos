import { zodResolver } from '@hookform/resolvers/zod';
import {
  emitirDeclaracaoSchema,
  type Convenio,
  type EmitirDeclaracaoInput,
  type ModeloDeclaracao,
} from '@sindprf/types';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../../components/ui/Modal';
import { useEmitirDeclaracao } from '../hooks';

type FormValues = z.input<typeof emitirDeclaracaoSchema>;

function schemaPorModelo(modelo: ModeloDeclaracao | null) {
  return emitirDeclaracaoSchema.superRefine((dados, ctx) => {
    if (modelo === 'DEPENDENTE') {
      if (!dados.dependenteNome?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o nome do dependente',
          path: ['dependenteNome'],
        });
      }
      if (!dados.dependenteCpf) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o CPF do dependente',
          path: ['dependenteCpf'],
        });
      }
    }
    if (modelo === 'AUTORIZACAO_HOSPEDAGEM') {
      if (!dados.periodoInicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe a data de início',
          path: ['periodoInicio'],
        });
      }
      if (!dados.periodoFim) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe a data de fim',
          path: ['periodoFim'],
        });
      }
    }
  });
}

type EmitirDeclaracaoModalProps = {
  aberto: boolean;
  convenio: Convenio;
  onFechar: () => void;
};

export function EmitirDeclaracaoModal({
  aberto,
  convenio,
  onFechar,
}: EmitirDeclaracaoModalProps) {
  const emitir = useEmitirDeclaracao();
  const modelo = convenio.modeloDeclaracao;
  const precisaDependente = modelo === 'DEPENDENTE';
  const precisaPeriodo = modelo === 'AUTORIZACAO_HOSPEDAGEM';
  const schema = useMemo(() => schemaPorModelo(modelo), [modelo]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues, unknown, EmitirDeclaracaoInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      dependenteNome: '',
      dependenteCpf: '',
      periodoInicio: undefined,
      periodoFim: undefined,
    },
  });

  const onSubmit = (dados: EmitirDeclaracaoInput) => {
    emitir.mutate(
      { id: convenio.id, ...dados },
      {
        onSuccess: () => onFechar(),
      },
    );
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Emitir declaração"
      descricao={`Documento com assinatura da presidente para uso junto a ${convenio.destinoDeclaracao ?? convenio.nome}.`}
      tamanho="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
        <p className="convenio-declaracao-resumo">
          Serão preenchidos automaticamente o seu nome e CPF de afiliado aprovado.
        </p>

        {precisaDependente && (
          <div className="form-grid">
            <label>
              Nome do dependente
              <input type="text" {...register('dependenteNome')} autoComplete="name" />
              {errors.dependenteNome && (
                <span className="erro">{errors.dependenteNome.message}</span>
              )}
            </label>
            <label>
              CPF do dependente
              <input type="text" {...register('dependenteCpf')} inputMode="numeric" />
              {errors.dependenteCpf && (
                <span className="erro">{errors.dependenteCpf.message}</span>
              )}
            </label>
          </div>
        )}

        {precisaPeriodo && (
          <div className="form-grid">
            <label>
              Início da hospedagem
              <input type="date" {...register('periodoInicio')} />
              {errors.periodoInicio && (
                <span className="erro">{errors.periodoInicio.message}</span>
              )}
            </label>
            <label>
              Fim da hospedagem
              <input type="date" {...register('periodoFim')} />
              {errors.periodoFim && <span className="erro">{errors.periodoFim.message}</span>}
            </label>
          </div>
        )}

        {emitir.isError && (
          <p className="erro">Não foi possível gerar a declaração. Tente novamente.</p>
        )}

        <div className="form-acoes">
          <button type="button" className="botao-secundario" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="botao-primario" disabled={emitir.isPending}>
            {emitir.isPending ? 'Gerando…' : 'Baixar PDF'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
