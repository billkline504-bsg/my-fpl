import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { AuthPage } from "./pages/AuthPage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { PlayersPage } from "./pages/PlayersPage";

type Tab = "leagues" | "players";

export function App() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("leagues");

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div>
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl gap-4 px-8 pt-4">
          {(["leagues", "players"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 pb-3 text-sm font-medium capitalize ${
                tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
      {tab === "leagues" ? <LeaguesPage /> : <PlayersPage />}
    </div>
  );
}
