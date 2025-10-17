// Basis: vi kører alt via Vite-proxyen i vite.config.js
const BASE = "https://v3.football.api-sports.io";

// Vite eksponerer kun env-keys med prefix VITE_
const API_KEY = import.meta.env.VITE_API_KEY;

// Standard headers til API-FOOTBALL
const headers = {
  "x-rapidapi-host": "v3.football.api-sports.io",
  "x-rapidapi-key": API_KEY,
};

/**
 * Lille helper til at bygge en URL med query params.
 * @param {string} path
 * @param {Record<string, string|number|boolean|null|undefined>} [params]
 * @returns {string}
 */
function buildURL(path, params) {
  if (!params) return `${BASE}${path}`;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ""}`;
}

/**
 * Fetch + JSON med lidt bedre fejlbeskeder.
 * Kaster Error på non-2xx med body-tekst så du kan se API-fejl.
 * @param {string} url
 */
async function getJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {}
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

/**
 * Konverterer statistik-værdier til tal:
 *  - "68%" -> 68
 *  - "1.39" -> 1.39
 *  - 7 -> 7
 *  - andet -> null
 */
function parseStatValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.trim();
    const pct = s.match(/^(\d+(?:\.\d+)?)%$/);
    if (pct) return parseFloat(pct[1]);
    const num = s.match(/^-?\d+(?:\.\d+)?$/);
    if (num) return parseFloat(num[0]);
  }
  return null;
}

/* =========================
   Leagues (current)
   ========================= */

/**
 * Henter alle current leagues og de-duper efter league.id
 * Returnerer et fladt array med {id, name, type, logo, country, season}
 */
export async function fetchLeaguesCurrent() {
  const url = buildURL("/leagues", { current: true });
  const data = await getJson(url);

  const map = new Map();
  for (const item of data.response || []) {
    const id = item?.league?.id;
    if (!id || map.has(id)) continue;
    map.set(id, {
      id: String(id),
      name: item.league?.name ?? "Unknown",
      type: item.league?.type ?? "",
      logo: item.league?.logo ?? "",
      country: item.country?.name ?? "",
      season: (item.seasons || []).find((s) => s.current)?.year ?? null,
    });
  }
  return [...map.values()];
}

/* =========================
   Teams by league + season
   ========================= */

/**
 * Returnerer teams for en league/season
 *  -> [{id, name, code, country, logo}]
 */
export async function fetchTeamsByLeague(leagueId, season = 2025) {
  const url = buildURL("/teams", { league: leagueId, season });
  const data = await getJson(url);
  return (data.response || []).map((r) => ({
    id: r.team?.id,
    name: r.team?.name,
    code: r.team?.code,
    country: r.team?.country,
    logo: r.team?.logo,
  }));
}

/* =========================
   Next fixtures by league
   ========================= */

/**
 * Næste N fixtures for en league
 *  -> [{ id, date, venue, city, status, leagueId, home:{...}, away:{...} }]
 */
export async function fetchNextFixtures(leagueId, next = 10) {
  const url = buildURL("/fixtures", { league: leagueId, next });
  const data = await getJson(url);
  return (data.response || []).map((r) => ({
    id: r.fixture?.id,
    date: r.fixture?.date,
    venue: r.fixture?.venue?.name,
    city: r.fixture?.venue?.city,
    status: r.fixture?.status?.short,
    leagueId: r.league?.id,
    home: {
      id: r.teams?.home?.id,
      name: r.teams?.home?.name,
      logo: r.teams?.home?.logo,
    },
    away: {
      id: r.teams?.away?.id,
      name: r.teams?.away?.name,
      logo: r.teams?.away?.logo,
    },
  }));
}

/* =========================
   Fixture by id (detaljer)
   ========================= */

/**
 * Henter en fixture ved id; returnerer første resultat eller null.
 */
export async function fetchFixtureById(fixtureId) {
  const url = buildURL("/fixtures", { id: fixtureId });
  const data = await getJson(url);
  return (data.response || [])[0] || null;
}

/* =========================
   Head-to-Head (last X FT)
   ========================= */

/**
 * H2H seneste 'last' kampe med status FT.
 *  -> array af fixtures (samme form som API’et leverer)
 */
export async function fetchH2H(homeTeamId, awayTeamId, last = 5) {
  const url = buildURL("/fixtures/headtohead", {
    h2h: `${homeTeamId}-${awayTeamId}`,
    status: "ft",
    last,
  });
  const data = await getJson(url);
  return data.response || [];
}

/* =========================
   Team season statistics
   ========================= */

/**
 * Team statistics for league+team+season (2025 som default)
 *  -> API “teams/statistics” response (vi returnerer response-objektet)
 */
export async function fetchTeamStats(leagueId, teamId, season = 2025) {
  const url = buildURL("/teams/statistics", {
    league: leagueId,
    team: teamId,
    season,
  });
  const data = await getJson(url);
  return data.response || null;
}

/* =========================
   Fixture statistics
   ========================= */

/**
 * Statistik for en fixture for begge hold:
 *  Returnerer et objekt:
 *   {
 *     [teamId]: {
 *       id, name, logo,
 *       stats: { "Shots on Goal": 7, "Ball Possession": 68, ... }
 *     },
 *     ...
 *   }
 */
export async function fetchFixtureStatistics(fixtureId) {
  const url = buildURL("/fixtures/statistics", { fixture: fixtureId });
  const data = await getJson(url);

  const teams = {};
  for (const row of data.response || []) {
    const tid = row.team?.id;
    if (!tid) continue;
    const stats = {};
    for (const s of row.statistics || []) {
      stats[s.type] = parseStatValue(s.value);
    }
    teams[tid] = {
      id: tid,
      name: row.team?.name,
      logo: row.team?.logo,
      stats,
    };
  }
  return teams;
}
