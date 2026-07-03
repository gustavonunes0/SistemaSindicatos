import { useEffect, useRef, useState } from 'react';
import { formatarData } from '../../../lib/datas';
import { useMe } from '../../auth/hooks';
import { useEnviarMensagem, useMensagensSolicitacao } from '../hooks';

type ChatSolicitacaoProps = {
  solicitacaoId: string;
  encerrada: boolean;
};

export function ChatSolicitacao({ solicitacaoId, encerrada }: ChatSolicitacaoProps) {
  const { data: mensagens, isLoading } = useMensagensSolicitacao(solicitacaoId, !encerrada);
  const { data: me } = useMe();
  const enviar = useEnviarMensagem(solicitacaoId);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const fimListaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimListaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens?.length]);

  const onEnviar = (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    const limpo = texto.trim();
    if (!limpo) return;

    enviar.mutate(
      { texto: limpo },
      {
        onSuccess: () => setTexto(''),
        onError: () => setErro('Não foi possível enviar a mensagem.'),
      },
    );
  };

  return (
    <div className="chat-solicitacao">
      <div className="chat-mensagens" aria-live="polite">
        {isLoading && <p className="estado-carregando">Carregando mensagens…</p>}
        {mensagens?.map((msg) => {
          const minha = msg.autorId === me?.user.id;
          return (
            <div key={msg.id} className={minha ? 'chat-bolha minha' : 'chat-bolha outra'}>
              <span className="chat-bolha-autor">{msg.autorNome}</span>
              <p className="chat-bolha-texto">{msg.texto}</p>
              <time className="chat-bolha-hora" dateTime={msg.criadoEm.toISOString()}>
                {formatarData(msg.criadoEm)}
              </time>
            </div>
          );
        })}
        <div ref={fimListaRef} />
      </div>

      {encerrada ? (
        <p className="chat-encerrada">
          Esta solicitação foi encerrada. Não é possível enviar novas mensagens.
        </p>
      ) : (
        <form className="chat-form" onSubmit={onEnviar}>
          <label className="visually-hidden" htmlFor={`msg-${solicitacaoId}`}>
            Nova mensagem
          </label>
          <textarea
            id={`msg-${solicitacaoId}`}
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva sua mensagem…"
            disabled={enviar.isPending}
          />
          {erro && <p className="erro">{erro}</p>}
          <button type="submit" className="botao-primario" disabled={enviar.isPending || !texto.trim()}>
            {enviar.isPending ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      )}
    </div>
  );
}
