import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { requireTenantId } from '../tenant/tenant-context';
import { StorageService } from './storage.service';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

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
}
