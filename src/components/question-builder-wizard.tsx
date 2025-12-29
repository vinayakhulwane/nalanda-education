'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; 
import { Step1Metadata } from "@/components/question-builder/step-1-metadata";
import { Step2Sequence } from "@/components/question-builder/step-2-sequence";
import { Step3Validation } from "@/components/question-builder/step-3-validation"; 
import { Step4Grading } from "@/components/question-builder/step-4-grading"; 
import { Step5Preview } from "@/components/question-builder/step-5-preview"; 
import { Question } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Check, Rocket, Loader2, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase'; 
import { collection, doc, addDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// --- HELPER: CLEAN DATA ---
const cleanPayload = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => cleanPayload(v));
    if (obj !== null && typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                newObj[key] = value === undefined ? null : cleanPayload(value);
            }
        }
        return newObj;
    }
    return obj;
};

const initialQuestionState: Question = {
  id: '', name: '', mainQuestionText: '', authorId: '', classId: '', subjectId: '', unitId: '', categoryId: '', currencyType: 'spark',
  solutionSteps: [], gradingMode: 'system', aiFeedbackPatterns: [], status: 'draft',
  aiRubric: { 
    problemUnderstanding: 20, formulaSelection: 20, substitution: 20, 
    calculationAccuracy: 20, finalAnswer: 10, presentationClarity: 10 
  },
  createdAt: { seconds: 0, nanoseconds: 0 }, updatedAt: { seconds: 0, nanoseconds: 0 }
};

