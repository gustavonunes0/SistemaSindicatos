import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput): Promise<AuthResponse> {
    return this.authService.login(body.email, body.senha);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput,
  ): Promise<AuthResponse> {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput): Promise<void> {
    return this.authService.logout(body.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser): Promise<MeResponse> {
    return this.authService.me(user.id);
  }

  @Public()
  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgot(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(body.email);
    return { message: 'Se o email existir, um link de recuperação será enviado' };
  }

  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  reset(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput): Promise<void> {
    return this.authService.resetPassword(body.token, body.novaSenha);
  }
}
