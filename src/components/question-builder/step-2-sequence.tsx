'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Trash2, CheckCircle2, Circle, 
  ChevronDown, ChevronRight, Copy, ArrowUp, ArrowDown, X, Eye, EyeOff
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Question, SolutionStep, SubQuestion } from "@/types";
import { RichTextEditor } from '../rich-text-editor';
import { Card } from '../ui/card';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSubQuestionItem } from './sortable-sub-question-item';

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
      <div className="flex items-center gap-2">
        <Button
          type="button" 
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
          title={isOpen ? "Hide Editor" : "Show Editor"}
        >
          {isOpen ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
        <Label className="text-xs font-semibold text-slate-500 uppercase">{label}</Label>
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


const getPlainText = (htmlString: string) => {
    if (typeof window !== 'undefined') {
        if (!htmlString) return '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        return tempDiv.textContent || tempDiv.innerText || '';
    }
    return (htmlString || "").replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
};


// --- MAIN COMPONENT ---
interface Step2Props {
  question: Question;
  setQuestion: React.Dispatch<React.SetStateAction<Question>>;
  focusStepId?: string | null;
  setFocusStepId?: (id: string | null) => void;
  onEditComplete?: () => void;
}

export function Step2Sequence({ 
  question, 
  setQuestion, 
  focusStepId, 
  setFocusStepId,
  onEditComplete 
}: Step2Props) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [openSubId, setOpenSubId] = useState<string | null>(null);

  // --- FOCUS LOGIC (FIXED) ---
  useEffect(() => {
    if (focusStepId) {
      setActiveStepId(focusStepId);
      // Optional: scroll into view
      // document.getElementById(`step-editor-${focusStepId}`)?.scrollIntoView({ behavior: 'smooth' });
      setFocusStepId?.(null); // Reset after focusing
    }
  }, [focusStepId, setFocusStepId]);

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
    e.preventDefault(); 
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this step?")) return;
    
    setQuestion(prev => ({ 
        ...prev, 
        solutionSteps: prev.solutionSteps.filter(s => s.id !== id) 
    }));
    
    if (activeStepId === id) setActiveStepId(null);
  };

  const moveStep = (idx: number, dir: 'up' | 'down', e: React.MouseEvent) => {
    e.preventDefault();
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

  const duplicateSubQuestion = (subId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!activeStepId) return;
    const subToCopy = question.solutionSteps.find(s => s.id === activeStepId)?.subQuestions.find(sq => sq.id === subId);
    if (!subToCopy) return;

    const newSub = { ...subToCopy, id: uuidv4() };
    setQuestion(prev => ({
        ...prev,
        solutionSteps: prev.solutionSteps.map(s => 
            s.id === activeStepId ? { ...s, subQuestions: [...s.subQuestions, newSub] } : s
        )
    }));
  };

  const deleteSubQuestion = (subId: string, e: React.MouseEvent) => {
    e.preventDefault();
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
  
  const handleSubQuestionDragEnd = (event: DragEndEvent) => {
    if (!activeStepId) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const activeStep = question.solutionSteps.find(s => s.id === activeStepId);
        if (!activeStep) return;

        const oldIndex = activeStep.subQuestions.findIndex(sq => sq.id === active.id);
        const newIndex = activeStep.subQuestions.findIndex(sq => sq.id === over.id);
        const reorderedSubQuestions = arrayMove(activeStep.subQuestions, oldIndex, newIndex);
        
        updateActiveStep('subQuestions', reorderedSubQuestions);
    }
  };

  const activeStep = question.solutionSteps.find(s => s.id === activeStepId);
  const cleanHtml = (html: string) => html.replace(/&nbsp;/g, ' ');

  return (
    <div className="relative min-h-[600px]">
      
      {/* --- MAIN CONTENT: FULL-WIDTH STEP SEQUENCE LIST --- */}
      <div className="space-y-6 pb-20">
        
        <Card className="p-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Main Question</h3>
            <div
              className="prose dark:prose-invert max-w-none break-words whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: cleanHtml(question.mainQuestionText) || '<p><em>Question text will appear here...</em></p>' }}
            />
        </Card>

        <div className="flex justify-between items-center border-b pb-4">
            <div>
                <h3 className="text-lg font-bold text-slate-800">Solution Sequence</h3>
                <p className="text-sm text-slate-500">Define the logical steps to solve the problem.</p>
            </div>
        </div>
        
        <div className="space-y-3">
            {question.solutionSteps.length === 0 && (
                <div className="text-center p-12 border-2 border-dashed rounded-lg bg-slate-50/50">
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
                             <button type="button" onClick={(e)=>moveStep(index, 'up', e)} disabled={index===0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                             <button type="button" onClick={(e)=>moveStep(index, 'down', e)} disabled={index===question.solutionSteps.length-1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
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
                                type="button"
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

            <Button onClick={addStep} className="w-full py-6 bg-violet-600 hover:bg-violet-700 text-white shadow-sm mt-4">
                <Plus className="w-5 h-5 mr-2" /> Add New Step
            </Button>
        </div>
      </div>


      {/* --- RIGHT-SIDE EDIT SHEET (MODAL) --- */}
      {activeStepId && activeStep && (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setActiveStepId(null)}></div>
            
            <div id={`step-editor-${activeStepId}`} className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl border-l flex flex-col animate-in slide-in-from-right sm:duration-300">
                <div className="flex items-center justify-between p-6 border-b bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Edit Step</h2>
                        <p className="text-sm text-slate-500">Configure content and sub-questions.</p>
                    </div>
                    <button type="button" onClick={() => setActiveStepId(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full">
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
                        
                        <DndContext collisionDetection={closestCenter} onDragEnd={handleSubQuestionDragEnd}>
                            <SortableContext items={activeStep.subQuestions.map(sq => sq.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-4">
                                {activeStep.subQuestions.map((sub, idx) => (
                                    <SortableSubQuestionItem
                                        key={sub.id}
                                        subQuestion={sub}
                                        index={idx}
                                        openSubId={openSubId}
                                        setOpenSubId={setOpenSubId}
                                        updateSubQuestion={updateSubQuestion}
                                        duplicateSubQuestion={duplicateSubQuestion}
                                        deleteSubQuestion={deleteSubQuestion}
                                    />
                                ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                        
                        {activeStep.subQuestions.length > 0 && (
                            <Button onClick={addSubQuestion} className="w-full py-6 bg-slate-800 hover:bg-slate-900 text-white shadow-md"><Plus className="w-5 h-5 mr-2" /> Add New Sub-Question</Button>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <Button 
                        onClick={() => { 
                            setActiveStepId(null); 
                            onEditComplete?.(); 
                        }} 
                        className="bg-violet-600 text-white hover:bg-violet-700"
                    >
                        Done Editing
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
