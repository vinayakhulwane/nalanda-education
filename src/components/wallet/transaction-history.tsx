'use client';

import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowUpRight, ArrowDownLeft, Sparkles, Coins, Crown, Gem } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CurrencyType, Transaction } from "@/types";

const currencyIcons: Record<CurrencyType, React.ElementType> = {
  spark: Sparkles,
  coin: Coins,
  gold: Crown,
  diamond: Gem,
};

const currencyColors: Record<CurrencyType, string> = {
  spark: 'text-gray-400',
  coin: 'text-yellow-500',
  gold: 'text-amber-500',
  diamond: 'text-blue-500',
};

export function TransactionHistory() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Query transactions for this specific user, ordered by date
  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>A record of your recent currency activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No transactions found yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((tx) => {
                const Icon = currencyIcons[tx.currency];
                const color = currencyColors[tx.currency];
                const isEarned = tx.type === 'earned';

                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className={cn(
                        "flex items-center gap-1 font-medium",
                        isEarned ? "text-green-600" : "text-red-600"
                      )}>
                        {isEarned ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell className="text-center">
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted border font-bold",
                        color
                      )}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{isEarned ? '+' : '-'}{tx.amount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{tx.createdAt ? format(tx.createdAt.toDate(), 'dd MMM, yyyy') : '...'}</div>
                      <div className="text-xs text-muted-foreground">{tx.createdAt ? format(tx.createdAt.toDate(), 'p') : ''}</div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
