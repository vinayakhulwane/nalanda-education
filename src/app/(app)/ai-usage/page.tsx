'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, BrainCircuit, Wand2, Calendar, AlertTriangle, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AiStat {
  id: string;
  date: string;
  model: string;
  grade_submission?: number;
  generate_question?: number;
  total_requests: number;
}

const PAGE_SIZE = 50;

export default function AiUsagePage() {
  const firestore = useFirestore();
  const [stats, setStats] = useState<AiStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  // We store the "last visible document" of every page we've visited to act as breadcrumbs
  const [pageCursors, setPageCursors] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);
  const [currentCursor, setCurrentCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // To track if we have reached the end of the data
  const [hasMore, setHasMore] = useState(true);

  // --- Data Fetching ---
  const fetchStats = async (cursor: QueryDocumentSnapshot<DocumentData> | null) => {
    if (!firestore) return;
    
    try {
      setLoading(true);
      setError(null);

      let q = query(
        collection(firestore, 'ai_stats'), 
        orderBy('date', 'desc'),
        limit(PAGE_SIZE)
      );

      // If we have a cursor, start AFTER it (Pagination Logic)
      if (cursor) {
        q = query(
          collection(firestore, 'ai_stats'), 
          orderBy('date', 'desc'),
          startAfter(cursor),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AiStat));
      
      setStats(data);
      
      // If we got fewer results than requested, we are at the end
      setHasMore(snap.docs.length === PAGE_SIZE);
      
      // Update current cursor ref for the "Next" action to use
      if (snap.docs.length > 0) {
        setCurrentCursor(snap.docs[snap.docs.length - 1]);
      }

    } catch (err: any) {
      console.error("❌ Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchStats(null);
  }, [firestore]);

  // --- Handlers ---

  const handleNextPage = () => {
    if (!currentCursor) return;
    
    // 1. Push current cursor to history stack (so we can go back)
    setPageCursors(prev => [...prev, currentCursor]);
    
    // 2. Fetch next page using current cursor
    fetchStats(currentCursor);
  };

  const handlePreviousPage = () => {
    if (pageCursors.length === 0) return;

    // 1. Remove the last cursor from history
    const newHistory = [...pageCursors];
    newHistory.pop(); // Remove current page's start
    
    // 2. The new "last" cursor is the start of the previous page
    // If empty, it means we go back to the very start (null)
    const prevCursor = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
    
    setPageCursors(newHistory);
    fetchStats(prevCursor);
  };

  const handleDownload = () => {
    if (stats.length === 0) return;

    const headers = ["Date", "Model", "Grading Count", "Generation Count", "Total Requests"];
    const csvRows = stats.map(row => [
      row.date,
      row.model,
      row.grade_submission || 0,
      row.generate_question || 0,
      row.total_requests
    ]);

    const csvContent = [
      headers.join(","), 
      ...csvRows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ai_usage_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render ---

  if (loading && stats.length === 0) {
      return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="px-6 pb-10 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4">
          <div className="space-y-1">
             <h2 className="text-2xl font-bold tracking-tight">AI Analytics</h2>
             <p className="text-sm text-muted-foreground">
                Page {pageCursors.length + 1} | Showing {stats.length} entries
             </p>
          </div>
          <Button onClick={handleDownload} variant="outline" className="flex items-center gap-2" disabled={stats.length === 0}>
            <Download className="h-4 w-4" /> Export Page
          </Button>
      </div>

      {/* Summary Cards (Only show on first page to keep it clean, or always show) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests (This Page)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {stats.reduce((acc, curr) => acc + (curr.total_requests || 0), 0)}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Usage Log
            </CardTitle>
        </CardHeader>
        <CardContent>
            {stats.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No records found.</div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead className="text-center text-blue-600">Grading</TableHead>
                            <TableHead className="text-center text-purple-600">Generation</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.map((stat) => (
                            <TableRow key={stat.id}>
                                <TableCell className="font-medium">{stat.date}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{stat.model}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    {stat.grade_submission ? (
                                        <span className="flex items-center justify-center gap-1 font-bold text-blue-600">
                                            <BrainCircuit className="h-3 w-3" /> {stat.grade_submission}
                                        </span>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    {stat.generate_question ? (
                                        <span className="flex items-center justify-center gap-1 font-bold text-purple-600">
                                            <Wand2 className="h-3 w-3" /> {stat.generate_question}
                                        </span>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold">{stat.total_requests}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-2">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePreviousPage} 
            disabled={pageCursors.length === 0 || loading}
        >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
        </Button>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNextPage} 
            disabled={!hasMore || loading}
        >
            Next <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

    </div>
  );
}