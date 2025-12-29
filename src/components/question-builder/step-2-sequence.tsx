'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Trash2, GripVertical, CheckCircle2, Circle, 
  ChevronDown, ChevronRight, Copy, ArrowUp, ArrowDown, X, Eye, EyeOff
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Question, SolutionStep, SubQuestion } from "@/types";
import { RichTextEditor } from '../rich-text-editor';

// --- HELPER: Collapsible Editor ---
interface CollapsibleEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  defaultOpen?: boolean;
}

function CollapsibleEditor({ label, value, onChange, defaultOpen = true }: CollapsibleEditorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-semibold text-slate-500 uppercase">{label}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="h-6 px-2 text-slate-400 hover:text-slate-600"
          title={isOpen ? "Hide Editor" : "Show Editor"}
        >
          {isOpen ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      </div>
      {isOpen && (
        <div className="border rounded-md overflow-hidden relative group">
          <RichTextEditor value={value} onChange={onChange} />
          <div className="absolute bottom-2 right-2 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-white/80 px-1 rounded">
            Paste/Drag images here
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---
interface Step2Props {
  question: Question;
  setQuestion: React.Dispatch<React.SetStateAction<Question>>;
}

export function Step2Sequence({ question, setQuestion }: Step2Props) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [openSubId, setOpenSubId] = useState<string | null>(null);

  // --- STEP ACTIONS ---
  const addStep = () => {
    const newStep: SolutionStep = { 
      id: uuidv4(), 
      title: `Step ${question.solutionSteps.length + 1}`, 
      description: '', 
      stepQuestion: '', 
      subQuestions: [] 
    };
    setQuestion({ ...question, solutionSteps: [...question.solutionSteps, newStep] });
    setActiveStepId(newStep.id);
    setOpenSubId(null);
  };

  const deleteStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the edit modal
    if (!confirm("Are you sure you want to delete this step?")) return;
    
    setQuestion(prev => ({ 
        ...prev, 
        solutionSteps: prev.solutionSteps.filter(s => s.id !== id) 
    }));
    
    if (activeStepId === id) setActiveStepId(null);
  };

  const moveStep = (idx: number, dir: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
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

  // --- SUB-QUESTION ACTIONS ---
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

  const duplicateSubQuestion = (sub: SubQuestion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeStepId) return;
    const newSub = { ...sub, id: uuidv4() };
    setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => 
            s.id === activeStepId ? { ...s, subQuestions: [...s.subQuestions, newSub] } : s
        )
    }));
  };

  const deleteSubQuestion = (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeStepId) return;
    setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => 
            s.id === activeStepId ? { ...s, subQuestions: s.subQuestions.filter(sq => sq.id !== subId) } : s
        )
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

  // --- MCQ ACTIONS ---
  const addMcqOption = (subId: string) => {
     if (!activeStepId) return;
     setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => s.id === activeStepId ? {
            ...s, subQuestions: s.subQuestions.map(sq => sq.id === subId && sq.mcqAnswer ? {
                ...sq, mcqAnswer: { ...sq.mcqAnswer, options: [...sq.mcqAnswer.options, { id: uuidv4(), text: '' }] }
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
                       newCorrect.includes(optId) ? newCorrect = newCorrect.filter(id => id !== optId) : newCorrect.push(optId);
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
    <div className="relative min-h-[600px]">
      
      {/* --- MAIN CONTENT: FULL-WIDTH STEP SEQUENCE LIST --- */}
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center border-b pb-4">
            <div>
                <h3 className="text-lg font-bold text-slate-800">Solution Sequence</h3>
                <p className="text-sm text-slate-500">Define the logical steps to solve the problem.</p>
            </div>
            {/* REMOVED TOP BUTTON */}
        </div>
        
        <div className="space-y-3">
            {question.solutionSteps.length === 0 && (
                <div className="text-center p-12 border-2 border-dashed rounded-lg bg-slate-50/50">
                    <GripVertical className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-slate-600 font-medium mb-1">No Steps Defined</h4>
                    <p className="text-slate-400 text-sm mb-4">Click the button below to create your first step.</p>
                </div>
            )}
            
            {question.solutionSteps.map((step, index) => (
                <div 
                    key={step.id}
                    onClick={() => setActiveStepId(step.id)}
                    className={`group relative p-4 rounded-lg border cursor-pointer transition-all bg-white hover:border-violet-300 hover:shadow-md ${
                        activeStepId === step.id ? 'border-violet-500 ring-1 ring-violet-500 shadow-md' : 'border-slate-200 shadow-sm'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1 text-slate-300 group-hover:text-slate-500">
                             <button onClick={(e)=>moveStep(index, 'up', e)} disabled={index===0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                             <button onClick={(e)=>moveStep(index, 'down', e)} disabled={index===question.solutionSteps.length-1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                                 <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded">Step {index + 1}</span>
                                 <h4 className="font-semibold text-slate-800 truncate">{step.title || 'Untitled Step'}</h4>
                             </div>
                             <p className="text-sm text-slate-500 truncate">
                                {step.subQuestions.length === 0 ? 'No sub-questions' : `${step.subQuestions.length} sub-question(s)`}
                             </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Edit</Button>
                            <button 
                                onClick={(e) => deleteStep(step.id, e)}
                                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded transition-colors"
                                title="Delete Step"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* ✅ ADD STEP BUTTON - ALWAYS AT BOTTOM */}
            <Button onClick={addStep} className="w-full py-6 bg-violet-600 hover:bg-violet-700 text-white shadow-sm mt-4">
                <Plus className="w-5 h-5 mr-2" /> Add New Step
            </Button>
        </div>
      </div>


      {/* --- RIGHT-SIDE EDIT SHEET (MODAL) --- */}
      {activeStepId && activeStep && (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setActiveStepId(null)}></div>
            
            <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl border-l flex flex-col animate-in slide-in-from-right sm:duration-300">
                <div className="flex items-center justify-between p-6 border-b bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Edit Step</h2>
                        <p className="text-sm text-slate-500">Configure content and sub-questions.</p>
                    </div>
                    <button onClick={() => setActiveStepId(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
                    <div className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
                        <div className="space-y-2">
                            <Label className="text-slate-600 font-semibold">Step Title</Label>
                            <Input 
                                value={activeStep.title} 
                                onChange={(e) => updateActiveStep('title', e.target.value)} 
                                className="font-semibold text-lg"
                                placeholder="e.g., Identify Knowns"
                            />
                        </div>
                        <CollapsibleEditor 
                            label="Step Question (What the student sees)"
                            value={activeStep.stepQuestion}
                            onChange={(val) => updateActiveStep('stepQuestion', val)}
                            defaultOpen={true}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                             <h4 className="text-sm font-bold uppercase text-slate-600 tracking-wider">Sub-Questions ({activeStep.subQuestions.length})</h4>
                        </div>

                        {activeStep.subQuestions.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-white">
                                <p className="text-slate-400 mb-4">No sub-questions added yet.</p>
                                <Button onClick={addSubQuestion} variant="outline">
                                    <Plus className="w-4 h-4 mr-2" /> Add First Sub-Question
                                </Button>
                            </div>
                        )}

                        {activeStep.subQuestions.map((sub, idx) => {
                            const isOpen = openSubId === sub.id;
                            
                            return (
                                <div key={sub.id} className="bg-white rounded-lg border shadow-sm transition-all duration-200 overflow-hidden">
                                    <div 
                                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 ${isOpen ? 'border-b bg-slate-50/50' : ''}`}
                                        onClick={() => setOpenSubId(isOpen ? null : sub.id)}
                                    >
                                        <div className="text-slate-400"><GripVertical className="w-5 h-5"/></div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-medium truncate ${!sub.questionText || sub.questionText === '<p><br></p>' ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                                                {(sub.questionText && sub.questionText !== '<p><br></p>') ? sub.questionText.replace(/<[^>]*>?/gm, '') : `Sub-Question ${idx + 1}`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${
                                                sub.answerType === 'numerical' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                                            }`}>
                                                {sub.answerType}
                                            </span>
                                            <div className="h-4 w-px bg-slate-200"></div>
                                            <div className="flex items-center text-slate-400">
                                                <button onClick={(e) => duplicateSubQuestion(sub, e)} className="p-1.5 hover:bg-slate-100 hover:text-slate-600 rounded" title="Duplicate"><Copy className="w-4 h-4" /></button>
                                                <button onClick={(e) => deleteSubQuestion(sub.id, e)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <div className="text-slate-400">
                                                {isOpen ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                                            </div>
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div className="p-6 space-y-6 bg-white animate-in slide-in-from-top-1">
                                            <CollapsibleEditor 
                                                label="Question Text"
                                                value={sub.questionText}
                                                onChange={(val) => updateSubQuestion(sub.id, 'questionText', val)}
                                                defaultOpen={true}
                                            />
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-slate-500 uppercase">Answer Type</Label>
                                                    <Select value={sub.answerType} onValueChange={(val)=>updateSubQuestion(sub.id,'answerType',val)}>
                                                        <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="numerical">Numerical</SelectItem>
                                                            <SelectItem value="mcq">MCQ</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-slate-500 uppercase">Marks</Label>
                                                    <Input type="number" min={1} value={sub.marks} onChange={(e)=>updateSubQuestion(sub.id,'marks',parseInt(e.target.value)||0)}/>
                                                </div>
                                            </div>
                                            {/* (Nested Configs Omitted for brevity - same as previous step, kept intact) */}
                                            {/* Ensure Numerical/MCQ configs are here as per previous code */}
                                             <div className={`rounded-lg p-5 border ${sub.answerType === 'numerical' ? 'bg-violet-50/50 border-violet-100' : 'bg-orange-50/50 border-orange-100'}`}>
                                                <h5 className={`text-xs font-bold uppercase mb-4 border-b pb-2 ${sub.answerType === 'numerical' ? 'text-violet-700 border-violet-200' : 'text-orange-700 border-orange-200'}`}>
                                                    {sub.answerType === 'numerical' ? 'Numerical Answer Settings' : 'MCQ Options & Settings'}
                                                </h5>
                                                {sub.answerType === 'numerical' && (
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="space-y-1"><Label className="text-xs text-violet-600">Correct Value</Label><Input type="number" value={sub.numericalAnswer?.correctValue ?? 0} onChange={(e)=>updateNested(sub.id,'numericalAnswer','correctValue',parseFloat(e.target.value))} className="bg-white border-violet-200"/></div>
                                                        <div className="space-y-1"><Label className="text-xs text-violet-600">Tolerance (±)</Label><Input type="number" value={sub.numericalAnswer?.toleranceValue ?? 0} onChange={(e)=>updateNested(sub.id,'numericalAnswer','toleranceValue',parseFloat(e.target.value))} className="bg-white border-violet-200"/></div>
                                                        <div className="space-y-1"><Label className="text-xs text-violet-600">Base Unit <span className="text-red-400">*</span></Label><Input value={sub.numericalAnswer?.baseUnit || ''} onChange={(e)=>updateNested(sub.id,'numericalAnswer','baseUnit',e.target.value)} placeholder="e.g. N" className="bg-white border-violet-200"/></div>
                                                    </div>
                                                )}
                                                {sub.answerType === 'mcq' && sub.mcqAnswer && (
                                                    <div className="space-y-5">
                                                        <div className="flex gap-6 p-3 bg-orange-100/50 rounded-md">
                                                            <div className="flex items-center gap-2"><Switch checked={sub.mcqAnswer.isMultiCorrect} onCheckedChange={(c) => updateNested(sub.id, 'mcqAnswer', 'isMultiCorrect', c)} /><Label className="text-sm text-orange-800">Multi-Select</Label></div>
                                                            <div className="flex items-center gap-2"><Switch checked={sub.mcqAnswer.shuffleOptions} onCheckedChange={(c) => updateNested(sub.id, 'mcqAnswer', 'shuffleOptions', c)} /><Label className="text-sm text-orange-800">Shuffle</Label></div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {sub.mcqAnswer.options.map((opt, optIdx) => {
                                                                const isCorrect = sub.mcqAnswer!.correctOptions.includes(opt.id);
                                                                return (
                                                                    <div key={opt.id} className="flex gap-3 items-center group">
                                                                        <button onClick={() => toggleMcqCorrect(sub.id, opt.id)} className={`shrink-0 transition-colors p-1 rounded-full ${isCorrect ? 'text-green-600 bg-green-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}>{isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}</button>
                                                                        <Input value={opt.text} onChange={(e) => updateMcqOption(sub.id, opt.id, e.target.value)} className={`bg-white ${isCorrect ? 'border-green-400 ring-1 ring-green-400' : 'border-orange-200'}`} placeholder={`Option ${optIdx + 1}`}/>
                                                                        <button onClick={() => deleteMcqOption(sub.id, opt.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5" /></button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <Button onClick={() => addMcqOption(sub.id)} variant="outline" className="w-full border-dashed border-orange-300 text-orange-700 hover:bg-orange-50 mt-2"><Plus className="w-4 h-4 mr-2" /> Add Option</Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {activeStep.subQuestions.length > 0 && (
                            <Button onClick={addSubQuestion} className="w-full py-6 bg-slate-800 hover:bg-slate-900 text-white shadow-md"><Plus className="w-5 h-5 mr-2" /> Add New Sub-Question</Button>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <Button onClick={() => setActiveStepId(null)} className="bg-violet-600 text-white hover:bg-violet-700">Done Editing</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}