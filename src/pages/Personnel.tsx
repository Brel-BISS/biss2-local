import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Search, Trash2, Edit2, Loader2, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { AppShell } from '../components/biss/AppShell';
import { api, type Personnel } from '../lib/api';
import { realtime } from '../lib/realtime';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const DEPT_COLORS: Record<string,string> = {
  'Direction': 'bg-[#E8B400]/15 text-[#E8B400] border-[#E8B400]/30',
  'Technique': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Comptabilité': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Commercial': 'bg-green-500/15 text-green-400 border-green-500/30',
  'Sécurité': 'bg-red-500/15 text-red-400 border-red-500/30',
  'Prestataire': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};
const statutIcon = { Actif: UserCheck, Inactif: UserX, Blacklisté: AlertTriangle };
const statutColor = { Actif: 'text-green-400', Inactif: 'text-slate-400', Blacklisté: 'text-red-400' };

export default function PersonnelPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [uid, setUid] = useState('');

  const { data: personnel = [], isLoading } = useQuery<Personnel[]>({
    queryKey: ['personnel'],
    queryFn: () => api.get('/api/personnel'),
  });

  // Écoute badge scanné
  useEffect(() => {
    const unsub = realtime.on('enrolement_attente', (data: unknown) => {
      const e = data as { uid: string };
      setUid(e.uid);
      toast.info(`Badge détecté : ${e.uid}`, { description: 'Complétez le formulaire pour enrôler.' });
    });
    return unsub;
  }, []);

  const saveMut = useMutation({
    mutationFn: (p: Partial<Personnel>) =>
      editing ? api.put(`/api/personnel/${editing.id}`, p) : api.post('/api/personnel', p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] });
      setDialogOpen(false); setEditing(null); setUid('');
      toast.success(editing ? 'Personnel mis à jour' : 'Personnel enrôlé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/personnel/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['personnel'] }); toast.success('Supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = personnel.filter(p =>
    `${p.nom} ${p.prenom} ${p.uid} ${p.departement}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => { data[k] = v as string; });
    saveMut.mutate(data as unknown as Partial<Personnel>);
  };

  return (
    <AppShell title="Personnel">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#1A3A8F] focus:outline-none" />
        </div>
        <button onClick={() => { setEditing(null); setUid(''); setDialogOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-[#1A3A8F] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
          <Plus className="size-4" /> Ajouter
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-[#1A3A8F]" /></div>
      ) : (
        <div className="rounded-xl border border-slate-700/60 bg-[#1E293B] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs text-slate-400">
                  {['Nom', 'UID', 'Département', 'Badge', 'Horaires', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const Icon = statutIcon[p.statut] || UserCheck;
                  return (
                    <tr key={p.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{p.nom} {p.prenom}</p>
                        <p className="text-[10px] text-slate-500">{p.poste||'—'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#E8B400]">{p.uid}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          DEPT_COLORS[p.departement||''] || 'bg-slate-700/30 text-slate-400 border-slate-600')}>
                          {p.departement||'—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{p.type_badge}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {p.heure_debut && p.heure_fin ? `${p.heure_debut}–${p.heure_fin}` : 'Libre'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('flex items-center gap-1 text-xs', statutColor[p.statut])}>
                          <Icon className="size-3" /> {p.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditing(p); setUid(p.uid); setDialogOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition">
                            <Edit2 className="size-3.5" />
                          </button>
                          <button onClick={() => { if (confirm('Supprimer ?')) delMut.mutate(p.id); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-500">Aucun personnel trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDialogOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#1E293B] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">{editing ? 'Modifier' : 'Enrôler'} un badge</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-xs text-slate-400">
                <p className="font-semibold text-slate-300 mb-1">UID Badge (RFID)</p>
                <input name="uid" defaultValue={editing?.uid||uid} readOnly={!!editing}
                  placeholder="Passez la carte devant le lecteur..."
                  className="w-full bg-transparent font-mono text-[#E8B400] outline-none placeholder-slate-600 text-sm" />
                {!editing && <p className="mt-1 text-slate-500">Ou tapez l'UID manuellement</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nom *" name="nom" defaultValue={editing?.nom} required />
                <FormField label="Prénom" name="prenom" defaultValue={editing?.prenom||''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Département" name="departement" defaultValue={editing?.departement||''} />
                <FormField label="Poste" name="poste" defaultValue={editing?.poste||''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Matricule" name="matricule" defaultValue={editing?.matricule||''} />
                <FormField label="Téléphone" name="telephone" defaultValue={editing?.telephone||''} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Type de badge</label>
                <select name="type_badge" defaultValue={editing?.type_badge||'Standard'}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-[#1A3A8F] focus:outline-none">
                  {['Standard','Admin','Invité'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Statut</label>
                <select name="statut" defaultValue={editing?.statut||'Actif'}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-[#1A3A8F] focus:outline-none">
                  {['Actif','Inactif','Blacklisté'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Heure début" name="heure_debut" type="time" defaultValue={editing?.heure_debut||''} />
                <FormField label="Heure fin" name="heure_fin" type="time" defaultValue={editing?.heure_fin||''} />
              </div>
              <FormField label="Expiration" name="expiration" type="date" defaultValue={editing?.expiration||''} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDialogOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition">
                  Annuler
                </button>
                <button type="submit" disabled={saveMut.isPending}
                  className="rounded-xl bg-[#1A3A8F] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                  {saveMut.isPending && <Loader2 className="size-4 animate-spin" />} Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function FormField({ label, name, type='text', defaultValue='', required=false }: {
  label: string; name: string; type?: string; defaultValue?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-[#1A3A8F] focus:outline-none" />
    </div>
  );
}
