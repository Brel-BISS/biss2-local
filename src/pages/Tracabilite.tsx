import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, Loader2, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AppShell } from '../components/biss/AppShell';
import { api, type AccesLog } from '../lib/api';
import { resultatClass, fmtDateTime } from '../lib/biss2';
import { cn } from '../lib/utils';

interface Presence {
  uid: string; nom: string; prenom: string; departement: string;
  arrivee: string; depart: string; passages: string;
  horodatage: string; porte_id: string; sens: string; resultat: string; raison: string;
}

function diffHM(debut: string, fin: string) {
  const d = new Date(debut), f = new Date(fin);
  const mins = Math.round((f.getTime() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins/60)}h${String(mins%60).padStart(2,'0')}`;
}

export default function Tracabilite() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [uid, setUid] = useState('');

  const { data: logs = [], isLoading } = useQuery<Presence[]>({
    queryKey: ['presences', date, uid],
    queryFn: () => {
      const p = new URLSearchParams({ date });
      if (uid) p.append('uid', uid);
      return api.get(`/api/presences?${p}`);
    },
  });

  // Grouper par personne
  const parPersonne = logs.reduce<Record<string, Presence[]>>((acc, l) => {
    const key = l.uid;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const personnes = Object.entries(parPersonne);

  return (
    <AppShell title="Traçabilité & Présences">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
          <CalendarDays className="size-4 text-slate-500" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none" />
        </div>
        <input value={uid} onChange={e => setUid(e.target.value)}
          placeholder="Filtrer par UID..."
          className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#1A3A8F] focus:outline-none" />
        <button onClick={() => { setDate(today); setUid(''); }}
          className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-400 hover:text-white transition">
          Aujourd'hui
        </button>
      </div>

      {/* Stats du jour */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Personnes présentes', val: personnes.length, color: 'text-green-400' },
          { label: 'Total passages', val: logs.filter(l => l.resultat === 'Autorisé').length, color: 'text-blue-400' },
          { label: 'Refus / Alarmes', val: logs.filter(l => l.resultat !== 'Autorisé').length, color: 'text-red-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl border border-slate-700/60 bg-[#1E293B] p-4 text-center">
            <p className={cn('text-3xl font-bold', color)}>{val}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-[#1A3A8F]" /></div>
      ) : personnes.length === 0 ? (
        <div className="rounded-xl border border-slate-700/60 bg-[#1E293B] p-12 text-center">
          <TrendingUp className="size-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Aucun passage enregistré pour cette date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {personnes.map(([uid, passages]) => {
            const autorises = passages.filter(p => p.resultat === 'Autorisé');
            const entrees = autorises.filter(p => p.sens === 'Entrée');
            const sorties = autorises.filter(p => p.sens === 'Sortie');
            const arrivee = autorises[0]?.horodatage;
            const depart = autorises[autorises.length - 1]?.horodatage;
            const p0 = passages[0];

            return (
              <div key={uid} className="rounded-xl border border-slate-700/60 bg-[#1E293B] overflow-hidden">
                {/* Header personne */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A3A8F]/40 text-white font-bold text-sm">
                      {p0.nom?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {p0.nom ? `${p0.nom} ${p0.prenom||''}` : 'Inconnu'}
                      </p>
                      <p className="text-xs text-slate-500">{p0.departement || 'N/D'} • <span className="font-mono text-[#E8B400]">{uid}</span></p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p className="flex items-center gap-1 justify-end">
                      <Clock className="size-3" />
                      {arrivee ? format(parseISO(arrivee), 'HH:mm') : '—'}
                      {depart && arrivee && arrivee !== depart ? ` → ${format(parseISO(depart), 'HH:mm')} (${diffHM(arrivee, depart)})` : ''}
                    </p>
                    <p className="mt-0.5">{autorises.length} passages · {entrees.length} entrées · {sorties.length} sorties</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="px-5 py-3 flex flex-wrap gap-2">
                  {passages.map((p, i) => (
                    <div key={i} className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px]',
                      resultatClass(p.resultat)
                    )}>
                      <span>{p.sens === 'Entrée' ? '→' : '←'}</span>
                      <span className="font-mono">{format(parseISO(p.horodatage), 'HH:mm:ss')}</span>
                      <span className="text-slate-500">|</span>
                      <span>{p.porte_id || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
