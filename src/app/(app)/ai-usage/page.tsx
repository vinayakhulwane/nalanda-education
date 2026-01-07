'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, BrainCircuit, Wand2, Calendar } from 'lucide-react';

interface AiStat {
  id: string;
  date: string;
  model: string;
  grade_submission?: number;
  generate_question?: number;
  total_requests: number;
}

export default function AiUsagePage() {
  const firestore = useFirestore();
  const [stats, setStats] = useState<AiStat[]>([]);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    const fetchStats = async () => {
      if (!firestore) return;
             
      // Fetch stats for the last 30 entries (most recent days/models)
      const q = query(
        collection(firestore, 'ai_stats'), 
        orderBy('date', 'desc'),
        limit(50)
      );
      
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AiStat));
      setStats(data);
      setLoading(false);
    };

     fetchStats();
  }, [firestore]);

   if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

   return (
    <div className="px-6 pb-10 space-y-6">
      <PageHeader title="AI Consumption Analytics" description="Track daily model usage across grading and generation." />

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls (Recorded)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {stats.reduce((acc, curr) => acc + (curr.total_requests || 0), 0)}
                </div>
            </CardContent>
        </Card>
        {/* Add more summary cards if needed */}
      </div>

       <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Daily Usage by Model
            </CardTitle>
        </CardHeader>
        <CardContent>
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
                                    <span className="flex items-center justify-center gap-1 font-bold">
                                        <BrainCircuit className="h-3 w-3" /> {stat.grade_submission}
                                    </span>
                                ) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                                {stat.generate_question ? (
                                    <span className="flex items-center justify-center gap-1 font-bold">
                                        <Wand2 className="h-3 w-3" /> {stat.generate_question}
                                    </span>
                                ) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold">{stat.total_requests}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
