import { NavLink } from "react-router-dom";

const Item = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `block px-4 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${
        isActive ? "bg-black/5 dark:bg-white/10" : ""
      }`
    }
  >
    {children}
  </NavLink>
);

export default function Sidebar() {
  return (
    <aside className="hidden md:block w-60 glass border-r border-black/10 dark:border-white/10 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-2">
        <Item to="/leagues">🏆 Leagues</Item>
        <Item to="/settings">⚙ Settings</Item>
      </nav>
    </aside>
  );
}
