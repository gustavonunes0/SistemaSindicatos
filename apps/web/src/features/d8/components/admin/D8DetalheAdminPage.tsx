import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { FiltroLinhasD8, TipoD8 } from '@sindprf/types';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../../lib/datas';
import { useImportacaoD8, useLinhasD8 } from '../../hooks';

const rotuloTipo: Record<TipoD8, string> = {
  SERVIDOR: 'Servidor',
  PENSIONISTA: 'Pensionista',
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarCpf(cpf: string): string {
  if (cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function D8DetalheAdminPage() {
  const { id } = useParams<{ id: string }>();
  const [filtro, setFiltro] = useState<FiltroLinhasD8>('todos');
  const { data: detalhe, isLoading, isError } = useImportacaoD8(id);
  const { data: linhas, isLoading: carregandoLinhas } = useLinhasD8(id, filtro);

  if (isLoading) {
    return (
      <AreaLayout tipo="admin" titulo="Análise D8" descricao="Carregando competência…">
        <EstadoCarregando mensagem="Carregando importação…" />
      </AreaLayout>
    );
  }

  if (isError || !detalhe) {
    return (
      <AreaLayout tipo="admin" titulo="Análise D8" descricao="Importação não encontrada.">
        <p className="erro">Não foi possível carregar esta importação.</p>
        <Link to="/admin/d8" className="botao-secundario">
          Voltar
        </Link>
      </AreaLayout>
    );
  }

  return (
    <AreaLayout
      tipo="admin"
      titulo={`D8 ${String(detalhe.competenciaMes).padStart(2, '0')}/${detalhe.competenciaAno}`}
      descricao={`${rotuloTipo[detalhe.tipo]} · ${detalhe.arquivoNome}`}
      acoes={
        <Link to="/admin/d8" className="botao-secundario">
          Voltar
        </Link>
      }
    >
      <section className="d8-admin-metricas" aria-label="Resumo da competência">
        <div>
          <span className="d8-admin-metrica-rotulo">Linhas</span>
          <strong>{detalhe.resumo.totalLinhas}</strong>
        </div>
        <div>
          <span className="d8-admin-metrica-rotulo">Arrecadação</span>
          <strong>{formatarMoeda(detalhe.resumo.totalValor)}</strong>
        </div>
        <div>
          <span className="d8-admin-metrica-rotulo">Vinculados</span>
          <strong>{detalhe.resumo.vinculados}</strong>
        </div>
        <div>
          <span className="d8-admin-metrica-rotulo">Sem cadastro</span>
          <strong>{detalhe.resumo.semCadastro}</strong>
        </div>
        <div>
          <span className="d8-admin-metrica-rotulo">Sem desconto no mês</span>
          <strong>{detalhe.resumo.semDesconto}</strong>
        </div>
        <div>
          <span className="d8-admin-metrica-rotulo">Importado em</span>
          <strong>{formatarDataHora(detalhe.createdAt)}</strong>
        </div>
      </section>

      {detalhe.semDesconto.length > 0 && (
        <section className="d8-admin-bloco">
          <h2 className="d8-admin-secao-titulo">Afiliados sem desconto nesta competência</h2>
          <p className="d8-admin-secao-texto">
            Aprovados ou inativos que não aparecem em nenhum D8 (servidor/pensionista) do mês.
          </p>
          <div className="d8-admin-tabela-wrap">
            <table className="d8-admin-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Matrícula</th>
                  <th>CPF</th>
                  <th>Status</th>
                  <th>Categoria</th>
                </tr>
              </thead>
              <tbody>
                {detalhe.semDesconto.map((afiliado) => (
                  <tr key={afiliado.id}>
                    <td>{afiliado.nome}</td>
                    <td>{afiliado.matricula}</td>
                    <td>{formatarCpf(afiliado.cpf)}</td>
                    <td>{afiliado.status}</td>
                    <td>{afiliado.categoria ? rotuloTipo[afiliado.categoria] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="d8-admin-bloco">
        <div className="d8-admin-bloco-topo">
          <h2 className="d8-admin-secao-titulo">Linhas do extrato</h2>
          <label>
            Filtro
            <select
              value={filtro}
              onChange={(event) => setFiltro(event.target.value as FiltroLinhasD8)}
            >
              <option value="todos">Todas</option>
              <option value="semCadastro">Sem cadastro</option>
            </select>
          </label>
        </div>

        {carregandoLinhas && <EstadoCarregando mensagem="Carregando linhas…" />}

        {linhas && (
          <div className="d8-admin-tabela-wrap">
            <table className="d8-admin-tabela">
              <thead>
                <tr>
                  <th>Seq</th>
                  <th>Matrícula</th>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={linha.id}>
                    <td>{linha.sequencia}</td>
                    <td>{linha.matricula}</td>
                    <td>{linha.nome}</td>
                    <td>{formatarCpf(linha.cpf)}</td>
                    <td>{linha.descricao}</td>
                    <td>{formatarMoeda(linha.valor)}</td>
                    <td>{linha.afiliadoId ? 'Vinculado' : 'Sem cadastro'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AreaLayout>
  );
}
