'use client';

import React, { useState } from 'react';
import { Step1Metadata } from "@/components/question-builder/step-1-metadata";
import { Step2Sequence } from "@/components/question-builder/step-2-sequence";
import { Step3Validation } from "@/components/question-builder/step-3-validation"; 
import { Step4Grading } from "@/components/question-builder/step-4-grading"; 
import { Question } from "@/types";
import { Button } from "@/components/ui/button";
import { Save, Check } from 'lucide-react';

const initialQuestionState: Question = {
  id: '', name: '', mainQuestionText: '', authorId: '', classId: '', subjectId: '', unitId: '', categoryId: '', currencyType: 'spark',
  solutionSteps: [], gradingMode: 'system', aiFeedbackPatterns: [], status: 'draft',
  aiRubric: { 
    problemUnderstanding: 20, formulaSelection: 20, substitution: 20, 
    calculationAccuracy: 20, finalAnswer: 10, presentationClarity: 10 
  },
  createdAt: { seconds: 0, nanoseconds: 0 }, updatedAt: { seconds: 0, nanoseconds: 0 }
};

// ✅ ENSURE "export" IS HERE
export function QuestionBuilderWizard() {
  const [question, setQuestion] = useState<Question>(initialQuestionState);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Validation States
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep3Valid, setIsStep3Valid] = useState(false);
  
  const isStep4Valid = question.aiRubric 
    ? Object.values(question.aiRubric).reduce((a, b) => a + b, 0) === 100 
    : false;

  const handleNext = () => setCurrentStep((prev) => prev + 1);
  const handleBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const handleSaveDraft = async () => {
    console.log("Saving Draft:", question);
    alert("Draft saved!");
  };

  const isNextDisabled = () => {
    if (currentStep === 1) return !isStep1Valid;
    if (currentStep === 3) return !isStep3Valid; 
    if (currentStep === 4) return !isStep4Valid; 
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
                                : 'bg-white border-slate-300 text-slate-300'}
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
        {currentStep === 1 && <Step1Metadata question={question} setQuestion={setQuestion} onValidityChange={setIsStep1Valid} />}
        {currentStep === 2 && <Step2Sequence question={question} setQuestion={setQuestion} />}
        {currentStep === 3 && <Step3Validation question={question} onValidityChange={setIsStep3Valid} />}
        {currentStep === 4 && <Step4Grading question={question} setQuestion={setQuestion} />}
        {currentStep === 5 && <div className="text-center p-10"><h3 className="text-xl font-bold">Preview Mode (Coming Soon)</h3></div>}
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>Back</Button>

        <div className="flex gap-4">
            <Button variant="secondary" onClick={handleSaveDraft} className="gap-2">
                <Save className="w-4 h-4" /> Save as Draft
            </Button>
            
            <Button onClick={handleNext} disabled={isNextDisabled()} className="bg-violet-600 hover:bg-violet-700 text-white">
                {currentStep === 5 ? 'Publish Question' : 'Next Step →'}
            </Button>
        </div>
      </div>
    </div>
  );
}