'use client';
import type { User } from "@/types";
import { PageHeader } from "./page-header";
import { Button } from "./ui/button";
import Link from "next/link";
import { FilePlus2, BookPlus, UserPlus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

type TeacherDashboardProps = {
    user: User;
}

const recentGraded = [
    { name: 'Liam Johnson', score: '88%', avatar: 'https://i.pravatar.cc/150?u=liam' },
    { name: 'Olivia Smith', score: '92%', avatar: 'https://i.pravatar.cc/150?u=olivia' },
    { name: 'Noah Williams', score: '76%', avatar: 'https://i.pravatar.cc/150?u=noah' },
    { name: 'Emma Brown', score: '95%', avatar: 'https://i.pravatar.cc/150?u=emma' },
]

export function TeacherDashboard({ user }: TeacherDashboardProps) {
    return (
        <div>
            <PageHeader
                title={`Welcome, ${user.name}!`}
                description="Manage your classes, worksheets, and students."
            />

            <div className="grid gap-4 md:grid-cols-3 mb-6">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button asChild>
                            <Link href="/worksheets"><FilePlus2 className="mr-2 h-4 w-4" /> Create Worksheet</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/questions/new"><BookPlus className="mr-2 h-4 w-4" /> Create Question</Link>
                        </Button>
                         <Button asChild variant="secondary">
                            <Link href="#"><UserPlus className="mr-2 h-4 w-4" /> Add Student</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Recently Graded</CardTitle>
                        <CardDescription>An overview of the latest student submissions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentGraded.map((student) => (
                                <div key={student.name} className="flex items-center">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={student.avatar} alt={student.name} />
                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{student.name}</p>
                                    </div>
                                    <div className="ml-auto font-medium">{student.score}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
             <h2 className="font-headline text-2xl font-bold tracking-tight mb-4">My Classes</h2>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Algebra I - Period 3</CardTitle>
                        <CardDescription>32 Students</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button className="w-full">Manage Class</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Geometry - Period 5</CardTitle>
                        <CardDescription>28 Students</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button className="w-full">Manage Class</Button>
                    </CardContent>
                </Card>
             </div>
        </div>
    )
}
