import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, Radio, Fingerprint, Shield } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import rpiBg from '../assets/rpi-building.png';

export default function Connexion() {
  const { connexion, inscription } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'connexion' | 'inscription'>('connexion');
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
      setErreur(err instanceof Error ? err.message : 'Identifiants incorrects');
    } finally { setLoading(false); }
  };

  const handleInscription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur(''); setLoading(true);
    const fd = new FormData(e.currentTarget);
    if (fd.get('mdp') !== fd.get('mdp2')) {
      setErreur('Les mots de passe ne correspondent pas');
      setLoading(false); return;
    }
    try {
      await inscription({
        nom: fd.get('nom') as string,
        secteur: fd.get('secteur') as string,
        ville: fd.get('ville') as string,
        responsable: fd.get('responsable') as string,
        email: fd.get('email') as string,
        telephone: fd.get('telephone') as string,
        mot_de_passe: fd.get('mdp') as string,
      });
      navigate('/');
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', minHeight: '100vh', gridTemplateColumns: '1fr 1fr' }}
      className="connexion-grid">

      {/* ── Panneau gauche — Photo RPI ─────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden' }} className="left-panel">
        {/* Photo de fond */}
        <img
          src={rpiBg}
          alt="Régie du Patrimoine Immobilier du PAD — Douala"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }}
        />
        {/* Overlay dégradé */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(10,18,42,0.82) 0%, rgba(10,18,42,0.55) 50%, rgba(10,18,42,0.75) 100%)',
        }} />

        {/* Contenu sur la photo */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', height: '100%',
          padding: '40px',
        }}>
          {/* Logo BISS en haut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48,
              background: '#1A3A8F',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(26,58,143,0.5)',
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: 900, color: '#fff', fontSize: 22 }}>B</span>
            </div>
            <div>
              <p style={{ fontWeight: 800, color: '#fff', fontSize: 20, margin: 0, letterSpacing: '-0.5px' }}>BISS 2</p>
              <p style={{ color: '#E8B400', fontSize: 10, margin: 0, letterSpacing: '3px', fontWeight: 600 }}>ACCESS CONTROL</p>
            </div>
          </div>

          {/* Texte central */}
          <div style={{ maxWidth: 440 }}>
            {/* Badge RPI */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(232,180,0,0.15)',
              border: '1px solid rgba(232,180,0,0.4)',
              borderRadius: 50, padding: '6px 16px',
              marginBottom: 20,
            }}>
              <Shield size={14} style={{ color: '#E8B400' }} />
              <span style={{ color: '#E8B400', fontSize: 12, fontWeight: 600 }}>
                Régie du Patrimoine Immobilier du PAD
              </span>
            </div>

            <h2 style={{
              color: '#fff', fontWeight: 800,
              fontSize: 34, lineHeight: 1.15,
              margin: '0 0 16px',
              textShadow: '0 2px 20px rgba(0,0,0,0.4)',
            }}>
              Le contrôle d'accès RFID intelligent,{' '}
              <span style={{ color: '#E8B400' }}>made in Cameroun.</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
              BISS 2 relie vos modules ESP32, vos badges RFID et votre registre
              de présence dans une seule console temps réel.
            </p>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                [ShieldCheck, 'Autorisations par horaire, statut et expiration'],
                [Radio, "Flux d'accès en direct sur chaque porte"],
                [Fingerprint, 'Enrôlement des badges par scan RFID'],
              ].map(([Icon, text], i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30,
                    background: 'rgba(232,180,0,0.15)',
                    border: '1px solid rgba(232,180,0,0.3)',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {/* @ts-ignore */}
                    <Icon size={15} style={{ color: '#E8B400' }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{text as string}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
            BISS TECH — Douala, Cameroun · «&nbsp;La marque du futur&nbsp;»
          </p>
        </div>
      </div>

      {/* ── Panneau droit — Formulaire ─────────────────────── */}
      <div style={{
        background: '#0F172A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Logo mobile uniquement */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}
            className="mobile-logo">
            <div style={{ width: 40, height: 40, background: '#1A3A8F', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontWeight: 900, color: '#fff', fontSize: 18 }}>B</span>
            </div>
            <div>
              <p style={{ fontWeight: 800, color: '#fff', fontSize: 16, margin: 0 }}>BISS 2</p>
              <p style={{ color: '#E8B400', fontSize: 9, margin: 0, letterSpacing: '2px' }}>ACCESS CONTROL</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.05)',
            borderRadius: 12, padding: 4, marginBottom: 28,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {(['connexion', 'inscription'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setErreur(''); }}
                style={{
                  flex: 1, padding: '9px 0',
                  borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                  background: tab === t ? '#1A3A8F' : 'transparent',
                  color: tab === t ? '#fff' : 'rgba(255,255,255,0.45)',
                  boxShadow: tab === t ? '0 4px 12px rgba(26,58,143,0.4)' : 'none',
                }}>
                {t === 'connexion' ? 'Connexion' : 'Nouvelle société'}
              </button>
            ))}
          </div>

          {/* Titre */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 22, margin: '0 0 4px' }}>
              {tab === 'connexion' ? 'Bienvenue' : 'Créer un espace'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>
              {tab === 'connexion'
                ? 'Connectez-vous à votre console BISS 2'
                : 'Enregistrez votre société pour commencer'}
            </p>
          </div>

          {/* Erreur */}
          {erreur && (
            <div style={{
              marginBottom: 16,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 14px',
              color: '#FCA5A5', fontSize: 13,
            }}>
              {erreur}
            </div>
          )}

          {/* Formulaire connexion */}
          {tab === 'connexion' && (
            <form onSubmit={handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <F label="Email" name="email" type="email" placeholder="contact@societe.cm" />
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <input name="mdp" type={showPass ? 'text' : 'password'}
                    placeholder="••••••••" required
                    style={inputStyle} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{
                  padding: '12px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #1A3A8F, #2A4DB0)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: loading ? 0.7 : 1, marginTop: 4,
                  boxShadow: '0 4px 20px rgba(26,58,143,0.4)',
                  transition: 'all 0.2s',
                }}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Se connecter
              </button>

              {/* Démo */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '12px 14px',
                marginTop: 4,
              }}>
                <p style={{ color: '#E8B400', fontSize: 11, fontWeight: 600, margin: '0 0 6px' }}>
                  Comptes de démonstration
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '0 0 2px' }}>
                  Société : <span style={{ color: '#E8B400' }}>demo@camrail.cm</span> / password
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0 }}>
                  Admin BISS : <span style={{ color: '#E8B400' }}>admin@biss.tech</span> / password
                </p>
              </div>
            </form>
          )}

          {/* Formulaire inscription */}
          {tab === 'inscription' && (
            <form onSubmit={handleInscription} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Nom de la société *" name="nom" placeholder="BISS Tech" required />
                <F label="Secteur" name="secteur" placeholder="Sécurité" />
                <F label="Ville" name="ville" placeholder="Douala" />
                <F label="Responsable" name="responsable" placeholder="Nom complet" />
                <F label="Téléphone" name="telephone" type="tel" placeholder="+237 6XX XXX XXX" />
                <F label="Email *" name="email" type="email" placeholder="contact@societe.cm" required />
                <F label="Mot de passe *" name="mdp" type="password" placeholder="Min. 6 caractères" required />
                <F label="Confirmer *" name="mdp2" type="password" placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading}
                style={{
                  padding: '12px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #1A3A8F, #2A4DB0)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: loading ? 0.7 : 1, marginTop: 4,
                  boxShadow: '0 4px 20px rgba(26,58,143,0.4)',
                }}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Créer mon espace
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .connexion-grid { grid-template-columns: 1fr !important; }
          .left-panel { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-logo { display: none !important; }
        }
        input:focus { outline: none; border-color: #1A3A8F !important; box-shadow: 0 0 0 3px rgba(26,58,143,0.2); }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff', fontSize: 13,
  boxSizing: 'border-box',
  transition: 'all 0.2s',
};

function F({ label, name, type = 'text', placeholder = '', required = false }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>
        {label}
      </label>
      <input name={name} type={type} placeholder={placeholder} required={required}
        style={inputStyle} />
    </div>
  );
}
