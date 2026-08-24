import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken, type Utilisateur } from './api';
import { realtime } from './realtime';

interface AuthCtx {
  user: Utilisateur | null;
  loading: boolean;
  connexion: (email: string, mdp: string) => Promise<void>;
  inscription: (data: Record<string, string>) => Promise<void>;
  deconnexion: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.get<Utilisateur>('/api/auth/moi')
      .then(u => { setUser(u); realtime.connect(); })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const connexion = async (email: string, mot_de_passe: string) => {
    const r = await api.post<{ token: string; utilisateur: Utilisateur }>(
      '/api/auth/connexion', { email, mot_de_passe }
    );
    setToken(r.token);
    setUser(r.utilisateur);
    realtime.connect();
  };

  const inscription = async (data: Record<string, string>) => {
    const r = await api.post<{ token: string; utilisateur: Utilisateur }>(
      '/api/auth/inscription', data
    );
    setToken(r.token);
    setUser(r.utilisateur);
    realtime.connect();
  };

  const deconnexion = () => {
    clearToken();
    setUser(null);
    realtime.disconnect();
  };

  return (
    <Ctx.Provider value={{ user, loading, connexion, inscription, deconnexion }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
