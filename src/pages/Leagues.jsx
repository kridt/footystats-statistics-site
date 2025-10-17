// src/pages/Leagues.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchLeaguesCurrent, fetchNextFixtures } from "../api/football";
import { SkeletonBox } from "../components/Skeletons";
import { getWithTTL, setWithTTL, getJSON, setJSON } from "../utils/storage";

// ---- Cache keys/TTL ----
const K_LEAGUES = "leagues:current";
const K_STARRED = "starredLeagues"; // array<string>
const K_FIX_PREFIX = "fixtures:league:"; // + leagueId
const TTL_LEAGUES_30D = 30 * 24 * 60 * 60 * 1000; // 30 dage

// ---- Countdown ----
function useCountdown(isoDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!isoDate) return null;
  const target = new Date(isoDate).getTime();
  const delta = Math.max(0, target - now);
  const s = Math.floor(delta / 1000);
  const d = Math.floor(s / (3600 * 24));
  const h = Math.floor((s % (3600 * 24)) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec, isZero: s === 0 };
}

function Countdown({ iso }) {
  const c = useCountdown(iso);
  if (!c) return null;
  if (c.isZero) return <span className="chip">Live / Started</span>;
  return (
    <span className="chip" title={new Date(iso).toLocaleString()}>
      {c.d > 0 ? `${c.d}d ` : ""}
      {String(c.h).padStart(2, "0")}:{String(c.m).padStart(2, "0")}:
      {String(c.s).padStart(2, "0")}
    </span>
  );
}

// ---- Normalisering af fixtures ----
function normalizeFixture(x) {
  const id = x?.id ?? x?.fixture?.id ?? x?.fixtureId ?? null;
  const date = x?.date ?? x?.fixture?.date ?? null;
  const home = {
    id: x?.home?.id ?? x?.teams?.home?.id ?? x?.homeId ?? null,
    name: x?.home?.name ?? x?.teams?.home?.name ?? x?.homeName ?? "",
    logo: x?.home?.logo ?? x?.teams?.home?.logo ?? x?.homeLogo ?? "",
  };
  const away = {
    id: x?.away?.id ?? x?.teams?.away?.id ?? x?.awayId ?? null,
    name: x?.away?.name ?? x?.teams?.away?.name ?? x?.awayName ?? "",
    logo: x?.away?.logo ?? x?.teams?.away?.logo ?? x?.awayLogo ?? "",
  };
  return { id, date, home, away };
}

function cacheFixturesKey(leagueId) {
  return `${K_FIX_PREFIX}${leagueId}`;
}

