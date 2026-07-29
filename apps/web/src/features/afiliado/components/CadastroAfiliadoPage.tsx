import { Link } from 'react-router-dom';
import { Logo } from '../../../components/ui/Logo';
import { filiacao } from '../../../lib/filiacao';
import { marca } from '../../../lib/marca';
import { useSeo } from '../../../lib/seo';

const etapas = [
  {
    titulo: 'Baixe os formulários',
    texto: 'Faça o download dos PDFs de filiação disponíveis nesta página.',
  },
  {
    titulo: 'Reúna os documentos',
    texto: 'Separe as cópias listadas no checklist (identidade, endereço, contracheque e foto).',
  },
  {
    titulo: 'Compareça à secretaria',
    texto: `Leve tudo preenchido à sede: ${filiacao.sede.endereco}.`,
  },
  {
    titulo: 'Aguarde a liberação',
    texto: 'Após a análise e a averbação, o sindicato libera seu acesso ao sistema.',
  },
] as const;

export function CadastroAfiliadoPage() {
  useSeo({
    title: `Filiação | ${marca.nome}`,
    description: `Como se filiar ao ${marca.nomeCompleto}: formulários e documentos para entregar na secretaria.`,
  });

  return (
    <main className="cadastro-page">
      <aside className="cadastro-painel" aria-label="Sobre a afiliação">
        <div className="cadastro-painel-topo">
          <Link to="/" className="cadastro-voltar">
            ← Voltar ao site
          </Link>
          <Logo variante="auth" />
          <p className="cadastro-marca">{marca.nome}</p>
          <h1 className="cadastro-painel-titulo">Afiliação ao sindicato</h1>
          <p className="cadastro-painel-texto">
            A filiação é presencial. Baixe os formulários, reúna as cópias e compareça à secretaria
            do {marca.nome} para concluir o processo.
          </p>
        </div>

        <ol className="cadastro-etapas">
          {etapas.map((etapa, indice) => (
            <li key={etapa.titulo} className="cadastro-etapa">
              <span className="cadastro-etapa-indice" aria-hidden="true">
                {indice + 1}
              </span>
              <div>
                <strong>{etapa.titulo}</strong>
                <p>{etapa.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>

      <section className="cadastro-conteudo">
        <header className="cadastro-cabecalho">
          <p className="eyebrow">Filiação presencial</p>
          <h2>Como se filiar</h2>
          <p>
            Não há cadastro online. Siga o passo a passo, baixe os formulários e leve a documentação
            à sede.
          </p>
        </header>

        <section className="cadastro-docs cadastro-docs--conteudo" aria-label="Documentos necessários">
          <h2 className="cadastro-docs-titulo">Documentos necessários</h2>
          <p className="cadastro-docs-intro">
            Baixe os formulários e compareça à secretaria ({filiacao.sede.endereco}) com as cópias
            abaixo. CEP {filiacao.sede.cep}.
          </p>

          <div className="cadastro-docs-colunas">
            <div>
              <p className="cadastro-docs-subtitulo">Formulários para baixar</p>
              <ul className="cadastro-docs-lista">
                {filiacao.formularios.map((item) => (
                  <li key={item.url}>
                    <a href={item.url} download>
                      {item.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="cadastro-docs-subtitulo">Levar na secretaria</p>
              <ul className="cadastro-docs-lista">
                {filiacao.documentos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="cadastro-docs-contato">
            Dúvidas: {filiacao.contato.telefones.join(' / ')} ·{' '}
            <a href={`mailto:${filiacao.contato.email}`}>{filiacao.contato.email}</a>
          </p>
        </section>

        <div className="cadastro-sucesso-acoes cadastro-filiacao-acoes">
          <Link to="/contato" className="botao-primario">
            Fale conosco
          </Link>
          <Link to="/login" className="botao-secundario">
            Já sou afiliado — entrar
          </Link>
        </div>
      </section>
    </main>
  );
}
