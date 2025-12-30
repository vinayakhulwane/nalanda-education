'use client';
import type { Question, Unit, Category, CurrencyType, EconomySettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Bot, Coins, Crown, Gem, Sparkles, ShoppingCart, ArrowRight, Trash2, Shuffle, Filter, X, Eye, CheckCircle2 } from 'lucide-react';
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            {filteredQuestions.length} 
                            <span className="text-muted-foreground font-normal text-base">Questions Available</span>
                        </h3>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2">
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
                    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-dashed">
                        <span className="text-sm font-semibold text-muted-foreground ml-1">Active:</span>
                        {filters.units.map(id => (
                          <Badge key={id} variant="secondary" className="pl-2 capitalize gap-1 hover:bg-slate-200">
                            {unitMap.get(id) || id}
                            <button onClick={() => handleFilterChange('units', id, false)} className="rounded-full hover:bg-black/10 p-0.5"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                        {filters.categories.map(id => (
                          <Badge key={id} variant="secondary" className="pl-2 capitalize gap-1 hover:bg-slate-200">
                            {categoryMap.get(id) || id}
                            <button onClick={() => handleFilterChange('categories', id, false)} className="rounded-full hover:bg-black/10 p-0.5"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                        {filters.currencies.map(c => (
                          <Badge key={c} variant="secondary" className="pl-2 capitalize gap-1 hover:bg-slate-200">
                            {c}
                            <button onClick={() => handleFilterChange('currencies', c, false)} className="rounded-full hover:bg-black/10 p-0.5"><X className="h-3 w-3" /></button>
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
                            <Card key={q.id} className={cn("flex flex-col transition-all hover:shadow-md", isSelected && "ring-2 ring-primary border-primary/50 bg-primary/5")}>
                                <CardHeader className="pb-2 flex-row items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base line-clamp-1 leading-snug">{q.name}</CardTitle>
                                        <div className="flex flex-wrap gap-2">
                                            <TooltipProvider>
                                                <Badge variant="outline" className={cn("capitalize flex items-center gap-1 text-[10px]", currencyColor)}>
                                                    <CurrencyIcon className="h-3 w-3" /> {q.currencyType}
                                                </Badge>
                                                {q.gradingMode === 'ai' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="secondary" className="p-1 px-2 text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                                <Bot className="h-3 w-3 mr-1" /> AI
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>AI Graded Question</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Badge variant="secondary" className="text-[10px]">{getQuestionMarks(q)} Marks</Badge>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-primary" onClick={() => handleViewClick(q)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-2 flex-grow">
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {q.mainQuestionText?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                    </p>
                                </CardContent>
                                <CardFooter className="pt-2">
                                    <Button 
                                        onClick={() => addQuestion(q, 'manual')} 
                                        disabled={isSelected} 
                                        className={cn("w-full transition-all", isSelected ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "")}
                                        variant={isSelected ? "default" : "secondary"}
                                    >
                                        {isSelected ? (
                                            <>
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Added
                                            </>
                                        ) : (
                                            <>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                    {filteredQuestions.length === 0 && (
                        <div className="md:col-span-2 flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                            <Filter className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                            <p className="text-muted-foreground font-medium">No questions match your filters.</p>
                            <Button variant="link" onClick={() => setFilters({ units: [], categories: [], currencies: [] })}>Clear Filters</Button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* SIDEBAR FOR DESKTOP (or hidden on mobile) is now the Floating Sheet trigger */}
            <div className="hidden lg:block lg:col-span-1">
                 {/* This section intentionally left essentially blank because we are using the Floating Sheet 
                     for the 'Cart' to keep the UI consistent between Random/Manual modes. 
                     However, we can put a sticky summary here if desired. */}
                 <div className="sticky top-24 space-y-4">
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" /> Current Draft
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-3xl font-bold">{selectedQuestions.length}</span>
                                    <span className="text-slate-400">Questions</span>
                                </div>
                                <Progress value={(selectedQuestions.length / 10) * 100} className="h-1.5 bg-slate-700" />
                                <div className="text-xs text-slate-400">
                                    Total Marks: <span className="text-white font-mono">{totalMarks}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button className="w-full bg-white text-slate-900 hover:bg-slate-200" disabled={selectedQuestions.length === 0}>
                                        Review & Create
                                    </Button>
                                </SheetTrigger>
                                {/* Sheet content is shared/rendered by the Sheet component in the parent page or duplicated structure here if needed. 
                                    Since we have the floating button, this is just an alternative trigger. 
                                    For simplicity, the main interaction is the Floating Button. */}
                            </Sheet>
                        </CardFooter>
                    </Card>
                 </div>
            </div>
            
            {/* VIEW MODAL */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
              <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <span className="bg-primary/10 p-1.5 rounded text-primary text-sm font-bold">Q</span>
                      {viewingQuestion?.name}
                  </DialogTitle>
                   <DialogDescription>
                    Full question preview
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="prose dark:prose-invert max-w-none border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50" dangerouslySetInnerHTML={{ __html: processedQuestionText }} />
                    
                    {/* Solution Preview (if available/desired) */}
                    {viewingQuestion?.solutionSteps && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Marking Scheme</h4>
                            <div className="grid gap-2">
                                {viewingQuestion.solutionSteps.map((step, i) => (
                                    <div key={i} className="flex justify-between text-sm p-2 border-b last:border-0">
                                        <span>Step {i+1}</span>
                                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{step.subQuestions.reduce((a,b)=>a+b.marks,0)} marks</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close Preview</Button>
                  <Button onClick={() => { if(viewingQuestion) addQuestion(viewingQuestion, 'manual'); setIsViewModalOpen(false); }} disabled={selectedQuestions.some(sq => sq.id === viewingQuestion?.id)}>
                      {selectedQuestions.some(sq => sq.id === viewingQuestion?.id) ? 'Already Added' : 'Add to Worksheet'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
}