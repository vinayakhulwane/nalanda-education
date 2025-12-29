'use client';

import React, { useEffect } from 'react';
import { Question } from "@/types";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Scale, BrainCircuit, CheckSquare, Calculator, Bot } from 'lucide-react';

interface Step4Props {
  question: Question;
  setQuestion: React.Dispatch<React.SetStateAction<Question>>;
}

// 1. RUBRIC CONFIG
const RUBRIC_KEYS = [
  { key: 'problemUnderstanding', label: 'Problem Understanding', desc: 'Identify knowns/unknowns' },
  { key: 'formulaSelection', label: 'Formula Selection', desc: 'Correct physics equations' },
  { key: 'substitution', label: 'Substitution', desc: 'Correct input values' },
  { key: 'calculationAccuracy', label: 'Calculation', desc: 'Arithmetic correctness' },
  { key: 'finalAnswer', label: 'Final Answer', desc: 'Value & significant figures' },
  { key: 'presentationClarity', label: 'Presentation', desc: 'Units & logical steps' },
] as const;

// 2. FEEDBACK PATTERN CONFIG
const FEEDBACK_PATTERNS = [
  "Given-Required Mapping",
  "Step Sequence / Method Flow",
  "Units & Dimensions",
  "Final Answer Presentation",
  "Conceptual Misconception",
  "Arithmetic / Calculation Mistake",
  "Common Pitfalls",
  "Next Steps / Further Learning"
];

