import { useSeo } from '../lib/seo';

export function ContatoPage() {
  useSeo({
    title: 'Contato — Sindicato PRF',
    description: 'Fale com o Sindicato dos Policiais Rodoviários Federais.',
  });

  return (
    <main className="secao">
      <div className="secao-inner conteudo-texto">
        <h1>Contato</h1>
        <p>Fale com a nossa equipe pelos canais abaixo.</p>

        <div className="contato-grid">
          <div className="contato-card">
            <h3>Email</h3>
            <p>
              <a href="mailto:contato@sindprf.local">contato@sindprf.local</a>
            </p>
          </div>
          <div className="contato-card">
            <h3>Telefone</h3>
            <p>
              <a href="tel:+558530000000">(85) 3000-0000</a>
            </p>
          </div>
          <div className="contato-card">
            <h3>Sede</h3>
            <p>Av. Principal, 1000 — Fortaleza/CE</p>
            <p>Segunda a sexta, das 8h às 17h</p>
          </div>
        </div>
      </div>
    </main>
  );
}
