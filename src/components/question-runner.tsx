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
               const keywords = subQ.textAnswer?.keywords || [];
               const studentText = (studentAnswer as string || '').toLowerCase();
               isCorrect = keywords.some(k => studentText.includes(k.toLowerCase()));
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
            className="w-full md:w-1/2"
          />
        );
      case 'mcq':
        if(subQ.mcqAnswer?.isMultiCorrect) {
             return (
                <div className="space-y-2">
                    {(subQ.mcqAnswer?.options || []).map(opt => (
                        <div key={opt.id} className="flex items-center space-x-2">
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
                            />
                            <Label htmlFor={opt.id} className={isSubmitted ? 'text-muted-foreground' : ''}>{opt.text}</Label>
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
            className="space-y-2"
          >
            {(subQ.mcqAnswer?.options || []).map(opt => (
              <div key={opt.id} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.id} id={opt.id} />
                <Label htmlFor={opt.id} className={isSubmitted ? 'text-muted-foreground' : ''}>{opt.text}</Label>
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
            className="w-full md:w-1/2"
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
          <Card className="flex items-center justify-center h-full border-dashed">
            <CardContent className="text-center pt-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle>Question Complete</CardTitle>
                <CardDescription>You can proceed to the next question.</CardDescription>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="p-4 border rounded-lg bg-card text-card-foreground break-words space-y-6">
       <div className="p-4 rounded-lg bg-muted/50">
            <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: processedMainQuestionText }}
            />
       </div>

       <Separator />
        
        {!hasStarted ? (
             <div className="flex justify-center pt-4">
                <Button onClick={handleStart}>Start Solving</Button>
            </div>
        ) : (
            <div className="space-y-4">
                {/* Completed Questions Summaries */}
                 {uniqueStepIds.map((stepId, index) => {
                     const stepData = completedQuestionsByStep[stepId];
                     if (!stepData) return null;
                     return (
                         <div key={stepId} className="space-y-2">
                            <h4 className="font-semibold text-lg font-headline">Step {index + 1}. {stepData.title}</h4>
                            {stepData.subQuestions.map((subQ) => {
                                const globalIndex = allSubQuestions.findIndex(q => q.id === subQ.id);
                                return (
                                    <Collapsible key={subQ.id}>
                                        <CollapsibleTrigger asChild>
                                             <div>
                                                <CompletedSubQuestionSummary 
                                                    subQuestion={subQ}
                                                    answer={answers[subQ.id]?.answer}
                                                    index={globalIndex}
                                                />
                                             </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="p-4 border border-t-0 rounded-b-lg -mt-1">
                                                <div
                                                    className="prose dark:prose-invert max-w-none mb-4 text-muted-foreground"
                                                    dangerouslySetInnerHTML={{ __html: subQ.questionText }}
                                                />
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
                     <Card key={activeSubQuestion.id} className="bg-muted/30 runner-active-card">
                        {isNewStep && (
                            <CardHeader>
                                <CardTitle className="text-lg font-headline">
                                    Step {currentStepNumber}: {activeSubQuestion.stepTitle}
                                </CardTitle>
                                {activeSubQuestion.stepObjective && (
                                    <CardDescription>{activeSubQuestion.stepObjective}</CardDescription>
                                )}
                            </CardHeader>
                        )}
                        <CardContent className={isNewStep ? 'pt-0' : 'pt-6'}>
                            <div className="p-4 border rounded-lg bg-card">
                                <div
                                    className="prose dark:prose-invert max-w-none mb-4"
                                    dangerouslySetInnerHTML={{ __html: activeSubQuestion.questionText }}
                                />
                                {renderAnswerInput(activeSubQuestion, false)}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!isFinished && (
                    <div className="flex justify-end mt-4">
                        <Button onClick={handleSubmit}>Submit</Button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}
