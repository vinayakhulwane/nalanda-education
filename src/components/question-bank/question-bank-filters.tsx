'use client';
import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Search, X } from "lucide-react";
import type { Unit, Category, Question, CurrencyType } from "@/types";
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface QuestionBankFiltersProps {
  units: Unit[];
  categories: Category[];
  questions: Question[];
  filters: {
    unit: string[];
    category: string[];
    status: string[];
    currency: string[];
    search: string;
  };
  setFilters: {
    setUnit: (value: string[]) => void;
    setCategory: (value: string[]) => void;
    setStatus: (value: string[]) => void;
    setCurrency: (value: string[]) => void;
    setSearch: (value: string) => void;
  };
  resetFilters: (filter?: string) => void;
  resultCount: number;
}

export function QuestionBankFilters({ units, categories, questions, filters, setFilters, resetFilters, resultCount }: QuestionBankFiltersProps) {
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const [searchTerms, setSearchTerms] = useState({ unit: '', category: '' });

    const activeFilterCount = [
        ...filters.unit,
        ...filters.category,
        ...filters.status,
        ...filters.currency,
        ...(filters.search ? [filters.search] : [])
    ].length;
    
    const isFilterActive = activeFilterCount > 0;
    
    const questionCounts = useMemo(() => {
        const counts = {
            units: {} as Record<string, number>,
            categories: {} as Record<string, number>,
            statuses: {} as Record<string, number>,
            currencies: {} as Record<string, number>,
        };
        questions.forEach(q => {
            counts.units[q.unitId] = (counts.units[q.unitId] || 0) + 1;
            counts.categories[q.categoryId] = (counts.categories[q.categoryId] || 0) + 1;
            counts.statuses[q.status] = (counts.statuses[q.status] || 0) + 1;
            counts.currencies[q.currencyType] = (counts.currencies[q.currencyType] || 0) + 1;
        });
        return counts;
    }, [questions]);
    
    const handleMultiSelectChange = (
      setter: (value: string[]) => void, 
      currentValues: string[], 
      selectedValue: string, 
      isChecked: boolean
    ) => {
        if (isChecked) {
            setter([...currentValues, selectedValue]);
        } else {
            setter(currentValues.filter(v => v !== selectedValue));
        }
    };

    const filteredUnits = useMemo(() => {
      return units.filter(u => u.name.toLowerCase().includes(searchTerms.unit.toLowerCase()));
    }, [units, searchTerms.unit]);
    
    const filteredCategories = useMemo(() => {
        return categories.filter(c => c.name.toLowerCase().includes(searchTerms.category.toLowerCase()));
    }, [categories, searchTerms.category]);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-4">
        <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {isFilterActive && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[450px] p-2" align="start">
             <Tabs defaultValue="unit" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-lg">
                    <TabsTrigger value="unit" className="text-xs uppercase tracking-wider">Unit</TabsTrigger>
                    <TabsTrigger value="category" className="text-xs uppercase tracking-wider" disabled={filters.unit.length > 0 && categories.length === 0}>Category</TabsTrigger>
                    <TabsTrigger value="status" className="text-xs uppercase tracking-wider">Status</TabsTrigger>
                    <TabsTrigger value="currency" className="text-xs uppercase tracking-wider">Currency</TabsTrigger>
                </TabsList>
                
                <TabsContent value="unit" className="mt-2 space-y-3 outline-none">
                  <div className="relative px-2">
                    <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search units..." className="pl-9 h-9 bg-muted/50 border-none" value={searchTerms.unit} onChange={e => setSearchTerms({...searchTerms, unit: e.target.value})} />
                  </div>
                   <ScrollArea className="max-h-72">
                    <div className="space-y-1 px-1">
                        {filteredUnits.map(u => (
                             <label
                                key={u.id}
                                className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors cursor-pointer hover:bg-muted/50",
                                (questionCounts.units[u.id] || 0) === 0 && "opacity-50"
                                )}
                            >
                                <div className="flex items-center space-x-3">
                                    <Checkbox 
                                        id={`unit-${u.id}`} 
                                        checked={filters.unit.includes(u.id)}
                                        onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setUnit, filters.unit, u.id, !!checked)}
                                        className="h-5 w-5 border-2 rounded-md" 
                                    />
                                    <span className="text-sm font-medium leading-none tracking-tight">{u.name}</span>
                                </div>
                                <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center">{questionCounts.units[u.id] || 0}</Badge>
                            </label>
                        ))}
                    </div>
                   </ScrollArea>
                </TabsContent>
                
                <TabsContent value="category" className="mt-2 space-y-3 outline-none">
                  <div className="relative px-2">
                    <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search categories..." className="pl-9 h-9 bg-muted/50 border-none" value={searchTerms.category} onChange={e => setSearchTerms({...searchTerms, category: e.target.value})} />
                  </div>
                  <ScrollArea className="max-h-72">
                    <div className="space-y-1 px-1">
                        {filteredCategories.map(c => (
                             <label
                                key={c.id}
                                className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors cursor-pointer hover:bg-muted/50",
                                (questionCounts.categories[c.id] || 0) === 0 && "opacity-50"
                                )}
                            >
                                <div className="flex items-center space-x-3">
                                <Checkbox 
                                    id={`cat-${c.id}`} 
                                    checked={filters.category.includes(c.id)}
                                    onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setCategory, filters.category, c.id, !!checked)}
                                    className="h-5 w-5 border-2 rounded-md" 
                                />
                                <span className="text-sm font-medium leading-none tracking-tight">{c.name}</span>
                                </div>
                                <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center">{questionCounts.categories[c.id] || 0}</Badge>
                            </label>
                        ))}
                         {categories.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No categories found for the selected unit(s).</p>}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                 <TabsContent value="status" className="mt-2 space-y-3 outline-none">
                    <ScrollArea className="max-h-72">
                      <div className="space-y-1 px-1">
                          {(['published', 'draft'] as const).map(status => (
                              <label
                                key={status}
                                className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors cursor-pointer hover:bg-muted/50",
                                (questionCounts.statuses[status] || 0) === 0 && "opacity-50"
                                )}
                            >
                                <div className="flex items-center space-x-3">
                                  <Checkbox 
                                      id={`status-${status}`} 
                                      checked={filters.status.includes(status)}
                                      onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setStatus, filters.status, status, !!checked)}
                                      className="h-5 w-5 border-2 rounded-md" 
                                  />
                                  <span className="text-sm font-medium leading-none tracking-tight capitalize">{status}</span>
                                </div>
                                <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center">{questionCounts.statuses[status] || 0}</Badge>
                            </label>
                          ))}
                      </div>
                    </ScrollArea>
                </TabsContent>

                 <TabsContent value="currency" className="mt-2 space-y-3 outline-none">
                    <ScrollArea className="max-h-72">
                      <div className="space-y-1 px-1">
                          {(['spark', 'coin', 'gold', 'diamond'] as const).map(currency => (
                             <label
                                key={currency}
                                className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors cursor-pointer hover:bg-muted/50",
                                (questionCounts.currencies[currency] || 0) === 0 && "opacity-50"
                                )}
                            >
                                <div className="flex items-center space-x-3">
                                  <Checkbox 
                                      id={`curr-${currency}`} 
                                      checked={filters.currency.includes(currency)}
                                      onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setCurrency, filters.currency, currency, !!checked)}
                                      className="h-5 w-5 border-2 rounded-md" 
                                  />
                                  <span className="text-sm font-medium leading-none tracking-tight capitalize">{currency}</span>
                                </div>
                                <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center">{questionCounts.currencies[currency] || 0}</Badge>
                            </label>
                          ))}
                      </div>
                    </ScrollArea>
                </TabsContent>
                <div className="flex items-center justify-between border-t mt-2 pt-3 px-2">
                    <Button variant="link" className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto" onClick={() => resetFilters()}>Clear All</Button>
                    <Button size="sm" className="text-xs font-semibold" onClick={() => setPopoverOpen(false)}>Apply Filters</Button>
                </div>
            </Tabs>
          </PopoverContent>
        </Popover>

        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title..." className="pl-10 h-10" value={filters.search} onChange={e => setFilters.setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>|</span>
            <span>Showing {resultCount} results</span>
        </div>
      </div>
    </div>
  );
}
