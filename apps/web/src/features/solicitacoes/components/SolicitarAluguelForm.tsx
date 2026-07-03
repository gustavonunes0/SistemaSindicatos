import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCriarSolicitacao } from '../hooks';

type SolicitarAluguelFormProps = {
  imovelId: string;
  imovelTitulo: string;
};

export function SolicitarAluguelForm({ imovelId, imovelTitulo }: SolicitarAluguelFormProps) {
  const navigate = useNavigate();
  const criar = useCriarSolicitacao();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);

    if (!inicio || !fim) {
      setErro('Informe as datas de entrada e saída.');
      return;
    }

    criar.mutate(
      {
        imovelId,
        inicioDesejado: new Date(`${inicio}T00:00:00`),
        fimDesejado: new Date(`${fim}T23:59:59`),
        mensagemInicial: mensagem.trim() || undefined,
      },
      {
        onSuccess: (solicitacao) => {
          navigate(`/afiliado/solicitacoes/${solicitacao.id}`);
        },
        onError: () => {
          setErro(
            'Não foi possível abrir a solicitação. Verifique as datas e se o período está disponível.',
          );
        },
      },
    );
  };

  return (
    <section className="solicitar-aluguel">
      <h2 className="imovel-secao-titulo">Solicitar locação</h2>
      <p className="area-subtitulo">
        Informe o período desejado para {imovelTitulo}. O sindicato responderá por mensagem.
      </p>

      <form className="form-grid solicitar-aluguel-form" onSubmit={onSubmit}>
        <label>
          Entrada
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </label>
        <label>
          Saída
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} required />
        </label>
        <label className="form-linha-completa">
          Mensagem (opcional)
          <textarea
            rows={3}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Ex.: viajo com família, preciso de 2 quartos…"
          />
        </label>

        {erro && <p className="erro form-linha-completa">{erro}</p>}

        <div className="form-acoes form-linha-completa">
          <button type="submit" className="botao-primario" disabled={criar.isPending}>
            {criar.isPending ? 'Enviando…' : 'Abrir solicitação'}
          </button>
          <Link to="/afiliado/solicitacoes" className="botao-link">
            Minhas solicitações
          </Link>
        </div>
      </form>
    </section>
  );
}
