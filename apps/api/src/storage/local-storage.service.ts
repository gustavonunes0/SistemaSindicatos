import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { requireTenantId } from '../tenant/tenant-context';
import { StorageService } from './storage.service';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
const UPLOADS_PRIVADOS_DIR = join(process.cwd(), 'uploads-private');

@Injectable()
export class LocalStorageService extends StorageService {
  async salvar(conteudo: Buffer, nomeOriginal: string): Promise<string> {
    const tenantId = requireTenantId();
    const pasta = join(UPLOADS_DIR, tenantId);
    await mkdir(pasta, { recursive: true });
    const nomeArquivo = `${randomBytes(16).toString('hex')}${extname(nomeOriginal).toLowerCase()}`;
    await writeFile(join(pasta, nomeArquivo), conteudo);
    return `/uploads/${tenantId}/${nomeArquivo}`;
  }

  async salvarPrivado(conteudo: Buffer, nomeOriginal: string): Promise<string> {
    const tenantId = requireTenantId();
    const pasta = join(UPLOADS_PRIVADOS_DIR, tenantId);
    await mkdir(pasta, { recursive: true });
    const nomeArquivo = `${randomBytes(16).toString('hex')}${extname(nomeOriginal).toLowerCase()}`;
    await writeFile(join(pasta, nomeArquivo), conteudo);
    return `${tenantId}/${nomeArquivo}`;
  }

  async lerPrivado(chave: string): Promise<Buffer> {
    return readFile(this.resolverChavePrivada(chave));
  }

  async removerPrivado(chave: string): Promise<void> {
    try {
      await unlink(this.resolverChavePrivada(chave));
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro;
    }
  }

  private resolverChavePrivada(chave: string): string {
    const tenantId = requireTenantId();
    const raizTenant = resolve(UPLOADS_PRIVADOS_DIR, tenantId);
    const caminho = resolve(UPLOADS_PRIVADOS_DIR, chave);
    const relativo = relative(raizTenant, caminho);
    if (!chave.startsWith(`${tenantId}/`) || relativo.startsWith('..') || relativo === '') {
      throw new Error('Chave de arquivo privado inválida');
    }
    return caminho;
  }
}
