import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMarca } from '../../../../lib/marca';
import { CATEGORIAS_CONVENIO, linkDaCategoria, type CategoriaConvenio } from '../../categorias';
import { IlustracaoCategoria, META_CATEGORIA } from '../../categorias-ui';
import { useDefinirLinkCategoria } from '../../hooks';

function mensagemErro(erro: unknown): string {
  if (isAxiosError(erro)) {
    const data = erro.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return 'Erro ao salvar o link. Tente novamente.';
}

function resumirUrl(url: string): string {
  try {
    const endereco = new URL(url);
    const caminho = endereco.pathname === '/' ? '' : endereco.pathname;
    return `${endereco.hostname}${caminho}`;
  } catch {
    return url;
  }
}

/**
 * Link que fecha a listagem pública de cada categoria — em geral o portfólio
 * completo. Fica nesta tela porque é aqui que a vitrine de convênios é montada.
 */
export function LinksCategoriasCard() {
  const marca = useMarca();
  const salvar = useDefinirLinkCategoria();
  const [aberto, setAberto] = useState(false);
  const [rascunhos, setRascunhos] = useState<Partial<Record<CategoriaConvenio, string>>>({});
  const [salva, setSalva] = useState<CategoriaConvenio | null>(null);
  const [erroEm, setErroEm] = useState<CategoriaConvenio | null>(null);

  const configurados = CATEGORIAS_CONVENIO.filter((categoria) =>
    linkDaCategoria(marca, categoria),
  ).length;

  const valorDe = (categoria: CategoriaConvenio) =>
    rascunhos[categoria] ?? linkDaCategoria(marca, categoria) ?? '';

  const linkSalvo = (categoria: CategoriaConvenio) => linkDaCategoria(marca, categoria);

  const alterado = (categoria: CategoriaConvenio) => {
    const salvo = linkSalvo(categoria) ?? '';
    return valorDe(categoria).trim() !== salvo.trim();
  };

  const onSalvar = (categoria: CategoriaConvenio) => {
    const url = valorDe(categoria).trim();
    setSalva(null);
    setErroEm(null);
    salvar.mutate(
      { categoria, url: url === '' ? null : url },
      {
        onSuccess: () => {
          setSalva(categoria);
          setRascunhos((atual) => {
            const proximo = { ...atual };
            delete proximo[categoria];
            return proximo;
          });
        },
        onError: () => setErroEm(categoria),
      },
    );
  };

  const onLimpar = (categoria: CategoriaConvenio) => {
    setSalva(null);
    setErroEm(null);

    if (linkSalvo(categoria)) {
      salvar.mutate(
        { categoria, url: null },
        {
          onSuccess: () => {
            setSalva(categoria);
            setRascunhos((atual) => {
              const proximo = { ...atual };
              delete proximo[categoria];
              return proximo;
            });
          },
          onError: () => setErroEm(categoria),
        },
      );
      return;
    }

    setRascunhos((atual) => ({ ...atual, [categoria]: '' }));
  };

  return (
    <section className="links-categorias-card">
      <header className="links-categorias-topo">
        <div>
          <h2>
            Link ao fim de cada categoria{' '}
            <span
              className={`badge ${configurados > 0 ? 'badge-rubrica-ok' : 'badge-rubrica-falta'}`}
            >
              {configurados > 0
                ? `${configurados} de ${CATEGORIAS_CONVENIO.length}`
                : 'Nenhum cadastrado'}
            </span>
          </h2>
          <p className="texto-secundario">
            Botão “Ver portfólio completo” exibido abaixo dos parceiros na{' '}
            <Link to="/convenios" className="botao-link">
              página pública de convênios
            </Link>
            . Use o PDF ou site com a lista completa da área.
          </p>
        </div>
        <button
          type="button"
          className="botao-secundario"
          aria-expanded={aberto}
          onClick={() => setAberto((atual) => !atual)}
        >
          {aberto ? 'Fechar' : configurados === 0 ? 'Configurar links' : 'Editar links'}
        </button>
      </header>

      {aberto && (
        <div className="links-categorias-corpo">
          <p className="links-categorias-dica">
            Cadastre um endereço por categoria. Quem visita o site vê o botão só nas áreas com
            link salvo.
          </p>

          <ul className="links-categorias-grade">
            {CATEGORIAS_CONVENIO.map((categoria) => {
              const meta = META_CATEGORIA[categoria];
              const salvo = linkSalvo(categoria);
              const valor = valorDe(categoria);
              const pendente = alterado(categoria);
              const salvandoEsta = salvar.isPending && salvar.variables?.categoria === categoria;

              return (
                <li
                  key={categoria}
                  className={`links-categoria-item tom-${meta.tom}${salvo ? ' links-categoria-item--ok' : ''}${pendente ? ' links-categoria-item--pendente' : ''}`}
                >
                  <div className="links-categoria-item-topo">
                    <span className="links-categoria-item-ilustracao" aria-hidden="true">
                      <IlustracaoCategoria categoria={categoria} />
                    </span>
                    <div className="links-categoria-item-identidade">
                      <h3>{categoria}</h3>
                      <p>{meta.subtitulo}</p>
                      <span
                        className={`badge ${salvo ? 'badge-rubrica-ok' : 'badge-rubrica-falta'}`}
                      >
                        {salvo ? 'Link ativo' : 'Sem link'}
                      </span>
                    </div>
                  </div>

                  <form
                    className="links-categoria-item-form"
                    onSubmit={(evento) => {
                      evento.preventDefault();
                      onSalvar(categoria);
                    }}
                  >
                    <label className="campo links-categoria-item-campo">
                      <span className="campo-rotulo">Endereço do portfólio</span>
                      <input
                        type="url"
                        inputMode="url"
                        placeholder="https://exemplo.com/portfolio-educacao.pdf"
                        value={valor}
                        disabled={salvar.isPending}
                        onChange={(evento) => {
                          setSalva(null);
                          setErroEm(null);
                          setRascunhos((atual) => ({
                            ...atual,
                            [categoria]: evento.target.value,
                          }));
                        }}
                      />
                    </label>

                    <div className="links-categoria-item-acoes">
                      <button
                        type="submit"
                        className="botao-primario"
                        disabled={salvar.isPending || !pendente}
                      >
                        {salvandoEsta ? 'Salvando…' : 'Salvar'}
                      </button>
                      {salvo && (
                        <a
                          className="botao-secundario"
                          href={salvo}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir link
                        </a>
                      )}
                      {(salvo || valor.trim() !== '') && (
                        <button
                          type="button"
                          className="botao-link"
                          disabled={salvar.isPending}
                          onClick={() => onLimpar(categoria)}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </form>

                  {salvo && !pendente && (
                    <div className="links-categoria-item-previa">
                      <span className="links-categoria-item-previa-rotulo">
                        Prévia na página pública
                      </span>
                      <span className="convenios-public-link-categoria links-categoria-item-previa-botao">
                        Ver portfólio completo de {categoria}
                        <span aria-hidden="true">↗</span>
                      </span>
                      <span className="links-categoria-item-url">{resumirUrl(salvo)}</span>
                    </div>
                  )}

                  {salva === categoria && !salvar.isPending && !salvar.isError && (
                    <p className="sucesso links-categoria-item-feedback">
                      Link de {categoria} atualizado.
                    </p>
                  )}
                  {erroEm === categoria && salvar.isError && (
                    <p className="erro links-categoria-item-feedback">
                      {mensagemErro(salvar.error)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
