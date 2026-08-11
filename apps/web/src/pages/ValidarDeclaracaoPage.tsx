import { useQuery } from '@tanstack/react-query';
import type { DeclaracaoValidacaoResposta } from '@sindprf/types';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';
import { api } from '../lib/http';
import { useMarca } from '../lib/marca';
import { useSeo } from '../lib/seo';

const dataFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Fortaleza',
});

function formatarData(valor: Date | string | null | undefined): string {
  if (!valor) return '—';
  return dataFmt.format(new Date(valor));
}

export function ValidarDeclaracaoPage() {
  const { codigo = '' } = useParams<{ codigo: string }>();
  const marca = useMarca();

  useSeo({
    title: `Validar declaração — ${marca.nome}`,
    description: `Confirme a autenticidade de uma declaração emitida pelo ${marca.nomeCompleto}.`,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['declaracao-validacao', codigo],
    enabled: Boolean(codigo),
    queryFn: async () => {
      const { data: body } = await api.get<DeclaracaoValidacaoResposta>(
        `/convenios/declaracoes/${encodeURIComponent(codigo)}`,
      );
      return body;
    },
    retry: false,
  });

  const motivoRede = isAxiosError(error)
    ? 'Não foi possível consultar o servidor. Tente novamente.'
    : 'Falha ao validar a declaração.';

  return (
    <main className="validar-page">
      <div className="validar-shell">
        <header className="validar-cabecalho">
          <Logo variante="header" />
          <p className="validar-eyebrow">Validação institucional</p>
          <h1>Declaração</h1>
          <p className="validar-sub">
            Conferência de autenticidade emitida pelo {marca.nome}.
          </p>
        </header>

        {isLoading ? <p className="validar-estado">Consultando código…</p> : null}

        {isError ? (
          <section className="validar-painel validar-painel--erro" role="alert">
            <p className="validar-selo">Não validada</p>
            <h2>Não foi possível validar</h2>
            <p>{motivoRede}</p>
          </section>
        ) : null}

        {data && !data.valida ? (
          <section className="validar-painel validar-painel--erro" role="alert">
            <p className="validar-selo">Não encontrada</p>
            <h2>Declaração inválida</h2>
            <p>{data.motivo}</p>
            <p className="validar-codigo">Código informado: {codigo.toUpperCase()}</p>
          </section>
        ) : null}

        {data?.valida ? (
          <section
            className={`validar-painel ${data.afiliadoAtivo ? 'validar-painel--ok' : 'validar-painel--alerta'}`}
            aria-live="polite"
          >
            <p className="validar-selo">
              {data.afiliadoAtivo ? 'Documento autêntico' : 'Emitida — filiação inativa'}
            </p>
            <h2>{data.modeloRotulo}</h2>
            <p className="validar-destino">Destino: {data.destino}</p>

            {!data.afiliadoAtivo ? (
              <p className="validar-alerta">
                A declaração foi emitida por este sindicato, porém o associado não está com
                filiação ativa no momento da consulta.
              </p>
            ) : null}

            <dl className="validar-dados">
              <div>
                <dt>Associado</dt>
                <dd>{data.afiliadoNome}</dd>
              </div>
              <div>
                <dt>CPF</dt>
                <dd>{data.afiliadoCpfMascarado}</dd>
              </div>
              <div>
                <dt>Convênio</dt>
                <dd>{data.convenioNome}</dd>
              </div>
              <div>
                <dt>Emitida em</dt>
                <dd>{formatarData(data.emitidaEm)}</dd>
              </div>
              {data.dependenteNome ? (
                <div>
                  <dt>Dependente</dt>
                  <dd>
                    {data.dependenteNome}
                    {data.dependenteCpfMascarado ? ` · ${data.dependenteCpfMascarado}` : ''}
                  </dd>
                </div>
              ) : null}
              {data.periodoInicio && data.periodoFim ? (
                <div>
                  <dt>Período</dt>
                  <dd>
                    {formatarData(data.periodoInicio)} a {formatarData(data.periodoFim)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Código</dt>
                <dd className="validar-codigo-valor">{data.codigo}</dd>
              </div>
              <div>
                <dt>Emitente</dt>
                <dd>{data.sindicatoNome}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        <p className="validar-voltar">
          <Link to="/">Voltar ao site</Link>
        </p>
      </div>
    </main>
  );
}
