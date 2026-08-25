import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  adminAtualizarSenhaAfiliadoSchema,
  atualizarStatusAfiliadoSchema,
  cadastroAfiliadoAdminSchema,
  cadastroAfiliadoSchema,
  filtroAfiliadosSchema,
  type AdminAtualizarSenhaAfiliadoInput,
  type AtualizarStatusAfiliadoInput,
  type CadastroAfiliadoAdminInput,
  type CadastroAfiliadoInput,
  type FiltroAfiliadosInput,
  type TipoDocumentoFiliacao,
} from '@sindprf/types';
import { z } from 'zod';
import { Public, Roles } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AfiliadosService } from './afiliados.service';

const DOCUMENTO_MAX_BYTES = 8 * 1024 * 1024;
const MIMES_DOCUMENTO = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const CAMPOS_DOCUMENTOS: Record<string, TipoDocumentoFiliacao> = {
  identidadeCpf: 'IDENTIDADE_CPF',
  comprovanteEndereco: 'COMPROVANTE_ENDERECO',
  contracheque: 'CONTRACHEQUE',
  foto3x4: 'FOTO_3X4',
};
type ArquivosCadastro = Record<string, Express.Multer.File[] | undefined>;

/**
 * O cadastro público sobe junto com os documentos, então chega como multipart e
 * todo valor vira texto. Lista de dependentes e aceite voltam ao tipo original
 * antes da validação; os demais campos o schema já sabe converter de texto.
 */
const cadastroMultipartSchema = z.preprocess((body) => {
  if (typeof body !== 'object' || body === null) return body;
  const campos = body as Record<string, unknown>;
  return {
    ...campos,
    dependentes: lerDependentes(campos.dependentes),
    aceiteEstatuto: campos.aceiteEstatuto === 'true' || campos.aceiteEstatuto === true,
  };
}, cadastroAfiliadoSchema);

function lerDependentes(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  if (valor.trim() === '') return [];
  try {
    return JSON.parse(valor) as unknown;
  } catch {
    // Devolve o texto cru para o schema recusar com erro de validação.
    return valor;
  }
}

@Controller('afiliados')
export class AfiliadosController {
  constructor(private readonly afiliadosService: AfiliadosService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ cadastro: { limit: 5, ttl: 60_000 } })
  @SkipThrottle({ auth: true })
  @Post('cadastro')
  @UseInterceptors(
    FileFieldsInterceptor(
      Object.keys(CAMPOS_DOCUMENTOS).map((name) => ({ name, maxCount: 1 })),
      { limits: { fileSize: DOCUMENTO_MAX_BYTES, files: 4 } },
    ),
  )
  cadastrar(
    @Body(new ZodValidationPipe(cadastroMultipartSchema)) body: CadastroAfiliadoInput,
    @UploadedFiles() arquivos: ArquivosCadastro = {},
  ) {
    const documentos = Object.entries(CAMPOS_DOCUMENTOS).flatMap(([campo, tipo]) => {
      const arquivo = arquivos[campo]?.[0];
      if (!arquivo) return [];
      if (!MIMES_DOCUMENTO.has(arquivo.mimetype)) {
        throw new BadRequestException(
          `Arquivo inválido em ${campo}. Envie PDF, JPG, PNG ou WebP`,
        );
      }
      return [{ tipo, arquivo }];
    });
    return this.afiliadosService.cadastrar(body, documentos);
  }

  @Roles('ADMIN')
  @Get()
  @Header('Cache-Control', 'private, no-store')
  listar(@Query(new ZodValidationPipe(filtroAfiliadosSchema)) query: FiltroAfiliadosInput) {
    return this.afiliadosService.listar(query);
  }

  /** Ficha completa da solicitação: dados, dependentes e documentos enviados. */
  @Roles('ADMIN')
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  buscarFicha(@Param('id') id: string) {
    return this.afiliadosService.buscarFicha(id);
  }

  @Roles('ADMIN')
  @Get(':id/documentos/:documentoId/arquivo')
  async baixarDocumento(
    @Param('id') id: string,
    @Param('documentoId') documentoId: string,
    @Query('modo') modo?: string,
  ): Promise<StreamableFile> {
    const documento = await this.afiliadosService.baixarDocumento(id, documentoId);
    const nomeSeguro = encodeURIComponent(documento.nomeOriginal);
    return new StreamableFile(documento.buffer, {
      type: documento.mimeType,
      disposition: `${modo === 'inline' ? 'inline' : 'attachment'}; filename*=UTF-8''${nomeSeguro}`,
      length: documento.buffer.byteLength,
    });
  }

  @Roles('ADMIN')
  @Post()
  cadastrarAdmin(
    @Body(new ZodValidationPipe(cadastroAfiliadoAdminSchema)) body: CadastroAfiliadoAdminInput,
  ) {
    return this.afiliadosService.cadastrarAdmin(body);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  atualizarStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarStatusAfiliadoSchema)) body: AtualizarStatusAfiliadoInput,
  ) {
    return this.afiliadosService.atualizarStatus(id, body.status);
  }

  @Roles('ADMIN')
  @Patch(':id/senha')
  @HttpCode(HttpStatus.NO_CONTENT)
  atualizarSenha(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminAtualizarSenhaAfiliadoSchema))
    body: AdminAtualizarSenhaAfiliadoInput,
  ) {
    return this.afiliadosService.atualizarSenha(id, body.novaSenha);
  }
}
