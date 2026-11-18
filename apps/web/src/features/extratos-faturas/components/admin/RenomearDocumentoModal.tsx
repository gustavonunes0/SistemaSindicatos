import { zodResolver } from '@hookform/resolvers/zod';
import { renomearImportacaoFinanceiraSchema, type RenomearImportacaoFinanceira } from '@sindprf/types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../../components/ui/Modal';
import { useRenomearImportacaoFinanceira } from '../../hooks';

export type DocumentoRenomeavel = { id: string; arquivoNome: string };

type RenomearDocumentoModalProps = {
  documento: DocumentoRenomeavel | null;
  onFechar: () => void;
};

export function RenomearDocumentoModal({ documento, onFechar }: RenomearDocumentoModalProps) {
  const renomear = useRenomearImportacaoFinanceira();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RenomearImportacaoFinanceira>({
    resolver: zodResolver(renomearImportacaoFinanceiraSchema),
    defaultValues: { arquivoNome: '' },
  });

  useEffect(() => {
    if (!documento) return;
    reset({ arquivoNome: documento.arquivoNome });
  }, [documento, reset]);

  return (
    <Modal
      aberto={documento !== null}
      titulo="Renomear arquivo"
      descricao="O nome aparece no histórico e no detalhe do documento. O arquivo original não é alterado."
      onFechar={onFechar}
      tamanho="md"
    >
      {documento && (
        <form
          className="form-area form-area--modal"
          noValidate
          onSubmit={handleSubmit((dados) =>
            renomear.mutate(
              { id: documento.id, arquivoNome: dados.arquivoNome },
              { onSuccess: onFechar },
            ),
          )}
        >
          <label className="campo">
            <span className="campo-rotulo">Nome do arquivo</span>
            <input type="text" autoFocus {...register('arquivoNome')} />
            {errors.arquivoNome && <span className="erro">{errors.arquivoNome.message}</span>}
          </label>

          {renomear.isError && (
            <p className="erro">Não foi possível renomear o arquivo. Tente novamente.</p>
          )}

          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={renomear.isPending}>
              {renomear.isPending ? 'Salvando…' : 'Salvar nome'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
