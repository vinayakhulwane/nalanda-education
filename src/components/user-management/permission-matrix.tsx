'use client';

import { useState, useEffect } from "react";
import { useFirestore } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Define the permissions structure
const PERMISSION_KEYS = [
    { key: 'worksheet_create', label: 'Create Worksheets', default: ['admin', 'teacher'] },
    { key: 'worksheet_read',   label: 'Read/View Worksheets', default: ['admin', 'teacher', 'student'] }, // ✅ Student enabled by default
    { key: 'worksheet_delete', label: 'Delete Worksheets', default: ['admin'] },
    { key: 'transaction_view', label: 'See Transaction History', default: ['admin', 'student'] }, // ✅ Student enabled by default
    { key: 'transaction_create', label: 'Create Transactions (Rewards)', default: ['admin', 'teacher'] },
    { key: 'question_create',  label: 'Create Questions', default: ['admin', 'teacher'] },
];

type PermissionState = Record<string, string[]>;

export function PermissionMatrix() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permissions, setPermissions] = useState<PermissionState>({});

    useEffect(() => {
        loadPermissions();
    }, [firestore]);

    const loadPermissions = async () => {
        if (!firestore) return;
        setLoading(true);
        try {
            const docRef = doc(firestore, 'settings', 'permissions');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setPermissions(snap.data() as PermissionState);
            } else {
                // If doc doesn't exist, use defaults in UI but don't save yet
                const defaults: PermissionState = {};
                PERMISSION_KEYS.forEach(p => defaults[p.key] = p.default);
                setPermissions(defaults);
            }
        } catch (e) {
            console.error("Failed to load permissions", e);
            toast({ variant: "destructive", title: "Connection Error", description: "Could not load permission settings." });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (permKey: string, role: string) => {
        setPermissions(prev => {
            const currentRoles = prev[permKey] || [];
            const newRoles = currentRoles.includes(role)
                ? currentRoles.filter(r => r !== role)
                : [...currentRoles, role];
            return { ...prev, [permKey]: newRoles };
        });
    };

    const handleSave = async () => {
        if (!firestore) return;
        setSaving(true);
        try {
            const docRef = doc(firestore, 'settings', 'permissions');
            // Ensure Admin is ALWAYS in every permission to prevent lockout
            const safePermissions = { ...permissions };
            PERMISSION_KEYS.forEach(p => {
                const current = safePermissions[p.key] || [];
                if (!current.includes('admin')) {
                    safePermissions[p.key] = [...current, 'admin'];
                }
            });

            await setDoc(docRef, safePermissions);
            setPermissions(safePermissions);
            toast({ title: "Permissions Saved", description: "Database rules updated successfully." });
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Save Failed", description: "Check your internet connection." });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        const defaults: PermissionState = {};
        PERMISSION_KEYS.forEach(p => defaults[p.key] = p.default);
        setPermissions(defaults);
        toast({ title: "Defaults Loaded", description: "Click Save to apply these defaults." });
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5" /> Global Permission Matrix
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Reset Defaults
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </CardTitle>
                <CardDescription>
                    Control exactly what Students and Teachers can do. 
                    <br/><span className="text-red-500 font-bold">Note:</span> Unchecking a box here instantly blocks that action in the app.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Permission Rule</TableHead>
                            <TableHead className="text-center font-bold text-red-600">Admin</TableHead>
                            <TableHead className="text-center font-bold text-blue-600">Teacher</TableHead>
                            <TableHead className="text-center font-bold text-green-600">Student</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {PERMISSION_KEYS.map((perm) => (
                            <TableRow key={perm.key}>
                                <TableCell className="font-medium">{perm.label}</TableCell>
                                
                                {/* ADMIN (Locked) */}
                                <TableCell className="text-center bg-slate-50 dark:bg-slate-900">
                                    <div className="flex justify-center">
                                        <Checkbox checked={true} disabled />
                                    </div>
                                </TableCell>

                                {/* TEACHER */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Checkbox 
                                            checked={permissions[perm.key]?.includes('teacher')} 
                                            onCheckedChange={() => handleToggle(perm.key, 'teacher')}
                                        />
                                    </div>
                                </TableCell>

                                {/* STUDENT */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Checkbox 
                                            checked={permissions[perm.key]?.includes('student')} 
                                            onCheckedChange={() => handleToggle(perm.key, 'student')}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}