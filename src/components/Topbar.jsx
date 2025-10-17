export default function Topbar() {
  return (
    <div className="sticky top-0 z-40 h-16 glass border-b border-white/10 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <div className="text-xl font-bold neon-text">FOOTYDATA</div>
        <input
          className="hidden md:block glass rounded-xl h-10 px-4 w-[420px] border border-white/10 outline-none"
          placeholder="Search leagues, teams, fixtures..."
        />
      </div>
      <div className="w-10 h-10 rounded-full glass border border-white/10" />
    </div>
  );
}
