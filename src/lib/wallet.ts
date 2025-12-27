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

// Helper to clean rubric keys (Same as in your components)
const formatCriterionKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
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
 * Calculates Rewards. 
 * ✅ UPDATED: Now performs Rubric Summation to match the Results Screen exactly.
 */
export function calculateAttemptRewards(
    worksheet: Worksheet,
    questions: Question[],
    results: ResultState,
    userId: string,
    settings: EconomySettings = DEFAULT_SETTINGS
): Record<string, number> { 
  
    const rewardTotals: Record<string, number> = { coin: 0, gold: 0, diamond: 0 };

    // 1. Determine Multiplier
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
        
        // Check Grading Mode
        const isAiGraded = question.gradingMode === 'ai';

        if (isAiGraded) {
            // --- AI LOGIC: Summation (Source of Truth) ---
            // We calculate the Max Marks for the question first
            const qTotalMarks = question.solutionSteps?.reduce(
                (acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0
            ) || 0;

            // Get the breakdown from the first sub-question result
            const firstSubId = question.solutionSteps?.[0]?.subQuestions?.[0]?.id;
            const res = firstSubId ? results[firstSubId] : null;

            if (res) {
                // @ts-ignore - safe access to dynamic prop
                const breakdown = res.aiBreakdown || {};
                const rubric = question.aiRubric || {};
                let calculatedSum = 0;

                // 1. Try to calculate exact sum from rubric parts
                if (Object.keys(breakdown).length > 0 && Object.keys(rubric).length > 0) {
                    Object.entries(rubric).forEach(([key, weight]) => {
                        const cleanKey = formatCriterionKey(key);
                        const scoreVal = breakdown[key] ?? breakdown[cleanKey] ?? 0;
                        const weightVal = typeof weight === 'string' ? parseFloat(weight) : (weight as number);
                        
                        // Formula: (Score% / 100) * (Weight% / 100) * MaxMarks
                        calculatedSum += (scoreVal / 100) * (weightVal / 100) * qTotalMarks;
                    });
                    
                    // Use the calculated sum (e.g. 3.25)
                    obtainedMarksForQuestion += calculatedSum;
                } 
                else {
                    // 2. Fallback: Use saved score if no breakdown exists
                    let val = Number(res.score || 0);
                    // Safety Net for percentage vs marks
                    if (val > qTotalMarks) {
                        val = (val / 100) * qTotalMarks;
                    }
                    obtainedMarksForQuestion += val;
                }
            }
        } else {
            // --- SYSTEM LOGIC: Standard ---
            question.solutionSteps?.forEach(step => {
                step.subQuestions.forEach(subQ => {
                    const res = results[subQ.id];
                    if (res && res.isCorrect) {
                        obtainedMarksForQuestion += subQ.marks;
                    }
                });
            });
        }

        if (obtainedMarksForQuestion <= 0) continue;

        // Apply Multipliers and Currency Type
        if (question.currencyType === 'spark') {
            const rewardValue = Math.floor(obtainedMarksForQuestion * settings.rewardSpark * multiplier);
            rewardTotals['coin'] += rewardValue; 
        } else {
            // For Coin/Gold/Diamond, 1 Mark = 1 Currency Unit (scaled by practice multiplier)
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