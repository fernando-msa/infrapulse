import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupCompanyDto } from './dto/signup-company.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 40);
  }

  private async generateUniqueSlug(companyName: string) {
    const base = this.generateSlug(companyName) || `empresa-${Date.now()}`;
    let slug = base;
    let idx = 1;

    while (await this.prisma.company.findUnique({ where: { slug } })) {
      slug = `${base}-${idx}`;
      idx += 1;
    }

    return slug;
  }

  async signupCompany(dto: SignupCompanyDto) {
    const existingUser = await this.usersService.findByEmail(dto.adminEmail);
    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const slug = await this.generateUniqueSlug(dto.companyName);
    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const company = await this.prisma.company.create({
      data: {
        name: dto.companyName,
        slug,
        cnpj: dto.cnpj,
        plan: 'TRIAL' as any,
        subscriptionStatus: 'TRIALING' as any,
        seatLimit: 5,
        monthlyTicketLimit: 200,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        name: dto.adminName,
        email: dto.adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        companyId: company.id,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        plan: company.plan,
        subscriptionStatus: company.subscriptionStatus,
        trialEndsAt: company.trialEndsAt,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    if (!user.companyId) {
      throw new UnauthorizedException('Usuário sem empresa vinculada');
    }

    const company = await this.prisma.company.findUnique({ where: { id: user.companyId } });
    if (!company || !company.active) {
      throw new UnauthorizedException('Empresa inativa ou inexistente');
    }

    if (company.subscriptionStatus === 'CANCELED' || company.subscriptionStatus === 'PAST_DUE') {
      throw new UnauthorizedException('Assinatura da empresa está inativa');
    }

    if (company.subscriptionStatus === 'TRIALING' && company.trialEndsAt && company.trialEndsAt < new Date()) {
      throw new UnauthorizedException('Período de trial expirado');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async validateUser(payload: any) {
    return this.usersService.findById(payload.sub);
  }
}
