'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Question, SubQuestion, SolutionStep } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle, XCircle } from 'lucide-react';
import { Separator } from './ui/separator';
import { CompletedSubQuestionSummary } from './question-runner/completed-summary';
import './question-runner/runner.css';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

type AnswerState = {
  [subQuestionId: string]: {
    answer: any;
  };
};

type ResultState = {
  [subQuestionId: string]: {
    isCorrect: boolean;
  }
}

type SubQuestionWithStep = SubQuestion & {
    stepId: string;
    stepTitle: string;
    stepObjective: string;
}

// --- Unit Conversion Utilities ---
const unitPrefixes: Record<string, number> = {
    'g': 1e9, 'm': 1e6, 'k': 1e3,
    'd': 1e-1, 'c': 1e-2, 'µ': 1e-6, 'u': 1e-6, 'n': 1e-9,
};

function parseUnitAndValue(input: string): { value: number, unit: string } | null {
    if (!input || typeof input !== 'string') return null;
    
    // Normalize input: trim whitespace
    const trimmedInput = input.trim();
    
    // Regex to separate the initial number from the rest of the string (the unit)
    const match = trimmedInput.match(/^(-?[\d.eE+-]+)\s*(.*)$/);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2]?.trim() || '';
    
    if(isNaN(value)) return null;
    
    return { value, unit };
}

function convertToBase(value: number, unit: string, baseUnit: string): number {
    // 1. Normalize inputs: trim, lowercase, and map % to "percent"
    let nUnit = unit.toLowerCase().trim();
    let nBase = baseUnit.toLowerCase().trim();
    
    if (nUnit === '%') nUnit = 'percent';
    if (nBase === '%') nBase = 'percent';
    
    // 2. "The Same" Rule: Allow empty units for 'unitless' OR 'percent'
    // This allows a student to just type "50" instead of "50%" or "50 percent"
    if (nUnit === '' && (nBase === '' || nBase === 'unitless' || nBase === 'percent')) {
        return value;
    }
    
    // 3. Direct Match (handles percent === percent or N === N)
    if (nUnit === nBase) return value;
    
    // 4. Prefix Logic (e.g., kN to N)
    // Ensure we don't try to prefix match empty strings or percentages
    if (nBase !== '' && nBase !== 'percent' && nUnit.endsWith(nBase)) {
      const prefix = nUnit.replace(nBase, '');
      if (prefix && unitPrefixes[prefix]) {
        return value * unitPrefixes[prefix];
      }
    }
    
    
    // If we have a base unit like 'kN' and student provides 'N'
    if (nUnit !== '' && nBase.endsWith(nUnit)) {
       const prefix = nBase.replace(nUnit, '');
       if (prefix && unitPrefixes[prefix]) {
          return value / unitPrefixes[prefix];
       }
    }
    
    return NaN;
}

interface QuestionRunnerProps {
  question: Question;
  onAnswerSubmit: (subQuestionId: string, answer: any) => void;
  onResultCalculated: (subQuestionId: string, isCorrect: boolean) => void;
  initialAnswers: AnswerState;
}

