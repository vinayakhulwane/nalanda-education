'use client';

import { PageHeader } from "@/components/page-header";
import { EnrollmentList } from "@/components/user-management/enrollment-list";
import { StudentProgressList } from "@/components/user-management/student-progress-list";
import { UserList } from "@/components/user-management/user-list";
import { RoleManagement } from "@/components/user-management/role-management"; 
import { PermissionMatrix } from "@/components/user-management/permission-matrix";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function UserManagementPage() {
    const { userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserProfileLoading && userProfile?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);

    if (isUserProfileLoading || !userProfile) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (userProfile.role !== 'admin') {
        return null;
    }

    return (
        <div>
            <PageHeader
                title="User Management"
                description="Manage users, track progress, and handle enrollments."
            />
            <Tabs defaultValue="users">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="users">All Users</TabsTrigger>
                    <TabsTrigger value="permissions">Permissions & Roles</TabsTrigger>
                    <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
                    <TabsTrigger value="progress">Student Progress</TabsTrigger>
                    <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <UserList />
                </TabsContent>

                <TabsContent value="permissions">
                    <RoleManagement />
                </TabsContent>
                
                <TabsContent value="matrix">
                    <PermissionMatrix />
                </TabsContent>

                <TabsContent value="progress">
                    <StudentProgressList />
                </TabsContent>

                <TabsContent value="enrollment">
                    <EnrollmentList />
                </TabsContent>
            </Tabs>
        </div>
    )
}