function readCachedFixtures(leagueId) {
  const raw = localStorage.getItem(cacheFixturesKey(leagueId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    const kept = arr.map(normalizeFixture).filter((f) => {
      const ts = f?.date ? new Date(f.date).getTime() : 0;
      return ts > now; // auto-prune ved kickoff
    });
    if (kept.length !== arr.length) {
      localStorage.setItem(cacheFixturesKey(leagueId), JSON.stringify(kept));
    }
    return kept;
  } catch {
    return [];
  }
}

function writeCachedFixtures(leagueId, fixturesCanonical) {
  const toStore = fixturesCanonical.map(normalizeFixture);
  localStorage.setItem(cacheFixturesKey(leagueId), JSON.stringify(toStore));
}

// ---- UI helpers ----
function StarButton({ starred, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition"
      title={starred ? "Unstar league" : "Star league"}
    >
      <span className={starred ? "text-amber-300" : "text-slate-300"}>★</span>
    </button>
  );
}

export default function Leagues() {
  const [q, setQ] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);

  const [starred, setStarred] = useState(() => getJSON(K_STARRED, []));
  const [fixturesByLeague, setFixturesByLeague] = useState({}); // { [leagueId]: fixture[] }
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  // Leagues med TTL 30 dage
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingLeagues(true);
      const cached = getWithTTL(K_LEAGUES);
      if (cached && Array.isArray(cached) && cached.length) {
        if (alive) setLeagues(cached);
        setLoadingLeagues(false);
        return;
      }
      try {
        const rows = await fetchLeaguesCurrent();
        if (!alive) return;
        setLeagues(rows);
        setWithTTL(K_LEAGUES, rows, TTL_LEAGUES_30D);
      } finally {
        if (alive) setLoadingLeagues(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Persist starred
  useEffect(() => {
    setJSON(K_STARRED, starred);
  }, [starred]);

  const toggleStar = (leagueId) => {
    setStarred((prev) => {
      const s = new Set(prev || []);
      if (s.has(leagueId)) s.delete(leagueId);
      else s.add(leagueId);
      return [...s];
    });
  };

  // Sikr fixtures for en league (læser cache, fetcher hvis for få)
  async function ensureFixturesFor(leagueId, desired = 10) {
    let items = readCachedFixtures(leagueId);
    if (items.length < desired) {
      try {
        const apiRows = await fetchNextFixtures(leagueId, desired);
        const normalized = (apiRows || []).map(normalizeFixture);
        const fresh = normalized.filter((f) => {
          const ts = f?.date ? new Date(f.date).getTime() : 0;
          return ts > Date.now();
        });
        writeCachedFixtures(leagueId, fresh);
        items = readCachedFixtures(leagueId);
      } catch {
        /* behold cache */
      }
    }
    return items.slice(0, desired);
  }

  // Hent/sync fixtures for alle starred
  useEffect(() => {
    if (!starred?.length) {
      setFixturesByLeague({});
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoadingFixtures(true);
        const entries = await Promise.all(
          starred.map(async (id) => [id, await ensureFixturesFor(id, 10)])
        );
        if (!alive) return;
        const map = {};
        for (const [id, arr] of entries) map[id] = arr;
        setFixturesByLeague(map);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [starred]);

  // Minut-prune (så links ikke peger på udløbne fixtures)
  useEffect(() => {
    const iv = setInterval(() => {
      if (!starred?.length) return;
      setFixturesByLeague((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of starred) {
          const after = readCachedFixtures(id).slice(0, 10);
          const before = prev[id] || [];
          const sameLen = before.length === after.length;
          const sameIds =
            sameLen && before.every((x, i) => x.id === after[i]?.id);
          if (!sameLen || !sameIds) {
            next[id] = after;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 60 * 1000);
    return () => clearInterval(iv);
  }, [starred]);

  // Filter (top-level useMemo — altid kaldt, så ingen hook-ordre-problemer)
  const filteredLeagues = useMemo(() => {
    const base = leagues || [];
    const text = q.trim().toLowerCase();
    if (!text) return base;
    return base.filter((l) =>
      `${l.name} ${l.country} ${l.type}`.toLowerCase().includes(text)
    );
  }, [leagues, q]);

  return (
    <div className="space-y-6">
      {/* Sticky topbar */}
      <div className="sticky top-0 z-10 backdrop-blur bg-slate-900/60 border-b border-white/10 -mx-4 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Leagues</h1>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leagues…"
            className="w-72 max-w-[60vw] rounded-xl bg-white/5 focus:bg-white/10 px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      {/* Starred (med direkte fixtures) */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Starred</h2>
        {(!starred || starred.length === 0) && (
          <div className="text-sm opacity-70">
            No starred leagues yet. Click ★ to add.
          </div>
        )}
        <div className="grid lg:grid-cols-2 gap-4">
          {starred?.map((id) => {
            const league = leagues.find((l) => String(l.id) === String(id));
            const fixtures = fixturesByLeague[id] || [];
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="card card-pad"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={league?.logo}
                      alt=""
                      className="w-7 h-7 rounded bg-white/10 object-contain"
                    />
                    <div>
                      <div className="font-semibold">
                        {league?.name ?? `League ${id}`}
                      </div>
                      <div className="text-xs opacity-70">
                        {league?.country} • {league?.type}{" "}
                        {league?.season ? `• ${league.season}` : ""}
                      </div>
                    </div>
                  </div>
                  <StarButton
                    starred={true}
                    onToggle={() => toggleStar(String(id))}
                  />
                </div>

                {/* Fixtures — hele rækken er et Link når IDs findes */}
                {loadingFixtures && fixtures.length === 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonBox key={i} className="h-8 w-full rounded-xl" />
                    ))}
                  </div>
                ) : fixtures.length === 0 ? (
                  <div className="text-sm opacity-70">
                    No upcoming fixtures.
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {fixtures.map((f) => {
                      const nf = normalizeFixture(f);
                      const fid = nf.id;
                      const homeId = nf.home.id;
                      const awayId = nf.away.id;
                      const href =
                        fid && homeId && awayId
                          ? `/match/${fid}?league=${id}&home=${homeId}&away=${awayId}`
                          : null;

                      const Row = ({ children }) =>
                        href ? (
                          <Link
                            to={href}
                            className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 transition"
                            title="Open match page"
                          >
                            {children}
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/5 opacity-70">
                            {children}
                          </div>
                        );

                      return (
                        <li
                          key={
                            fid ?? `${nf.home.name}-${nf.away.name}-${nf.date}`
                          }
                        >
                          <Row>
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={nf.home.logo}
                                className="w-5 h-5 rounded bg-white/10 object-contain"
                                alt=""
                              />
                              <span className="truncate">{nf.home.name}</span>
                              <span className="text-xs opacity-60">vs</span>
                              <img
                                src={nf.away.logo}
                                className="w-5 h-5 rounded bg-white/10 object-contain"
                                alt=""
                              />
                              <span className="truncate">{nf.away.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Countdown iso={nf.date} />
                              {href ? (
                                <span className="chip">Open</span>
                              ) : (
                                <span
                                  className="chip opacity-70"
                                  title="Missing IDs"
                                >
                                  No link
                                </span>
                              )}
                            </div>
                          </Row>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Alle leagues */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">All Leagues</h2>
        {loadingLeagues ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonBox key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLeagues.map((l) => {
              const isStar = starred?.includes(String(l.id));
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={l.logo}
                      className="w-7 h-7 rounded bg-white/10 object-contain"
                      alt=""
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.name}</div>
                      <div className="text-xs opacity-70 truncate">
                        {l.country} • {l.type} {l.season ? `• ${l.season}` : ""}
                      </div>
                    </div>
                  </div>
                  <StarButton
                    starred={isStar}
                    onToggle={() => toggleStar(String(l.id))}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
