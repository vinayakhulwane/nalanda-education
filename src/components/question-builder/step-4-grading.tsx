'use client';
import { useState, useEffect } from 'react';
import type { Question, AIRubric, AIRubricKey, AIFeedbackPattern } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

interface Step4GradingProps {
  onValidityChange: (isValid: boolean) => void;
  question: Partial<Question>;
  setQuestion: (q: Partial<Question>) => void;
}

const rubricLabels: Record<AIRubricKey, string> = {
  problemUnderstanding: 'Problem Understanding',
  formulaSelection: 'Formula Selection',
  substitution: 'Substitution & Method',
  calculationAccuracy: 'Calculation Accuracy',
  finalAnswer: 'Final Answer & Units',
  presentationClarity: 'Presentation Clarity',
};

const feedbackPatterns: { id: AIFeedbackPattern, label: string }[] = [
    { id: 'consistency', label: 'Consistency Pattern' },
    { id: 'examReadiness', label: 'Exam Readiness' },
    { id: 'calculationError', label: 'Calculation Error' },
    { id: 'conceptualMisconception', label: 'Conceptual Misconception' },
    { id: 'alternativeMethods', label: 'Alternative Methods' },
    { id: 'commonPitfalls', label: 'Common Pitfalls' },
    { id: 'realWorldConnection', label: 'Real-World Connection' },
    { id: 'nextSteps', label: 'Next Steps / Further Learning' },
];


const defaultRubric: AIRubric = {
  problemUnderstanding: 20,
  formulaSelection: 15,
  substitution: 15,
  calculationAccuracy: 20,
  finalAnswer: 20,
  presentationClarity: 10,
};

export function Step4Grading({ onValidityChange, question, setQuestion }: Step4GradingProps) {
  const isAIGrading = question.gradingMode === 'ai';

  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'ai' : 'system';
    setQuestion({
      ...question,
      gradingMode: newMode,
      aiRubric: newMode === 'ai' && !question.aiRubric ? defaultRubric : question.aiRubric,
      aiFeedbackPatterns: newMode === 'ai' && !question.aiFeedbackPatterns ? [] : question.aiFeedbackPatterns,
    });
  };
  
  const totalWeightage = Object.values(question.aiRubric || {}).reduce((sum, value) => sum + value, 0);
  const isRubricValid = totalWeightage === 100;

  useEffect(() => {
    if (isAIGrading) {
        onValidityChange(isRubricValid);
    } else {
        onValidityChange(true); // System grading is always valid
    }
  }, [isAIGrading, isRubricValid, onValidityChange]);


  const handleSliderChange = (key: AIRubricKey, newValue: number) => {
    const currentRubric = { ...(question.aiRubric || defaultRubric) };
    const oldValue = currentRubric[key];
    const diff = newValue - oldValue;

    // Distribute the difference among other sliders
    const otherKeys = (Object.keys(currentRubric) as AIRubricKey[]).filter(k => k !== key);
    let remainingDiff = diff;
    let totalAdjustable = otherKeys.reduce((sum, k) => sum + currentRubric[k], 0);

    const updatedRubric = { ...currentRubric };
    updatedRubric[key] = newValue;
    
    // Proportional adjustment
    for(const k of otherKeys) {
        if (totalAdjustable > 0) {
            const adjustment = Math.round(remainingDiff * (currentRubric[k] / totalAdjustable));
            updatedRubric[k] -= adjustment;
        }
    }
    
    // Final check to ensure total is exactly 100 due to rounding
    const newTotal = Object.values(updatedRubric).reduce((s,v) => s + v, 0);
    if(newTotal !== 100) {
        const finalAdjustment = 100 - newTotal;
        const keyToAdjust = otherKeys.find(k => updatedRubric[k] + finalAdjustment >= 0) || key;
        updatedRubric[keyToAdjust] += finalAdjustment;
    }


    setQuestion({ ...question, aiRubric: updatedRubric });
  };
  
  const handleFeedbackPatternChange = (patternId: AIFeedbackPattern, checked: boolean) => {
    const currentPatterns = question.aiFeedbackPatterns || [];
    const newPatterns = checked
      ? [...currentPatterns, patternId]
      : currentPatterns.filter(p => p !== patternId);
    setQuestion({ ...question, aiFeedbackPatterns: newPatterns });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 rounded-lg border p-4">
        <Switch id="ai-grading-mode" checked={isAIGrading} onCheckedChange={handleModeChange} />
        <div>
            <Label htmlFor="ai-grading-mode" className="text-lg font-medium">Enable AI Grading & Assessment</Label>
            <p className="text-sm text-muted-foreground">Switch from standard system grading to AI-powered evaluation.</p>
        </div>
      </div>

      {isAIGrading && (
        <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* AI Grading Rubrics */}
            <Card>
                <CardHeader>
                    <CardTitle>AI Grading Rubrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {Object.entries(rubricLabels).map(([key, label]) => (
                        <div key={key} className="grid grid-cols-5 items-center gap-4">
                            <Label className="col-span-2">{label}</Label>
                            <Slider
                                value={[question.aiRubric?.[key as AIRubricKey] ?? 0]}
                                onValueChange={(value) => handleSliderChange(key as AIRubricKey, value[0])}
                                max={100}
                                step={1}
                                className="col-span-2"
                            />
                             <div className="col-span-1 text-right font-mono text-sm">
                                {question.aiRubric?.[key as AIRubricKey] ?? 0}%
                            </div>
                        </div>
                    ))}
                    <div className={cn("text-right font-semibold", !isRubricValid && 'text-destructive')}>
                        Total Weightage: {totalWeightage}%
                    </div>
                     {!isRubricValid && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Validation Error</AlertTitle>
                            <AlertDescription>Total must equal 100% before proceeding.</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* AI Feedback Pattern */}
             <Card>
                <CardHeader>
                    <CardTitle>AI Feedback Pattern</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 gap-4">
                    {feedbackPatterns.map(pattern => (
                        <div key={pattern.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={pattern.id}
                                checked={question.aiFeedbackPatterns?.includes(pattern.id)}
                                onCheckedChange={(checked) => handleFeedbackPatternChange(pattern.id, !!checked)}
                            />
                            <Label htmlFor={pattern.id} className="text-sm font-normal">
                                {pattern.label}
                            </Label>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
