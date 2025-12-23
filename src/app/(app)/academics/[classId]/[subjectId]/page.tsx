'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { arrayRemove, arrayUnion, collection, doc, query, updateDoc, where } from "firebase/firestore";
import { Edit, Loader2, PlusCircle, Trash, ArrowLeft, MoreVertical, GripVertical, Plus, EyeOff, Eye, Pencil, UserPlus, UserMinus, ShieldAlert } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import type { Subject, Unit, Category, CustomTab } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { RichTextEditor } from "@/components/rich-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

    const categoriesQuery = useMemoFirebase(() => {
        if (!firestore || !units || units.length === 0) return null;
        const unitIds = units.map(u => u.id).filter(id => !!id);
        if (unitIds.length === 0) return null;
        return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds));
    }, [firestore, units]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesQuery);
    
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
                addDocumentNonBlocking(collection(firestore, 'units'), { name: newName, description: newDescription, subjectId });
                break;
            case 'editUnit':
                if (currentUnit) updateDocumentNonBlocking(doc(firestore, 'units', currentUnit.id), { name: newName, description: newDescription });
                break;
            case 'deleteUnit':
                if (currentUnit) deleteDocumentNonBlocking(doc(firestore, 'units', currentUnit.id));
                break;
            case 'addCategory':
                if (currentUnit) addDocumentNonBlocking(collection(firestore, 'categories'), { name: newName, description: newDescription, unitId: currentUnit.id });
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

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold font-headline">{userIsEditor ? 'Syllabus Builder' : 'Syllabus'}</h3>
                 {userIsEditor && <Button onClick={() => setDialogType('addUnit')}>
                    <PlusCircle className="mr-2" />
                    Add Unit
                </Button>}
            </div>
             {areUnitsLoading || areCategoriesLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ): (
                <Accordion type="multiple" className="w-full space-y-4">
                    {units?.map(unit => (
                        <AccordionItem value={unit.id} key={unit.id} className="bg-card border rounded-lg px-4">
                             <div className="flex items-center">
                                <GripVertical className="h-5 w-5 text-muted-foreground mr-2 cursor-grab" />
                                <AccordionTrigger className="text-lg font-headline hover:no-underline flex-1">
                                    {unit.name}
                                </AccordionTrigger>
                                 {userIsEditor && <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openDialog('editUnit', unit)}>Edit Unit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDialog('addCategory', unit)}>Add Category</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDialog('deleteUnit', unit)} className="text-destructive focus:text-destructive">Delete Unit</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>}
                             </div>
                            <AccordionContent>
                                <p className="text-muted-foreground text-sm pb-4">{unit.description}</p>
                                <div className="space-y-2 pl-6 border-l-2 ml-3">
                                   {categories?.filter(c => c.unitId === unit.id).map(category => (
                                       <div key={category.id} className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                                           <div>
                                               <p className="font-medium">{category.name}</p>
                                               <p className="text-sm text-muted-foreground">{category.description}</p>
                                           </div>
                                            {userIsEditor && <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('editCategory', unit, category)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('deleteCategory', unit, category)}><Trash className="h-4 w-4 text-destructive" /></Button>
                                            </div>}
                                       </div>
                                   ))}
                                    {categories?.filter(c => c.unitId === unit.id).length === 0 && (
                                        <p className="text-sm text-muted-foreground py-4">No categories in this unit.</p>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                    {units?.length === 0 && (
                        <Card className="text-center py-12">
                            <CardContent>
                                <p className="text-muted-foreground">No units found. {userIsEditor && 'Start by adding one.'}</p>
                            </CardContent>
                        </Card>
                    )}
                </Accordion>
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

export default function SubjectWorkspacePage() {
    const { user, userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const params = useParams();
    const classId = params.classId as string;
    const subjectId = params.subjectId as string;
    const firestore = useFirestore();
    
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    
    // Custom Tab Dialog States
    const [isAddTabDialogOpen, setAddTabDialogOpen] = useState(false);
    const [newTabName, setNewTabName] = useState("");

    const [isEditTabDialogOpen, setEditTabDialogOpen] = useState(false);
    const [editingTab, setEditingTab] = useState<CustomTab | null>(null);
    const [editedTabName, setEditedTabName] = useState("");
    
    const [isEditTabContentDialogOpen, setEditTabContentDialogOpen] = useState(false);
    const [editedTabContent, setEditedTabContent] = useState("");


    const [isDeleteTabDialogOpen, setDeleteTabDialogOpen] = useState(false);
    const [deletingTab, setDeletingTab] = useState<CustomTab | null>(null);

    const subjectDocRef = useMemoFirebase(() => firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null, [firestore, subjectId]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);
    
    const isEnrolled = useMemo(() => {
        return userProfile?.enrollments?.includes(subjectId) ?? false;
    }, [userProfile, subjectId]);
    
    const isUserBlocked = useMemo(() => {
        // active property is true by default, so we check for explicit false.
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
            content: `Content for ${newTabName} goes here. Edit me!`
        };

        const subjectRef = doc(firestore, 'subjects', subjectId);
        await updateDoc(subjectRef, {
            customTabs: arrayUnion(newTab)
        });

        setNewTabName('');
        setAddTabDialogOpen(false);
    }
    
    const openEditTabDialog = (tab: CustomTab) => {
        setEditingTab(tab);
        setEditedTabName(tab.label);
        setEditTabDialogOpen(true);
    };

    const handleEditCustomTab = async () => {
        if (!firestore || !editedTabName.trim() || !subject || !editingTab) return;
        const updatedTabs = subject.customTabs?.map(t => t.id === editingTab.id ? {...t, label: editedTabName} : t);
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
            // Unenroll
            await updateDoc(userDocRef, { enrollments: arrayRemove(subjectId) });
        } else {
            // Enroll
            await updateDoc(userDocRef, { enrollments: arrayUnion(subjectId) });
        }
    }


    const description = subject?.description || "Manage the subject curriculum.";
    const shouldTruncate = description.length > 150;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 150)}...` : description;

    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';
    
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
                        <TabsTrigger value="archivers">Archivers</TabsTrigger>
                        {visibleCustomTabs?.map(tab => (
                             <div key={tab.id} className="relative group">
                                <TabsTrigger value={tab.id} className={userIsEditor ? 'pr-8' : ''}>{tab.label}</TabsTrigger>
                                {userIsEditor && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="absolute top-1/2 right-0.5 -translate-y-1/2 h-6 w-6 opacity-60 group-hover:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditTabDialog(tab)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit Name
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
                        ))}
                    </TabsList>
                    {userIsEditor && (
                         <Button variant="ghost" size="icon" className="ml-2" onClick={() => setAddTabDialogOpen(true)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <TabsContent value="syllabus">
                    <SyllabusEditor subjectId={subjectId} subjectName={subject?.name || 'this subject'}/>
                </TabsContent>
                <TabsContent value="worksheet">
                    <Tabs defaultValue="classroomAssign" className="w-full mt-6">
                        <TabsList>
                            <TabsTrigger value="classroomAssign">Classroom Assign</TabsTrigger>
                            {!userIsEditor && <TabsTrigger value="myPracticeZone">My Practice Zone</TabsTrigger>}
                        </TabsList>
                        <TabsContent value="classroomAssign">
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>Classroom Assignments</CardTitle>
                                    <CardDescription>Manage and assign worksheets to the classroom.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                                        <p className="text-muted-foreground">Classroom assignment features are coming soon.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        {!userIsEditor && (
                             <TabsContent value="myPracticeZone">
                                 <Card className="mt-6">
                                    <CardHeader>
                                        <CardTitle>My Practice Zone</CardTitle>
                                        <CardDescription>Review your saved worksheets and practice history.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                                            <p className="text-muted-foreground">Practice zone features are coming soon.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                    </Tabs>
                </TabsContent>
                <TabsContent value="archivers">
                     <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Archivers</CardTitle>
                            <CardDescription>Manage archived content for this subject.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                                <p className="text-muted-foreground">Archivers are coming soon.</p>
                            </div>
                        </CardContent>
                    </Card>
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

            {/* Add Tab Dialog */}
            <Dialog open={isAddTabDialogOpen} onOpenChange={setAddTabDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Tab</DialogTitle>
                        <DialogDescription>Create a new custom tab for this subject.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="tab-name">Tab Name</Label>
                        <Input 
                            id="tab-name" 
                            value={newTabName} 
                            onChange={e => setNewTabName(e.target.value)} 
                            placeholder="e.g., PDF Notes"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddTabDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddCustomTab}>Create Tab</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             {/* Edit Tab Name Dialog */}
            <Dialog open={isEditTabDialogOpen} onOpenChange={setEditTabDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Tab Name</DialogTitle>
                        <DialogDescription>Rename the tab '{editingTab?.label}'.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="edit-tab-name">New Tab Name</Label>
                        <Input 
                            id="edit-tab-name" 
                            value={editedTabName} 
                            onChange={e => setEditedTabName(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTabDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditCustomTab}>Save Changes</Button>
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
        </div>
    );
}

    
