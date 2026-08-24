import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShieldCheck, ShieldX, Users, Activity, DoorOpen, Lock } from 'lucide-react';
import { AppShell } from '../components/biss/AppShell';
import { api, type DashboardData, type AccesLog } from '../lib/api';
import { realtime } from '../lib/realtime';
import { resultatClass, fmtDateTime } from '../lib/biss2';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const qc = useQueryClient();
  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard'),
    refetchInterval: 30000,
  });
  const [feed, setFeed] = useState<AccesLog[]>([]);

  useEffect(() => {
    const unsub = realtime.on('acces', (log) => {
      setFeed(prev => [log as AccesLog, ...prev].slice(0, 20));
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    });
    return unsub;
  }, [qc]);

  const kpi = data?.kpi;
  const parHeure = (data?.par_heure || []).map(h => ({
    heure: `${String(h.heure).padStart(2,'0')}h`,
    Autorisé: parseInt(h.ok),
    Refusé: parseInt(h.refus),
  }));

  return (
    <AppShell title="Tableau de bord">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Passages aujourd\'hui', val: kpi?.total_jour||0, icon: Activity,   color: 'text-blue-400',  bar: 'bg-blue-500' },
          { label: 'Accès autorisés',       val: kpi?.ok_jour||0,    icon: ShieldCheck, color: 'text-green-400', bar: 'bg-green-500' },
          { label: 'Refus / Alarmes',       val: kpi?.refus_jour||0, icon: ShieldX,     color: 'text-red-400',   bar: 'bg-red-500' },
          { label: 'Total historique',      val: kpi?.total_all||0,  icon: Users,       color: 'text-[#E8B400]', bar: 'bg-[#E8B400]' },
        ].map(({ label, val, icon: Icon, color, bar }) => (
          <div key={label} className="rounded-xl border border-slate-700/60 bg-[#1E293B] p-4 hover:-translate-y-0.5 transition-transform">
            <div className={`h-0.5 w-12 ${bar} rounded mb-3`} />
            <div className={cn('text-3xl font-bold', color)}>{val}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Icon className="size-3" /> {label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Graphique */}
        <div className="lg:col-span-2 rounded-xl border border-slate-700/60 bg-[#1E293B] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Activité des 24 dernières heures</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parHeure} barSize={12}>
              <XAxis dataKey="heure" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#E2E8F0' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="Autorisé" fill="#22C55E" radius={[4,4,0,0]} />
              <Bar dataKey="Refusé"   fill="#EF4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Modules */}
        <div className="rounded-xl border border-slate-700/60 bg-[#1E293B] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Modules ESP32</h2>
          <div className="space-y-3">
            {(data?.modules || []).map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-white">{m.nom}</p>
                  <p className="text-[10px] text-slate-500">{m.ip || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('size-2 rounded-full', m.en_ligne ? 'bg-green-400' : 'bg-slate-600')} />
                  <span className="text-[10px] text-slate-400">{m.en_ligne ? 'En ligne' : 'Hors ligne'}</span>
                </div>
              </div>
            ))}
            {!data?.modules.length && (
              <p className="text-xs text-slate-500 text-center py-4">Aucun module</p>
            )}
          </div>
        </div>
      </div>

      {/* Flux temps réel */}
      <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1E293B] p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="size-2 bg-green-400 rounded-full animate-pulse" />
          Flux temps réel
        </h2>
        <div className="space-y-2 max-h-64 overflow-auto">
          {feed.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6">
              En attente de passages... L'ESP32 envoie les données en temps réel.
            </p>
          )}
          {feed.map(log => (
            <div key={log.id}
              className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', resultatClass(log.resultat))}>
                  {log.resultat}
                </span>
                <div>
                  <span className="text-xs font-medium text-white">
                    {log.nom ? `${log.nom} ${log.prenom||''}` : 'Badge inconnu'}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-2 font-mono">{log.uid}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">{log.porte_id}</p>
                <p className="text-[10px] text-slate-500">{fmtDateTime(log.horodatage)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
