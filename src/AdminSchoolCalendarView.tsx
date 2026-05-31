import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, Plus, X, Save, Trash2, AlertCircle, Clock } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from './firebase';


function EncodingClosedBanner() {
  return (
    <div className="bg-rose-50 border-b border-rose-100 text-rose-600 px-4 py-2 flex items-center justify-center gap-2 z-[100] shrink-0">
      <Clock size={14} className="animate-pulse" />
      <span className="text-[10px] font-bold uppercase tracking-wider">
        Encoding is Currently Closed — No Active School Year Found
      </span>
    </div>
  );
}

export function AdminSchoolCalendarView({ onBack, onShowFeedback, isFeedbackOpen, onCloseFeedback, currentUser }: { onBack: () => void, onShowFeedback?: () => void, isFeedbackOpen?: boolean, onCloseFeedback?: () => void, currentUser?: any }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, month: string, year: string } | null>(null);
  const [form, setForm] = useState({ id: '', year: new Date().getFullYear().toString(), month: 'January', days: '', schoolYear: '', term: '1', openingDate: '1', closingDate: '31', localHolidays: [] as number[] });

  const toggleLocalHoliday = (day: number) => {
    setForm(prev => ({
      ...prev,
      localHolidays: prev.localHolidays.includes(day)
        ? prev.localHolidays.filter(d => d !== day)
        : [...prev.localHolidays, day].sort((a, b) => a - b)
    }));
  };
  const [filterSchoolYear, setFilterSchoolYear] = useState('');
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      }
    }, (error) => {
      handleFirestoreError(error, 'get', 'settings/general');
    });
    return unsub;
  }, []);

  const months = [
    'June', 'July', 'August', 'September', 'October', 'November', 'December',
    'January', 'February', 'March', 'April', 'May'
  ];

  const terms = ['1', '2', '3', '4'];

  useEffect(() => {
    const q = query(collection(db, 'school_calendar'), orderBy('year', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', 'school_calendar');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (globalSettings?.schoolYears && globalSettings.schoolYears.length > 0 && !form.schoolYear) {
      const activeYears = globalSettings.schoolYears.filter((sy: string) => !(globalSettings.closedSchoolYears || []).includes(sy));
      const defaultYear = activeYears.length > 0 ? activeYears[0] : globalSettings.schoolYears[0];
      setForm(prev => ({ ...prev, schoolYear: defaultYear }));
    }
  }, [globalSettings, form.schoolYear]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.year || !form.month || !form.days) return;
    try {
      const docId = form.id || `${form.schoolYear || form.year}_${form.month.toLowerCase()}_t${form.term}`;
      await setDoc(doc(db, 'school_calendar', docId), {
        year: form.year,
        schoolYear: form.schoolYear,
        month: form.month,
        term: parseInt(form.term) || 1,
        days: parseInt(form.days) || 0,
        openingDate: parseInt(form.openingDate) || 1,
        closingDate: parseInt(form.closingDate) || 31,
        localHolidays: form.localHolidays || [],
        updatedAt: new Date().toISOString()
      });
      setIsAdding(false);
      setForm({ id: '', year: new Date().getFullYear().toString(), month: 'January', days: '', schoolYear: effectiveFilter || '', term: '1', openingDate: '1', closingDate: '31', localHolidays: [] });
    } catch (err) {
      handleFirestoreError(err, 'write', 'school_calendar');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'school_calendar', confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      handleFirestoreError(err, 'delete', `school_calendar/${confirmDelete.id}`);
    }
  };

  const editEntry = (e: any) => {
    setForm({ 
      id: e.id, 
      year: e.year, 
      month: e.month, 
      days: e.days.toString(), 
      schoolYear: e.schoolYear || '',
      term: (e.term || '1').toString(),
      openingDate: (e.openingDate || '1').toString(),
      closingDate: (e.closingDate || '31').toString(),
      localHolidays: e.localHolidays || []
    });
    setIsAdding(true);
  };

  const schoolYears = Array.from(new Set(entries.map(e => e.schoolYear).filter(Boolean)));
  const effectiveFilter = filterSchoolYear || globalSettings?.activeSchoolYear;
  const filteredEntries = (globalSettings?.activeSchoolYear && effectiveFilter)
    ? entries.filter(e => e.schoolYear === effectiveFilter)
    : [];

  const groupedEntries = React.useMemo(() => {
    const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    
    // First sort all entries by month order
    const sorted = [...filteredEntries].sort((a, b) => {
      const syA = a.schoolYear || '';
      const syB = b.schoolYear || '';
      if (syA !== syB) return syB.localeCompare(syA); // Latest School Year first
      
      const termA = parseInt(a.term) || 1;
      const termB = parseInt(b.term) || 1;
      if (termA !== termB) return termA - termB; // Term 1 before Term 2
      
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });

    // Group by Term
    const groups: { [term: string]: any[] } = {};
    sorted.forEach(entry => {
      const term = (entry.term || '1').toString();
      if (!groups[term]) groups[term] = [];
      groups[term].push(entry);
    });
    
    return groups;
  }, [filteredEntries]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {!globalSettings?.activeSchoolYear && <EncodingClosedBanner />}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all active:scale-90"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              School Calendar
            </h1>
            <p className={`text-[11px] font-medium uppercase tracking-wider mt-0.5 ${!effectiveFilter ? 'text-rose-500' : 'text-slate-400'}`}>
              {effectiveFilter ? `Viewing SY ${effectiveFilter}` : 'No active school year'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            setForm({ 
              id: '', 
              year: new Date().getFullYear().toString(), 
              month: 'January', 
              days: '', 
              schoolYear: effectiveFilter || '', 
              term: '1',
              openingDate: '1',
              closingDate: '31',
              localHolidays: []
            });
            setIsAdding(true);
          }}
          disabled={!effectiveFilter}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm"
        >
          <Plus size={16} />
          <span>Add Entry</span>
        </button>
      </nav>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl border border-slate-100"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Delete Entry?
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Are you sure you want to remove <span className="font-semibold text-slate-800">{confirmDelete.month} {confirmDelete.year}</span>?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {form.id ? 'Edit' : 'Add'} Calendar Entry
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  School Year
                  {!globalSettings?.activeSchoolYear && (
                    <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                      <AlertCircle size={10} /> No active school year
                    </span>
                  )}
                </label>
                {globalSettings?.schoolYears ? (
                  <select 
                    value={form.schoolYear}
                    onChange={e => setForm({...form, schoolYear: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                    required
                  >
                    {(globalSettings.schoolYears || []).filter((sy: string) => !(globalSettings.closedSchoolYears || []).includes(sy) || sy === form.schoolYear).map((sy: string) => (
                      <option key={sy} value={sy}>{sy}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={form.schoolYear}
                    onChange={e => setForm({...form, schoolYear: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                    placeholder="e.g. 2023-2024"
                    required
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Year</label>
                  <input 
                    type="text" 
                    value={form.year}
                    onChange={e => setForm({...form, year: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                    placeholder="e.g. 2024"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Month</label>
                  <select 
                    value={form.month}
                    onChange={e => setForm({...form, month: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Term</label>
                <select 
                  value={form.term}
                  onChange={e => setForm({...form, term: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {terms.map(t => <option key={t} value={t}>Term {t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 text-center">Start</label>
                  <input 
                    type="number" 
                    min="1"
                    max="31"
                    value={form.openingDate}
                    onChange={e => setForm({...form, openingDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 text-center">End</label>
                  <input 
                    type="number" 
                    min="1"
                    max="31"
                    value={form.closingDate}
                    onChange={e => setForm({...form, closingDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 text-center">Days</label>
                  <input 
                    type="number" 
                    min="0"
                    max="31"
                    value={form.days}
                    onChange={e => setForm({...form, days: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 text-center"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Special Holidays</label>
                <div className="grid grid-cols-7 gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const isHoliday = form.localHolidays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleLocalHoliday(day)}
                        className={`h-7 w-full flex items-center justify-center rounded text-[10px] font-bold transition-all ${
                          isHoliday
                            ? 'bg-rose-600 text-white'
                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg text-sm transition-all mt-4 flex items-center justify-center gap-2 shadow-md shadow-indigo-100 active:scale-[0.98]"
              >
                <Save size={16} /> Save Entry
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calendar Entries</h2>
          </div>
          {schoolYears.length > 0 && (
            <select
              value={filterSchoolYear}
              onChange={e => setFilterSchoolYear(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-[180px] shadow-sm transition-all"
            >
              <option value="">Manual Filter</option>
              {schoolYears.map((sy: any) => (
                <option key={sy} value={sy}>{sy}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest shadow-sm">
            Loading Calendar...
          </div>
        ) : !globalSettings?.activeSchoolYear ? (
          <div className="bg-white border border-slate-200 rounded-xl p-20 text-center text-slate-500 shadow-sm flex flex-col items-center gap-4">
            <div className="size-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
              <CalendarIcon size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-800">No Active School Year</p>
              <p className="text-xs text-slate-400 mt-1">Set an active school year in settings to manage the calendar.</p>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-20 text-center text-slate-400 shadow-sm">
            No entries found for SY <span className="font-bold text-slate-600">{effectiveFilter}</span>.
          </div>
        ) : (
          <div className="space-y-12">
            {Object.keys(groupedEntries).sort().map(term => (
              <div key={term} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
                    Term {term}
                  </h3>
                  <div className="h-px bg-slate-200 flex-1 opacity-50"></div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">Month</th>
                          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">Year</th>
                          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">Coverage</th>
                          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">Class Days</th>
                          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {groupedEntries[term].map(entry => (
                          <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-slate-800">{entry.month}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-medium text-slate-500 font-mono tracking-tight">{entry.year}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-600 font-medium">{entry.openingDate || '1'} – {entry.closingDate || '31'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-indigo-600">{entry.days}</span>
                                {entry.localHolidays && entry.localHolidays.length > 0 && (
                                  <span className="text-[10px] bg-rose-50 text-rose-500 font-bold px-1.5 py-0.5 rounded">
                                    {entry.localHolidays.length} HLD
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => editEntry(entry)}
                                  className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 font-bold text-xs rounded-lg transition-colors"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => setConfirmDelete({ id: entry.id, month: entry.month, year: entry.year })}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
