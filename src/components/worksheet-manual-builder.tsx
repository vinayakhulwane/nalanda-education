'use client';

import type { Question, Unit, Category, CurrencyType, EconomySettings } from '@/types';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Plus, Bot, Coins, Crown, Gem, Sparkles, ShoppingCart, ArrowRight, Trash2, Filter, X, Eye, Check, Search, FileText, BrainCircuit } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from './ui/sheet';
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

const allCurrencyTypes: CurrencyType[] = ['spark', 'coin', 'gold', 'diamond'];

// Premium styling for currency badges
const currencyStyles: Record<CurrencyType, { badgeBg: string, badgeText: string, border: string }> = {
    spark: { badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
    coin: { badgeBg: 'bg-yellow-100 dark:bg-yellow-900/40', badgeText: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
    gold: { badgeBg: 'bg-amber-100 dark:bg-amber-900/40', badgeText: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    diamond: { badgeBg: 'bg-blue-100 dark:bg-blue-900/40', badgeText: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    aiCredits: { badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40', badgeText: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
};

// Helper to clean HTML text
const getCleanText = (html: string | undefined) => {
    if (!html) return "";
    let text = html.replace(/<[^>]*>/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return text.replace(/\s+/g, ' ').trim();
};

export default function WorksheetManualBuilder({
    availableQuestions,
    selectedQuestions,
    addQuestion,
    removeQuestion,
    units,
    categories,
    onCreateWorksheet,
}: WorksheetManualBuilderProps) {
    const [filters, setFilters] = useState<{ units: string[]; categories: string[]; currencies: CurrencyType[]; }>({ units: [], categories: [], currencies: [] });
    const [filterSearch, setFilterSearch] = useState<{ unit: string; category: string; currency: string; }>({ unit: '', category: '', currency: '' });
    const [worksheetType, setWorksheetType] = useState<'classroom' | 'sample'>('classroom');
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
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
    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
    const { data: settings } = useDoc<EconomySettings>(settingsRef);

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

    const { totalMarks, estimatedTime, breakdownByUnit, creationCost } = useMemo(() => {
        let totalMarks = 0;
        const breakdownByUnit: Record<string, { count: number; marks: number }> = {};
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
    }, [selectedQuestions, unitMap, settings]);

    const getQuestionMarks = (question: Question): number => {
        return question.solutionSteps?.reduce((stepSum, step) => stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
    }

    const handleCreateClick = () => {
        onCreateWorksheet(userIsEditor ? worksheetType : 'practice');
    }

    const canAfford = useMemo(() => {
        if (userIsEditor) return true;
        if (!userProfile) return false;
        return (userProfile.coins >= creationCost.coins) && (userProfile.gold >= creationCost.gold) &&
            (userProfile.diamonds >= creationCost.diamonds) && ((userProfile.aiCredits || 0) >= (creationCost.aiCredits || 0));
    }, [userProfile, creationCost, userIsEditor]);

    const handleFilterChange = (filterType: 'units' | 'categories' | 'currencies', value: string, isChecked: boolean) => {
        setFilters(prev => {
            const currentValues = prev[filterType] as string[];
            const newValues = isChecked ? [...currentValues, value] : currentValues.filter(v => v !== value);
            return { ...prev, [filterType]: newValues };
        });
    }

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

    const hasSelectedAiQuestion = useMemo(() => selectedQuestions.some(q => q.gradingMode === 'ai'), [selectedQuestions]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 pb-24 md:pb-0">
            <div className="lg:col-span-2 space-y-6">
                
                {/* HEADER & FILTER SECTION */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            {filteredQuestions.length}
                            <span className="text-muted-foreground font-normal text-base">Questions Available</span>
                        </h3>
                        {isFilterActive && (
                            <p className="text-xs text-muted-foreground">Filtered by {filters.units.length} units, {filters.categories.length} categories, {filters.currencies.length} types</p>
                        )}
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("gap-2 w-full sm:w-auto h-10 rounded-xl border-slate-200 dark:border-slate-800", isFilterActive && "border-primary/50 text-primary bg-primary/5")}>
                                <Filter className="h-4 w-4" /> Filter {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1 rounded-full h-5 min-w-[1.25rem] px-1.5 justify-center bg-slate-100 text-slate-700">{activeFilterCount}</Badge>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="end">
                            {/* Filter Tabs Content (Same as previous) */}
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
                                            <div key={unit.id} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Checkbox id={`manual-filter-unit-${unit.id}`} checked={filters.units.includes(unit.id)} onCheckedChange={(checked) => handleFilterChange('units', unit.id, !!checked)} /><Label htmlFor={`manual-filter-unit-${unit.id}`} className="capitalize flex-grow cursor-pointer">{unit.name}</Label></div>
                                        ))}
                                    </div>
                                </TabsContent>
                                {/* Category and Currency contents omitted for brevity, same logic as Unit */}
                                <TabsContent value="category" className="mt-0"><div className="px-3 pt-2 pb-3 border-b"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search categories..." className="pl-8 h-9" value={filterSearch.category} onChange={(e) => setFilterSearch(prev => ({ ...prev, category: e.target.value }))} /></div></div><div className="max-h-[240px] overflow-y-auto py-1 px-1">{filteredCategoriesList.map(cat => (<div key={cat.id} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Checkbox id={`manual-filter-cat-${cat.id}`} checked={filters.categories.includes(cat.id)} onCheckedChange={(checked) => handleFilterChange('categories', cat.id, !!checked)} /><Label htmlFor={`manual-filter-cat-${cat.id}`} className="capitalize flex-grow cursor-pointer">{cat.name}</Label></div>))}</div></TabsContent>
                                <TabsContent value="currency" className="mt-0"><div className="px-3 pt-2 pb-3 border-b"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search types..." className="pl-8 h-9" value={filterSearch.currency} onChange={(e) => setFilterSearch(prev => ({ ...prev, currency: e.target.value }))} /></div></div><div className="max-h-[240px] overflow-y-auto py-1 px-1">{filteredCurrenciesList.map(currency => (<div key={currency} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Checkbox id={`manual-filter-currency-${currency}`} checked={filters.currencies.includes(currency)} onCheckedChange={(checked) => handleFilterChange('currencies', currency, !!checked)} /><Label htmlFor={`manual-filter-currency-${currency}`} className="capitalize flex-grow cursor-pointer">{currency}</Label></div>))}</div></TabsContent>
                                {(filters.units.length > 0 || filters.categories.length > 0 || filters.currencies.length > 0) && (<div className="p-2 border-t bg-slate-50 dark:bg-slate-900/50"><Button variant="ghost" size="sm" className="w-full h-8 font-normal text-muted-foreground hover:text-foreground" onClick={() => setFilters({ units: [], categories: [], currencies: [] })}>Clear all filters</Button></div>)}
                            </Tabs>
                        </PopoverContent>
                    </Popover>
                </div>

                {isFilterActive && (
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-semibold text-muted-foreground ml-1 mr-1">Active:</span>
                        {filters.units.map(id => (<Badge key={id} variant="secondary" className="pl-2 pr-1 h-6 capitalize gap-1 hover:bg-slate-200 cursor-pointer rounded-md font-normal" onClick={() => handleFilterChange('units', id, false)}>{unitMap.get(id) || id}<X className="h-3 w-3 text-muted-foreground" /></Badge>))}
                        {filters.categories.map(id => (<Badge key={id} variant="secondary" className="pl-2 pr-1 h-6 capitalize gap-1 hover:bg-slate-200 cursor-pointer rounded-md font-normal" onClick={() => handleFilterChange('categories', id, false)}>{categoryMap.get(id) || id}<X className="h-3 w-3 text-muted-foreground" /></Badge>))}
                        {filters.currencies.map(c => (<Badge key={c} variant="secondary" className="pl-2 pr-1 h-6 capitalize gap-1 hover:bg-slate-200 cursor-pointer rounded-md font-normal" onClick={() => handleFilterChange('currencies', c, false)}>{c}<X className="h-3 w-3 text-muted-foreground" /></Badge>))}
                    </div>
                )}

                {/* QUESTION GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredQuestions.map(q => {
                        const isSelected = selectedQuestions.some(sq => sq.id === q.id);
                        const isAiAndDisabled = q.gradingMode === 'ai' && hasSelectedAiQuestion && !isSelected;
                        const CurrencyIcon = currencyIcons[q.currencyType];
                        const styles = currencyStyles[q.currencyType];
                        const unitName = unitMap.get(q.unitId) || "Unknown Unit";
                        const categoryName = categoryMap.get(q.categoryId) || "Unknown Category";

                        return (
                            <Card key={q.id} className={cn(
                                "group p-4 flex flex-col gap-3 rounded-2xl transition-all border relative",
                                isSelected ? "border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-900/5 ring-1 ring-emerald-500/20" : "border-slate-200 dark:border-slate-800 hover:shadow-md",
                                isAiAndDisabled && "opacity-60 cursor-not-allowed"
                            )}>
                                {/* 1. Title Row */}
                                <div className="flex items-start justify-between gap-3">
                                    <h4 className={cn("text-base font-bold leading-tight line-clamp-2 pr-10", isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100")}>
                                        {q.name || "Untitled Question"}
                                    </h4>
                                     <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-8 w-8 rounded-full shrink-0 bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                                        onClick={() => handleViewClick(q)}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* 2. Metadata */}
                                <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
                                    <Badge variant="outline" className={cn("capitalize flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold border h-7 rounded-lg", styles.badgeBg, styles.badgeText, styles.border)}>
                                        <CurrencyIcon className="h-3 w-3" /> {q.currencyType}
                                    </Badge>
                                    
                                    <Badge variant="secondary" className="text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                        {getQuestionMarks(q)} Marks
                                    </Badge>
                                    
                                    {q.gradingMode === 'ai' && (
                                        <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 gap-1 h-7 px-2 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                                            <Bot className="h-3 w-3" /> AI
                                        </Badge>
                                    )}
                                </div>
                                <div className="sm:hidden text-[10px] text-muted-foreground truncate px-1">
                                    {unitName} • {categoryName}
                                </div>
                                
                                {/* Floating Add/Remove Button */}
                                <div className="absolute bottom-3 right-3">
                                     <Button
                                        onClick={() => isSelected ? removeQuestion(q.id) : addQuestion(q, 'manual')}
                                        disabled={isAiAndDisabled}
                                        size="icon"
                                        className={cn(
                                            "h-10 w-10 rounded-full transition-all shadow-lg border-2",
                                            isSelected
                                                ? "bg-white text-red-600 hover:bg-red-50 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900"
                                                : "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 border-transparent"
                                        )}
                                    >
                                        {isSelected ? <Trash2 className="h-5 w-5" /> : isAiAndDisabled ? <Bot className="h-5 w-5 opacity-50" /> : <Plus className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </Card>
                        )
                    })}
                    {filteredQuestions.length === 0 && (
                        <div className="md:col-span-2 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm"><Search className="h-8 w-8 text-muted-foreground opacity-50" /></div>
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">No questions found</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mt-1 px-4">Try adjusting your search or filters.</p>
                            <Button variant="link" onClick={() => setFilters({ units: [], categories: [], currencies: [] })} className="mt-4 text-primary font-semibold">Clear all filters</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* SIDEBAR & FLOATING BUTTON */}
            <div className="hidden lg:block lg:col-span-1">
                {/* Desktop Sidebar Logic */}
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
                                </div>
                                {!userIsEditor && (
                                    <div className="space-y-2 pt-2">
                                        <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-2"><span className="w-1 h-3 bg-yellow-400 rounded-full" /> Estimated Cost</h4>
                                        <div className="p-3 bg-black/20 rounded-lg space-y-2">
                                            {Object.entries(creationCost).filter(([_, val]) => val > 0).length > 0 ? (
                                                Object.entries(creationCost).filter(([_, val]) => val > 0).map(([key, value]) => {
                                                    const Icon = currencyIcons[key as CurrencyType];
                                                    return (
                                                        <div key={key} className="flex justify-between items-center text-sm">
                                                            <span className="flex items-center gap-2 capitalize text-slate-300">
                                                                <Icon className="h-4 w-4 text-slate-400" /> {key}
                                                            </span>
                                                            <span className="font-mono font-bold text-white">{value}</span>
                                                        </div>
                                                    )
                                                })
                                            ) : <p className="text-xs text-slate-400 text-center">No cost for this selection.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2 pb-6 relative z-10">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button className="w-full h-12 bg-white text-slate-900 hover:bg-slate-200 font-bold shadow-lg rounded-xl" disabled={selectedQuestions.length === 0}>Review & Create <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                </SheetTrigger>
                                <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 rounded-l-2xl">
                                    <SheetHeader className="p-6 pb-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
                                        <SheetTitle>Review Worksheet</SheetTitle>
                                        <SheetDescription>Review your selections before finalizing.</SheetDescription>
                                        {userIsEditor && (
                                            <div className="flex items-center space-x-2 pt-4 p-1.5 bg-white dark:bg-slate-950 rounded-xl border w-fit shadow-sm">
                                                <Label htmlFor="worksheet-type-manual" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 cursor-pointer transition-colors", worksheetType === 'sample' ? 'text-primary' : 'text-muted-foreground')}>Sample</Label>
                                                <Switch id="worksheet-type-manual" checked={worksheetType === 'classroom'} onCheckedChange={(checked) => setWorksheetType(checked ? 'classroom' : 'sample')} className="scale-75" />
                                                <Label htmlFor="worksheet-type-manual" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 cursor-pointer transition-colors", worksheetType === 'classroom' ? 'text-primary' : 'text-muted-foreground')}>Classroom</Label>
                                            </div>
                                        )}
                                    </SheetHeader>
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
                                                            {Object.entries(creationCost).filter(([_, val]) => val > 0).length > 0 ? Object.entries(creationCost).filter(([_, val]) => val > 0).map(([key, value]) => {
                                                                const Icon = currencyIcons[key as CurrencyType];
                                                                return (
                                                                    <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border dark:border-slate-700">
                                                                        <Icon className={cn("h-5 w-5", currencyStyles[key as CurrencyType]?.badgeText)} />
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200">{value}</span>
                                                                        <span className="text-xs text-muted-foreground capitalize">{key}</span>
                                                                    </div>
                                                                )
                                                            }) : <p className="col-span-2 text-sm text-muted-foreground text-center py-2">No cost for this worksheet.</p>}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4"><h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Filter className="h-4 w-4 text-muted-foreground" /> Unit Distribution</h4><div className="space-y-3">{Object.entries(breakdownByUnit).map(([name, data]) => (<div key={name}><div className="flex justify-between text-xs text-muted-foreground mb-1.5"><span>{name}</span><span className="font-mono font-medium">{Math.round((data.count / selectedQuestions.length) * 100)}%</span></div><Progress value={(data.count / selectedQuestions.length) * 100} className="h-2" /></div>))}</div></div>
                                                </TabsContent>
                                                <TabsContent value="review" className="mt-0 space-y-3 pb-20">
                                                    {selectedQuestions.map(q => (
                                                        <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm relative group active:scale-[0.99] transition-transform">
                                                            <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                                                                {currencyIcons[q.currencyType] && (() => { const Icon = currencyIcons[q.currencyType]; return <Icon className="h-4 w-4 text-muted-foreground" />; })()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium line-clamp-2 text-slate-800 dark:text-slate-200 mb-0.5">{q.name || "Untitled Question"}</p>
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 -mr-2" onClick={() => removeQuestion(q.id)}><Trash2 className="h-4 w-4" /></Button>
                                                        </div>
                                                    ))}
                                                </TabsContent>
                                            </div>
                                        </Tabs>
                                        <div className="p-4 border-t bg-white dark:bg-slate-950 mt-auto">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center text-sm font-medium px-1">
                                                    <span className="text-muted-foreground">Estimated Time</span>
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">{estimatedTime} mins</span>
                                                </div>
                                                <Button className="w-full h-12 text-base font-bold shadow-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 rounded-xl" onClick={handleCreateClick} disabled={!canAfford || selectedQuestions.length === 0}>
                                                    {!canAfford ? 'Insufficient Funds' : 'Generate Worksheet'}
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </CardFooter>
                    </Card>
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

            {/* VIEW MODAL */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto rounded-2xl p-0 gap-0">
                    <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                        <DialogTitle className="flex items-center gap-3 text-xl"><div className="bg-primary/10 p-2 rounded-lg text-primary"><FileText className="h-5 w-5" /></div>{viewingQuestion?.name}</DialogTitle>
                        <DialogDescription className="text-base pt-1">Full question preview and details</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-6">
                        <div className="space-y-2"><h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><span className="w-1 h-4 bg-primary rounded-full"></span>Question Text</h4><div className="prose dark:prose-invert max-w-none border p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-base leading-relaxed shadow-sm" dangerouslySetInnerHTML={{ __html: processedQuestionText }} /></div>
                        {viewingQuestion?.solutionSteps && (<div className="space-y-3 pt-2"><h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><span className="w-1 h-4 bg-emerald-500 rounded-full"></span>Marking Scheme</h4><div className="grid gap-3">{viewingQuestion.solutionSteps.map((step, i) => (<div key={i} className="flex justify-between items-center text-sm p-4 border rounded-xl bg-white dark:bg-slate-900/80 shadow-sm"><span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-3"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">{i + 1}</span>Step {i + 1}</span><Badge variant="outline" className="font-mono text-xs px-2 py-1 bg-slate-50 dark:bg-slate-800">{step.subQuestions.reduce((a, b) => a + b.marks, 0)} marks</Badge></div>))}</div></div>)}
                    </div>
                    <DialogFooter className="p-6 pt-4 border-t bg-slate-50/50 dark:bg-slate-900/50 sm:justify-between gap-3">
                        <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="rounded-xl h-11 border-slate-300 dark:border-slate-700">Close Preview</Button>
                        <Button className="rounded-xl h-11 px-6 shadow-md" onClick={() => { if (viewingQuestion) addQuestion(viewingQuestion, 'manual'); setIsViewModalOpen(false); }} disabled={selectedQuestions.some(sq => sq.id === viewingQuestion?.id)}>{selectedQuestions.some(sq => sq.id === viewingQuestion?.id) ? (<><Check className="mr-2 h-4 w-4" /> Added to Worksheet</>) : (<><Plus className="mr-2 h-4 w-4" /> Add to Worksheet</>)}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
