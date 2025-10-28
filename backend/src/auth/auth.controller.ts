import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { WalletChallengeDto } from './dto/wallet-challenge.dto';
import { WalletVerifyDto } from './dto/wallet-verify.dto';
import { WalletLinkDto } from './dto/wallet-link.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@CurrentUser() user: any) {
    return this.authService.validateUser(user.userId);
  }

  @Public()
  @Post('wallet/challenge')
  @HttpCode(HttpStatus.OK)
  generateWalletChallenge(@Body() dto: WalletChallengeDto) {
    return this.authService.generateWalletChallenge(dto);
  }

  @Public()
  @Post('wallet/verify')
  @HttpCode(HttpStatus.OK)
  verifyWalletSignature(@Body() dto: WalletVerifyDto) {
    return this.authService.verifyWalletSignature(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallet/link')
  @HttpCode(HttpStatus.OK)
  linkWallet(@CurrentUser() user: any, @Body() dto: WalletLinkDto) {
    return this.authService.linkWalletToAccount(user.userId, dto);
  }
}
