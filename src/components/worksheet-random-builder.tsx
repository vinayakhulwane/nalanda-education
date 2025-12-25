'use client';
import { useState, useMemo } from 'react';
import type { Question, CurrencyType } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { FilePlus2, ShoppingCart, PlusCircle, Filter, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';

type WorksheetRandomBuilderProps = {
  availableQuestions: Question[];
  selectedQuestions: Question[];
  setSelectedQuestions: (questions: Question[]) => void;
  onCreateWorksheet: () => void;
};

export function WorksheetRandomBuilder({
  availableQuestions,
  selectedQuestions,
  setSelectedQuestions,
  onCreateWorksheet,
}: WorksheetRandomBuilderProps) {
  const [filters, setFilters] = useState<CurrencyType[]>([]);

  const filteredQuestions = useMemo(() => {
    if (filters.length === 0) return availableQuestions;
    return availableQuestions.filter(q => filters.includes(q.currencyType));
  }, [availableQuestions, filters]);

  const questionsByUnit = useMemo(() => {
    // In a real app, you'd want to map unitId to unitName
    return filteredQuestions.reduce((acc, q) => {
      acc[q.unitId] = (acc[q.unitId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredQuestions]);

  const questionsByCategory = useMemo(() => {
    // In a real app, you'd want to map categoryId to categoryName
    return filteredQuestions.reduce((acc, q) => {
      acc[q.categoryId] = (acc[q.categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredQuestions]);

  const questionsByCurrency = useMemo(() => {
    return availableQuestions.reduce((acc, q) => {
      acc[q.currencyType] = (acc[q.currencyType] || 0) + 1;
      return acc;
    }, {} as Record<CurrencyType, number>);
  }, [availableQuestions]);

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

  const { totalMarks, estimatedTime } = useMemo(() => {
    return selectedQuestions.reduce(
      (acc, q) => {
        const marks = q.solutionSteps?.reduce((stepSum, step) => 
            stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
        acc.totalMarks += marks;
        // Simple estimation: 2 minutes per mark
        acc.estimatedTime += marks * 2;
        return acc;
      },
      { totalMarks: 0, estimatedTime: 0 }
    );
  }, [selectedQuestions]);

  const handleFilterChange = (currency: CurrencyType, isChecked: boolean) => {
    if (isChecked) {
      setFilters(prev => [...prev, currency]);
    } else {
      setFilters(prev => prev.filter(c => c !== currency));
    }
  }

  const allCurrencyTypes: CurrencyType[] = ['spark', 'coin', 'gold', 'diamond'];

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
                {Object.entries(questionsByUnit).map(([unitId, count]) => (
                  <div key={unitId} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                    <span>{unitId}</span>
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
                {Object.entries(questionsByCategory).map(([catId, count]) => (
                  <div key={catId} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                    <span>{catId}</span>
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
      
      {/* Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg flex items-center justify-between ml-[var(--sidebar-width-icon)]">
            <div className="flex items-center gap-6 text-sm">
                <div><span className="font-semibold">Questions:</span> {selectedQuestions.length}</div>
                <div><span className="font-semibold">Total Marks:</span> {totalMarks}</div>
                <div><span className="font-semibold">Est. Time:</span> {estimatedTime} mins</div>
            </div>
            <div className="flex items-center gap-4">
                <Button className="w-full" disabled={selectedQuestions.length === 0} onClick={onCreateWorksheet}>
                    <FilePlus2 className="mr-2 h-4 w-4" /> Generate Worksheet
                </Button>
                <div className="fixed bottom-20 right-6">
                     <Button size="lg" className="rounded-full h-16 w-16 shadow-xl" disabled={selectedQuestions.length === 0}>
                        <ShoppingCart className="h-6 w-6" />
                        <Badge className="absolute -top-1 -right-1">{selectedQuestions.length}</Badge>
                    </Button>
                </div>
            </div>
      </div>
    </div>
  );
}
