'use client';

import { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2, MoreVertical, Edit, Eye, EyeOff, Trash, Pencil, ShieldAlert, UserMinus, UserPlus, BookCopy, FilePlus, Lock, Plus, BookOpen, Trophy, GraduationCap, ChevronRight, Zap } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
// ✅ Switched to standard functions for Modal safety
import { arrayRemove, arrayUnion, collection, doc, updateDoc, writeBatch, increment, serverTimestamp } from "firebase/firestore";
import type { Subject, CustomTab, CurrencyType } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { RichTextEditor } from "@/components/rich-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { UnlockContentCard } from "@/components/academics/unlock-content-card";
import { cn } from "@/lib/utils";

// Dynamic Imports
const SyllabusEditor = dynamic(
  () => import('@/components/academics/syllabus-editor'), 
  { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> }
);

const PracticeZone = dynamic(
  () => import('@/components/academics/practice-zone'),
  { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> }
);

const Leaderboard = dynamic(
  () => import('@/components/academics/leaderboard'),
  { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> }
);

const WorksheetList = dynamic(
  () => import('@/components/academics/worksheet-list').then(mod => mod.WorksheetList),
  { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> }
);


function SubjectWorkspacePageContent({ classId, subjectId }: { classId: string, subjectId: string }) {
    const { user, userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // ✅ Added Global Saving State
    
    // Custom Tab Dialog States
    const [isAddTabDialogOpen, setAddTabDialogOpen] = useState(false);
    const [isEditTabDialogOpen, setEditTabDialogOpen] = useState(false);
    const [isEditTabContentDialogOpen, setEditTabContentDialogOpen] = useState(false);
    const [isDeleteTabDialogOpen, setDeleteTabDialogOpen] = useState(false);

    const [editingTab, setEditingTab] = useState<CustomTab | null>(null);
    const [newTabName, setNewTabName] = useState("");
    const [editedTabName, setEditedTabName] = useState("");
    const [editedTabContent, setEditedTabContent] = useState("");
    const [tabCost, setTabCost] = useState(0);
    const [tabCurrency, setTabCurrency] = useState<CurrencyType>('coin');
    const [deletingTab, setDeletingTab] = useState<CustomTab | null>(null);

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

    // ✅ FIXED: Async Handler
    const handleAddCustomTab = async () => {
        if (!firestore || !newTabName.trim() || !subjectId) return;
        setIsSaving(true);

        try {
            const newTab: CustomTab = {
                id: uuidv4(),
                label: newTabName,
                content: `Content for ${newTabName} goes here. Edit me!`,
                cost: tabCost > 0 ? tabCost : 0, 
                currency: tabCurrency || 'coin',
            };

            const subjectRef = doc(firestore, 'subjects', subjectId);
            await updateDoc(subjectRef, {
                customTabs: arrayUnion(newTab)
            });

            setNewTabName('');
            setTabCost(0);
            setTabCurrency('coin');
            setAddTabDialogOpen(false);
            toast({ title: "Success", description: "Tab created successfully." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to create tab." });
        } finally {
            setIsSaving(false);
        }
    }
    
    const openEditTabDialog = (tab: CustomTab) => {
        setEditingTab(tab);
        setEditedTabName(tab.label);
        setTabCost(tab.cost || 0);
        setTabCurrency(tab.currency || 'coin');
        setEditTabDialogOpen(true);
    };

    // ✅ FIXED: Async Handler
    const handleEditCustomTab = async () => {
        if (!firestore || !editedTabName.trim() || !subject || !editingTab) return;
        setIsSaving(true);

        try {
            const updatedTabs = subject.customTabs?.map(t => t.id === editingTab.id ? {
                ...t, 
                label: editedTabName,
                cost: tabCost > 0 ? tabCost : 0, 
                currency: tabCurrency || 'coin',
            } : t);
            const subjectRef = doc(firestore, 'subjects', subjectId);
            await updateDoc(subjectRef, { customTabs: updatedTabs });
            setEditTabDialogOpen(false);
            setEditingTab(null);
            toast({ title: "Saved", description: "Tab updated successfully." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update tab." });
        } finally {
            setIsSaving(false);
        }
    }

    const openDeleteTabDialog = (tab: CustomTab) => {
        setDeletingTab(tab);
        setDeleteTabDialogOpen(true);
    };
    
    // ✅ FIXED: Async Handler
    const handleDeleteCustomTab = async () => {
        if (!firestore || !deletingTab || !subject) return;
        setIsSaving(true);
        try {
            const subjectRef = doc(firestore, 'subjects', subjectId);
            await updateDoc(subjectRef, { customTabs: arrayRemove(deletingTab) });
            setDeleteTabDialogOpen(false);
            setDeletingTab(null);
            toast({ title: "Deleted", description: "Tab removed." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete tab." });
        } finally {
            setIsSaving(false);
        }
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

    // ✅ FIXED: Async Handler
    const handleEditTabContent = async () => {
        if (!firestore || !subject || !editingTab) return;
        setIsSaving(true);
        try {
            const updatedTabs = subject.customTabs?.map(t => t.id === editingTab.id ? {...t, content: editedTabContent} : t);
            const subjectRef = doc(firestore, 'subjects', subjectId);
            await updateDoc(subjectRef, { customTabs: updatedTabs });
            setEditTabContentDialogOpen(false);
            setEditingTab(null);
            toast({ title: "Saved", description: "Content updated." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save content." });
        } finally {
            setIsSaving(false);
        }
    }

    const handleEnrollment = async () => {
        if (!firestore || !user || isUserBlocked) return;
        setIsSaving(true);
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            if (isEnrolled) {
                await updateDoc(userDocRef, { enrollments: arrayRemove(subjectId) });
                toast({ title: "Unenrolled", description: "You have left this subject." });
            } else {
                await updateDoc(userDocRef, { enrollments: arrayUnion(subjectId) });
                toast({ title: "Enrolled!", description: "Welcome to the class." });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Enrollment failed." });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleUnlockTab = async (unlockingTab: CustomTab) => {
        if (!user || !userProfile || !firestore || !unlockingTab) return;
        const { cost, currency, id: tabId, label } = unlockingTab;
        if (!cost || !currency) return;
        
        const fieldMap: Record<string, string> = {
            coin: 'coins',
            gold: 'gold',
            diamond: 'diamonds',
            spark: 'coins' 
        };
        const balanceField = fieldMap[currency] || 'coins';
        const currentBalance = (userProfile as any)[balanceField] || 0;

        if (currentBalance < cost) {
            toast({ variant: 'destructive', title: 'Insufficient Funds', description: `You need ${cost} ${currency} to unlock this tab.` });
            return;
        }

        setIsSaving(true);
        try {
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
            
            await batch.commit();
            toast({ title: 'Tab Unlocked!', description: `You can now view the content of "${label}".` });
        } catch (error) {
            console.error("Error unlocking tab:", error);
            toast({ variant: 'destructive', title: 'Unlock Failed', description: 'Could not complete the transaction.' });
        } finally {
            setIsSaving(false);
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
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center flex-col gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Loading course content...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            {/* HERO SECTION */}
            <div className="bg-slate-900 text-white relative overflow-hidden">
                 {/* Decorative elements */}
                 <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                     <GraduationCap className="h-96 w-96 text-white" />
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 pointer-events-none" />

                 <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12 relative z-10">
                     {/* Breadcrumb / Back */}
                     <Button 
                        variant="ghost" 
                        onClick={() => router.push(`/academics/${classId}`)} 
                        className="mb-6 text-slate-300 hover:text-white hover:bg-white/10 pl-0 -ml-3"
                     >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Subjects
                    </Button>

                    <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
                        <div className="flex-1 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-200 text-sm font-medium">
                                <BookOpen className="h-3.5 w-3.5" /> Course
                            </div>
                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">{subject?.name || "Loading Subject..."}</h1>
                            <div className="text-lg text-slate-300 max-w-3xl leading-relaxed">
                                {displayedDescription}
                                {shouldTruncate && (
                                    <button 
                                        className="ml-2 text-blue-300 hover:text-blue-100 font-medium underline-offset-4 hover:underline focus:outline-none" 
                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    >
                                        {isDescriptionExpanded ? 'Read less' : 'Read more'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Action Card (Enrollment) */}
                        {userProfile?.role === 'student' && (
                            <Card className="w-full md:w-80 bg-white/10 backdrop-blur-md border-white/10 text-white shadow-xl">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between text-sm text-slate-300">
                                        <span>Status</span>
                                        {isEnrolled ? (
                                            <span className="flex items-center gap-1.5 text-emerald-300 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Enrolled
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">Not Enrolled</span>
                                        )}
                                    </div>
                                    
                                    <Button 
                                        onClick={handleEnrollment} 
                                        disabled={isUserBlocked || isSaving}
                                        className={cn(
                                            "w-full font-bold h-12 text-base shadow-lg transition-all",
                                            isEnrolled 
                                                ? "bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30" 
                                                : "bg-white text-slate-900 hover:bg-blue-50"
                                        )}
                                    >
                                        {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                        {isUserBlocked ? (
                                            <> <ShieldAlert className="mr-2" /> Account Blocked </>
                                        ) : isEnrolled ? (
                                            <> <UserMinus className="mr-2" /> Unenroll Course </>
                                        ) : (
                                            <> <UserPlus className="mr-2" /> Enroll Now </>
                                        )}
                                    </Button>

                                    {isUserBlocked && (
                                        <p className="text-xs text-red-300 bg-red-900/30 p-2 rounded border border-red-900/50">
                                            Your account has been restricted. Please contact support.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                 </div>
            </div>
            
            {/* MAIN CONTENT AREA */}
            <div className="container mx-auto max-w-7xl px-4 py-8">
                {!isUserBlocked && (
                <Tabs defaultValue="syllabus" className="space-y-8">
                    {/* Modern Tabs Navigation */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm py-4 border-b border-transparent data-[stuck=true]:border-slate-200 transition-all">
                        <TabsList className="h-auto p-1 bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-x-auto max-w-full flex-wrap justify-start">
                            <TabsTrigger value="syllabus" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary font-medium">
                                <BookOpen className="mr-2 h-4 w-4" /> Syllabus
                            </TabsTrigger>
                            <TabsTrigger value="worksheet" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary font-medium">
                                <BookCopy className="mr-2 h-4 w-4" /> Worksheets
                            </TabsTrigger>
                            <TabsTrigger value="leaderboard" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary font-medium">
                                <Trophy className="mr-2 h-4 w-4" /> Leaderboard
                            </TabsTrigger>
                            
                            {/* Dynamic Tabs */}
                            {visibleCustomTabs?.map(tab => {
                                const isLocked = !userIsEditor && !isTabUnlocked(tab);
                                return (
                                    <div key={tab.id} className="relative group flex items-center">
                                        <TabsTrigger 
                                            value={tab.id} 
                                            className="rounded-lg px-4 py-2.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary font-medium flex items-center gap-2"
                                        >
                                            {tab.label}
                                            {isLocked && <Lock className="h-3 w-3 text-muted-foreground opacity-70" />}
                                        </TabsTrigger>
                                        
                                        {/* Tab Menu (Editor Only) */}
                                        {userIsEditor && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 -mr-2 opacity-50 hover:opacity-100 rounded-full">
                                                        <MoreVertical className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
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

                        {/* Add Tab Button */}
                        {userIsEditor && (
                             <Button onClick={() => { setNewTabName(''); setTabCost(0); setAddTabDialogOpen(true);}} className="gap-2 shadow-sm">
                                <Plus className="h-4 w-4" /> New Tab
                            </Button>
                        )}
                    </div>
                    
                    {/* --- TAB CONTENT AREAS --- */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-6 md:p-8 min-h-[500px]">
                        
                        <TabsContent value="syllabus" className="mt-0 animate-in fade-in duration-500">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-primary" /> Course Syllabus
                                </h3>
                                <SyllabusEditor subjectId={subjectId} subjectName={subject?.name || 'this subject'}/>
                            </div>
                        </TabsContent>

                        <TabsContent value="worksheet" className="mt-0 animate-in fade-in duration-500">
                            <Tabs defaultValue="assignments" className="w-full">
                                <div className="flex justify-center mb-8">
                                    <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
                                        <TabsTrigger value="assignments" className="rounded-full px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
                                            <BookCopy className="mr-2 h-4 w-4"/> Assignments
                                        </TabsTrigger>
                                        <TabsTrigger value="practice" className="rounded-full px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
                                            <FilePlus className="mr-2 h-4 w-4"/> Practice Zone
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="assignments">
                                    <WorksheetList subjectId={subjectId} isEnrolled={isEnrolled} userIsEditor={userIsEditor} />
                                </TabsContent>
                                <TabsContent value="practice">
                                    <PracticeZone classId={classId} subjectId={subjectId} />
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                        
                        <TabsContent value="leaderboard" className="mt-0 animate-in fade-in duration-500">
                             <div className="max-w-3xl mx-auto">
                                <Leaderboard subjectId={subjectId} />
                             </div>
                        </TabsContent>

                        {visibleCustomTabs?.map(tab => {
                            const isLocked = !userIsEditor && !isTabUnlocked(tab);
                            return (
                                <TabsContent key={tab.id} value={tab.id} className="mt-0 animate-in fade-in duration-500">
                                    {isLocked ? (
                                        <div className="max-w-md mx-auto py-12">
                                            <UnlockContentCard tab={tab} onUnlock={() => handleUnlockTab(tab)} />
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center justify-between mb-6 border-b pb-4">
                                                <h2 className="text-2xl font-bold tracking-tight">{tab.label}</h2>
                                                {userIsEditor && (
                                                    <Button variant="outline" size="sm" onClick={() => openEditTabContentDialog(tab)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit Content
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="prose prose-lg dark:prose-invert max-w-none">
                                                <div dangerouslySetInnerHTML={{ __html: tab.content }} />
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            )
                        })}
                    </div>
                </Tabs>
                )}
            </div>

            {/* --- DIALOGS (Unchanged Logic, just styling tweaks) --- */}
            
            {/* Add/Edit Tab Dialog */}
            <Dialog open={isAddTabDialogOpen || isEditTabDialogOpen} onOpenChange={(open) => !open && !isSaving && (setAddTabDialogOpen(false), setEditTabDialogOpen(false))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditTabDialogOpen ? "Edit Tab Details" : "Add New Tab"}</DialogTitle>
                        <DialogDescription>{isEditTabDialogOpen ? `Update the details for '${editingTab?.label}'` : 'Create a new custom tab for this subject.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="tab-name">Tab Name</Label>
                          <Input id="tab-name" value={isEditTabDialogOpen ? editedTabName : newTabName} onChange={e => isEditTabDialogOpen ? setEditedTabName(e.target.value) : setNewTabName(e.target.value)} placeholder="e.g., PDF Notes" disabled={isSaving}/>
                        </div>
                         <div className="space-y-2">
                           <Label>Cost (Optional)</Label>
                           <div className="flex gap-2">
                             <Input id="tab-cost" type="number" placeholder="e.g. 50" value={tabCost || ''} onChange={e => setTabCost(Number(e.target.value))} className="w-1/2" disabled={isSaving}/>
                              <Select value={tabCurrency} onValueChange={(v: any) => setTabCurrency(v)} disabled={isSaving}>
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
                        <Button variant="outline" onClick={() => { setAddTabDialogOpen(false); setEditTabDialogOpen(false); }} disabled={isSaving}>Cancel</Button>
                        <Button onClick={isEditTabDialogOpen ? handleEditCustomTab : handleAddCustomTab} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tab Content Dialog */}
             <Dialog open={isEditTabContentDialogOpen} onOpenChange={(open) => !open && !isSaving && setEditTabContentDialogOpen(false)}>
                <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Content</DialogTitle>
                        <DialogDescription>Edit the content for the tab '{editingTab?.label}'.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <RichTextEditor value={editedTabContent} onChange={setEditedTabContent} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTabContentDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleEditTabContent} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Content
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


             {/* Delete Tab Dialog */}
            <AlertDialog open={isDeleteTabDialogOpen} onOpenChange={(open) => !open && !isSaving && setDeleteTabDialogOpen(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the tab '{deletingTab?.label}' and all its content. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteTabDialogOpen(false)} disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCustomTab} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Tab
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
        </div>
    );
}

export default function SubjectWorkspacePage({ 
  params 
}: { 
  params: Promise<{ classId: string; subjectId: string }> 
}) {
    const { classId, subjectId } = use(params);

    return <SubjectWorkspacePageContent classId={classId} subjectId={subjectId} />;
}