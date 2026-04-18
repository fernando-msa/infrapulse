import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    company: {
      findUnique: jest.fn(),
    },
  };

  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
  } as unknown as JwtService;

  const service = new AuthService(usersService as any, jwtService, prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar access_token quando credenciais forem válidas', async () => {
    const user = {
      id: 'u1',
      name: 'Admin',
      email: 'admin@infrapulse.com',
      password: 'hash',
      role: 'ADMIN',
      companyId: 'c1',
      active: true,
    };

    usersService.findByEmail.mockResolvedValue(user);
    prisma.company.findUnique.mockResolvedValue({
      id: 'c1',
      active: true,
      subscriptionStatus: 'ACTIVE',
      trialEndsAt: null,
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    (jwtService.sign as jest.Mock).mockReturnValue('jwt-token');

    const result = await service.login({ email: user.email, password: 'admin123' });

    expect(usersService.findByEmail).toHaveBeenCalledWith(user.email);
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
    expect(result.access_token).toBe('jwt-token');
    expect(result.user.email).toBe(user.email);
  });

  it('deve lançar UnauthorizedException quando senha for inválida', async () => {
    const user = {
      id: 'u1',
      name: 'Admin',
      email: 'admin@infrapulse.com',
      password: 'hash',
      role: 'ADMIN',
      companyId: 'c1',
      active: true,
    };

    usersService.findByEmail.mockResolvedValue(user);
    prisma.company.findUnique.mockResolvedValue({
      id: 'c1',
      active: true,
      subscriptionStatus: 'ACTIVE',
      trialEndsAt: null,
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      service.login({ email: user.email, password: 'senha-errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve lançar UnauthorizedException quando usuário estiver inativo', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'admin@infrapulse.com',
      password: 'hash',
      role: 'ADMIN',
      companyId: 'c1',
      active: false,
    });

    await expect(
      service.login({ email: 'admin@infrapulse.com', password: 'admin123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
