// ================================================================
//  BISS 2 — Client API local (remplace @supabase/supabase-js)
//  BISS Tech — Douala, Cameroun
// ================================================================

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WS_URL   = import.meta.env.VITE_WS_URL  || 'ws://localhost:3001';

// ── Auth token ────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem('biss2_token');
}
export function setToken(t: string) {
  localStorage.setItem('biss2_token', t);
}
export function clearToken() {
  localStorage.removeItem('biss2_token');
  localStorage.removeItem('biss2_user');
}

// ── Fetch helper ─────────────────────────────────────────────────
async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  pub = false
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!pub) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.erreur || `Erreur ${r.status}`);
  return data as T;
}

export const api = {
  get:    <T>(path: string) => req<T>('GET', path),
  post:   <T>(path: string, body: unknown) => req<T>('POST', path, body),
  put:    <T>(path: string, body: unknown) => req<T>('PUT', path, body),
  delete: <T>(path: string) => req<T>('DELETE', path),
};

// ── Types ─────────────────────────────────────────────────────────
export interface Utilisateur {
  id: string;
  email: string;
  societe_id: string | null;
  est_admin: boolean;
  societe_nom?: string;
}

export interface Societe {
  id: string; nom: string; secteur: string; ville: string;
  responsable: string; email: string; telephone: string; cree_le: string;
}

export interface ModuleSysteme {
  id: string; societe_id: string; nom: string; mac: string | null;
  ip: string | null; ssid: string | null; en_ligne: boolean | null;
  dernier_contact: string | null; description: string | null;
  lieu: string | null; batiment: string | null; etage: string | null;
  type_acces: string | null; photo_url: string | null;
  coordonnees_gps: { lat: number | null; lng: number | null } | null;
  horaires_actifs: { debut: string; fin: string; jours: string } | null;
  niveau_securite: number | null; firmware_version: string | null;
  rssi: number | null; duree_ouverture: number | null;
  mode_enrolement: boolean | null; mode_enrolement_type?: string | null;
  enrolement_expire_le: string | null; cree_le: string | null; cree_par: string | null;
}

export interface Personnel {
  id: string; societe_id: string; uid: string; nom: string; prenom: string | null;
  departement: string | null; poste: string | null; matricule: string | null;
  telephone: string | null; email: string; photo_url: string | null;
  type_badge: 'Standard' | 'Admin' | 'Invité'; heure_debut: string | null;
  heure_fin: string | null; expiration: string | null;
  statut: 'Actif' | 'Inactif' | 'Blacklisté'; notes: string; enrole_le: string;
}

export interface AccesLog {
  id: string; societe_id: string; horodatage: string; uid: string;
  nom: string | null; prenom: string | null; departement: string | null;
  porte_id: string | null; sens: 'Entrée' | 'Sortie';
  resultat: 'Autorisé' | 'Refusé' | 'Alarme'; raison: string | null;
}

export interface FirmwareVersion {
  id: string; societe_id: string; version: string; description: string | null;
  fichier_url: string; taille_kb: number | null; checksum_md5: string | null;
  cree_le: string | null; cree_par: string | null;
}

export interface OtaDeploiement {
  id: string; societe_id: string; firmware_id: string | null;
  systeme_id: string | null; statut: 'en_attente' | 'en_cours' | 'succes' | 'echec';
  progression: number | null; version_avant: string | null; version_apres: string | null;
  message_erreur: string | null; demarre_le: string | null; termine_le: string | null;
}

export interface EnrolementAttente {
  id: number; societe_id: string; uid: string; module_id: string; horodatage: string; traite: boolean;
}

export interface DashboardData {
  kpi: { total_jour: string; ok_jour: string; refus_jour: string; total_all: string };
  par_heure: { heure: number; ok: string; refus: string }[];
  modules: Pick<ModuleSysteme, 'id'|'nom'|'en_ligne'|'ip'|'firmware_version'|'rssi'|'dernier_contact'>[];
}
