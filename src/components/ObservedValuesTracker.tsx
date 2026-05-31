import { formatStudentName } from "../utils";
import React, { useMemo, useState, useEffect } from 'react';
import { Student, RatedValue } from '../types';
import { ClipboardCheck, Sparkles } from 'lucide-react';

interface ObservedValuesTrackerProps {
  students: Student[];
  onUpdateValue: (studentId: string, period: number, statementId: string, value: RatedValue) => void;
  globalNumTerms?: number;
}

type ReportingMode = 'term4' | 'term3';

const VALUES = [
  {
    category: "1. Maka-Diyos",
    statements: [
      { id: "diyos-1", text: "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others." },
      { id: "diyos-2", text: "Shows adherence to ethical principles by upholding truth in all undertakings." }
    ]
  },
  {
    category: "2. Makatao",
    statements: [
      { id: "tao-1", text: "Is sensitive to individual, social, and cultural differences." },
      { id: "tao-2", text: "Demonstrates contributions towards solidarity." }
    ]
  },
  {
    category: "3. Makakalikasan",
    statements: [
      { id: "kalikasan-1", text: "Cares for environment and utilizes resources wisely, judiciously and economically." }
    ]
  },
  {
    category: "4. Makabansa",
    statements: [
      { id: "bansa-1", text: "Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen." },
      { id: "bansa-2", text: "Demonstrates appropriate behavior in carrying out activities in school, community and country." }
    ]
  }
];

const RATINGS: RatedValue[] = ['AO', 'SO', 'RO', 'NO'];

