import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Logo } from "@/components/logo";
import { ArrowRight, Mail } from "lucide-react";

export default function Home() {
  const loginImage = PlaceHolderImages.find(p => p.id === 'login');

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
            <Button variant="outline" type="button">
              <Mail className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">
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
