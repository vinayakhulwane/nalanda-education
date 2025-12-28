'use client';

import type { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Coins, Crown, Gem } from 'lucide-react';

interface AdminStudentInfoCardProps {
  student: User;
}

export function AdminStudentInfoCard({ student }: AdminStudentInfoCardProps) {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="text-center items-center">
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
      <CardContent className="text-sm text-muted-foreground space-y-2 flex-grow">
        <div className="flex justify-between">
          <span className="font-medium">Email:</span>
          <span>{student.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">User ID:</span>
          <span className="font-mono text-xs">{student.id}</span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <div className="grid grid-cols-3 gap-4 w-full bg-muted/50 rounded-xl p-4">
            <div className="flex flex-col items-center">
                <Coins className="h-6 w-6 text-yellow-500 mb-2" />
                <p className="text-xl font-bold">{student.coins || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Coins</p>
            </div>
            <div className="flex flex-col items-center">
                <Crown className="h-6 w-6 text-amber-500 mb-2" />
                <p className="text-xl font-bold">{student.gold || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Gold</p>
            </div>
              <div className="flex flex-col items-center">
                <Gem className="h-6 w-6 text-blue-500 mb-2" />
                <p className="text-xl font-bold">{student.diamonds || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Diamonds</p>
            </div>
          </div>
      </CardFooter>
    </Card>
  );
}
