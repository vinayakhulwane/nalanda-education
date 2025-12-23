'use client';
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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";

// Mock data based on your requirements
const mockUsers = [
  { id: 'usr1', name: 'John Doe', email: 'john.d@example.com', mobile: '123-456-7890', role: 'student', active: true },
  { id: 'usr2', name: 'Jane Smith', email: 'jane.s@example.com', mobile: '987-654-3210', role: 'teacher', active: true },
  { id: 'usr3', name: 'Admin User', email: 'admin@nalanda.com', mobile: '555-555-5555', role: 'admin', active: true },
  { id: 'usr4', name: 'Peter Jones', email: 'peter.j@example.com', mobile: '111-222-3333', role: 'student', active: false },
];

export function UserList() {
  const currentAdminId = 'usr3'; // Assume we know the current admin's ID

  const handleRoleChange = (userId: string, newRole: 'student' | 'teacher' | 'admin') => {
    // In a real app, you'd call a Firestore update here.
    console.log(`Changing user ${userId} to role ${newRole}`);
  };

  const handleStatusToggle = (userId: string, currentStatus: boolean) => {
    if (userId === currentAdminId) {
        alert("You cannot block yourself.");
        return;
    }
    // In a real app, you'd update Firestore.
    console.log(`Toggling status for user ${userId} to ${!currentStatus}`);
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>User Identity & Role Control</CardTitle>
            <CardDescription>Manage user roles and access permissions.</CardDescription>
        </CardHeader>
        <CardContent>
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
                {mockUsers.map((user) => (
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
                            checked={user.active}
                            onCheckedChange={() => handleStatusToggle(user.id, user.active)}
                            disabled={user.id === currentAdminId}
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
                ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}