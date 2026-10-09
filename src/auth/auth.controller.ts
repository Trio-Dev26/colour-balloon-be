import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from './auth-cookies';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AdminOnly } from './decorators/admin-only.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('auth/admin')
@Controller('auth/admin')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  // tokens are only ever delivered as httpOnly cookies, never in the body
  private get cookieSecure() {
    return this.config.get<string>('COOKIE_SECURE') === 'true';
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, ...tokens } = await this.authService.loginAdmin(
      dto.email,
      dto.password,
    );
    setAuthCookies(res, tokens, this.cookieSecure);
    return { user };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string | undefined>;
    const token = cookies[REFRESH_COOKIE] ?? dto?.refreshToken;
    if (!token) throw new UnauthorizedException('Missing refresh token');

    try {
      setAuthCookies(
        res,
        await this.authService.refresh(token),
        this.cookieSecure,
      );
    } catch (error) {
      // a rejected token is dead for good; drop it so the dashboard proxy stops treating it as a session
      clearAuthCookies(res);
      throw error;
    }
    return { success: true };
  }

  // httpOnly cookies can't be deleted from JS, so the server has to clear them
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    return { success: true };
  }

  @Get('me')
  @AdminOnly()
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
