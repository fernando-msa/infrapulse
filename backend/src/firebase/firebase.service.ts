import { Injectable, OnModuleInit } from '@nestjs/common';
import { App, applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: App;
  private firestore: Firestore;

  onModuleInit() {
    this.app = this.bootstrapFirebase();
    this.firestore = getFirestore(this.app);
  }

  getDb(): Firestore {
    if (!this.firestore) {
      throw new Error('Firestore ainda nao foi inicializado');
    }

    return this.firestore;
  }

  private bootstrapFirebase(): App {
    const existing = getApps()[0];
    if (existing) {
      return existing;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    // Cloud Run usa credenciais da service account do runtime por padrao.
    return initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }
}
