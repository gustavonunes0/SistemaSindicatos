import type { CampoFormulario, FormularioPublico, ValorEnviado } from '@sindprf/types';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMarca } from '../../../lib/marca';
import { useSeo } from '../../../lib/seo';
import {
  useEnviarResposta,
  useFormularioPublico,
  useUploadArquivoFormulario,
} from '../hooks';

type Arquivo = { url: string; nome: string };
type Valores = Record<string, string | string[] | Arquivo | null>;

const MENSAGEM_BLOQUEIO: Record<FormularioPublico['motivo'], string> = {
  OK: '',
  PRECISA_LOGIN: 'Este formulário é exclusivo para filiados. Entre na sua conta para responder.',
  PRECISA_APROVACAO:
    'Seu cadastro ainda está em análise. Assim que for aprovado você poderá responder.',
  ENCERRADO: 'Este formulário está encerrado e não recebe mais respostas.',
  JA_RESPONDEU: 'Você já respondeu este formulário. Obrigado pela participação!',
};

function valorInicial(campo: CampoFormulario): string | string[] | null {
  return campo.tipo === 'MULTIPLA_ESCOLHA' ? [] : null;
}

/** Traduz o estado do formulário no formato que a API espera. */
function paraEnvio(valores: Valores): ValorEnviado[] {
  return Object.entries(valores).map(([campoId, valor]) => {
    if (Array.isArray(valor)) {
      return { campoId, selecionados: valor };
    }
    if (valor && typeof valor === 'object') {
      return { campoId, arquivo: valor };
    }
    return { campoId, texto: valor };
  });
}

