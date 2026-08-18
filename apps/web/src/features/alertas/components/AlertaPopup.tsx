import { useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { urlDaApi } from '../../../lib/urls';
import { dispensar, lerDispensados } from '../dispensados';
import { useAlertasAtivos } from '../hooks';

/**
 * Exibe o alerta vigente mais recente que a pessoa ainda não fechou.
 * Havendo mais de um, o seguinte aparece só depois que ela fecha o atual.
 */
export function AlertaPopup() {
  const { data: alertas } = useAlertasAtivos();
  const [dispensados, setDispensados] = useState<string[]>(() => lerDispensados());

  const alerta = useMemo(
    () => alertas?.find((item) => !dispensados.includes(item.id)),
    [alertas, dispensados],
  );

  if (!alerta) {
    return null;
  }

  const fechar = () => setDispensados(dispensar(alerta.id));

  return (
    <Modal aberto titulo={alerta.titulo} onFechar={fechar} tamanho="md">
      <div className="alerta-popup">
        {alerta.imagemUrl && (
          <img className="alerta-popup-imagem" src={urlDaApi(alerta.imagemUrl)} alt="" />
        )}
        <p className="alerta-popup-mensagem">{alerta.mensagem}</p>
        <div className="alerta-popup-acoes">
          <button type="button" className="botao-secundario" onClick={fechar}>
            Fechar
          </button>
          {alerta.linkUrl && (
            <a
              className="botao-primario"
              href={alerta.linkUrl}
              target="_blank"
              rel="noreferrer"
              onClick={fechar}
            >
              {alerta.linkTexto || 'Saiba mais'}
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}
