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
        <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500"/> Class Leaderboard</CardTitle>
                    <CardDescription>Top achievers in this subject.</CardDescription>
                </div>
                <div className="flex bg-muted rounded-lg p-1">
                    <Button variant={sortBy === 'coins' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('coins')} className="h-8 gap-1"><Coins className="h-3 w-3" /> Coins</Button>
                    <Button variant={sortBy === 'gold' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('gold')} className="h-8 gap-1"><Crown className="h-3 w-3" /> Gold</Button>
                    <Button variant={sortBy === 'diamonds' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('diamonds')} className="h-8 gap-1"><Gem className="h-3 w-3" /> Gems</Button>
                </div>
            </CardHeader>
            <CardContent>
                {students.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No students enrolled yet.</div>
                ) : (
                    <div className="space-y-3">
                        {sortedStudents.map((student, index) => (
                            <div key={student.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`font-bold w-8 text-center text-xl ${getMedalColor(index)}`}>
                                        {index < 3 ? <Medal className="h-6 w-6 mx-auto" /> : `#${index + 1}`}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-lg">{getStudentName(student)}</span>
                                        {index === 0 && <span className="text-xs text-yellow-600 font-bold">👑 Class Topper</span>}
                                    </div>
                                </div>
                                <div className="font-mono font-bold text-xl flex items-center gap-2">
                                    {Math.floor(student[sortBy] || 0).toLocaleString()}
                                    {sortBy === 'coins' && <Coins className="h-5 w-5 text-yellow-500" />}
                                    {sortBy === 'gold' && <Crown className="h-5 w-5 text-amber-500" />}
                                    {sortBy === 'diamonds' && <Gem className="h-5 w-5 text-blue-500" />}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
