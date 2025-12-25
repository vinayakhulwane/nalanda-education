'use client';
import type { Question, Unit, Category, CurrencyType, Worksheet } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Bot, Coins, Crown, Gem, Sparkles, ShoppingCart, ArrowRight, Trash2, Shuffle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';

type WorksheetManualBuilderProps = {
    availableQuestions: Question[];
    selectedQuestions: Question[];
    addQuestion: (question: Question) => void;
    removeQuestion: (questionId: string) => void;
    units: Unit[];
    categories: Category[];
    onCreateWorksheet: (worksheetType: 'classroom' | 'sample') => void;
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
    removeQuestion,
    units,
    categories,
    onCreateWorksheet,
}: WorksheetManualBuilderProps) {
    const [worksheetType, setWorksheetType] = useState<'classroom' | 'sample'>('classroom');

    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const getQuestionMarks = (question: Question): number => {
        return question.solutionSteps?.reduce((stepSum, step) => 
              stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
    }

      const { totalMarks, estimatedTime, breakdownByUnit, breakdownByCategory, totalCost } = useMemo(() => {
    let totalMarks = 0;
    const breakdownByUnit: Record<string, { count: number; marks: number }> = {};
    const breakdownByCategory: Record<string, { count: number; marks: number }> = {};
    
    const marksByCurrency: Record<CurrencyType, number> = { spark: 0, coin: 0, gold: 0, diamond: 0 };
    const countByCurrency: Record<CurrencyType, number> = { spark: 0, coin: 0, gold: 0, diamond: 0 };

    selectedQuestions.forEach(q => {
        const marks = q.solutionSteps?.reduce((stepSum, step) => 
            stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
        totalMarks += marks;
        
        marksByCurrency[q.currencyType] += marks;
        countByCurrency[q.currencyType]++;

        const unitName = unitMap.get(q.unitId) || 'Uncategorized';
        if (!breakdownByUnit[unitName]) breakdownByUnit[unitName] = { count: 0, marks: 0 };
        breakdownByUnit[unitName].count++;
        breakdownByUnit[unitName].marks += marks;
        
        const categoryName = categoryMap.get(q.categoryId) || 'Uncategorized';
        if (!breakdownByCategory[categoryName]) breakdownByCategory[categoryName] = { count: 0, marks: 0 };
        breakdownByCategory[categoryName].count++;
        breakdownByCategory[categoryName].marks += marks;
    });
    
    const calculatedCost: Record<CurrencyType, number> = {
        spark: countByCurrency.spark,
        coin: Math.ceil(marksByCurrency.coin * 0.5),
        gold: Math.ceil(marksByCurrency.gold * 0.5),
        diamond: Math.ceil(marksByCurrency.diamond * 0.5),
    };

    return { 
        totalMarks, 
        estimatedTime: Math.ceil((totalMarks * 20) / 60),
        breakdownByUnit,
        breakdownByCategory,
        totalCost: calculatedCost,
    };
}, [selectedQuestions, unitMap, categoryMap]);


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
             <Sheet>
            <SheetTrigger asChild>
                <div className="fixed bottom-6 right-6">
                    <Button size="lg" className="rounded-full h-16 w-16 shadow-xl" disabled={selectedQuestions.length === 0}>
                        <ShoppingCart className="h-6 w-6" />
                        <Badge className="absolute -top-1 -right-1">{selectedQuestions.length}</Badge>
                    </Button>
                </div>
            </SheetTrigger>
             <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <SheetHeader className="p-6 pb-2">
                    <SheetTitle>Review & Blueprint</SheetTitle>
                    <SheetDescription>
                        A detailed summary of your current selections before finalizing the worksheet.
                    </SheetDescription>
                     <div className="flex items-center space-x-2 pt-4">
                        <Label htmlFor="worksheet-type-manual" className={cn("text-muted-foreground", worksheetType === 'sample' && 'font-semibold text-foreground')}>
                            Sample Worksheet
                        </Label>
                        <Switch id="worksheet-type-manual" checked={worksheetType === 'classroom'} onCheckedChange={(checked) => setWorksheetType(checked ? 'classroom' : 'sample')} />
                         <Label htmlFor="worksheet-type-manual" className={cn("text-muted-foreground", worksheetType === 'classroom' && 'font-semibold text-foreground')}>
                           Classroom Assignment
                        </Label>
                    </div>
                </SheetHeader>
                <div className="flex-grow overflow-y-auto">
                    <Tabs defaultValue="blueprint" className="flex-grow flex flex-col mt-4 overflow-hidden">
                        <TabsList className="mx-6">
                            <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                            <TabsTrigger value="review">Review</TabsTrigger>
                        </TabsList>
                        <div className="flex-grow overflow-y-auto">
                            <TabsContent value="blueprint" className="mt-4 px-6 pb-6">
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">Core Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex justify-around">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{selectedQuestions.length}</p>
                                                <p className="text-xs text-muted-foreground">Total Questions</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{totalMarks}</p>
                                                <p className="text-xs text-muted-foreground">Total Marks</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Content Breakdown</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold mb-2">By Unit</h4>
                                                <div className="space-y-3">
                                                    {Object.entries(breakdownByUnit).map(([name, data]) => (
                                                        <div key={name}>
                                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                                <span>{name}</span>
                                                                <span>{data.count} Qs, {data.marks} Marks</span>
                                                            </div>
                                                            <Progress value={(data.count / selectedQuestions.length) * 100} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold mb-2">By Category</h4>
                                                <div className="space-y-3">
                                                    {Object.entries(breakdownByCategory).map(([name, data]) => (
                                                        <div key={name}>
                                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                                <span>{name}</span>
                                                                <span>{data.count} Qs, {data.marks} Marks</span>
                                                            </div>
                                                            <Progress value={(data.count / selectedQuestions.length) * 100} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                            <TabsContent value="review" className="mt-4 px-6 pb-6">
                            <div className="space-y-3">
                                    {selectedQuestions.map(q => {
                                        const CurrencyIcon = currencyIcons[q.currencyType] || Sparkles;
                                        return (
                                        <Card key={q.id} className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-sm">{q.name}</p>
                                                    <p className="text-xs text-muted-foreground">{unitMap.get(q.unitId)}</p>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        {q.gradingMode === 'ai' && (
                                                            <Badge variant="outline" className="flex items-center gap-1 text-xs"><Bot className="h-3 w-3"/> AI Graded</Badge>
                                                        )}
                                                        <Badge variant="outline" className="text-xs">{getQuestionMarks(q)} Marks</Badge>
                                                        <Badge variant="outline" className="flex items-center gap-1 text-xs capitalize"><CurrencyIcon className="h-3 w-3"/> {q.currencyType}</Badge>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeQuestion(q.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            </div>
                                        </Card>
                                    )})}
                                    {selectedQuestions.length === 0 && (
                                        <div className="text-center py-10 text-sm text-muted-foreground">
                                            No questions selected.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
                <SheetFooter className="bg-card border-t px-6 py-4 mt-auto">
                    <div className="flex justify-between items-center w-full">
                        <div className="text-sm">
                            <p className="font-semibold">Est. Time: {estimatedTime} mins</p>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {Object.entries(totalCost).filter(([,count]) => count > 0).map(([currency, count]) => {
                                    const Icon = currencyIcons[currency as CurrencyType] || Sparkles;
                                    return (
                                        <span key={currency} className="flex items-center gap-1 capitalize">
                                            <Icon className="h-3 w-3" /> {count}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                        <Button onClick={() => onCreateWorksheet(worksheetType)}>
                            Create Worksheet <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
        </div>
    );
}
