'use client';
import { db } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface AiLogParams {
  action: 'grade_submission' | 'generate_question';
  model: string;
  provider: string;
  userId?: string; // Optional: Track who triggered it
  success: boolean;
  tokens?: number; // Optional: If we want to track cost later
  details?: string; // e.g. "Math - Algebra" or "Student ID 123"
}

export async function logAiUsage(params: AiLogParams) {
  try {
    const today = new Date().toISOString().split('T')[0]; // "2024-01-01"
    
    // 1. Save detailed log (Good for audit)
    await db.collection('ai_logs').add({
      ...params,
      timestamp: FieldValue.serverTimestamp(),
      date: today, // Helper field for easy daily filtering
    });

    // 2. Update Daily Aggregates (Good for fast charts)
    // Document ID format: "2024-01-01_gemini-1.5-flash"
    const statsId = `${today}_${params.model}`;
    const statsRef = db.collection('ai_stats').doc(statsId);

    await statsRef.set({
      date: today,
      model: params.model,
      provider: params.provider,
      // Increment the counter for the specific action type
      [params.action]: FieldValue.increment(1),
      total_requests: FieldValue.increment(1),
      last_updated: FieldValue.serverTimestamp()
    }, { merge: true });

  } catch (error) {
    // Silent fail - logging should never break the actual app feature
    console.error("Failed to log AI usage:", error);
  }
}
