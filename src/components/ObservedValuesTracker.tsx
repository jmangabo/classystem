import { formatStudentName } from "../utils";
import React, { useMemo, useState, useEffect } from 'react';
import { Student, RatedValue } from '../types';
import { ClipboardCheck, Sparkles, MessageSquare } from 'lucide-react';

interface ObservedValuesTrackerProps {
  students: Student[];
  onUpdateValue: (studentId: string, period: number, statementId: string, value: RatedValue) => void;
  globalNumTerms?: number;
}

type ReportingMode = 'term4' | 'term3';

const QUICK_COMMENTS = [
  "Excellent performance! Keep up the good work.",
  "Consistent academic excellence. Highly commendable!",
  "Active in class participation. Well done!",
  "Shows great improvement. Keep striving for excellence.",
  "Very cooperative and well-behaved in all class activities.",
  "Demonstrates strong leadership and critical thinking.",
  "Needs additional guidance in reading and comprehension.",
  "Needs to focus more on completing written works on time.",
  "Quiet and cooperative, but should participate more in discussions."
];

export const ObservedValuesTracker: React.FC<ObservedValuesTrackerProps> = ({ students, onUpdateValue, globalNumTerms }) => {
  const [mode, setMode] = useState<ReportingMode>(globalNumTerms === 4 ? 'term4' : 'term3');
  const [activeCell, setActiveCell] = useState<{ studentId: string; period: number } | null>(null);

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

  const handleApplySuggestion = (studentId: string, period: number, text: string) => {
    onUpdateValue(studentId, period, 'comment', text);
  };

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
                <th className="p-3 border-r-[0.5px] border-black text-left w-64 uppercase tracking-tighter">Student Name</th>
                {periods.map(p => (
                  <th key={p} className="p-2 border-r-[0.5px] border-black text-center uppercase tracking-tighter text-xs">
                    Term {p} Comments / Remarks
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentList.map(student => (
                <tr key={student.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 border-r-[0.5px] border-black font-semibold uppercase text-slate-800 text-xs w-64">
                    <div className="flex flex-col gap-1">
                      <span>{formatStudentName(student)}</span>
                      {student.status === 'Dropped Out' && (
                        <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest self-start">
                          Dropped {student.dropoutDate ? `(${new Date(student.dropoutDate).toLocaleDateString(undefined, { month: 'short' })})` : ''}
                        </span>
                      )}
                      {student.status === 'Transferred Out' && (
                        <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest self-start">
                          Transferred {student.dropoutDate ? `(${new Date(student.dropoutDate).toLocaleDateString(undefined, { month: 'short' })})` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  {periods.map(p => {
                    const comment = student.observedValues?.[p]?.[ 'comment' ] || '';
                    const isFocused = activeCell?.studentId === student.id && activeCell?.period === p;
                    return (
                      <td key={p} className="p-2 border-r-[0.5px] border-black last:border-r-0 align-top">
                        <textarea
                          value={comment}
                          onChange={(e) => onUpdateValue(student.id, p, 'comment', e.target.value)}
                          onFocus={() => setActiveCell({ studentId: student.id, period: p })}
                          placeholder={`Enter Term ${p} Remarks...`}
                          rows={3}
                          className="w-full border rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-y custom-scrollbar border-slate-300"
                        />
                        {isFocused && (
                          <div className="mt-1 bg-indigo-50/50 p-1.5 rounded-md border border-indigo-100/50 flex flex-wrap gap-1 max-w-sm">
                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block w-full mb-0.5 flex items-center gap-1">
                              <Sparkles size={10} /> Click to apply quick remark:
                            </span>
                            {QUICK_COMMENTS.map((qc, qIdx) => (
                              <button
                                key={qIdx}
                                type="button"
                                onMouseDown={(e) => {
                                  // Prevent textarea blur which would hide the active suggestion container before click fires
                                  e.preventDefault();
                                }}
                                onClick={() => handleApplySuggestion(student.id, p, qc)}
                                className="text-[9px] font-medium bg-white hover:bg-indigo-600 hover:text-white text-slate-600 border border-slate-200 hover:border-indigo-600 px-1.5 py-0.5 rounded transition-all truncate max-w-[150px]"
                                title={qc}
                              >
                                {qc}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
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
               <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">Teacher Comments & Remarks</h2>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Record quarterly feedback and remarks for student report cards</p>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-8">
          {renderStudentTable(sortedStudents.male, "Male Students", "bg-blue-600")}
          {renderStudentTable(sortedStudents.female, "Female Students", "bg-rose-600")}
        </div>
      </div>
    </div>
  );
};
