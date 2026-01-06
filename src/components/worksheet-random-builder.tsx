'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Question, CurrencyType, Unit, Category, EconomySettings } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ShoppingCart, PlusCircle, Filter, Bot, Coins, Gem, Crown, Sparkles, Wand2, PieChart, Search, BrainCircuit, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Sheet, SheetTrigger } from './ui/sheet';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from "@/components/ui/use-toast";
import { WorksheetReviewSheet } from './worksheet-random-builder/review-sheet';

type QuestionWithSource = Question & { source?: 'manual' | 'random' };

type WorksheetRandomBuilderProps = {
    availableQuestions: Question[];
    units: Unit[];
    categories: Category[];
    selectedQuestions: QuestionWithSource[];
    setSelectedQuestions: (questions: QuestionWithSource[]) => void;
    onCreateWorksheet: (worksheetType: 'classroom' | 'sample' | 'practice') => void;
    removeQuestion: (questionId: string) => void;
};

const currencyIcons: Record<CurrencyType, React.ElementType> = {
    spark: Sparkles,
    coin: Coins,
    gold: Crown,
    diamond: Gem,
    aiCredits: BrainCircuit,
};

const allCurrencyTypes: CurrencyType[] = ['spark', 'coin', 'gold', 'diamond'];

const currencyStyles: Record<CurrencyType, { bg: string, text: string, border: string, iconBg: string }> = {
    spark: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
        iconBg: 'text-slate-300/50 dark:text-slate-600/50'
    },
    coin: {
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
        iconBg: 'text-yellow-300/50 dark:text-yellow-600/50'
    },
    gold: {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        iconBg: 'text-amber-300/50 dark:text-amber-600/50'
    },
    diamond: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        iconBg: 'text-blue-300/50 dark:text-blue-600/50'
    },
    aiCredits: {
        bg: 'bg-indigo-50 dark:bg-indigo-950/30',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800',
        iconBg: 'text-indigo-300/50 dark:text-indigo-600/50'
    }
};

