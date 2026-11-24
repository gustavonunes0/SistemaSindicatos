import {
  diasHospedagem,
  estimarCustoHospedagem,
  REGRAS_HOSPEDAGEM,
} from '@sindprf/types';
import { useMemo, useState } from 'react';
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
  const [acompanhantes, setAcompanhantes] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const regras = REGRAS_HOSPEDAGEM.FILIADO_SINDPRF;

  const estimativa = useMemo(() => {
    if (!inicio || !fim) return null;
    const dias = diasHospedagem(new Date(`${inicio}T00:00:00`), new Date(`${fim}T00:00:00`));
    return { dias, ...estimarCustoHospedagem('FILIADO_SINDPRF', dias) };
  }, [inicio, fim]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);

    if (!inicio || !fim) {
      setErro('Informe as datas de entrada e saída.');
      return;
    }
    if (!acompanhantes.trim()) {
      setErro('Indique os acompanhantes ou escreva “somente eu”.');
      return;
    }

    const inicioDesejado = new Date(`${inicio}T00:00:00`);
    const fimDesejado = new Date(`${fim}T00:00:00`);
    const dias = diasHospedagem(inicioDesejado, fimDesejado);

    if (dias < 1) {
      setErro('A data de saída deve ser posterior à de entrada.');
      return;
    }
    if (dias > regras.maxContinuoDias) {
      setErro(`Pelo regulamento, a hospedagem contínua máxima é de ${regras.maxContinuoDias} dias.`);
      return;
    }

    criar.mutate(
      {
        imovelId,
        inicioDesejado,
        fimDesejado,
        acompanhantes: acompanhantes.trim(),
        mensagemInicial: mensagem.trim() || undefined,
      },
      {
        onSuccess: (solicitacao) => {
          navigate(`/afiliado/solicitacoes/${solicitacao.id}`);
        },
        onError: () => {
          setErro(
            'Não foi possível abrir a solicitação. Verifique as datas, a disponibilidade e o limite de dias.',
          );
        },
      },
    );
  };

  return (
    <section className="solicitar-aluguel">
      <p className="eyebrow">Reserva</p>
      <h2 className="imovel-secao-titulo">Solicitar hospedagem</h2>
      <p className="solicitar-aluguel-intro">
        Escolha o período para <strong>{imovelTitulo}</strong>. A reserva só vale após confirmação
        da Presidência (análise da Diretoria Social).
      </p>

      <form className="form-stack solicitar-aluguel-form" onSubmit={onSubmit}>
        <div className="form-grid form-grid--datas">
          <label>
            Entrada
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              required
            />
          </label>
          <label>
            Saída
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} required />
          </label>
        </div>

        {estimativa && (
          <p
            className={`solicitar-aluguel-estimativa${
              estimativa.dias > regras.maxContinuoDias ? ' erro' : ''
            }`}
            role="status"
          >
            {estimativa.detalhe}
            {estimativa.dias > 0 && estimativa.dias <= regras.maxContinuoDias && (
              <span>
                {' '}
                · intervalo mínimo entre estadias: {regras.intervaloMinimoDias} dias · limite anual:{' '}
                {regras.limiteAnualDias} dias
              </span>
            )}
          </p>
        )}

        <label>
          Acompanhantes
          <textarea
            rows={2}
            value={acompanhantes}
            onChange={(e) => setAcompanhantes(e.target.value)}
            placeholder="Nome completo de cada acompanhante — ou “somente eu”"
            required
          />
          <small className="texto-secundario">
            Obrigatório pelo regulamento. Você responde por todos os convidados.
          </small>
        </label>

        <label>
          Observações (opcional)
          <textarea
            rows={3}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Ex.: chegada após as 18h, necessidade de vaga no estacionamento…"
          />
        </label>

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}

        <div className="form-acoes">
          <button type="submit" className="botao-primario" disabled={criar.isPending}>
            {criar.isPending ? 'Enviando…' : 'Enviar solicitação'}
          </button>
          <Link to="/afiliado/solicitacoes" className="botao-secundario">
            Minhas reservas
          </Link>
        </div>
      </form>
    </section>
  );
}
