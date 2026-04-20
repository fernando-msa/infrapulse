import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private isConnected = false;

  async onModuleInit() {
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const firestoreOnly = process.env.DATA_PROVIDER === 'firebase';

    if (!hasDatabaseUrl || firestoreOnly) {
      return;
    }

    await this.$connect();
    this.isConnected = true;
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