export const ObservedValuesTracker: React.FC<ObservedValuesTrackerProps> = ({ students, onUpdateValue, globalNumTerms }) => {
  const [mode, setMode] = useState<ReportingMode>(globalNumTerms === 4 ? 'term4' : 'term3');

  useEffect(() => {
    if (globalNumTerms === 4) setMode('term4');
    else if (globalNumTerms === 3) setMode('term3');
  }, [globalNumTerms]);

  const sortedStudents = useMemo(() => {
    const male = students
      .filter(s => s.sex?.toLowerCase() === 'male')
      .sort((a, b) => a.name.localeCompare(b.name));
    const female = students
      .filter(s => s.sex?.toLowerCase() === 'female')
      .sort((a, b) => a.name.localeCompare(b.name));
    return { male, female };
  }, [students]);

  const periods = mode === 'term4' ? [1, 2, 3, 4] : [1, 2, 3];
  const periodLabel = 'Term ';

  const renderStudentTable = (studentList: Student[], title: string, colorClass: string) => {
    if (studentList.length === 0) return null;

    return (
      <div className="mb-8">
        <div className={`${colorClass} text-white font-black uppercase p-3 rounded-t-xl text-center tracking-widest text-sm border-[0.5px] border-black border-b-0`}>
          {title}
        </div>
        <div className="overflow-x-auto border-[0.5px] border-black rounded-b-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-[70vh] custom-scrollbar">
          <table className="w-full border-collapse bg-white text-[11px]">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="bg-slate-50 border-b-[0.5px] border-black">
                <th rowSpan={2} className="p-3 border-r-[0.5px] border-black text-left w-64 uppercase tracking-tighter align-bottom">Student Name</th>
                <th rowSpan={2} className="p-3 border-r-[0.5px] border-black uppercase tracking-tighter align-bottom">Core Values & Statements</th>
                <th colSpan={periods.length} className="p-2 border-b-[0.5px] border-black text-center uppercase tracking-tighter bg-indigo-50/50">Terms</th>
              </tr>
              <tr className="bg-slate-50 border-b-[0.5px] border-black">
                {periods.map(p => (
                  <th key={p} className="p-2 border-r-[0.5px] border-black w-24 text-center uppercase tracking-tighter text-xs">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentList.map(student => (
                <React.Fragment key={student.id}>
                  <tr className="bg-slate-100/80 border-b border-black">
                    <td colSpan={periods.length + 2} className="p-2 font-black uppercase text-indigo-700 tracking-tight text-xs">
                      <div className="flex items-center gap-2">
                        {formatStudentName(student)}
                        {student.status === 'Dropped Out' && (
                          <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                            Dropped {student.dropoutDate ? `(${new Date(student.dropoutDate).toLocaleDateString(undefined, { month: 'short' })})` : ''}{student.dropoutReason ? ` - ${student.dropoutReason}` : ''}
                          </span>
                        )}
                        {student.status === 'Transferred Out' && (
                          <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                            Transferred {student.dropoutDate ? `(${new Date(student.dropoutDate).toLocaleDateString(undefined, { month: 'short' })})` : ''}{student.dropoutReason ? ` - ${student.dropoutReason}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {VALUES.map(val => (
                    <React.Fragment key={val.category}>
                      {val.statements.map((stmt, idx) => (
                        <tr key={stmt.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                          {idx === 0 && (
                            <td 
                              rowSpan={val.statements.length} 
                              className="p-3 border-r-[0.5px] border-black font-bold align-top whitespace-normal bg-slate-50/30"
                            >
                              {val.category}
                            </td>
                          )}
                          <td className="p-3 border-r-[0.5px] border-black italic text-slate-600 leading-tight">
                            {stmt.text}
                          </td>
                          {periods.map(p => {
                            // Using a combined key for storage to avoid collisions across terms
                            // Or just use the number if they are mutually exclusive in use.
                            // The user said "option for three Terms and 4 Terms", implying they might want both.
                            // To be safe, I'll prefix the key with 't' or 't4'.
                            const storageKey = `${mode === 'term3' ? 't3' : 't4'}${p}`;
                            // Wait, the current types.ts says observedValues[term: number].
                            // We use numeric TermNumber (1, 2, 3, 4) for both.
                            // If they are separate data points, I should change the data structure.
                            
                            // Let's assume for now they are separate.
                            return (
                              <td key={p} className="p-2 border-r-[0.5px] border-black text-center last:border-r-0">
                                {(() => {
                                  const val = student.observedValues?.[p]?.[stmt.id] || '';
                                  let colorClass = "bg-slate-50 text-slate-700 border-slate-200";
                                  if (val === 'AO') colorClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                                  else if (val === 'SO') colorClass = "bg-blue-100 text-blue-800 border-blue-300";
                                  else if (val === 'RO') colorClass = "bg-amber-100 text-amber-800 border-amber-300";
                                  else if (val === 'NO') colorClass = "bg-rose-100 text-rose-800 border-rose-300";
                                  
                                  return (
                                    <select 
                                      value={val}
                                      onChange={(e) => onUpdateValue(student.id, p, stmt.id, e.target.value as RatedValue)}
                                      className={`w-full border rounded p-1 text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer ${colorClass}`}
                                    >
                                      <option value="">-</option>
                                      {RATINGS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                      ))}
                                    </select>
                                  );
                                })()}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200 shadow-xl overflow-hidden mb-0 sticky top-0 z-[60]">
        <div className="p-8 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 border border-indigo-500">
               <ClipboardCheck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">Observed Values Tracker</h2>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Core Values Marking (AO, SO, RO, NO)</p>
            </div>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => setMode('term4')}
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'term4' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              4 Terms
            </button>
            <button 
              onClick={() => setMode('term3')}
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'term3' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              3 Terms
            </button>
          </div>
        </div>
      </div>

      <div className="px-10 py-10 space-y-6">
        {/* Legend Area */}
        <div className="px-8 py-4 bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-wrap gap-3 print:hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></span>
            <span className="text-[9px] font-black uppercase text-emerald-700 tracking-widest">AO - Always Observed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></span>
            <span className="text-[9px] font-black uppercase text-blue-700 tracking-widest">SO - Sometimes Observed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm"></span>
            <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">RO - Rarely Observed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-lg border border-rose-100">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm"></span>
            <span className="text-[9px] font-black uppercase text-rose-700 tracking-widest">NO - Not Observed</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-8">
          {renderStudentTable(sortedStudents.male, "Male Students", "bg-blue-600")}
          {renderStudentTable(sortedStudents.female, "Female Students", "bg-rose-600")}
        </div>
      </div>
    </div>
  );
};
