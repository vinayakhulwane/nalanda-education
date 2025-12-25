'use client';
import { useState, useMemo } from 'react';
import type { Question, CurrencyType, Unit, Category } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { FilePlus2, ShoppingCart, PlusCircle, Filter, X, ArrowRight, Trash2, Bot, Shuffle, Droplet, Star } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from './ui/sheet';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

type WorksheetRandomBuilderProps = {
  availableQuestions: Question[];
  units: Unit[];
  categories: Category[];
  selectedQuestions: Question[];
  setSelectedQuestions: (questions: Question[]) => void;
  onCreateWorksheet: () => void;
};

const currencyIcons = {
    spark: Droplet,
    coin: Star,
    gold: Star,
    diamond: Star,
};


export function WorksheetRandomBuilder({
  availableQuestions,
  units,
  categories,
  selectedQuestions,
  setSelectedQuestions,
  onCreateWorksheet,
}: WorksheetRandomBuilderProps) {
  const [filters, setFilters] = useState<CurrencyType[]>([]);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

  const filteredQuestions = useMemo(() => {
    if (filters.length === 0) return availableQuestions;
    return availableQuestions.filter(q => filters.includes(q.currencyType));
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
  
  const { totalMarks, estimatedTime, breakdownByUnit, breakdownByCategory, totalCost } = useMemo(() => {
    let totalMarks = 0;
    const breakdownByUnit: Record<string, { count: number; marks: number }> = {};
    const breakdownByCategory: Record<string, { count: number; marks: number }> = {};
    
    // For now, let's assume cost is 1 per question of its currency type. This can be refined.
    const costMap: Record<CurrencyType, number> = { spark: 0, coin: 0, gold: 0, diamond: 0 };

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

        costMap[q.currencyType]++;
    });

    return { 
        totalMarks, 
        estimatedTime: totalMarks * 2, // Simple estimation: 2 minutes per mark
        breakdownByUnit,
        breakdownByCategory,
        totalCost: costMap,
    };
}, [selectedQuestions, unitMap, categoryMap]);


  const addRandomQuestion = (currency: CurrencyType) => {
    const candidates = availableQuestions.filter(q => 
        q.currencyType === currency && 
        !selectedQuestions.some(sq => sq.id === q.id)
    );
    if (candidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      setSelectedQuestions([...selectedQuestions, candidates[randomIndex]]);
    }
  };
  
  const removeQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };


  const handleFilterChange = (currency: CurrencyType, isChecked: boolean) => {
    if (isChecked) {
      setFilters(prev => [...prev, currency]);
    } else {
      setFilters(prev => prev.filter(c => c !== currency));
    }
  }

  const allCurrencyTypes: CurrencyType[] = ['spark', 'coin', 'gold', 'diamond'];
  
  const getQuestionMarks = (question: Question): number => {
      return question.solutionSteps?.reduce((stepSum, step) => 
            stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center flex-wrap">
            {filters.length > 0 && <span className="text-sm font-semibold">Active Filters:</span>}
            {filters.map(f => (
                <Badge key={f} variant="outline" className="pl-2 capitalize">
                    {f}
                    <button onClick={() => setFilters(filters.filter(item => item !== f))} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
                </Badge>
            ))}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
              {filters.length > 0 && <Badge variant="secondary" className="ml-2 rounded-full h-5 w-5 p-0 justify-center">{filters.length}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-4">
                <h4 className="font-medium leading-none">Filter by Currency</h4>
                <div className="space-y-2">
                  {allCurrencyTypes.map(currency => (
                    <div key={currency} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filter-${currency}`}
                        checked={filters.includes(currency)}
                        onCheckedChange={(checked) => handleFilterChange(currency, !!checked)}
                      />
                      <Label htmlFor={`filter-${currency}`} className="capitalize">{currency}</Label>
                    </div>
                  ))}
                </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Total Questions Available</p>
            <p className="text-4xl font-bold">{filteredQuestions.length}</p>
        </CardContent>
      </Card>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* By Unit */}
        <Card>
          <CardHeader>
            <CardTitle>By Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {Object.entries(questionsByUnit).map(([unitName, count]) => (
                  <div key={unitName} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                    <span>{unitName}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
                 {Object.keys(questionsByUnit).length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No questions for current filters.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent>
             <ScrollArea className="h-48">
               <div className="space-y-2">
                {Object.entries(questionsByCategory).map(([catName, count]) => (
                  <div key={catName} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                    <span>{catName}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
                 {Object.keys(questionsByCategory).length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No questions for current filters.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Add Random by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Add Random by Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allCurrencyTypes.map(currency => (
              <div key={currency} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                <span className="capitalize">{currency}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {questionsByCurrency[currency] || 0} available
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addRandomQuestion(currency)}>
                    <PlusCircle className="h-5 w-5 text-primary" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Review your worksheet before generating it.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
                <div><span className="font-semibold">Questions:</span> {selectedQuestions.length}</div>
                <div><span className="font-semibold">Total Marks:</span> {totalMarks}</div>
                <div><span className="font-semibold">Est. Time:</span> {estimatedTime} mins</div>
            </div>
             <Button disabled={selectedQuestions.length === 0} onClick={onCreateWorksheet}>
                <FilePlus2 className="mr-2 h-4 w-4" /> Generate Worksheet
            </Button>
          </CardContent>
      </Card>
      
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
                <SheetHeader className="p-6 pb-0">
                    <SheetTitle>Review &amp; Blueprint</SheetTitle>
                    <SheetDescription>
                        A detailed summary of your current selections before finalizing the worksheet.
                    </SheetDescription>
                </SheetHeader>
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
                                    const CurrencyIcon = currencyIcons[q.currencyType] || Star;
                                    return (
                                    <Card key={q.id} className="p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-grow">
                                                <p className="text-sm font-semibold">{q.name}</p>
                                                <p className="text-xs text-muted-foreground">{unitMap.get(q.unitId)}</p>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <Badge variant="outline" className="flex items-center gap-1 text-xs"><Bot className="h-3 w-3"/> AI Graded</Badge>
                                                    <Badge variant="outline" className="flex items-center gap-1 text-xs"><Shuffle className="h-3 w-3"/> Random</Badge>
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
                <SheetFooter className="bg-card border-t px-6 py-4 mt-auto">
                    <div className="flex justify-between items-center w-full">
                        <div className="text-sm">
                            <p className="font-semibold">Est. Time: {estimatedTime} mins</p>
                             <div className="flex gap-2 text-xs text-muted-foreground">
                                {Object.entries(totalCost).filter(([,count]) => count > 0).map(([currency, count]) => (
                                    <span key={currency} className="capitalize">{count} {currency}</span>
                                ))}
                            </div>
                        </div>
                        <Button onClick={onCreateWorksheet}>
                            Create Worksheet <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    </div>
  );
}
