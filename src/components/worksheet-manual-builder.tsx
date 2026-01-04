'use client';
import type { Question, Unit, Category, CurrencyType, EconomySettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Bot, Coins, Crown, Gem, Sparkles, ShoppingCart, ArrowRight, Trash2, Filter, X, Eye, CheckCircle2, Search, FileText, BrainCircuit } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
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
    aiCredits: BrainCircuit,
};

// Defined at top level to avoid ReferenceError
const allCurrencyTypes: CurrencyType[] = ['spark', 'coin', 'gold', 'diamond'];

// Consistent color styles for badges
const currencyStyles: Record<CurrencyType, { badgeBg: string, badgeText: string, border: string }> = {
    spark: { badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200' },
    coin: { badgeBg: 'bg-yellow-100 dark:bg-yellow-900/30', badgeText: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200' },
    gold: { badgeBg: 'bg-amber-100 dark:bg-amber-900/30', badgeText: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200' },
    diamond: { badgeBg: 'bg-blue-100 dark:bg-blue-900/30', badgeText: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200' },
    aiCredits: { badgeBg: 'bg-indigo-100 dark:bg-indigo-900/30', badgeText: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200' },
};

// ✅ HELPER: Cleans HTML entities and tags for preview
const getCleanText = (html: string | undefined) => {
    if (!html) return "";
    // 1. Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');
    // 2. Decode common HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    // 3. Trim extra whitespace
    return text.replace(/\s+/g, ' ').trim();
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

    const [filterSearch, setFilterSearch] = useState<{
        unit: string;
        category: string;
        currency: string;
    }>({
        unit: '',
        category: '',
        currency: '',
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
            const timer = setTimeout(() => setAnimateCart(false), 500);
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

    // Filtered Lists Logic
    const filteredUnitsList = useMemo(() => {
        return units.filter(u => u.name.toLowerCase().includes(filterSearch.unit.toLowerCase()));
    }, [units, filterSearch.unit]);

    const filteredCategoriesList = useMemo(() => {
        return availableCategories.filter(c => c.name.toLowerCase().includes(filterSearch.category.toLowerCase()));
    }, [availableCategories, filterSearch.category]);

    const filteredCurrenciesList = useMemo(() => {
        return allCurrencyTypes.filter(c => c.toLowerCase().includes(filterSearch.currency.toLowerCase()));
    }, [filterSearch.currency]);

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
            (userProfile.diamonds >= creationCost.diamonds) &&
            ((userProfile.aiCredits || 0) >= (creationCost.aiCredits || 0));
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

    const activeFilterCount = filters.units.length + filters.categories.length + filters.currencies.length;
    const isFilterActive = activeFilterCount > 0;
    
    const handleViewClick = (question: Question) => {
        setViewingQuestion(question);
        setIsViewModalOpen(true);
    };

    // For the modal, we still use the processed HTML but replace non-breaking spaces for display
    const processedQuestionText = useMemo(() => {
        if (!viewingQuestion?.mainQuestionText) return '';
        return viewingQuestion.mainQuestionText.replace(/&nbsp;/g, ' ');
    }, [viewingQuestion]);

    const hasSelectedAiQuestion = useMemo(() => selectedQuestions.some(q => q.gradingMode === 'ai'), [selectedQuestions]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-2 space-y-6">
                
                {/* HEADER & FILTER SECTION */}
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
                        <PopoverContent className="w-[320px] p-0" align="end">
                            <Tabs defaultValue="unit" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 m-2 rounded-md">
                                    <TabsTrigger value="unit" className="rounded-sm">Unit</TabsTrigger>
                                    <TabsTrigger value="category" className="rounded-sm" disabled={filters.units.length > 0 && availableCategories.length === 0}>Category</TabsTrigger>
                                    <TabsTrigger value="currency" className="rounded-sm">Currency</TabsTrigger>
                                </TabsList>

                                {/* --- UNIT TAB --- */}
                                <TabsContent value="unit" className="mt-0">
                                    <div className="px-3 pt-2 pb-3 border-b">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="Search units..." 
                                                className="pl-8 h-9" 
                                                value={filterSearch.unit}
                                                onChange={(e) => setFilterSearch(prev => ({...prev, unit: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[240px] overflow-y-auto py-1 px-1">
                                        {filteredUnitsList.map(unit => (
                                            <div key={unit.id} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                <Checkbox
                                                    id={`manual-filter-unit-${unit.id}`}
                                                    checked={filters.units.includes(unit.id)}
                                                    onCheckedChange={(checked) => handleFilterChange('units', unit.id, !!checked)}
                                                />
                                                <Label htmlFor={`manual-filter-unit-${unit.id}`} className="capitalize flex-grow cursor-pointer">{unit.name}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* --- CATEGORY TAB --- */}
                                <TabsContent value="category" className="mt-0">
                                    <div className="px-3 pt-2 pb-3 border-b">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="Search categories..." 
                                                className="pl-8 h-9"
                                                value={filterSearch.category}
                                                onChange={(e) => setFilterSearch(prev => ({...prev, category: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[240px] overflow-y-auto py-1 px-1">
                                        {filteredCategoriesList.map(cat => (
                                            <div key={cat.id} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                <Checkbox
                                                    id={`manual-filter-cat-${cat.id}`}
                                                    checked={filters.categories.includes(cat.id)}
                                                    onCheckedChange={(checked) => handleFilterChange('categories', cat.id, !!checked)}
                                                />
                                                <Label htmlFor={`manual-filter-cat-${cat.id}`} className="capitalize flex-grow cursor-pointer">{cat.name}</Label>
                                            </div>
                                        ))}
                                        {filters.units.length > 0 && availableCategories.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No categories found for selected unit(s).</p>}
                                        {filters.units.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Select a unit first.</p>}
                                        {filters.units.length > 0 && availableCategories.length > 0 && filteredCategoriesList.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No categories match your search.</p>}
                                    </div>
                                </TabsContent>

                                {/* --- CURRENCY TAB --- */}
                                <TabsContent value="currency" className="mt-0">
                                    <div className="px-3 pt-2 pb-3 border-b">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="Search types..." 
                                                className="pl-8 h-9"
                                                value={filterSearch.currency}
                                                onChange={(e) => setFilterSearch(prev => ({...prev, currency: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[240px] overflow-y-auto py-1 px-1">
                                        {filteredCurrenciesList.map(currency => (
                                            <div key={currency} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                <Checkbox
                                                    id={`manual-filter-currency-${currency}`}
                                                    checked={filters.currencies.includes(currency)}
                                                    onCheckedChange={(checked) => handleFilterChange('currencies', currency, !!checked)}
                                                />
                                                <Label htmlFor={`manual-filter-currency-${currency}`} className="capitalize flex-grow cursor-pointer">{currency}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {(filters.units.length > 0 || filters.categories.length > 0 || filters.currencies.length > 0) && (
                                    <div className="p-2 border-t bg-slate-50 dark:bg-slate-900/50">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="w-full h-8 font-normal text-muted-foreground hover:text-foreground"
                                            onClick={() => setFilters({ units: [], categories: [], currencies: [] })}
                                        >
                                            Clear all filters
                                        </Button>
                                    </div>
                                )}
                            </Tabs>
                        </PopoverContent>
                    </Popover>
                </div>
                
                 {isFilterActive && (
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-dashed">
                        <span className="text-sm font-semibold text-muted-foreground ml-1">Active:</span>
                        {filters.units.map(id => (
                          <Badge key={id} variant="secondary" className="pl-2 capitalize gap-1 hover:bg-slate-200 cursor-pointer" onClick={() => handleFilterChange('units', id, false)}>
                            {unitMap.get(id) || id}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))}
                        {filters.categories.map(id => (
                          <Badge key={id} variant="secondary" className="pl-2 capitalize gap-1 hover:bg-slate-200 cursor-pointer" onClick={() => handleFilterChange('categories', id, false)}>
                            {categoryMap.get(id) || id}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))}
                        {filters.currencies.map(c => (
                          <Badge key={c} variant="secondary" className="pl-2 capitalize gap-1 hover:bg-slate-200 cursor-pointer" onClick={() => handleFilterChange('currencies', c, false)}>
                            {c}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))}
                    </div>
                  )}

                {/* QUESTION GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredQuestions.map(q => {
                        const isSelected = selectedQuestions.some(sq => sq.id === q.id);
                        const isAiAndDisabled = q.gradingMode === 'ai' && hasSelectedAiQuestion && !isSelected;
                        const CurrencyIcon = currencyIcons[q.currencyType];
                        const styles = currencyStyles[q.currencyType];
                        
                        return (
                            <Card key={q.id} className={cn(
                                "group flex flex-col relative transition-all duration-300 overflow-hidden",
                                isSelected ? "ring-2 ring-emerald-500 border-emerald-500/20" : "hover:shadow-md hover:-translate-y-0.5",
                                isAiAndDisabled && "opacity-50 bg-slate-50 dark:bg-slate-900 cursor-not-allowed"
                            )}>
                                {isSelected && (
                                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-emerald-500 to-transparent -mr-6 -mt-6 rotate-45 z-10" />
                                )}
                                
                                <CardHeader className="pb-3 pt-4">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {/* Currency Badge */}
                                            <Badge variant="outline" className={cn("capitalize flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border-0", styles.badgeBg, styles.badgeText)}>
                                                <CurrencyIcon className="h-3.5 w-3.5" /> {q.currencyType}
                                            </Badge>
                                            
                                            {/* Marks Badge */}
                                            <Badge variant="secondary" className="text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                {getQuestionMarks(q)} Marks
                                            </Badge>

                                            {/* AI Badge */}
                                            {q.gradingMode === 'ai' && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="secondary" className="text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 gap-1">
                                                                <Bot className="h-3 w-3" /> AI
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>This is an AI-graded question.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary -mt-1 -mr-2" onClick={() => handleViewClick(q)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <CardTitle className="text-base font-semibold leading-tight line-clamp-1">
                                        {q.name || "Untitled Question"}
                                    </CardTitle>
                                </CardHeader>
                                
                                <CardContent className="pb-3 flex-grow">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                                            {getCleanText(q.mainQuestionText).substring(0, 150) || "No preview text available."}...
                                        </p>
                                    </div>
                                </CardContent>
                                
                                <CardFooter className="pt-0 pb-4">
                                    <Button 
                                        onClick={() => addQuestion(q, 'manual')} 
                                        disabled={isSelected || isAiAndDisabled} 
                                        className={cn("w-full transition-all font-medium", isSelected ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-white/10 dark:text-white dark:hover:bg-white/20")}
                                        variant="ghost"
                                    >
                                        {isSelected ? (
                                            <>
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Added to Worksheet
                                            </>
                                        ) : isAiAndDisabled ? (
                                            <>
                                                <Bot className="mr-2 h-4 w-4" /> AI Limit Reached
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
                        <div className="md:col-span-2 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">No questions found</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mt-1">
                                Try adjusting your search or filters to find what you're looking for.
                            </p>
                            <Button variant="link" onClick={() => setFilters({ units: [], categories: [], currencies: [] })} className="mt-4 text-primary">
                                Clear all filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* SIDEBAR / FLOATING CART LOGIC (Unchanged, relies on parent Sheet) */}
            <div className="hidden lg:block lg:col-span-1">
                 <div className="sticky top-24 space-y-4">
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <FileText className="w-32 h-32" />
                        </div>
                        <CardHeader className="pb-2 relative z-10">
                            <CardTitle className="flex items-center gap-2 text-lg font-medium text-slate-200">
                                <ShoppingCart className="h-5 w-5" /> Current Draft
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="text-4xl font-bold tracking-tight">{selectedQuestions.length}</span>
                                        <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Questions</span>
                                    </div>
                                    <Progress value={(selectedQuestions.length / 15) * 100} className="h-2 bg-slate-700" />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total Marks</p>
                                        <p className="text-xl font-bold">{totalMarks}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Est. Time</p>
                                        <p className="text-xl font-bold">{estimatedTime}m</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2 pb-6 relative z-10">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button className="w-full bg-white text-slate-900 hover:bg-slate-200 font-semibold shadow-lg" disabled={selectedQuestions.length === 0}>
                                        Review & Create
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </SheetTrigger>
                                 <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0">
                                    <SheetHeader className="p-6 pb-2 bg-slate-50 dark:bg-slate-900 border-b">
                                        <SheetTitle>Review Worksheet</SheetTitle>
                                        <SheetDescription>
                                            Review your selections before finalizing.
                                        </SheetDescription>
                                        {userIsEditor && (
                                          <div className="flex items-center space-x-2 pt-4 p-2 bg-white dark:bg-slate-950 rounded-lg border">
                                              <Label htmlFor="worksheet-type-manual" className={cn("text-xs uppercase font-bold tracking-wider", worksheetType === 'sample' ? 'text-primary' : 'text-muted-foreground')}>
                                                  Sample
                                              </Label>
                                              <Switch id="worksheet-type-manual" checked={worksheetType === 'classroom'} onCheckedChange={(checked) => setWorksheetType(checked ? 'classroom' : 'sample')} />
                                              <Label htmlFor="worksheet-type-manual" className={cn("text-xs uppercase font-bold tracking-wider", worksheetType === 'classroom' ? 'text-primary' : 'text-muted-foreground')}>
                                                Classroom
                                              </Label>
                                          </div>
                                        )}
                                    </SheetHeader>
                                    
                                    <div className="flex-grow overflow-y-auto">
                                        <Tabs defaultValue="blueprint" className="flex-grow flex flex-col mt-4">
                                            <div className="px-6">
                                                <TabsList className="w-full">
                                                    <TabsTrigger value="blueprint" className="flex-1">Blueprint</TabsTrigger>
                                                    <TabsTrigger value="review" className="flex-1">Question List</TabsTrigger>
                                                </TabsList>
                                            </div>
                                            
                                            <div className="flex-grow overflow-y-auto p-6">
                                                <TabsContent value="blueprint" className="mt-0 space-y-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10">
                                                                <p className="text-3xl font-bold text-primary">{selectedQuestions.length}</p>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Questions</p>
                                                            </div>
                                                            <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10">
                                                                <p className="text-3xl font-bold text-primary">{totalMarks}</p>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Marks</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-semibold flex items-center gap-2"><Filter className="h-4 w-4"/> Unit Distribution</h4>
                                                            <div className="space-y-3">
                                                                {Object.entries(breakdownByUnit).map(([name, data]) => (
                                                                    <div key={name}>
                                                                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                                                            <span>{name}</span>
                                                                            <span className="font-mono">{Math.round((data.count / selectedQuestions.length) * 100)}%</span>
                                                                        </div>
                                                                        <Progress value={(data.count / selectedQuestions.length) * 100} className="h-2" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                </TabsContent>
                                                
                                                <TabsContent value="review" className="mt-0 space-y-3">
                                                        {selectedQuestions.map(q => {
                                                            const CurrencyIcon = currencyIcons[q.currencyType] || Sparkles;
                                                            return (
                                                                <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border bg-white dark:bg-slate-900 shadow-sm relative group">
                                                                    <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                                                        <CurrencyIcon className="h-4 w-4 text-muted-foreground" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge variant="outline" className="text-[10px] h-5">{q.currencyType}</Badge>
                                                                            {q.gradingMode === 'ai' && <Badge variant="secondary" className="text-[10px] h-5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">AI</Badge>}
                                                                        </div>
                                                                        <p className="text-sm font-medium line-clamp-1">{q.name || "Untitled Question"}</p>
                                                                        <p className="text-xs text-muted-foreground truncate">{unitMap.get(q.unitId)}</p>
                                                                    </div>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeQuestion(q.id)}>
                                                                        <Trash2 className="h-4 w-4"/>
                                                                    </Button>
                                                                </div>
                                                            )
                                                        })}
                                                        {selectedQuestions.length === 0 && (
                                                            <div className="text-center py-12 text-muted-foreground">
                                                                <p>No questions selected yet.</p>
                                                            </div>
                                                        )}
                                                </TabsContent>
                                            </div>
                                        </Tabs>
                                    </div>
                                    
                                    <SheetFooter className="p-6 pt-2 bg-slate-50 dark:bg-slate-900 border-t">
                                        <div className="w-full space-y-4">
                                             <div className="flex justify-between items-center text-sm font-medium">
                                                <span className="text-muted-foreground">Estimated Time</span>
                                                <span>{estimatedTime} mins</span>
                                            </div>
                                            {!userIsEditor && (creationCost.coins > 0 || creationCost.gold > 0 || creationCost.diamonds > 0 || (creationCost.aiCredits ?? 0) > 0) && (
                                                 <div className="flex justify-between items-center text-sm font-medium">
                                                    <span className="text-muted-foreground">Creation Cost</span>
                                                    <div className="flex gap-2">
                                                        {creationCost.coins > 0 && <span className="flex items-center text-yellow-600"><Coins className="mr-1 h-3 w-3" />{creationCost.coins}</span>}
                                                        {creationCost.gold > 0 && <span className="flex items-center text-amber-600"><Crown className="mr-1 h-3 w-3" />{creationCost.gold}</span>}
                                                        {creationCost.diamonds > 0 && <span className="flex items-center text-blue-600"><Gem className="mr-1 h-3 w-3" />{creationCost.diamonds}</span>}
                                                        {(creationCost.aiCredits ?? 0) > 0 && <span className="flex items-center text-indigo-600"><BrainCircuit className="mr-1 h-3 w-3" />{creationCost.aiCredits}</span>}
                                                    </div>
                                                </div>
                                            )}
                                             <Button className="w-full h-11 text-base font-semibold shadow-lg" onClick={handleCreateClick} disabled={!canAfford}>
                                                {!canAfford ? 'Insufficient Funds' : 'Generate Worksheet'}
                                                <ArrowRight className="ml-2 h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </SheetFooter>
                                </SheetContent>
                            </Sheet>
                        </CardFooter>
                    </Card>
                 </div>
            </div>
            
            {/* Floating button for mobile */}
            <div className="lg:hidden fixed bottom-24 right-6 z-50">
                 <Sheet>
                    <SheetTrigger asChild>
                       <Button 
                            size="lg" 
                            className={cn("rounded-full h-16 w-16 shadow-2xl bg-gradient-to-r from-primary to-indigo-600 hover:scale-105 transition-transform border-4 border-white dark:border-slate-950", animateCart && "animate-pulse ring-4 ring-primary/30")}
                            disabled={selectedQuestions.length === 0}
                        >
                            <ShoppingCart className="h-6 w-6 text-white" />
                            {selectedQuestions.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm border-2 border-white dark:border-slate-950">
                                    {selectedQuestions.length}
                                </span>
                            )}
                        </Button>
                    </SheetTrigger>
                     <SheetContent className="w-[90vw] flex flex-col p-0">
                        <SheetHeader className="p-6 pb-2 bg-slate-50 dark:bg-slate-900 border-b">
                            <SheetTitle>Review Worksheet</SheetTitle>
                            <SheetDescription>
                                Review your selections before finalizing.
                            </SheetDescription>
                            {userIsEditor && (
                              <div className="flex items-center space-x-2 pt-4 p-2 bg-white dark:bg-slate-950 rounded-lg border">
                                  <Label htmlFor="worksheet-type-mobile" className={cn("text-xs uppercase font-bold tracking-wider", worksheetType === 'sample' ? 'text-primary' : 'text-muted-foreground')}>
                                      Sample
                                  </Label>
                                  <Switch id="worksheet-type-mobile" checked={worksheetType === 'classroom'} onCheckedChange={(checked) => setWorksheetType(checked ? 'classroom' : 'sample')} />
                                  <Label htmlFor="worksheet-type-mobile" className={cn("text-xs uppercase font-bold tracking-wider", worksheetType === 'classroom' ? 'text-primary' : 'text-muted-foreground')}>
                                    Classroom
                                  </Label>
                              </div>
                            )}
                        </SheetHeader>
                        
                        <div className="flex-grow overflow-y-auto">
                            <Tabs defaultValue="blueprint" className="flex-grow flex flex-col mt-4">
                                <div className="px-6">
                                    <TabsList className="w-full">
                                        <TabsTrigger value="blueprint" className="flex-1">Blueprint</TabsTrigger>
                                        <TabsTrigger value="review" className="flex-1">Question List</TabsTrigger>
                                    </TabsList>
                                </div>
                                
                                <div className="flex-grow overflow-y-auto p-6">
                                    <TabsContent value="blueprint" className="mt-0 space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10">
                                                    <p className="text-3xl font-bold text-primary">{selectedQuestions.length}</p>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Questions</p>
                                                </div>
                                                <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10">
                                                    <p className="text-3xl font-bold text-primary">{totalMarks}</p>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Marks</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-semibold flex items-center gap-2"><Filter className="h-4 w-4"/> Unit Distribution</h4>
                                                <div className="space-y-3">
                                                    {Object.entries(breakdownByUnit).map(([name, data]) => (
                                                        <div key={name}>
                                                            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                                                <span>{name}</span>
                                                                <span className="font-mono">{Math.round((data.count / selectedQuestions.length) * 100)}%</span>
                                                            </div>
                                                            <Progress value={(data.count / selectedQuestions.length) * 100} className="h-2" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="review" className="mt-0 space-y-3">
                                            {selectedQuestions.map(q => {
                                                const CurrencyIcon = currencyIcons[q.currencyType] || Sparkles;
                                                return (
                                                    <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border bg-white dark:bg-slate-900 shadow-sm relative group">
                                                        <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                                            <CurrencyIcon className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge variant="outline" className="text-[10px] h-5">{q.currencyType}</Badge>
                                                                {q.gradingMode === 'ai' && <Badge variant="secondary" className="text-[10px] h-5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">AI</Badge>}
                                                            </div>
                                                            <p className="text-sm font-medium line-clamp-1">{q.name || "Untitled Question"}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{unitMap.get(q.unitId)}</p>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeQuestion(q.id)}>
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </div>
                                                )
                                            })}
                                            {selectedQuestions.length === 0 && (
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <p>No questions selected yet.</p>
                                                </div>
                                            )}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                        
                        <SheetFooter className="p-6 pt-2 bg-slate-50 dark:bg-slate-900 border-t">
                            <div className="w-full space-y-4">
                                 <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-muted-foreground">Estimated Time</span>
                                    <span>{estimatedTime} mins</span>
                                </div>
                                {!userIsEditor && (creationCost.coins > 0 || creationCost.gold > 0 || creationCost.diamonds > 0 || (creationCost.aiCredits ?? 0) > 0) && (
                                     <div className="flex justify-between items-center text-sm font-medium">
                                        <span className="text-muted-foreground">Creation Cost</span>
                                        <div className="flex gap-2">
                                            {creationCost.coins > 0 && <span className="flex items-center text-yellow-600"><Coins className="mr-1 h-3 w-3" />{creationCost.coins}</span>}
                                            {creationCost.gold > 0 && <span className="flex items-center text-amber-600"><Crown className="mr-1 h-3 w-3" />{creationCost.gold}</span>}
                                            {creationCost.diamonds > 0 && <span className="flex items-center text-blue-600"><Gem className="mr-1 h-3 w-3" />{creationCost.diamonds}</span>}
                                            {(creationCost.aiCredits ?? 0) > 0 && <span className="flex items-center text-indigo-600"><BrainCircuit className="mr-1 h-3 w-3" />{creationCost.aiCredits}</span>}
                                        </div>
                                    </div>
                                )}
                                 <Button className="w-full h-11 text-base font-semibold shadow-lg" onClick={handleCreateClick} disabled={!canAfford}>
                                    {!canAfford ? 'Insufficient Funds' : 'Generate Worksheet'}
                                    <ArrowRight className="ml-2 h-4 w-4"/>
                                </Button>
                            </div>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
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
                    <div className="prose dark:prose-invert max-w-none border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-sm" dangerouslySetInnerHTML={{ __html: processedQuestionText }} />
                    
                    {viewingQuestion?.solutionSteps && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Marking Scheme</h4>
                            <div className="grid gap-2">
                                {viewingQuestion.solutionSteps.map((step, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Step {i+1}</span>
                                        <Badge variant="outline" className="font-mono">{step.subQuestions.reduce((a,b)=>a+b.marks,0)} marks</Badge>
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
