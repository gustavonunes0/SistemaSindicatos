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
import type { RequestComTenant } from '../tenant/tenant.middleware';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private tenantIdDoRequest(req: RequestComTenant): string {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant não resolvido para este host');
    }
    return tenantId;
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @SkipThrottle({ cadastro: true })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Req() req: RequestComTenant,
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<AuthResponse> {
    return this.authService.login(body.login, body.senha, this.tenantIdDoRequest(req));
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 20, ttl: 60_000 } })
  @SkipThrottle({ cadastro: true })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Req() req: RequestComTenant,
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput,
  ): Promise<AuthResponse> {
    return this.authService.refresh(body.refreshToken, this.tenantIdDoRequest(req));
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
    await this.authService.forgotPassword(body.email, this.tenantIdDoRequest(req));
    return { message: 'Se o email existir, um link de recuperação será enviado' };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @SkipThrottle({ cadastro: true })
  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  reset(
    @Req() req: RequestComTenant,
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<void> {
    return this.authService.resetPassword(body.token, body.novaSenha, this.tenantIdDoRequest(req));
  }
}
