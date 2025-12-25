'use client';
import type { Question, Unit, Category, CurrencyType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Bot, Coins, Crown, Gem, Sparkles } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type WorksheetManualBuilderProps = {
    availableQuestions: Question[];
    selectedQuestions: Question[];
    addQuestion: (question: Question) => void;
    units: Unit[];
    categories: Category[];
};

const currencyIcons: Record<CurrencyType, React.ElementType> = {
    spark: Sparkles,
    coin: Coins,
    gold: Crown,
    diamond: Gem,
};

export function WorksheetManualBuilder({
    availableQuestions,
    selectedQuestions,
    addQuestion,
    units,
    categories,
}: WorksheetManualBuilderProps) {
    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const getQuestionMarks = (question: Question): number => {
        return question.solutionSteps?.reduce((stepSum, step) => 
              stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
    }


    return (
        <div className="space-y-4">
             <h3 className="text-xl font-semibold">Available Questions</h3>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {availableQuestions.map(q => {
                    const isSelected = selectedQuestions.some(sq => sq.id === q.id);
                    const CurrencyIcon = currencyIcons[q.currencyType];
                    return (
                        <Card key={q.id}>
                            <CardHeader>
                                <CardTitle className="text-lg">{q.name}</CardTitle>
                                <CardDescription>
                                    <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-2" dangerouslySetInnerHTML={{ __html: q.mainQuestionText || ''}} />
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                    <span>{unitMap.get(q.unitId) || 'N/A'}</span>
                                    <span>&bull;</span>
                                    <span>{categoryMap.get(q.categoryId) || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     <TooltipProvider>
                                        {q.gradingMode === 'ai' && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                <Badge variant="outline" className="p-1">
                                                    <Bot className="h-3 w-3"/>
                                                </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                <p>AI Graded</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="capitalize flex items-center gap-1">
                                                    <CurrencyIcon className="h-3 w-3" /> {q.currencyType}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="capitalize">{q.currencyType}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                     </TooltipProvider>
                                     <Badge variant="secondary">{getQuestionMarks(q)} Marks</Badge>
                                </div>
                            </CardContent>
                            <CardContent>
                                 <Button onClick={() => addQuestion(q)} disabled={isSelected} className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    {isSelected ? 'Added' : 'Add to Worksheet'}
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
            {availableQuestions.length === 0 && (
                <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                    <p>No questions found for the current filters.</p>
                </div>
            )}
        </div>
    );
}
