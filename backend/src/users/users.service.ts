import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private companiesService: CompaniesService,
  ) {}

  async findAll(companyId: string) {
    // OBRIGATÓRIO: Isolamento multi-tenant
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(createUserDto: CreateUserDto, requesterCompanyId?: string) {
    const existing = await this.findByEmail(createUserDto.email);
    if (existing) throw new ConflictException('Email já cadastrado');

    if (!requesterCompanyId) {
      throw new NotFoundException('Empresa do usuário autenticado não encontrada');
    }

    await this.companiesService.ensureUserSeatAvailable(requesterCompanyId);

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        companyId: requesterCompanyId,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
      },
    });
  }

  async getTechnicians(companyId: string) {
    // OBRIGATÓRIO: Isolamento multi-tenant
    return this.prisma.user.findMany({
      where: {
        role: { in: ['ANALISTA', 'GESTOR'] },
        active: true,
        companyId, // Isolamento
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}
