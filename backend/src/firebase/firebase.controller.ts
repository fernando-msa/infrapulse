import { Controller, Get } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Controller('infra/firestore')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Get('ping')
  async ping() {
    try {
      const db = this.firebaseService.getDb();
      await db.listCollections();

      return {
        provider: 'firestore',
        access: 'firebase-admin',
        status: 'ok',
      };
    } catch (error: any) {
      return {
        provider: 'firestore',
        access: 'firebase-admin',
        status: 'error',
        message: error?.message || 'Falha ao conectar no Firestore',
      };
    }
  }
}
