import { marca } from '../lib/marca';
import { useSeo } from '../lib/seo';

export function ContatoPage() {
  useSeo({
    title: `Contato — ${marca.nome}`,
    description: `Fale com o ${marca.nomeCompleto}.`,
  });

  return (
    <main className="secao">
      <div className="secao-inner conteudo-texto">
        <span className="eyebrow">Fale conosco</span>
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
