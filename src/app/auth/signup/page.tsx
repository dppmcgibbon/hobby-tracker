"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { signUp } from "@/lib/auth/client";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);
    setError(null);

    const { data: authData, error: signUpError } = await signUp(
      data.email,
      data.password,
      data.displayName
    );

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    }
  };

  if (success) {
    return (
      <Card className="warhammer-card border-primary/50">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-black uppercase tracking-wider text-primary gold-glow">
            Welcome, Recruit!
          </CardTitle>
          <CardDescription className="text-base">
            Deploying to your command center...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader className="space-y-1 border-b border-primary/20">
        <CardTitle className="text-3xl font-black uppercase tracking-wider text-primary gold-glow">
          Enlist Now
        </CardTitle>
        <CardDescription className="text-base">
          Begin tracking your miniature army
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="uppercase text-xs tracking-wide font-bold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              disabled={isLoading}
              className="bg-muted/30 border-primary/20 focus:border-primary"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="uppercase text-xs tracking-wide font-bold">
              Display Name (Optional)
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your name"
              {...register("displayName")}
              disabled={isLoading}
              className="bg-muted/30 border-primary/20 focus:border-primary"
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="uppercase text-xs tracking-wide font-bold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              disabled={isLoading}
              className="bg-muted/30 border-primary/20 focus:border-primary"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="uppercase text-xs tracking-wide font-bold">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
              disabled={isLoading}
              className="bg-muted/30 border-primary/20 focus:border-primary"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full btn-warhammer-primary" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 border-t border-primary/20 pt-6">
        <div className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:text-primary/80 font-bold uppercase tracking-wide">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
