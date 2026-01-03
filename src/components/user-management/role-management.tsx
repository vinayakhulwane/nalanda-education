'use client';

import { useState, useEffect } from "react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Shield, ShieldAlert, ShieldCheck, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserData = {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
    photoURL?: string;
    avatar?: string;
};

export function RoleManagement() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Fetch all users on mount
    useEffect(() => {
        const fetchUsers = async () => {
            if (!firestore) return;
            
            try {
                const usersRef = collection(firestore, 'users');
                // You might want to limit this query if you have thousands of users
                const q = query(usersRef, orderBy("name")); 
                const snapshot = await getDocs(q);
                
                const fetchedUsers: UserData[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as UserData));

                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load user list."
                });
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [firestore, toast]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!firestore) return;
        setUpdatingId(userId);

        try {
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, {
                role: newRole
            });

            // Update local state to reflect change immediately
            setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, role: newRole as any } : u
            ));

            toast({
                title: "Role Updated",
                description: `User role changed to ${newRole.toUpperCase()}. Permissions updated.`
            });
        } catch (error) {
            console.error("Error updating role:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update user role."
            });
        } finally {
            setUpdatingId(null);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> Admin</Badge>;
            case 'teacher':
                return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 gap-1"><ShieldCheck className="h-3 w-3" /> Teacher</Badge>;
            default:
                return <Badge variant="secondary" className="gap-1"><User className="h-3 w-3" /> Student</Badge>;
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Role & Permission Management
                    </CardTitle>
                    <CardDescription>
                        Changing a role here immediately updates the user's permissions in the app.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Current Role</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="flex items-center gap-3 font-medium">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatar || user.photoURL} />
                                                <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            {user.name || "Unknown Name"}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {getRoleBadge(user.role || 'student')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Select 
                                                    disabled={updatingId === user.id}
                                                    defaultValue={user.role || 'student'} 
                                                    onValueChange={(val) => handleRoleChange(user.id, val)}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="student">Student</SelectItem>
                                                        <SelectItem value="teacher">Teacher</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {updatingId === user.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
