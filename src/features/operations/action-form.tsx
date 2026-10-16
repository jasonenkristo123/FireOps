"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
export type ActionState = { error?: string; success?: string };
export function ActionForm({
  action,
  children,
  submit = "Simpan",
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      {state.success && <output className="notice">{state.success}</output>}
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Menyimpan…" : submit}
      </Button>
    </form>
  );
}
