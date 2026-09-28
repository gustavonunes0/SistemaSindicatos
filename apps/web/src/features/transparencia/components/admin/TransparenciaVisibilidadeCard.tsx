import { isAxiosError } from 'axios';
import { useMarca } from '../../../../lib/marca';
import { useDefinirTransparenciaFinanceira } from '../../hooks';
import { transparenciaFinanceiraAtiva } from '../../visibilidade';

function mensagemErro(erro: unknown): string {
  if (isAxiosError(erro)) {
    const data = erro.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return 'Não foi possível atualizar a visibilidade. Tente novamente.';
}

export function TransparenciaVisibilidadeCard() {
  const marca = useMarca();
  const ativa = transparenciaFinanceiraAtiva(marca);
  const salvar = useDefinirTransparenciaFinanceira();
  const novoEstado = salvar.variables?.ativo;

  return (
    <section className="tp-admin-card" aria-labelledby="tp-visibilidade-titulo">
      <div className="tp-admin-card-texto">
        <h2 id="tp-visibilidade-titulo">Portal de transparência</h2>
        <p>
          {ativa
            ? 'Os filiados veem receitas e despesas agregadas dos balancetes na área logada.'
            : 'O portal está oculto para os filiados. Extratos e faturas nunca são exibidos lá.'}
        </p>
        <span className={`badge ${ativa ? 'badge-aprovado' : 'badge-inativo'}`}>
          {ativa ? 'Visível para filiados' : 'Oculto para filiados'}
        </span>
      </div>
      <div className="tp-admin-card-acoes">
        <button
          type="button"
          className={ativa ? 'botao-secundario' : 'botao-primario'}
          disabled={salvar.isPending}
          onClick={() => salvar.mutate({ ativo: !ativa })}
        >
          {salvar.isPending
            ? 'Salvando…'
            : ativa
              ? 'Desabilitar para filiados'
              : 'Habilitar para filiados'}
        </button>
        {salvar.isError && <p className="erro">{mensagemErro(salvar.error)}</p>}
        {salvar.isSuccess && !salvar.isPending && typeof novoEstado === 'boolean' && (
          <p className="sucesso">
            {novoEstado
              ? 'Portal liberado para os filiados.'
              : 'Portal ocultado para os filiados.'}
          </p>
        )}
      </div>
    </section>
  );
}
