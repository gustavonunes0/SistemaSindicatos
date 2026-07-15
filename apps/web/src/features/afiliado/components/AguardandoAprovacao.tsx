import { Link } from 'react-router-dom';

type AguardandoAprovacaoProps = {
  recurso: string;
};

export function AguardandoAprovacao({ recurso }: AguardandoAprovacaoProps) {
  return (
    <div className="estado-vazio afiliado-bloqueio">
      <p className="afiliado-bloqueio-titulo">Afiliação em análise</p>
      <p>
        {recurso} ficam disponíveis após a secretaria aprovar seu cadastro. Enquanto isso, você
        pode acompanhar o status na visão geral.
      </p>
      <p>
        <Link to="/afiliado" className="botao-secundario">
          Voltar à visão geral
        </Link>
      </p>
    </div>
  );
}
