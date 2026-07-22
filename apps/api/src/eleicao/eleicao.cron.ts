import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Rede de segurança, não fonte de verdade: fecha eleições ABERTA vencidas
// caso o admin esqueça de encerrar manualmente. Nunca abre uma eleição
// automaticamente — isso é sempre uma ação humana consciente.
@Injectable()
export class EleicaoCron {
  private readonly logger = new Logger(EleicaoCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async fecharEleicoesVencidas(): Promise<void> {
    const resultado = await this.prisma.eleicao.updateMany({
      where: { status: 'ABERTA', fim: { lt: new Date() } },
      data: { status: 'ENCERRADA' },
    });
    if (resultado.count > 0) {
      this.logger.log(`${resultado.count} eleição(ões) encerrada(s) automaticamente por prazo`);
    }
  }
}