export function QuestionRunner({ question, onAnswerSubmit, onResultCalculated, initialAnswers }: QuestionRunnerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerState>(initialAnswers);
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);

  const allSubQuestions = useMemo((): SubQuestionWithStep[] => {
    return question.solutionSteps.flatMap(step => 
        step.subQuestions.map(subQ => ({
            ...subQ,
            stepId: step.id,
            stepTitle: step.title,
            stepObjective: step.stepQuestion,
        }))
    );
  }, [question.solutionSteps]);

  useEffect(() => {
    // When the question changes (i.e., we move to the next question in the worksheet),
    // reset the state for this runner instance.
    setHasStarted(false);
    setAnswers({});
    setCurrentSubQuestionIndex(0);
    setCurrentAnswer(null);
  }, [question.id]);

  const uniqueStepIds = useMemo(() => {
    const stepIds = new Set(question.solutionSteps.map(s => s.id));
    return Array.from(stepIds);
  }, [question.solutionSteps]);


  const completedQuestionsByStep = useMemo(() => {
    const completed = allSubQuestions.slice(0, currentSubQuestionIndex);
    return completed.reduce((acc, subQ) => {
        if (!acc[subQ.stepId]) {
            acc[subQ.stepId] = {
                title: subQ.stepTitle,
                objective: subQ.stepObjective,
                subQuestions: []
            };
        }
        acc[subQ.stepId].subQuestions.push(subQ);
        return acc;
    }, {} as Record<string, { title: string, objective: string, subQuestions: SubQuestionWithStep[] }>);
  }, [allSubQuestions, currentSubQuestionIndex]);


  const isFinished = currentSubQuestionIndex >= allSubQuestions.length;

  const handleStart = () => {
    setHasStarted(true);
  };


  const calculateResult = (subQ: SubQuestion, studentAnswer: any) => {
      let isCorrect = false;
      switch (subQ.answerType) {
          case 'numerical':
              const parsed = parseUnitAndValue(studentAnswer);
              const { baseUnit, correctValue, toleranceValue } = subQ.numericalAnswer || {};
              
              if (parsed && correctValue !== undefined) {
                  // Tolerance is often a percentage (e.g., 1%)
                  const tolerance = (toleranceValue ?? 0) / 100 * correctValue;
                  
                  // Pass the raw baseUnit to our new convertToBase
                  const studentValueInBase = convertToBase(
                      parsed.value, 
                      parsed.unit, 
                      baseUnit || 'unitless'
                  );
                  
                  if (!isNaN(studentValueInBase)) {
                      isCorrect = Math.abs(studentValueInBase - correctValue) <= tolerance;
                  }
              }
              break;
          case 'mcq':
              const correctOptions = subQ.mcqAnswer?.correctOptions || [];
              if(subQ.mcqAnswer?.isMultiCorrect) {
                  const studentAnswers = studentAnswer as string[] || [];
                  isCorrect = studentAnswers.length === correctOptions.length && studentAnswers.every(id => correctOptions.includes(id));
              } else {
                  isCorrect = studentAnswer === correctOptions[0];
              }
              break;
          case 'text':
              // ✅ FIXED: Cast subQ to any to access potentially missing 'textAnswer' property
              // and explicitly typed 'k' as string
              const keywords = (subQ as any).textAnswer?.keywords || [];
              const studentText = (studentAnswer as string || '').toLowerCase();
              isCorrect = keywords.some((k: string) => studentText.includes(k.toLowerCase()));
              break;
      }
      return isCorrect;
  }

  const handleSubmit = () => {
    const activeSubQuestion = allSubQuestions[currentSubQuestionIndex];
    if (!activeSubQuestion) return;

    const newAnswers = {
        ...answers,
        [activeSubQuestion.id]: { answer: currentAnswer },
    }
    setAnswers(newAnswers);
    onAnswerSubmit(activeSubQuestion.id, currentAnswer);

    const isCorrect = calculateResult(activeSubQuestion, currentAnswer);
    onResultCalculated(activeSubQuestion.id, isCorrect);
    
    setCurrentAnswer(null); // Reset for next question

    const nextIndex = currentSubQuestionIndex + 1;
    setCurrentSubQuestionIndex(nextIndex);
  };

  const renderAnswerInput = (subQ: SubQuestion, isSubmitted: boolean) => {
    const valueToDisplay = isSubmitted ? answers[subQ.id]?.answer : currentAnswer;

    switch (subQ.answerType) {
      case 'numerical':
        return (
          <Input
            type="number"
            inputMode="decimal"
            value={valueToDisplay ?? ''}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            disabled={isSubmitted}
            // ✅ FIX: Mobile responsive width
            className="w-full sm:w-1/2" 
          />
        );
      case 'mcq':
        if(subQ.mcqAnswer?.isMultiCorrect) {
            return (
                <div className="space-y-3"> {/* Increased gap for mobile touch targets */}
                    {(subQ.mcqAnswer?.options || []).map(opt => (
                        <div key={opt.id} className="flex items-start space-x-3"> {/* items-start aligns check with first line of text */}
                            <Checkbox
                                id={opt.id}
                                checked={(valueToDisplay as string[] || []).includes(opt.id)}
                                onCheckedChange={(checked) => {
                                    if(isSubmitted) return;
                                    const current = (currentAnswer as string[] || []);
                                    const newAnswer = checked ? [...current, opt.id] : current.filter(id => id !== opt.id);
                                    setCurrentAnswer(newAnswer);
                                }}
                                disabled={isSubmitted}
                                className="mt-1" // Align checkbox with text
                            />
                            <Label htmlFor={opt.id} className={`text-sm leading-relaxed ${isSubmitted ? 'text-muted-foreground' : ''}`}>
                                {opt.text}
                            </Label>
                        </div>
                    ))}
                </div>
            )
        }
        return (
          <RadioGroup
            value={valueToDisplay}
            onValueChange={setCurrentAnswer}
            disabled={isSubmitted}
            className="space-y-3"
          >
            {(subQ.mcqAnswer?.options || []).map(opt => (
              <div key={opt.id} className="flex items-start space-x-3">
                <RadioGroupItem value={opt.id} id={opt.id} className="mt-1" />
                <Label htmlFor={opt.id} className={`text-sm leading-relaxed ${isSubmitted ? 'text-muted-foreground' : ''}`}>
                    {opt.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'text':
        return (
          <Input
            type="text"
            value={valueToDisplay ?? ''}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            disabled={isSubmitted}
            // ✅ FIX: Mobile responsive width
            className="w-full sm:w-1/2" 
          />
        );
      default:
        return null;
    }
  };

  const processedMainQuestionText = useMemo(() => {
    if (!question?.mainQuestionText) return '';
    return question.mainQuestionText.replace(/&nbsp;/g, ' ');
  }, [question.mainQuestionText]);

  const activeSubQuestion = allSubQuestions[currentSubQuestionIndex];
  const lastStepId = currentSubQuestionIndex > 0 ? allSubQuestions[currentSubQuestionIndex - 1].stepId : null;
  const isNewStep = activeSubQuestion && activeSubQuestion.stepId !== lastStepId;
  const currentStepNumber = activeSubQuestion ? uniqueStepIds.indexOf(activeSubQuestion.stepId) + 1 : 0;


  if (isFinished) {
      return (
          <Card className="flex items-center justify-center h-full border-dashed min-h-[200px]">
            <CardContent className="text-center pt-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle>Question Complete</CardTitle>
                <CardDescription>You can proceed to the next question.</CardDescription>
            </CardContent>
          </Card>
      )
  }

  return (
    <div className="border rounded-lg bg-card text-card-foreground break-words space-y-6 overflow-hidden">
       {/* Main Question Text Block */}
       <div className="p-4 sm:p-6 bg-muted/30">
            {/* ✅ FIX: Added overflow container for content */}
            <div className="w-full overflow-x-auto">
                <div 
                    className="prose dark:prose-invert max-w-none min-w-0"
                    dangerouslySetInnerHTML={{ __html: processedMainQuestionText }} 
                />
            </div>
       </div>

       <div className="px-4 sm:px-6 pb-6">
            {!hasStarted ? (
                <div className="flex justify-center pt-4">
                    <Button onClick={handleStart} size="lg" className="w-full sm:w-auto">Start Solving</Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Completed Questions Summaries */}
                    {uniqueStepIds.map((stepId, index) => {
                        const stepData = completedQuestionsByStep[stepId];
                        if (!stepData) return null;
                        
                        return (
                            <div key={stepId} className="space-y-3">
                                <h4 className="font-semibold text-base sm:text-lg font-headline">Step {index + 1}. {stepData.title}</h4>
                                {stepData.subQuestions.map((subQ) => {
                                    const globalIndex = allSubQuestions.findIndex(q => q.id === subQ.id);
                                    return (
                                        <Collapsible key={subQ.id}>
                                            <CollapsibleTrigger asChild>
                                                <div className="cursor-pointer">
                                                    <CompletedSubQuestionSummary 
                                                        subQuestion={subQ}
                                                        answer={answers[subQ.id]?.answer}
                                                        index={globalIndex}
                                                    />
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <div className="p-4 border border-t-0 rounded-b-lg -mt-1 bg-slate-50/50 dark:bg-slate-900/50">
                                                    {/* ✅ FIX: Added overflow container */}
                                                    <div className="w-full overflow-x-auto mb-4">
                                                        <div 
                                                            className="prose dark:prose-invert max-w-none text-muted-foreground text-sm"
                                                            dangerouslySetInnerHTML={{ __html: subQ.questionText }} 
                                                        />
                                                    </div>
                                                    {renderAnswerInput(subQ, true)}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    )
                                })}
                            </div>
                        )
                    })}

                    {/* Active Question Card */}
                    {activeSubQuestion && (
                        <Card key={activeSubQuestion.id} className="bg-muted/30 runner-active-card border-l-4 border-l-primary">
                            {isNewStep && (
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base sm:text-lg font-headline">
                                        Step {currentStepNumber}: {activeSubQuestion.stepTitle}
                                    </CardTitle>
                                    {activeSubQuestion.stepObjective && (
                                        <CardDescription>{activeSubQuestion.stepObjective}</CardDescription>
                                    )}
                                </CardHeader>
                            )}
                            <CardContent className={isNewStep ? 'pt-2' : 'pt-6'}>
                                <div className="p-4 sm:p-5 border rounded-lg bg-card shadow-sm">
                                    {/* ✅ FIX: Added overflow container */}
                                    <div className="w-full overflow-x-auto mb-5">
                                        <div 
                                            className="prose dark:prose-invert max-w-none text-base"
                                            dangerouslySetInnerHTML={{ __html: activeSubQuestion.questionText }} 
                                        />
                                    </div>
                                    {renderAnswerInput(activeSubQuestion, false)}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!isFinished && (
                        <div className="flex justify-end mt-4">
                            <Button onClick={handleSubmit} size="lg" className="w-full sm:w-auto">Submit Answer</Button>
                        </div>
                    )}
                </div>
            )}
       </div>
    </div>
  );
}