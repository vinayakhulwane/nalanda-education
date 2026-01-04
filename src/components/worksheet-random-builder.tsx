'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Question, CurrencyType, Unit, Category, EconomySettings } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ShoppingCart, PlusCircle, Filter, Trash2, Bot, Coins, Gem, Crown, Sparkles, Wand2, PieChart, ArrowRight, Search, BrainCircuit, X, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from './ui/sheet';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { calculateWorksheetCost } from '@/lib/wallet';
import { useToast } from "@/components/ui/use-toast";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"; // Assuming you have a drawer component for better mobile sheets

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

// Defined at top level to avoid ReferenceError
const allCurrencyTypes: CurrencyType[] = ['spark', 'coin', 'gold', 'diamond'];

// New styles map for the premium card look
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

    const [worksheetType, setWorksheetType] = useState<'classroom' | 'sample'>('classroom');
    const { userProfile } = useUser();
    const firestore = useFirestore();

    const { toast } = useToast();
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

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

    const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
    const { data: settings } = useDoc<EconomySettings>(settingsRef);

    useEffect(() => {
        setFilters(prev => ({ ...prev, categories: [] }));
    }, [filters.units]);

    const availableCategories = useMemo(() => {
        if (filters.units.length === 0) return categories;
        return categories.filter(c => filters.units.includes(c.unitId));
    }, [categories, filters.units]);

    // Filtered lists based on search terms
    const filteredUnitsList = useMemo(() => {
        return units.filter(u => u.name.toLowerCase().includes(filterSearch.unit.toLowerCase()));
    }, [units, filterSearch.unit]);

    const filteredCategoriesList = useMemo(() => {
        return availableCategories.filter(c => c.name.toLowerCase().includes(filterSearch.category.toLowerCase()));
    }, [availableCategories, filterSearch.category]);

    const filteredCurrenciesList = useMemo(() => {
        // Now accessible because it's defined at the top
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
            const newValues = isChecked
                ? [...currentValues, value]
                : currentValues.filter(v => v !== value);
            return { ...prev, [filterType]: newValues };
        });
    }

    const activeFilterCount = filters.units.length + filters.categories.length + filters.currencies.length;

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

    // Review Sheet Content (Refactored for cleaner reuse in mobile/desktop sheets)
    const ReviewSheetContent = () => (
        <div className="flex-grow flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                {userIsEditor && (
                    <div className="flex items-center space-x-2 p-1 bg-white dark:bg-slate-950 rounded-lg border w-fit">
                        <Label htmlFor="worksheet-type-sheet" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 cursor-pointer transition-colors", worksheetType === 'sample' ? 'text-primary' : 'text-muted-foreground')}>
                            Sample
                        </Label>
                        <Switch id="worksheet-type-sheet" checked={worksheetType === 'classroom'} onCheckedChange={(checked) => setWorksheetType(checked ? 'classroom' : 'sample')} className="scale-75" />
                        <Label htmlFor="worksheet-type-sheet" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 cursor-pointer transition-colors", worksheetType === 'classroom' ? 'text-primary' : 'text-muted-foreground')}>
                            Classroom
                        </Label>
                    </div>
                )}
            </div>

            <Tabs defaultValue="blueprint" className="flex-grow flex flex-col">
                <div className="px-6 pt-4">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                        <TabsTrigger value="review">Questions</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                    <TabsContent value="blueprint" className="mt-0 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10 flex flex-col items-center justify-center">
                                <p className="text-3xl font-bold text-primary">{selectedQuestions.length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">Questions</p>
                            </div>
                            <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10 flex flex-col items-center justify-center">
                                <p className="text-3xl font-bold text-primary">{totalMarks}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">Total Marks</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Filter className="h-4 w-4 text-muted-foreground" /> Unit Distribution</h4>
                            {Object.keys(breakdownByUnit).length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No questions selected.</p>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(breakdownByUnit).map(([name, data]) => (
                                        <div key={name}>
                                            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                                <span className="truncate pr-2">{name}</span>
                                                <span className="font-mono font-medium">{Math.round((data.count / selectedQuestions.length) * 100)}%</span>
                                            </div>
                                            <Progress value={(data.count / selectedQuestions.length) * 100} className="h-2" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="review" className="mt-0 space-y-3 pb-20">
                         {selectedQuestions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                <p>No questions selected yet.</p>
                            </div>
                        ) : (
                            selectedQuestions.map(q => {
                                const CurrencyIcon = currencyIcons[q.currencyType] || Sparkles;
                                return (
                                    <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm relative group active:scale-[0.99] transition-transform">
                                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                                            <CurrencyIcon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-slate-200 dark:border-slate-700">{q.currencyType}</Badge>
                                                {q.gradingMode === 'ai' && <Badge variant="secondary" className="text-[10px] h-5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">AI</Badge>}
                                            </div>
                                            <p className="text-sm font-medium line-clamp-2 text-slate-800 dark:text-slate-200 mb-0.5">{q.name || "Untitled Question"}</p>
                                            <p className="text-xs text-muted-foreground truncate">{unitMap.get(q.unitId)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 -mr-2"
                                            onClick={() => removeQuestion(q.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            })
                        )}
                    </TabsContent>
                </div>
            </Tabs>
            
            <div className="p-4 border-t bg-white dark:bg-slate-950 mt-auto">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium px-1">
                        <span className="text-muted-foreground">Estimated Time</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{estimatedTime} mins</span>
                    </div>
                    {!userIsEditor && (creationCost.coins > 0 || creationCost.gold > 0 || creationCost.diamonds > 0 || (creationCost.aiCredits ?? 0) > 0) && (
                        <div className="flex justify-between items-center text-sm font-medium px-1">
                            <span className="text-muted-foreground">Creation Cost</span>
                            <div className="flex gap-2.5">
                                {creationCost.coins > 0 && <span className="flex items-center text-yellow-600 dark:text-yellow-500 font-bold"><Coins className="mr-1 h-3.5 w-3.5" />{creationCost.coins}</span>}
                                {creationCost.gold > 0 && <span className="flex items-center text-amber-600 dark:text-amber-500 font-bold"><Crown className="mr-1 h-3.5 w-3.5" />{creationCost.gold}</span>}
                                {creationCost.diamonds > 0 && <span className="flex items-center text-blue-600 dark:text-blue-500 font-bold"><Gem className="mr-1 h-3.5 w-3.5" />{creationCost.diamonds}</span>}
                                {(creationCost.aiCredits ?? 0) > 0 && <span className="flex items-center text-indigo-600 dark:text-indigo-400 font-bold"><BrainCircuit className="mr-1 h-3.5 w-3.5" />{creationCost.aiCredits}</span>}
                            </div>
                        </div>
                    )}
                    <Button 
                        className="w-full h-12 text-base font-bold shadow-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 rounded-xl" 
                        onClick={handleCreateClick} 
                        disabled={!canAfford || selectedQuestions.length === 0}
                    >
                        {!canAfford ? 'Insufficient Funds' : 'Generate Worksheet'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );

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
                                <Button variant="outline" className="gap-2 w-full md:w-auto justify-between md:justify-center rounded-xl h-10 border-slate-200 dark:border-slate-800">
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
                                <div className="h-full flex flex-col">
                                    <Tabs defaultValue="unit" className="flex-grow flex flex-col h-full">
                                        <div className="px-6 pt-4">
                                            <TabsList className="w-full grid grid-cols-3">
                                                <TabsTrigger value="unit">Unit</TabsTrigger>
                                                <TabsTrigger value="category">Category</TabsTrigger>
                                                <TabsTrigger value="currency">Type</TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                                             <TabsContent value="unit" className="mt-0 h-full">
                                                <div className="relative mb-4">
                                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search units..."
                                                        className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-900"
                                                        value={filterSearch.unit}
                                                        onChange={(e) => setFilterSearch(prev => ({ ...prev, unit: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    {filteredUnitsList.map(unit => (
                                                        <div key={unit.id} className="flex items-center space-x-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.99] cursor-pointer" onClick={() => handleFilterChange('units', unit.id, !filters.units.includes(unit.id))}>
                                                            <Checkbox
                                                                id={`filter-unit-${unit.id}`}
                                                                checked={filters.units.includes(unit.id)}
                                                                onCheckedChange={(checked) => handleFilterChange('units', unit.id, !!checked)}
                                                                className="rounded-md h-5 w-5"
                                                            />
                                                            <Label htmlFor={`filter-unit-${unit.id}`} className="capitalize flex-grow cursor-pointer font-medium text-base">{unit.name}</Label>
                                                        </div>
                                                    ))}
                                                    {filteredUnitsList.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No units found.</p>}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="category" className="mt-0 h-full">
                                                <div className="relative mb-4">
                                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search categories..."
                                                        className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-900"
                                                        value={filterSearch.category}
                                                        onChange={(e) => setFilterSearch(prev => ({ ...prev, category: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    {filteredCategoriesList.map(cat => (
                                                        <div key={cat.id} className="flex items-center space-x-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.99] cursor-pointer" onClick={() => handleFilterChange('categories', cat.id, !filters.categories.includes(cat.id))}>
                                                            <Checkbox
                                                                id={`filter-cat-${cat.id}`}
                                                                checked={filters.categories.includes(cat.id)}
                                                                onCheckedChange={(checked) => handleFilterChange('categories', cat.id, !!checked)}
                                                                className="rounded-md h-5 w-5"
                                                            />
                                                            <Label htmlFor={`filter-cat-${cat.id}`} className="capitalize flex-grow cursor-pointer font-medium text-base">{cat.name}</Label>
                                                        </div>
                                                    ))}
                                                    {filters.units.length > 0 && availableCategories.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No categories found for selected unit(s).</p>}
                                                    {filters.units.length === 0 && <div className="text-center py-8 px-4"><p className="text-sm text-muted-foreground mb-2">Select a unit first to see categories.</p><Button variant="outline" size="sm" onClick={() => document.getElementById('filter-unit-tab')?.click()}>Go to Units</Button></div>}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="currency" className="mt-0 h-full">
                                                <div className="relative mb-4">
                                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search types..."
                                                        className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-900"
                                                        value={filterSearch.currency}
                                                        onChange={(e) => setFilterSearch(prev => ({ ...prev, currency: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    {filteredCurrenciesList.map(currency => (
                                                        <div key={currency} className="flex items-center space-x-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.99] cursor-pointer" onClick={() => handleFilterChange('currencies', currency, !filters.currencies.includes(currency))}>
                                                            <Checkbox
                                                                id={`filter-currency-${currency}`}
                                                                checked={filters.currencies.includes(currency)}
                                                                onCheckedChange={(checked) => handleFilterChange('currencies', currency, !!checked)}
                                                                className="rounded-md h-5 w-5"
                                                            />
                                                            <Label htmlFor={`filter-currency-${currency}`} className="capitalize flex-grow cursor-pointer font-medium text-base">{currency}</Label>
                                                        </div>
                                                    ))}
                                                    {filteredCurrenciesList.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No types found.</p>}
                                                </div>
                                            </TabsContent>
                                        </div>

                                        {(filters.units.length > 0 || filters.categories.length > 0 || filters.currencies.length > 0) && (
                                            <div className="p-4 border-t bg-white dark:bg-slate-950">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full h-11 rounded-xl"
                                                        onClick={() => setFilters({ units: [], categories: [], currencies: [] })}
                                                    >
                                                        Clear All
                                                    </Button>
                                                    <SheetClose asChild>
                                                        <Button className="w-full h-11 rounded-xl">View Results</Button>
                                                    </SheetClose>
                                                </div>
                                            </div>
                                        )}
                                    </Tabs>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                {/* AVAILABLE POOL BANNER (Mobile Optimized) */}
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

            {/* 2. BREAKDOWNS (Scrollable on Mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl">
                    <CardHeader className="pb-3 pt-5 px-5">
                        <CardTitle className="text-base text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
                           <Filter className="h-4 w-4" /> Breakdown by Unit
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                        <div className="space-y-2 overflow-y-auto max-h-[180px] pr-2 custom-scrollbar">
                            {Object.entries(questionsByUnit).map(([unitName, count]) => (
                                <div key={unitName} className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <span className="font-medium truncate mr-2 text-slate-700 dark:text-slate-300">{unitName}</span>
                                    <Badge variant="secondary" className="h-6 px-2.5 rounded-md bg-white dark:bg-slate-800 shadow-sm">{count}</Badge>
                                </div>
                            ))}
                            {Object.keys(questionsByUnit).length === 0 && <p className="text-sm text-center text-muted-foreground py-8 italic">No data available.</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="hidden md:flex flex-col shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl">
                     <CardHeader className="pb-3 pt-5 px-5">
                        <CardTitle className="text-base text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
                           <Filter className="h-4 w-4" /> Breakdown by Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 flex-grow">
                        <div className="space-y-2 overflow-y-auto max-h-[180px] pr-2 custom-scrollbar h-full">
                            {Object.entries(questionsByCategory).map(([catName, count]) => (
                                <div key={catName} className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <span className="font-medium truncate mr-2 text-slate-700 dark:text-slate-300">{catName}</span>
                                    <Badge variant="secondary" className="h-6 px-2.5 rounded-md bg-white dark:bg-slate-800 shadow-sm">{count}</Badge>
                                </div>
                            ))}
                            {Object.keys(questionsByCategory).length === 0 && <p className="text-sm text-center text-muted-foreground py-8 italic">No data available.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. QUICK ADD CARDS (Responsive Grid) */}
            <div>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4 px-1">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    Quick Add by Type
                </h3>
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
                                         <div className={cn("p-2 rounded-xl", styles.bg, "bg-white/80 dark:bg-slate-950/30 ring-1 shadow-sm", styles.border)}>
                                            <CurrencyIcon className={cn("h-6 w-6 md:h-8 md:w-8", styles.text)} />
                                        </div>
                                        <div className="w-full">
                                            <div className="flex justify-between items-center w-full mb-1">
                                                <p className={cn("capitalize font-bold text-lg md:text-xl", styles.text)}>{currency}</p>
                                                 <Badge variant="outline" className={cn("bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm h-5 text-[10px] px-1.5", styles.text, styles.border)}>
                                                    {remaining} left
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <Button
                                            className={cn("w-full h-10 font-semibold text-xs md:text-sm gap-2 bg-white/60 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-950 backdrop-blur-sm shadow-sm border-0", styles.text)}
                                            onClick={() => addRandomQuestion(currency)}
                                            disabled={remaining <= 0}
                                            variant="secondary"
                                            size="sm"
                                        >
                                            Add Random <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* REVIEW SHEET (Floating Action Button for Mobile) */}
            <Sheet>
                <SheetTrigger asChild>
                    <div className="fixed bottom-24 right-6 z-40 md:z-50">
                        <Button
                            size="lg"
                            className={cn("rounded-full h-14 w-14 md:h-16 md:w-16 shadow-2xl bg-gradient-to-r from-primary to-indigo-600 hover:scale-105 transition-transform border-4 border-white dark:border-slate-950", animateCart && "animate-pulse ring-4 ring-primary/30")}
                            disabled={selectedQuestions.length === 0}
                        >
                            <ShoppingCart className="h-6 w-6 text-white" />
                            {selectedQuestions.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md border-2 border-white dark:border-slate-950 animate-in zoom-in">
                                    {selectedQuestions.length}
                                </span>
                            )}
                        </Button>
                    </div>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[540px] flex flex-col p-0 h-[100dvh] md:h-full rounded-none md:rounded-l-2xl border-l-0 md:border-l">
                   <ReviewSheetContent />
                </SheetContent>
            </Sheet>
        </div>
    );
}

    