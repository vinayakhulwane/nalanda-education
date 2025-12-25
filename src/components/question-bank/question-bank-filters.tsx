'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Unit, Category } from "@/types";
import { Search, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";

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
  
    return (
    <div className="mb-6 space-y-4">
        <Tabs defaultValue="unit">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="unit">Unit</TabsTrigger>
                <TabsTrigger value="category" disabled={filters.unit === 'all'}>Category</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="currency">Currency</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>
            <Card className="mt-2">
                <CardContent className="p-4">
                    <ScrollArea className="h-48">
                         <TabsContent value="unit">
                            <RadioGroup value={filters.unit} onValueChange={setFilters.setUnit}>
                                <div className="space-y-2">
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
                                </div>
                            </RadioGroup>
                        </TabsContent>
                         <TabsContent value="category">
                             <RadioGroup value={filters.category} onValueChange={setFilters.setCategory}>
                                 <div className="space-y-2">
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
                                </div>
                             </RadioGroup>
                         </TabsContent>
                        <TabsContent value="status">
                           <RadioGroup value={filters.status} onValueChange={setFilters.setStatus}>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="status-all" /><Label htmlFor="status-all">All Statuses</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="published" id="status-published" /><Label htmlFor="status-published">Published</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="draft" id="status-draft" /><Label htmlFor="status-draft">Draft</Label></div>
                                </div>
                            </RadioGroup>
                        </TabsContent>
                        <TabsContent value="currency">
                             <RadioGroup value={filters.currency} onValueChange={setFilters.setCurrency}>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="curr-all" /><Label htmlFor="curr-all">All Currencies</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="spark" id="curr-spark" /><Label htmlFor="curr-spark">Spark</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="coin" id="curr-coin" /><Label htmlFor="curr-coin">Coin</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="gold" id="curr-gold" /><Label htmlFor="curr-gold">Gold</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="diamond" id="curr-diamond" /><Label htmlFor="curr-diamond">Diamond</Label></div>
                                </div>
                            </RadioGroup>
                        </TabsContent>
                        <TabsContent value="search">
                            <div className="p-2">
                                <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search by title..." className="pl-10" value={filters.search} onChange={e => setFilters.setSearch(e.target.value)} />
                                </div>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </CardContent>
            </Card>
        </Tabs>

       <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {resultCount} results</span>
            {activeFilters.length > 0 && <span>|</span>}
            <div className="flex flex-wrap items-center gap-1">
                {activeFilters.map(f => (
                    <span key={f.key} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                        {f.label}
                        <button onClick={() => resetFilters(f.key)}><X className="h-3 w-3"/></button>
                    </span>
                ))}
                 {activeFilters.length > 0 && <Button variant="link" size="sm" onClick={() => resetFilters('all')} className="text-xs h-auto p-1">Clear all</Button>}
            </div>
        </div>
    </div>
  );
}
