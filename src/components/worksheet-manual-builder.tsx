'use client';
import type { Question, Unit, Category, CurrencyType, Worksheet } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Bot, Coins, Crown, Gem, Sparkles, ShoppingCart, ArrowRight, Trash2, Shuffle, Filter, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { useUser } from '@/firebase';

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
    const { userProfile } = useUser();
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    const [filters, setFilters] = useState<{
        units: string[];
        categories: string[];
        currencies: CurrencyType[];
    }>({
        units: [],
        categories: [],
        currencies: [],
    });
    
    // When unit filter changes, reset category filter
    useEffect(() => {
        setFilters(prev => ({...prev, categories: []}));
    }, [filters.units]);

    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    
    const availableCategories = useMemo(() => {
        if (filters.units.length === 0) return categories;
        return categories.filter(c => filters.units.includes(c.unitId));
    }, [categories, filters.units]);

    const filteredQuestions = useMemo(() => {
        if (filters.units.length === 0 && filters.categories.length === 0 && filters.currencies.length === 0) {
            return availableQuestions;
        }
        return availableQuestions.filter(q => {
            const unitMatch = filters.units.length === 0 || filters.units.includes(q.unitId);
            const categoryMatch = filters.categories.length === 0 || filters.categories.includes(q.categoryId);
            const currencyMatch = filters.currencies.length === 0 || filters.currencies.includes(q.currencyType);
            return unitMatch && categoryMatch && currencyMatch;
        });
    }, [availableQuestions, filters]);
    
    const handleFilterChange = (filterType: 'units' | 'categories' | 'currencies', value: string, isChecked: boolean) => {
        setFilters(prev => {
            const currentValues = prev[filterType] as string[];
            const newValues = isChecked
                ? [...currentValues, value]
                : currentValues.filter(v => v !== value);
            return { ...prev, [filterType]: newValues };
        });
    }

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

    const activeFilterCount = filters.units.length + filters.categories.length + filters.currencies.length;

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Available Questions</h3>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                        {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2 rounded-full h-5 w-5 p-0 justify-center">{activeFilterCount}</Badge>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                        <Tabs defaultValue="unit" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="unit">Unit</TabsTrigger>
                                <TabsTrigger value="category" disabled={filters.units.length > 0 && availableCategories.length === 0}>Category</TabsTrigger>
                                <TabsTrigger value="currency">Currency</TabsTrigger>
                            </TabsList>
                            <TabsContent value="unit" className="mt-2">
                            <div className="space-y-2">
                                {units.map(unit => (
                                <div key={unit.id} className="flex items-center space-x-2">
                                    <Checkbox
                                    id={`manual-filter-unit-${unit.id}`}
                                    checked={filters.units.includes(unit.id)}
                                    onCheckedChange={(checked) => handleFilterChange('units', unit.id, !!checked)}
                                    />
                                    <Label htmlFor={`manual-filter-unit-${unit.id}`} className="capitalize">{unit.name}</Label>
                                </div>
                                ))}
                            </div>
                            </TabsContent>
                            <TabsContent value="category" className="mt-2">
                            <div className="space-y-2">
                                {availableCategories.map(cat => (
                                <div key={cat.id} className="flex items-center space-x-2">
                                    <Checkbox
                                    id={`manual-filter-cat-${cat.id}`}
                                    checked={filters.categories.includes(cat.id)}
                                    onCheckedChange={(checked) => handleFilterChange('categories', cat.id, !!checked)}
                                    />
                                    <Label htmlFor={`manual-filter-cat-${cat.id}`} className="capitalize">{cat.name}</Label>
                                </div>
                                ))}
                                {filters.units.length > 0 && availableCategories.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No categories found for the selected unit(s).</p>}
                                {filters.units.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Please select a unit first.</p>}
                            </div>
                            </TabsContent>
                            <TabsContent value="currency" className="mt-2">
                            <div className="space-y-2">
                                {(['spark', 'coin', 'gold', 'diamond'] as CurrencyType[]).map(currency => (
                                <div key={currency} className="flex items-center space-x-2">
                                    <Checkbox
                                    id={`manual-filter-currency-${currency}`}
                                    checked={filters.currencies.includes(currency)}
                                    onCheckedChange={(checked) => handleFilterChange('currencies', currency, !!checked)}
                                    />
                                    <Label htmlFor={`manual-filter-currency-${currency}`} className="capitalize">{currency}</Label>
                                </div>
                                ))}
                            </div>
                            </TabsContent>
                        </Tabs>
                    </PopoverContent>
                </Popover>
             </div>
             {activeFilterCount > 0 && (
                <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-sm font-semibold">Active Filters:</span>
                    {filters.units.map(id => (
                    <Badge key={id} variant="outline" className="pl-2 capitalize">
                        Unit: {unitMap.get(id) || id}
                        <button onClick={() => handleFilterChange('units', id, false)} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
                    </Badge>
                    ))}
                    {filters.categories.map(id => (
                    <Badge key={id} variant="outline" className="pl-2 capitalize">
                        Category: {categoryMap.get(id) || id}
                        <button onClick={() => handleFilterChange('categories', id, false)} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
                    </Badge>
                    ))}
                    {filters.currencies.map(c => (
                    <Badge key={c} variant="outline" className="pl-2 capitalize">
                        {c}
                        <button onClick={() => handleFilterChange('currencies', c, false)} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
                    </Badge>
                    ))}
                </div>
            )}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredQuestions.map(q => {
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
            {filteredQuestions.length === 0 && (
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
