import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RequiredMark } from "@/shared/ui/required-mark";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useAuthActions } from "../hooks/useAuthActions";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  fullName: z.string().trim().max(100).optional(),
});

export function AuthPage({
  redirect,
  authError,
}: {
  redirect: string | undefined;
  authError?: string;
}) {
  const target = safePath(redirect);
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: target, replace: true });
  }, [ready, user, target, navigate]);

  useEffect(() => {
    if (authError) toast.error(authError);
  }, [authError]);

  async function submit(mode: "in" | "up", form: HTMLFormElement): Promise<void> {
    const fd = new FormData(form);
    const parsed = schema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
      fullName: fd.get("fullName") ?? undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    const { email, password, fullName } = parsed.data;
    const res =
      mode === "in"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(
            email,
            password,
            fullName,
            `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
          );
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (mode === "up" && !res.data.session) setSent(true);
  }

  async function google() {
    setBusy(true);
    try {
      const { error } = await signInWithGoogle(
        `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
      );
      if (error) {
        toast.error(error.message);
        setBusy(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-5xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You need an account to check out and track your orders.
      </p>

      {sent ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <p className="font-semibold">Check your email</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click the confirmation link we sent you, then you'll come right back here.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <Button variant="secondary" className="w-full" onClick={google} disabled={busy}>
            {busy ? "Redirecting…" : "Continue with Google"}
          </Button>
          <div className="my-5 text-center text-xs uppercase tracking-widest text-muted-foreground">
            or
          </div>
          <Tabs defaultValue="in">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="in">Sign in</TabsTrigger>
              <TabsTrigger value="up">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="in">
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => (e.preventDefault(), submit("in", e.currentTarget))}
              >
                <Field name="email" label="Email" type="email" />
                <Field name="password" label="Password" type="password" />
                <Button className="w-full" disabled={busy}>
                  Sign in
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="up">
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => (e.preventDefault(), submit("up", e.currentTarget))}
              >
                <Field name="fullName" label="Full name" />
                <Field name="email" label="Email" type="email" />
                <Field name="password" label="Password (8+ characters)" type="password" />
                <Button className="w-full" disabled={busy}>
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  const required = name !== "fullName";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label} {required && <RequiredMark />}
      </Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
