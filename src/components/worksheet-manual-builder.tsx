
'use client';
import type { Question, Unit, Category, CurrencyType, Worksheet, WalletTransaction } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Bot, Coins, Crown, Gem, Sparkles, ShoppingCart, ArrowRight, Trash2, Shuffle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { calculateWorksheetCost } from '@/lib/wallet';

type QuestionWithSource = Question & { source?: 'manual' | 'random' };

type WorksheetManualBuilderProps = {
    availableQuestions: Question[];
    selectedQuestions: QuestionWithSource[];
    addQuestion: (question: Question, source: 'manual' | 'random') => void;
    removeQuestion: (questionId: string) => void;
    units: Unit[];
    categories: Category[];
    onCreateWorksheet: (worksheetType: 'classroom' | 'sample' | 'practice') => void;
};

const currencyIcons: Record<CurrencyType, React.ElementType> = {
    spark: Sparkles,
    coin: Coins,
    gold: Crown,
    diamond: Gem,
};

const currencyColors: Record<CurrencyType, string> = {
  spark: 'text-gray-400',
  coin: 'text-yellow-500',
  gold: 'text-amber-500',
  diamond: 'text-blue-500',
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
    const { userProfile } = useUser();
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    const [activeTab, setActiveTab] = useState<'unit' | 'category' | 'currency'>('unit');
    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const questionsByUnit = useMemo(() => {
        return availableQuestions.reduce((acc, q) => {
            const unitName = unitMap.get(q.unitId) || q.unitId;
            if (!acc[unitName]) acc[unitName] = [];
            acc[unitName].push(q);
            return acc;
        }, {} as Record<string, Question[]>);
    }, [availableQuestions, unitMap]);

    const { totalMarks, estimatedTime, breakdownByUnit, breakdownByCategory, creationCost } = useMemo(() => {
        let totalMarks = 0;
        const breakdownByUnit: Record<string, { count: number; marks: number }> = {};
        const breakdownByCategory: Record<string, { count: number; marks: number }> = {};
        selectedQuestions.forEach(q => {
            const marks = q.solutionSteps?.reduce((stepSum, step) => 
                stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
            totalMarks += marks;

            const unitName = unitMap.get(q.unitId) || 'Uncategorized';
            if (!breakdownByUnit[unitName]) breakdownByUnit[unitName] = { count: 0, marks: 0 };
            breakdownByUnit[unitName].count++;
            breakdownByUnit[unitName].marks += marks;
            
            const categoryName = categoryMap.get(q.categoryId) || 'Uncategorized';
            if (!breakdownByCategory[categoryName]) breakdownByCategory[categoryName] = { count: 0, marks: 0 };
            breakdownByCategory[categoryName].count++;
            breakdownByCategory[categoryName].marks += marks;
        });
        const creationCost = calculateWorksheetCost(selectedQuestions);
        return { 
            totalMarks, 
            estimatedTime: Math.ceil((totalMarks * 20) / 60),
            breakdownByUnit,
            breakdownByCategory,
            creationCost,
        };
    }, [selectedQuestions, unitMap, categoryMap]);
    
    const getQuestionMarks = (question: Question): number => {
        return question.solutionSteps?.reduce((stepSum, step) => 
              stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
    }
    
    const handleCreateClick = () => {
        if (userIsEditor) {
            onCreateWorksheet(worksheetType);
        } else {
            onCreateWorksheet('practice');
        }
    }

    const canAfford = useMemo(() => {
        if (userIsEditor) return true;
        if (!userProfile) return false;
        return (userProfile.coins >= creationCost.coins) &&
               (userProfile.gold >= creationCost.gold) &&
               (userProfile.diamonds >= creationCost.diamonds);
    }, [userProfile, creationCost, userIsEditor]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2">
                <h3 className="text-xl font-semibold mb-4">Available Questions</h3>
                 <Tabs defaultValue="unit" className="w-full">
                    <TabsList>
                        <TabsTrigger value="unit">By Unit</TabsTrigger>
                        <TabsTrigger value="category">By Category</TabsTrigger>
                    </TabsList>
                    <TabsContent value="unit">
                        {Object.entries(questionsByUnit).map(([unitName, questions]) => (
                             <Card key={unitName} className="mb-4">
                                <CardHeader>
                                    <CardTitle className="text-lg">{unitName}</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {questions.map(q => {
                                         const isSelected = selectedQuestions.some(sq => sq.id === q.id);
                                         const CurrencyIcon = currencyIcons[q.currencyType];
                                         const currencyColor = currencyColors[q.currencyType];
                                         return (
                                            <Card key={q.id} className="flex flex-col">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-base line-clamp-1">{q.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 flex-grow">
                                                     <div className="flex items-center gap-2">
                                                        <TooltipProvider>
                                                            {q.gradingMode === 'ai' && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild><Badge variant="outline" className="p-1"><Bot className="h-3 w-3"/></Badge></TooltipTrigger>
                                                                    <TooltipContent><p>AI Graded</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge variant="outline" className={cn("capitalize flex items-center gap-1", currencyColor)}><CurrencyIcon className="h-3 w-3" /> {q.currencyType}</Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p className="capitalize">{q.currencyType}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Badge variant="secondary">{getQuestionMarks(q)} Marks</Badge>
                                                    </div>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button onClick={() => addQuestion(q, 'manual')} disabled={isSelected} className="w-full">
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        {isSelected ? 'Added' : 'Add'}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                         )
                                    })}
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                    <TabsContent value="category">
                        {/* Placeholder for category view */}
                        <Card><CardContent className="p-6 text-center text-muted-foreground">Category view coming soon.</CardContent></Card>
                    </TabsContent>
                </Tabs>
             </div>
             <div className="lg:col-span-1">
                <Sheet>
            <SheetTrigger asChild>
                <div className="fixed bottom-6 right-6 lg:relative lg:bottom-auto lg:right-auto">
                    <Button size="lg" className="rounded-full h-16 w-16 shadow-xl lg:w-full lg:h-auto lg:rounded-md" disabled={selectedQuestions.length === 0}>
                        <ShoppingCart className="h-6 w-6 lg:mr-2" />
                        <span className="hidden lg:inline">Review & Create</span>
                        <Badge className="absolute -top-1 -right-1 lg:static lg:ml-auto">{selectedQuestions.length}</Badge>
                    </Button>
                </div>
            </SheetTrigger>
             <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <SheetHeader className="p-6 pb-2">
                    <SheetTitle>Review & Blueprint</SheetTitle>
                    <SheetDescription>
                        A detailed summary of your current selections before finalizing the worksheet.
                    </SheetDescription>
                    {userIsEditor && (
                        <div className="flex items-center space-x-2 pt-4">
                            <Label htmlFor="worksheet-type-manual" className={cn("text-muted-foreground", worksheetType === 'sample' && 'font-semibold text-foreground')}>
                                Sample Worksheet
                            </Label>
                            <Switch id="worksheet-type-manual" checked={worksheetType === 'classroom'} onCheckedChange={(checked) => setWorksheetType(checked ? 'classroom' : 'sample')} />
                            <Label htmlFor="worksheet-type-manual" className={cn("text-muted-foreground", worksheetType === 'classroom' && 'font-semibold text-foreground')}>
                            Classroom Assignment
                            </Label>
                        </div>
                    )}
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
                                        const currencyColor = currencyColors[q.currencyType];
                                        return (
                                        <Card key={q.id} className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-grow">
                                                    {q.source === 'manual' && <p className="font-semibold text-sm">{q.name}</p>}
                                                    <p className="text-xs text-muted-foreground">{unitMap.get(q.unitId)}</p>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        {q.gradingMode === 'ai' && (
                                                            <Badge variant="outline" className="flex items-center gap-1 text-xs"><Bot className="h-3 w-3"/> AI Graded</Badge>
                                                        )}
                                                        {q.source === 'random' && (
                                                            <Badge variant="outline" className="flex items-center gap-1 text-xs"><Shuffle className="h-3 w-3"/> Random</Badge>
                                                        )}
                                                        <Badge variant="outline" className="text-xs">{getQuestionMarks(q)} Marks</Badge>
                                                        <Badge variant="outline" className={cn("flex items-center gap-1 text-xs capitalize", currencyColor)}>
                                                            <CurrencyIcon className="h-3 w-3"/> {q.currencyType}
                                                        </Badge>
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
                        <div className="text-sm font-semibold">
                            <p>Est. Time: {estimatedTime} mins</p>
                            {!userIsEditor && (creationCost.coins > 0 || creationCost.gold > 0 || creationCost.diamonds > 0) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p>Cost:</p>
                                    {creationCost.coins > 0 && <span className="flex items-center text-yellow-600 dark:text-yellow-400"><Coins className="mr-1 h-4 w-4" />{creationCost.coins}</span>}
                                    {creationCost.gold > 0 && <span className="flex items-center text-amber-600 dark:text-amber-400"><Crown className="mr-1 h-4 w-4" />{creationCost.gold}</span>}
                                    {creationCost.diamonds > 0 && <span className="flex items-center text-blue-600 dark:text-blue-400"><Gem className="mr-1 h-4 w-4" />{creationCost.diamonds}</span>}
                                </div>
                            )}
                        </div>
                        <Button onClick={handleCreateClick} disabled={!canAfford}>
                           {!canAfford ? 'Insufficient Funds' : 'Create Worksheet'}
                            <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
             </div>
        </div>
    );
}
