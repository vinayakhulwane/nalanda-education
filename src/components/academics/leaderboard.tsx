'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Coins, Crown, Gem, Loader2 } from "lucide-react";

export default function Leaderboard({ subjectId }: { subjectId: string }) {
    const firestore = useFirestore();
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'coins' | 'gold' | 'diamonds'>('coins');

    useEffect(() => {
        async function fetchStudents() {
            if (!firestore) return;
            try {
                // Fetch users enrolled in this subject
                const q = query(collection(firestore, 'users'), where('enrollments', 'array-contains', subjectId));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStudents(data);
            } catch (e) {
                console.error("Failed to fetch leaderboard", e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStudents();
    }, [firestore, subjectId]);

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    }, [students, sortBy]);

    const getMedalColor = (index: number) => {
        switch(index) {
            case 0: return "text-yellow-500"; // Gold
            case 1: return "text-slate-400";   // Silver
            case 2: return "text-amber-600";  // Bronze
            default: return "text-muted-foreground";
        }
    };

    const getStudentName = (student: any) => {
        if (student.displayName) return student.displayName;
        if (student.name) return student.name;
        if (student.firstName) return `${student.firstName} ${student.lastName || ''}`.trim();
        if (student.email) return student.email.split('@')[0]; // Fallback to email username
        return "Unknown Student";
    };

    if (isLoading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <Card className="mt-6 border-none shadow-none md:border md:shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl"><Trophy className="h-5 w-5 text-yellow-500"/> Class Leaderboard</CardTitle>
                    <CardDescription>Top achievers in this subject.</CardDescription>
                </div>
                <div className="flex w-full sm:w-auto bg-muted/50 p-1 rounded-xl">
                    <Button 
                        variant={sortBy === 'coins' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setSortBy('coins')} 
                        className="flex-1 sm:flex-none h-9 gap-1.5 rounded-lg transition-all"
                    >
                        <Coins className="h-4 w-4 text-yellow-500" /> 
                        <span className="hidden sm:inline">Coins</span>
                    </Button>
                    <Button 
                        variant={sortBy === 'gold' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setSortBy('gold')} 
                        className="flex-1 sm:flex-none h-9 gap-1.5 rounded-lg transition-all"
                    >
                        <Crown className="h-4 w-4 text-amber-500" /> 
                        <span className="hidden sm:inline">Gold</span>
                    </Button>
                    <Button 
                        variant={sortBy === 'diamonds' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setSortBy('diamonds')} 
                        className="flex-1 sm:flex-none h-9 gap-1.5 rounded-lg transition-all"
                    >
                        <Gem className="h-4 w-4 text-blue-500" /> 
                        <span className="hidden sm:inline">Gems</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
                {students.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed mx-4 sm:mx-0">
                        No students enrolled yet.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sortedStudents.map((student, index) => (
                            <div key={student.id} className="group flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-default">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className={`font-bold w-8 text-center flex-shrink-0 transition-transform group-hover:scale-110 ${getMedalColor(index)}`}>
                                        {index < 3 ? <Medal className="h-6 w-6 sm:h-7 sm:w-7 mx-auto drop-shadow-sm" /> : <span className="text-lg sm:text-xl text-muted-foreground">#{index + 1}</span>}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 line-clamp-1">{getStudentName(student)}</span>
                                        {index === 0 && <span className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-500 font-bold uppercase tracking-wider flex items-center gap-1"><Crown className="h-3 w-3" /> Class Topper</span>}
                                    </div>
                                </div>
                                <div className="font-mono font-bold text-base sm:text-lg flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                    {sortBy === 'coins' && <Coins className="h-4 w-4 text-yellow-500" />}
                                    {sortBy === 'gold' && <Crown className="h-4 w-4 text-amber-500" />}
                                    {sortBy === 'diamonds' && <Gem className="h-4 w-4 text-blue-500" />}
                                    <span className="text-slate-700 dark:text-slate-200">{Math.floor(student[sortBy] || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}