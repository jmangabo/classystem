import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  LogIn, 
  LogOut, 
  Trash2, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Building,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { AttendanceScanLog, Section, Student } from '../types';
import { formatStudentName } from '../utils';

interface AttendanceScanReportProps {
  logs: AttendanceScanLog[];
  sections: Section[];
  students?: Student[];
  selectedSectionId?: string;
  onDeleteLog?: (logId: string) => void;
  onClearLogs?: (logIds?: string[]) => Promise<void> | void;
  schoolName?: string;
  schoolId?: string;
  division?: string;
  region?: string;
  currentUserEmail?: string;
}

export const AttendanceScanReport: React.FC<AttendanceScanReportProps> = ({
  logs = [],
  sections = [],
  students = [],
  selectedSectionId,
  onDeleteLog,
  onClearLogs,
  schoolName = "DepEd Public School",
  schoolId = "",
  division = "Division Office",
  region = "Region Office",
  currentUserEmail
}) => {
  const getTodayStr = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateFilter, setDateFilter] = useState<string>(getTodayStr());
  const [sectionFilter, setSectionFilter] = useState<string>(selectedSectionId || 'all');
  const [scanTypeFilter, setScanTypeFilter] = useState<'all' | 'IN' | 'OUT'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [singleDeleteLog, setSingleDeleteLog] = useState<AttendanceScanLog | null>(null);

  // Filter logs based on selection
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Date filter
      if (dateFilter && log.scanDate !== dateFilter) {
        return false;
      }
      // Section filter
      if (sectionFilter !== 'all' && log.sectionId !== sectionFilter) {
        return false;
      }
      // Scan Type filter
      if (scanTypeFilter !== 'all' && log.scanType !== scanTypeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (log.studentName || '').toLowerCase().includes(q);
        const matchesLrn = (log.lrn || '').toLowerCase().includes(q);
        const matchesSec = (log.sectionName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesLrn && !matchesSec) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, dateFilter, sectionFilter, scanTypeFilter, searchQuery]);

  // Statistics calculation for filtered date/section
  const stats = useMemo(() => {
    const todayLogs = logs.filter(l => (!dateFilter || l.scanDate === dateFilter) && (sectionFilter === 'all' || l.sectionId === sectionFilter));
    
    const timeInCount = todayLogs.filter(l => l.scanType === 'IN').length;
    const timeOutCount = todayLogs.filter(l => l.scanType === 'OUT').length;
    
    // Calculate currently inside school (Learners who have IN scan today without subsequent OUT scan)
    const studentStatusMap: Record<string, 'IN' | 'OUT'> = {};
    const sortedAsc = [...todayLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    sortedAsc.forEach(log => {
      studentStatusMap[log.studentId || log.lrn] = log.scanType;
    });

    const currentlyIn = Object.values(studentStatusMap).filter(st => st === 'IN').length;
    const uniqueStudentsScanned = Object.keys(studentStatusMap).length;

    return {
      totalScans: todayLogs.length,
      timeInCount,
      timeOutCount,
      currentlyIn,
      uniqueStudentsScanned
    };
  }, [logs, dateFilter, sectionFilter]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No attendance scan records to export.");
      return;
    }

    const headers = ["Log ID", "Date", "Time", "Learner Name", "LRN", "Grade & Section", "Scan Type", "Status", "Scanned By", "Timestamp"];
    const rows = filteredLogs.map(log => [
      `"${log.id}"`,
      `"${log.scanDate}"`,
      `"${log.scanTime}"`,
      `"${log.studentName.replace(/"/g, '""')}"`,
      `"${log.lrn}"`,
      `"Gr. ${log.gradeLevel || ''} - ${log.sectionName}"`,
      `"${log.scanType}"`,
      `"${log.status || 'Regular'}"`,
      `"${log.scannedBy || ''}"`,
      `"${log.timestamp}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Scan_Report_${dateFilter || 'All'}_${sectionFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeSectionObj = useMemo(() => {
    if (sectionFilter === 'all') return null;
    return sections.find(s => s.id === sectionFilter);
  }, [sections, sectionFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
              <Clock size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Real-Time ID Scanner Logs
                </span>
                {dateFilter === getTodayStr() && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Today
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
                Learner ID Attendance Scan Report (Time In / Out)
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Comprehensive audit trail of learner entry (Time In) and exit (Time Out) recorded via ID barcode/QR scanners.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Official Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <LogIn size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Time IN</span>
            <div className="text-2xl font-black text-slate-900">{stats.timeInCount}</div>
            <span className="text-[10px] font-bold text-emerald-600">Scanned Entry Logs</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <LogOut size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Time OUT</span>
            <div className="text-2xl font-black text-slate-900">{stats.timeOutCount}</div>
            <span className="text-[10px] font-bold text-amber-600">Scanned Exit Logs</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Currently On Campus</span>
            <div className="text-2xl font-black text-indigo-700">{stats.currentlyIn}</div>
            <span className="text-[10px] font-bold text-slate-500">Learners Inside School</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Unique Scanned</span>
            <div className="text-2xl font-black text-slate-800">{stats.uniqueStudentsScanned}</div>
            <span className="text-[10px] font-bold text-slate-500">{stats.totalScans} total log events</span>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search learner name, LRN, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  title="All Dates"
                  className="text-[10px] font-extrabold text-slate-400 hover:text-indigo-600 ml-1 uppercase"
                >
                  All
                </button>
              )}
            </div>

            {/* Section Filter */}
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Sections</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>
                  Gr. {sec.gradeLevel} - {sec.name}
                </option>
              ))}
            </select>

            {/* Scan Type Filter Pill Group */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setScanTypeFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  scanTypeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Logs
              </button>
              <button
                onClick={() => setScanTypeFilter('IN')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  scanTypeFilter === 'IN'
                    ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn size={12} />
                <span>Time IN</span>
              </button>
              <button
                onClick={() => setScanTypeFilter('OUT')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  scanTypeFilter === 'OUT'
                    ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogOut size={12} />
                <span>Time OUT</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Indicators */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-slate-800">{filteredLogs.length}</strong> record{filteredLogs.length === 1 ? '' : 's'}</span>
            {dateFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                📅 {dateFilter === getTodayStr() ? `Today (${dateFilter})` : dateFilter}
              </span>
            )}
            {sectionFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                🏫 {sections.find(s => s.id === sectionFilter)?.name || 'Section'}
              </span>
            )}
          </div>

          {onClearLogs && filteredLogs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-3 py-1.5 rounded-xl border border-rose-200/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Trash2 size={13} />
              <span>Clear Displayed Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scan Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Learner Name</th>
                <th className="py-3 px-4">LRN</th>
                <th className="py-3 px-4">Section / Grade</th>
                <th className="py-3 px-4 text-center">Scan Event</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Operator / Device</th>
                {onDeleteLog && <th className="py-3 px-4 text-center print:hidden">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock size={32} className="text-slate-300" />
                      <p className="font-bold text-slate-600">No attendance scan records found</p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Use the ID Scanner to scan learner barcodes or QR codes to log real-time Time IN and Time OUT timestamps.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const isTimeIn = log.scanType === 'IN';
                  return (
                    <tr key={log.id || `log-${index}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 text-[10px]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900">{log.scanTime}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{log.scanDate}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{log.studentName}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {log.lrn}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-700">
                          Gr. {log.gradeLevel || ''} - {log.sectionName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isTimeIn ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <LogIn size={12} className="text-emerald-600" />
                            <span>TIME IN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <LogOut size={12} className="text-amber-600" />
                            <span>TIME OUT</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          log.status === 'Late'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.status || 'On Time'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                        {log.scannedBy || 'Hardware Scanner'}
                      </td>
                      {onDeleteLog && (
                        <td className="py-3 px-4 text-center whitespace-nowrap print:hidden">
                          <button
                            type="button"
                            onClick={() => setSingleDeleteLog(log)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Delete Log"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Print Layout (Only visible when printing) */}
      <div className="hidden print:block font-serif text-black p-4 space-y-6">
        {/* Printable DepEd Header */}
        <div className="text-center space-y-1 border-b-2 border-black pb-4">
          <p className="text-[10pt] font-semibold tracking-widest uppercase">Republic of the Philippines</p>
          <p className="text-[12pt] font-bold uppercase">Department of Education</p>
          <p className="text-[10pt] italic">{region} • {division}</p>
          <h1 className="text-[14pt] font-black uppercase tracking-tight mt-2">{schoolName}</h1>
          {schoolId && <p className="text-[9pt] font-mono">School ID: {schoolId}</p>}
          <h2 className="text-[12pt] font-bold uppercase tracking-wider underline mt-3">
            LEARNER ATTENDANCE SCAN LOG REPORT (TIME IN & TIME OUT)
          </h2>
          <p className="text-[9pt] italic">
            Report Date: {dateFilter || 'All Recorded Dates'} | Section: {activeSectionObj ? `Grade ${activeSectionObj.gradeLevel} - ${activeSectionObj.name}` : 'All Sections'}
          </p>
        </div>

        {/* Summary Table */}
        <div className="grid grid-cols-4 gap-2 text-center text-[9pt] border border-black p-2 bg-slate-50">
          <div>
            <p className="font-bold">Total Scans</p>
            <p className="text-[11pt] font-black">{stats.totalScans}</p>
          </div>
          <div>
            <p className="font-bold">Time IN Count</p>
            <p className="text-[11pt] font-black">{stats.timeInCount}</p>
          </div>
          <div>
            <p className="font-bold">Time OUT Count</p>
            <p className="text-[11pt] font-black">{stats.timeOutCount}</p>
          </div>
          <div>
            <p className="font-bold">Learners Scanned</p>
            <p className="text-[11pt] font-black">{stats.uniqueStudentsScanned}</p>
          </div>
        </div>

        {/* Log Table */}
        <table className="w-full text-left border-collapse border border-black text-[9pt]">
          <thead>
            <tr className="bg-slate-100 border-b border-black font-bold uppercase text-[8pt]">
              <th className="border border-black p-1 text-center w-8">#</th>
              <th className="border border-black p-1">Date</th>
              <th className="border border-black p-1">Time</th>
              <th className="border border-black p-1">Learner Name</th>
              <th className="border border-black p-1">LRN</th>
              <th className="border border-black p-1">Section</th>
              <th className="border border-black p-1 text-center">Scan Event</th>
              <th className="border border-black p-1 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, i) => (
              <tr key={`print-log-${log.id || i}`} className="border-b border-black">
                <td className="border border-black p-1 text-center">{i + 1}</td>
                <td className="border border-black p-1 whitespace-nowrap">{log.scanDate}</td>
                <td className="border border-black p-1 whitespace-nowrap font-bold">{log.scanTime}</td>
                <td className="border border-black p-1 font-bold">{log.studentName}</td>
                <td className="border border-black p-1 font-mono">{log.lrn}</td>
                <td className="border border-black p-1">{log.sectionName}</td>
                <td className="border border-black p-1 text-center font-black">
                  {log.scanType === 'IN' ? 'TIME IN' : 'TIME OUT'}
                </td>
                <td className="border border-black p-1 text-center">{log.status || 'On Time'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Blocks */}
        <div className="pt-10 grid grid-cols-2 gap-12 text-[10pt]">
          <div className="text-center">
            <div className="border-b border-black w-48 mx-auto mb-1"></div>
            <p className="font-bold uppercase">Class Adviser / Scanner Officer</p>
            <p className="text-[8pt] text-slate-600">Signature over Printed Name</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black w-48 mx-auto mb-1"></div>
            <p className="font-bold uppercase">School Head / Principal</p>
            <p className="text-[8pt] text-slate-600">Signature over Printed Name</p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clear Displayed Logs */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Delete Attendance Scan Logs?</h3>
                <p className="text-xs font-semibold text-rose-600">Confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete the displayed <strong>Time In</strong> and <strong>Time Out</strong> attendance scan logs?
            </p>

            {/* Breakdown Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-800">
                <span className="font-bold">Total Logs to Delete:</span>
                <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  {filteredLogs.length} record{filteredLogs.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                    <LogIn size={12} /> Time IN Logs:
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {filteredLogs.filter(l => l.scanType === 'IN').length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                    <LogOut size={12} /> Time OUT Logs:
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {filteredLogs.filter(l => l.scanType === 'OUT').length}
                  </span>
                </div>
              </div>

              {(dateFilter || sectionFilter !== 'all' || scanTypeFilter !== 'all' || searchQuery) && (
                <div className="pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 space-y-0.5">
                  <span className="font-semibold text-slate-600 block">Applied Filters:</span>
                  {dateFilter && <p>• Date: <b>{dateFilter}</b></p>}
                  {sectionFilter !== 'all' && <p>• Section: <b>{sections.find(s => s.id === sectionFilter)?.name || sectionFilter}</b></p>}
                  {scanTypeFilter !== 'all' && <p>• Scan Type: <b>TIME {scanTypeFilter}</b></p>}
                  {searchQuery && <p>• Search: <b>"{searchQuery}"</b></p>}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 italic mb-6">
              * Note: Deleted scan logs will be permanently removed from the system database.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={async () => {
                  if (!onClearLogs) return;
                  setIsClearing(true);
                  try {
                    const ids = filteredLogs.map(l => l.id);
                    await onClearLogs(ids);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsClearing(false);
                    setShowClearConfirmModal(false);
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors shadow-md shadow-rose-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>{isClearing ? "Deleting..." : "Yes, Delete Logs"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Log Deletion */}
      {singleDeleteLog && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Scan Log Entry?</h3>
                <p className="text-[11px] font-semibold text-rose-600">{singleDeleteLog.studentName}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-1 text-xs">
              <p className="text-slate-700"><strong>Scan Event:</strong> <span className={singleDeleteLog.scanType === 'IN' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>TIME {singleDeleteLog.scanType}</span></p>
              <p className="text-slate-700"><strong>Time:</strong> {singleDeleteLog.scanTime} ({singleDeleteLog.scanDate})</p>
              <p className="text-slate-700"><strong>LRN:</strong> {singleDeleteLog.lrn}</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSingleDeleteLog(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteLog && singleDeleteLog.id) {
                    onDeleteLog(singleDeleteLog.id);
                  }
                  setSingleDeleteLog(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
