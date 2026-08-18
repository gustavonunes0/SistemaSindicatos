import {
  MODELO_DECLARACAO_ROTULO,
  STATUS_DECLARACAO_ROTULO,
  type DeclaracaoEmitida,
  type StatusDeclaracao,
} from '@sindprf/types';
import { useRef, useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData, formatarDataHora } from '../../../../lib/datas';
import {
  useBaixarDeclaracao,
  useDeclaracoesAdmin,
  useEnviarDeclaracaoAssinada,
  useRemoverDeclaracaoAssinada,
} from '../../hooks';
import { RubricaCard } from './RubricaCard';

type Filtro = StatusDeclaracao | 'TODOS';

const ABAS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'PENDENTE', rotulo: 'Aguardando assinatura' },
  { valor: 'ASSINADA', rotulo: 'Assinadas' },
  { valor: 'TODOS', rotulo: 'Todas' },
];

export function DeclaracoesAdminPage() {
  const [filtro, setFiltro] = useState<Filtro>('PENDENTE');
  const [busca, setBusca] = useState('');
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const {
    data: declaracoes,
    isLoading,
    isError,
  } = useDeclaracoesAdmin({
    status: filtro === 'TODOS' ? undefined : filtro,
    busca: busca.trim() || undefined,
  });

  const baixar = useBaixarDeclaracao();
  const enviarAssinada = useEnviarDeclaracaoAssinada();
  const removerAssinada = useRemoverDeclaracaoAssinada();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const onEscolherArquivo = (id: string) => {
    setEnviandoId(id);
    inputArquivoRef.current?.click();
  };

  const onArquivoSelecionado = (arquivo: File | undefined) => {
    if (arquivo && enviandoId) {
      enviarAssinada.mutate({ id: enviandoId, arquivo });
    }
    setEnviandoId(null);
    if (inputArquivoRef.current) {
      inputArquivoRef.current.value = '';
    }
  };

  const onRemoverAssinatura = (declaracao: DeclaracaoEmitida) => {
    pedirConfirmacao({
      titulo: 'Remover assinatura?',
      descricao: `A declaração ${declaracao.codigo} volta para a fila de pendentes e o arquivo assinado deixa de ficar disponível ao filiado.`,
      confirmarRotulo: 'Remover',
      onConfirmar: () => removerAssinada.mutateAsync(declaracao.id),
    });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Declarações"
      descricao="Baixe a declaração emitida, assine e devolva o PDF assinado ao filiado."
    >
      <RubricaCard />

      <div className="declaracoes-filtros">
        <div className="abas">
          {ABAS.map((aba) => (
            <button
              key={aba.valor}
              type="button"
              className={`aba ${filtro === aba.valor ? 'aba--ativa' : ''}`}
              onClick={() => setFiltro(aba.valor)}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar por nome, código ou convênio"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </div>

      {/* Um input só para todas as linhas: a linha alvo fica em enviandoId. */}
      <input
        ref={inputArquivoRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(evento) => onArquivoSelecionado(evento.target.files?.[0])}
      />

      {enviarAssinada.isPending && <p>Enviando declaração assinada…</p>}
      {enviarAssinada.isError && (
        <p className="erro">Erro ao enviar o PDF assinado. Tente novamente.</p>
      )}

      {isLoading && !declaracoes && <EstadoCarregando />}
      {isError && !declaracoes && <p className="erro">Erro ao carregar as declarações.</p>}

      {declaracoes && declaracoes.length === 0 && (
        <div className="estado-vazio">
          <p>
            {filtro === 'PENDENTE'
              ? 'Nenhuma declaração aguardando assinatura.'
              : 'Nenhuma declaração encontrada.'}
          </p>
        </div>
      )}

      {declaracoes && declaracoes.length > 0 && (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Filiado</th>
                <th>Convênio</th>
                <th>Modelo</th>
                <th>Código</th>
                <th>Emitida em</th>
                <th>Situação</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {declaracoes.map((declaracao) => (
                <tr key={declaracao.id}>
                  <td>
                    {declaracao.afiliadoNome}
                    {declaracao.afiliadoMatricula && (
                      <span className="texto-secundario"> · {declaracao.afiliadoMatricula}</span>
                    )}
                    {declaracao.dependenteNome && (
                      <div className="texto-secundario">
                        Dependente: {declaracao.dependenteNome}
                      </div>
                    )}
                  </td>
                  <td>
                    {declaracao.convenioNome}
                    {declaracao.periodoInicio && declaracao.periodoFim && (
                      <div className="texto-secundario">
                        {formatarData(declaracao.periodoInicio)} a{' '}
                        {formatarData(declaracao.periodoFim)}
                      </div>
                    )}
                  </td>
                  <td>{MODELO_DECLARACAO_ROTULO[declaracao.modelo]}</td>
                  <td>
                    <code>{declaracao.codigo}</code>
                  </td>
                  <td>{formatarData(declaracao.emitidaEm)}</td>
                  <td>
                    <span
                      className={`badge badge-declaracao-${declaracao.status.toLowerCase()}`}
                    >
                      {STATUS_DECLARACAO_ROTULO[declaracao.status]}
                    </span>
                    {declaracao.assinadaEm && (
                      <div className="texto-secundario">
                        {formatarDataHora(declaracao.assinadaEm)}
                      </div>
                    )}
                  </td>
                  <td className="tabela-acoes">
                    <button
                      type="button"
                      className="botao-link-acao"
                      disabled={!declaracao.temArquivoOriginal || baixar.isPending}
                      title={
                        declaracao.temArquivoOriginal
                          ? 'Baixar para imprimir e assinar'
                          : 'Emitida antes da guarda de arquivos; peça ao filiado para emitir de novo'
                      }
                      onClick={() =>
                        baixar.mutate({ id: declaracao.id, versao: 'original' })
                      }
                    >
                      Baixar para assinar
                    </button>
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() => onEscolherArquivo(declaracao.id)}
                    >
                      {declaracao.temArquivoAssinado ? 'Substituir assinada' : 'Enviar assinada'}
                    </button>
                    {declaracao.temArquivoAssinado && (
                      <>
                        <button
                          type="button"
                          className="botao-link-acao"
                          onClick={() =>
                            baixar.mutate({ id: declaracao.id, versao: 'assinada' })
                          }
                        >
                          Ver assinada
                        </button>
                        <button
                          type="button"
                          className="botao-perigo"
                          disabled={removerAssinada.isPending}
                          onClick={() => onRemoverAssinatura(declaracao)}
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalConfirmacao}
    </AreaLayout>
  );
}
