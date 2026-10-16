"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signInWithGoogle } from "@/lib/supabase";

/** UI only. Every write is refused by RLS, which runs its own is_admin(). */
export function AdminGate() {
  return (
    <Card className="mx-auto mt-16 max-w-md">
      <CardContent className="grid gap-3 p-6 text-center">
        <h2 className="font-serif text-xl font-semibold">Admin sign-in required</h2>
        <p className="text-sm text-muted-foreground">
          Building modules is an admin action, so sign in to continue. The Storefront stays open to
          everyone.
        </p>
        <Button onClick={() => void signInWithGoogle()} className="mt-2">
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
