import React, { useMemo } from 'react';
import { MonthlyAttendance } from '../types';

interface AttendanceCardProps {
  attendanceData: { [month: string]: MonthlyAttendance };
  onUpdate?: (month: string, field: 'present' | 'absent', value: number) => void;
  calendar: any[];
  schoolYear?: string;
  readOnly?: boolean;
}

const MONTHS = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'];

export const AttendanceCard: React.FC<AttendanceCardProps> = ({ attendanceData, onUpdate, calendar, schoolYear, readOnly = false }) => {
  const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];

  const filteredCalendar = useMemo(() => {
    if (!calendar || calendar.length === 0) return [];
    if (!schoolYear) return calendar;
    return calendar.filter(c => c.schoolYear === schoolYear);
  }, [calendar, schoolYear]);

  const hasCalendarMatch = useMemo(() => {
    if (!filteredCalendar || filteredCalendar.length === 0) return false;
    return true;
  }, [filteredCalendar]);

  const monthsToDisplay = useMemo(() => {
    if (filteredCalendar.length === 0) return MONTHS;
    return [...new Set(filteredCalendar.map(c => c.month as string))]
      .sort((a, b) => monthOrder.indexOf(a as string) - monthOrder.indexOf(b as string));
  }, [filteredCalendar]);

  const monthsByTerm = useMemo(() => {
    const groups: Record<string, string[]> = {};
    if (filteredCalendar.length === 0) {
      MONTHS.forEach((m, idx) => {
        let term = '1';
        if (idx >= 8) term = '3';
        else if (idx >= 4) term = '2';
        
        if (!groups[term]) groups[term] = [];
        groups[term].push(m);
      });
      return groups;
    }
    
    filteredCalendar.forEach(c => {
      const term = (c.term || '1').toString();
      if (!groups[term]) groups[term] = [];
      if (!groups[term].includes(c.month as string)) groups[term].push(c.month as string);
    });

    Object.keys(groups).forEach(t => {
      groups[t].sort((a, b) => monthOrder.indexOf(a as string) - monthOrder.indexOf(b as string));
    });

    return groups;
  }, [filteredCalendar]);

  const calendarMap = useMemo(() => {
    const map: { [month: string]: number } = {};
    if (filteredCalendar) {
      filteredCalendar.forEach(c => {
        const month = c.month as string;
        const term = (c.term || '1').toString();
        const key = `${month}_${term}`;
        map[key] = c.days;
      });
    }
    return map;
  }, [filteredCalendar]);

  const totals = useMemo(() => {
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalDays = 0;

      Object.keys(monthsByTerm).sort().forEach(term => {
          monthsByTerm[term].forEach(m => {
              const key = `${m}_${term}`;
              const data = attendanceData[key] || attendanceData[m] || { present: 0, absent: 0 };
              totalPresent += data.present;
              totalAbsent += data.absent;
              totalDays += calendarMap[key] || 0;
          });
      });

      return { present: totalPresent, absent: totalAbsent, total: totalDays };
  }, [attendanceData, calendarMap, monthsByTerm]);

  if (!hasCalendarMatch && schoolYear) {
    return (
      <div className="bg-white rounded-2xl border border-black shadow-none p-10 flex flex-col items-center justify-center text-center">
        <div className="bg-rose-50 text-rose-600 p-4 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-x-2"><path d="M21 8.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="m21 21-5-5"/><path d="m16 21 5-5"/><path d="M3 10h18"/></svg>
        </div>
        <h3 className="text-lg font-black text-black uppercase tracking-tight mb-2">No Matching Calendar</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          The Attendance Record cannot be displayed because there is no school calendar configured for <span className="font-bold text-black">SY {schoolYear}</span>.
        </p>
        <p className="text-slate-400 text-[10px] mt-4 uppercase font-black tracking-widest">Please contact your Administrator</p>
      </div>
    );
  }

  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-8 shadow-sm overflow-x-auto">
        <div className="flex justify-between items-center mb-8">
            <div className="flex flex-col">
               <h3 className="text-slate-900 font-bold text-sm tracking-tight uppercase italic">Attendance Record</h3>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Learner Tracking Detail</span>
            </div>
        </div>
        <table className="w-full border-collapse text-xs text-slate-700">
            <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="pb-4 text-left font-black opacity-40">Timeline</th>
                    {Object.keys(monthsByTerm).sort().map(term => (
                        <th key={term} colSpan={monthsByTerm[term].length} className="pb-4 text-center font-black text-indigo-400/60">Q{term}</th>
                    ))}
                    <th className="pb-4"></th>
                </tr>
                <tr className="text-slate-500 font-bold border-b border-slate-100">
                    <th className="py-4 text-left">Month</th>
                    {Object.keys(monthsByTerm).sort().map(term => 
                        monthsByTerm[term].map(m => (
                            <th key={`${m}_${term}`} className="py-4 text-center opacity-70">
                                {m.substring(0, 3)}
                            </th>
                        ))
                    )}
                    <th className="py-4 text-center text-slate-900 border-l border-slate-100 uppercase tracking-widest text-[10px] font-black">Total</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                <tr className="group">
                    <td className="py-5 font-bold text-slate-900">Present</td>
                    {Object.keys(monthsByTerm).sort().map(term => 
                        monthsByTerm[term].map(m => (
                            <td key={`${m}_${term}`} className="py-5 text-center text-slate-600">
                                {readOnly ? (
                                    <span className="font-bold text-slate-900 text-sm">{(attendanceData[`${m}_${term}`] || attendanceData[m])?.present || 0}</span>
                                ) : (
                                    <input 
                                        type="number"
                                        value={(attendanceData[`${m}_${term}`] || attendanceData[m])?.present || 0}
                                        onChange={(e) => onUpdate?.(`${m}_${term}`, 'present', parseInt(e.target.value) || 0)}
                                        className="w-10 text-center p-1 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                )}
                            </td>
                        ))
                    )}
                    <td className="py-5 text-center font-bold text-indigo-600 bg-indigo-50/20 border-l border-slate-100 text-base">{totals.present}</td>
                </tr>
                <tr className="group">
                    <td className="py-4 text-slate-500 font-medium">Absent</td>
                    {Object.keys(monthsByTerm).sort().map(term => 
                        monthsByTerm[term].map(m => (
                            <td key={`${m}_${term}`} className="py-4 text-center text-slate-400 font-medium">
                                {(attendanceData[`${m}_${term}`] || attendanceData[m])?.absent || 0}
                            </td>
                        ))
                    )}
                    <td className="py-4 text-center font-bold text-slate-400 bg-slate-50/30 border-l border-slate-100">{totals.absent}</td>
                </tr>
                <tr className="group">
                    <td className="py-4 text-slate-400 text-[10px] font-bold uppercase tracking-tighter">School Days</td>
                    {Object.keys(monthsByTerm).sort().map(term => 
                        monthsByTerm[term].map(m => (
                            <td key={`${m}_${term}`} className="py-4 text-center text-slate-300 font-medium italic">
                                {calendarMap[`${m}_${term}`] || 0}
                            </td>
                        ))
                    )}
                    <td className="py-4 text-center font-bold text-slate-300 bg-slate-50/20 border-l border-slate-100">{totals.total}</td>
                </tr>
            </tbody>
        </table>
        <div className="mt-8 flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="text-indigo-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              Automatic synchronization of absence based on school calendar configuration.
            </p>
        </div>
    </div>
  );
};
