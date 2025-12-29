'use client';

import React from 'react';
import { Question } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, Bot, FileText, Layers, 
  Hash, ListChecks, CheckCircle2 
} from 'lucide-react';

interface Step5Props {
  question: Question;
}

export function Step5Preview({ question }: Step5Props) {
  
  const isAiGraded = question.gradingMode === 'ai';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* HEADER SUMMARY */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-slate-500 border-slate-300">
              {question.currencyType.toUpperCase()} REWARD
            </Badge>
            {isAiGraded ? (
              <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-200 border-violet-200 gap-1">
                <Bot className="w-3 h-3" /> AI Graded
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 gap-1">
                <Calculator className="w-3 h-3" /> System Graded
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{question.name || 'Untitled Question'}</h1>
          <p className="text-slate-500 text-sm mt-1">ID: <span className="font-mono text-xs">{question.id}</span></p>
        </div>
      </div>

      {/* PROBLEM STATEMENT CARD */}
      <Card className="p-8 shadow-sm border-slate-200">
        <div className="flex items-center gap-2 mb-4 text-slate-400 uppercase tracking-wider text-xs font-bold">
            <FileText className="w-4 h-4" /> Problem Statement
        </div>
        <div 
            className="prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-bold text-lg text-slate-800"
            dangerouslySetInnerHTML={{ __html: question.mainQuestionText }}
        />
      </Card>

      {/* SOLUTION PATH (Visualizing the Steps) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <Layers className="w-5 h-5 text-violet-600" />
            <h3>Solution Path (Teacher Key)</h3>
        </div>

        <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pl-8 py-2">
            {question.solutionSteps.map((step, index) => (
                <div key={step.id} className="relative">
                    {/* Step Number Badge */}
                    <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-white border-2 border-violet-600 text-violet-600 flex items-center justify-center text-xs font-bold z-10 shadow-sm">
                        {index + 1}
                    </div>

                    <div className="mb-4">
                        <h4 className="text-lg font-bold text-slate-800">{step.title}</h4>
                        {step.stepQuestion && (
                            <div className="text-slate-500 mt-1 text-sm italic" dangerouslySetInnerHTML={{ __html: step.stepQuestion }} />
                        )}
                    </div>

                    {/* Sub-Questions Grid */}
                    <div className="grid gap-4">
                        {step.subQuestions.map((sub) => (
                            <Card key={sub.id} className="p-4 bg-slate-50/50 border-slate-200 hover:border-violet-200 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        {/* Metadata Row */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="secondary" className="bg-white border-slate-200 text-slate-500 text-[10px] h-5 px-1.5">
                                                {sub.answerType === 'numerical' ? <Hash className="w-3 h-3 mr-1"/> : <ListChecks className="w-3 h-3 mr-1"/>}
                                                {sub.answerType.toUpperCase()}
                                            </Badge>
                                            <span className="text-xs font-bold text-slate-400">({sub.marks} Mark{sub.marks > 1 ? 's' : ''})</span>
                                        </div>
                                        
                                        {/* Question Text */}
                                        <div className="text-sm font-medium text-slate-700 mb-3" dangerouslySetInnerHTML={{ __html: sub.questionText }} />
                                        
                                        {/* CORRECT ANSWER PREVIEW (The "Key") */}
                                        <div className="text-xs bg-white p-2 rounded border border-slate-200 inline-flex items-center gap-2 shadow-sm">
                                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                                            <span className="font-bold text-slate-500 uppercase">Answer:</span>
                                            {sub.answerType === 'numerical' ? (
                                                <span className="font-mono text-violet-700 font-bold">
                                                    {sub.numericalAnswer?.correctValue} 
                                                    <span className="text-slate-400 ml-1">{sub.numericalAnswer?.baseUnit}</span>
                                                </span>
                                            ) : (
                                                <span className="font-mono text-orange-600 font-bold">
                                                    {sub.mcqAnswer?.options.find(o => sub.mcqAnswer?.correctOptions.includes(o.id))?.text || 'Invalid Option'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* GRADING LOGIC SUMMARY */}
      <div className="bg-slate-900 text-slate-300 rounded-xl p-6 mt-8">
        <h4 className="text-white font-bold flex items-center gap-2 mb-4">
            {isAiGraded ? <Bot className="w-5 h-5" /> : <Calculator className="w-5 h-5" />}
            {isAiGraded ? "AI Grading Configuration" : "System Grading Logic"}
        </h4>
        
        {isAiGraded ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                    <span className="block text-xs text-slate-500 uppercase mb-1">Calculation</span>
                    <span className="text-white font-mono font-bold">{(question.aiRubric as any)?.calculationAccuracy}%</span>
                </div>
                <div>
                    <span className="block text-xs text-slate-500 uppercase mb-1">Concepts</span>
                    <span className="text-white font-mono font-bold">{(question.aiRubric as any)?.problemUnderstanding}%</span>
                </div>
                <div>
                    <span className="block text-xs text-slate-500 uppercase mb-1">Method</span>
                    <span className="text-white font-mono font-bold">{(question.aiRubric as any)?.formulaSelection}%</span>
                </div>
                 <div>
                    <span className="block text-xs text-slate-500 uppercase mb-1">Feedback</span>
                    <span className="text-white font-mono font-bold">{question.aiFeedbackPatterns?.length || 0} Patterns</span>
                </div>
            </div>
        ) : (
            <p className="text-sm opacity-80">
                Grading is strictly based on exact matches. Numerical answers must be within the defined tolerance. MCQ options must match exactly.
            </p>
        )}
      </div>
    </div>
  );
}
