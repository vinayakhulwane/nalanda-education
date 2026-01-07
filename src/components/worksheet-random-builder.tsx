'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Question, CurrencyType, Unit, Category, EconomySettings } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { ShoppingCart, PlusCircle, Filter, Bot, Coins, Gem, Crown, Sparkles, Wand2, PieChart, Search, BrainCircuit, X, Eye, Trash2, ArrowRight, AlertCircle, FileText, Lock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from './ui/sheet';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { calculateWorksheetCost } from '@/lib/wallet';
import { Progress } from './ui/progress';

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

// Unified Icon Map with Plural Support
const currencyIcons: Record<string, React.ElementType> = {
    spark: Sparkles, sparks: Sparkles,
    coin: Coins, coins: Coins,
    gold: Crown, golds: Crown,
    diamond: Gem, diamonds: Gem,
    aicredits: BrainCircuit, aiCredits: BrainCircuit,
};

const allCurrencyTypes: CurrencyType[] = ['spark', 'coin', 'gold', 'diamond'];

const currencyStyles: Record<string, { bg: string, text: string, border: string, iconBg: string }> = {
    spark: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', iconBg: 'text-slate-300/50 dark:text-slate-600/50' },
    sparks: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', iconBg: 'text-slate-300/50 dark:text-slate-600/50' },
    
    coin: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', iconBg: 'text-yellow-300/50 dark:text-yellow-600/50' },
    coins: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', iconBg: 'text-yellow-300/50 dark:text-yellow-600/50' },
    
    gold: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', iconBg: 'text-amber-300/50 dark:text-amber-600/50' },
    golds: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', iconBg: 'text-amber-300/50 dark:text-amber-600/50' },
    
    diamond: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', iconBg: 'text-blue-300/50 dark:text-blue-600/50' },
    diamonds: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', iconBg: 'text-blue-300/50 dark:text-blue-600/50' },
    
    aicredits: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', iconBg: 'text-indigo-300/50 dark:text-indigo-600/50' },
    aiCredits: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', iconBg: 'text-indigo-300/50 dark:text-indigo-600/50' }
};

