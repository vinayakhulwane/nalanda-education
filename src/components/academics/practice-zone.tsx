'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Worksheet, WorksheetAttempt } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ChevronLeft, ChevronRight, PenTool } from "lucide-react";
import { WorksheetDisplayCard } from "@/components/academics/worksheet-display-card";

export default function PracticeZone({ classId, subjectId }: { classId: string, subjectId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user, userProfile } = useUser();
    const [attempts, setAttempts] = useState<WorksheetAttempt[]>([]);
    const [areAttemptsLoading, setAttemptsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    if (userProfile?.role === 'admin' || userProfile?.role === 'teacher') {
        return (
            <div className="p-8 text-center border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">Practice Zone is a student-only feature.</p>
            </div>
        );
    }

    const practiceWorksheetsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !subjectId) return null;
        return query(
            collection(firestore, 'worksheets'),
            where('subjectId', '==', subjectId),
            where('worksheetType', '==', 'practice'),
            where('authorId', '==', user.uid)
        );
    }, [firestore, user, subjectId]);
    
    const { data: practiceWorksheets, isLoading: areWorksheetsLoading } = useCollection<Worksheet>(practiceWorksheetsQuery);

    useEffect(() => {
        const fetchAttempts = async () => {
            if (!firestore || !user?.uid || !practiceWorksheets) {
                setAttemptsLoading(false);
                return;
            }
            const targetIds = practiceWorksheets.map(ws => ws.id);
            if (targetIds.length === 0) {
                setAttempts([]);
                setAttemptsLoading(false);
                return;
            }
            try {
                const attemptsQuery = query(
                    collection(firestore, 'worksheet_attempts'), 
                    where('userId', '==', user.uid),
                    where('worksheetId', 'in', targetIds.slice(0, 30)),
                    orderBy('attemptedAt', 'desc')
                );
                const attemptSnapshots = await getDocs(attemptsQuery);
                const fetchedAttempts = attemptSnapshots.docs.map(d => ({ id: d.id, ...d.data() })) as WorksheetAttempt[];
                setAttempts(fetchedAttempts);
            } catch (error) {
                console.error("Error fetching attempts:", error);
            } finally {
                setAttemptsLoading(false);
            }
        };

        if (practiceWorksheets) {
            fetchAttempts();
        }
    }, [firestore, user?.uid, practiceWorksheets]);


    const { notStarted, history, attemptsByWorksheet, totalPages, paginatedHistory } = useMemo(() => {
        if (!practiceWorksheets) {
            return { notStarted: [], history: [], attemptsByWorksheet: new Map(), totalPages: 1, paginatedHistory: [] };
        }
        
        const attemptsMap = new Map<string, WorksheetAttempt[]>();
        attempts.forEach(attempt => {
            const existing = attemptsMap.get(attempt.worksheetId) || [];
            attemptsMap.set(attempt.worksheetId, [...existing, attempt]);
        });
    
        const attemptedWorksheetIds = new Set(attempts.map(a => a.worksheetId));
    
        const todoList = practiceWorksheets.filter(ws => !attemptedWorksheetIds.has(ws.id));
        const historyList = practiceWorksheets.filter(ws => attemptedWorksheetIds.has(ws.id));
        
        historyList.sort((a, b) => {
            const timeA = attemptsMap.get(a.id)?.[0]?.attemptedAt?.toMillis() || 0;
            const timeB = attemptsMap.get(b.id)?.[0]?.attemptedAt?.toMillis() || 0;
            return timeB - timeA;
        });
        
        const totalP = Math.ceil(historyList.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = historyList.slice(startIndex, endIndex);

        return { 
            history: historyList, 
            notStarted: todoList, 
            attemptsByWorksheet: attemptsMap,
            totalPages: totalP,
            paginatedHistory: paginatedItems,
        };
    }, [practiceWorksheets, attempts, currentPage, itemsPerPage]);
    

    const isLoading = areWorksheetsLoading || areAttemptsLoading;
    const createWorksheetUrl = `/worksheets/new?classId=${classId}&subjectId=${subjectId}&source=practice`;
    
    return (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Tabs defaultValue="saved" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
                        <TabsTrigger value="saved" className="px-4">Saved & To-Do</TabsTrigger>
                        <TabsTrigger value="history" className="px-4">Attempt History</TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="saved" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div 
                            className="group flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all cursor-pointer h-full min-h-[300px]"
                            onClick={() => router.push(createWorksheetUrl)}
                        >
                            <div className="h-16 w-16 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Plus className="h-8 w-8 text-purple-600 dark:text-purple-400"/>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Create New</h3>
                            <p className="text-sm text-muted-foreground text-center px-4 mt-2">
                                Build a custom practice sheet tailored to your needs.
                            </p>
                            <Button variant="ghost" className="mt-4 text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30">
                                Start Building
                            </Button>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center items-center h-48 col-span-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            notStarted.map(ws => (
                                <WorksheetDisplayCard 
                                    key={ws.id} 
                                    worksheet={ws} 
                                    isPractice={true}
                                    view="card"
                                />
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : paginatedHistory.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {paginatedHistory.map(ws => (
                                        <WorksheetDisplayCard 
                                            key={ws.id} 
                                            worksheet={ws} 
                                            isPractice={true}
                                            view="list"
                                            attempts={attemptsByWorksheet.get(ws.id) || []}
                                        />
                                    ))}
                                </div>
                                
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <span className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                                                disabled={currentPage === totalPages}
                                            >
                                                Next <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-slate-50 dark:bg-slate-900">
                                <PenTool className="h-10 w-10 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">No attempt history found.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
