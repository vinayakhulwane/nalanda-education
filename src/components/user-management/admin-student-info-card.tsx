'use client';

import type { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AdminStudentInfoCardProps {
  student: User;
}

export function AdminStudentInfoCard({ student }: AdminStudentInfoCardProps) {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Card>
      <CardHeader className="text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/20">
          <AvatarImage src={student.avatar} alt={student.name} />
          <AvatarFallback className="text-3xl">{getInitials(student.name)}</AvatarFallback>
        </Avatar>
        <CardTitle>{student.name}</CardTitle>
        <div className="flex justify-center gap-2 pt-1">
            <Badge variant="secondary" className="capitalize">{student.role}</Badge>
            <Badge variant={student.active ?? true ? 'default' : 'destructive'} className={student.active ?? true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {student.active ?? true ? 'Active' : 'Blocked'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <div className="flex justify-between">
          <span className="font-medium">Email:</span>
          <span>{student.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">User ID:</span>
          <span className="font-mono text-xs">{student.id}</span>
        </div>
      </CardContent>
    </Card>
  );
}
