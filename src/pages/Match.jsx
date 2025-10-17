// src/pages/Match.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchFixtureById,
  fetchH2H,
  fetchTeamStats,
  fetchFixtureStatistics,
} from "../api/football";
import { SkeletonBox } from "../components/Skeletons";

// ----- Date/Time helpers -----
function fmtDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDateLong(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
/** Returnerer fx: "2y 3m ago", "7m ago", "12d ago", "Today" */
function timeAgo(iso) {
  const now = new Date();
  const then = new Date(iso);
  if (isNaN(then.getTime())) return "";
  // Udregn "kalender"-år/måneder
  let years = now.getFullYear() - then.getFullYear();
  let months = now.getMonth() - then.getMonth();
  let days = now.getDate() - then.getDate();

  if (days < 0) {
    // lån dage fra forrige måned
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years > 0 && months > 0) return `${years}y ${months}m ago`;
  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}m ago`;

  // under en måned -> grov dag-beregning
  const ms = now.getTime() - then.getTime();
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (d > 1) return `${d}d ago`;
  if (d === 1) return "1d ago";
  return "Today";
}

// Nøglestatistikker
const KEY_STATS = [
  "Shots on Goal",
  "Shots off Goal",
  "Total Shots",
  "Shots insidebox",
  "Shots outsidebox",
  "Fouls",
  "Corner Kicks",
  "Offsides",
  "Yellow Cards",
  "Red Cards",
  "Goalkeeper Saves",
  "Ball Possession",
  "expected_goals",
];

/** Klikbart stat-afsnit (avg i header, liste pr. kamp ved expand) */
function StatRow({
  statKey,
  homeName,
  awayName,
  avg,
  series,
  isOpen,
  onToggle,
}) {
  const h = avg?.home ?? 0;
  const a = avg?.away ?? 0;
  return (
    <div className="rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
      >
        <div className="text-sm muted text-left">{statKey}</div>
        <div className="flex items-center gap-2">
          <span className="chip">
            {homeName}: <b className="ml-1">{h}</b>
          </span>
          <span className="chip">
            {awayName}: <b className="ml-1">{a}</b>
          </span>
          <motion.span
            initial={false}
            animate={{ rotate: isOpen ? 90 : 0 }}
            className="text-xs opacity-70"
          >
            ▶
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="px-3 pb-3"
          >
            <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
              <div className="grid grid-cols-12 text-xs uppercase tracking-wide bg-black/5 dark:bg-white/5 py-2 px-3 muted">
                <div className="col-span-4">Match</div>
                <div className="col-span-2 text-right">{homeName}</div>
                <div className="col-span-2 text-right">{awayName}</div>
                <div className="col-span-2 text-right">Date</div>
                <div className="col-span-2 text-right">Fixture ID</div>
              </div>
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {series.map((m) => (
                  <div
                    key={`${statKey}-${m.fixtureId}`}
                    className="grid grid-cols-12 items-center px-3 py-2"
                  >
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <img
                        src={m.homeLogo}
                        alt=""
                        className="w-5 h-5 rounded bg-white/10 object-contain"
                      />
                      <span className="truncate">{m.homeName}</span>
                      <span className="text-xs opacity-60">vs</span>
                      <img
                        src={m.awayLogo}
                        alt=""
                        className="w-5 h-5 rounded bg-white/10 object-contain"
                      />
                      <span className="truncate">{m.awayName}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      {m.homeVal ?? 0}
                    </div>
                    <div className="col-span-2 text-right">
                      {m.awayVal ?? 0}
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="truncate">{fmtDateShort(m.date)}</div>
                      <div className="text-xs opacity-60">
                        {timeAgo(m.date)}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">{m.fixtureId}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Match() {
  const { fixtureId } = useParams();
  const [sp] = useSearchParams();
  const leagueId = sp.get("league");
  const homeId = sp.get("home");
  const awayId = sp.get("away");

  // Fixture meta
  const [fixture, setFixture] = useState(null);
  const [loadingFixture, setLoadingFixture] = useState(true);

  // Last 5 H2H
  const [h2h, setH2h] = useState([]);
  const [loadingH2h, setLoadingH2h] = useState(true);

  // Team season stats
  const [homeStats, setHomeStats] = useState(null);
  const [awayStats, setAwayStats] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Averages + per-stat serier + red cards
  const [avgStats, setAvgStats] = useState(null);
  const [seriesByStat, setSeriesByStat] = useState({});
  const [loadingAvg, setLoadingAvg] = useState(true);
  const [redCardEvents, setRedCardEvents] = useState([]);

  // UI: åbne stats
  const [openStats, setOpenStats] = useState({});
  const toggleStat = (k) => setOpenStats((s) => ({ ...s, [k]: !s[k] }));

  // 1) Fixture meta
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingFixture(true);
        const data = await fetchFixtureById(fixtureId);
        if (alive) setFixture(data);
      } finally {
        if (alive) setLoadingFixture(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fixtureId]);

  // 2) H2H (last 5, FT)
  useEffect(() => {
    if (!homeId || !awayId) return;
    let alive = true;
    (async () => {
      try {
        setLoadingH2h(true);
        const rows = await fetchH2H(homeId, awayId, 5);
        if (alive) setH2h(rows);
      } finally {
        if (alive) setLoadingH2h(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [homeId, awayId]);

  // 3) Team season stats
  useEffect(() => {
    if (!leagueId || !homeId || !awayId) return;
    let alive = true;
    (async () => {
      try {
        setLoadingTeams(true);
        const [hs, as] = await Promise.all([
          fetchTeamStats(leagueId, homeId, 2025),
          fetchTeamStats(leagueId, awayId, 2025),
        ]);
        if (!alive) return;
        setHomeStats(hs);
        setAwayStats(as);
      } finally {
        if (alive) setLoadingTeams(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [leagueId, homeId, awayId]);

  // 4) Averages + serier (null => 0 og tælles med)
  useEffect(() => {
    if (!h2h.length || !homeId || !awayId) return;
    let alive = true;
    (async () => {
      try {
        setLoadingAvg(true);
        const bundles = await Promise.allSettled(
          h2h.map((r) => fetchFixtureStatistics(r.fixture.id))
        );

        const acc = {}; // { stat: {home:{sum,n}, away:{sum,n}} }
        const mapSeries = {}; // { stat: [ {fixtureId,date,homeVal,awayVal,homeName,awayName,logos} ] }
        const rcList = [];

        bundles.forEach((b, idx) => {
          if (b.status !== "fulfilled" || !b.value) return;
          const statsByTeam = b.value;
          const row = h2h[idx];

          const h = statsByTeam[homeId] || { stats: {} };
          const a = statsByTeam[awayId] || { stats: {} };

          KEY_STATS.forEach((key) => {
            acc[key] ||= { home: { sum: 0, n: 0 }, away: { sum: 0, n: 0 } };
            mapSeries[key] ||= [];

            const hv = typeof h.stats?.[key] === "number" ? h.stats[key] : 0;
            const av = typeof a.stats?.[key] === "number" ? a.stats[key] : 0;

            acc[key].home.sum += hv;
            acc[key].home.n++;
            acc[key].away.sum += av;
            acc[key].away.n++;

            mapSeries[key].push({
              fixtureId: row.fixture.id,
              date: row.fixture.date,
              homeVal: hv,
              awayVal: av,
              homeName: row.teams.home.name,
              awayName: row.teams.away.name,
              homeLogo: row.teams.home.logo,
              awayLogo: row.teams.away.logo,
            });
          });

          const hRC =
            typeof h.stats?.["Red Cards"] === "number"
              ? h.stats["Red Cards"]
              : 0;
          const aRC =
            typeof a.stats?.["Red Cards"] === "number"
              ? a.stats["Red Cards"]
              : 0;
          if (hRC > 0 || aRC > 0) {
            rcList.push({
              fixtureId: row.fixture.id,
              date: row.fixture.date,
              home: {
                name: row.teams.home.name,
                rc: hRC,
                logo: row.teams.home.logo,
              },
              away: {
                name: row.teams.away.name,
                rc: aRC,
                logo: row.teams.away.logo,
              },
            });
          }
        });

        const avg = {};
        KEY_STATS.forEach((key) => {
          const h = acc[key]?.home || { sum: 0, n: 1 };
          const a = acc[key]?.away || { sum: 0, n: 1 };
          const isPct = key === "Ball Possession";
          avg[key] = {
            home: +(h.sum / h.n).toFixed(isPct ? 1 : 2),
            away: +(a.sum / a.n).toFixed(isPct ? 1 : 2),
          };
        });

        if (!alive) return;
        setAvgStats(avg);
        setSeriesByStat(mapSeries);
        setRedCardEvents(rcList);
      } finally {
        if (alive) setLoadingAvg(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [h2h, homeId, awayId]);

  const homeName =
    fixture?.teams?.home?.name || homeStats?.team?.name || "Home";
  const awayName =
    fixture?.teams?.away?.name || awayStats?.team?.name || "Away";
  const homeLogo = fixture?.teams?.home?.logo || homeStats?.team?.logo;
  const awayLogo = fixture?.teams?.away?.logo || awayStats?.team?.logo;

  return (
    <div className="space-y-6">
      {/* Top — centrerede logoer + navne + dato/år + relative */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card card-pad"
      >
        <div className="flex items-center justify-center gap-6 text-center">
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={homeLogo}
            alt=""
            className="w-14 h-14 md:w-16 md:h-16 rounded bg-white/10 object-contain"
          />
          <div>
            <div className="font-bold text-lg">{homeName}</div>
            <div className="text-xs opacity-70">vs</div>
            <div className="font-bold text-lg">{awayName}</div>
          </div>
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={awayLogo}
            alt=""
            className="w-14 h-14 md:w-16 md:h-16 rounded bg-white/10 object-contain"
          />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
          {fixture?.fixture?.date && (
            <>
              <span className="chip">{fmtDateLong(fixture.fixture.date)}</span>
              <span className="chip">{timeAgo(fixture.fixture.date)}</span>
            </>
          )}
          <span className="chip">Fixture ID: {fixtureId}</span>
          <Link
            to="/leagues"
            className="chip hover:bg-black/10 dark:hover:bg-white/10"
          >
            ← Back
          </Link>
        </div>
      </motion.div>

      {/* H2H — dato m/år + hvor lang tid siden */}
      <section className="card card-pad">
        <h2 className="text-base font-semibold mb-2">H2H — last 5 (FT)</h2>
        {loadingH2h ? (
          Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} className="h-8 w-full rounded-xl" />
          ))
        ) : h2h.length === 0 ? (
          <div className="text-sm muted">No H2H results.</div>
        ) : (
          <div className="space-y-1.5">
            {h2h.map((r, i) => (
              <motion.div
                key={r.fixture.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.15 }}
                className="card px-3 py-2 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={r.teams.home.logo}
                    alt=""
                    className="w-5 h-5 rounded bg-white/10 object-contain"
                  />
                  <span className="text-sm truncate max-w-[160px] md:max-w-[220px]">
                    {r.teams.home.name}
                  </span>
                  <span className="text-xs opacity-60">vs</span>
                  <img
                    src={r.teams.away.logo}
                    alt=""
                    className="w-5 h-5 rounded bg-white/10 object-contain"
                  />
                  <span className="text-sm truncate max-w-[160px] md:max-w-[220px]">
                    {r.teams.away.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="chip">ID: {r.fixture.id}</span>
                  <span className="chip">{fmtDateShort(r.fixture.date)}</span>
                  <span className="chip">{timeAgo(r.fixture.date)}</span>
                  <span className="text-sm">
                    {r.goals.home}–{r.goals.away}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Averages – klikbare rækker */}
      <section className="card card-pad">
        <h2 className="text-base font-semibold mb-3">Avg from last 5 H2H</h2>

        {loadingAvg ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBox key={i} className="h-6 w-full rounded-xl" />
            ))}
          </div>
        ) : !avgStats ? (
          <div className="text-sm muted">No statistics available.</div>
        ) : (
          <div className="space-y-1">
            {KEY_STATS.map((k) => (
              <StatRow
                key={k}
                statKey={k}
                homeName={homeName}
                awayName={awayName}
                avg={avgStats[k]}
                series={seriesByStat[k] || []}
                isOpen={!!openStats[k]}
                onToggle={() => toggleStat(k)}
              />
            ))}
          </div>
        )}

        {/* Red Cards — hvilke kampe + år + hvor lang tid siden */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold mb-2">
            Red cards — which matches
          </h3>
          {loadingAvg ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBox key={i} className="h-7 w-full rounded-xl" />
              ))}
            </div>
          ) : redCardEvents.length === 0 ? (
            <div className="text-sm muted">
              No red cards in the last H2H matches.
            </div>
          ) : (
            <ul className="space-y-1">
              {redCardEvents.map((e) => (
                <li
                  key={e.fixtureId}
                  className="flex items-center justify-between rounded-xl px-3 py-2 bg-black/5 dark:bg.white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={e.home.logo}
                      alt=""
                      className="w-5 h-5 rounded bg-white/10 object-contain"
                    />
                    <span className="truncate max-w-[120px] md:max-w-[200px]">
                      {e.home.name}
                    </span>
                    <span className="text-xs opacity-60">vs</span>
                    <img
                      src={e.away.logo}
                      alt=""
                      className="w-5 h-5 rounded bg.white/10 object-contain"
                    />
                    <span className="truncate max-w-[120px] md:max-w-[200px]">
                      {e.away.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="chip" title="Fixture ID">
                      ID: {e.fixtureId}
                    </span>
                    <span className="chip">{fmtDateShort(e.date)}</span>
                    <span className="chip">{timeAgo(e.date)}</span>
                    <span className="chip" title="Red cards">
                      {homeName}: <b className="ml-1">{e.home.rc}</b>
                    </span>
                    <span className="chip" title="Red cards">
                      {awayName}: <b className="ml-1">{e.away.rc}</b>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Kompakte sæsonnøgletal */}
      <section className="grid md:grid-cols-2 gap-4">
        {[
          { label: "Home team — season 2025", data: homeStats },
          { label: "Away team — season 2025", data: awayStats },
        ].map(({ label, data }, idx) => (
          <div key={idx} className="card card-pad">
            <h3 className="font-semibold mb-2">{label}</h3>
            {!data || loadingTeams ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonBox key={i} className="h-4 w-56" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="col-span-2 flex items-center gap-2 mb-1">
                  <img
                    src={data.team.logo}
                    alt=""
                    className="w-6 h-6 rounded bg-white/10 object-contain"
                  />
                  <span className="font-medium">{data.team.name}</span>
                </div>
                <div className="muted">Form</div>
                <div>{data.form}</div>
                <div className="muted">Played</div>
                <div>{data.fixtures?.played?.total ?? "—"}</div>
                <div className="muted">W/D/L</div>
                <div>
                  {data.fixtures?.wins?.total ?? 0}/
                  {data.fixtures?.draws?.total ?? 0}/
                  {data.fixtures?.loses?.total ?? 0}
                </div>
                <div className="muted">GF (avg)</div>
                <div>
                  {data.goals?.for?.total?.total ?? 0} (
                  {data.goals?.for?.average?.total ?? "—"})
                </div>
                <div className="muted">GA (avg)</div>
                <div>
                  {data.goals?.against?.total?.total ?? 0} (
                  {data.goals?.against?.average?.total ?? "—"})
                </div>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
