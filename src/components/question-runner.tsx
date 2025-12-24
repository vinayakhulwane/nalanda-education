'use client';
import { useState, useMemo } from 'react';
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

export function QuestionRunner({ question }: { question: Question }) {
  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [results, setResults] = useState<ResultState>({});
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
                subQuestions: []
            };
        }
        acc[subQ.stepId].subQuestions.push(subQ);
        return acc;
    }, {} as Record<string, { title: string, subQuestions: SubQuestionWithStep[] }>);
  }, [allSubQuestions, currentSubQuestionIndex]);


  const isFinished = currentSubQuestionIndex >= allSubQuestions.length;

  const handleStart = () => {
    setHasStarted(true);
  };
  
  const calculateResults = (finalAnswers: AnswerState) => {
    const newResults: ResultState = {};
    allSubQuestions.forEach(subQ => {
        const studentAnswer = finalAnswers[subQ.id]?.answer;
        let isCorrect = false;
        switch (subQ.answerType) {
            case 'numerical':
                const studentValue = parseFloat(studentAnswer);
                const correctValue = subQ.numericalAnswer?.correctValue ?? NaN;
                const tolerance = subQ.numericalAnswer?.toleranceValue ?? 0;
                // Basic tolerance for now, can be expanded
                isCorrect = !isNaN(studentValue) && Math.abs(studentValue - correctValue) <= (tolerance/100 * correctValue);
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
        newResults[subQ.id] = { isCorrect };
    });
    setResults(newResults);
  }

  const handleSubmit = () => {
    const activeSubQuestion = allSubQuestions[currentSubQuestionIndex];
    if (!activeSubQuestion) return;

    const newAnswers = {
        ...answers,
        [activeSubQuestion.id]: { answer: currentAnswer },
    }
    setAnswers(newAnswers);

    setCurrentAnswer(null); // Reset for next question
    
    const nextIndex = currentSubQuestionIndex + 1;
    setCurrentSubQuestionIndex(nextIndex);

    // If this was the last question, calculate all results
    if (nextIndex >= allSubQuestions.length) {
      calculateResults(newAnswers);
    }
  };

  const renderAnswerInput = (subQ: SubQuestion, isSubmitted: boolean) => {
    const valueToDisplay = isSubmitted ? answers[subQ.id]?.answer : currentAnswer;

    switch (subQ.answerType) {
      case 'numerical':
        return (
          <Input
            type="number"
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

  const getCorrectAnswerText = (subQ: SubQuestion) => {
    switch (subQ.answerType) {
        case 'numerical': return subQ.numericalAnswer?.correctValue.toString() || 'N/A';
        case 'text': return subQ.textAnswer?.keywords.join(', ') || 'N/A';
        case 'mcq':
            return subQ.mcqAnswer?.options
                .filter(opt => subQ.mcqAnswer?.correctOptions.includes(opt.id))
                .map(opt => opt.text).join(', ') || 'N/A';
        default: return 'N/A';
    }
  }

  const processedMainQuestionText = useMemo(() => {
    if (!question?.mainQuestionText) return '';
    return question.mainQuestionText.replace(/&nbsp;/g, ' ');
  }, [question.mainQuestionText]);

  const activeSubQuestion = allSubQuestions[currentSubQuestionIndex];
  const lastStepId = currentSubQuestionIndex > 0 ? allSubQuestions[currentSubQuestionIndex - 1].stepId : null;
  const isNewStep = activeSubQuestion && activeSubQuestion.stepId !== lastStepId;
  const currentStepNumber = activeSubQuestion ? uniqueStepIds.indexOf(activeSubQuestion.stepId) + 1 : 0;
  
  if (isFinished) {
    const totalMarks = allSubQuestions.reduce((sum, q) => sum + q.marks, 0);
    const score = allSubQuestions.reduce((sum, q) => results[q.id]?.isCorrect ? sum + q.marks : sum, 0);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>You have completed the question.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="p-4 rounded-lg bg-muted/50 break-words">
                    <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: processedMainQuestionText }}
                    />
                </div>
                 <Separator />
                <div className="text-center">
                    <p className="text-muted-foreground">Your Score</p>
                    <p className="text-5xl font-bold">{score} / {totalMarks}</p>
                </div>
                 <Separator />
                <div className="space-y-4">
                    <h3 className="font-semibold">Answer Review</h3>
                    {allSubQuestions.map((subQ, index) => {
                        const result = results[subQ.id];
                        const isCorrect = result?.isCorrect;
                        return (
                            <div key={subQ.id} className="p-3 border rounded-md">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div
                                            className="text-sm prose-sm dark:prose-invert max-w-none mb-2"
                                            dangerouslySetInnerHTML={{ __html: subQ.questionText }}
                                        />
                                    </div>
                                    <div className={`flex items-center gap-2 font-semibold text-sm ${isCorrect ? 'text-green-600' : 'text-destructive'}`}>
                                        {isCorrect ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}
                                        {isCorrect ? `${subQ.marks}/${subQ.marks}` : `0/${subQ.marks}`}
                                    </div>
                                </div>
                                {!isCorrect && (
                                     <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted rounded">
                                        Correct Answer: <span className="font-semibold">{getCorrectAnswerText(subQ)}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
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
                 {Object.entries(completedQuestionsByStep).map(([stepId, stepData], stepIndex) => (
                    <div key={stepId} className="space-y-2">
                        <h4 className="font-semibold text-lg font-headline">Step {uniqueStepIds.indexOf(stepId) + 1}. {stepData.title}</h4>
                        {stepData.subQuestions.map((subQ, subQIndex) => {
                             const globalIndex = allSubQuestions.findIndex(q => q.id === subQ.id);
                             return (
                                <Collapsible key={subQ.id}>
                                    <CollapsibleTrigger className="w-full">
                                        <CompletedSubQuestionSummary 
                                            subQuestion={subQ}
                                            answer={answers[subQ.id]?.answer}
                                            index={globalIndex}
                                        />
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
                ))}


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
