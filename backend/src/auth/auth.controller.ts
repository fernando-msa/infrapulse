import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupCompanyDto } from './dto/signup-company.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login do usuário' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('signup-company')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar empresa com usuário administrador (onboarding SaaS)' })
  async signupCompany(@Body() signupDto: SignupCompanyDto) {
    return this.authService.signupCompany(signupDto);
  }
}
