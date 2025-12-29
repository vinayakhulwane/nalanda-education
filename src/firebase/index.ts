'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'; // ✅ Added Firestore type
import { useState, useEffect } from 'react'; // ✅ Added for the hook

// IMPORTANT: DO NOT MODIFY THIS FUNCTION (Kept exactly as you had it)
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

// ==========================================
// ✅ ADDED THIS SECTION TO FIX YOUR BUILD ERROR
// ==========================================

// 1. Initialize immediately to get the instances
const { auth, firestore: db } = initializeFirebase();

// 2. Export them so 'use-user.ts' works
export { auth, db };

// 3. Export the hook that 'question-builder-wizard.tsx' needs
export function useFirestore() {
  const [firestoreInstance, setFirestoreInstance] = useState<Firestore | null>(null);

  useEffect(() => {
    setFirestoreInstance(db);
  }, []);

  return firestoreInstance;
}

// ==========================================
// EXISTING EXPORTS (Kept these)
// ==========================================
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';