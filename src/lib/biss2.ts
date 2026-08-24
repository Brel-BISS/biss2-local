import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ETAGES = ['RDC','1er étage','2ème étage','3ème étage','Sous-sol','Toiture','Autre'] as const;
export const TYPES_ACCES = ['Entrée','Sortie','Entrée/Sortie','Parking','Ascenseur','Autre'] as const;
export const JOURS = [
  { code: 'L', label: 'Lun' }, { code: 'M', label: 'Mar' }, { code: 'E', label: 'Mer' },
  { code: 'J', label: 'Jeu' }, { code: 'V', label: 'Ven' }, { code: 'S', label: 'Sam' }, { code: 'D', label: 'Dim' },
] as const;

export function niveauLabel(n?: number | null) {
  if (n === 3) return 'Haute sécurité';
  if (n === 2) return 'Restreint';
  return 'Standard';
}
export function niveauClass(n?: number | null) {
  if (n === 3) return 'border-red-500/40 bg-red-500/15 text-red-400';
  if (n === 2) return 'border-amber-500/40 bg-amber-500/15 text-amber-400';
  return 'border-blue-500/50 bg-blue-500/20 text-blue-300';
}
export function statutOtaClass(s?: string | null) {
  if (s === 'succes')   return 'border-green-500/40 bg-green-500/15 text-green-400';
  if (s === 'echec')    return 'border-red-500/40 bg-red-500/15 text-red-400';
  if (s === 'en_cours') return 'border-blue-500/50 bg-blue-500/20 text-blue-300';
  return 'border-slate-600 bg-slate-800 text-slate-400';
}
export const OTA_LABELS: Record<string, string> = {
  en_attente: 'En attente', en_cours: 'En cours', succes: 'Succès', echec: 'Échec',
};
export function signalBars(rssi?: number | null) {
  if (!rssi) return 0;
  if (rssi >= -55) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -75) return 2;
  return 1;
}
export function ilYA(v?: string | null) {
  if (!v) return 'jamais';
  return formatDistanceToNow(new Date(v), { addSuffix: true, locale: fr });
}
export function fmtDateTime(v?: string | null) {
  if (!v) return '—';
  return format(new Date(v), 'dd MMM yyyy HH:mm', { locale: fr });
}
export function fmtVersion(v?: string | null) {
  if (!v) return '—';
  return v.startsWith('v') ? v : `v${v}`;
}
export function localisation(m: { batiment?: string|null; etage?: string|null; lieu?: string|null }) {
  return [m.batiment, m.etage, m.lieu].filter(Boolean).join(' — ') || 'Localisation non renseignée';
}
export function resultatClass(r?: string | null) {
  if (r === 'Autorisé') return 'border-green-500/40 bg-green-500/15 text-green-400';
  if (r === 'Alarme')   return 'border-red-500/40 bg-red-500/15 text-red-400';
  return 'border-amber-500/40 bg-amber-500/15 text-amber-400';
}
