'use client';
import type { Question, Unit, Category, CurrencyType, Worksheet, WalletTransaction, EconomySettings } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Bot, Coins, Crown, Gem, Sparkles, ShoppingCart, ArrowRight, Trash2, Shuffle, Filter, X, Eye } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { calculateWorksheetCost } from '@/lib/wallet';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';


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
    const [filters, setFilters] = useState<{
        units: string[];
        categories: string[];
        currencies: CurrencyType[];
    }>({
        units: [],
        categories: [],
        currencies: [],
    });
    const [worksheetType, setWorksheetType] = useState<'classroom' | 'sample'>('classroom');
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);

    // Animation state
    const [animateCart, setAnimateCart] = useState(false);
    const prevSelectedCount = useMemo(() => selectedQuestions.length, []);

    useEffect(() => {
        if (selectedQuestions.length > prevSelectedCount) {
            setAnimateCart(true);
            const timer = setTimeout(() => setAnimateCart(false), 500); // Duration of animation
            return () => clearTimeout(timer);
        }
    }, [selectedQuestions.length, prevSelectedCount]);

    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
    const { data: settings } = useDoc<EconomySettings>(settingsRef);

    useEffect(() => {
        setFilters(prev => ({ ...prev, categories: [] }));
    }, [filters.units]);

    const availableCategories = useMemo(() => {
        if (filters.units.length === 0) return categories;
        return categories.filter(c => filters.units.includes(c.unitId));
    }, [categories, filters.units]);

    const filteredQuestions = useMemo(() => {
        return availableQuestions.filter(q => {
            const unitMatch = filters.units.length === 0 || filters.units.includes(q.unitId);
            const categoryMatch = filters.categories.length === 0 || filters.categories.includes(q.categoryId);
            const currencyMatch = filters.currencies.length === 0 || filters.currencies.includes(q.currencyType);
            return unitMatch && categoryMatch && currencyMatch;
        });
    }, [availableQuestions, filters]);

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

        const creationCost = calculateWorksheetCost(selectedQuestions, settings ?? undefined);

        return {
            totalMarks,
            estimatedTime: Math.ceil((totalMarks * 20) / 60),
            breakdownByUnit,
            breakdownByCategory,
            creationCost,
        };
    }, [selectedQuestions, unitMap, categoryMap, settings]);

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

    const handleFilterChange = (filterType: 'units' | 'categories' | 'currencies', value: string, isChecked: boolean) => {
        setFilters(prev => {
            const currentValues = prev[filterType] as string[];
            const newValues = isChecked
                ? [...currentValues, value]
                : currentValues.filter(v => v !== value);
            return { ...prev, [filterType]: newValues };
        });
    }

    const allCurrencyTypes: CurrencyType[] = ['spark', 'coin', 'gold', 'diamond'];
    const activeFilterCount = filters.units.length + filters.categories.length + filters.currencies.length;
    const isFilterActive = activeFilterCount > 0;
    
    const handleViewClick = (question: Question) => {
        setViewingQuestion(question);
        setIsViewModalOpen(true);
    };

    const processedQuestionText = useMemo(() => {
        if (!viewingQuestion?.mainQuestionText) return '';
        return viewingQuestion.mainQuestionText.replace(/&nbsp;/g, ' ');
    }, [viewingQuestion]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">{filteredQuestions.length} Questions Available</h3>
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
                                        {filters.units.length > 0 && availableCategories.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No categories for selected unit(s).</p>}
                                        {filters.units.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Select a unit first.</p>}
                                    </div>
                                </TabsContent>
                                <TabsContent value="currency" className="mt-2">
                                    <div className="space-y-2">
                                        {allCurrencyTypes.map(currency => (
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
                
                 {isFilterActive && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">Active:</span>
                        {filters.units.map(id => (
                          <Badge key={id} variant="outline" className="pl-2 capitalize">
                            {unitMap.get(id) || id}
                            <button onClick={() => handleFilterChange('units', id, false)} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                        {filters.categories.map(id => (
                          <Badge key={id} variant="outline" className="pl-2 capitalize">
                            {categoryMap.get(id) || id}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredQuestions.map(q => {
                        const isSelected = selectedQuestions.some(sq => sq.id === q.id);
                        const CurrencyIcon = currencyIcons[q.currencyType];
                        const currencyColor = currencyColors[q.currencyType];
                        return (
                            <Card key={q.id} className="flex flex-col">
                                <CardHeader className="pb-2 flex-row items-start justify-between">
                                    <CardTitle className="text-base line-clamp-1">{q.name}</CardTitle>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 -mt-2" onClick={() => handleViewClick(q)}>
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-2 flex-grow">
                                    <div className="flex items-center gap-2">
                                        <TooltipProvider>
                                            {q.gradingMode === 'ai' && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild><Badge variant="outline" className="p-1"><Bot className="h-3 w-3" /></Badge></TooltipTrigger>
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
                    {filteredQuestions.length === 0 && (
                        <div className="md:col-span-2 text-center py-10 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                            No questions match your current filters.
                        </div>
                    )}
                </div>
            </div>
            <div className="lg:col-span-1">
                <Sheet>
                    <SheetTrigger asChild>
                        <div className="fixed bottom-6 right-6 lg:relative lg:bottom-auto lg:right-auto">
                            <Button 
                                size="lg" 
                                className={cn("rounded-full h-16 w-16 shadow-xl lg:w-full lg:h-auto lg:rounded-md", animateCart && "animate-pulse-once")}
                                disabled={selectedQuestions.length === 0}
                            >
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
                                                                        <Badge variant="outline" className="flex items-center gap-1 text-xs"><Bot className="h-3 w-3" /> AI Graded</Badge>
                                                                    )}
                                                                    {q.source === 'random' && (
                                                                        <Badge variant="outline" className="flex items-center gap-1 text-xs"><Shuffle className="h-3 w-3" /> Random</Badge>
                                                                    )}
                                                                    <Badge variant="outline" className="text-xs">{getQuestionMarks(q)} Marks</Badge>
                                                                    <Badge variant="outline" className={cn("flex items-center gap-1 text-xs capitalize", currencyColor)}>
                                                                        <CurrencyIcon className="h-3 w-3" /> {q.currencyType}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeQuestion(q.id)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                )
                                            })}
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
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
            
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>{viewingQuestion?.name}</DialogTitle>
                   <DialogDescription>
                    Question Preview
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: processedQuestionText }} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
}
