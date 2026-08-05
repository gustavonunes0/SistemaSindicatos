import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  type AuthResponse,
  type ForgotPasswordInput,
  type LoginInput,
  type MeResponse,
  type RefreshTokenInput,
  type ResetPasswordInput,
} from '@sindprf/types';
import { CurrentUser, Public } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { tenantAls, type TenantContextStore } from '../tenant/tenant-context';
import type { RequestComTenant } from '../tenant/tenant.middleware';
import { TenantService } from '../tenant/tenant.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenants: TenantService,
  ) {}

  /** Garante tenant no request (middleware pode não ter preenchido req.tenant). */
  private async garantirTenantId(req: RequestComTenant): Promise<string> {
    if (req.tenant?.tenantId) {
      tenantAls.enterWith(req.tenant);
      return req.tenant.tenantId;
    }

    const host = this.tenants.extrairHostDoRequest(
      req.headers as Record<string, string | string[] | undefined>,
    );
    if (!host) {
      throw new BadRequestException('Não foi possível determinar o host do tenant');
    }

    const tenant = await this.tenants.resolverPorHost(host);
    const store: TenantContextStore = {
      tenantId: tenant.id,
      slug: tenant.slug,
      host,
      timezone: tenant.timezone,
      nome: tenant.nome,
    };
    req.tenant = store;
    tenantAls.enterWith(store);
    return store.tenantId;
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @SkipThrottle({ cadastro: true })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: RequestComTenant,
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<AuthResponse> {
    const tenantId = await this.garantirTenantId(req);
    return this.authService.login(body.login, body.senha, tenantId);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 20, ttl: 60_000 } })
  @SkipThrottle({ cadastro: true })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: RequestComTenant,
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput,
  ): Promise<AuthResponse> {
    const tenantId = await this.garantirTenantId(req);
    return this.authService.refresh(body.refreshToken, tenantId);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput): Promise<void> {
    return this.authService.logout(body.refreshToken);
  }

  // Sem throttle: o front chama /me em várias telas do shell (TanStack Query).
  @Get('me')
  me(@CurrentUser() user: RequestUser): Promise<MeResponse> {
    return this.authService.me(user.id);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @SkipThrottle({ cadastro: true })
  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgot(
    @Req() req: RequestComTenant,
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<{ message: string }> {
    const tenantId = await this.garantirTenantId(req);
    await this.authService.forgotPassword(body.email, tenantId);
    return { message: 'Se o email existir, um link de recuperação será enviado' };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @SkipThrottle({ cadastro: true })
  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(
    @Req() req: RequestComTenant,
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<void> {
    const tenantId = await this.garantirTenantId(req);
    return this.authService.resetPassword(body.token, body.novaSenha, tenantId);
  }
}
