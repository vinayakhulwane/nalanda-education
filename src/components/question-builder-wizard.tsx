'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Step1Metadata } from "@/components/question-builder/step-1-metadata";
import { Step2Sequence } from "@/components/question-builder/step-2-sequence";
import { Question } from "@/types";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from 'uuid';

// Initial empty state matching your strict types
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
  aiRubric: {
    problemUnderstanding: 20,
    formulaSelection: 15,
    substitution: 15,
    calculationAccuracy: 20,
    finalAnswer: 20,
    presentationClarity: 10,
  },
  aiFeedbackPatterns: [],
  status: 'draft',
  createdAt: { seconds: 0, nanoseconds: 0 },
  updatedAt: { seconds: 0, nanoseconds: 0 }
};

export function QuestionBuilderWizard() {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [question, setQuestion] = useState<Question>(initialQuestionState);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedQuestionData, setUploadedQuestionData] = useState<Partial<Question> | null>(null);

  
  // Track Step Validity so we can disable the Next button in the parent
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep2Valid, setIsStep2Valid] = useState(false);

  // --- DERIVED STATE ---
  const isStepValid = useMemo(() => {
    switch (currentStep) {
        case 1: return isStep1Valid;
        case 2: return isStep2Valid;
        // Add other steps here
        default: return true;
    }
  }, [currentStep, isStep1Valid, isStep2Valid]);

  // ---------------------------------------------------------------------------
  // NAVIGATION HANDLERS
  // ---------------------------------------------------------------------------
  const handleNext = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      
      {/* PROGRESS BAR */}
      <div className="mb-8 flex justify-between items-center text-sm font-medium text-slate-500 border-b pb-4">
        <span className={currentStep >= 1 ? "text-violet-600 font-bold" : ""}>1. Metadata</span>
        <span className={currentStep >= 2 ? "text-violet-600 font-bold" : ""}>2. Steps</span>
        <span className={currentStep >= 3 ? "text-violet-600 font-bold" : ""}>3. Validation</span>
        <span className={currentStep >= 4 ? "text-violet-600 font-bold" : ""}>4. Grading</span>
        <span className={currentStep >= 5 ? "text-violet-600 font-bold" : ""}>5. Preview</span>
      </div>

      {/* STEP CONTENT RENDERER */}
      <div className="min-h-[400px] bg-white p-6 rounded-lg shadow-sm border">
        {currentStep === 1 && (
          <Step1Metadata 
            question={question} 
            setQuestion={setQuestion} 
            onValidityChange={setIsStep1Valid} 
          />
        )}

        {currentStep === 2 && (
           <Step2Sequence 
            question={question} 
            setQuestion={setQuestion} 
          />
        )}

        {currentStep > 2 && (
          <div className="text-center p-10">
            <p>Step {currentStep} Content Placeholder</p>
          </div>
        )}
      </div>

      {/* NAVIGATION BUTTONS (Managed by Parent) */}
      <div className="mt-6 flex justify-between">
        <Button 
            variant="outline" 
            onClick={handleBack} 
            disabled={currentStep === 1}
        >
            Back
        </Button>

        <Button 
            onClick={handleNext} 
            disabled={!isStepValid}
            className="bg-violet-600 hover:bg-violet-700 text-white"
        >
            Next Step →
        </Button>
      </div>

      {/* DEBUG DATA VIEW (Optional - Helpful for testing) */}
      <div className="mt-12 p-4 bg-slate-900 text-slate-400 text-xs rounded overflow-auto h-32">
        <pre>{JSON.stringify(question, null, 2)}</pre>
      </div>

    </div>
  );
}
