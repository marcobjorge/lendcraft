import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/lend', label: 'Lend', icon: '📤' },
  { path: '/import', label: 'Import', icon: '📥' },
  { path: '/history', label: 'History', icon: '📋' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
] as const;

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <nav className="shrink-0 bg-slate-800 border-t border-slate-700">
      <div className="flex justify-around items-center h-14">
        {tabs.map(tab => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate({
                  pathname: tab.path,
                  search: searchParams.toString(),
                })
              }
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                active ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