export function Step4Grading({ question, setQuestion }: Step4Props) {
  
  // Initialize Default State
  useEffect(() => {
    if (!question.aiRubric) {
      setQuestion(prev => ({
        ...prev,
        aiRubric: {
          problemUnderstanding: 20,
          formulaSelection: 20,
          substitution: 20,
          calculationAccuracy: 20,
          finalAnswer: 10,
          presentationClarity: 10
        },
        aiFeedbackPatterns: prev.aiFeedbackPatterns || (FEEDBACK_PATTERNS as any)
      }));
    }
  }, [question.aiRubric, setQuestion]);

  if (!question.aiRubric) return null;

  const isAiGraded = question.gradingMode === 'ai';

  // --- HANDLERS ---

  const toggleGradingMode = (enabled: boolean) => {
    setQuestion(prev => ({ ...prev, gradingMode: enabled ? 'ai' : 'system' }));
  };

  const toggleFeedbackPattern = (pattern: string) => {
    setQuestion(prev => {
        const current = prev.aiFeedbackPatterns || [];
        // @ts-ignore
        const exists = current.includes(pattern);
        return {
            ...prev,
            aiFeedbackPatterns: (exists 
                ? current.filter(p => p !== pattern) 
                : [...current, pattern]) as any      
        };
    });
  };

  const applyPreset = (type: 'strict' | 'balanced' | 'lenient') => {
    let newRubric = { ...question.aiRubric! };
    if (type === 'strict') {
      newRubric = { problemUnderstanding: 10, formulaSelection: 10, substitution: 10, calculationAccuracy: 40, finalAnswer: 20, presentationClarity: 10 };
    } else if (type === 'balanced') {
      newRubric = { problemUnderstanding: 20, formulaSelection: 20, substitution: 20, calculationAccuracy: 20, finalAnswer: 10, presentationClarity: 10 };
    } else if (type === 'lenient') {
      newRubric = { problemUnderstanding: 30, formulaSelection: 30, substitution: 20, calculationAccuracy: 10, finalAnswer: 5, presentationClarity: 5 };
    }
    setQuestion(prev => ({ ...prev, aiRubric: newRubric }));
  };

  // --- 🧠 AUTO-BALANCING ALGORITHM ---
  const updateRubricSmart = (activeKey: string, newValue: number) => {
    setQuestion(prev => {
        const currentRubric = { ...prev.aiRubric! } as any;
        const oldValue = currentRubric[activeKey];
        const difference = newValue - oldValue;

        if (difference === 0) return prev;

        // 1. Update active key
        currentRubric[activeKey] = newValue;

        // 2. Distribute difference
        const otherKeys = RUBRIC_KEYS.filter(k => k.key !== activeKey).map(k => k.key);
        const otherSum = otherKeys.reduce((sum, key) => sum + currentRubric[key], 0);

        let remainingToDistribute = -difference;

        if (otherSum === 0) {
             const firstKey = otherKeys[0];
             currentRubric[firstKey] = Math.max(0, currentRubric[firstKey] + remainingToDistribute);
        } else {
            otherKeys.forEach((key, idx) => {
                if (idx === otherKeys.length - 1) {
                    currentRubric[key] = Math.max(0, currentRubric[key] + remainingToDistribute);
                } else {
                    const ratio = currentRubric[key] / otherSum;
                    const adjustment = Math.round(remainingToDistribute * ratio);
                    currentRubric[key] = Math.max(0, currentRubric[key] + adjustment);
                    remainingToDistribute -= adjustment;
                }
            });
        }

        // 3. Force 100% check
        const newTotal = Object.values(currentRubric).reduce((a:any, b:any) => a + b, 0);
        if (newTotal !== 100) {
             const drift = 100 - (newTotal as number);
             const largestKey = otherKeys.reduce((a, b) => currentRubric[a] > currentRubric[b] ? a : b);
             currentRubric[largestKey] += drift;
        }

        return { ...prev, aiRubric: currentRubric };
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* HEADER & TOGGLE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 gap-4">
        <div>
            <h2 className="text-xl font-bold text-slate-800">Grading Configuration</h2>
            <p className="text-sm text-slate-500">Choose between strict system grading or advanced AI evaluation.</p>
        </div>
        
        {/* ✅ REVERTED: Standard Switch Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border">
            <span className={`text-sm font-semibold transition-colors ${!isAiGraded ? 'text-violet-600' : 'text-slate-400'}`}>System</span>
            <Switch 
                checked={isAiGraded} 
                onCheckedChange={toggleGradingMode}
                className="data-[state=checked]:bg-violet-600"
            />
            <span className={`text-sm font-semibold transition-colors ${isAiGraded ? 'text-violet-600' : 'text-slate-400'}`}>AI Graded</span>
        </div>
      </div>

      {/* SYSTEM GRADING MESSAGE */}
      {!isAiGraded && (
          <Card className="p-12 text-center border-dashed border-2 bg-slate-50/50 animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <Calculator className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Strict System Grading</h3>
              <p className="text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                  The system will grade answers strictly based on exact matches. 
                  <br/>Perfect for objective questions where partial credit is not needed.
              </p>
          </Card>
      )}

      {/* AI CONFIGURATION PANEL */}
      {isAiGraded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            
            {/* LEFT COLUMN: RUBRIC SLIDERS */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-violet-600" />
                        <h3 className="font-bold text-slate-700">Scoring Rubric</h3>
                    </div>
                    {/* Presets */}
                    <div className="flex gap-1">
                        <button onClick={() => applyPreset('strict')} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide border rounded hover:bg-violet-50 text-slate-500 hover:text-violet-700 transition-colors">Strict</button>
                        <button onClick={() => applyPreset('balanced')} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide border rounded hover:bg-violet-50 text-slate-500 hover:text-violet-700 transition-colors">Balanced</button>
                        <button onClick={() => applyPreset('lenient')} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide border rounded hover:bg-violet-50 text-slate-500 hover:text-violet-700 transition-colors">Conceptual</button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                    {RUBRIC_KEYS.map((item) => {
                        const val = (question.aiRubric as any)[item.key];
                        return (
                            // ✅ SINGLE ROW LAYOUT: Label - Slider - Badge
                            <div key={item.key} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
                                
                                {/* 1. Label Section (Fixed Width) */}
                                <div className="w-1/3 min-w-[140px]">
                                    <Label className="text-sm font-bold text-slate-700 block mb-0.5">{item.label}</Label>
                                    <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
                                </div>

                                {/* 2. Slider Section (Flexible) */}
                                <div className="flex-1 px-2">
                                    <Slider 
                                        value={[val]} 
                                        max={100} 
                                        step={1} 
                                        onValueChange={(v) => updateRubricSmart(item.key, v[0])}
                                        className="py-2"
                                    />
                                </div>

                                {/* 3. Percentage Badge */}
                                <div className="w-12 text-right">
                                    <span className={`text-sm font-bold px-2 py-1 rounded-md ${val > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {val}%
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>


            {/* RIGHT COLUMN: FEEDBACK PATTERNS */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-violet-600" />
                    <h3 className="font-bold text-slate-700">Feedback Focus</h3>
                </div>

                <Card className="p-6 border-slate-200 shadow-sm bg-white h-fit">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {FEEDBACK_PATTERNS.map((pattern) => {
                            // @ts-ignore
                            const isChecked = (question.aiFeedbackPatterns || []).includes(pattern);
                            return (
                                <div 
                                    key={pattern} 
                                    onClick={() => toggleFeedbackPattern(pattern)}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                        isChecked 
                                        ? 'bg-violet-50 border-violet-200 shadow-sm ring-1 ring-violet-200' 
                                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                                        isChecked ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-300'
                                    }`}>
                                        {isChecked && <CheckSquare className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={`text-xs font-bold leading-tight ${isChecked ? 'text-violet-900' : 'text-slate-600'}`}>
                                        {pattern}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
                
                {/* Persona Preview */}
                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <Bot className="w-5 h-5 text-violet-200" />
                        <h4 className="font-bold text-sm uppercase tracking-wider text-violet-200">AI Persona Preview</h4>
                    </div>
                    <p className="text-white font-medium text-lg leading-snug">
                        "I will grade as a <span className="text-yellow-300">{(question.aiRubric as any).calculationAccuracy > 30 ? 'Strict Examiner' : 'Supportive Coach'}</span>, 
                        focusing heavily on <span className="underline decoration-yellow-400/50 underline-offset-4">{(question.aiRubric as any).problemUnderstanding > 20 ? 'Concepts' : 'Results'}</span>."
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
