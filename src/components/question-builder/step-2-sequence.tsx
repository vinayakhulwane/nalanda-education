'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; 
import { Switch } from "@/components/ui/switch"; 
import { Plus, Trash2, ArrowUp, ArrowDown, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Question, SolutionStep, SubQuestion } from "@/types";

interface Step2Props {
  question: Question;
  setQuestion: React.Dispatch<React.SetStateAction<Question>>;
}

export function Step2Sequence({ question, setQuestion }: Step2Props) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [openSubId, setOpenSubId] = useState<string | null>(null);

  // --- MAIN STEP LOGIC ---
  const addStep = () => {
    const newStep: SolutionStep = { id: uuidv4(), title: `Step ${question.solutionSteps.length + 1}`, description: '', stepQuestion: '', subQuestions: [] };
    setQuestion({ ...question, solutionSteps: [...question.solutionSteps, newStep] });
    setActiveStepId(newStep.id);
    setOpenSubId(null); 
  };
  const deleteStep = (id: string) => {
    if (!confirm("Delete step?")) return;
    setQuestion({ ...question, solutionSteps: question.solutionSteps.filter(s => s.id !== id) });
    if (activeStepId === id) setActiveStepId(null);
  };
  const moveStep = (idx: number, dir: 'up'|'down') => {
    const steps = [...question.solutionSteps];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target >= 0 && target < steps.length) {
      [steps[idx], steps[target]] = [steps[target], steps[idx]];
      setQuestion({ ...question, solutionSteps: steps });
    }
  };
  const updateActiveStep = (field: keyof SolutionStep, val: any) => {
    if (!activeStepId) return;
    setQuestion({ ...question, solutionSteps: question.solutionSteps.map(s => s.id === activeStepId ? { ...s, [field]: val } : s) });
  };

  // --- SUB-QUESTION LOGIC ---
  const addSubQuestion = () => {
    if (!activeStepId) return;
    const newSub: SubQuestion = {
      id: uuidv4(),
      questionText: '',
      marks: 1,
      answerType: 'numerical', 
      numericalAnswer: { correctValue: 0, toleranceValue: 0, baseUnit: '' },
      mcqAnswer: { options: [{ id: uuidv4(), text: '' }, { id: uuidv4(), text: '' }], correctOptions: [], isMultiCorrect: false, shuffleOptions: true }
    };
    
    setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => 
            s.id === activeStepId ? { ...s, subQuestions: [...s.subQuestions, newSub] } : s
        )
    }));
    setOpenSubId(newSub.id);
  };

  const deleteSubQuestion = (subId: string) => {
    if (!activeStepId) return;
    setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => 
            s.id === activeStepId ? { ...s, subQuestions: s.subQuestions.filter(sq => sq.id !== subId) } : s
        )
    }));
  };

  const moveSubQuestion = (subId: string, dir: 'up'|'down') => {
    if (!activeStepId) return;
    setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => {
            if (s.id !== activeStepId) return s;
            const idx = s.subQuestions.findIndex(sq => sq.id === subId);
            if (idx === -1) return s;
            const newSubs = [...s.subQuestions];
            const target = dir === 'up' ? idx - 1 : idx + 1;
            if (target >= 0 && target < newSubs.length) {
                [newSubs[idx], newSubs[target]] = [newSubs[target], newSubs[idx]];
            }
            return { ...s, subQuestions: newSubs };
        })
    }));
  };

  const updateSubQuestion = (subId: string, field: keyof SubQuestion, val: any) => {
    if (!activeStepId) return;
    setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => 
            s.id === activeStepId ? { ...s, subQuestions: s.subQuestions.map(sq => sq.id === subId ? { ...sq, [field]: val } : sq) } : s
        )
    }));
  };

  const updateNested = (subId: string, type: 'numericalAnswer'|'mcqAnswer', field: string, val: any) => {
    if (!activeStepId) return;
    setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => 
            s.id === activeStepId ? { ...s, subQuestions: s.subQuestions.map(sq => 
                sq.id === subId ? { ...sq, [type]: { ...sq[type] as any, [field]: val } } : sq
            ) } : s
        )
    }));
  };

  const addMcqOption = (subId: string) => {
     if (!activeStepId) return;
     const newOpt = { id: uuidv4(), text: '' };
     setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => s.id === activeStepId ? {
            ...s, subQuestions: s.subQuestions.map(sq => sq.id === subId && sq.mcqAnswer ? {
                ...sq, mcqAnswer: { ...sq.mcqAnswer, options: [...sq.mcqAnswer.options, newOpt] }
            } : sq)
        } : s)
     }));
  };

  const deleteMcqOption = (subId: string, optId: string) => {
    if (!activeStepId) return;
    setQuestion(prev => ({
       ...prev,
       solutionSteps: prev.solutionSteps.map(s => s.id === activeStepId ? {
           ...s, subQuestions: s.subQuestions.map(sq => sq.id === subId && sq.mcqAnswer ? {
               ...sq, mcqAnswer: { 
                   ...sq.mcqAnswer, 
                   options: sq.mcqAnswer.options.filter(o => o.id !== optId),
                   correctOptions: sq.mcqAnswer.correctOptions.filter(id => id !== optId)
               }
           } : sq)
       } : s)
    }));
 };

 const updateMcqOption = (subId: string, optId: string, text: string) => {
    if (!activeStepId) return;
    setQuestion(prev => ({
       ...prev,
       solutionSteps: prev.solutionSteps.map(s => s.id === activeStepId ? {
           ...s, subQuestions: s.subQuestions.map(sq => sq.id === subId && sq.mcqAnswer ? {
               ...sq, mcqAnswer: { 
                   ...sq.mcqAnswer, 
                   options: sq.mcqAnswer.options.map(o => o.id === optId ? { ...o, text } : o)
               }
           } : sq)
       } : s)
    }));
 };

 const toggleMcqCorrect = (subId: string, optId: string) => {
    if (!activeStepId) return;
    setQuestion(prev => ({
       ...prev,
       solutionSteps: prev.solutionSteps.map(s => s.id === activeStepId ? {
           ...s, subQuestions: s.subQuestions.map(sq => {
               if (sq.id === subId && sq.mcqAnswer) {
                   const isMulti = sq.mcqAnswer.isMultiCorrect;
                   let newCorrect = [...sq.mcqAnswer.correctOptions];
                   if (isMulti) {
                       newCorrect.includes(optId) 
                        ? newCorrect = newCorrect.filter(id => id !== optId)
                        : newCorrect.push(optId);
                   } else {
                       newCorrect = [optId];
                   }
                   return { ...sq, mcqAnswer: { ...sq.mcqAnswer, correctOptions: newCorrect } };
               }
               return sq;
           })
       } : s)
    }));
 };

  const activeStep = question.solutionSteps.find(s => s.id === activeStepId);

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* SIDEBAR */}
      <div className="w-1/3 border-r bg-slate-50 flex flex-col">
        <div className="p-4 border-b bg-white"><h3 className="font-bold">Sequence</h3></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {question.solutionSteps.map((step, index) => (
                <div key={step.id} onClick={() => setActiveStepId(step.id)} 
                    className={`p-3 rounded border cursor-pointer ${activeStepId === step.id ? 'border-violet-500 bg-white ring-1 ring-violet-500' : 'border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{index + 1}. {step.title}</span>
                        <div className="flex gap-1">
                             <button onClick={(e)=>{e.stopPropagation();moveStep(index,'up')}} className="p-1 hover:bg-slate-100 rounded"><ArrowUp className="w-3 h-3"/></button>
                             <button onClick={(e)=>{e.stopPropagation();moveStep(index,'down')}} className="p-1 hover:bg-slate-100 rounded"><ArrowDown className="w-3 h-3"/></button>
                             <button onClick={(e)=>{e.stopPropagation();deleteStep(step.id)}} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-3 h-3"/></button>
                        </div>
                    </div>
                </div>
            ))}
            <div className="p-2"><Button onClick={addStep} variant="outline" className="w-full border-dashed">+ Add Step</Button></div>
        </div>
      </div>

      {/* EDITOR */}
      <div className="w-2/3 flex flex-col bg-white">
        {activeStep ? (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b space-y-4">
                    <Input value={activeStep.title} onChange={(e) => updateActiveStep('title', e.target.value)} className="font-bold text-lg" placeholder="Step Title" />
                    <Textarea value={activeStep.stepQuestion} onChange={(e) => updateActiveStep('stepQuestion', e.target.value)} placeholder="Step Description/Question" className="h-20" />
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold uppercase text-slate-500">Sub-Questions ({activeStep.subQuestions.length})</h4>
                    </div>

                    {activeStep.subQuestions.map((sub, idx) => {
                        const isOpen = openSubId === sub.id;
                        return (
                            <div key={sub.id} className="bg-white rounded border shadow-sm overflow-hidden">
                                {/* HEADER */}
                                <div 
                                    onClick={() => setOpenSubId(isOpen ? null : sub.id)}
                                    className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isOpen ? 'border-b bg-slate-50' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400"/> : <ChevronRight className="w-4 h-4 text-slate-400"/>}
                                        <span className={`font-medium text-sm ${!sub.questionText ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                                            {sub.questionText || `Sub-Question ${idx + 1}`}
                                        </span>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border capitalize">
                                            {sub.answerType}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => moveSubQuestion(sub.id, 'up')} className="p-1 hover:bg-slate-200 rounded text-slate-400"><ArrowUp className="w-3 h-3"/></button>
                                        <button onClick={() => moveSubQuestion(sub.id, 'down')} className="p-1 hover:bg-slate-200 rounded text-slate-400"><ArrowDown className="w-3 h-3"/></button>
                                        <button onClick={() => deleteSubQuestion(sub.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded ml-1"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                </div>

                                {/* BODY */}
                                {isOpen && (
                                    <div className="p-4 bg-white animate-in slide-in-from-top-2 duration-200">
                                        
                                        {/* ✅ FIXED LAYOUT: Row 1 = Question, Row 2 = Type & Marks */}
                                        <div className="space-y-4 mb-6">
                                            {/* Row 1 */}
                                            <div>
                                                <Label className="text-xs font-semibold text-slate-500">Question Text</Label>
                                                <Input 
                                                    value={sub.questionText} 
                                                    onChange={(e)=>updateSubQuestion(sub.id,'questionText',e.target.value)} 
                                                    placeholder="Enter the sub-question here..."
                                                />
                                            </div>

                                            {/* Row 2 */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs font-semibold text-slate-500">Answer Type</Label>
                                                    <Select value={sub.answerType} onValueChange={(val)=>updateSubQuestion(sub.id,'answerType',val)}>
                                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="numerical">Numerical</SelectItem>
                                                            <SelectItem value="mcq">MCQ</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-semibold text-slate-500">Marks</Label>
                                                    <Input 
                                                        type="number" 
                                                        min={1} 
                                                        value={sub.marks} 
                                                        onChange={(e)=>updateSubQuestion(sub.id,'marks',parseInt(e.target.value)||0)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* NUMERICAL EDITOR */}
                                        {sub.answerType === 'numerical' && (
                                            <div className="p-4 bg-violet-50 rounded border border-violet-100 grid grid-cols-3 gap-4">
                                                <div className="space-y-1"><Label className="text-xs text-violet-700">Correct Value</Label><Input type="number" value={sub.numericalAnswer?.correctValue || 0} onChange={(e)=>updateNested(sub.id,'numericalAnswer','correctValue',parseFloat(e.target.value))} className="bg-white"/></div>
                                                <div className="space-y-1"><Label className="text-xs text-violet-700">Tolerance (±)</Label><Input type="number" value={sub.numericalAnswer?.toleranceValue || 0} onChange={(e)=>updateNested(sub.id,'numericalAnswer','toleranceValue',parseFloat(e.target.value))} className="bg-white"/></div>
                                                <div className="space-y-1"><Label className="text-xs text-violet-700">Base Unit</Label><Input value={sub.numericalAnswer?.baseUnit || ''} onChange={(e)=>updateNested(sub.id,'numericalAnswer','baseUnit',e.target.value)} placeholder="e.g. N, m/s" className="bg-white"/></div>
                                            </div>
                                        )}
                                        
                                        {/* MCQ EDITOR */}
                                        {sub.answerType === 'mcq' && sub.mcqAnswer && (
                                            <div className="p-4 bg-orange-50 rounded border border-orange-100 space-y-4">
                                                <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                                                    <Label className="text-xs font-bold text-orange-700 uppercase">MCQ Options</Label>
                                                    <div className="flex gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Switch checked={sub.mcqAnswer.isMultiCorrect} onCheckedChange={(c) => updateNested(sub.id, 'mcqAnswer', 'isMultiCorrect', c)} />
                                                            <span className="text-xs text-orange-800">Multi-Select</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Switch checked={sub.mcqAnswer.shuffleOptions} onCheckedChange={(c) => updateNested(sub.id, 'mcqAnswer', 'shuffleOptions', c)} />
                                                            <span className="text-xs text-orange-800">Shuffle</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    {sub.mcqAnswer.options.map((opt) => {
                                                        const isCorrect = sub.mcqAnswer!.correctOptions.includes(opt.id);
                                                        return (
                                                            <div key={opt.id} className="flex gap-2 items-center">
                                                                <button 
                                                                    onClick={() => toggleMcqCorrect(sub.id, opt.id)}
                                                                    className={`p-1 rounded transition-colors ${isCorrect ? 'text-green-600 bg-green-100' : 'text-slate-300 hover:text-green-400'}`}
                                                                >
                                                                    {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                                </button>
                                                                <Input 
                                                                    value={opt.text}
                                                                    onChange={(e) => updateMcqOption(sub.id, opt.id, e.target.value)}
                                                                    className={`bg-white border-orange-200 ${isCorrect ? 'ring-1 ring-green-500 border-green-500' : ''}`}
                                                                    placeholder="Option Text..."
                                                                />
                                                                <button onClick={() => deleteMcqOption(sub.id, opt.id)}>
                                                                    <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <Button size="sm" variant="outline" onClick={() => addMcqOption(sub.id)} className="w-full border-dashed border-orange-300 text-orange-700 hover:bg-orange-100">
                                                    <Plus className="w-3 h-3 mr-2" /> Add Option
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <Button onClick={addSubQuestion} variant="outline" className="w-full border-dashed gap-2 py-6">
                        <Plus className="w-4 h-4" /> Add Sub-Question
                    </Button>
                </div>
            </div>
        ) : <div className="flex-1 flex items-center justify-center text-slate-400">Select a Step</div>}
      </div>
    </div>
  );
}