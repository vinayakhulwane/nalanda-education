'use client';
import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Search, X } from "lucide-react";
import type { Unit, Category, Question, CurrencyType } from "@/types";

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
    const activeFilters = [
        ...filters.unit.map(id => ({ key: 'unit', label: `Unit: ${units.find(u => u.id === id)?.name}` })),
        ...filters.category.map(id => ({ key: 'category', label: `Category: ${categories.find(c => c.id === id)?.name}` })),
        ...filters.status.map(s => ({ key: 'status', label: `Status: ${s.charAt(0).toUpperCase() + s.slice(1)}` })),
        ...filters.currency.map(c => ({ key: 'currency', label: `Currency: ${c.charAt(0).toUpperCase() + c.slice(1)}`})),
        filters.search !== '' && { key: 'search', label: `Search: "${filters.search}"`},
    ].filter(Boolean) as { key: string; label: string }[];
    
    const isFilterActive = activeFilters.length > 0;
    
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


  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {isFilterActive && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="start">
            <Tabs defaultValue="unit" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-muted/60 h-auto p-1 rounded-b-none">
                <TabsTrigger value="unit" className="text-xs">Unit</TabsTrigger>
                <TabsTrigger value="category" className="text-xs" disabled={filters.unit.length > 0 && categories.length === 0}>Category</TabsTrigger>
                <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
                <TabsTrigger value="currency" className="text-xs">Currency</TabsTrigger>
                <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
              </TabsList>
              <ScrollArea className="h-64">
                <div className="p-4 space-y-2">
                    <TabsContent value="unit" className="mt-0">
                        {units.map(u => (
                            <div key={u.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`unit-${u.id}`} 
                                    checked={filters.unit.includes(u.id)}
                                    onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setUnit, filters.unit, u.id, !!checked)}
                                />
                                <Label htmlFor={`unit-${u.id}`} className="flex-grow">
                                    {u.name} ({questionCounts.units[u.id] || 0})
                                </Label>
                            </div>
                        ))}
                    </TabsContent>
                    <TabsContent value="category" className="mt-0">
                         {categories.map(c => (
                            <div key={c.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`cat-${c.id}`} 
                                    checked={filters.category.includes(c.id)}
                                    onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setCategory, filters.category, c.id, !!checked)}
                                />
                                <Label htmlFor={`cat-${c.id}`} className="flex-grow">
                                    {c.name} ({questionCounts.categories[c.id] || 0})
                                </Label>
                            </div>
                        ))}
                    </TabsContent>
                    <TabsContent value="status" className="mt-0">
                        {(['published', 'draft'] as const).map(status => (
                            <div key={status} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`status-${status}`} 
                                    checked={filters.status.includes(status)}
                                    onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setStatus, filters.status, status, !!checked)}
                                />
                                <Label htmlFor={`status-${status}`} className="flex-grow capitalize">
                                    {status} ({questionCounts.statuses[status] || 0})
                                </Label>
                            </div>
                        ))}
                    </TabsContent>
                     <TabsContent value="currency" className="mt-0">
                        {(['spark', 'coin', 'gold', 'diamond'] as const).map(currency => (
                            <div key={currency} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`curr-${currency}`} 
                                    checked={filters.currency.includes(currency)}
                                    onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setCurrency, filters.currency, currency, !!checked)}
                                />
                                <Label htmlFor={`curr-${currency}`} className="flex-grow capitalize">
                                    {currency} ({questionCounts.currencies[currency] || 0})
                                </Label>
                            </div>
                        ))}
                    </TabsContent>
                     <TabsContent value="search" className="mt-0">
                        <div className="relative flex-grow">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search by title..." className="pl-10 h-10" value={filters.search} onChange={e => setFilters.setSearch(e.target.value)} />
                        </div>
                    </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </PopoverContent>
        </Popover>
         <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>Showing {resultCount} results</span>
            {isFilterActive && <span>|</span>}
            <div className="flex flex-wrap items-center gap-1">
                {activeFilters.map((f, i) => (
                    <span key={`${f.key}-${i}`} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                        {f.label}
                    </span>
                ))}
                 {isFilterActive && <Button variant="link" size="sm" onClick={() => resetFilters()} className="text-xs h-auto p-1">Clear all</Button>}
            </div>
        </div>
      </div>
    </div>
  );
}
