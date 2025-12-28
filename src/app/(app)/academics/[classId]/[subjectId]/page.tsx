'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { arrayRemove, arrayUnion, collection, doc, query, where, updateDoc, writeBatch, documentId, getDocs, limit, orderBy, increment, serverTimestamp } from "firebase/firestore";
import { Edit, Loader2, PlusCircle, Trash, ArrowLeft, MoreVertical, GripVertical, Plus, EyeOff, Eye, Pencil, UserPlus, UserMinus, ShieldAlert, BookCopy, History, FilePlus, Home, Trophy, Medal, Coins, Crown, Gem, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import type { Subject, Unit, Category, CustomTab, Worksheet, WorksheetAttempt, CurrencyType } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { RichTextEditor } from "@/components/rich-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableUnitItem } from "@/components/academics/sortable-unit-item";
import { WorksheetList } from "@/components/academics/worksheet-list";
import { WorksheetDisplayCard } from "@/components/academics/worksheet-display-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


function SyllabusEditor({ subjectId, subjectName }: { subjectId: string, subjectName: string }) {
    const firestore = useFirestore();
    const { userProfile } = useUser();
    
    // Dialog states
    const [dialogType, setDialogType] = useState<'addUnit' | 'editUnit' | 'deleteUnit' | 'addCategory' | 'editCategory' | 'deleteCategory' | null>(null);
    const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');

    // Data fetching
    const unitsQuery = useMemoFirebase(() => firestore && subjectId ? query(collection(firestore, 'units'), where('subjectId', '==', subjectId)) : null, [firestore, subjectId]);
    const { data: units, isLoading: areUnitsLoading } = useCollection<Unit>(unitsQuery);

    const sortedUnits = useMemo(() => units?.sort((a, b) => a.order - b.order) || [], [units]);

    const categoriesQuery = useMemoFirebase(() => {
        if (!firestore || !units || units.length === 0) return null;
        const unitIds = units.map(u => u.id).filter(id => !!id);
        if (unitIds.length === 0) return null;
        return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds));
    }, [firestore, units]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesQuery);

    const categoriesByUnit = useMemo(() => {
        if (!categories) return {};
        return categories.reduce((acc, category) => {
            if (!acc[category.unitId]) {
                acc[category.unitId] = [];
            }
            acc[category.unitId].push(category);
            acc[category.unitId].sort((a,b) => a.order - b.order);
            return acc;
        }, {} as Record<string, Category[]>);
    }, [categories]);
    
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    // Handlers
    const closeDialog = () => {
        setDialogType(null);
        setCurrentUnit(null);
        setCurrentCategory(null);
        setNewName('');
        setNewDescription('');
    }

    const handleSaveChanges = () => {
        if (!firestore) return;
        switch (dialogType) {
            case 'addUnit':
                const newUnitOrder = units ? units.length : 0;
                addDocumentNonBlocking(collection(firestore, 'units'), { name: newName, description: newDescription, subjectId, order: newUnitOrder });
                break;
            case 'editUnit':
                if (currentUnit) updateDocumentNonBlocking(doc(firestore, 'units', currentUnit.id), { name: newName, description: newDescription });
                break;
            case 'deleteUnit':
                if (currentUnit) deleteDocumentNonBlocking(doc(firestore, 'units', currentUnit.id));
                break;
            case 'addCategory':
                if (currentUnit) {
                     const newCategoryOrder = categoriesByUnit[currentUnit.id]?.length || 0;
                    addDocumentNonBlocking(collection(firestore, 'categories'), { name: newName, description: newDescription, unitId: currentUnit.id, order: newCategoryOrder });
                }
                break;
            case 'editCategory':
                if (currentCategory) updateDocumentNonBlocking(doc(firestore, 'categories', currentCategory.id), { name: newName, description: newDescription });
                break;
            case 'deleteCategory':
                if (currentCategory) deleteDocumentNonBlocking(doc(firestore, 'categories', currentCategory.id));
                break;
        }
        closeDialog();
    }
    
    const openDialog = (type: NonNullable<typeof dialogType>, unit?: Unit, category?: Category) => {
        setDialogType(type);
        if (unit) setCurrentUnit(unit);
        if (category) {
            setCurrentCategory(category)
            setNewName(category.name);
            setNewDescription(category.description || '');
        } else if (unit) {
            setNewName(unit.name);
            setNewDescription(unit.description || '');
        } else {
            setNewName('');
            setNewDescription('');
        }
    }

    const handleUnitDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (firestore && over && active.id !== over.id) {
            const oldIndex = sortedUnits.findIndex(u => u.id === active.id);
            const newIndex = sortedUnits.findIndex(u => u.id === over.id);
            const newOrder = arrayMove(sortedUnits, oldIndex, newIndex);
            
            const batch = writeBatch(firestore);
            newOrder.forEach((unit, index) => {
                const unitRef = doc(firestore, 'units', unit.id);
                batch.update(unitRef, { order: index });
            });
            await batch.commit();
        }
    }

    if (areUnitsLoading || areCategoriesLoading) {
         return (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold font-headline">{userIsEditor ? 'Syllabus Builder' : 'Syllabus'}</h3>
                 {userIsEditor && <Button onClick={() => setDialogType('addUnit')}>
                    <PlusCircle className="mr-2" />
                    Add Unit
                </Button>}
            </div>
            
            <DndContext collisionDetection={closestCenter} onDragEnd={handleUnitDragEnd}>
                <SortableContext items={sortedUnits.map(u => u.id)} strategy={verticalListSortingStrategy}>
                    <Accordion type="multiple" className="w-full space-y-4">
                        {sortedUnits.map(unit => (
                            <SortableUnitItem
                                key={unit.id}
                                unit={unit}
                                categories={categoriesByUnit[unit.id] || []}
                                userIsEditor={userIsEditor}
                                openDialog={openDialog}
                            />
                        ))}
                    </Accordion>
                </SortableContext>
            </DndContext>
            
            {units?.length === 0 && (
                <Card className="text-center py-12">
                    <CardContent>
                        <p className="text-muted-foreground">No units found. {userIsEditor && 'Start by adding one.'}</p>
                    </CardContent>
                </Card>
            )}

            {/* Generic Dialog for Add/Edit */}
            <Dialog open={!!(dialogType?.includes('add') || dialogType?.includes('edit'))} onOpenChange={closeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogType?.includes('add') ? 'Add New' : 'Edit'} {dialogType?.includes('Unit') ? 'Unit' : 'Category'}</DialogTitle>
                         <DialogDescription>
                            {dialogType === 'addUnit' && `Create a new unit for ${subjectName}.`}
                            {dialogType === 'editUnit' && `Editing the unit: ${currentUnit?.name}.`}
                            {dialogType === 'addCategory' && `Create a new category for the unit: ${currentUnit?.name}.`}
                            {dialogType === 'editCategory' && `Editing the category: ${currentCategory?.name}.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} />
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generic Delete Confirmation Dialog */}
            <AlertDialog open={!!dialogType?.includes('delete')} onOpenChange={closeDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the {' '}
                            {dialogType === 'deleteUnit' ? `unit '${currentUnit?.name}' and all its categories.` : `category '${currentCategory?.name}'.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveChanges} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function PracticeZone({ classId, subjectId }: { classId: string, subjectId: string }) {
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
                // Fetch all attempts for the completed worksheets
                const attemptsQuery = query(
                    collection(firestore, 'worksheet_attempts'), 
                    where('userId', '==', user.uid),
                    where('worksheetId', 'in', completedIds.slice(0,30)) // 'in' query limit
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
        
        const finalAttemptsMap = new Map<string, string>();
        latestAttemptsMap.forEach((attempt, worksheetId) => {
            finalAttemptsMap.set(worksheetId, attempt.id);
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
                                        attemptId={attemptsMap.get(ws.id)}
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

function Leaderboard({ subjectId }: { subjectId: string }) {
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

function SubjectWorkspacePageContent({ classId, subjectId }: { classId: string, subjectId: string }) {
    const { user, userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    
    // Custom Tab Dialog States
    const [isAddTabDialogOpen, setAddTabDialogOpen] = useState(false);
    const [isEditTabDialogOpen, setEditTabDialogOpen] = useState(false);
    const [isEditTabContentDialogOpen, setEditTabContentDialogOpen] = useState(false);
    const [isDeleteTabDialogOpen, setDeleteTabDialogOpen] = useState(false);
    const [isUnlockTabDialogOpen, setUnlockTabDialogOpen] = useState(false);

    const [editingTab, setEditingTab] = useState<CustomTab | null>(null);
    const [newTabName, setNewTabName] = useState("");
    const [editedTabName, setEditedTabName] = useState("");
    const [editedTabContent, setEditedTabContent] = useState("");
    const [tabCost, setTabCost] = useState(0);
    const [tabCurrency, setTabCurrency] = useState<CurrencyType>('coin');
    const [deletingTab, setDeletingTab] = useState<CustomTab | null>(null);
    const [unlockingTab, setUnlockingTab] = useState<CustomTab | null>(null);

    const subjectDocRef = useMemoFirebase(() => firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null, [firestore, subjectId]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);
    
    const isEnrolled = useMemo(() => {
        return userProfile?.enrollments?.includes(subjectId) ?? false;
    }, [userProfile, subjectId]);
    
    const isUserBlocked = useMemo(() => {
        return userProfile?.active === false;
    }, [userProfile]);

    useEffect(() => {
        if (!isUserProfileLoading && !userProfile) {
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);

    const handleAddCustomTab = async () => {
        if (!firestore || !newTabName.trim() || !subjectId) return;

        const newTab: CustomTab = {
            id: uuidv4(),
            label: newTabName,
            content: `Content for ${newTabName} goes here. Edit me!`,
            cost: tabCost > 0 ? tabCost : undefined,
            currency: tabCost > 0 ? tabCurrency : undefined,
        };

        const subjectRef = doc(firestore, 'subjects', subjectId);
        await updateDoc(subjectRef, {
            customTabs: arrayUnion(newTab)
        });

        setNewTabName('');
        setTabCost(0);
        setTabCurrency('coin');
        setAddTabDialogOpen(false);
    }
    
    const openEditTabDialog = (tab: CustomTab) => {
        setEditingTab(tab);
        setEditedTabName(tab.label);
        setTabCost(tab.cost || 0);
        setTabCurrency(tab.currency || 'coin');
        setEditTabDialogOpen(true);
    };

    const handleEditCustomTab = async () => {
        if (!firestore || !editedTabName.trim() || !subject || !editingTab) return;
        const updatedTabs = subject.customTabs?.map(t => t.id === editingTab.id ? {
            ...t, 
            label: editedTabName,
            cost: tabCost > 0 ? tabCost : undefined,
            currency: tabCost > 0 ? tabCurrency : undefined,
        } : t);
        const subjectRef = doc(firestore, 'subjects', subjectId);
        await updateDoc(subjectRef, { customTabs: updatedTabs });
        setEditTabDialogOpen(false);
        setEditingTab(null);
    }

    const openDeleteTabDialog = (tab: CustomTab) => {
        setDeletingTab(tab);
        setDeleteTabDialogOpen(true);
    };
    
    const handleDeleteCustomTab = async () => {
        if (!firestore || !deletingTab || !subject) return;
        const subjectRef = doc(firestore, 'subjects', subjectId);
        await updateDoc(subjectRef, { customTabs: arrayRemove(deletingTab) });
        setDeleteTabDialogOpen(false);
        setDeletingTab(null);
    }

    const handleToggleTabVisibility = async (tab: CustomTab) => {
        if (!firestore || !subject) return;
        const updatedTabs = subject.customTabs?.map(t => t.id === tab.id ? {...t, hidden: !t.hidden} : t);
        const subjectRef = doc(firestore, 'subjects', subjectId);
        await updateDoc(subjectRef, { customTabs: updatedTabs });
    }

    const openEditTabContentDialog = (tab: CustomTab) => {
        setEditingTab(tab);
        setEditedTabContent(tab.content);
        setEditTabContentDialogOpen(true);
    }

    const handleEditTabContent = async () => {
        if (!firestore || !subject || !editingTab) return;
        const updatedTabs = subject.customTabs?.map(t => t.id === editingTab.id ? {...t, content: editedTabContent} : t);
        const subjectRef = doc(firestore, 'subjects', subjectId);
        await updateDoc(subjectRef, { customTabs: updatedTabs });
        setEditTabContentDialogOpen(false);
        setEditingTab(null);
    }

    const handleEnrollment = async () => {
        if (!firestore || !user || isUserBlocked) return;
        const userDocRef = doc(firestore, 'users', user.uid);
        if (isEnrolled) {
            await updateDoc(userDocRef, { enrollments: arrayRemove(subjectId) });
        } else {
            await updateDoc(userDocRef, { enrollments: arrayUnion(subjectId) });
        }
    }
    
    const handleUnlockTab = async () => {
        if (!user || !userProfile || !firestore || !unlockingTab) return;
        const { cost, currency, id: tabId, label } = unlockingTab;
        if (!cost || !currency) return;
        
        const balanceField = currency === 'coin' ? 'coins' : currency;
        const currentBalance = userProfile[balanceField] || 0;

        if (currentBalance < cost) {
            toast({ variant: 'destructive', title: 'Insufficient Funds', description: `You need ${cost} ${currency} to unlock this tab.` });
            return;
        }

        const userRef = doc(firestore, 'users', user.uid);
        const transactionRef = doc(collection(firestore, 'transactions'));
        const batch = writeBatch(firestore);
        
        batch.update(userRef, {
            [balanceField]: increment(-cost),
            unlockedTabs: arrayUnion(tabId)
        });
        
        batch.set(transactionRef, {
            userId: user.uid,
            type: 'spent',
            description: `Unlocked tab: ${label}`,
            amount: cost,
            currency: currency,
            createdAt: serverTimestamp(),
        });
        
        try {
            await batch.commit();
            toast({ title: 'Tab Unlocked!', description: `You can now view the content of "${label}".` });
            setUnlockTabDialogOpen(false);
            setUnlockingTab(null);
        } catch (error) {
            console.error("Error unlocking tab:", error);
            toast({ variant: 'destructive', title: 'Unlock Failed', description: 'Could not complete the transaction.' });
        }
    };

    const description = subject?.description || "Manage the subject curriculum.";
    const shouldTruncate = description.length > 150;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 150)}...` : description;

    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';
    
    const isTabUnlocked = (tab: CustomTab) => {
        if (!tab.cost || tab.cost <= 0) return true; // Free tabs are always unlocked
        return userProfile?.unlockedTabs?.includes(tab.id) ?? false;
    }
    
    const visibleCustomTabs = userIsEditor ? subject?.customTabs : subject?.customTabs?.filter(t => !t.hidden);

    if (isUserProfileLoading || isSubjectLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
             <Button variant="ghost" onClick={() => router.push(`/academics/${classId}`)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Subjects
            </Button>
            <div className="border-b pb-4 mb-6">
                <div>
                    <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">{subject?.name || "Subject"}</h1>
                    <p className="text-lg text-muted-foreground mt-2">
                        {displayedDescription}
                        {shouldTruncate && (
                             <Button variant="link" className="p-0 pl-1 text-lg" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                                {isDescriptionExpanded ? 'Read less' : 'Read more'}
                            </Button>
                        )}
                    </p>
                </div>
                 {userProfile?.role === 'student' && (
                    <div className="mt-4">
                        <Button onClick={handleEnrollment} disabled={isUserBlocked}>
                           {isUserBlocked ? (
                                <>
                                    <ShieldAlert className="mr-2" /> Blocked
                                </>
                           ) : isEnrolled ? (
                                <>
                                    <UserMinus className="mr-2" /> Unenroll
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2" /> Enroll
                                </>
                            )}
                        </Button>
                         {isUserBlocked && (
                            <Alert variant="destructive" className="mt-4 max-w-md">
                                <AlertTitle>Account Blocked</AlertTitle>
                                <AlertDescription>
                                    Your account has been blocked by an administrator. Please contact Nalanda Education to resolve this issue.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}
            </div>
            
            {/* Hide tabs if user is blocked */}
            {!isUserBlocked && (
            <Tabs defaultValue="syllabus">
                <div className="flex items-center">
                    <TabsList>
                        <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
                        <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
                        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                        {visibleCustomTabs?.map(tab => {
                            const isLocked = !userIsEditor && !isTabUnlocked(tab);
                            return (
                                <div key={tab.id} className="relative group">
                                    <TabsTrigger 
                                        value={tab.id} 
                                        className={userIsEditor ? 'pr-8' : isLocked ? 'pr-2' : ''}
                                        onClick={(e) => {
                                            if (isLocked) {
                                                e.preventDefault();
                                                setUnlockingTab(tab);
                                                setUnlockTabDialogOpen(true);
                                            }
                                        }}
                                    >
                                        {tab.label}
                                        {isLocked && <Lock className="ml-2 h-3 w-3 text-muted-foreground" />}
                                    </TabsTrigger>
                                    {userIsEditor && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="absolute top-1/2 right-0.5 -translate-y-1/2 h-6 w-6 opacity-60 group-hover:opacity-100">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditTabDialog(tab)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleTabVisibility(tab)}>
                                                    {tab.hidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                                                    {tab.hidden ? 'Show to Students' : 'Hide from Students'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => openDeleteTabDialog(tab)} className="text-destructive focus:text-destructive">
                                                    <Trash className="mr-2 h-4 w-4" /> Delete Tab
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            )
                        })}
                    </TabsList>
                    {userIsEditor && (
                         <Button variant="ghost" size="icon" className="ml-2" onClick={() => { setNewTabName(''); setTabCost(0); setAddTabDialogOpen(true);}}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <TabsContent value="syllabus">
                    <SyllabusEditor subjectId={subjectId} subjectName={subject?.name || 'this subject'}/>
                </TabsContent>
                <TabsContent value="worksheet">
                    <Tabs defaultValue="assignments" className="mt-4">
                        <TabsList>
                            <TabsTrigger value="assignments"><BookCopy className="mr-2 h-4 w-4"/> Classroom Assignments</TabsTrigger>
                            <TabsTrigger value="practice"><FilePlus className="mr-2 h-4 w-4"/> My Practice Zone</TabsTrigger>
                        </TabsList>
                        <TabsContent value="assignments">
                            <WorksheetList subjectId={subjectId} isEnrolled={isEnrolled} userIsEditor={userIsEditor} />
                        </TabsContent>
                        <TabsContent value="practice">
                            <PracticeZone classId={classId} subjectId={subjectId} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
                
                <TabsContent value="leaderboard">
                     <Leaderboard subjectId={subjectId} />
                </TabsContent>

                 {visibleCustomTabs?.map(tab => (
                    <TabsContent key={tab.id} value={tab.id}>
                        <Card className="mt-6">
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>{tab.label}</CardTitle>
                                {userIsEditor && (
                                    <Button variant="outline" size="sm" onClick={() => openEditTabContentDialog(tab)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit Content
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="prose dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: tab.content }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
            )}

            {/* Add/Edit Tab Dialog */}
            <Dialog open={isAddTabDialogOpen || isEditTabDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setAddTabDialogOpen(false); setEditTabDialogOpen(false); }}}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditTabDialogOpen ? "Edit Tab Details" : "Add New Tab"}</DialogTitle>
                        <DialogDescription>{isEditTabDialogOpen ? `Update the details for '${editingTab?.label}'` : 'Create a new custom tab for this subject.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="tab-name">Tab Name</Label>
                          <Input id="tab-name" value={isEditTabDialogOpen ? editedTabName : newTabName} onChange={e => isEditTabDialogOpen ? setEditedTabName(e.target.value) : setNewTabName(e.target.value)} placeholder="e.g., PDF Notes"/>
                        </div>
                         <div className="space-y-2">
                           <Label>Cost (Optional)</Label>
                           <div className="flex gap-2">
                             <Input id="tab-cost" type="number" placeholder="e.g. 50" value={tabCost || ''} onChange={e => setTabCost(Number(e.target.value))} className="w-1/2"/>
                              <Select value={tabCurrency} onValueChange={(v: any) => setTabCurrency(v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="coin">Coins</SelectItem>
                                  <SelectItem value="gold">Gold</SelectItem>
                                  <SelectItem value="diamond">Diamonds</SelectItem>
                                </SelectContent>
                              </Select>
                           </div>
                         </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAddTabDialogOpen(false); setEditTabDialogOpen(false); }}>Cancel</Button>
                        <Button onClick={isEditTabDialogOpen ? handleEditCustomTab : handleAddCustomTab}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tab Content Dialog */}
             <Dialog open={isEditTabContentDialogOpen} onOpenChange={setEditTabContentDialogOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Edit Content</DialogTitle>
                        <DialogDescription>Edit the content for the tab '{editingTab?.label}'.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <RichTextEditor value={editedTabContent} onChange={setEditedTabContent} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTabContentDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditTabContent}>Save Content</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


             {/* Delete Tab Dialog */}
            <AlertDialog open={isDeleteTabDialogOpen} onOpenChange={setDeleteTabDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the tab '{deletingTab?.label}' and all its content. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteTabDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCustomTab} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Tab
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Unlock Tab Dialog */}
            <AlertDialog open={isUnlockTabDialogOpen} onOpenChange={setUnlockTabDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unlock "{unlockingTab?.label}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            To view this content, you need to pay the following cost. This is a one-time purchase.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <div className="flex justify-center items-center gap-2 p-4 my-4 bg-muted rounded-lg font-bold text-2xl">
                        {(unlockingTab?.currency === 'coin' && <Coins className="h-6 w-6 text-yellow-500" />) ||
                         (unlockingTab?.currency === 'gold' && <Crown className="h-6 w-6 text-amber-500" />) ||
                         (unlockingTab?.currency === 'diamond' && <Gem className="h-6 w-6 text-blue-500" />)}
                        {unlockingTab?.cost}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUnlockTabDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnlockTab}>Confirm Purchase</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function SubjectWorkspacePage() {
    const params = useParams();
    const classId = params.classId as string;
    const subjectId = params.subjectId as string;

    if (!classId || !subjectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4">Loading subject details...</p>
            </div>
        );
    }
    
    return <SubjectWorkspacePageContent classId={classId} subjectId={subjectId} />;
}
    