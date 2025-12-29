'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; 
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Question, SolutionStep, SubQuestion } from "@/types";

interface Step2Props {
  question: Question;
  setQuestion: React.Dispatch<React.SetStateAction<Question>>;
}

export function Step2Sequence({ question, setQuestion }: Step2Props) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  // --- STEP MANAGEMENT ---

  const addStep = () => {
    const newStep: SolutionStep = {
      id: uuidv4(),
      title: `Step ${question.solutionSteps.length + 1}`,
      description: '',
      stepQuestion: '',
      subQuestions: []
    };
    const updatedSteps = [...question.solutionSteps, newStep];
    setQuestion({ ...question, solutionSteps: updatedSteps });
    setActiveStepId(newStep.id);
  };

  const deleteStep = (stepId: string) => {
    if (!confirm("Are you sure? This will delete the step and all its sub-questions.")) return;
    const updatedSteps = question.solutionSteps.filter(s => s.id !== stepId);
    setQuestion({ ...question, solutionSteps: updatedSteps });
    if (activeStepId === stepId) setActiveStepId(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...question.solutionSteps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setQuestion({ ...question, solutionSteps: newSteps });
  };

  const updateActiveStep = (field: keyof SolutionStep, value: any) => {
    if (!activeStepId) return;
    const updatedSteps = question.solutionSteps.map(s => 
      s.id === activeStepId ? { ...s, [field]: value } : s
    );
    setQuestion({ ...question, solutionSteps: updatedSteps });
  };

  // --- SUB-QUESTION MANAGEMENT ---

  const addSubQuestion = () => {
    if (!activeStepId) return;
    const newSub: SubQuestion = {
      id: uuidv4(),
      questionText: '',
      marks: 1,
      answerType: 'numerical', 
      numericalAnswer: { correctValue: 0, toleranceValue: 0, baseUnit: '' },
    };
    
    const updatedSteps = question.solutionSteps.map(s => {
      if (s.id === activeStepId) {
        return { ...s, subQuestions: [...s.subQuestions, newSub] };
      }
      return s;
    });
    setQuestion({ ...question, solutionSteps: updatedSteps });
  };

  const updateSubQuestion = (subId: string, field: keyof SubQuestion, value: any) => {
    if (!activeStepId) return;
    const updatedSteps = question.solutionSteps.map(s => {
      if (s.id === activeStepId) {
        const updatedSubs = s.subQuestions.map(sub => 
          sub.id === subId ? { ...sub, [field]: value } : sub
        );
        return { ...s, subQuestions: updatedSubs };
      }
      return s;
    });
    setQuestion({ ...question, solutionSteps: updatedSteps });
  };

  const updateNumericalAnswer = (subId: string, field: string, value: any) => {
    if (!activeStepId) return;
    const updatedSteps = question.solutionSteps.map(s => {
      if (s.id === activeStepId) {
        const updatedSubs = s.subQuestions.map(sub => {
          if (sub.id === subId) {
             return {
                ...sub,
                numericalAnswer: { ...sub.numericalAnswer!, [field]: value }
             };
          }
          return sub;
        });
        return { ...s, subQuestions: updatedSubs };
      }
      return s;
    });
    setQuestion({ ...question, solutionSteps: updatedSteps });
  };

  const deleteSubQuestion = (subId: string) => {
    if (!activeStepId) return;
    const updatedSteps = question.solutionSteps.map(s => {
        if (s.id === activeStepId) {
            return { ...s, subQuestions: s.subQuestions.filter(sq => sq.id !== subId) };
        }
        return s;
    });
    setQuestion({ ...question, solutionSteps: updatedSteps });
  };

  // --- RENDER HELPERS ---

  const activeStep = question.solutionSteps.find(s => s.id === activeStepId);

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden bg-white shadow-sm">
      
      {/* LEFT SIDEBAR: Step List */}
      <div className="w-1/3 border-r bg-slate-50 flex flex-col">
        <div className="p-4 border-b bg-white">
            <h3 className="font-bold text-slate-700">Sequence</h3>
            <p className="text-xs text-slate-500">Define the logic flow.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {question.solutionSteps.length === 0 && (
                <div className="text-center p-8 text-sm text-slate-400">
                    No steps yet. <br/> Click "+ Add Step" below.
                </div>
            )}
            
            {question.solutionSteps.map((step, index) => (
                <div 
                    key={step.id}
                    onClick={() => setActiveStepId(step.id)}
                    className={`p-3 rounded-md border cursor-pointer transition-all hover:border-violet-300 group ${
                        activeStepId === step.id 
                        ? 'bg-white border-violet-500 shadow-sm ring-1 ring-violet-500' 
                        : 'bg-white border-slate-200'
                    }`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-sm text-slate-700">
                            {index + 1}. {step.title}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); moveStep(index, 'up'); }}
                                disabled={index === 0}
                                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                            >
                                <ArrowUp className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); moveStep(index, 'down'); }}
                                disabled={index === question.solutionSteps.length - 1}
                                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                            >
                                <ArrowDown className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                                className="p-1 hover:bg-red-100 text-red-500 rounded"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                        {step.subQuestions.length} sub-questions
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 border-t bg-white">
            <Button onClick={addStep} className="w-full gap-2 border-dashed border-2 bg-transparent text-violet-600 hover:bg-violet-50 hover:text-violet-700">
                <Plus className="w-4 h-4" /> Add Step
            </Button>
        </div>
      </div>

      {/* RIGHT CONTENT: Step Editor */}
      <div className="w-2/3 flex flex-col bg-white">
        {activeStep ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Step Header Input */}
                <div className="p-6 border-b space-y-4">
                    <div className="space-y-2">
                        <Label>Step Title</Label>
                        <Input 
                            value={activeStep.title} 
                            onChange={(e) => updateActiveStep('title', e.target.value)}
                            className="font-semibold text-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Step Question (What the student sees first)</Label>
                        <Textarea 
                            value={activeStep.stepQuestion}
                            onChange={(e) => updateActiveStep('stepQuestion', e.target.value)}
                            placeholder="e.g., 'First, let's identify the given values...'"
                            className="h-20"
                        />
                    </div>
                </div>

                {/* Sub-Questions List */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
                    <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Sub-Questions</h4>
                        <Button size="sm" variant="outline" onClick={addSubQuestion} className="gap-2 bg-white">
                            <Plus className="w-3 h-3" /> Add Sub-Question
                        </Button>
                    </div>

                    {activeStep.subQuestions.map((sub, idx) => (
                        <div key={sub.id} className="bg-white p-4 rounded-lg border shadow-sm relative group">
                            <button 
                                onClick={() => deleteSubQuestion(sub.id)}
                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            
                            <div className="grid grid-cols-12 gap-4 mb-4">
                                <div className="col-span-8 space-y-1">
                                    <Label className="text-xs">Question Text</Label>
                                    <Input 
                                        value={sub.questionText} 
                                        onChange={(e) => updateSubQuestion(sub.id, 'questionText', e.target.value)}
                                        placeholder="e.g., 'Calculate the force...'"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Type</Label>
                                    <Select 
                                        value={sub.answerType} 
                                        onValueChange={(val) => updateSubQuestion(sub.id, 'answerType', val)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="numerical">Numerical</SelectItem>
                                            <SelectItem value="mcq">MCQ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Marks</Label>
                                    <Input 
                                        type="number" 
                                        min={1}
                                        value={sub.marks} 
                                        onChange={(e) => updateSubQuestion(sub.id, 'marks', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            {/* Conditional Answer Inputs */}
                            {sub.answerType === 'numerical' && (
                                <div className="p-3 bg-violet-50 rounded border border-violet-100 grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-violet-700">Correct Value</Label>
                                        <Input 
                                            type="number"
                                            value={sub.numericalAnswer?.correctValue || 0}
                                            onChange={(e) => updateNumericalAnswer(sub.id, 'correctValue', parseFloat(e.target.value))}
                                            className="bg-white border-violet-200"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-violet-700">Tolerance (±)</Label>
                                        <Input 
                                            type="number"
                                            value={sub.numericalAnswer?.toleranceValue || 0}
                                            onChange={(e) => updateNumericalAnswer(sub.id, 'toleranceValue', parseFloat(e.target.value))}
                                            className="bg-white border-violet-200"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-violet-700">Unit</Label>
                                        <Input 
                                            value={sub.numericalAnswer?.baseUnit || ''}
                                            onChange={(e) => updateNumericalAnswer(sub.id, 'baseUnit', e.target.value)}
                                            placeholder="e.g. m/s"
                                            className="bg-white border-violet-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {sub.answerType === 'mcq' && (
                                <div className="p-3 bg-orange-50 rounded border border-orange-100 text-center text-sm text-orange-600">
                                    MCQ Options Editor (Placeholder)
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <GripVertical className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-600">No Step Selected</h3>
                <p>Select a step from the left sidebar to edit it,<br/>or add a new one to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
}
