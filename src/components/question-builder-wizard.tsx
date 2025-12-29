'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Step1Metadata } from "@/components/question-builder/step-1-metadata";
import { Step2SolutionBuilder } from "@/components/question-builder/step-2-solution-builder";
import { Step3Validation } from "@/components/question-builder/step-3-validation";
import { Step4Grading } from "@/components/question-builder/step-4-grading";
import type { Question } from "@/types";
import { Button } from "@/components/ui/button";
import { Save, Check, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const initialQuestionState: Question = {
  id: uuidv4(), 
  name: '', 
  mainQuestionText: '', 
  authorId: '', 
  classId: '', 
  subjectId: '', 
  unitId: '', 
  categoryId: '', 
  currencyType: 'spark',
  solutionSteps: [], 
  gradingMode: 'system', 
  aiRubric: undefined,
  aiFeedbackPatterns: [], 
  status: 'draft',
  createdAt: { seconds: 0, nanoseconds: 0 }, 
  updatedAt: { seconds: 0, nanoseconds: 0 }
};

export function QuestionBuilderWizard() {
  const [question, setQuestion] = useState<Question>(initialQuestionState);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [validity, setValidity] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const handleNext = () => setCurrentStep((prev) => prev + 1);
  const handleBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const handleSaveDraft = async () => {
    console.log("Saving Draft:", question);
    alert("Draft saved!");
  };

  const setStepValidity = (step: number, isValid: boolean) => {
    setValidity(prev => ({...prev, [step]: isValid}));
  };

  const isNextDisabled = () => {
    if (currentStep === 1) return !validity[1];
    if (currentStep === 2) return !validity[2];
    if (currentStep === 3) return !validity[3];
    if (currentStep === 4) return !validity[4];
    return false;
  };

  const steps = ['Metadata', 'Steps', 'Validation', 'Grading', 'Preview'];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* PROGRESS BAR */}
      <div className="mb-8 flex justify-between items-center relative">
        <div className="absolute left-0 right-0 top-[15px] h-0.5 bg-slate-200 -z-10" />
        
        {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            
            return (
                <div key={step} className="flex flex-col items-center gap-2 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                        ${isCompleted 
                            ? 'bg-green-500 border-green-500 text-white'
                            : isActive 
                                ? 'bg-white border-violet-600 text-violet-600'
                                : 'bg-white border-slate-300 text-slate-300'
                        }
                    `}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <span className="text-sm font-bold">{stepNum}</span>}
                    </div>
                    <span className={`text-xs font-semibold ${isActive ? 'text-violet-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                        {step}
                    </span>
                </div>
            );
        })}
      </div>

      {/* CONTENT */}
      <div className="min-h-[400px] bg-white p-6 rounded-lg shadow-sm border mb-6">
        {currentStep === 1 && <Step1Metadata question={question} setQuestion={setQuestion} onValidityChange={(isValid) => setStepValidity(1, isValid)} />}
        {currentStep === 2 && <Step2SolutionBuilder onValidityChange={(isValid) => setStepValidity(2, isValid)} question={question} setQuestion={setQuestion} />}
        {currentStep === 3 && <Step3Validation question={question} onValidityChange={(isValid) => setStepValidity(3, isValid)} />}
        {currentStep === 4 && <Step4Grading question={question} setQuestion={setQuestion} onValidityChange={(isValid) => setStepValidity(4, isValid)} />}
        {currentStep > 4 && <div className="text-center p-10"><p>Step {currentStep} Placeholder</p></div>}
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="mr-2" /> Back
        </Button>

        <div className="flex gap-4">
            <Button variant="secondary" onClick={handleSaveDraft} className="gap-2">
                <Save className="w-4 h-4" /> Save as Draft
            </Button>
            <Button onClick={handleNext} disabled={isNextDisabled()} className="bg-violet-600 hover:bg-violet-700 text-white">
                Next Step →
            </Button>
        </div>
      </div>
    </div>
  );
}