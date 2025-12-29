'use client';

import React, { useState } from 'react';
import { Step1Metadata } from "@/components/question-builder/step-1-metadata";
import { Step2Sequence } from "@/components/question-builder/step-2-sequence";
import { Step3Validation } from "@/components/question-builder/step-3-validation"; // ✅ NEW IMPORT
import { Question } from "@/types";
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';

// Initial empty state
const initialQuestionState: Question = {
  id: '', name: '', mainQuestionText: '', authorId: '', classId: '', subjectId: '', unitId: '', categoryId: '', currencyType: 'spark',
  solutionSteps: [], gradingMode: 'system', aiFeedbackPatterns: [], status: 'draft',
  createdAt: { seconds: 0, nanoseconds: 0 }, updatedAt: { seconds: 0, nanoseconds: 0 }
};

export function QuestionBuilderWizard() {
  const [question, setQuestion] = useState<Question>(initialQuestionState);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Validation States for Gatekeeping
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep3Valid, setIsStep3Valid] = useState(false); // ✅ NEW

  const handleNext = () => setCurrentStep((prev) => prev + 1);
  const handleBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const handleSaveDraft = async () => {
    console.log("Saving Draft:", question);
    alert("Draft saved!");
  };

  // Logic to determine if Next button is disabled
  const isNextDisabled = () => {
    if (currentStep === 1) return !isStep1Valid;
    if (currentStep === 2) return false; // We let Step 3 handle the hard validation
    if (currentStep === 3) return !isStep3Valid; // ✅ Strict Gate at Step 3
    return false;
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* PROGRESS BAR */}
      <div className="mb-8 flex justify-between items-center text-sm font-medium text-slate-500 border-b pb-4">
        {['Metadata', 'Steps', 'Validation', 'Grading', 'Preview'].map((step, idx) => (
            <span key={step} className={currentStep >= idx + 1 ? "text-violet-600 font-bold" : ""}>{idx + 1}. {step}</span>
        ))}
      </div>

      {/* CONTENT */}
      <div className="min-h-[400px] bg-white p-6 rounded-lg shadow-sm border mb-6">
        {currentStep === 1 && <Step1Metadata question={question} setQuestion={setQuestion} onValidityChange={setIsStep1Valid} />}
        {currentStep === 2 && <Step2Sequence question={question} setQuestion={setQuestion} />}
        
        {/* ✅ NEW STEP 3 RENDER */}
        {currentStep === 3 && <Step3Validation question={question} onValidityChange={setIsStep3Valid} />}
        
        {currentStep > 3 && <div className="text-center p-10"><p>Step {currentStep} Placeholder</p></div>}
      </div>

      {/* FOOTER CONTROLS */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>Back</Button>

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