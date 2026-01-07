import 'server-only';
import { getApps, initializeApp, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. Construct Service Account from Environment Variables
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Handle private key newlines for Vercel/Env variables
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// 2. Initialize App (Prevent re-initialization on hot reloads)
if (getApps().length === 0) {
  if (!process.env.FIREBASE_PRIVATE_KEY) {
      console.error("❌ MISSING FIREBASE_PRIVATE_KEY in .env");
  }
  
  try {
      initializeApp({
        credential: cert(serviceAccount),
      });
  } catch (error) {
      console.error("Firebase Admin Init Error:", error);
  }
}

// 3. Export Firestore
const adminApp = getApp();
export const db = getFirestore(adminApp);
