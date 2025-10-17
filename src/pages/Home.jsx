import { useEffect, useMemo, useState } from "react";
import { useStarredLeagues } from "../store/useStarredLeagues";
import LeagueCard from "../components/LeagueCard";
import { fetchLeaguesCurrent, fetchTeamsByLeague } from "../api/football";

export default function Home() {
  const { starred } = useStarredLeagues();

  const [all, setAll] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [errorAll, setErrorAll] = useState(null);

  const [teamsByLeague, setTeamsByLeague] = useState({});
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Hent alle aktuelle ligaer
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingAll(true);
        const leagues = await fetchLeaguesCurrent();
        if (!alive) return;
        setAll(leagues);
      } catch (e) {
        if (!alive) return;
        setErrorAll(e.message || "Failed to fetch leagues");
      } finally {
        if (alive) setLoadingAll(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Hent teams for hver favorit-liga (season 2025)
  useEffect(() => {
    if (!starred.length) return;
    let alive = true;
    (async () => {
      try {
        setLoadingTeams(true);
        const entries = await Promise.all(
          starred.map(async (lid) => {
            try {
              const teams = await fetchTeamsByLeague(lid, 2025);
              return [lid, teams];
            } catch {
              return [lid, []];
            }
          })
        );
        if (!alive) return;
        setTeamsByLeague(Object.fromEntries(entries));
      } finally {
        if (alive) setLoadingTeams(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [starred]);

  const starredLeagues = useMemo(
    () => all.filter((l) => starred.includes(l.id)),
    [all, starred]
  );

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold mb-3">⭐ Starred Leagues</h2>

        {starredLeagues.length === 0 ? (
          <div className="text-slate-400 text-sm">
            No starred leagues yet. Click ★ on any league below.
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {starredLeagues.map((l) => (
                <LeagueCard key={l.id} league={l} />
              ))}
            </div>

            <div className="space-y-8">
              {starredLeagues.map((l) => {
                const teams = teamsByLeague[l.id] || [];
                return (
                  <div key={`teams-${l.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold">
                        {l.name} — Teams (season 2025)
                      </h3>
                      {loadingTeams && (
                        <div className="text-xs text-slate-400">
                          Loading teams…
                        </div>
                      )}
                    </div>

                    {teams.length === 0 ? (
                      <div className="text-sm text-slate-400">
                        No teams returned.
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {teams.map((t) => (
                          <div
                            key={t.id}
                            className="glass border border-white/10 rounded-2xl p-3 flex items-center gap-3"
                          >
                            <img
                              src={t.logo}
                              alt={t.name}
                              className="w-8 h-8 rounded-full bg-white/10 object-contain"
                            />
                            <div>
                              <div className="font-medium leading-tight">
                                {t.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {t.country}
                                {t.code ? ` • ${t.code}` : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">🏆 All Current Leagues</h2>
        {loadingAll && (
          <div className="text-sm text-slate-400">Loading leagues…</div>
        )}
        {errorAll && (
          <div className="text-sm text-red-400">Error: {errorAll}</div>
        )}
        {!loadingAll && !errorAll && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {all.map((l) => (
              <LeagueCard key={l.id} league={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
