import { Routes, Route, Navigate } from "react-router-dom";
import Leagues from "./pages/Leagues.jsx";
import Settings from "./pages/Settings.jsx";
import Match from "./pages/Match.jsx"; // <- VIGTIG

export default function RoutesView() {
  return (
    <Routes>
      <Route path="/" element={<Leagues />} />
      <Route path="/leagues" element={<Leagues />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/match/:fixtureId" element={<Match />} /> {/* <- VIGTIG */}
      {/* Vis en simpel 404 i stedet for at redirecte til "/" (gør debugging nemmere) */}
      <Route
        path="*"
        element={<div style={{ padding: 16 }}>404 – route ikke fundet</div>}
      />
    </Routes>
  );
}
