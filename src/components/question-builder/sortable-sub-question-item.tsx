'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Trash2, Copy, Plus, X, ChevronDown, ChevronRight, CheckCircle2, Circle
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { SubQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
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


export function SortableSubQuestionItem({ subQuestion, index, openSubId, setOpenSubId, updateSubQuestion, duplicateSubQuestion, deleteSubQuestion }: any) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: subQuestion.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const isOpen = openSubId === subQuestion.id;

    const toggleMcqCorrect = (subId: string, optId: string) => {
        const sq = subQuestion;
        if (sq.id === subId && sq.mcqAnswer) {
            const isMulti = sq.mcqAnswer.isMultiCorrect;
            let newCorrect = [...sq.mcqAnswer.correctOptions];
            if (isMulti) {
                newCorrect.includes(optId) ? newCorrect = newCorrect.filter(id => id !== optId) : newCorrect.push(optId);
            } else {
                newCorrect = [optId];
            }
            updateSubQuestion(subId, 'mcqAnswer', { ...sq.mcqAnswer, correctOptions: newCorrect });
        }
    };
    const updateMcqOption = (subId: string, optId: string, text: string) => {
        const sq = subQuestion;
        if (sq.id === subId && sq.mcqAnswer) {
            updateSubQuestion(subId, 'mcqAnswer', {
                ...sq.mcqAnswer,
                options: sq.mcqAnswer.options.map(o => o.id === optId ? { ...o, text } : o)
            });
        }
    };
    const deleteMcqOption = (subId: string, optId: string) => {
        const sq = subQuestion;
        if (sq.id === subId && sq.mcqAnswer) {
            updateSubQuestion(subId, 'mcqAnswer', {
                ...sq.mcqAnswer,
                options: sq.mcqAnswer.options.filter(o => o.id !== optId),
                correctOptions: sq.mcqAnswer.correctOptions.filter(id => id !== optId)
            });
        }
    };
    const addMcqOption = (subId: string) => {
        const sq = subQuestion;
        if (sq.id === subId && sq.mcqAnswer) {
            updateSubQuestion(subId, 'mcqAnswer', {
                ...sq.mcqAnswer,
                options: [...sq.mcqAnswer.options, { id: uuidv4(), text: '' }]
            });
        }
    };
    const updateNested = (subId: string, type: 'numericalAnswer'|'mcqAnswer', field: string, val: any) => {
        const sq = subQuestion;
        if (sq.id === subId) {
            updateSubQuestion(subId, type, { ...sq[type] as any, [field]: val });
        }
    };


    return (
        <div ref={setNodeRef} style={style} className="bg-white rounded-lg border shadow-sm transition-all duration-200 overflow-hidden" onClick={() => setOpenSubId(isOpen ? null : subQuestion.id)}>
            <div className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 ${isOpen ? 'border-b bg-slate-50/50' : ''}`}>
                <div {...attributes} {...listeners} className="text-slate-400 cursor-grab" onClick={(e) => e.stopPropagation()}><GripVertical className="w-5 h-5"/></div>
                <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${!subQuestion.questionText || subQuestion.questionText === '<p><br></p>' ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                        {getPlainText(subQuestion.questionText) || `Sub-Question ${index + 1}`}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${
                        subQuestion.answerType === 'numerical' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                    }`}>
                        {subQuestion.answerType}
                    </span>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <div className="flex items-center text-slate-400">
                        <button type="button" onClick={(e) => { e.stopPropagation(); duplicateSubQuestion(subQuestion.id, e); }} className="p-1.5 hover:bg-slate-100 hover:text-slate-600 rounded" title="Duplicate"><Copy className="w-4 h-4" /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); deleteSubQuestion(subQuestion.id, e); }} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="text-slate-400">
                        {isOpen ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="p-6 space-y-6 bg-white animate-in slide-in-from-top-1" onClick={(e) => e.stopPropagation()}>
                    <CollapsibleEditor 
                        label="Question Text"
                        value={subQuestion.questionText}
                        onChange={(val) => updateSubQuestion(subQuestion.id, 'questionText', val)}
                        defaultOpen={true}
                    />
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase">Answer Type</Label>
                            <Select value={subQuestion.answerType} onValueChange={(val)=>updateSubQuestion(subQuestion.id,'answerType',val)}>
                                <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="numerical">Numerical</SelectItem>
                                    <SelectItem value="mcq">MCQ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase">Marks</Label>
                            <Input type="number" min={1} value={subQuestion.marks} onChange={(e)=>updateSubQuestion(subQuestion.id,'marks',parseInt(e.target.value)||0)}/>
                        </div>
                    </div>
                    
                     <div className={`rounded-lg p-5 border ${subQuestion.answerType === 'numerical' ? 'bg-violet-50/50 border-violet-100' : 'bg-orange-50/50 border-orange-100'}`}>
                        <h5 className={`text-xs font-bold uppercase mb-4 border-b pb-2 ${subQuestion.answerType === 'numerical' ? 'text-violet-700 border-violet-200' : 'text-orange-700 border-orange-200'}`}>
                            {subQuestion.answerType === 'numerical' ? 'Numerical Answer Settings' : 'MCQ Options & Settings'}
                        </h5>
                        {subQuestion.answerType === 'numerical' && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1"><Label className="text-xs text-violet-600">Correct Value</Label><Input type="number" value={subQuestion.numericalAnswer?.correctValue ?? 0} onChange={(e)=>updateNested(subQuestion.id,'numericalAnswer','correctValue',parseFloat(e.target.value))} className="bg-white border-violet-200"/></div>
                                <div className="space-y-1"><Label className="text-xs text-violet-600">Tolerance (±)</Label><Input type="number" value={subQuestion.numericalAnswer?.toleranceValue ?? 0} onChange={(e)=>updateNested(subQuestion.id,'numericalAnswer','toleranceValue',parseFloat(e.target.value))} className="bg-white border-violet-200"/></div>
                                <div className="space-y-1"><Label className="text-xs text-violet-600">Base Unit <span className="text-red-400">*</span></Label><Input value={subQuestion.numericalAnswer?.baseUnit || ''} onChange={(e)=>updateNested(subQuestion.id,'numericalAnswer','baseUnit',e.target.value)} placeholder="e.g. N" className="bg-white border-violet-200"/></div>
                            </div>
                        )}
                        {subQuestion.answerType === 'mcq' && subQuestion.mcqAnswer && (
                            <div className="space-y-5">
                                <div className="flex gap-6 p-3 bg-orange-100/50 rounded-md">
                                    <div className="flex items-center gap-2"><Switch checked={subQuestion.mcqAnswer.isMultiCorrect} onCheckedChange={(c) => updateNested(subQuestion.id, 'mcqAnswer', 'isMultiCorrect', c)} /><Label className="text-sm text-orange-800">Multi-Select</Label></div>
                                    <div className="flex items-center gap-2"><Switch checked={subQuestion.mcqAnswer.shuffleOptions} onCheckedChange={(c) => updateNested(subQuestion.id, 'mcqAnswer', 'shuffleOptions', c)} /><Label className="text-sm text-orange-800">Shuffle</Label></div>
                                </div>
                                <div className="space-y-3">
                                    {subQuestion.mcqAnswer.options.map((opt, optIdx) => {
                                        const isCorrect = subQuestion.mcqAnswer!.correctOptions.includes(opt.id);
                                        return (
                                            <div key={opt.id} className="flex gap-3 items-center group">
                                                <button type="button" onClick={() => toggleMcqCorrect(subQuestion.id, opt.id)} className={`shrink-0 transition-colors p-1 rounded-full ${isCorrect ? 'text-green-600 bg-green-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}>{isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}</button>
                                                <Input value={opt.text} onChange={(e) => updateMcqOption(subQuestion.id, opt.id, e.target.value)} className={`bg-white ${isCorrect ? 'border-green-400 ring-1 ring-green-400' : 'border-orange-200'}`} placeholder={`Option ${optIdx + 1}`}/>
                                                <button type="button" onClick={() => deleteMcqOption(subQuestion.id, opt.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5" /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <Button type="button" onClick={() => addMcqOption(subQuestion.id)} variant="outline" className="w-full border-dashed border-orange-300 text-orange-700 hover:bg-orange-50 mt-2"><Plus className="w-4 h-4 mr-2" /> Add Option</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
