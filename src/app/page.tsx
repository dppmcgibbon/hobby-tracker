import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getUser();

  // If already logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Warhammer 40K Collection Tracker
        </h1>
        <p className="text-xl text-slate-300">
          Track your miniatures, painting progress, recipes, and photos in one organized place
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button asChild size="lg">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
