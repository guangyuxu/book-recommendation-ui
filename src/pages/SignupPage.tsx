import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/forms/Field";

// Mirrors the backend SignupRequest constraints (password min length 8, valid email).
const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  display_name: z.string().optional(),
  family_name: z.string().optional(),
  invite_code: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // `useWatch`, not the `watch()` returned by useForm: watch() is a fresh function on every render
  // that the React Compiler cannot memoize, so its presence makes the compiler bail out of
  // optimising this whole component (react-hooks/incompatible-library). useWatch subscribes to the
  // same field through `control` and is compiler-safe.
  const hasInvite = !!useWatch({ control, name: "invite_code" });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await signup({
        email: values.email,
        password: values.password,
        display_name: values.display_name || null,
        // When joining via invite, the family name is ignored (family comes from the invite).
        family_name: values.family_name || null,
        invite_code: values.invite_code || null,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Signup failed, please retry",
      );
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Start a new family, or join one with an invite code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              error={errors.password?.message}
              hint="At least 8 characters."
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
            </Field>
            <Field label="Your name" htmlFor="display_name">
              <Input id="display_name" {...register("display_name")} />
            </Field>
            <Field
              label="Family name"
              htmlFor="family_name"
              hint={
                hasInvite
                  ? "Ignored when joining via an invite code."
                  : "Optional — names your new family."
              }
            >
              <Input
                id="family_name"
                disabled={hasInvite}
                {...register("family_name")}
              />
            </Field>
            <Field
              label="Invite code"
              htmlFor="invite_code"
              hint="Optional — join an existing family."
            >
              <Input id="invite_code" {...register("invite_code")} />
            </Field>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign up
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
