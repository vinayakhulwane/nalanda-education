
'use client';

import type { Question, WalletTransaction, ResultState, Worksheet, EconomySettings } from '@/types';

// DEFAULTS (Used if settings fail to load)
const DEFAULT_SETTINGS: EconomySettings = {
    coinToGold: 10, goldToDiamond: 10, 
    costPerMark: 0.5,
    aiGradingCostMultiplier: 1, // Default multiplier
    rewardPractice: 1.0,
    rewardClassroom: 0.5,
    rewardSpark: 0.5
};

// Helper: Cleans rubric keys
const formatCriterionKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
};

// Helper: Safely gets a number from settings, handling Strings/Nulls/Undefined
const getSafeNumber = (val: any, fallback: number) => {
    if (val === undefined || val === null) return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
};

/**
 * Calculates Cost. 
 */
export function calculateWorksheetCost(
    questions: Question[],
    settings: EconomySettings | undefined
): WalletTransaction {
    // Merge provided settings with defaults
    const activeSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    
    const totalCost: WalletTransaction = { coins: 0, gold: 0, diamonds: 0, aiCredits: 0 };
    const costPerMarkMultiplier = getSafeNumber(activeSettings.costPerMark, 0.5);
    const aiCostMultiplier = getSafeNumber(activeSettings.aiGradingCostMultiplier, 1);

    for (const question of questions) {
        // AI Graded questions have a flat AI Credit cost based on multiplier
        if (question.gradingMode === 'ai') {
            totalCost.aiCredits = (totalCost.aiCredits || 0) + (1 * aiCostMultiplier);
        }

        // Safe lowercase check
        const type = (question.currencyType || 'coin').toLowerCase();
        
        if (type === 'spark') continue; 

        const totalMarks = question.solutionSteps?.reduce(
            (stepSum, step) => stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0),
            0
        ) || 0;
        
        const costValue = Math.ceil(totalMarks * costPerMarkMultiplier);

        if (type === 'coin') totalCost.coins += costValue;
        else if (type === 'gold') totalCost.gold += costValue;
        else if (type === 'diamond') totalCost.diamonds += costValue;
    }

    return totalCost;
}

/**
 * Calculates Rewards. 
 * ✅ UPDATED: Robust Number Conversion for Settings & Corrected Multiplier Logic
 */
export function calculateAttemptRewards(
    worksheet: Worksheet,
    questions: Question[],
    results: ResultState,
    userId: string,
    settings: EconomySettings | undefined
): Record<string, number> { 
  
    // Merge settings to ensure we have values
    const activeSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

    const rewardTotals: Record<string, number> = { coin: 0, gold: 0, diamond: 0 };

    // 1. Determine Multiplier (✅ FIXED LOGIC)
    let multiplier = 0; // Default to 0
    if (worksheet.worksheetType === 'practice') {
        multiplier = getSafeNumber(activeSettings.rewardPractice, 1.0);
    } else if (worksheet.worksheetType === 'classroom') {
        multiplier = getSafeNumber(activeSettings.rewardClassroom, 0.5);
    }
    
    // Override for sample sheets
    if (worksheet.worksheetType === 'sample' || worksheet.title?.toLowerCase().includes('sample')) {
        multiplier = 0;
    }

    // 2. Calculate Rewards
    for (const question of questions) {
        let obtainedMarksForQuestion = 0;
        const isAiGraded = question.gradingMode === 'ai';

        if (isAiGraded) {
            // --- AI LOGIC ---
            const qTotalMarks = question.solutionSteps?.reduce(
                (acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0
            ) || 0;

            const firstSubId = question.solutionSteps?.[0]?.subQuestions?.[0]?.id;
            const res = firstSubId ? results[firstSubId] : null;

            if (res) {
                // @ts-ignore
                const breakdown = res.aiBreakdown || {};
                const rubric = question.aiRubric || {};
                let calculatedSum = 0;

                if (Object.keys(breakdown).length > 0 && Object.keys(rubric).length > 0) {
                    Object.entries(rubric).forEach(([key, weight]) => {
                        const cleanKey = formatCriterionKey(key);
                        // @ts-ignore
                        const scoreVal = breakdown[key] ?? breakdown[cleanKey] ?? 0;
                        const weightVal = typeof weight === 'string' ? parseFloat(weight) : (weight as number);
                        calculatedSum += (scoreVal / 100) * (weightVal / 100) * qTotalMarks;
                    });
                    obtainedMarksForQuestion += calculatedSum;
                } else {
                    let val = Number(res.score || 0);
                    if (val > qTotalMarks && qTotalMarks > 0) { // Check for percentage score
                        val = (val / 100) * qTotalMarks;
                    }
                    obtainedMarksForQuestion += val;
                }
            }
        } else {
            // --- SYSTEM LOGIC ---
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

        // ✅ SAFE CURRENCY CHECK (LowerCase)
        const type = (question.currencyType || 'coin').toLowerCase();

        if (type === 'spark') {
            // ✅ CRITICAL FIX: Safe conversion of Spark Rate
            const sparkRate = getSafeNumber(activeSettings.rewardSpark, 0.5);
            const rewardValue = Math.floor(obtainedMarksForQuestion * sparkRate * multiplier);
            rewardTotals['coin'] += rewardValue; 
        } else {
            const rewardValue = Math.floor(obtainedMarksForQuestion * 1.0 * multiplier);
            
            if (rewardTotals[type] !== undefined) {
                rewardTotals[type] += rewardValue;
            } else {
                rewardTotals['coin'] += rewardValue;
            }
        }
    }

    const finalRewards: Record<string, number> = {};
    for (const key in rewardTotals) {
        if (rewardTotals[key] > 0) finalRewards[key] = rewardTotals[key];
    }

    return finalRewards;
}
