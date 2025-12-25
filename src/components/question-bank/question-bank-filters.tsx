'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Unit, Category } from "@/types";
import { Search, X } from "lucide-react";

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Select value={filters.unit} onValueChange={setFilters.setUnit}>
          <SelectTrigger><SelectValue placeholder="Filter by unit..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.category} onValueChange={setFilters.setCategory} disabled={filters.unit === 'all'}>
          <SelectTrigger><SelectValue placeholder="Filter by category..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
             {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={setFilters.setStatus}>
          <SelectTrigger><SelectValue placeholder="Filter by status..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.currency} onValueChange={setFilters.setCurrency}>
          <SelectTrigger><SelectValue placeholder="Filter by currency..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            <SelectItem value="spark">Spark</SelectItem>
            <SelectItem value="coin">Coin</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="diamond">Diamond</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title..." className="pl-10" value={filters.search} onChange={e => setFilters.setSearch(e.target.value)} />
        </div>
      </div>

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
