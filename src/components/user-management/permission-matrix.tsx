'use client';

import { useState, useEffect } from "react";
import { useFirestore } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * SOURCE: Permission logic derived from current system requirements
 * Structure of permissions used to generate the UI and drive Firestore Security Rules
 */
const PERMISSION_KEYS = [
  { key: 'worksheet_create', label: 'Create Worksheets', default: ['admin', 'teacher'] },
  { key: 'worksheet_read', label: 'Read/View Worksheets', default: ['admin', 'teacher', 'student'] },
  { key: 'worksheet_delete', label: 'Delete Worksheets', default: ['admin'] },
  { key: 'transaction_view', label: 'See Transaction History', default: ['admin', 'student'] },
  { key: 'transaction_create', label: 'Create Transactions (Rewards)', default: ['admin', 'teacher'] },
  { key: 'question_create', label: 'Create Questions', default: ['admin', 'teacher'] },
  { key: 'coupons_list', label: 'Coupons (Marketing/Economy)', default: ['admin'] },
  // ADDED: Permission specifically for managing AI Providers and Keys
  { key: 'ai_manage', label: 'Manage AI Engine (API Keys & Models)', default: ['admin'] },
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
        // Fallback to defaults if document doesn't exist
        const defaults: PermissionState = {};
        PERMISSION_KEYS.forEach(p => defaults[p.key] = p.default);
        setPermissions(defaults);
      }
    } catch (e) {
      console.error("Failed to load permissions", e);
      toast({ 
        variant: "destructive", 
        title: "Connection Error", 
        description: "Could not load permission settings." 
      });
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
      
      // PROTECTION: Force 'admin' into every permission category before saving
      const safePermissions = { ...permissions };
      PERMISSION_KEYS.forEach(p => {
        const current = safePermissions[p.key] || [];
        if (!current.includes('admin')) {
          safePermissions[p.key] = [...current, 'admin'];
        }
      });

      await setDoc(docRef, safePermissions);
      setPermissions(safePermissions);
      toast({ 
        title: "Permissions Saved", 
        description: "Global security rules have been updated." 
      });
    } catch (e) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Save Failed", 
        description: "Verify your admin permissions and connection." 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaults: PermissionState = {};
    PERMISSION_KEYS.forEach(p => defaults[p.key] = p.default);
    setPermissions(defaults);
    toast({ 
      title: "Defaults Loaded", 
      description: "Remember to click 'Save Changes' to apply these to the database." 
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-muted">
      <CardHeader className="border-b bg-muted/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-primary" /> Global Permission Matrix
            </CardTitle>
            <CardDescription className="mt-1">
              Configure access levels for each user role. Changes apply instantly to the database.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/5">
              <TableHead className="w-[350px] pl-6 font-bold">Permission Rule</TableHead>
              <TableHead className="text-center font-bold text-red-600 w-[120px]">Admin</TableHead>
              <TableHead className="text-center font-bold text-blue-600 w-[120px]">Teacher</TableHead>
              <TableHead className="text-center font-bold text-green-600 w-[120px]">Student</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_KEYS.map((perm) => (
              <TableRow key={perm.key} className="hover:bg-muted/5 transition-colors">
                <TableCell className="font-medium pl-6 py-4">
                  {perm.label}
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mt-0.5">
                    {perm.key}
                  </div>
                </TableCell>
                
                {/* ADMIN ROLE: Always checked and disabled to prevent accidental lockouts */}
                <TableCell className="text-center bg-red-50/30 dark:bg-red-950/10">
                  <div className="flex justify-center">
                    <Checkbox checked={true} disabled className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 opacity-70" />
                  </div>
                </TableCell>

                {/* TEACHER ROLE */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox 
                      checked={permissions[perm.key]?.includes('teacher')}
                      onCheckedChange={() => handleToggle(perm.key, 'teacher')}
                    />
                  </div>
                </TableCell>

                {/* STUDENT ROLE */}
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
      
      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-t">
        <p className="text-xs text-amber-800 dark:text-amber-400 flex items-center gap-2">
          <span className="font-bold uppercase bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded text-[10px]">Warning</span>
          Disabling a permission here removes access immediately. The Admin role cannot be restricted.
        </p>
      </div>
    </Card>
  );
}