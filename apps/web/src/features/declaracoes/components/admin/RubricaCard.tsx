import { isAxiosError } from 'axios';
import { useRef, useState } from 'react';
import { useMarca } from '../../../../lib/marca';
import { urlDaApi } from '../../../../lib/urls';
import { useEnviarRubrica, useRemoverRubrica } from '../../hooks';

function mensagemErro(erro: unknown): string {
  if (isAxiosError(erro)) {
    const data = erro.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return 'Erro ao salvar a assinatura. Tente novamente.';
}

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
  const assinaturaUrl = marca.assinaturaUrl ?? null;

  // Sem rubrica não há nada a assinar pela plataforma, então o painel já abre
  // pedindo o arquivo em vez de esconder a pendência atrás de um botão.
  const [aberto, setAberto] = useState(!assinaturaUrl);

  const ocupado = enviar.isPending || remover.isPending;

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
          <h2>
            Assinatura da presidente{' '}
            <span className={`badge ${assinaturaUrl ? 'badge-rubrica-ok' : 'badge-rubrica-falta'}`}>
              {assinaturaUrl ? 'Cadastrada' : 'Não cadastrada'}
            </span>
          </h2>
          <p className="texto-secundario">
            {assinaturaUrl
              ? 'Entra automaticamente acima do carimbo em toda declaração emitida e permite assinar pela plataforma.'
              : 'Sem rubrica, o PDF sai só com o carimbo de nome e CNPJ e a assinatura pela plataforma fica indisponível.'}
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
          {assinaturaUrl ? (
            <img
              className="rubrica-preview"
              src={urlDaApi(assinaturaUrl)}
              alt="Assinatura cadastrada"
            />
          ) : (
            <p className="texto-secundario">Nenhuma imagem enviada até agora.</p>
          )}

          <div className="rubrica-card-acoes">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={ocupado}
              onChange={(evento) => onSelecionar(evento.target.files?.[0])}
            />
            {assinaturaUrl && (
              <button
                type="button"
                className="botao-link"
                disabled={ocupado}
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
          {enviar.isSuccess && !enviar.isPending && (
            <p className="sucesso">Assinatura salva. As próximas declarações já saem com ela.</p>
          )}
          {enviar.isError && <p className="erro">{mensagemErro(enviar.error)}</p>}
          {remover.isError && <p className="erro">{mensagemErro(remover.error)}</p>}
        </div>
      )}
    </section>
  );
}
