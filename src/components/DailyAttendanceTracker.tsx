import { formatStudentName } from "../utils";
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Student, AttendanceScanLog, Section } from '../types';
import { Filter, Calendar as CalendarIcon, QrCode, X, CheckCircle, AlertCircle, AlertTriangle, Clock, LogIn, LogOut } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { AttendanceScanReport } from './AttendanceScanReport';

interface DailyAttendanceTrackerProps {
  students: Student[];
  calendar: any[];
  onUpdateAttendance: (studentId: string, month: string, day: number, present: boolean) => void;
  onMarkAllPresent: (studentId: string, month: string) => void;
  schoolYear?: string;
  userId?: string;
  section?: Section;
  sections?: Section[];
  scanLogs?: AttendanceScanLog[];
  onAddScanLog?: (log: Omit<AttendanceScanLog, 'id'>) => Promise<void> | void;
  onDeleteScanLog?: (logId: string) => Promise<void> | void;
  onClearScanLogs?: (logIds?: string[]) => Promise<void> | void;
  currentUserEmail?: string;
  schoolName?: string;
  schoolId?: string;
  division?: string;
  region?: string;
  onScanID?: () => void;
}

const MONTHS = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];

// Simple placeholder for Philippine holidays (static ones)
const PHILIPPINE_HOLIDAYS: Record<string, string> = {
  '01-01': 'New Year',
  '04-09': 'Araw ng Kagitingan',
  '05-01': 'Labor Day',
  '06-12': 'Independence Day',
  '08-21': 'Ninoy Aquino Day',
  '11-01': 'All Saints Day',
  '11-30': 'Bonifacio Day',
  '12-25': 'Christmas Day',
  '12-30': 'Rizal Day',
};

const monthIndices: { [key: string]: number } = {
  'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
  'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
};

