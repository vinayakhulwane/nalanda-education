'use client';

import { PageHeader } from "@/components/page-header";
import { UserList } from "@/components/user-management/user-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UserManagementPage() {
    const { userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserProfileLoading && userProfile?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);


    if (isUserProfileLoading) {
        return <div>Loading...</div>
    }

    if (userProfile?.role !== 'admin') {
        return null;
    }

    return (
        <div>
            <PageHeader
                title="User Management"
                description="Manage users, track progress, and handle enrollments."
            />
            <Tabs defaultValue="users">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="progress">Student Progress</TabsTrigger>
                    <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
                </TabsList>
                <TabsContent value="users">
                    <UserList />
                </TabsContent>
                <TabsContent value="progress">
                    <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm p-8 mt-4">
                        <p className="text-muted-foreground">Student Progress coming soon.</p>
                    </div>
                </TabsContent>
                <TabsContent value="enrollment">
                    <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm p-8 mt-4">
                        <p className="text-muted-foreground">Enrollment management coming soon.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}