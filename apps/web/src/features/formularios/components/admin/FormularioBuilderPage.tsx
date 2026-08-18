import {
  campoTemOpcoes,
  criarFormularioSchema,
  PUBLICO_FORMULARIO_ROTULO,
  STATUS_FORMULARIO_ROTULO,
  TIPO_CAMPO_ROTULO,
  tipoCampoFormularioSchema,
  type CampoFormulario,
  type PublicoFormulario,
  type StatusFormulario,
  type TipoCampoFormulario,
} from '@sindprf/types';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import {
  useAtualizarFormulario,
  useCriarFormulario,
  useFormularioAdmin,
} from '../../hooks';

const TIPOS = tipoCampoFormularioSchema.options;

/** `crypto.randomUUID` só existe em contexto seguro; o id só precisa ser único
 *  dentro do formulário, então um fallback simples resolve. */
function novoId(): string {
  return crypto.randomUUID?.() ?? `campo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function novoCampo(): CampoFormulario {
  return {
    id: novoId(),
    rotulo: '',
    tipo: 'TEXTO_CURTO',
    ajuda: null,
    obrigatorio: false,
    opcoes: [],
  };
}

/** Troca dois itens de lugar; devolve a mesma lista se o destino não existe. */
function mover<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length) {
    return lista;
  }
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item!);
  return copia;
}

export function FormularioBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editando = id !== undefined && id !== 'novo';

  const { data: existente, isLoading } = useFormularioAdmin(editando ? id : undefined);
  const criar = useCriarFormulario();
  const atualizar = useAtualizarFormulario();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [publico, setPublico] = useState<PublicoFormulario>('FILIADOS');
  const [status, setStatus] = useState<StatusFormulario>('RASCUNHO');
  const [campos, setCampos] = useState<CampoFormulario[]>([]);
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    if (!existente) return;
    setTitulo(existente.titulo);
    setDescricao(existente.descricao ?? '');
    setPublico(existente.publico);
    setStatus(existente.status);
    setCampos(existente.campos);
  }, [existente]);

  const alterarCampo = (indice: number, mudanca: Partial<CampoFormulario>) => {
    setCampos((atual) =>
      atual.map((campo, posicao) => (posicao === indice ? { ...campo, ...mudanca } : campo)),
    );
  };

  const alterarTipo = (indice: number, tipo: TipoCampoFormulario) => {
    // Sair de um tipo de escolha descarta as opções: elas não fazem sentido
    // em texto livre e ficariam sujando o registro.
    alterarCampo(indice, {
      tipo,
      opcoes: campoTemOpcoes(tipo) ? (campos[indice]?.opcoes ?? []) : [],
    });
  };

  const alterarOpcao = (indice: number, posicao: number, valor: string) => {
    const opcoes = [...(campos[indice]?.opcoes ?? [])];
    opcoes[posicao] = valor;
    alterarCampo(indice, { opcoes });
  };

  const salvando = criar.isPending || atualizar.isPending;

  const onSalvar = () => {
    const resultado = criarFormularioSchema.safeParse({
      titulo,
      descricao: descricao.trim() || null,
      campos,
      publico,
      status,
    });

    if (!resultado.success) {
      setErros(resultado.error.issues.map((problema) => problema.message));
      return;
    }
    setErros([]);

    const aoTerminar = { onSuccess: () => navigate('/admin/formularios') };
    if (editando && id) {
      atualizar.mutate({ id, ...resultado.data }, aoTerminar);
    } else {
      criar.mutate(resultado.data, aoTerminar);
    }
  };

  if (editando && isLoading) {
    return (
      <AreaLayout tipo="admin" titulo="Formulário">
        <EstadoCarregando mensagem="Carregando formulário…" />
      </AreaLayout>
    );
  }

  return (
    <AreaLayout
      tipo="admin"
      titulo={editando ? 'Editar formulário' : 'Novo formulário'}
      descricao="Monte as perguntas e defina quem pode responder."
      acoes={
        <>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => navigate('/admin/formularios')}
          >
            Voltar
          </button>
          <button
            type="button"
            className="botao-primario"
            onClick={onSalvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="form-area">
        <label>
          Título
          <input
            type="text"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder="Pesquisa de satisfação"
          />
        </label>

        <label>
          Descrição (opcional)
          <textarea
            rows={3}
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            placeholder="Explique o objetivo do formulário para quem for responder."
          />
        </label>

        <div className="form-grid">
          <label>
            Quem pode responder
            <select
              value={publico}
              onChange={(evento) => setPublico(evento.target.value as PublicoFormulario)}
            >
              {Object.entries(PUBLICO_FORMULARIO_ROTULO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Situação
            <select
              value={status}
              onChange={(evento) => setStatus(evento.target.value as StatusFormulario)}
            >
              {Object.entries(STATUS_FORMULARIO_ROTULO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="construtor-perguntas">
        <div className="construtor-cabecalho">
          <h2>Perguntas</h2>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => setCampos((atual) => [...atual, novoCampo()])}
          >
            Adicionar pergunta
          </button>
        </div>

        {campos.length === 0 && (
          <p className="texto-secundario">
            Nenhuma pergunta ainda. Adicione a primeira para começar.
          </p>
        )}

        {campos.map((campo, indice) => (
          <article key={campo.id} className="construtor-campo">
            <header className="construtor-campo-topo">
              <span className="construtor-campo-numero">{indice + 1}</span>
              <div className="construtor-campo-acoes">
                <button
                  type="button"
                  className="botao-link-acao"
                  onClick={() => setCampos((atual) => mover(atual, indice, indice - 1))}
                  disabled={indice === 0}
                  aria-label="Mover para cima"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="botao-link-acao"
                  onClick={() => setCampos((atual) => mover(atual, indice, indice + 1))}
                  disabled={indice === campos.length - 1}
                  aria-label="Mover para baixo"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="botao-perigo"
                  onClick={() =>
                    setCampos((atual) => atual.filter((_, posicao) => posicao !== indice))
                  }
                >
                  Remover
                </button>
              </div>
            </header>

            <label>
              Pergunta
              <input
                type="text"
                value={campo.rotulo}
                onChange={(evento) => alterarCampo(indice, { rotulo: evento.target.value })}
                placeholder="Qual o seu grau de satisfação?"
              />
            </label>

            <div className="form-grid">
              <label>
                Tipo de resposta
                <select
                  value={campo.tipo}
                  onChange={(evento) =>
                    alterarTipo(indice, evento.target.value as TipoCampoFormulario)
                  }
                >
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {TIPO_CAMPO_ROTULO[tipo]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Texto de ajuda (opcional)
                <input
                  type="text"
                  value={campo.ajuda ?? ''}
                  onChange={(evento) =>
                    alterarCampo(indice, { ajuda: evento.target.value || null })
                  }
                />
              </label>
            </div>

            {campoTemOpcoes(campo.tipo) && (
              <div className="construtor-opcoes">
                <span className="campo-rotulo">Opções</span>
                {campo.opcoes.map((opcao, posicao) => (
                  <div key={posicao} className="construtor-opcao">
                    <input
                      type="text"
                      value={opcao}
                      onChange={(evento) => alterarOpcao(indice, posicao, evento.target.value)}
                      placeholder={`Opção ${posicao + 1}`}
                    />
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() =>
                        alterarCampo(indice, {
                          opcoes: campo.opcoes.filter((_, atual) => atual !== posicao),
                        })
                      }
                      aria-label={`Remover opção ${posicao + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="botao-link"
                  onClick={() => alterarCampo(indice, { opcoes: [...campo.opcoes, ''] })}
                >
                  Adicionar opção
                </button>
              </div>
            )}

            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={campo.obrigatorio}
                onChange={(evento) =>
                  alterarCampo(indice, { obrigatorio: evento.target.checked })
                }
              />
              Resposta obrigatória
            </label>
          </article>
        ))}
      </div>

      {erros.length > 0 && (
        <div className="erro">
          <p>Corrija antes de salvar:</p>
          <ul>
            {erros.map((mensagem, indice) => (
              <li key={indice}>{mensagem}</li>
            ))}
          </ul>
        </div>
      )}

      {(criar.isError || atualizar.isError) && (
        <p className="erro">Erro ao salvar o formulário. Tente novamente.</p>
      )}
    </AreaLayout>
  );
}