export function FormularioPublicoPage() {
  const { slug = '' } = useParams();
  const marca = useMarca();
  const { data: formulario, isLoading, isError } = useFormularioPublico(slug);
  const enviar = useEnviarResposta(slug);
  const upload = useUploadArquivoFormulario(slug);

  const [valores, setValores] = useState<Valores>({});
  const [enviado, setEnviado] = useState(false);

  useSeo({
    title: formulario ? `${formulario.titulo} — ${marca.nome}` : `Formulário — ${marca.nome}`,
    description: formulario?.descricao?.slice(0, 160) ?? `Formulário do ${marca.nomeCompleto}.`,
  });

  const definir = (campoId: string, valor: Valores[string]) => {
    setValores((atual) => ({ ...atual, [campoId]: valor }));
  };

  const alternarOpcao = (campo: CampoFormulario, opcao: string, marcado: boolean) => {
    const atuais = (valores[campo.id] as string[] | undefined) ?? [];
    definir(campo.id, marcado ? [...atuais, opcao] : atuais.filter((item) => item !== opcao));
  };

  const onEnviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!formulario) return;

    const completos: Valores = { ...valores };
    for (const campo of formulario.campos) {
      if (!(campo.id in completos)) {
        completos[campo.id] = valorInicial(campo);
      }
    }

    enviar.mutate({ valores: paraEnvio(completos) }, { onSuccess: () => setEnviado(true) });
  };

  if (isLoading && !formulario) {
    return (
      <main className="formulario-publico-page">
        <div className="secao-inner">
          <EstadoCarregando mensagem="Carregando formulário…" />
        </div>
      </main>
    );
  }

  if (isError || !formulario) {
    return (
      <main className="formulario-publico-page">
        <div className="secao-inner">
          <div className="estado-vazio">
            <p>Este formulário não está disponível ou foi removido.</p>
            <Link to="/" className="botao-primario">
              Voltar ao início
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (enviado) {
    return (
      <main className="formulario-publico-page">
        <div className="secao-inner formulario-publico-corpo">
          <div className="formulario-aviso formulario-aviso--sucesso">
            <h1>Resposta enviada</h1>
            <p>Obrigado por responder “{formulario.titulo}”.</p>
            <Link to="/" className="botao-primario">
              Voltar ao início
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="formulario-publico-page">
      <div className="secao-inner formulario-publico-corpo">
        <header className="formulario-publico-cabecalho">
          <h1>{formulario.titulo}</h1>
          {formulario.descricao && <p>{formulario.descricao}</p>}
        </header>

        {!formulario.podeResponder ? (
          <div className="formulario-aviso">
            <p>{MENSAGEM_BLOQUEIO[formulario.motivo]}</p>
            {formulario.motivo === 'PRECISA_LOGIN' && (
              <Link to="/login" className="botao-primario">
                Entrar
              </Link>
            )}
          </div>
        ) : (
          <form className="form-area formulario-publico-form" onSubmit={onEnviar} noValidate>
            {formulario.campos.map((campo) => (
              <CampoResposta
                key={campo.id}
                campo={campo}
                valor={valores[campo.id] ?? valorInicial(campo)}
                onChange={(valor) => definir(campo.id, valor)}
                onArquivo={(arquivo) =>
                  upload.mutate(arquivo, {
                    onSuccess: (enviado) => definir(campo.id, enviado),
                  })
                }
                onAlternarOpcao={(opcao, marcado) => alternarOpcao(campo, opcao, marcado)}
                enviandoArquivo={upload.isPending}
              />
            ))}

            {enviar.isError && (
              <p className="erro">
                {mensagemDeErro(enviar.error)}
              </p>
            )}

            <div className="form-acoes">
              <button type="submit" className="botao-primario" disabled={enviar.isPending}>
                {enviar.isPending ? 'Enviando…' : 'Enviar resposta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

/** A API explica o que faltou (campo obrigatório, opção inválida); mostre isso. */
function mensagemDeErro(erro: unknown): string {
  const resposta = (erro as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message;
  if (typeof resposta === 'string') {
    return resposta;
  }
  if (Array.isArray(resposta) && typeof resposta[0] === 'string') {
    return resposta[0];
  }
  return 'Não foi possível enviar a resposta. Tente novamente.';
}

type CampoRespostaProps = {
  campo: CampoFormulario;
  valor: string | string[] | Arquivo | null;
  onChange: (valor: string | null) => void;
  onArquivo: (arquivo: File) => void;
  onAlternarOpcao: (opcao: string, marcado: boolean) => void;
  enviandoArquivo: boolean;
};

function CampoResposta({
  campo,
  valor,
  onChange,
  onArquivo,
  onAlternarOpcao,
  enviandoArquivo,
}: CampoRespostaProps) {
  const rotulo = (
    <span className="campo-rotulo">
      {campo.rotulo}
      {campo.obrigatorio && <span aria-hidden="true"> *</span>}
    </span>
  );
  const ajuda = campo.ajuda && <span className="campo-ajuda">{campo.ajuda}</span>;
  const texto = typeof valor === 'string' ? valor : '';

  switch (campo.tipo) {
    case 'TEXTO_LONGO':
      return (
        <label className="campo">
          {rotulo}
          {ajuda}
          <textarea rows={4} value={texto} onChange={(e) => onChange(e.target.value)} />
        </label>
      );

    case 'NUMERO':
      return (
        <label className="campo">
          {rotulo}
          {ajuda}
          <input type="number" value={texto} onChange={(e) => onChange(e.target.value)} />
        </label>
      );

    case 'DATA':
      return (
        <label className="campo">
          {rotulo}
          {ajuda}
          <input type="date" value={texto} onChange={(e) => onChange(e.target.value)} />
        </label>
      );

    case 'LISTA':
      return (
        <label className="campo">
          {rotulo}
          {ajuda}
          <select value={texto} onChange={(e) => onChange(e.target.value || null)}>
            <option value="">Selecione…</option>
            {campo.opcoes.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        </label>
      );

    case 'ESCOLHA_UNICA':
      return (
        <fieldset className="campo campo-opcoes">
          <legend>
            {rotulo}
            {ajuda}
          </legend>
          {campo.opcoes.map((opcao) => (
            <label key={opcao} className="campo-checkbox">
              <input
                type="radio"
                name={campo.id}
                value={opcao}
                checked={texto === opcao}
                onChange={() => onChange(opcao)}
              />
              {opcao}
            </label>
          ))}
        </fieldset>
      );

    case 'MULTIPLA_ESCOLHA': {
      const marcados = Array.isArray(valor) ? valor : [];
      return (
        <fieldset className="campo campo-opcoes">
          <legend>
            {rotulo}
            {ajuda}
          </legend>
          {campo.opcoes.map((opcao) => (
            <label key={opcao} className="campo-checkbox">
              <input
                type="checkbox"
                checked={marcados.includes(opcao)}
                onChange={(e) => onAlternarOpcao(opcao, e.target.checked)}
              />
              {opcao}
            </label>
          ))}
        </fieldset>
      );
    }

    case 'ARQUIVO': {
      const arquivo = valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : null;
      return (
        <div className="campo">
          {rotulo}
          {ajuda}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const selecionado = e.target.files?.[0];
              if (selecionado) onArquivo(selecionado);
            }}
          />
          {enviandoArquivo && <span>Enviando arquivo…</span>}
          {arquivo && <span className="campo-ajuda">Anexado: {arquivo.nome}</span>}
        </div>
      );
    }

    default:
      return (
        <label className="campo">
          {rotulo}
          {ajuda}
          <input type="text" value={texto} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
  }
}
