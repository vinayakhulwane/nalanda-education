'use client';

import React, { useEffect, useState } from 'react';
import { Question } from "@/types";
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface Step3Props {
  question: Question;
  onValidityChange: (isValid: boolean) => void;
}

interface ValidationError {
  id: string;
  stepTitle?: string;
  message: string;
  type: 'critical' | 'warning';
}

export function Step3Validation({ question, onValidityChange }: Step3Props) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    const newErrors: ValidationError[] = [];

    // --- HELPER: Strip HTML to check for real text ---
    const isEmptyHtml = (html: string | undefined) => {
        if (!html) return true;
        // Remove tags, non-breaking spaces, and whitespace
        const text = html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim(); 
        return text.length === 0;
    };

    // --- 1. GLOBAL CHECKS (Metadata) ---
    if (!question.name) {
        newErrors.push({ id: 'meta-name', message: "Question Name is missing (Step 1).", type: 'critical' });
    }
    if (isEmptyHtml(question.mainQuestionText)) {
        newErrors.push({ id: 'meta-text', message: "Main Question Text is empty (Step 1).", type: 'critical' });
    }
    if (question.solutionSteps.length === 0) {
        newErrors.push({ id: 'meta-steps', message: "No solution steps defined. Add at least one step.", type: 'critical' });
    }

    // --- 2. STEP LEVEL CHECKS ---
    question.solutionSteps.forEach((step, index) => {
      const stepPrefix = `Step ${index + 1}`;

      if (!step.title) {
        newErrors.push({ id: `step-${step.id}-title`, stepTitle: stepPrefix, message: "Title is empty.", type: 'critical' });
      }
      
      // Note: Step Question is optional in some pedagogies, but if you want it mandatory:
      if (isEmptyHtml(step.stepQuestion)) {
         newErrors.push({ id: `step-${step.id}-q`, stepTitle: stepPrefix, message: "Step Question/Prompt is empty.", type: 'critical' });
      }

      if (step.subQuestions.length === 0) {
        newErrors.push({ id: `step-${step.id}-subs`, stepTitle: stepPrefix, message: "Has no sub-questions.", type: 'critical' });
      }

      // --- 3. SUB-QUESTION LEVEL CHECKS ---
      step.subQuestions.forEach((sub, subIndex) => {
        const subLabel = `Sub-Q ${subIndex + 1}`;

        // Check Text
        if (isEmptyHtml(sub.questionText)) {
          newErrors.push({ id: `sub-${sub.id}-text`, stepTitle: stepPrefix, message: `${subLabel}: Question text is missing.`, type: 'critical' });
        }
        
        // Check Marks
        if (!sub.marks || sub.marks <= 0) {
          newErrors.push({ id: `sub-${sub.id}-marks`, stepTitle: stepPrefix, message: `${subLabel}: Marks must be greater than 0.`, type: 'critical' });
        }

        // Numerical Validation
        if (sub.answerType === 'numerical') {
            if (!sub.numericalAnswer?.baseUnit) {
                newErrors.push({ id: `sub-${sub.id}-unit`, stepTitle: stepPrefix, message: `${subLabel}: Base Unit is missing (e.g. N, m/s).`, type: 'critical' });
            }
            if (sub.numericalAnswer?.correctValue === undefined || sub.numericalAnswer?.correctValue === null) {
                newErrors.push({ id: `sub-${sub.id}-val`, stepTitle: stepPrefix, message: `${subLabel}: Correct Value is missing.`, type: 'critical' });
            }
        }

        // MCQ Validation
        if (sub.answerType === 'mcq') {
            const mcq = sub.mcqAnswer;
            if (!mcq || mcq.options.length < 2) {
                newErrors.push({ id: `sub-${sub.id}-opt-len`, stepTitle: stepPrefix, message: `${subLabel}: MCQ needs at least 2 options.`, type: 'critical' });
            }
            if (!mcq || mcq.correctOptions.length === 0) {
                newErrors.push({ id: `sub-${sub.id}-opt-correct`, stepTitle: stepPrefix, message: `${subLabel}: No correct option selected.`, type: 'critical' });
            }
            if (mcq?.options.some(opt => !opt.text.trim())) {
                newErrors.push({ id: `sub-${sub.id}-opt-text`, stepTitle: stepPrefix, message: `${subLabel}: One or more options have empty text.`, type: 'critical' });
            }
        }
      });
    });

    setErrors(newErrors);
    
    // Pass validity up to parent to unlock "Next" button
    const isValid = newErrors.length === 0;
    onValidityChange(isValid);

  }, [question, onValidityChange]);

  // --- RENDER ---
  const isValid = errors.length === 0;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800">System Integrity Check</h2>
        <p className="text-slate-500">Scanning your question structure for logical errors.</p>
      </div>

      <Card className={`overflow-hidden border-2 transition-colors duration-500 ${isValid ? 'border-green-100' : 'border-red-100'}`}>
        
        {/* HEADER */}
        <div className={`p-6 flex items-center gap-5 ${isValid ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
          <div className={`p-4 rounded-full shadow-sm shrink-0 ${isValid ? 'bg-green-100 text-green-600' : 'bg-white text-red-600'}`}>
            {isValid ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
          </div>
          <div>
            <h3 className={`text-xl font-bold ${isValid ? 'text-green-800' : 'text-red-800'}`}>
              {isValid ? "Validation Passed" : `${errors.length} Issue${errors.length === 1 ? '' : 's'} Found`}
            </h3>
            <p className="text-slate-600 mt-1 text-sm">
              {isValid 
                ? "Your question logic is perfect. You can proceed to Grading Configuration." 
                : "The system cannot process this question until the following errors are fixed."}
            </p>
          </div>
        </div>

        {/* ERROR LIST */}
        {!isValid && (
          <div className="bg-white p-2">
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {errors.map((err) => (
                  <div key={err.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors group">
                    <div className="pt-1">
                        <XCircle className="w-5 h-5 text-red-500 group-hover:text-red-600" />
                    </div>
                    <div>
                        {err.stepTitle && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                {err.stepTitle}
                            </span>
                        )}
                        <span className="text-sm font-medium text-slate-700">
                            {err.message}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </Card>
    </div>
  );
}