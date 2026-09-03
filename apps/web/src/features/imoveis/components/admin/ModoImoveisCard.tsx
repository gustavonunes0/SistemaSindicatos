import { IMOVEIS_MODO_ROTULO, type ImoveisModo } from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useMarca } from '../../../../lib/marca';
import { useDefinirImoveisConfig } from '../../hooks';
import { modoImoveis } from '../../modo';

function mensagemErro(erro: unknown): string {
  if (isAxiosError(erro)) {
    const data = erro.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return 'Erro ao salvar a configuração. Tente novamente.';
}

const OPCOES: { valor: ImoveisModo; titulo: string; texto: string }[] = [
  {
    valor: 'LINK',
    titulo: IMOVEIS_MODO_ROTULO.LINK,
    texto: 'O filiado vê só o botão para o sistema externo de reserva e o regulamento.',
  },
  {
    valor: 'VITRINE',
    titulo: IMOVEIS_MODO_ROTULO.VITRINE,
    texto: 'Mostra fotos, valores e calendário dos apartamentos cadastrados. A reserva continua no link externo.',
  },
];

/**
 * Escolhe se a área do filiado mostra a vitrine de imóveis ou só o link
 * externo — fica aqui porque é quem monta o cadastro de apartamentos.
 */
export function ModoImoveisCard() {
  const marca = useMarca();
  const salvar = useDefinirImoveisConfig();
  const modoAtual = modoImoveis(marca);
  const [modo, setModo] = useState<ImoveisModo>(modoAtual);
  const [url, setUrl] = useState(marca.reservaApartamentosUrl ?? '');
  const [ok, setOk] = useState(false);

  const pendente =
    modo !== modoAtual || url.trim() !== (marca.reservaApartamentosUrl ?? '').trim();

  const onSalvar = () => {
    setOk(false);
    salvar.mutate(
      {
        modo,
        reservaUrl: url.trim() === '' ? null : url.trim(),
      },
      { onSuccess: () => setOk(true) },
    );
  };

  return (
    <section className="imoveis-modo-card">
      <header className="imoveis-modo-topo">
        <div>
          <h2>
            O que o filiado vê{' '}
            <span className={`badge ${modoAtual === 'VITRINE' ? 'badge-rubrica-ok' : 'badge-rubrica-falta'}`}>
              {IMOVEIS_MODO_ROTULO[modoAtual]}
            </span>
          </h2>
          <p className="texto-secundario">
            Escolha se a área Apartamentos mostra a vitrine cadastrada aqui ou apenas o link do
            sistema oficial de reservas.
          </p>
        </div>
      </header>

      <div className="imoveis-modo-opcoes" role="radiogroup" aria-label="Modo de exibição">
        {OPCOES.map((opcao) => {
          const selecionada = modo === opcao.valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              aria-checked={selecionada}
              className={`imoveis-modo-opcao${selecionada ? ' imoveis-modo-opcao--ativa' : ''}`}
              disabled={salvar.isPending}
              onClick={() => {
                setOk(false);
                setModo(opcao.valor);
              }}
            >
              <strong>{opcao.titulo}</strong>
              <span>{opcao.texto}</span>
            </button>
          );
        })}
      </div>

      <label className="campo imoveis-modo-campo">
        <span className="campo-rotulo">Link do sistema de reserva</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://abre.ai/…"
          value={url}
          disabled={salvar.isPending}
          onChange={(evento) => {
            setOk(false);
            setUrl(evento.target.value);
          }}
        />
      </label>

      <div className="imoveis-modo-acoes">
        <button
          type="button"
          className="botao-primario"
          disabled={salvar.isPending || !pendente}
          onClick={onSalvar}
        >
          {salvar.isPending ? 'Salvando…' : 'Salvar configuração'}
        </button>
        {ok && !salvar.isPending && !salvar.isError && (
          <p className="sucesso">Configuração atualizada. Os filiados já veem o novo modo.</p>
        )}
        {salvar.isError && <p className="erro">{mensagemErro(salvar.error)}</p>}
      </div>
    </section>
  );
}
