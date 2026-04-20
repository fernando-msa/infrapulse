import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { CompaniesService } from '../companies/companies.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private companiesService: CompaniesService,
    private firebaseService: FirebaseService,
  ) {}

  private get isFirebase() {
    return process.env.DATA_PROVIDER === 'firebase';
  }

  async findAll(companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const users = await db.collection('users').where('companyId', '==', companyId).get();
      return users.docs.map((doc) => this.sanitizeUser(doc.data()));
    }

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
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const userDoc = await db.collection('users').doc(id).get();
      return userDoc.exists ? (userDoc.data() as any) : null;
    }

    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const users = await db.collection('users').where('email', '==', email).limit(1).get();
      return users.empty ? null : (users.docs[0].data() as any);
    }

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

    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ref = db.collection('users').doc();
      const now = new Date();

      const user = {
        id: ref.id,
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role,
        active: true,
        companyId: requesterCompanyId,
        createdAt: now,
        updatedAt: now,
      };

      await ref.set(user);
      return this.sanitizeUser(user);
    }

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
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const users = await db
        .collection('users')
        .where('companyId', '==', companyId)
        .where('active', '==', true)
        .get();

      return users.docs
        .map((doc) => doc.data() as any)
        .filter((user) => user.role === 'ANALISTA' || user.role === 'GESTOR')
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }));
    }

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

  private sanitizeUser(user: any) {
    if (!user) return user;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      companyId: user.companyId,
      createdAt: this.toDate(user.createdAt),
    };
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
