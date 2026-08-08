import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Users, Search, Download, ChevronLeft, ChevronRight, MessageSquare, Coins, X } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { db, safeGetDocs as getDocs } from '../firebase';
import { Section, Student } from '../types';
import { formatStudentName } from '../utils';

interface AdminStudentListViewProps {
  onBack: () => void;
  sections: Section[];
  onViewAnecdotals?: (studentLrn: string, sectionId: string) => void;
}

interface PTAPayment {
  id: string;
  studentName: string;
  lrn: string;
  amountPaid: number;
  orNumber: string;
  feeName: string;
}

interface StudentSummary {
  lrn: string;
  name: string;
  lastName: string; // for sorting
  records: {
    sectionId: string;
    gradeLevel: number | string;
    schoolYear: string;
    sectionName: string;
    status?: string;
    isTransferredIn?: boolean;
  }[];
  ptaPayments: PTAPayment[];
}

export function AdminStudentListView({ onBack, sections, onNavigateToSection, onViewAnecdotals }: AdminStudentListViewProps & { onNavigateToSection?: (sectionId: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [studentsByLrn, setStudentsByLrn] = useState<Map<string, StudentSummary>>(new Map());
  const [viewingPayments, setViewingPayments] = useState<StudentSummary | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    const fetchAllStudents = async () => {
      setLoading(true);
      try {
        const studentMap = new Map<string, StudentSummary>();

        // Fetch students for all sections given to this admin
        const fetchPromises = sections.map(async (sec) => {
          const snap = await getDocs(collection(db, 'sections', sec.id, 'students'));
          snap.docs.forEach(doc => {
            const data = doc.data() as Student;
            // Use LRN as unique identifier if available, otherwise fallback to id (though id might change across sections)
            const key = data.lrn && data.lrn.trim() !== '' ? data.lrn.trim() : data.id;
            
            if (!studentMap.has(key)) {
              studentMap.set(key, {
                lrn: data.lrn || 'N/A',
                name: formatStudentName(data),
                lastName: data.lastName || '',
                records: [],
                ptaPayments: []
              });
            }
            
            const summary = studentMap.get(key)!;
            // Prevent duplicates if same section was fetched twice (shouldn't happen)
            const recordExists = summary.records.some(r => r.schoolYear === sec.schoolYear && r.gradeLevel === sec.gradeLevel && r.sectionId === sec.id);
            if (!recordExists) {
               summary.records.push({
                 sectionId: sec.id,
                 gradeLevel: sec.gradeLevel,
                 schoolYear: sec.schoolYear,
                 sectionName: sec.name,
                 status: data.status,
                 isTransferredIn: data.isTransferredIn
               });
            }
          });
        });

        await Promise.all(fetchPromises);

        // Fetch payments
        const paymentsSnap = await getDocs(collection(db, 'pta_payments'));
        paymentsSnap.docs.forEach(doc => {
           const p = doc.data() as PTAPayment;
           if (studentMap.has(p.lrn)) {
             studentMap.get(p.lrn)!.ptaPayments.push({ id: doc.id, ...p });
           }
        });
        
        // Sort records by school year ascending
        studentMap.forEach(summary => {
           summary.records.sort((a, b) => a.schoolYear.localeCompare(b.schoolYear));
        });

        setStudentsByLrn(studentMap);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false);
      }
    };

    if (sections.length > 0) {
      fetchAllStudents();
    } else {
      setLoading(false);
    }
  }, [sections]);

  const filteredStudents = useMemo(() => {
    let arr = Array.from(studentsByLrn.values()) as StudentSummary[];
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      arr = arr.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.lrn.toLowerCase().includes(q)
      );
    }
    // Sort by last name
    arr.sort((a, b) => a.lastName.localeCompare(b.lastName));
    return arr;
  }, [studentsByLrn, search]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative z-10 w-full animate-fade-in custom-scrollbar">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="text-indigo-600" size={24} />
              STUDENT MASTER LIST
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              All enrolled students across {sections.length} sections
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search by name or LRN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
              />
            </div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Total Students: <span className="text-indigo-600">{filteredStudents.length}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500 font-bold tracking-widest uppercase flex flex-col items-center justify-center animate-pulse">
                <Users size={32} className="mb-4 text-slate-300" />
                Loading students database...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-bold tracking-widest uppercase flex flex-col items-center justify-center">
                <Users size={32} className="mb-4 text-slate-300" />
                No students found.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center">No.</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">LRN</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">PTA Contributions</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Grade Levels & Academic Years</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.map((s, idx) => (
                      <tr key={s.lrn + idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{s.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{s.lrn}</code>
                        </td>
                        <td className="px-6 py-4">
                          {s.ptaPayments.length > 0 ? (
                            <button
                              onClick={() => setViewingPayments(s)}
                              className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
                            >
                              <Coins size={14} />
                              View {s.ptaPayments.length} Payments
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 italic">No payments</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {s.records.map((r, i) => {
                              let statusTag = null;
                              if (r.status === 'Dropped Out') {
                                statusTag = <span className="ml-1 text-[9px] font-black uppercase text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">Dropped Out</span>;
                              } else if (r.status === 'Transferred Out') {
                                statusTag = <span className="ml-1 text-[9px] font-black uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Transferred Out</span>;
                              } else if (r.isTransferredIn) {
                                statusTag = <span className="ml-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Transferred In</span>;
                              } else if (r.status === 'Retained') {
                                statusTag = <span className="ml-1 text-[9px] font-black uppercase text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Retained</span>;
                              } else if (r.status === 'Promoted') {
                                statusTag = <span className="ml-1 text-[9px] font-black uppercase text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">Promoted</span>;
                              }

                              return (
                                <button 
                                  key={i} 
                                  onClick={() => onNavigateToSection && onNavigateToSection(r.sectionId)}
                                  className="inline-flex flex-col items-start px-2.5 py-1.5 bg-white hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-xs shadow-sm transition-colors group/btn cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-700 group-hover/btn:text-indigo-700">Grade {r.gradeLevel}</span>
                                    <span className="text-slate-300 group-hover/btn:text-indigo-300">-</span>
                                    <span className="font-semibold text-slate-500 group-hover/btn:text-indigo-600">{r.schoolYear}</span>
                                  </div>
                                  {statusTag || (
                                    <span className="mt-0.5 text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Active</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {onViewAnecdotals && s.records.length > 0 && (
                            <button
                              type="button"
                              onClick={() => onViewAnecdotals(s.lrn, s.records[s.records.length - 1].sectionId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-600 border border-amber-200 hover:border-amber-600 text-amber-700 hover:text-white rounded-xl transition-all font-bold text-xs shadow-sm active:scale-95 cursor-pointer animate-fade-in"
                              title="View/Add Anecdotal Records"
                            >
                              <MessageSquare size={13} />
                              <span>Anecdotal</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {viewingPayments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-900">Payments: {viewingPayments.name}</h3>
                <button
                  onClick={() => setViewingPayments(null)}
                  className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar">
                {viewingPayments.ptaPayments.map(p => (
                  <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-700">{p.feeName}</p>
                      <p className="text-[10px] font-semibold text-slate-500">OR# {p.orNumber}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-700">₱{p.amountPaid.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
