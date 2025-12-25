
import type { Question } from '@/types';

// Define the structure for wallet transactions (cost and reward)
type WalletTransaction = {
  coins: number;
  gold: number;
  diamonds: number;
};

// Define the structure for a student's attempt
type StudentAttempt = {
  [questionId: string]: {
    obtainedMarks: number;
  };
};

// Define a simplified worksheet structure for the function's purpose
interface Worksheet {
  worksheetType: 'sample' | 'practice' | 'classroom';
  questions: Question[];
}

/**
 * Calculates the total cost and reward for a given worksheet attempt based on a set of business rules.
 *
 * @param worksheet - The worksheet object, containing its type and an array of questions.
 * @param attempt - An object mapping question IDs to the marks obtained by the student.
 * @returns An object containing the totalCost and totalReward, each broken down by currency type.
 */
export function calculateWalletTransaction(
  worksheet: Worksheet,
  attempt: StudentAttempt
): {
  totalCost: WalletTransaction;
  totalReward: WalletTransaction;
} {
  const totalCost: WalletTransaction = { coins: 0, gold: 0, diamonds: 0 };
  const totalReward: WalletTransaction = { coins: 0, gold: 0, diamonds: 0 };

  // Rule 1: "Sample" Worksheet has no cost or reward.
  if (worksheet.worksheetType === 'sample') {
    return { totalCost, totalReward };
  }

  // Rule 2: Iterate through questions for non-sample worksheets.
  for (const question of worksheet.questions) {
    const questionId = question.id;
    const obtainedMarks = attempt[questionId]?.obtainedMarks ?? 0;
    const totalMarks =
      question.solutionSteps?.reduce(
        (stepSum, step) =>
          stepSum +
          step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0),
        0
      ) || 0;

    // Logic for "Spark" questions
    if (question.currencyType === 'spark') {
      // Cost is 0.
      // Reward is 50% of obtained marks, always in Coins.
      const rewardValue = Math.floor(obtainedMarks * 0.5);
      totalReward.coins += rewardValue;
    }
    // Logic for "Standard" questions (Coins, Gold, Diamonds)
    else {
      const currency = question.currencyType; // 'coin', 'gold', or 'diamond'

      // Calculate Cost: 50% of totalMarks, rounded up.
      const costValue = Math.ceil(totalMarks * 0.5);

      // Assign cost to the correct currency.
      if (currency === 'coin') totalCost.coins += costValue;
      if (currency === 'gold') totalCost.gold += costValue;
      if (currency === 'diamond') totalCost.diamonds += costValue;

      // Calculate Reward: 100% of obtainedMarks.
      const rewardValue = obtainedMarks;

      // Assign reward to the correct currency.
      if (currency === 'coin') totalReward.coins += rewardValue;
      if (currency === 'gold') totalReward.gold += rewardValue;
      if (currency === 'diamond') totalReward.diamonds += rewardValue;
    }
  }

  return { totalCost, totalReward };
}
