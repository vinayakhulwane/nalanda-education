'use client';

import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowUpRight, ArrowDownLeft, Sparkles, Coins, Crown, Gem, BrainCircuit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CurrencyType, Transaction } from "@/types";

const currencyIcons: Record<CurrencyType, React.ElementType> = {
  spark: Sparkles,
  coin: Coins,
  gold: Crown,
  diamond: Gem,
  aiCredits: BrainCircuit,
};

export function TransactionHistory() {
  const firestore = useFirestore();
  const { user } = useUser();

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
    <Card className="max-w-6xl mx-auto border-none shadow-none md:border md:shadow-sm">
      <CardHeader className="px-4 md:px-6">
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>A record of your recent currency activity.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-6">
        {transactions?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No transactions found yet.
          </div>
        ) : (
          <>
            {/* --- VIEW 1: MOBILE LIST (Pill Left, Text Middle, Arrow Right) --- */}
            <div className="block md:hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions?.map((tx) => {
                  const Icon = currencyIcons[tx.currency];
                  const isEarned = tx.type === 'earned';
                  const date = tx.createdAt ? format(tx.createdAt.toDate(), 'dd MMM, p') : '...';

                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors gap-3">
                      
                      {/* 1. LEFT: The Pill (Icon + Amount) */}
                      <div className="shrink-0">
                        <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full flex items-center gap-1.5 min-w-[70px] justify-center">
                            {/* Icon */}
                            {Icon && (
                                <Icon className={cn(
                                    "h-4 w-4",
                                    isEarned ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )} />
                            )}
                            {/* Amount */}
                            <span className={cn(
                                "text-sm font-bold",
                                isEarned ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                            )}>
                                {isEarned ? '+' : ''}{tx.amount}
                            </span>
                        </div>
                      </div>

                      {/* 2. MIDDLE: Description & Date */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate text-slate-900 dark:text-slate-100 leading-tight">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {date}
                        </p>
                      </div>

                      {/* 3. RIGHT: The Direction Arrow */}
                      <div className="shrink-0">
                        {isEarned ? (
                            <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400 stroke-[3]" />
                        ) : (
                            <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400 stroke-[3]" />
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* --- VIEW 2: DESKTOP TABLE (Unchanged) --- */}
            <div className="hidden md:block">
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
                    const isEarned = tx.type === 'earned';
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className={cn("flex items-center gap-1 font-medium", isEarned ? "text-green-600" : "text-red-600")}>
                            {isEarned ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            <span className="capitalize">{tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{tx.description}</TableCell>
                        <TableCell className="text-center">
                          <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted border font-bold", isEarned ? "text-green-600" : "text-red-600")}>
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}