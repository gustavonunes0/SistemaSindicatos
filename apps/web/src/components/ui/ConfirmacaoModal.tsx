import { Modal } from './Modal';

type ConfirmacaoModalProps = {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  confirmarRotulo?: string;
  cancelarRotulo?: string;
  /** `perigo` = exclusão/inativação; `primario` = ação afirmativa */
  tom?: 'perigo' | 'primario';
  carregando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function ConfirmacaoModal({
  aberto,
  titulo,
  descricao,
  confirmarRotulo = 'Confirmar',
  cancelarRotulo = 'Cancelar',
  tom = 'perigo',
  carregando = false,
  onConfirmar,
  onCancelar,
}: ConfirmacaoModalProps) {
  return (
    <Modal aberto={aberto} titulo={titulo} descricao={descricao} onFechar={onCancelar} tamanho="md">
      <div className="confirmacao-modal">
        <div className="form-acoes">
          <button
            type="button"
            className="botao-secundario"
            disabled={carregando}
            onClick={onCancelar}
          >
            {cancelarRotulo}
          </button>
          <button
            type="button"
            className={tom === 'perigo' ? 'botao-perigo' : 'botao-primario'}
            disabled={carregando}
            onClick={onConfirmar}
          >
            {carregando ? 'Aguarde…' : confirmarRotulo}
          </button>
        </div>
      </div>
    </Modal>
  );
}
