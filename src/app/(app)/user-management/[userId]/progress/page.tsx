'use client';

import { Suspense } from 'react';
import { use, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { StudentProgressDetail } from '@/components/user-management/student-progress-detail';
import { AdminStudentInfoCard } from '@/components/user-management/admin-student-info-card';
import { Button } from '@/components/ui/button';

function AdminStudentProgressPageContent({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const router = useRouter();

    const userDocRef = useMemoFirebase(() => (
        firestore && userId ? doc(firestore, 'users', userId) : null
    ), [firestore, userId]);

    const { data: student, isLoading: isStudentLoading } = useDoc<User>(userDocRef);
    
    if (isStudentLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!student) {
        return <div className="text-center py-10">Student not found.</div>;
    }
    
    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => router.push('/user-management')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to User Management
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1">
                    <AdminStudentInfoCard student={student} />
                </div>
                 <div className="lg:col-span-2">
                    <StudentProgressDetail student={student} />
                </div>
            </div>
        </div>
    )
}

export default function AdminStudentProgressPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);

    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <AdminStudentProgressPageContent userId={userId} />
        </Suspense>
    );
}
