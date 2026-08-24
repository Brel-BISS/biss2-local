import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth';

import Connexion    from './pages/Connexion';
import Dashboard    from './pages/Dashboard';
import Personnel    from './pages/Personnel';
import Registre     from './pages/Registre';
import Tracabilite  from './pages/Tracabilite';
import Serrure      from './pages/Serrure';
import Reglages     from './pages/Reglages';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10000 } }
});

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A3A8F] shadow-2xl animate-pulse">
          <span className="font-black text-white text-3xl">B</span>
        </div>
        <p className="text-sm text-slate-400">Chargement BISS 2...</p>
      </div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/connexion" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/" element={<Guard><Dashboard /></Guard>} />
            <Route path="/personnel" element={<Guard><Personnel /></Guard>} />
            <Route path="/registre" element={<Guard><Registre /></Guard>} />
            <Route path="/tracabilite" element={<Guard><Tracabilite /></Guard>} />
            <Route path="/serrure" element={<Guard><Serrure /></Guard>} />
            <Route path="/reglages" element={<Guard><Reglages /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: { background: '#1E293B', border: '1px solid #334155', color: '#E2E8F0' }
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
