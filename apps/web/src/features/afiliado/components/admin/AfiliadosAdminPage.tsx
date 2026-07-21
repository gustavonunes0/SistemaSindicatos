import type { StatusAfiliado } from '@sindprf/types';
import { useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import type { AfiliadoAdmin } from '../../api';
import { useAfiliadosAdmin, useAtualizarStatusAfiliado } from '../../hooks';
import { AfiliadoSenhaModal } from './AfiliadoSenhaModal';

const filtros: { valor: StatusAfiliado | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'PENDENTE', rotulo: 'Pendentes' },
  { valor: 'APROVADO', rotulo: 'Aprovados' },
  { valor: 'INATIVO', rotulo: 'Inativos' },
];

const rotuloStatus: Record<StatusAfiliado, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  INATIVO: 'Inativo',
};

export function AfiliadosAdminPage() {
  const [filtro, setFiltro] = useState<StatusAfiliado | ''>('');
  const [afiliadoSenha, setAfiliadoSenha] = useState<Pick<AfiliadoAdmin, 'id' | 'nome'> | null>(
    null,
  );
  const { data: afiliados, isLoading, isError } = useAfiliadosAdmin(filtro || undefined);
  const atualizarStatus = useAtualizarStatusAfiliado();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const onMudarStatus = (
    afiliado: AfiliadoAdmin,
    status: StatusAfiliado,
    opcoes: { titulo: string; descricao: string; confirmarRotulo: string; tom?: 'perigo' | 'primario' },
  ) => {
    pedirConfirmacao({
      titulo: opcoes.titulo,
      descricao: opcoes.descricao,
      confirmarRotulo: opcoes.confirmarRotulo,
      tom: opcoes.tom,
      onConfirmar: () => atualizarStatus.mutateAsync({ id: afiliado.id, status }),
    });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Afiliados"
      descricao="Aprove solicitações de cadastro e gerencie a situação da afiliação."
    >
      <div className="filtros-linha">
        {filtros.map((item) => (
          <button
            key={item.rotulo}
            type="button"
            className={
              filtro === item.valor ? 'botao-filtro botao-filtro--ativo' : 'botao-filtro'
            }
            onClick={() => setFiltro(item.valor)}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {isLoading && <EstadoCarregando mensagem="Carregando afiliados…" />}
      {isError && <p className="erro">Erro ao carregar afiliados.</p>}

      {afiliados && afiliados.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum afiliado neste filtro.</p>
        </div>
      )}

      {afiliados && afiliados.length > 0 && (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Matrícula</th>
                <th>Status</th>
                <th>Desde</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {afiliados.map((afiliado) => (
                <tr key={afiliado.id}>
                  <td>{afiliado.nome}</td>
                  <td>{afiliado.user.email}</td>
                  <td>{afiliado.matricula}</td>
                  <td>
                    <span className={`badge badge-${afiliado.status.toLowerCase()}`}>
                      {rotuloStatus[afiliado.status]}
                    </span>
                  </td>
                  <td>{formatarData(afiliado.createdAt)}</td>
                  <td className="tabela-acoes">
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() => setAfiliadoSenha({ id: afiliado.id, nome: afiliado.nome })}
                    >
                      Senha
                    </button>
                    {afiliado.status !== 'APROVADO' && (
                      <button
                        type="button"
                        className="botao-link-acao"
                        disabled={atualizarStatus.isPending}
                        onClick={() =>
                          onMudarStatus(afiliado, 'APROVADO', {
                            titulo: 'Aprovar afiliado?',
                            descricao: `${afiliado.nome} passará a ter acesso à área do afiliado.`,
                            confirmarRotulo: 'Aprovar',
                            tom: 'primario',
                          })
                        }
                      >
                        Aprovar
                      </button>
                    )}
                    {afiliado.status !== 'INATIVO' && (
                      <button
                        type="button"
                        className="botao-perigo"
                        disabled={atualizarStatus.isPending}
                        onClick={() =>
                          onMudarStatus(afiliado, 'INATIVO', {
                            titulo: 'Inativar afiliado?',
                            descricao: `${afiliado.nome} perderá o acesso à área do afiliado.`,
                            confirmarRotulo: 'Inativar',
                          })
                        }
                      >
                        Inativar
                      </button>
                    )}
                    {afiliado.status === 'INATIVO' && (
                      <button
                        type="button"
                        className="botao-link-acao"
                        disabled={atualizarStatus.isPending}
                        onClick={() =>
                          onMudarStatus(afiliado, 'PENDENTE', {
                            titulo: 'Reabrir afiliação?',
                            descricao: `${afiliado.nome} voltará para o status pendente.`,
                            confirmarRotulo: 'Reabrir',
                            tom: 'primario',
                          })
                        }
                      >
                        Reabrir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AfiliadoSenhaModal afiliado={afiliadoSenha} onFechar={() => setAfiliadoSenha(null)} />
      {modalConfirmacao}
    </AreaLayout>
  );
}