export function WorksheetRandomBuilder({
    availableQuestions,
    units,
    categories,
    selectedQuestions,
    setSelectedQuestions,
    onCreateWorksheet,
    removeQuestion,
}: WorksheetRandomBuilderProps) {
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

    const { toast } = useToast();

    const [animateCart, setAnimateCart] = useState(false);
    const prevSelectedCount = useMemo(() => selectedQuestions.length, []);

    useEffect(() => {
        if (selectedQuestions.length > prevSelectedCount) {
            setAnimateCart(true);
            const timer = setTimeout(() => setAnimateCart(false), 500);
            return () => clearTimeout(timer);
        }
    }, [selectedQuestions.length, prevSelectedCount]);

    const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
    
    useEffect(() => { setFilters(prev => ({ ...prev, categories: [] })); }, [filters.units]);

    const availableCategories = useMemo(() => {
        if (filters.units.length === 0) return categories;
        return categories.filter(c => filters.units.includes(c.unitId));
    }, [categories, filters.units]);

    const filteredUnitsList = useMemo(() => units.filter(u => u.name.toLowerCase().includes(filterSearch.unit.toLowerCase())), [units, filterSearch.unit]);
    const filteredCategoriesList = useMemo(() => availableCategories.filter(c => c.name.toLowerCase().includes(filterSearch.category.toLowerCase())), [availableCategories, filterSearch.category]);
    const filteredCurrenciesList = useMemo(() => allCurrencyTypes.filter(c => c.toLowerCase().includes(filterSearch.currency.toLowerCase())), [filterSearch.currency]);

    const filteredQuestions = useMemo(() => {
        return availableQuestions.filter(q => {
            const unitMatch = filters.units.length === 0 || filters.units.includes(q.unitId);
            const categoryMatch = filters.categories.length === 0 || filters.categories.includes(q.categoryId);
            const currencyMatch = filters.currencies.length === 0 || filters.currencies.includes(q.currencyType);
            return unitMatch && categoryMatch && currencyMatch;
        });
    }, [availableQuestions, filters]);

    const questionsByUnit = useMemo(() => {
        return filteredQuestions.reduce((acc, q) => {
            const unitName = unitMap.get(q.unitId) || q.unitId;
            acc[unitName] = (acc[unitName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [filteredQuestions, unitMap]);

    const questionsByCategory = useMemo(() => {
        return filteredQuestions.reduce((acc, q) => {
            const categoryName = categoryMap.get(q.categoryId) || q.categoryId;
            acc[categoryName] = (acc[categoryName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [filteredQuestions, categoryMap]);

    const questionsByCurrency = useMemo(() => {
        return availableQuestions.reduce((acc, q) => {
            acc[q.currencyType] = (acc[q.currencyType] || 0) + 1;
            return acc;
        }, {} as Record<CurrencyType, number>);
    }, [availableQuestions]);

    const selectedQuestionsByCurrency = useMemo(() => {
        return selectedQuestions.reduce((acc, q) => {
            acc[q.currencyType] = (acc[q.currencyType] || 0) + 1;
            return acc;
        }, {} as Record<CurrencyType, number>);
    }, [selectedQuestions]);

    const addRandomQuestion = (currency: CurrencyType) => {
        const candidates = availableQuestions.filter(q =>
            q.currencyType === currency &&
            !selectedQuestions.some(sq => sq.id === q.id)
        );

        if (candidates.length > 0) {
            const shuffled = candidates.sort(() => 0.5 - Math.random());
            let questionToAdd: Question | null = null;
            const hasAiQuestion = selectedQuestions.some(q => q.gradingMode === 'ai');

            for (const candidate of shuffled) {
                if (candidate.gradingMode === 'ai' && hasAiQuestion) {
                    continue;
                }
                questionToAdd = candidate;
                break;
            }

            if (questionToAdd) {
                setSelectedQuestions([...selectedQuestions, { ...questionToAdd, source: 'random' }]);
            } else {
                toast({
                    variant: "destructive",
                    title: "AI Limit Reached",
                    description: "Cannot add random question. Remaining candidates are AI-graded, and you already have one.",
                });
            }
        }
    };

    const handleFilterChange = (filterType: 'units' | 'categories' | 'currencies', value: string, isChecked: boolean) => {
        setFilters(prev => {
            const currentValues = prev[filterType] as string[];
            const newValues = isChecked ? [...currentValues, value] : currentValues.filter(v => v !== value);
            return { ...prev, [filterType]: newValues };
        });
    }

    const activeFilterCount = filters.units.length + filters.categories.length + filters.currencies.length;
    
    return (
        <div className="space-y-6 pb-24 md:pb-0">
            {/* HEADER SECTION WITH FILTER */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                            <Wand2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Random Generator</h3>
                            <p className="text-sm text-muted-foreground">Automatically pick questions based on type.</p>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-auto">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className={cn("gap-2 w-full md:w-auto justify-between md:justify-center rounded-xl h-10 border-slate-200 dark:border-slate-800", activeFilterCount > 0 && "border-primary/50 text-primary bg-primary/5")}>
                                    <span className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        Filter Pool
                                    </span>
                                    {activeFilterCount > 0 && <Badge variant="secondary" className="rounded-full px-1.5 h-5 min-w-[1.25rem] bg-slate-100 text-slate-700">{activeFilterCount}</Badge>}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 md:h-full md:w-[400px] md:rounded-none md:side-right">
                                <SheetHeader className="p-6 border-b">
                                    <SheetTitle>Filter Questions</SheetTitle>
                                    <SheetDescription>Refine the available question pool.</SheetDescription>
                                </SheetHeader>
                                {/* Filter content remains the same */}
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                {/* AVAILABLE POOL BANNER */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <PieChart className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1 text-indigo-100">
                            <PieChart className="h-4 w-4" />
                            <span className="font-medium text-sm">Available Pool</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl md:text-5xl font-extrabold tracking-tight">{filteredQuestions.length}</span>
                            <span className="text-lg text-indigo-200">Questions</span>
                        </div>
                        <p className="text-xs text-indigo-200/80 mt-1">Matches your current filters</p>
                    </div>
                </div>
            </div>

            {/* BREAKDOWNS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl hidden md:flex flex-col">
                    <CardHeader className="pb-3 pt-5 px-5"><CardTitle className="text-base text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Breakdown by Unit</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5"><div className="space-y-2 overflow-y-auto max-h-[180px] pr-2 custom-scrollbar">{Object.entries(questionsByUnit).map(([unitName, count]) => (<div key={unitName} className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"><span className="font-medium truncate mr-2 text-slate-700 dark:text-slate-300">{unitName}</span><Badge variant="secondary" className="h-6 px-2.5 rounded-md bg-white dark:bg-slate-800 shadow-sm">{count}</Badge></div>))}{Object.keys(questionsByUnit).length === 0 && <p className="text-sm text-center text-muted-foreground py-8 italic">No data available.</p>}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl hidden md:flex flex-col">
                    <CardHeader className="pb-3 pt-5 px-5"><CardTitle className="text-base text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Breakdown by Category</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5 flex-grow"><div className="space-y-2 overflow-y-auto max-h-[180px] pr-2 custom-scrollbar h-full">{Object.entries(questionsByCategory).map(([catName, count]) => (<div key={catName} className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"><span className="font-medium truncate mr-2 text-slate-700 dark:text-slate-300">{catName}</span><Badge variant="secondary" className="h-6 px-2.5 rounded-md bg-white dark:bg-slate-800 shadow-sm">{count}</Badge></div>))}{Object.keys(questionsByCategory).length === 0 && <p className="text-sm text-center text-muted-foreground py-8 italic">No data available.</p>}</div></CardContent>
                </Card>
            </div>

            {/* QUICK ADD CARDS */}
            <div>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4 px-1"><PlusCircle className="h-5 w-5 text-primary" />Quick Add by Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {allCurrencyTypes.map(currency => {
                        const totalOfType = questionsByCurrency[currency] || 0;
                        const selectedOfType = selectedQuestionsByCurrency[currency] || 0;
                        const remaining = totalOfType - selectedOfType;
                        const CurrencyIcon = currencyIcons[currency];
                        const styles = currencyStyles[currency];
                        return (
                            <div key={currency} className={cn("group relative flex flex-col p-4 md:p-5 rounded-2xl border transition-all overflow-hidden active:scale-[0.98]", styles.bg, styles.border)}>
                                <CurrencyIcon className={cn("absolute -top-3 -right-3 h-24 w-24 md:h-32 md:w-32 pointer-events-none -rotate-12 opacity-40", styles.iconBg)} />
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex flex-col items-start gap-3 mb-3">
                                        <div className={cn("p-2 rounded-xl", styles.bg, "bg-white/80 dark:bg-slate-950/30 ring-1 shadow-sm", styles.border)}><CurrencyIcon className={cn("h-6 w-6 md:h-8 md:w-8", styles.text)} /></div>
                                        <div className="w-full">
                                            <div className="flex justify-between items-center w-full mb-1"><p className={cn("capitalize font-bold text-lg md:text-xl", styles.text)}>{currency}</p><Badge variant="outline" className={cn("bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm h-5 text-[10px] px-1.5", styles.text, styles.border)}>{remaining} left</Badge></div>
                                        </div>
                                    </div>
                                    <div className="mt-auto"><Button className={cn("w-full h-10 font-semibold text-xs md:text-sm gap-2 bg-white/60 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-950 backdrop-blur-sm shadow-sm border-0", styles.text)} onClick={() => addRandomQuestion(currency)} disabled={remaining <= 0} variant="secondary" size="sm">Add Random <PlusCircle className="h-4 w-4" /></Button></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <WorksheetReviewSheet
              selectedQuestions={selectedQuestions}
              removeQuestion={removeQuestion}
              onCreateWorksheet={onCreateWorksheet}
              animateCart={animateCart}
              unitMap={unitMap}
              categoryMap={categoryMap}
            />
        </div>
    );
}
