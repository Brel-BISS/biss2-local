import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Wifi, WifiOff, DoorOpen, DoorClosed, UserPlus, UserMinus, Cpu, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { AppShell } from '../components/biss/AppShell';
import { api, type ModuleSysteme, type FirmwareVersion, type OtaDeploiement } from '../lib/api';
import { realtime } from '../lib/realtime';
import { niveauLabel, niveauClass, fmtDateTime, ilYA, signalBars, fmtVersion, OTA_LABELS, statutOtaClass } from '../lib/biss2';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

function SignalIcon({ rssi }: { rssi?: number|null }) {
  const bars = signalBars(rssi);
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1,2,3,4].map(b => (
        <div key={b} className={cn('w-1 rounded-sm', b <= bars ? 'bg-green-400' : 'bg-slate-600')}
          style={{ height: `${b*25}%` }} />
      ))}
    </div>
  );
}

export default function Serrure() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [otaOpen, setOtaOpen] = useState<string|null>(null);
  const [expanded, setExpanded] = useState<string|null>(null);

  const { data: modules = [], isLoading } = useQuery<ModuleSysteme[]>({
    queryKey: ['systemes'],
    queryFn: () => api.get('/api/systemes'),
    refetchInterval: 15000,
  });

  const { data: firmwares = [] } = useQuery<FirmwareVersion[]>({
    queryKey: ['firmwares'],
    queryFn: () => api.get('/api/firmwares'),
  });

  const { data: deploiements = [] } = useQuery<OtaDeploiement[]>({
    queryKey: ['ota-deploiements'],
    queryFn: () => api.get('/api/ota-deploiements'),
  });

  useEffect(() => {
    const unsubHb = realtime.on('heartbeat', (d: unknown) => {
      const h = d as { systeme_id: string };
      qc.invalidateQueries({ queryKey: ['systemes'] });
    });
    const unsubOff = realtime.on('hors_ligne', () => qc.invalidateQueries({ queryKey: ['systemes'] }));
    const unsubOta = realtime.on('ota_progression', () => qc.invalidateQueries({ queryKey: ['ota-deploiements'] }));
    return () => { unsubHb(); unsubOff(); unsubOta(); };
  }, [qc]);

  const cmdMut = useMutation({
    mutationFn: ({ id, cmd, payload }: { id: string; cmd: string; payload?: unknown }) =>
      api.post(`/api/systemes/${id}/commande`, { cmd, payload }),
    onSuccess: (_, v) => toast.success(`Commande «${v.cmd}» envoyée`),
    onError: (e: Error) => toast.error(e.message),
  });

  const otaMut = useMutation({
    mutationFn: ({ firmware_id, systeme_id }: { firmware_id: string; systeme_id: string }) =>
      api.post('/api/ota-deploiements', { firmware_id, systeme_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ota-deploiements'] });
      setOtaOpen(null);
      toast.success('Déploiement OTA lancé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMut = useMutation({
    mutationFn: (data: Partial<ModuleSysteme>) => api.post('/api/systemes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['systemes'] });
      setAddOpen(false);
      toast.success('Module ajouté');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Serrure & Modules">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-400">{modules.length} module{modules.length!==1?'s':''} configuré{modules.length!==1?'s':''}</p>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[#1A3A8F] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
          <Plus className="size-4" /> Ajouter un module
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-[#1A3A8F]" /></div>
      ) : (
        <div className="space-y-4">
          {modules.map(m => {
            const isExpanded = expanded === m.id;
            const derniersDeploiements = deploiements.filter(d => d.systeme_id === m.id).slice(0, 3);

            return (
              <div key={m.id} className="rounded-xl border border-slate-700/60 bg-[#1E293B] overflow-hidden">
                {/* Header module */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border',
                      m.en_ligne ? 'border-green-500/40 bg-green-500/10' : 'border-slate-600 bg-slate-800')}>
                      {m.en_ligne ? <Wifi className="size-5 text-green-400" /> : <WifiOff className="size-5 text-slate-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{m.nom}</p>
                        <span className="font-mono text-[10px] text-slate-500 border border-slate-700 rounded px-1">{m.id}</span>
                        <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-medium', niveauClass(m.niveau_securite))}>
                          {niveauLabel(m.niveau_securite)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[m.batiment, m.etage, m.lieu].filter(Boolean).join(' — ')||'Localisation non renseignée'}
                        {m.ip && <span className="ml-2 font-mono text-[#E8B400]">{m.ip}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <SignalIcon rssi={m.rssi} />
                      <span className="hidden sm:block">{m.rssi ? `${m.rssi} dBm` : '—'}</span>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400">{fmtVersion(m.firmware_version)}</p>
                      <p className="text-[10px] text-slate-600">{ilYA(m.dernier_contact)}</p>
                    </div>
                    <button onClick={() => setExpanded(isExpanded ? null : m.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 transition">
                      <ChevronDown className={cn('size-4 transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2 px-5 pb-4">
                  <CmdBtn icon={DoorOpen} label="Ouvrir" color="green"
                    onClick={() => cmdMut.mutate({ id: m.id, cmd: 'OUVRIR' })} />
                  <CmdBtn icon={DoorClosed} label="Verrouiller" color="red"
                    onClick={() => cmdMut.mutate({ id: m.id, cmd: 'VERROUILLER' })} />
                  <CmdBtn icon={UserPlus} label="Enrôlement +badge" color="blue"
                    onClick={() => cmdMut.mutate({ id: m.id, cmd: 'MODE_ENROLEMENT', payload: { mode: 'ajout' } })} />
                  <CmdBtn icon={UserMinus} label="Retrait badge" color="amber"
                    onClick={() => cmdMut.mutate({ id: m.id, cmd: 'MODE_ENROLEMENT', payload: { mode: 'suppression' } })} />
                  <CmdBtn icon={RefreshCw} label="Redémarrer" color="slate"
                    onClick={() => cmdMut.mutate({ id: m.id, cmd: 'REBOOT' })} />
                  <button onClick={() => setOtaOpen(m.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#1A3A8F]/50 bg-[#1A3A8F]/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-[#1A3A8F]/30 transition">
                    <Cpu className="size-3.5" /> OTA Firmware
                  </button>
                </div>

                {/* Détails expandés */}
                {isExpanded && (
                  <div className="border-t border-slate-700/40 px-5 py-4 space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {[
                        ['MAC', m.mac||'—'],
                        ['SSID', m.ssid||'—'],
                        ['Type d\'accès', m.type_acces||'—'],
                        ['Durée ouverture', m.duree_ouverture ? `${m.duree_ouverture}s` : '—'],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-slate-800/50 px-3 py-2">
                          <p className="text-slate-500 mb-0.5">{k}</p>
                          <p className="text-white font-mono">{v}</p>
                        </div>
                      ))}
                    </div>

                    {derniersDeploiements.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2">Derniers déploiements OTA</p>
                        <div className="space-y-1.5">
                          {derniersDeploiements.map(d => (
                            <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', statutOtaClass(d.statut))}>
                                  {OTA_LABELS[d.statut||''] || d.statut}
                                </span>
                                <span className="text-xs text-slate-400">{d.version_avant} → {d.version_apres||'?'}</span>
                              </div>
                              {d.statut === 'en_cours' && (
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${d.progression||0}%` }} />
                                  </div>
                                  <span className="text-[10px] text-slate-400">{d.progression||0}%</span>
                                </div>
                              )}
                              <span className="text-[10px] text-slate-500">{fmtDateTime(d.demarre_le)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {modules.length === 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-[#1E293B] p-12 text-center">
              <Wifi className="size-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Aucun module configuré.</p>
              <p className="text-xs text-slate-500 mt-1">Ajoutez votre premier module ESP32 BISS 2.</p>
            </div>
          )}
        </div>
      )}

      {/* Dialog OTA */}
      {otaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOtaOpen(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#1E293B] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Cpu className="size-5 text-blue-400" /> Déploiement OTA
            </h2>
            <p className="text-xs text-slate-400 mb-4">Module : <span className="text-[#E8B400] font-mono">{otaOpen}</span></p>
            {firmwares.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun firmware disponible. Ajoutez-en un dans les réglages.</p>
            ) : (
              <div className="space-y-2">
                {firmwares.map(fw => (
                  <button key={fw.id} onClick={() => otaMut.mutate({ firmware_id: fw.id, systeme_id: otaOpen })}
                    disabled={otaMut.isPending}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm hover:border-[#1A3A8F]/50 hover:bg-[#1A3A8F]/10 transition">
                    <div className="text-left">
                      <p className="font-semibold text-white">{fmtVersion(fw.version)}</p>
                      <p className="text-xs text-slate-400">{fw.description||'Sans description'}</p>
                    </div>
                    <span className="text-xs text-slate-500">{fw.taille_kb} KB</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setOtaOpen(null)} className="mt-4 w-full rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Dialog ajout module */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#1E293B] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Nouveau module ESP32</h2>
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data: Record<string,string|number> = {};
              fd.forEach((v,k) => { data[k] = v as string; });
              data.niveau_securite = parseInt(data.niveau_securite as string)||1;
              data.duree_ouverture = parseInt(data.duree_ouverture as string)||5;
              addMut.mutate(data as unknown as Partial<ModuleSysteme>);
            }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <F label="ID Module *" name="id" placeholder="P4" required />
                <F label="Nom *" name="nom" placeholder="Entrée parking" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Bâtiment" name="batiment" placeholder="Bâtiment A" />
                <F label="Lieu" name="lieu" placeholder="Parking" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Niveau sécurité</label>
                <select name="niveau_securite" className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-[#1A3A8F] focus:outline-none">
                  <option value="1">1 — Standard</option>
                  <option value="2">2 — Restreint</option>
                  <option value="3">3 — Haute sécurité</option>
                </select>
              </div>
              <F label="Durée ouverture (sec)" name="duree_ouverture" type="number" placeholder="5" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAddOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition">Annuler</button>
                <button type="submit" disabled={addMut.isPending}
                  className="rounded-xl bg-[#1A3A8F] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                  {addMut.isPending && <Loader2 className="size-4 animate-spin" />} Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function CmdBtn({ icon: Icon, label, color, onClick }: { icon: React.ElementType; label: string; color: string; onClick: () => void }) {
  const colors: Record<string,string> = {
    green: 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20',
    red: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
    slate: 'border-slate-600 bg-slate-700/30 text-slate-400 hover:bg-slate-700/60',
  };
  return (
    <button onClick={onClick} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition', colors[color])}>
      <Icon className="size-3.5" /> {label}
    </button>
  );
}

function F({ label, name, type='text', placeholder='', required=false }: { label:string; name:string; type?:string; placeholder?:string; required?:boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input name={name} type={type} placeholder={placeholder} required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-[#1A3A8F] focus:outline-none" />
    </div>
  );
}
