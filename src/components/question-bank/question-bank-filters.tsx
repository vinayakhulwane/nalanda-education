'use client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Search, X } from "lucide-react";
import type { Unit, Category } from "@/types";

interface QuestionBankFiltersProps {
  units: Unit[];
  categories: Category[];
  filters: {
    unit: string;
    category: string;
    status: string;
    currency: string;
    search: string;
  };
  setFilters: {
    setUnit: (value: string) => void;
    setCategory: (value: string) => void;
    setStatus: (value: string) => void;
    setCurrency: (value: string) => void;
    setSearch: (value: string) => void;
  };
  resetFilters: (filter: string) => void;
  resultCount: number;
}

export function QuestionBankFilters({ units, categories, filters, setFilters, resetFilters, resultCount }: QuestionBankFiltersProps) {
    const activeFilters = [
        filters.unit !== 'all' && { key: 'unit', label: `Unit: ${units.find(u => u.id === filters.unit)?.name}` },
        filters.category !== 'all' && { key: 'category', label: `Category: ${categories.find(c => c.id === filters.category)?.name}` },
        filters.status !== 'all' && { key: 'status', label: `Status: ${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}` },
        filters.currency !== 'all' && { key: 'currency', label: `Currency: ${filters.currency.charAt(0).toUpperCase() + filters.currency.slice(1)}` },
        filters.search !== '' && {key: 'search', label: `Search: "${filters.search}"`},
    ].filter(Boolean) as { key: string; label: string }[];
    
    const isFilterActive = activeFilters.length > 0;

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
                <TabsTrigger value="category" className="text-xs" disabled={filters.unit === 'all'}>Category</TabsTrigger>
                <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
                <TabsTrigger value="currency" className="text-xs">Currency</TabsTrigger>
                <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
              </TabsList>
              <ScrollArea className="h-64">
                <div className="p-4">
                    <TabsContent value="unit">
                        <RadioGroup value={filters.unit} onValueChange={setFilters.setUnit}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="unit-all" />
                                <Label htmlFor="unit-all">All Units</Label>
                            </div>
                            {units.map(u => (
                                <div key={u.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={u.id} id={`unit-${u.id}`} />
                                    <Label htmlFor={`unit-${u.id}`}>{u.name}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </TabsContent>
                    <TabsContent value="category">
                         <RadioGroup value={filters.category} onValueChange={setFilters.setCategory}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="cat-all" />
                                <Label htmlFor="cat-all">All Categories</Label>
                            </div>
                            {categories.map(c => (
                                <div key={c.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={c.id} id={`cat-${c.id}`} />
                                    <Label htmlFor={`cat-${c.id}`}>{c.name}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </TabsContent>
                    <TabsContent value="status">
                         <RadioGroup value={filters.status} onValueChange={setFilters.setStatus}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="status-all" /><Label htmlFor="status-all">All Statuses</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="published" id="status-published" /><Label htmlFor="status-published">Published</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="draft" id="status-draft" /><Label htmlFor="status-draft">Draft</Label></div>
                        </RadioGroup>
                    </TabsContent>
                     <TabsContent value="currency">
                         <RadioGroup value={filters.currency} onValueChange={setFilters.setCurrency}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="curr-all" /><Label htmlFor="curr-all">All Currencies</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="spark" id="curr-spark" /><Label htmlFor="curr-spark">Spark</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="coin" id="curr-coin" /><Label htmlFor="curr-coin">Coin</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="gold" id="curr-gold" /><Label htmlFor="curr-gold">Gold</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="diamond" id="curr-diamond" /><Label htmlFor="curr-diamond">Diamond</Label></div>
                        </RadioGroup>
                    </TabsContent>
                     <TabsContent value="search">
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
                {activeFilters.map(f => (
                    <span key={f.key} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                        {f.label}
                        <button onClick={() => resetFilters(f.key)}><X className="h-3 w-3"/></button>
                    </span>
                ))}
                 {isFilterActive && <Button variant="link" size="sm" onClick={() => resetFilters('all')} className="text-xs h-auto p-1">Clear all</Button>}
            </div>
        </div>
      </div>
    </div>
  );
}
