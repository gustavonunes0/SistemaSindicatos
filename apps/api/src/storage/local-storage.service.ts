import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { StorageService } from './storage.service';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class LocalStorageService extends StorageService {
  async salvar(conteudo: Buffer, nomeOriginal: string): Promise<string> {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const nomeArquivo = `${randomBytes(16).toString('hex')}${extname(nomeOriginal).toLowerCase()}`;
    await writeFile(join(UPLOADS_DIR, nomeArquivo), conteudo);
    return `/uploads/${nomeArquivo}`;
  }
}
