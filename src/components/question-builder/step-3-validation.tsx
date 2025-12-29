'use client';

import React, { useEffect, useState } from 'react';
import { Question } from "@/types";
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface Step3Props {
  question: Question;
  onValidityChange: (isValid: boolean) => void;
}

interface ValidationError {
  stepId?: string;
  subId?: string;
  message: string;
  type: 'critical' | 'warning';
}

export function Step3Validation({ question, onValidityChange }: Step3Props) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    const newErrors: ValidationError[] = [];

    // --- 1. GLOBAL CHECKS ---
    if (!question.name) newErrors.push({ message: "Question Name is missing (Step 1)", type: 'critical' });
    if (!question.mainQuestionText) newErrors.push({ message: "Main Question Text is missing (Step 1)", type: 'critical' });
    if (question.solutionSteps.length === 0) newErrors.push({ message: "No solution steps defined. Add at least one step (Step 2).", type: 'critical' });

    // --- 2. STEP LEVEL CHECKS ---
    question.solutionSteps.forEach((step, index) => {
      const stepPrefix = `Step ${index + 1}:`;

      if (!step.title) {
        newErrors.push({ stepId: step.id, message: `${stepPrefix} Title is empty.`, type: 'critical' });
      }
      if (!step.stepQuestion) {
        newErrors.push({ stepId: step.id, message: `${stepPrefix} Description/Question is empty.`, type: 'critical' });
      }
      if (step.subQuestions.length === 0) {
        newErrors.push({ stepId: step.id, message: `${stepPrefix} Has no sub-questions.`, type: 'critical' });
      }

      // --- 3. SUB-QUESTION LEVEL CHECKS ---
      step.subQuestions.forEach((sub, subIndex) => {
        const subPrefix = `${stepPrefix} Sub Q${subIndex + 1}`;

        if (!sub.questionText) {
          newErrors.push({ stepId: step.id, subId: sub.id, message: `${subPrefix} text is missing.`, type: 'critical' });
        }
        if (sub.marks <= 0) {
          newErrors.push({ stepId: step.id, subId: sub.id, message: `${subPrefix} marks must be greater than 0.`, type: 'critical' });
        }

        // Numerical Validation
        if (sub.answerType === 'numerical') {
            if (sub.numericalAnswer?.baseUnit === '') {
                newErrors.push({ stepId: step.id, subId: sub.id, message: `${subPrefix} (Numerical) missing Base Unit.`, type: 'critical' });
            }
            // Tolerance can be 0, but correct value usually shouldn't be empty (though 0 is valid answer)
            if (sub.numericalAnswer?.correctValue === undefined || sub.numericalAnswer?.correctValue === null) {
                newErrors.push({ stepId: step.id, subId: sub.id, message: `${subPrefix} (Numerical) missing Correct Value.`, type: 'critical' });
            }
        }

        // MCQ Validation
        if (sub.answerType === 'mcq') {
            if (!sub.mcqAnswer || sub.mcqAnswer.options.length < 2) {
                newErrors.push({ stepId: step.id, subId: sub.id, message: `${subPrefix} (MCQ) needs at least 2 options.`, type: 'critical' });
            }
            if (!sub.mcqAnswer || sub.mcqAnswer.correctOptions.length === 0) {
                newErrors.push({ stepId: step.id, subId: sub.id, message: `${subPrefix} (MCQ) has no correct option selected.`, type: 'critical' });
            }
            // Check for empty option text
            if (sub.mcqAnswer?.options.some(opt => !opt.text.trim())) {
                newErrors.push({ stepId: step.id, subId: sub.id, message: `${subPrefix} (MCQ) has empty option text.`, type: 'critical' });
            }
        }
      });
    });

    setErrors(newErrors);
    
    // Notify Parent (Wizard) if we are valid
    const isValid = newErrors.length === 0;
    onValidityChange(isValid);

  }, [question, onValidityChange]);

  // --- RENDER ---
  const isValid = errors.length === 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800">System Integrity Check</h2>
        <p className="text-slate-500">Scanning your question logic for errors before grading configuration.</p>
      </div>

      <Card className={`p-6 border-2 ${isValid ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-full ${isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {isValid ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <div>
            <h3 className={`text-lg font-bold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
              {isValid ? "Validation Passed" : `${errors.length} Issues Found`}
            </h3>
            <p className="text-sm text-slate-500">
              {isValid 
                ? "Your question structure is perfect. You can proceed to Grading Settings." 
                : "Please fix the following issues to proceed."}
            </p>
          </div>
        </div>

        {!isValid && (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded border border-red-100 shadow-sm">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 font-medium">{err.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