export function QuestionBuilderWizard() {
  const firestore = useFirestore(); 
  const { user } = useUser();
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const { toast } = useToast(); 

  const [question, setQuestion] = useState<Question>(initialQuestionState);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false); 
  const [isLoading, setIsLoading] = useState(true); 

  // Validation
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep3Valid, setIsStep3Valid] = useState(false);
  
  const isStep4Valid = question.aiRubric 
    ? Object.values(question.aiRubric).reduce((a, b) => a + b, 0) === 100 
    : false;

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const loadData = async () => {
        if (!firestore) return; 
        const questionId = searchParams.get('questionId'); 
        
        if (questionId) {
            try {
                const docRef = doc(firestore, 'questions', questionId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Question;
                    setQuestion(prev => ({ ...initialQuestionState, ...data, id: docSnap.id }));
                    if (data.name && data.mainQuestionText) setIsStep1Valid(true);
                } else {
                    toast({ variant: "destructive", title: "Error", description: "Question not found." });
                }
            } catch (err) {
                console.error(err);
                toast({ variant: "destructive", title: "Error", description: "Failed to load question." });
            }
        }
        setIsLoading(false);
    };
    loadData();
  }, [firestore, searchParams, toast]);

  // --- 2. SAVE ENGINE ---
  const saveToDatabase = async (status: 'draft' | 'published') => {
    if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to save." });
        return;
    }
    
    setIsSaving(true);
    console.log("Saving...", status);

    try {
        const payload = cleanPayload({
            ...question,
            authorId: user.uid,
            status,
            updatedAt: serverTimestamp(),
            ...(status === 'published' && question.status !== 'published' ? { publishedAt: serverTimestamp() } : {})
        });
        delete payload.id; 

        if (!question.id) {
            const docRef = await addDoc(collection(firestore, 'questions'), { 
                ...payload, createdAt: serverTimestamp() 
            });
            setQuestion(prev => ({ ...prev, id: docRef.id, status }));
            window.history.replaceState(null, '', `/questions/new?questionId=${docRef.id}`);
            toast({ title: "Success", description: "Question created successfully!" });
        } else {
            const docRef = doc(firestore, 'questions', question.id);
            await updateDoc(docRef, payload);
            setQuestion(prev => ({ ...prev, status }));
            toast({ title: "Saved", description: status === 'published' ? "Question is now Live!" : "Draft saved." });
        }
    } catch (error: any) {
        console.error("Save Error:", error);
        toast({ variant: "destructive", title: "Save Failed", description: error.message || "Could not save question." });
    } finally {
        setIsSaving(false);
    }
  };

  const handleNext = () => setCurrentStep((prev) => prev + 1);
  const handleBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const handleSaveDraft = async () => {
      if (question.status === 'published') {
          if (!confirm("⚠️ Warning: This question is currently LIVE.\n\nSaving as Draft will UNPUBLISH it (hide it from students).\n\nAre you sure?")) return;
      }
      await saveToDatabase('draft');
  };

  const handlePublish = async () => {
      const isUpdate = question.status === 'published';
      const msg = isUpdate 
        ? "Update this live question? Changes will be visible immediately." 
        : "Publish this question? It will become visible to students.";

      if (!confirm(msg)) return;

      await saveToDatabase('published');
      
      if (!isUpdate) {
         setTimeout(() => router.push('/questions/bank'), 1500);
      }
  };

  const isNextDisabled = () => {
    if (currentStep === 1) return !isStep1Valid;
    if (currentStep === 2 && question.solutionSteps.length === 0) return true;
    if (currentStep === 3) return !isStep3Valid; 
    if (currentStep === 4) return !isStep4Valid; 
    return false;
  };

  const steps = ['Metadata', 'Steps', 'Validation', 'Grading', 'Preview'];
  const isPublished = question.status === 'published';

  if (isLoading) {
      return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
            <Loader2 className="w-10 h-10 animate-spin text-violet-600"/>
            <p className="text-slate-500 font-mono text-sm animate-pulse">Loading Question Data...</p>
        </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4"> 
      
      {/* HEADER - Clean Title Only */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Question Builder</h1>
            <p className="text-slate-500 text-sm">Create and manage your assessment content</p>
          </div>
      </div>

      {/* PROGRESS STEPS */}
      <div className="mb-8 flex justify-between items-center relative">
        <div className="absolute left-0 right-0 top-[15px] h-0.5 bg-slate-200 -z-10" />
        {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            return (
                <div key={step} className="flex flex-col items-center gap-2 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' : isActive ? 'bg-white border-violet-600 text-violet-600' : 'bg-white border-slate-300 text-slate-300'}`}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <span className="text-sm font-bold">{stepNum}</span>}
                    </div>
                    <span className={`text-xs font-semibold ${isActive ? 'text-violet-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>{step}</span>
                </div>
            );
        })}
      </div>

      {/* MAIN CONTENT */}
      <div className="min-h-[400px] bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div key={question.id || 'new'}>
            {currentStep === 1 && <Step1Metadata question={question} setQuestion={setQuestion} onValidityChange={setIsStep1Valid} />}
            {currentStep === 2 && <Step2Sequence question={question} setQuestion={setQuestion} />}
            {currentStep === 3 && <Step3Validation question={question} onValidityChange={setIsStep3Valid} />}
            {currentStep === 4 && <Step4Grading question={question} setQuestion={setQuestion} />}
            {currentStep === 5 && <Step5Preview question={question} />} 
        </div>
      </div>

      {/* FOOTER - THE SAFE ZONE */}
      <div className="flex justify-between items-center pt-4 border-t mt-12 mb-20">
            {/* 1. LEFT: Back Button (Always here) */}
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            
            {/* 2. RIGHT SIDE - DYNAMIC ACTIONS */}
            <div className="flex items-center gap-3">
                {currentStep < 5 ? (
                    // A: STANDARD NEXT BUTTON (Steps 1-4)
                    <Button onClick={handleNext} disabled={isNextDisabled()} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                        Next Step <ChevronRight className="w-4 h-4" />
                    </Button>
                ) : (
                    // B: STEP 5 ACTIONS (Replaces Next Button)
                    <>
                        {/* Option 1: Save Draft */}
                        <Button 
                            variant="ghost" 
                            onClick={handleSaveDraft} 
                            disabled={isSaving} 
                            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />} 
                            {isPublished ? "Revert to Draft" : "Save as Draft"}
                        </Button>

                        {/* Option 2: Publish / Update */}
                        <Button 
                            onClick={handlePublish} 
                            disabled={isSaving} 
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md gap-2"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin"/>
                            ) : isPublished ? (
                                <RefreshCw className="w-4 h-4" /> 
                            ) : (
                                <Rocket className="w-4 h-4" />
                            )} 
                            {isPublished ? "Update Question" : "Publish Question"}
                        </Button>
                    </>
                )}
            </div>
      </div>
    </div>
  );
}