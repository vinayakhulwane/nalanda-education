import 'server-only'; // ✅ Safety: Prevents this from ever leaking to the client
import { db } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface AiLogParams {
  action: 'grade_submission' | 'generate_question';
  model: string;
  provider: string;
  userId?: string;
  success: boolean;
  tokens?: number;
  details?: string;
}

export async function logAiUsage(params: AiLogParams) {
  try {
    // Safety check: Ensure DB is initialized
    if (!db) {
        console.warn("AI Logger: DB not initialized, skipping log.");
        return;
    }

    const today = new Date().toISOString().split('T')[0]; // "2024-01-01"
    
    // 1. Save detailed log (Good for audit)
    await db.collection('ai_logs').add({
      ...params,
      timestamp: FieldValue.serverTimestamp(),
      date: today,
    });

    // 2. Update Daily Aggregates (Good for fast charts)
    const statsId = `${today}_${params.model}`;
    const statsRef = db.collection('ai_stats').doc(statsId);

    await statsRef.set({
      date: today,
      model: params.model,
      provider: params.provider,
      [params.action]: FieldValue.increment(1),
      total_requests: FieldValue.increment(1),
      last_updated: FieldValue.serverTimestamp()
    }, { merge: true });

  } catch (error) {
    // Silent fail so we don't break the user's experience just because logging failed
    console.error("Failed to log AI usage:", error);
  }
}