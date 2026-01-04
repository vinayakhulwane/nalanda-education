'use client';

import { WalletBalances } from "@/components/wallet/wallet-balances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CurrencySwap } from "@/components/wallet/currency-swap";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { SurpriseCoupon } from "@/components/wallet/surprise-coupon";
import { cn } from "@/lib/utils";

export default function WalletPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserProfileLoading && userProfile?.role !== 'student') {
      router.push('/dashboard');
    }
  }, [userProfile, isUserProfileLoading, router]);

  if (isUserProfileLoading || !userProfile) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userProfile.role !== 'student') {
    return null;
  }

  return (
    // 1. MAIN WRAPPER: Matches Courses Page background
    <div className="min-h-screen bg-transparent pb-20 overflow-x-hidden">
      
      {/* 2. HEADER: Exact alignment with Courses Page (px-6) */}
      <div className="container mx-auto px-6 py-8 max-w-7xl">
         <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white">
            My Wallet
         </h1>
         <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            View your balances, exchange currencies, and see your transaction history.
         </p>
      </div>

      {/* 3. CONTENT: Exact alignment with Courses Page (px-6) */}
      <div className="container mx-auto px-6 max-w-7xl space-y-8">
        
        {/* Wallet Balances - Wrapped to prevent overflow */}
        <div className="w-full max-w-full">
           <WalletBalances userProfile={userProfile} />
        </div>

        {/* 4. TABS FIX: Force fit to screen width */}
        <div className="w-full max-w-full">
          <Tabs defaultValue="coupon" className="w-full">
            
            {/* CRITICAL FIX: 
               - Removed 'flex' and 'overflow-x-auto'
               - Added 'grid grid-cols-3'
               - This forces the 3 buttons to split the available width (33% each) 
                 exactly like the desktop view, ensuring they NEVER overflow.
            */}
            <TabsList className={cn(
                "grid grid-cols-3 w-full gap-2 bg-transparent p-0 h-auto mb-6",
                "md:bg-muted/80 md:p-1 md:rounded-xl"
            )}>
              {['coupon', 'swap', 'history'].map((val) => (
                 <TabsTrigger 
                   key={val}
                   value={val} 
                   className={cn(
                     "whitespace-nowrap transition-all duration-200",
                     // MOBILE STYLES:
                     // 1. Removed 'min-w-[130px]' -> This was causing the overflow.
                     // 2. Added 'w-full' -> Fills the grid cell.
                     // 3. text-[10px] xs:text-xs -> Slightly smaller text to prevent wrapping.
                     // 4. px-1 -> Reduced padding to fit text.
                     "rounded-full border bg-background px-1 py-2.5 text-[10px] xs:text-xs font-medium shadow-sm w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                     
                     // DESKTOP STYLES (Unchanged):
                     "md:rounded-md md:border-none md:bg-transparent md:px-3 md:py-1.5 md:text-sm md:shadow-none md:min-w-0 md:data-[state=active]:bg-background md:data-[state=active]:text-foreground md:data-[state=active]:shadow-sm"
                   )}
                 >
                   {val === 'coupon' && "Coupon"} {/* Shortened name for mobile if needed */}
                   {val === 'swap' && "Swap"}
                   {val === 'history' && "History"}
                 </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="coupon">
              <SurpriseCoupon userProfile={userProfile} />
            </TabsContent>

            <TabsContent value="swap">
              <CurrencySwap userProfile={userProfile} />
            </TabsContent>

            <TabsContent value="history">
              {/* Ensure history table doesn't push width */}
              <div className="w-full overflow-hidden">
                 <TransactionHistory />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}