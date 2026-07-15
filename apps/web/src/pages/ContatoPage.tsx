import { marca, telefonePrincipalTel } from '../lib/marca';
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
              <a href={`mailto:${marca.contato.email}`}>{marca.contato.email}</a>
            </p>
          </div>
          <div className="contato-card">
            <h3>Telefone</h3>
            <p>
              <a href={`tel:${telefonePrincipalTel()}`}>{marca.contato.telefones[0]}</a>
            </p>
            {marca.contato.telefones.slice(1).map((telefone) => (
              <p key={telefone}>{telefone}</p>
            ))}
          </div>
          <div className="contato-card">
            <h3>Sede</h3>
            <p>{marca.sede.endereco}</p>
            <p>CEP {marca.sede.cep}</p>
            <p>Segunda a sexta, das 8h às 17h</p>
          </div>
        </div>
      </div>
    </main>
  );
}
