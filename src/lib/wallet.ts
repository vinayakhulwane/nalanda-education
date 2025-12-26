'use client';

import type { Question, WalletTransaction, CurrencyType, ResultState, Worksheet } from '@/types';


/**
 * Calculates the total cost for creating a worksheet based on its questions.
 * - Spark questions are free.
 * - Other questions cost 50% of their total marks, rounded up.
 *
 * @param questions - An array of questions to be included in the worksheet.
 * @returns A WalletTransaction object with the total cost per currency.
 */
export function calculateWorksheetCost(
    questions: Question[]
): WalletTransaction {
    const totalCost: WalletTransaction = { coins: 0, gold: 0, diamonds: 0 };

    for (const question of questions) {
        if (question.currencyType === 'spark') {
            continue; // Spark questions are free to add
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
 * Calculates the total reward for a given worksheet attempt based on marks obtained and worksheet type.
 * - Applies a multiplier based on the worksheet type.
 * - Spark questions reward a percentage of obtained marks as Coins.
 * - Other questions reward a percentage of obtained marks in their respective currency.
 *
 * @param worksheet - The worksheet document.
 * @param questions - The full question objects included in the worksheet.
 * @param results - The results object mapping sub-question IDs to their correctness.
 * @param userId - The ID of the user who made the attempt.
 * @returns A WalletTransaction object with the total reward per currency.
 */
export function calculateAttemptRewards(
  worksheet: Worksheet,
  questions: Question[],
  results: ResultState,
  userId: string
): Partial<WalletTransaction> {
  const rewardTotals: WalletTransaction = { coins: 0, gold: 0, diamonds: 0 };

  // Determine reward multiplier based on worksheet type
  let multiplier = 0;
  if (worksheet.worksheetType === 'practice') {
      multiplier = 1.0; // Student-created practice tests
  } else if (worksheet.worksheetType === 'classroom') {
      multiplier = 0.5; // Teacher-assigned classroom work
  }
  // For 'sample' worksheets, multiplier remains 0.


  for (const question of questions) {
    let obtainedMarksForQuestion = 0;
    
    // Calculate marks obtained for this specific question
    question.solutionSteps?.forEach(step => {
        step.subQuestions.forEach(subQ => {
            if (results[subQ.id]?.isCorrect) {
                obtainedMarksForQuestion += subQ.marks;
            }
        });
    });

    if (obtainedMarksForQuestion === 0) continue;

    // Apply reward logic based on currency type
    if (question.currencyType === 'spark') {
      // Reward is 50% of obtained marks, adjusted by multiplier, rounded DOWN, paid in Coins.
      const rewardValue = Math.floor(obtainedMarksForQuestion * 0.5 * multiplier);
      rewardTotals.coins += rewardValue;
    } else {
      // Reward is 100% of obtained marks, adjusted by multiplier, rounded DOWN.
      const rewardValue = Math.floor(obtainedMarksForQuestion * 1.0 * multiplier);
      if (question.currencyType === 'coin') {
          rewardTotals.coins += rewardValue;
      } else if (question.currencyType === 'gold') {
          rewardTotals.gold += rewardValue;
      } else if (question.currencyType === 'diamond') {
          rewardTotals.diamonds += rewardValue;
      }
    }
  }

  // Filter out any currency types with a zero balance
  const finalRewards: Partial<WalletTransaction> = {};
  for (const key in rewardTotals) {
      const currency = key as keyof WalletTransaction;
      if (rewardTotals[currency] > 0) {
          finalRewards[currency] = rewardTotals[currency];
      }
  }

  return finalRewards;
}
