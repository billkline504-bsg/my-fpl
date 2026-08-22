import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        // Local dev Supabase has email confirmation disabled, so we're
        // signed in immediately and can create our app-level profile row.
        await api.upsertMyProfile({ displayName: displayName || email.split("@")[0] });
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-slate-900">
          {mode === "sign-in" ? "Sign in" : "Create an account"}
        </h1>

        {mode === "sign-up" && (
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          className="w-full text-center text-sm text-slate-500"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
