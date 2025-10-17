import Topbar from "./components/Topbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import RoutesView from "./routes.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-bg dark:text-slate-100 font-sans">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-6 md:px-8 pt-6 pb-12">
          <RoutesView />
        </main>
      </div>
    </div>
  );
}
