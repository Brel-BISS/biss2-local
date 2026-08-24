import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';

export default function Connexion() {
  const { connexion, inscription } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'connexion'|'inscription'>('connexion');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const handleConnexion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur(''); setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await connexion(fd.get('email') as string, fd.get('mdp') as string);
      navigate('/');
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally { setLoading(false); }
  };

  const handleInscription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur(''); setLoading(true);
    const fd = new FormData(e.currentTarget);
    if (fd.get('mdp') !== fd.get('mdp2')) { setErreur('Mots de passe différents'); setLoading(false); return; }
    try {
      await inscription({
        nom: fd.get('nom') as string, secteur: fd.get('secteur') as string,
        ville: fd.get('ville') as string, responsable: fd.get('responsable') as string,
        email: fd.get('email') as string, telephone: fd.get('telephone') as string,
        mot_de_passe: fd.get('mdp') as string,
      });
      navigate('/');
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de l\'inscription');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {/* Panel gauche */}
      <div className="hidden lg:flex w-2/5 flex-col items-center justify-center bg-gradient-to-br from-[#1A3A8F] to-[#0F172A] p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #E8B400 0%, transparent 60%)' }} />
        <div className="relative z-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur mx-auto mb-6 shadow-2xl">
            <span className="font-black text-white text-4xl">B</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">BISS 2</h1>
          <p className="text-[#E8B400] font-semibold tracking-widest text-sm uppercase mb-8">Access Control</p>
          <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
            Système intelligent de contrôle d'accès RFID et de suivi de présence pour entreprises.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-center">
            {[['100%', 'Local'], ['ESP32', 'Firmware'], ['Temps réel', 'WebSocket'], ['PostgreSQL', 'Local DB']].map(([val, lab]) => (
              <div key={lab} className="rounded-xl bg-white/5 p-3">
                <p className="text-[#E8B400] font-bold text-lg">{val}</p>
                <p className="text-slate-400 text-xs">{lab}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 mt-auto text-xs text-slate-500">
          BISS Tech — Douala, Cameroun • «&nbsp;La marque du futur&nbsp;»
        </p>
      </div>

      {/* Panel droit */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A3A8F]">
              <span className="font-black text-white text-xl">B</span>
            </div>
            <div>
              <p className="font-bold text-white">BISS 2</p>
              <p className="text-[10px] text-[#E8B400] tracking-widest uppercase">Access Control</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-800/60 p-1 mb-6">
            {(['connexion','inscription'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setErreur(''); }}
                className={cn('flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                  tab === t ? 'bg-[#1A3A8F] text-white shadow' : 'text-slate-400 hover:text-white')}>
                {t === 'connexion' ? 'Connexion' : 'Nouvelle société'}
              </button>
            ))}
          </div>

          {erreur && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {erreur}
            </div>
          )}

          {tab === 'connexion' ? (
            <form onSubmit={handleConnexion} className="space-y-4">
              <Field label="Email" name="email" type="email" placeholder="admin@biss.tech" />
              <Field label="Mot de passe" name="mdp" type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                suffix={
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400 hover:text-white">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-[#1A3A8F] py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="size-4 animate-spin" />} Se connecter
              </button>
              <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3 text-xs text-slate-400">
                <p className="font-semibold text-slate-300 mb-1">Comptes de démo :</p>
                <p>Admin : <code className="text-[#E8B400]">admin@biss.tech</code> / <code className="text-[#E8B400]">password</code></p>
                <p>Démo :  <code className="text-[#E8B400]">demo@camrail.cm</code> / <code className="text-[#E8B400]">password</code></p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleInscription} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nom de la société" name="nom" placeholder="BISS Tech" required />
                <Field label="Secteur" name="secteur" placeholder="Sécurité" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ville" name="ville" placeholder="Douala" />
                <Field label="Responsable" name="responsable" placeholder="Nom complet" />
              </div>
              <Field label="Téléphone" name="telephone" type="tel" placeholder="+237 6XX XXX XXX" />
              <Field label="Email de connexion" name="email" type="email" placeholder="contact@societe.cm" required />
              <Field label="Mot de passe" name="mdp" type="password" placeholder="Minimum 8 caractères" required />
              <Field label="Confirmer le mot de passe" name="mdp2" type="password" placeholder="••••••••" required />
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-[#1A3A8F] py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="size-4 animate-spin" />} Créer mon espace
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', placeholder, required = false, suffix }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <input name={name} type={type} placeholder={placeholder} required={required}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#1A3A8F] focus:outline-none focus:ring-1 focus:ring-[#1A3A8F]" />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}
