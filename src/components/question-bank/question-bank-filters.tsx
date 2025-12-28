
'use client';
import { useMemo, useState, useEffect } from 'react';
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
    
    const availableCategories = useMemo(() => {
        if (filters.unit.length === 0) return [];
        return categories.filter(c => filters.unit.includes(c.unitId));
    }, [categories, filters.unit]);

    const filteredCategories = useMemo(() => {
        return availableCategories.filter(c => c.name.toLowerCase().includes(searchTerms.category.toLowerCase()));
    }, [availableCategories, searchTerms.category]);

    // Effect to clean up category filter when unit filter changes
    useEffect(() => {
        if (filters.unit.length > 0) {
            const availableCategoryIds = new Set(availableCategories.map(c => c.id));
            const newCategoryFilter = filters.category.filter(catId => availableCategoryIds.has(catId));
            if (newCategoryFilter.length !== filters.category.length) {
                setFilters.setCategory(newCategoryFilter);
            }
        } else if (filters.category.length > 0) {
            // If all units are deselected, clear the category filter completely
            setFilters.setCategory([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.unit, categories]);


  const removeFilter = (type: 'unit' | 'category' | 'status' | 'currency' | 'search', value: string) => {
    switch (type) {
      case 'unit':
        setFilters.setUnit(filters.unit.filter(v => v !== value));
        break;
      case 'category':
        setFilters.setCategory(filters.category.filter(v => v !== value));
        break;
      case 'status':
        setFilters.setStatus(filters.status.filter(v => v !== value));
        break;
      case 'currency':
        setFilters.setCurrency(filters.currency.filter(v => v !== value));
        break;
      case 'search':
        setFilters.setSearch('');
        break;
    }
  };

  const getFilterTagLabel = (type: 'unit' | 'category', id: string): string => {
    if (type === 'unit') {
      return units.find(u => u.id === id)?.name || id;
    }
    if (type === 'category') {
      return categories.find(c => c.id === id)?.name || id;
    }
    return id;
  };


// ... imports and logic remain the same ...

return (
  <div className="mb-6 space-y-4">
    <div className="flex items-center gap-4">
      <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10">
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {isFilterActive && (
              <Badge variant="secondary" className="ml-2 rounded-full h-5 w-5 p-0 justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        {/* CHANGE 1: Remove default padding (p-0) and use flex-col to manage layout */}
        <PopoverContent className="w-[450px] p-0" align="start">
          <Tabs defaultValue="unit" className="w-full">
            
            {/* Header Section */}
            <div className="p-3 border-b bg-muted/10">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="unit" className="text-xs uppercase tracking-wider">Unit</TabsTrigger>
                <TabsTrigger value="category" className="text-xs uppercase tracking-wider" disabled={filters.unit.length === 0}>Category</TabsTrigger>
                <TabsTrigger value="status" className="text-xs uppercase tracking-wider">Status</TabsTrigger>
                <TabsTrigger value="currency" className="text-xs uppercase tracking-wider">Currency</TabsTrigger>
              </TabsList>
            </div>

            {/* Body Section - Note the fixed height on ScrollArea */}
            <div className="p-3">
              <TabsContent value="unit" className="mt-0 space-y-3 outline-none">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search units..." className="pl-9 h-9 bg-muted/30" value={searchTerms.unit} onChange={e => setSearchTerms({...searchTerms, unit: e.target.value})} />
                </div>
                {/* CHANGE 2: Use h-[300px] (fixed height) instead of max-h. This forces internal scrolling. */}
                <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-1">
                    {filteredUnits.map(u => (
                      <label
                        key={u.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-2 py-2 transition-colors cursor-pointer hover:bg-muted/50",
                          (questionCounts.units[u.id] || 0) === 0 && "opacity-50"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            id={`unit-${u.id}`} 
                            checked={filters.unit.includes(u.id)}
                            onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setUnit, filters.unit, u.id, !!checked)}
                            className="h-4 w-4 rounded-[4px]" 
                          />
                          <span className="text-sm font-medium leading-none tracking-tight">{u.name}</span>
                        </div>
                        <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center">{questionCounts.units[u.id] || 0}</Badge>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="category" className="mt-0 space-y-3 outline-none">
                {filters.unit.length === 0 ? (
                  <div className="flex items-center justify-center h-[348px]"> {/* Match height of search + scroll area */}
                    <p className="text-center text-sm text-muted-foreground">Please select a Unit first<br/>to view Categories.</p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search categories..." className="pl-9 h-9 bg-muted/30" value={searchTerms.category} onChange={e => setSearchTerms({...searchTerms, category: e.target.value})} />
                    </div>
                    <ScrollArea className="h-[300px] pr-3">
                      <div className="space-y-1">
                        {filteredCategories.map(c => (
                          <label
                            key={c.id}
                            className={cn(
                              "flex items-center justify-between rounded-lg px-2 py-2 transition-colors cursor-pointer hover:bg-muted/50",
                              (questionCounts.categories[c.id] || 0) === 0 && "opacity-50"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox 
                                id={`cat-${c.id}`} 
                                checked={filters.category.includes(c.id)}
                                onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setCategory, filters.category, c.id, !!checked)}
                                className="h-4 w-4 rounded-[4px]" 
                              />
                              <span className="text-sm font-medium leading-none tracking-tight">{c.name}</span>
                            </div>
                            <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center">{questionCounts.categories[c.id] || 0}</Badge>
                          </label>
                        ))}
                        {filteredCategories.length === 0 && (
                           <p className="text-center text-xs text-muted-foreground py-4">No categories found.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="status" className="mt-0 space-y-3 outline-none">
                 {/* Spacer to align with tabs that have search bars */}
                 <div className="h-9"></div> 
                 <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-1">
                      {(['published', 'draft'] as const).map(status => (
                          <label
                            key={status}
                            className={cn(
                              "flex items-center justify-between rounded-lg px-2 py-2 transition-colors cursor-pointer hover:bg-muted/50",
                              (questionCounts.statuses[status] || 0) === 0 && "opacity-50"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox 
                                  id={`status-${status}`} 
                                  checked={filters.status.includes(status)}
                                  onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setStatus, filters.status, status, !!checked)}
                                  className="h-4 w-4 rounded-[4px]" 
                                />
                              <span className="text-sm font-medium leading-none tracking-tight capitalize">{status}</span>
                            </div>
                            <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center">{questionCounts.statuses[status] || 0}</Badge>
                          </label>
                      ))}
                  </div>
                 </ScrollArea>
              </TabsContent>

              <TabsContent value="currency" className="mt-0 space-y-3 outline-none">
                 {/* Spacer to align with tabs that have search bars */}
                 <div className="h-9"></div>
                 <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-1">
                      {(['spark', 'coin', 'gold', 'diamond'] as const).map(currency => (
                         <label
                            key={currency}
                            className={cn(
                              "flex items-center justify-between rounded-lg px-2 py-2 transition-colors cursor-pointer hover:bg-muted/50",
                              (questionCounts.currencies[currency] || 0) === 0 && "opacity-50"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox 
                                  id={`curr-${currency}`} 
                                  checked={filters.currency.includes(currency)}
                                  onCheckedChange={(checked) => handleMultiSelectChange(setFilters.setCurrency, filters.currency, currency, !!checked)}
                                  className="h-4 w-4 rounded-[4px]" 
                                />
                              <span className="text-sm font-medium leading-none tracking-tight capitalize">{currency}</span>
                            </div>
                            <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center">{questionCounts.currencies[currency] || 0}</Badge>
                          </label>
                      ))}
                  </div>
                 </ScrollArea>
              </TabsContent>
            </div>

            {/* CHANGE 3: Footer is outside the TabsContent, pinned to bottom with border-t */}
            <div className="flex items-center justify-between bg-muted/10 border-t p-3">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8 px-2" onClick={() => resetFilters()}>
                Clear All
              </Button>
              <Button size="sm" className="text-xs font-semibold h-8" onClick={() => setPopoverOpen(false)}>
                Apply Filters
              </Button>
            </div>

          </Tabs>
        </PopoverContent>
      </Popover>
      
      {/* Search bar outside popover (existing code) */}
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by title..." className="pl-10 h-10" value={filters.search} onChange={e => setFilters.setSearch(e.target.value)} />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <span>|</span>
          <span>Showing {resultCount} results</span>
      </div>
    </div>
    
     {/* Active filters display (existing code) */}
     {isFilterActive && (
      <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* ... (Your existing active filter badge code here) ... */}
          {/* I have omitted the badge logic for brevity as it remains unchanged */}
           <span className="text-sm font-semibold">Active:</span>
          {filters.unit.map(id => (
            <Badge key={id} variant="outline" className="pl-2">
              {getFilterTagLabel('unit', id)}
              <button onClick={() => removeFilter('unit', id)} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {filters.category.map(id => (
            <Badge key={id} variant="outline" className="pl-2">
              {getFilterTagLabel('category', id)}
              <button onClick={() => removeFilter('category', id)} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
           {filters.status.map(id => (
            <Badge key={id} variant="outline" className="pl-2 capitalize">
              {id}
              <button onClick={() => removeFilter('status', id)} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {filters.currency.map(id => (
            <Badge key={id} variant="outline" className="pl-2 capitalize">
              {id}
              <button onClick={() => removeFilter('currency', id)} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
           {filters.search && (
            <Badge variant="outline" className="pl-2">
              Search: "{filters.search}"
              <button onClick={() => removeFilter('search', '')} className="ml-1 rounded-full hover:bg-muted/50 p-0.5"><X className="h-3 w-3" /></button>
            </Badge>
          )}
      </div>
    )}
  </div>
);
}
