
'use client';

import type { Question, Worksheet, WalletTransaction, CurrencyType } from '@/types';


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

        if (question.currencyType === 'coin') totalCost.coins += costValue;
        if (question.currencyType === 'gold') totalCost.gold += costValue;
        if (question.currencyType === 'diamond') totalCost.diamonds += costValue;
    }

    return totalCost;
}


/**
 * Calculates the total reward for a given worksheet attempt based on marks obtained.
 * - Spark questions reward 50% of obtained marks (rounded down) as Coins.
 * - Other questions reward 100% of obtained marks in their respective currency.
 *
 * @param worksheet - The worksheet object.
 * @param questions - The full question objects included in the worksheet.
 * @param results - The results object mapping sub-question IDs to their correctness.
 * @returns A WalletTransaction object with the total reward per currency.
 */
export function calculateAttemptRewards(
  questions: Question[],
  results: { [subQuestionId: string]: { isCorrect: boolean } }
): WalletTransaction {
  const totalReward: WalletTransaction = { coins: 0, gold: 0, diamonds: 0 };

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
      // Reward is 50% of obtained marks, rounded DOWN, paid in Coins.
      const rewardValue = Math.floor(obtainedMarksForQuestion * 0.5);
      totalReward.coins += rewardValue;
    } else {
      // Reward is 100% of obtained marks for other currencies.
      const rewardValue = obtainedMarksForQuestion;
      if (question.currencyType === 'coin') totalReward.coins += rewardValue;
      if (question.currencyType === 'gold') totalReward.gold += rewardValue;
      if (question.currencyType === 'diamond') totalReward.diamonds += rewardValue;
    }
  }

  return totalReward;
}
