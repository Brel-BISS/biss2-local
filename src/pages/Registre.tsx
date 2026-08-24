import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AppShell } from '../components/biss/AppShell';
import { api, type AccesLog } from '../lib/api';
import { resultatClass, fmtDateTime } from '../lib/biss2';
import { cn } from '../lib/utils';

export default function Registre() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [resultat, setResultat] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const LIMIT = 25;

  const { data, isLoading } = useQuery<{ logs: AccesLog[]; total: number; page: number }>({
    queryKey: ['acces-logs', page, search, resultat, dateDebut, dateFin],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT), search,
        resultat, date_debut: dateDebut, date_fin: dateFin,
      });
      return api.get(`/api/acces-logs?${params}`);
    },
    placeholderData: (prev) => prev,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AppShell title="Registre d'accès">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Nom, UID, porte..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#1A3A8F] focus:outline-none" />
        </div>
        <select value={resultat} onChange={e => { setResultat(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-[#1A3A8F] focus:outline-none">
          <option value="">Tous résultats</option>
          {['Autorisé','Refusé','Alarme'].map(r => <option key={r}>{r}</option>)}
        </select>
        <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-[#1A3A8F] focus:outline-none" />
        <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-[#1A3A8F] focus:outline-none" />
        <button onClick={() => { setSearch(''); setResultat(''); setDateDebut(''); setDateFin(''); setPage(1); }}
          className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-400 hover:text-white transition flex items-center gap-2">
          <Filter className="size-4" /> Réinitialiser
        </button>
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-slate-700/60 bg-[#1E293B] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-[#1A3A8F]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs text-slate-400">
                  {['Horodatage', 'Identité', 'UID', 'Porte', 'Sens', 'Résultat', 'Raison'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(log.horodatage)}</td>
                    <td className="px-4 py-3">
                      {log.nom
                        ? <><p className="text-white font-medium">{log.nom} {log.prenom}</p>
                            <p className="text-[10px] text-slate-500">{log.departement}</p></>
                        : <span className="text-slate-500 italic text-xs">Inconnu</span>
                      }
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#E8B400]">{log.uid}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{log.porte_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium',
                        log.sens === 'Entrée' ? 'text-green-400' : 'text-blue-400')}>
                        {log.sens === 'Entrée' ? '→' : '←'} {log.sens}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', resultatClass(log.resultat))}>
                        {log.resultat}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{log.raison || '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-500">Aucun résultat</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-700/60 px-4 py-3">
          <span className="text-xs text-slate-400">{total} entrée{total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs text-slate-300">Page {page} / {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
