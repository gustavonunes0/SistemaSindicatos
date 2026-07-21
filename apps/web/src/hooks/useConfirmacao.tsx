import { useCallback, useState } from 'react';
import { ConfirmacaoModal } from '../components/ui/ConfirmacaoModal';

type PedidoConfirmacao = {
  titulo: string;
  descricao?: string;
  confirmarRotulo?: string;
  cancelarRotulo?: string;
  tom?: 'perigo' | 'primario';
  onConfirmar: () => void | Promise<unknown>;
};

export function useConfirmacao() {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const [carregando, setCarregando] = useState(false);

  const pedirConfirmacao = useCallback((novoPedido: PedidoConfirmacao) => {
    setPedido(novoPedido);
  }, []);

  const cancelar = useCallback(() => {
    if (carregando) return;
    setPedido(null);
  }, [carregando]);

  const confirmar = useCallback(async () => {
    if (!pedido) return;
    setCarregando(true);
    try {
      await pedido.onConfirmar();
      setPedido(null);
    } finally {
      setCarregando(false);
    }
  }, [pedido]);

  const modalConfirmacao = (
    <ConfirmacaoModal
      aberto={pedido !== null}
      titulo={pedido?.titulo ?? ''}
      descricao={pedido?.descricao}
      confirmarRotulo={pedido?.confirmarRotulo}
      cancelarRotulo={pedido?.cancelarRotulo}
      tom={pedido?.tom}
      carregando={carregando}
      onConfirmar={() => void confirmar()}
      onCancelar={cancelar}
    />
  );

  return { pedirConfirmacao, modalConfirmacao };
}