// --- COST DISPLAY COMPONENT ---
const CostDisplay = ({ creationCost }: { creationCost: any }) => {
    const costs = Object.entries(creationCost || {}).filter(([_, val]) => typeof val === 'number' && val > 0);
    if (costs.length === 0) return <span className="text-emerald-400 font-bold text-sm">Free</span>;
    return (
        <div className="flex flex-wrap gap-2">
            {costs.map(([key, val]) => {
                const lowerKey = key.toLowerCase();
                const Icon = currencyIcons[key] || currencyIcons[lowerKey] || currencyIcons[lowerKey + 's'] || Coins; 
                return (
                    <div key={key} className="flex items-center gap-1 text-xs font-bold bg-white/20 px-2 py-0.5 rounded-md text-white">
                        <Icon className="h-3 w-3" /> {val as number}
                    </div>
                );
            })}
        </div>
    );
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
    const [filters, setFilters] = useState<{ units: string[]; categories: string[]; currencies: CurrencyType[]; }>({ units: [], categories: [], currencies: [] });
    const [filterSearch, setFilterSearch] = useState<{ unit: string; category: string; currency: string; }>({ unit: '', category: '', currency: '' });
    const [worksheetType, setWorksheetType] = useState<'classroom' | 'sample'>('classroom');
    
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    // Calculate Cart Data (Cost, Marks, etc.)
    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
    const { data: settings } = useDoc<EconomySettings>(settingsRef);

    const { totalMarks, estimatedTime, breakdownByUnit, creationCost } = useMemo(() => {
        let totalMarks = 0;
        const breakdownByUnit: Record<string, { count: number; marks: number }> = {};
        const unitMap = new Map(units.map(u => [u.id, u.name]));

        selectedQuestions.forEach(q => {
            const marks = q.solutionSteps?.reduce((stepSum, step) => stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
            totalMarks += marks;
            const unitName = unitMap.get(q.unitId) || 'Uncategorized';
            if (!breakdownByUnit[unitName]) breakdownByUnit[unitName] = { count: 0, marks: 0 };
            breakdownByUnit[unitName].count++;
            breakdownByUnit[unitName].marks += marks;
        });
        const creationCost = calculateWorksheetCost(selectedQuestions, settings ?? undefined);
        return { totalMarks, estimatedTime: Math.ceil((totalMarks * 20) / 60), breakdownByUnit, creationCost };
    }, [selectedQuestions, units, settings]);

    const canAfford = useMemo(() => {
        if (userIsEditor) return true;
        if (!userProfile) return false;
        
        const userCoins = userProfile.coins || 0;
        const userGold = userProfile.gold || 0;
        const userDiamonds = userProfile.diamonds || 0;
        const userAiCredits = userProfile.aiCredits || 0;

        const cost = creationCost as any;
        const costCoins = cost.coins || cost.coin || 0;
        const costGold = cost.gold || 0;
        const costDiamonds = cost.diamonds || cost.diamond || 0;
        const costAiCredits = cost.aiCredits || 0;

        return (userCoins >= costCoins) && 
               (userGold >= costGold) &&
               (userDiamonds >= costDiamonds) && 
               (userAiCredits >= costAiCredits);
    }, [userProfile, creationCost, userIsEditor]);

    const handleCreateClick = () => {
        onCreateWorksheet(userIsEditor ? worksheetType : 'practice');
    }

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

        if (candidates.length === 0) return;

        const hasAiQuestion = selectedQuestions.some(q => q.gradingMode === 'ai');

        // Filter valid candidates
        const validCandidates = candidates.filter(candidate => {
            if (candidate.gradingMode === 'ai' && hasAiQuestion) {
                return false;
            }
            return true;
        });

        if (validCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * validCandidates.length);
            const questionToAdd = validCandidates[randomIndex];
            setSelectedQuestions([...selectedQuestions, { ...questionToAdd, source: 'random' }]);
        } else {
            // Explicit toast feedback if blocked
            toast({
                variant: "destructive",
                title: "Limit Reached",
                description: "You have already added one AI-graded question. Remaining questions in this category are AI-graded and cannot be added.",
            });
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
    const isFilterActive = activeFilterCount > 0;

    const isAiLimitReached = selectedQuestions.some(q => q.gradingMode === 'ai');

    // --- REUSABLE REVIEW CONTENT COMPONENT ---
    const reviewSheetContent = (
        <div className="flex-grow flex flex-col h-full overflow-hidden">
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

                        <div className="space-y-2 pt-4">
                            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Estimated Cost</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(creationCost).filter(([_, val]) => typeof val === 'number' && val > 0).length > 0 ? Object.entries(creationCost).filter(([_, val]) => typeof val === 'number' && val > 0).map(([key, value]) => {
                                    const lowerKey = key.toLowerCase();
                                    const Icon = currencyIcons[key] || currencyIcons[lowerKey] || currencyIcons[lowerKey + 's'] || Coins;
                                    const style = currencyStyles[key] || currencyStyles[lowerKey] || currencyStyles[lowerKey + 's'] || currencyStyles.coin;
                                    return (
                                        <div key={key} className={cn("flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border dark:border-slate-700")}>
                                            <Icon className={cn("h-5 w-5", style?.text || "text-slate-500")} />
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{value as number}</span>
                                            <span className="text-xs text-muted-foreground capitalize">{key}</span>
                                        </div>
                                    )
                                }) : <p className="col-span-2 text-sm text-muted-foreground text-center py-2">No cost for this worksheet.</p>}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                <Filter className="h-4 w-4 text-muted-foreground" /> Unit Distribution
                            </h4>
                            <div className="space-y-3">
                                {Object.entries(breakdownByUnit).map(([name, data]) => (
                                    <div key={name}>
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                            <span>{name}</span>
                                            <span className="font-mono font-medium">{Math.round((data.count / selectedQuestions.length) * 100)}%</span>
                                        </div>
                                        <Progress value={(data.count / selectedQuestions.length) * 100} className="h-2" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="review" className="mt-0 space-y-3 pb-20">
                        {selectedQuestions.map(q => {
                            const qType = q.currencyType;
                            const Icon = currencyIcons[qType] || currencyIcons[qType + 's'] || Coins;
                            return (
                                <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm relative group active:scale-[0.99] transition-transform">
                                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium line-clamp-2 text-slate-800 dark:text-slate-200 mb-0.5">{q.name || "Untitled Question"}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 -mr-2" onClick={() => removeQuestion(q.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </TabsContent>
                </div>
            </Tabs>
            <div className="p-4 border-t bg-white dark:bg-slate-950 mt-auto">
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium px-1">
                        <span className="text-muted-foreground">Estimated Time</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{estimatedTime} mins</span>
                    </div>

                    {!canAfford && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>Not enough balance to create this worksheet.</span>
                        </div>
                    )}

                    <Button 
                        className={cn(
                            "w-full h-12 text-base font-bold shadow-lg rounded-xl transition-all",
                            !canAfford 
                                ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 shadow-none cursor-not-allowed" 
                                : "bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white"
                        )}
                        onClick={handleCreateClick} 
                        disabled={!canAfford || selectedQuestions.length === 0}
                    >
                        {!canAfford ? 'Insufficient Balance' : 'Generate Worksheet'} 
                        {!canAfford ? <X className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 pb-24 md:pb-0">
            <div className="lg:col-span-2 space-y-6">
                
                {/* HEADER SECTION WITH FILTER */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm">
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
                                <Tabs defaultValue="unit" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 m-2 rounded-md">
                                        <TabsTrigger value="unit" className="rounded-sm">Unit</TabsTrigger>
                                        <TabsTrigger value="category" className="rounded-sm" disabled={filters.units.length > 0 && availableCategories.length === 0}>Category</TabsTrigger>
                                        <TabsTrigger value="currency" className="rounded-sm">Type</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="unit" className="mt-0">
                                        <div className="px-3 pt-2 pb-3 border-b">
                                            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search units..." className="pl-8 h-9" value={filterSearch.unit} onChange={(e) => setFilterSearch(prev => ({ ...prev, unit: e.target.value }))} /></div>
                                        </div>
                                        <div className="max-h-[240px] overflow-y-auto py-1 px-1">
                                            {filteredUnitsList.map(unit => (
                                                <div key={unit.id} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Checkbox id={`random-filter-unit-${unit.id}`} checked={filters.units.includes(unit.id)} onCheckedChange={(checked) => handleFilterChange('units', unit.id, !!checked)} /><Label htmlFor={`random-filter-unit-${unit.id}`} className="capitalize flex-grow cursor-pointer">{unit.name}</Label></div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="category" className="mt-0"><div className="px-3 pt-2 pb-3 border-b"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search categories..." className="pl-8 h-9" value={filterSearch.category} onChange={(e) => setFilterSearch(prev => ({ ...prev, category: e.target.value }))} /></div></div><div className="max-h-[240px] overflow-y-auto py-1 px-1">{filteredCategoriesList.map(cat => (<div key={cat.id} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Checkbox id={`random-filter-cat-${cat.id}`} checked={filters.categories.includes(cat.id)} onCheckedChange={(checked) => handleFilterChange('categories', cat.id, !!checked)} /><Label htmlFor={`random-filter-cat-${cat.id}`} className="capitalize flex-grow cursor-pointer">{cat.name}</Label></div>))}</div></TabsContent>
                                    <TabsContent value="currency" className="mt-0"><div className="px-3 pt-2 pb-3 border-b"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search types..." className="pl-8 h-9" value={filterSearch.currency} onChange={(e) => setFilterSearch(prev => ({ ...prev, currency: e.target.value }))} /></div></div><div className="max-h-[240px] overflow-y-auto py-1 px-1">{filteredCurrenciesList.map(currency => (<div key={currency} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Checkbox id={`random-filter-currency-${currency}`} checked={filters.currencies.includes(currency)} onCheckedChange={(checked) => handleFilterChange('currencies', currency, !!checked)} /><Label htmlFor={`random-filter-currency-${currency}`} className="capitalize flex-grow cursor-pointer">{currency}</Label></div>))}</div></TabsContent>
                                    {(filters.units.length > 0 || filters.categories.length > 0 || filters.currencies.length > 0) && (<div className="p-2 border-t bg-slate-50 dark:bg-slate-900/50"><Button variant="ghost" size="sm" className="w-full h-8 font-normal text-muted-foreground hover:text-foreground" onClick={() => setFilters({ units: [], categories: [], currencies: [] })}>Clear all filters</Button></div>)}
                                </Tabs>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
                
                {isFilterActive && (
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-semibold text-muted-foreground ml-1 mr-1">Active:</span>
                        {filters.units.map(id => (<Badge key={id} variant="secondary" className="pl-2 pr-1 h-6 capitalize gap-1 hover:bg-slate-200 cursor-pointer rounded-md font-normal" onClick={() => handleFilterChange('units', id, false)}>{unitMap.get(id) || id}<X className="h-3 w-3 text-muted-foreground" /></Badge>))}
                        {filters.categories.map(id => (<Badge key={id} variant="secondary" className="pl-2 pr-1 h-6 capitalize gap-1 hover:bg-slate-200 cursor-pointer rounded-md font-normal" onClick={() => handleFilterChange('categories', id, false)}>{categoryMap.get(id) || id}<X className="h-3 w-3 text-muted-foreground" /></Badge>))}
                        {filters.currencies.map(c => (<Badge key={c} variant="secondary" className="pl-2 pr-1 h-6 capitalize gap-1 hover:bg-slate-200 cursor-pointer rounded-md font-normal" onClick={() => handleFilterChange('currencies', c, false)}>{c}<X className="h-3 w-3 text-muted-foreground" /></Badge>))}
                    </div>
                )}


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

                {/* QUICK ADD CARDS */}
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4 px-1"><PlusCircle className="h-5 w-5 text-primary" />Quick Add by Type</h3>
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {allCurrencyTypes.map(currency => {
                            const totalOfType = questionsByCurrency[currency] || 0;
                            const selectedOfType = selectedQuestionsByCurrency[currency] || 0;
                            const remaining = totalOfType - selectedOfType;
                            
                            // Check safe candidates for AI limit
                            const hasCandidates = availableQuestions.some(q => 
                                q.currencyType === currency && 
                                !selectedQuestions.some(sq => sq.id === q.id)
                            );
                            
                            // Check if blocked by AI rule
                            const blockedByAi = hasCandidates && isAiLimitReached && availableQuestions.filter(q => 
                                q.currencyType === currency && 
                                !selectedQuestions.some(sq => sq.id === q.id)
                            ).every(q => q.gradingMode === 'ai');

                            const isDisabled = remaining <= 0 || blockedByAi;

                            // Use singular/plural safe lookup
                            const lowerKey = currency.toLowerCase();
                            const CurrencyIcon = currencyIcons[currency] || currencyIcons[lowerKey] || currencyIcons[lowerKey + 's'] || Coins;
                            const styles = currencyStyles[currency] || currencyStyles[lowerKey] || currencyStyles[lowerKey + 's'] || currencyStyles.coin;
                            
                            return (
                                <div key={currency} className={cn("group relative flex flex-col p-4 md:p-5 rounded-2xl border transition-all overflow-hidden active:scale-[0.98]", styles.bg, styles.border)}>
                                    <CurrencyIcon className={cn("absolute -top-3 -right-3 h-24 w-24 md:h-32 md:w-32 pointer-events-none -rotate-12 opacity-40", styles.iconBg)} />
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex flex-col items-start gap-3 mb-3">
                                            <div className={cn("p-2 rounded-xl", styles.bg, "bg-white/80 dark:bg-slate-950/30 ring-1 shadow-sm", styles.border)}><CurrencyIcon className={cn("h-6 w-6 md:h-8 md:w-8", styles.text)} /></div>
                                            <div className="w-full">
                                                <div className="flex justify-between items-center w-full mb-1">
                                                    <p className={cn("capitalize font-bold text-lg md:text-xl", styles.text)}>{currency}</p>
                                                    <Badge variant="outline" className={cn("backdrop-blur-sm h-5 text-[10px] px-1.5 border", 
                                                        blockedByAi 
                                                            ? "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" 
                                                            : cn("bg-white/50 dark:bg-slate-950/50", styles.text, styles.border)
                                                    )}>
                                                        {remaining} left
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Blocked by AI Limit Message */}
                                        {blockedByAi && (
                                            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md border border-red-100 dark:border-red-900/50">
                                                <Lock className="h-3 w-3" /> AI Limit Reached
                                            </div>
                                        )}

                                        <div className="mt-auto"><Button className={cn("w-full h-10 font-semibold text-xs md:text-sm gap-2 bg-white/60 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-950 backdrop-blur-sm shadow-sm border-0", styles.text)} onClick={() => addRandomQuestion(currency)} disabled={isDisabled} variant="secondary" size="sm">Add Random <PlusCircle className="h-4 w-4" /></Button></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* DESKTOP SIDEBAR */}
            <div className="hidden lg:block lg:col-span-1">
                <div className="sticky top-24 space-y-4">
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl overflow-hidden relative rounded-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5"><FileText className="w-32 h-32" /></div>
                        <CardHeader className="pb-2 relative z-10"><CardTitle className="flex items-center gap-2 text-lg font-medium text-slate-200"><ShoppingCart className="h-5 w-5" /> Current Draft</CardTitle></CardHeader>
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
                                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total Marks</p>
                                        <p className="text-xl font-bold">{totalMarks}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Est. Time</p>
                                        <p className="text-xl font-bold">{estimatedTime}m</p>
                                    </div>
                                    {/* COST DISPLAY FOR DESKTOP */}
                                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5 col-span-2">
                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total Cost</p>
                                        <CostDisplay creationCost={creationCost} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2 pb-6 relative z-10">
                            <Sheet>
                                <SheetTrigger asChild><Button className="w-full h-12 bg-white text-slate-900 hover:bg-slate-200 font-bold shadow-lg rounded-xl" disabled={selectedQuestions.length === 0}>Review & Create <ArrowRight className="ml-2 h-4 w-4" /></Button></SheetTrigger>
                                <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 rounded-l-2xl">
                                    <SheetHeader className="p-6 pb-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
                                        <SheetTitle>Review Worksheet</SheetTitle>
                                        <SheetDescription>Review your selections before finalizing.</SheetDescription>
                                        {userIsEditor && (
                                            <div className="flex items-center space-x-2 pt-4 p-1.5 bg-white dark:bg-slate-950 rounded-xl border w-fit shadow-sm">
                                                <Label htmlFor="worksheet-type-random" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 cursor-pointer transition-colors", worksheetType === 'sample' ? 'text-primary' : 'text-muted-foreground')}>Sample</Label>
                                                <Switch id="worksheet-type-random" checked={worksheetType === 'classroom'} onCheckedChange={(checked) => setWorksheetType(checked ? 'classroom' : 'sample')} className="scale-75" />
                                                <Label htmlFor="worksheet-type-random" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 cursor-pointer transition-colors", worksheetType === 'classroom' ? 'text-primary' : 'text-muted-foreground')}>Classroom</Label>
                                            </div>
                                        )}
                                    </SheetHeader>
                                    {reviewSheetContent}
                                </SheetContent>
                            </Sheet>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            {/* MOBILE FLOATING CART */}
            <div className="lg:hidden fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2">
                {selectedQuestions.length > 0 && (
                    <div className="bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 mb-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 text-right">Total Cost</p>
                        <CostDisplay creationCost={creationCost} />
                    </div>
                )}
                
                <Sheet>
                    <SheetTrigger asChild>
                        <Button size="lg" className={cn("rounded-full h-14 w-14 shadow-2xl bg-gradient-to-r from-primary to-indigo-600 hover:scale-105 transition-transform border-4 border-white dark:border-slate-950", animateCart && "animate-pulse ring-4 ring-primary/30")} disabled={selectedQuestions.length === 0}>
                            <ShoppingCart className="h-6 w-6 text-white" />
                            {selectedQuestions.length > 0 && (<span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md border-2 border-white dark:border-slate-950 animate-in zoom-in">{selectedQuestions.length}</span>)}
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full flex flex-col p-0 h-[100dvh] rounded-none border-l-0">
                        <SheetHeader className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b sticky top-0 z-10"><div className="flex items-center justify-between"><SheetTitle className="text-xl">Review Worksheet</SheetTitle><SheetClose asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><X className="h-4 w-4" /></Button></SheetClose></div></SheetHeader>
                        {reviewSheetContent}
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
}