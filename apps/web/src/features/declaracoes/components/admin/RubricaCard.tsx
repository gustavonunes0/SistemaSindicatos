import { useRef, useState } from 'react';
import { useMarca } from '../../../../lib/marca';
import { urlDaApi } from '../../../../lib/urls';
import { useEnviarRubrica, useRemoverRubrica } from '../../hooks';

/**
 * Rubrica desenhada acima do carimbo nas declarações em PDF.
 *
 * Fica aqui, e não numa tela de configurações, porque é o único lugar onde ela
 * é usada — quem cuida das declarações é quem precisa trocá-la.
 */
export function RubricaCard() {
  const marca = useMarca();
  const enviar = useEnviarRubrica();
  const remover = useRemoverRubrica();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);

  const assinaturaUrl = marca.assinaturaUrl ?? null;

  const onSelecionar = (arquivo: File | undefined) => {
    if (arquivo) {
      enviar.mutate(arquivo);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <section className="rubrica-card">
      <header className="rubrica-card-topo">
        <div>
          <h2>Assinatura da presidente</h2>
          <p className="texto-secundario">
            {assinaturaUrl
              ? 'Aparece acima do carimbo em toda declaração emitida.'
              : 'Sem rubrica cadastrada: o PDF sai apenas com o carimbo de nome e CNPJ.'}
          </p>
        </div>
        <button
          type="button"
          className="botao-secundario"
          onClick={() => setAberto((atual) => !atual)}
        >
          {aberto ? 'Fechar' : 'Configurar'}
        </button>
      </header>

      {aberto && (
        <div className="rubrica-card-corpo">
          {assinaturaUrl && (
            <img
              className="rubrica-preview"
              src={urlDaApi(assinaturaUrl)}
              alt="Assinatura cadastrada"
            />
          )}

          <div className="rubrica-card-acoes">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(evento) => onSelecionar(evento.target.files?.[0])}
            />
            {assinaturaUrl && (
              <button
                type="button"
                className="botao-link"
                disabled={remover.isPending}
                onClick={() => remover.mutate()}
              >
                Remover assinatura
              </button>
            )}
          </div>

          <p className="texto-secundario">
            Use PNG com fundo transparente para o melhor resultado. Máximo de 2 MB.
          </p>

          {enviar.isPending && <p>Enviando assinatura…</p>}
          {enviar.isError && (
            <p className="erro">
              Erro ao salvar a assinatura. Confira se o sindicato já tem identidade visual
              configurada.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
