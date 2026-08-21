import { useState } from 'react';
import { digitosTelefoneBrasil, urlTel, urlWhatsApp } from '../../lib/marca';
import { Modal } from './Modal';

type TelefoneContatoProps = {
  telefone: string;
  /** Classes extras no botão que abre o seletor (ex.: estilo de link do rodapé). */
  className?: string;
};

/**
 * Telefone clicável: ao tocar, pergunta se a pessoa quer ligar ou abrir o WhatsApp.
 * Os dois caminhos usam o mesmo número — só muda o app que recebe o contato.
 */
export function TelefoneContato({ telefone, className }: TelefoneContatoProps) {
  const [aberto, setAberto] = useState(false);
  const digitos = digitosTelefoneBrasil(telefone);

  if (!digitos) {
    return <span className={className}>{telefone}</span>;
  }

  return (
    <>
      <button
        type="button"
        className={className ? `telefone-contato ${className}` : 'telefone-contato'}
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
      >
        {telefone}
      </button>

      <Modal
        aberto={aberto}
        titulo="Como prefere contactar?"
        descricao={telefone}
        onFechar={() => setAberto(false)}
        tamanho="md"
      >
        <div className="telefone-contato-opcoes">
          <a
            className="telefone-contato-opcao telefone-contato-opcao--ligar"
            href={urlTel(telefone)}
            onClick={() => setAberto(false)}
          >
            <span className="telefone-contato-opcao-rotulo">Ligar</span>
            <span className="telefone-contato-opcao-apoio">Abrir o app de telefone</span>
          </a>
          <a
            className="telefone-contato-opcao telefone-contato-opcao--whatsapp"
            href={urlWhatsApp(telefone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAberto(false)}
          >
            <span className="telefone-contato-opcao-rotulo">WhatsApp</span>
            <span className="telefone-contato-opcao-apoio">Abrir conversa no WhatsApp</span>
          </a>
        </div>
      </Modal>
    </>
  );
}