export const DailyAttendanceTracker: React.FC<DailyAttendanceTrackerProps> = ({ 
  students, 
  calendar, 
  onUpdateAttendance, 
  onMarkAllPresent, 
  schoolYear, 
  userId,
  section,
  sections = [],
  scanLogs = [],
  onAddScanLog,
  onDeleteScanLog,
  onClearScanLogs,
  currentUserEmail,
  schoolName,
  schoolId,
  division,
  region,
  onScanID
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'scan_report'>('grid');
  const [scanMode, setScanMode] = useState<'auto' | 'in' | 'out'>('auto');
  const [recentScan, setRecentScan] = useState<{ status: 'success' | 'error', message: string, student?: Student | null, scanType?: 'IN' | 'OUT' } | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [scannerError, setScannerError] = useState<string | null>(null);

  const scannerConstraints = useMemo(() => ({
    facingMode: facingMode
  }), [facingMode]);

  const scannerComponents = useMemo(() => ({
    audio: false,
    finder: true,
  }), []);

  const [selectedTerm, setSelectedTerm] = useState<string>(() => {
    if (userId) {
      return localStorage.getItem(`dailyAttendance_selectedTerm_${userId}`) || 'all';
    }
    return 'all';
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (userId) {
      return localStorage.getItem(`dailyAttendance_selectedMonth_${userId}`) || 'all';
    }
    return 'all';
  });

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`dailyAttendance_selectedTerm_${userId}`, selectedTerm);
    }
  }, [selectedTerm, userId]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`dailyAttendance_selectedMonth_${userId}`, selectedMonth);
    }
  }, [selectedMonth, userId]);

  const monthIndices: { [key: string]: number } = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];

  const filteredCalendar = useMemo(() => {
    if (!calendar || calendar.length === 0) return [];
    if (!schoolYear) return calendar;
    const filtered = calendar.filter(c => c.schoolYear === schoolYear);
    
    // Sort by month order
    return filtered.sort((a, b) => monthOrder.indexOf(a.month as string) - monthOrder.indexOf(b.month as string));
  }, [calendar, schoolYear]);

  const hasCalendarMatch = useMemo(() => {
    if (!filteredCalendar || filteredCalendar.length === 0) return false;
    return true;
  }, [filteredCalendar]);

  const calendarMap = useMemo(() => {
    const map: { [key: string]: { schoolDays: number, year: number, term: string, month: string, openingDate: number, closingDate: number, validDays: number[], localHolidays: number[] } } = {};
    filteredCalendar.forEach(c => {
      const term = (c.term || '1').toString();
      const month = c.month as string;
      const key = `${month}_${term}`;
      const year = parseInt(c.year);
      const openingDate = parseInt(c.openingDate || '1');
      const closingDate = parseInt(c.closingDate || '31');
      const localHolidays = c.localHolidays || [];
      const daysInMonth = new Date(year, (monthIndices[month] || 0) + 1, 0).getDate();

      // Collect all possible school days for the month
      const allSchoolDays: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, monthIndices[month], d);
        const dayOfWeek = date.getDay();
        const dateStr = `${(monthIndices[month] + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = !!PHILIPPINE_HOLIDAYS[dateStr];
        if (!isWeekend && !isHoliday) {
          allSchoolDays.push(d);
        }
      }

      const hasManualCoverage = openingDate !== 1 || (closingDate !== 31 && closingDate !== daysInMonth);
      let validDays: number[] = [];

      if (hasManualCoverage) {
        validDays = allSchoolDays.filter(d => d >= openingDate && d <= closingDate);
      } else {
        // Dynamic split
        const allEntriesForMonth = filteredCalendar.filter(entry => entry.month === month)
          .sort((a, b) => (parseInt(a.term) || 1) - (parseInt(b.term) || 1));
        
        const currentTermNum = parseInt(term);
        let startIndex = 0;
        for (const entry of allEntriesForMonth) {
          if ((parseInt(entry.term) || 1) < currentTermNum) {
            startIndex += parseInt(entry.days) || 0;
          } else {
            break;
          }
        }
        const daysToTake = parseInt(c.days) || allSchoolDays.length;
        validDays = allSchoolDays.slice(startIndex, startIndex + daysToTake);
      }

      map[key] = { 
        schoolDays: c.days, 
        year, 
        term, 
        month,
        openingDate,
        closingDate,
        validDays,
        localHolidays
      };
    });
    return map;
  }, [filteredCalendar]);

  const monthsByTerm = useMemo(() => {
    const terms: Record<string, string[]> = {};
    if (filteredCalendar.length === 0) {
      MONTHS.forEach((m, idx) => {
        let term = '1';
        if (idx >= 8) term = '3';
        else if (idx >= 4) term = '2';
        
        if (!terms[term]) terms[term] = [];
        terms[term].push(m);
      });
    } else {
      // Use the actual calendar entries to group months by term, appearing as many times as they are in the calendar
      filteredCalendar.forEach(c => {
        const term = (c.term || '1').toString();
        if (!terms[term]) terms[term] = [];
        terms[term].push(c.month as string);
      });
    }

    // Sort terms numeric
    const sortedTerms = Object.keys(terms).sort((a, b) => parseInt(a) - parseInt(b));

    // Sort months within terms based on the monthOrder
    sortedTerms.forEach(t => {
      terms[t].sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    });

    // Apply filters
    const finalTerms: Record<string, string[]> = {};
    sortedTerms.forEach(term => {
      if (selectedTerm !== 'all' && term !== selectedTerm) return;
      
      const filteredMonths = terms[term].filter(month => {
        return selectedMonth === 'all' || month === selectedMonth;
      });
      
      if (filteredMonths.length > 0) {
        finalTerms[term] = filteredMonths;
      }
    });

    return finalTerms;
  }, [filteredCalendar, selectedTerm, selectedMonth]);

  const availableTerms = useMemo(() => {
    const terms = new Set<string>();
    if (filteredCalendar.length === 0) {
      return ['1', '2', '3', '4'];
    }
    filteredCalendar.forEach(c => terms.add((c.term || '1').toString()));
    return Array.from(terms).sort();
  }, [filteredCalendar]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    if (filteredCalendar.length === 0) {
        return MONTHS;
    }
    filteredCalendar.forEach(c => months.add(c.month as string));
    return Array.from(months).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  }, [filteredCalendar]);

  const getDaysInMonth = (year: number, month: string) => {
    const index = monthIndices[month];
    if (index === undefined) return 31;
    // Next month's 0th day is the last day of this month
    return new Date(year, index + 1, 0).getDate();
  };

  const handleScan = (scannedLrn: string) => {
    if (!scannedLrn) return;
    
    // Find student by LRN
    const student = students.find(s => s.lrn === scannedLrn);
    if (!student) {
      setRecentScan({ status: 'error', message: `LRN ${scannedLrn} not found in this section.`, student: null });
      setTimeout(() => setRecentScan(null), 3500);
      return;
    }

    // Get current date and formatted strings
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthStr = MONTHS[today.getMonth()];
    const currentDay = today.getDate();

    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const scanDate = `${currentYear}-${monthStr}-${dayStr}`;
    
    const scanTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    // Find the term key for the current month/year
    let termKeyToUpdate: string | null = null;
    for (const key of Object.keys(calendarMap)) {
      const data = calendarMap[key];
      if (data.year === currentYear && data.month === currentMonthStr) {
        // Double check if day is within valid days
        if (data.validDays.includes(currentDay)) {
          termKeyToUpdate = key;
          break;
        }
      }
    }

    if (!termKeyToUpdate) {
      setRecentScan({ status: 'error', message: `Today (${currentMonthStr} ${currentDay}) is not a valid school day in the calendar.`, student });
      setTimeout(() => setRecentScan(null), 3500);
      return;
    }

    // Check if day is disabled for student
    const isDisabled = isDayDisabledForStudent(student, currentYear, currentMonthStr, currentDay);
    if (isDisabled) {
      setRecentScan({ status: 'error', message: `${formatStudentName(student)} is inactive or not enrolled today.`, student });
      setTimeout(() => setRecentScan(null), 3500);
      return;
    }

    // Determine scanType (IN vs OUT)
    let scanType: 'IN' | 'OUT' = 'IN';
    if (scanMode === 'in') {
      scanType = 'IN';
    } else if (scanMode === 'out') {
      scanType = 'OUT';
    } else {
      // Auto-detect mode: inspect student's today scan logs
      const studentTodayLogs = scanLogs
        .filter(l => l.scanDate === scanDate && (l.studentId === student.id || l.lrn === student.lrn))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (studentTodayLogs.length > 0) {
        const lastLog = studentTodayLogs[studentTodayLogs.length - 1];
        if (lastLog.scanType === 'IN') {
          scanType = 'OUT';
        } else {
          scanType = 'IN';
        }
      } else {
        scanType = 'IN';
      }
    }

    // Mark present
    onUpdateAttendance(student.id, termKeyToUpdate, currentDay, true);

    // Record scan log
    if (onAddScanLog) {
      onAddScanLog({
        studentId: student.id,
        studentName: formatStudentName(student),
        lrn: student.lrn || '',
        sectionId: section?.id || student.sectionId || '',
        sectionName: section?.name || student.sectionName || 'Section',
        gradeLevel: section?.gradeLevel || student.gradeLevel || 0,
        schoolId: section?.schoolId || schoolId || '',
        schoolYear: schoolYear || section?.schoolYear || '',
        scanDate,
        scanTime,
        scanType,
        timestamp: today.toISOString(),
        scannedBy: currentUserEmail || 'ID Scanner',
        status: 'On Time'
      });
    }

    setRecentScan({ 
      status: 'success', 
      message: `${formatStudentName(student)} logged TIME ${scanType} at ${scanTime}.`, 
      student,
      scanType
    });
    setTimeout(() => setRecentScan(null), 3500);
  };

  const trackerScanRef = useRef(handleScan);
  useEffect(() => {
    trackerScanRef.current = handleScan;
  }, [handleScan]);

  const handleScannerError = useCallback((err: any) => {
    console.error("Scanner Error:", err?.message || err);
    let errMsg = "Unable to access camera.";
    
    if (err && typeof err === 'object') {
      const errName = err.name || err.kind || '';
      const errMsgStr = (err.message || '').toLowerCase();
      
      const isPermissionDenied = 
        errName === 'NotAllowedError' || 
        errName === 'PermissionDeniedError' || 
        errName === 'permission-denied' ||
        errMsgStr.includes('not allowed') || 
        errMsgStr.includes('permission') || 
        errMsgStr.includes('denied') || 
        errMsgStr.includes('current context');
        
      if (isPermissionDenied) {
        errMsg = "Camera permission denied or blocked. If you are using this app inside the preview frame, please click 'Open in New Tab' at the top-right of the preview to allow camera access.";
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errName === 'no-camera' || errMsgStr.includes('notfound') || errMsgStr.includes('no camera')) {
        errMsg = "No camera device found.";
      } else if (errName === 'OverconstrainedError' || errName === 'overconstrained') {
        errMsg = "Selected camera type is not available. Please try switching cameras.";
      } else if (err.message) {
        errMsg = err.message;
      }
    } else if (typeof err === 'string') {
      const lowerErr = err.toLowerCase();
      if (lowerErr.includes('not allowed') || lowerErr.includes('permission') || lowerErr.includes('denied') || lowerErr.includes('current context')) {
        errMsg = "Camera permission denied or blocked. If you are using this app inside the preview frame, please click 'Open in New Tab' at the top-right of the preview to allow camera access.";
      } else {
        errMsg = err;
      }
    }
    
    setScannerError(errMsg);
  }, []);

  const handleScannerScan = useCallback((result: any[]) => {
    if (result && result.length > 0) {
      trackerScanRef.current(result[0].rawValue);
    }
  }, []);

  const getDateInfo = (year: number, month: string, day: number, termKey: string) => {
    const monthIndex = monthIndices[month];
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
    const dateStr = `${(monthIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Check if day falls within the term's coverage for this month
    const calendarData = calendarMap[termKey];

    const isLocalHoliday = calendarData?.localHolidays?.includes(day);
    const isHoliday = !!PHILIPPINE_HOLIDAYS[dateStr] || isLocalHoliday;
    const holidayName = isLocalHoliday ? 'Special Non-Working Holiday' : (PHILIPPINE_HOLIDAYS[dateStr] || '');
    
    let isOutsideCoverage = false;
    
    if (calendarData) {
      if (!calendarData.validDays.includes(day)) {
        isOutsideCoverage = true;
      }
    } else {
      // Fallback for missing calendar data
      const isFirstMonth = filteredCalendar.length > 0 && month === filteredCalendar[0].month;
      const openingDate = isFirstMonth ? parseInt(filteredCalendar[0].openingDate || '1') : 1;
      if (isFirstMonth && day < openingDate) {
        isOutsideCoverage = true;
      }
    }

    return {
      dayOfWeek: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayOfWeek],
      disabled: isWeekend || isHoliday || isOutsideCoverage,
      isWeekend,
      isHoliday,
      holidayName
    };
  };

  const isDayDisabledForStudent = (student: Student, year: number, month: string, day: number) => {
    // Check Date of First Attendance
    if (student.dateOfFirstAttendance) {
      const [fYear, fMonth, fDay] = student.dateOfFirstAttendance.split('-').map(Number);
      const currentMonthIdx = monthIndices[month];
      
      if (year < fYear) return true;
      if (year === fYear) {
        if (currentMonthIdx < (fMonth - 1)) return true;
        if (currentMonthIdx === (fMonth - 1) && day < fDay) return true;
      }
    }

    // Check Transferred Out / Dropped Out
    if (student.status === 'Dropped Out' || student.status === 'Transferred Out') {
      if (student.dropoutDate) {
        const [dYear, dMonth, dDay] = student.dropoutDate.split('-').map(Number);
        const currentMonthIdx = monthIndices[month];
        
        if (year > dYear) return true;
        if (year === dYear) {
          if (currentMonthIdx > (dMonth - 1)) return true;
          if (currentMonthIdx === (dMonth - 1) && day >= dDay) return true;
        }
      }
    }

    return false;
  };

  const sortedStudents = useMemo(() => {
    const male = students
      .filter(s => s.sex?.toLowerCase() === 'male')
      .sort((a, b) => a.name.localeCompare(b.name));
    const female = students
      .filter(s => s.sex?.toLowerCase() === 'female')
      .sort((a, b) => a.name.localeCompare(b.name));
    return { male, female };
  }, [students]);

  const isStudentVisibleInMonth = (student: Student, month: string, year: number) => {
    // Check Date of First Attendance
    if (student.dateOfFirstAttendance) {
      const parts = student.dateOfFirstAttendance.split('-');
      if (parts.length === 3) {
        const foaYear = parseInt(parts[0]);
        const foaMonth = parseInt(parts[1]) - 1;
        const currentMonthIdx = monthIndices[month];
        if (foaYear > year || (foaYear === year && foaMonth > currentMonthIdx)) {
          return false;
        }
      }
    }

    // Check Transferred Out / Dropped Out
    if (student.status === 'Dropped Out' || student.status === 'Transferred Out') {
      if (student.dropoutDate) {
        const parts = student.dropoutDate.split('-');
        if (parts.length === 3) {
          const dropYear = parseInt(parts[0]);
          const dropMonth = parseInt(parts[1]) - 1;
          const currentMonthIdx = monthIndices[month];
          // Visible only if current month is BEFORE or EQUAL to drop month
          if (year > dropYear || (year === dropYear && currentMonthIdx > dropMonth)) {
            return false;
          }
        }
      }
    }

    return true;
  };

  if (!hasCalendarMatch && schoolYear) {
    return (
      <div className="bg-white rounded-2xl border border-black shadow-none p-10 flex flex-col items-center justify-center text-center">
        <div className="bg-rose-50 text-rose-600 p-4 rounded-full mb-4">
          <CalendarIcon size={32} />
        </div>
        <h3 className="text-lg font-black text-black uppercase tracking-tight mb-2">No Matching Calendar</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          The Daily Attendance Tracker cannot be displayed because there is no school calendar configured for <span className="font-bold text-black">SY {schoolYear}</span>.
        </p>
        <p className="text-slate-400 text-[10px] mt-4 uppercase font-black tracking-widest">Please contact your Administrator</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col gap-0">
      {/* Standardized Header */}
      <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 border border-indigo-500 shrink-0">
               <CalendarIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Daily Attendance Tracker</h2>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Record & monitor learner attendance & scan logs</p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300/80 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon size={14} />
              <span>Daily Matrix Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('scan_report')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'scan_report'
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock size={14} />
              <span>ID Scan Logs (In & Out)</span>
            </button>
          </div>
        </div>

        <button 
          onClick={() => {
            if (onScanID) onScanID();
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 cursor-pointer self-start md:self-auto"
        >
          <QrCode size={16} />
          Scan QR ID
        </button>
      </div>

      {viewMode === 'scan_report' ? (
        <div className="p-6">
          <AttendanceScanReport
            logs={scanLogs}
            sections={sections.length > 0 ? sections : section ? [section] : []}
            students={students}
            selectedSectionId={section?.id}
            onDeleteLog={onDeleteScanLog}
            onClearLogs={onClearScanLogs}
            currentUserEmail={currentUserEmail}
            schoolName={schoolName}
            schoolId={schoolId}
            division={division}
            region={region}
          />
        </div>
      ) : (
        <>
          {/* Selectors Area */}
          <div className="p-6 border-b border-slate-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <select 
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 px-4 pr-10 py-1.5 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-indigo-300 transition-all shadow-sm"
                >
                  <option value="all">All Terms</option>
                  {availableTerms.map(term => (
                    <option key={term} value={term}>Term {term}</option>
                  ))}
                </select>
                <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 pointer-events-none transition-colors" />
              </div>

              <div className="relative group">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 px-4 pr-10 py-1.5 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-indigo-300 transition-all shadow-sm"
                >
                  <option value="all">All Months</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                <CalendarIcon size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 pointer-events-none transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-2 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
               <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
               <span>Quick Instruction: Check the box if the learner is present.</span>
            </div>
          </div>

      <div className="px-6 pb-6 pt-0 overflow-auto max-h-[650px] relative custom-scrollbar">
          <table className="w-full border-collapse border border-black text-[10px] text-black">
              <thead>
                  <tr className="bg-white border-b-2 border-black">
                      <th className="p-2 border border-black font-black uppercase text-left sticky left-0 top-0 bg-white z-30 shadow-[inset_0_-2px_0_#000]">Month</th>
                      {[...Array(31)].map((_, i) => (
                          <th key={i} className="p-1 border border-black text-center font-black sticky top-0 bg-white z-20 shadow-[inset_0_-2px_0_#000]">{i + 1}</th>
                      ))}
                      <th className="p-2 border border-black text-center font-black bg-black text-white sticky top-0 z-20 shadow-[inset_0_-2px_0_#000]">Total</th>
                  </tr>
              </thead>
              <tbody>
                {/* Males */}
                {sortedStudents.male.length > 0 && (
                  <tr className="bg-blue-600 text-white font-black uppercase">
                    <td colSpan={33} className="p-2 text-center text-xs tracking-widest">Male Students</td>
                  </tr>
                )}
                  {sortedStudents.male.map(student => {
                    // Check if student has any visible months in the currently filtered view
                    const hasVisibleMonths = Object.keys(monthsByTerm).some(term => {
                      return monthsByTerm[term].some(month => {
                        const key = `${month}_${term}`;
                        const calendarData = calendarMap[key];
                        const year = calendarData?.year || new Date().getFullYear();
                        return isStudentVisibleInMonth(student, month, year);
                      });
                    });

                    if (!hasVisibleMonths) return null;

                    return (
                      <React.Fragment key={student.id}>
                        <tr className="bg-slate-100 font-bold border-b border-black">
                          <td colSpan={33} className="p-2 sticky left-0 bg-slate-100 z-10 flex items-center gap-2">
                            {formatStudentName(student)}
                            {student.status === 'Dropped Out' && (
                              <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tight ml-2 border border-orange-200">
                                Dropped Out: <span className="text-black/80">{student.dropoutDate || 'N/A'}</span>
                                {student.dropoutReason && <span className="ml-1 text-black/60 italic lowercase font-normal whitespace-nowrap text-xs">({student.dropoutReason})</span>}
                              </span>
                            )}
                            {student.status === 'Transferred Out' && (
                              <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tight ml-2 border border-rose-200">
                                Transferred Out: <span className="text-black/80">{student.dropoutDate || 'N/A'}</span>
                                {student.dropoutReason && <span className="ml-1 text-black/60 italic lowercase font-normal whitespace-nowrap text-xs">({student.dropoutReason})</span>}
                              </span>
                            )}
                          </td>
                        </tr>
                        {Object.keys(monthsByTerm).sort().map(term => {
                          const termMonths = monthsByTerm[term].filter(month => {
                            const key = `${month}_${term}`;
                            const calendarData = calendarMap[key];
                            const year = calendarData?.year || new Date().getFullYear();
                            return isStudentVisibleInMonth(student, month, year);
                          });

                          if (termMonths.length === 0) return null;

                          return (
                            <React.Fragment key={`${student.id}-${term}`}>
                              <tr className="bg-slate-50 border-b border-black/10">
                                <td colSpan={33} className="p-1.5 px-3 text-[9px] font-black text-indigo-600 uppercase tracking-widest italic sticky left-0 bg-slate-50 z-10">T{term}</td>
                              </tr>
                              {termMonths.map(month => {
                                  const key = `${month}_${term}`;
                                  const calendarData = calendarMap[key];
                                  const year = calendarData?.year || new Date().getFullYear();
                                  const daysInMonth = getDaysInMonth(year, month);
                                  const studentMonthlyAttendance = student.dailyAttendance?.[key] || student.dailyAttendance?.[month] || {};
                                  
                                  const isDropoutMonth = student.dropoutDate && (() => {
                                    const parts = student.dropoutDate.split('-');
                                    if (parts.length === 3) {
                                      const dYear = parseInt(parts[0]);
                                      const dMonth = parseInt(parts[1]) - 1;
                                      return year === dYear && monthIndices[month] === dMonth;
                                    }
                                    return false;
                                  })();

                                  let presentCount = 0;
                                  [...Array(daysInMonth)].forEach((_, i) => {
                                      if (studentMonthlyAttendance[i + 1]) presentCount++;
                                  });
                                  
                                  return (
                                      <tr key={`${student.id}-${key}`}>
                                          <td className="p-2 border border-black font-bold flex items-center justify-between sticky left-0 bg-white z-10 min-w-[120px]">
                                            <div className="flex flex-col">
                                              <span className="text-indigo-600 text-[7px] uppercase font-black leading-none mb-0.5">Term {term}</span>
                                              <div className="flex items-center gap-1">
                                                <span>{month}</span>
                                                {isDropoutMonth && student.status === 'Dropped Out' && (
                                                  <span className="text-[6px] bg-orange-100 text-orange-600 px-1 py-0.5 rounded-full font-black uppercase tracking-tighter" title={student.dropoutReason ? `Reason: ${student.dropoutReason}` : 'Dropped'}>
                                                    DRP
                                                  </span>
                                                )}
                                                {isDropoutMonth && student.status === 'Transferred Out' && (
                                                  <span className="text-[6px] bg-rose-100 text-rose-600 px-1 py-0.5 rounded-full font-black uppercase tracking-tighter" title={student.dropoutReason ? `Reason: ${student.dropoutReason}` : 'Transferred'}>
                                                    T/O
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <button onClick={() => onMarkAllPresent(student.id, key)} className="bg-indigo-600 text-white text-[7px] px-1.5 py-0.5 rounded-full uppercase font-black hover:bg-indigo-700 transition-colors ml-2">Fill</button>
                                          </td>
                                          {[...Array(31)].map((_, i) => {
                                              const day = i + 1;
                                              if (day > daysInMonth) return <td key={day} className="p-1 border border-black bg-slate-50"></td>;
                                              
                                              const dateInfo = getDateInfo(year, month, day, key);
                                              const studentSpecificDisabled = isDayDisabledForStudent(student, year, month, day);
                                              const finalDisabled = dateInfo.disabled || studentSpecificDisabled;
                                              
                                              return (
                                                  <td key={day} className={`p-1 border border-black text-center ${dateInfo.isWeekend ? 'bg-rose-50' : dateInfo.isHoliday ? 'bg-amber-50' : studentSpecificDisabled ? 'bg-slate-100' : ''}`} title={dateInfo.isHoliday && dateInfo.holidayName ? `Holiday: ${dateInfo.holidayName}` : studentSpecificDisabled ? 'Student Inactive' : ''}>
                                                      <input
                                                          type="checkbox"
                                                          checked={!!studentMonthlyAttendance[day]}
                                                          onChange={finalDisabled ? undefined : () => onUpdateAttendance(student.id, key, day, !studentMonthlyAttendance[day])}
                                                          disabled={finalDisabled}
                                                          className={`cursor-pointer ${finalDisabled ? 'opacity-20 cursor-not-allowed' : 'accent-indigo-600'}`}
                                                          title={dateInfo.isWeekend ? 'Weekend' : dateInfo.isHoliday && dateInfo.holidayName ? `Holiday: ${dateInfo.holidayName}` : studentSpecificDisabled ? 'Student Inactive' : ''}
                                                      />
                                                  </td>
                                              );
                                          })}
                                          <td className="p-2 border border-black text-center font-black bg-white">{presentCount}</td>
                                      </tr>
                                  );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
  
                  {/* Females */}
                  {sortedStudents.female.length > 0 && (
                    <tr className="bg-rose-600 text-white font-black uppercase">
                      <td colSpan={33} className="p-2 text-center text-xs tracking-widest">Female Students</td>
                    </tr>
                  )}
                  {sortedStudents.female.map(student => {
                    // Check if student has any visible months in the currently filtered view
                    const hasVisibleMonths = Object.keys(monthsByTerm).some(term => {
                      return monthsByTerm[term].some(month => {
                        const key = `${month}_${term}`;
                        const calendarData = calendarMap[key];
                        const year = calendarData?.year || new Date().getFullYear();
                        return isStudentVisibleInMonth(student, month, year);
                      });
                    });

                    if (!hasVisibleMonths) return null;

                    return (
                      <React.Fragment key={student.id}>
                        <tr className="bg-slate-100 font-bold border-b border-black">
                          <td colSpan={33} className="p-2 sticky left-0 bg-slate-100 z-10 flex items-center gap-2">
                            {formatStudentName(student)}
                            {student.status === 'Dropped Out' && (
                              <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tight ml-2 border border-orange-200">
                                Dropped Out: <span className="text-black/80">{student.dropoutDate || 'N/A'}</span>
                                {student.dropoutReason && <span className="ml-1 text-black/60 italic lowercase font-normal whitespace-nowrap text-xs">({student.dropoutReason})</span>}
                              </span>
                            )}
                            {student.status === 'Transferred Out' && (
                              <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tight ml-2 border border-rose-200">
                                Transferred Out: <span className="text-black/80">{student.dropoutDate || 'N/A'}</span>
                                {student.dropoutReason && <span className="ml-1 text-black/60 italic lowercase font-normal whitespace-nowrap text-xs">({student.dropoutReason})</span>}
                              </span>
                            )}
                          </td>
                        </tr>
                        {Object.keys(monthsByTerm).sort().map(term => {
                          const termMonths = monthsByTerm[term].filter(month => {
                            const key = `${month}_${term}`;
                            const calendarData = calendarMap[key];
                            const year = calendarData?.year || new Date().getFullYear();
                            return isStudentVisibleInMonth(student, month, year);
                          });

                          if (termMonths.length === 0) return null;

                          return (
                            <React.Fragment key={`${student.id}-${term}`}>
                               <tr className="bg-slate-50 border-b border-black/10">
                                 <td colSpan={33} className="p-1.5 px-3 text-[9px] font-black text-indigo-600 uppercase tracking-widest italic sticky left-0 bg-slate-50 z-10">T{term}</td>
                              </tr>
                              {termMonths.map(month => {
                                  const key = `${month}_${term}`;
                                  const calendarData = calendarMap[key];
                                  const year = calendarData?.year || new Date().getFullYear();
                                  const daysInMonth = getDaysInMonth(year, month);
                                  const studentMonthlyAttendance = student.dailyAttendance?.[key] || student.dailyAttendance?.[month] || {};
                                  
                                  const isDropoutMonth = student.dropoutDate && (() => {
                                    const parts = student.dropoutDate.split('-');
                                    if (parts.length === 3) {
                                      const dYear = parseInt(parts[0]);
                                      const dMonth = parseInt(parts[1]) - 1;
                                      return year === dYear && monthIndices[month] === dMonth;
                                    }
                                    return false;
                                  })();

                                  let presentCount = 0;
                                  [...Array(daysInMonth)].forEach((_, i) => {
                                      if (studentMonthlyAttendance[i + 1]) presentCount++;
                                  });
                                  
                                  return (
                                      <tr key={`${student.id}-${key}`}>
                                          <td className="p-2 border border-black font-bold flex items-center justify-between sticky left-0 bg-white z-10 min-w-[120px]">
                                            <div className="flex flex-col">
                                              <span className="text-indigo-600 text-[7px] uppercase font-black leading-none mb-0.5">Term {term}</span>
                                              <div className="flex items-center gap-1">
                                                <span>{month}</span>
                                                {isDropoutMonth && student.status === 'Dropped Out' && (
                                                  <span className="text-[6px] bg-orange-100 text-orange-600 px-1 py-0.5 rounded-full font-black uppercase tracking-tighter" title={student.dropoutReason ? `Reason: ${student.dropoutReason}` : 'Dropped'}>
                                                    DRP
                                                  </span>
                                                )}
                                                {isDropoutMonth && student.status === 'Transferred Out' && (
                                                  <span className="text-[6px] bg-rose-100 text-rose-600 px-1 py-0.5 rounded-full font-black uppercase tracking-tighter" title={student.dropoutReason ? `Reason: ${student.dropoutReason}` : 'Transferred'}>
                                                    T/O
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <button onClick={() => onMarkAllPresent(student.id, key)} className="bg-indigo-600 text-white text-[7px] px-1.5 py-0.5 rounded-full uppercase font-black hover:bg-indigo-700 transition-colors ml-2">Fill</button>
                                          </td>
                                          {[...Array(31)].map((_, i) => {
                                              const day = i + 1;
                                              if (day > daysInMonth) return <td key={day} className="p-1 border border-black bg-slate-50"></td>;
                                              
                                              const dateInfo = getDateInfo(year, month, day, key);
                                              const studentSpecificDisabled = isDayDisabledForStudent(student, year, month, day);
                                              const finalDisabled = dateInfo.disabled || studentSpecificDisabled;
                                              
                                              return (
                                                  <td key={day} className={`p-1 border border-black text-center ${dateInfo.isWeekend ? 'bg-rose-50' : dateInfo.isHoliday ? 'bg-amber-50' : studentSpecificDisabled ? 'bg-slate-100' : ''}`} title={dateInfo.isHoliday && dateInfo.holidayName ? `Holiday: ${dateInfo.holidayName}` : studentSpecificDisabled ? 'Student Inactive' : ''}>
                                                      <input
                                                          type="checkbox"
                                                          checked={!!studentMonthlyAttendance[day]}
                                                          onChange={finalDisabled ? undefined : () => onUpdateAttendance(student.id, key, day, !studentMonthlyAttendance[day])}
                                                          disabled={finalDisabled}
                                                          className={`cursor-pointer ${finalDisabled ? 'opacity-20 cursor-not-allowed' : 'accent-indigo-600'}`}
                                                          title={dateInfo.isWeekend ? 'Weekend' : dateInfo.isHoliday && dateInfo.holidayName ? `Holiday: ${dateInfo.holidayName}` : studentSpecificDisabled ? 'Student Inactive' : ''}
                                                      />
                                                  </td>
                                              );
                                          })}
                                          <td className="p-2 border border-black text-center font-black bg-white">{presentCount}</td>
                                      </tr>
                                  );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
            </tbody>
        </table>
        </div>
      </>
      )}

    </div>
  );
};
