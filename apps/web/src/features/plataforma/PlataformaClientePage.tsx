import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TenantAdmin, TenantBranding } from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/http';
import { useSeo } from '../../lib/seo';
import { PlataformaLayout } from './PlataformaLayout';

const brandingVazio = (): TenantBranding => ({
  nome: '',
  nomeCompleto: '',
  logoUrl: '/logo-sindicato.png',
  sede: { endereco: '', cep: '' },
  contato: { telefones: [''], email: '' },
  themeColor: '#0b3d6b',
  cores: {
    primaria: '#0b3d6b',
    primariaEscura: '#071f38',
    destaque: '#f4b301',
  },
});

function telefonesParaTexto(lista: string[]): string {
  return lista.filter(Boolean).join(', ');
}

function textoParaTelefones(texto: string): string[] {
  return texto
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function PlataformaClientePage() {
  const { id = '' } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['plataforma', 'tenants', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data: body } = await api.get<TenantAdmin>(`/plataforma/tenants/${id}`);
      return body;
    },
  });

  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [timezone, setTimezone] = useState('America/Fortaleza');
  const [branding, setBranding] = useState<TenantBranding>(brandingVazio());
  const [telefones, setTelefones] = useState('');
  const [novoHost, setNovoHost] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setNome(data.nome);
    setAtivo(data.ativo);
    setTimezone(data.timezone);
    const b = data.branding ?? brandingVazio();
    setBranding({
      ...brandingVazio(),
      ...b,
      sede: b.sede ?? { endereco: '', cep: '' },
      contato: b.contato ?? { telefones: [], email: '' },
      cores: { ...brandingVazio().cores!, ...b.cores },
    });
    setTelefones(telefonesParaTexto(b.contato?.telefones ?? []));
  }, [data]);

  useSeo({
    title: data ? `Editar · ${data.nome}` : 'Editar cliente',
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: nome.trim(),
        ativo,
        timezone: timezone.trim(),
        branding: {
          ...branding,
          // Preserva conteúdo institucional se o formulário não editar esses campos
          diretoria: branding.diretoria ?? data?.branding?.diretoria,
          filiacao: branding.filiacao ?? data?.branding?.filiacao,
          reservaApartamentosUrl:
            branding.reservaApartamentosUrl ?? data?.branding?.reservaApartamentosUrl,
          regulamentoApartamentosUrl:
            branding.regulamentoApartamentosUrl ?? data?.branding?.regulamentoApartamentosUrl,
          imoveisModo: branding.imoveisModo ?? data?.branding?.imoveisModo,
          nome: branding.nome.trim(),
          nomeCompleto: branding.nomeCompleto.trim(),
          logoUrl: branding.logoUrl.trim() || '/logo-sindicato.png',
          contato: {
            email: branding.contato.email.trim(),
            telefones: textoParaTelefones(telefones),
          },
          sede: {
            endereco: branding.sede.endereco.trim(),
            cep: branding.sede.cep.trim(),
          },
          contatoDestinoEmail: branding.contatoDestinoEmail?.trim() || undefined,
          themeColor: branding.themeColor || branding.cores?.primaria,
        },
      };
      const { data: body } = await api.patch<TenantAdmin>(`/plataforma/tenants/${id}`, payload);
      return body;
    },
    onSuccess: async () => {
      setMsg('Alterações salvas.');
      setErroForm(null);
      await queryClient.invalidateQueries({ queryKey: ['plataforma', 'tenants'] });
    },
    onError: (err) => {
      setMsg(null);
      setErroForm(mensagemErroApi(err, 'Falha ao salvar.'));
    },
  });

  const addDominio = useMutation({
    mutationFn: async () => {
      await api.post(`/plataforma/tenants/${id}/domains`, {
        host: novoHost.trim(),
        primario: false,
      });
    },
    onSuccess: async () => {
      setNovoHost('');
      setErroForm(null);
      await queryClient.invalidateQueries({ queryKey: ['plataforma', 'tenants', id] });
    },
    onError: (err) => setErroForm(mensagemErroApi(err, 'Falha ao adicionar domínio.')),
  });

  const delDominio = useMutation({
    mutationFn: async (domainId: string) => {
      await api.delete(`/plataforma/tenants/${id}/domains/${domainId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plataforma', 'tenants', id] });
    },
    onError: (err) => setErroForm(mensagemErroApi(err, 'Falha ao remover domínio.')),
  });

  const setPrimario = useMutation({
    mutationFn: async (domainId: string) => {
      await api.post(`/plataforma/tenants/${id}/domains/${domainId}/primario`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plataforma', 'tenants', id] });
    },
    onError: (err) => setErroForm(mensagemErroApi(err, 'Falha ao definir domínio primário.')),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    salvar.mutate();
  }

  return (
    <PlataformaLayout
      titulo={data?.nome ?? 'Cliente'}
      descricao="Edite identidade, contato, status e domínios do sindicato."
    >
      <p className="sg-voltar">
        <Link to="/plataforma">← Voltar à visão geral</Link>
      </p>

      {isLoading && <p className="sg-estado">Carregando cliente…</p>}
      {error && <p className="sg-estado sg-estado--erro">Cliente não encontrado.</p>}

      {data && (
        <form className="sg-form" onSubmit={onSubmit}>
          <section className="sg-form-secao">
            <header>
              <h2>Cadastro</h2>
              <p>Slug: <code>{data.slug}</code></p>
            </header>

            <label>
              Nome exibido
              <input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </label>

            <label>
              Timezone
              <input value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
            </label>

            <label className="sg-check">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Tenant ativo (site responde neste domínio)
            </label>
          </section>

          <section className="sg-form-secao">
            <header>
              <h2>Marca e contato</h2>
              <p>Dados usados no site público do cliente.</p>
            </header>

            <div className="sg-form-grid">
              <label>
                Nome curto
                <input
                  value={branding.nome}
                  onChange={(e) => setBranding((b) => ({ ...b, nome: e.target.value }))}
                  required
                />
              </label>
              <label>
                Nome completo
                <input
                  value={branding.nomeCompleto}
                  onChange={(e) => setBranding((b) => ({ ...b, nomeCompleto: e.target.value }))}
                  required
                />
              </label>
              <label>
                Logo (URL)
                <input
                  value={branding.logoUrl}
                  onChange={(e) => setBranding((b) => ({ ...b, logoUrl: e.target.value }))}
                />
              </label>
              <label>
                Cor primária
                <input
                  type="color"
                  value={branding.cores?.primaria ?? '#0b3d6b'}
                  onChange={(e) =>
                    setBranding((b) => ({
                      ...b,
                      themeColor: e.target.value,
                      cores: { ...b.cores!, primaria: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="sg-form-span">
                Endereço da sede
                <input
                  value={branding.sede.endereco}
                  onChange={(e) =>
                    setBranding((b) => ({ ...b, sede: { ...b.sede, endereco: e.target.value } }))
                  }
                  required
                />
              </label>
              <label>
                CEP
                <input
                  value={branding.sede.cep}
                  onChange={(e) =>
                    setBranding((b) => ({ ...b, sede: { ...b.sede, cep: e.target.value } }))
                  }
                  required
                />
              </label>
              <label>
                E-mail de contato
                <input
                  type="email"
                  value={branding.contato.email}
                  onChange={(e) =>
                    setBranding((b) => ({
                      ...b,
                      contato: { ...b.contato, email: e.target.value },
                    }))
                  }
                  required
                />
              </label>
              <label className="sg-form-span">
                Telefones (separados por vírgula)
                <input value={telefones} onChange={(e) => setTelefones(e.target.value)} />
              </label>
              <label>
                E-mail destino do formulário
                <input
                  type="email"
                  value={branding.contatoDestinoEmail ?? ''}
                  onChange={(e) =>
                    setBranding((b) => ({
                      ...b,
                      contatoDestinoEmail: e.target.value || undefined,
                    }))
                  }
                  placeholder="opcional"
                />
              </label>
            </div>
          </section>

          <section className="sg-form-secao">
            <header>
              <h2>Domínios</h2>
              <p>Hosts que apontam para este sindicato (DNS + Proxy Host).</p>
            </header>

            <ul className="sg-domain-list">
              {data.domains.map((d) => (
                <li key={d.id}>
                  <div>
                    <strong>{d.host}</strong>
                    {d.primario ? <span className="sg-host-tag">primário</span> : null}
                  </div>
                  <div className="sg-domain-acoes">
                    {!d.primario && (
                      <button
                        type="button"
                        className="sg-btn-ghost"
                        onClick={() => setPrimario.mutate(d.id)}
                        disabled={setPrimario.isPending}
                      >
                        Tornar primário
                      </button>
                    )}
                    <button
                      type="button"
                      className="sg-btn-danger"
                      onClick={() => {
                        if (confirm(`Remover domínio ${d.host}?`)) {
                          delDominio.mutate(d.id);
                        }
                      }}
                      disabled={delDominio.isPending || data.domains.length <= 1}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="sg-domain-add">
              <input
                value={novoHost}
                onChange={(e) => setNovoHost(e.target.value)}
                placeholder="ex.: www.cliente.com.br"
              />
              <button
                type="button"
                className="sg-btn-primary"
                disabled={!novoHost.trim() || addDominio.isPending}
                onClick={() => addDominio.mutate()}
              >
                Adicionar domínio
              </button>
            </div>
          </section>

          {(msg || erroForm) && (
            <p className={erroForm ? 'sg-estado sg-estado--erro' : 'sg-estado sg-estado--ok'}>
              {erroForm ?? msg}
            </p>
          )}

          <div className="sg-form-acoes">
            <button type="submit" className="sg-btn-primary" disabled={salvar.isPending}>
              {salvar.isPending ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}
    </PlataformaLayout>
  );
}

function mensagemErroApi(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return fallback;
}
