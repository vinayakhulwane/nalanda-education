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
import { Loader2, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// These keys MUST match the keys we check in Firestore Rules later
const PERMISSION_KEYS = [
    { key: 'worksheet_create', label: 'Create Worksheets' },
    { key: 'worksheet_read',   label: 'Read Worksheets (Global)' },
    { key: 'worksheet_delete', label: 'Delete Worksheets' },
    { key: 'transaction_view', label: 'See Transaction History' },
    { key: 'transaction_create', label: 'Create Transactions (Rewards)' },
    { key: 'question_create',  label: 'Create Questions' },
];

type PermissionState = Record<string, string[]>; // e.g. { 'worksheet_create': ['admin', 'teacher'] }

export function PermissionMatrix() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Default: Admin has everything, others have nothing until loaded
    const [permissions, setPermissions] = useState<PermissionState>({});

    useEffect(() => {
        const loadPermissions = async () => {
            if (!firestore) return;
            try {
                const docRef = doc(firestore, 'settings', 'permissions');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setPermissions(snap.data() as PermissionState);
                } else {
                    // Initialize default if document doesn't exist
                    const defaults: PermissionState = {};
                    PERMISSION_KEYS.forEach(p => defaults[p.key] = ['admin']);
                    setPermissions(defaults);
                }
            } catch (e) {
                console.error("Failed to load permissions", e);
            } finally {
                setLoading(false);
            }
        };
        loadPermissions();
    }, [firestore]);

    const handleToggle = (permKey: string, role: string) => {
        setPermissions(prev => {
            const currentRoles = prev[permKey] || ['admin'];
            const newRoles = currentRoles.includes(role)
                ? currentRoles.filter(r => r !== role) // Remove
                : [...currentRoles, role]; // Add
            
            return { ...prev, [permKey]: newRoles };
        });
    };

    const handleSave = async () => {
        if (!firestore) return;
        setSaving(true);
        try {
            const docRef = doc(firestore, 'settings', 'permissions');
            await setDoc(docRef, permissions);
            toast({ title: "Permissions Updated", description: "Database rules will now reflect these changes." });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Could not save permissions." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5" /> Global Permission Matrix
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </CardTitle>
                <CardDescription>
                    Toggle checkboxes to control what each role can do. Admin always has full access.
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
                                
                                {/* ADMIN COLUMN (Always True/Disabled) */}
                                <TableCell className="text-center bg-slate-50 dark:bg-slate-900">
                                    <div className="flex justify-center">
                                        <Checkbox checked={true} disabled />
                                    </div>
                                </TableCell>

                                {/* TEACHER COLUMN */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Checkbox 
                                            checked={permissions[perm.key]?.includes('teacher')} 
                                            onCheckedChange={() => handleToggle(perm.key, 'teacher')}
                                        />
                                    </div>
                                </TableCell>

                                {/* STUDENT COLUMN */}
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
