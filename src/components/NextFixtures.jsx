// src/components/NextFixtures.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchNextFixtures } from "../api/football";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SkeletonFixtureRow } from "./Skeletons";

/* ---------- Countdown helper ---------- */
function useNow(tickMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

function formatDiff(ms) {
  if (ms <= 0) return "Now";
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- Component ---------- */
export default function NextFixtures({ leagueId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const now = useNow(30000); // opdater hvert 30. sekund (glat og billigt)

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const fx = await fetchNextFixtures(leagueId, 10);
        if (!alive) return;
        setRows(fx);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Failed to fetch fixtures");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [leagueId]);

  const items = useMemo(
    () =>
      rows.map((f) => {
        const t = new Date(f.date).getTime();
        const ms = t - now;
        const countdown = formatDiff(ms);
        return { ...f, countdown };
      }),
    [rows, now]
  );

  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="card px-3 py-2">
            <SkeletonFixtureRow />
          </div>
        ))}
      </div>
    );
  }

  if (err) return <div className="text-xs text-red-400">Error: {err}</div>;
  if (!items.length)
    return <div className="text-xs muted">No upcoming fixtures returned.</div>;

  return (
    <div className="space-y-1.5">
      {items.map((f, i) => {
        const hasIds = f?.id && f?.leagueId && f?.home?.id && f?.away?.id;
        const to = hasIds
          ? `/match/${encodeURIComponent(f.id)}?league=${encodeURIComponent(
              f.leagueId
            )}&home=${encodeURIComponent(f.home.id)}&away=${encodeURIComponent(
              f.away.id
            )}`
          : null;

        const Row = (
          <div className="px-2 md:px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={f.home.logo}
                alt=""
                className="w-5 h-5 rounded bg-white/10 object-contain"
              />
              <span className="text-sm truncate max-w-[140px] md:max-w-[200px]">
                {f.home.name}
              </span>
              <span className="text-xs opacity-60">vs</span>
              <img
                src={f.away.logo}
                alt=""
                className="w-5 h-5 rounded bg-white/10 object-contain"
              />
              <span className="text-sm truncate max-w-[140px] md:max-w-[200px]">
                {f.away.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Countdown chip erstatter "NS" */}
              <span className="chip" title={`Kick-off: ${fmtDate(f.date)}`}>
                {f.countdown}
              </span>
              <span className="text-xs opacity-80">{fmtDate(f.date)}</span>
            </div>
          </div>
        );

        return (
          <motion.div
            key={f.id || i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015, duration: 0.12 }}
            className="card hover:shadow-neon"
          >
            {hasIds ? (
              <Link
                to={to}
                className="block rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-neonBlue/40"
              >
                {Row}
              </Link>
            ) : (
              <div className="opacity-60 cursor-not-allowed">{Row}</div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
