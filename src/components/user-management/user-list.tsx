'use client';
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import type { User } from "@/types";
import { collection, doc, updateDoc } from "firebase/firestore";

export function UserList() {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersCollectionRef);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;

    return users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const handleRoleChange = (userId: string, newRole: 'student' | 'teacher' | 'admin') => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    updateDoc(userDocRef, { role: newRole });
    // Note: Non-blocking update pattern is preferred here, but for simplicity
    // in this case, we'll use a direct await. Error handling should be added.
    console.log(`Changing user ${userId} to role ${newRole}`);
  };

  const handleStatusToggle = (userId: string, currentStatus: boolean) => {
    if (userId === currentUser?.uid) {
        alert("You cannot block yourself.");
        return;
    }
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    updateDoc(userDocRef, { active: !currentStatus });
    console.log(`Toggling status for user ${userId} to ${!currentStatus}`);
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>User Identity & Role Control</CardTitle>
            <CardDescription>Manage user roles, access permissions, and search for users.</CardDescription>
             <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : user.role === 'teacher' ? 'secondary' : 'outline'}>
                              {user.role}
                          </Badge>
                      </TableCell>
                      <TableCell>
                          <Switch
                              checked={user.active ?? true} // Default to active if not set
                              onCheckedChange={() => handleStatusToggle(user.id, user.active ?? true)}
                              disabled={user.id === currentUser?.uid}
                              aria-label="Activate or block user"
                          />
                      </TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>Set as Admin</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'teacher')}>Set as Teacher</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'student')}>Set as Student</DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                      </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                </TableBody>
            </Table>
            )}
        </CardContent>
    </Card>
  );
}
