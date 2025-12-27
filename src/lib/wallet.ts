'use client';

import type { Question, WalletTransaction, ResultState, Worksheet, EconomySettings } from '@/types';

// DEFAULTS (Used if settings fail to load)
const DEFAULT_SETTINGS: EconomySettings = {
    coinToGold: 10, goldToDiamond: 10, 
    costPerMark: 0.5,
    rewardPractice: 1.0,
    rewardClassroom: 0.5,
    rewardSpark: 0.5
};

/**
 * Calculates Cost. Now accepts optional 'settings'.
 */
export function calculateWorksheetCost(
    questions: Question[],
    settings: EconomySettings = DEFAULT_SETTINGS
): WalletTransaction {
    const totalCost: WalletTransaction = { coins: 0, gold: 0, diamonds: 0 };
    const multiplier = settings.costPerMark;

    for (const question of questions) {
        if (question.currencyType === 'spark') continue; 

        const totalMarks = question.solutionSteps?.reduce(
            (stepSum, step) => stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0),
            0
        ) || 0;
        
        // Use the Dynamic Multiplier
        const costValue = Math.ceil(totalMarks * multiplier);

        if (question.currencyType === 'coin') totalCost.coins += costValue;
        else if (question.currencyType === 'gold') totalCost.gold += costValue;
        else if (question.currencyType === 'diamond') totalCost.diamonds += costValue;
    }

    return totalCost;
}

/**
 * Calculates Rewards. Now accepts optional 'settings'.
 * ✅ UPDATED: Supports Partial Marks for AI Grading
 */
export function calculateAttemptRewards(
    worksheet: Worksheet,
    questions: Question[],
    results: ResultState,
    userId: string,
    settings: EconomySettings = DEFAULT_SETTINGS
): Record<string, number> { 
  
    const rewardTotals: Record<string, number> = { coin: 0, gold: 0, diamond: 0 };

    // 1. Determine Multiplier from Settings
    let multiplier = 0;
  
    if (worksheet.worksheetType === 'practice') {
        multiplier = settings.rewardPractice;
    } else if (worksheet.worksheetType === 'classroom') {
        multiplier = settings.rewardClassroom;
    } else if (worksheet.authorId === userId) {
        multiplier = settings.rewardPractice;
    } else if (worksheet.authorId !== userId) {
        multiplier = settings.rewardClassroom;
    }
  
    if (worksheet.worksheetType === 'sample' || worksheet.title?.toLowerCase().includes('sample')) {
        multiplier = 0;
    }

    // 2. Calculate Rewards
    for (const question of questions) {
        let obtainedMarksForQuestion = 0;
        
        // ✅ CRITICAL FIX: Check if question is AI Graded
        const isAiGraded = question.gradingMode === 'ai';

        question.solutionSteps?.forEach(step => {
            step.subQuestions.forEach(subQ => {
                const res = results[subQ.id];
                if (!res) return;

                // ✅ Branching Logic
                if (isAiGraded) {
                    // AI: Use the specific numerical score stored in the result (Partial Credit)
                    obtainedMarksForQuestion += Number(res.score || 0);
                } else {
                    // System: Use standard boolean check (All or Nothing)
                    if (res.isCorrect) {
                        obtainedMarksForQuestion += subQ.marks;
                    }
                }
            });
        });

        if (obtainedMarksForQuestion === 0) continue;

        if (question.currencyType === 'spark') {
            // Use Dynamic Spark Rate
            const rewardValue = Math.floor(obtainedMarksForQuestion * settings.rewardSpark * multiplier);
            rewardTotals['coin'] += rewardValue; 
        } else {
            const rewardValue = Math.floor(obtainedMarksForQuestion * 1.0 * multiplier);
            const type = question.currencyType || 'coin';
            if (rewardTotals[type] !== undefined) {
                rewardTotals[type] += rewardValue;
            }
        }
    }

    const finalRewards: Record<string, number> = {};
    for (const key in rewardTotals) {
        if (rewardTotals[key] > 0) finalRewards[key] = rewardTotals[key];
    }

    return finalRewards;
}