'use client';
import type { Question, SubQuestion, Worksheet, CurrencyType } from "@/types";
import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { Timer, CheckCircle, XCircle, Award, Sparkles, Coins, Crown, Gem, Home } from "lucide-react";

export type AnswerState = { [subQuestionId: string]: { answer: any } };
export type ResultState = { [subQuestionId: string]: { isCorrect: boolean } };

interface WorksheetResultsProps {
  worksheet: Worksheet;
  questions: Question[];
  answers: AnswerState;
  results: ResultState;
  timeTaken: number;
}

const currencyIcons: Record<CurrencyType, React.ElementType> = {
  spark: Sparkles,
  coin: Coins,
  gold: Crown,
  diamond: Gem,
};


const getAnswerText = (subQuestion: SubQuestion, answer: any) => {
    if (answer === null || answer === undefined || answer === '') return 'Not Answered';
    switch (subQuestion.answerType) {
        case 'numerical':
        case 'text':
            return answer.toString();
        case 'mcq':
            const optionMap = new Map(subQuestion.mcqAnswer?.options.map(o => [o.id, o.text]));
            if (subQuestion.mcqAnswer?.isMultiCorrect) {
                const answers = (answer as string[] || []);
                if (answers.length === 0) return 'Not Answered';
                return answers.map(id => optionMap.get(id)).join(', ');
            }
            return optionMap.get(answer) || 'N/A';
        default:
            return 'N/A';
    }
}

const getCorrectAnswerText = (subQ: SubQuestion) => {
    switch (subQ.answerType) {
        case 'numerical':
             const { correctValue, baseUnit } = subQ.numericalAnswer || {};
             if (!baseUnit || baseUnit.toLowerCase() === 'unitless') {
                return `${correctValue ?? 'N/A'}`;
             }
             return `${correctValue ?? 'N/A'}${baseUnit ? ` ${baseUnit}` : ''}`;
        case 'text': return subQ.textAnswer?.keywords.join(', ') || 'N/A';
        case 'mcq':
            return subQ.mcqAnswer?.options
                .filter(opt => subQ.mcqAnswer?.correctOptions.includes(opt.id))
                .map(opt => opt.text).join(', ') || 'N/A';
        default: return 'N/A';
    }
}


export function WorksheetResults({
  worksheet,
  questions,
  answers,
  results,
  timeTaken,
}: WorksheetResultsProps) {
  const router = useRouter();

  const { totalMarks, score, rewards } = useMemo(() => {
    let totalMarks = 0;
    let score = 0;
    const rewards: Record<CurrencyType, number> = { spark: 0, coin: 0, gold: 0, diamond: 0 };
    
    questions.forEach(q => {
        q.solutionSteps.forEach(step => {
            step.subQuestions.forEach(subQ => {
                totalMarks += subQ.marks;
                if(results[subQ.id]?.isCorrect) {
                    score += subQ.marks;
                    // For simplicity, let's say each correct subquestion gives 1 of the currency type
                    rewards[q.currencyType] = (rewards[q.currencyType] || 0) + 1;
                }
            })
        })
    })

    return { totalMarks, score, rewards };
  }, [questions, results]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl text-center">Worksheet Complete!</CardTitle>
          <CardDescription className="text-center">{worksheet.title}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center my-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                    <Timer className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-2xl font-bold mt-2">{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</p>
                    <p className="text-xs text-muted-foreground">Time Taken</p>
                </div>
                 <div className="p-4 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-2xl font-bold mt-2">{score} / {totalMarks}</p>
                    <p className="text-xs text-muted-foreground">Marks Scored</p>
                </div>
                 <div className="p-4 bg-muted/50 rounded-lg">
                    <Award className="h-6 w-6 mx-auto text-muted-foreground" />
                    <div className="flex justify-center items-center gap-3 mt-2">
                        {Object.entries(rewards).map(([currency, amount]) => {
                            if (amount === 0) return null;
                            const Icon = currencyIcons[currency as CurrencyType];
                            return (
                                <div key={currency} className="flex items-center gap-1 font-bold">
                                    <Icon className="h-5 w-5" />
                                    <span>{amount}</span>
                                </div>
                            )
                        })}
                         {Object.values(rewards).every(a => a === 0) && <p className="text-2xl font-bold">0</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">Rewards Earned</p>
                </div>
            </div>
            
            <Separator className="my-8" />
            
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-center">Question Review</h3>
                 {questions.map((question, qIndex) => (
                    <div key={question.id}>
                        <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded-t-lg">
                           <div className="flex gap-2">
                             <span className="font-bold">Q{qIndex + 1}.</span>
                             <div dangerouslySetInnerHTML={{ __html: question.mainQuestionText }} />
                           </div>
                        </div>
                        <div className="border border-t-0 rounded-b-lg p-4 space-y-3">
                        {question.solutionSteps.flatMap(step => step.subQuestions).map(subQ => {
                            const result = results[subQ.id];
                            const isCorrect = result?.isCorrect;
                            const studentAnswer = answers[subQ.id]?.answer;
                            return (
                                <div key={subQ.id} className="p-3 border rounded-md text-sm">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div
                                                className="prose-sm dark:prose-invert max-w-none mb-2"
                                                dangerouslySetInnerHTML={{ __html: subQ.questionText }}
                                            />
                                        </div>
                                        <div className={`flex items-center gap-2 font-semibold text-sm ${isCorrect ? 'text-green-600' : 'text-destructive'}`}>
                                            {isCorrect ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}
                                            {isCorrect ? `${subQ.marks}/${subQ.marks}` : `0/${subQ.marks}`}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded space-y-1">
                                        <div>
                                            Your Answer: <span className="font-semibold">{getAnswerText(subQ, studentAnswer)}</span>
                                        </div>
                                            {!isCorrect && (
                                            <div>
                                                Correct Answer: <span className="font-semibold">{getCorrectAnswerText(subQ)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        </div>
                    </div>
                 ))}
            </div>

            <div className="text-center mt-8">
                 <Button onClick={() => router.push(`/academics/${worksheet.classId}/${worksheet.subjectId}`)}>
                    <Home className="mr-2 h-4 w-4" />
                    Back to Subject
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
