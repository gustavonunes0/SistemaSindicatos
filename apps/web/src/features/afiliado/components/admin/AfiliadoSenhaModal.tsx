import { zodResolver } from '@hookform/resolvers/zod';
import { adminAtualizarSenhaAfiliadoSchema } from '@sindprf/types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../../../components/ui/Modal';
import { useAtualizarSenhaAfiliadoAdmin } from '../../hooks';

const formularioSenhaSchema = adminAtualizarSenhaAfiliadoSchema
  .extend({
    confirmarSenha: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((dados) => dados.novaSenha === dados.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

type FormularioSenha = z.infer<typeof formularioSenhaSchema>;

type AfiliadoSenhaModalProps = {
  afiliado: { id: string; nome: string } | null;
  onFechar: () => void;
};

export function AfiliadoSenhaModal({ afiliado, onFechar }: AfiliadoSenhaModalProps) {
  const atualizarSenha = useAtualizarSenhaAfiliadoAdmin();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormularioSenha>({
    resolver: zodResolver(formularioSenhaSchema),
    defaultValues: { novaSenha: '', confirmarSenha: '' },
  });

  useEffect(() => {
    if (!afiliado) return;
    reset({ novaSenha: '', confirmarSenha: '' });
  }, [afiliado, reset]);

  return (
    <Modal
      aberto={afiliado !== null}
      titulo="Alterar senha"
      descricao={
        afiliado
          ? `Defina uma nova senha de acesso para ${afiliado.nome}. As sessões abertas serão encerradas.`
          : undefined
      }
      onFechar={onFechar}
      tamanho="md"
    >
      {afiliado && (
        <form
          className="form-area form-area--modal"
          noValidate
          onSubmit={handleSubmit((dados) =>
            atualizarSenha.mutate(
              { id: afiliado.id, novaSenha: dados.novaSenha },
              { onSuccess: onFechar },
            ),
          )}
        >
          <label className="campo">
            <span className="campo-rotulo">Nova senha</span>
            <input type="password" autoComplete="new-password" {...register('novaSenha')} />
            {errors.novaSenha && <span className="erro">{errors.novaSenha.message}</span>}
          </label>

          <label className="campo">
            <span className="campo-rotulo">Confirmar senha</span>
            <input type="password" autoComplete="new-password" {...register('confirmarSenha')} />
            {errors.confirmarSenha && (
              <span className="erro">{errors.confirmarSenha.message}</span>
            )}
          </label>

          {atualizarSenha.isError && (
            <p className="erro">Não foi possível alterar a senha. Tente novamente.</p>
          )}

          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={atualizarSenha.isPending}>
              {atualizarSenha.isPending ? 'Salvando…' : 'Salvar senha'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
