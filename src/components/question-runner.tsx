'use client';
import { useState, useMemo } from 'react';
import type { Question, SolutionStep, SubQuestion } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle, Download, XCircle } from 'lucide-react';
import { Separator } from './ui/separator';

type AnswerState = {
  [subQuestionId: string]: {
    answer: any;
    isCorrect?: boolean;
  };
};

type SubQuestionWithStep = SubQuestion & {
    stepId: string;
    stepTitle: string;
    stepObjective: string;
}

export function QuestionRunner({ question }: { question: Question }) {
  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerState>({});
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


  const isFinished = currentSubQuestionIndex >= allSubQuestions.length;

  const handleStart = () => {
    setHasStarted(true);
  };

  const handleSubmit = () => {
    const activeSubQuestion = allSubQuestions[currentSubQuestionIndex];
    if (!activeSubQuestion) return;

    let isCorrect = false;
    switch (activeSubQuestion.answerType) {
        case 'numerical':
            const studentValue = parseFloat(currentAnswer);
            const correctValue = activeSubQuestion.numericalAnswer?.correctValue ?? NaN;
            isCorrect = !isNaN(studentValue) && studentValue === correctValue;
            break;
        case 'mcq':
            const correctOptions = activeSubQuestion.mcqAnswer?.correctOptions || [];
            if(activeSubQuestion.mcqAnswer?.isMultiCorrect) {
                const studentAnswers = currentAnswer as string[] || [];
                isCorrect = studentAnswers.length === correctOptions.length && studentAnswers.every(id => correctOptions.includes(id));
            } else {
                isCorrect = currentAnswer === correctOptions[0];
            }
            break;
        // Basic text validation
        case 'text':
             const keywords = activeSubQuestion.textAnswer?.keywords || [];
             const studentText = (currentAnswer as string || '').toLowerCase();
             isCorrect = keywords.some(k => studentText.includes(k.toLowerCase()));
             break;
    }


    setAnswers(prev => ({
      ...prev,
      [activeSubQuestion.id]: { answer: currentAnswer, isCorrect },
    }));

    setCurrentAnswer(null); // Reset for next question
    setCurrentSubQuestionIndex(prev => prev + 1);
  };

  const renderAnswerInput = (subQ: SubQuestion, isSubmitted: boolean) => {
    const storedAnswer = answers[subQ.id]?.answer;
    const valueToDisplay = isSubmitted ? storedAnswer : currentAnswer;

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
                            <Label htmlFor={opt.id}>{opt.text}</Label>
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
                <Label htmlFor={opt.id}>{opt.text}</Label>
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
    // Replace non-breaking spaces with regular spaces
    return question.mainQuestionText.replace(/&nbsp;/g, ' ');
  }, [question.mainQuestionText]);

  if (isFinished) {
    const totalMarks = allSubQuestions.reduce((sum, q) => sum + q.marks, 0);
    const score = allSubQuestions.reduce((sum, q) => answers[q.id]?.isCorrect ? sum + q.marks : sum, 0);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>You have completed the question.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center">
                    <p className="text-muted-foreground">Your Score</p>
                    <p className="text-5xl font-bold">{score} / {totalMarks}</p>
                </div>
                 <Separator />
                <div className="space-y-4">
                    <h3 className="font-semibold">Answer Review</h3>
                    {allSubQuestions.map((subQ, index) => {
                        const result = answers[subQ.id];
                        return (
                            <div key={subQ.id} className="p-3 border rounded-md">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">Question {index + 1}</p>
                                        <div
                                            className="text-sm text-muted-foreground prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: subQ.questionText }}
                                        />
                                    </div>
                                    <div className={`flex items-center gap-2 font-semibold text-sm ${result?.isCorrect ? 'text-green-600' : 'text-destructive'}`}>
                                        {result?.isCorrect ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}
                                        {result?.isCorrect ? `${subQ.marks}/${subQ.marks}` : `0/${subQ.marks}`}
                                    </div>
                                </div>
                                {!result?.isCorrect && (
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

  let lastStepId = '';

  return (
    <div className="p-4 border rounded-lg bg-card text-card-foreground break-words space-y-6">
       <div className="p-4 rounded-lg bg-muted/50">
            <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: processedMainQuestionText }}
            />
       </div>
        
        {!hasStarted ? (
             <div className="flex justify-center pt-4 border-t">
                <Button onClick={handleStart}>Start Solving</Button>
            </div>
        ) : (
            <div className="space-y-6">
                {allSubQuestions.slice(0, currentSubQuestionIndex + 1).map((subQ, index) => {
                    const isNewStep = lastStepId !== subQ.stepId;
                    lastStepId = subQ.stepId;
                    const isCurrent = index === currentSubQuestionIndex;
                    const currentStepNumber = uniqueStepIds.indexOf(subQ.stepId) + 1;
                    
                    return (
                        <Card key={subQ.id} className="bg-muted/30">
                            {isNewStep && (
                                <CardHeader>
                                    <CardTitle className="text-lg font-headline">
                                        Step {currentStepNumber}: {subQ.stepTitle}
                                    </CardTitle>
                                    {subQ.stepObjective && (
                                        <CardDescription>{subQ.stepObjective}</CardDescription>
                                    )}
                                </CardHeader>
                            )}
                            <CardContent className={isNewStep ? 'pt-0' : 'pt-6'}>
                                <div className="p-4 border rounded-lg bg-card">
                                    <div
                                        className="prose dark:prose-invert max-w-none mb-4"
                                        dangerouslySetInnerHTML={{ __html: subQ.questionText }}
                                    />
                                    {renderAnswerInput(subQ, !isCurrent)}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {!isFinished && (
                    <div className="flex justify-end">
                        <Button onClick={handleSubmit}>Submit</Button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}
