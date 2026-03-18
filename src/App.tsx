import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useMyName } from './hooks';
import { NameSetup } from './components/NameSetup';
import { NavBar } from './components/NavBar';
import { PullToRefresh } from './components/PullToRefresh';
import { RefreshProvider, useRefreshAll } from './RefreshContext';
import { Dashboard } from './pages/Dashboard';
import { LendCard } from './pages/LendCard';
import { BorrowCard } from './pages/BorrowCard';
import { Import } from './pages/Import';
import { History } from './pages/History';
import { Settings } from './pages/Settings';

function AppContent() {
  const refreshAll = useRefreshAll();
  return (
    <PullToRefresh onRefresh={refreshAll}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lend" element={<LendCard />} />
        <Route path="/borrow" element={<BorrowCard />} />
        <Route path="/import" element={<Import />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </PullToRefresh>
  );
}

function App() {
  const { name, loading, updateName } = useMyName();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!name) {
    return <NameSetup onSave={updateName} />;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RefreshProvider>
        <div className="flex flex-col h-full">
          <AppContent />
          <NavBar />
        </div>
      </RefreshProvider>
    </BrowserRouter>
  );
}

export default App;
