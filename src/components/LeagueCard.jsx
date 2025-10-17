import { useStarredLeagues } from "../store/useStarredLeagues";
import { motion } from "framer-motion";

export default function LeagueCard({ league, children }) {
  const { toggle, isStarred } = useStarredLeagues();
  const active = isStarred(league.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.18 }}
      className="card card-pad"
    >
      <div className="flex items-center gap-3">
        <img
          src={league.logo || ""}
          alt=""
          className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white/10 object-contain"
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{league.name}</div>
          <div className="text-xs muted truncate">{league.country}</div>
        </div>
        <button
          onClick={() => toggle(league.id)}
          title={active ? "Unstar" : "Star"}
          className="text-base md:text-lg"
          aria-label="toggle favorite"
        >
          <motion.span
            animate={{ scale: active ? 1.12 : 1.0, rotate: active ? 10 : 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 16 }}
            className={
              active ? "text-neonBlue" : "text-white/70 dark:text-white/60"
            }
          >
            ★
          </motion.span>
        </button>
      </div>

      {/* inline content (fixtures) */}
      {children ? <div className="mt-3">{children}</div> : null}
    </motion.div>
  );
}
