'use client';

import type { Question, WalletTransaction, ResultState, Worksheet, CurrencyType } from '@/types';

/**
 * Calculates the total cost for creating a worksheet.
 * Returns standard WalletTransaction (Plural keys: coins, diamonds).
 */
export function calculateWorksheetCost(
    questions: Question[]
): WalletTransaction {
    const totalCost: WalletTransaction = { coins: 0, gold: 0, diamonds: 0 };

    for (const question of questions) {
        if (question.currencyType === 'spark') {
            continue; // Spark questions are free
        }

        const totalMarks =
            question.solutionSteps?.reduce(
                (stepSum, step) =>
                    stepSum +
                    step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0),
                0
            ) || 0;
        
        // Cost is 50% of total marks, rounded UP
        const costValue = Math.ceil(totalMarks * 0.5);

        if (question.currencyType === 'coin') {
            totalCost.coins += costValue;
        } else if (question.currencyType === 'gold') {
            totalCost.gold += costValue;
        } else if (question.currencyType === 'diamond') {
            totalCost.diamonds += costValue;
        }
    }

    return totalCost;
}


/**
 * Calculates the total reward for a worksheet attempt.
 * ✅ FIXED: Returns SINGULAR keys (coin, diamond) to match the UI icons.
 * ✅ FIXED: Uses 'worksheetType' to resolve TypeScript error.
 */
export function calculateAttemptRewards(
  worksheet: Worksheet,
  questions: Question[],
  results: ResultState,
  userId: string
): Record<string, number> { 
  
  // Use singular keys here to match CurrencyType and UI Icons
  const rewardTotals: Record<string, number> = { coin: 0, gold: 0, diamond: 0 };

  // 1. Determine Multiplier based on Worksheet Type
  let multiplier = 0;
  
  if (worksheet.worksheetType === 'practice') {
      multiplier = 1.0; // Student-created (Paid) -> 100% Reward
  } else if (worksheet.worksheetType === 'classroom') {
      multiplier = 0.5; // Teacher-assigned (Free) -> 50% Reward
  } else if (worksheet.authorId === userId) {
      // Fallback: If type is missing, assume practice if user is author
      multiplier = 1.0;
  } else if (worksheet.authorId !== userId) {
      // Fallback: If type is missing, assume classroom if user is NOT author
      multiplier = 0.5;
  }
  
  // Safety: If it's a sample, multiplier is 0
  // ✅ FIX: Changed 'type' to 'worksheetType'
  if (worksheet.worksheetType === 'sample' || worksheet.title?.toLowerCase().includes('sample')) {
      multiplier = 0;
  }


  // 2. Calculate Rewards
  for (const question of questions) {
    let obtainedMarksForQuestion = 0;
    
    // Calculate marks
    question.solutionSteps?.forEach(step => {
        step.subQuestions.forEach(subQ => {
            if (results[subQ.id]?.isCorrect) {
                obtainedMarksForQuestion += subQ.marks;
            }
        });
    });

    if (obtainedMarksForQuestion === 0) continue;

    // Apply logic
    if (question.currencyType === 'spark') {
      // Spark marks convert to COINS at 50% value
      const rewardValue = Math.floor(obtainedMarksForQuestion * 0.5 * multiplier);
      rewardTotals['coin'] += rewardValue; 
    } else {
      // Standard marks (Coin/Gold/Diamond) at 100% value
      const rewardValue = Math.floor(obtainedMarksForQuestion * 1.0 * multiplier);
      
      const type = question.currencyType || 'coin';
      if (rewardTotals[type] !== undefined) {
          rewardTotals[type] += rewardValue;
      }
    }
  }

  // 3. Filter out zero balances
  const finalRewards: Record<string, number> = {};
  for (const key in rewardTotals) {
      if (rewardTotals[key] > 0) {
          finalRewards[key] = rewardTotals[key];
      }
  }

  return finalRewards;
}