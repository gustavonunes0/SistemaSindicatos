import {
  diasHospedagem,
  estimarCustoHospedagem,
  PERFIL_HOSPEDAGEM_PEDIDO_ROTULO,
  REGRAS_HOSPEDAGEM,
  type PerfilHospedagem,
} from '@sindprf/types';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCriarSolicitacaoPublica } from '../hooks';

type PerfilExterno = Extract<PerfilHospedagem, 'FILIADO_OUTRO' | 'NAO_FILIADO'>;

type SolicitarHospedagemPublicaFormProps = {
  imovelId: string;
  imovelTitulo: string;
};

export function SolicitarHospedagemPublicaForm({
  imovelId,
  imovelTitulo,
}: SolicitarHospedagemPublicaFormProps) {
  const criar = useCriarSolicitacaoPublica();
  const [perfil, setPerfil] = useState<PerfilExterno>('FILIADO_OUTRO');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [sindicatoOrigem, setSindicatoOrigem] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [acompanhantes, setAcompanhantes] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  const regras = REGRAS_HOSPEDAGEM[perfil];

  const estimativa = useMemo(() => {
    if (!inicio || !fim) return null;
    const dias = diasHospedagem(new Date(`${inicio}T00:00:00`), new Date(`${fim}T00:00:00`));
    return { dias, ...estimarCustoHospedagem(perfil, dias) };
  }, [inicio, fim, perfil]);

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
    if (perfil === 'FILIADO_OUTRO' && !sindicatoOrigem.trim()) {
      setErro('Informe o sindicato de origem.');
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
        perfilHospedagem: perfil,
        nome: nome.trim(),
        cpf,
        email: email.trim(),
        telefone: telefone.trim(),
        sindicatoOrigem: perfil === 'FILIADO_OUTRO' ? sindicatoOrigem.trim() : undefined,
        acompanhantes: acompanhantes.trim(),
        observacoes: observacoes.trim() || undefined,
        inicioDesejado,
        fimDesejado,
      },
      {
        onSuccess: (solicitacao) => {
          setProtocolo(solicitacao.id);
        },
        onError: () => {
          setErro(
            'Não foi possível enviar o pedido. Verifique os dados, as datas e a disponibilidade.',
          );
        },
      },
    );
  };

  if (protocolo) {
    return (
      <section className="solicitar-aluguel solicitar-aluguel--sucesso" aria-live="polite">
        <p className="eyebrow">Pedido enviado</p>
        <h2 className="imovel-secao-titulo">Recebemos sua solicitação</h2>
        <p>
          A Presidência analisará o pedido para <strong>{imovelTitulo}</strong>. Guarde o protocolo{' '}
          <code>{protocolo}</code> e aguarde contato no e-mail informado.
        </p>
        <p className="texto-secundario">
          Se você é filiado(a) do SINDPRF-CE, use a{' '}
          <Link to="/login">área do filiado</Link> para acompanhar reservas com chat.
        </p>
        <Link to="/apartamentos" className="botao-secundario">
          Voltar aos apartamentos
        </Link>
      </section>
    );
  }

  return (
    <section className="solicitar-aluguel">
      <p className="eyebrow">Reserva sem conta</p>
      <h2 className="imovel-secao-titulo">Solicitar hospedagem</h2>
      <p className="solicitar-aluguel-intro">
        Para filiados de outros estados e PRFs não filiados. A reserva só vale após confirmação da
        Presidência. Filiados do SINDPRF-CE devem{' '}
        <Link to="/login">entrar na área do filiado</Link>.
      </p>

      <form className="form-stack solicitar-aluguel-form" onSubmit={onSubmit}>
        <fieldset className="form-fieldset">
          <legend>Seu perfil</legend>
          <div className="form-opcoes">
            {(['FILIADO_OUTRO', 'NAO_FILIADO'] as const).map((valor) => (
              <label key={valor} className="form-opcao">
                <input
                  type="radio"
                  name="perfil"
                  value={valor}
                  checked={perfil === valor}
                  onChange={() => setPerfil(valor)}
                />
                {PERFIL_HOSPEDAGEM_PEDIDO_ROTULO[valor]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-grid">
          <label>
            Nome completo
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label>
            CPF
            <input
              type="text"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              autoComplete="off"
              required
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Telefone
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              autoComplete="tel"
              required
            />
          </label>
        </div>

        {perfil === 'FILIADO_OUTRO' && (
          <label>
            Sindicato de origem
            <input
              type="text"
              value={sindicatoOrigem}
              onChange={(e) => setSindicatoOrigem(e.target.value)}
              placeholder="Ex.: SINDPRF-SP"
              required
            />
          </label>
        )}

        <div className="form-grid">
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
        </label>

        <label>
          Observações (opcional)
          <textarea
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex.: chegada após as 18h…"
          />
        </label>

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className="botao-primario" disabled={criar.isPending}>
          {criar.isPending ? 'Enviando…' : 'Enviar pedido'}
        </button>
      </form>
    </section>
  );
}
