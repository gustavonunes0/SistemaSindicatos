import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useMarca } from '../../../../lib/marca';
import { CATEGORIAS_CONVENIO, linkDaCategoria, type CategoriaConvenio } from '../../categorias';
import { useDefinirLinkCategoria } from '../../hooks';

function mensagemErro(erro: unknown): string {
  if (isAxiosError(erro)) {
    const data = erro.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return 'Erro ao salvar o link. Tente novamente.';
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

  const configurados = CATEGORIAS_CONVENIO.filter((categoria) =>
    linkDaCategoria(marca, categoria),
  ).length;

  // O rascunho vence o valor salvo para não apagar o que o admin está digitando
  // quando o branding é recarregado depois de outro salvamento.
  const valorDe = (categoria: CategoriaConvenio) =>
    rascunhos[categoria] ?? linkDaCategoria(marca, categoria) ?? '';

  const onSalvar = (categoria: CategoriaConvenio) => {
    const url = valorDe(categoria).trim();
    setSalva(null);
    salvar.mutate(
      { categoria, url: url === '' ? null : url },
      { onSuccess: () => setSalva(categoria) },
    );
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
            Aparece como “Ver portfólio completo” logo abaixo dos parceiros da categoria, na
            página pública de convênios.
          </p>
        </div>
        <button
          type="button"
          className="botao-secundario"
          onClick={() => setAberto((atual) => !atual)}
        >
          {aberto ? 'Fechar' : 'Configurar'}
        </button>
      </header>

      {aberto && (
        <div className="links-categorias-corpo">
          {CATEGORIAS_CONVENIO.map((categoria) => (
            <form
              key={categoria}
              className="links-categorias-linha"
              onSubmit={(evento) => {
                evento.preventDefault();
                onSalvar(categoria);
              }}
            >
              <label className="campo">
                <span className="campo-rotulo">{categoria}</span>
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={valorDe(categoria)}
                  disabled={salvar.isPending}
                  onChange={(evento) =>
                    setRascunhos((atual) => ({ ...atual, [categoria]: evento.target.value }))
                  }
                />
              </label>
              <button type="submit" className="botao-secundario" disabled={salvar.isPending}>
                Salvar
              </button>
            </form>
          ))}

          <p className="texto-secundario">
            Para tirar o link de uma categoria, apague o endereço e salve.
          </p>

          {salvar.isPending && <p>Salvando link…</p>}
          {salva && !salvar.isPending && !salvar.isError && (
            <p className="sucesso">Link de {salva} atualizado.</p>
          )}
          {salvar.isError && <p className="erro">{mensagemErro(salvar.error)}</p>}
        </div>
      )}
    </section>
  );
}
