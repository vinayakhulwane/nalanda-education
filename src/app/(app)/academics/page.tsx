'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase";
import { MoreVertical, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const mockClasses = [
    { id: '1', name: 'Class 10', description: 'Secondary school, final year.' },
    { id: '2', name: 'Class 9', description: 'Secondary school, junior year.' },
    { id: '3', name: 'Class 8', description: 'Middle school, senior year.' },
]

export default function AcademicsPage() {
    const { userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserProfileLoading && userProfile?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);

    if (isUserProfileLoading || userProfile?.role !== 'admin') {
        return <div>Loading...</div>
    }

    return (
        <div>
            <div className="flex justify-between items-center">
                <PageHeader
                    title="Academics Management"
                    description="Manage academic structure from classes to categories."
                />
                <Button>
                    <PlusCircle className="mr-2" />
                    Add Class
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {mockClasses.map((c) => (
                    <Card key={c.id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-headline">{c.name}</CardTitle>
                             <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4"/>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{c.description}</p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="secondary" className="w-full">Manage Subjects</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
