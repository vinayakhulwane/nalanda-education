'use client';

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Loader2 } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

export default function Home() {
  const loginImage = PlaceHolderImages.find(p => p.id === 'login');
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (firebaseUser) {
        const db = getFirestore();
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            id: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL,
            role: 'student',
            coins: 0,
            gold: 0,
            diamonds: 0,
          });
        }
      }
    } catch (error: any) {
      console.error("Sign-in error", error);
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: error.message || "An unexpected error occurred during sign-in.",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  // Loading State
  if (isUserLoading || isSigningIn || user) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* 1. Immersive Background Layer */}
      <div className="absolute inset-0 z-0">
        {loginImage ? (
             <Image
             src={loginImage.imageUrl}
             alt="Background"
             fill
             className="object-cover opacity-10 dark:opacity-5 blur-sm scale-105"
             priority
           />
        ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />
        )}
        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/50 to-transparent dark:from-slate-950/80 dark:via-slate-950/50" />
      </div>

      {/* 2. Glassmorphism Login Card */}
      <div className="relative z-10 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-700 slide-in-from-bottom-4">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/50 dark:border-slate-800 shadow-2xl rounded-3xl p-8 sm:p-10 text-center">
          
          {/* Logo with Glow Effect */}
          <div className="mx-auto w-24 h-24 relative mb-6 shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-slate-950 ring-1 ring-slate-100 dark:ring-slate-800">
             <Image 
                src="/HD_Logo_TBG.png" 
                alt="Nalanda Logo" 
                fill 
                className="object-cover"
                priority
             />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Welcome to Nalanda
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-base leading-relaxed">
            Your personalized platform for <br className="hidden sm:block" />
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">academic excellence</span>.
          </p>

          {/* Sign In Button */}
          <div className="space-y-6">
            <Button 
                size="lg" 
                className="w-full h-14 text-base font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:shadow-none" 
                onClick={handleSignIn} 
                disabled={isSigningIn}
            >
              {/* Google 'G' Logo SVG */}
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
            
            <p className="text-xs text-slate-400 dark:text-slate-500">
                By continuing, you agree to our <span className="underline cursor-pointer hover:text-indigo-500 transition-colors">Terms of Service</span>.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-10 text-center">
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase opacity-70">
                © {new Date().getFullYear()} Nalanda Education
            </p>
        </div>
      </div>
    </div>
  );
}