'use client';
import { useState, useMemo, useEffect } from 'react';
import type { Question, CurrencyType, Unit, Category, EconomySettings } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ShoppingCart, PlusCircle, Filter, Trash2, Bot, Coins, Gem, Crown, Sparkles, Wand2, PieChart, ArrowRight, Search, BrainCircuit, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from './ui/sheet';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'; 
import { doc } from 'firebase/firestore'; 
import { calculateWorksheetCost } from '@/lib/wallet';
import { useToast } from "@/components/ui/use-toast";

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
    setFilters(prev => ({...prev, categories: []}));
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
          setSelectedQuestions([...selectedQuestions, {...questionToAdd, source: 'random'}]);
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


  return (
    <div className="space-y-6">
      {/* HEADER SECTION WITH FILTER */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                  <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                  <h3 className="font-bold text-lg">Random Generator</h3>
                  <p className="text-sm text-muted-foreground">Automatically pick questions based on type.</p>
              </div>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter Pool
                {activeFilterCount > 0 && <Badge variant="secondary" className="rounded-full px-1.5 h-5 min-w-[1.25rem]">{activeFilterCount}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="end">
               <Tabs defaultValue="unit" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 m-2 rounded-md">
                      <TabsTrigger value="unit" className="rounded-sm">Unit</TabsTrigger>
                      <TabsTrigger value="category" className="rounded-sm" disabled={filters.units.length > 0 && availableCategories.length === 0}>Category</TabsTrigger>
                      <TabsTrigger value="currency" className="rounded-sm">Currency</TabsTrigger>
                  </TabsList>

                  {/* --- UNIT TAB CONTENT --- */}
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
                                id={`filter-unit-${unit.id}`}
                                checked={filters.units.includes(unit.id)}
                                onCheckedChange={(checked) => handleFilterChange('units', unit.id, !!checked)}
                              />
                              <Label htmlFor={`filter-unit-${unit.id}`} className="capitalize flex-grow cursor-pointer">{unit.name}</Label>
                            </div>
                          ))}
                          {filteredUnitsList.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No units found.</p>}
                      </div>
                  </TabsContent>

                   {/* --- CATEGORY TAB CONTENT --- */}
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
                                id={`filter-cat-${cat.id}`}
                                checked={filters.categories.includes(cat.id)}
                                onCheckedChange={(checked) => handleFilterChange('categories', cat.id, !!checked)}
                              />
                              <Label htmlFor={`filter-cat-${cat.id}`} className="capitalize flex-grow cursor-pointer">{cat.name}</Label>
                            </div>
                          ))}
                          {filters.units.length > 0 && availableCategories.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No categories found for selected unit(s).</p>}
                          {filters.units.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Select a unit first.</p>}
                          {filters.units.length > 0 && availableCategories.length > 0 && filteredCategoriesList.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No categories match your search.</p>}
                      </div>
                   </TabsContent>

                  {/* --- CURRENCY TAB CONTENT --- */}
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
                                id={`filter-currency-${currency}`}
                                checked={filters.currencies.includes(currency)}
                                onCheckedChange={(checked) => handleFilterChange('currencies', currency, !!checked)}
                              />
                              <Label htmlFor={`filter-currency-${currency}`} className="capitalize flex-grow cursor-pointer">{currency}</Label>
                            </div>
                          ))}
                          {filteredCurrenciesList.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No types found.</p>}
                      </div>
                  </TabsContent>
                  
                  {/* Clear Filters Button at bottom */}
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

      {/* 1. TOP ROW: AVAILABLE POOL (Full Width) */}
      <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2 text-indigo-100">
                    <PieChart className="h-5 w-5" />
                    <span className="font-medium">Available Pool</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-extrabold tracking-tight">{filteredQuestions.length}</span>
                    <span className="text-xl text-indigo-200">Questions</span>
                </div>
                <p className="text-sm text-indigo-200/70 mt-1">Based on currently selected filters</p>
            </CardContent>
      </Card>

      {/* 2. MIDDLE ROW: BREAKDOWNS (Side by Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Breakdown by Unit */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-medium">Breakdown by Unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
              {Object.entries(questionsByUnit).map(([unitName, count]) => (
                <div key={unitName} className="flex justify-between items-center text-sm p-3 rounded bg-slate-50 dark:bg-slate-900 border">
                  <span className="font-medium truncate mr-2">{unitName}</span>
                  <Badge variant="secondary" className="h-6 px-2.5">{count}</Badge>
                </div>
              ))}
              {Object.keys(questionsByUnit).length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No data available.</p>}
          </CardContent>
        </Card>

        {/* Breakdown by Category */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-medium">Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
              {Object.entries(questionsByCategory).map(([catName, count]) => (
                <div key={catName} className="flex justify-between items-center text-sm p-3 rounded bg-slate-50 dark:bg-slate-900 border">
                  <span className="font-medium truncate mr-2">{catName}</span>
                  <Badge variant="secondary" className="h-6 px-2.5">{count}</Badge>
                </div>
              ))}
              {Object.keys(questionsByCategory).length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No data available.</p>}
          </CardContent>
        </Card>
      </div>
      
      {/* 3. BOTTOM ROW: QUICK ADD (Full Width with Premium Cards) */}
      <div>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <PlusCircle className="h-5 w-5 text-primary" />
                Quick Add by Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {allCurrencyTypes.map(currency => {
              const totalOfType = questionsByCurrency[currency] || 0;
              const selectedOfType = selectedQuestionsByCurrency[currency] || 0;
              const remaining = totalOfType - selectedOfType;
              const CurrencyIcon = currencyIcons[currency];
              const styles = currencyStyles[currency];
              
              return (
                <div key={currency} className={cn("group relative flex flex-col p-4 md:p-5 rounded-xl border transition-all overflow-hidden", styles.bg, styles.border)}>
                  <CurrencyIcon className={cn("absolute -top-2 -right-4 md:-top-4 md:-right-4 h-24 w-24 md:h-32 md:w-32 pointer-events-none -rotate-12", styles.iconBg)} />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-2 md:mb-4">
                        <div className="flex flex-col">
                             <div className={cn("p-2 rounded-lg w-fit", styles.bg, "bg-opacity-50 dark:bg-opacity-50 ring-1", styles.border)}>
                                <CurrencyIcon className={cn("h-6 w-6 md:h-8 md:w-8", styles.text)}/>
                            </div>
                            <p className={cn("capitalize font-bold text-lg md:text-xl mt-2", styles.text)}>{currency}</p>
                        </div>
                        <Badge variant="outline" className={cn("bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm", styles.text, styles.border)}>
                            {remaining} left
                        </Badge>
                    </div>
                    
                    <div className="mt-auto">
                        <Button 
                          className={cn("w-full font-semibold gap-2 bg-white/70 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-950 backdrop-blur-sm shadow-sm", styles.text, styles.border)}
                          onClick={() => addRandomQuestion(currency)} 
                          disabled={remaining <= 0}
                          variant="outline"
                        >
                            Add Random <PlusCircle className="h-5 w-5" />
                        </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      </div>
      
        {/* REVIEW SHEET (Floating Button) */}
        <Sheet>
            <SheetTrigger asChild>
                <div className="fixed bottom-24 right-6 z-50">
                    <Button 
                        size="lg" 
                        className={cn("rounded-full h-16 w-16 shadow-2xl bg-gradient-to-r from-primary to-indigo-600 hover:scale-105 transition-transform", animateCart && "animate-pulse")}
                        disabled={selectedQuestions.length === 0}
                    >
                        <ShoppingCart className="h-6 w-6 text-white" />
                        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm border-2 border-white">
                            {selectedQuestions.length}
                        </span>
                    </Button>
                </div>
            </SheetTrigger>
             <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <SheetHeader className="p-6 pb-2 bg-slate-50 dark:bg-slate-900 border-b">
                    <SheetTitle>Review Worksheet</SheetTitle>
                    <SheetDescription>
                        Review your selections before finalizing.
                    </SheetDescription>
                    {userIsEditor && (
                      <div className="flex items-center space-x-2 pt-4 p-2 bg-white dark:bg-slate-950 rounded-lg border">
                          <Label htmlFor="worksheet-type-random" className={cn("text-xs uppercase font-bold tracking-wider", worksheetType === 'sample' ? 'text-primary' : 'text-muted-foreground')}>
                              Sample
                          </Label>
                          <Switch id="worksheet-type-random" checked={worksheetType === 'classroom'} onCheckedChange={(checked) => setWorksheetType(checked ? 'classroom' : 'sample')} />
                          <Label htmlFor="worksheet-type-random" className={cn("text-xs uppercase font-bold tracking-wider", worksheetType === 'classroom' ? 'text-primary' : 'text-muted-foreground')}>
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
  );
}
