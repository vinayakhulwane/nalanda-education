'use client';

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Logo } from "@/components/logo";
import { ArrowRight, Mail, Loader2 } from "lucide-react";
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
          // User doesn't exist, create a new document
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
      // The useEffect will handle the redirect once the user state is updated.
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

  // Show a loader if Firebase is still checking auth state, or if a sign-in is in progress, or if the user is logged in and we are about to redirect.
  if (isUserLoading || isSigningIn || user) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <div className="w-full lg:grid lg:min-h-[100vh] lg:grid-cols-2 xl:min-h-[100vh]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <Logo className="mx-auto" />
            <h1 className="text-3xl font-bold font-headline mt-4">Welcome to Nalanda</h1>
            <p className="text-balance text-muted-foreground">
              Your personalized platform for academic excellence.
            </p>
          </div>
          <div className="grid gap-4">
            <Button variant="outline" type="button" onClick={handleSignIn} disabled={isSigningIn}>
              <Mail className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full" disabled>
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-4 text-center text-sm">
            By continuing, you agree to our terms of service.
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {loginImage && (
          <Image
            src={loginImage.imageUrl}
            alt="Abstract image representing learning"
            width="1920"
            height="1080"
            data-ai-hint={loginImage.imageHint}
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        )}
      </div>
    </div>
  );
}
