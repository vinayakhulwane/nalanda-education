'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Worksheet, WorksheetAttempt } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { WorksheetDisplayCard } from "@/components/academics/worksheet-display-card";

export default function PracticeZone({ classId, subjectId }: { classId: string, subjectId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user, userProfile } = useUser();
    const [attempts, setAttempts] = useState<WorksheetAttempt[]>([]);
    const [areAttemptsLoading, setAttemptsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
            
            const completedIds = practiceWorksheets.filter(ws => userProfile?.completedWorksheets?.includes(ws.id)).map(ws => ws.id);

            if (completedIds.length === 0) {
                setAttempts([]);
                setAttemptsLoading(false);
                return;
            }

            try {
                const attemptsQuery = query(
                    collection(firestore, 'worksheet_attempts'), 
                    where('userId', '==', user.uid),
                    where('worksheetId', 'in', completedIds.slice(0,30)) 
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

        fetchAttempts();
    }, [firestore, user?.uid, practiceWorksheets, userProfile?.completedWorksheets]);


    const { completed, notCompleted, attemptsMap, totalPages, paginatedCompleted } = useMemo(() => {
        if (!practiceWorksheets) return { completed: [], notCompleted: [], attemptsMap: new Map(), totalPages: 1, paginatedCompleted: [] };
        
        const completedIds = new Set(userProfile?.completedWorksheets || []);
        const allCompletedWorksheets = practiceWorksheets.filter(ws => completedIds.has(ws.id));
        const notCompletedWorksheets = practiceWorksheets.filter(ws => !completedIds.has(ws.id));
        
        const latestAttemptsMap = new Map<string, WorksheetAttempt>();
        attempts.forEach(attempt => {
            const existing = latestAttemptsMap.get(attempt.worksheetId);
            if (!existing || (attempt.attemptedAt && existing.attemptedAt && attempt.attemptedAt.toMillis() > existing.attemptedAt.toMillis())) {
                latestAttemptsMap.set(attempt.worksheetId, attempt);
            }
        });

        allCompletedWorksheets.sort((a, b) => {
            const attemptA = latestAttemptsMap.get(a.id);
            const attemptB = latestAttemptsMap.get(b.id);
            const timeA = attemptA?.attemptedAt?.toMillis() || 0;
            const timeB = attemptB?.attemptedAt?.toMillis() || 0;
            return timeB - timeA;
        });
        
        const finalAttemptsMap = new Map<string, WorksheetAttempt>();
        latestAttemptsMap.forEach((attempt, worksheetId) => {
            finalAttemptsMap.set(worksheetId, attempt);
        });

        const totalP = Math.ceil(allCompletedWorksheets.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = allCompletedWorksheets.slice(startIndex, endIndex);

        return { 
            completed: allCompletedWorksheets, 
            notCompleted: notCompletedWorksheets, 
            attemptsMap: finalAttemptsMap,
            totalPages: totalP,
            paginatedCompleted: paginatedItems,
        };
    }, [practiceWorksheets, userProfile?.completedWorksheets, attempts, currentPage]);
    

    const isLoading = areWorksheetsLoading || areAttemptsLoading;
    const createWorksheetUrl = `/worksheets/new?classId=${classId}&subjectId=${subjectId}&source=practice`;
    
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>My Practice Zone</CardTitle>
                <CardDescription>Create your own worksheets, view saved ones, and check your attempt history.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="saved">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="saved">Saved & To-Do</TabsTrigger>
                        <TabsTrigger value="history">Attempt History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="saved">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                            <Card 
                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => router.push(createWorksheetUrl)}
                            >
                                <div className="flex flex-col items-center text-center">
                                    <Plus className="h-10 w-10 text-muted-foreground mb-4"/>
                                    <h3 className="font-semibold">Create New Worksheet</h3>
                                    <p className="text-sm text-muted-foreground">Build a worksheet tailored to your needs.</p>
                                </div>
                            </Card>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48 col-span-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                notCompleted.map(ws => (
                                    <WorksheetDisplayCard 
                                        key={ws.id} 
                                        worksheet={ws} 
                                        isPractice={true}
                                        completedAttempts={userProfile?.completedWorksheets || []}
                                        view="card"
                                    />
                                ))
                            )}
                        </div>
                        {notCompleted.length === 0 && !isLoading && (
                            <div className="text-center text-muted-foreground py-10 mt-4">
                                <p>Your saved practice worksheets will appear here.</p>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="history">
                         <div className="space-y-4 mt-4">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48 col-span-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                paginatedCompleted.map(ws => (
                                    <WorksheetDisplayCard 
                                        key={ws.id} 
                                        worksheet={ws} 
                                        isPractice={true}
                                        completedAttempts={userProfile?.completedWorksheets || []}
                                        view="list"
                                        attempt={attemptsMap.get(ws.id)}
                                    />
                                ))
                            )}
                        </div>
                         {completed.length === 0 && !isLoading && (
                            <div className="text-center text-muted-foreground py-10 mt-4">
                                <p>Your completed practice worksheets will appear here.</p>
                            </div>
                        )}
                        {completed.length > 0 && !isLoading && (
                            <div className="flex items-center justify-between mt-4">
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
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
