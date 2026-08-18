import {
  PUBLICO_FORMULARIO_ROTULO,
  STATUS_FORMULARIO_ROTULO,
  type FormularioListagem,
} from '@sindprf/types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import { useFormulariosAdmin, useRemoverFormulario } from '../../hooks';

function linkPublico(slug: string): string {
  return `${window.location.origin}/formularios/${slug}`;
}

export function FormulariosAdminPage() {
  const { data: formularios, isLoading, isError } = useFormulariosAdmin();
  const remover = useRemoverFormulario();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState<string | null>(null);

  const onCopiarLink = async (formulario: FormularioListagem) => {
    await navigator.clipboard.writeText(linkPublico(formulario.slug));
    setCopiado(formulario.id);
    window.setTimeout(() => setCopiado(null), 2000);
  };

  const onRemover = (formulario: FormularioListagem) => {
    pedirConfirmacao({
      titulo: 'Excluir formulário?',
      descricao:
        formulario.totalRespostas > 0
          ? `“${formulario.titulo}” tem ${formulario.totalRespostas} resposta(s). Tudo será removido permanentemente.`
          : `O formulário “${formulario.titulo}” será removido permanentemente.`,
      confirmarRotulo: 'Excluir',
      onConfirmar: () => remover.mutateAsync(formulario.id),
    });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Formulários"
      descricao="Crie formulários, compartilhe o link e acompanhe as respostas."
      acoes={
        <button
          type="button"
          className="botao-primario"
          onClick={() => navigate('/admin/formularios/novo')}
        >
          Novo formulário
        </button>
      }
    >
      {isLoading && !formularios && <EstadoCarregando />}
      {isError && !formularios && <p className="erro">Erro ao carregar os formulários.</p>}

      {formularios && formularios.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum formulário criado ainda.</p>
          <button
            type="button"
            className="botao-primario"
            onClick={() => navigate('/admin/formularios/novo')}
          >
            Criar o primeiro
          </button>
        </div>
      )}

      {formularios && formularios.length > 0 && (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Situação</th>
                <th>Quem responde</th>
                <th>Perguntas</th>
                <th>Respostas</th>
                <th>Criado em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {formularios.map((formulario) => (
                <tr key={formulario.id}>
                  <td>{formulario.titulo}</td>
                  <td>
                    <span
                      className={`badge badge-formulario-${formulario.status.toLowerCase()}`}
                    >
                      {STATUS_FORMULARIO_ROTULO[formulario.status]}
                    </span>
                  </td>
                  <td>{PUBLICO_FORMULARIO_ROTULO[formulario.publico]}</td>
                  <td>{formulario.totalCampos}</td>
                  <td>{formulario.totalRespostas}</td>
                  <td>{formatarData(formulario.createdAt)}</td>
                  <td className="tabela-acoes">
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() => navigate(`/admin/formularios/${formulario.id}/respostas`)}
                    >
                      Respostas
                    </button>
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() => navigate(`/admin/formularios/${formulario.id}`)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() => void onCopiarLink(formulario)}
                      disabled={formulario.status === 'RASCUNHO'}
                      title={
                        formulario.status === 'RASCUNHO'
                          ? 'Publique o formulário para gerar o link'
                          : linkPublico(formulario.slug)
                      }
                    >
                      {copiado === formulario.id ? 'Link copiado!' : 'Copiar link'}
                    </button>
                    <button
                      type="button"
                      className="botao-perigo"
                      disabled={remover.isPending}
                      onClick={() => onRemover(formulario)}
                    >
                      Excluir
                    </button>
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
