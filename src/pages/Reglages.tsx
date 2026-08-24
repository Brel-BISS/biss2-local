import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Upload, Cpu, Loader2, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '../components/biss/AppShell';
import { api, type Societe, type FirmwareVersion } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtVersion, fmtDateTime } from '../lib/biss2';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Reglages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'societe'|'firmware'>('societe');
  const [fwOpen, setFwOpen] = useState(false);

  const { data: societe } = useQuery<Societe>({
    queryKey: ['societe', user?.societe_id],
    queryFn: () => api.get(`/api/societes/${user?.societe_id}`),
    enabled: !!user?.societe_id,
  });

  const { data: firmwares = [] } = useQuery<FirmwareVersion[]>({
    queryKey: ['firmwares'],
    queryFn: () => api.get('/api/firmwares'),
  });

  const socMut = useMutation({
    mutationFn: (data: Partial<Societe>) => api.put(`/api/societes/${user?.societe_id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['societe'] }); toast.success('Réglages sauvegardés'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const fwMut = useMutation({
    mutationFn: (data: Partial<FirmwareVersion>) => api.post('/api/firmwares', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['firmwares'] }); setFwOpen(false); toast.success('Firmware ajouté'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Réglages">
      <div className="max-w-2xl">
        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-800/60 p-1 mb-6">
          {[['societe','Société'], ['firmware','Firmware OTA']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t as 'societe'|'firmware')}
              className={cn('flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                tab === t ? 'bg-[#1A3A8F] text-white shadow' : 'text-slate-400 hover:text-white')}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'societe' && (
          <div className="rounded-xl border border-slate-700/60 bg-[#1E293B] p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="size-5 text-[#1A3A8F]" />
              <h2 className="font-semibold text-white">Informations de la société</h2>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data: Record<string,string> = {};
              fd.forEach((v,k) => { data[k] = v as string; });
              socMut.mutate(data as unknown as Partial<Societe>);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Nom *" name="nom" defaultValue={societe?.nom} required />
                <F label="Secteur" name="secteur" defaultValue={societe?.secteur||''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Ville" name="ville" defaultValue={societe?.ville||'Douala'} />
                <F label="Responsable" name="responsable" defaultValue={societe?.responsable||''} />
              </div>
              <F label="Email" name="email" type="email" defaultValue={societe?.email||''} />
              <F label="Téléphone" name="telephone" defaultValue={societe?.telephone||''} />
              <button type="submit" disabled={socMut.isPending}
                className="flex items-center gap-2 rounded-xl bg-[#1A3A8F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50">
                {socMut.isPending && <Loader2 className="size-4 animate-spin" />} Sauvegarder
              </button>
            </form>

            {/* Info connexion ESP32 */}
            <div className="mt-6 rounded-xl border border-[#E8B400]/20 bg-[#E8B400]/5 p-4">
              <p className="text-xs font-semibold text-[#E8B400] mb-2 flex items-center gap-1">
                <Cpu className="size-3.5" /> Configuration ESP32 — BISS 2 Firmware
              </p>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">BASE_URL</span>
                  <span className="text-white">http://&lt;IP_SERVEUR&gt;:3001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">API_KEY</span>
                  <span className="text-[#E8B400]">biss2_esp32_key</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SOCIETE_ID</span>
                  <span className="text-[#E8B400]">{user?.societe_id || 'soc-demo'}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Modifiez ces 3 valeurs dans votre .ino et le firmware se connecte directement à ce serveur local.
              </p>
            </div>
          </div>
        )}

        {tab === 'firmware' && (
          <div className="rounded-xl border border-slate-700/60 bg-[#1E293B] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
              <div className="flex items-center gap-2">
                <Cpu className="size-5 text-blue-400" />
                <h2 className="font-semibold text-white">Versions firmware</h2>
              </div>
              <button onClick={() => setFwOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#1A3A8F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition">
                <Plus className="size-3.5" /> Ajouter
              </button>
            </div>
            <div className="divide-y divide-slate-700/40">
              {firmwares.map(fw => (
                <div key={fw.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-semibold text-white">{fmtVersion(fw.version)}</p>
                    <p className="text-xs text-slate-400">{fw.description||'Sans description'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {fw.taille_kb} KB • ajouté le {fmtDateTime(fw.cree_le)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={fw.fichier_url} target="_blank" rel="noreferrer"
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition">
                      <Upload className="size-3.5 inline mr-1" />URL
                    </a>
                  </div>
                </div>
              ))}
              {firmwares.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Aucun firmware. Ajoutez un fichier .bin compilé depuis Arduino IDE.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog ajout firmware */}
      {fwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFwOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#1E293B] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Cpu className="size-5 text-blue-400" /> Nouveau firmware
            </h2>
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fwMut.mutate({
                version: fd.get('version') as string,
                description: fd.get('description') as string,
                fichier_url: fd.get('fichier_url') as string,
                taille_kb: parseInt(fd.get('taille_kb') as string)||0,
                checksum_md5: fd.get('checksum_md5') as string,
              });
            }} className="space-y-3">
              <F label="Version *" name="version" placeholder="4.2.0" required />
              <F label="Description" name="description" placeholder="Correctif stabilité WiFi" />
              <F label="URL du fichier .bin *" name="fichier_url"
                placeholder="http://192.168.1.100:8080/firmware_v4.2.0.bin" required />
              <div className="grid grid-cols-2 gap-3">
                <F label="Taille (KB)" name="taille_kb" type="number" placeholder="512" />
                <F label="MD5 checksum" name="checksum_md5" placeholder="abc123..." />
              </div>
              <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3 text-xs text-slate-400">
                <p className="font-semibold text-slate-300 mb-1">Héberger le .bin localement :</p>
                <p>Dans le dossier du firmware compilé :</p>
                <code className="text-[#E8B400] block mt-1">python3 -m http.server 8080</code>
                <p className="mt-1">Le fichier sera accessible à l'ESP32 via ce réseau local.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setFwOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition">Annuler</button>
                <button type="submit" disabled={fwMut.isPending}
                  className="rounded-xl bg-[#1A3A8F] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                  {fwMut.isPending && <Loader2 className="size-4 animate-spin" />} Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function F({ label, name, type='text', defaultValue='', placeholder='', required=false }: {
  label:string; name:string; type?:string; defaultValue?:string; placeholder?:string; required?:boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#1A3A8F] focus:outline-none" />
    </div>
  );
}
