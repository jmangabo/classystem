/**

 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Scanner } from "@yudiel/react-qr-scanner";
import { QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { 
  Users, 
  BookOpen, 
  Plus, 
  Search, 
  LayoutDashboard, 
  GraduationCap, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Folder,
  FileText,
  MoreVertical,
  Table as TableIcon,
  Settings,
  Edit2,
  Check,
  Zap,
  Layout,
  Layers,
  Loader2,
  UserPlus,
  UserCheck,
  UserMinus,
  Mars,
  Venus,
  User,
  Trash2,
  Minus,
  X,
  LogOut,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  FileUp,
  Upload,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  Lock,
  Unlock,
  Bell,
  XCircle,
  Building,
  History as HistoryIcon,
  Building2,
  MapPin,
  Briefcase,
  Mail,
  Shield,
  BarChart2,
  Heart,
  CreditCard,
  IdCard,
  Share2,
  RefreshCw,
  Clock,
  MessageSquare,
  Sparkles,
  Menu,
  Terminal,
  Activity,
  UserX,
  Coins,
  Printer,
  Receipt,
  Tag,
  FileSpreadsheet,
  ExternalLink,
  Camera,
  Save,
  Maximize2,
  Minimize2,
  Info,
  Edit,
  Copy,
  Type,
  Palette
} from "lucide-react";

import { ThemeCustomizerModal, DEFAULT_THEME_SETTINGS, SystemThemeSettings } from "./components/ThemeCustomizerModal";
import { SystemDocumentationView } from "./components/SystemDocumentationView";
import { SF8View } from "./components/SF8View";
import { ManualSiblingSelector } from "./components/ManualSiblingSelector";
import { PhotoCropModal } from "./components/PhotoCropModal";
import { SF10ReportModal } from "./components/SF10ReportModal";
import { AralProgram } from "./components/AralProgram";
import { AralMasterData } from "./components/AralMasterData";
import { 
  DEFAULT_SCHOOL_INFO, 
  DEFAULT_COMPETENCIES,
  AralSchoolInfo,
  AralCompetency,
  AralRole
} from "./components/AralData";

const formatGradeSection = (gradeLevel?: string | number, sectionName?: string) => {
  const g = String(gradeLevel || "7").trim();
  const s = String(sectionName || "MATATAG").trim();
  
  if (s.toLowerCase() === `grade ${g}`) return `Grade ${g}`;
  if (s.toLowerCase().includes(`grade ${g}`)) return s;
  
  return `Grade ${g} - ${s}`;
};

function EncodingClosedBanner() {
  return (
    <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 animate-pulse shadow-lg z-[100] shrink-0 border-b border-rose-500/50">
      <Clock size={16} className="text-rose-100" />
      <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">
        Centralized Learner Assessment & School System is Currently Offline &bull; No Active School Year Found in Global Settings
      </span>
      <Clock size={16} className="text-rose-100" />
    </div>
  );
}

function DeadlineBanner({ globalSettings }: { globalSettings?: any }) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('deadline_banner_dismissed') === 'true');

  if (dismissed || !globalSettings?.finalizationDeadline) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('deadline_banner_dismissed', 'true');
  };

  const deadline = new Date(globalSettings.finalizationDeadline);
  const now = new Date();
  
  if (deadline < now) {
    return (
      <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 animate-pulse shadow-lg z-[100] shrink-0 border-b border-rose-500/50 relative">
        <Clock size={16} className="text-rose-100" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">
          Deadline for Finalization has passed ({deadline.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })})
        </span>
        <Clock size={16} className="text-rose-100" />
        <button onClick={handleDismiss} className="absolute right-4 text-rose-200 hover:text-white transition-colors" title="Dismiss">
          <X size={16} />
        </button>
      </div>
    );
  }
  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-md z-[100] shrink-0 border-b border-amber-600/50 relative">
      <Clock size={16} className="text-amber-100" />
      <span className="text-[11px] font-bold uppercase tracking-widest">
        Deadline for Finalization: {deadline.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
      </span>
      <Clock size={16} className="text-amber-100" />
      <button onClick={handleDismiss} className="absolute right-4 text-amber-100 hover:text-white transition-colors" title="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}

function SectionYearEndBadge({ sectionId, schoolYear, globalSettings, isSectionFinalized }: { sectionId: string; schoolYear?: string; globalSettings?: any; isSectionFinalized?: boolean }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!sectionId) return;
    const qStudents = collection(db, `sections/${sectionId}/students`);
    const unsubscribeStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    }, (err) => {
      console.error("Error checking students:", err);
    });

    const qSubjects = collection(db, `sections/${sectionId}/subjects`);
    const unsubscribeSubjects = onSnapshot(qSubjects, (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
    }, (err) => {
      console.error("Error checking subjects:", err);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeSubjects();
    };
  }, [sectionId]);

  const isFinalized = useMemo(() => {
    const isGlobalFinalized = globalSettings?.finalizedSchoolYears?.includes(schoolYear);
    return isGlobalFinalized || isSectionFinalized || students.some(s => s.status === 'Promoted' || s.status === 'Retained');
  }, [students, globalSettings, schoolYear, isSectionFinalized]);

  const isYearEndReady = useMemo(() => {
    if (students.length === 0 || subjects.length === 0) return false;
    const activeStudents = students.filter(s => s.status === 'Active' || !s.status);
    if (activeStudents.length === 0) return false;
    
    // Check if ALL active students have completed ALL subjects
    return activeStudents.every(student => {
      let validCount = 0;
      subjects.forEach(subj => {
        const termsCompleted = (subj.offeredTerms || [1,2,3,4]).every(t => {
          const g = calculateGrade(student, subj, t as TermNumber);
          return g.hasData;
        });
        if (termsCompleted) validCount++;
      });
      return validCount === subjects.length;
    });
  }, [students, subjects]);

  if (students.length === 0) return null;

  if (isFinalized) {
    return (
      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1.5 shrink-0 shadow-sm transition-all bg-emerald-50 text-emerald-800 border-emerald-250">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Finalized
      </span>
    );
  }

  // Only show 'Unfinalized' if the grade book's terms are fully completed
  if (isYearEndReady) {
    return (
      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1.5 shrink-0 shadow-sm transition-all bg-amber-50 text-amber-800 border-amber-250">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-550"></span>
        Unfinalized
      </span>
    );
  }

  return null;
}

function SectionStatsDisplay({ sectionId, schoolYear, schoolCalendar }: { sectionId: string, schoolYear: string, schoolCalendar: any[] }) {
  const [stats, setStats] = useState({ 
    promoted: 0,
    promotedM: 0,
    promotedF: 0,
    retained: 0, 
    retainedM: 0,
    retainedF: 0,
    transferredOut: 0, 
    transferredOutM: 0,
    transferredOutF: 0,
    droppedOut: 0, 
    droppedOutM: 0,
    droppedOutF: 0,
    transferredIn: 0,
    transferredInM: 0,
    transferredInF: 0,
    lateEnrollees: 0,
    lateEnrolleesM: 0,
    lateEnrolleesF: 0
  });
  const [isYearEnd, setIsYearEnd] = useState(false);

  useEffect(() => {
    if (!schoolYear || !schoolCalendar || schoolCalendar.length === 0) return;
    
    // Determine if it's year end based on the calendar
    const entries = schoolCalendar.filter(c => c.schoolYear === schoolYear);
    if (entries.length === 0) return;

    const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    
    // Find the latest term and latest month in that term
    const sortedEntries = [...entries].sort((a, b) => {
      const termA = parseInt(a.term) || 0;
      const termB = parseInt(b.term) || 0;
      if (termA !== termB) return termB - termA;
      return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
    });

    const lastEntry = sortedEntries[0];
    if (lastEntry) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.toLocaleString('en-US', { month: 'long' });
      
      const currentMonthIdx = monthOrder.indexOf(currentMonth);
      const lastMonthIdx = monthOrder.indexOf(lastEntry.month);
      
      const lastTerm = lastEntry.term;
      const currentMonthEntry = entries.find(e => e.month === currentMonth && e.year.toString() === currentYear.toString());
      
      if (currentMonthEntry && currentMonthEntry.term === lastTerm) {
        setIsYearEnd(true);
      } else if (currentMonthIdx >= lastMonthIdx && currentYear >= parseInt(lastEntry.year)) {
        setIsYearEnd(true);
      } else {
        setIsYearEnd(false);
      }
    }
  }, [schoolYear, schoolCalendar]);

  useEffect(() => {
    const q = collection(db, `sections/${sectionId}/students`);
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => d.data() as Student);
      
      const retained = docs.filter(s => s.status === 'Retained');
      const promoted = docs.filter(s => s.status === 'Promoted');
      const transferredOut = docs.filter(s => s.status === 'Transferred Out');
      const droppedOut = docs.filter(s => s.status === 'Dropped Out');
      const transferredIn = docs.filter(s => s.isTransferredIn);
      
      // Identify the first month of the school year and calculate all school days
      const syCal = schoolCalendar.filter(c => c.schoolYear === schoolYear);
      const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
      const sortedCal = [...syCal].sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
      
      // Calculate All School Days of the Year for 80% cut-off
      const yearDays: string[] = [];
      sortedCal.forEach(m => {
        const monthIndex = MONTH_INDICES[m.month];
        const yearNum = parseInt(m.year);
        const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate();
        
        const openingDate = parseInt(m.openingDate || '1');
        const closingDate = parseInt(m.closingDate || '31');
        const monthNum = (monthIndex + 1).toString().padStart(2, '0');

        for (let d = 1; d <= daysInMonth; d++) {
          if (d < openingDate || d > closingDate) continue;
          const date = new Date(yearNum, monthIndex, d);
          const dayOfWeek = date.getDay();
          const dateId = `${monthNum}-${d.toString().padStart(2, '0')}`;
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = PHILIPPINE_HOLIDAYS.includes(dateId) || m.localHolidays?.includes(d);
          
          if (!isWeekend && !isHoliday) {
            yearDays.push(`${yearNum}-${monthNum}-${d.toString().padStart(2, '0')}`);
          }
        }
      });
      
      const lateEnrollees = docs.filter(s => {
        if (s.isTransferredIn || !s.dateOfFirstAttendance) return false;
        
        // 80% yearly cut-off logic
        if (yearDays.length === 0) return false;
        const firstAttendIndex = yearDays.findIndex(d => d >= s.dateOfFirstAttendance!);
        if (firstAttendIndex === -1) return true;
        
        const remainingDays = yearDays.length - firstAttendIndex;
        return (remainingDays / yearDays.length) < 0.8;
      });

      setStats({
        retained: retained.length,
        retainedM: retained.filter(s => s.sex === 'Male').length,
        retainedF: retained.filter(s => s.sex === 'Female').length,
        promoted: promoted.length,
        promotedM: promoted.filter(s => s.sex === 'Male').length,
        promotedF: promoted.filter(s => s.sex === 'Female').length,
        transferredOut: transferredOut.length,
        transferredOutM: transferredOut.filter(s => s.sex === 'Male').length,
        transferredOutF: transferredOut.filter(s => s.sex === 'Female').length,
        droppedOut: droppedOut.length,
        droppedOutM: droppedOut.filter(s => s.sex === 'Male').length,
        droppedOutF: droppedOut.filter(s => s.sex === 'Female').length,
        transferredIn: transferredIn.length,
        transferredInM: transferredIn.filter(s => s.sex === 'Male').length,
        transferredInF: transferredIn.filter(s => s.sex === 'Female').length,
        lateEnrollees: lateEnrollees.length,
        lateEnrolleesM: lateEnrollees.filter(s => s.sex === 'Male').length,
        lateEnrolleesF: lateEnrollees.filter(s => s.sex === 'Female').length
      });
    }, (err) => {
      console.error("Error fetching section stats:", err);
    });

    return unsubscribe;
  }, [sectionId, schoolCalendar, schoolYear]);

  return (
    <div className="w-full">
      {(isYearEnd || stats.retained > 0 || stats.promoted > 0) && (
        <div className="mt-5 pt-4 border-t border-slate-100 relative z-10 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={12} className="text-indigo-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Year-End Summary</span>
          </div>
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl hover:bg-emerald-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-sm font-black">P</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-emerald-900 leading-none">Promoted</span>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tight mt-1">Total learners promoted</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-emerald-700 leading-none">{stats.promoted}</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-[9px] font-bold text-slate-500">M: {stats.promotedM}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                    <span className="text-[9px] font-bold text-slate-500">F: {stats.promotedF}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl hover:bg-indigo-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-sm font-black">R</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-indigo-900 leading-none">Retained</span>
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tight mt-1">Total learners retained</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-indigo-700 leading-none">{stats.retained}</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-[9px] font-bold text-slate-500">M: {stats.retainedM}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                    <span className="text-[9px] font-bold text-slate-500">F: {stats.retainedF}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl border border-slate-100 group/stat">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1 group-hover/stat:text-rose-500 transition-colors">Trans. Out</span>
          <span className="text-sm font-black text-slate-700">{stats.transferredOut}</span>
          <div className="flex gap-2 mt-1 opacity-60 group-hover/stat:opacity-100 transition-opacity">
            <span className="text-[8px] font-bold text-blue-600">M:{stats.transferredOutM}</span>
            <span className="text-[8px] font-bold text-rose-600">F:{stats.transferredOutF}</span>
          </div>
        </div>
        <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl border border-slate-100 group/stat">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1 group-hover/stat:text-amber-500 transition-colors">Dropped</span>
          <span className="text-sm font-black text-slate-700">{stats.droppedOut}</span>
          <div className="flex gap-2 mt-1 opacity-60 group-hover/stat:opacity-100 transition-opacity">
            <span className="text-[8px] font-bold text-blue-600">M:{stats.droppedOutM}</span>
            <span className="text-[8px] font-bold text-rose-600">F:{stats.droppedOutF}</span>
          </div>
        </div>
        <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl border border-slate-100 group/stat">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1 group-hover/stat:text-indigo-500 transition-colors">Trans. In</span>
          <span className="text-sm font-black text-slate-700">{stats.transferredIn}</span>
          <div className="flex gap-2 mt-1 opacity-60 group-hover/stat:opacity-100 transition-opacity">
            <span className="text-[8px] font-bold text-blue-600">M:{stats.transferredInM}</span>
            <span className="text-[8px] font-bold text-rose-600">F:{stats.transferredInF}</span>
          </div>
        </div>
        <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl border border-slate-100 group/stat">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1 group-hover/stat:text-emerald-500 transition-colors text-center">Late Enr.</span>
          <span className="text-sm font-black text-slate-700">{stats.lateEnrollees}</span>
          <div className="flex gap-2 mt-1 opacity-60 group-hover/stat:opacity-100 transition-opacity">
            <span className="text-[8px] font-bold text-blue-600">M:{stats.lateEnrolleesM}</span>
            <span className="text-[8px] font-bold text-rose-600">F:{stats.lateEnrolleesF}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  or,
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  addDoc,
  deleteField,
  writeBatch,
  collectionGroup,
  updateDoc,
  orderBy,
  limit,
  arrayUnion
} from "firebase/firestore";
import { auth, db, handleFirestoreError, safeGetDoc as getDoc, safeGetDocs as getDocs } from "./firebase";
import { Subject, Student, Course, TermNumber, RatedValue, Section, UserProfile, School, Eligibility, AnecdotalRecord, AralClass, AttendanceScanLog } from "./types";
import { formatStudentName, capitalizeName, capitalizeFirst, getSubjectSortScore, printHTMLContent, isTleSubject, getTleDisplayName } from "./utils";
import { INITIAL_STUDENTS, DEFAULT_TERM_DATA } from "./constants";
import { AttendanceCard } from "./components/AttendanceCard";
import { DailyAttendanceTracker } from "./components/DailyAttendanceTracker";
import { SF2ReportView } from "./components/SF2ReportView";
import { ObservedValuesTracker } from "./components/ObservedValuesTracker";
import { SF10View } from "./components/SF10View";
import { SF4ReportView } from "./components/SF4ReportView";
import { SF7ReportView } from "./components/SF7ReportView";
import { AdminSchoolCalendarView } from "./AdminSchoolCalendarView";
import { AdminSchoolYearView } from "./components/AdminSchoolYearView";
import { FeedbackModal } from "./components/FeedbackModal";
import { AdminFeedbackDashboard } from "./components/AdminFeedbackDashboard";
import { AdminStudentListView } from "./components/AdminStudentListView";
import { AnecdotalRecordsView, getOffensePenalty } from "./components/AnecdotalRecordsView";
import { PTAFeesManagementView } from "./components/PTAFeesManagementView";
import { TleDashboardView } from "./components/TleDashboardView";
import { ClassRecordReportModal } from "./components/ClassRecordReportModal";

const transmuteGrade = (initial: number): number => {
  if (initial >= 99.50) return 100;
  if (initial >= 97.50) return 99;
  if (initial >= 96.00) return 98;
  if (initial >= 95.00) return 97;
  if (initial >= 94.00) return 96;
  if (initial >= 93.00) return 95;
  if (initial >= 92.00) return 94;
  if (initial >= 91.00) return 93;
  if (initial >= 90.00) return 92;
  if (initial >= 89.00) return 91;
  if (initial >= 88.00) return 90;
  if (initial >= 87.00) return 89;
  if (initial >= 86.00) return 88;
  if (initial >= 85.00) return 87;
  if (initial >= 84.00) return 86;
  if (initial >= 83.00) return 85;
  if (initial >= 82.00) return 84;
  if (initial >= 81.00) return 83;
  if (initial >= 80.00) return 82;
  if (initial >= 79.00) return 81;
  if (initial >= 78.00) return 80;
  if (initial >= 77.00) return 79;
  if (initial >= 76.00) return 78;
  if (initial >= 75.00) return 77;
  if (initial >= 73.00) return 76;
  if (initial >= 70.00) return 75;
  if (initial >= 68.00) return 74;
  if (initial >= 66.00) return 73;
  if (initial >= 64.00) return 72;
  if (initial >= 62.00) return 71;
  if (initial >= 60.00) return 70;
  if (initial >= 58.00) return 69;
  if (initial >= 56.00) return 68;
  if (initial >= 54.00) return 67;
  if (initial >= 52.00) return 66;
  if (initial >= 50.00) return 65;
  if (initial >= 48.00) return 64;
  if (initial >= 46.00) return 63;
  if (initial >= 43.00) return 62;
  if (initial >= 40.00) return 61;
  return 60;
};

const getDescriptiveGrade = (grade: number | string): string => {
  const numericGrade = typeof grade === 'string' ? parseFloat(grade) : grade;
  if (isNaN(numericGrade)) return '';
  if (numericGrade >= 90) return 'A';
  if (numericGrade >= 80) return 'B';
  if (numericGrade >= 75) return 'C';
  if (numericGrade >= 65) return 'D';
  return 'E';
};

const getDescriptiveRemark = (grade: number | string): string => {
  const numericGrade = typeof grade === 'string' ? parseFloat(grade) : grade;
  if (isNaN(numericGrade)) return '';
  if (numericGrade >= 90) return 'Advancing';
  if (numericGrade >= 80) return 'Benchmarking';
  if (numericGrade >= 75) return 'Connecting';
  if (numericGrade >= 65) return 'Developing';
  return 'Emerging';
};

const computeBMI = (weightKg: number, heightCm: number) => {
  if (!weightKg || !heightCm) return { bmi: 0, category: 'N/A' };
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  let category = 'Normal';
  if (bmi < 18.5) category = 'Wasted';
  else if (bmi >= 25 && bmi < 30) category = 'Overweight';
  else if (bmi >= 30) category = 'Obese';
  return { bmi: parseFloat(bmi.toFixed(1)), category };
};

const calculateGrade = (student: Student, subject: Subject, term: TermNumber) => {
  const data = student.grades?.[subject.id]?.[term] || JSON.parse(JSON.stringify(DEFAULT_TERM_DATA));
  
  if (data.manualFinalGrade && data.manualFinalGrade > 0) {
     return {
        ww: { total: 0, ps: 0, ws: 0, max: 0 },
        pt: { total: 0, ps: 0, ws: 0, max: 0 },
        ta: { total: 0, ps: 0, ws: 0, max: 0 },
        initial: data.manualFinalGrade,
        final: data.manualFinalGrade,
        hasData: true
     };
  }

  const calc = (cat: string, weight: number) => {
    const component = (data[cat as keyof typeof data] || { scores: [], maxScores: [] }) as any;
    const total = (component.scores || []).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const max = (component.maxScores || []).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const ps = max === 0 ? 0 : (total / max) * 100;
    const ws = ps * (weight / 100);
    return { total, ps, ws, max };
  };

  const ww = calc('writtenWorks', subject.wwWeight);
  const pt = calc('performanceTasks', subject.ptWeight);
  
  const s1 = Number(data.summativeTests?.scores?.[0]) || 0;
  const m1 = Number(data.summativeTests?.maxScores?.[0]) || 0;
  const s2 = Number(data.summativeTests?.scores?.[1]) || 0;
  const m2 = Number(data.summativeTests?.maxScores?.[1]) || 0;
  const se = Number(data.termExam?.score) || 0;
  const me = Number(data.termExam?.maxScore) || 0;

  const ps1 = m1 === 0 ? 0 : (s1 / m1) * 100;
  const ps2 = m2 === 0 ? 0 : (s2 / m2) * 100;
  const pse = me === 0 ? 0 : (se / me) * 100;

  let totalActiveWeight = 0;
  let weightedPsSum = 0;

  if (m1 > 0) {
    totalActiveWeight += 30;
    weightedPsSum += 30 * ps1;
  }
  if (m2 > 0) {
    totalActiveWeight += 30;
    weightedPsSum += 30 * ps2;
  }
  if (me > 0) {
    totalActiveWeight += 40;
    weightedPsSum += 40 * pse;
  }

  const taTotal = s1 + s2 + se;
  const taMax = m1 + m2 + me;
  const taPs = totalActiveWeight === 0 ? 0 : (weightedPsSum / totalActiveWeight);
  const taWs = taPs * (subject.taWeight / 100);

  const rawGrade = ww.ws + pt.ws + taWs;
  const transmutedGrade = transmuteGrade(rawGrade);
  const computedFinal = subject.isZeroBasedGrading ? Math.round(rawGrade) : transmutedGrade;
  const hasData = ww.max > 0 || pt.max > 0 || taMax > 0;

  return {
    ww, pt, 
    ta: { total: taTotal, ps: taPs, ws: taWs, max: taMax },
    initial: rawGrade,
    final: hasData ? computedFinal : 0,
    hasData
  };
};

const PHILIPPINE_HOLIDAYS = [
  '01-01', '04-09', '05-01', '06-12', '08-21', '11-01', '11-30', '12-25', '12-30'
];

const MONTH_INDICES: { [key: string]: number } = {
  'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
  'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
};

export async function fetchSubjectsForSection(
  secId: string,
  gradeLevel: number,
  globalIds: string[] = [],
  globalSubjectsList: Subject[] = []
) {
  try {
    const { collection } = await import("firebase/firestore");
    const secSubjectsSnap = await getDocs(collection(db, `sections/${secId}/subjects`));
    const secSubjs = secSubjectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));

    const matchedGlobals = globalSubjectsList.filter(s => 
      Number(s.gradeLevel) === Number(gradeLevel) || 
      globalIds.includes(s.id)
    );

    return [...matchedGlobals, ...secSubjs];
  } catch (error) {
    console.error("Error fetching subjects dynamically in global helper:", error);
    return globalSubjectsList.filter(s => Number(s.gradeLevel) === Number(gradeLevel) || globalIds.includes(s.id));
  }
}

const compressImage = (dataUrl: string, maxWidth: number, maxHeight: number, quality: number = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        
        // Detect original MIME type from data URL to check for transparent formats (PNG, WebP, GIF)
        const match = dataUrl.match(/^data:([^;]+);/);
        const originalMime = match ? match[1] : '';
        const isTransparentFormat = originalMime === 'image/png' || originalMime === 'image/webp' || originalMime === 'image/gif';
        
        if (isTransparentFormat) {
          // Keep transparent background by exporting to PNG
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sections, setSectionsRaw] = useState<Section[]>([]);
  const [aralClasses, setAralClasses] = useState<AralClass[]>([]);
  const setSections = React.useCallback((val: Section[] | ((prev: Section[]) => Section[])) => {
    const sortFn = (list: Section[]) => {
      return [...list].sort((a, b) => {
        const valA = Number(a.gradeLevel) || 0;
        const valB = Number(b.gradeLevel) || 0;
        if (valA !== valB) {
          return valA - valB;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
    };
    if (typeof val === 'function') {
      setSectionsRaw(prev => sortFn(val(prev)));
    } else {
      setSectionsRaw(sortFn(val));
    }
  }, []);
  const [expiredSchoolIds, setExpiredSchoolIds] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedAralClassId, setSelectedAralClassId] = useState<string | null>(null);
  const [schoolCalendar, setSchoolCalendar] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [isAuthorizedCashier, setIsAuthorizedCashier] = useState(false);
  const [confirmYearEndUnfinalize, setConfirmYearEndUnfinalize] = useState(false);
  const [confirmFinalizeSection, setConfirmFinalizeSection] = useState(false);

  // ARAL Master Data States
  const [aralSchoolInfo, setAralSchoolInfo] = useState<AralSchoolInfo>(() => {
    try {
      const saved = localStorage.getItem('aral_v2_school_info');
      return saved ? JSON.parse(saved) : DEFAULT_SCHOOL_INFO;
    } catch {
      return DEFAULT_SCHOOL_INFO;
    }
  });

  const [aralCompetencies, setAralCompetencies] = useState<AralCompetency[]>(() => {
    try {
      const saved = localStorage.getItem('aral_v2_competencies');
      return saved ? JSON.parse(saved) : DEFAULT_COMPETENCIES;
    } catch {
      return DEFAULT_COMPETENCIES;
    }
  });

  const [isMasterDataOpen, setIsMasterDataOpen] = useState(true);

  // Helper for per-user storage key
  const activeUserId = currentUser?.uid || userProfile?.uid || (userProfile?.email ? userProfile.email.toLowerCase().trim() : null);

  // System Theme Settings State & Live Dynamic Engine (Per-User Preferences)
  const [systemThemeSettings, setSystemThemeSettings] = useState<SystemThemeSettings>(() => {
    try {
      const saved = activeUserId ? localStorage.getItem(`class_enterprise_system_theme_${activeUserId}`) : null;
      if (saved) return JSON.parse(saved);
      const legacySaved = localStorage.getItem('class_enterprise_system_theme');
      return legacySaved ? JSON.parse(legacySaved) : DEFAULT_THEME_SETTINGS;
    } catch {
      return DEFAULT_THEME_SETTINGS;
    }
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Automatically update active theme state when user changes or logs in/out
  useEffect(() => {
    try {
      if (userProfile?.themeSettings) {
        setSystemThemeSettings(userProfile.themeSettings);
      } else {
        const userKey = activeUserId ? `class_enterprise_system_theme_${activeUserId}` : 'class_enterprise_system_theme_guest';
        const saved = localStorage.getItem(userKey);
        if (saved) {
          setSystemThemeSettings(JSON.parse(saved));
        } else if (!activeUserId) {
          setSystemThemeSettings(DEFAULT_THEME_SETTINGS);
        }
      }
    } catch (err) {
      console.error('Error loading per-user theme:', err);
    }
  }, [activeUserId, userProfile?.themeSettings]);

  const handleUpdateThemeSettings = async (newSettings: SystemThemeSettings) => {
    setSystemThemeSettings(newSettings);
    if (userProfile && userProfile.uid && !userProfile.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, "users", userProfile.uid), {
          themeSettings: newSettings
        });
        setUserProfile(prev => prev ? { ...prev, themeSettings: newSettings } : null);
      } catch (err) {
        console.error("Failed to save theme settings to firestore:", err);
      }
    }
  };

  useEffect(() => {
    try {
      const userKey = activeUserId ? `class_enterprise_system_theme_${activeUserId}` : 'class_enterprise_system_theme_guest';
      localStorage.setItem(userKey, JSON.stringify(systemThemeSettings));
    } catch (err) {
      console.error('Failed to save system theme settings:', err);
    }

    const root = document.documentElement;
    if (systemThemeSettings.mode === 'dark') {
      root.classList.add('dark');
    } else if (systemThemeSettings.mode === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    root.setAttribute('data-theme-color', systemThemeSettings.color);
    root.setAttribute('data-theme-density', systemThemeSettings.density);
    root.setAttribute('data-theme-font', systemThemeSettings.font);
    root.setAttribute('data-theme-radius', systemThemeSettings.radius);
  }, [systemThemeSettings, activeUserId]);

  const mapUserRoleToAralRole = (role?: string, email?: string): AralRole => {
    if (email && aralSchoolInfo?.coordinatorEmails?.some(e => e.trim().toLowerCase() === email.trim().toLowerCase())) {
      return 'ARAL Coordinator';
    }
    if (!role) return 'Teacher';
    switch (role) {
      case 'system_admin':
      case 'admin':
      case 'school_head':
        return 'ARAL Coordinator';
      case 'teacher':
        return 'Teacher';
      default:
        return 'Teacher';
    }
  };

  const handleUpdateAralSchool = (info: AralSchoolInfo) => {
    setAralSchoolInfo(info);
    localStorage.setItem('aral_v2_school_info', JSON.stringify(info));
  };

  const handleAddAralCompetency = (comp: AralCompetency) => {
    const updated = [...aralCompetencies, comp];
    setAralCompetencies(updated);
    localStorage.setItem('aral_v2_competencies', JSON.stringify(updated));
  };

  const handleDeleteAralCompetency = (id: string) => {
    if (window.confirm("Are you sure you want to delete this learning competency?")) {
      const updated = aralCompetencies.filter(c => c.id !== id);
      setAralCompetencies(updated);
      localStorage.setItem('aral_v2_competencies', JSON.stringify(updated));
    }
  };

  const handleCreateAralClass = async (
    gradeLevelNum: number,
    name: string,
    tutorName: string,
    tutorEmail: string,
    studentIds: string[],
    targetSubject?: string
  ) => {
    if (!userProfile?.schoolId) return;
    try {
      const newClassData = {
        name: name,
        gradeLevel: gradeLevelNum,
        schoolId: userProfile.schoolId,
        schoolYear: globalSettings?.activeSchoolYear || "2026-2027",
        adviserName: tutorName,
        adviserEmail: tutorEmail,
        studentIds: studentIds,
        targetSubject: targetSubject || "Mathematics & Reading"
      };
      await addDoc(collection(db, "aral_classes"), newClassData);
      alert("Successfully created ARAL Class.");
    } catch (err) {
      console.error("Error creating ARAL Class:", err);
      alert("Failed to create ARAL Class.");
    }
  };

  const handleUpdateAralClass = async (
    classId: string,
    tutorName: string,
    tutorEmail: string,
    studentIds: string[],
    targetSubject?: string,
    name?: string,
    gradeLevel?: number
  ) => {
    try {
      const docRef = doc(db, "aral_classes", classId);
      const updateData: any = {
        adviserName: tutorName,
        adviserEmail: tutorEmail,
        studentIds: studentIds,
        targetSubject: targetSubject || "Mathematics & Reading"
      };
      if (name !== undefined) updateData.name = name;
      if (gradeLevel !== undefined) updateData.gradeLevel = gradeLevel;

      await updateDoc(docRef, updateData);
      alert("Successfully updated ARAL Class.");
    } catch (err) {
      console.error("Error updating ARAL Class:", err);
      alert("Failed to update ARAL Class.");
    }
  };

  const handleDeleteAralClass = async (classId: string) => {
    try {
      const docRef = doc(db, "aral_classes", classId);
      await deleteDoc(docRef);
      alert("Successfully deleted ARAL Class.");
    } catch (err) {
      console.error("Error deleting ARAL Class:", err);
      alert("Failed to delete ARAL Class.");
    }
  };

  useEffect(() => {
    if (!currentUser || !userProfile?.schoolId) {
      setIsAuthorizedCashier(false);
      return;
    }
    if (userProfile.role === 'admin' || userProfile.role === 'system_admin') {
      setIsAuthorizedCashier(true);
      return;
    }
    const unsub = onSnapshot(query(collection(db, 'settings'), where('id', '==', `pta_config_${userProfile.schoolId}`)), (snap) => {
      if (!snap.empty) {
        const configData = snap.docs[0].data();
        const emails = configData.cashierEmails || [];
        setIsAuthorizedCashier(emails.map((e: string) => e.toLowerCase()).includes(currentUser.email?.toLowerCase() || ''));
      } else {
        setIsAuthorizedCashier(false);
      }
    }, (err) => {
      console.error("Error loading cashier settings:", err);
    });
    return unsub;
  }, [currentUser, userProfile]);

  // Run once-per-app-session database cleanup to clear defaulted JHS section subjects where adviser was assigned by default
  useEffect(() => {
    if (!currentUser || !currentUser.email || !userProfile) return;

    const hasRun = localStorage.getItem('jhs_tle_teacher_cleanup_v2');
    if (hasRun) return;

    const runCleanup = async () => {
      try {
        console.log("Starting JHS sections default teacher cleanup...");
        const sectionsSnap = await getDocs(collection(db, "sections"));
        let clearedCount = 0;

        const userEmailLower = (currentUser.email || "").trim().toLowerCase();
        const userUid = currentUser.uid;
        const userRole = userProfile.role;

        for (const secDoc of sectionsSnap.docs) {
          const sec = { id: secDoc.id, ...secDoc.data() } as Section;
          const isJHS = sec.gradeLevel && Number(sec.gradeLevel) <= 10;
          if (!isJHS) continue;

          // Check if user is authorized to write to this section's subjects under firestore rules
          const isAuthorized = 
            userRole === "admin" || 
            userRole === "system_admin" ||
            sec.createdBy === userUid || 
            (sec.adviserEmail || "").trim().toLowerCase() === userEmailLower;

          if (!isAuthorized) continue;

          const adviserEmailNorm = (sec.adviserEmail || "").trim().toLowerCase();
          
          // Get the subjects sub-collection
          const subsSnap = await getDocs(collection(db, "sections", sec.id, "subjects"));
          for (const subDoc of subsSnap.docs) {
            const sub = subDoc.data();
            const teacherEmailNorm = (sub.teacherEmail || "").trim().toLowerCase();

            // Clear defaulted adviser email from CORE or TLE subjects
            if (adviserEmailNorm && teacherEmailNorm === adviserEmailNorm) {
              await updateDoc(doc(db, "sections", sec.id, "subjects", subDoc.id), {
                teacherEmail: ""
              });
              clearedCount++;
            }
          }
        }
        console.log(`Database JHS sections teacher cleanup finished. Cleared ${clearedCount} default assignments.`);
        localStorage.setItem('jhs_tle_teacher_cleanup_v2', 'true');
      } catch (err: any) {
        console.warn("Note: Automatic JHS sections teacher cleanup did not complete entirely:", err.message || err);
      }
    };

    runCleanup();
  }, [currentUser, userProfile]);

  useEffect(() => {
    if (!currentUser) {
      setGlobalSettings(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      } else {
        setGlobalSettings({ schoolYears: [], activeSchoolYear: null });
      }
    }, (err) => {
      handleFirestoreError(err, 'get', 'settings/general');
    });
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setSchoolCalendar([]);
      return;
    }
    const q = query(collection(db, 'school_calendar'), orderBy('year', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSchoolCalendar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, 'list', 'school_calendar');
    });
    return () => unsub();
  }, [currentUser]);

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sectionSubjects, setSectionSubjects] = useState<Subject[]>([]);
  const [globalSubjects, setGlobalSubjects] = useState<Subject[]>([]);
  
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, 'global_subjects'), (snap) => {
      setGlobalSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
    });
    return () => unsub();
  }, [currentUser]);
  const [activeSchool, setActiveSchool] = useState<School | null>(null);
  const [teacherCount, setTeacherCount] = useState<number>(0);
  
  const [activeTab, setActiveTab ] = useState<"dashboard" | "gradebook" | "enroll" | "subjects" | "summary" | "guide" | "sys-docs" | "attendance" | "sf2" | "observed-values" | "sf10" | "transfers" | "sf8" | "sf4" | "sf7" | "anecdotes" | "pta" | "tle-dashboard">("dashboard");
  const [ptaInitialTab, setPtaInitialTab] = useState<'collection' | 'setup' | 'reports' | 'audit'>('collection');
  const [preselectedStudentForAnecdotal, setPreselectedStudentForAnecdotal] = useState<Student | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSectionSwitcherOpen, setIsSectionSwitcherOpen] = useState(false);
  const [showAdminUsers, setShowAdminUsers] = useState(false);
  const [showAdminStudentList, setShowAdminStudentList] = useState(false);
  const [showAdminSchools, setShowAdminSchools] = useState(false);
  const [showAdminSchoolCalendar, setShowAdminSchoolCalendar] = useState(false);
  const [showAdminSchoolYear, setShowAdminSchoolYear] = useState(false);
  const [showAdminFeedback, setShowAdminFeedback] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAdminPTA, setShowAdminPTA] = useState(false);
  const [showAdminSF4, setShowAdminSF4] = useState(false);
  const [showAdminSF7, setShowAdminSF7] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [studentViewMatched, setStudentViewMatched] = useState<{ student: Student, section: Section } | null>(null);
  const [allStudentEnrollments, setAllStudentEnrollments] = useState<{ student: Student, section: Section }[]>([]);
  const [noApprovedAdminFound, setNoApprovedAdminFound] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [combinedTleStudents, setCombinedTleStudents] = useState<Student[]>([]);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForBlankReport, setSelectedStudentForBlankReport] = useState<Student | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ student: Student, newStatus: 'Active' | 'Transferred Out' | 'Dropped Out' | 'Retained' | 'Promoted' } | null>(null);
  const [statusChangeDate, setStatusChangeDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusChangeReason, setStatusChangeReason] = useState("");

  const [scanLogs, setScanLogs] = useState<AttendanceScanLog[]>([]);
  const [showGlobalScanner, setShowGlobalScanner] = useState(false);
  const [isScannerFullScreen, setIsScannerFullScreen] = useState(false);
  const [globalScannerFacingMode, setGlobalScannerFacingMode] = useState<'user' | 'environment'>('environment');
  const [globalRecentScan, setGlobalRecentScan] = useState<{ status: 'success' | 'error', message: string, student?: Student | null, section?: Section | null, scanType?: 'IN' | 'OUT', scanTime?: string } | null>(null);
  const [globalScannerError, setGlobalScannerError] = useState<string | null>(null);
  const [globalManualLrnInput, setGlobalManualLrnInput] = useState('');
  const [scannerViewMode, setScannerViewMode] = useState<'scanner' | 'all_logs'>('scanner');
  const [allLogsSearchQuery, setAllLogsSearchQuery] = useState('');

  const openGlobalScanner = useCallback(() => {
    setIsScannerFullScreen(false);
    setShowGlobalScanner(true);
    setGlobalRecentScan(null);
    setGlobalScannerError(null);
  }, []);

  // Sync scan logs from Firestore
  useEffect(() => {
    if (!db || !currentUser) return;
    const q = query(collection(db, 'attendance_scan_logs'));
    const unsub = onSnapshot(q, (snapshot) => {
      const logs: AttendanceScanLog[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() } as AttendanceScanLog);
      });
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setScanLogs(logs);
    }, (err) => {
      console.error("Error fetching attendance_scan_logs:", err);
      handleFirestoreError(err, 'list', 'attendance_scan_logs');
    });
    return () => unsub();
  }, [currentUser]);

  const handleAddScanLog = async (logData: Omit<AttendanceScanLog, 'id'>) => {
    try {
      const docRef = doc(collection(db, 'attendance_scan_logs'));
      const newLog: AttendanceScanLog = {
        id: docRef.id,
        ...logData
      };
      await setDoc(docRef, newLog);
    } catch (err) {
      console.error("Error saving scan log:", err);
      handleFirestoreError(err, 'write', 'attendance_scan_logs');
    }
  };

  const handleDeleteScanLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'attendance_scan_logs', logId));
    } catch (err) {
      console.error("Error deleting scan log:", err);
      handleFirestoreError(err, 'delete', `attendance_scan_logs/${logId}`);
    }
  };

  const handleClearScanLogs = async (logIds?: string[]) => {
    try {
      if (logIds && logIds.length > 0) {
        const batchOps = logIds.map(id => deleteDoc(doc(db, 'attendance_scan_logs', id)));
        await Promise.all(batchOps);
      } else {
        const snap = await getDocs(collection(db, 'attendance_scan_logs'));
        const batchOps = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(batchOps);
      }
    } catch (err) {
      console.error("Error clearing scan logs:", err);
      handleFirestoreError(err, 'delete', 'attendance_scan_logs');
    }
  };

  const globalScannerConstraints = useMemo(() => ({
    facingMode: globalScannerFacingMode
  }), [globalScannerFacingMode]);

  const globalScannerComponents = useMemo(() => ({
    audio: false,
    finder: true,
  }), []);

  const handleGlobalScan = async (scannedLrn: string) => {
    if (!scannedLrn) return;

    let targetSection = selectedSection;
    let student = students.find(s => s.lrn === scannedLrn);

    if (!targetSection) {
      // Find the student across all sections of active school year
      try {
        const q = query(collectionGroup(db, 'students'), where('lrn', '==', scannedLrn));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const pathParts = docSnap.ref.path.split('/');
          const sectionId = pathParts[1];
          const sect = sections.find(s => s.id === sectionId);
          if (sect) {
            targetSection = sect;
            student = { id: docSnap.id, ...docSnap.data() } as Student;
          }
        }
      } catch (err) {
        console.error("Error finding student in global scan:", err);
      }
    }

    if (!targetSection || !student) {
      setGlobalRecentScan({
        status: 'error',
        message: targetSection 
          ? `LRN "${scannedLrn}" was not found in the selected section (${targetSection.name}).`
          : `LRN "${scannedLrn}" was not found in any registered section.`,
        student: null,
        section: null
      });
      return;
    }

    // Now, check for today's validity
    const today = new Date();
    const currentYear = today.getFullYear();
    const JS_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthStr = JS_MONTHS[today.getMonth()];
    const currentDay = today.getDate();

    const monthVal = String(today.getMonth() + 1).padStart(2, '0');
    const dayVal = String(today.getDate()).padStart(2, '0');
    const scanDate = `${currentYear}-${monthVal}-${dayVal}`;
    const scanTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    // Determine scanType (IN vs OUT)
    const studentTodayLogs = scanLogs
      .filter(l => l.scanDate === scanDate && (l.studentId === student.id || l.lrn === student.lrn))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let scanType: 'IN' | 'OUT' = 'IN';
    if (studentTodayLogs.length > 0) {
      const lastLog = studentTodayLogs[studentTodayLogs.length - 1];
      scanType = lastLog.scanType === 'IN' ? 'OUT' : 'IN';
    } else {
      scanType = 'IN';
    }

    // Record scan log to database
    handleAddScanLog({
      studentId: student.id,
      studentName: formatStudentName(student),
      lrn: student.lrn || '',
      sectionId: targetSection.id,
      sectionName: targetSection.name,
      gradeLevel: targetSection.gradeLevel,
      schoolId: targetSection.schoolId || userProfile?.schoolId || '',
      schoolYear: targetSection.schoolYear || '',
      scanDate,
      scanTime,
      scanType,
      timestamp: today.toISOString(),
      scannedBy: currentUser?.email || 'ID Scanner',
      status: 'On Time'
    });

    // Reconstruct filtered calendar entries for this section's school year
    const sectionCal = schoolCalendar.filter(c => c.schoolYear === targetSection.schoolYear);
    const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    const sortedCal = [...sectionCal].sort((a, b) => monthOrder.indexOf(a.month as string) - monthOrder.indexOf(b.month as string));

    // Construct the calendar map
    const localCalendarMap: { [key: string]: any } = {};
    sortedCal.forEach(c => {
      const term = (c.term || '1').toString();
      const month = c.month as string;
      const key = `${month}_${term}`;
      const year = parseInt(c.year);
      const openingDate = parseInt(c.openingDate || '1');
      const closingDate = parseInt(c.closingDate || '31');
      const localHolidays = c.localHolidays || [];
      const daysInMonth = new Date(year, (MONTH_INDICES[month] || 0) + 1, 0).getDate();

      const allSchoolDays: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, MONTH_INDICES[month], d);
        const dayOfWeek = date.getDay();
        const dateStr = `${(MONTH_INDICES[month] + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = PHILIPPINE_HOLIDAYS.includes(dateStr);
        if (!isWeekend && !isHoliday) {
          allSchoolDays.push(d);
        }
      }

      const hasManualCoverage = openingDate !== 1 || (closingDate !== 31 && closingDate !== daysInMonth);
      let validDays: number[] = [];

      if (hasManualCoverage) {
        validDays = allSchoolDays.filter(d => d >= openingDate && d <= closingDate);
      } else {
        const allEntriesForMonth = sortedCal.filter(entry => entry.month === month)
          .sort((a, b) => (parseInt(a.term || '1') || 1) - (parseInt(b.term || '1') || 1));
        
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

      localCalendarMap[key] = { 
        schoolDays: parseInt(c.days) || validDays.length,
        year,
        term,
        month,
        openingDate,
        closingDate,
        validDays,
        localHolidays
      };
    });

    let termKeyToUpdate: string | null = null;
    for (const key of Object.keys(localCalendarMap)) {
      const data = localCalendarMap[key];
      if (data.year === currentYear && data.month === currentMonthStr) {
        if (data.validDays.includes(currentDay)) {
          termKeyToUpdate = key;
          break;
        }
      }
    }

    // Helper for disabled day
    const isDayDisabled = (stud: Student, year: number, month: string, day: number) => {
      if (stud.dateOfFirstAttendance) {
        const [fYear, fMonth, fDay] = stud.dateOfFirstAttendance.split('-').map(Number);
        const currentMonthIdx = MONTH_INDICES[month];
        if (year < fYear) return true;
        if (year === fYear) {
          if (currentMonthIdx < (fMonth - 1)) return true;
          if (currentMonthIdx === (fMonth - 1) && day < fDay) return true;
        }
      }
      if (stud.status === 'Dropped Out' || stud.status === 'Transferred Out') {
        if (stud.dropoutDate) {
          const [dYear, dMonth, dDay] = stud.dropoutDate.split('-').map(Number);
          const currentMonthIdx = MONTH_INDICES[month];
          if (year > dYear) return true;
          if (year === dYear) {
            if (currentMonthIdx > (dMonth - 1)) return true;
            if (currentMonthIdx === (dMonth - 1) && day >= dDay) return true;
          }
        }
      }
      return false;
    };

    const isDisabled = isDayDisabled(student, currentYear, currentMonthStr, currentDay);
    if (isDisabled) {
      setGlobalRecentScan({
        status: 'error',
        message: `${formatStudentName(student)} logged TIME ${scanType} at ${scanTime}, but is marked inactive/dropped out today.`,
        student,
        section: targetSection,
        scanType,
        scanTime
      });
      return;
    }

    if (!termKeyToUpdate) {
      setGlobalRecentScan({
        status: 'success',
        message: `${formatStudentName(student)} logged TIME ${scanType} at ${scanTime} (Section ${targetSection.name}). Note: Today (${currentMonthStr} ${currentDay}) is not a scheduled school day in calendar.`,
        student,
        section: targetSection,
        scanType,
        scanTime
      });
      return;
    }

    // Attempt to update attendance
    try {
      const dailyAttendance = {
        ...(student.dailyAttendance || {}),
        [termKeyToUpdate]: {
          ...(student.dailyAttendance?.[termKeyToUpdate] || {}),
          [currentDay]: true
        }
      };

      // Calculate monthly present count
      const monthDaily = dailyAttendance[termKeyToUpdate];
      let presentCount = 0;
      Object.values(monthDaily).forEach(val => { if (val) presentCount++; });

      const calendarForMonth = schoolCalendar.find(c => c.schoolYear === targetSection.schoolYear && (`${c.month}_${c.term || '1'}` === termKeyToUpdate || c.month === termKeyToUpdate))?.days || 0;
      const absentCount = Math.max(0, calendarForMonth - presentCount);

      const attendance = {
        ...(student.attendance || {}),
        [termKeyToUpdate]: {
          present: presentCount,
          absent: absentCount
        }
      };

      await setDoc(doc(db, `sections/${targetSection.id}/students`, student.id), {
        dailyAttendance,
        attendance
      }, { merge: true });

      setGlobalRecentScan({
        status: 'success',
        message: `${formatStudentName(student)} logged TIME ${scanType} at ${scanTime} (Section ${targetSection.name}).`,
        student,
        section: targetSection,
        scanType,
        scanTime
      });
    } catch (err) {
      console.error(err);
      setGlobalRecentScan({
        status: 'error',
        message: `Logged TIME ${scanType} at ${scanTime}, but failed to update daily matrix: ${err instanceof Error ? err.message : String(err)}`,
        student,
        section: targetSection,
        scanType,
        scanTime
      });
    }
  };

  const globalScanRef = useRef(handleGlobalScan);
  useEffect(() => {
    globalScanRef.current = handleGlobalScan;
  }, [handleGlobalScan]);

  const handleGlobalScannerError = useCallback((err: any) => {
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
    
    setGlobalScannerError(errMsg);
  }, []);

  const handleGlobalScannerScan = useCallback((result: any[]) => {
    if (result && result.length > 0) {
      globalScanRef.current(result[0].rawValue);
    }
  }, []);

  const [enrollAllModalOpen, setEnrollAllModalOpen] = useState(false);
  const [enrollAllProcessing, setEnrollAllProcessing] = useState(false);
  const [enrollAllSuccessMsg, setEnrollAllSuccessMsg] = useState("");
  const [enrollAllErrorMsg, setEnrollAllErrorMsg] = useState("");

  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course>({
    name: "General Management",
    code: "GEN-01",
    instructor: "Pending...",
    section: "TBA",
    termWeight: { written: 30, performance: 40, summative: 20, exam: 10 }
  });

  // Enrollment Form State
  const [learnerForm, setLearnerForm] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    extension: "",
    name: "",
    lrn: "",
    email: "",
    photo: "",
    age: "",
    birthdate: "",
    birthplace: "",
    address: "",
    sex: "Male" as "Male" | "Female",
    fatherName: "",
    motherName: "",
    guardianName: "",
    guardianRelationship: "",
    primaryContact: "guardian" as "father" | "mother" | "guardian",
    contactNumber: "",
    dateOfFirstAttendance: "",
    attendance: {} as any,
    weight: "",
    height: "",
    nutritionalStatus: {},
    isTransferredIn: false,
    siblingIds: [] as string[],
    enrolledSubjectIds: [] as string[],
    eligibility: {
      type: 'Elementary School Completer',
      genAvg: '',
      citation: '',
      elemSchoolName: '',
      elemSchoolId: '',
      elemSchoolAddress: '',
      peptRating: '',
      peptDate: '',
      alsRating: '',
      alsCenterInfo: '',
      othersSpecify: ''
    } as Eligibility
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTerm, setActiveTerm] = useState<TermNumber>(1);
  
  useEffect(() => {
    if (userProfile && (userProfile.role !== 'system_admin' && userProfile.role !== 'admin') && userProfile.approvalStatus !== 'approved' && userProfile.email !== 'jessiemangabo@gmail.com') {
      const q = query(
        collection(db, "users"),
        where("role", "==", "system_admin"),
        where("schoolId", "==", userProfile.schoolId),
        where("approvalStatus", "==", "approved"),
        limit(1)
      );
      getDocs(q).then(snap => {
        setNoApprovedAdminFound(snap.empty);
      }).catch(err => {
        console.error("Error checking for approved admin:", err);
      });
    } else {
      setNoApprovedAdminFound(false);
    }
  }, [userProfile]);

  useEffect(() => {
    const sId = userProfile?.schoolId;
    if (!sId) {
      setActiveSchool(null);
      return;
    }
    const q = query(collection(db, "schools"), where("schoolId", "==", sId));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setActiveSchool({ id: docSnap.id, ...docSnap.data() } as School);
      } else {
        setActiveSchool(null);
      }
    }, (err) => {
      console.error("Error listening to active school:", err);
    });
    return () => unsub();
  }, [userProfile?.schoolId]);

  useEffect(() => {
    const sId = userProfile?.schoolId;
    if (!sId) {
      setTeacherCount(0);
      return;
    }
    const q = query(
      collection(db, "users"),
      where("role", "==", "teacher"),
      where("schoolId", "==", sId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setTeacherCount(snap.size);
    }, (err) => {
      console.error("Error listening to teachers count:", err);
    });
    return () => unsub();
  }, [userProfile?.schoolId]);

  const isAnySectionAdviser = useMemo(() => {
    if (!userProfile || userProfile.role !== 'teacher') return false;
    const authEmail = (currentUser?.email || "").trim().toLowerCase();
    const profileEmail = (userProfile?.email || "").trim().toLowerCase();
    const uid = currentUser?.uid || "";
    return sections.some(s => {
      const advEmail = (s.adviserEmail || "").trim().toLowerCase();
      return (advEmail && (advEmail === authEmail || advEmail === profileEmail)) || (uid && s.createdBy === uid);
    });
  }, [currentUser, userProfile, sections]);

  const isSectionAdviser = useMemo(() => {
    if (!selectedSection) return false;
    const authEmail = (currentUser?.email || "").trim().toLowerCase();
    const profileEmail = (userProfile?.email || "").trim().toLowerCase();
    const adviserEmailStr = (selectedSection.adviserEmail || "").trim().toLowerCase();
    const isAdviser = adviserEmailStr && (adviserEmailStr === authEmail || adviserEmailStr === profileEmail);
    return !!isAdviser;
  }, [currentUser, userProfile, selectedSection]);

  const isEntireSchoolFinalized = useMemo(() => {
    const activeYear = globalSettings?.activeSchoolYear;
    if (!activeYear) return false;
    const activeSections = sections.filter(s => s.schoolYear === activeYear);
    if (activeSections.length === 0) return false;
    return activeSections.every(s => s.isFinalized);
  }, [sections, globalSettings?.activeSchoolYear]);

  const editableSubjects = useMemo(() => {
    const email = (currentUser?.email || userProfile?.email || "").trim().toLowerCase();
    if (!email) return [];
    return subjects.filter(sub => {
      const subjEmail = (sub.teacherEmail || "").trim().toLowerCase();
      return subjEmail === email;
    });
  }, [subjects, currentUser, userProfile]);

  const globalNumTerms = useMemo(() => {
    if (!schoolCalendar || schoolCalendar.length === 0) return 4;
    const terms = schoolCalendar.map(c => parseInt(c.term) || 0);
    return Math.max(...terms, 4);
  }, [schoolCalendar]);

  const activeTermsInfo = useMemo(() => {
    const years = Array.from(new Set(schoolCalendar.map(c => c.schoolYear).filter(Boolean))) as string[];
    const latest = years.sort((a, b) => b.localeCompare(a))[0] || "";
    const filtered = schoolCalendar.filter(c => c.schoolYear === latest);
    const terms = Array.from(new Set(filtered.map(c => (c.term || '1').toString()))).sort();
    
    return terms.map(term => {
      const termEntries = filtered.filter(c => (c.term || '1').toString() === term);
      const totalDays = termEntries.reduce((sum, c) => sum + (parseInt(c.days) || 0), 0);
      return { term, days: totalDays, schoolYear: latest };
    });
  }, [schoolCalendar]);

  const hasCalendarMatch = useMemo(() => {
    if (!globalSettings?.activeSchoolYear) return false;
    if (!schoolCalendar || schoolCalendar.length === 0 || !selectedSection?.schoolYear) return false;
    return schoolCalendar.some(c => c.schoolYear === selectedSection.schoolYear);
  }, [schoolCalendar, selectedSection?.schoolYear, globalSettings?.activeSchoolYear]);

  // Pending Users Listener
  useEffect(() => {
    if (!currentUser || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'system_admin' && !isAnySectionAdviser)) {
      setPendingUsersCount(0);
      return;
    }

    let q;
    if (userProfile.role === 'admin') {
      q = query(collection(db, "users"), where("approvalStatus", "==", "pending"));
    } else if (userProfile.role === 'system_admin') {
      q = query(
        collection(db, "users"), 
        where("approvalStatus", "==", "pending"),
        where("schoolId", "==", userProfile.schoolId)
      );
    } else {
      // For section advisers (teachers), only show pending students in their school
      q = query(
        collection(db, "users"), 
        where("approvalStatus", "==", "pending"),
        where("role", "==", "student"),
        where("schoolId", "==", userProfile.schoolId)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setPendingUsersCount(snap.docs.length);
    }, (error) => {
      handleFirestoreError(error, 'list', 'users');
    });

    return () => unsub();
  }, [currentUser, userProfile, isAnySectionAdviser]);

  // Auth Listener
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            console.log("DB at doc call:", db); const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const profile = userDoc.data() as UserProfile;
              let updatedProfile = { ...profile };
              let syncNeeded = false;

              // Sync name from Google Auth if it was changed
              if (user.displayName && profile.displayName !== user.displayName) {
                updatedProfile.displayName = user.displayName;
                syncNeeded = true;
              }
              
              // Bootstrap Admin
              if (user.email === 'jessiemangabo@gmail.com' && (profile.role !== 'admin' || profile.approvalStatus !== 'approved')) {
                 updatedProfile = { ...updatedProfile, role: 'admin', approvalStatus: 'approved' };
                 syncNeeded = true;
              }

              if (syncNeeded) {
                 await setDoc(doc(db, "users", user.uid), updatedProfile, { merge: true });
                 setUserProfile(updatedProfile);
              } else {
                 setUserProfile(profile);
              }
              
              if (updatedProfile.role === 'student') {
                 // Look for student in all sections
                 const identifiers: { val: string, type: 'email' | 'lrn' }[] = [];
                 if (updatedProfile.email) identifiers.push({ val: updatedProfile.email, type: 'email' });
                 if (updatedProfile.lrn) identifiers.push({ val: updatedProfile.lrn, type: 'lrn' });
                 
                 if (identifiers.length > 0) {
                   await findStudentEnrollments(identifiers);
                 }
              }
            } else {
              // Check if this is the bootstrap admin
              const isAdmin = user.email === 'jessiemangabo@gmail.com';
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || "",
                role: isAdmin ? "admin" : "teacher",
                displayName: user.displayName || "",
                approvalStatus: isAdmin ? 'approved' : 'pending'
              };
              
              if (!isAdmin) {
                setIsCompletingProfile(true);
              } else {
                await setDoc(doc(db, "users", user.uid), newProfile);
                setUserProfile(newProfile);
              }
            }
          } catch (err) {
            console.error("Error fetching user profile:", err);
          }
        } else {
          setUserProfile(null);
          setSections([]);
          setSelectedSection(null);
          setStudentViewMatched(null);
          setIsCompletingProfile(false);
        }
        setAuthLoading(false);
      }, (error) => {
        console.error("Auth state change error:", error);
        setAuthLoading(false);
      });
      return unsubscribe;
    } catch (error) {
      console.error("Auth Listener Error:", error);
      setAuthLoading(false);
    }
  }, []);

  const findStudentEnrollments = async (identifiers: { val: string, type: 'email' | 'lrn' }[]): Promise<boolean> => {
    try {
      const sectionsSnap = await getDocs(collection(db, "sections"));
      const matchesMap = new Map<string, { student: Student, section: Section }>();
      
      for (const sectionDoc of sectionsSnap.docs) {
        for (const idObj of identifiers) {
           const studentQuery = query(
             collection(db, `sections/${sectionDoc.id}/students`),
             where(idObj.type, "==", idObj.val)
           );
           const studentSnap = await getDocs(studentQuery);
           studentSnap.forEach(sDoc => {
              const combinedId = `${sectionDoc.id}_${sDoc.id}`;
              if (!matchesMap.has(combinedId)) {
                matchesMap.set(combinedId, {
                  student: { id: sDoc.id, ...sDoc.data() } as Student,
                  section: { id: sectionDoc.id, ...sectionDoc.data() } as Section
                });
              }
           });
        }
      }

      const matches = Array.from(matchesMap.values());

      if (matches.length > 0) {
        // Persist LRN to user profile for security rules affinity if we have a match
        const firstWithLrn = matches.find(m => m.student.lrn) || matches[0];
        if (userProfile && !userProfile.lrn && firstWithLrn.student.lrn) {
          try {
            await updateDoc(doc(db, "users", currentUser!.uid), {
              lrn: firstWithLrn.student.lrn
            });
            setUserProfile({ ...userProfile, lrn: firstWithLrn.student.lrn });
          } catch (err) {
            console.error("Failed to persist LRN:", err);
          }
        }
        
        const sorted = [...matches].sort((a, b) => (b.section.schoolYear || "").localeCompare(a.section.schoolYear || ""));
        setAllStudentEnrollments(sorted);
        setStudentViewMatched(sorted[0]);
        setSelectedSection(sorted[0].section);
        return true;
      }
    } catch (error) {
      console.error("Find Student Error:", error);
    }
    return false;
  };

  // Sections Listener
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    
    let q;
    let unsubscribeSections: () => void;
    let isSubscribed = true;

    if (userProfile.role === 'admin') {
      q = query(collection(db, "sections"));
    } else if (userProfile.role === 'system_admin' || userProfile.role === 'school_head' || userProfile.role === 'guidance_designate') {
      const userEmail = (currentUser.email || "").toLowerCase();
      q = query(
        collection(db, "sections"), 
        or(
          where("schoolId", "==", userProfile.schoolId || ''),
          where("adviserEmail", "==", userEmail)
        )
      );
    }

    if (userProfile.role === 'admin' || userProfile.role === 'system_admin' || userProfile.role === 'school_head' || userProfile.role === 'guidance_designate') {
      unsubscribeSections = onSnapshot(q!, (snapshot) => {
        if (!isSubscribed) return;
        setSections(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Section)));
      }, (err) => {
        handleFirestoreError(err, 'list', 'sections');
      });
    } else if (userProfile.role === 'teacher') {
      const userEmailLower = (currentUser.email || "").toLowerCase();
      // 1. Get all sections for their school to check subjectTeachers dynamically
      const baseQuery = userProfile.schoolId 
        ? query(collection(db, "sections"), where("schoolId", "==", userProfile.schoolId))
        : query(collection(db, "sections"));

      const processSections = async (snapshotDocs: any[]) => {
        try {
          const allSections = snapshotDocs.map(d => ({ id: d.id, ...d.data() } as Section));
          let subDocs: any[] = [];
          
          if (userEmailLower) {
            const subjectsQuery = query(
              collectionGroup(db, 'subjects'),
              where("teacherEmail", "==", userEmailLower)
            );
            const subjectsSnap = await getDocs(subjectsQuery).catch(() => ({ docs: [] }));
            subDocs = subjectsSnap.docs;
          }

          const teacherSections: Section[] = [];

          for (const sec of allSections) {
            let isRelevant = false;
            const teacherSubjectNames = new Set<string>();
            
            // Check custom subjects via collectionGroup
            for (const subjDoc of subDocs) {
              const pathParts = subjDoc.ref.path.split('/');
              const sectionId = pathParts[1];
              if (sectionId === sec.id) {
                isRelevant = true;
                teacherSubjectNames.add((subjDoc.data() as Subject).name);
              }
            }
            
            // Check global subjects via subjectTeachers map
            if (sec.subjectTeachers) {
              for (const [subjId, tEmail] of Object.entries(sec.subjectTeachers)) {
                if (tEmail && typeof tEmail === 'string' && tEmail.toLowerCase() === userEmailLower) {
                  isRelevant = true;
                  const gSubj = globalSubjects.find(g => g.id === subjId);
                  if (gSubj) {
                    teacherSubjectNames.add(gSubj.name);
                  }
                }
              }
            }

            if ((sec.adviserEmail || '').toLowerCase() === userEmailLower) {
              isRelevant = true;
            }

            if (isRelevant) {
               teacherSections.push({
                 ...sec,
                 teacherSubjects: Array.from(teacherSubjectNames)
               });
            }
          }

          if (isSubscribed) {
            setSections(teacherSections);
          }
        } catch (e) {
          console.error("Error processing teacher sections", e);
        }
      };

      const unsubBase = onSnapshot(baseQuery, (snap) => processSections(snap.docs), (err) => {
         handleFirestoreError(err, 'list', 'sections');
      });

      let unsubSubjectsGroup = () => {};
      if (userEmailLower) {
        const subjectsQuery = query(
          collectionGroup(db, 'subjects'),
          where("teacherEmail", "==", userEmailLower)
        );
        unsubSubjectsGroup = onSnapshot(subjectsQuery, async () => {
           const snap = await getDocs(baseQuery);
           processSections(snap.docs);
        }, (err) => {
           handleFirestoreError(err, 'list', 'subjects');
        });
      }

      unsubscribeSections = () => {
        unsubBase();
        unsubSubjectsGroup();
      };

    } else {
      return; // Students don't browse sections
    }

    return () => {
      isSubscribed = false;
      if (unsubscribeSections) unsubscribeSections();
    };
  }, [currentUser, userProfile, globalSubjects]);

  useEffect(() => {
    if (!currentUser || !userProfile?.schoolId) {
      setAralClasses([]);
      return;
    }
    const q = query(
      collection(db, "aral_classes"),
      where("schoolId", "==", userProfile.schoolId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setAralClasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AralClass)));
    }, (err) => {
      console.error("Failed to load aral classes", err);
    });
    return () => unsub();
  }, [currentUser, userProfile?.schoolId]);

  // Students & Subjects Listener for Selected Section
  useEffect(() => {
  if (!selectedSection) {
      setStudents([]);
      if (userProfile?.role === 'admin' || userProfile?.role === 'system_admin' || userProfile?.role === 'teacher') {
        // Fetch all subjects for the school (admin/system_admin) or the teacher (teacher) to show on section cards
        let q;
        if (userProfile.role === 'admin' || userProfile.role === 'system_admin') {
          // Administrators view all subjects across the school
          q = query(collectionGroup(db, 'subjects'));
        } else {
          // Teacher: Fetch subjects where they are the teacher
          q = query(collectionGroup(db, 'subjects'), where("teacherEmail", "==", userProfile.email || ''));
        }
          
        const unsub = onSnapshot(q, (snapshot) => {
          let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
          if ((userProfile?.role === 'system_admin' || userProfile?.role === 'admin') && userProfile.schoolId) {
            const schoolSectionIds = new Set(sections.map(s => s.id));
            list = list.filter(sub => {
              return (sub.schoolId === userProfile.schoolId) || (sub.sectionId && schoolSectionIds.has(sub.sectionId));
            });
          }
          setSubjects(list);
        }, (err) => {
          console.error("Error fetching all subjects for directory view:", err);
        });
        return () => unsub();
      } else {
        setSubjects([]);
      }
      return;
    }

    const studentsUnsub = onSnapshot(
      collection(db, `sections/${selectedSection.id}/students`),
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
        setStudents(list);
        
        // Sync studentViewMatched for student portal reactivity
        if (userProfile?.role === 'student' && userProfile.lrn) {
          const me = list.find(s => s.lrn === userProfile.lrn);
          if (me) {
            setStudentViewMatched(prev => prev ? { ...prev, student: me } : null);
          }
        }
      },
      (err) => handleFirestoreError(err, 'list', `sections/${selectedSection.id}/students`)
    );

    const sectionSubjectsUnsub = onSnapshot(
      collection(db, `sections/${selectedSection.id}/subjects`),
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
        setSectionSubjects(list);
      },
      (err) => handleFirestoreError(err, 'list', `sections/${selectedSection.id}/subjects`)
    );

    return () => {
      studentsUnsub();
      sectionSubjectsUnsub();
    };
  }, [selectedSection?.id, userProfile?.role, sections]);

  useEffect(() => {
    if (!selectedSection) {
      setSubjects([]);
      return;
    }
    const globalIds = selectedSection.globalSubjectIds || [];
    const secTeachers = selectedSection.subjectTeachers || {};
    const enrolledIds = new Set(students.flatMap(s => s.enrolledSubjectIds || []));
    
    // Map of section subjects by ID for overrides
    const secSubjMap = new Map();
    sectionSubjects.forEach(s => secSubjMap.set(s.id, s));
    
    const list = [
      ...globalSubjects
        .filter(s => 
          Number(s.gradeLevel) === Number(selectedSection.gradeLevel) || 
          globalIds.includes(s.id) ||
          enrolledIds.has(s.id)
        )
        .map(s => {
           const override = secSubjMap.get(s.id);
           if (override) {
             secSubjMap.delete(s.id); // Remove so it's not rendered twice
             return { ...s, ...override, sectionId: selectedSection.id, teacherEmail: secTeachers[s.id] || override.teacherEmail || '' };
           }
           return {
             ...s,
             sectionId: selectedSection.id,
             teacherEmail: secTeachers[s.id] || ''
           };
        }),
      ...Array.from(secSubjMap.values()).map(s => ({
        ...s,
        teacherEmail: secTeachers[s.id] || s.teacherEmail
      }))
    ];
    setSubjects(list as Subject[]);
  }, [selectedSection, globalSubjects, students, sectionSubjects]);

  useEffect(() => {
    if (!selectedSection) return;
    
    // Wait until subjects are loaded for the current selected section
    const subjectsForSection = subjects.filter(s => s.sectionId === selectedSection.id);
    if (subjectsForSection.length === 0) return;

    if (subjects.length > 0) {
        // If a subject was selected (maybe via navigation or persistence), check if it exists in the section's subjects
        // We check against both ID and Name to support direct navigation from section cards
        const matchedSubject = subjects.find(s => 
          (selectedSubjectId && s.id === selectedSubjectId) || 
          (selectedSubjectId && s.name === selectedSubjectId && s.sectionId === selectedSection.id)
        );

        if (!selectedSubjectId || !matchedSubject) {
            const mySubjects = subjectsForSection.filter(s => (s.teacherEmail || '').toLowerCase() === (currentUser?.email || '').toLowerCase());
            if (mySubjects.length > 0 && userProfile?.role === 'teacher') {
                setSelectedSubjectId(mySubjects[0].id);
            } else {
                setSelectedSubjectId(subjectsForSection[0].id);
            }
        } else if (matchedSubject && selectedSubjectId !== matchedSubject.id) {
            // Upgrade name to ID if it matched by name
            setSelectedSubjectId(matchedSubject.id);
        }
    }
  }, [subjects, selectedSubjectId, selectedSection?.id]);

  useEffect(() => {
    if (activeTab !== 'gradebook' && activeTab !== 'summary') return;
    if (!selectedSection || !selectedSubjectId) {
      setCombinedTleStudents([]);
      return;
    }
    
    const isGrade910 = Number(selectedSection.gradeLevel) === 9 || Number(selectedSection.gradeLevel) === 10;
    const matchedSubject = subjects.find(s => s.id === selectedSubjectId || s.name === selectedSubjectId);
    const isTle = matchedSubject?.name?.toLowerCase().includes("tle") || false;
    const activeYear = globalSettings?.activeSchoolYear;

    if (isGrade910 && isTle && activeYear) {
       const qGroup = query(collectionGroup(db, 'students'));
       const unsub = onSnapshot(qGroup, snap => {
         const list = snap.docs.map(d => {
            const data = d.data() as Student;
            const refPath = d.ref.path.split('/');
            const secId = refPath[refPath.length - 3];
            const sec = sections.find(s => s.id === secId);
            return { 
                id: d.id, ...data, sectionId: secId,
                sectionName: sec ? `Grade ${sec.gradeLevel} - ${sec.name}` : data.sectionName 
            };
         }).filter(s => {
            if (!s.enrolledSubjectIds || !s.enrolledSubjectIds.includes(selectedSubjectId)) return false;
            const studentSection = sections.find(sec => sec.id === s.sectionId);
            return studentSection && studentSection.schoolYear === activeYear;
         });
         setCombinedTleStudents(list);
       });
       return () => unsub();
    } else {
       setCombinedTleStudents([]);
    }
  }, [selectedSection?.id, selectedSubjectId, activeTab, subjects, globalSettings?.activeSchoolYear, sections]);

  // Persistence for dropdowns
  useEffect(() => {
    if (currentUser) {
      const savedSectionId = localStorage.getItem(`selectedSectionId_${currentUser.uid}`);
      if (savedSectionId && sections.length > 0) {
        const section = sections.find(s => s.id === savedSectionId);
        if (section) setSelectedSection(section);
      }
      
      const savedTerm = localStorage.getItem(`activeTerm_${currentUser.uid}`);
      if (savedTerm) setActiveTerm(parseInt(savedTerm) as TermNumber);

      const savedSubjectId = localStorage.getItem(`selectedSubjectId_${currentUser.uid}`);
      if (savedSubjectId) setSelectedSubjectId(savedSubjectId);
    }
  }, [currentUser, sections.length]);

  useEffect(() => {
    if (currentUser && selectedSection) {
      localStorage.setItem(`selectedSectionId_${currentUser.uid}`, selectedSection.id);
    }
  }, [selectedSection, currentUser]);

  useEffect(() => {
    if (currentUser && activeTerm) {
      localStorage.setItem(`activeTerm_${currentUser.uid}`, activeTerm.toString());
    }
  }, [activeTerm, currentUser]);

  useEffect(() => {
    if (currentUser && selectedSubjectId) {
      localStorage.setItem(`selectedSubjectId_${currentUser.uid}`, selectedSubjectId);
    }
  }, [selectedSubjectId, currentUser]);

  // Reactivity for the selected section document itself
  useEffect(() => {
    if (!selectedSection?.id) return;
    
    const unsub = onSnapshot(doc(db, "sections", selectedSection.id), (snap) => {
      if (snap.exists()) {
        setSelectedSection({ id: snap.id, ...snap.data() } as Section);
      }
    }, (err) => {
      handleFirestoreError(err, 'get', `sections/${selectedSection.id}`);
    });
    
    return () => unsub();
  }, [selectedSection?.id]);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      const unsub = onSnapshot(collection(db, 'schools'), (snap) => {
        const expiredIds: string[] = [];
        snap.forEach(d => {
           const school = d.data();
           const now = new Date();
           const fallbackDate = new Date(school.createdAt || now.toISOString());
           fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
           const expirationDate = school.expiresAt ? new Date(school.expiresAt) : fallbackDate;
           if (expirationDate < now) {
              expiredIds.push(school.schoolId);
           }
        });
        setExpiredSchoolIds(expiredIds);
      }, (err) => console.error("Admin schools snapshot error:", err));
      return () => unsub();
    } else {
      setExpiredSchoolIds([]);
    }
  }, [userProfile?.role]);

  useEffect(() => {
    const isExpired = activeSchool?.expiresAt ? new Date(activeSchool.expiresAt) < new Date() : false;
    if (isExpired && selectedSection !== null && userProfile?.email !== 'jessiemangabo@gmail.com') {
      setSelectedSection(null);
    }
  }, [activeSchool, selectedSection, userProfile]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login Error:", error);
      const isCancelled = 
        error.code === 'auth/popup-closed-by-user' || 
        error.code === 'auth/user-cancelled' || 
        error.code === 'auth/cancelled-popup-request';
      if (isCancelled) {
        setLoginError("Login popup was closed before signing in. Please try again.");
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError("Pop-up window was blocked by your browser. Please allow popups for this site or use Quick Access / Demo Login below.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("This domain is not authorized for Google Sign-In in Firebase. You can use Quick Access / Demo Login below.");
      } else {
        setLoginError(`Authentication failed: ${error.message || 'Please check your connection and try again.'}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async (demoRole: 'admin' | 'system_admin' | 'school_head' | 'teacher' | 'student') => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      let email = 'jessiemangabo@gmail.com';
      let name = 'Dr. Jessie J. Mangabo (System Admin)';
      let uid = 'demo-root-admin';
      let schoolId = '10101';
      let lrn = '';

      if (demoRole === 'system_admin') {
        email = 'sysadmin@school.edu.ph';
        name = 'System Administrator';
        uid = 'demo-sysadmin';
      } else if (demoRole === 'school_head') {
        email = 'principal@school.edu.ph';
        name = 'Maria Santos, PhD (School Head)';
        uid = 'demo-schoolhead';
      } else if (demoRole === 'teacher') {
        email = 'teacher@school.edu.ph';
        name = 'Juan Dela Cruz (Teacher)';
        uid = 'demo-teacher';
      } else if (demoRole === 'student') {
        email = 'student@school.edu.ph';
        name = 'Mark Reyes (Student)';
        uid = 'demo-student';
        lrn = '123456789012';
      }

      const mockUser: any = {
        uid,
        email,
        displayName: name,
        emailVerified: true,
        isAnonymous: false,
      };

      const mockProfile: UserProfile = {
        uid,
        email,
        displayName: name,
        role: demoRole === 'admin' ? 'admin' : demoRole,
        approvalStatus: 'approved',
        schoolId,
        ...(lrn ? { lrn } : {})
      };

      try {
        await setDoc(doc(db, "users", uid), mockProfile, { merge: true });
      } catch (e) {
        console.warn("Demo user setDoc warning:", e);
      }

      setCurrentUser(mockUser);
      setUserProfile(mockProfile);
      setIsCompletingProfile(false);
    } catch (err: any) {
      console.error("Demo login error:", err);
      setLoginError("Failed to initialize Demo session: " + (err.message || String(err)));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('home_filters');
    if (currentUser) {
      localStorage.removeItem(`selectedSectionId_${currentUser.uid}`);
      localStorage.removeItem(`activeTerm_${currentUser.uid}`);
      localStorage.removeItem(`selectedSubjectId_${currentUser.uid}`);
      localStorage.removeItem(`dailyAttendance_selectedMonth_${currentUser.uid}`);
      localStorage.removeItem(`dailyAttendance_selectedTerm_${currentUser.uid}`);
      localStorage.removeItem(`sf2_selectedMonthKey_${currentUser.uid}`);
    }
    setCurrentUser(null);
    setUserProfile(null);
    setIsCompletingProfile(false);
    try {
      signOut(auth);
    } catch (e) {
      console.warn("SignOut error:", e);
    }
  };

  const handleRenewSubscription = async (yearIndex: number) => {
    if (!activeSchool?.id || !activeSchool?.schoolId) return;
    try {
      const currentExpiration = activeSchool.expiresAt 
        ? new Date(activeSchool.expiresAt)
        : null;

      let newExpiration: Date;
      if (currentExpiration) {
        newExpiration = new Date(currentExpiration);
        newExpiration.setFullYear(currentExpiration.getFullYear() + 1);
      } else {
        const schoolCreatedAt = activeSchool.createdAt || new Date().toISOString();
        const createdDate = new Date(schoolCreatedAt);
        newExpiration = new Date(createdDate);
        newExpiration.setFullYear(createdDate.getFullYear() + yearIndex);
      }
      const newExpiresAt = newExpiration.toISOString();

      const batch = writeBatch(db);

      // 1. Update activeSchool document
      const schoolRef = doc(db, "schools", activeSchool.id);
      batch.update(schoolRef, {
        paidYears: arrayUnion(yearIndex),
        expiresAt: newExpiresAt
      });

      // 3. Commit atomic batch in Firestore
      await batch.commit();
      console.log(`Successfully renewed subscription for Year ${yearIndex} until ${newExpiresAt}`);
    } catch (err) {
      console.error("Error during renewal transaction: ", err);
      handleFirestoreError(err, 'update', 'subscription renewal');
    }
  };

  const handleCreateSection = async (sectionData: any) => {
    if (!currentUser) return;
    try {
      const newSection = {
        ...sectionData,
        createdBy: currentUser.uid,
        adviserEmail: (sectionData.adviserEmail || "").trim().toLowerCase()
      };
      await addDoc(collection(db, "sections"), newSection);
    } catch (error) {
      handleFirestoreError(error, 'create', 'sections');
    }
  };

  const handleUpdateSection = async (id: string, sectionData: any) => {
    const isCriticalUpdate = 'name' in sectionData || 'gradeLevel' in sectionData || 'schoolId' in sectionData || 'schoolYear' in sectionData || 'adviserEmail' in sectionData;
    
    const sec = sections.find(s => s.id === id);
    const adviserEmail = (sec?.adviserEmail || "").trim().toLowerCase();
    const profEmail = (userProfile?.email || "").trim().toLowerCase();
    const isSecAdviser = adviserEmail && adviserEmail === profEmail;
    
    const isOnlyUpdatingSubjectTeachers = Object.keys(sectionData).length === 1 && 'subjectTeachers' in sectionData;

    if (userProfile?.role === 'teacher' && !isSecAdviser && !isOnlyUpdatingSubjectTeachers) {
      alert("Teachers are not authorized to edit section details. Please contact the System Administrator.");
      return;
    }
    if (userProfile?.role === 'teacher' && isSecAdviser && isCriticalUpdate) {
      alert("Section Advisers are not authorized to edit core section metadata. Please contact the System Administrator.");
      return;
    }
    try {
      const updatedData = {
        ...sectionData,
      };
      if (updatedData.adviserEmail !== undefined) {
        updatedData.adviserEmail = (updatedData.adviserEmail || "").trim().toLowerCase();
      }
      await setDoc(doc(db, "sections", id), updatedData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'update', `sections/${id}`);
    }
  };

  const cascadeDeleteSection = async (id: string) => {
    try {
      const batch = writeBatch(db);
      
      const studentsSnap = await getDocs(collection(db, `sections/${id}/students`));
      studentsSnap.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const subjectsSnap = await getDocs(collection(db, `sections/${id}/subjects`));
      subjectsSnap.forEach(doc => {
        batch.delete(doc.ref);
      });

      batch.delete(doc(db, "sections", id));
      
      await batch.commit();
    } catch (error) {
       handleFirestoreError(error, 'delete', `sections/${id}`);
       throw error;
    }
  };

  const handleDeleteSection = async (id: string, action?: 'approve' | 'disapprove' | 'cancel' | 'request' | 'delete', reason?: string) => {
    const section = sections.find(s => s.id === id);
    if (!section) return;

    if (userProfile?.role === 'teacher') {
      if (action === 'cancel') {
        try {
          await updateDoc(doc(db, "sections", id), {
            deletionStatus: 'none',
            deletionRequestedBy: deleteField(),
            disapprovalReason: deleteField(),
            deletionReason: deleteField()
          });
        } catch (error) {
          handleFirestoreError(error, 'update', `sections/${id}`);
        }
      } else if (action === 'request') {
        try {
          await updateDoc(doc(db, "sections", id), {
            deletionStatus: 'pending',
            deletionRequestedBy: userProfile?.email || "",
            disapprovalReason: deleteField(),
            deletionReason: reason || "No reason provided."
          });
        } catch (error) {
          handleFirestoreError(error, 'update', `sections/${id}`);
        }
      } else if (action === 'delete') {
          try {
             await cascadeDeleteSection(id);
          } catch (error) {
             handleFirestoreError(error, 'delete', `sections/${id}`);
          }
      }
    } else if (userProfile?.role === 'system_admin') {
       if (action === 'delete' || (!action && section?.deletionStatus === 'approved')) {
           try {
              await cascadeDeleteSection(id);
           } catch (error) {
              handleFirestoreError(error, 'delete', `sections/${id}`);
           }
       } else if (action === 'approve') {
           try {
             await updateDoc(doc(db, "sections", id), {
               deletionStatus: 'approved',
               disapprovalReason: deleteField()
             });
           } catch (error) {
             handleFirestoreError(error, 'update', `sections/${id}`);
           }
       } else if (action === 'disapprove') {
           try {
             await updateDoc(doc(db, "sections", id), { 
               deletionStatus: 'rejected',
               disapprovalReason: reason || "No reason provided."
             });
           } catch (error) {
             handleFirestoreError(error, 'update', `sections/${id}`);
           }
       }
    } else if (userProfile?.role === 'admin') {
       if (action === 'delete' || (!action && section?.deletionStatus === 'approved')) {
           await cascadeDeleteSection(id);
       } else if (action === 'request') {
           try {
             await updateDoc(doc(db, "sections", id), {
               deletionStatus: 'pending',
               deletionRequestedBy: userProfile?.email || "",
               disapprovalReason: deleteField(),
               deletionReason: reason || "No reason provided."
             });
           } catch (error) {
             handleFirestoreError(error, 'update', `sections/${id}`);
           }
       }
    }
  };

  const updateStudentGrades = async (studentId: string, updates: any, subjectId: string, term: number) => {
    const targetStudent = combinedTleStudents.find(s => s.id === studentId);
    const secId = targetStudent?.sectionId || selectedSection?.id;
    if (!secId) return;
    try {
      const studentDocRef = doc(db, `sections/${secId}/students`, studentId);
      const studentDoc = await getDoc(studentDocRef);
      if (!studentDoc.exists()) return;
      
      const currentGrades = (studentDoc.data() as Student).grades || {};
      const subjectGrades = currentGrades[subjectId] || {};
      const termGrades = subjectGrades[term] || JSON.parse(JSON.stringify(DEFAULT_TERM_DATA));
      
      const updatedTermGrades = { ...termGrades, ...updates };
      
      await setDoc(studentDocRef, {
        grades: {
          ...currentGrades,
          [subjectId]: {
            ...subjectGrades,
            [term]: updatedTermGrades
          }
        }
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'update', `sections/${secId}/students/${studentId}`);
    }
  };

  const updateSubjectConfig = async (subjectId: string, updates: any) => {
    if (!selectedSection) return;
    try {
      const subject = subjects.find(s => s.id === subjectId);
      const mergedUpdates = { ...updates };
      if (subject) {
        if (subject.teacherEmail) mergedUpdates.teacherEmail = subject.teacherEmail;
        if (subject.name) mergedUpdates.name = subject.name;
        if (subject.schoolId) mergedUpdates.schoolId = subject.schoolId;
        if (subject.sectionId) mergedUpdates.sectionId = subject.sectionId;
      }
      const subjRef = doc(db, `sections/${selectedSection.id}/subjects`, subjectId);
      await setDoc(subjRef, mergedUpdates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'update', `sections/${selectedSection.id}/subjects/${subjectId}`);
    }
  };

  const handleBulkUpdate = async (updatedStudents: Student[], subjectId: string, term: number) => {
    const defaultSecId = selectedSection?.id;
    if (!defaultSecId && updatedStudents.length > 0 && !updatedStudents[0].sectionId) return;
    const batch = writeBatch(db);
    try {
      updatedStudents.forEach(s => {
        const targetStudent = combinedTleStudents.find(st => st.id === s.id);
        const secId = targetStudent?.sectionId || s.sectionId || defaultSecId;
        if (secId) {
            batch.set(doc(db, `sections/${secId}/students`, s.id), s, { merge: true });
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'write', `sections/bulkUpdate/students`);
    }
  };

  const handleSaveLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;

    // Check for duplicate LRN in current section
    const isDuplicate = students.some(s => s.lrn === learnerForm.lrn && s.id !== editingId);
    if (isDuplicate) {
      alert("A learner with this LRN already exists in this section.");
      return;
    }

    // Auto-generate full name for display convenience
    const nameParts = [
      learnerForm.lastName + (learnerForm.firstName ? "," : ""),
      learnerForm.firstName,
      learnerForm.middleName,
      learnerForm.extension
    ].filter(Boolean);
    const fullName = nameParts.join(" ").trim();
    
    try {
      if (editingId) {
        const oldStudent = students.find(s => s.id === editingId);
        const { bmi, category } = computeBMI(parseFloat(learnerForm.weight) || 0, parseFloat(learnerForm.height) || 0);

        await setDoc(doc(db, `sections/${selectedSection.id}/students`, editingId), {
          ...learnerForm,
          name: fullName,
          age: parseInt(learnerForm.age) || 0,
          weight: parseFloat(learnerForm.weight) || 0,
          height: parseFloat(learnerForm.height) || 0,
          bmi: bmi,
          nutritionalStatus: {
            ...learnerForm.nutritionalStatus,
            bmiCategory: category
          },
          studentNumber: learnerForm.lrn,
        }, { merge: true });

        setEditingId(null);
      } else {
        const { bmi, category } = computeBMI(parseFloat(learnerForm.weight) || 0, parseFloat(learnerForm.height) || 0);

        const newLearner = {
          sectionId: selectedSection.id,
          name: fullName,
          lastName: learnerForm.lastName,
          firstName: learnerForm.firstName,
          middleName: learnerForm.middleName,
          extension: learnerForm.extension,
          lrn: learnerForm.lrn,
          email: learnerForm.email,
          studentNumber: learnerForm.lrn,
          age: parseInt(learnerForm.age) || 0,
          birthdate: learnerForm.birthdate || "",
          birthplace: learnerForm.birthplace || "",
          address: learnerForm.address || "",
          sex: learnerForm.sex,
          fatherName: learnerForm.fatherName || "",
          motherName: learnerForm.motherName || "",
          guardianName: learnerForm.guardianName || "",
          guardianRelationship: learnerForm.guardianRelationship || "",
          primaryContact: learnerForm.primaryContact || "guardian",
          contactNumber: learnerForm.contactNumber || "",
          weight: parseFloat(learnerForm.weight) || 0,
          height: parseFloat(learnerForm.height) || 0,
          bmi: bmi,
          nutritionalStatus: {
            bmiCategory: category
          },
          dateOfFirstAttendance: learnerForm.dateOfFirstAttendance || "",
          isTransferredIn: learnerForm.isTransferredIn || false,
          attendance: learnerForm.attendance || {},
          eligibility: learnerForm.eligibility || {},
          photo: learnerForm.photo || "",
          grades: {},
          enrolledSubjectIds: learnerForm.enrolledSubjectIds || [],
          gradeLevel: selectedSection.gradeLevel || "",
          sectionName: selectedSection.name || "",
          siblingIds: learnerForm.siblingIds || []
        };
        const docRef = await addDoc(collection(db, `sections/${selectedSection.id}/students`), newLearner);
        const newStudentId = docRef.id;

        // Bidirectional update for new student
        try {
          const sibs = learnerForm.siblingIds || [];
          for (const sId of sibs) {
            const snaps = await Promise.all(sections.map(sec => getDoc(doc(db, `sections/${sec.id}/students`, sId))));
            const snap = snaps.find(s => s.exists());
            if (snap) {
              const sRef = snap.ref;
              const sibList = snap.data().siblingIds || [];
              if (!sibList.includes(newStudentId)) {
                await updateDoc(sRef, { siblingIds: [...sibList, newStudentId] });
              }
            }
          }
        } catch (e) {
          console.error("Error creating manual bidirectional links for new student:", e);
        }
      }
      setLearnerForm({ 
        lastName: "", firstName: "", middleName: "", extension: "", name: "", 
        lrn: "", email: "", photo: "", age: "", birthdate: "", sex: "Male", weight: "", height: "", attendance: {}, 
        birthplace: "", address: "", fatherName: "", motherName: "", guardianName: "", guardianRelationship: "", primaryContact: "guardian", contactNumber: "",
        nutritionalStatus: {}, isTransferredIn: false, siblingIds: [], enrolledSubjectIds: [], eligibility: { type: 'Elementary School Completer' } as Eligibility 
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `sections/${selectedSection.id}/students`);
    }
  };

  const handleEnrollAllLearners = async () => {
    if (!selectedSection) return;
    if (unenrolledStudents.length === 0) {
      setEnrollAllErrorMsg("No pending learners to enroll.");
      return;
    }
    setEnrollAllModalOpen(true);
  };

  const handleToggleSF9Download = async (studentId: string, value: boolean) => {
    if (!selectedSection) return;
    try {
      await updateDoc(doc(db, `sections/${selectedSection.id}/students`, studentId), {
        sf9CardUnlocked: value
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `sections/${selectedSection.id}/students/${studentId}`);
    }
  };

  const handleToggleStudentStatus = async (studentId: string, status: 'Active' | 'Transferred Out' | 'Dropped Out' | 'Retained' | 'Promoted') => {
    if (!selectedSection) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (status === 'Active') {
      try {
        const updateData: any = { 
          status: status,
          dropoutDate: deleteField(),
          dropoutReason: deleteField()
        };
        await updateDoc(doc(db, `sections/${selectedSection.id}/students`, studentId), updateData);
      } catch (error) {
        handleFirestoreError(error, 'write', `sections/${selectedSection.id}/students/${studentId}`);
      }
    } else {
      // Trigger modal
      setStatusChangeDate(new Date().toISOString().split('T')[0]);
      setStatusChangeReason("");
      setStatusChangeTarget({ student, newStatus: status });
    }
  };

  const confirmStatusChange = async () => {
    if (!selectedSection || !statusChangeTarget) return;
    const { student, newStatus } = statusChangeTarget;
    try {
      const updateData: any = { 
        status: newStatus,
        dropoutDate: statusChangeDate || new Date().toISOString().split('T')[0]
      };
      if (statusChangeReason.trim()) {
        updateData.dropoutReason = statusChangeReason.trim();
      } else {
        updateData.dropoutReason = deleteField();
      }
      await updateDoc(doc(db, `sections/${selectedSection.id}/students`, student.id), updateData);
      setStatusChangeTarget(null);
    } catch (error) {
      handleFirestoreError(error, 'write', `sections/${selectedSection.id}/students/${student.id}`);
    }
  };

  const handleCalculateYearEnd = () => {
    if (!selectedSection) return;
    setConfirmFinalizeSection(true);
  };

  const executeFinalizeSection = async () => {
    if (!selectedSection) return;
    setConfirmFinalizeSection(false);
    try {
      const activeStudents = students.filter(s => s.status === 'Active' || !s.status);
      const updatePromises = activeStudents.map(student => {
         let totalWeightedFinals = 0;
         let totalUnits = 0;
         editableSubjects.forEach(subj => {
             const termsPassed = (subj.offeredTerms || [1,2,3,4]).map(t => calculateGrade(student, subj, t as TermNumber).final).filter(f => f > 0);
             if (termsPassed.length > 0) {
                 const finalRating = Math.round(termsPassed.reduce((a,b)=>a+b, 0) / termsPassed.length);
                 const u = (subj.unit !== undefined && subj.unit !== null && subj.unit > 0) ? subj.unit : 1.0;
                 totalWeightedFinals += finalRating * u;
                 totalUnits += u;
             }
         });
         
         let finalStatus = 'Retained';
         if (totalUnits > 0) {
             const genAvg = Math.round(totalWeightedFinals / totalUnits);
             finalStatus = genAvg >= 75 ? 'Promoted' : 'Retained';
         }
         return updateDoc(doc(db, `sections/${selectedSection.id}/students`, student.id), {
             status: finalStatus
         });
      });
      await Promise.all(updatePromises);
      await updateDoc(doc(db, 'sections', selectedSection.id), { isFinalized: true });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, 'write', `sections/${selectedSection.id}/students`);
    }
  };

  const handleShowFinancialStatement = () => {
    setShowAdminPTA(true);
  };

  const handleUnfinalizeYearEnd = async () => {
    if (!selectedSection) return;
    setConfirmYearEndUnfinalize(true);
  };

  const executeUnfinalizeYearEnd = async () => {
    if (!selectedSection) return;
    setConfirmYearEndUnfinalize(false);
    try {
      if (userProfile?.role === 'system_admin' || userProfile?.email === 'jessiemangabo@gmail.com') {
        const finalizedStudents = students.filter(s => s.status === 'Promoted' || s.status === 'Retained');
        const updatePromises = finalizedStudents.map(student => {
           return updateDoc(doc(db, `sections/${selectedSection.id}/students`, student.id), {
               status: 'Active'
           });
        });
        await Promise.all(updatePromises);
        await updateDoc(doc(db, 'sections', selectedSection.id), { isFinalized: false });
        alert("Section successfully unfinalized.");
      } else {
        const docRef = doc(db, 'settings', 'general');
        await updateDoc(docRef, {
          unfinalizeRequests: arrayUnion({
            schoolYear: selectedSection.schoolYear || 'active',
            sectionId: selectedSection.id,
            sectionName: selectedSection.name,
            requestedBy: userProfile?.email,
            timestamp: new Date().toISOString()
          })
        });
        alert("Unfinalize Section request sent successfully. A System Admin will review your request.");
      }
    } catch (error) {
      console.error(error);
      const isTeacher = !(userProfile?.role === 'system_admin' || userProfile?.email === 'jessiemangabo@gmail.com');
      handleFirestoreError(error, 'write', isTeacher ? 'settings/general' : `sections/${selectedSection.id}`);
    }
  };

  const handleToggleFinalizeSubjectTerm = async (subjectId: string, term: TermNumber, finalize: boolean) => {
    if (!selectedSection) return;
    
    try {
      const subjectDocRef = doc(db, `sections/${selectedSection.id}/subjects`, subjectId);
      const subjectDoc = await getDoc(subjectDocRef);
      if (!subjectDoc.exists()) return;
      
      const currentFinalized = (subjectDoc.data() as Subject).finalizedTerms || [];
      let updatedFinalized: TermNumber[] = [];
      if (finalize) {
        if (!currentFinalized.includes(term)) {
          updatedFinalized = [...currentFinalized, term];
        } else {
          updatedFinalized = currentFinalized;
        }
      } else {
        updatedFinalized = currentFinalized.filter(t => t !== term);
      }
      
      await updateDoc(subjectDocRef, {
        finalizedTerms: updatedFinalized
      });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, 'write', `sections/${selectedSection.id}/subjects/${subjectId}`);
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingId(student.id);
    
    let parsedLastName = student.lastName || "";
    let parsedFirstName = student.firstName || "";
    if (!parsedLastName && !parsedFirstName && student.name) {
      if (student.name.includes(",")) {
        const parts = student.name.split(",");
        parsedLastName = parts[0].trim();
        parsedFirstName = parts.slice(1).join(",").trim();
      } else {
        parsedLastName = student.name.trim();
      }
    }

    setLearnerForm({
      lastName: parsedLastName,
      firstName: parsedFirstName,
      middleName: student.middleName || "",
      extension: student.extension || "",
      name: formatStudentName(student),
      lrn: student.lrn || "",
      email: student.email || "",
      photo: student.photo || "",
      age: student.age?.toString() || "",
      birthdate: student.birthdate || "",
      sex: student.sex || "Male",
      weight: student.weight?.toString() || "",
      height: student.height?.toString() || "",
      birthplace: student.birthplace || "",
      address: student.address || "",
      fatherName: student.fatherName || "",
      motherName: student.motherName || "",
      guardianName: student.guardianName || "",
      guardianRelationship: student.guardianRelationship || "",
      primaryContact: student.primaryContact || "guardian",
      contactNumber: student.contactNumber || "",
      dateOfFirstAttendance: student.dateOfFirstAttendance || "",
      attendance: student.attendance || {},
      nutritionalStatus: student.nutritionalStatus || {},
      isTransferredIn: student.isTransferredIn || false,
      siblingIds: student.siblingIds || [],
      enrolledSubjectIds: student.enrolledSubjectIds || [],
      eligibility: student.eligibility || { type: 'Elementary School Completer' } as Eligibility
    });
  };

  const handleMarkAllPresent = async (studentId: string, monthKey: string) => {
    if (!selectedSection) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const monthName = monthKey.includes('_') ? monthKey.split('_')[0] : monthKey;
    const calendarData = sectionSchoolCalendar.find(c => `${c.month}_${c.term || '1'}` === monthKey || c.month === monthKey);
    const year = parseInt(calendarData?.year || new Date().getFullYear().toString());

    // Get term coverage
    const openingDate = parseInt(calendarData?.openingDate || '1');
    const closingDate = parseInt(calendarData?.closingDate || '31');
    const daysInMonth = new Date(year, (MONTH_INDICES[monthName] || 0) + 1, 0).getDate();
    const hasManualCoverage = openingDate !== 1 || (closingDate !== 31 && closingDate !== daysInMonth);

    // Collect school days for the month
    const schoolDays: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, MONTH_INDICES[monthName], day);
        const dayOfWeek = date.getDay();
        const dateStr = `${(MONTH_INDICES[monthName] + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isLocalHoliday = calendarData?.localHolidays?.includes(day);
        const isHoliday = ['01-01', '04-09', '05-01', '06-12', '08-21', '08-25', '11-01', '11-30', '12-25', '12-30'].includes(dateStr) || isLocalHoliday;
        if (!isWeekend && !isHoliday) {
            schoolDays.push(day);
        }
    }

    let targetDays: number[] = [];
    if (hasManualCoverage) {
        targetDays = schoolDays.filter(day => day >= openingDate && day <= closingDate);
    } else {
        // Dynamic split fallback
        const allEntriesForMonth = sectionSchoolCalendar.filter(c => c.month === monthName)
            .sort((a, b) => (parseInt(a.term) || 1) - (parseInt(b.term) || 1));
        
        const currentTerm = parseInt(calendarData?.term || '1');
        let startIndex = 0;
        for (const entry of allEntriesForMonth) {
            if ((parseInt(entry.term) || 1) < currentTerm) {
                startIndex += parseInt(entry.days) || 0;
            } else {
                break;
            }
        }
        const daysToTake = parseInt(calendarData?.days) || schoolDays.length;
        targetDays = schoolDays.slice(startIndex, startIndex + daysToTake);
    }

    // Filter by FOA and Dropout Date
    if (student.dateOfFirstAttendance) {
      const [fYear, fMonth, fDay] = student.dateOfFirstAttendance.split('-').map(Number);
      const currentMonthIdx = MONTH_INDICES[monthName];
      targetDays = targetDays.filter(day => {
        if (year < fYear) return false;
        if (year === fYear) {
          if (currentMonthIdx < (fMonth - 1)) return false;
          if (currentMonthIdx === (fMonth - 1) && day < fDay) return false;
        }
        return true;
      });
    }

    if ((student.status === 'Dropped Out' || student.status === 'Transferred Out') && student.dropoutDate) {
      const [dYear, dMonth, dDay] = student.dropoutDate.split('-').map(Number);
      const currentMonthIdx = MONTH_INDICES[monthName];
      targetDays = targetDays.filter(day => {
        if (year > dYear) return false;
        if (year === dYear) {
          if (currentMonthIdx > (dMonth - 1)) return false;
          if (currentMonthIdx === (dMonth - 1) && day >= dDay) return false;
        }
        return true;
      });
    }

    const dailyAttendance = {
      ...(student.dailyAttendance || {}),
      [monthKey]: {
        ...(student.dailyAttendance?.[monthKey] || {})
      }
    };

    targetDays.forEach(day => {
        dailyAttendance[monthKey][day] = true;
    });

    // Calculate monthly present count
    const monthDaily = dailyAttendance[monthKey];
    let presentCount = 0;
    Object.values(monthDaily).forEach(val => { if (val) presentCount++; });

    const attendance = {
      ...(student.attendance || {}),
      [monthKey]: {
        present: presentCount,
        absent: Math.max(0, (calendarData?.days || 0) - presentCount)
      }
    };

    try {
      await setDoc(doc(db, `sections/${selectedSection.id}/students`, studentId), {
        dailyAttendance,
        attendance
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'update', `sections/${selectedSection.id}/students/${studentId}`);
    }
  };

  const handleUpdateDailyAttendance = async (studentId: string, monthKey: string, day: number, present: boolean) => {
    if (!selectedSection) return;
    
    // Find the student
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const dailyAttendance = {
      ...(student.dailyAttendance || {}),
      [monthKey]: {
        ...(student.dailyAttendance?.[monthKey] || {}),
        [day]: present
      }
    };

    // Calculate monthly present count
    const monthDaily = dailyAttendance[monthKey];
    let presentCount = 0;
    Object.values(monthDaily).forEach(val => { if (val) presentCount++; });

    const calendarForMonth = sectionSchoolCalendar.find(c => `${c.month}_${c.term || '1'}` === monthKey || c.month === monthKey)?.days || 0;
    const absentCount = Math.max(0, calendarForMonth - presentCount);

    const attendance = {
      ...(student.attendance || {}),
      [monthKey]: {
        present: presentCount,
        absent: absentCount
      }
    };

    try {
      await setDoc(doc(db, `sections/${selectedSection.id}/students`, studentId), {
        dailyAttendance,
        attendance
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'update', `sections/${selectedSection.id}/students/${studentId}`);
    }
  };

  const handleUpdateObservedValue = async (studentId: string, term: number, statementId: string, value: RatedValue) => {
    if (!selectedSection) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const observedValues = {
      ...(student.observedValues || {}),
      [term]: {
        ...(student.observedValues?.[term] || {}),
        [statementId]: value
      }
    };

    try {
      await setDoc(doc(db, `sections/${selectedSection.id}/students`, studentId), {
        observedValues
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'update', `sections/${selectedSection.id}/students/${studentId}`);
    }
  };

  const handleUpdateAttendance = (month: string, field: 'present' | 'absent', value: number) => {
    setLearnerForm(prev => {
      const calendarForMonth = schoolCalendar.find(c => c.month === month)?.days || 0;
      const newPresent = field === 'present' ? value : (prev.attendance?.[month]?.present || 0);
      
      // Auto-calculate absent based on school days
      const newAbsent = calendarForMonth - newPresent;

      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [month]: {
            present: newPresent,
            absent: Math.max(0, newAbsent)
          }
        }
      };
    });
  };

  const handleTogglePublishGrades = async (studentId: string, term: number, val: boolean) => {
    if (!selectedSection) return;
    try {
      const updates: any = { 
        [`publishGrades.${term}`]: val,
        [`parentSignatureEnabled.${term}`]: val
      };
      await updateDoc(doc(db, `sections/${selectedSection.id}/students`, studentId), updates);
    } catch (e) {
      handleFirestoreError(e, 'update', `sections/${selectedSection.id}/students/${studentId}`);
    }
  };

  const handleToggleParentSignature = async (studentId: string, term: number, val: boolean) => {
    if (!selectedSection) return;
    try {
      await updateDoc(doc(db, `sections/${selectedSection.id}/students`, studentId), { [`parentSignatureEnabled.${term}`]: val });
    } catch (e) {
      handleFirestoreError(e, 'update', `sections/${selectedSection.id}/students/${studentId}`);
    }
  };

  const handleDeleteLearner = async (studentId: string) => {
    if (!selectedSection) return;
    try {
      await deleteDoc(doc(db, `sections/${selectedSection.id}/students`, studentId));
    } catch (error) {
      handleFirestoreError(error, 'delete', `sections/${selectedSection.id}/students/${studentId}`);
    }
  };

  const handleDeleteManyLearners = async (studentIds: string[]) => {
    if (!selectedSection) return;
    const batch = writeBatch(db);
    try {
      studentIds.forEach(id => {
        batch.delete(doc(db, `sections/${selectedSection.id}/students`, id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `sections/${selectedSection.id}/students`);
    }
  };

  const handleBulkEnroll = async (studentsList: any[]) => {
    if (!selectedSection) return;

    // Check for duplicates
    const existingLrns = new Set(students.map(s => s.lrn).filter(Boolean));
    const uniqueNewStudents = studentsList.filter(learner => {
      if (!learner.lrn) return true; // Allow if no LRN (though template says it has)
      return !existingLrns.has(learner.lrn);
    });

    if (uniqueNewStudents.length === 0) {
      alert("All learners in the list already exist in this section (based on LRN).");
      return;
    }

    if (uniqueNewStudents.length < studentsList.length) {
      alert(`${studentsList.length - uniqueNewStudents.length} learners were skipped because their LRN already exists in this section.`);
    }
    
    // Firestore batches have a 500 operation limit
    const CHUNK_SIZE = 450;
    
    const processBatch = async (chunk: any[]) => {
      const batch = writeBatch(db);
      chunk.forEach(learner => {
        const docRef = doc(collection(db, `sections/${selectedSection.id}/students`));
        batch.set(docRef, {
          sectionId: selectedSection.id,
          name: learner.name,
          lastName: learner.lastName || "",
          firstName: learner.firstName || "",
          middleName: learner.middleName || "",
          extension: learner.extension || "",
          studentNumber: learner.lrn || Date.now().toString(),
          lrn: learner.lrn,
          email: learner.email || "",
          age: parseInt(learner.age) || 0,
          birthdate: learner.birthdate || "",
          sex: learner.sex,
          weight: learner.weight || 0,
          height: learner.height || 0,
          bmi: learner.bmi || 0,
          nutritionalStatus: learner.nutritionalStatus || {},
          dateOfFirstAttendance: learner.dateOfFirstAttendance || "",
          isTransferredIn: learner.isTransferredIn || false,
          birthplace: learner.birthplace || "",
          address: learner.address || "",
          primaryContact: learner.primaryContact || "father",
          fatherName: learner.fatherName || "",
          motherName: learner.motherName || "",
          guardianName: learner.guardianName || "",
          guardianRelationship: learner.guardianRelationship || "",
          contactNumber: learner.contactNumber || "",
          eligibility: learner.eligibility || {},
          grades: {},
          enrolledSubjectIds: subjects.filter(s => {
            const isTle = isTleSubject(s.name);
            const isJHS = Number(selectedSection?.gradeLevel) === 9 || Number(selectedSection?.gradeLevel) === 10;
            if (isJHS && isTle) return false;
            return true;
          }).map(s => s.id),
          gradeLevel: learner.gradeLevel || selectedSection.gradeLevel || "",
          sectionName: learner.section || selectedSection.name || ""
        });
      });
      await batch.commit();
    };

    try {
      for (let i = 0; i < uniqueNewStudents.length; i += CHUNK_SIZE) {
        const chunk = uniqueNewStudents.slice(i, i + CHUNK_SIZE);
        await processBatch(chunk);
      }
    } catch (error) {
      handleFirestoreError(error, 'write', `sections/${selectedSection.id}/students`);
    }
  };

  const sectionSchoolCalendar = useMemo(() => {
    if (!selectedSection?.schoolYear) return schoolCalendar;
    return schoolCalendar.filter(c => c.schoolYear === selectedSection.schoolYear);
  }, [schoolCalendar, selectedSection?.schoolYear]);

  const studentPortalSchoolCalendar = useMemo(() => {
    if (!studentViewMatched?.section?.schoolYear) return schoolCalendar;
    return schoolCalendar.filter(c => c.schoolYear === studentViewMatched.section.schoolYear);
  }, [schoolCalendar, studentViewMatched?.section?.schoolYear]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.status !== 'Dropped Out' && s.status !== 'Transferred Out' &&
      s.enrolledSubjectIds && s.enrolledSubjectIds.length > 0 &&
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       s.lrn?.includes(searchTerm))
    );
  }, [students, searchTerm]);

  const enrolledStudents = useMemo(() => {
    return students.filter(s => s.status !== 'Dropped Out' && s.status !== 'Transferred Out' && s.enrolledSubjectIds && s.enrolledSubjectIds.length > 0);
  }, [students]);

  const unenrolledStudents = useMemo(() => {
    return students.filter(s => 
      s.status !== 'Dropped Out' && s.status !== 'Transferred Out' &&
      (!s.enrolledSubjectIds || s.enrolledSubjectIds.length === 0)
    );
  }, [students]);

        const globalScannerModal = (
    <>
      {/* Render Global Scanner if open */}
        <AnimatePresence>
          {showGlobalScanner && (
            <div className={`fixed inset-0 z-[150] ${isScannerFullScreen ? 'p-0 bg-white' : 'p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center'}`}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
                  isScannerFullScreen 
                    ? 'w-screen h-screen rounded-none border-0' 
                    : 'rounded-2xl sm:rounded-3xl w-full max-w-[95vw] lg:max-w-6xl xl:max-w-7xl h-auto max-h-[98vh] animate-in zoom-in-95'
                }`}
              >
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 tracking-tight text-sm sm:text-base">Scan ID Card</h3>
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Attendance & Learner Validity (Full Screen Window)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsScannerFullScreen(!isScannerFullScreen)}
                      className="p-2 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 text-xs font-extrabold shadow-xs cursor-pointer"
                      title={isScannerFullScreen ? "Exit Fullscreen Window" : "Expand to Fullscreen"}
                    >
                      {isScannerFullScreen ? (
                        <>
                          <Minimize2 size={16} className="text-slate-700" />
                          <span className="hidden sm:inline">Exit Fullscreen</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 size={16} className="text-slate-700" />
                          <span className="hidden sm:inline">Full Screen</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        setShowGlobalScanner(false);
                        setGlobalRecentScan(null);
                      }}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Close Scanner"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* View Mode Tab Switcher */}
                <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setScannerViewMode('scanner')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${scannerViewMode === 'scanner' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'}`}
                  >
                    <span>ðŸ“· Camera Scanner & Verify</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScannerViewMode('all_logs')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${scannerViewMode === 'all_logs' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'}`}
                  >
                    <span>ðŸ“‹ All Scanned QR IDs ({scanLogs.length})</span>
                  </button>
                </div>

                {scannerViewMode === 'all_logs' ? (
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-black">
                          {scanLogs.length}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">All Scanned QR IDs & Attendance Logs</h4>
                          <p className="text-xs text-slate-500">Real-time scan logs across all sections and students</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input 
                          type="text"
                          placeholder="Search student name, LRN, or section..."
                          value={allLogsSearchQuery}
                          onChange={(e) => setAllLogsSearchQuery(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm text-black placeholder:text-slate-400 w-full sm:w-64"
                        />
                        {scanLogs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to clear all scan logs?")) {
                                handleClearScanLogs();
                              }
                            }}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-extrabold transition-colors cursor-pointer border border-rose-200 shrink-0"
                          >
                            Clear All Logs
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex-1">
                      {scanLogs.filter(log => {
                        if (!allLogsSearchQuery) return true;
                        const q = allLogsSearchQuery.toLowerCase();
                        return (
                          log.studentName?.toLowerCase().includes(q) ||
                          log.lrn?.toLowerCase().includes(q) ||
                          log.sectionName?.toLowerCase().includes(q) ||
                          log.scanDate?.toLowerCase().includes(q)
                        );
                      }).length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-3">
                            <QrCode size={24} />
                          </div>
                          <p className="text-sm font-bold text-slate-700">No scan logs found</p>
                          <p className="text-xs text-slate-400 mt-1">Scan student ID QR codes or type an LRN to start recording attendance.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                <th className="p-3.5">Student / LRN</th>
                                <th className="p-3.5">Section</th>
                                <th className="p-3.5">Scan Type</th>
                                <th className="p-3.5">Date & Time</th>
                                <th className="p-3.5">Scanned By</th>
                                <th className="p-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                              {scanLogs.filter(log => {
                                if (!allLogsSearchQuery) return true;
                                const q = allLogsSearchQuery.toLowerCase();
                                return (
                                  log.studentName?.toLowerCase().includes(q) ||
                                  log.lrn?.toLowerCase().includes(q) ||
                                  log.sectionName?.toLowerCase().includes(q) ||
                                  log.scanDate?.toLowerCase().includes(q)
                                );
                              }).map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3.5">
                                    <p className="font-extrabold text-slate-900">{log.studentName}</p>
                                    <p className="text-[11px] text-slate-500 font-mono">LRN: {log.lrn}</p>
                                  </td>
                                  <td className="p-3.5">
                                    <p className="font-bold uppercase text-slate-800">
                                      {Number(log.gradeLevel) === 0 ? `Kindergarten â€¢ ${log.sectionName}` : `Grade ${log.gradeLevel} â€¢ ${log.sectionName}`}
                                    </p>
                                    <p className="text-[10px] text-slate-400">SY: {log.schoolYear}</p>
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                      log.scanType === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {log.scanType || 'IN'}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <p className="font-bold text-slate-800">{log.scanDate}</p>
                                    <p className="text-[10px] text-slate-500">{log.scanTime}</p>
                                  </td>
                                  <td className="p-3.5 text-slate-500 text-[11px]">
                                    {log.scannedBy || 'ID Scanner'}
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteScanLog(log.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Log"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1 overflow-y-auto lg:overflow-hidden">
                  {/* Left Part: Scanner Controls & Camera */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-start border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-8">
                    {/* Camera Selection */}
                    <div className="flex justify-center gap-2 w-full max-w-sm sm:max-w-md mx-auto mb-4">
                      <button
                        type="button"
                        onClick={() => setGlobalScannerFacingMode('environment')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${globalScannerFacingMode === 'environment' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Camera size={14} />
                        <span>Back Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGlobalScannerFacingMode('user')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${globalScannerFacingMode === 'user' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <User size={14} />
                        <span>Front Camera</span>
                      </button>
                    </div>

                    {/* Scanner Camera Frame */}
                    <div className="w-full max-w-sm sm:max-w-md aspect-square rounded-2xl overflow-hidden bg-black shadow-inner border-4 border-slate-100 relative shrink-0 mx-auto">
                      <Scanner
                        onScan={handleGlobalScannerScan}
                        onError={handleGlobalScannerError}
                        constraints={globalScannerConstraints}
                        components={globalScannerComponents}
                        allowMultiple={true}
                        scanDelay={2500}
                      />

                      {globalScannerError && (
                        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in duration-200">
                          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mb-2">
                            <AlertTriangle size={24} />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">Camera Access Issue</p>
                          <p className="text-xs text-slate-300 leading-normal max-w-[280px] mb-3">{globalScannerError}</p>
                          <div className="bg-white/10 p-3 rounded-lg text-[10px] text-slate-300 text-left max-w-sm border border-white/5 space-y-1">
                            <p className="font-bold text-indigo-300">ðŸ’¡ Troubleshooting Guide:</p>
                            <p>1. Check if another application is using your camera.</p>
                            <p>2. Click the camera or lock icon in your browser's address bar, choose <b>"Allow"</b>, and refresh.</p>
                            <p>3. If you're on mobile, verify camera permissions are enabled in system settings.</p>
                            <p className="pt-1 border-t border-white/10 text-indigo-200 font-semibold"><b>Backup Option:</b> Use the <b>Manual Entry</b> section below!</p>
                          </div>
                        </div>
                      )}

                      {/* Scanner overlay corners */}
                      <div className="absolute top-6 left-6 w-10 h-10 border-t-4 border-l-4 border-white/70 rounded-tl-xl"></div>
                      <div className="absolute top-6 right-6 w-10 h-10 border-t-4 border-r-4 border-white/70 rounded-tr-xl"></div>
                      <div className="absolute bottom-6 left-6 w-10 h-10 border-b-4 border-l-4 border-white/70 rounded-bl-xl"></div>
                      <div className="absolute bottom-6 right-6 w-10 h-10 border-b-4 border-r-4 border-white/70 rounded-br-xl"></div>
                    </div>

                    {/* Manual Entry Fallback Panel */}
                    <div className="w-full max-w-sm sm:max-w-md mx-auto mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <Users size={14} />
                        </span>
                        <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                          Manual Keyboard & Barcode Entry
                        </h5>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-3 leading-normal">
                        Type a student LRN or scan with a hardware barcode scanner to verify status and record attendance automatically.
                      </p>
                      
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Type Student LRN..."
                          value={globalManualLrnInput}
                          onChange={(e) => setGlobalManualLrnInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (globalManualLrnInput.trim()) {
                                handleGlobalScan(globalManualLrnInput.trim());
                                setGlobalManualLrnInput('');
                              }
                            }
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm text-black placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (globalManualLrnInput.trim()) {
                              handleGlobalScan(globalManualLrnInput.trim());
                              setGlobalManualLrnInput('');
                            }
                          }}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer transition-colors shadow-sm"
                        >
                          Submit
                        </button>
                      </div>

                      <div className="relative mt-2">
                        <select
                          value=""
                          onChange={(e) => {
                            const lrn = e.target.value;
                            if (lrn) {
                              handleGlobalScan(lrn);
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 10px center',
                            backgroundSize: '14px',
                            paddingRight: '30px'
                          }}
                        >
                          <option value="">-- Or Select Student from Enrolled List --</option>
                          {enrolledStudents.map(s => (
                            <option key={s.id} value={s.lrn}>
                              {formatStudentName(s)} ({s.lrn})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Right Part: Learner Info and Validity check */}
                  <div className="lg:col-span-7 w-full flex flex-col justify-start pl-0 lg:pl-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Scan Status & Learner Info</h4>
                    {globalRecentScan ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {/* Scan Status Banner */}
                        <div className={`p-4 rounded-xl flex items-center gap-3 border ${globalRecentScan.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                          {globalRecentScan.status === 'success' ? (
                            <CheckCircle size={24} className="text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle size={24} className="text-rose-600 shrink-0" />
                          )}
                          <span className="text-xs font-bold leading-relaxed">{globalRecentScan.message}</span>
                        </div>

                        {/* Learner Info Card (scanning validity of the learner information) */}
                        {globalRecentScan.student && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm text-left">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/40 rounded-full blur-2xl pointer-events-none"></div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start relative z-10 text-center sm:text-left">
                              {/* Student Profile Picture or Placeholder */}
                              {globalRecentScan.student.photo ? (
                                <img
                                  src={globalRecentScan.student.photo}
                                  alt={formatStudentName(globalRecentScan.student)}
                                  className="w-32 h-32 rounded-3xl object-cover border border-slate-200 shadow-sm"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className={`w-32 h-32 rounded-3xl flex items-center justify-center font-black text-5xl text-white shadow-sm ${globalRecentScan.student.sex === 'Female' ? 'bg-rose-500 shadow-rose-100' : 'bg-indigo-500 shadow-indigo-100'}`}>
                                  {formatStudentName(globalRecentScan.student).charAt(0)}
                                </div>
                              )}

                              <div className="space-y-1.5 min-w-0 flex-1">
                                {/* Status Badge */}
                                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                  {globalRecentScan.scanType && (
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                      globalRecentScan.scanType === 'IN' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-amber-600 text-white shadow-xs'
                                    }`}>
                                      LOGGED TIME {globalRecentScan.scanType}
                                    </span>
                                  )}
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    globalRecentScan.student.status === 'Dropped Out' 
                                      ? 'bg-orange-50 border-orange-200 text-orange-600'
                                      : globalRecentScan.student.status === 'Transferred Out'
                                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                  }`}>
                                    {globalRecentScan.student.status || 'Active / Enrolled'}
                                  </span>
                                  {globalRecentScan.student.sex && (
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                      globalRecentScan.student.sex === 'Female' ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-blue-50 border-blue-200 text-blue-600'
                                    }`}>
                                      {globalRecentScan.student.sex}
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-base font-black text-slate-800 tracking-tight truncate">
                                  {formatStudentName(globalRecentScan.student)}
                                </h4>
                                
                                <p className="text-xs font-bold text-slate-500">
                                  LRN: <span className="text-slate-800 font-mono font-bold">{globalRecentScan.student.lrn}</span>
                                </p>
                              </div>
                            </div>

                            {/* Secondary Fields Grid */}
                            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200/60 text-xs relative z-10">
                              <div>
                                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Grade & Section</p>
                                <p className="text-slate-700 font-bold uppercase mt-1">
                                  {(() => {
                                    const activeSec = globalRecentScan?.section || selectedSection;
                                    if (!activeSec) return 'Unknown Section';
                                    return (Number(activeSec.gradeLevel) === 0) ? `Kindergarten â€¢ ${activeSec.name}` : `Grade ${activeSec.gradeLevel} â€¢ ${activeSec.name}`;
                                  })()}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Contact Number</p>
                                <p className="text-slate-700 font-bold mt-1">{globalRecentScan.student.contactNumber || 'No registered contact'}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">First Attendance</p>
                                <p className="text-slate-700 font-bold mt-1">{globalRecentScan.student.dateOfFirstAttendance || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Guardian Name</p>
                                <p className="text-slate-700 font-bold mt-1 truncate">{globalRecentScan.student.guardianName || 'None'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center flex flex-col items-center justify-center h-full min-h-[280px]">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3 animate-pulse">
                          <QrCode size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700">Waiting for scan...</p>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Position Student ID QR inside the camera view
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </>
  );


  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <BookOpen size={48} className="text-indigo-500 animate-pulse" />
          <p className="text-white/40 text-xs font-black uppercase tracking-[0.3em]">Syncing System...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} isLoading={isLoggingIn} loginError={loginError} onDemoLogin={handleDemoLogin} />;
  }

  if (isCompletingProfile) {
    return <RoleSelectionView user={currentUser} onComplete={(profile) => {
       setUserProfile(profile);
       setIsCompletingProfile(false);
    }} />;
  }

  const isExpired = activeSchool?.expiresAt ? new Date(activeSchool.expiresAt) < new Date() : false;

  if (userProfile && (userProfile.approvalStatus !== 'approved') && userProfile.email !== 'jessiemangabo@gmail.com') {
    return <PendingApprovalView 
      onLogout={handleLogout} 
      isExpired={false} 
      isRejected={userProfile.approvalStatus === 'rejected'}
      noAdminFound={noApprovedAdminFound}
      userRole={userProfile.role} 
    />;
  }

  if (userProfile?.role === 'student') {
    if (studentViewMatched) {
       return <StudentPortal 
         onOpenThemeModal={() => setIsThemeModalOpen(true)}
         student={studentViewMatched.student} 
         section={studentViewMatched.section}
         subjects={subjects}
         onLogout={handleLogout}
         schoolCalendar={studentPortalSchoolCalendar}
         allEnrollments={allStudentEnrollments}
         onSwitchEnrollment={(e) => {
           setStudentViewMatched(e);
           setSelectedSection(e.section);
         }}
         onShowFeedback={() => setShowFeedbackModal(true)}
         isFeedbackOpen={showFeedbackModal}
         onCloseFeedback={() => setShowFeedbackModal(false)}
         user={userProfile}
         currentUser={currentUser}
         sections={sections}
         students={students}
       />;
    } else {
       return <StudentLinkingView userProfile={userProfile} onLinked={(id, type) => { findStudentEnrollments([{ val: id, type }]); }} onLogout={handleLogout} />;
    }
  }

  if (showAdminUsers && (userProfile?.role === 'admin' || userProfile?.role === 'system_admin' || isAnySectionAdviser)) {
    return <AdminUsersView 
      onBack={() => setShowAdminUsers(false)} 
      currentUser={userProfile!} 
      isAnySectionAdviser={isAnySectionAdviser}
      schoolCalendar={schoolCalendar}
      globalSettings={globalSettings}
      onShowFeedback={() => setShowFeedbackModal(true)}
      isFeedbackOpen={showFeedbackModal}
      onCloseFeedback={() => setShowFeedbackModal(false)}
      sections={sections}
    />;
  }

  if (showAdminSF4 && (userProfile?.role === 'system_admin' || userProfile?.role === 'school_head')) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAdminSF4(false)}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                <FileText className="text-amber-600" size={24} />
                School Form 4 (SF4)
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Monthly Learner Movement and Attendance Report</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <SF4ReportView 
             schoolId={userProfile.schoolId || ""}
             calendar={schoolCalendar}
             globalSettings={globalSettings}
          />
        </div>
      </div>
    );
  }

  if (showAdminSF7 && (userProfile?.role === 'system_admin' || userProfile?.role === 'admin')) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAdminSF7(false)}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                <FileText className="text-indigo-600" size={24} />
                School Form 7 (SF7)
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">School Staff Assignment and List of Personnel</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto animate-fade-in">
          <SF7ReportView 
             schoolId={userProfile?.schoolId || ""}
             activeSchoolYear={globalSettings?.activeSchoolYear || "2026-2027"}
             userProfile={userProfile}
          />
        </div>
      </div>
    );
  }

  if (showAdminPTA && (userProfile?.role === 'system_admin' || userProfile?.role === 'school_head' || isAuthorizedCashier)) {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowAdminPTA(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <CreditCard className="text-emerald-600" size={20} />
                School Financial Statement
              </h1>
              <p className="text-xs font-bold text-slate-500">PTA Fees & Contributions (School Year Wide)</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <PTAFeesManagementView
            currentUser={currentUser}
            userProfile={userProfile}
            selectedSection={null}
            sections={sections}
            initialTab={ptaInitialTab}
          />
        </div>
      </div>
    );
  }

  if (showAdminStudentList && (userProfile?.role === 'admin' || userProfile?.role === 'system_admin')) {
    return <AdminStudentListView 
      onBack={() => setShowAdminStudentList(false)}
      sections={sections}
      onNavigateToSection={(sectionId) => {
        const sec = sections.find(s => s.id === sectionId);
        if (sec) {
          setSelectedSection(sec);
          setShowAdminStudentList(false);
          setActiveTab(userProfile?.role === 'school_head' ? 'sf8' : userProfile?.role === 'guidance_designate' ? 'anecdotes' : 'dashboard');
        }
      }}
      onViewAnecdotals={async (studentLrn, sectionId) => {
        const sec = sections.find(s => s.id === sectionId);
        if (sec) {
          setSelectedSection(sec);
          setShowAdminStudentList(false);
          setActiveTab('anecdotes');
          
          try {
            const tempSnap = await getDocs(collection(db, 'sections', sectionId, 'students'));
            const foundStudent = tempSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)).find(s => s.lrn === studentLrn);
            if (foundStudent) {
              setPreselectedStudentForAnecdotal(foundStudent);
            }
          } catch (e) {
            console.error("Failed to preload target student:", e);
          }
        }
      }}
    />;
  }

  if (showAdminSchools && (userProfile?.role === 'admin' || userProfile?.role === 'system_admin')) {
    return <AdminSchoolsView 
      onBack={() => setShowAdminSchools(false)} 
      currentUser={userProfile} 
      globalSettings={globalSettings}
      onShowFeedback={() => setShowFeedbackModal(true)}
      isFeedbackOpen={showFeedbackModal}
      onCloseFeedback={() => setShowFeedbackModal(false)}
      sections={sections}
    />;
  }

  if (showAdminSchoolYear && (userProfile?.role === 'admin')) {
    return <AdminSchoolYearView 
      onBack={() => setShowAdminSchoolYear(false)} 
      currentUser={userProfile} 
      onShowFeedback={() => setShowFeedbackModal(true)}
      isFeedbackOpen={showFeedbackModal}
      onCloseFeedback={() => setShowFeedbackModal(false)}
    />;
  }

  if (showAdminSchoolCalendar && (userProfile?.role === 'admin')) {
    return <AdminSchoolCalendarView 
      onBack={() => setShowAdminSchoolCalendar(false)} 
      onShowFeedback={() => setShowFeedbackModal(true)}
      isFeedbackOpen={showFeedbackModal}
      onCloseFeedback={() => setShowFeedbackModal(false)}
    />;
  }

  if (showAdminFeedback && userProfile?.role === 'admin') {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAdminFeedback(false)}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                <Sparkles className="text-indigo-600" size={24} />
                Beta Feedback Center
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Summary & Insights for Administrators</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <AdminFeedbackDashboard />
        </div>
      </div>
    );
  }

  const handleAddSubjectGlobal = async (s: Omit<Subject, 'id'>) => {
    if (s.gradeLevel === undefined || s.gradeLevel === null) {
      alert("Target Grade Level is missing.");
      return;
    }
    const grade = parseInt(String(s.gradeLevel));
    if (isNaN(grade) || grade < 0 || grade > 12) {
      alert("Subjects in the Global Subjects Directory can only be added for Kindergarten (0) to Grade 12.");
      return;
    }
    
    // Clean undefined fields to prevent Firestore errors
    const cleanS = { ...s } as any;
    Object.keys(cleanS).forEach(key => {
      if (cleanS[key] === undefined) {
        delete cleanS[key];
      }
    });
    
    try {
      const docRef = await addDoc(collection(db, `global_subjects`), {
        ...cleanS,
        teacherEmail: s.teacherEmail ? s.teacherEmail.trim().toLowerCase() : ""
      });

      if (grade >= 0 && grade <= 10) {
        const relevantSections = sections.filter(sec => parseInt(String(sec.gradeLevel)) === grade);
        for (const sec of relevantSections) {
          await addDoc(collection(db, `sections/${sec.id}/subjects`), {
            ...cleanS,
            sectionId: sec.id,
            schoolId: sec.schoolId || userProfile?.schoolId || "",
            teacherEmail: s.teacherEmail ? s.teacherEmail.trim().toLowerCase() : ""
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, 'create', `global_subjects`);
    }
  };

  const handleEditSubjectGlobal = async (id: string, s: Omit<Subject, 'id'>) => {
    try {
      const updateData: any = {
        group: s.group,
        name: s.name,
        gradeLevel: s.gradeLevel,
        subjectType: s.subjectType,
        wwWeight: s.wwWeight,
        ptWeight: s.ptWeight,
        taWeight: s.taWeight,
        offeredTerms: s.offeredTerms || [1],
        unit: s.unit !== undefined ? s.unit : null,
      };
      if (s.order !== undefined) {
        updateData.order = s.order;
      }
      if (s.teacherEmail) {
        updateData.teacherEmail = s.teacherEmail.trim().toLowerCase();
      }
      await updateDoc(doc(db, `global_subjects`, id), updateData);
    } catch (error) {
      handleFirestoreError(error, 'update', `global_subjects`);
    }
  };

  const handleDeleteSubjectGlobal = async (id: string) => {
    try {
      await deleteDoc(doc(db, `global_subjects`, id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `global_subjects`);
    }
  };

  if (!selectedSection) {


  if (activeTab === 'subjects') {
      return (
        <div className="flex-1 bg-slate-50 min-h-screen">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-[50] shadow-sm">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen size={24} className="text-indigo-600" />
              Global Subjects Directory
            </h1>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold px-4 py-2 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
            >
              Back to Dashboard
            </button>
          </div>
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
               <div className="bg-amber-50 text-amber-800 px-5 py-4 rounded-xl mb-6 text-sm font-medium border border-amber-200/50 flex flex-col gap-1">
                 <p className="font-bold">Global Curriculum View</p>
                 <p className="opacity-90">You are viewing the global subject curriculum for all grade levels. Changes made here will affect the available subjects for student enrollment across the curriculum.</p>
               </div>
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <SubjectsView 
                    subjects={globalSubjects}
                    onAddSubject={handleAddSubjectGlobal}
                    onEditSubject={handleEditSubjectGlobal}
                    onDeleteSubject={handleDeleteSubjectGlobal}
                    selectedSection={null}
                    currentUser={userProfile}
                    globalSettings={globalSettings}
                    allSections={sections}
                 />
               </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'tle-dashboard') {
      return (
        <TleDashboardView 
          sections={sections}
          subjects={subjects}
          currentUser={userProfile}
          onBack={() => setActiveTab('dashboard')}
        />
      );
    }

    if (activeTab === 'aral') {
      return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
          <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-50">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="p-3 bg-slate-50 hover:bg-slate-100 text-[#002060] rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                  <GraduationCap className="text-indigo-600" size={24} />
                  ARAL Program Module
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Academic Remediation and Achievement Learning</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold px-4 py-2 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer"
            >
              Back to Sections
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            <div className="max-w-[1600px] mx-auto">
               <AralProgram 
                 enrolledStudents={enrolledStudents}
                 selectedSection={null}
                 sections={sections}
                 userProfile={userProfile}
                 globalSettings={globalSettings}
                 aralSchoolInfo={aralSchoolInfo}
                 onUpdateAralSchool={handleUpdateAralSchool}
                 aralCompetencies={aralCompetencies}
                 onAddAralCompetency={handleAddAralCompetency}
                 onDeleteAralCompetency={handleDeleteAralCompetency}
                 aralClasses={aralClasses}
                 onCreateAralClass={handleCreateAralClass}
                 onUpdateAralClass={handleUpdateAralClass}
                 onDeleteAralClass={handleDeleteAralClass}
                 selectedAralClassId={selectedAralClassId}
                 onSelectAralClassId={setSelectedAralClassId}
               />
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <SectionsView onOpenThemeModal={() => setIsThemeModalOpen(true)} onCreateAralClass={handleCreateAralClass} onUpdateAralClass={handleUpdateAralClass} onDeleteAralClass={handleDeleteAralClass} aralClasses={aralClasses} 
          selectedAralClassId={selectedAralClassId}
          onSelectAralClassId={setSelectedAralClassId}
          onScanID={openGlobalScanner}
          sections={sections} 
          expiredSchoolIds={expiredSchoolIds}
          globalSettings={globalSettings}
          onSelect={(s) => {
             setSelectedSection(s);
             setActiveTab(userProfile?.role === 'school_head' ? 'sf8' : userProfile?.role === 'guidance_designate' ? 'anecdotes' : 'dashboard');
          }} 
          onSelectSubject={setSelectedSubjectId}
          onSetActiveTab={setActiveTab}
          onNavigateToSubject={(section, subjName) => {
             setSelectedSection(section);
             setActiveTab('gradebook');
             let subjectObj = subjects.find(s => s.name === subjName && s.sectionId === section.id);
             if (!subjectObj) {
                subjectObj = subjects.find(s => getTleDisplayName(s.name) === subjName && s.sectionId === section.id);
             }
             setSelectedSubjectId(subjectObj ? subjectObj.id : subjName);
          }}
          subjects={subjects}
          globalSubjects={globalSubjects}
          onCreate={handleCreateSection}
          onUpdate={handleUpdateSection}
          onDelete={handleDeleteSection}
          user={userProfile}
          onUpdateUser={setUserProfile}
          onLogout={handleLogout}
          onManageUsers={() => setShowAdminUsers(true)}
          onManageStudentList={() => setShowAdminStudentList(true)}
          onShowFinancialStatement={() => {
            setShowAdminPTA(true);
          }}
          onShowSF4={() => setShowAdminSF4(true)}
          onShowSF7={() => setShowAdminSF7(true)}
          pendingUsersCount={pendingUsersCount}
          isAnySectionAdviser={isAnySectionAdviser}
          onManageSchools={() => setShowAdminSchools(true)}
          onManageSchoolYears={() => setShowAdminSchoolYear(true)}
          onManageCalendar={() => setShowAdminSchoolCalendar(true)}
          onShowFeedback={() => setShowFeedbackModal(true)}
          isFeedbackOpen={showFeedbackModal}
          onCloseFeedback={() => setShowFeedbackModal(false)}
          onShowFeedbackDashboard={() => setShowAdminFeedback(true)}
          schoolCalendar={schoolCalendar}
          onToggleFinalizeSubjectTerm={handleToggleFinalizeSubjectTerm}
          activeSchool={activeSchool}
          teacherCount={teacherCount}
          onRenew={handleRenewSubscription}
          aralSchoolInfo={aralSchoolInfo}
          onUpdateAralSchool={handleUpdateAralSchool}
          aralCompetencies={aralCompetencies}
          onAddAralCompetency={handleAddAralCompetency}
          onDeleteAralCompetency={handleDeleteAralCompetency}
          mapUserRoleToAralRole={mapUserRoleToAralRole}
        />

        {globalScannerModal}

        <ThemeCustomizerModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          settings={systemThemeSettings}
          onUpdateSettings={handleUpdateThemeSettings}
          onResetSettings={() => handleUpdateThemeSettings(DEFAULT_THEME_SETTINGS)}
        />
      </>
    );
  }

  const handleAddSubject = async (s: Omit<Subject, 'id'>) => {
    if (!selectedSection) return;
    const adviserEmail = (selectedSection.adviserEmail || "").trim().toLowerCase();
    const authEmail = (currentUser?.email || "").trim().toLowerCase();
    const profEmail = (userProfile?.email || "").trim().toLowerCase();
    const isSectionAdviser = adviserEmail && (adviserEmail === authEmail || adviserEmail === profEmail);
    const isAdmin = userProfile?.role === 'system_admin' || userProfile?.role === 'admin';

    if (!isAdmin && !isSectionAdviser) {
      alert("Only Administrators and Section Advisers can modify subjects for this section.");
      return;
    }
    
    // Clean undefined fields to prevent Firestore errors
    const cleanS = { ...s } as any;
    Object.keys(cleanS).forEach(key => {
      if (cleanS[key] === undefined) {
        delete cleanS[key];
      }
    });

    try {
      await addDoc(collection(db, `sections/${selectedSection.id}/subjects`), {
        ...cleanS,
        sectionId: selectedSection.id,
        schoolId: selectedSection.schoolId || userProfile?.schoolId || "",
        teacherEmail: s.teacherEmail ? s.teacherEmail.trim().toLowerCase() : ""
      });
    } catch (error) {
      handleFirestoreError(error, 'create', `sections/${selectedSection.id}/subjects`);
    }
  };

  const handleEditSubject = async (id: string, s: Omit<Subject, 'id'>) => {
    if (!selectedSection) return;
    const adviserEmail = (selectedSection.adviserEmail || "").trim().toLowerCase();
    const authEmail = (currentUser?.email || "").trim().toLowerCase();
    const profEmail = (userProfile?.email || "").trim().toLowerCase();
    const isSectionAdviser = adviserEmail && (adviserEmail === authEmail || adviserEmail === profEmail);
    const isAdmin = userProfile?.role === 'system_admin' || userProfile?.role === 'admin';

    // Allow the assigned Subject Teacher to edit weights and details of their own subject
    const existingSubject = subjects.find(sub => sub.id === id);
    const existingTeacher = existingSubject?.teacherEmail || selectedSection.subjectTeachers?.[id] || "";
    const isAssignedTeacher = existingTeacher && (existingTeacher.trim().toLowerCase() === authEmail || existingTeacher.trim().toLowerCase() === profEmail);

    if (!isAdmin && !isSectionAdviser && !isAssignedTeacher) {
      alert("Only Administrators, Section Advisers, and the assigned Subject Teacher can modify subjects for this section.");
      return;
    }
    
    // Clean undefined fields to prevent Firestore errors
    const cleanS = { ...s } as any;
    Object.keys(cleanS).forEach(key => {
      if (cleanS[key] === undefined) {
        delete cleanS[key];
      }
    });

    try {
      await setDoc(doc(db, `sections/${selectedSection.id}/subjects`, id), {
        ...cleanS,
        schoolId: selectedSection.schoolId || userProfile?.schoolId || "",
        teacherEmail: s.teacherEmail ? s.teacherEmail.trim().toLowerCase() : ""
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'update', `sections/${selectedSection.id}/subjects/${id}`);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!selectedSection) return;
    const adviserEmail = (selectedSection.adviserEmail || "").trim().toLowerCase();
    const authEmail = (currentUser?.email || "").trim().toLowerCase();
    const profEmail = (userProfile?.email || "").trim().toLowerCase();
    const isSectionAdviser = adviserEmail && (adviserEmail === authEmail || adviserEmail === profEmail);
    const isAdmin = userProfile?.role === 'system_admin' || userProfile?.role === 'admin';

    if (!isAdmin && !isSectionAdviser) {
      alert("Only Administrators and Section Advisers can modify subjects for this section.");
      return;
    }
    try {
      await deleteDoc(doc(db, `sections/${selectedSection.id}/subjects`, id));
      
      // If this subject is part of the global subjects chosen for this section, remove it
      if (selectedSection.globalSubjectIds?.includes(id)) {
        await updateDoc(doc(db, "sections", selectedSection.id), {
          globalSubjectIds: selectedSection.globalSubjectIds.filter(gid => gid !== id)
        });
      }
    } catch (error) {
      handleFirestoreError(error, 'delete', `sections/${selectedSection.id}/subjects/${id}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {!globalSettings?.activeSchoolYear && <EncodingClosedBanner />}
      <DeadlineBanner globalSettings={globalSettings} />
      <header className="sticky top-0 z-[100] h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 xl:px-8 shrink-0 shadow-sm">
        {/* Left Side: Back button, Logo, & Interactive Quick Section Switcher */}
        <div className="flex items-center gap-2 sm:gap-4 xl:gap-6 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 border-r border-slate-100 pr-2 sm:pr-4 shrink-0">
            <button 
              onClick={() => setSelectedSection(null)}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all group border border-transparent hover:border-slate-100"
              title="Back to Sections"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <h1 className="font-black text-base sm:text-lg md:text-xl tracking-tighter leading-none text-indigo-600 uppercase italic">
                CLASS
              </h1>
              <span className="text-[7px] sm:text-[8px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-0.5 hidden xs:inline">Enterprise Portal</span>
            </div>
          </div>

          {/* Quick Section Switcher Dropdown (Responsive for Mobile, Tablet, and Wide Screen) */}
          {selectedSection && (
            <div className="relative z-[110]">
              <button
                onClick={() => setIsSectionSwitcherOpen(!isSectionSwitcherOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/60 rounded-xl text-xs font-bold text-indigo-900 transition-all cursor-pointer shadow-2xs max-w-[140px] sm:max-w-[200px] md:max-w-[260px] truncate ${isSectionSwitcherOpen ? 'ring-2 ring-indigo-400/40 bg-indigo-100' : ''}`}
                title="Click to switch section"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></div>
                <div className="flex flex-col items-start truncate min-w-0">
                  <span className="text-[11px] sm:text-xs font-black tracking-tight truncate w-full text-indigo-950">
                    {selectedSection.name}
                  </span>
                  <span className="text-[9px] font-semibold text-indigo-600/80 uppercase tracking-wider hidden sm:block truncate w-full">
                    {(Number(selectedSection.gradeLevel) === 0) ? "Kindergarten" : `Grade ${selectedSection.gradeLevel}`} â€¢ {selectedSection.schoolYear}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-indigo-500 shrink-0 transition-transform duration-200 ml-auto ${isSectionSwitcherOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSectionSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSectionSwitcherOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Quick Switch Section</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {sections.filter(s => !globalSettings?.activeSchoolYear || s.schoolYear === globalSettings.activeSchoolYear).length} Sections
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                      {sections
                        .filter(s => !globalSettings?.activeSchoolYear || s.schoolYear === globalSettings.activeSchoolYear)
                        .map(sec => {
                          const isCurrent = sec.id === selectedSection.id;
                          return (
                            <button
                              key={sec.id}
                              onClick={() => {
                                setSelectedSection(sec);
                                setIsSectionSwitcherOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all text-xs ${
                                isCurrent 
                                  ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-bold truncate">{sec.name}</span>
                                <span className={`text-[10px] ${isCurrent ? 'text-indigo-100' : 'text-slate-400'}`}>
                                  {(Number(sec.gradeLevel) === 0) ? "Kindergarten" : `Grade ${sec.gradeLevel}`} â€¢ Adviser: {sec.adviserName || 'Unassigned'}
                                </span>
                              </div>
                              {isCurrent && <Check size={14} className="shrink-0" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Desktop Navigation (xl:flex) */}
          <nav className="hidden xl:flex items-center gap-1 shrink-0 ml-2">
            {(() => {
              const allTabs = [
                { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: <LayoutDashboard size={14} /> },
                { id: 'enroll', label: 'Learner', shortLabel: 'Learner', icon: <UserPlus size={14} /> },
                { id: 'subjects', label: 'Subjects', shortLabel: 'Subjects', icon: <BookOpen size={14} /> },
                { id: 'gradebook', label: 'eClass Records', shortLabel: 'eClass Records', icon: <TableIcon size={14} /> },
                { id: 'summary', label: 'Grading Sheet', shortLabel: 'Grading Sheet', icon: <ClipboardCheck size={14} /> },
                { id: 'transfers', label: 'Transfer Facility', shortLabel: 'Transfers', icon: <Share2 size={14} /> },
                { id: 'pta', label: 'PTA Fees', shortLabel: 'PTA Fees', icon: <CreditCard size={14} /> },
                { id: 'sf2', label: 'School Form 2', shortLabel: 'SF2 Report', icon: <FileText size={14} /> },
                { id: 'sf10', label: 'Learners Records', shortLabel: 'SF10 Record', icon: <HistoryIcon size={14} /> },
                { id: 'attendance', label: 'Daily Attendance', shortLabel: 'Attendance', icon: <Calendar size={14} /> },
                { id: 'observed-values', label: 'Teacher Comments/Remarks', shortLabel: 'Remarks', icon: <Heart size={14} /> },
                { id: 'anecdotes', label: 'Anecdotal Records', shortLabel: 'Anecdotes', icon: <MessageSquare size={14} /> },
                { id: 'sf8', label: 'School Form 8', shortLabel: 'SF8 Health', icon: <Activity size={14} /> },
                { id: 'sf4', label: 'School Form 4', shortLabel: 'SF4 Report', icon: <FileText size={14} /> },
                { id: 'sf7', label: 'School Form 7', shortLabel: 'SF7 Profile', icon: <FileText size={14} /> },
                { id: 'guide', label: 'Guide', shortLabel: 'Guide', icon: <HelpCircle size={14} /> },
                { id: 'sys-docs', label: 'System Documentation', shortLabel: 'Docs', icon: <Terminal size={14} /> },
                ...(currentUser?.email === 'jessiemangabo@gmail.com' ? [
                  { id: 'logs', label: 'VIEW LOGS & UNKNOWNS', shortLabel: 'Logs', icon: <Terminal size={14} /> },
                  { id: 'logs-clear', label: 'CLEAR UNKNOWN ONLY', shortLabel: 'Clear', icon: <Trash2 size={14} /> }
                ] : [])
              ];

              const allowedTabs = allTabs.filter(tab => {
                if (tab.id === 'subjects' && userProfile?.role !== 'system_admin' && userProfile?.role !== 'admin' && !isSectionAdviser) return false;
                if (tab.id === 'logs' || tab.id === 'logs-clear') return currentUser?.email === 'jessiemangabo@gmail.com';
                if (tab.id === 'summary' && !isSectionAdviser) return false;
                if (tab.id === 'pta' && !(userProfile?.role === 'teacher' && isSectionAdviser)) return false;
                if (tab.id === 'gradebook' && (!editableSubjects || editableSubjects.length === 0) && !isSectionAdviser) return false;
                if ((tab.id === 'attendance' || tab.id === 'sf2') && !hasCalendarMatch) return false;
                if (tab.id === 'sf4' && userProfile?.role !== 'system_admin' && userProfile?.role !== 'school_head' && !isAuthorizedCashier) return false;
                if (tab.id === 'sf7' && userProfile?.role !== 'system_admin' && userProfile?.role !== 'admin') return false;

                if (userProfile?.role === 'system_admin' || userProfile?.role === 'admin' || isAuthorizedCashier) {
                  const allowedTabsList = [
                    'dashboard', 'enroll', 'subjects', 'pta', 'sf8', 'guide', 'sys-docs', 'gradebook', 'summary', 'attendance', 'observed-values', 'sf2', 'transfers', 'sf10', 'sf4', 'sf7', 'anecdotes', 'logs', 'logs-clear', 'aral'
                  ];
                  if (userProfile?.role === 'system_admin') {
                    return allowedTabsList.filter(id => {
                      if (id === 'summary' && !isSectionAdviser) return false;
                      if (id === 'gradebook' && !isSectionAdviser && (!editableSubjects || editableSubjects.length === 0)) return false;
                      return true;
                    }).includes(tab.id);
                  }
                  if (isAuthorizedCashier) return allowedTabsList.includes(tab.id);
                  return allowedTabsList.filter(id => id !== 'sf4').includes(tab.id);
                }
                if (userProfile?.role === 'school_head') {
                   return ['sf8', 'sf4', 'sf10', 'anecdotes', 'aral'].includes(tab.id);
                }
                if (userProfile?.role === 'guidance_designate') {
                   return ['anecdotes', 'aral'].includes(tab.id);
                }
                if (userProfile?.role === 'teacher') {
                  if (isSectionAdviser) {
                    return ['dashboard', 'enroll', 'subjects', 'pta', 'sf8', 'sf10', 'attendance', 'observed-values', 'sf2', 'transfers', 'anecdotes', 'guide', 'gradebook', 'summary', 'aral'].includes(tab.id);
                  }
                  return tab.id === 'gradebook' || tab.id === 'dashboard' || tab.id === 'anecdotes' || tab.id === 'pta' || tab.id === 'aral';
                }
                return true;
              });

              const renderButton = (tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setOpenDropdown(null);
                    setIsSettingsDropdownOpen(false);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all relative ${
                    activeTab === tab.id 
                      ? 'text-indigo-600 bg-indigo-50/50 font-extrabold' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  <span className="uppercase tracking-wide">{tab.label}</span>
                  {activeTab === tab.id && <motion.div layoutId="minimal-nav-active" className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-indigo-600" />}
                </button>
              );

              const mgmtTabs = allowedTabs.filter(t => ['enroll', 'transfers', 'sf8', 'pta'].includes(t.id));
              const attTabs = allowedTabs.filter(t => ['attendance', 'sf2', 'observed-values', 'anecdotes'].includes(t.id));
              const academicTabs = allowedTabs.filter(t => ['subjects', 'gradebook', 'summary', 'sf10', 'sf4', 'sf7'].includes(t.id));
              const supportTabsGroup = allowedTabs.filter(t => ['guide', 'sys-docs'].includes(t.id));

              const renderDropdown = (id: string, label: string, icon: React.ReactNode, tabs: any[]) => {
                if (tabs.length === 0) return null;
                const isOpen = openDropdown === id;
                const setIsOpen = (val: boolean) => setOpenDropdown(val ? id : null);
                
                return (
                  <div className="relative z-50">
                    <button 
                      onClick={() => {
                        setIsOpen(!isOpen);
                        setIsSettingsDropdownOpen(false);
                      }}
                      className={`flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all relative ${
                      tabs.some(t => t.id === activeTab) 
                        ? 'text-indigo-600 bg-indigo-50/50' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}>
                      {icon}
                      <span className="uppercase tracking-wide">{label}</span>
                      <ChevronDown size={14} className={`opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      {tabs.some(t => t.id === activeTab) && <motion.div layoutId="minimal-nav-active" className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-indigo-600" />}
                    </button>
                    {isOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div className="absolute block top-full pt-4 left-0 w-56 z-50">
                          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-2 flex flex-col gap-1">
                          {tabs.map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id as any);
                                setIsOpen(false);
                              }}
                              className={`flex shrink-0 items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all text-left ${
                                activeTab === tab.id 
                                  ? 'text-indigo-600 bg-indigo-50/70 font-extrabold' 
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {tab.icon}
                                <span className="uppercase tracking-wider">{tab.label}</span>
                              </div>
                              {activeTab === tab.id && <ChevronRight size={14} className="text-indigo-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                    )}
                  </div>
                );
              };

              return (
                <>
                  {allowedTabs.find(t => t.id === 'dashboard') && renderButton(allowedTabs.find(t => t.id === 'dashboard'))}
                  
                  {renderDropdown('student-mgmt', 'Student Management', <Users size={14} />, mgmtTabs)}
                  {renderDropdown('attendance', 'Attendance & Behavior', <Calendar size={14} />, attTabs)}

                  {renderDropdown('academic', 'Academic Records', <BookOpen size={14} />, academicTabs)}
                  {renderDropdown('support', 'Support', <HelpCircle size={14} />, supportTabsGroup)}

                  {/* Settings Menu Submenu */}
                  {(userProfile?.role === 'admin' || userProfile?.role === 'system_admin') && (
                    <div className="relative z-50 ml-2 border-l border-slate-100 pl-2">
                      <button 
                        onClick={() => {
                          setIsSettingsDropdownOpen(!isSettingsDropdownOpen);
                          setOpenDropdown(null);
                        }}
                        className={`flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all relative ${
                        isSettingsDropdownOpen 
                          ? 'text-indigo-600 bg-indigo-50/50' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}>
                        <Settings size={14} />
                        <span className="uppercase tracking-wide">Settings Menu</span>
                        <ChevronDown size={14} className={`opacity-50 transition-transform ${isSettingsDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isSettingsDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsSettingsDropdownOpen(false)} />
                          <div className="absolute block top-full pt-4 left-0 w-56 z-50">
                            <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-2 flex flex-col gap-1">
                               <button
                                  onClick={() => { setShowAdminUsers(true); setIsSettingsDropdownOpen(false); }}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-b border-slate-50 w-full text-left cursor-pointer"
                               >
                                  <Users size={14} /> <span className="uppercase tracking-wider">Manage Users</span>
                               </button>
                               <button
                                  onClick={() => { 
                                    openGlobalScanner(); 
                                    setIsSettingsDropdownOpen(false); 
                                  }}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-indigo-50 hover:text-indigo-700 border-b border-slate-50 w-full text-left cursor-pointer"
                               >
                                  <QrCode size={14} /> <span className="uppercase tracking-wider">Scan ID</span>
                               </button>
                               {userProfile?.role === 'system_admin' && (
                                 <button
                                    onClick={() => { setActiveTab('subjects'); setIsSettingsDropdownOpen(false); }}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-b border-slate-50 w-full text-left"
                                 >
                                    <BookOpen size={14} /> <span className="uppercase tracking-wider">Subject Menu</span>
                                 </button>
                               )}
                               <button
                                  onClick={() => { setShowAdminSchools(true); setIsSettingsDropdownOpen(false); }}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-b border-slate-50 w-full text-left"
                               >
                                  <Building size={14} /> <span className="uppercase tracking-wider">Manage School</span>
                               </button>
                               <button
                                  onClick={() => { setShowAdminSchoolYear(true); setIsSettingsDropdownOpen(false); }}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-b border-slate-50 w-full text-left"
                               >
                                  <Calendar size={14} /> <span className="uppercase tracking-wider">School Year</span>
                               </button>
                               <button
                                  onClick={() => { setShowAdminSchoolCalendar(true); setIsSettingsDropdownOpen(false); }}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-b border-slate-50 w-full text-left"
                               >
                                  <Calendar size={14} /> <span className="uppercase tracking-wider">School Calendar</span>
                               </button>
                               <button
                                  onClick={() => { setShowAdminFeedback(true); setIsSettingsDropdownOpen(false); }}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 w-full text-left"
                               >
                                  <Sparkles size={14} /> <span className="uppercase tracking-wider">Feedback Dashboard</span>
                               </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </nav>
        </div>

        {/* Right Side Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile & Tablet Section Menu Trigger Button (xl:hidden) */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="xl:hidden flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Open Section Menu"
          >
            <Menu size={16} />
            <span className="hidden sm:inline uppercase tracking-wider text-[11px]">Section Menu</span>
          </button>
        </div>
      </header>

      {/* Responsive Horizontal Quick Bar (Mobile & Tablet - xl:hidden) */}
      <div className="xl:hidden h-14 bg-white border-b border-slate-200/80 flex items-center justify-start px-3 shrink-0 shadow-2xs overflow-x-auto custom-scrollbar gap-2 snap-x">
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="px-3 py-1.5 shrink-0 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs active:scale-95 cursor-pointer snap-start"
          title="All Section Menus"
        >
          <Menu size={14} />
          <span>All Menus</span>
        </button>

        <button
          onClick={() => {
            openGlobalScanner();
          }}
          className="px-3 py-1.5 shrink-0 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-1.5 text-xs font-bold border border-indigo-200/60 active:scale-95 cursor-pointer snap-start"
          title="Scan ID"
        >
          <QrCode size={14} />
          <span>Scan ID</span>
        </button>

        {(() => {
          const allTabs = [
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
            { id: 'enroll', label: 'Learner', icon: <UserPlus size={14} /> },
            { id: 'subjects', label: 'Subjects', icon: <BookOpen size={14} /> },
            { id: 'gradebook', label: 'eClass Records', icon: <TableIcon size={14} /> },
            { id: 'summary', label: 'Grading Sheet', icon: <ClipboardCheck size={14} /> },
            { id: 'sf8', label: 'SF8 Health', icon: <Activity size={14} /> },
            { id: 'transfers', label: 'Transfers', icon: <Share2 size={14} /> },
            { id: 'attendance', label: 'Attendance', icon: <Calendar size={14} /> },
            { id: 'sf2', label: 'SF2 Report', icon: <FileText size={14} /> },
            { id: 'observed-values', label: 'Remarks', icon: <Heart size={14} /> },
            { id: 'anecdotes', label: 'Anecdotes', icon: <MessageSquare size={14} /> },
            { id: 'sf10', label: 'SF10 Record', icon: <HistoryIcon size={14} /> },
            { id: 'pta', label: 'PTA Fees', icon: <CreditCard size={14} /> },
            { id: 'guide', label: 'Guide', icon: <HelpCircle size={14} /> },
          ];

          return allTabs.filter(tab => {
            if (tab.id === 'subjects' && userProfile?.role !== 'system_admin' && userProfile?.role !== 'admin' && !isSectionAdviser) return false;
            if (tab.id === 'summary' && !isSectionAdviser) return false;
            if (tab.id === 'pta' && !(userProfile?.role === 'teacher' && isSectionAdviser)) return false;
            if (tab.id === 'gradebook' && (!editableSubjects || editableSubjects.length === 0) && !isSectionAdviser) return false;
            if ((tab.id === 'attendance' || tab.id === 'sf2') && !hasCalendarMatch) return false;

            if (userProfile?.role === 'system_admin' || userProfile?.role === 'admin') return true;
            if (userProfile?.role === 'school_head') return ['sf8', 'sf10', 'anecdotes'].includes(tab.id);
            if (userProfile?.role === 'guidance_designate') return ['anecdotes'].includes(tab.id);
            if (userProfile?.role === 'teacher') {
              if (isSectionAdviser) return true;
              return ['gradebook', 'dashboard', 'anecdotes', 'pta'].includes(tab.id);
            }
            return true;
          }).map(tab => (
            <button
              key={'sub-bar-' + tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 shrink-0 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 snap-start ${
                activeTab === tab.id 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              {tab.icon}
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ));
        })()}
      </div>

      {/* Complete Mobile & Tablet Section Menu Sheet Drawer (xl:hidden) */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-[250] flex flex-col justify-end xl:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Slide-Up Sheet Container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border-t border-slate-200 dark:border-slate-800 z-10"
            >
              {/* Drawer Top Drag Indicator & Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h2 className="text-base font-black text-slate-900 dark:text-white truncate">Section Navigation</h2>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-500 truncate">
                      {selectedSection?.name} â€¢ Grade {selectedSection?.gradeLevel}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  title="Close Menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content Body with Categorized Menus */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                {(() => {
                  const categories = [
                    {
                      name: "Overview",
                      icon: <LayoutDashboard size={16} className="text-indigo-600" />,
                      tabs: [
                        { id: 'dashboard', label: 'Section Dashboard', desc: 'Overview & key metrics', icon: <LayoutDashboard size={18} /> },
                      ]
                    },
                    {
                      name: "Student Management",
                      icon: <Users size={16} className="text-emerald-600" />,
                      tabs: [
                        { id: 'enroll', label: 'Learner Roster', desc: 'Enrolled students & profiles', icon: <UserPlus size={18} /> },
                        { id: 'transfers', label: 'Transfer Facility', desc: 'Process learner transfers', icon: <Share2 size={18} /> },
                        { id: 'sf8', label: 'School Form 8 (Health)', desc: 'BMI & physical assessment', icon: <Activity size={18} /> },
                        { id: 'pta', label: 'PTA Fees', desc: 'PTA collection & records', icon: <CreditCard size={18} /> },
                      ]
                    },
                    {
                      name: "Attendance & Behavior",
                      icon: <Calendar size={16} className="text-amber-600" />,
                      tabs: [
                        { id: 'attendance', label: 'Daily Attendance', desc: 'Track daily attendance', icon: <Calendar size={18} /> },
                        { id: 'sf2', label: 'School Form 2 (SF2)', desc: 'Monthly attendance summary', icon: <FileText size={18} /> },
                        { id: 'observed-values', label: 'Teacher Remarks', desc: 'Core values & character', icon: <Heart size={18} /> },
                        { id: 'anecdotes', label: 'Anecdotal Records', desc: 'Behavioral logs & notes', icon: <MessageSquare size={18} /> },
                      ]
                    },
                    {
                      name: "Academic Records",
                      icon: <BookOpen size={16} className="text-sky-600" />,
                      tabs: [
                        { id: 'subjects', label: 'Section Subjects', desc: 'Subject assignments', icon: <BookOpen size={18} /> },
                        { id: 'gradebook', label: 'eClass Records', desc: 'Input grades & exam scores', icon: <TableIcon size={18} /> },
                        { id: 'summary', label: 'Grading Sheet', desc: 'Quarterly summary sheet', icon: <ClipboardCheck size={18} /> },
                        { id: 'sf10', label: 'Learner Record (SF10)', desc: 'Permanent transcript', icon: <HistoryIcon size={18} /> },
                        { id: 'sf4', label: 'School Form 4 (SF4)', desc: 'Monthly movement summary', icon: <FileText size={18} /> },
                        { id: 'sf7', label: 'School Form 7 (SF7)', desc: 'Personnel assignments', icon: <FileText size={18} /> },
                        { id: 'aral', label: 'ARAL Program', desc: 'Intervention program', icon: <Sparkles size={18} /> },
                      ]
                    },
                    {
                      name: "Support & Help",
                      icon: <HelpCircle size={16} className="text-purple-600" />,
                      tabs: [
                        { id: 'guide', label: 'User Guide', desc: 'Help & instructions', icon: <HelpCircle size={18} /> },
                        { id: 'sys-docs', label: 'System Documentation', desc: 'Features & specs', icon: <Terminal size={18} /> },
                      ]
                    }
                  ];

                  // Filter allowed tabs for mobile
                  const filterAllowed = (tabId: string) => {
                    if (tabId === 'subjects' && userProfile?.role !== 'system_admin' && userProfile?.role !== 'admin' && !isSectionAdviser) return false;
                    if (tabId === 'summary' && !isSectionAdviser) return false;
                    if (tabId === 'pta' && !(userProfile?.role === 'teacher' && isSectionAdviser)) return false;
                    if (tabId === 'gradebook' && (!editableSubjects || editableSubjects.length === 0) && !isSectionAdviser) return false;
                    if ((tabId === 'attendance' || tabId === 'sf2') && !hasCalendarMatch) return false;
                    if (tabId === 'sf4' && userProfile?.role !== 'system_admin' && userProfile?.role !== 'school_head' && !isAuthorizedCashier) return false;
                    if (tabId === 'sf7' && userProfile?.role !== 'system_admin' && userProfile?.role !== 'admin') return false;

                    if (userProfile?.role === 'system_admin' || userProfile?.role === 'admin' || isAuthorizedCashier) return true;
                    if (userProfile?.role === 'school_head') return ['sf8', 'sf4', 'sf10', 'anecdotes', 'aral'].includes(tabId);
                    if (userProfile?.role === 'guidance_designate') return ['anecdotes', 'aral'].includes(tabId);
                    if (userProfile?.role === 'teacher') {
                      if (isSectionAdviser) return true;
                      return ['gradebook', 'dashboard', 'anecdotes', 'pta', 'aral'].includes(tabId);
                    }
                    return true;
                  };

                  return (
                    <>
                      {categories.map(cat => {
                        const validTabs = cat.tabs.filter(t => filterAllowed(t.id));
                        if (validTabs.length === 0) return null;

                        return (
                          <div key={cat.name} className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                              {cat.icon}
                              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{cat.name}</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {validTabs.map(t => {
                                const isActive = activeTab === t.id;
                                return (
                                  <button
                                    key={'drawer-tab-' + t.id}
                                    onClick={() => {
                                      setActiveTab(t.id as any);
                                      setIsMobileNavOpen(false);
                                    }}
                                    className={`flex items-start gap-3 p-3 rounded-2xl transition-all text-left border cursor-pointer ${
                                      isActive 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                        : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60'
                                    }`}
                                  >
                                    <div className={`p-2 rounded-xl shrink-0 ${
                                      isActive ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-500 shadow-2xs'
                                    }`}>
                                      {t.icon}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="text-xs font-bold leading-snug truncate">{t.label}</span>
                                      <span className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-400'}`}>
                                        {t.desc}
                                      </span>
                                    </div>
                                    {isActive && <CheckCircle size={16} className="text-white shrink-0 mt-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Admin Settings Section inside Mobile/Tablet Drawer */}
                      {(userProfile?.role === 'admin' || userProfile?.role === 'system_admin') && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 px-1">
                            <Settings size={16} className="text-slate-500" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Settings Menu</h3>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <button
                              onClick={() => { setShowAdminUsers(true); setIsMobileNavOpen(false); }}
                              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700"
                            >
                              <Users size={14} className="text-slate-400" />
                              <span className="truncate">Manage Users</span>
                            </button>
                            <button
                              onClick={() => { openGlobalScanner(); setIsMobileNavOpen(false); }}
                              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700"
                            >
                              <QrCode size={14} className="text-indigo-600" />
                              <span className="truncate">Scan ID</span>
                            </button>
                            {userProfile?.role === 'system_admin' && (
                              <button
                                onClick={() => { setActiveTab('subjects'); setIsMobileNavOpen(false); }}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700"
                              >
                                <BookOpen size={14} className="text-slate-400" />
                                <span className="truncate">Subject Menu</span>
                              </button>
                            )}
                            <button
                              onClick={() => { setShowAdminSchools(true); setIsMobileNavOpen(false); }}
                              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700"
                            >
                              <Building size={14} className="text-slate-400" />
                              <span className="truncate">Manage School</span>
                            </button>
                            <button
                              onClick={() => { setShowAdminSchoolYear(true); setIsMobileNavOpen(false); }}
                              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700"
                            >
                              <Calendar size={14} className="text-slate-400" />
                              <span className="truncate">School Year</span>
                            </button>
                            <button
                              onClick={() => { setShowAdminSchoolCalendar(true); setIsMobileNavOpen(false); }}
                              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700"
                            >
                              <Calendar size={14} className="text-slate-400" />
                              <span className="truncate">School Calendar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Workspace Area */}
      <main className={`flex-1 overflow-auto bg-[#fcfdfe] scroll-smooth custom-scrollbar ${['gradebook', 'summary', 'dashboard', 'subjects', 'enroll', 'guide', 'sf8', 'transfers', 'sf10', 'observed-values', 'pta', 'tle-dashboard'].includes(activeTab) ? 'p-0' : 'p-6 md:p-12'}`}>
        <div className={`${['gradebook', 'summary', 'dashboard', 'subjects', 'enroll', 'guide', 'sf8', 'transfers', 'sf10', 'observed-values', 'pta', 'tle-dashboard'].includes(activeTab) ? 'w-full' : 'max-w-full 2xl:max-w-[1600px] mx-auto w-full'}`}>
          <AnimatePresence mode="wait">
            {activeTab === 'tle-dashboard' && (
              <motion.div
                key="tle-dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <TleDashboardView 
                  sections={sections}
                  subjects={subjects}
                  currentUser={userProfile}
                  onBack={() => setActiveTab('dashboard')}
                />
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <DashboardView 
                  students={enrolledStudents}
                  subjects={subjects}
                  sections={sections}
                  currentUser={userProfile}
                  globalSettings={globalSettings}
                  onNavigate={(tab) => setActiveTab(tab as any)}
                  onCalculateYearEnd={handleCalculateYearEnd}
                  onUnfinalizeYearEnd={handleUnfinalizeYearEnd}
                  onToggleFinalizeSubjectTerm={handleToggleFinalizeSubjectTerm}
                  section={selectedSection}
                  onShowFinancialStatement={handleShowFinancialStatement}
                  isAuthorizedCashier={isAuthorizedCashier}
                  isSectionAdviser={isSectionAdviser}
                  isEntireSchoolFinalized={isEntireSchoolFinalized}
                  onSelectSubject={(subjId) => {
                    setSelectedSubjectId(subjId);
                    setActiveTab('gradebook');
                  }}
                  onTermChange={(t) => setActiveTerm(t)}
                  teacherCount={teacherCount}
                  activeSchool={activeSchool}
                  schoolCalendar={sectionSchoolCalendar}
                  onUpdateAttendance={handleUpdateDailyAttendance}
                  onScanID={openGlobalScanner}
                />
              </motion.div>
            )}
            {activeTab === 'gradebook' && (
              <motion.div 
                key="gradebook"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <GradebookView 
                  subjects={(userProfile?.role === 'system_admin' || userProfile?.role === 'admin' || userProfile?.role === 'school_head' || isSectionAdviser) ? subjects : editableSubjects}
                  selectedSubjectId={selectedSubjectId}
                  onSelectSubject={setSelectedSubjectId}
                  students={combinedTleStudents.length > 0 ? combinedTleStudents : enrolledStudents}
                  onUpdateGrades={updateStudentGrades}
                  onBulkUpdate={handleBulkUpdate}
                  onUpdateSubject={updateSubjectConfig}
                  activeTerm={activeTerm}
                  onTermChange={setActiveTerm}
                  selectedSection={selectedSection}
                  globalNumTerms={globalNumTerms}
                  schoolCalendar={schoolCalendar}
                  onUnfinalizeYearEnd={handleUnfinalizeYearEnd}
                  onCalculateYearEnd={handleCalculateYearEnd}
                  onToggleFinalizeSubjectTerm={handleToggleFinalizeSubjectTerm}
                  currentUser={userProfile}
                  globalSettings={globalSettings}
                />
              </motion.div>
            )}
            {activeTab === 'summary' && (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <SummarySheetView 
                  students={enrolledStudents}
                  subjects={subjects}
                  selectedSection={selectedSection}
                  currentUser={userProfile}
                  schoolCalendar={sectionSchoolCalendar}
                  onToggleSF9Download={handleToggleSF9Download}
                  onToggleStudentStatus={handleToggleStudentStatus}
                  onViewReport={setSelectedStudentForReport}
                  onViewBlankReport={setSelectedStudentForBlankReport}
                />
              </motion.div>
            )}
            {activeTab === 'transfers' && (
              <motion.div 
                key="transfers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TransferFacilityView 
                  students={students}
                  onToggleStatus={handleToggleStudentStatus}
                  onViewReport={setSelectedStudentForReport}
                  onViewBlankReport={setSelectedStudentForBlankReport}
                />
              </motion.div>
            )}
            {activeTab === 'enroll' && (
              <motion.div 
                key="enroll"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <AddLearnerView 
                  form={learnerForm} 
                  setForm={setLearnerForm} 
                  onSave={handleSaveLearner}
                  students={filteredStudents}
                  sections={sections}
                  unenrolledStudents={unenrolledStudents}
                  onEnrollAllLearners={handleEnrollAllLearners}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteLearner}
                  onDeleteMany={handleDeleteManyLearners}
                  editingId={editingId}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onBulkEnroll={handleBulkEnroll}
                  onCancelEdit={() => {
                    setEditingId(null);
                    setLearnerForm({ 
                      lastName: "", firstName: "", middleName: "", extension: "", name: "", 
                      lrn: "", email: "", photo: "", age: "", birthdate: "", sex: "Male", weight: "", height: "", attendance: {}, 
                      birthplace: "", address: "", fatherName: "", motherName: "", guardianName: "", guardianRelationship: "", primaryContact: "guardian", contactNumber: "",
                      nutritionalStatus: {}, isTransferredIn: false, siblingIds: [], enrolledSubjectIds: [], eligibility: { type: 'Elementary School Completer' } as any
                    });
                  }}
                  sectionName={selectedSection.name}
                  schoolYear={selectedSection.schoolYear}
                  onUpdateAttendance={handleUpdateAttendance}
                  schoolCalendar={sectionSchoolCalendar}
                  globalSettings={globalSettings}
                  onToggleStatus={handleToggleStudentStatus}
                  onViewReport={setSelectedStudentForReport}
                  onViewBlankReport={setSelectedStudentForBlankReport}
                  onTogglePublishGrades={handleTogglePublishGrades}
                  onToggleParentSignature={handleToggleParentSignature}
                  section={selectedSection}
                  currentUser={userProfile}
                  isSectionAdviser={isSectionAdviser}
                  onViewAnecdotals={(s) => {
                    setPreselectedStudentForAnecdotal(s);
                    setActiveTab('anecdotes');
                  }}
                  globalSubjects={globalSubjects}
                  subjects={subjects}
                />
              </motion.div>
            )}
            {activeTab === 'subjects' && (
              <motion.div 
                key="subjects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SubjectsView 
                  subjects={subjects}
                  onAddSubject={handleAddSubject}
                  onEditSubject={handleEditSubject}
                  onDeleteSubject={handleDeleteSubject}
                  selectedSection={selectedSection}
                  currentUser={userProfile}
                  globalSettings={globalSettings}
                  isSectionAdviser={isSectionAdviser}
                  globalSubjects={globalSubjects}
                  onUpdateSection={handleUpdateSection}
                  onBack={() => setActiveTab('dashboard')}
                />
              </motion.div>
            )}
            {(activeTab === 'attendance' || activeTab === 'sf2') && selectedSection && (
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-4">
                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                     {activeTab === 'sf2' ? 'School Form 2 Report' : 'Daily Attendance'}
                   </h2>
                   <p className="text-sm text-slate-500 font-medium">{activeTab === 'sf2' ? 'Summary report of learner attendance.' : 'Record and manage learner daily attendance.'}</p>
                </div>
                {activeTab === 'sf2' ? (
                  <SF2ReportView 
                    students={enrolledStudents}
                    calendar={sectionSchoolCalendar}
                    section={selectedSection}
                    userId={currentUser?.uid}
                  />
                ) : (
                  <DailyAttendanceTracker 
                    students={enrolledStudents}
                    calendar={sectionSchoolCalendar} 
                    schoolYear={selectedSection?.schoolYear}
                    onUpdateAttendance={handleUpdateDailyAttendance} 
                    onMarkAllPresent={handleMarkAllPresent}
                    userId={currentUser?.uid}
                    section={selectedSection}
                    sections={sections}
                    scanLogs={scanLogs}
                    onAddScanLog={handleAddScanLog}
                    onDeleteScanLog={handleDeleteScanLog}
                    onClearScanLogs={handleClearScanLogs}
                    currentUserEmail={currentUser?.email}
                    schoolName={selectedSection?.schoolName || activeSchool?.name}
                    schoolId={selectedSection?.schoolId || activeSchool?.schoolId}
                    division={selectedSection?.division || activeSchool?.division}
                    region={selectedSection?.region || activeSchool?.region}
                    onScanID={openGlobalScanner}
                  />
                )}
              </motion.div>
            )}
            {activeTab === 'observed-values' && selectedSection && (
              <motion.div 
                key="observed-values"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ObservedValuesTracker 
                  students={enrolledStudents} 
                  onUpdateValue={handleUpdateObservedValue} 
                  globalNumTerms={globalSettings?.numTerms || 4}
                />
              </motion.div>
            )}
            {activeTab === 'anecdotes' && (
              <motion.div 
                key="anecdotes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <AnecdotalRecordsView 
                  currentUser={currentUser}
                  userProfile={userProfile}
                  selectedSection={selectedSection}
                  students={enrolledStudents}
                  sections={sections}
                  preselectedStudent={preselectedStudentForAnecdotal}
                  onClearPreselectedStudent={() => setPreselectedStudentForAnecdotal(null)}
                />
              </motion.div>
            )}
            {activeTab === 'pta' && (
              <motion.div 
                key="pta"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <PTAFeesManagementView
                  currentUser={currentUser}
                  userProfile={userProfile}
                  selectedSection={selectedSection}
                  sections={sections}
                  initialTab={ptaInitialTab}
                />
              </motion.div>
            )}
            {activeTab === 'guide' && (
              <motion.div 
                key="guide"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <UserGuideView />
              </motion.div>
            )}
            {activeTab === 'sys-docs' && (
              <motion.div 
                key="sys-docs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SystemDocumentationView />
              </motion.div>
            )}

            {activeTab === 'sf8' && (
               <motion.div 
                 key="sf8"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
               >
                 <SF8View 
                    section={selectedSection}
                    students={enrolledStudents}
                    userProfile={userProfile}
                    activeSchoolYear={globalSettings?.activeSchoolYear}
                 />
               </motion.div>
            )}
            {activeTab === 'sf10' && (
               <motion.div 
                 key="sf10"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
               >
                 <SF10View 
                    section={selectedSection}
                    students={enrolledStudents}
                    subjects={subjects}
                    schoolCalendar={schoolCalendar}
                    userProfile={userProfile}
                 />
               </motion.div>
            )}

            {activeTab === 'sf4' && (userProfile?.role === 'system_admin' || userProfile?.role === 'school_head') && userProfile?.schoolId && (
               <motion.div 
                 key="sf4"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
               >
                 <SF4ReportView 
                    schoolId={userProfile.schoolId}
                    calendar={schoolCalendar}
                    globalSettings={globalSettings}
                 />
               </motion.div>
            )}

            {activeTab === 'sf7' && userProfile?.schoolId && (
               <motion.div 
                 key="sf7"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
               >
                 <SF7ReportView 
                    schoolId={userProfile.schoolId}
                    activeSchoolYear={selectedSection?.schoolYear || globalSettings?.activeSchoolYear || "2026-2027"}
                    userProfile={userProfile}
                 />
               </motion.div>
            )}

            {activeTab === 'aral' && (
               <motion.div 
                 key="aral"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
               >
                 <AralProgram 
                   enrolledStudents={enrolledStudents}
                   selectedSection={selectedSection}
                   sections={sections}
                   userProfile={userProfile}
                   globalSettings={globalSettings}
                   aralSchoolInfo={aralSchoolInfo}
                   onUpdateAralSchool={handleUpdateAralSchool}
                   aralCompetencies={aralCompetencies}
                   onAddAralCompetency={handleAddAralCompetency}
                   onDeleteAralCompetency={handleDeleteAralCompetency}
                   aralClasses={aralClasses}
                   onCreateAralClass={handleCreateAralClass}
                   onUpdateAralClass={handleUpdateAralClass}
                   onDeleteAralClass={handleDeleteAralClass}
                   selectedAralClassId={selectedAralClassId}
                   onSelectAralClassId={setSelectedAralClassId}
                 />
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-10 shrink-0 z-40 bg-slate-50/50">
        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-4">
          <span>Server Status: Online</span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
        </div>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Â© 2024 Centralized Learner Assessment & School System â€¢ Professional Edition</p>
      </footer>

      <FeedbackModal 
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        user={userProfile}
      />

      <AnimatePresence>
        {enrollAllModalOpen && (
          <EnrollAllConfirmationModal
            learnerCount={unenrolledStudents.length}
            onConfirm={async () => {
              setEnrollAllProcessing(true);
              setEnrollAllErrorMsg("");
              try {
                const connectedSubjects = await fetchSubjectsForSection(
                  selectedSection!.id,
                  Number(selectedSection!.gradeLevel),
                  selectedSection!.globalSubjectIds || [],
                  globalSubjects
                );
                const allSubjectIds = connectedSubjects.map(s => s.id);
                
                if (allSubjectIds.length === 0) {
                  setEnrollAllErrorMsg("This section does not have any curriculum subjects configured. Please configure or add subjects first.");
                  setEnrollAllProcessing(false);
                  return;
                }

                const batch = writeBatch(db);
                unenrolledStudents.forEach(student => {
                  batch.set(
                    doc(db, `sections/${selectedSection!.id}/students`, student.id),
                    { enrolledSubjectIds: allSubjectIds },
                    { merge: true }
                  );
                });
                await batch.commit();
                setEnrollAllSuccessMsg(`Successfully enrolled all ${unenrolledStudents.length} pending learner(s) in ${allSubjectIds.length} subjects!`);
                setEnrollAllModalOpen(false);
              } catch (error: any) {
                console.error("Enroll All Learners Error:", error);
                setEnrollAllErrorMsg(error?.message || "Failed to complete enrollment batch.");
              } finally {
                setEnrollAllProcessing(false);
              }
            }}
            onCancel={() => setEnrollAllModalOpen(false)}
            isProcessing={enrollAllProcessing}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {enrollAllSuccessMsg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setEnrollAllSuccessMsg("")}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center border border-slate-150"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">Enrollment Completed</h2>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed mb-6">
                {enrollAllSuccessMsg}
              </p>
              <button 
                onClick={() => setEnrollAllSuccessMsg("")}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Okay, Awesome
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {enrollAllErrorMsg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setEnrollAllErrorMsg("")}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center border border-slate-150"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">Enrollment Failed</h2>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed mb-6">
                {enrollAllErrorMsg}
              </p>
              <button 
                onClick={() => setEnrollAllErrorMsg("")}
                className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStudentForReport && selectedSection && (
          <MATATAGReportCardModal 
            student={selectedStudentForReport}
            section={selectedSection}
            subjects={subjects.slice().sort((a, b) => (a.order || 0) - (b.order || 0))}
            onClose={() => setSelectedStudentForReport(null)}
            calendar={schoolCalendar}
            globalNumTerms={globalSettings?.numTerms || 4}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {statusChangeTarget && (
          <StatusChangeModal 
            student={statusChangeTarget.student}
            newStatus={statusChangeTarget.newStatus}
            onConfirm={confirmStatusChange}
            onCancel={() => setStatusChangeTarget(null)}
            date={statusChangeDate}
            onDateChange={setStatusChangeDate}
            reason={statusChangeReason}
            onReasonChange={setStatusChangeReason}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmFinalizeSection && selectedSection && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-emerald-100 text-emerald-600">
                <Sparkles size={32} />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-2">Finalize Section?</h3>
              
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Are you sure you want to finalize this section? This will lock all student records, compute final averages, and set statuses. This action is irreversible without requesting unfinalization.
              </p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmFinalizeSection(false)}
                  className="flex-1 py-3 bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeFinalizeSection}
                  className="flex-1 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                >
                  Confirm Finalize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmYearEndUnfinalize && selectedSection && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-amber-100 text-amber-600">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-2">{userProfile?.role === 'system_admin' ? 'Unfinalize Section?' : 'Request Unfinalize Section?'}</h3>
              
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                {userProfile?.role === 'system_admin' 
                  ? "Are you sure you want to unfinalize this section? This will reset the promotion and retention statuses for all learners in this section and unlock the gradebook."
                  : "Are you sure you want to request unfinalization of this section? An admin will review and approve."}
              </p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmYearEndUnfinalize(false)}
                  className="flex-1 py-3 bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeUnfinalizeYearEnd}
                  className="flex-1 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                >
                  Yes, Unfinalize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {globalScannerModal}
      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        settings={systemThemeSettings}
        onUpdateSettings={handleUpdateThemeSettings}
        onResetSettings={() => handleUpdateThemeSettings(DEFAULT_THEME_SETTINGS)}
      />
    </div>
  );
}

function StatusChangeModal({ 
  student, 
  newStatus, 
  onConfirm, 
  onCancel,
  date,
  onDateChange,
  reason,
  onReasonChange
}: { 
  student: Student, 
  newStatus: 'Transferred Out' | 'Dropped Out' | 'Retained' | 'Promoted',
  onConfirm: () => void,
  onCancel: () => void,
  date: string,
  onDateChange: (d: string) => void,
  reason: string,
  onReasonChange: (r: string) => void
}) {
  const isTransfer = newStatus === 'Transferred Out';
  const isDrop = newStatus === 'Dropped Out';
  const isPromoted = newStatus === 'Promoted';
  const label = isTransfer ? 'Transfer Out' : isDrop ? 'Drop Out' : isPromoted ? 'Mark as Promoted' : 'Mark as Retained';
  const color = isTransfer ? 'rose' : isDrop ? 'orange' : isPromoted ? 'emerald' : 'indigo';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
      >
        <div className={`bg-${color}-50 px-8 py-6 border-b border-${color}-100 flex items-center gap-4`}>
          <div className={`p-3 bg-${color}-100 text-${color}-600 rounded-2xl`}>
            {isTransfer ? <Share2 size={24} /> : <UserMinus size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Confirm {label}</h3>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{formatStudentName(student)}</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-slate-600 text-sm leading-relaxed">
              "Are you sure you want to mark this learner as <span className={`font-bold text-${color}-600`}>{newStatus}</span>? This will affect monthly enrollment reports and the Learner Permanent Record."
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Date of {isTransfer ? 'Transfer' : 'Last Attendance'}
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium ml-1">This date determines which month the learner is counted as {isTransfer ? 'transferred' : 'dropped'} in the SF4 report.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Reason for {isTransfer ? 'Transfer/School' : 'Dropping Out'} (Optional)
              </label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder={isTransfer ? "School transferred to..." : "Reason for dropping out..."}
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  className="w-full h-14 pl-4 pr-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all placeholder:text-slate-400 placeholder:font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={onCancel}
              className="flex-1 h-14 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className={`flex-1 h-14 bg-${color}-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-${color}-200 hover:scale-105 transition-all active:scale-95`}
            >
              Confirm {label}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SectionForm({ 
  initialData, 
  onSubmit, 
  buttonLabel,
  user,
  globalSubjects = []
}: { 
  initialData?: any, 
  onSubmit: (data: any) => void,
  buttonLabel: string,
  user?: UserProfile | null,
  globalSubjects?: Subject[]
}) {
  const [form, setForm] = useState({
    name: initialData?.name || "",
    grade: initialData?.gradeLevel || initialData?.grade || "",
    adviserName: initialData?.adviserName || initialData?.adviser || "",
    adviserEmail: initialData?.adviserEmail || "",
    region: initialData?.region || "",
    division: initialData?.division || "",
    district: initialData?.district || "",
    schoolName: initialData?.schoolName || "",
    schoolId: initialData?.schoolId || (user?.role === 'system_admin' ? (user?.schoolId || "") : ""),
    schoolYear: initialData?.schoolYear || "",
    globalSubjectIds: initialData?.globalSubjectIds || [],
    subjectTeachers: initialData?.subjectTeachers || {}
  });

  const [availableSchools, setAvailableSchools] = useState<any[]>([]);
  const [availableSchoolYears, setAvailableSchoolYears] = useState<string[]>([]);
  const [activeSchoolYear, setActiveSchoolYear] = useState<string | null>(null);
  const [advisoryCandidates, setAdvisoryCandidates] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!form.schoolId) {
      setAdvisoryCandidates([]);
      return;
    }
    const q = query(
      collection(db, "users"),
      where("schoolId", "==", form.schoolId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const candidates: UserProfile[] = [];
      snap.forEach((docSnap) => {
        const u = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
        if (u.role !== 'student') {
          candidates.push(u);
        }
      });
      candidates.sort((a, b) => (a.displayName || a.email || "").localeCompare(b.displayName || b.email || ""));
      setAdvisoryCandidates(candidates);
    }, (err) => {
      console.error("Error fetching advisory candidates:", err);
    });
    return () => unsub();
  }, [form.schoolId]);

  const schoolYearsToDisplay = useMemo(() => {
    const list = [...availableSchoolYears];
    if (form.schoolYear && !list.includes(form.schoolYear)) {
      list.push(form.schoolYear);
    }
    return list.sort((a, b) => b.localeCompare(a));
  }, [availableSchoolYears, form.schoolYear]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const activeYears = (data.schoolYears || []).filter((sy: string) => !(data.closedSchoolYears || []).includes(sy));
        setAvailableSchoolYears(activeYears);
        setActiveSchoolYear(data.activeSchoolYear || null);
        const defaultYear = data.activeSchoolYear || (activeYears.length > 0 ? activeYears[0] : "");
        if (defaultYear && !form.schoolYear) {
          setForm(prev => ({ ...prev, schoolYear: defaultYear }));
        }
      }
    }, (err) => {
      handleFirestoreError(err, 'get', 'settings/general');
    });
    return unsub;
  }, [form.schoolYear, user]);

  useEffect(() => {
    // Both admins and system admins can see the full school list to pick from.
    if (user?.role === 'admin' || user?.role === 'system_admin') {
      const q = query(collection(db, "schools"));
      getDocs(q).then(snap => {
        setAvailableSchools(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }).catch(err => console.error("Error fetching available schools:", err));
    }
  }, [user]);

  useEffect(() => {
    if (!initialData && user?.role === 'system_admin' && user?.schoolId && !form.schoolId) {
      setForm(prev => ({ ...prev, schoolId: user.schoolId || "" }));
    }
  }, [user, form.schoolId, initialData]);

  useEffect(() => {
    const fetchSchoolDetails = async () => {
      if (!form.schoolId) return;
      
      try {
        const q = query(collection(db, "schools"), where("schoolId", "==", form.schoolId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const schoolData = snap.docs[0].data();
          setForm(prev => ({
            ...prev,
            schoolName: schoolData.name || prev.schoolName,
            region: schoolData.region || prev.region,
            division: schoolData.division || prev.division,
            district: schoolData.district || prev.district,
            headOfSchool: schoolData.headOfSchool || prev.headOfSchool
          }));
        }
      } catch (err) {
        console.error("Error fetching school details:", err);
      }
    };
    
    // Auto-fetch if adding a new section or if schoolId changes in edit mode
    // (Wait, in edit mode we should probably trust initialData unless schoolId explicitly changes)
    if (!initialData || form.schoolId !== initialData.schoolId) {
      fetchSchoolDetails();
    }
  }, [form.schoolId, initialData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Section Name</label>
            <input 
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-all"
              placeholder="e.g. Einstein"
            />
        </div>
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Grade Level</label>
            <select 
              value={form.grade}
              onChange={e => setForm({...form, grade: e.target.value === "" ? "" : parseInt(e.target.value)})}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-all"
            >
              <option value="" disabled>Select Grade Level</option>
              <option value="0">Kindergarten</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>Grade {n}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Adviser Name</label>
            {advisoryCandidates.length > 0 ? (
              <select 
                value={form.adviserEmail || ""}
                onChange={e => {
                  const val = e.target.value;
                  const matched = advisoryCandidates.find(c => c.email === val);
                  setForm(prev => ({
                    ...prev,
                    adviserName: matched ? (matched.displayName || matched.email) : val,
                    adviserEmail: val
                  }));
                }}
                className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-all text-slate-800"
              >
                <option value="" disabled>Select Class Adviser...</option>
                {form.adviserEmail && !advisoryCandidates.some(c => c.email === form.adviserEmail) && (
                  <option value={form.adviserEmail}>{form.adviserName || form.adviserEmail}</option>
                )}
                {advisoryCandidates.map(c => {
                  const label = c.displayName || c.email;
                  return (
                    <option key={c.uid} value={c.email}>
                      {label} ({c.email})
                    </option>
                  );
                })}
              </select>
            ) : (
              <input 
                value={form.adviserName}
                onChange={e => setForm({...form, adviserName: e.target.value})}
                className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-all text-slate-800"
                placeholder="No registered users found. Type manually..."
              />
            )}
        </div>

        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Adviser Email</label>
            <input 
              value={form.adviserEmail}
              onChange={e => setForm({...form, adviserEmail: e.target.value})}
              readOnly={!!form.adviserEmail && advisoryCandidates.some(c => c.email === form.adviserEmail)}
              className={`w-full h-11 px-4 border border-slate-200 rounded-lg outline-none font-semibold text-sm transition-all ${
                (form.adviserEmail && advisoryCandidates.some(c => c.email === form.adviserEmail)) 
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-50/50 focus:border-indigo-500 text-slate-850'
              }`}
              placeholder="Enter Teacher's Email"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Select School ID <span className="text-rose-500">*</span></label>
            {(user?.role === 'admin' || user?.role === 'system_admin') ? (
              <select 
                value={form.schoolId}
                required
                onChange={e => setForm({...form, schoolId: e.target.value})}
                className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-all"
              >
                <option value="" disabled>Select a School</option>
                {availableSchools.map(s => (
                  <option key={s.id} value={s.schoolId}>{s.schoolId} - {s.name}</option>
                ))}
              </select>
            ) : (
              <input 
                value={form.schoolId}
                required
                onChange={e => setForm({...form, schoolId: e.target.value})}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-all"
                placeholder="School ID"
              />
            )}
        </div>
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">School Name</label>
            <input 
              value={form.schoolName}
              readOnly
              className="w-full h-11 px-4 bg-slate-100/50 border border-slate-200 rounded-lg outline-none font-semibold text-sm text-slate-500 cursor-not-allowed transition-all"
              placeholder="Auto-filled School Name"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Region</label>
            <input 
              value={form.region}
              readOnly
              className="w-full h-11 px-4 bg-slate-100/50 border border-slate-200 rounded-lg outline-none font-semibold text-sm text-slate-500 cursor-not-allowed transition-all"
              placeholder="Auto-filled Region"
            />
        </div>
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Division</label>
            <input 
              value={form.division}
              readOnly
              className="w-full h-11 px-4 bg-slate-100/50 border border-slate-200 rounded-lg outline-none font-semibold text-sm text-slate-500 cursor-not-allowed transition-all"
              placeholder="Auto-filled Division"
            />
        </div>
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">District</label>
            <input 
              value={form.district}
              readOnly
              className="w-full h-11 px-4 bg-slate-100/50 border border-slate-200 rounded-lg outline-none font-semibold text-sm text-slate-500 cursor-not-allowed transition-all"
              placeholder="Auto-filled District"
            />
        </div>
      </div>

      <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center justify-between">
            School Year
            {!activeSchoolYear && (
              <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                <AlertCircle size={10} /> No school year is in active
              </span>
            )}
          </label>
          {schoolYearsToDisplay.length > 0 ? (
            <select 
              value={form.schoolYear}
              onChange={e => setForm({...form, schoolYear: e.target.value})}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-all"
            >
              {schoolYearsToDisplay.map(sy => (
                <option key={sy} value={sy}>{sy}</option>
              ))}
            </select>
          ) : (
            <input 
              value={form.schoolYear}
              onChange={e => setForm({...form, schoolYear: e.target.value})}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-all"
              placeholder="e.g. 2023-2024"
            />
          )}
      </div>

      <div className="flex justify-end pt-6">
        <button 
          onClick={() => {
              if (!form.schoolYear || !form.schoolId) {
                if (!form.schoolId) alert('School ID is required.');
                return;
              }
              const data = {
                name: form.name,
                gradeLevel: form.grade,
                adviserName: form.adviserName,
                adviserEmail: form.adviserEmail || "",
                region: form.region,
                division: form.division,
                district: form.district,
                schoolName: form.schoolName,
                schoolId: form.schoolId,
                schoolYear: form.schoolYear
              };
              onSubmit(data);
          }}
          disabled={
            !form.schoolYear || 
            !form.schoolId || 
            !form.name.trim() || 
            form.grade === "" || 
            !form.adviserName.trim() || 
            !form.adviserEmail.trim()
          }
          className="bg-indigo-600 text-white disabled:bg-slate-200 h-11 px-10 rounded-lg font-bold text-sm shadow-lg shadow-indigo-600/10 hover:bg-indigo-700 disabled:shadow-none transition-all w-full md:w-auto"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function LoginView({ 
  onLogin, 
  isLoading, 
  loginError, 
  onDemoLogin 
}: { 
  onLogin: () => void; 
  isLoading?: boolean; 
  loginError?: string | null;
  onDemoLogin?: (role: 'admin' | 'system_admin' | 'school_head' | 'teacher' | 'student') => void;
}) {
  const [showPricing, setShowPricing] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden font-sans p-4">
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative z-10 mx-auto flex flex-col justify-center my-auto"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-50 blur-xl rounded-full" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 relative">
              <GraduationCap size={36} className="text-white" />
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">Official DepEd Portal</span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug text-center mt-1">
                Centralized Learner Assessment <br />
                &amp; School System
              </h1>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">Class Record &amp; Enterprise School Management</p>
          </div>
        </div>

        {loginError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-left flex items-start gap-3 shadow-sm"
          >
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              <p className="font-bold text-amber-950 mb-1">Authentication Alert</p>
              <p>{loginError}</p>
              <p className="mt-2 text-[11px] text-amber-700 font-semibold">
                Tip: You can use <button type="button" onClick={() => setShowDemoOptions(true)} className="underline font-bold text-indigo-700 hover:text-indigo-800">Quick Access / Demo Login</button> below to test any role directly.
              </p>
            </div>
          </motion.div>
        )}

        <button 
          onClick={onLogin}
          disabled={isLoading}
          className="w-full bg-slate-900 text-white h-14 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mb-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm">Authenticating with Google...</span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold">Secure Log In with Google</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">or direct portal access</span>
        </div>

        <button
          type="button"
          onClick={() => setShowDemoOptions(!showDemoOptions)}
          className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 h-12 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors mb-3"
        >
          <Sparkles size={16} className="text-indigo-600" />
          {showDemoOptions ? "Hide Demo / Quick Access Portals" : "Quick Access / Demo Login"}
        </button>

        <AnimatePresence>
          {showDemoOptions && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Select Role to Login Instantly</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button 
                    onClick={() => onDemoLogin?.('admin')}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-indigo-300 flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                      <Shield size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">System Admin</div>
                      <div className="text-[10px] text-slate-500">Dr. Jessie J. Mangabo</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onDemoLogin?.('school_head')}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-purple-300 flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600">School Head</div>
                      <div className="text-[10px] text-slate-500">Principal / Administrator</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onDemoLogin?.('teacher')}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-emerald-300 flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <Users size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">Teacher / Adviser</div>
                      <div className="text-[10px] text-slate-500">Subject / Class Teacher</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onDemoLogin?.('student')}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-amber-300 flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-600">Student Portal</div>
                      <div className="text-[10px] text-slate-500">Learner Class Card &amp; SF9</div>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowPricing(true)}
          className="w-full border border-slate-200 text-slate-600 h-11 rounded-xl font-medium text-xs flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <CreditCard size={15} className="text-slate-400" />
          View Pricing &amp; Payment
        </button>

        <div className="mt-6 flex items-center gap-2 justify-center text-[11px] text-slate-500 font-medium">
          <ShieldCheck size={15} className="text-emerald-500" />
          Authorized DepEd Academic Access Only
        </div>
      </motion.div>

      {showPricing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-200"
          >
            <button 
              onClick={() => setShowPricing(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Pricing &amp; Payment</h3>
                <p className="text-sm text-slate-500 mt-1">Flexible pricing based on your school's size</p>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-slate-600 leading-relaxed">The Centralized Learner Assessment & School System offers flexible pricing based on your school's size. Fees are collected per year of use. <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Free for First year of access.</span></p>
              
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">School Category</th>
                      <th className="px-5 py-3">No. of Teachers</th>
                      <th className="px-5 py-3">Annual Fee (PHP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium text-slate-700">Small</td>
                      <td className="px-5 py-3 text-slate-500">9 &amp; below</td>
                      <td className="px-5 py-3 font-semibold text-indigo-600">â‚±599</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium text-slate-700">Medium</td>
                      <td className="px-5 py-3 text-slate-500">10 â€“ 25</td>
                      <td className="px-5 py-3 font-semibold text-indigo-600">â‚±1,199</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium text-slate-700">Large</td>
                      <td className="px-5 py-3 text-slate-500">26 â€“ 100</td>
                      <td className="px-5 py-3 font-semibold text-indigo-600">â‚±2,499</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium text-slate-700">Mega</td>
                      <td className="px-5 py-3 text-slate-500">101 &amp; above</td>
                      <td className="px-5 py-3 font-semibold text-indigo-600">â‚±4,999</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                <h4 className="text-slate-800 font-semibold text-sm mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" /> How to Pay
                </h4>
                <div className="space-y-4">
                  <p className="text-slate-600 text-sm leading-relaxed">
                    We currently support payments via <strong>GCash / Digital Transfer</strong>. Please send your payment to the following number:
                  </p>
                  <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-fit">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GCash Number</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">0905 152 6827</p>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs italic">
                    *After payment, please contact the administrator with your proof of payment and School ID to activate your license.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function GlobalFinalizationController({
  sections,
  subjects,
  user,
  activeSchoolYear,
  selectedFilterSchoolYear
}: {
  sections: Section[],
  subjects: Subject[],
  user: UserProfile | null,
  activeSchoolYear?: string,
  selectedFilterSchoolYear?: string
}) {
  const [processing, setProcessing] = useState(false);
  const [isAnySectionFinalized, setIsAnySectionFinalized] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmFinalizePrompt, setConfirmFinalizePrompt] = useState(false);
  const [confirmUnfinalizePrompt, setConfirmUnfinalizePrompt] = useState(false);
  const [requestUnfinalizePrompt, setRequestUnfinalizePrompt] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMainAdmin = user?.email === 'jessiemangabo@gmail.com';
  const isSystemAdmin = user?.role === 'system_admin';

  const targetSchoolYear = selectedFilterSchoolYear || activeSchoolYear;

  // Active sections for the targeted school year
  const targetSections = useMemo(() => {
    return sections.filter(section => {
      const effectiveYear = targetSchoolYear;
      if (effectiveYear && effectiveYear !== 'all') {
        if (effectiveYear === 'No School Year') {
          return !section.schoolYear || section.schoolYear.trim() === '';
        }
        return section.schoolYear === effectiveYear;
      }
      return true;
    });
  }, [sections, targetSchoolYear]);

  // Check if any student in any of these target sections has a finalized status (Promoted or Retained)
  useEffect(() => {
    if (targetSections.length === 0) {
      setIsAnySectionFinalized(false);
      return;
    }

    let isSubscribed = true;
    setChecking(true);

    const checkStatus = async () => {
      try {
        let foundFinalized = false;
        // Check target sections to see if any have finalized students
        for (const sec of targetSections) {
          const q = query(
            collection(db, `sections/${sec.id}/students`),
            where("status", "in", ["Promoted", "Retained"]),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            foundFinalized = true;
            break;
          }
        }
        if (isSubscribed) {
          setIsAnySectionFinalized(foundFinalized);
        }
      } catch (err) {
        console.error("Error checking query finalized status:", err);
      } finally {
        if (isSubscribed) {
          setChecking(false);
        }
      }
    };

    checkStatus();

    return () => {
      isSubscribed = false;
    };
  }, [targetSections]);

  const relevantSubjects = useMemo(() => {
    const targetSectionIds = new Set(targetSections.map(s => s.id));
    return subjects.filter(sub => targetSectionIds.has(sub.sectionId));
  }, [targetSections, subjects]);

  const isAllSubjectsTermsFinalized = useMemo(() => {
    if (targetSections.length === 0 || relevantSubjects.length === 0) return false;
    return relevantSubjects.every(subj => {
      const offered = subj.offeredTerms && subj.offeredTerms.length > 0 ? subj.offeredTerms : ([1, 2, 3, 4] as TermNumber[]);
      return offered.every(t => subj.finalizedTerms?.includes(t));
    });
  }, [targetSections, relevantSubjects]);

  const unfinalizedSectionsSubjectsAndTerms = useMemo(() => {
    if (isAnySectionFinalized) return [];
    const sectionMap = new Map<string, string>(targetSections.map(s => [s.id, s.name] as [string, string]));

    const list: { sectionName: string; subjectName: string; terms: TermNumber[] }[] = [];
    relevantSubjects.forEach(subj => {
      const offered = subj.offeredTerms && subj.offeredTerms.length > 0 ? subj.offeredTerms : ([1, 2, 3, 4] as TermNumber[]);
      const pending = offered.filter(t => !subj.finalizedTerms?.includes(t));
      if (pending.length > 0) {
        list.push({ 
          sectionName: sectionMap.get(subj.sectionId) || "Unknown", 
          subjectName: subj.name, 
          terms: pending 
        });
      }
    });
    return list;
  }, [targetSections, relevantSubjects, isAnySectionFinalized]);

  const pendingByTerm = useMemo(() => {
    const termGroups: Record<number, { id: string; sectionName: string; subjectName: string; teacherEmail?: string }[]> = {
      1: [],
      2: [],
      3: [],
      4: []
    };

    if (isAnySectionFinalized) return termGroups;
    const sectionMap = new Map<string, string>(targetSections.map(s => [s.id, s.name] as [string, string]));

    relevantSubjects.forEach(subj => {
      const offered = subj.offeredTerms && subj.offeredTerms.length > 0 ? subj.offeredTerms : ([1, 2, 3, 4] as TermNumber[]);
      offered.forEach(t => {
        if (!subj.finalizedTerms?.includes(t)) {
          termGroups[t].push({
            id: subj.id,
            sectionName: sectionMap.get(subj.sectionId) || "Unknown",
            subjectName: subj.name,
            teacherEmail: subj.teacherEmail
          });
        }
      });
    });

    return termGroups;
  }, [targetSections, relevantSubjects, isAnySectionFinalized]);

  if (targetSections.length === 0 || relevantSubjects.length === 0) {
    return null;
  }

  const handleFinalizeAll = async () => {
    if (processing) return;
    setConfirmFinalizePrompt(true);
  };

  const executeFinalizeAll = async () => {
    setConfirmFinalizePrompt(false);
    setProcessing(true);
    try {
      for (const section of targetSections) {
        const sectionSubjects = subjects.filter(s => s.sectionId === section.id);
        const studentSnap = await getDocs(collection(db, `sections/${section.id}/students`));
        const sectionStudents = studentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));

        const activeStudents = sectionStudents.filter(s => s.status === 'Active' || !s.status);
        const updatePromises = activeStudents.map(student => {
          let totalWeightedFinals = 0;
          let totalUnits = 0;
          sectionSubjects.forEach(subj => {
            const termsPassed = (subj.offeredTerms || [1, 2, 3, 4])
              .map(t => calculateGrade(student, subj, t as TermNumber).final)
              .filter(f => f > 0);
            if (termsPassed.length > 0) {
              const finalRating = Math.round(termsPassed.reduce((a, b) => a + b, 0) / termsPassed.length);
              const u = (subj.unit !== undefined && subj.unit !== null && subj.unit > 0) ? subj.unit : 1.0;
              totalWeightedFinals += finalRating * u;
              totalUnits += u;
            }
          });

          let finalStatus = 'Retained';
          if (totalUnits > 0) {
            const genAvg = Math.round(totalWeightedFinals / totalUnits);
            finalStatus = genAvg >= 75 ? 'Promoted' : 'Retained';
          }
          return updateDoc(doc(db, `sections/${section.id}/students`, student.id), {
            status: finalStatus
          });
        });

        await Promise.all(updatePromises);
        await updateDoc(doc(db, 'sections', section.id), { isFinalized: true });
      }
      setIsAnySectionFinalized(true);
      setSuccessMessage("Successfully finalized the school grading system for all sections in this school year!");
    } catch (error) {
      console.error("Error finalising all sections:", error);
      setSuccessMessage("An error occurred during finalization.");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnfinalizeAll = async () => {
    if (processing) return;
    if (isMainAdmin) {
      setConfirmUnfinalizePrompt(true);
    } else {
      setRequestUnfinalizePrompt(true);
    }
  };

  const submitUnfinalizeRequest = async () => {
    setRequestUnfinalizePrompt(false);
    setProcessing(true);
    try {
      const docRef = doc(db, 'settings', 'general');
      const syToRequest = targetSchoolYear || 'active';
      await updateDoc(docRef, {
        unfinalizeRequests: arrayUnion({
          schoolYear: syToRequest,
          requestedBy: user?.email,
          timestamp: new Date().toISOString()
        })
      });
      setSuccessMessage("Your request to unfinalize the school year has been sent to the Main Admin for approval.");
    } catch (error) {
      console.error("Error sending request:", error);
      setSuccessMessage("Failed to send request.");
    } finally {
      setProcessing(false);
    }
  };

  const executeUnfinalizeAll = async () => {
    setConfirmUnfinalizePrompt(false);
    setProcessing(true);
    try {
      for (const section of targetSections) {
        const studentSnap = await getDocs(collection(db, `sections/${section.id}/students`));
        const sectionStudents = studentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));

        const updatePromises = sectionStudents.map(student => {
          if (student.status === 'Promoted' || student.status === 'Retained') {
            return updateDoc(doc(db, `sections/${section.id}/students`, student.id), {
              status: deleteField()
            });
          }
          return Promise.resolve();
        });

        await Promise.all(updatePromises);
        await updateDoc(doc(db, 'sections', section.id), { isFinalized: false });
      }
      setIsAnySectionFinalized(false);
      setSuccessMessage("Successfully unfinalized school grading system for all sections in this school year.");
    } catch (error) {
      console.error("Error unfinalising all sections:", error);
      setSuccessMessage("An error occurred during unfinalization.");
    } finally {
      setProcessing(false);
    }
  };

  if (user?.role !== 'system_admin' && user?.role !== 'admin') return null;
  if (targetSections.length === 0) return null;

  if (isAnySectionFinalized) {
    return (
      <div className="mb-6 p-5 bg-indigo-50 border border-indigo-200 rounded-3xl animate-in fade-in slide-in-from-top-3 duration-300 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/40 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-white/60 transition-colors pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-200 shadow-sm">
              <Sparkles size={22} className="text-indigo-600 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-950 text-base leading-tight">School Year Finalized ({targetSchoolYear})</h4>
              <p className="text-xs font-semibold text-indigo-700/80 mt-1 max-w-2xl leading-relaxed">
                The school year grading system is currently finalized. All learner promotion/retention statuses and final end-of-year grades have been successfully calculated and set to read-only.
              </p>
            </div>
          </div>
          <button 
            onClick={handleUnfinalizeAll}
            disabled={processing}
            className="shrink-0 bg-white border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors"
          >
            Unfinalize School Year
          </button>
        </div>

        <AnimatePresence>
          {confirmUnfinalizePrompt && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-amber-100 text-amber-600">
                  <AlertTriangle size={32} />
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-2">Unfinalize Grades?</h3>
                
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  Are you sure you want to revert finalization for all sections under {targetSchoolYear || 'active'} school year? This will reset the promotion and retention statuses for all learners.
                </p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setConfirmUnfinalizePrompt(false)}
                    className="flex-1 py-3 bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeUnfinalizeAll}
                    disabled={processing}
                    className="flex-1 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                  >
                    Yes, Unfinalize
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {requestUnfinalizePrompt && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-indigo-100 text-indigo-600">
                  <AlertTriangle size={32} />
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-2">Request School Year Unfinalization?</h3>
                
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  You do not have direct permission to unfinalize school years. Clicking "Send Request" will notify the Main Admin (jessiemangabo@gmail.com) to unfinalize the {targetSchoolYear || 'active'} school year.
                </p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setRequestUnfinalizePrompt(false)}
                    className="flex-1 py-3 bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitUnfinalizeRequest}
                    disabled={processing}
                    className="flex-1 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                  >
                    Send Request
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {successMessage && (
            <div className="fixed bottom-6 right-6 z-[200]">
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 20 }}
                 className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl shadow-lg border border-emerald-200 font-medium text-sm flex items-center gap-3"
               >
                 <CheckCircle size={18} className="text-emerald-500" />
                 {successMessage}
                 <button onClick={() => setSuccessMessage(null)} className="ml-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-1 rounded-md transition-colors"><X size={14} /></button>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }



  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-250 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-emerald-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-emerald-600 mt-0.5 animate-bounce" />
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] mb-1 text-emerald-900">Finalize School Year</h4>
            <p className="text-xs font-medium text-emerald-700">You can finalize the entire active school year to lock all student records, stop edits and deletes, and finalize all statuses.</p>
          </div>
        </div>
        <button 
          onClick={handleFinalizeAll}
          disabled={processing || !isSystemAdmin}
          className="self-start sm:self-auto shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all uppercase tracking-wider shadow-md shadow-emerald-600/15 cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          {processing ? (
            <Sparkles size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          Finalize School Year
        </button>
      </div>

      <AnimatePresence>
        {confirmFinalizePrompt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-emerald-100 text-emerald-600">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-2">Finalize All Sections?</h3>
              
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Are you sure you want to finalize all sections for {targetSchoolYear || 'active'} school year? This will compute all status automatically and prevent any edits or deletions.
              </p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmFinalizePrompt(false)}
                  className="flex-1 py-3 bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeFinalizeAll}
                  disabled={processing}
                  className="flex-1 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                >
                  Finalize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatementOfAccountView({ 
  activeSchool, 
  teacherCount, 
  onBack,
  onRenew,
  userProfile
}: { 
  activeSchool: any, 
  teacherCount: number, 
  onBack: () => void,
  onRenew?: (yearIndex: number) => Promise<void>,
  userProfile?: any
}) {
  const [renewingYearIdx, setRenewingYearIdx] = useState<number | null>(null);
  const schoolCreatedAt = activeSchool?.createdAt || new Date().toISOString();
  const createdDate = new Date(schoolCreatedAt);

  const ledger = useMemo(() => {
    const rows = [];
    let grossTotal = 0;
    let promoDiscountTotal = 0;
    let netTotal = 0;
    let amountPaid = 0;
    let currentBalance = 0;

    // Resolve expiration source of truth:
    const finalExpiresAtStr = activeSchool?.expiresAt;
    const expirationDate = finalExpiresAtStr 
      ? new Date(finalExpiresAtStr)
      : new Date(new Date(createdDate).setFullYear(createdDate.getFullYear() + 1));

    // Year 1 (Trial Year) ALWAYS spans from createdDate to 1 year later (or expiration date if shorter)
    const firstYearEnd = new Date(createdDate);
    firstYearEnd.setFullYear(createdDate.getFullYear() + 1);
    
    let currentYearIndex = 1;
    let currentStart = new Date(createdDate);
    let currentEnd = new Date(firstYearEnd);

    // Adjust Year 1 end if expiration is sooner
    if (expirationDate <= firstYearEnd) {
      currentEnd = new Date(expirationDate);
    }

    while (true) {
      const yearIndex = currentYearIndex;
      const start = new Date(currentStart);
      const end = new Date(currentEnd);

      const periodStr = `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      
      const count = teacherCount || 0;
      let category = 'Small';
      let fee = 599;

      if (count <= 9) {
        category = 'Small';
        fee = 599;
      } else if (count <= 25) {
        category = 'Medium';
        fee = 1199;
      } else if (count <= 100) {
        category = 'Large';
        fee = 2499;
      } else {
        category = 'Mega';
        fee = 4999;
      }

      const isFirstYear = yearIndex === 1;
      const discount = isFirstYear ? fee : 0;
      const netFee = isFirstYear ? 0 : fee;

      // The year is Paid/Settled if it is Year 1 OR if its end date is <= the expirationDate
      const isPaid = isFirstYear || 
                     (end.getTime() <= expirationDate.getTime() + 10000) || 
                     (activeSchool?.paidYears && activeSchool.paidYears.includes(yearIndex));

      const isCurrentSubscriptionExpired = new Date() > expirationDate;

      if (!isPaid && !isCurrentSubscriptionExpired && yearIndex >= 2) {
        break;
      }

      grossTotal += fee;
      promoDiscountTotal += discount;
      netTotal += netFee;

      if (isPaid) {
        amountPaid += netFee;
      } else {
        currentBalance += netFee;
      }

      rows.push({
        yearIndex,
        schoolYearStr: `${start.getFullYear()}-${end.getFullYear()}`,
        periodStr,
        category,
        count,
        fee,
        discount,
        netFee,
        isFirstYear,
        isPaid
      });

      // Break condition: We stop looping once we have generated a year that is unpaid/pending (the succeeding year)
      // or if we have at least shown Year 2.
      if (!isPaid && yearIndex >= 2) {
        break;
      }

      // Prepare for next year
      currentYearIndex++;
      currentStart = new Date(currentEnd);
      
      // If the current year's end is before expirationDate, the next year should extend up to expirationDate
      if (currentEnd < expirationDate) {
        currentEnd = new Date(expirationDate);
      } else {
        const nextEnd = new Date(currentEnd);
        nextEnd.setFullYear(currentEnd.getFullYear() + 1);
        currentEnd = nextEnd;
      }
    }

    return {
      rows,
      grossTotal,
      promoDiscountTotal,
      netTotal,
      amountPaid,
      currentBalance,
      isExpired: new Date() > expirationDate,
      expirationDate
    };
  }, [createdDate, teacherCount, activeSchool, userProfile]);

  const handleExportExcel = () => {
    const ws_data: any[][] = [];

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const cellStyle = {
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    const boldCellStyle = {
      font: { bold: true },
      border: cellStyle.border
    };
    
    ws_data.push([{ v: "Statement of Account", s: { font: { bold: true, sz: 16 } } }]);
    ws_data.push([{ v: `SOA Reference: CLASS-SOA-${activeSchool?.schoolId || 'NEW'}-${new Date().getFullYear()}` }]);
    ws_data.push([{ v: `School: ${activeSchool?.name || 'N/A'}` }]);
    ws_data.push([{ v: `School ID: ${activeSchool?.schoolId || 'N/A'}` }]);
    ws_data.push([{ v: `Date Issued: ${new Date().toLocaleDateString()}` }]);
    ws_data.push([]);
    
    ws_data.push([
      { v: "Coverage Period", s: headerStyle },
      { v: "Licensing Tier", s: headerStyle },
      { v: "Teachers Count", s: headerStyle },
      { v: "Base Rate", s: headerStyle },
      { v: "Promos / Discounts", s: headerStyle },
      { v: "Net Subscription Fee", s: headerStyle },
      { v: "Payment Status", s: headerStyle }
    ]);
    
    ledger.rows.forEach(row => {
      ws_data.push([
        { v: `Year ${row.yearIndex} (${row.schoolYearStr})\n${row.periodStr}`, s: cellStyle },
        { v: row.category, s: cellStyle },
        { v: teacherCount, s: cellStyle },
        { v: row.fee, t: "n", z: "â‚±#,##0.00", s: cellStyle },
        { v: row.discount > 0 ? -row.discount : 0, t: "n", z: "â‚±#,##0.00", s: cellStyle },
        { v: row.netFee, t: "n", z: "â‚±#,##0.00", s: cellStyle },
        { v: row.isPaid ? 'PAID' : 'UNPAID', s: cellStyle }
      ]);
    });
    
    ws_data.push([]);
    ws_data.push(["", "", "", "", { v: "Total Subscription Price:", s: boldCellStyle }, { v: ledger.netTotal, t: "n", z: "â‚±#,##0.00", s: boldCellStyle }]);
    ws_data.push(["", "", "", "", { v: "Amount Paid:", s: boldCellStyle }, { v: ledger.amountPaid, t: "n", z: "â‚±#,##0.00", s: boldCellStyle }]);
    ws_data.push(["", "", "", "", { v: "Action Required / Balance due:", s: boldCellStyle }, { v: ledger.currentBalance, t: "n", z: "â‚±#,##0.00", s: boldCellStyle }]);
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    ws['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement of Account");
    
    XLSX.writeFile(wb, `SOA_${activeSchool?.schoolId || 'NEW'}_${new Date().getFullYear()}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Back & Actions - Hidden during print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold text-sm bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Active Sections
        </button>
        
        <div className="flex items-center gap-3 font-mono">
          <button 
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 text-emerald-750 hover:text-emerald-900 font-bold text-xs bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer"
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Main Print Wrapper */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden print:overflow-hidden print:border-0 print:shadow-none print:rounded-none">
        
        {/* Top Header Decors / Corporate Ribbon (hidden in print) */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 h-2.5 print:hidden"></div>

        {/* Invoice Structure */}
        <div className="p-8 md:p-12 space-y-10">
          
          {/* Brand & Metas */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black tracking-tighter shadow-md">
                  <span className="text-lg font-sans">E</span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">CLASS Enterprise Solution</h2>
                  <p className="text-[10px] text-indigo-600 font-black tracking-widest uppercase">Class Record Solutions</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Real-Time Cloud Ledger & Continuous Gradebook Integration Service
              </p>
            </div>
            
            <div className="md:text-right space-y-1 font-mono text-xs text-slate-500">
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider block w-fit md:ml-auto mb-2 print:border print:border-indigo-100 print:text-indigo-900">
                Statement of Account
              </span>
              <p><span className="font-semibold text-slate-800">SOA Reference:</span> CLASS-SOA-{activeSchool?.schoolId || 'NEW'}-{new Date().getFullYear()}</p>
              <p><span className="font-semibold text-slate-800">Date Issued:</span> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p><span className="font-semibold text-slate-800">Valid Until:</span> {ledger.expirationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p><span className="font-semibold text-slate-800">Status:</span> 
                {ledger.isExpired ? (
                  <span className="text-rose-600 font-extrabold uppercase ml-1 bg-rose-50 px-1 rounded">Expired Account</span>
                ) : (
                  <span className="text-emerald-700 font-extrabold uppercase ml-1">Active Account</span>
                )}
              </p>
            </div>
          </div>

          {/* Parties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statement For:</h3>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{activeSchool?.name || 'Authorized DepEd School'}</p>
                <p className="text-xs text-slate-500 font-semibold">School ID: <span className="font-mono">{activeSchool?.schoolId || 'N/A'}</span></p>
                {activeSchool?.headOfSchool && <p className="text-xs text-slate-500">Head of School: <span className="font-semibold">{activeSchool.headOfSchool}</span></p>}
                <p className="text-xs text-slate-400">
                  {activeSchool?.division} Division {activeSchool?.district && `â€¢ ${activeSchool.district}`} â€¢ {activeSchool?.region || 'DepEd'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Issued By:</h3>
              <div className="space-y-1 text-slate-600 text-xs">
                <p className="text-sm font-bold text-slate-900">CLASS Enterprise Solution</p>
                <p>Support & Accounts Desk</p>
                <p>Email: <span className="font-mono">jessiemangabo@gmail.com</span></p>
                <p>Hotline: <span className="font-mono">0905 152 6827</span></p>
                <p className="text-[10px] text-slate-400 italic">Enterprise Cloud Invoicing Division</p>
              </div>
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt size={16} className="text-indigo-600 animate-pulse" />
              Annual Subscription History & Breakdown
            </h3>
            
            <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4">Subscription Year</th>
                    <th className="px-6 py-4">Coverage Period</th>
                    <th className="px-6 py-4">Licensing Tier</th>
                    <th className="px-6 py-4">Teachers Count</th>
                    <th className="px-6 py-4 text-right">Base rate</th>
                    <th className="px-6 py-4 text-right">Promos / Discounts</th>
                    <th className="px-6 py-4 text-right">Net annual Fee</th>
                    <th className="px-6 py-4 text-right print:hidden">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {ledger.rows.map((row) => (
                    <tr key={row.yearIndex} className={row.yearIndex === 2 ? 'bg-indigo-50/25 border-l-2 border-indigo-500' : ''}>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">Year {row.yearIndex} Subscription</p>
                          <p className="text-[9px] text-slate-400 font-mono">SY {row.schoolYearStr}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-[11px] font-mono">
                        {row.periodStr}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          {row.category} Tier
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {row.count} active {row.count === 1 ? 'teacher' : 'teachers'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">
                        â‚±{row.fee.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-600">
                        {row.isFirstYear ? (
                          <span>-â‚±{row.discount.toLocaleString()} (100% Promo)</span>
                        ) : (
                          <span className="text-slate-400">â‚±0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold font-mono text-slate-900">
                        {row.isFirstYear ? (
                          <span className="text-emerald-600 font-extrabold">â‚±0 (Free Promo)</span>
                        ) : (
                          <span>â‚±{row.netFee.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right print:hidden">
                        {row.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-750 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-150 text-[10px] font-extrabold uppercase">
                            <CheckCircle size={12} className="text-emerald-600" /> Paid & Settled
                          </span>
                        ) : (
                          <button
                            id={`pay-btn-year-${row.yearIndex}`}
                            onClick={async () => {
                              try {
                                setRenewingYearIdx(row.yearIndex);
                                if (onRenew) {
                                  await onRenew(row.yearIndex);
                                }
                              } catch (err) {
                                console.error("Error during renewal: ", err);
                              } finally {
                                setRenewingYearIdx(null);
                              }
                            }}
                            disabled={renewingYearIdx !== null}
                            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-750 disabled:bg-slate-300 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 text-center uppercase"
                          >
                            {renewingYearIdx === row.yearIndex ? (
                              <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : null}
                            PAID
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* totals calculation box */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-4">
            <div className="space-y-3 max-w-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Account Settlement Policy</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                ðŸ”’ Subscription Year 1 (First 12 Months) introductory access is 100% sponsored under the trial program promotion.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Subsequent renewals (Year 2 onwards) are calculated in real-time according to total registered educator profiles active on the roster. No credit check or upfront collateral required.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 w-full md:w-80 space-y-3 font-mono text-xs print:bg-white">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 font-sans">Payment Summary</h4>
              
              <div className="flex justify-between text-slate-500">
                <span>Total Base Value:</span>
                <span>â‚±{ledger.grossTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Promo Discounts:</span>
                <span>-â‚±{ledger.promoDiscountTotal.toLocaleString()}</span>
              </div>
              
              <div className="w-full h-px bg-slate-200 my-2"></div>
              
              <div className="flex justify-between text-slate-900 font-bold text-sm">
                <span className="font-sans">Total Subscription Price:</span>
                <span>â‚±{ledger.netTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-indigo-600 font-bold">
                <span>Amount Paid:</span>
                <span>-â‚±{ledger.amountPaid.toLocaleString()}</span>
              </div>

              <div className="w-full h-px bg-slate-200 my-2"></div>

              <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-dashed border-slate-300">
                <span className="font-sans">Current Balance:</span>
                <span className="text-indigo-600">â‚±{ledger.currentBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment execution details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Option 1: GCash Transfer</span>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Send payment to GCash Merchant ID: <strong className="font-mono text-slate-800">0905 152 6827</strong><br/>
                Quote reference: <strong className="font-mono text-slate-800">{activeSchool?.schoolId}</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Option 2: Bank transfer</span>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Land Bank of the Philippines (LBP)<br/>
                Account Name: <strong className="text-slate-800">Jessie J. Mangabo</strong><br/>
                Account Number: <strong className="font-mono text-slate-800">107 640 6444</strong>
              </p>
            </div>
          </div>

          {/* Final signatures */}
          <div className="flex justify-between items-end pt-12 border-t border-slate-100 text-xs">
            <div className="space-y-1">
              <p className="text-slate-400 font-medium">Prepared by:</p>
              <div className="w-40 h-px bg-slate-300 my-2"></div>
              <p className="font-bold text-slate-800">Enterprise Billing Desk</p>
              <p className="text-[10px] text-slate-400 font-mono">ID: CLASS-78904</p>
            </div>

            <div className="space-y-1 text-right">
              <p className="text-slate-400 font-medium">Verified For Authorization:</p>
              <div className="w-40 h-px bg-slate-300 my-2 ml-auto"></div>
              <p className="font-bold text-slate-800">{activeSchool?.headOfSchool || 'School Administrator'}</p>
              <p className="text-[10px] text-slate-400">Head / Principal Representative</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SectionsView({ 
  sections, 
  expiredSchoolIds = [],
  onOpenThemeModal,
  onSelect, 
  onCreate,
  onUpdate,
  onDelete,
  onSelectSubject,
  onSetActiveTab,
  onNavigateToSubject,
  user,
  onUpdateUser,
  onLogout,
  onManageUsers,
  onScanID,
  pendingUsersCount = 0,
  isAnySectionAdviser,
  onManageSchools,
  onManageSchoolYears,
  onManageCalendar,
  onManageStudentList,
  onShowFinancialStatement,
  onShowSF4,
  onShowSF7,
  isAuthorizedCashier,
  onShowFeedback,
  isFeedbackOpen,
  onCloseFeedback,
  onShowFeedbackDashboard,
  globalSettings,
  subjects,
  globalSubjects,
  schoolCalendar,
  onToggleFinalizeSubjectTerm,
  activeSchool = null,
  teacherCount = 0,
  onRenew,
  aralSchoolInfo,
  onUpdateAralSchool,
  aralCompetencies,
  onAddAralCompetency,
  onDeleteAralCompetency,
  mapUserRoleToAralRole,
  aralClasses = [],
  onCreateAralClass,
  onUpdateAralClass,
  onDeleteAralClass,
  selectedAralClassId,
  onSelectAralClassId
}: { 
  sections: Section[], 
  expiredSchoolIds?: string[],
  onOpenThemeModal?: () => void,
  onSelect: (s: Section) => void,
  onCreate: (data: any) => void,
  onUpdate: (id: string, data: any) => void,
  onDelete: (id: string, action?: 'approve' | 'disapprove' | 'cancel' | 'request' | 'delete', reason?: string) => void,
  onSelectSubject: (id: string) => void,
  onSetActiveTab: (tab: string) => void,
  onNavigateToSubject: (s: Section, subName: string) => void,
  user: UserProfile | null,
  onUpdateUser?: (p: UserProfile) => void,
  onLogout: () => void,
  onManageUsers?: () => void,
  onScanID?: () => void,
  pendingUsersCount?: number,
  isAnySectionAdviser?: boolean,
  onManageSchools?: () => void,
  onManageSchoolYears?: () => void,
  onManageCalendar?: () => void,
  onManageStudentList?: () => void,
  onShowFinancialStatement?: () => void,
  onShowSF4?: () => void,
  onShowSF7?: () => void,
  isAuthorizedCashier?: boolean,
  onShowFeedback: () => void,
  isFeedbackOpen: boolean,
  onCloseFeedback: () => void,
  onShowFeedbackDashboard?: () => void,
  globalSettings?: any,
  subjects: Subject[],
  globalSubjects?: Subject[],
  schoolCalendar: any[],
  onToggleFinalizeSubjectTerm?: (subjectId: string, term: TermNumber, finalize: boolean) => void,
  activeSchool?: any,
  teacherCount?: number,
  onRenew?: (yearIndex: number) => Promise<void>,
  aralSchoolInfo: AralSchoolInfo,
  onUpdateAralSchool: (info: AralSchoolInfo) => void,
  aralCompetencies: AralCompetency[],
  onAddAralCompetency: (comp: AralCompetency) => void,
  onDeleteAralCompetency: (id: string) => void,
  mapUserRoleToAralRole: (role?: string, email?: string) => AralRole,
  aralClasses?: AralClass[],
  onCreateAralClass?: (gradeLevel: number, name: string, tutorName: string, tutorEmail: string, studentIds: string[], targetSubject?: string) => void,
  onUpdateAralClass?: (classId: string, tutorName: string, tutorEmail: string, studentIds: string[], targetSubject?: string, name?: string, gradeLevel?: number) => void,
  onDeleteAralClass?: (classId: string) => void,
  selectedAralClassId?: string | null,
  onSelectAralClassId?: (classId: string | null) => void
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(true);
  const [showSOA, setShowSOA] = useState(false);
  const [isBannerPaying, setIsBannerPaying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [isSectionEmpty, setIsSectionEmpty] = useState<boolean | null>(null);
  const [sectionToEdit, setSectionToEdit] = useState<Section | null>(null);
  const [disapprovalReason, setDisapprovalReason] = useState("");
  const [requestDeletionReason, setRequestDeletionReason] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [confirmFinalizeConfig, setConfirmFinalizeConfig] = useState<{ subjectId: string, term: number, finalize: boolean } | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [collapsedAdminGrades, setCollapsedAdminGrades] = useState<Set<number>>(new Set());
  const [openAdminMenu, setOpenAdminMenu] = useState<string | null>(null);

  const hasAssignedSubjects = useMemo(() => {
    return subjects.some(s => (s.teacherEmail || "").toLowerCase() === (user?.email || "").toLowerCase()) ||
           sections.some(sec => sec.teacherSubjects && Object.values(sec.teacherSubjects).map((e: any) => (e || "").toLowerCase()).includes((user?.email || "").toLowerCase()));
  }, [subjects, sections, user]);

  const adminGroupedOverview = useMemo(() => {
    const groups: {
      [gradeLevel: number]: {
        [sectionId: string]: {
          sectionName: string;
          sectionObj: Section | undefined;
          subjects: Subject[];
        }
      }
    } = {};

    subjects.forEach(sub => {
      const sectionObj = sections.find(s => s.id === sub.sectionId);
      let gradeLevel = sub.gradeLevel;
      let sectionId = sub.sectionId || 'unknown';
      let sectionName = 'Unassigned Section';

      if (sectionObj) {
        gradeLevel = sectionObj.gradeLevel;
        sectionName = sectionObj.name;
      }

      if (!groups[gradeLevel]) {
        groups[gradeLevel] = {};
      }

      if (!groups[gradeLevel][sectionId]) {
        groups[gradeLevel][sectionId] = {
          sectionName,
          sectionObj,
          subjects: []
        };
      }

      groups[gradeLevel][sectionId].subjects.push(sub);
    });

    return groups;
  }, [subjects, sections]);

  const adminSortedGradeLevels = useMemo(() => {
    return Object.keys(adminGroupedOverview).map(Number).sort((a, b) => a - b);
  }, [adminGroupedOverview]);

  const [isListOpen, setIsListOpen] = useState(true);
  
  const [isSchoolDbFinalized, setIsSchoolDbFinalized] = useState(false);

  const [isUploadingDashboard, setIsUploadingDashboard] = useState(false);

  const downloadDashboardCSVTemplate = () => {
    const headers = "LastName,FirstName,MiddleName,NameExt,LRN,Email,Birthdate,Age,Sex,GradeLevel,Section,DateOfFirstAttendance,Weight_kg,Height_cm,EligibilityType,GenAvg,Citation,ElemSchoolName,ElemSchoolId,ElemSchoolAddress,PEPTRating,PEPTDate,ALSRating,ALSCenterInfo,OthersSpecify,IsTransferredIn,Birthplace,HomeAddress,PrimaryContact,FatherName,MotherName,GuardianName,GuardianRelationship,ContactNumber";
    const example1 = "Dela Cruz,Juan,,Jr,123456789012,juan.delacruz@email.com,2010-01-15,12,Male,7,Einstein,2023-06-05,45,150,Elementary School Completer,85.50,,,Rizal Elem School,123456,,,,,,No,Manila,123 Rizal St. Manila,father,Juan Dela Cruz Sr.,Maria Dela Cruz,,,09123456789";
    const example2 = "Santos,Maria,G,,987654321098,maria.santos@email.com,2011-03-20,11,Female,7,Einstein,2023-06-05,42,148,PEPT Passer.,,,,,,,80.20,2022-05-15,,,,Yes,Quezon City,456 Quezon Ave. QC,mother,Pedro Santos,Maria Santos,,,09876543210";
    const csvContent = `${headers}\n${example1}\n${example2}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "bulk_enrollment_dashboard_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const [uploadSuccessDashboard, setUploadSuccessDashboard] = useState(false);
  const [pendingLearnersDashboard, setPendingLearnersDashboard] = useState<any[]>([]);
  const [showSelectionModalDashboard, setShowSelectionModalDashboard] = useState(false);
  const [selectedIndicesDashboard, setSelectedIndicesDashboard] = useState<Set<number>>(new Set());
  const [bulkFirstAttendanceDateDashboard, setBulkFirstAttendanceDateDashboard] = useState("");

  const handleDashboardFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDashboard(true);
    setUploadSuccessDashboard(false);
    
    const reader = new window.FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const learners: any[] = [];

      // Determine helper mappings
      let lastNameColIdx = 0;
      let firstNameColIdx = 1;
      let middleNameColIdx = 2;
      let extensionColIdx = 3;
      let lrnColIdx = 4;
      let emailColIdx = 5;
      let birthdateColIdx = 6;
      let ageColIdx = 7;
      let sexColIdx = 8;
      let gradeLevelColIdx = -1;
      let sectionColIdx = -1;
      let dateColIdx = 9;
      let weightColIdx = 10;
      let heightColIdx = 11;
      let eligibilityTypeColIdx = 12;
      let genAvgColIdx = 13;
      let citationColIdx = 14;
      let elemSchoolNameColIdx = 15;
      let elemSchoolIdColIdx = 16;
      let elemSchoolAddressColIdx = 17;
      let peptRatingColIdx = 18;
      let peptDateColIdx = 19;
      let alsRatingColIdx = 20;
      let alsCenterInfoColIdx = 21;
      let othersSpecifyColIdx = 22;

      let isTransferredInColIdx = -1;
      let birthplaceColIdx = -1;
      let homeAddressColIdx = -1;
      let primaryContactColIdx = -1;
      let fatherNameColIdx = -1;
      let motherNameColIdx = -1;
      let guardianNameColIdx = -1;
      let guardianRelationshipColIdx = -1;
      let contactNumberColIdx = -1;

      const firstLine = lines[0];
      if (firstLine && (firstLine.toLowerCase().includes('lastname') || firstLine.toLowerCase().includes('lrn') || firstLine.toLowerCase().includes('name'))) {
        const headerParts: string[] = [];
        let p = '', inQuote = false;
        for (let i = 0; i < firstLine.length; i++) {
          let c = firstLine[i];
          if (c === '"' && firstLine[i+1] === '"') {
            p += '"'; i++;
          } else if (c === '"') {
            inQuote = !inQuote;
          } else if (c === ',' && !inQuote) {
            headerParts.push(p.trim().toLowerCase()); p = '';
          } else {
            p += c;
          }
        }
        headerParts.push(p.trim().toLowerCase());

        lastNameColIdx = headerParts.indexOf("lastname");
        firstNameColIdx = headerParts.indexOf("firstname");
        middleNameColIdx = headerParts.indexOf("middlename");
        extensionColIdx = headerParts.indexOf("nameext");
        if (extensionColIdx === -1) extensionColIdx = headerParts.indexOf("ext");
        if (extensionColIdx === -1) extensionColIdx = headerParts.indexOf("extension");
        lrnColIdx = headerParts.indexOf("lrn");
        emailColIdx = headerParts.indexOf("email");
        birthdateColIdx = headerParts.indexOf("birthdate");
        ageColIdx = headerParts.indexOf("age");
        sexColIdx = headerParts.indexOf("sex");
        gradeLevelColIdx = headerParts.indexOf("gradelevel");
        sectionColIdx = headerParts.indexOf("section");
        dateColIdx = headerParts.indexOf("dateoffirstattendance");
        weightColIdx = headerParts.indexOf("weight_kg");
        if (weightColIdx === -1) weightColIdx = headerParts.indexOf("weight");
        heightColIdx = headerParts.indexOf("height_cm");
        if (heightColIdx === -1) heightColIdx = headerParts.indexOf("height");
        eligibilityTypeColIdx = headerParts.indexOf("eligibilitytype");
        genAvgColIdx = headerParts.indexOf("genavg");
        citationColIdx = headerParts.indexOf("citation");
        elemSchoolNameColIdx = headerParts.indexOf("elemschoolname");
        elemSchoolIdColIdx = headerParts.indexOf("elemschoolid");
        elemSchoolAddressColIdx = headerParts.indexOf("elemschooladdress");
        peptRatingColIdx = headerParts.indexOf("peptrating");
        peptDateColIdx = headerParts.indexOf("peptdate");
        alsRatingColIdx = headerParts.indexOf("alsrating");
        alsCenterInfoColIdx = headerParts.indexOf("alscenterinfo");
        othersSpecifyColIdx = headerParts.indexOf("othersspecify");

        isTransferredInColIdx = headerParts.indexOf("istransferredin");
        birthplaceColIdx = headerParts.indexOf("birthplace");
        homeAddressColIdx = headerParts.indexOf("homeaddress");
        if (homeAddressColIdx === -1) homeAddressColIdx = headerParts.indexOf("address");
        primaryContactColIdx = headerParts.indexOf("primarycontact");
        fatherNameColIdx = headerParts.indexOf("fathername");
        motherNameColIdx = headerParts.indexOf("mothername");
        guardianNameColIdx = headerParts.indexOf("guardianname");
        guardianRelationshipColIdx = headerParts.indexOf("guardianrelationship");
        contactNumberColIdx = headerParts.indexOf("contactnumber");
      }

      // Fallbacks
      if (lastNameColIdx === -1) lastNameColIdx = 0;
      if (firstNameColIdx === -1) firstNameColIdx = 1;
      if (middleNameColIdx === -1) middleNameColIdx = 2;
      if (extensionColIdx === -1) extensionColIdx = 3;
      if (lrnColIdx === -1) lrnColIdx = 4;
      if (emailColIdx === -1) emailColIdx = 5;
      if (birthdateColIdx === -1) birthdateColIdx = 6;
      if (ageColIdx === -1) ageColIdx = 7;
      if (sexColIdx === -1) sexColIdx = 8;

      if (gradeLevelColIdx !== -1 && sectionColIdx !== -1) {
        if (dateColIdx === -1) dateColIdx = 11;
        if (weightColIdx === -1) weightColIdx = 12;
        if (heightColIdx === -1) heightColIdx = 13;
        if (eligibilityTypeColIdx === -1) eligibilityTypeColIdx = 14;
        if (genAvgColIdx === -1) genAvgColIdx = 15;
        if (citationColIdx === -1) citationColIdx = 16;
        if (elemSchoolNameColIdx === -1) elemSchoolNameColIdx = 17;
        if (elemSchoolIdColIdx === -1) elemSchoolIdColIdx = 18;
        if (elemSchoolAddressColIdx === -1) elemSchoolAddressColIdx = 19;
        if (peptRatingColIdx === -1) peptRatingColIdx = 20;
        if (peptDateColIdx === -1) peptDateColIdx = 21;
        if (alsRatingColIdx === -1) alsRatingColIdx = 22;
        if (alsCenterInfoColIdx === -1) alsCenterInfoColIdx = 23;
        if (othersSpecifyColIdx === -1) othersSpecifyColIdx = 24;

        if (isTransferredInColIdx === -1) isTransferredInColIdx = 25;
        if (birthplaceColIdx === -1) birthplaceColIdx = 26;
        if (homeAddressColIdx === -1) homeAddressColIdx = 27;
        if (primaryContactColIdx === -1) primaryContactColIdx = 28;
        if (fatherNameColIdx === -1) fatherNameColIdx = 29;
        if (motherNameColIdx === -1) motherNameColIdx = 30;
        if (guardianNameColIdx === -1) guardianNameColIdx = 31;
        if (guardianRelationshipColIdx === -1) guardianRelationshipColIdx = 32;
        if (contactNumberColIdx === -1) contactNumberColIdx = 33;
      } else {
        if (dateColIdx === -1) dateColIdx = 9;
        if (weightColIdx === -1) weightColIdx = 10;
        if (heightColIdx === -1) heightColIdx = 11;
        if (eligibilityTypeColIdx === -1) eligibilityTypeColIdx = 12;
        if (genAvgColIdx === -1) genAvgColIdx = 13;
        if (citationColIdx === -1) citationColIdx = 14;
        if (elemSchoolNameColIdx === -1) elemSchoolNameColIdx = 15;
        if (elemSchoolIdColIdx === -1) elemSchoolIdColIdx = 16;
        if (elemSchoolAddressColIdx === -1) elemSchoolAddressColIdx = 17;
        if (peptRatingColIdx === -1) peptRatingColIdx = 18;
        if (peptDateColIdx === -1) peptDateColIdx = 19;
        if (alsRatingColIdx === -1) alsRatingColIdx = 20;
        if (alsCenterInfoColIdx === -1) alsCenterInfoColIdx = 21;
        if (othersSpecifyColIdx === -1) othersSpecifyColIdx = 22;

        if (isTransferredInColIdx === -1) isTransferredInColIdx = 23;
        if (birthplaceColIdx === -1) birthplaceColIdx = 24;
        if (homeAddressColIdx === -1) homeAddressColIdx = 25;
        if (primaryContactColIdx === -1) primaryContactColIdx = 26;
        if (fatherNameColIdx === -1) fatherNameColIdx = 27;
        if (motherNameColIdx === -1) motherNameColIdx = 28;
        if (guardianNameColIdx === -1) guardianNameColIdx = 29;
        if (guardianRelationshipColIdx === -1) guardianRelationshipColIdx = 30;
        if (contactNumberColIdx === -1) contactNumberColIdx = 31;
      }

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        
        // Skip header if it matches keywords
        if (index === 0 && (trimmedLine.toLowerCase().includes('name') || trimmedLine.toLowerCase().includes('lrn') || trimmedLine.toLowerCase().includes('lastname'))) return; 
        
        const parts: string[] = [];
        let p = '', inQuote = false;
        for (let i = 0; i < trimmedLine.length; i++) {
          let c = trimmedLine[i];
          if (c === '"' && trimmedLine[i+1] === '"') {
            p += '"'; i++;
          } else if (c === '"') {
            inQuote = !inQuote;
          } else if (c === ',' && !inQuote) {
            parts.push(p.trim()); p = '';
          } else {
            p += c;
          }
        }
        parts.push(p.trim());

        if (parts.length >= 5) {
          const lastName = parts[lastNameColIdx] || "";
          const firstName = parts[firstNameColIdx] || "";
          const middleName = parts[middleNameColIdx] || "";
          const extension = parts[extensionColIdx] || "";
          const lrn = parts[lrnColIdx] || "";
          const email = parts[emailColIdx] || "";
          const birthdate = parts[birthdateColIdx] || "";
          const age = parts[ageColIdx] || "";
          const sexInput = parts[sexColIdx] || "Male";
          const dateInput = parts[dateColIdx] || "";
          const weight = parts[weightColIdx] || "";
          const height = parts[heightColIdx] || "";
          
          const eligibilityTypeRaw = parts[eligibilityTypeColIdx] || "";
          let eligibilityType: 'Elementary School Completer' | 'PEPT Passer' | 'ALS A & E Passer' | 'Others' = 'Elementary School Completer';
          if (eligibilityTypeRaw.toLowerCase().includes('pept')) eligibilityType = 'PEPT Passer';
          else if (eligibilityTypeRaw.toLowerCase().includes('als')) eligibilityType = 'ALS A & E Passer';
          else if (eligibilityTypeRaw.toLowerCase().includes('other')) eligibilityType = 'Others';

          const eligibility = {
            type: eligibilityType,
            genAvg: parts[genAvgColIdx] || "",
            citation: parts[citationColIdx] || "",
            elemSchoolName: parts[elemSchoolNameColIdx] || "",
            elemSchoolId: parts[elemSchoolIdColIdx] || "",
            elemSchoolAddress: parts[elemSchoolAddressColIdx] || "",
            peptRating: parts[peptRatingColIdx] || "",
            peptDate: parts[peptDateColIdx] || "",
            alsRating: parts[alsRatingColIdx] || "",
            alsCenterInfo: parts[alsCenterInfoColIdx] || "",
            othersSpecify: parts[othersSpecifyColIdx] || ""
          };

          const isTransferredInRaw = parts[isTransferredInColIdx] || "";
          const isTransferredIn = isTransferredInRaw.toLowerCase().includes('yes') || isTransferredInRaw.toLowerCase().includes('true') || isTransferredInRaw === '1';
          const birthplace = parts[birthplaceColIdx] || "";
          const address = parts[homeAddressColIdx] || "";
          let primaryContact = (parts[primaryContactColIdx] || "father").toLowerCase();
          if (primaryContact !== 'father' && primaryContact !== 'mother' && primaryContact !== 'guardian') {
            primaryContact = 'father';
          }
          const fatherName = parts[fatherNameColIdx] || "";
          const motherName = parts[motherNameColIdx] || "";
          const guardianName = parts[guardianNameColIdx] || "";
          const guardianRelationship = parts[guardianRelationshipColIdx] || "";
          const contactNumber = parts[contactNumberColIdx] || "";

          // Generate full name automatically
          const nameParts = [
            lastName + (firstName ? "," : ""),
            firstName,
            middleName,
            extension
          ].filter(Boolean);
          const name = nameParts.join(" ").trim();

          if (lastName && firstName && lrn) {
            const { bmi, category } = computeBMI(parseFloat(weight) || 0, parseFloat(height) || 0);
            
            // Robust sex detection
            let finalSex: 'Male' | 'Female' = 'Male';
            const sValue = sexInput.toLowerCase();
            if (sValue.startsWith('f') || sValue.includes('girl') || sValue.includes('female')) {
               finalSex = 'Female';
            }

            learners.push({
              lastName,
              firstName,
              middleName,
              extension,
              name,
              lrn,
              email: email.toLowerCase(),
              birthdate,
              age: parseInt(age) || 0,
              sex: finalSex,
              dateOfFirstAttendance: dateInput,
              weight: parseFloat(weight) || 0,
              height: parseFloat(height) || 0,
              bmi,
              gradeLevel: gradeLevelColIdx !== -1 ? parts[gradeLevelColIdx] || "" : "",
              section: sectionColIdx !== -1 ? parts[sectionColIdx] || "" : "",
              nutritionalStatus: {
                bmiCategory: category
              },
              eligibility,
              isTransferredIn,
              birthplace,
              address,
              primaryContact,
              fatherName,
              motherName,
              guardianName,
              guardianRelationship,
              contactNumber
            });
          }
        }
      });

      if (learners.length > 0) {
        setPendingLearnersDashboard(learners);
        // Default select only those matching actual sections in the list
        const validIndices = new Set<number>();
        learners.forEach((l, idx) => {
          const hasSection = sections.some(sec => {
            const csvSecName = (l.section || "").trim().toLowerCase();
            const dbSecName = (sec.name || "").trim().toLowerCase();
            const csvGrade = (l.gradeLevel || "").trim();
            const dbGrade = String(sec.gradeLevel || "").trim();
            return csvSecName === dbSecName && (csvGrade === "" || csvGrade === dbGrade);
          });
          if (hasSection) {
            validIndices.add(idx);
          }
        });
        setSelectedIndicesDashboard(validIndices);
        setShowSelectionModalDashboard(true);
      } else {
        alert("No valid learners parsed from CSV. Please verify columns.");
      }
      setIsUploadingDashboard(false);
      // Reset input element value
      e.target.value = "";
    };
    reader.onerror = () => {
      alert("Error reading file.");
      setIsUploadingDashboard(false);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!user?.schoolId) return;
    const q = query(collection(db, "schools"), where("schoolId", "==", user.schoolId));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setIsSchoolDbFinalized(snap.docs[0].data().isFinalized || false);
      } else {
        setIsSchoolDbFinalized(false);
      }
    }, (err) => {
      console.error("Error checking school finalized status:", err);
    });
    return () => unsub();
  }, [user?.schoolId]);
  
  // Real-time listener for behavioral records
  const [behavioralRecords, setBehavioralRecords] = useState<AnecdotalRecord[]>([]);
  const [loadingBehavioral, setLoadingBehavioral] = useState(true);

  // States to read, open and fill "Action Taken / Interventions Conducted"
  const [activeBehavioralRecordSection, setActiveBehavioralRecordSection] = useState<Section | null>(null);
  const [showBehavioralRecordsPopup, setShowBehavioralRecordsPopup] = useState(false);
  const [selectedRecordToFill, setSelectedRecordToFill] = useState<AnecdotalRecord | null>(null);
  const [formActionTaken, setFormActionTaken] = useState("");
  const [isSavingAction, setIsSavingAction] = useState(false);

  useEffect(() => {
    if (!db) return;
    setLoadingBehavioral(true);
    const recordsCol = collection(db, 'anecdotal_records');
    const q = query(recordsCol, where('category', '==', 'behavioral'));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as unknown as AnecdotalRecord);
      // Sort newest first
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setBehavioralRecords(list);
      setLoadingBehavioral(false);
    }, (err) => {
      console.error("Error loading behavioral records in SectionsView:", err);
      setLoadingBehavioral(false);
    });

    return () => unsub();
  }, []);

  const handleSaveActionTaken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordToFill) return;
    setIsSavingAction(true);
    try {
      const recordDocRef = doc(db, 'anecdotal_records', selectedRecordToFill.id);
      await updateDoc(recordDocRef, {
        actionTaken: formActionTaken.trim()
      });
      // Update our selected view
      setSelectedRecordToFill(prev => prev ? { ...prev, actionTaken: formActionTaken.trim() } : null);
      alert("Action Taken / Interventions Conducted has been documented successfully!");
    } catch (err) {
      console.error("Failed to update action taken:", err);
      alert("Error documenting actions. Please try again.");
    } finally {
      setIsSavingAction(false);
    }
  };
  
  const isGlobalFinalized = useMemo(() => {
    return globalSettings?.finalizedSchoolYears?.includes(globalSettings?.activeSchoolYear);
  }, [globalSettings]);

  const isEntireSchoolFinalized = useMemo(() => {
    const activeYear = globalSettings?.activeSchoolYear;
    if (!activeYear) return false;
    const activeSections = sections.filter(s => s.schoolYear === activeYear);
    if (activeSections.length === 0) return false;
    return activeSections.every(s => s.isFinalized);
  }, [sections, globalSettings?.activeSchoolYear]);

  useEffect(() => {
    if (sectionToDelete && (user?.role === 'system_admin' || user?.role === 'admin' || user?.role === 'teacher')) {
      const checkEmpty = async () => {
        // Check subjects first (already in state)
        const subjCount = subjects.filter(s => s.sectionId === sectionToDelete.id).length;
        if (subjCount > 0) {
          setIsSectionEmpty(false);
          return;
        }
        
        // Check students subcollection
        try {
          const studentSnap = await getDocs(query(collection(db, `sections/${sectionToDelete.id}/students`), limit(1)));
          setIsSectionEmpty(studentSnap.empty);
        } catch (err) {
          console.error("Error checking section emptiness:", err);
          setIsSectionEmpty(false); // Default to safe (not empty) if error
        }
      };
      checkEmpty();
    } else {
      setIsSectionEmpty(null);
    }
  }, [sectionToDelete, subjects, user]);

  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('home_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved filters", e);
      }
    }
    return {
      schoolYear: '',
      region: '',
      division: '',
      district: '',
      visibility: 'all',
      gradeLevel: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('home_filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    // Automatically set the school year filter to the active school year if none is selected
    // and only if we haven't explicitly set schoolYear before (either in this session or from storage)
    // Actually, if it's empty, and we have an active year, it's better to just set it.
    if (!filters.schoolYear && globalSettings?.activeSchoolYear) {
      setFilters(prev => ({ ...prev, schoolYear: globalSettings.activeSchoolYear }));
    }
  }, [globalSettings?.activeSchoolYear]);

  const isFiltered = filters.schoolYear !== '' || filters.region !== '' || filters.division !== '' || filters.district !== '' || filters.visibility !== 'all';

  const subDetails = useMemo(() => {
    const count = teacherCount || 0;
    let category = 'Small';
    let fee = 599;

    if (count <= 9) {
      category = 'Small';
      fee = 599;
    } else if (count <= 25) {
      category = 'Medium';
      fee = 1199;
    } else if (count <= 100) {
      category = 'Large';
      fee = 2499;
    } else {
      category = 'Mega';
      fee = 4999;
    }

    let isFreeAccess = false;
    let expirationDateStr = '';
    const schoolCreatedAt = activeSchool?.createdAt || new Date().toISOString();
    const createdDate = new Date(schoolCreatedAt);

    const finalExpiresAtStr = activeSchool?.expiresAt;
    const expirationDate = finalExpiresAtStr ? new Date(finalExpiresAtStr) : new Date(new Date(createdDate).setFullYear(createdDate.getFullYear() + 1));

    expirationDateStr = expirationDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const firstYearEnd = new Date(createdDate);
    firstYearEnd.setFullYear(createdDate.getFullYear() + 1);
    const isPaidYear2 = expirationDate > firstYearEnd;
    isFreeAccess = !isPaidYear2 && (new Date() < expirationDate);

    return {
      category,
      fee,
      isFreeAccess,
      isPaidYear2,
      priceLabel: `â‚±${fee.toLocaleString()}`,
      expirationDateStr,
      isExpired: new Date() >= expirationDate
    };
  }, [activeSchool, teacherCount, user]);

  const filteredSections = sections.filter(section => {
    const effectiveYear = filters.schoolYear || globalSettings?.activeSchoolYear;
    
    if (effectiveYear && effectiveYear !== 'all') {
      if (effectiveYear === 'No School Year') {
        if (section.schoolYear && section.schoolYear.trim() !== '') return false;
      } else {
        if (section.schoolYear !== effectiveYear) return false;
      }
    }
    
    const isExpired = section.schoolId ? expiredSchoolIds.includes(section.schoolId) : false;
    
    if (filters.visibility === 'active') {
        if (isExpired) return false;
    } else if (filters.visibility === 'expired') {
        if (!isExpired) return false;
    }
    // 'all' shows both

    if (filters.gradeLevel !== '') {
        if (String(section.gradeLevel) !== String(filters.gradeLevel)) return false;
    }

    if (user?.role === 'admin') {
      if (filters.region && section.region !== filters.region) return false;
      if (filters.division && section.division !== filters.division) return false;
      if (filters.district && section.district !== filters.district) return false;
    }
    return true;
  });

  const renderItems = useMemo(() => {
    type RenderItem = 
      | { type: 'section', section: Section } 
      | { type: 'tle-group', key: string, tleName: string, gradeLevels: number[], sections: Section[], isExpired: boolean }
      | { type: 'aral-class', aralClass: AralClass };
    const items: RenderItem[] = [];
    const tleGroups = new Map<string, { tleName: string, gradeLevels: Set<number>, sections: Section[], isExpired: boolean }>();

    filteredSections.forEach(section => {
      const isExpired = section.schoolId ? expiredSchoolIds.includes(section.schoolId) : false;
      
      if (user?.role === 'teacher' && (section.gradeLevel == 9 || section.gradeLevel == 10)) {
        const isAdviser = (section.adviserEmail || "").trim().toLowerCase() === (user?.email || "").trim().toLowerCase();
        
        const userEmail = (user?.email || "").trim().toLowerCase();
        const sectionSubjects = subjects.filter(s => s.sectionId === section.id);
        
        const teacherTleSubjects: string[] = [];
        sectionSubjects.forEach(sub => {
          if ((sub.teacherEmail || "").trim().toLowerCase() === userEmail && isTleSubject(sub.name)) {
            const dName = getTleDisplayName(sub.name);
            if (!teacherTleSubjects.includes(dName)) teacherTleSubjects.push(dName);
          }
        });

        if (section.subjectTeachers) {
            for (const [subjId, tEmail] of Object.entries(section.subjectTeachers)) {
              if (typeof tEmail === 'string' && tEmail.trim().toLowerCase() === userEmail) {
                const gSubj = globalSubjects.find(g => g.id === subjId);
                if (gSubj && isTleSubject(gSubj.name)) {
                  const dName = getTleDisplayName(gSubj.name);
                  if (!teacherTleSubjects.includes(dName)) teacherTleSubjects.push(dName);
                }
              }
            }
        }

        if (teacherTleSubjects.length > 0) {
          teacherTleSubjects.forEach(tleName => {
              const groupKey = tleName;
              if (!tleGroups.has(groupKey)) {
                tleGroups.set(groupKey, { tleName, gradeLevels: new Set([Number(section.gradeLevel)]), sections: [], isExpired });
              } else {
                tleGroups.get(groupKey)!.gradeLevels.add(Number(section.gradeLevel));
                tleGroups.get(groupKey)!.isExpired = tleGroups.get(groupKey)!.isExpired || isExpired;
              }
              tleGroups.get(groupKey)!.sections.push(section);
          });
          
          let teachesNonTle = false;
          sectionSubjects.forEach(sub => {
              if ((sub.teacherEmail || "").trim().toLowerCase() === userEmail && !isTleSubject(sub.name)) teachesNonTle = true;
          });
          if (section.subjectTeachers) {
              for (const [subjId, tEmail] of Object.entries(section.subjectTeachers)) {
                if (typeof tEmail === 'string' && tEmail.trim().toLowerCase() === userEmail) {
                  const gSubj = globalSubjects.find(g => g.id === subjId);
                  if (gSubj && !isTleSubject(gSubj.name)) teachesNonTle = true;
                }
              }
          }
          
          let teacherSubjectsFromFallback = section.teacherSubjects || [];
          if (teacherSubjectsFromFallback.some(n => !isTleSubject(n))) teachesNonTle = true;

          if (!teachesNonTle && !isAdviser) {
            return;
          }
        }
      }
      items.push({ type: 'section', section });
    });

    tleGroups.forEach((group, key) => {
      items.unshift({ type: 'tle-group', key, tleName: group.tleName, gradeLevels: Array.from(group.gradeLevels).sort((a, b) => a - b), sections: group.sections, isExpired: group.isExpired });
    });

    // Populate and filter ARAL program classes
    const effectiveYear = filters.schoolYear || globalSettings?.activeSchoolYear;
    const filteredAral = (aralClasses || []).filter(cls => {
      if (user?.role === 'teacher') {
        const userEmail = (user?.email || "").trim().toLowerCase();
        const adviserEmail = (cls.adviserEmail || "").trim().toLowerCase();
        if (userEmail !== adviserEmail) return false;
      }

      if (effectiveYear && effectiveYear !== 'all') {
        if (effectiveYear === 'No School Year') {
          if (cls.schoolYear && cls.schoolYear.trim() !== '') return false;
        } else {
          if (cls.schoolYear !== effectiveYear) return false;
        }
      }

      const isExpired = cls.schoolId ? expiredSchoolIds.includes(cls.schoolId) : false;
      if (filters.visibility === 'active') {
        if (isExpired) return false;
      } else if (filters.visibility === 'expired') {
        if (!isExpired) return false;
      }

      if (filters.gradeLevel !== '') {
        if (String(cls.gradeLevel) !== String(filters.gradeLevel)) return false;
      }

      return true;
    });

    filteredAral.forEach(cls => {
      items.push({ type: 'aral-class', aralClass: cls });
    });

    return items;
  }, [filteredSections, user, subjects, globalSubjects, expiredSchoolIds, aralClasses, filters, globalSettings]);

  const schoolYears = useMemo(() => {
    const list = Array.from(new Set(sections.map(s => s.schoolYear).filter(Boolean)));
    if (globalSettings?.activeSchoolYear && !list.includes(globalSettings.activeSchoolYear)) {
      list.push(globalSettings.activeSchoolYear);
    }
    return list.sort();
  }, [sections, globalSettings?.activeSchoolYear]);
  const hasNoSchoolYear = useMemo(() => sections.some(s => !s.schoolYear || s.schoolYear.trim() === ''), [sections]);
  const regions = useMemo(() => Array.from(new Set(sections.map(s => s.region).filter(Boolean))), [sections]);
  const divisions = useMemo(() => Array.from(new Set(sections.map(s => s.division).filter(Boolean))), [sections]);
  const districts = useMemo(() => Array.from(new Set(sections.map(s => s.district).filter(Boolean))), [sections]);
  const gradeLevels = useMemo(() => Array.from(new Set(sections.map(s => s.gradeLevel).filter(g => g !== null && g !== undefined))).sort((a,b) => Number(a)-Number(b)), [sections]);

  const [showRequestsModal, setShowRequestsModal] = useState(false);

  const isMainAdmin = user?.email === 'jessiemangabo@gmail.com';
  const pendingRequests = globalSettings?.unfinalizeRequests || [];

  const handleApproveRequest = async (req: any) => {
    try {
      const docRef = doc(db, 'settings', 'general');
      const reqs = pendingRequests.filter((r: any) => !(r.schoolYear === req.schoolYear && r.timestamp === req.timestamp));
      
      const sectionsSnap = await getDocs(collection(db, 'sections'));
      const allSections = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const targetSections = req.sectionId 
        ? allSections.filter((s: any) => s.id === req.sectionId)
        : allSections.filter((s: any) => s.schoolYear === req.schoolYear || (!s.schoolYear && req.schoolYear === 'No School Year') || (!req.schoolYear && req.schoolYear === 'active'));
      
      const updatePromises = [];
      for (const tsec of targetSections) {
         const snaps = await getDocs(collection(db, `sections/${tsec.id}/students`));
         for (const docSnap of snaps.docs) {
           const studentData = docSnap.data();
           if (studentData.status === 'Promoted' || studentData.status === 'Retained' || studentData.status === 'Active') {
             updatePromises.push(updateDoc(doc(db, `sections/${tsec.id}/students`, docSnap.id), { status: 'Active' }));
           }
         }
         updatePromises.push(updateDoc(doc(db, 'sections', tsec.id), { isFinalized: false }));
      }
      
      await Promise.all(updatePromises);
      await updateDoc(docRef, { unfinalizeRequests: reqs });
      alert(`Unfinalize Request Approved${req.sectionName ? ' for Section: ' + req.sectionName : ''}`);
      
    } catch (e) {
      console.error(e);
      alert("Failed to approve request.");
    }
  };

  const handleRejectRequest = async (req: any) => {
    try {
      const docRef = doc(db, 'settings', 'general');
      const reqs = pendingRequests.filter((r: any) => !(r.schoolYear === req.schoolYear && r.timestamp === req.timestamp));
      await updateDoc(docRef, { unfinalizeRequests: reqs });
      alert(`Unfinalize Request Rejected for School Year: ${req.schoolYear}`);
    } catch (e) {
      console.error(e);
      alert("Failed to reject request.");
    }
  };

  const handleFinalizeEntireSchool = async () => {
    if (!globalSettings?.activeSchoolYear) {
      alert("No active school year set.");
      return;
    }
    if (window.confirm('Are you sure you want to finalize all sections for the current school year? This action cannot be undone.')) {
      try {
        const batch = writeBatch(db);
        let count = 0;
        sections.filter(s => s.schoolYear === globalSettings.activeSchoolYear && !s.isFinalized).forEach(s => {
          batch.update(doc(db, 'sections', s.id), { isFinalized: true });
          count++;
        });

        // Also finalize the school record itself in firestore
        if (user?.schoolId) {
          const q = query(collection(db, "schools"), where("schoolId", "==", user.schoolId));
          const snap = await getDocs(q);
          snap.forEach(d => {
            batch.update(doc(db, 'schools', d.id), { isFinalized: true });
          });
        }

        if (count > 0 || user?.schoolId) {
          await batch.commit();
          alert(`Successfully finalized the school and its ${count} sections for ${globalSettings.activeSchoolYear}.`);
        } else {
          alert('All active sections are already finalized or none exist for the active school year.');
        }
      } catch (err) {
        handleFirestoreError(err, 'write', 'sections');
      }
    }
  };

  const renderAdminDropdown = (
    id: string, 
    label: string, 
    icon: React.ReactNode, 
    items: {
      label: string;
      icon: React.ReactNode;
      onClick?: () => void;
      customRender?: (close: () => void) => React.ReactNode;
      visible: boolean;
      textClass?: string;
    }[]
  ) => {
    const visibleItems = items.filter(item => item.visible);
    if (visibleItems.length === 0) return null;
    const isOpen = openAdminMenu === id;
    const setIsOpen = (val: boolean) => setOpenAdminMenu(val ? id : null);

    return (
      <div className="relative w-full sm:w-auto z-30">
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between sm:justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm w-full sm:w-auto"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span>{label}</span>
          </div>
          <ChevronDown size={14} className={`opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-full sm:w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {visibleItems.map((item, index) => {
                if (item.customRender) {
                  return (
                    <div key={index} className="w-full">
                      {item.customRender(() => setIsOpen(false))}
                    </div>
                  );
                }
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${item.textClass || 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen print:h-auto bg-slate-50 flex flex-col font-sans overflow-hidden print:overflow-hidden">
      
      <AnimatePresence>
        {showRequestsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Unfinalize Requests</h3>
                    <p className="text-sm text-slate-500 font-medium">Approve or reject System Admin requests to unfinalize school years.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRequestsModal(false)}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {pendingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                       <CheckCircle size={32} />
                    </div>
                    <p className="text-slate-500 font-bold mb-1">All Caught Up</p>
                    <p className="text-slate-400 text-sm">There are no pending requests to unfinalize any sections.</p>
                  </div>
                ) : (
                  pendingRequests.map((req: any, idx: number) => (
                    <div key={idx} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 border border-slate-200 text-indigo-600">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Pending Action</h4>
                          <p className="text-xs text-slate-600">
                            Requested by <span className="font-semibold text-slate-700">{req.requestedBy}</span> for <span className="font-bold text-indigo-600 border border-indigo-100 bg-indigo-50 px-1 rounded">{req.sectionName ? `Section ${req.sectionName} (${req.schoolYear})` : req.schoolYear}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRejectRequest(req)} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-lg transition-colors">
                          Reject
                        </button>
                        <button onClick={() => handleApproveRequest(req)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2">
                          Approve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="print:hidden">
        {!globalSettings?.activeSchoolYear && <EncodingClosedBanner />}
        <DeadlineBanner globalSettings={globalSettings} />
      </div>
      {(subDetails.isExpired && user?.email !== 'jessiemangabo@gmail.com') && (
        <div className="bg-rose-500 text-white px-4 py-2.5 text-center text-sm font-semibold flex items-center justify-center gap-2 relative z-50 shadow-sm shrink-0 print:hidden">
          <AlertTriangle size={18} className="animate-pulse" />
          {(user?.role === 'system_admin' || user?.role === 'admin')
             ? "Your school's enterprise license has expired. Please contact the system provider to renew your subscription."
             : "Your school's enterprise license has expired. Please contact your system administrator to restore access."}
          {(user?.role === 'system_admin' || user?.role === 'admin') && onRenew && (
             <button onClick={() => setShowSOA(true)} className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded border border-white/30 transition-colors text-xs uppercase tracking-wider">Renew Now</button>
          )}
        </div>
      )}
      <header className="h-16 bg-white px-6 md:px-8 flex items-center justify-between shrink-0 gap-4 relative z-50 border-b border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
            <GraduationCap size={22} />
          </div>
           <div className="flex flex-col">
            <h1 className="text-slate-900 font-bold tracking-tight text-lg leading-tight flex items-center gap-2">
              <span className="md:hidden">CLASS</span>
              <span className="hidden md:block">
                CLASS Enterprise
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md border border-slate-200">v2.4</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {/* Theme button hidden from section header per user request */}

           {(isMainAdmin || user?.role === 'system_admin') && !!globalSettings?.finalizationDeadline && (
             <button
               onClick={() => setShowRequestsModal(true)}
               className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs px-3 py-2 rounded-lg transition-all shadow-sm relative"
             >
               <AlertTriangle size={14} /> <span className="hidden sm:inline">Unfinalize Requests</span>
               {pendingRequests.length > 0 && (
                 <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                   {pendingRequests.length}
                 </span>
               )}
             </button>
           )}

            {onScanID && (
              <button 
                onClick={onScanID}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
              >
                <QrCode size={14} /> <span className="hidden sm:inline">Scan ID</span>
              </button>
            )}

           {user?.role === 'system_admin' && onManageUsers && (
             <>
                <button 
                  onClick={onManageUsers}
                 className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg transition-all shadow-sm"
               >
                 <Users size={14} /> <span className="hidden sm:inline">Manage Users</span>
                 {pendingUsersCount > 0 && (
                   <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                     {pendingUsersCount}
                   </span>
                 )}
               </button>
               {onManageSchools && (
                 <button 
                   onClick={onManageSchools}
                   className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg transition-all shadow-sm"
                 >
                   <Building size={14} /> <span className="hidden sm:inline">Manage School</span>
                 </button>
               )}
             </>
           )}

           {user?.role === 'system_admin' && !!globalSettings?.finalizationDeadline && !isEntireSchoolFinalized && !isSchoolDbFinalized && (
             <button 
               onClick={handleFinalizeEntireSchool}
               className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-all shadow-sm"
             >
               <CheckCircle size={14} /> <span className="hidden sm:inline">Finalize Entire School</span>
             </button>
           )}
           
           {(user?.role === 'admin') && (
             <div className="relative z-50">
               <button 
                 onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                 className={`flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg transition-all shadow-sm ${isSettingsOpen ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200'}`}
               >
                 <Settings size={14} /> <span className="hidden sm:inline">Settings</span>
                 <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
               </button>
               
               {isSettingsOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                   <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 py-1 z-50 divide-y divide-slate-50">
                      {onManageUsers && (
                        <button 
                          onClick={() => { onManageUsers(); setIsSettingsOpen(false); }} 
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                        >
                          <Users size={14} className="text-slate-400" /> Manage Users
                          {pendingUsersCount > 0 && (
                            <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                              {pendingUsersCount}
                            </span>
                          )}
                        </button>
                      )}
                      {onScanID && (
                        <button 
                          onClick={() => { onScanID(); setIsSettingsOpen(false); }} 
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                        >
                          <QrCode size={14} className="text-indigo-600" /> Scan ID
                        </button>
                      )}
                      {onManageSchools && (
                        <button 
                          onClick={() => { onManageSchools(); setIsSettingsOpen(false); }} 
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <Building size={14} className="text-slate-400" /> Manage School
                        </button>
                      )}
                      {onManageSchoolYears && (
                        <button 
                          onClick={() => { onManageSchoolYears(); setIsSettingsOpen(false); }} 
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <Calendar size={14} className="text-slate-400" /> School Year
                        </button>
                      )}
                      {onManageCalendar && (
                        <button 
                          onClick={() => { onManageCalendar(); setIsSettingsOpen(false); }} 
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <Calendar size={14} className="text-slate-400" /> School Calendar
                        </button>
                      )}
                      {onShowFeedbackDashboard && (
                        <button 
                          onClick={() => { onShowFeedbackDashboard(); setIsSettingsOpen(false); }} 
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors bg-indigo-50/30"
                        >
                          <Sparkles size={14} className="text-indigo-400" /> Feedback Dashboard
                        </button>
                      )}
                      {onOpenThemeModal && (
                        <button 
                          onClick={() => { onOpenThemeModal(); setIsSettingsOpen(false); }} 
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                        >
                          <Palette size={14} className="text-indigo-500" /> Appearance & Themes
                        </button>
                      )}
                   </div>
                 </>
               )}
             </div>
           )}

           {/* Keep Verify Students button separate for Advisers */}
           {user?.role === 'teacher' && isAnySectionAdviser && onManageUsers && (
              <button onClick={onManageUsers} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                 Verify Students
                 {pendingUsersCount > 0 && (
                   <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                     {pendingUsersCount}
                   </span>
                 )}
              </button>
           )}

           <button 
             onClick={() => setShowProfile(!showProfile)} 
             className="flex items-center gap-2.5 p-1.5 pr-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm group"
           >
             <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors shrink-0">
               <User size={16} />
             </div>
             <div className="flex flex-col items-start min-w-[80px] max-w-[120px] hidden sm:flex">
                <p className="text-xs font-semibold text-slate-700 leading-tight truncate w-full" title={user?.displayName || ''}>
                  {user?.displayName}
                </p>
                <div className="flex items-center gap-1 mt-0.5 w-full">
                  <p className="text-[10px] text-slate-500 font-medium truncate">{user?.role?.replace('_', ' ')}</p>
                </div>
             </div>
           </button>
           
           <div className="w-px h-6 bg-slate-200 mx-1"></div>
           
           <button onClick={onLogout} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-all" title="Sign Out">
              <LogOut size={18} />
           </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto print:overflow-hidden print:h-auto print:block print:p-0 p-12 custom-scrollbar">
        <div className="max-w-full 2xl:max-w-[1600px] w-full mx-auto space-y-12">
          {showProfile ? (
            <ProfileView 
               userProfile={user!} 
               onUpdate={(p) => {
                 onUpdateUser?.(p);
               }} 
               onBack={() => setShowProfile(false)}
               onOpenThemeModal={onOpenThemeModal}
            />
          ) : showSOA ? (
            <StatementOfAccountView 
               activeSchool={activeSchool}
               teacherCount={teacherCount}
               onBack={() => setShowSOA(false)}
               onRenew={onRenew}
               userProfile={user}
            />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Institutional Dashboard</span>
              </div>

              {/* Premium Contextual Header for Sections */}
              <div className="relative bg-white rounded-2xl p-8 md:p-10 mb-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl opacity-60 -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className="relative z-10 space-y-3 max-w-2xl">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                    Welcome back, <span className="text-indigo-600">{(user?.displayName || 'Educator').split(' ')[0]}</span>
                  </h1>
                  <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
                    Overview and manage academic sections. You currently have access to <strong className="text-slate-800 font-semibold">{sections.length}</strong> active class records.
                  </p>
                  <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">One System. One Encoding. Everything Connected.</p>
                </div>

                <div className="relative z-10 flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
                   <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Session</span>
                        <span className="text-xs font-semibold text-slate-700">{user?.role?.replace('_', ' ')}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-200 mx-2"></div>
                       <button 
                         onClick={onShowFeedback}
                         className="p-2 bg-white rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 transition-all shadow-sm"
                         title="Submit Feedback"
                         id="admin_header_feedback_button"
                       >
                         <MessageSquare size={16} />
                       </button>
                   </div>
                </div>
              </div>

              {(sections.some(s => s.deletionStatus === 'pending') || sections.some(s => s.deletionStatus === 'approved') || sections.some(s => s.deletionStatus === 'rejected')) && (
                <div className={`mb-8 p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm transition-all ${
                  sections.some(s => s.deletionStatus === 'pending') 
                    ? 'bg-amber-50 border-amber-200' 
                    : sections.some(s => s.deletionStatus === 'rejected')
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-start md:items-center gap-4 md:gap-5">
                    <div className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center border shadow-sm ${
                      sections.some(s => s.deletionStatus === 'pending')
                        ? 'bg-amber-100 text-amber-600 border-amber-200'
                        : sections.some(s => s.deletionStatus === 'rejected')
                          ? 'bg-rose-100 text-rose-600 border-rose-200'
                          : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                    }`}>
                      <ShieldCheck size={28} className={sections.some(s => s.deletionStatus === 'pending') ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h4 className={`text-base font-bold tracking-tight mb-1 ${
                        sections.some(s => s.deletionStatus === 'pending') ? 'text-amber-900' : 
                        sections.some(s => s.deletionStatus === 'rejected') ? 'text-rose-900' : 'text-emerald-900'
                      }`}>
                        {(user?.role === 'system_admin' || user?.role === 'admin') 
                          ? (sections.some(s => s.deletionStatus === 'pending') ? 'Waiting for Approval' : sections.some(s => s.deletionStatus === 'rejected') ? 'Deletion Disapproved' : 'Ready for Deletion')
                          : (sections.some(s => s.deletionStatus === 'pending') ? 'Deletion Pending' : sections.some(s => s.deletionStatus === 'rejected') ? 'Request Disapproved' : 'Ready for Deletion')}
                      </h4>
                      <p className={`text-sm font-medium max-w-xl leading-relaxed ${
                        sections.some(s => s.deletionStatus === 'pending') ? 'text-amber-700/80' : 
                        sections.some(s => s.deletionStatus === 'rejected') ? 'text-rose-700/80' : 'text-emerald-700/80'
                      }`}>
                        {(user?.role === 'system_admin' || user?.role === 'admin')
                          ? (sections.some(s => s.deletionStatus === 'pending') 
                              ? "There are sections awaiting your security authorization. Please review and approve requests before records are permanently removed."
                              : sections.some(s => s.deletionStatus === 'rejected')
                                ? "One or more deletion requests have been disapproved. The Adviser has been notified of the decision and the reason."
                                : "Deletions have been authorized. You can now proceed with the permanent removal of these records.")
                          : (sections.some(s => s.deletionStatus === 'pending')
                              ? "Your deletion request is currently waiting for authorization from the System Administrator."
                              : sections.some(s => s.deletionStatus === 'rejected')
                                ? "Your deletion request has been disapproved. Please check the section details for the reason provided."
                                : "The System Administrator has authorized your deletion request. It will be permanently removed shortly.")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-end gap-2 shrink-0">
                    {sections.filter(s => s.deletionStatus === 'pending').length > 0 && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm flex items-center gap-1.5">
                        <Clock size={14} /> {sections.filter(s => s.deletionStatus === 'pending').length} Waiting
                      </span>
                    )}
                    {sections.filter(s => s.deletionStatus === 'approved').length > 0 && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm flex items-center gap-1.5">
                        <CheckCircle size={14} /> {sections.filter(s => s.deletionStatus === 'approved').length} Ready
                      </span>
                    )}
                    {sections.filter(s => s.deletionStatus === 'rejected').length > 0 && (
                      <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm flex items-center gap-1.5">
                        <XCircle size={14} /> {sections.filter(s => s.deletionStatus === 'rejected').length} Disapproved
                      </span>
                    )}
                  </div>
                </div>
              )}

              {(user?.role === 'admin' || user?.role === 'system_admin' || user?.role === 'school_head' || isAuthorizedCashier) && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto shrink-0 mt-6 xl:mt-0 mb-8">
                  {renderAdminDropdown(
                    'financials', 
                    'Financials', 
                    <BarChart2 size={16} className="text-emerald-600" />,
                    [
                      {
                        label: 'Financial Statement',
                        icon: <BarChart2 size={15} className="text-emerald-600" />,
                        onClick: onShowFinancialStatement,
                        visible: !!(onShowFinancialStatement && (user?.role === 'system_admin' || user?.role === 'school_head' || isAuthorizedCashier)),
                        textClass: 'text-emerald-700 hover:bg-emerald-50'
                      }
                    ]
                  )}

                  {renderAdminDropdown(
                    'school-forms', 
                    'School Forms', 
                    <FileText size={16} className="text-amber-600" />,
                    [
                      {
                        label: 'School Form 4 (SF4)',
                        icon: <FileText size={15} className="text-amber-600" />,
                        onClick: onShowSF4,
                        visible: !!(onShowSF4 && (user?.role === 'system_admin' || user?.role === 'school_head')),
                        textClass: 'text-amber-700 hover:bg-amber-50'
                      },
                      {
                        label: 'School Form 7 (SF7)',
                        icon: <FileText size={15} className="text-indigo-600" />,
                        onClick: onShowSF7,
                        visible: !!(onShowSF7 && (user?.role === 'system_admin' || user?.role === 'admin')),
                        textClass: 'text-indigo-700 hover:bg-indigo-50'
                      }
                    ]
                  )}

                  {renderAdminDropdown(
                    'academic-programs', 
                    'Academic Programs', 
                    <BookOpen size={16} className="text-indigo-600" />,
                    [
                      {
                        label: 'Subject Menu',
                        icon: <BookOpen size={15} className="text-indigo-600" />,
                        onClick: () => onSetActiveTab('subjects'),
                        visible: user?.role === 'system_admin',
                        textClass: 'text-slate-700 hover:bg-slate-50'
                      },
                      {
                        label: 'G9/G10 TLE Allocation',
                        icon: <GraduationCap size={15} className="text-indigo-600" />,
                        onClick: () => onSetActiveTab('tle-dashboard'),
                        visible: !!(user?.role === 'admin' || user?.role === 'system_admin' || (user?.role === 'teacher' && hasAssignedSubjects)),
                        textClass: 'text-slate-700 hover:bg-slate-50'
                      },
                      {
                        label: 'ARAL Program',
                        icon: <GraduationCap size={15} className="text-indigo-600" />,
                        onClick: () => onSetActiveTab('aral'),
                        visible: !!(onSetActiveTab && (user?.role === 'system_admin' || user?.role === 'school_head' || user?.role === 'admin' || (mapUserRoleToAralRole && mapUserRoleToAralRole(user?.role, user?.email) === 'ARAL Coordinator'))),
                        textClass: 'text-indigo-700 hover:bg-indigo-50'
                      }
                    ]
                  )}

                  {renderAdminDropdown(
                    'learner-mgmt', 
                    'Learner Management', 
                    <Users size={16} className="text-indigo-600" />,
                    [
                      {
                        label: 'Student List',
                        icon: <TableIcon size={15} className="text-indigo-600" />,
                        onClick: onManageStudentList,
                        visible: !!((user?.role === 'admin' || user?.role === 'system_admin') && onManageStudentList),
                        textClass: 'text-slate-700 hover:bg-slate-50'
                      },
                      {
                        label: 'Download CSV Template',
                        icon: <Download size={15} className="text-indigo-600" />,
                        onClick: downloadDashboardCSVTemplate,
                        visible: user?.role === 'system_admin',
                        textClass: 'text-slate-700 hover:bg-slate-50'
                      },
                      {
                        label: 'Bulk Upload (for Learner Upload)',
                        icon: <FileUp size={15} className="text-indigo-600" />,
                        visible: user?.role === 'system_admin',
                        customRender: (close) => (
                          <label 
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer w-full text-indigo-600 hover:bg-indigo-50/50 ${
                              isUploadingDashboard ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <FileUp size={15} className="text-indigo-600" />
                            <span>Bulk Upload (for Learner Upload)</span>
                            <input 
                              type="file" 
                              accept=".csv" 
                              className="hidden" 
                              onChange={(e) => {
                                handleDashboardFileUpload(e);
                                close();
                              }}
                              disabled={isUploadingDashboard}
                            />
                          </label>
                        )
                      }
                    ]
                  )}
                </div>
              )}
              {activeSchool && (user?.role === 'system_admin' || user?.role === 'admin' || user?.role === 'school_head') && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 animate-in fade-in duration-200">
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-2xl flex items-center justify-center shrink-0 border ${
                      subDetails.isFreeAccess 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      <CreditCard size={24} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">
                          {activeSchool.name} Subscription Status
                        </h4>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-slate-200">
                          {subDetails.category} Tier ({teacherCount} active {teacherCount === 1 ? 'teacher' : 'teachers'})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Your data subscription tier is calculated in real-time based on the number of registered school teachers.
                      </p>
                      <button
                        onClick={() => setShowSOA(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-extrabold cursor-pointer hover:underline mt-1"
                        title="View Ledger"
                      >
                        <Receipt size={14} /> View Statement of Account & Ledger
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-stretch md:self-auto justify-between border-t border-slate-100 pt-4 md:border-0 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Computed Annual Payment</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        {subDetails.isFreeAccess ? (
                          <>
                            <span className="text-xl font-black text-emerald-600 font-sans">Free Access Mode</span>
                            <span className="text-xs text-slate-400 line-through">{subDetails.priceLabel}</span>
                          </>
                        ) : (
                          <span className="text-xl font-black text-indigo-600 font-sans">{subDetails.priceLabel}</span>
                        )}
                        <span className="text-[10px] text-slate-400">/ year</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                      {subDetails.isFreeAccess ? (
                        <div className="bg-emerald-50 border border-emerald-200/50 text-emerald-800 px-4 py-2.5 rounded-xl text-xs space-y-0.5 font-semibold">
                          <p className="font-extrabold flex items-center gap-1.5 uppercase text-[9px] tracking-widest text-emerald-950">
                            ðŸŽ One-Year Free Access Active
                          </p>
                          <p className="text-[11px] text-emerald-750 font-medium">Valid until {subDetails.expirationDateStr}</p>
                        </div>
                      ) : subDetails.isPaidYear2 ? (
                        <div className="bg-emerald-50 border border-emerald-200/50 text-emerald-800 px-4 py-2.5 rounded-xl text-xs space-y-0.5 font-semibold">
                          <p className="font-extrabold flex items-center gap-1.5 uppercase text-[9px] tracking-widest text-emerald-950">
                            âœ… Paid Subscription (Year 2) Active
                          </p>
                          <p className="text-[11px] text-emerald-750 font-medium">Fully paid. Valid until {subDetails.expirationDateStr}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                          <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-2.5 rounded-xl text-xs space-y-0.5 font-semibold">
                            <p className="font-extrabold flex items-center gap-1.5 uppercase text-[9px] tracking-widest text-rose-950">
                              âš ï¸ Renewal Pending (Year 2)
                            </p>
                            <p className="text-[11px] text-rose-750 font-bold">Unpaid. Click PAID to renew subscription</p>
                          </div>
                          
                          <button
                            id="banner-pay-btn"
                            disabled={isBannerPaying}
                            onClick={async () => {
                              try {
                                setIsBannerPaying(true);
                                if (onRenew) {
                                  await onRenew(2);
                                }
                              } catch (err) {
                                console.error("Error trigger renew:", err);
                              } finally {
                                setIsBannerPaying(false);
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-755 disabled:bg-slate-300 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 text-center uppercase whitespace-nowrap inline-flex items-center justify-center gap-1.5"
                          >
                            {isBannerPaying && (
                              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            PAID
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setShowSOA(true)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Receipt size={14} /> View SOA & Payments
                      </button>
                    </div>
                  </div>
                </div>
              )}

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end border-b border-slate-200 pb-6 mb-6 gap-6">
            <div className="space-y-4 flex-1 w-full xl:w-auto overflow-hidden">
              
              <div className="flex flex-wrap items-center gap-2 max-w-full">
                <div className="relative group shrink-0">
                  <div className={`flex items-center bg-white border ${!globalSettings?.activeSchoolYear ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200 hover:border-indigo-300'} rounded-lg px-3 py-2 shadow-sm transition-colors`}>
                    <Calendar size={14} className={!globalSettings?.activeSchoolYear ? 'text-rose-500 mr-2' : 'text-slate-400 mr-2'} />
                    <select 
                      value={filters.schoolYear}
                      onChange={e => setFilters({...filters, schoolYear: e.target.value})}
                      className={`bg-transparent border-none text-xs font-semibold outline-none ${!globalSettings?.activeSchoolYear ? 'text-rose-600' : 'text-slate-700'} cursor-pointer min-w-[130px]`}
                    >
                      <option value="all">All School Years</option>
                      {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
                      {hasNoSchoolYear && <option value="No School Year">No School Year</option>}
                    </select>
                  </div>
                  {!globalSettings?.activeSchoolYear && (
                    <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-white border border-rose-200 rounded-xl shadow-lg z-50 pointer-events-none transform origin-top transition-all scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-rose-500 shrink-0" />
                        <p className="text-xs font-medium text-slate-700 leading-snug">
                          No active school year. Please set one in <span className="text-rose-600 font-semibold">Settings &gt; School Years</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full" style={{ scrollbarWidth: 'none' }}>
                  <button 
                    onClick={() => setFilters({...filters, gradeLevel: ''})}
                    className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!filters.gradeLevel ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    All Grades
                  </button>
                  {gradeLevels.map(g => (
                    <button
                      key={g}
                      onClick={() => setFilters({...filters, gradeLevel: String(g)})}
                      className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${String(filters.gradeLevel) === String(g) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {Number(g) === 0 ? "Kinder" : `G${g}`}
                    </button>
                  ))}
                </div>

                {user?.role === 'admin' && (
                  <>
                    <div className="w-px h-6 bg-slate-200 mx-1 hidden lg:block"></div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <div className="flex items-center bg-white border border-slate-200 hover:border-indigo-300 rounded-lg px-2.5 py-1.5 shadow-sm transition-colors">
                        <Building size={14} className="text-slate-400 mr-1.5" />
                        <select 
                          value={filters.region}
                          onChange={e => setFilters({...filters, region: e.target.value})}
                          className="bg-transparent border-none text-[11px] font-semibold outline-none text-slate-600 cursor-pointer min-w-[70px]"
                        >
                          <option value="">Region</option>
                          {regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center bg-white border border-slate-200 hover:border-indigo-300 rounded-lg px-2.5 py-1.5 shadow-sm transition-colors">
                        <Building size={14} className="text-slate-400 mr-1.5" />
                        <select 
                          value={filters.division}
                          onChange={e => setFilters({...filters, division: e.target.value})}
                          className="bg-transparent border-none text-[11px] font-semibold outline-none text-slate-600 cursor-pointer min-w-[70px]"
                        >
                          <option value="">Division</option>
                          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center bg-white border border-slate-200 hover:border-indigo-300 rounded-lg px-2.5 py-1.5 shadow-sm transition-colors">
                        <Building size={14} className="text-slate-400 mr-1.5" />
                        <select 
                          value={filters.district}
                          onChange={e => setFilters({...filters, district: e.target.value})}
                          className="bg-transparent border-none text-[11px] font-semibold outline-none text-slate-600 cursor-pointer min-w-[70px]"
                        >
                          <option value="">District</option>
                          {districts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="w-px h-6 bg-slate-200 mx-1 hidden lg:block"></div>
                      <div className="flex items-center bg-white border border-slate-200 hover:border-indigo-300 rounded-lg px-2.5 py-1.5 shadow-sm transition-colors">
                        <select 
                          value={filters.visibility ?? 'all'}
                          onChange={e => setFilters({...filters, visibility: e.target.value})}
                          className="bg-transparent border-none text-[11px] font-semibold outline-none text-slate-600 cursor-pointer min-w-[100px]"
                        >
                          <option value="all">Status: All</option>
                          <option value="active">Status: Active</option>
                          <option value="expired">Status: Expired</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
          </div>

          {user?.role === 'system_admin' && subjects.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6 transition-all">
              <button 
                type="button"
                onClick={() => setIsOverviewOpen(!isOverviewOpen)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100/70 border-b border-slate-100 transition-colors text-left font-sans cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider leading-none font-sans uppercase tracking-tight">Section Subject Finalization Overview</h4>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1">Monitor finalization status across academic classes</p>
                  </div>
                </div>
                <div className="text-slate-400 p-1 bg-white hover:bg-slate-200 rounded-lg border border-slate-200 transition-all">
                  {isOverviewOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>
              
              <AnimatePresence initial={false}>
                {isOverviewOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="space-y-4">
                        {adminSortedGradeLevels.map(gradeLevel => {
                          const gradeLabel = Number(gradeLevel) === 0 ? "Kindergarten" : `Grade ${gradeLevel}`;
                          const sectionsInGrade = adminGroupedOverview[gradeLevel];
                          const sectionIds = Object.keys(sectionsInGrade).sort((a, b) => {
                            const nameA = sectionsInGrade[a].sectionName.toLowerCase();
                            const nameB = sectionsInGrade[b].sectionName.toLowerCase();
                            return nameA.localeCompare(nameB);
                          });
                          const isCollapsed = collapsedAdminGrades.has(Number(gradeLevel));

                          return (
                            <div key={gradeLevel} className="bg-slate-50/40 rounded-2xl p-4 border border-slate-200/65 space-y-3 transition-colors hover:bg-slate-50/70">
                              <button
                                type="button"
                                onClick={() => {
                                  setCollapsedAdminGrades(prev => {
                                    const next = new Set(prev);
                                    if (next.has(Number(gradeLevel))) next.delete(Number(gradeLevel));
                                    else next.add(Number(gradeLevel));
                                    return next;
                                  });
                                }}
                                className="w-full flex items-center justify-between gap-3 cursor-pointer text-left focus:outline-none select-none"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="bg-indigo-600 text-white font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded shadow-xs">
                                    {gradeLabel}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/50">
                                    {sectionIds.length} {sectionIds.length === 1 ? 'Section' : 'Sections'}
                                  </span>
                                </div>
                                <div className="text-slate-400 p-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-all flex items-center justify-center shadow-xs">
                                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </div>
                              </button>
                              
                              <AnimatePresence initial={false}>
                                {!isCollapsed && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden space-y-4 pt-1"
                                  >
                                    {sectionIds.map(sectionId => {
                                      const secData = sectionsInGrade[sectionId];
                                      return (
                                        <div key={sectionId} className="space-y-2.5 bg-white/70 p-3.5 rounded-xl border border-slate-100">
                                          <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-[11px] text-slate-500 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                                              Section: <span className="text-slate-800 font-extrabold">{secData.sectionName}</span>
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                              ({secData.subjects.length} subjects)
                                            </span>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {secData.subjects.map(sub => {
                                              const offered = sub.offeredTerms && sub.offeredTerms.length > 0 ? sub.offeredTerms : ([1, 2, 3, 4] as any[]);
                                              const teacherName = sub.teacherEmail || 'No Teacher Assigned';
                                              
                                              return (
                                                <div key={`${sub.id}-${sub.sectionId || ''}`} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between gap-2.5 transition-all shadow-xs group hover:border-indigo-200">
                                                  <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                      <h6 className="font-extrabold text-slate-800 text-xs truncate" title={sub.name}>{sub.name}</h6>
                                                      <p className="text-[9px] text-slate-500 truncate mt-0.5 font-semibold" title={teacherName}>{teacherName}</p>
                                                    </div>
                                                  </div>
                                                  
                                                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-100/80">
                                                    {offered.map(term => {
                                                      const isFinalized = sub.finalizedTerms?.includes(term);
                                                      return (
                                                        <div key={term} className="flex flex-row items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                                          <span className="font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Term {term}</span>
                                                          {isFinalized ? (
                                                            <div className="flex items-center gap-1.5">
                                                              <span className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1"><Check size={10} /> Finalized</span>
                                                              {onToggleFinalizeSubjectTerm && (
                                                                <button 
                                                                  onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    setConfirmFinalizeConfig({ subjectId: sub.id, term, finalize: false });
                                                                  }}
                                                                  className="text-[9px] px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 font-bold uppercase hover:bg-amber-100 cursor-pointer transition-colors"
                                                                  title={`Unfinalize Term ${term}`}
                                                                >
                                                                  Unfinalize
                                                                </button>
                                                              )}
                                                            </div>
                                                          ) : (
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Confirmation Modal for Homepage Finalization Overview */}
          <AnimatePresence>
            {confirmFinalizeConfig && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  onClick={() => setConfirmFinalizeConfig(null)}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl p-6 w-full max-w-md relative z-[130] shadow-2xl flex flex-col items-center text-center"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                    confirmFinalizeConfig.finalize ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {confirmFinalizeConfig.finalize ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-2">
                    {confirmFinalizeConfig.finalize ? 'Finalize & Release Term Grades?' : 'Unfinalize Term Grades?'}
                  </h3>
                  
                  <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">
                    {confirmFinalizeConfig.finalize 
                      ? `Are you sure you want to finalize Term ${confirmFinalizeConfig.term} for this subject? Finalizing will release and display these grades in the Learner's Class Card (SF9), Permanent Academic Records (SF10), and Section Grading Sheet.`
                      : `Are you sure you want to unfinalize Term ${confirmFinalizeConfig.term} for this subject?`}
                  </p>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setConfirmFinalizeConfig(null)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (onToggleFinalizeSubjectTerm) {
                          onToggleFinalizeSubjectTerm(confirmFinalizeConfig.subjectId, confirmFinalizeConfig.term as any, confirmFinalizeConfig.finalize);
                        }
                        setConfirmFinalizeConfig(null);
                      }}
                      className={`flex-1 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
                        confirmFinalizeConfig.finalize 
                          ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' 
                          : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      }`}
                    >
                      {confirmFinalizeConfig.finalize ? 'Yes, Finalize & Release' : 'Yes, Unfinalize'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showAdd && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm py-12"
                onClick={() => setShowAdd(false)}
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Add New Section</h2>
                      <p className="text-xs font-medium text-slate-500 mt-1.5">Register a new academic group to the system</p>
                    </div>
                    <button onClick={() => setShowAdd(false)} className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar">
                    <SectionForm 
                      onSubmit={(sectionData) => {
                        onCreate(sectionData);
                        setShowAdd(false);
                      }}
                      buttonLabel="Create Section"
                      user={user}
                      globalSubjects={globalSubjects}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all mt-8">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsListOpen(!isListOpen)}
              onKeyDown={(e) => { if (e.key === 'Enter') setIsListOpen(!isListOpen); }}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100/70 border-b border-slate-100 transition-colors text-left font-sans cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider leading-none">Academic Sections List</h4>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1">Browse and manage active groups below</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(user?.role === 'admin' || user?.role === 'system_admin') && !isEntireSchoolFinalized && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user?.email !== 'jessiemangabo@gmail.com' && (!globalSettings?.activeSchoolYear || isGlobalFinalized)) return;
                      setShowAdd(true);
                    }}
                    disabled={user?.email !== 'jessiemangabo@gmail.com' && (!globalSettings?.activeSchoolYear || isGlobalFinalized)}
                    className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-sm hover:bg-indigo-700 hover:shadow transition-all cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add Section</span>
                  </button>
                )}
                <div className="text-slate-400 p-1 bg-white hover:bg-slate-200 rounded-lg border border-slate-200 transition-all">
                  {isListOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isListOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!isFiltered ? (
               <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center shadow-sm">
                 <div className="size-16 bg-indigo-50/50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-indigo-500">
                   <Search size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-slate-800 tracking-tight">Selection Required</h2>
                   <p className="text-slate-500 max-w-sm mx-auto mt-1.5 text-sm">Please use the filters above to browse and select academic sections.</p>
                 </div>
               </div>
            ) : renderItems.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center shadow-sm">
                <div className="size-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-slate-400">
                  <Users size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">No Sections Found</h2>
                  <p className="text-slate-500 max-w-sm mx-auto mt-1.5 text-sm">Try adjusting your filters to see more results.</p>
                </div>
              </div>
            ) : (
              renderItems.map((item) => {
                if (item.type === 'aral-class') {
                  const { aralClass } = item;
                  const isExpired = aralClass.schoolId ? expiredSchoolIds.includes(aralClass.schoolId) : false;
                  return (
                    <motion.div 
                      key={aralClass.id}
                      whileHover={isExpired ? {} : { y: -4 }}
                      onClick={() => {
                        if (onSelectAralClassId) {
                          onSelectAralClassId(aralClass.id);
                        }
                        if (onSetActiveTab) {
                          onSetActiveTab('aral');
                        }
                      }}
                      className="flex flex-col bg-amber-50/20 p-6 rounded-2xl border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-400 cursor-pointer transition-all duration-300 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/30 rounded-bl-full -z-10 group-hover:bg-amber-100/40 transition-colors"></div>
                      
                      <div className="flex justify-between items-start mb-5 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors border border-amber-200 shrink-0">
                            <GraduationCap size={24} />
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                               <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md border border-amber-200">
                                 ARAL PROGRAM CLASS
                               </span>
                               <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                 Grade {aralClass.gradeLevel}
                               </span>
                               {isExpired && (
                                 <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-200">Expired</span>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight mb-2 group-hover:text-amber-800 transition-colors">{aralClass.name}</h3>
                      
                      <div className="flex-1 space-y-3 mb-5">
                        {aralClass.schoolYear && (
                          <p className="text-[12px] text-slate-500 tracking-wide flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            SY {aralClass.schoolYear}
                          </p>
                        )}
                        {aralClass.targetSubject && (
                          <p className="text-[12px] text-slate-600 font-medium tracking-wide flex items-center gap-1.5">
                            <BookOpen size={12} className="text-slate-400" />
                            Subject: <span className="font-bold text-slate-800">{aralClass.targetSubject}</span>
                          </p>
                        )}
                        {(aralClass.adviserName || aralClass.adviserEmail) && (
                          <p className="text-[12px] text-slate-500 tracking-wide flex items-center gap-1.5">
                            <User size={12} className="text-slate-400" />
                            Tutor: {aralClass.adviserName || aralClass.adviserEmail}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto pt-4 border-t border-dashed border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Users size={14} className="text-amber-600" />
                          <span className="font-semibold text-slate-700">{aralClass.studentIds?.length || 0} Learners Enrolled</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Manage Remediations <ArrowRight size={10} />
                        </span>
                      </div>
                    </motion.div>
                  );
                }

                if (item.type === 'tle-group') {
                  const { key, tleName, gradeLevels, sections, isExpired } = item;
                  return (
                    <motion.div 
                      key={key}
                      whileHover={isExpired ? {} : { y: -4 }}
                      className={`flex flex-col bg-slate-50 p-6 rounded-2xl border-2 border-indigo-100 shadow-sm transition-all duration-300 relative overflow-hidden`}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/30 rounded-bl-full -z-10 transition-colors"></div>
                      
                      <div className="flex justify-between items-start mb-5 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                            <Users size={24} />
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                               <span className="text-[10px] font-semibold bg-white text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                                 Combined TLE Class
                               </span>
                               <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                 {gradeLevels.length === 1 ? `Grade ${gradeLevels[0]}` : `Grades ${gradeLevels.join(' & ')}`}
                               </span>
                               {isExpired && (
                                 <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-200">Expired</span>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight mb-4 group-hover:text-indigo-700 transition-colors">{tleName}</h3>
                      <div className="flex-1 space-y-4 mb-5">
                         <div className="p-3 bg-white border border-indigo-50 rounded-xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Enrolled Sections ({sections.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {sections.map(section => (
                                <button
                                   key={section.id}
                                   onClick={() => {
                                     onNavigateToSubject(section, tleName);
                                   }}
                                   className="text-[11px] items-center flex gap-1.5 font-bold bg-indigo-50/50 hover:bg-indigo-600 hover:text-white text-indigo-700 px-3 py-2 rounded-lg border border-indigo-100 transition-colors"
                                >
                                  {section.name} <ArrowRight size={12} />
                                </button>
                              ))}
                            </div>
                         </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-4 mt-auto">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500 shrink-0">
                            <User size={12} />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">
                            Grouped by Specialization
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                
                const { section } = item;
                const isExpired = section.schoolId ? expiredSchoolIds.includes(section.schoolId) : false;
                const currentUserEmail = (user?.email || "").trim().toLowerCase();
                const isAdviserOfSection = currentUserEmail.length > 0 && (section.adviserEmail || "").trim().toLowerCase() === currentUserEmail;
                const isSubjectTeacherOfSection = currentUserEmail.length > 0 && (
                  subjects.some(s => s.sectionId === section.id && (s.teacherEmail || "").trim().toLowerCase() === currentUserEmail) || 
                  (section.subjectTeachers && Object.values(section.subjectTeachers).some(tEmail => typeof tEmail === 'string' && tEmail.trim().toLowerCase() === currentUserEmail))
                );

                const cardBgClasses = isAdviserOfSection
                  ? 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100'
                  : isSubjectTeacherOfSection
                  ? 'bg-indigo-50/20 border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100'
                  : 'bg-white border-slate-200 hover:border-indigo-300';

                const iconBgClasses = isAdviserOfSection
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600'
                  : isSubjectTeacherOfSection
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-100/50 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600';

                const cornerGlowClasses = isAdviserOfSection
                  ? 'bg-emerald-100/30 group-hover:bg-emerald-200/40'
                  : isSubjectTeacherOfSection
                  ? 'bg-indigo-100/30 group-hover:bg-indigo-200/40'
                  : 'bg-indigo-50/50 group-hover:bg-indigo-100/50';

                return (
                <motion.div 
                  key={section.id}
                  whileHover={isExpired ? {} : { y: -4 }}
                  onClick={(isExpired && user?.role !== 'admin') ? undefined : () => onSelect(section)}
                  className={`flex flex-col p-6 rounded-2xl border shadow-sm transition-all duration-300 group cursor-pointer relative overflow-hidden ${cardBgClasses} ${(isExpired && user?.role !== 'admin') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -z-10 transition-colors ${cornerGlowClasses}`}></div>
                  
                  <div className="flex justify-between items-start mb-5 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors border shrink-0 ${iconBgClasses}`}>
                        <Users size={24} />
                      </div>
                      <div>
                        {section.schoolName ? (
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">{section.schoolName}</p>
                        ) : null}
                        <div className="flex items-center flex-wrap gap-1.5">
                           <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                             {(Number(section.gradeLevel) === 0) ? "Kindergarten" : `Grade ${section.gradeLevel}`}
                           </span>
                           {isAdviserOfSection && (
                             <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                               Assigned Section
                             </span>
                           )}
                           {isSubjectTeacherOfSection && (
                             <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-300 shadow-2xs">
                               Assigned Subjects
                             </span>
                           )}
                           <SectionYearEndBadge sectionId={section.id} schoolYear={section.schoolYear} globalSettings={globalSettings} isSectionFinalized={section.isFinalized} />
                           {isExpired && (
                             <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-200">Expired</span>
                           )}
                           {section.deletionStatus === 'pending' && (
                             <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 animate-pulse">
                               <Clock size={10} /> Pending
                             </span>
                           )}
                           {section.deletionStatus === 'approved' && (
                             <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                               <CheckCircle size={10} /> Approved
                             </span>
                           )}
                            {section.deletionStatus === 'rejected' && (
                              <span className="text-[10px] font-semibold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                                <XCircle size={10} /> Rejected
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                       {user?.role === 'system_admin' && !isEntireSchoolFinalized && !section.isFinalized && (
                         <button 
                           onClick={(e) => { 
                             if (user?.email !== 'jessiemangabo@gmail.com' && (!globalSettings?.activeSchoolYear || isGlobalFinalized || section.isFinalized)) return;
                             e.stopPropagation(); 
                             setSectionToEdit(section); 
                           }}
                           disabled={user?.email !== 'jessiemangabo@gmail.com' && (!globalSettings?.activeSchoolYear || isGlobalFinalized || section.isFinalized)}
                           className="p-1.5 bg-white text-slate-400 hover:text-indigo-600 rounded-md transition-all border border-transparent hover:border-indigo-100 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100"
                         >
                           <Edit2 size={14} />
                         </button>
                       )}
                       {((user?.role === 'teacher') || (user?.role === 'system_admin') || (user?.role === 'admin')) && !isEntireSchoolFinalized && !section.isFinalized && (
                         <button 
                           onClick={(e) => { 
                             if (isGlobalFinalized || section.isFinalized) return;
                             if (user?.email !== 'jessiemangabo@gmail.com' && !globalSettings?.activeSchoolYear) return;
                             e.stopPropagation(); 
                             setSectionToDelete(section); 
                           }}
                           disabled={(isGlobalFinalized || section.isFinalized) || (user?.email !== 'jessiemangabo@gmail.com' && !globalSettings?.activeSchoolYear)}
                           className={`p-1.5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed border opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                             true
                                 ? 'bg-white text-slate-400 hover:text-rose-600 border-transparent hover:border-rose-100 hover:bg-rose-50'
                                 : ''
                           }`}
                           title={
                             (isGlobalFinalized || section.isFinalized) ? "Cannot delete when finalized. Please request unfinalization first." : user?.email === 'jessiemangabo@gmail.com' ? "Delete Section" : (
                               section.deletionStatus === 'pending'
                                 ? ((user?.role === 'admin' || user?.role === 'system_admin') ? "Approve Deletion Request" : "Awaiting Approval")
                                 : "Delete Section"
                             )
                           }
                         >
                           {section.deletionStatus === 'pending' && user?.email !== 'jessiemangabo@gmail.com' ? <Clock size={14} /> : <Trash2 size={14} />}
                         </button>
                       )}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight mb-2 group-hover:text-indigo-700 transition-colors">{section.name}</h3>
                  <div className="flex-1 space-y-3 mb-5">
                    {section.schoolYear && section.division && (
                      <p className="text-[12px] text-slate-500 tracking-wide flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        SY {section.schoolYear} <span className="opacity-50 mx-1">â€¢</span> {section.division} Division
                      </p>
                    )}
                  </div>
                  
                  <SectionStatsDisplay 
                    sectionId={section.id} 
                    schoolYear={section.schoolYear} 
                    schoolCalendar={schoolCalendar} 
                  />
                  
                  {(() => {
                    const sectionSubjects = subjects.filter(s => s.sectionId === section.id);
                    const userEmail = (user?.email || "").trim().toLowerCase();
                    
                    const localItems = sectionSubjects.filter(sub => (sub.teacherEmail || "").trim().toLowerCase() === userEmail).map(s => s.name);
                    const globalItems: string[] = [];
                    if (section.subjectTeachers) {
                      for (const [subjId, tEmail] of Object.entries(section.subjectTeachers)) {
                        if (typeof tEmail === 'string' && tEmail.trim().toLowerCase() === userEmail) {
                          const gSubj = globalSubjects.find(g => g.id === subjId);
                          if (gSubj && !globalItems.includes(gSubj.name)) globalItems.push(gSubj.name);
                        }
                      }
                    }

                    let subjectsToDisplayNames = (user?.role === 'admin' || user?.role === 'system_admin' || user?.role === 'teacher') 
                      ? [...new Set([...localItems, ...globalItems])]
                      : (section.teacherSubjects || []);

                    if (user?.role === 'teacher' && subjectsToDisplayNames.length === 0 && section.teacherSubjects && section.teacherSubjects.length > 0) {
                      subjectsToDisplayNames = section.teacherSubjects;
                    }

                    const isSHS = section.gradeLevel === 11 || section.gradeLevel === 12;
                    let displayItems: { label: string, targetName: string | null }[] = [];
                    
                    const tleNames = subjectsToDisplayNames.filter(n => isTleSubject(n));
                    const nonTleNames = subjectsToDisplayNames.filter(n => !isTleSubject(n));
                    
                    nonTleNames.forEach(n => displayItems.push({ label: n, targetName: n }));
                    
                    if (tleNames.length > 0) {
                      if (tleNames.length === 1) {
                        displayItems.push({ label: tleNames[0], targetName: tleNames[0] });
                      } else {
                        const shortNames = tleNames.map(n => {
                          let stripped = n.replace(/^Technology\s+and\s+Livelihood\s+Education\s*(\(\s*TLE\s*-\s*)?/i, '').replace(/^\s*-\s*/, '').replace(/\)?$/, '').trim();
                          if (stripped.startsWith('TLE - ')) stripped = stripped.replace(/^TLE\s*-\s*/i, '').trim();
                          if (stripped.startsWith('TLE')) stripped = stripped.replace(/^TLE\s*/i, '').trim();
                          return stripped || 'General';
                        });
                        displayItems.push({ label: `TLE (${shortNames.join(', ')})`, targetName: null });
                      }
                    }

                    if (isSHS) {
                      displayItems.sort((a, b) => {
                        const subA = a.targetName ? sectionSubjects.find(s => s.name === a.targetName) : null;
                        const subB = b.targetName ? sectionSubjects.find(s => s.name === b.targetName) : null;
                        const typeA = subA?.subjectType || 'ELECTIVE';
                        const typeB = subB?.subjectType || 'ELECTIVE';
                        if (typeA === 'CORE' && typeB !== 'CORE') return -1;
                        if (typeA !== 'CORE' && typeB === 'CORE') return 1;
                        return a.label.localeCompare(b.label);
                      });
                    } else {
                      displayItems.sort((a, b) => {
                        const scoreA = a.targetName ? getSubjectSortScore(a.targetName) : 99;
                        const scoreB = b.targetName ? getSubjectSortScore(b.targetName) : 99;
                        if (scoreA !== scoreB) return scoreA - scoreB;
                        return a.label.localeCompare(b.label);
                      });
                    }

                    const isExpanded = expandedSections.has(section.id);
                    
                    if (!isExpanded) {
                      const subjectsToShow = displayItems.slice(0, 4);
                      return (
                        <div className="mb-4 mt-4">
                          <div className="flex flex-wrap gap-2.5">
                            {subjectsToShow.map((item, idx) => (
                              <button 
                                key={idx} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.targetName) {
                                    onNavigateToSubject(section, item.targetName);
                                  } else {
                                    onSelect(section);
                                  }
                                }}
                                className="text-[11px] items-center flex gap-1 font-medium bg-indigo-50/50 text-indigo-700 px-3 py-1.5 rounded-md border border-indigo-100/50 truncate max-w-full hover:bg-indigo-100 hover:border-indigo-200 transition-colors"
                              >
                                 {item.label}
                              </button>
                            ))}
                            {displayItems.length > 4 && (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const next = new Set(expandedSections);
                                   next.add(section.id);
                                   setExpandedSections(next);
                                 }}
                                 className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-1 pl-1 cursor-pointer"
                               >
                                 + {displayItems.length - 4} more
                               </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Expanded Grouped View
                    const coreItems = displayItems.filter(item => {
                      if (!item.targetName) return false;
                      const s = sectionSubjects.find(sub => sub.name === item.targetName);
                      return s?.subjectType === 'CORE';
                    });
                    const appliedItems = displayItems.filter(item => {
                      if (!item.targetName) return false;
                      const s = sectionSubjects.find(sub => sub.name === item.targetName);
                      return s?.subjectType === 'ELECTIVE' || s?.subjectType === 'APPLIED' || s?.subjectType === 'SPECIALIZED';
                    });
                    const otherItems = displayItems.filter(item => !coreItems.includes(item) && !appliedItems.includes(item));

                    return (
                      <div className="mb-6 mt-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        {coreItems.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-px flex-1 bg-slate-100" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Core Subjects</span>
                              <div className="h-px flex-1 bg-slate-100" />
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {coreItems.map((item, idx) => (
                                <button 
                                  key={idx} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.targetName) {
                                      onNavigateToSubject(section, item.targetName);
                                    } else {
                                      onSelect(section);
                                    }
                                  }}
                                  className="text-[10px] items-center flex gap-1 font-bold bg-white text-indigo-700 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all shadow-sm"
                                >
                                   {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {(appliedItems.length > 0 || otherItems.length > 0) && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-px flex-1 bg-slate-100" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Applied & Specialized</span>
                              <div className="h-px flex-1 bg-slate-100" />
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {[...appliedItems, ...otherItems].map((item, idx) => (
                                <button 
                                  key={idx} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.targetName) {
                                      onNavigateToSubject(section, item.targetName);
                                    } else {
                                      onSelect(section);
                                    }
                                  }}
                                  className="text-[10px] items-center flex gap-1 font-bold bg-white text-emerald-700 px-3 py-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all shadow-sm"
                                >
                                   {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = new Set(expandedSections);
                            next.delete(section.id);
                            setExpandedSections(next);
                          }}
                          className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em] bg-slate-50/50 rounded-xl"
                        >
                          <Minus size={12} /> Hide Details
                        </button>
                      </div>
                    );
                  })()}
                  
                  {(() => {
                    const sectionBehavioralRecords = behavioralRecords.filter(r => r.sectionId === section.id);
                    const pendingInterventionCount = sectionBehavioralRecords.filter(r => !r.actionTaken || r.actionTaken.trim() === '').length;
                    
                    const isAdviserOfThisSection = (section.adviserEmail || "").trim().toLowerCase() === (user?.email || "").trim().toLowerCase();

                    if (sectionBehavioralRecords.length > 0 && isAdviserOfThisSection) {
                      return (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBehavioralRecordSection(section);
                            setShowBehavioralRecordsPopup(true);
                          }}
                          className={`mb-4 p-3 rounded-xl border flex items-center justify-between select-none cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all ${
                            pendingInterventionCount > 0 
                              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/70' 
                              : 'bg-emerald-50 border-emerald-250 text-emerald-850 hover:bg-emerald-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={15} className={pendingInterventionCount > 0 ? "animate-pulse text-rose-500" : "text-emerald-500"} />
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-black uppercase tracking-wider leading-none">Behavioral Incidents</p>
                              <p className="text-[9px] font-bold opacity-85 mt-1 truncate">
                                {pendingInterventionCount > 0 
                                  ? `${pendingInterventionCount} Pending Intervention` 
                                  : 'All Interventions Settled'}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-md shadow-xs uppercase tracking-tight whitespace-nowrap shrink-0 ml-1 ${
                            pendingInterventionCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            Read & Open
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <User size={12} />
                      </div>
                      <p className="text-xs font-medium text-slate-600 truncate">
                        {section.adviserName || 'No Adviser Assigned'}
                      </p>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all shrink-0">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </motion.div>
                );
              })
            )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </>
          )}
        </div>
      </main>

      <AnimatePresence>
        {/* Behavioral Records PopUp Read & Open */}
        {showBehavioralRecordsPopup && activeBehavioralRecordSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex justify-end"
          >
            {/* Backdrop */}
            <div
              onClick={() => {
                setShowBehavioralRecordsPopup(false);
                setSelectedRecordToFill(null);
                setFormActionTaken("");
                setActiveBehavioralRecordSection(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col border-l border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600">
                    <AlertTriangle size={18} className="animate-pulse" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 tracking-tight text-sm uppercase">
                      Class Behavioral Logs
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Class: {activeBehavioralRecordSection.name} &bull; SY {activeBehavioralRecordSection.schoolYear}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBehavioralRecordsPopup(false);
                    setSelectedRecordToFill(null);
                    setFormActionTaken("");
                    setActiveBehavioralRecordSection(null);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-900 bg-white transition-all shadow-sm cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selectedRecordToFill ? (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecordToFill(null);
                        setFormActionTaken("");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      <ArrowLeft size={14} /> Back to Class List
                    </button>

                    <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-black text-rose-900 uppercase">
                            {selectedRecordToFill.studentName}
                          </h4>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                            DATE LOGGED: {selectedRecordToFill.date} {selectedRecordToFill.time ? `@ ${selectedRecordToFill.time}` : ''}
                          </p>
                        </div>
                        <span className="text-[8px] font-black bg-rose-100 text-rose-750 px-2 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                          Behavioral
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Observation narrative:</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold mt-1 whitespace-pre-wrap">
                          {selectedRecordToFill.observation}
                        </p>
                      </div>

                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        Logged by: <span className="text-slate-600 font-extrabold">{selectedRecordToFill.createdByName || 'Staff Member'}</span>
                      </div>
                    </div>

                    <form onSubmit={handleSaveActionTaken} className="space-y-4 border-t border-slate-150 pt-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Action Taken / Interventions Conducted
                        </label>
                        <span className="text-[9px] text-slate-400 block mb-2 leading-tight">
                          Please fill in the actions, interventions, counseling steps, or solutions conducted for this behavioral issue.
                        </span>
                        <textarea
                          required
                          rows={4}
                          value={formActionTaken}
                          onChange={(e) => setFormActionTaken(e.target.value)}
                          placeholder="Please document details of the actionable response, parental contact summaries, counseling referrals, or resolutions..."
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-slate-50 text-slate-700 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 transition-all font-mono"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSavingAction}
                          className="flex-1 py-2.5 bg-rose-650 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-md active:scale-95 text-center cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isSavingAction ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              <span>Save Action / Intervention</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecordToFill(null);
                            setFormActionTaken("");
                          }}
                          className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed mb-1">
                      The following behavioral concerns have been logged for this section. Click <strong className="text-rose-600">Read & Open</strong> on any incident to fill in or update actions taken and interventions.
                    </p>

                    {behavioralRecords.filter(r => r.sectionId === activeBehavioralRecordSection.id).length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 flex flex-col items-center justify-center">
                        <CheckCircle size={28} className="text-emerald-400 mb-2" />
                        <p className="text-xs font-extrabold uppercase text-slate-500">Perfect Record!</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">No behavioral incidents found for this section.</p>
                      </div>
                    ) : (
                      behavioralRecords
                        .filter(r => r.sectionId === activeBehavioralRecordSection.id)
                        .map((r) => {
                          const hasAction = r.actionTaken && r.actionTaken.trim() !== "";
                          return (
                            <div 
                              key={r.id} 
                              className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                                hasAction 
                                  ? 'bg-slate-50/50 border-slate-200/60 text-slate-700' 
                                  : 'bg-rose-50/30 border-rose-150 text-slate-800 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div>
                                  <h4 className="text-xs font-black uppercase text-slate-800">{r.studentName}</h4>
                                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">{r.date} {r.time ? `@ ${r.time}` : ''}</p>
                                </div>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                  hasAction 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250 font-bold' 
                                    : 'bg-rose-100 text-rose-700 border-rose-200 font-bold animate-pulse'
                                }`}>
                                  {hasAction ? 'DOCUMENTED' : 'PENDING ACTION'}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Observation Notes:</span>
                                <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                                  {r.observation}
                                </p>
                              </div>

                              {hasAction && (
                                <div className="bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/55">
                                  <span className="text-[9px] font-bold text-emerald-600 block uppercase tracking-wider">Resolution Action Taken:</span>
                                  <p className="text-xs text-slate-650 font-bold italic mt-0.5 whitespace-pre-wrap">
                                    {r.actionTaken}
                                  </p>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecordToFill(r);
                                  setFormActionTaken(r.actionTaken || "");
                                }}
                                className={`w-full py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                  hasAction 
                                    ? 'bg-white border border-slate-250 hover:bg-slate-50 text-slate-600' 
                                    : 'bg-rose-650 hover:bg-rose-700 text-white hover:shadow-md'
                                }`}
                              >
                                <FileText size={12} />
                                <span>{hasAction ? 'Read & Update Action' : 'Read & Open / Fill'}</span>
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        {sectionToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSectionToDelete(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col items-center text-center p-8"
            >
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${
                sectionToDelete.deletionStatus === 'approved' ? 'bg-rose-50 text-rose-500 shadow-rose-500/10' :
                sectionToDelete.deletionStatus === 'pending' ? 'bg-indigo-50 text-indigo-600 shadow-indigo-500/10' :
                'bg-amber-50 text-amber-500 shadow-amber-500/10'
              }`}>
                {sectionToDelete.deletionStatus === 'pending' ? <ShieldCheck size={40} /> : 
                 sectionToDelete.deletionStatus === 'approved' ? <AlertCircle size={40} /> : <Trash2 size={40} />}
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">
                {user?.role === 'system_admin'
                  ? (isSectionEmpty ? 'Delete Empty Section' : sectionToDelete.deletionStatus === 'approved' ? 'Permanent Removal' : sectionToDelete.deletionStatus === 'pending' ? 'Authorize Deletion' : 'Request Deletion Authorization')
                  : sectionToDelete.deletionStatus === 'pending' ? 'Awaiting Approval' : 'Request Deletion'}
              </h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                {(user?.role === 'system_admin' || user?.role === 'admin')
                  ? (isSectionEmpty 
                      ? `This section ${sectionToDelete.name} has no learners and no subjects saved. You can delete it directly without requiring an adviser's request.`
                      : sectionToDelete.deletionStatus === 'approved'
                        ? `This deletion request for ${sectionToDelete.name} has been authorized. Permanent removal will delete all learner records and academic history permanently.`
                        : sectionToDelete.deletionStatus === 'pending' 
                          ? `The adviser has requested the deletion of ${sectionToDelete.name}. Do you want to authorize it for permanent removal?`
                          : `You are about to request the deletion of ${sectionToDelete.name}. Since this section has active records, it requires authorization from a System Administrator.`)
                  : sectionToDelete.deletionStatus === 'pending'
                      ? `Your deletion request for ${sectionToDelete.name} is currently waiting for authorization from the System Administrator.`
                      : sectionToDelete.deletionStatus === 'rejected'
                        ? `The deletion request for ${sectionToDelete.name} was disapproved. Reason: "${sectionToDelete.disapprovalReason}"`
                        : `Submit a deletion request for ${sectionToDelete.name}? This includes learner records and academic history, and requires System Admin authorization.`
                }
              </p>

              {sectionToDelete.deletionReason && (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left mb-6">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-2">Adviser's Reason for Deletion Request</span>
                  <p className="text-sm font-semibold text-slate-700 italic">"{sectionToDelete.deletionReason}"</p>
                </div>
              )}

              {/* Request Deletion Reason Input field */}
              {(((user?.role === 'teacher' || user?.role === 'admin') && !(sectionToDelete.deletionStatus === 'approved' || isSectionEmpty)) || 
                (user?.role === 'system_admin' && !isSectionEmpty && sectionToDelete.deletionStatus !== 'pending' && sectionToDelete.deletionStatus !== 'approved')) && (
                <div className="w-full text-left mb-6">
                  <label className="text-[11px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">Reason for Request for Deletion (Required)</label>
                  <textarea 
                    value={requestDeletionReason}
                    onChange={(e) => setRequestDeletionReason(e.target.value)}
                    placeholder="Provide a valid, detailed reason for wishing to delete this section..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all resize-none h-28"
                  />
                </div>
              )}

              {(user?.role === 'system_admin' || user?.role === 'admin') && sectionToDelete.deletionStatus === 'pending' && (
                <div className="w-full mb-8 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Reason for Disapproval (Required for Disapprove)</label>
                  <textarea 
                    value={disapprovalReason}
                    onChange={(e) => setDisapprovalReason(e.target.value)}
                    placeholder="Provide a reason if you plan to disapprove this request..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all resize-none h-24"
                  />
                </div>
              )}
              
              <div className="w-full flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setSectionToDelete(null);
                      setDisapprovalReason("");
                      setRequestDeletionReason("");
                    }}
                    className={`py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors col-span-1`}
                  >
                    {sectionToDelete.deletionStatus === 'pending' && user?.role === 'teacher' ? 'Close' : 'Cancel'}
                  </button>
                    {(user?.role === 'system_admin' || user?.role === 'teacher' || user?.role === 'admin') ? (
                        <button 
                          onClick={async () => {
                            let actionToTake: 'approve' | 'request' | 'disapprove' | 'cancel' | 'delete' = 'request';
                            
                            if (user?.role === 'system_admin') {
                               if (isSectionEmpty || sectionToDelete.deletionStatus === 'approved') {
                                 actionToTake = 'delete';
                               } else if (sectionToDelete.deletionStatus === 'pending') {
                                 actionToTake = 'approve';
                               }
                            } else if (user?.role === 'teacher') {
                               if (sectionToDelete.deletionStatus === 'approved' || isSectionEmpty) {
                                 actionToTake = 'delete';
                               } else {
                                 actionToTake = 'request';
                               }
                            } else if (user?.role === 'admin') {
                               if (sectionToDelete.deletionStatus === 'approved' || isSectionEmpty) {
                                 actionToTake = 'delete';
                               } else {
                                 actionToTake = 'request';
                               }
                            }

                            if (actionToTake === 'request' && !requestDeletionReason.trim()) {
                              alert("Please specify the reason for the Request for Deletion.");
                              return;
                            }

                            await onDelete(sectionToDelete.id, actionToTake, actionToTake === 'request' ? requestDeletionReason : undefined);
                            setSectionToDelete(null);
                            setDisapprovalReason("");
                            setRequestDeletionReason("");
                          }}
                          className={`py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all bg-rose-600 shadow-rose-600/20`}
                        >
                          {(user?.role === 'system_admin') 
                            ? (isSectionEmpty || sectionToDelete.deletionStatus === 'approved' ? 'Yes, Delete Permanently' : sectionToDelete.deletionStatus === 'pending' ? 'Authorize Deletion' : 'Request Authorization') 
                            : ((user?.role === 'teacher' || user?.role === 'admin') && (sectionToDelete.deletionStatus === 'approved' || isSectionEmpty) ? 'Yes, Delete Permanently' : 'Request Deletion')}
                        </button>
                      ) : (
                        <div className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center border border-slate-100 opacity-60">
                          <Clock size={12} className="mr-2" /> 
                          {sectionToDelete.deletionStatus === 'pending' ? 'Pending' : 
                           sectionToDelete.deletionStatus === 'approved' ? 'Approved' : 
                           sectionToDelete.deletionStatus === 'rejected' ? 'Disapproved' : 'Ready'}
                        </div>
                      )
                  }
                </div>

                {user?.role === 'teacher' && (sectionToDelete.deletionStatus === 'pending' || sectionToDelete.deletionStatus === 'rejected') && (
                  <button
                    onClick={async () => {
                      await onDelete(sectionToDelete.id, 'cancel');
                      setSectionToDelete(null);
                      setRequestDeletionReason("");
                    }}
                    className="w-full py-4 bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-300 transition-colors"
                  >
                    Cancel Request
                  </button>
                )}

                {(user?.role === 'system_admin' || user?.role === 'admin') && sectionToDelete.deletionStatus === 'pending' && (
                  <button 
                    onClick={async () => {
                      if (!disapprovalReason.trim()) {
                        alert("Please specify the reason for disapproval.");
                        return;
                      }
                      await onDelete(sectionToDelete.id, 'disapprove', disapprovalReason);
                      setSectionToDelete(null);
                      setDisapprovalReason("");
                    }}
                    className="w-full py-4 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle size={14} /> Disapprove Request
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {sectionToEdit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSectionToEdit(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Edit Section</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1.5">Update administrative details for this section</p>
                </div>
                <button onClick={() => setSectionToEdit(null)} className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <SectionForm 
                  initialData={sectionToEdit} 
                  onSubmit={(data) => {
                    onUpdate(sectionToEdit.id, data);
                    setSectionToEdit(null);
                  }} 
                  buttonLabel="Save Changes"
                  user={user}
                  globalSubjects={globalSubjects}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={onCloseFeedback}
        user={user}
      />

      <AnimatePresence>
        {showSelectionModalDashboard && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <UserCheck className="text-indigo-600" size={22} />
                    Review and Enroll Learners
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Matching parsed CSV rows against registered active academic sections
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowSelectionModalDashboard(false);
                    setPendingLearnersDashboard([]);
                  }} 
                  className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Toolbar */}
              <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">
                    Selected: {selectedIndicesDashboard.size} of {pendingLearnersDashboard.length} Row(s)
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const valid = new Set<number>();
                        pendingLearnersDashboard.forEach((l, idx) => {
                          const matchedSec = sections.some(sec => {
                            const csvSecName = (l.section || "").trim().toLowerCase();
                            const dbSecName = (sec.name || "").trim().toLowerCase();
                            const csvGrade = (l.gradeLevel || "").trim();
                            const dbGrade = String(sec.gradeLevel || "").trim();
                            return csvSecName === dbSecName && (csvGrade === "" || csvGrade === dbGrade);
                          });
                          if (matchedSec) {
                            valid.add(idx);
                          }
                        });
                        setSelectedIndicesDashboard(valid);
                      }}
                      className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      Select All Valid
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedIndicesDashboard(new Set())}
                      className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Bulk Attendance Date Overrider */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First Attendance Date:</label>
                  <input
                    type="date"
                    value={bulkFirstAttendanceDateDashboard}
                    onChange={(e) => setBulkFirstAttendanceDateDashboard(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0 bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50 sticky top-0 backdrop-blur-md">
                      <th className="py-3 px-4 w-12 text-center">Enr</th>
                      <th className="py-3 px-4">Student Name (LRN)</th>
                      <th className="py-3 px-4">Gender & Age</th>
                      <th className="py-3 px-4">Parsed Dest Section</th>
                      <th className="py-3 px-4">Enrollment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {pendingLearnersDashboard.map((l, index) => {
                      const matchedSection = sections.find(sec => {
                        const csvSecName = (l.section || "").trim().toLowerCase();
                        const dbSecName = (sec.name || "").trim().toLowerCase();
                        const csvGrade = (l.gradeLevel || "").trim();
                        const dbGrade = String(sec.gradeLevel || "").trim();
                        return csvSecName === dbSecName && (csvGrade === "" || csvGrade === dbGrade);
                      });

                      const isSelected = selectedIndicesDashboard.has(index);

                      return (
                        <tr 
                          key={index} 
                          className={`hover:bg-indigo-50/20 transition-colors ${
                            !matchedSection ? 'bg-rose-50/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!matchedSection}
                              onChange={() => {
                                const next = new Set(selectedIndicesDashboard);
                                if (isSelected) {
                                  next.delete(index);
                                } else {
                                  next.add(index);
                                }
                                setSelectedIndicesDashboard(next);
                              }}
                              className="size-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            <div>{l.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">LRN: {l.lrn}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-semibold">
                            {l.sex} ({l.age || 'N/A'} yrs)
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-700">
                              {l.gradeLevel ? `Grade ${l.gradeLevel} - ` : ''}{l.section}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {matchedSection ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Valid Section Match
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100" title="Please configure a section with this name and grade level to enroll this student">
                                <span className="size-1.5 rounded-full bg-rose-500" />
                                Section Not Found
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between sticky bottom-0 z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[50%] leading-relaxed">
                  Notice: Invalid (Not Found) sections are unselectable. Make sure sections exist before running bulk uploads.
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSelectionModalDashboard(false);
                      setPendingLearnersDashboard([]);
                    }}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUploadingDashboard || selectedIndicesDashboard.size === 0}
                    onClick={async () => {
                      let selection = pendingLearnersDashboard.filter((_, i) => selectedIndicesDashboard.has(i));
                      if (bulkFirstAttendanceDateDashboard) {
                        selection = selection.map(l => ({ ...l, dateOfFirstAttendance: bulkFirstAttendanceDateDashboard }));
                      }
                      if (selection.length > 0) {
                        setIsUploadingDashboard(true);
                        try {
                          // Group learners by matched section
                          const grouped: { [sectionId: string]: any[] } = {};
                          selection.forEach(learner => {
                            const matchedSec = sections.find(sec => {
                              const csvSecName = (learner.section || "").trim().toLowerCase();
                              const dbSecName = (sec.name || "").trim().toLowerCase();
                              const csvGrade = (learner.gradeLevel || "").trim();
                              const dbGrade = String(sec.gradeLevel || "").trim();
                              return csvSecName === dbSecName && (csvGrade === "" || csvGrade === dbGrade);
                            });
                            if (matchedSec) {
                              if (!grouped[matchedSec.id]) {
                                grouped[matchedSec.id] = [];
                              }
                              grouped[matchedSec.id].push({
                                ...learner,
                                sectionId: matchedSec.id,
                                sectionName: matchedSec.name,
                                gradeLevel: matchedSec.gradeLevel
                              });
                            }
                          });

                          // Process and write batches
                          for (const [secId, list] of Object.entries(grouped)) {
                            const batch = writeBatch(db);
                            list.forEach(learner => {
                              const docRef = doc(collection(db, `sectionxœì½krÛHÒ(úß«(3:>‘Ó$%R–jI>²,·ÕÇ¯ÏrÏãúsŒ!16 êÑFœÜ-Üˆ³³§»‚»„›Yï'I¶ÇÓŸa(TeUeeeeeee–ë?,Êxt4^®—Õ|gUù±Óùéq~'Q5šôË¸jóÑÛø´Kž\æ WIž·	­¤»²DMãm’ÆQ‘ÅEßV—I£²ze”)äŸÿ$­Öj§IaƒIMaL“ñ8M *­)”ø²Š³p¦€È¤¦0ø@¾šOOâBCJA!<ª¸ŸåíN¿Ê«"ÉÎÚH.2Tƒ®L£$Õº¯M»gQQÆGYÕ  µƒ6V8IŠj2†®ªÈ¤ÆxŒ/UixY]â"NÎ&•*ÄÞ6ybž\§ðÉ4Ñz:MËæ@ 8E£ô¸Šªy©Í=û‚\,WÃD¿>}†óg¿ÒGÙHïç¦C’”ïŠ(+Oã¢ˆÇGEZÞi”–¸%‹YlR¡i	v<.âRCOhZ~V$Ó¨¸:È³*iD`¦Sh§Q5‰‹&\f´ØšLkÌ×rŠJk
ålã$ÊL8zêu!½ÓÉ³œ$3¢þµ)äC²Í7äÆ|<MÎ’“$Mª+ªÄ¦“é¬ˆÆ1U“¼qVäiç'ÿ€…÷håÞhXÇ‹ø<Ö¸µJkÎ-éZo°–Èà¬ ³ôŠÍ¿GQRqQe”O§IÕ®-±¼Sód_giBG#˜ËO£rr’}µ«b×Â…¢ï’iœÏ«v»Cv÷j`Q6Õé’­U0'ùÅqœ2¤¾ÌÇQjÃYàð[Xð_°áÑZñþÃª¢Oæé'‹k£(¡@´Zµ ¢4.ªvk?Mu”¤dÈ8§é™SüÄceð¯,“³^ªœ ¯I
Üt†?©•wëj\’’iÃ’Ð©•Ua‚—y÷!c^Ðìúqˆ™ÉxŽò9Üðö÷Éè^“Ñ$}’°ë[zšÀ*(¨k%ÁQÉhªl>îËÀúÒŸ<‰ºÄY¼»øxšÆ—$©âiÙ˜	<ñ,šõ†dvÙ»OfW½a‹œœõ ´³¼wcƒLòs`¨*í¤U Öö.& ‡ù<ƒqï]¦äxmï$OÇìûe	XÅÅZÑèt½w‘Œ¡ÒÑ¼(ó¢7ËÚ†
—*¯ô •¤œDãü¢7‹'Õœõá‰(!m—#ÍÞ£-BRÎ`Áïh\D3òCh,Ú‰g¹•tb¢ô1N€ªå·~™ü“ÝÝ]²Ñ!ÉZÕÀ
ÐÛÚ}Èò
_Ä²¹YžÅkd›¬­ù‡é£oœö¼yÞ?&í@wü`è§8C‹!Á.í.÷–e´¢d•*î•³$k‘õ0€élï.WÐ¨~¿¿³N“B-
Àê ‚nÒ‹_Ë¸8 ÓSõcesAƒ=á”°fOòI{Q;æËÎ»åÛõ“yUå`;ëãäÜNö$î¬ƒØó£o}±²ÊÚwÖ÷Ù€¾Ö»gydvà9°|Þ9g”“C%Ý<Ë‹i{³¹˜v‘qá;Y‚C“¶Ã_Étú;e~È.+]x"»´ˆ+:ý$sÏg¸¥84Ê´YbIÓ˜Mg^'´ˆŽ5ÏÔhº–ÒÅwø4? nø¿ˆ«9ì¨ýí Nô©0ÊÓ}—6r’0kz•x(Sœ&à‚³ª÷L«Þ=Â˜ÏUï~KÅÎdSIb9å,ö&ŸdÀ° «XvKúI1Jc1+î/úãi\Déx×†1ÃuìZÉá‹Ã—ë¿<?^?~~¬ÍIY“MQV$Y<+’1Áÿz€Ê²7 Óñ¶zÒöß×Ûo•èÔû¹Òè$Z»Wï³ËÌnÕa¶µ÷îj“ü”äÓYjwÖi%FµŒMc:žGé°¬[¿BXTL69@žL¢ìs#);äŒE·IÜ¯¢â,®ú8Q|n™à´î_p=“å4j’êp ­Ò°ÒßÃ•~P6š—Û(AŠö¢ÑÉú`ƒá µoöªò2,1]ýØpLãq2Ÿòñ˜êÛ‹¹å3Ê„V[-2NÊè6C{“<‡»Êç…N¦;ë¬D-˜Ã4F²…89œTsk¯æc#àÏ“³‰¬7¹À_æYs/ ·îk#ðoß¼#o€tšöÒ¨ðþ‹c²OþƒJvJ#0¯QïP¶öØ_Ò~“–}rû‚äôªãƒ +0{§`ë—|wg Šjk5£»Fþã?¹Ã’5šñ"šóóó£Ÿã§Ù‘;:‹=ÜˆVœd³¹Åð‡ýgpwêT6Ù<.v[qÿ¬Onõap2z8ÛYœíŸŸ!o[[s¥›üp8œÍÚð÷Ç`oø[·8W¦ûW’ÚARQl‰NÉþ«¿u¾(±ý%©&äyžå0ÿ›ÜH´îæD'@|'»o‰ì¨2$.‡CFòóÐ,#SVÐfÞªL@ßië[¢-¾Ô=ýZ´t4þ,”„'ìßé¨–ŽÌ-ùW¥ª}~Lëërª}uykÛ'œßéÌØ_š³U»
ïîëû~âû~â› æ1©áq"òÈŸ‹h<§‚÷:Ÿ#ðø¥ïåËõ§O×ÿ¿F„7)U“žr[¢’ ê;1~KÄ(v_cÁž”Ÿec¡ƒùNLß1}ePÂíÅ?ÒwªºðW§ÿ.~—¿	šþ.®$¼|F!Ðõ¿%rüšRà?>“øïrà·JN_YüÇçmPßéê6’ f=ñM~´oaÎÎ¾,¥ÎâYÅê¹* ß©ó[âzB¦;¼Œ¦¤=®ÇëWðûbö×”çnn)Æ	ß	ï6lÑ6	û¦y£jì×`QZÞš?Jß©ô[bf]“ßA*ôµÔþâdÅª9ÊNóÛ‘–‚ó¼nÃ™i«ËúndÎðÈ5`zë¡R?†)ÔCŸôžqÉkñÓgê4 4 Î?
m®›dºæ#Ó­«=òf0'~c”Þ9ŒBv{æŽ¼SCŸóì8:ùãÞMñæpRîÓwÇÃ7áhŸÏÒü$Jùå’ìòË¥“À®|jê[ž½+’³³¸À+ªìªÛzÙˆ·’ß7RMU	¬½Û¤ÿÞÆÑ¨êã÷Ãsh½5tž'ã®ÖÈi¤«Ž=ÞŠÈÓ8Êô.>¦U±fš]…/üÑì±“Îz‹Éì‰ü“d@’:&ÔÇ Bë-¿cÜ¶z_ÂØŽ&/ŠŒÞÉ:o Áó2Fç±¸ÜËK$%Ë”ÜeSå»QJÝM5ªzYžiUÁ›QH\fY[ëR²Æ'zóJ‚áý¨|‘@ð2žæüÂ5»ï•œ’¶¤%à¨â¹ŸÆÙY5!{x'SÜôä7ºdžÓ$…ËÓÜó“¾ôgCYµš~2æ÷oÙœâpÌñ¶ 1oø¦]µïP°â“€®}g×Ïº€GµkÕÒú ãk6É«ü™ñÛø”a
vž¿{ù‚¦rKÚ½6–>\£"ŸM£³ø¸Ñ;ÐôAÛ)©#N›„zœÆ´ä³$ÇÆ{zrÞ±$:óÜ†Y#zWrp@jLÕZVÒû>ldX3ðÔêäÕó1^q…\Y|A°±oi‚ð#À>÷ógíd‚Ž°‰4•Wó¸¢Ý<­ô[è.ü<;^ßbh•·»}-–àŸý6ŸÑ¯o_´±G<»µÌh±¦n/êÃÂ¦!dˆÊ«lDìùsWòvË™¿ô¡iÓ6#Ùµ5Õ7}^«¹LïÖ«	ÍïÈ³»ˆQF^¼}…7ýð5ÍÍƒ>†¬÷wx%ÏÑý1ø«·Y‰TêÖýú:y‘çx‘Ÿ$`(åŽ~†•}Ö^<}­Ãó3þˆûmWm»Äø¤K´R]rbHÜ^K‹Ú³¶»»ÖuÐ©|oqV—E3ê×ói>*Û¿ÉLÅÝÅ¬ýx:«®tBƒN½‹>ÅèD¹¹"St‹€“•7m­D—=‘,Á+f‘® ~
{uÃdA>‘îVC¯‹]«†öðò°BÂæ iôŠ"u^˜Ê¹ð­!%™Á”Ð(ï_wóç~™OãvIy2ujEy±j.¦uLhòÝÚÊ]SèÍnU°ýˆEqç[t¢¿f¹%Ñi–Ñ­Ž¡7ùlŽ2# N@Bžáë[@Ï`”ât-I`ÔZ%u½ÔBddqŒÞ1ò‚ ;…‹]'@{¦þÿ¯˜È„`6æxõúïÎœ¢|jµ¼­µ^\ŒÖ’”ƒ5Íš“5˜`Z~Íš^Àp©f–Ð§éELjfÍUš^Äp—f– >Ì,Jqsi®Ãô¼†û0«%ÌÓ™Ñ
áíÌÌIWb3'Mrs¼hé%ƒž´LH%wì¥-¥G¯µ·ñÐcaa~ËþþéÌ,%“ÝJ˜³²¿¦f	™ìizW3Ú_Ò\/£46rRgpzNHð‚~ßŠ°×¥¥‹ù™wU£Øß±iÕ'ÔÅÁŒÏí1›qñeÂT98é6±„æÂú·XQ©Å¡^å’?±ÉLk©&Q…¨Y[1¥ÅMo7ÜM)–RQÁ6iu‰r+Ó¨yû¡)$Q>?îqt­}®ÇkA×Ú,ïø].(orÌ`§¥»Øò3'+ÛdC¹´áþIŒÏõF«
Õ4§É%] Å½ò;êR6>x<,üccz%^g°ÿ—Z„G°ë¿¿AN¢Ñ§1,y½“t^h»wØm¦ÉèÓîBl;Y3¤c·çFß©Wh~ÿÑVWëM—ÀÿÃÝÅ†^h •ÐF£æUÈ¾ Â’ïÉgo ×ÑµïikêÍ€+æˆk`¦Ñeï¢wï2•z–á¥tóƒ¸(ž¦ð25#ÎØˆàè2‚ŸôÞ?Ú8Ÿ|h{˜õîýÎ‰ë´ƒBÃ{W1TgŒ½¦.ZßÚ0]P¸ÊçÉÐQÐ¹®¤›jE@^Áæ„s õÉÐ‚8s–~€÷ ?Óª7¨ÓøÁ
|u)ÕQ¯\ #qhg}V£jrñë÷GrÏR^.”vå?VÃV’Òº˜Ÿ+UèÙGW7®M9§–ZåuÈÖµ<`¹n¯„iiŠÅ —+Û¡•åËçËF‚Ç³nÕ{IbÞ‘[„JûàøÏ×G~/F–– ­8pEï¨àHœ»*ZÊQ¬Y ¡†sËÜéÉ_9Z†Z|½´æ„í…Âž!’›]õ¢9Ì¶Yï¡îí†JõT6E†ÌÔ˜KßÖCcRi‹õ?‘ãÃý·ÏÉ“×%Ï^¿¥»ð?­/k&®¢`GÎÓš‘-›nz(Lÿ™„Ë¡8Äz×FÓ“Þ&9IsØu®örÄÀÊÍÑúái‡BdâÝÉ¢Å^ßa‡Åaý›ný·µo8¤{€Ÿ„É~ý~ð¼OªVžìéÚß¶©>ª?Á£Ëì€È5ÛK×>#‘”æ‘¨OMOHVœÚ¹Nã…C×¥¹Èîˆvšî¼§×Z@„ïÅÍ€3E}Ò4_DD£·•ËÂÕ‹†ÞAtw(_€F©GC–àœãù—ÏaýB"ô^@€AÀÙ'dVüüb +îzòd–mw°OV‘—1Ží”á——ÜÔ‚ÝÙG×¢Ž6`NÛ!ÿlë{.Yøqñ<«Y}íu)laKk^¨äïñ6}.òæ»#¾&S9×¦7T/ÂEŠÿg³¹4­®Ó#•‰ÍÄxû‚­«åXÍ§žXÌz<ÂWñæñØÇsÀ_˜q'À±ðå¤·át‚‹FŸ×?—¿aÿDÏ2(’B^&wŒ¢ú©-Ý‘§C}®¡}Üaž¶×¥á§/ŸÏ`cŽÞ¶Ïc[ì´÷dº`À1;ã¨œÀÆÚ9VçœÏáûú‘¼ÅÑjÈÀÚ•SÌóg)#Ã²ïóS]VW)Ý*Ã`T˜óÈµ®tÜ¿6¸7€Ÿ]wp€È©cK¦þycz1ÝI¦g¤,F»”%‰Òj·¥h$>Oâ‹–ÇœaÂþäôÐ®qØjÏ²è¤ÌÓ9¬:B	bë5Är±A(yôØŠÔ¹hóäë[÷Ü	…Œ=è3˜òwtº9ðÌVÙÝƒùxLZw·L¸ZåÖã½U|ò¥‡Þ^ƒúÄRÿ‡÷Üþ³ÁÞÜ2ÇW—Ù·|*”Õ‡utæg—ÌÁµ¶m×kAx‘ÆÔA2•[Âid-{­môl´…¬ž¥BöA*Y^TäP_Wmh<ì:7´	ò../-ßç">Ý]k†o‰P;ïÑ¿¯H4Å3à_	f]ÿ“khf+Š§…òÒ9­GZ¤èIÿ
#|àÏb­©â`­=&¬œ3¿Ã˜ÖGA­Yv¼«,©
Jp rhÜPmv¡Õ^2ÍÍ5`‹,¿¾¥mBxn;†¸íÈ•}:ö›ŸŠßÆS È&™oH‚¯t¹R+MõðChj×Â÷¸¤èêò0ì¼,µ±ºƒ1Šûõà‹x‚	ØÓƒS»^Ç€?÷BöSíÈA1ÿÝ_€+è3O„ý4íªØ	´ôÇ­›GÑ,©¢x!¾;
‰Õ“æKo~QÅþ|jV/‰ÿ«É‘>]züeyÔ0øÓIÑ²5¸!-j†ß‰QÑo’_Rc‘¯K°¯òÕähÛ±Üu3™ï©ê7It¼/«þ×cŽE—­&HËJê†ô¨™`}'G}Pý{®oŒ<_¼}õ…“}™!S6ŸÆE2òç+âßæIWS·<ìÊ¨u|Y´¸iS[A“Šÿ{ñ7F´O„æ­H¬¦!iòÙˆ†BÃ˜=õ¸Ò/ÐZB1ÛÒ¸B›ÇãªÑà-”­¤ÇU]€;Vÿ	5]e·ð¦:
ceª|]éejJðFCnZª½|SáoqT´;¤Çê7SWU?Õ½Z™˜xRâfJvÈrx¢1ØP$¡²^A	”¥tê#BG{½ë‡Ü#jXáA¿ä²+Íhy\u™É,«,2se¤¿?"3[™èIª=å¬c~Ÿ—ñR‹r~OüF·Â©Mú
Ó’7yRÕÅ–%	”0IeèÞÄ¾Ä ™åüêuöß,ý—ÄïÔÒV#E¥Ku×Zž?/îC®>pI“ÍdÉIoñ¼ÎÒ+Ï'ƒôÑßm÷O‹|J¤œá«MŸ ‘ÿ4c%éSÝDÀ¬!}ª¢¿íäjXÄð{änDR·ÿ®éT#õû×$Äãø2Lˆ¾h|î¸×Qn4Âô†Ë-GøÛan`;*Ðð6H=.©x¥s3¤â·µ‡ÿû#Ày=ƒ…‹±¿á‚nø7‘Zù¯Ã‘C,ø_¼EúµG!íOg![´Î•›¤º­vYÅ³ÝÖFÐT3uoú¾rÇÅn˜Ýjã~Á­qþ@{÷FSÍ'öúõPÿZê|Î©s4ý†¨sàZ¶²ŸNœ“Ûçä;qÊßy°q‘n`öwåÍ,«öÚï„h{•+¯9lèM°…:¦WlV<þZ=Ñ5pª^ygèÂpzâ!$ªOY“iÒÅ+¡ñY^\‘%Ù…/Tè}òò¨=‹Š2~–æQÕÖxqé}£Kì¯íkPÁ/lBµèi…<&XÀË’ôÈÑŽåG4 ¦ŽŽ²wˆ¿æ¹ìxìQ}nBG×«Ðmß_ù2gèù)Q—¸o´½÷oVtæ½0~ƒ]{ànúdß€¡vóuäæ¿l°)îçbœÛYi6qÂs6<ÖæÁ“QÇïœä—ÞœŒw[IùQrã½í#Ÿ€X()Yù‘Ð;Ûž…l%9Y°4Bâuz×Gƒ–¶È¤§.J¦gl9ºpþi"Q½a¡uè	<áY¶ØäŸTÓúáb.ÌWç>¨½Ùf_á¤nŸê¢ã…r\¢µ8êúK4²;r.Äúo±]q~aÎHu0TXû¢!G^FY’Fõ¬óD6åÆºNâ&§åÿYç×#¸çèç6*ö$'Bþˆzêé.º–ç~–Ñï®ÿ;…™×šýò³ÙßB!ð^kï
¢o^eïÝ1ù• TÊ~¡+Õµ’à).·´]SpÛ¾pi­uÚµžÀ5>Ù¬+¢q’·HÆö‡E2Š+˜]-Kfá_ KÑ¨b—/OY‡–ÚL2-øÕT2‹o«²ã†ŸÎöÍìbðÃóqŒ÷·h}5j¸?÷ŒÁÀÐ½K¨ôß%ÌærÕ	ÃT½ùãjc\	äfÖfþöop s]¶ò2ÿƒ±•i~s¶"Ê~g+«Ø
ÃÔ-ÙŠò­üÁØÊÏó¨'Qöb,g¢K7b-ªô3ærtJ²¼B%6z]ÅWšnÉYt0ßyË7Î[Z’[·Ô›Ež•“döeÉ’ªŸöçY•¬\ë1éû´©ƒÓi”®Ãß‰ôfG”úÑ*¾°ÖŠ3]rð†¬±Z°(_Toºñh0Ü¼·uÿÁÃGõJ¬kkÒUY”ï
­*´f¨ÐòåË(›Géqr­;;¦ÇyáIÉ2Ka)'plßXºe4Y%‹/ g@bQ ¶	Ëˆ’ŠÛøÛ±'Ïè3GFÜÎU”"˜ïgeCÕCo`ÏjË‹Ð Zñd*ÖdHµFÔ¹4bˆa|)0‡uÑê‚Ò(.ZáuréuÝƒpâqgËÓ'›aó‹½=>u=»jØÞÎ“<ÿôzg5žz”,ÛZß#‡Â“¿—²³>Ùô¶Þë@×²™R7BlžPWûH	ÉhžÎ§*~Q¥¸HÅzD¾ãŽM£²kµÍåÔÑ6or×Ç[÷‰íS˜U•O{å[s¡W ¿_¤…'àNÍhh»fv’”ï»„p€’stúI6JaÂ–´
¬ãüWàž_a?ÅW0G(:5‚£>èäqü¦çøý‡…Ö‰ÇdÍãUórIZ¾0CÍ¸w tèl*-7êü×çZ0H$0q7†}ªLµü­´#Ðr'«¾EÚ×3©:yK~E6 +È+|e‹ÿhèËú ƒUàAÜ*šT?êÜKc<êk^ÐsCÆéË6Ù/Šèª×ÚPI'tÃKþW½äÏ”î‘	üi¼²±‰¹–8jÜ¦ÕyCcßë?/ë®[w„Û/êƒ«µÇx*f–^Æ¼¢&î‰ÎZ(ôû!M¢jæO¯+ÒW¾Ž¼Cg¡(7¼~{¸ÖYÑ¶z$ÖÝùÏMôïû¼««&oZt0šåÀ’Ë}^!7-)ÈUóãXçÙ¯É²^£}DÔÚ{•«%ØÐir6Gk˜²lÅ±úÖ	•+	•!Ã£vknžÄkºuÅ3nS¿gc!AT®·W¿¿´:_É×òßÎý£ûûÚ9¼¥ûFönâÌe´Þ©;k—%š{Ý×u¿¤^Ùíî+ÐwU\ƒ†(€¾À&×ôMSÐ„Lºi–(Ø4½C»ÔðÃÝž¦gâ‰ÂºÛVVq¦ÒZ®P°z]¯E4sgl82¶r C{iÔö6X9.Ž}\BõwãóBnè„Û¥^é0DyjTð2»s(ÆáÈ2˜eŸ C¹Ï+×4÷hÀB·6³¶£
ÊxŽê·tÚIi^;Dp!èEÌ`Æ±*"ûl§Xeù¦ü9¬yq%‚Êòà"]Ê)Ðý&âÊS·E!ùYhJÌˆ¦˜†¬ä•Ñ*ÅÒ%ã¦vE5/òQ”ju	.¯Ee]¾ÿ°×æÂ$¯}T‹X¨/Ø³Ò”Ç'„txz
p‹}ê<²tyP×,£ÄÚi\&¼;íŽnò.o>}§Q~c€;ZÛŒðJø3#Ö‰aÕc#~¦h‡Z+µê…:Tñ9‘À€Üviü`Ããú˜a<%ŒtQ
ž7¢OûÓ¤ˆqbÄî¦«hRcóÍ@*OÊ¸SBD± ÍÝ€ ¡¿Œ¦hz™0/Ò>@°Ø&cØ=t‘ŒyôE²Äð ¼‡?¹@FX¸×q¿ˆOûìì‹ÿÑKÐ8‹2¿íøBÂ;v‡G/fró˜†¤ÄeÛçRCça&YgEAÞeñjtœUì« Œ²§¹¥F³œ\¹öâT•®	‚YsY¬VP-j£#JÕ"ã’3p:t¥»Òìá©‚ÓS6/'ÈsD™t®È›ØAo«ç¥Kò:›°âf
~#ÚTæð®¨{Â)¹_Ž&yN=»àN¥ÕêôSl^Œö®@sí(œÓDAŸMWqíŠ¢cñ('¶e›Z˜QÂW‡mŒpåº·ä‘õèÿ&Gay™fŠ±wÅÖ)”ŸXð^ÂYñB#X3Ð*»:†Ú²æM-´È©´¤÷H-ž2!‚¼žWk"F²™úS(ú’ý%Íº7á G™(ÌþÇU²Ê«(eœãñ3"ˆxÚøÉÊñk–Túö¿Šì‡ÑhâÓ_rÏGq1-Ñ7UZ¾t‡ÝÍî½tvWXz0¢¡éþ®íNÈ.¡œß vbÕéÓ˜‡üÁœÒäõ#š´Ê½qÊ–R o#³h—¼ŒªIŸ
÷Àð|³i»»ý¼à­·&›±Jæ”Q!1Ä’»@¸€ºã±«®>¡Ìh¦Òæ?Ö¶É ¿aUåÚwþ‰Ì}…ØhC^ý+ç’'*2ÔÊØxS0Û?·ÑéiÝºV½Ž8 žÙÛ%¶PküDƒJSýðÛ¸Š}‚Ä—z+E$zÏìC-Û=jÑ¼¿ÑÀ˜ƒ/· ßãbò¸˜›Z\Ì÷Ã"ž~¸vhÌ‡[CcbÄ›ÞÃU2½ƒ..ek'ñNxÌ`[U8Ó¬óÈ¯Úã±‚çS_¬¾ä»Ð¢ Ö>ºúý¬ÓdD8,K¹Ñ ¤§Pè” Æ§cM_9ƒ*µA(ÕäÊL^å@nmÙYÄÓ§óòÏHÝ"2­ÐZXeç²2jc]˜FgÕb˜¬›}³•GVo›ÿÊãT3
,£b“˜\qàÆÿ¹F,›Ÿ^õ6ª}÷(ÝÆÅ£hshÐ/g€½r–d¶åž×ö³	Q
H³9ˆ¿­=.SƒXÌÉŸã°=rÕã	bìQÀ8iøÂø[q¾àá÷øDá`¼<Áo6‘ž…­Â î€žFðg8WüfÞÑBoA õÌÓq¶F…I±+ŽäU|ãGÒ$û„‚<ò/l8b+†&P1Ú(xó=h¶Õ—ábáëBß5Ûš¡ÒÚ9oÓ§’zÄ`•xOT…‚1j¼«vkmfé?‘õ¥á–…A<@v q‰‘‚öDÂ /l¶¿R-ÃMš”1‘ÑÛõŸï»»ÃÈ»í—dTÐ™`Ë—ü¸ÜÓ}+x­ú•£ûÂýµÛÀ…íkUOPdåâ &PuSJ©7y¡³Šš»ÀìXz%F~²ªÂ]ã”™æFaxi‡Ò³£8Þ8Ûa5Û`´\"E¦Båµä?»hSŸ:2”º%¢°,õÔÚ¯Ù§,¿ÈÈñßÖ–õ¡ÀjZ!,{ëeµ:¸ð[0E*V5ËÄŽ\×þ'°ï¸8ÜÇn2?²Ãçf‰åGtÀC©PXÛ›öØ	Êg­¨Sj–¤Drùòâ…D>M^= +ìGš:eqÂ„Bk‡øŠ­FSHú2«TÜÐJ›V¯Ð®×Þ­ ÝâŠ5©ðxÞnçJª+µ=
Žš'ú6Ú@Ö¹ºZÑ‚ÅGÞ„Û,l‡‘dÔ|šâhv‰F{ÌÔ^sÿ$¯˜²7¯ý[(¾¿ÂZªÑœXA‡5ŸÃß<B…c™ã
`*ƒñíÚg¶ûã1?Žÿs_´q5¤jwä	6>²Hô4‘²ÔÃqR±§§Ô$ŸcH£ÆÞ-Fu)Cß™I KaÕ
Ð“yú‰Ùê€_‚øÊàÑfãxÒWÉÔYæ_gèÄJy¯Ry¢Óh¾³4?‰Òã¸Âvòž¼ËÏÎÒ˜‘<KA|¼1p£z’FÙ'=‘{3?I“rBù²ï=–;NÎ2€[ÄZð‘Û˜ÿZÆ…ªb?‹GcÔ?R@u›æßŸ'Oœ8hÝPGVï?`ò<“Æ…|¬ä'0úi?Mù ÓJJ„8@£	wð¼ž“µcÐhC¾3Mü{G£ªŸÏ¡zyš¯“<õ€âêƒQLä G‰ÔÁ¾‘CRøJ˜‰¾I„â£KŒ ùœî!\Ð:êÖ	6½Â7 ‚Šâ„ŸÜ¼aÇÆ;˜}Ï¦gÚ™RTÉKHD)B×­ÞìŠMø {Šqd.ØÆ) gmVÄ% 6d-:¡]v­g›Ga1ÛaÌÞ7w=Ö(AŸJ·åùš.—­·¥Ž±w&˜fžjxWÓóqÝX³¶6¯g2?6(®KVž(Ú¶A$ÈÓ8Êü°ÌùChâæ‰4‰Ðh[ã!ú˜œ¤¦×6ƒy,›à²˜ÇÚÁ¤ŸÓ<vçµÍp‹)äÌ2PàFªÿÈ”Ë r’_ÀJFMŽ¨¹Î±–`Øì¨S_Ã.£DOÕ,ßËxšf<|‡öxî|¹§~Ô2 DçâûUþ"¿ˆ‹qÚî7wDqÖNN,uk
ïûx2Q9æ?,";g—`¢ñc§´5m;ö5ê	B=Ñ¡žø ž4Ê‘Bk™ÐªÔÁzÇ:/sq‘È\~±8¿ÁÊ1x.3n96&Ñßþ®w`œ~`Ö»rºÐ£f‘Â‡Oõçû8zÆqJÎ3ŒI¥ó5®TWL¡ÓÎÊ¦ “ù}Rþ:ÓM!Ô{-kÅXã"˜8Ë;Ïß½|ASÓx
Õî)sV^ßœB?žÓ`5´Æ_õ”Ú:ß³«9ïèUZö©–`X‹ò…Š¯¥n3$X¹ðš†Š§°Ö¢4¥Ë<ƒ0,÷T; <Q
p'%pýÆL3€S‘Ë¶MÅ]R„õÐ\÷Ìäzt±ëgh©3N ¹†™f"-®v˜¼²·×·³::Ä‡-Â|‹B~âÿf4±ÕÒ¡‰%Ý¦XÙKÅÕ~øûµÑyôôˆe•‰L=±•É˜æ|ƒò5C ÞÐ£Ð×ë5“ÉEL¨ÒˆüØM¿ÜØDà4ÉÐy¸&Rò@PtýL¾Þ³³è$ÿgø¡?Ê§k:œã«²Š§^HÐ4®{/i¦¿G˜‹Rò©ZõÚÔ¦øî][5òñ{Ñl"- àõ,ÊhïÞµ67}fîw¬TÈ°8±¬vNj×”üÃ+3Cª¼ÿº
pGAV÷ÍËg(ÓßÈžña}›_È]÷ÁÎ‚”šMáyT$ÚÙ¯áyåQ§óÑ¤L"úÌ ÖÈr4(+‹ ñ½\REä@ØM°Æ>®P= t×Æ.Q¦•sm{3R—  üHÚ¼ð¨?`Üç<š°±ÇŸìŠß°«ªõ5%zæ)¢l—ýHr°Xvü™†‚¾™h«Û²Â›BmÉ¦Ñe{£ë §g´›¯âº4%},=1¿Æì=Ÿ©5¿A%÷ÉYï‡Âå*ÏãZÎÁÍJo*®c-þ‹BòØÉ¸ï¬ÁÁã&zˆ¤«gmE8;O+W'PÞ×™->^ô’	ü3lJêººÚ€Í¶®’/'ÀÈ?õ6lõó¢ìÓ=®ÕÙI¦g¤Ä«E<Ï’Di…oÌ|Çui2arJá@ç?]žCx²ƒ<T\Àº·t5òîmA žû…&â-kœFg/C×ØÊ``Å-³›Œæ^? ÚB–ÏôÄ»Ö¢Ôè9C5b9›XG!ÔˆsÄàøêÚà½8¢ydØîÍCïÙ%=™±+zâ2·vØ¦µÃßnçæébºnÝj%À»"íVvÄjGóÎØnÝ~a¢Á» ›p\«GY£Nø|SO/ŠhÖÜ¼1tD§Nt§y–;sî^­‰%›)i‘…'Š7®H³1Ûh·LÞÂ§gš·Ž‚ÿ§…`–ö†þ“Ä!Ï~ºá¹ÐZ×Gß-ï¦tÌän@ÒõP²i9&ÀXtà ‹mBi;œzÛ·a­TvT@¡|N#.ßx%Óø,ÃËc,ÕSñ-	 ˆ¶Çò®-ÒÖð`ÍÀ×R½‚8_æÆV¢Q•¬t\Éãn­!ùN'I•9ÑugÐM¹¬Æ@ß †t:h)r£I«h_TÄû@=ÞC|ß’?'ç
_	ëPÝî&Õ•F¶µrà†Gô£ULU/^52j¦±©2Õxòò¯E+¸ìJLvú4´X{U.w¬ãëGˆl|ŠrµëÝÍãkÃöKÐÌÖ¼nùvtÔÛ-ÖÿDØIcIþ´n4¸!±Ý“¼¡°»©ÛI9C{ÓA#jÃ• lBd£tŠ 9l	‘ÁBs½´ L¾Mî¡¦½ý÷.IØ¥Ø„üHûúš0ÿ¶Âl9)ù¡2½wˆ7€õ#æþûß´ëÚo…i(»ìàÿH˜ÑèoA£'uQ‰vÎ{øÍû¡Í.?ÿÖ%wµ®Â]Â¯Jª‡“g¥øƒEí·%–Á‚æÿîÃŠÍ‹½Û#d</èu+ªŽ€%3îÔƒåÓ#F 85<ÌœXŽ¶”Û7Í¥[¨½açLö\Ô®{mB§6ÍNI‹ZÖ14¼Ñ»¨ƒ½tú¤Ü»À§]ÒShŸ‚¼ü¾røïFÖk.JZ½Ù%^ýŽ{™âÛc.Â¶ã_Ç[3ê'ˆqÓà„
³˜þTã5:JÑÙå÷ÄÜkžcð;ó“Áñ8VÃþùÂžù8'4gçGPc‹²^”óCl³$ôlïîÄ@)‹5â¨¼õã¢÷~ó!N“µ^âÝ>S|¶j©SåÝæt“Q¬ásóþ†Çé¦îïJ±Ez·7XÌy`û,” ”I>¿½µq¶Hxo)®-¡Áw-fÊ=zfy…HöX‚¢=º¢”ºÄë®+÷2Ô„ÛØÂj|‹"‹Ý¾Êr1[{ï€fjÍ›¿ ‹_í›.‡ÃrîféÙMC¯'dû÷»vÃŸ}g{á÷˜ÊùŒ8K¬g3ž{ß?ùÁr“’øBºY­ÀV“ÛA¿Nu”qf&ëô{‡ô‘m#ow´W›ÁmÐsŸØ[Howb&mºš~*„VYãòÝåÊžÈ´>¤LäcØ±oÈ-!…°e9þ¥‰Ê°¡oøèg|IXÙÕÖ[îŸ
ø=C}Þ’—é [Ë…ïÝÕO`ujÇD¾;«A–ðo;•l½œ6<Žrœ®ý¦u¾¤M -¥n
©l7ŸD2j³9Tèf}"©
¯3•¬.¦‘–«é,Â£Ö—IõÜh"íÔ¼ÒeN™¸{¹Ð4l4	›Î*½íÒ—ÇCå–ƒquÖ	Ï¡|’Êµ®/Ôû&0O%%2Ûšm&,>Úr½W3riaÉñ3â„;ñŒå³$ßA3ê†Ü?àþáÕ®&ü«ÇXkÊ-ze –zÇ _g°iW›ùÓü"CóÓÏ5äêZÆ¿zÄUKn1àª*ÜgÉrÀÙë}ÀYÒWðõýñ˜ÈÞr¿ÃN¼8ÏØ¿ŒË]æþ6éÖÛ#Ûl\ëía}cìŒ°;¾vDŒÐ]ÛÅË!vÒ>ïëSÚv¼´ÂQµëÚÅ3¬þA]´K™ÔŒT³+íüëfv©qÛ/¦z,…kc;ë×Xú¨Å]åaCø0
Ú{a8KŽž6`Gãƒ¨øƒf¡ÜL›±h‡Õ¢l4‰Jíf°_EkÞîë—ù”Æ4AÀÂ®w~âø¤Pî*ìhZÔXÖ[S[^1æn_wE)ÜÏi-H—ïØKÿt7ªáKú,ÅC`_Z½wÍîwÈøk¾ñÅŸÿ@`Êã/¨¤6£™…ÛMÖ‚M×cv‹Œ[7šÞ!;¡¾gâ³Ÿþk2†˜?wHgë-Û4Œz…Ép0Ôn#w+uþ3ŠÖë@š·NËëUò¶}Jn­ýiN×Ì-€_8°»^’ükQìbk&4Rÿ,‹¢¿±\$ xÀ¬ÿBí]óñ³®ß}ù”ªß†ZÚÏ;„¬¯ñ]•“Žb­ê¨Î,I{é(?ÃBbÈÆiŒ
vÝÝìÓHÊ§s•A½z¸÷8ÛBxÿ€ÈÀkøŽ§Éü4™®»˜¨ô¿4Ý¼bª‹¢öUPÃ‡»Vs£L?î¦l~ÑÇŽ½¥éÊ¥;¾õóÌê­tZ"¤+á<ü/üÐÏ¼Kû cÏSêœùtøÉ(‚PüÂ¢ýr–/[ÿ¯âñeëìl?ÅZR~XºÂ]@X°øÕPî‚ƒ‡¹àYÖ×ÉÓ½I@…d§3tÍfxÉŒgA„â‚òAž/5Gêô«¼©,?ôÏÓdôa|êß¡1Ì `"âó¦þ9-Ô‡{F94I–Ÿ¶ôO'IQMÐ´Z~¾¯†¹üð@ÿPÆ—òÃCýƒ’å÷ÞÀ,IåÇÀW£)ô/ÌQ!Î@ìÄúhÀŒU<X¼V¬rÈeNÇÕGµ£¤ŠŒVLÃ=–ØT¦-&ØÔÈ,÷ýYöÇc üRå3°?‹góì®2<´3<ÕQ90p	sÚ*>Ü°¾PÉî(;ÍU«9º2(gñ(9½Ry†rÆ`&ë®H`Ð)Ò0ÙØËØ1sÌX(oÄ;é4Â6Cdf˜æ+2ˆèï²èâYÀÜFƒ/Q®ñùÎ.ãw’¿3¯¾ãÖV¾™¾ ÔÙ5äQxñjÞ¼l¿Èšfe`;vhœ ¸¼‰ŠJsÇd¢ãikk]’dÿ9Ï+þCf¢!(iQæ
v´vqÏ
$ùñGÓï(E7BYß'†ÅâqÄN³ZôJ––ñÇÁñÅvf:Ãà	NkÔái~QG¡Âªwùc=„.m˜ÈkCÓ0ÌâßÌøªgÈ‡Çžº<}Ùî¸O«Uv*Î©Ã@Oœ—¯OÛ-A¥-mßä®ŸÞ¢4›]Ö³¸z³|viwéõÆbU/I#ãÚ¥wqšwšBý"Y6®.?ø‡¤0ò›b…¿Ì¢—qåo9™M/«#ÞRAÏ¯Ë(ÞüAÏï]¼Åh¾ó™µ™rM FšI/·˜#?¥D­îßë ,ÑÈ„åùû§3›’ÌÂœŒšCÔÁM”byþ>šÚí˜øÚÑ¢A˜ÏO¢*3F!5Â	ýÄ ¬âÜ@ª#+zË‰\f»½bd Ùñ”ù„pX•OÎ\#û!ØB×
0Ë®Ãòˆª^ ˜¯ ùìÒOWNÌå0GÄõ³Œ´tkõ‹¿¡òLš@V†_<öÂ`YK–µ¥¯”!ñÙ&)+•9É®k
Øa¶KóÓÚ#}ûg"dô Ý.1Å›B÷—_ê÷	ËËenCªp·~±‚æsä
wÏà—+r_iï†ÂÏhxÎï~£R¡•0˜w[âçb,+óû¢`,5­É³ƒºŒ>	-	Rƒ-rR+Oä6ÇSªF©‚Å\¹—«Ó¶\OÄÚÔ‹iR”è–O/CkÐ(Ý¯«ÁìŽìÄ‹Ôèph`Æ3»€W«Ã"^ZY-=–×‘–îÒ"Ì© .
Ýå CðôÃè‚Rá4S”B§¹H¡ô<|Lü²ƒ*éž	Å”xa[Ã´e–±å^ÊU=Ý·[ì“dƒýš©!Jfp èj«‡¡ò~&_£ØzdBråÂ#H7Ü²O]ºr„ˆ¡E[Ž¬ æ‰«&:%]IA•ö)Ñ,zóÊ	B@ÅvO— D@Jà@B2ÄÐ"?WFÐÙ‹)<ïßfuZÄç_ÅÅàù—ø¡E€î.VwqZ$ç®àb…p—öM‹ä|ë·˜î¾¥}sà/ï[½-8Þ~Ó"HïÚ-8‰w]ß”éhšðéG7`Ó7`ÓƒÏÂ¦‡7`Ó›7dÓ÷>›Þº%›.×fÓöœ½›¶‹¦lÚ^®Á¦7nÍ¦·fÓÃÏÃ¦7oÁ¦ïÝŠMo}6}ÿlúÁÍÙ´½<\—MÛKÄ­ÙôÆ­Ù´$H¹¹¢gA2$w_ñà¶f^OÝ¨–ŸÆcí Éq“Mí´|îµ1ù ;»ãOÉŒo±d‚î±«Ñ$.ñæùÚ›ô-ã1·ð J«gÅyž=5É-ªe–§`ÙMâö“ánöe®ôv®<ºÒ2¯:¼2²þ{_ÍÜ¤Ï}Tå­ÂäÑ,‹ˆûo³™ÜND8¡ße ß›z‹H-#f¡vŽk´TÁ’JU!‹ÚÚ‹`Y©®E-F°$:–],Våæn¬EJ,!õ²”¥É–ŒÎT©Ìæ.ãKjF%‹H¥+‚ü=Å°f¹-ã~ÊD	]ò–™˜e&õe\Ä›ÂîÛèB‚OöÀôXÉl“5nvË:#H0fàÔ³õ›Ã7ïÈ›¨,ùûþ‹c²Oþƒê‰4âE¹†ó¸žÍÎÜN9ÊÀÄí`zõ$kºF5ÀÍµ8ý¾mUTž	TÆñùÓ::€Œ&ƒ¬èˆZàºF¶íÙæ”£o‚8Á˜ÙÅ~G0÷?Þ"æ&g[Ò¨»õYQã\Ù…Å®gEQ.äºåé×DílDi{¯,†Û½ÐS›‘˜Eä†F”±v8¡Bj£´77ÞÂÆFöìkxa}¡õP¢µ—Ñ9’w›äŒ¶«á]èà,ºŠK&^£ZÂ†
1)f°XÈèÖË\É´ÝXx)ct§¸¿½°ksÃÅÛœ¼<1‚m±ZPŒ ß.Ç¢%©øæûÌö_ÁÏbcäJŸvDE~ANŠQr«¨ä(k÷¤r§¬½{–Õ7Š²´»{\Y^ß :pÜÝcž±O”€<»G	AÛ·Ÿã,.Pú¢¾¨h˜%t	{8_Ÿ^9bzþ‡Ûc$¥Dü£vL‡ž ºÔóC«cr™ÅLV"­Å½…¼ª¥~™r›Í…–ÊV÷ÿ‘'Y»EZ*<”Eû²ÂþO¼€ôk/«cAN¦I—Ï¨°;}ˆò¢
CRÆÏÒ<ª¸b”ÅºèíÃDû`]2^`ÄÞæ'sðkR=d3ÇÚ˜gþä¸—ÔEa,îÂ^êQ¾ô®”Æ dWŠËa>Ái>®\þ%©&íµSÆ;ùÅVÏ’"|aãÜ0ñ¢#Øêgft2ö[Þ±:ÏÌ÷ÙÏ†&Æ¶ëÔâ¥Å05jôhÈ<™tœò¸7ÚfL$Û9å~Èþ1y¢„J…'¼œ°¬l%’À£ýÑëP}[m{ìüŒ‚·Iˆ¨­ì7û¤&;Î#+I0o»¶yü´ù±àŸÖwÎó(÷q±2b’«ïœZB4>ÖËæÀN0+ú`AWmâ£Ý;àLb[²+×Ò!%¯ÛŸ,ñÄK8Tüp(‡Év²¹;“D®¯Î,ÉC_ô•1ôM_íì<ÆBfÎûŽ_@OËŽa¨ ù‚Pë ŸÕFÈ'KÖvÐ6›MÂÇûFÊáhÒéXåÀq¦ Ñ|ër–~‹¨«^çœ[íØ’ýá7®ðÏ~‰ntÚôú~Ôo¢¹Ç•ƒã?¿‹aÎ”0mç‚Óîâ‚ßz!è3É1_*‰ÿ^VÝo_u‘±uŸHÞµw‘ÿü,çh—{wè>õñ î_„­j÷¹°íZ{×Ÿéµ{À·ÝCc©½µ.YwQ1ÀvTô‘†Ïƒm<O‚'µkê¾Ö·AÝ#kâ=Q3í¹Ý»oÌùôLM —jÆü¬O‘Ÿ}sâ@Ÿ\j½u'š§P„óß»¿Ì£¬Ûý¥è†›÷¶î?xøhc0ìþRûcÈ4‚<ÿ#aåºÃÁFocÐlAþ.JÝÝÃÀÇI_‡›½û½­î=È°µÑ­Qàtnõ!G·û6ù=J	æäyxSºô÷*‡j²$0•°¼ÇUŸðDÆgh/ˆì9.úPªH"• 6É>ú3DÄGY•—¬p÷çn÷ÑÃ÷·îmv§˜Ú/i)ƒÞÆfo¸ÑºLð¡eØÜ{ØÕ´L}ÖÍîÃ>”‡¬CÈ‡ø…ßßâ²ûŸóø÷<#ÈÑ¡í„¿ïŸÇ}òŸ]ÆM»oâq‘½ñâ»-û`t{Tž#±°iXð™»ü¯ì‡… ýe¸üÈŠk0NÒü„°+Oà±ý^ýÐY—i‘Öð®å:|úi4Áµ½ÚW§½‡?­IÆ,¯f~hã|4Gªé€)U1§¡v+j¹ç*}û‚çc‘çà½­âYd}ðT°äžÌ1–å¤ˆO[],Î#¸äkqnýwW›ò÷ŠsÀ>ô©e@©®Ò¸ž”J­¶Æb•q¦+ûv’¯úÑãŽL’tŒ‡qŸtP#¼ö-¤h³XOóóØ)†¨(âóü“†
ÑKÆÊ'®·oæèœz©½êmÙIo ¼vÛÙm¿‚'îõoŒÅ´Ž*¸oð<;^ž'‚pÕ {†-ç§+Rå3Hþ½woCsHÛÌ§íV]ô:@´|‚ÿ™n2<Î’Ò³Õž–?ÊeåI—z0|“J†C;¾M“øo“ãµâ2ubƒ°Âðm–ßâ&áþðw(ga«Ÿõ½Ö†áÎÁöø@ý\›1¼u†]Á«Þµö^Ÿž&£$ò:ÞØYŸ¬”™ÓFå“!¯48…1­°É¢`±Â(!.Ò“Ýß.P†¡fî†t¬8B;ë³"ðùL[9'á1Õê“g?9¤ŠYpŸQòúçC”TZ®ÆæÉ…
¥¶¤øÀ»Ê¾›ªœ¼˜î.ð³‡À€ŸÑOüÁüšgÇÑy¬¼`Ø››fÎk”¶ëE‹Û¢G–Í~K»E(z¦Â¾„YFµpwr4+""ø“ùÝtµ»0ß-X2WéÿÎhmWÐ¢÷k)?—6ÞÉÙY\`i¶ý…h‚_šë]2óyt¥¥Ç/ïóÅÍµRý–]BhÝ0jœUªLsëÆi£›—+ÚR­xÂ™y"=xÄú£Åñµþ:Ã=›ÚŒ!h;Í,3â!Ü FŒbi2 ³È‡Ï×ŸPßÊ„	ÐÚXsÆãó^õiRL#©0©Žó	æ–ZÇ‚¥ÚãÏ€…fjž±:Û Ä¬aû’áËÕo5Çt!4ÆØ~šÒne°#4õqÙ3I%ƒ9Aåb›lØMŒØâgdØ™âË¤ª£ŸÉe<†Ê¡³TR}?l|X-0Îô¨; ¢a 0¼…Ñ3ˆÙÓ–]=8‹D.Ç“‹]K
áÍÀu¸î?Úêjýïøè ÁÀ'/:ÐÊh9O1áëVg;ËòxÅªq®ª€bñÝ¢ËÝl	ôýv^„?‘ÚHmnsŒ¦‚¤Ý‡+|¡:Û‘!nG†*bï–î]kKs›µ‰’þ*òšžôî‹~\¦Fü€µ>°w%´M†w¬{¾¸›ÞÐ};PÆ–¯‡µÛ‘pLP<²Ag/Ë³{q¯µÇÈÜfôè=JST ÿn“µ_3hFr–aœÏÇ°:m]¹°‚a‹öàÍHœèÐ¤‡Üí1¹Êç°¾ð‡‹(£A‚X£;%7âjk¯¦›B^jëm™B’<y)½øî¨s\ÄJ¯SP^FªIRŠÕŽ"vš ^³34	BÛÞ4:‰ÓpLÞaÎˆf„e?ËòŠœÄ(Æ¯ïPÏlõ< 3ó¬HÆô?œf%l©žÀG³Më5ä—â§o¦®t6=pc*ˆIiÑ»Fàz”]k3éF>rƒê5sl÷?ãxæâævîkB€qëqºªãIÀj’µiÕ6Dålˆ`;}ÕæàéJIG¥”€gUÿèúò®ô{È‡ÜÐæV£íçÆ,'bkcËq°jgjDœoF“†/úºL…/]ãJçtë»,ç¬?„`¶RÊºwÉž&½÷·Î'n*s]O¬9, ¾F^X¡«Ö«ûŸFzhß²åÕGQ=\­6 ›+¤e‹P1}0‰¡qÍ´ß?j@

 ÷Èˆ7[{oãsŒ>ðBŠ9®œÇkm¬ø­C
RÙÌ4²Ö)
ŠLÔñêÿû¿þ7ê}«€>bsIDªGªÁi(¹å¹
}Z¶ÎWzÃ Ì3„ÛMºöûQåZs©_)EhÁ\ûiÕnb†U«7=àÖýÆžÅEä[ŸlÆf—°èPñ+C”q¾G?²Pµ^ïÚÀ}n–ý3ËKä5£[§<4»µcõêÃ_çôë±ßÐÆ§¾÷ŒºÁöÈé:ÒÍÅ$øRwþ:\ÿÎÜ	JSÝ£‡Dˆ½uG¾þ5“áþÞóë<Œª7S?‡¢ÛKÏìXÑXM†öÒÆ<$?%Ôªˆ(­5iïÏf)ž2Á):;ë´vo»<˜ðÚAìR·|þîW(NÒø€FOÎ)»:?ÍGóÒš¶[T}€éxUOÕyÅ&'A‹ú›HÍÇv'óô“e}…èóO˜iÔ;ùî"æ3í‰¿xÛ´RóÎ;¯/öÆËPÕ¬
	[® 6iæä­Ñü´ö¨ªƒ^N¼H»Æ$êI`Ç ôCÝ×s’
 IàQÊ®¤KeÛ‹‚>¡Kq†t2+òs T®z‰ÉÁñŸé2SÃP3³dFœŽû(öœÇ$žÎ*J¸s¤w^†Bë{%Œ[ðŽ])–_õðR ê8	]•O{å{x8€¥Ú ­ˆ­éñ.ŽFWíVí1»ÞˆãÙX‰‡ÅCQYDQP©·z!eXkd8t9•§°p•mìN‡Âê3Å
M	¦bÍÇ+òze¢Ëê6ñjCkþ“Û¼A¸Ewz\*±dÞ{–'lûBÉ´À?Ô‰x¦"ÐŽØCÌøç[žðçku¥YèsOÀU-”¹ÍÀUøóµšñÊƒkÌIµøxÑ»O0²üul–IåF˜vÂÉ««(^c·›uØÆiw%O­%;úöÃ{”U‘Šÿ’Œ«Éî‚ng¡Iž³<zQ›ýMMÀÃµ#…æAp/ì(ÎK;ðpwvka×6kñ‘¯{›¦õCB×ô]È£pxÍŒ$·†£µHÙQtm¼û&øj¼µå–XL/tQD³øXêišgy<P§‘€þ§EÖ û^Åê}ˆw{!¨ïZ]“#Ý|³ùt ä®Xø11ø<ˆ°6ôâQŒ<lÔsÈªîäÐ;t"Žœ/ ŸÓËôþEPëC¯+?jÌbÒŠˆN.}¡Yˆà6Øb–´,æ[E$?€¥HÎ’¬—Æ§Õ*6@ôš…‰ÿ%é‘…€wÓ°Ð`€ÝIö/°ß…ëYiøsðSÇKí;eT';±6{ÕTË>IÙ·KQ[^Î†ÌM¯wø¢"FÒ¹"Ó”âþ MÐœ?>Å(ìlGó¿O/!w#/Þ¾*åÆfNÍ»Æö®÷÷vÚÈ¯¨É¹ùˆª9|Lþúç¶V@Õ[è}˜ÕÔçÔ€“2:IãñnXO·Á\È[eÁ> §«vÄb9ñ±!®*ßÏVŠV¯äÖ½Rgw~ýB½vY5I>«P`íé÷û°Ü~ÔH–×Uëjslÿò¡ÛúP`6ß¯*®j`¡7Œ*ªi˜u¿jPXO¸ñûÉu	ð1Ûˆ×œ÷+ÊÙ9ßXU"¤ÁjµjJ.ñïhBÚqQÔ&ÓäiÜ‡ŒyA³×A¥7µÓú1­½êú™O6õqƒ“Ë[ÛM¨:lË‰÷ƒþÆðÃ
ã	É·Å¾Vr™Ò-¨’„UFHù=¼Æ±‰ÆpQÂ>”q¿öG×Ý”±CDAÆ^uÁÍÌ¤Ùzì¬[wJ‚—S¤êD§ˆPpQ5ð–E@ÍU°úMv[ßÚ¨¹³Ïµvî¹¾ç’–O*’ÛÕÀ–ÖÝÖ¯ˆS~{c.~eÁq!~ÂM†ÏÑøI—u™”ûŒº\Ò•F]¦lØŒ×ÖÁÜm„3PgáÏÔ‰sÊ&Â0…/pŽÉÊ–ˆmæp4ØI­]ÇÓ„ø	³P~ŸâhŒNOEôz.Ñ•M”ãÐ8š–þåÐÚ%ÕÕ¬V¢ì/ÏI}hzj¡P»*“îlÜÁ õÊŒ•Á\£-•é-ç­öçB±((v,cFÿŠ6q4®X°UŽUL3)P6è¶Ê¢Î*µÚÚEâÔÓ0ºq•dœè•1 ½Û"ëzíà~à(ðH^)+"Ïšé_M;K[K°šC;çÙ†@“¥¼z£Áa¸>ÒM™Ê ¬Ã;\ûƒ€b‡Åµ^5TÁ¶‡b7áA°ÛÇî„5NìÞ¿ó-âÓÝ…~‰Ð/¿²ózÌ×òÃ‰`‹2«v[Ô€?‹6ž\.	*1ø!¹íÛß6µy_±=÷˜{­nB´Ä
Ï˜ÏÁ{4­.î<×½lmx9Ï¼Õ€Õ“{C¾ó”ãB£v[›§&Y@ñ,aàa¾Àèu8“™°€¥Œß6ßŸ'À™Îçøª„ØO“¬Cƒ3Y÷Jö¸;öMxZÎæûìÛ5•DÆo
À:ÝH°Ð1k\Ø _®ŒGOiÙ¯±:*;U…>\½>j¯Í«•ùà¦‹äÑø *Æ«3E§ðW@Žž–· E“Ý|ŠkJQæµz/åËÑ…n`ˆL’iIÁ((55áXÊ$ìfãoÜôŽ¿º@"7§€›Ø`µöpgÁžGº#Ê×Ñœô4†gðD}ålŒìŸÅý¾kå:Zq½†^~1×µ™>ú­¹Ú¸ãÒ%—þë.4¿7»{ñ¥¶©¢‰§q¥cyU¼sÇ-»cç¼™~Ó@ ¹†Í#ÞØº¥‚¤²¹£ÎW‘Žï:ú/¿²Ë¡]Ci÷ÇåZç<7ceI~‹!vñ7Éþñ*†V]jwÔ«wãcµWÎ’¬µ8.~Sä8‘q”¥Ç¾{‡µÕxT¢á.²¨«çêÆÔxû¢wß6eÝ9†F&zÁè¤ÌÓ9°h´ ¡·¬Áú0DPŽzELÛ
3~ÿÖŠIwÄ?êæp”»-Þ@yvvnc\ÒŒïbÛQŠ¾Wâ7üóŒAeÉ«Ìˆ]3ëÀ¢ìµäŸ¥ÔuR!¨ß]w5Cë{~«k”ÉBfÚù¼ÂKÌªÑZãåŠn¢¬Î3˜õzÇH(àM•7NIý6ûbžIuŸ¸¸ÏM­‘Û<*ÿõqÊ^BŒKÖÇ Ofšã‚Òžµ½)§JÏ+ø›x™Ó9.ÍÂ#‚Ù‰Çn¡©‰¥î¡k$. „¯-¸¼q?‹ê]‘À\Hc1‹º;MV)òFÁùfó´Œ½ÛN¦~ñ½¼ãþÆô©x’ÅDj%&„Åµ%áÇ¯„ë{É>uÏ€ë²_½ã?©
lä ÏØ¹Hª¢nwõSj•»!OBø«WË‚Ö³P˜—R=KBm]íÉ#×:dy…!¿ˆÇú&Ò"{a¾,ƒtà4SGïÑ`m>†ÅõS—õ£(~”©ïBcîÛBøŽ'Ý-„Äí:žóêüºŒ§	E•Çƒ‡{KäÝQŒh×—2Á«'È0¢ñ˜]ô@[ª’*P4›€°A”t¡ûÑÀ+ø5ÍÓùT›Øì¨Žº9ôUE­Ð)Qùiq¼
ÿV-@*Í¿‡­C7ZìBHR€ä$…ƒE[}…×U cØ. túEï@¡aXÙ%è¬¶,qfâsUHONNòü&e@uñ,/@¢ŽŠqÙ·FËÞ\­ºöZ¿ö‘ži¯›‹Ó>F$OT<Êl½â§-KïAt`IZ7µŠx“rƒZg¦rÙ2/0 ›Ž®§Ñ½pé­ÕãuÒ7+¼‹Œ©•‚öòùòÓÚ[”ÂvÛ{1¹áÎ}KîÜó,oíÁN|› d‡¾/_­ï¯…j_'ÿL7•8×SPÑ]^;tW'`ÓpiÁŸi8C¯å¡áoã•Ã¸¤p»µ#=36u×æÆ.£òŽüµ,VlkÞU
ÝÉúŸž×“7Q§äOëêÓç°QÁ»™†—ŠºíuRÁ¶–Í@¹QþúÐñ.|CS\·CY¼¸CßtÝ¥¦“žúÄÕ—QQjRjCwbþ+Ÿ“Íæl.tUƒH¦GiAs ±ÙÐ;ÈöêHÊa±áR™Çüð¹ÅòÙf5³0ò¨¨Å@Zçö[":[Ò–@çB€ÄãÏVÏ bKúÐ§Ï×›Òá»¿°mOA¢UÈ­Ÿ»z¼ÚÝe½ ‡ú¬ÜÚ¨áæ”â ˜²¢ÁíYœL½Á}}nêÕQ•Çjç€—ì¯W¦µjwèÙ^Š;AþýdøÎ¶·®:Ï0rnÓ¡Á«œØ“×ëýÅ3}å$Ž%&*¼”‡&!H&JþÇkÎ9lÑÞ›^ÆFaùú¬õ¤ìWQžå©ßw×O:FdÔ	Á¸kcYßæº4Œ^l—äcId,{€ïxºwh|½Z†ç¬}·×bDã²óc»/¾ÓzÁ“ÄU«ñŸãlþ.Çœþ-È>Cº[.Èº?Áë/È,êÞW]’µ*¿Ü¢,&gí¢lÎ¬[,ÊÐ—X”õùë[•…Éæ×[•ibUvçpÓuYÎ…šu™ÑÊ¿ÕÊÌò9ÖæÓùhR&Ñ]ž—;VWtÿÂî¡OÍ‘ÏúfÝ´3ÔmÅiàáµWp¹ñ
.šûe×oÕ(ëF­à>nó<NgI12N|šºæv—i5}ÕÑ”8‹Jª(MF­½Ÿ™›gA¸·Å¶—–w­¾ñÂèò½ð’ïíÊý°0¼¶ËÜ‰¦gÛÔçVkOžq"ïˆÇä$Na¢F_¸»æ¾òBÌe®¯}"ÂªSª°¢òJJ×¢m®|ž{´–åç8“'_ºSÞp¯ÜJé÷ ¾R×o6:d÷u™&rþƒ® ‡å†GZ+%©™ãlþÚ’5mëV£f‹7äò,F×ÕÏ¯¼¬–&!Ø.ò†‘ç0Q1¨6ó&­ö‹hãi2âèwQÈ\«xªžQ?`àØÚ­ƒ¸Ôàô*×\ì‡Kr§óªüºÖ}­¿GO™ñ-ò yÍíri™<Ó~63øÖÐÁ!@E¬žBôpUúç™c©ÕFÜ:yÔEÚá|â
Û¥"úðwŠ_¨.Þ°:ì?^ªÐÐ±¤É¨}6æ¾›Ö×³a_®&ëÅCìË§Ây]ëì°\X˜ú=@kP…Èq¸šGjªÓTG;,L7Ê½^×C¼ÆÆä»‹ø´ˆÎÎpÙz†þ1Fò‚$ã.a¸Î"Îº$?=…
Ë.VûZ<'%ž,Æã®âß‘¶ù0ª(</–d¹F’ Y• dàß'c~|AíB…/w$,Y„]5Â¶f´‘ñyŒû| mÉNs³¢µµÝ†I}®¾Ë›Áý~¿ˆ›¢Ø
=°9´…–ÄôÇýKÓ½C~¤µõYËûZÈù+#û•7»ˆ‡ÎÆƒ{Ü0B*´JåfË‹ÚãËÕ=sŒä†3X@žqt‰‹ZüUFáÆQBc[À}îò›B$žµ.ùý$ÀÃJ•Ã®mŸÇ•_C›¿5m¾kv¾_b±"ú®d7%Æ`~s·œ¡é!TzòÞá…:Çó"bnôµPºo°òm)-‡òiRH_âÕt'«|YœK
ÒˆUwÝÈE1î®@n2-Fš±öÐ€u„IêÚŠyî²=J¼¿/5~Ò»­ë:Ëpš«|Ì[;%Bò»^=:KJÖøßÑ<Kïô¿E+f"W–[Îçþ¿ÿçÿþ?–À~SãØöZÆh¬iî4±g!Ø†`9¦y±ÒIì(rö"4éÙ&¥ñoû‡… ¬åhK¾^Ákç£—>qCæ4SãŒ0)òN¡·Ä+O`€®’r
!Cl‘îýœÒ®!3dÓ˜‹sûmy%‰}‚?8æ§@¯cÌfJ)#£ÅÙ€¥³êùr¶Íýç	ÄEÈyã(£ËÀ)Ì6~!ÊÓÕ¶ÞË®·k]Õ•®ÓÜ®ÓP`Þï?tU+»ªeð‰r°;°j„ÏüÑ¬¯s×ÔUñÉŒEó´ÂÍ­l#³nK˜u)Ç¿p¢hž¥WJw‘T2›äè„˜ÞÀ-´„Û‘KÑ{éËdÌÖÄcõþº0/ãã
Èup€¶oPÓÞž ÷Ç.•Ÿ¾¿»ïÝ¼°‘Ž¬¸VYy3Mwmp÷nÙgEÁŠ=ö¡¡Shä]t™¸fßìuÝa÷ùþ/g	ãÏdü9J“1F§Î¤ð’Ê¼bßN€!Î¸Û>4¼;¦A0>¦D+0
 «¼òu°s•"]-Î&aBôj¨e°ø˜½ ÷Ô0do—Øo-mÒ†è´E{±Í[
ùzð¡<Ëüð ÓEpzªìPmrFqA}gWÐÚÖ/s`»›°°7†@P¢Ê—m³¹Kj­?³¨ ©T5ýr–&2c#Æ|YANüŽîÊ0týˆé´ôû”I æ-½ÌIþËßV $6öÌ5»¹À0B½P M<å³Ý}ÿòüXfNùP¬@d³¶Z0¤-x5óšI ^1²Ærëà©~#Xý†¬þ—ÕÝ¶æ/‚ˆÐù8¬ïˆÄÃ4Fé.*®³å¨ô`M*½­P­ýÉjÂG£	?,4ß™=$w#^¾EÏ2²Ê]ò2ª&À.Û(juö´:Zd™Ž5ŠÔIÉ„ï–;”t)(Ô-s‡#ìi¬Öæ9ò“)IÊjÆÑ†J ã:E1%ÛŠ/‰KÌÌ ×ÑÜY+¤s	":Ö°Ëæ4Jñí)Ô¹ó\µÝó
»ˆ™¶]­œÖb‰ÚHñºÙƒÞW¢ÝFG©+£.öŸº|a„…þ¡oÑy”¤¸õ3ZÁú!Ð±k×Ï’òÜQ_q$zä©ñAAØ)L¿ea8	U&`Á.Òò:È(‰RÁkzBB©.ŽXz…÷çgó²Â§ãxVÅ¸ºàËëQ•óÇW°ÉOã‘|þ%Êæ0#ññY|Rˆç—x³‹B†½LÊR®Z~²š[,XÉeŸßƒÜË»ó¡Ûí¶AŽÖ†O õ}]G}L¢ÌÚð¤²?Ñ³Ÿ²#Rlh1é+ˆé±ºõBü»Bt?ÁãëS¨†&v ”çkÄ¿*XK±´¨¦ãTB,ád2pk™*ˆí–9M_…ú<•YXÍØ}}êêõŽ@,þ‚2ðLw
ˆ–§ccÑ*SØJñ¸ÈTlÃÌkh×|¢p½ ¬Â”® 2p»/DÐ>ùW5ŸúûtEÅ@ŒÁò€¡àÆ—¸,¼~õîùß^==:8<~/1þ<~L¶~
ô¥Sê„’·§« þˆ×ƒ7:}h ÍaêïØOK}år–ÖÎi }yp—åèÔÊJé›Ïa¦%)	°ÌpÒFY¡Ó%IEY,‡ÚêöMñ$g4=SU©gqç+t[B BP	¼¤7@ÙÚ\Ö·mñ@­•ÌGsÊâÓ0)¿KâþYŸ¶Ÿl¨ý¨¥ýLÌFQç‡…lõ’° ¼%ªTÃ…ØcËé\,g‚8SÎñ_R>ƒýùñ¨ˆQ-Jý”ª}ë§Üµð’xÅèÝ$FÏPì@¼ÛÅ5Üæ%¸[K¢tü“¬MãªÈéº¹.+úAêäŠ¿Œ`ÓVbLã¢J.)èÃYžŽéC>‚M>}*ç”¹:‰Y¾sØ_Gg1ËðéŠý>Í‹ˆÕžgùhRäÓxm¯m6Îè™óÄŠ3ª¬b=´Ž²áäÚŽ=uŠ øš].ôÂåßðlŸ¸×p/¼l+GÆ¶¤L“­Þ­a€¥¦ˆ†­dÈrÍÄn]åó
Ï®)ØòÕ„zZP½´¼wU2âc¬ÒµWTLÐWšŸ¾Aõ>zKNÓd†¨yÃÜ¤Óæ<3Ój‰4ÉFé|¿AuÀ“ü’Q¸™Ö¤üà8ôX@çIµ¥ãKšõUNë¢¥$Ÿ\ƒµç€¹ˆpˆŠO/ò3å/zŠ9(åÏ<ác`(Ïs6l]@Äó§Žq"ñŽÏâltõ*¯b¦	:4’ŒîRVÓ¢1·àò‘åólpT
ÇýÊtNýÚ“‹O2œsú*Ópšà%Èˆ)¾ªd
B0.XE<B3…&àŒ]¿Â[®ˆPÑ–À¤”O=“H,U¯„®¦œžbt©µñè¯%ý+û¯¥ƒa¸²
#pE™•j‚3 ÌÁÒZø–`”Ûèè<šuóy1Ft,_=,h¯Ýâš(Ô5Ž’Y”š½ %!Ë×ë°3ä89Ë"ŽXƒ$Ó€ã·qRQJÁñtý=h0Cp¤Š<-UÝšíˆCZïsõîGÇÛx6?I“‘ÞL` 3(P˜Q€‡à¡ðÓµJÔ,@Žç#J 7Ì’„¬ýà=pÞDc¼'ý7ŠHò.Ã{žÂX'¿ë-I^›]û)÷ ‘i&;bÆHlÝ‰OÙT e9{Bëh™ŒÒôð'^ÎƒËùI•Tiü(Ãê‡ýÉÛŸûý-(Ý;q>£A4ÒÍŽÉƒ)&D3j˜÷{Ìå–Œ®®*“§#“üBÎÃçFRí²À¦úEeREò;>4ô`I·x€ÚÆÛÃèæ°ÁeN
aR19J=¿Íh«, ìY4MR&‘<“¯^Ê\;r†&)ŸÒC[±DÊWO”U†Xw˜Fðµv*h$pÞÂ²PŒw„½¸TŠô+ñ¸ÜÛk/”^ÿ-ö™â	;¨ i&?+¢ÙäŠˆsÕ¼lmÐ×+-Á/˜ÝwØC¡õ06uã¸Š’´4€<5Ó"¢!?aVTÌÉ¥oM„KD‚;/^Ù©·öø0ƒ@]Œk£B¿Ð@qlñ”¯MzC?§î¹Uiöî/>|èBwÉo£q2/=5 Êt<‰¸lýF¾Zb\¡¶	r³¨,QPg2Üo°æø¥&Çì‘ò*Ù‰’¹ÇÑi|…ÆÛä0+aq¦6´ ‡aôR˜G#tA§%å (ÆQ©ª$íˆ™©•xZí;<=E¯àöÙß]qÞIr‹é¯TBW0Ì²è\yÐÕŠ`]ð×ÊðyW ~Ñ¥”šBï_v %¼3ñåhlñš‘Y¸b“æ-ßÆ§¨ÇB¿H{|Ò%-þQ:ÂJý™›ÇÅU[•ï’‹	È²í–¨»»h[Ä£ÍÈv¹ðÖqÍJ ì#ƒú¤|T¶ÓòÓ ?ô •Süx^Ã†²OcÕv<ªÙq>ÂL¢?² ¤›:K¢U¹y¹þ^u…—GáÇ+J@ÚÇþ0TCyÇ4¹jN	„·YÇS[¯ÁQp%û1†Ü*Û[¥ivÑ(bwÔÔì¸WPLøæ·>®"¯OmwLÁ?˜Íî––OIþSòdZ	JÊúü_—]‡®$÷Êö(ˆS .×ìo)SQËŽØ—¾T]uÕ•/CKqC¤™KÇ§Û	¾NE\CÔ >žs%¨ºÚ5%SÇR2ù3ÕÀRŠ¥Ž©Xòf©déu<¨°´<Á¢jáªžp%<C¨`]†n§ãèvBk š:œŽ«Ã	f­#A]cÒqt(¡Œ5Õž£cî9¼Yêúkl:îÞ!˜µhÌ\WÉ°jR­¯ÀJ°LšÁe_½EVBÖEÜ|=OMñ•uQY8T	ýè+PVßÍy ë{;¡:àæVÏÞÜø…
ÖUaí=uXûÂ`ÑUó‘î=ðå¾Ñ“}æÍbÇ»…¬+°õTóÄ;ýê-Òò°òÐ[d5d¥ú‚WYÂ…WW$´ƒÁjD†PÁXâÊÃ0¢x†PÁÕUHÕ¢U¦…3{àþÿ   ÿÿì½]sÉ–ö~ENïÜAãºÑŸ@CK‚äd’ƒ%83÷š1±,tºKìîê­j ±x[éÁvè:¤mHZÅ;Ù/V8BŽµì'í?Ù? ý	>çdfUfVf} ~ÌEÝÝ!º*++óäÉ“çû4ô…îÅ0uTüéì®°(ó_*žžÐ&º§%¸^,òSpÔÔËgÖžà?\NG#€°Ù ¸´BZ]S8>ðŸ†`ÏE+ÔdÄøŸUc	Áø")XU.…€œ…‡Y|ëµ¡ôë=xÌNˆÉ_†,Fo7	³TøW•	|*ªB=æÂšœc–‘ÐJfp8Dž4Â€%€
u7Bº}‚í™Oµ 1$ºýü›³`)“~¢"€ü”Ïìe¾¬z´eF…^>Æ½Ô7­ßb¿aíV§§.}öƒ\Š™Ì¼±ŸùÐ´Zâ?­æ¶‰Œ˜Ì(…Ñž	5u>&@¿ÃäV:›®s6êÇl“ÉØÂz8^v.¿JwGUµÒj•JÕTJÚKé…$U*vïêºÄID½i¬ÿ®‰7y¥ë„ÒDuƒPn+^ª–ÁðÈ>’Æ~å‰nWs]!¥X•Š±EíH·€dÔj	‚íh©6U4äæ]¡ú6ok*mó!×R+w5»ˆrß°w(OL+†nš0¾ 2Ÿá¦_ëíNö¶bzÍ<KÌ©ÙÎ¤‘4ó$5}f?eZ&3-
f&ÏÝô¤MÛ¨Z¾]¦x$-
ðDÒ¡Ä%µŒ8ÑsBeU7#ÿ$e89] ã)]éÝr(|…8gátMŽk<]ù1ËOÞ˜Ç	c…‹/Rš˜Q$¯@|}%rYr<JwN ÝLV;ð"XñV›’G>vè‘«è-"+«S8uíbœå)f,˜x1wºÁ,å”ˆ §–JÍÖ¸ç³@ÜÈ¤[‘³›Y*³ .¯1¬·"©ê/ÿ²ðÝf³©‚[{jÖwÍ¿4ç(¼26ðÄ"x;«ÙVXç§@;ùWÄ)Ì>E:ôiö›ædX5×]Ê¨/z£@A˜_íËKpW5ø–óÄùˆÔä
¯"1'<ñ<œµÐŽZQ4HŠù8Ö”™õgÞ[2ZŠkº–Ñ«#ùÕçÞØ.Á–Ç†ÀãAšoÊ¹U'BK
{«À°"^[²ùÀ'ø.Øû>€®nKÌßÞAÔçæ7g€!8ŒžEn¢…"J£íSŠIIâTÓèî‡Fq‰ÔÃï)%aÈ”üÜŸ…YCmÆ-	‰ßâ£Ic-Í6_j.Ãgá™íÃ°¤ÙËèF‹Ïã‰ìõ—¥¶<®'Q¢u=ÉN_«™Í¨I*ÊpÞìHNíà"à4*f•"ƒwDÙ´T§#:5~òZ‹vÈæMÝ0B'µM £uŠj-`M!Aš»(e
I]‘Èé®{<ÐÕÞ]¦úõ•zJ°þñŽß‘ŒÁ»`têMÅk|¯ÇS?õÚà¿’f{¬Ž{ŽX×9ú î¥¿é ¦!h° (LwG”ô	ˆ™êG µÞOi@ÿÕãžéJ6-N§ÊV«ë9:ô>Œ˜e#ÙÑÿO@Ž¹Âûz_±FFg 3ù×œžÚ•p8aäÕÊÞÉ(î±)¦ž>°)‚ð:&ÂV&Øsm?Í‡ög~ÎÛ¶è)w|øWˆw¿EW˜ÀC$¬%'|2O)­_RÒê$X¨o˜í4{	õÊol‹8k›¬ÄÝìèl­›cñ\ò9ÖF'Õæ6™…j ˜¹CÓÚb¼uÑ08KñÆ¥?eãt9ÄNNÈƒµ›ÐI/ºkÅé%ÇÒÖ‚q¦T¦äZ¥¯~£¿h"•˜½F­*M‚ÃÇ=‰~•'‘¾Z0	±*×Ÿ„Ä÷4Tä¯<õåü©TÂn"È³ÄA¬=k¤‚ºÔ£ˆ¶
Òú-Pœ£¿M5R,RFË$ãDâ?p0ä­J¾ÏGæ×ð:HaäÃehÈ®&Ü¦ŽA´£õŒ(åAfhNFY¯)Üþ§ŠÛ
ªÜ½àeŒ‰÷‚Ù˜ÅÑpï2ùÐðêË½ZMÏÇøz«õëŸÙDüRÖ±­B0¯Aç' 	øÑa8†{µyØ·ŒŒŠª”ü¥f;@Ñ€âq†óDVŸªJË\îÅïÆ1äQx¾Wk±ëôàÿj éL§8 ¹_CÞ)|Óòûá4Œòæif©\ ÍÊpï²}ÅF{µçíëtâA£ÇvëÇþ´1htÖ}·=l±-6`íýç}Í,~	ãVjû|££F#í~ôisŸY6<‡ùv@¼àÿFðOë*³öj.Ð¦Ýfk‡m5;[Ï:¶ÓìlO}Ök¶Y»ÙÀ“Áà4lo7·áÑÞë6;ýgð¼×lÃ\ùK[Ív£Ýlµ±q§”)ÔëãCÙ	§ëN¶¼ë1ürþí½k÷¼.ëÒ`Z÷»Ìœs{Ä.iŸ­†Ñg›AŸ“íŠØÊÃè$$E:›O°+Þµš.Ó[c•±PÈÉzäÉÁcþÇ•ØpÄEaË£NHn¦Š„É9ÅûAÏKöµ‡I¬¤ùãéé|(ò =Jù—ä÷ÊÈŠ*ä÷~Ð‡˜…¡ªçÜ…kô—î< )Æà“TçXµ¶°Öhúî®ý+4ûÒz	”VÆÖ›çÕÓ;q|)o.é§0#€ûCF»ö>Üðh«õÖ¾QÓñàƒ‡Êêå.ž«´rö	¸%·ûÌ²Y×aÍ2[ƒTÜÓ³“¦\ìbÎ4ø ÒØjrHJèíJìø«c£%T<!#£äk`=¾¼\¢)¶yìÍáç£1æH·ÏÕ›”‡‘é2a7[.¸	íU¸ØÅº]íjqþÆÒøQ¸âAí“L½žŒ‰{IÎK¿a­fo}»Kù­t°"ãêÞ¥nCUf“LG«™´Mš¤tïRÐù0¥˜ì÷%¤vß9bGÓpÉ¾=Å€æ¼
IIöLªþÞìóbðFøsºq${Òèè•Iô’"ÿgR¬M¬'#Ë0Qyó¢R&ïÝ–-£fn‡3ûD«r#+¸óa´õÊ&™²R
Ó"žá¦dV)n^;ûˆ³O{Ð™s6_»¥îÇ¦Î¤·Vf¶Š³ªµüÅlI™L%Â;©Ò	Þ	æë ÊÛkê>£iÉT¡gxž+ÛH¡i°°GÇc³†@ž£4T–j]‰Q1ÖýòÈ`ôC#Ù0].û¼¹˜È¹èÂšV5ÂHú*ëASJW%9,»YÀB¬øu"ñ
Ð2.¿aõÔóu“aÔ I¶øµTm÷»6ƒ¾ñŠ±$™¤ÿ
´ÌœüZá
-=·òVçÆ`Ü)cŠ6òÚh
Ô$4ù¬‰„†–ùž¼dª²n|cÐˆV…dE8jP4
€e–SÓúÃâ^ƒþ7fß„¶¦W5ZdÎùCgŠø}Ý¨@ndìÇ FƒÓso‘
cI‰(ù“…Ðy)A_º¾‹§$ÊˆvêºHŽ	èwRe[«·¦®7’ññ|)9BþÊV¿eiÇ}°°kµ´a¯¥·]€© ©R””ñÓ^ÀùÚ»îš-Q…õòÑ›â’	Õìw˜%}íOºÝ^»ß_#¿™‹åƒÞv¿¿µ³¦ZÚuZ$xª XQ·$­w$oXá¦ÂW6Ün•pÚ-V¿r‚9m¦f§¤eÛN¿¬[[=¿{lu«·=èoçÀ:É UÚï`a—)°ÅïBX‹vå@-ê¢!:ç:ù¶6”D¼@‹¦*8Ý¶G;6œÞv=”g™œ¬˜e>¥_!ˆ©U9 ËŠNyÐmÔŠ€&ZZ K+áï`Ðîv·-põÛíQoWJôV¨¢X@ZbÀ¬.÷>˜3$1hê§”çþ)þS´ÊôÉ„(Ó/\v]˜ ÛV1^SÃJ”ºE—úíüï8ú”]¯Ê¸¦Q™\ã«çñ?/|¬Få(âw»p)’úp%–#ýÈf/ç˜¤a¦Ç¤u!ìE÷æXr¡ß¶wÚVÜ÷Ž»­<Üç)+€xáÍq[ Oz­¾Ðºá¯bÈS³rÔFôŸvj#©k!Ì©áÀÜ¹ø> Þ¤g;-·Ž·F½ˆ‹Ô‘@ã<F²Ù· ]<LP^ü.¼hXôéWò€Ÿ´Ò†RfDÓJKÐë·½V×²';ÛÝöVÞAJ);+¬ §§V¤—¼VÏdMò¹*¾±€™IH¿9ÛYP†m·7ÌÝ;ð?'Ùíº;y\»Ì Zai8åV÷†^ãu —S5Y5×Q`?½MØ$móvERÖu³¯¥ƒ)ZVâ/]Ûb´³½ÝÊÛ˜³¶ÊAüö‚äPîx«’|Ê;*#BË‚ ›H8ãße¨è¶†w·v¼¶ÃÇ£“¼óVä® æ*‹mp¦	Ù¡_…¼=µ*ÇæPÓn>°ÅG•”·ì¹<¼ýö ?²‘úÞvç8§•¤Ë`.9îìòY%—/•CsÙ:O#Û$¦¼Q†Çt} w:[ø?›àÚÅÿå,‚–ëºÈ«Á½*¢ÔÛŽNFÛVI€?3çç¢öå–…·Å-±å^—¤c:æÂEMÛU„Þ¶ß>îÙŽZ'±O}+„!œ4›{¦³®'gÆLÈSïâát1ÁØ[,÷“‰¤–™¡¸jø›äÝãñ‘¨_™	ò¦=€Y%£<NR„ó®þe,-ÿ€½ÁÒƒ^ÔÀ:9|[ÆÇ^½ÓïoÈÿÿòR}íj}ƒ66§Ñ´þå¥9È«õ7l—½q>Ü°žëÐ× ¿FhüzM6a%¯RË¥#IL³ÈZ»ðÐs‡ŒyÒb¸¦¬&wm¾èáB¾-I±<Ìoø³ž'.-x¿äöqñÀô,BÎ4&¦ÑhÔ¾É6UKO¨æ€ø*%‰)¶¦öbó¡í5YÐHWîÓ]|ëèwTg¸·Î–íõ$ÝtâÛ‰ž=üU3!5çÅËŠënœñpwö¸´ïºòÃÃ7v;«ÇNÏô¸¼:¹Ì¹›ÇVßrH²Žäöi9ÉícQ¼Æc«‹¸m,YpÇX\þàö±hÎß±ÃÓ»]òGä^t»·ˆÈ;9qÒ¦žŠ}¶<û=SEO©ùl8Z£9Í5ðŒjýé´Æ«½¿áõ¾äeßuó{Æj¯÷‚•QÉ]Oº<tÏ§DÙOPÕ5	F0I)ŸJG¡ôˆ¼bºÛ—ô8zs•ú/¨Y¤›Í¦<s®®“¢-ÏˆYêž\¹{Â$Cÿ³í„Ïwö}9ÔEÈ½§€„Kßœ5¬¹ûK*Ò+\1èðXK}/äoîMò4À[èÜ‰·øÉ»ëÊWÁäésó„\ndÑá
«æUé=Y©¸eš¹9•òðÀËð¤]×;CŸ¦Wá‚=$~‹‚Rš3“l$5½¹/â…5W(ªµ›}Ñtô”Q“W<:Qõ;‘_¢C“’Œa”é2ƒç„”mVÂ/ñØ_žù€æ‹FÏð™37BŽÊ)\Ùñ?ƒó|^O=t„Mâ3&·!sŽ9$!üH¼Êo%¼¾’â„mÕ”ÕBÊïY  ³wA–kæì`~fäI}=3%Ã,ÌÃwÞØŒ#ì‚†QÑ|%9]nPl£æBMî9è øhòÕþM¢à7,úËj×œž…šG¡Dè+Í‡—-·ÀIFï>ÈÐ<Û²g´jü×µ‰ü~§¥ú©bÄì¼áb5•Ô¡4©SÍ&øõ]^R»Ýê×l®jiÊ™Œ›š’w†?;V’Í¤-Ô4Â—-6‚MÞ#`Èƒ{.¶÷JwW¤UðÀwÈ²•ñ1°×¼Õ¿Íd´å–V,[".·ÎòîÕ	.ô[›ƒV©%”ëý–R¶£(‡]&˜ŠT˜n¦’4ûšÕz½š{ñÀÄ#1Èt{Âk8˜×;[Âm¨åÔä¦ä>Üí¯k¸¡øÍ ÙÆF%±ÜjUÇˆ2ë_¸75M†m¯#Hj)¨Þh4»ðwyË]¸”|£,n‹±bC‘ç©«¼ÆWí–›x¨TâAs8ñ¢‡Ëz‹ÄZ–¿r/o¶í=à}æÚÒâRÀDÞq§Uâ6øºÕlwüÙÏ|­P/J®‚Í>[œ7:øÏùk^Éê©ÌQï«¢§ffq+«_v	4‡ÄÄc°a&÷ÂzÍvßæ¤¸.	ûeªÊ¸º·‰p3!œu´0$?"(Tc0ûHÍrHdX¢ÀcŒøÑ	²y~óÆ¤ñº×[œÿ|+üÂ½I/ƒYÊ&ç„ mºªá©JXÝÌpÞ ®µk:Ûš,¯–+Ùåmjú—f’¶9v¡vRggº9é#ƒþ4ËP"vð )ÑÈ5Ï ð ×Þ±¡rO¯«+3¨N#ÚÏ$ÂNÑ ¼¸•R¼ÓÜéV©(ódCS-î©³Ê¨§ÄGZ“ˆ6{«
}²Í&/ü)q¬Î.gÙé¬ËHêT¥"6ùãÐ+Æ2#<xÌK?„6¦_ QOç¢™A8Rñ¼?rÅÌ·€Kög/5G¼–ëK~4q²‚Ù½|Tò—äÂþ"jð£ÍÆ‚å`ÒrÈØ½ÛQÏ%_,G	Ä¶'ñƒ©Æ­¢“pH»ö’ þÎ›žú{*Ó,Dà~ç
Èé;ºW{^Q<½2ÚFé(ZÉÚë¤Ÿ‘£_€ûUåÏT(ÕãSXnŠBµû:‚}ÅS®P´Õ ƒØ·iá‘ƒCFZsŽš0
h¤0DÌ±—zšgNxBø*¥‰cƒ!Ð…ÙÌ0®éEÓ!{.,¢€mAK‰KIý&¬Xq%á)™}CX½lÛ—ö¦ÀóeÞ¡Ýí‘[Âa?#a÷–¤&–î¸±TEËH	“ôa‡¼`ûž°ïŸ²'ÏŸ¼üöÉ‹ýßÙqÑ†‰í¶ñY+„{éPÒ`Á$€ÐŠ”—†)Ô&OÙp¨Ä^I;ÔJ†Pil^\LÛPUcën2põîßn%à%}ŠÐ…ªstÐ]\pJÐ•ŠÑÓÔ/Ò$ÔÄ¾\+r©9—ÚÝi…ÃçP‹$®` AÎé¼,Ü-™MŒb{j"ÐÛ_éôŽØg¯ÛÂ#=@c†nl*×eãÊÞÃI^“²dUƒ‚SKlÕ%&ëÄ‘ú\(¬Ž;àq¨*.ÎbÙÆëFwäÖ±–O‡®ÍÏm1°™\Çdê÷c?Ôlú>»F5ÃtY'çDäRÊãÚYiiRµmÒY§ú^§,–H}"3¦[ÕuéÇˆ¢¨‚@þþÉù"ÌÊcyb	¨2ÐjIšQ(	È5û	ìÔü³Ü~Hµ-¸›ÙsZfí>ˆý0_Ó]’§R !Œê‰ËzCúÏ-'?5óÆö†Ó».u­[ÇJ²þÑ2rêÇ]ÂÚSÜå<Ù–ÌžN¿'Ýt+¬œëH_È\d‘Þµdr<†eÉs"¸>~røä1Lh§Õ©9 *;ûþéÓƒýƒ‡ÏØÃýý'GG¹Ð/ZEÍc	)ÓõÂ^Í%u<Ià
š(…Lv]5óæ&{,¼½Ù~´€Àc%£c¬	&JåPC3[U¡æ¹ñNt'UÐò·M]R	ôù‘µÑ¤Cìæy[S€‘O{‡å  Iág}.ØÄ›ž¬œÝi¯;=:†&×ÝA‡$ëˆÍ9'º>1Þ;Ýù§®;GßºJ»þ,Q*§›ßÊàd>%´É\´¿U½GáèB–¬Šù§RõçGqØ»®ö÷JË‹HÔ£pF¸G½)–÷ÁOQ“•Fá‡LàiÒ2úÂ;Þ­ºãÝyÚÝ‚§Ýjüìî\èî\èî\èî\è~.tâówNtwNt&~<B‚xÁeÅ.t†4þ©Ajç ß .€Ä§ÇË)Òð).!o“/†O@ªPòN’DúHR¿Ç3¥ØÈ¡e+i)ÝÜ6N;X¬J
*Abê(Ž¹ZŠ«)ìé4€ão´ù’l#Ö´þë¢r]À»ÎoMŸ!mðÙ;ÕÆç¦Ú¸s\¹[ ð¥4> ÝÍŒä%¯ôHÇ¿c~Jz·QõSN×caVèx§ú1±ÊÂîÝyò}¢ž|½Á'_2¤;O¾ÏÐ“¯‹ž|íOÝÏ°(ß9õÝ9õ:õÝ¹òÝ¹òÝ¹òYOµ;W¾;W¾èÊwçÅw%¼óâÓ Ÿ{+ÏµNù¡×(:¤uóÏýá)í»	ìÃ©ýJæ’ã¿y«=V÷w¢ù(1éö”Ô¨¤¡3JøíÕÕÔ‚Dïý‘Èî¿
©ÏæÔŸ—J¨×JÃÉþGËzíEˆëÍHc~º˜†€Ù#n€Œ™IÉT¯Ü
ë×d‡\2âoÈ”xò=h	ÔtâÃú¯=9'©›=“_ú	¾„î$d³_kÖ’:»\ÊRóí7ñ*˜ùÐº®pb0Ú9HáMŽÃÕëˆ§j.Uáo}ø6 *AåÐûwÐÖ Mÿp€-¼üÊÌÛ9
‡§Èå5‘:r†ïÑÅÁ¨žªÆDëÞSs]~‘t“ÇvYX´N‘ÍC¬O ¹ð—eÆ*ÔŽß½zþF›|²Iú?¼û>³±/š¾ùÕ½/¿ÿêw‡OØd9›ÞÿÕ=ùP(ÜÉ÷¨dÝ},èà1Å=Ç¬Á¾4‰R~½³{›¼'ìsæ/=††rÀì½Úéò¤1¼Í=àãÞ²	ð•ÀÃ.—‹xwsÉhÜ‡á–`ŽÉÙæ0Ž;x¬óyvÏà,üS`•¾éÃÿoÁÿÃéö0 ßì´Z_‰–ÿÄ_>Š€ý¿~òSúÊ¶h&Äµ½øÌ[ Ã;EãîÅÔ‡Þ_¡¾£`±$<áp4o¢Á÷#X»$–š*oqÒ([b®Ì“`Ë 1c)2)'ÔNÕjâiRWÇú= xþ˜7ëö[˜ryx<êûm-w3^=þt§çu™§}þt«·Ýgžnñ§¢Ú™ùt»ÕW‹¤iOÕ“ZÉý+õ_ü¯@\¿ct²”MÕùáqð''í“þÉŽÜ43/ó]Ö’7Dµ]åŽ7ƒ&lÂ´Õ 	4b?
NTZLÿù}ÓŸEžùÉ˜’/ ä•Žã¼!ì`_^†&‡æ<(¯³ä’…O¥Q;;Û³%Rî´[ð×•9ì˜¡ÐúM»Œ4´Éƒð¼Á•µhùBÁ€µÓd.ü‡2O·6èÍöú´èÁí-|ÞË>Oû$®)n8í-e–è² Ì{ÅÓ¤ÉÑ4iÂWÚ ƒ÷C)…çák&¤wûj$ÂÝet÷‹`†Þ|){ÆÛàëÄ®ÆœÎæ0…È_øÞ²^4âŒµl¿ÛÜÌfë–$Ì='É»Lð–¡x€]g6cÐ•å¹@ÊÓ}j‘¥a‚ÿ„/™p&ñY˜Wœý©LFR‰½Ë8TÝ3Ð³4˜3è7·¬½
{QvZN#QÝŸƒž
‹\ùmØ01e/äÖÙ6Ù9½fßÚ¥´~í2aþ²ô”¡{Ü0“m‰Ç}ãø’· Xb­ƒ]æ½­»£\«ÔÚŸØ"oŒŸcQüiS¶QãÌ?~,%Šâ„Þ÷Ú.œ‘˜+Û2ÌÒmÝ{ ·ùx›¡½Ýov>ànÈùž²Ü­>©ýp·	n¶	’ìg—:Ú’[SÒ’³S>ÊººPÖÙDAWç—duµY¦n†¤®·šƒ¾íTO6€A ãCÚÐA'57	KáÏäììÔþ¤ ÅK#ÛÇÄ£,A-‰PÛ7*¬¡œ_RÊÕæ¡>B%|¹‰HN>M®ëÌ|'uwº¬²ÒíÑò¨ˆyð¦ÁxÞ ½sŽàP^ÄÐMz»ŒÌ+Ùfè-Ùˆ…»¤£Í{´Jp÷IËù,½5AJüàøÁd¨ÐcXÖµ®Ál¼a}¿'‹~LQ½”º ÕQ$³mê¼x²dœäëJn=ü½T£*dªˆ&ªtj{šªj,¥Â¨9úx”æÀfùn"'Ã Ú‡©êX,˜K ”#Ìù|}AJÿ¬j }ÝÜ+&÷§ÈP+pŠ)ÆãaOWú\eçW¨B	 Ñá>j†r†òe×ÙÕhMªžtl†¦us–EI¡÷äÊÎ{›\7iA¿h4„-½l¢p³GüC5HŒž{5mÉIƒ’:¼|©ç-tên0ñl—þFOeø[³‰ÂoÓ,Š~¬=é:CM0|{Aí<2DX;Õf­ØK7±‹j“ÂºIð"Ö¹”>KÓ±2Å¦ziùùl:¹¾~wsóìì¬yÖm†Ñx³Ójµ6¡EM~``8klÕìOÑÇeî×Zh…ç{µìÏNþÊ£ð­¿WžFy=öh¦Ü{£o¨YÝS Å÷j4ÜšzûŸÂ!mÞ§½¼WëÔØh¯ö¼bÒ<ßfíþ¤=ë1ø5kl³Þ¤Ýñº¬ƒjµºîƒäW~~·¥üdÝwéSø÷½æLra`±ârà+í&m	(nõž1W@"ù&Ôî]Ä°²L±‘ÙQ"Ãp¼­ô¿ÐºŽ,Šmô©W«ËÃ±ÆíUè–Ônæ‘È1½h6›¬~.N1óç(ŒÖ—eâÊŸÕñ5u¸ó8­sˆýY@óH6%úËCºæ)y€Ü6'>òßH€ÇsCxè×=Ä$KP†!¶î¸yõ`7‘r£ï 5O!¡ºÜ;>].Z'_
çÃ)ìë½š0@§aì××•!ñYmbÜí*¹µ-	P
ÞB¡J¦ 2]s TÕÑ¥xsÁšËèLƒxÄq2S>9cÙS?¢¹Ghÿ‹ÙO‚?Pˆ-ºZ™±0_^*ÆÙ+½gÕ(( ÎÉ
¼ÇNNç¤A¬¯›Öþpî Ò-„³„ÚéëñMZì6y÷$žÆækŠƒA~wl€¾i¿oJÏ|³/¼D¹×ÔºK@ç²=c“7ÂbM èö9ëÒxqp@©0>ô£—pPí±vzWËêtoâMX D–°00†Ì¤2N?&2qhÛécÿ<Xº^UÝôÕ—‘4ïÑ‹ºÿs±ßž¨³Ñî,õPßÜn%iºÑ{2B"mfKú•º%(
Â™}„êìGôIh°ïDÕ·9LÖð±6$/£öÑÑ"ÞùÓ 
‚7I±¸Ù–¼ùØ‡-O/ŽüåôJ@ØüùŸã¢ï²7ÉþüSÎQÉÛµÒ> ßŸ.O‚¥Ó	@: Â°O¼ úú±`Ç‚¥7Ý ·Zø^kc‹þ‹ïµñŽ|ó}Ž¿þ6Âðˆ·úw¶ÓVûÁü½?Í:ÈÇÞ;ß[j5ŸƒµõoRß·¦+¥»RÖ×Ù†ý¦T+$ó¥.Jµ‚SªÝ¤W®Y_shÐìôÁ|âG¡W€¬<:^$´Þ×¤¼ŠØtÞ}ú÷ŸX]€\råâ^Mñ
¯B¯ÒbÖ@³ðÇ–j€7Çã°¶³sØÜùuë–w~•WŽ‰aXáùU$[ãUZ]ª¯”Ã.Ÿ·Y½6J·™_…m1À2ÖE9—6Æ´×²(c}çW)k¿JØEŸåM†ª´­†,Ulªê…–UÑ¸‚ÆŽ¯L	s%¿®§‘!øW|£`¯d-Oüª¸iÜvoš[ß5…#(e¥0¾Û7·°o>ïÍ’1ùó«À‚Ê¯"ƒ»€H±ÍV‚®Ðr›öXòÛ%ÜøUÚ–k4/cÑ‹VÆœ(zwYwùå¶ñò«¢VÜ[Ÿ²P÷rXë²êóëv±¶àÛ%|øu‡µŸÖføUäÂÀ¯"Gùyå‡)å~8(ë|IˆYA–õÃC)ˆ9>ü*òÌàW9ÿ~UDKújð«ŒÇ¿rý6øUà½Á¯Ž1n~Ù·WEß~•÷ðøÐ°pìˆŒqùCÊüë–,‹'ìZžÂi,È\ý&Ãè’`7ê[äØNbìH170Î;9‡?aé0Rx¦(—/‡ 8,ýCêD«Ë€F{hž–#AÛ.iæcÚåÃ°¡y…³ú%ã»<#ðÐ¦E±›ª=b]­7gÞ¢^ÿó(ÉÉÑžìÜžüˆRŽï1×wâi0ôëIg@á•*_Ñ°¯µq©‹š©­,`Iµ+’î”bxïŠnOh÷¬yÓ3Ø?k™ŒbÎ|b¨ÌD?SÖÆ–ðs˜n‘Ä‘~=é}ÉŸ¼º€ó”4‡T„¢AŸe7k˜çJ-_˜gúF+j=9þeªÿlJ)1ÌØ_xPKÐ€·xWì)•Á {@]"XÖ:Ö;ˆÂ3ø¤-s¼:‡/òæPwOvƒ/íÃùôbmÝžë«T–Ñi
£+;^M0›%ÕÍåP©‹20$ÔÃÊ "ðcƒˆú³(–>©Mƒ×Uò2o%c(5:ù+ã;Y&£Œ{îø4˜’ë 0ŸÀ!§i-#'~Èìô73ûj²LÅÜ)¶©•–QS=ó»RS!&IåtË=ò,ä \Š0ó¸î däØÏ”¿P ÄO¡Íþ\[˜˜wÔ4ÂvZ?'nÄb	é¢%ò¥ðLP(˜ÑŸkZ@g£]ùúëN³arnG²¼Í>™ry¿Û˜\ÿ˜4^ïtÞM~Nû¾z#a¨Uf‰u/eóøõ2VcÌßŸ$Å0rÏ´ûyÉ¥Û—5Ù_qVzÝoÆ5àO<hu[“F¼(2gS“Œ¨Z7Ï,ØieŠ|Û_ØRÑM:™D*Ó1ÂSæ,2½¡ôü|¦s7—‹$il=R˜ ¼·9édàLö“ŒAs5ê—q—‚ÓÉ™Ð¬ZŒ?ûê6Ø7ì5
Þò[ÌsÄ;°¥‘QÆ`–oKÖÎEÁ2eo”Â93¢pp2>¿„c¯Æ™I€Ãù>y@‰_@5âRÿB%5™yéØ­®×¶î•bNB#'ª¼ú*ro`*-²Ú¡‚g‡<[ë<6á@9ö.Õé5­=C€á­˜ßú‰Üj@áÑ“0ƒŸ>72DfXB£ûì‰}Ïš5ó9œl3Øò±ñÛ[®BÛ–LÄ¢3{’8XÐ–’ŽÕî“uæáÉôoOæ˜‹wþ!æ‚Ó`GUça²9ªK]r÷ú{ÿãLV÷6êÙ¶ÑÖª·‘}/Ôö½ùÐŸŠLcÁ²–‹Ú÷~+×s`9”²p´g_ÒXá)Ç¸\ÌŽÓÀHHm#’™RTÓqêømº©#’Ÿ$gôCoS¯?Cýñ>¹x—ü#¾¾vÖØÙJÌoY&9–d<c#å„:/Ó1sÓéd}ÆeÈ}J¼"ØËÂlâò+½,_1éf6¡$ž'®­åÎ)ú&íÊv“f¤Ï$veõšt³)Õàˆzˆ©{í"P¦TTZuos»oìþùØ®SWñÇíÈ<Žª+7o¿£ñ&
 â¥-ùü¡§4Ó´šÌÑÈtlOä|4¡, V‚™”«PF„BpBjÍ7MO4ÆÌ8=°€| Û×ž
pvŒÉ¢ŽÞXž
s‡2‘H­ñ=¯ÖœŒÙ¡¨°oú§ièP¿V»²ºàåØÃ4­s±‰³‘BÕ3–“ æižAhD¦U(f¤oW“‰1ÇlÇ_µ4çÒERÿl0 o”í+ò±
,Ï÷…36G \P±Þ5°WèÌÒ6/A€‚_02žž©é€†#C¸õ¶]}A»ìH:¿òš6¢á&ÖM<õŽP'î´æï÷Z™€>N,¬#{o“>bùxvoóCÑuf·t‰Pl[ûÖ¼–hèz[
ê·´,šÛÚîèúÜüQ°TÄDË‰œ4¶£•›óÙ™œfšÖYu	–ø%×z‚‹íu'°ËŠ;F8M)ù0‘»Íî6Æ¿ÿÖi¶;ð—÷Ð^‰wÉ Éf37irÁÍýÀš¼TIun£²˜ç^Ö;¼ÀäîÞt” †ü½aúä“N¿eJË=„xÏ‡TeÈÍ5[SÛ[nÚu¨3™qeÄýîŸ†€{ÖÄÚ*i§–œ„ò)¼ºï¦K|,@{Ž6JKQHÍô-[zæQSÐ×^ÂýØZ¸1Á€î})ÝïËnë~Ø“±¿lÒ™‡'Ú…%¿³®ãL‹ç“ZEØq`–å+áP¤„×"_2œŠ»¢«„¶Ti…çTÐxxÅaÔFgöeÊ>`kiyJÙn.Qâ	Ïü9Œ¯¥zÈô²îßpAËW§¶€£ž§íEvãÿðû÷ßþî÷ì€ÆÌ¾Å™Õ•&@Þøû%ºžù ‚PŸÿûÜÇlÏÏ}€@†dõçø´Jw'!r%Øßÿô±'¿ñû–õ§ô¬Jo€ËÉïï_þö2¼ Öé¡¸Y¡ŸaÌb”qXÿ{t].Øþô¿dõ}þ¸ÊÈæaawÿú?°ð'CðÃyãWèbL©ºÿáoÿ#{vz~]ÐBVx?úŸÒÿÀûþ‚=÷"Ìò_ÿT™L|Šú{êêŸ±#úÁ¾¬­á‹c$]ÿðoÿöÂ‡ÛOø‘ °ÅUó#ªÆ>ŽæÿøÏŒj0&>z#vç¸¿¼J“{{A3û„Þ¢»£·ì<®Ò÷äEêêïØþÄ"ì"Œcà«ëGô°Ò¾çápl;Íôÿ¿Ù3Fº7o éóyÒ$§c88‰¶—Ï¾Ïe¥òÝ<1ðG£-p?öª9«fâEt—ûÄT”É¥œ1‚È¤®;ÏR]0_œÚS©t;	¦¾í eTÝr±Ü«ÁŽýÍßØeNÉKk3éÖ€_c{,9=ñwü ùºõó7Ž÷0}2¶Zwö,ûŽ¸ñkÍý3ö^yI7êë®®™xE„ÛúsŒ¸õâ‹9œ¹sI¿ÉÝ%½)–ÝêÁë¢G Ÿ§Ó%²(ÓÎÇî!¤É›gx,Æ>âÌÒ[¸ uýS‚+þÓjnçÌ‘¢s÷ú‰õôs9¯^Bÿy?ö–Þ/Ÿñur½cã˜­#ÁD‘Ki;¨5t-Æ-øðî,Â´ø±Kü¯syOa©èwbÆ¥_	o…?tío­Ê•éŠpÉUÉFcT(ë<–mYÅËR=ùe!U]Uš'Ñ—Šþ3š¼12D¤7³jòTãÒ5—@OßÚ§ÔíBöî ì-)|ê,ò¢»†ëËoZÓ<Mµ'ÞîI’p¨,íAS`V]‚£þj9D=Ô«_ç¿ŸsPÐc:,²^åÅOŒé½¥¬¼f˜È¤•×À;ß«µ[yM¤ç˜¦ûE«Ôfï¥þâU®†(·nâø•5Xð
ÐJ"û)éØãxe²jXfdØ˜3Ä|C)7l"¥
0ºH±™ÑSÜØ*ýE‡}×<Ý˜ûÒŸA¿
+ãÄQ›Ý0}êØÜ¶ÚJ9Ê#™Z…Èp6ÌµÝL×ÂÚ·¡l“øþt‰;™*E_SÓ¢Ñ­jIýêV«ky–ô{§l¹‰²Åâ/I’þDò©t«­?ì±{…‘:äµºÁ‰HEÜ°•T&É÷ð3ÿê¯„ìWÜíóHzÊbþ§¸r·è¯I£ÿÿhôÔó*§¹-¬to‰ó'ñß‹±wT]<åÎ]”íê{%·Ájé‰’5á6ˆŠ}×¤+–±º‰‹šâb¥ÔE™‡…¼¬aHB2ØûK5ÅÍaå¼|´»þgòAÁŸDe’Öåa“iEáY*“¬‰øÄ³$–¿‘þj°^éTßÜI½qa­Â?ªEX‘2ÒÑ>ÇaiÃ0ås¡¼-€^1àél´›þì9]T D¯­<Ü%Ð@.îJº¶ÁhpCøààÖØ•YKH—|:”w¿Ã,@H ¸·Gáû°ã•·¹:©x¿àÝã0|«¼ûßÍÃ3 AðéGøÀªçø™âÎö8Dx«[œ¼(øæ¬X‹â•ç?'¯r´¯¬Ä‘`®MG’Ç„á¥E2ÌsB¨zÑq.÷rIIÝ–51uÕ/Ýú¸3u€ßAƒÌQŠ=À…TI©pLëfO÷ Ðëp®åõ½›ôR|ÓçÐ¬®{è¬9z¿rð¾„§îüËŠÑÚMÝñr	q€ƒ„õö·ò7›T]Q<£š}ìq0ó'ÂyåKŸ‡|§ž‡å©o7]‘¬c‹íØFïCq°RA½6ƒBÿ˜[0(Ì"É‘ÛÏÛåX“ñ2îf½Œ•‡Ó?†TQ|ÝžF2 Ì­¥Ê3e”w1•³šúV_\©©í·4‡‰³QZhÝUš*Oþ„AûWèÿÂGáùWÐ©u–¹î!™û\ðÑ©l€,²»ÑÝ®Žt€t`%Ê©›ªÓ“±v?ž¯ÃÕ6ÔŸ‘¥æiy4g˜ØË0œûïÿ¦Ý¬Ãé}FiÜ6¦së6fêl°˜óô‚“0>ñw Å1%«ìüýßtà;úNK~§#¿Ó¢ïøgâ¥’Ÿáï3Tàí>|¡—Ì¤Ýç_è‰™ôÄ')¦Ô'þú?³ý ¢6€ƒªÕ2AÕâSè·ø†Ô¼, ~tz¶À€òú Çßê‹îbø­>¾ìôœ%{ÿÃÿÆŽþâýH:8øv2ø¶|»¥uSsg÷œg[¸y¶"®Mðm‹¼3¯2Ì[ö-ÃÀå™1a‹&ä«¾hžYSâÍ'¥š?"Rû’’iÁKQ©—Ž& ¿AëX²š9vÊ2ºoäC1¶ÉÅ‰Ú‰åÀ)Ï‡2–Ä†DÑp§	âö$§2Üé ;M5 .F’_F51Zâcô#w÷•8Õ|v4ÏªP´½ò­	vcO¾»¸õpæ.ØÐj3›/ïmš5¾ÎäˆÌÃ{«eÅ$ß¢SšO£®r4‹óõ<›b9n·1´ˆ„^—8btª²ïí±­Vi‚iÅÈ‡w)ëÇÌ;¯oÁB7¬SÚ\Øg“†ÀÜÎfÂïdv—$RÅYÀ•­ï‘ò.Þ7vœI÷–j\k+}°¥¼¿ÇÚÛ«YË`^‡®Äb~ý‹\Ì¯Wkeu?(ò3ã^Öä0°å˜wØv<f…^Y›•ežl–{*9”p¸žoPÞ9$XŒkDŸÈ$¦P×ÄèÏý“ºÞ1$¹í»sˆ®~‰Å„ƒ@µšÕ„“¨Óº;‰lO?­“¨ãrñRO"A´nç(øóéŸEû!å³y‰È¦(é?ËCÉœ‹8TÅFáåÐµ±˜=éŠ'£±]º¯Ì  õú(kSúŽ}¡›ÛeÙ–¨‚haË£‰-„âŒ„ð—œ4¬¹L<n½ýmmÇ¼ÝèÚªêfÔÖèv¶¤¦ßúÄ7fn¾‡üÃ³øà,©xÔ¹êvRÌÝR=TÞ5Õ£Ý)lÏõŒ©ÖßñBq ‚ê"«„X++iu±Ï“Ä²®j…,Ÿ´ÓƒüÃ_ÿZ×ü¥°“R ´—ú'ÞéÔ¶ÿÜç®%—3ø*œ-Â9ºË¾
Çã©_ÅÛ¹–61ß~[¬;ÂÅVÚÚýƒùpz:òÙ³—/Ø#/†#·ë.ÀÙo9Mj÷E•MXœÓyð§ îÉELYU›£Âø­¸ZòŒ›’Š
D×L±Æá$@Tÿ"Ð~ZtÒÛ!®Y‹í_Ù×ÐôkþwNµ¿> ÒÝ§é`ßÓÁšðã]—Ö|eóR22‚¡`è¥»Ð’ë kúÈN–šÐÔÎ=—z§…ƒtäÑqR ×éåH5i,Î5¨¦¤¡v¿ýé“„‡''Á¹ è‡ðª?	1yëjÈÂÃÑ(f#/ž€$Èé,ºžF)u öé3£
‚8OÈ‚¼ññè‚ÁaPg{Gä“•S†'ç‚Y	µ~
–Œü9ä›vâ1Ï¾Ï³ö<æÔ!Éàu„çœJÀÀyLæ‡%Y2 àò"$8Ô¿ðµßè¸>øð:;òÛÛÏÖ›6yƒ\‚‚÷³DA<èÜÏFþÒ¬îŸŽôñ”÷½\ÎÃD\qx¢ÝB7ï|ð˜‡%ñÄIðJžoäJe¬|É*ï{9&–ê®†ý|WCÌÉ2öçÃö$®a93o‰Q`÷XÄ©¦ª#_vþ+=»•ñÝ²2ú£'ÚwL­Q9¿¦¬âA¤Â+L  ±a:.5¢lºvÏH©™ú®£¾Í=]=—7û­"' ëeáûØXê\ÁKnQ9Œüw&ÊIäG,¼Ù?d\½Èê_ZßoR™™žÝÚs¬_­Åì0
)_Ç›üH†ZòÍška
¶œ[Œ?äžn[œØ“V€=`uë4©|øp)À…¹êk˜h[»íÞ^‹TØÚ«µv~û[öÛßòÿ”²ZG
§M!ÑägÕÁ‹ç©‰udyn–˜WÇ5Ì$0ÊK»ƒ×2º(hÁD6›ÓÅ¶ËãpXáÿo°7â;ñæ—²À Æ8mÆ¢ÈÑ›;Ã¨6
?Êô¥ÞE ¼r•ë—ŠrØÊ1Õý(*‚_–pê7¡qÕkOð<ªÄå Ùœ²¶Á°ó‚qä<½bþ46
šæPSØä~ÓýÅ’®·úÅ©émRV*fï//ë…;sý£[+HVÌùGQæY8¤0çnøŠ=öã`<gG•³ˆvÑ(Ñ“´Ì¬”M‹©ÑK‰äÜz›0ÔÄKÀp8¸/-7z^ð‘‘;\ãj÷ë?¦QZi¶…ÂanvóniÑä6bÙ´‚B(}°<ÇíQGÕ‚œóÚç°fFÎƒ	­ô mÉvp–MLúèô˜j9°ú3ÌCÙÎK³G¼9£ƒù´y±D¼1Ž¯}{2ÊwéGÊ(å7ÇMöÒ_œcÖð„-'>;œÓ`±€n3õdÒËuˆ ¹ó£ï:?t~|$ÙæöwPçCì Î‡ßA
;¨ó!vPç&;è1&ÏYRíTØCOF§üd¿Û=q÷ð,(T¯v‰d$Ê×%+‡»¨ûaw‘2¿r[é(©wÛû)ýÒõ6UµªvŸÜ&ó]õ?!œ{–3ØaELÜ”V«Æ¢>Ä¢ìD¿’™ürròØF wb‡ªÿæ'¥ñWé4òMxù¡óÝîPÅžO<™n}Kuö[üÒbyixÊ«s¯²¥Ä®«Å;ÑGÇ+‹æªV¸}Oñù£Á©ÉÀÔ‡Ât*bV³3©I6j7'L÷1·û§2øãDgÜ÷0ÊûSÆ<ß=Þa=Á_ÖEèÓü)£à=Þ½D0ü¢ëcW yÀT4PsÉ10ƒˆöç6PQù)Ã•Výšô²¿4Ä¬D?Ì¼#”t‘™àkŽ¡×'šŸ€0)mf †;Ø÷''˜Ïì–ì…!ŒEz©ÛJS(ðÉ(žŠbËÄxOYÒcuGÞø9IþÎ¡%:5Ñ §f4ô-JrÀkPÆÒ¡	² ‹*Û¨BbXÔ=E\Leö{'o¿çíø¼=OË®Nçÿð/þO†7ÆèçÀËaÒÐÿáoÿGö4ò}zH•ŒQ¦x_Ž5­¢òµætí×ëhŒKîrÅÛµYs>‘¤Í£à=:uLYý·¹Èê[—þÔÇ£L·×")sƒŸtk??hž£F´uµ8/¬L“Wv§P+]"˜_Ü8PŒÎo/ýÅ^-ÇÀZ·IýFKÂ3Ÿ¬•+©Æ/ÕýË{œïM„N¨Ú “Ôõ"§f³‰m]éåe a—]²sòÇÚ`»”òÂ§‚S®¯zlå»-•#ü7	½æ—»ºO=úäIÊ¢\«ÿn…åâŽ ¬” \ÜNP„„\"58§_A©ôèÃÉM"3ÒW,!äs¸É½åM©h‰[•ð”›âµ˜$fœÿŠe'‰tæua¿W”.ææIÍV)jÙ³aé3Âìfƒ:dU Éê±–Þód¥63v]æö‰dÃÊœ\	ÎŠ¥Ÿ¾´˜ZhekÌë=ZÜ‚DgŸõâºÒ•ÐÌ^ƒÄ°C%X!bƒÎ§È õœ9óãt¶Óüƒèh\©NÃ3(ÁºŠ%>Wu„;‚`]Ç0UŸD¥©ðÐOËÁæU6¡>qŸÎ¬Ò«Šv§žV¯{<š„gL©UäìöÉ˜1pàTé‹‰ö»tç€èÛªâÎñÒ’1A”=Çëes·D®w*ÝŠ‘ëÙy_;rFUÆ\a}fŽ$G1~kº€òÁôÍ
¼pJÓ$÷‹wðF1÷ëœ_%˜z)d•ð*Ë.á•Ç2É"7ÜÎe™ðrÙ‹Á·ËñÄx}â¬^ùË–ÇãUÌ#S«³øÀ/oõV¹øÀ3oõJñÌxýßÍ?ãUfñ‹ô‡P½ØvrÎÔ„R™öŠµ‹9Ñ,f<‹¤³+SGæ„µHt­Èlãõ±ufyõ_òU]Oyéé÷>"ÜÇãï9ôÑ)œ¨Â¼¢(°d	;€wÊ±¹»µTÄKÁNÍ—eöïœMÊ·(ðë%ãd’¹¯J*qlOùêÛsu›óÃh}Ò[ ‰…ÌîùèSÛ9ÈÎ«²¬p7d`pË»ÂüÞg¾;
U8y§Í­èqÈpß[Ko¼'?²"UŽmNÛºÐJ³¦>œ%QÈë²þz-õÚ[Ê!Ò/ªü3V$+è:Õ€¬ÏÐ‰,¯$¿„¤A!±·|¾¼8R‡s‹¸Z¯P#rF3>ßüŽ´ÐÅSÎêy …‰j^rR¥|nq|¯J‡[®52ë÷Úó8ß½/TéH¯änO¢›óûÉó¬+’„]¸§qŠ·8¹‡öQ‘•>V0™žIÑåÁ¿yŸ/¥ÜTpµÖèbÿÑü=VfÛ”.jä½¨åe¯Èñ0‚ÿk®þ2](ñÎµR/$fN¯Ô¥ ×uWY`¹±›e&a¼[Í~™÷’öín™æ:AS¶N©1JUþ2ÊõvÉótI|YÞ*Ü#¥Å®ò|Nœþ&ÙDDü¤®\q"¥ÈÃpF1ò	v<‡o™Ì.¸
{î§vß¡ìqÑ”øçÿET«Ðr1©îö¢pEì .nše!V“Ì
ëÓec$«À²çÞò4òqÙ1‡›5Ýl.	[ab­ÛM­•ç	Íýüt%°É+dKqeIruX
#3ßo¸ÝŽ¼×ÏÍ«Î{“FÁ|,<ž§#?d¿Ø>Ÿ—“3r˜ór4ro­b??JÞ*›S#+%lWQº‹ó)FYt‘wì°,—J…‘¥`Iì”@ÙÄ:Ï½(ðØþÔ‹¼8”¯ÄªM4^²
*>;FÁOÅÛE»)âbY°Q(^,÷jÁÌû›¿ÉáËÊú¨rÿTü¦šðÇš¯[?»ÏkÌyJ9oKäSøÁ´Çæþ{
/½¤õ\ÿPþR3œS2üù^i\KûÝ†¬ÎÜ›>‚õÝêA¢ÏÈá8DÉ4^Õçûàò¾†áX8öi ”…UÞ:Àå¨ëÛ`=¬AIÿi5·‹Ý|9R%hTO¿—ïE[„øÏÃø±·ô~xùŒ/šû-i*Ã>eY A†Ä‡ŸßEpDÓ_D®ø_çòžBÒè· TâÝ„¶á=6o=NIšò†"±röÍhÜ¾‰;0+±¾~UÜfKî•Q˜ÚhíTà ¯ÿAj]žé !³1‹£áž9î+u`€
ÿ©?¦ã¡€3½GrÛVŽæMp¥àYð¬±5ÀÑ?Š@¾
A ¼Ø«ÍÃ†¼Us›¡ñ5/áöõcÍÍ8„.k{Óð>
cßHå¦ôE‹t0sÔ¬ãWžžã¥?ƒO¤'’„×wžÌ³õ•ºmÏ¶ûpôÎ›©ö½ù; ÏGnéà3I¬ëÞˆœ÷Of|…Ét]œ?çû3·r¯.á8ò“!¤Y}ås@˜ÄÛH‚»*_ISF‡ &(»¶|’­äXLwF3•F‰ƒ÷Àzµ»W™±¤Ê„ÒÆñÂµž¹UqsYÏœ¤Ë¶xÊy©¨úêËÃ¨šk%¨›úž…óÐ]}›¡£ËÕ¯9¼8fWP/×¦…AÀ{êÍ‚éÅµ³Ø­ó@½|:‡Mv´¼˜È|9ò¯:Ô|Ù[òOßŽ—ùÓ¤ÿêRr’$²JbH.)wÒ$'«—–NÒ•E²ºÃ¯“h„‹å&¸`„ÀiùHh„)1«¿Š¼$Õ¯ØÃ!ˆ³`¸žÇ B‡¨:äHP[{Ì £ ¿½gÞ|mƒÑXAøPíþ>®I0dü»u£ùú½MÞ_é~ë‡Ñ8ð’þò¢™ì\<»F§^ä)m0Ë|Ä‡$p’‰wªmípê]œxAÄñþ†˜ÓzË‚#,Ë“©?FN€Õåk×øâ~0ïO-ßy	OÅÂ_°:oWøzNhUï`O4täÃìê£÷§> By¤{ˆ€Ù`ßùÓw>F@Âl°÷ã 7ø/5ÍêÔº:Ìpƒê='}Š‘ÿpÀêÔì+òh
tyË5ý#ÎÀ2ÍüeØVO^ã+ßŸ.Oóbô¢
=«óF×èýAöm„UµÞÚ¦ñÊÇJ.Z³k|æUäŸ'þ’=?2¾òÝ)ìÑ øíºÚ¨ú7~ô£‘7÷pÌýwB=óÇ–ÂCfuÑô6ö,uH¬YDˆ4T ÄûáiÀ™´ $~m°™ì´†¼£xðà§`»§¯\c]þ‰¿|èSokú§`åçœ¼òÐ\½õ5öãz^Â®÷@pñçñpræSs‹~ç{ï.H‹ç4lOzë:3$ZKNX·¶ï½ói³âÑ¼ƒ9=>Âˆæ#+M3}ïÆŒ-ñaÕY[Ys‡’m§¾pGS’_*ò¸•£ÜJ¸î8Þ­¢ñûÚä„šj*xö}òAßê|(È¥(÷„¡§z¡¼o†·´6dÆ‰:†¹€X¶Þ\†OƒsTo¯¯Wð%ïS×O)èás×ÖûþëTŒw­w0¯wêzýÇ³ÞŸepxÛ9Yî_žã,¤vRÞŠÜ®áâç®oÕÈ“kšŸÐy)Ë‹‘cüu#C>ùSŸÑµÓ¤8ÍÁÝ™i\ÿÌ4VOÍœêRÕ–ÏÍÎÝ¹i\Ÿð¹™ŸT¥ãê,{l–'[EZ•Ïðè|ì/½`³M––‹ÿ rz_1QÐ7–Çèˆ?ù%£Æ”ð Ý®FUë='éöÝIj\ÿ$5×ŽÒöÖÊÎÒöÖÝYj\ŸðYº{–¶·nz–šTóVS!?ŸÓô{ÀfŒÜã'(¢{ê‘sÂg’Ê©Q…pe~uÕÕ#÷½uÜÏ×¿´{Îçû‹p?ç­`ýSÙýg„ï¤Ç×ƒ˜y®Wáx<­šò#ß\a÷uºŽkð¹8|³Â’—¯‡Ê%·$î²µŸ¼ÜxôdmQoWl½rç~N{àú¢}ÁÍ»Pƒ_Kõñ0fOWüQÒ»ßþ™‚Á‡ùqàÅüÅ€éó‹ësMÕµóz¬$ã¼ùEéÊ)ÂîsøðdR‚ôíÉèõPpÕ‹¸ ,|nŽ˜¢ŸiÔ¹ïñˆðL¥%ÍQPõ"Üé·Tž«tÈønò•”çË)ÒT¥&Ój´›„ø7(¸’_qÅùÀAYÿìðPõ >Œük”WúÀ$5;ÞÓN¡on.9Å}°‹åvþÕß²¬gØ	y'î²B/¸êùÐ]Ö	X¤cá¿»ù´4Âïÿ×Ô©‰|š”¬å¹D­iŸß2>þŽ%ðïþÛßýžq±Ä¡,…ËÇ,÷ëe'ÿ/ÿ_îL$<MÒ¯æ8¡hî›Ó.:ƒ+9ƒMÃG?„ò©½îl»hrè‡¦i–>>Sü³øECÓ¹h¦K³’Ò´ãþ¾êA‘=Twà<Z†…2­'l¢v¸žÊ e>ä!ò‰%Q°tí D6AÛ[+Ma*Ú­üö©hHV<ìê¹5Êbªñd\’¯œÌBa"ÎP4nþãþú¯DR
å˜_†2…q¯“ˆ"{ß¦ðH¢$)ƒëAY•sÝF GÕc×t2â}j÷E‘çFˆ^ÄEÉÆÆ0Aº„„~±XáWl!ó’<fCdsD]&` .’nuÐ)S%UÌÍŠdê‘+;¤ã®˜¤^Ež<ñ.Só¹êW˜©¾¤¥Á’äX®¥^Ÿí2Ôç¡rè÷/Ý¶0®ëÇÖ›q8óëowŒRdo©¸Ö |·ÐRcyzÁŸ®À3:›’éòª‚fñza„NrPr“Ïfh©âf¦¦l¡HH“†u¨_”¥ÄyH4ð™w›:IÐt{‰™,9Ô½âÀ%óT`íTñlkL…‘©À¾ÚzÀt¼ô¢e~â‚{ó“PÆ×ö´øÚxó·íhšrÆ×r…Àë˜Mƒ·>É Ä?{ùBJ(ÒËøyø{1	—!üb9û³—l°‹áèš³9£cŸ°D¯?‚£$‚½?½€D‰íD–ä|¼¢›ÒÊ7m4V#œ¨1ïZo~±f>¶È…ÍÂˆ×X‘E'•(¢	u˜ ¦þ‘÷¸×Ù·©(d	ÂóKm=Úî=¾ñR°“Õð%œª’šRãƒr‰‚JMtú ¶ùld€,\¬Ëƒ°QðÔŠ‹Ôsp‡T	JË¾¶“dneO,5l$‰†þŠ=ƒI¢Ž°õaä{¬þ<Á*Ã3ª>ÏöÃéélŽ9oŽÃuC³hãšm#?Él´KG°epO€khLà#™8}Œ^4œÐa÷ìOüáÛ)ü'ããã2G”“ÄÁÑîYc+ÉaáÎ-cäÆhUÅÂfÙyNz2Tkuy%fÇ˜’³ëXHc§)VR€sÉCŠü‘¼õ*ÄüjËæÔŸ—“+ LðÙÞõZesË?i}ø±$9œ_%òs8³)ÐälY9nN¨8N§
tJà­W=M6·¬þ'6	¯kÓ-í¸E3‹,–z´˜t‰&ÄkQ&€Ei³Â%ø)XNñ½îB¤<G²

ae/:7_…µ¹ÉB ¸ÐÈŠAù´iÂ9pS l ÂÅì`#%;•[L„*#°~Ø5
UqcÉÜ b5ùimì§r™®¿úýÕo'ŒAªžØ6j:Ãáˆ³î‘góý1éiäÃ¬ðÔv‘OÑ›òŠwÃa	G6%ÀX†@‚7;¬‘ÊÇtÃÐÜH^¦cåeœ9ù©8µÔ‘Ü†ÉÇÜl6míe.Nj#ï•Íl¸gMÇi¾X&ßÈ3rN8jyZÎ$ÕH†C]}rÎÌ*åeèÂéYöŒÓ$Îk•;ÒS/…#¥ªBê¢á‚|#¸¹W‡¥6h˜ü2œ5bÕ±gS
H™ÁÕóB‹=(/ÓJ÷ð|Ëe_)ò‹:äÓ!›yËáÄc>´fáíZž™,•Qˆs¬(<ae	í1ÉŒâæÄ‹ëq3på•äoC#:YàÝ/¾€æt@¡¾@üÙ\FÁ¬¾NJ©5—±BäûY°äãðÏ‡S˜Æ‹ðPö÷…ü’½‹È|ž›JÑ©%Ë,Î´tÒ%¹¢	HsðÁ~ãÐ*WzÔ‘“šgU"Æ‰däR¨\WžÆ9m˜‘{Hc-cÿ•aØUñ+·%ÓõÏð±ä¤WXµÍÔ.ÏÖŠz4ý‚R¾Ð B›|ž†#§Fëj
®ö´2´³žéY*_°îÉ"˜Z~E1¢+üÛºã|×!ÇtrkØ¾¹Ê5n+ã‚=~ävÉD´¯0ínøÖÿ)-'{—¤ É³ƒç×´Jù†â.ò~¥J¥.4d°Ÿ'Ëèt>h“	C]JÃ{nÍ¨‚V\ o¨¼D›Á›/á|ÌÊWž‘øýæÊi\K-!ÅyÉk“éÙÂ¶‹9ó%é“BÀk5IÅç¡sŠšüç@‰épjY²œÃv©È˜AaÍ\GžÓ´ƒ\ÌÌ1Œ&I3ŠÒ^£pˆÙtˆð×p‘§EðÔ^|Zjvð¸–¿žùEÍròºÚNá+SGd‹[™UíyóÑqxÎuŽGÁìg?bäèÁ¥°DùßãÁWWÅŠ>©; –n6Ú] ®kóÌ½laM:	§RV«w-jÑC9­ÃGqy›ÄVJcÖqø8®NÙèÒ3âÕm²Ç@q‚abÃâKeåsíU*.¹„r¥R±¥“ˆ	ƒjÀZ [ãtíÃš9ŸNƒÅ#ø¾˜LRzæü£ŒÉÓ¡ÝÔ’¢Û?“¶L²r]ß¥0Uõ!V;‡»¼W\]žèðªö2\â¹uºˆhwÂÆÁ4ó2Æ°ç•lÒ´þë‚ÑE\éŒÒÑ	 $IœèþQ«æ1@¶Tëˆðûb<ô}\Uóñ”ßëŽ/­ÆÐZ rg÷Y»¬½µb™zÀƒå ×9§ËûÂ*ï&;(	nm5”5X»TxÒBWº”-Ö ÃÝI‰Ÿ0¢=Íý ±+Å$W˜óhN÷³gè5Z` ,rñtpX
i¤lNÁàÚÿNæIj~tøš¯ž¡¶kWåxóßÊÞOUŽmø·”æõâ/	œÿúç9›v#¤/ë×àÖf¾ôaÚXÓñ6e.å1!<Ë,5#6²m…ž<í{6¥%_1iÞvè*íÃù=‚Å5¨ŽŽ<CUÆùqxJ)La³Ã<;æ0yÉT%î(ö¸ sfVÈëNÖdÃý%Q³{ž5­†Dñžýòr9ñg~—íÝº2úÄ¢#öT3\ ÷rÉÒæXKðxL¹‰ÙUŽ­Bv(¡I0á~«X£$øY_†6ñ¦'Yù$>5<ÝA‡(»}r¦BCNNÌ%_Ã•êÈ/	úÅ>ˆ) ©~ŒÙõUÑ[T¦VØ·\:é,LÕW¹ýjmƒs ÎTøñ•Hðøâ_¯¡ûR¡ô7¯^ó4À['Áã–ÛeæÐ¿çØ&kcÙ&¡„}òi»iÝ`§±qMMzï=T‚2¿Ô/Ë­w“ûjN-œ=Õüä¡Þ¹šEÑ	I©í‹kfÐ õd‘Ü=Ö‚„ê DÊºG¼lZ³ŸyóÜYß…°=yŽäüá^FDð1Ó ï­žñZÝ`šgvÁ˜…£‹Ä!êŽhæEo«Ž2~Pù•ÅQ],·ü{*¿dPÈ//ÉõûÑ˜2î_Ù©\.e³µŒ$œ5Ò¹&ÖbÚk[qãü“ŒZì†O›Gx®+ÆŒ÷ìÌÆ‘wALJ¡Šïrì/’=†ózA…í¼òïI§°ø\û	Òb¸#^/€Iƒ¡ˆKæ=áÃ)OÓ|ŠO_GìãYý4ðÑˆˆõ'9Ð cšV,?å¡Œj¸$‘‰æÁ¹¿Ø Áž.6Eÿ!ß
{—ºgù2¹ßËg™s;+àÎÙSü†+ÏYáœ”l%”¸V~I˜!í\SÑ œn|Y¢”×NKz¢¿˜›Á†ÔÒý)Žª7_^Ò4Èüqµ8“žZòÑwô›?ãCzé‚Ó8mñH¹‹í
w|•¤ò›ÀWtHÛPÐ¢Å-bÂÿIªÅ½Ãúm×-î¦·HÇÎ/4žs²-rðœ_KtDyñD&”Ê§à²¨³Dªÿ  ÿÿì½ëVI¶ ü¿ž"­©)¤)IèØV³d6ÝÆø Üuêc±Ú‰” <%)Õ™’bñóg~Îšg™šGøbï¸GFd¦¶±Ûê.#eÆ=vìØ÷JÕÍ¯¼Ü.(;££áG€ß	Ê'ôæ²ú¥Rq(ú€zy=Js«*™c9f>OÇO°¥×¨·7+éìX2G¤íöŠë‡‡œUà$dˆ{%Ú‘‚Ez‹«,ÐÐ“»î) *X£(¨òŒ4&hml*«ð]³Q©Ý–Á}ÖŸ3$;T¶a¯
(Ñœh­²SŒü¸;/7°`©æ¯h™¤'›¡AP-¦ržGÓ¥KŽ8p2ŽÆ®ðF‹¹®ÝÆdLVµóh–Y›Ô|Ð0¼ÆvÁuC5¦~Þh¬?×¼6fZÊ¸ñ¥#óu•é_µvJˆ…-Q#²i„‚Ó'P§JÐ¡¨Õù›%™j(O£„S']ëù&¸ÉFrŒ!”ÅÍÐ™Š+Õ5˜¨×Ãÿý_ÚPD-FÎBýY¡Õ¡¦Î{Á  ¯á‹V–X–¸Úê„GŸAî_bØ­rå7”ÌŠå(_iz†-	x5o£B
ærãü£Û*7•©šš¸-Å:AÙ½–.’¥0.·³p¼IõSls=ïwwøQõ“ŠT+ý¥`æ`ú5`â–>E ùõßhÜÑKÕÏ#h(6üLPC/R¨fôïŠjÞ|¨æCpI›Sdóæá‘MqúûÚI‘p¦"žëÛOõf+˜¨„+HöÀ\$ŸUé^ÞB‘†Sô	Ak,!7“¬ßR¬ÔfQí‚…9R8DšÅŒþ?¼f½¹Iþ”E¨[ª7©T¸8Ê.?â–ŒµZ­Tˆt}±®‹Oˆq1Z+ñ½¤³À–,Â®”eC—àÚl76ä"ÂpZÕN76Åÿå…²£à*édÏ­O©¡®a·‹@Iš™0/ýfIW@èÑrYà„Šæjü«Ž% iÀíCpÿùèa´±,¤f•ÍÓH 2
®¨û«í¨¦ÎŠ:2…‚wN#Ž"S É×É‰ÂÈœ£<€*Õ’Å9K@°ÖÀ2Ë¨ÎÁ±‚M/W'Ô"JÈ_ ”³ˆ—òàJQ*Ô›2cÝ)|³±þ4[rYd9­	°){*¬a&	5L!gÁpšd™M&ÝˆI‘?R ²Ì6K™0¤‘1RP(Žâð’ KÆ8mï¹ã\jd*"ôÔ£ˆFò“k¡YôÇÑÜ{½ Ë©åP­‚7u+C:zU{FIK'ù¬ú&wl¨±LÁ)a£€.…¤Ë"8Šƒk„^&ú°•ðq9
™\ºZÚíy8Þ0Š©Á½Àðy<u´vžÙ_X¨²ŒÍ=ÀúsŒÏfŽñ³¦ÿÇ1$0øÖ1u¦xÜuBÀ¸R¥(ZhüÅ5ê\l#ð3à…‡­AÐ^i_š˜¿eÚîW~<Èˆäf,ƒfB5CE ÒÖÁmQØ	ôöÇ¸o,nC&7Ø ŸÒS(o<»#XôS0Þ.RöâÜóõovú®À\_Œ6³ý–‰Æ
!âç?””^ê`ÿ‹·‡qæ òáJ6°@„V•óüwvB(„VI ¹(´õ·Oø.š	nñÁiŽÜ „†£è¹öƒ~{D€†AóAY&sJ
Â©
çM&Á0$£ßÔèds]]Ì
‚™Q¤¤Æ« (±†µmÌ†¨ä@ sË›ÜÐ ‰_\ú`9#ËÅñ‰£„œ˜Í†á{ðÎƒ8ÞÑ¾×;ì¿î½Ûý£È±°ŠfÓ‘z@6ôÈQNüë	1Oî"¦mÌrðõ‚7¡ŸàZ œpX9»½‰!á1ðO##«†ü#ÉD0Ò(œuÄÕ§ŸišŠ?JYÝ›—kð×¦Áf›4Ø,×jd¯&”-è[%?|Ur ¹»î½,+à©>mªÈfV”ò†œ¸‰¬"Ú0ePT3¶ÐŒèþò´½{ä¢±”v”Fí;]Jõœ!‰ÓfUH§^ÝÂUZÜF«ÿE¨¯ÜÏ¨²˜½›]Í!v›ž,n sNè;$OÉgNkíapy¦:m˜–6÷¹ûê66ZHtQ¨)B·œŠELiò5I)B²õŒcšó4s_À‘[ÍF~+ßWê
­ˆƒM¦gNÓFýZ×®Al–^²˜¸àN9gþøsàÀøãp’-à+{×³‘œ{>P¬¹ÈÐ..NŽ5ïåÇ¢kLÓÓd¤UsÆZ±pËª9%†"pñ¼Óy8î ÿ/Ö¯œPöd§~ûÃà-0s.å‹Yæ)$”bµ)dþø1²­Fk“ ŒÖV©R’núó¸ 
±˜¼a
^8;ÂÃ‹u>$H,\.å8i¹D]ú¤Û}~ö:à ®íÈÁ÷c¯÷¾·G¦÷¼Ñ*¦ËåMíïìtßzÝÝÝ^¿¿Ä®\`åˆ8±%£¸ñ>:…råD¹Ìüb_PW¡Äí#t[vûÜ®Á"Û_CÙµŒ\5©$Ü'wY•M¾ÂfuMeÍwªªYQQ“AÛdSŠ‹è{Jn‡U\DÐAÆƒ)­¸–b)Méçð	_
ø€¦òã\Åé%ðJôá6Ò}´w²¼=Â·¤ÑXRŸQÌ”£ûÉŸ2¦\âêÕD­aH$Ž(úZ?ÿfn¤÷v"½¯éRËš|Kî£ÅôB+ºŽÚG!aÍC¸Ž¦<œÒ ß¤ëè£w-3ËCÈ—ÑGã2ZÔbTwub´UGHiýÐ.£Ë9Œþpýlî¢_ÛYt_œå=qîá&ú•œDµN1÷›Bî¡K¹Þ|	YÅ-ôk9…~@RÄCëÑÉJn _Ë	ô;€’BîŸJVrûüjNŸß˜<,2)J3ß³Nž_ÖÉs)í½pð,bYùoâÜù½ºv~ÇÎ<·ÎâNEø^Q·¼n¾Kçwè¼·‘_DŽñ¨¿yx¾âu÷¿º{Äï×ñá½sˆ?Dh˜¶1»†¨Qò¸ÐuFpmôß£øøÛ+,ã:ùÅm`Ý‡„iûaº ¦ZÈtáÜ0¿7'Ì\0¿¤æÊî—›­¥Ü/ðÓyZ¬/¹Ûå—uºüª.—ìós­w—¬èjù½;Z> ›åªž•_É¯r9¯Ê|ˆýÊ•÷õ§\i‚Å—Rõ*¸íKøTæ,ÍÒ¨hoÊïÔ—rOÊoÓ²ˆØ÷âC¹„å½SjßÉGá9ùý&—Æt÷ñ™ü®=&¿'ÉbBûøJ~/ž’ŸÍOrE/Éb.ET7Áx]y„)g…"ÚåŸZ¾@ÆÕ¯ª²•Ov]ÌV[ìBfù³Z³%D4 ëÎ—·”¼ík]£L/’É0Ç‹íäÿ“IdÚ-—Ñ;0›„h;WÕÐÓªEÆ ŸÒËw‘HÝgùÝ*RËv¨MÂMÑç{*Œrä|Ä°ÉÜCÙ'Ë…‹¯Î£kªí"ŠI8Ž®&egèHÈ_ò~F†—P´˜Ï0AD4.Ëð[wÜ}÷O1¬ZïGlê/xåÂ·“8¼¼´cÀ´ðoCÂÕ³M»Á?ÆÀHr'Ã~ëò=/‚ÐtƒRLéÈ> ¸¥ I²‚kf¦rS‡(ÂÇ•^žBxìÑÝ~iÝè0Ãïâœô„L¬EËNr˜ÜÙu­³_¦ˆG…ÆÐŸ—?Bß$Ïß×(s~Qûþ,õwnúxyþ)’~J{c£äÑ´`š8¥¥[,‘tù–ñ¤~ŽçàƒK¬ÓU9 §uä'å¤©FÿIÂÜôÈíÉ¾ÖÉU4Äì`°V©ˆµ‹&áœ4Òñ¦õE©8¯÷º:î+ªp=Îõö˜kÛP†ñc¾±£0P„/„ä´ßÒº5!š¦µ=/ä>•†ÃU*÷üÓMÍÙ›‰ÊŸÚ¦`ßœ‹·‹kgÝŒ<ò÷ZÏa˜ÀYnçœ[„Å†}µÅžŒÈ-5^äB%ëƒÕßû—…öh‹î9’ ¡öÇCÕº$Âø“¿‡ÌGßQ•âò)WDnjN5n…	ÇâH§öM‘ÜXÍMÃ¢tÓtÀ±ŽV CÞ£¹Ï|o^ãïÐdUÂš"ÍÈ
¥€dÁzâ“›ÚO¼÷{ûd…:¾)…/z×dxSü6œþÉè±æ¦S1Ï7šC6û[‡^¬¶ÄrsäM;À²×_^å ¿ ¸RÅáø†´‹ä!¡yÉÂ‚iÆ8"]zç„|¿XÊOGS¤}‹8ºøŠlOc°W-·œ"ÍY:8oÚ§`»¼Z¯CËÃÔ#ãöóÅú$‚Õ¯‹gæ“Êo?ÝýôÓÅb: (²ó`7š^„`1JFC\¾3™DÚVá7oZÿò§ÂZütG8x£|yàé¥^ð˜è
ð)
‡ZêÒ^Å»ýÉãZWJ¨½Óà<á”@š?ûaì¦˜¦±ˆÚë¦|\‡sWU•	A·ÌíUþ•\ã,_’Æ˜éŒ¹Õv4 ´&ŒÊ„¥J‡àjÐaˆ=MÏ\›;>2üúóMÅê¯QõÈ¿-ÍTOYV©©Ôhb­_£â]˜N—YXÀm9˜L‹²û„ãVY8ÅžÔ4ô)±ƒ¯¸rzRÌå3Ò´˜Òm%Ýì.Ê)9‚e?º².?xÅymË m_œÄ~2j)BŒõŒó²ŠVZœ0¶Ë*Àpô¥—ôäs¡ÅÎ‹õQKk4-¢ »a±†	†1nx7ÑÂKìË•OÐ2!/â`BöÏ¡è±8$Ll8 †Pb.$>šPÄ-¡ÌcÇ;…	ÞNÇüé4š{çG6†\9um1gTª
:ä®—1AVðÀ\"#X2Ø¦Áã12E·Ctà ËI!”Â†—)ÚPý›øfY¸6Êt¬õ¶Ô·”ŽM[¿ôý–;Az¬4C<e[êÅ!4ççžÅARõŽ3§r¿«µ7£ñ¸;[nWRzLÞ.Áóªv¹*÷"|‚>A’“†W­Q™pð¨¼×ÑnZÇEk6Þ!€ÿ¸/àVãa.àÉ0u««áí º.0WTÇûq7wódø¨ïf!Su[r;÷g~üç8H¬J„J<.X2§%GâÁ9È (ÝçrW<+m7<E@Á@ü–O–¿æ·\––I0	-–FÎK? £¶Ð.b•{¤OŽ\û*º÷þ,˜Òxôe9©“‡íG„®ß]K'‹ñb	ôÀ&ÙqQiÀšÌ	2™Q]Ü§
{.¤ü®àC&9-ýôÕÜùÆ™ëîyÿïÿÏÿC–vGÿÉBU’jtÈúa™—”Hº
ÇàuuIÈ&8£`»Ë(˜m¾di3„(*Â˜’dc&ðP»N Ñq‰TÎ˜éKÐØ“Aaãä5£Uë‘‹çOr'÷÷[H¿‘¯ ¤ŠƒYÏi.+Ðä'u}]Ëà‹1'%M*²(@]'çÞNõYåAÅ)A§Éë× zÝ×SÀVxåro*ðZ~Í‹ÄTW½°H”’OÚÁW¯æýÜ0g^òÀ]Œø¦A	Ù«èz»Ô ´Fkƒüß®v„ñ`h1Ù"µ6KÞ€4Ðl‘¿7ôoLþ WýIŠ2ùú†ñ§Hf»´áÐÇ¿˜ùÛXº{ºÉ' ·:Ü.nxÍ–ÿÌ{F¦Òh>«=ûGcw³Þ~Ú†ßÿÖl6þš´ÈïÖóf÷iýùVË£ÿB-hâMcÐðÚõÆF¼úÛ›¤è3²4m(Ö~6n×Zõ­§YGNPí§KÛFÁF¯g²»õzÝ®c35lF´-ähä}okNSÕ=¯ƒ’Ò0Û¥}÷ÙE\–	òŒkïxL¢þeH@O¥ò#ðørû¢Rƒ~;=ƒ—‰ã1½æÉSú…6ß÷?ýÅ NÞIšGÓ†]VF\•­¦çm{§gUeXòGÕpo®…¢× "§wJi%Ôð‚•Ú¼'Ÿ‘^IÐûÖTÆzzö²Ì\ç5Y¤è‚OÏ*¿ÉÖÃ„Œ	e³¤éöCm·|á“@­Äq&´JýÐª”J¤¼¨&¯ŸÅ¯›R„š–ÛLõ¨Vú9Œ0¯P³¡´ÎJñE|V.8”CÂÓ—é^ß"Ø†^YlÏ/¿ˆ­âºœ—^£ÂŠ
vW”á:÷Å9jÝçuÖñÁÇ$q­<1ÖŽ-Fk|¾¤QsªKÝÜU½S>ÆªÑ‹°i<SwÃ Š¬ãk^aeÿ…Ü£„É:óèKð%,‡hº¡ªZU§ÿÉÇpé>è@ùörÈìÃËlF¶½'™“ø‹9	€–à"Æ 4I@ìI˜œˆÐ¶ š†híî'GeB…—®*O™u·å(VYÂé°ØNÃ”3^¨êt7VéN‡õàvùÉÍtà•A—«ê˜”))­<|Õ¤E<œÇ7lÆžàP¿ßxÞúº×E}Öp1ƒ‚.œPâ:4¦õXq0÷&`£%Ž*ƒ>(¶38
\åú<ú Äå.!.™™_ý•—ÕOôÞTØf˜–uKÈªñqpA†#]žW½læÉúÏÜˆ—¬ÁÝ:¯øQtË›œW¬»½h ›zå‡äè‡ägÙè¯ªÈÃH81»ªòF¢ÈŽ>Uì©×ˆ³ŽW:>…	agÿ6Ô»BJPRË²AA Rc÷è¸§¿æÐñä
h˜M³|¯Y9kÍŸlHÜ›ø`ñ®¿»ºú…ýhmªÏgsþ|³¡µåÛË/¦'¤©>B¶¯ã=þ\{zqÄ‘ñ„ÐP§Íª×ªzíª·q&
Ý)û›]uóB°4S·ÞX¤ous¿¹3ï!ìâj“l¢Šý$8M¹Wy]Ü~‚xåþ»oŠ¿BŠ<œ).¥'fkä¤è7«QÀ¸dMl§ÑåSÂs™s­ L†w&šñÇA</|\y'o{^BþE±zéç[¹w%rƒ%Þ9'”ìùÒ`8ˆ-i¢Isq{#ï"ŠÙrƒKaãÎ;o óÊ„
ï7íÞŠÆAéór	/9b5¢¼FÊà›€&¹rãXLH»÷	ðÒÁ‘QÒjÚë%1\µ±¼9ÕW²¼îR×:0Cò"''î˜Ÿy}?Š'€H¹Ê!¢ú îþb</Ë»üW<ã“è]6$7Næ%ÆÀ>Vy=õ~§é/.Ñn]¦¸°ŽzŽ€(ºõÐ{¾nq¯ÃX^³!… Þ©Â:ƒ´ýS`Ñc~°¢þ¥Þ$§b±Ùúœ–=ÒÂø‡ò°¶q=^M{ÕGµÓç­O£³"Ã-‡,È¶±eÓÙCÛz5µÈf#¥|4´:K˜á<5—×ø=iêè\þBš:(%Ò6qÃNiKÃRË”æÃß•låŠC‚ï¶²Í¶µ×¶¬eª1Z¦ÚÖÐz,aùñ‚»†µ)Å«C"*£s8’38=òFÓ¼ÌXø/Æ74ö €¢Ê ÐãYÜr1[Ú?%ÙmÕM×;âS€pÝdÆÔXrÊr(Š]6¼)ÅÀ‹.H»T3ÀŒg·,Æ³b’:¤ L~t+%Š¹k£ê¿¡ QŠ %ÃI¥çXÈWS¼QÝê¥‘ùZ–È|ÊYæšœÙ‚Ü¦vMC†¿¢U]¨…rBçm«ªç5juŸ{¿xdå0D“Y4ûêuƒH$¸yºðÇ”j°¸žØÜ!íFÐyÞ‘ÓÃÝ¸ç}˜©zÛÛf½¡bPµ¼‰÷É'”èlÄ§psCõvyxÂ;r‘&Hiªhg˜\c¡Î‚êÞÑt|ƒŽ›Lñî,ÁL‘SmõÔjÍRž•&Dzì&x7ªjmÄ:p9ØT{•eîÏ	„n\L¦VßeËy£W¼Ã“æc”È‡û$Ë;Ef¨q7ÝÚj¸îºtÑ9ã–à‚»]Ûn-RTWP‹¹H«Ã½âDŒ-Ó••¿kR"P¾LßãtL&œ‚‹T3ã¡eNüaFÅñ=Ò‹G©ŠÌ¸îh#ø]õå*æË<¨)@w<
CÈNuœ“g¡XnIEWtJúcH,€†*ðW—ÃŸlo[ÄþBcÿdÄðÕ½“ÚŠ†%à‡n~›fEoš$Èr~“±š®ÊâÉƒ::æáµ”í¯úÉN«àwh#~ð,×špóF ¦6ï°ôîcû.²I£8Ø,9~¢w¾€kbp~‹O—º)hê°›ZÛÈ-ÍT‰7cŸ\£Ú­CãŸå%Ê¸Ð¾Ó¢fw'-úÀ érCUª–tkŒ£u¹Å#ñàè“EMfP-QuëØÜBX’Ë@&\qŸo”…‘¾@¾[Ÿûñe0¯c×ntú"R¤’‰´hÃè,ZXzìnça$Ê¶ÏÃH™mŸ»Ì·14_¬*ìÇY¾v¼qâñ´‘c&¥ÖÒYD@ü43v™ÃE4 7+è`	FS~H’l½Õ`/X_
µ-æ–†_K±&ª#)¡Ö“(®±Øtv„ï¼¹£¢Ez´J¥—µ?Ú‚zWÎ´W«½X§U\-ÞfYà•¬)Ä™6¼>ñgôµ;ëŸÁÍö-€óÇø#+ˆÑmÂ$9ä(Œ¹ú±ü3ûqGøŸpžT>‚zFXÚ¼™WQè!X-#rŒÝ[R§Mn!†•=Ä×¹Žb¯K˜½_¸Éäút†î3]%Åó® —ýÖüÜØ-Ã¤÷iCó„×1 ¢jiQ"þÓ0˜Ž£¬ô*—+Ý9BZ=£Qhpvˆã( !db¦ç+€èNûUh'ˆôèèï½ã?4µ·£àáû'½c¯ÿGÿ¤wØ÷ú½ãì¼{_÷¤·ûæÝÁn÷­·wÜÝ?)TçÕq¯»çußíyï»ý“ã?¼÷ÇG{vOŽÞ¨Üë~8ùÃÛíÖ ÖÂ{Ç½~ÿ°û÷BÃê½íížã\ÞõOºoßvaH8ÐÃîÁ»“Þ»î»Ý½v_“V>¼=ùpLšÚ=>zß_j†ûGG{PäÁÀåÏè¥EÀg™{‹—÷þÈÙ\žüÐ6¿ÆVèq‘ºp{ÞÏ›Öz†W)Âtc[ŸFø¾7hÐ_CA^šj¶Yœºï0±x5½‡r´ 	Ð©‡Ó°Be•âþ²Ã¢‘Ðo™úL?µÉg;¢Hß˜Ç
"{S*q³FT8\CþoI%¤Š‹ÿAüßvŠïRtÏÓ,¿ž—©½}±>jæeJoÕ`hö¨úÊt…ÎŠ?x¦ð$™ç­alA©qåŒ
ý,£·û[XæT ž,ê>št«–`lç~ŒçËãòpØçè—Ùá:ãsZÑEÅÔJ77Qþ©`
ÇlAZÈŸðpÚ†L»•ç±Ï?*Ù!äf»‘)ë.v~yÈÜ¬‡Øš[nnóÌuŠÌ…Ùt¶œ–Cþ„¾ÒC97ÈWS@%y‰ïìºyB§i-e^VU5ˆÚðf`—sIŒ÷Nz{æu8Ö5Â¯â—d-;Svˆ_gìôl‘¿E!ñüþúˆœ½EãUà¿óTx¶ªÎ¥pBNÆ4³õE´†NÃq9€Lm!<F
ðyôT¦#háw”ÐŠ)Ë«ÁÍ	j˜K(:Ì˜gyjËŒê¨@Lê–dµ˜@Í¶3*Yf€<G_ËÚ¼žÔx.dsÒ7ÌAmú;g%¼zñ*ŠþÄ€‡ŽÐ<P7	Úp/j‘Dn’ê]$>ø2ºÏj&ÖÑÃC‹ÜOq0Ùá˜Ñª3„§sÛÃc1ôb¼ž œôÅƒ¶<JñÇØ)c6ºb„«ó™²îoCŠá??G‘ÞÊ/ÀR°	
Ž‚ý.ÂPXÝGñrüÄã ìl,„bQ[„‘Ð.a¶‹-kÈ†õ¦©7úÁPü`(¾†BÑŒþà'œü¨Ìõð?b ®Q‘#Í™d¸lÇSµ ¤…¯ð¹‰zÑ’àxgÇ£d“ÿÈa;@O)¢o­Àw¼/x¤³f3#¯6CBzË::+2'EoºGÍìBš–ÝTàM–°ù…X’”£ôr{_;9ÉŒ6,të§€ŒHx°±Øn:¿òù¸“Ôƒ}Íl^ÛôÜÆšŸQ0Ò„òh³ô”f8›ƒM6ÍKhaIe!ôÚ®`²›TX±¦áK’Ar™[
æÂ	™³OÐÇœ½ŒzfÏ‹Ï?ßn 'ª~zËÃñødh‘#iö`?{5ÅD!Ð$ýFnGŒ2‰Ž¶=‰ôMgKH63|¸;-JV†stR	(MbÜwr©ïóïÔãUêk>'g~îùsŸÆRú ~­AW¼§°|¦/‰<~4¶-ÕþôÿX1xwÆw"Ê=LpÕ™Èt:§wsfìûôÄwhËÖé“wå	¹‘Œ¶ù(	‰;‹ƒ„ô¸æÏ?Ç¯Uª’çá‚µ>ù"ÒÞØBˆÅÜík«º#§×wG‰Ñ¥.sê9œ"‚w‘£¡.¿|	» Ê¢gèÄ?ÇÀT]þK’µvî'á€®„Xºµ—eö¼ò#°ÔÊ¥0oÔÁt¶`õd¥È—oNßâS–ùe¶T'6ˆ£ÙÁÄ¿úñ ·nWy`	qÆ B4ô“V kî‡ã€š¿‘úòôÑGxþÒ3vô‰°„#‹`è4ãÑiã¬Âöî›ŠReÕ21¡éµY0Øc|À}üéëz4Gþg`D CÄ§¬›:9å‹±·ÇXK­<+9}Xä$=È6øÓM }8~[†±âº¹ yÅ|àŸŸ­sÿ´ßŽwã{ðî'H	Zónlàò¸”¿)©-¾ÖŒ:N‹JÄ(®7-:ùGáÎeñ¨×ÄŒ?ßŠ»•æd·èùvIÓ®Ù:OÂŽÂ5MÐ‰µ»w/_A;ÞÁô"rI
ÍN¹ÊlŠJ›÷Ÿ§$ÓNN^'´D¢ÇIÁ ÷t¬„g¦)¢U Râšñ)WŸl¥N»­”é"-;RSÊRMŠmr[¦ëAáIs‘~˜áÿÿy~öÛyE;Wt5…œ2€Èa(Ì,Î¬ùKxäsr%Âs»®2?[ênà¨Íb{äòAª
É%Tté®Ô¡Ñ©u*z§>€2e«àX³Æ:Ä@rÃÌß¼ÐÔ{­¬ˆ%ïÊy­©¸ÉlRËh[ò‘W¯ÐRW
ÃÔîB•ÌoÆHe\A4n‚âš°„o±¨tkÍ&y`óÉ°*RñÊ£	i¾óNyr8¹ô’x°­´rçùãùvIBH Ë5‡ý\wÌY$²¾Y	Ô3Fæh¼ T§M’‹4Ô`n ÚÔ1){¼ì¦)¢¥Tòa§\—*fÙz¡»>H~• -æù¥N$îãâ~Ê[e+Ë²tEÖŠ;Rg¬¨+cpzþ cwmêû+i€MÛ]É$÷Ù’,Ý¨-£Ã2ýÍ	Îœ3kæŸX(W¸)ÔKƒÈ{Ò¦óè“eÏV-í¡žz®·]T€KÉö:.¶oµÛÂv9H7;«øÁVÅ‚Á]!]ÿ6ô«,335JÐ\*–ué¼ìÂtuE˜BÁ^$MˆƒH³Œ1)X8B°-¹õêuÚX¥.¸šzw.ËÎ¬ƒ IaÖéDy6{OãºtDÇ’&¤ë©ˆJwÉGÈŒaêÇÅÌÜ™mKœšP—Žª ]H†ZÄuhƒÑˆLÏ8%ÜtlH9ßf¬le“~o}‚« ™Y÷Ñæ ýÙ•Ü3WÁˆŒ)ˆ·KAý²éo}o7^üe¯À|Øð„‘)bÞI4›p˜LHÄ¨å¢Í¢ºƒ7Òñþ#|ü…QcËºL­r—h¤Ókž+•áÑºA“M+îúê~Á€5•æ¹o»y0ÛVÚŸ©Â&Á0\X½]­¹Rìnâ_$÷ÃøKÃäß¾Ã6FÇØ½áQ´ò ¿€<$¤áŠ¿(DV|åƒä‡vo˜”Íü Êo(qÏ{×óú—C’qÕ;88ÈJÒf@öË÷€IÑÊ,Æƒ1¬2¼ŒVñ‚O±\î <0ýzüÎ+s•áƒ8˜¦w¯8ÏF·ê:Xí0’"ÓÅ$ˆÃ­TükÆÖhpygœ|º6&'C?
ö“ð}œƒÔ)(Æ£}IX|ÆóâÍ‡»46>ô§áØ·•UAì\é&Yÿ @
€È©B8§(àAÁñMD(„îpIòyr7šÌÆÁ\ô–•>-vd-ü@€¹ð§ÁœËbš
“7A‹A®÷Ç†Y­v%î@Ö/÷ýù(ˆ×ìÛæ’}§Çév%3£I=‘Ë.z’bF%Lºµ]šÅáÄoÀ`¥äÀMŒ¨©X™¾Ú%Ëä¨+ÕÚÑm®b?zõŽ¬«™l”t+F°FÌG§#®f? } ö–±¾NÄóY1ˆ5«J’ªåßó]§lV:_¸#ùqUj›ýmc”Ãè{Ã(“huŒÂëþÀ(é:šp.z Œ"ùQ´Íþ¶1Êë…Cú=á”K>§•°Š¬ýo…W.¼iÄó çrN|‘î‰TÔf~ m¯Z)	Dá£5d4MFáìÈ—º‹é<Ì½â8 ©ƒ{ ¸T›Sá¯ßo@yä3î½¡ ÊèXÊ œ-2Õ ªÌ
äi‰ÿƒ‚8CÍÞî{oÝã7
•à; ÝæY@žñÆóf«½±¹õôÙótqÊtLtH.ðÎn­•"’«ÇÂ«àØõG…LQB½+#P¨\HècB{pêÃ8œL0&Tx ÎÁá‘ÊY/EÁ«q8w' =Ÿã¨óäù
U\Ùhy4ôoÔÎòl°¤,Ö©“¹®Ï„b¬Ñ¾õ§Ù]OÔ¦ÁC[o‡=r5+2ñ^xØ3òM4mÒù"¢Iú¤’•›L±VsõéŠž#6‘|©Ï£>úº†noÄ¡Ä‘wDU¡éëÈž>Çšâ{ÀHŸåšüÌ7doâ‡ã]Nö@9—"wòÀ²€A<0÷ÇhImÓêhFXiÕ»kÿÝ‰Ë‚Ú·g˜Ñ½|x-ø½­/À¿rÂQh.æâ"·
ª!W¯yy¦Qò=õ™é¬9‡ v¹ eÍÖ£«Àbÿ°ÑýàÚŽ,mOÎî&Á5îî¡?VÛaÒÂw¢±öÉJû18C/qïZ¥nz¦%XÛÒKø7+¥ŒQiŸÜPþuWte›Yñú7p²	e;ÑßÑ‘Ô+ÿyé¶†+b)J#Ù?“y0Û.5êÍ|ÛÐ+:œû†^1×Ø"é8J+[Úñ¾.´½aÐ6˜<
hÝÚF? îÙjHR‹îcD1ÌcÁ¥VïX°æ„=x· œ5,aqhÆr‡vÈÞ«ˆ>(]'…zŠf’¶Ç:/g'"§âŒ[ï|V=,}Å7Þ·MÞ Uúêð <óã$ØGþ¼¬ Õ
@z£ê™oGÊ[§„Å"ÝB$5Heúó-ùqçÕ¼Ÿoù8î ›é¨ò¦fö·f•T,Qlëû¸8mê|]xj,™øm;» â&(qtýÉ¾Vf ­­ý`¨e×Ÿ·y4²(†ÕfnÊÊdõõ`¥šK˜çGáµéçÑµù†Ãí™æü 9e¹bÂÌØüu•|¨—PºðÇé´EÀÉhK$Ö§õÔ`iÓ‘ÿÔpÝ°‘lÉh'!b¹ÆÒXKÍÛr7Q0šOÆdöÕ+’Yƒuš‘Z2­ëö”¥`aÒKÂ]SÂÄSÆCçú!øª¤¢¶[±Mˆv›öb¬d»ïÐŸ.üq?<CÂuœJ§6¡†	ç…Å ³Ó³»tÅd\‘’CÙTÇ£Á $=™t›gO,¸ŒFbrÌq0†0Hcé¬òZÄåí«Á:së÷y0Q¥º»Û"øª7/ÃópÎo`ÁP¡CçsÇúÂ/w)5…-<…3ôVF<mB[6#lˆ-“+Úõs8ÐX+ã¢–©¦Ü1ud\çÒúËtU{JÏ‘Ä +i"–à	ò7$„ƒÅx1‘Žç#rîÇ\…p¹jxu{,uW„•<™p2IÉ„Û,¾ãæVd7ŽF·–½Z†%K	Ù0ë¾íQrÔHk&H¥Ncrv“2OQç Vµx§–»´d:ZÀBà0Vœ¸ýÛ–Ûþç[e4H¡Lb‘Ê’Ã#ª™°\Ç„ÝÇÚ]F.sŒa.¯™wîQ¶8ùç/ëd°ãâ“K¶¨A˜È…ËJýâi·EÉÉ>(x¦oîóðrq>âƒÁ~B§]€ÇRLÊO@ˆ.¬5€=*^Ñ¢KÍ¥ãuãØ¿©ƒf¢L:©ØÕ·ÊÇªÉU>Õ	Ù6<ÍæR	Ô¯lJê˜3##ÀYv&Ï}Ý(%Ò¨;ëÞÑ29Oàäè‰ÅŒ3.
U™âNØf$*»3UrÆ–½ˆR93
¤Úe]Ö[¡H6/ÃG­i0X¶è†•0lJÄÅ¥³|I Ò“K4t^.€¨9Þø<®þº‡t¥‡4¤{×î}ÍòP«Z(Ê†+iÊdžŽÊz¿D)– ºÎL!ËfJ1¤/SÊ™Í¡x²!X³å‘e¢±íFñT),@)aÏÙ7l·•–ÉÐŽi®^ì…f‘s%ÊÌ\hš˜I!ÜS—æR¡A’»!™iTèÇàROû+ðÃFU–Ùõã¡ÑØö­þûN4'ÀìäNdÙ¾åß8c-s‚ZV|·&©*ÆSQKè~3š6¢89.ú2mÝ•êÉ…Œò·j*
óšxáû Ÿ&±ÑšYm­ýôBÞ2ŠÌ‚á+‚Ë·6¬$eñ ŠZ[_Ñ¼'Í"ù†üÜ¥Æ‰èFñI· VQö[</š#?"Q^Jç„}þG\Ñ,A2	ü@^C!:y’|Îžb¶*h!4iì_1©K¢æÍÁžØ“W‹ñŸô©ZBiÅÝ‹àEUuP2WM—òn1’‰ÌŸ³«¤'"ýûyŠÞpnzÓ!}L
fŒ@{z]^Žƒ}VŽ‰Éz>$A¬dß	æsB%$"W_J5ëŽuUy†%ýŽ±Æä4‡¢˜–<H®<[všÚG_wR=á¢0™®h%–=)1GS%¨ r+Y2©{(ÛÖÆ°d{@j%Kuu¼zÒ&/þ¥†õ&ìFçF}%u¸²%EÒáŒO%oJ"'Øí˜I§Ò0h)âHÇj™s…xƒ´®È¥g¡’0-Ó^éMŸëY `&,¸’iiJxeDi ¥É•ÐGUd{emø²û5‡Ùäüf¤›zbtÅó©øNÍ7&ý7}oÛ*¸ãD&(í–0ê¥×lè­`Š#üËFP6F„«Ân1Y¬”Ê‡¥Œ[$±¢«›–4ì(â8£ÓpX±eÉ2V’[©C
‡›;©%ºšþ`ÄÝ$	/§¢ˆk·hj„¼í•U°–¦É¥R¥NÎÉ¤LþDo£« Þ%7ºÌ••2Ó{±1õòD0Ån-Y¾”±éyµ’‚“…ÖfH¶.À„Ñkl„kRç1÷áìëªdQãCVï;W5mÉ(ºzÔ‰ÉBj”Ûê(á`<±Ì[I[mÝ›Îã›7átŽ¹ËúæS5YÕž£‘] ~ƒA0l¥ÞX“­ÀŠø¢¸y£<°dR{ižúºÚÕùÓHÍÞÅœsu¿.
6Ç!%UšÞZ€69v ûú¿A|S *ÀÒåáyÕ+ÑI©Rõ®È¾åo£DÞno—Rg[v"È`ð˜‰Iù_ä°Œ‚i9™ú3²1s4§h—½"Gw6¿Ñl¨aóÈ¶tË‹IûÉƒm…OÐO<º&*%ŽK"jkKgzò¤ÖÝQMm^’ìüÛ]¥>ðçƒQ9ˆc}®0r&êäE—K=øã]¤,…´7zBÑ’ Û;d¹I™INÁÅˆj\žÚ%r´³ŒgáüY1q^´§ù\2)Õ
}¬58KK]2¶xÂ© ]¹Ñ†¶7Ú¼Í#I-’wçL~x:ŽƒÎøÁ[ù[ë—â“¼GûO>B_½$Ÿòí:m‚?LÿS0d’ŠlÌ§Ù;ÀóÕbÝöÃ…àìèNLj,&ò i^Rƒ2¡bÇSõRù!µ!°Úäù^pá/ÆsÕÑ-¨ÓKë,ëaéhAzúx:–›z@Ç	«o¢Eì!Fg‹\÷ºq 	 °/Wþ|Aüÿ)Ø)ÉþØ©u+NÿrEhÒè
TB8|SB(”Îq¦œ)9¢é3ãúK\
Ö^ŒÙVl’ýÔ6ig:L£ÁÏË0“š
“×È¨¥Ö ÎÏÎ°/DSVÂQGEPL§ºÒ}‘k,U;Lô÷œ”M¢IÀ	Ù-9)ñ>Ž&i`Kk¯Žƒ¹’cMRh‚NÕ'™ÂšÆš*LYÞºrS'{•UDSY?ÉãV„=×o&šg"…!6F(]¶
¯#:åúãñÑDÚz)f¬Ñ78ÌÒ›ñ^¡9½ì–·{Ú¬z­ª×®zgpµK&WèvYŠ\HR-Zs[/§é‘æ˜{/”%ÓZ¸PöÑ–¾WTJ«ò­ÿ:Ám„¢ÂEU¹Ás%páýìŠÏö&+_2?!šfrìßmª¬Ìrbg ÕÃE¸F;boŠToR›mì‰Q‹®+Œz¥Ða_÷Áå+x?ó²)¶³š™ø¹NP*P|ÏZ°Eñ}cØwåM33^;Wì±ìþ³¾îQ}i ûö-–¿à}ÎmÉ‡X„Ot•í‡ÈŸÈ1îFxã5ø–JÎ>Š{„µ0qÑ9¸»bDÛL¯!$8÷Íj«Ú®nœUÔCžæU2A‘4LèQŸi…UºŸoŽ>ìŠ²
¿þjò
¢]u©¶·MË€z› € ¦±È_Žë”w#ªIÝ‹"QžÁ€±‹t(‘¼¡R{Ç’ÇgÝE©:Å. 1FVWlÓyÓÏ…D-%2Ò–x1•${ßùUçZâ4å'Ö÷TË˜>&¤'(2Xß4@åZ~£ç¢£ÍÛ»;f‚7’{Ä¾îæ0ú€ð›À`o‹]RÉ‚'÷‰.,kK *D€Õ¬ÏÉ¨l®(74ªòEåƒ’ôNWÐbZ¤˜Þ^].GéÖ÷´‹W70§LÊÆôl‘ÈÀVõÖ“*©ß\`"¥¤;BËE å%é”/N³ãQU	|Zê¶úc~Ð…øí§oÄH±ÑYÅ[y¦]"r3Nçgš41nµ1¬j/ §•Q7‹R©’-åº‘²-‰´t!3s&2câáƒé0¸6uHø0[‘´Ã­*Ò¥¥Vj¦’sÚ©v`õ«¸˜Nµ*5¯y&Í9‘óÖ¤ø0‚wÁõ¼à^¤È:Ò€¨V
„ûµæ²Cý5s¨aò.š;9¹Ô™ÑàF³¬Šê¹ÊhÃäGŒFl1Î„—‡ˆ´¼Qý		YÅô&·õ£ÚÌÖôñ‹°^¯súæL#‘ù¢#±ÂÉeT·ìQÃïh1Ge†þVõø¥Çõ!i)Z`L)k1¹Aá÷~L‰zµj=™Ãyy­¶¦ÝR¢<ß^ÛÚì ®Ò>:“Lç²‘Ó†y£Ñ\g
´›­|óBq5©­#×ÕÐ»ùŒäöü8àì0¦d[²–`/èè(8¸@ßñü¬^õöŽ{øœµ{hçOîÊQ8àå¤.›ù0 þ€ƒºrp¬y<û’Õ‡`:Á‰Òñ
³W×–úÄ%Á=Òìv8pP±8¨ãø@mÓ\«(¿å)íË7Uì ‰ÚŸŒ¶À™øë`n™Üúl}ta®¡6A,y„Öº„þ+ým1@ô·Åøþv—‹dßúÁl ;?ùq4˜Gìë»è“x¼Ä÷¿OZŒìç1ÿ~èÇƒ¶<‹Ã1}rS:Ó1Áó~¢®=k¹8gu(R.ûUï¼’¾šý:NŽÇ9~ë'ÀÚgÏkò+š’#Ë%"Œàã£RBuËÛsö6Í­i³Ä’ü¼™SF#mM ðÍÃ,›ÐÇ®Tá½;yóÏƒw{»½þ©RÇz–*r(ñ@Ž JÌì·Q`Ð$b0´ŸÅ=YäùP)Ë¨¹ãækˆ7ÞU@ÄÁÆ€DÝÀ€¸/”õ C{‰é€¾¯.—Hí…² q–fQ%i¤óƒòøÝU\ H×H´.H-‘Xcæ¿¥Š¼ò D-EÔk…¶Jv¬"€¹ñ[ª”x×üváýbîý)¹R}†"¦C³’l°f"wö›®£Î, ÉAðeZÓ-YPì Ä©357	A+»”ÜÉàh@4ñ¯©ŠŽ•c£•ò0ÎJhÝÌ¨bJøTÅ!?¢âà?ƒ›¤,
©LÉÁÐÙªœbÉ3YsŽ±SÖªìVQÏ0”4-QÙ}ŒtÖÁ)”>¿½³ÖùÉ±Ôê°~‡`üû{ÿ™€Î†œ^á£‡º–r2yÜ´iPyÙ€›ÉEãá‡´>b°Ðó×?ù=$‹ÉÄ§P”Ì?Cû€^z×þ„µ¬ØwÉwô4h,7S§Âb“ëôÁFÎº‹Bñ1¡øÐ$ì_—µU/¥U5#V¸¸ó¦IÈ¡Ë¡\Š6OgÏ,Ú>•b¡V)¼;½¢ÍIß4º²„˜ÕJvÛ‘’¶²ZQDêœe´X±
µŒtB©eh¤Š„::SÄêL–å's0‚
q`Ê¢ª%`‰Íå`“•SôÇÀ ?X…ëb‡í×¹%ÕÕ‡»õ÷T}J
öþb;½þ&4¢xMNÏ%b#èÜ.ú= V#Ì×b@Î;¨ª7Àã®œª:³9W´6+UòŸ<Fâ#ÀdÎAñu_ií®¿¶/—Øƒ—Î-0ðî„6eãÈê¸*µ›¿Éõ“¨ˆYì…^­ª# ÍÚTeÚ4Áh	ÝÀbwÊÙüŠÅ¢¦h‰´0ÁT¢×;#Ð5I¸F é4ÝÂ™b§Ã;§1®û‹`É1½lÿ·Úõ¢<Ëˆt%jÑ¢–ì	3î¦{àbäÁ5ØlžD½ëA0¶HÛLÑ’®þ¦ !©;¬†¢	˜„"¢tð:¹Ÿ5Å%©‚qBO‡È„)k€Jµ<ÅkšìgqÛ}ÁÓ±$•+&|DÛ†W“J¥,_L©”¡¹Â Ë ;°“	¦hmmâN^[ 
ås,°‹6¬¿™Å)Ï“WœR¤í'H’\.åÖ3>j£‘‡5ÍÔˆr¯lå”bæ“;}mËéíõ+ƒ?J—9¯Ø)µ8¸à1»%Œþ©|j—t½Ïm×D-f7KHV°'<,+M‚õ,ýZ‘Çb/€;2œ
¹Ð /&ÓÄ+×(¢¥§E<Æ Ê¿SvÂC~ÂûÅ{/ 9€Š2<Úîï¿“)ÂÝFS3‚ð­7ˆú}òçÜ2á¯¿šf‰ä~è#‰¾Í)t6ýƒÉáÉ×ÓðŒÆÊKsÝ¤G}xKëÚ+¡øù@´C¢Ø®™fCû%•¼•9÷aŽ*1§Táþœ$x‹¥zI­M¦,Ç¹zÏ›DµR¡©ºTvµ]¢¼·jAS¿/½ŽÇ]wt(yòÙ¡$Í¬.)é6´¸XñÏ1bÃ
BŒ(/ F¶`YÜ1ý¥!¦µ,Ä˜Â‡åáÅlá±@‹]¬ò¹`¥Ÿ+Êæ×þäÐ¿¶ì†Õð¨; ÖŠ]Ã‚+˜^?Cl”Z3¾bŒÀ£:O¨ €ØÙòiC>Ï\3CÓÂåï¿Ó¥Òq²`”}é¯5Ï]ßûUÌ‡­pÖ5:¼æpQgÙÞŸ(cgzÅ1ä éŒqôÙ8Ìå[q ™g?c=¿ê®ïˆ]ïè {yÒ¥¥Ùø-HJM8{ó’¸PŠÌƒ8;‰ÒÔÕÕn4îC|ã@0úÕk«}ÏæF…F6*$¾¬à€R²ú¼›0ãŠÙN„4·A“¼”cÿUÖ¯J¿ô­40ö(Fe0²5ÔM«kB`­H¡ÿ|ÛÿÏúbŽ“:<ùç4¸Òƒàjv]%Ìù[¹L¸B|	·6t>¢Ø)ŒÄGø›12cÏhK@é|xW!Y£ëqr]û/ˆWw3T9fMÞÆÈû2ÜCP˜ðæ†M‰ Ì€@²	fG¸<)œ†®¶½!Ï/§äÅÚ8¸ ÆÒ[£Dðk!´”HÐç—ÂôK>Ä$ˆ–ç	f‡.¥Œût2
&ðvmH„°;„'zƒàØ·ôV°ð™aB)ì÷Í,ˆ.`i(G{3¸ÌYÇ£óÿÂÅS¬ÕÈŠvDMð	ƒsÌC0ð%!€[*yXPYÍ;l;¤K˜¬ñqÿö“Ö9nmºkÜÓÑ„lS´è*‘#žÇaIµèJþêðÝ®Ã²¢4³¡–€ïxOžðRð[}O@-AŸH^U‰I`ŽoÅá_îp,ƒEñªâËQb!»Èš” ¤JuŸ‚x ^N}{û³“àšôšÕ”xQ®,Ð|~*¡^‡õ¥ï`Ù½øò\Ž“Û Ó•×þÛZœk¥3Ø­ŸóKK'!Pu•fa'žBx72É$"T‡6Ç‹Ë]è½cŽéüÒ2 ¹©¡Qà¢‡‰´~tÝ-øŸð|Ó/;'pÔÒb‘Ú¶}â}è.©LnÍÐÎ˜‚|i>
§¥*EbÂrÈw*ÐÏ	Æ\½>@Ûêµcšb™êY»C1NÊ	IƒýÈÞ3
Q»§Ð;šc~á"”÷B¹Dw~INÜ-ü¹ó`ŒÊ6wØKñ¹”šu\k^£ã4Ù>Ëâ•?1£w›0pÆ©w ÁÄÚ#åö½3hÝsl‹’D¾4ÊŽö÷vºo½înw¯wx°ë½>&_úÞqo÷èxÏ+ãÏWGG¯”ª8?Àr€ªx½t¼æ¬Ù®fãéîFSnXi?äâ(‰p@üÌ†R¯×Aãˆ±7Ër"<×ec­oµ~ ^¶ÂèN1ÐuSf®¬~‹®~³ÃØ1?¼÷ÿu°¯3ö ™Þú¨©,}VÕVº*ÕÔ„Óò³ªº•5ïY¥`£¢…çFO+Ý‘ÛK/½µtÍ¦ÑÄff‡FéöònM´2;Ü2J7—ïð©Ú„¥³ÔáSN_Üä'OÂ¸ Žˆ£#<†}¦ú{Ê\8ÍZùó¶vtî¤Î&ž”ÞüÏz õ¶[FÛö¨ï˜laíÝzw:äÍ"•‘j4,S9Ø»ïD²@³Ð†Öæ÷—†LÇ$AYüpÓÔá³Ð¹;w’:Fe}+Ø´M±iœY.Q¼~
öîÌÁ<¡¶ÒµU¡¶Òµuo„ÚZ¡¶îPÍ&²ªYz„j6‘PÍÒ+ T³	7Bmå#ÔÖƒ Ô–¡R(^ùl¶ŠáÒ{)‚G[KãQ~þî;‡{ Ñ!Â*,€D9^y¸.…A‡­åÏÎÀž-{nPìÙî°hÖ¿xÂŽF¸¼ÿÇ,ºãu´øá˜T:B¼Åtª3²–M‰4“9HEŒW-xÕš-¯Úðªã«µùh-ëT·Óx»]o·Óx»}o¼Ý^o·ï·Í&²ñ¶Yz¼m6‘·ÍÒ+àm³	7Þnçãíöƒàí¶oçgeÔÐ¶#ð´ýŸoÝA&i6?ó=f<ø˜ÿÚËÊ,‚í=§¸
~Wc.1¥(0ÐÃM(üùVàÍ;t4þ¸Ü6Qø&Eá«;$w_çÐ¼iÜ¹Qwn¤qçFþéÛxÓ·á8}ÚÔWÞÇbÄ“O»)È‰û·aîßÝ¿ÍŽ÷
­«úÁÌ}HÕÆwPoaµõS:|Z÷N Ô;þ¡Œ`­áÛÓŒÝßJÎSþæ=ðÄx°B¹M5Õ¦è#©ûMþþ{†T­aF£ªBQtðþdÉ´VŠu¦j/EÇýnnÇúµ™^zó=oú`ÎCLi»ezÉêA´Ž^-¬må¤ª5Ò^:R'5%¶Õ¥ºn!.ûƒ Â ;Ý÷GÝZ±üûïýÒd÷ËÕÕï"»t»q÷ß?>Ø05Y³°'ÄŸ„ ŒŠÊžÓ³âž}Ê6Ó+¿?±¯Àl.W`óË¬€<'÷[~×½}nÃá"<ä=Ð4¡ÜïÚcîËÅh}™Åˆâ‹¡–×pÁÃ;µŠp=¨UµbC1-Š±-ŽQ±[YYyÑt|S‘ÛcØÍÀí‚‰‰¦„c¾ûðâWô/*4ïç{í¶uÞÖå=ë¾èšnmm¶7
ïÜûþçi÷÷lWCq÷Mš/ýØ·¯¿o1çï›iEfß¸ýHÝI÷í®(>.°qd†¹Ú©É&âeQt}Ü]žóÙˆqBLQ„žWŽ_"^JÒªVfMÞ3
ûôŒòkÏ:Þ›ƒ×ozßõû¯Þö¼>$qôÊoÞ÷+† t4KŽÑµÙv[eµcgeÉz¶vw+‡6~”Uå<¨<~ß_ò‚[Á.8{àÅp'5gv´ÔÛ|þ¼0|6zÃµ˜Ë´ädv¼nF¢>öÃë`XnTùFq5×`öžoÙ…vZ?µ•ywÞŠæÕ²hþ¨·Sð=Öíäo?Ïvã¢ng±«p%+õ•w3û~ä–êË6ï¾©5ü£ÁZA†¿ý “šÝƒLšZº•Q3îP¼ùøý‰h$€>ú’s×^ü'1¼Ðy¼t h0jåÏNÃô–Ý©v®Ú ò[RÍÜ™Ã2×{ª-IŸ÷oí°û¶zL³ s‡"û=^híèäMïxÍÒÏN„ð@&b}Õ0Î
X¸¤|©¶Ò’\{«m§Ö¡¾å§â¹qnØšýê•¼·½îñ»ÞqšjDHÛ{Þëîµú¦Ù~Úk÷JÂÜ³á¦t–ZÚ¢“õ),:¢¿4~R$½ô/qxšéÎÙB‹¢ÑÚêZ‚°6lª‰jz4Ô¥£Ý4ƒæ¤íÑÑG~òfJŸ"”ãYÚÍP9Ìo˜nDñTTëqk¹Dl4˜‚›{¢9x@˜
ñ°Ç/·³ã(Û¥?B8Q–6EÈ2Öò%¡ëÔs‹>Qtà5OÞ4h·•ŠýÆ0†Âõóýîþ+Üg¯àhÈº(C™%âºjVÌ!•àMË1”öþÆþÖRC¹Ò†r%‡Ò²¥øXz›½§½Wnð·ˆÇ3€Ai=y^ç…A¦ƒ÷ã=
Ô=Tìølnñà‹…ôh”£€¿¾ØQHåJÊ<
ºžâzP‰ë<XY•¢"Û©¾ðqÈð`\‡ÁÂCÙ)&±BiGw¹*hP/d›´µÔÎNî)sûð17ë&á:×ºxðEzz4ÊAÇ__ì §‡r¥åKtuL¢î—õiù Øo}XÅ÷†2ŽîÑ;ÇËUtM-ß›`DƒÛÞÓMX@.¢¿×Þl¼R@Z 
ÃlYXz¥(øyÝë‡@x&óp x²O†äC8½„GûêÔ¨„¡F'øˆÃ÷}‘
Þi^tPA³V¡oS•Ž>±n„Z--†2§÷þs•$3Ä‰…£_Ù é›Rçh?¾éCg*c·2ÈžX¯láˆ-ì¦’ÕèÍÎkko»ý>õsôú»Ç@ô¬ã£ýÐ œtOÈuº›fÜäú”ýÞÓg%‹ºÅÅó-Ë«Î¤%p&U¼õ­ ú’C\é¥·Â¨œ¶³hçZ+Újmä5»µR³Oóš- 8òÜ&BsO£I½±´íäaïäø`×[÷0|÷äèØ.”iöZÏÛ¯Š@šµßfªßîÛÞª=™$–Ñ×†Ù´}¦Þž¦Œ‰Nºo½2q‡oùNu”¢Á={¬¸"/º%@w@Ð…wQ"é3K¼ÄëMcÈ
ih'q7RäOò¶ê]t”ëG<wÔû…=–ÞôîÞÞûIB(Ò2^È£Ï¾4ûäO>éc[Ÿ„—‡ô/èz„K­üß¡;)'MÍ•Q ÇÌé€òP‘à‹Æl‹¤7ÇçR°Aûúj-ŠuÈjÒ¶<‡	[Y#ÊS”As½îu¡ÙË ÐR‰§“Yb!‹,ò<§‘¬%Q_Øš±-ƒ Ép
Æãþt P‚Þ^ùy£Öl4Løôy1D•Æ0Å›¼!¼
¦ƒ!7þTFñ¬Q{öÜÄ¹RÐ‡þÎŠú2o4»Ñt
¬ËÓÍÚÓÔX¢˜9õ1ù*o{Ðu4SF±EF±aŽb(Š™£Pß£¯òFÑ*@C£¶•BÀÊ˜ÏîùB„›¨hè[Q‚ù–L¸„/¡¯J!;ñBk¥),åy[Sõä6³áhfk¹fž:š)@8é*’ûÐK´‘"“`ýënWZÓ$t°æ$[@[ˆ¬w‘_Ï$?°Þ<‡WVÚ(Âéö)7ˆA4Áá~Ìax™Ç*¥YrÄw4d§©èßÑ’'*Yü>$A¼CN3{š² Pj±Ÿ–hîJ[´)kÑ
¿wD¦AÚ;¹©=†Élìß¼³½£Ã%O¹;ŸwBÇY}tVè#ÇW*Ý™&®ÀÐ@Õ²- &êè‚Å¬°´n¾çá- 	BÇ¼CrïÎüqI
Brÿiþ+@,ã(ŠN˜Ôliã"ÃaËSÒ²´ª¢q	ƒ„À4Â5_Šæ›UÑi!GY³!^9£/«V_?:Ì‰ç^Ì'm%Íý½ÁÏˆÝ¤ýõx˜:u!²­:zwlþ)7Aˆ;w’^w#Ã6Ö•»6ø3:»<è~˜- 2f&¬‰o¢±l˜Å²¼DéªµæZ)˜SÐ;Áªf3ŽUóåÊ¹ ×r€œŽÒ°[¸µ–‘vˆ´DÚÅ@ÄáÆoEMí“v5™wì•º>_	6Ú.täº­VïÐmýŒA Üds=®ùÿœGÿÄ7eÞkUT9-=¡›]‚©Ð¯Êî@‰B%„‘ø
.ÈD¿Ju‘ÔÕ`D¸”¹“êÂcØSïH¶»¬ÞS—X[ø,/ÜíôòÏ”òìQ¡WùÁy7}¡ÖžÀL×pÇÉe‘Ì¨Ã˜sÈžG'®Ê¦ª^IºÔ%œ`ÂVÀ*ØÇRÏb‚Š! þù?ßJC´»ö0³N"Ä6iøÉEô.. ët^ªƒ!Ïµ®æ·.–s»af®†ÄNfóUÑxÕl‰élÃâ½óíl(/†á'o Q Ä¶K£ÚDú½×øOì¹ûƒIR£Íû¯EBh…þsV{æ_ÖÐŸÕ6„óÝú°Öº³Éþ°"­Fƒð×sV¿ôR±Ì¡ÀI¯5·dëÍ†l^Ž2kp“ëš¿˜GÞä¼¶¡ôDúzE€âÒ­B/Û·­gwj×8@Úé(•×•Q®“aêƒÖµRÁR@¼Ý\jžÒö3ÒöËw)”€hé"¼$,äðÅú¨¥µ;sŒo“,
¹†jWµÉPÎ—tZz‰:XÞ4yz\†=lê£tå&ZÄ4aœú‹õ™c–Êz"dª´‰¦b6Ü¹tRù²,É×	è«ÌÅ9¡èÙöD¢–Þs§~JZ8#äÉE{˜¿õÞÕ1k\¿ÒÐ° Ê{½ýî‡·'ÿ<éþs¯{Òå·œÌEôšee=…Ø~ºyŠÙI’–<sÊAkf-Ž°yµqVçNb ÑlY"%kþSÐßÊ> êTr3ä¦Ó¼&Áü éûY¾”[¡y|cH×3È;.´äoÃDîµéÝ–o6mµ.4ø
gBZq¬š4ÂUJŠÅ¬
/ã¡X—[´2ÒÁ‰&ˆU\ÃGùª¥°U»ËÎ|ëi}³”´b¶w¶q¸»/šEW‰IFƒÂ3Ï[*]ÛOYÍ3#šµ€nÛ\d%:©ª­¢e6¢žQÞX“;màŠ°>ðdD¸Ö†€>8žCL•Ñ™øþ“|Æ¾LÚ`Ïäé_ùáœÜâ¯ã??`-[å”í<9Vóy<Ã
"(ßÞéïÞøÉ‡) Œáîò2$eÌã­òÇA<ga»r}A’Àm{ƒˆf	¤ÆŒ£ÅðIIÔLÅAg‘ëmA{ô´KoÌq2u¥6ExÞÀŸF^9ˆc=ùPú‚8Žb|Åk±.ºSßyÑ EpCïjDˆ?/Üst?Egw4ƒÇX"5ï©Ëqg Z2üá8@• ]=å®;ò@äU˜DpÅ7ò	æ;•YU>ùãE .×.ÇTz;0Ôò¬—á¥mgý*÷ØîÚ ¡u¥i2€@ß4áÏ‚»G—p¶)‹„«ø–%nÑ$~ljnÐpŠþ¢Í0ïlMõD€–S§Ÿô&ËmlÆ´äÎljM7tU¨õ°ëò1xz»£`ð§2³Ñ,é‚hxZZA–ÆóWóf^¬Ìä‚²–îã2Òl}!ñ $æ>UøÌ°ø:Ó2iÁ¨X†¹³Jš`DÄ‹—Ø%y2¢ö•ÔYýØƒSÔñz@;“SDaË?ßò6ÈÝ&Ô½û˜ Š˜ V“"ÍÞUêá¿YÅ+Èþ0%PÔQÿ¨à=³¼%½U' YšaM~½Beu-a}ÉJŠ­8#¸€®;m‰µÁ3§Óìžeã)Í§~f«Á·h[,:×\êHyŸ,©Aù´
”;<öÜÈï“N>—qêÞ°6—®lCmÓ¤°eM­ipu¢¶¡Å²uyÑj€Þá©Ó¿¢¥‹£4'—IÏÊ"/y¾&êeo[ŸŽAä@êŠèÄ‚º>}Tš!M1H]"ƒôÕ,hðô%–ê™wÐ—½bî}»ÜKV$ãmð»°1KãGÍË.Å’‹·•*tG®×ÝTêB¥|Õ:ê²ÿÀ¤1é¡?]øcÑ†Ý«ºñfOËÆ€€=DOxÆ5‚ äÓÞM#*‘â)¨ƒ1DsÐÐÈ“E‚‡þ<˜_ÁÚ€ð~Aò_¸“(ùÇqK·‰0Iý8s…Ï\’Piœ³4»| ý]ìM×\Ì4pOæüF¹U«U¥Õ@{k£.wS?$çD˜°–vYe•.Âåq@ø¦jqGøa<ä¯MþKÔÓY0ø¨Õ$¶,
c
|QØãªHtô±ºÓŠ‰æ&5)„ië„°¸1™âãÄv;²[W‚DR`9Ñ¸¨Ö7ð7­-Úsão¥1³e+ðXu°‹búj‹ýo§zb[Ž¤U©°ËUR~É’Ü’ÚÚY;X’Y•è((ÒûRxæ[5IN¯Â·p¡².÷ÏU¡óó'äÌ?¬üåE+r	ÀÃ„òäpIÄ‹ùÍ¡93
Ä&EBüéÕ(Tí}
ƒ«Ÿ½Ÿ’L€Å9ì¦˜ï-[Ð|½Ò i_À¥R› Øøu-fpÔ˜‹§C.á9_1EÃÉ¼Ó0¹/Mª—P#_JQÍ¥ª6v5~¸è÷3qV8­	=Ï=àhÓÄCQëÏcÕŒ@µÛúñŸñàY£±N2Ëó´	-®>Ec…Üy1Â2ñÐömkS³¯ §ð?o0%m­áÍ®kÞì¦Ö¢¶×	µ–H‚IhZLlñ®u>>‹­Iz O¡|ÞÌÿ"•µéxÞí˜f&;Y¾µm‹L'æCÕªbË_Fm²eb7w+-i@ &'±?M.P-”óU·ˆEB¯¥GJ¥Â®…É^ÍfYM°ŽêïãhQjÓV™¿¶Ô<æ>ì°×ä¯3†«³ÛN/	A2êüÒLYhæmW«Ø„˜#þâ3›+~}
[~ÿÝ'Àšm†	ý+Ap—aÄZO"zåDò[Ì˜ ©P)&)ædyÔO93RÓçéMå¸þ   ÿÿì}ÙvW’à»¿"ÅqÀ6 àbŠÉ¡%ÊV—¶éÒxxt¬$$r"áL@ÍsúÌ7ÌË|ÆüRÉDÄÝ·ÌH¹d›YÝ‘y×¸qc»q#¦Ÿ¹/;œÌ_ÿ*Ú3>³¯¬{‰ŠavÅ¬Sˆkƒìj¬á¾½ÏÆd(ÒrÆ=ŠŠëbš\>fWRèˆ‡c0¬Î-î²Ð÷æÊG'çó÷Ãìc’ï:DÕzÍIëž¢¿Ml´`ã–«-âk6‰ûéôh~¹ÞZ§0‘rªÆÍû“º»
q(èîj˜N«ó‡Ð<½ €÷#tOìEñ½ÎV5çÛñp¾Þœï2·¯Ú§½ÞúäÓ;‹Ã¹>˜¦èE<i¯w¶œZP¯À”J$,ë¨a{:È\#‹ÛÜZg«[¸ËdÎ.7ûó0¿¼y´†ƒuç ±›Ç§aéÇÿjì„Ð|™GæiZcRl´cãÈMMS“±‘$éÃºñ)0­U·ðÜá}·œæV@,»œð/$ì€5ÙlúmƒÑ{<îJ®"üÙôa· &ø‹g­±½Ðý =bšO Ý¬âõÿFãö ÔD¡ø„ õ{‘–ÞGK!o·ª€'pë™H±té™Ä(Xó`ï*g!:¿Í,,vöJWZh¢kÿfÁ}6žÌ@ú·5³½ùéz+ê¶ðJÛF+Ú|çxˆï€½2îwÞFÆìR¬¿²„ÊVVüMÈà‹ü8Þ_
ö|Z`Š@Ô¨ðˆšÜB¿^fÓWçç‰Ô¸@ŽR‰]é?Å|»ðƒ®è=ö“Ñè$Rp³÷oß‚ˆôM÷66ÎöønÄþ¾áóë9|£<X€\¨@Ô|™‘M¦H¦« Ù}zD?Ž ‘ øþêªƒ éÉÿ&íîB‚ÈŽy	$ºBqˆK&;´5PÔÀrÃ ÎFqÿJä<šÐµÖ³ÅCÐÖ6¹„xÑ&Éo×Ž§® Ègš"bû%}< axÅûª¾ÈPh<J”öýå‰HJâûhjÄ,º{óòàÎªÒO”£h K† J&ùžÂŒú²{Á_gŠø¶7—¨ç/•™…zoÞLH]r¼c›J[h©ó¶V”¶"t“ƒêÛaFi:‚]±?:Î3üP˜î¢XÝ€Ë‘ ‰× #sé«–þí<ëÏ
¬éx^dD‡kH š^ƒq¿¶)žxø2•I²Ü¿î*Åh#Y“œb—ÙU2hx+ÞÀhš6•ªC•0¨kÃí¥®ÜŽ»Ì3 5áð~ÙH›„ÄSW›¿¯´æñ†´¬EU¨+¼•Æ©Õö¦%Ë…°£„ E¨,û{’¥8Ìvò­‚„¿”ûsîË.¢¢ßè`»‡Š ½tºë6x¾]ÿMaóÐ›îg€=—Ã†å;7Ê»#ãÕ‘î|r]­Èî¶ùË’êÜ6Â’]•L÷[Js9îõÉg“ã¼Æ;!»M¦TÙÍ/µ…åµjI­ŽŒ¦Kg¥9üÚb²Y•T¶¨<¦;/Õ‘ÉþxÒXXI`Ê^_ŒÔeÈ[¦¤¥nàÝKW‚WŠD÷Ò••{é*›
éJ%ù†¥	WµeªÉA¾L¨TD)þ¸"JéÉZI÷Œ.`¢*3OÕ1MÕ3KéBOIf™QjQƒÔ¢bRMCÓO¬)70…K–¾ñÆcP¨å=•	œÉ<¬yvËŽd¸·M›ÅcÒù
Kiª.ëm¬ÿ"…óòª÷gÞl6uß’]ÅÝw£5$á«Ñ¿Eë«:Kö˜Õ|Ç@VAçhañô¦ Ð·+t}ö,§07¢v±Çw?˜Pê;·bÉ‰Ño{Zd¦üòy7#ûG¾+„¹$È<‘—Ä³MÌ=eTõžý™œ'1Øgdlêb·Á×îù˜õ|n>¶Ì¦üóðµÍZ|Ó•ÏÀ Œ‚MÅ–œC¤?½Ö.r	ÞÜÃÆ›°E£F»†sÑ´køA¥wç€èõ¤þ¾S%KµsWp²©3››Ò¦gu hús`ZqD¬¡ «‹/ìÅxcžŒ˜EŠ¼”×˜[øò¢¸°‚„iHUózLËô~ýÖçÎî¼®ÿükZ2«KUtY¿SÞ#Æ?ýþ¦”ÆbÛúËwäJ™ëºá]×íz µP‡ÏÉý˜@‡® °‡µšlÇð2Á‘DH.ñð"ñÒvç_J0ªÚÅ®PZæw™’½sä¹#UH^÷‡YLv§GWLLQT	˜ª\HcC‰h,<öfTÊÓAâõCóû”F²	egeZY‘ÌÀH?«¿€·Ûà¬f Ý9EïœçÙes±»r»Ñ&ÚoþÒŠR‚*.sþ&3øÃ•î{ýjÍ±’ñJßˆõÅ¿÷é¿£Zõ¯ˆ¥´}ŽJŽ¿,´‚7­¢õàV%úš"‰y…Ð1Í<"^ë÷Êõü¶hì *ª]gµ‚ÓgãŽ)âa(tp4Xº¹Ýh½±ÄƒìO‘{~]NX™ó~éi×è…ÊF?U"2ú)ƒQ.Zý»¼ÇÆNW)qRöM¹ò;r«â.îÖ•É—Ûò<µÞžXI=c ãß«¹ÿZÑ0>‡Ê··'l9øÚÈ}g|Ñ²ÑïµüpÆ{™¸Þ~¥ï¢øÂ°Â1²Í°'òQKÕŽÅáª4åø¿ùF¢hFÉ(©O©´ð·[«Ú,K‹nCQ5q»¨˜ºxo%pá	9÷ÐMŽQ¼²@Ü¼¼¥5ŽRhœš©?^< e½Ø6ë'ÍfÜï·"BþŒ¾]·˜M™µhÜ!˜+ÐVÃYŽ°¢7oM¤Õ1VGW…«QuŠ-×J.K×Î .kÒ‹**‘Š‘ŒýO¡PÍ<
¦åS‹Q¶¶‹~ŽÁ¸&mÐð»“v·W’	Å÷Ç4"À?7ñIñ1 ¬í¨Œ	P“5ÃdávqiˆRêEÙúÄ³ö0 $Ð*Ôµ.ö[£‹ÏŠl4ƒAL³	¨üÊdŽ#øwØî‚
s&eÈm+Ÿ‚Û	ÆC.KÉS T;F®‰ErAl[ðâMv™™C(§—É3è§Ÿ¬DÅô}°æüHOf9VÙØ(Ñ}è‹ˆ£¥˜°qœÜŽõN¦Ž uË’òg˜3©#¥¢ì\hUíãžkOú°1æ¬g²=Ì{ÃRYŠ`½Iú ‡ˆ!¹1ÀáFUŠKû›è
t_·ÕíÛQ¦}øzÍ¢AFq)‡1`_<Æ€S˜I>Æ} ^˜4‡G0‹FY< ´£ÓaZ°±äYvñ›‘Ó |2}OÒ¢¨#æd1*‰hÉYQ\RLÐ!D¿ÑuÄö€Õîk˜"€)Él4ei4&"GQ„‰ Yú¢x [=-`M¦ø$ã³fï© È€eÓŽÿIÙ>IÇ¤¸¹ˆ×t{ZTúøE×LÛb­–cU¦¼,Ôªº¦f¤eÛ©üŠmÃ.½§¡ºÂm‰ÔWé@è—ß%üe
	«£Ñú	:o‰×¶ùÙÎïR™Å`õÙ€åHb19-»Á’›èËk±;ÔÙFÔÙ´ò §¢¿1—¬ ®"¬$ÃÀS–a9!7Kyˆ‰7Ÿƒ¯ˆzÛ¸é²â8ëë°âoÐkg#ÌMFÕÌ¤Â†ÿÐvÑ/zt‚jü3 ‚î¯ß8{Àsç²qê]Ówi€ï¢¾'?Q(=‘iHbhgr˜•}R-;{ï»zë[#Ø2˜œA0¨i¹mˆÑ€Åx¨Å×6à!"}XS!é™[¯
…î ZùÆäË/ Ïa›‚ÿž™ZÜôbªºÏå?øòZê­ö‰jþè!'¼FæHÚ3ýg­ÜÚ¢åOóslg¡«qFHVåÌ`YÐ0"Â	K_íK¬ªS,Ãíq¼I'Ý{nª/ b6º8Goù²Srú4Éõ\†õ0l®–ù”·mÚäÆLq­òT'Ï
oØŒ@ˆ€¡4’ÂkÁ»egñÖ\˜Ö¼tÌ.³åýZ½îŸËžcl:èðo¬=ã±¯€c¼*/¢Ûh†á51+€-%÷¤ÅcØ%•VIøK™yð1x¯!KÿJ“èâúv2n³7=|ÓÔ›|³‘Ó›ÆætØ¸¡©D²#$^M@™ˆãÌjÙ%`šE¹éÔ¾Ÿ)ž¯I5lQ…o‡ÉÇ´)<£a\³Û3]€¥’ÉôÊ.)›Ýµ^Ä¶!áó5½ðØ•n–Mw³ðá¿§ê!Ð‘K]Édò	$“Å´zÓú…²ÚP4ºj¶€Ú·Ibüd¾òÞ{S1œeŸVü…è3áµ½y;iñ?“<ûX8±~K6f™lÌ[Zé-ýíE>ŸR¸w”»êè†ÏÎÊ;¦?þ)Ur–qž¶ø9ŸÏGb“Îùä¹¢ý—¹Llôy¾Žèæ‹YŠk£ñ8u2­EûŠ1æ‡‚ë×Æ<‰ƒˆ¯ Ÿy£<Z£UC ó¸ËÒ‹…Õ›^¥zs6›NXc‚}2Jû`›Ð.)’éñ0»:D!,^¿ÈñˆE_ßáCoƒŽo<„NÛ=qË´•ñ…âÜ0Õ(Ÿ×¡+ÉÔ¦[Ælœ…:¤SÁ<6=´›åVµV’øP'£³)½I0sp-ÈÃÜ8ìºz(#	rñRz1õ+\µû ¯2t.hL¬|<É“xÀÒe—Á\7¹1øÜÁ$”¢ù$;úÔÝêÏ„ã( ¡Ù°æ,u ÌË#:ž„§ùõ0Ð:H¾©¡¸¦ÉH€ów_(‚Ÿ@çePFc1ÇÕø\Ã ÈÍnÆº×’s4„¦:PüËÍkh0-¿‚¾ô˜
œf†W{X×.&Ì€|Ñ*ìt†kç¢ü_Ó¼é<Ùjl»™º5
êØ›¹ìâ³FMAå¸ØgJ’fÂˆ$ä; ,°B<Ë<ä	 °3„i‘‚>›ÞãÆ+:v÷Ã#UÌ³ñIvq1JDï* »÷ƒ´ø9‰ó£ñ@!†Çœïig¶î¦&~¨ÐŒ±GÐë‘g~×"¯Cìj^-v~-ìF”<Õ«ÿù¨²A2…l¬ç·>ŽØõšC–#°>KÇ£Ÿ€ÄÊS;ÔC=ñOc1kgµ}Í€HA0‰‚›½ÆFtmîvsxmkCßÝœB„Ì‹‚¡•¥¡š}wch§rFv­Vœ	’Ä~÷?`?1V¯SŸ9šê'ßº¶`Þ¬Ðëº^¢sw°Ñ£c<ŠTÄß&72b#Œ+zZ€Q o_þ†¹jˆÉqÈˆß:dž`Væ9pt™ÁŸlv¢CÐ`\‚úNGÑœHÍÆcP€:_¸[—ü” IPy	™b…"AnÂz‡`èÞ,33ù 9t*ú|¨‘
xh.c,BP|w•ªq†÷õ…!“tùï;éN×]ý7×k]€rLÀ¹S‹p€.°byÏ¿?ÄÑo1IÇbwX»ÉÙQD%œ´cQPpÅJô4‘kä…Ô1×†Õá–^Óeµ—=h†â™ù´mÍŽým‘¿‚à¨¸WB'3c§ñxmNŸ‡ã£à7Šù,_ÿ¢ÍéÙž~˜Üz/±‡íÉEôzk§{ÀéžÓxŒ`>yÙ§½À#°À»ïBrŒå\*ÉÜèáO^Äé8¢“q´ÃPÔâ\‹}r@Ð=‡æº'¼}“ÃUxv*Ý^zšn#ÈêÜUÖÅ¡ ŠáùåY¿/•¶Vö1w/æ‰L³YA›Óý¢§Ôu2•[ög‘1("%gYöËLË…È^1KÜÔ€kÆ(lÄíŠ)§¿F'Ù$ít¯ 37EÏ“‹´ =´#´’¿]•ÛJÝ¨yXÜ§Ä’‘ïJIý`þj’ŒK4TID|ú©÷ÀÇç(0dü^S¹oI)@Q~í±‹›N€,
½ZÒI%È–—¶{G$mƒuÜ® ©Ý|b4Ñ/ÇÓû²Z„J·†ê©+~Å“J0ÎÍ]OmÒ ÜË‚•íðæƒÂy·zã¶åsó })œ õ…Î†¼ÖüçîñÌüG¼@…Gåt#ŒÓQá›LÙÕgE¾^iÕ!ªh¸ÈÓý§^À„/»êç¡#°Q,*îÉYŽŸåÁY3^˜Vm=D£¾˜ÓÑ59°|>lžãÈ+fäöæ³Ñ,qüR=¤3¯AÓqãººbÑnþ²ê#Ž›ÕîV0Ø>z'ôjd²ó{¨ÕÎªÀž;É­ 7U3Ã‚¿	R”&üN™2±F ]þT¸Ù˜YØ¸m›¶/9c;~oÕ²{¼¬çØ;Ÿ1ê:yùQSU%Ë±±i©ÎÛ·üwWÚ–Ka‚auÞ±ÐÁ¡ë­Qø€Û˜Óþœ‡-‡áUD¯©ÈhØ»ùññ*©>;°ß¿Ñ¡‰ôö÷Ajô”35¨eÛ¥8“é‚â,õÛmnàÿjÊã­ýÅQž×'ËP„õ=ÕùÂ¨ŽÿæM€æj÷›\j3¿j³‘Y(®Û˜EbìÖ¾ãŒûÅ˜ã¥Œ
üû¦2x“¤*Ž$+*.`1)[_<î¡†×[TÃ.ðÒxÄ
„C”øû¯Ôä£k^W«t-„—¢‚˜° _)}¥µe³¡…/ü-j9ý4R~Q¥öSqKÈ6“NÉŒoð&võØÏF£x‚×µP…Ãä¡§ºð·/A-t?Lb_ª^vûüŸÀo«­ÍËe´çÚÆÿ‘kçÇÏB£ðÚéùˆskA«Bdyýªk^ˆ­Ít’¥KFùOhU^0¶]ËªBÑØ°3q•…Æl@â«cØº{óÞÍþó$Îñ	‡ÿhm:ôÊQæ…m°·ÌK‡^,¶ ]š¡±p+ ƒŒØlv—€nc›BÒò‡ÊmUèß=`¶€Q‚Š¯äžH¾”ob1Áÿ³Ã¨v À1!}¤Ó$ÏXpFvî]–›·šeI¸Ððñ]—MÓ
ÇèD€4§G+^273€˜š¯Í£BÔ²~„V~Ìs¼—e"~‹.+í!1_71/¸”«¦¡ÛŸJXoèNŒïUZ" ©ÈÊ;ô¨‡**]áËM”¢'ª9ÈÞël)ªÊegå¯+¹îº@ôxvÒJ§ªåšj8"¶7à@À€SÚ	°ifÒ/H…â•^ÀOUbñèÞ“v sÇ‰<Þ¼l>òê?­tiÁ`àÌ¢`×2›Znàí±’‹G¿¿B	òÊA$Q™çÔŽäKÓ¸Æü"¢'IÑÏSº]b—À§"EXýA\ëß5ï+¢k¾ÎF©j€% Ð­:¯v#Ñák“u*ø¾eÑ³PÿÍÛ`e(È¾ˆù¿UšyX<^;){JLAa©h!3‘%\Ô…B·Ñî(®¸0ž`¼øš‚Ñ—6ö×Ç‹|)É¬w'#÷d^ÙœC@z}ò[ÉC‹$áu»³ãÁÚrÑdZ.ÕÏVTS2²uÓ{éôõ“{é(øÔŽÌL½¿¹„$²UßKH÷{î%¤{	é‹òÐq}yh91(ì&°¨´´ûBm¨ø­E Ë
}/ EÇ÷Pø©! é9}sñçø^ü¹¬Ç¦DTvb²PJ#}Ñµd‹V´ö)Ò.ÌŒÌ®DÞúsˆcö!˜C<—P`‡e¢¾²/OFKÀWµÎÌÓd
ì¼ÕD¤l•×1bïfù:/!±aæ7‰ãÎo$·éË£Ã|¹ùKÌ"‚´p×Õ'ÂÞ=„—ÛFÄ“‡[.:Ý¥4­ITýGÅ(aÿøì‡@Ì~ýêøøÙ÷Ï¢ãÇ¯ÞEo^½õJÛy@-rJüm@ö2³).èÚ´áº6Õ‡úÒÂ¢ŸÖØ±ÑƒÁÐWöL/†(p¿Î
’Š‰2š2ð½çì ”/lH8µÂZÈSêIqÊˆiÕQLÂÎ­Rt	ºN–qñ|nI›KÙµÜ˜ú¨§xé¿®gÂÊJ‰\½ØÑ®l|AéÝÜÛa`WÈ×Æ½oézõe%Aÿ,‚oµHZ%„á	ñçT´hòíÍKþ|¦‹òêrxe€‚Ì«ö®Îé»U•qm7S,ùVt¶‹ÙXòµè›H$8[e7(m8ôt?¨m ÞVFÀøã¿mOá3ÍÏÁ‚&Ó{ôYYPå©®ŸÕ9¾-+²ÎÑîÙÑ=;úÃ°£’ýsÏ’îˆ%W³¤8Qñ¯çDõÏSê$¾gmVSÔ;¤X„Ãý—«8¶óó¸ê³¾R·øQÉ²®>»çrŸË•žAÌÀªª[Çì	œ…Ö=Ô`–lÝÒ-N„W^ÄŸ"vÓˆ™¤*NK¡øn´±ÞY¿Åyi¹ËŒý·î€j›'u4nM³ÿàúˆç"¾Ÿ:ûoì/£s`+€Ä<óà½^ñ»¡¸Az{Û¸ø|!ô•¨ëfu-§­^ø˜á¡~Usá[j_ßˆ¨Uø§TÔ>COÖ¥âÏÙ“Íðý=ùañ¸6‰Â¦gÙàºæ=^Ø¯é i_‹?¬íg¼e—qÝ“``0+Š~Ñl¼ˆG¨uÓÙ #MáOÐA0gÃC4ÌºO“K³6{õ1E§·¾(ù
@‘‹„¯œ
mÿ4Žy>x­}ªÍÓñºÛ> AiGq¡È'FÈ”’ èøSý­Â¡ó€è¯EÈåèH:f‹5¢hü¥ôu§nÐ×³v×tŠ™Ÿ“™G”î¢\·xZìF—¾rM>óø†¨Bö³ñnôèEœZ¤ëµýè¦hZ[VÑ¸XXÑ<á‡lûÉxV·qŒA¼ßh¿SÍ3AEuðS‘8£×Úgö›&¥Å^u­8*,•èÐPnjn¸ÅnbOÚ[ZÄžeÀcà¹MD†ž#ÛÙì¶úò½-ÁÌß§ýšƒ@~cù|YA’y³Ïßá’C1Õ¸”9éçåÊ¾¹TÇ˜#ÝA
_h»ZÙ×E´;7ü2¼D/‹ñä¡7Ì9XEGã<Šeÿ÷6ˆáðÐÓE»àð¤=ªÍØO7ÞŽ"á¿D‡ƒñ¸Ášš×qJ«Ë©"Z¼¨Xôú»‚Õ÷É¸?õÀµ³ÞÞy¸$´ô\(ª+ñvÓ×™Öóï
d³ñ97ìÛ­ö·ËŒ"˜›Ð¢W.¨ú²Çß ž$“QFQÓšÛ ¨Í%%“±ù|p-PdŸ¿+PÁ6¹ @­··—…åº7ÁD¯\(%¼»…`T	´¥ÒÔ€YÌ¾¤ ^¾5ÀMõ0AªïÖP=^
âkgš=M?%ƒfouà×
8iDœäº…(`e¡í„g
£ü"%VÑ“5²$o¯ó¤ 2­)Dó¾/Ã˜ms¶N9JÇE2¥ Ž[ë%é-…Ï¿Û2zt™áh;Ø¸ ”EüÚ›ÏÅ%]Ðe<wQ¬ëK>¥Óª¦ôŒxgE6šF &¨+k›ð;îäÙé{Ž"«ÕVÝÌ­lØRd×n"Ð¬ú ¬Á_‡[­ÁQl²j—êyª¹`¬×]=eKvŠê°‘²ôr‰Ð¦€mÐ‡ª2 ÖÔÑJ_tÿzcÚšô»=ŒóÝ3"{WïÒô<Ùï¼[²#Ò‡™))Eög[¶U%g·üoƒ§½“i]}ìYÝ{°’<ÛN~ç&mB”FŸ–'ËÃ†))1ãIžÆãë«k	òP\»Œ'U—à‹è¬°„>^V=×†•Ìï€ÖBå(–¯ÝÙ¹É½ì"Š+BóÆÙl/1«=ˆÞæ”/3*fü«x<¦™ÌƒÑ}®¯­£Õüæ@ä<DQê*…MÅ3yS¤ÌAZLFñu4Wc¹ôŠÎ{ÏhvKF3/2ç ÊÃóëØ}X>BFã|F‰`šÓÛðöXCa—®{eq/k„÷ÜX_÷jFjP™OÓ¢ÑÖûoÍÓG–!Ì=ZõÉwÑ—nä‘ÀüÙÕ³?Ò æ(É`Ì,[–ö¶éG?™ðµ`”m2.‰_òãªò}HSë?-,Ç3ï½Ôrä›¿×±ð…Ihäfóç­â¢•©“ïÙŸÕ9ŠnjÔ•·N}Ùg}§ÛÞk^õ™ŠÅL&Þ^ÍD	¡%')’Ø<Zs´MO1ïä-‘Ìò¯ä©i+.F¦=öÑPMîH11%üm[Â-TdÉNÇÑ9ðüwÀ³9:9;ÈàFø_X¤eò´ ‰ÌÃöéÃõÃw–À‹øx>‚^†é` z¹6«fÙ%üÛ~¸ž˜ÇDÐÞZô˜¢dAüI^ëÔ±î_¡ò0Äÿ"´GdÞpk
U"•¹†¼&üu(p²ž[´·îÍ-Zbþò¶hŠ½ËÑœüµ²/÷±™ÙÔ'žRÏ^ÛN{Ž”DÿõŸÿ‡	ls•æüv˜y NÛóxTTä±½jï òí,„H–¨îdTýÖ”£Â~\œ[.šaõÑÿg¯;,M¡ZA9¶9ºnÇ3ÅÅ9Ý6Œ²˜=*úx,vçŒ„¹¡¼W°ÃPX?«Õ#¯Õðx’ôa=PË`î[¤{ø¯nSd¤Uaò(‰ûÃ(æÒ‰Ž“)0ÄcâsôFRP³Õ…š]Ž;üuÆåO„F÷Àô>7¸šfó2RMiÒüÄË<³p¶ER°y\öje™Ý/s ³z¼}»J´§$±‡þ¬lõ/d²¶;Ìûø¯ˆšpl«~rµK$¶þ´±¶ŸM«Ùö ‹EX+Ýò+¥;^¥´äNµ‚P¡}—»ò×2¡Î>‰ÎF™>„E¿¯ÌÍVÅ(4Ëmc–;å³üGI»ã úó÷,ÎY3é\t¢¿ÏÒòP~«µÃœ­èîé@®'Ì2Tæq^å6ix¯/ï’^¶òË>-AáM…Ë*m`sÓ®ìc8Åß6žàb—õ~Ó¥’sòûeòwÚòWì¹dW¶©ú­±¦:–êî<Í}Á›ð7ÎL‘*œtd÷‚rÝé¥²²'ÏÛë“€¼¬ò½ýååß4«ÂÊÍÞ¤ç÷rs]¹™çE¸—›ÿpéLÙYËr/;?ßËÎ
ÙùŽ‚0ás/?‡çû;’ŸÍ|÷Ò³#=‡ºEdçÃ¢HŠâ¯:úf•ü÷_!0ái7îPF.îeäÛÈÈÇ÷2ò— #ßySBVÔê^N¾—“½ÏŸMN¾£@n÷Rò—"%ûÄ,k/bÁ­E‚Ï(°|-aº³@.—…e ÿ´L÷ `r$Ü&8•ý¿Ïâæ2ºÖ¸Þ]Oé¶¼àùÀ}x¹ßmx¹?>’3ókÀ‹ÝÊ5ß9žŒ·¼%Œ®c#ó«t~Gž¨“OqˆßûÑ\œµ{úH«Šçf„Çß”»µ2.êyú0ÈY¡wÓàã§âëtkA½I`wàŸI–O£æ“dr4ˆŽŸöÖŽŸnF£øpzÕ½SMuYUV“JÈ^ÓâÕ$ïÑ§¨Z\Ð¬H¬u*8‹*ÂbíÉ°ZÚ7Ór´g›’TIå;½§ûQ»-1ŸÖ{¡JÂê¢ê†ÑšöæÚ­D<êÏpÐÕF(düVå8ý•[|á[_®&Èm°–ç³13>>‰‹áYçƒ¤ÉUsŽüK@ãQñTìo6x4/¾ÃÚxñçÅ(;‹GÜe—jdã—ñÇôË~=cçŠ½U7n´×¼3V×YÖ¸ŸBSh …	ü–‡³é0Ë‘—=†©¤l(P… ÎWŽ•äÀ?|LQ×1þ;tÁŒ5q4ž¦yrÜfÙHòPü4EÇå$»
ðYÇw3Xax‡W¾hfô@,Î%0¤¢ÇÍ øDúñøÙ“¯nv#cqv£cö«-Ö	^³¿øk¾d»ÂÚì¬Ügt×O½W«ïšÓølF‘CÚz³tà_],mq–Ú)ÃG¬ý‡„\œF<XeÎ ìI<öà6 ¯
zggcÝœÂ#‚üÚÕîZP"™w­Èn®%/ËQXƒõâ©9fcd¬Nm˜XËÞ‡—¦Á°SŸÆ%ðÁ¡ú9ˆ¯UˆÐ	]z›úç#6±Î_Ý°‹¢Ìê}ŠüK±5Îøïw°ÇfEBèÂÂwªbž t‡E©ÞùS¯öhN±÷@*‹Å¬ßu¦ˆÙHò<Ë05x_$jr|úr›r4Žnøûê
(ÈyŒa³Pú§<•?4à¯œõ=þ˜æÙ7@c¿iüÔ›e¶
ƒÄ—Zn¿5:a³Žô2ÏâÑó|üõjï…ñÊ€x‡#+ëÃyŒoò8Å³ªð"¹Ìšl‰›ì¸DeWûû+´4´t½÷q9‰¨¤‹x6H3lƒ…`„Ýrç.ˆe3zC}=*¿"Yßnõtåßgãd¥Á¿£kü÷pv"+þuœL€bÂãWýiÆÿ|	2¡xýPüýïÕœyšœåâïqÞRË“<±7×+ïìAž§£)ê„«1‡Êæ×±XL	46óˆ;J:ßª8:}÷Ö§ÜV	¼,h6Æ*™ƒ„ÁY=²/Í>Ž´¯5Jcàé}±Vy‡¢ÙNR`3nEg4eµp\äO¯Î›q‡^â-pAøÛ¾rgN9êòÀnŽ¼y@ÑÒš4V©Ïk½ˆ'â(OP8ý\2ó_°.žÄ×…¢¦×Ð¡úÅØG€
g mÃ 1&ªFdkç%èÝé@ïÈ?Ûj?b~mã¹˜Íüæ;¾¡LLìœgù°¶¸â`”Í“näïEÍ>»›˜Øè6V;Óì˜FÜ”vGm'Bù¾½:f1€zÿõœJÝüòõœ"S¼7K]zE“8/’gã)ŒáZa–(¤AÌ,«àÃ6kj`5kê°æ†SÕ€3M×|CÁ·Í*øþÙø‡Ï8¹Š°ýæ5!cóÅ«—'?þòìå“gŽO	*"‡Æ7èç¹¾Ú¹H¦Tƒa«j8Ž¤;}G’¬ÞåkŽ¼î~ÿ<ÚÓGo¾ùFô ÆL ±ë+ÈšZÎøÕùÛ$ùíQKl×MOÁ)0§œa„ é:“x ìhI¯5Ö«7í¯çƒÒïí^ÓÇ€†'‡JV4€¼ùjÛ­Íj¿þñÙóg¯_?{yôË¯ž?{røó1©þ$¢É'§MšÈ³êý¯ÈÖÌhÆÒv&³bØÔÁ,tÊ!†qÁøÿc´m€CÔ7Ã˜O§ØÔßntq4ö[OdçˆK
Ä‘î+5Qg0úePÏœ+ç6$Hƒhßœ Œ‘X¨ØM”€àà`2´Bxž&ÅÓ,›Ð¥ƒ¬WOòkì™þà”±€þZÕÈægMIE˜å•¢ãw‘ƒ©/gúm5­s«:¢êª.E¨þ9#j»êí{Ö›Tvî…‰t¸jj´ú\YC³ÄhcùF5kq‰åÐÏ«œEÃç,OâF)ñuÚz’Ä,B.{3‘‹	OßÕ@Ãb”ö“¦šQË˜Ö¯Â?ü   p€[b®ÖVØøZê##¯ò']ûIÈ§‚’kB½ÔvDËžzep+1r6…Srƒi±ÊÞ.†Ü”ÐÃ~ˆ%ô¬=©{JÝËˆÂŠ¨%ó†:HR_?Móbª´ÜUKp9=grÞ9¡8üãÃÅ(m¤SLFé´ÙhƒˆƒžbÜ^`Éý©ÝgÜq>–%êh´ä™GÑ¹!‹£Vó]‰/¦6~µû~5ÙÄ 5ñ5ê¯ˆ=èU‰¨7{D€ò6ÄvGp}=˜.NM6žäÙdúÃ«Ù´Az‹§Ì	Ú×ÏAYçåÔ$U†–²É<®dr:`«;à«;°WWU®XÓåVU#×rÑ€SWÖZÛ½¶þE†2¨\Ý’õ¸ë¬tZ`]¢Ð–Zèp¨‘-Ð¶=;Dåžv:)ùƒçùØ°ÚŠ­(!FÀ:×4«BRa\ÅèPƒfA'…TNÕ’®õ²*
´†©©Ù[Ñûço^F_ÏU»7Ñ8ÃüS³1cŠ¦Ã´Šî{iSÚå†$‰PÐãIz™ ö5åiˆ6²Þ´¢õõuYE‡:×¾2&aJ	|UWÖùš3-œ•Eû)ô€ïÌÂÿ~ü!ô1Êh‹™2Èxr'F”wžáŽ2ñ_ŽñTN†¾6W}ŸhdIC9B¡ùçß’ë“ŒDJ
Ó;à±’“P5)ésW†_ES³	¬ÚlZŽQTEˆëë‹täÖ×öä4Ö$L&6ù§Ò’Ÿ+%CAdÕ¤*`¤0:vXR–— ÐÎ²ZZj‡:7¿ž[Ó¼‰ä+˜ÂÍ*H´÷b&»p©‰èmÄDÂ[ÛˆŸi‚`Ã¥ ^@Ê<«¥¯nË^Ì–†¸ÍR,Ó¯çt¯eÊ‡‚'ãb8«7ÈtÌŽ"ÀqjÂ³tðóÈ"KÚÇj–î7ÉüÓAËÆ]|-â[úpýà‡õ†¹ 6ü „Ã]ÂéÆâŸÒ6þ&9göFø£©¸*Uƒ·Gçç@Ž;¤^µÃAM¨ºBnWo‰½vNØ(@ÆaøÀf0Nå‹SÐl”t›+¼vDÕwÞÃûƒ8Ê€ð›OÉ2üzQ\@7+?í1~mLË»/lwV4™ qj ©D—- Ìø‹ÄÈŒHtÃ¦Èðý%»¿Ñ]>†Î#È ×øÎ®#b,;ÓÇÞ cçóì*ÉÇE¢ŒWFiñ5-
ž€^FÄBU9"õËlzÈ2G¼HHö—´›¬*?‘åÛª€eõ¢l’Šk4ˆÆ²Á4Ví†Òªý…ùª
Ì@¢‡NÃµˆ0"iCCçs
¥Ej¨?r„LèÙ9OŽóP%íâÉcn¦ƒ„8P€)ˆ]ç94ÙŠ&,bsý–¢:Å +z	Nâ³FOYhµlÒÎ)#& ªÞ
â8š£8GøŽ¼ìÃ- ÛlyŠ¨Z{ãóhª(5ÎÚ¬[ñÉ‡$ç²õò—àCo¬ú!ÿR ˆã ˜à\=CLÖ'Ih
™YªáÃ1÷ë#AŠ!e‰q:BzÓ‰^³µD{Xq•NûCÄV%¸$‚&x;Ö¾[Ê²jÃ¦^Lu¨nF$Ä¼U/éÁæD¹²Ýì)cïaO}çz>;ûõ¹ý‹l[B$‘òá7YMy*YÁ|¹mð^Bf£)wî°TiöeÄ¿´T”jE|2¯yºþ®“ÇWÿ ÷]M8±G:ÅÔn\V*t¥\YQõ‚Üñ	ò?‚§}?ãI‘Xz€‹Ëm¼3üŽ“é#fÜßo¢*/š«ºDZ#P–_#9Á…FÄ †Ÿy?yPd{”'ˆ
¥ÁTdMòS
áÿ3>	3æ»]ŸN¹	A¹âŸ¥ËÒ¾]ëðTûú©î“…^®çH¢®ZPÓãÇÃ_éõä¹0¼pO†Õ@"é `šj@s#KÍì¬#'mœ )P1|é¨z1Y9²#m6þ0Î®ÆO.j©XÈÆ!•šŠNÌÌÑÉ"žAFV‡Za”?³R¨âhèòÎìÜþªàW7¥°¬¢U­ vàÇÃ–ÿZ^T;}§PÌmiÿ‰wtÒ	¿]Vn‰d­º*}b%ôOè8U¡]Ç£¹Þ¶n÷±È€a>¶Oþâ¨IZoÕ44;{’LA	„¹¸ïªáÊªÎËû@¼.2<ªŒÇ—˜“V};O·>üNéâ¬ÉG{ÑCMê´é-0
!EÙNoËßÐº¬aµÔí–5…	1½m=Çk&VS½M«)ÿ .b«Tõ”™0-žæIrÈ4Ð=eææÚê§IÊ¢‚?‘^
BäëÉ¼ò¾qÉ—ÍN_~ÕS†\íž¿2½høÊ³
O,ç«±'„ßÖ8áX“âpÊ†i#õ®ÌÙÑ‘¸ÝÎóq5ÚU_åÚøa›höhíƒi§&÷1!ÄÍw$£@6’qû§ãF+š‹óÄÆ(ùšŸ'6ø®†8|”/uÌ‹)w‡ÖÁ¯ÏŠµ’ÌS‡?¨µqJ‡A=g– Éé=pƒ¡‰¬ô0§„Â¯è‘ÕžEDí-ÓR;Eü©w¦ÞÉÅ«	€1yÎ²c¿ÿ¯ÿýÿ¾žCr†ß¼åþJ2¤:Ú¶ò×ÒåšzêÍ*Ò
&|±‰CNÞãƒ·ë8ü•ZSç¾_)Ç‘Þ‰ ný† ´‹-”L¤ÒQ_çÙe6efëÓd0¤'K.)n‘ˆþøg0m|ËÜøË97'çsä7ÃÇxE^‹Îþ6pžôIžgÒ“ÙgÃ±UÔXÈK…^½€Æ®hXT?»œÌ¦É÷/ž5Åø´äð¬vã€ŽWXK+«|p¢ƒ—h7ÝE¬%§”Xå»èDµævt–ÉôYÍßØ8ÇQmm-z©ðŒR¢¾R&h®>{øó1"žÀÑ¨ ´iÖcå,%³¼qUJIWøý${Â³ªí9¨ý¶Q“!;ÅÓ…0ÅÿÙxåšè»Ò½x}Œ&„-Kz¬PÙ®¼Æ‰eïA´øµ{LŽ]ë-øS^UR¢Ç¯=õ½çû¾¡¾oø¾oªï›Úw¹Õ,U^ù>Zª»Øb×‰M¨»ñÇJ¤9A=kÌþÆ^|®ü¦_ûrúN¼ÎGÊ¤B'¸¸½Itç3Q“ã=y¦M•ŽðZr,îÇi_aT‡ýéŒ7k	|Lû•TMh¿Â!AiÀ>_˜¥0$›%öÃ}®1iÁ—È¯€õ±ÆÛ‘MH•ßÊ!‹S2ÖèAGè@ qk>-±QH²®ßW½$lwÙ1·vÛQ{ò–ZR¼1jöêÔìùjnÔ©¹á«¹Y§æ¦ò¥øAÎèÙ¨áúZèh¨ <ív8¶¯â (ô(n]–Õì;­Ío¾ùŽo{£ ßþøõÆnºçkºhºwlà”ÃÛô†¯é@ÓÇvNt¼MoúšÞ4½ylàôŠ5mµ­­ƒª‘gÛÞR–Ÿ7~¼ ëÒe´¦Ï¬g’£oöÜ&ÌòÕzÙß‹¾Ý²‡æm|½q‡¡8³´ë%{0£ˆñv¨æ>“0§¼æÛe—kµÛj4Ûmk5ú74èMJb-«ø®±9í9…ïku-–™hW2Y6¶×ä[JÝ
´ÒÓZé­ôx+½­lh­l­lðV6j´²©µ²i´²É[Ùô´òÎt©ï°lM¸4™M·Rq¡Å+Ì45Û;`­	±%Ì'³mÀ¾ò%Ã¬¬ §
ñU–øoU ?Œó©QD,¼Oïz“Äƒë€³ŒØcû?šzïhÄÔ‡tÅŒb\$¤±=_4_ ³ÉÊqÐt)ãðùóH
Ê|\ÃøcBb=00Ð,±ˆ˜¨N¬®XîkŸè#™¤%z„"S"RwÊŠÇrD{LLéd,f#íxƒªÛêµ6Z›ïVùh,ñJžÀT°zPæÍœ²†¼ lÊ:Ö™tS,Ž9ìU
Š«:¼]T{ÞC1QÉÒÒyAËÉþp$ØNU6M¬F'aå9X«È¯Ýñ GlJæÚ¡æo¿Ô¤K UnÝ¨yªå30ŒN$°òº:bP›ÂPÃZ=PçÖÓÕUØ>sÍóu2 úþú„Ý[C+~àg€,ÖÉ#a5šG©´(}'Àjœë	óÖÑeœâí~î¡zsún_;éîò øôôúMyøRv÷­¥XD1:k3‡îªUuÜ]ÙbœNß±c$SÎ¢Á&Y(õ˜«3ã'wf}±x!ý•.„ùnéÄ05æRÄÄ@Ô9„”››z@‘N‚µxÔ¯ ØeÓãÒ†ý†¬«—×‡üøT;ÞÞ]7ê\N·‰Œà•ìˆÿ5€Z6n¢dVwî© YÀœX<J1ïäÓ§×Vm¬:¾çÉ-Úd•=­fS-˜éÑÖ&ÑÖ»§iÅUa8Žº™†)›­½MÎ0<$¡õPŽvÕ<±èê2qô¤½]v'ØB86®ÝÙÌýõéï<»rÂ«³@ƒx¥£šíÑÅgE6šM™£ÐzD®BðïU{{3âŒÌÊzüóˆ’ic¦ê ’N¯±@û2‡ÁÃ?Sü‡ks¸S9ŒšnÇ÷
é,›bÚØuµÎÙ 61Ýóæº–û³ÎF˜!º}y†ÿÔRÉèärþ›±Áw÷>ìÛÃ®ÈGHoÂß„F,¶}÷? çkOéè@‹¢÷Ð“äöm2y–‡??<>6;^v­¡¸Y›U PdPŒóBóIÁG Jà°pöŸ7ÀÝÏÙ,ÐÝ;çRTÈÑ:V‘¥1Ñ.¿ÀP\€£Ñh]Z M{€IuñFitvÍó‘ÿ_c³tøÅÓþØxËÎÚ¸ŠdÍ~R7†œ»ÆlÚÛ¸JŸX.csó•ex¾LÇ˜¯}›òµëQe:äÒý(„¯·iDt4|Ñ$Ó¾à]7<r»‚g‡Þ´³C{7­è=½z&rq"Wö_fÑs±˜Gâ2ÆÏÉ0·· æ²ÕºÈÅBâ#ñÙÁÜ2†9I´"z_‰¦ñ¾=K.RÐ XCÞrÈI˜uñmÓ~0Æ¬«2/ât|8 ¼‰ö"¼BñÁ&Já÷ø">Ëþû~èÀÖgÞ[ïZšsÙ»úÄùÕ'" ×XÂÛaþUÂÙ‚}Ü^Åeo£ËçXÎ‰©»éì®%É±/ÝÈCS£Ðn_A“Ñqµåò•»aenJ§vR÷’ßÓhfýxšå ñ‹»Qcõtý7Ã‚ÄžvˆNÖ™†ôøÄƒ4b-Î¨0˜˜!™‰ñ
{Œ ß‹Ðë@’/Æ°Ýí/w¯Å¬Î=÷±ê"¤]¶sŒð(®n,e+Œ«mÑÆ‡]‹¿š††=7¥¡^+‰?–¶âÀzc»ªØ°6…¾Ä-¿Ee;[’÷ÀÆÐâÁâ™/”—ÿÅ›GÛµÿ…ãÅ>ú;úƒ„3¤îö/X0aæ>yŒÿýMôì‰?¶?Î¬R×ÚÀø&«ü#…&{e¨‰6¿ß4X`k'Ø#aU(ZärjíŽH%UH$ÞuÙB|é	ü/v‘XË ¼³§«‘èû8Œ6óž†G6!ƒ„²F2	âHÂxil«!*˜²Ë‹•²Ã%!H^»ìçi&6ùôN€óÜÙÇÜã¨eà¢£ ÓKä$)Môo1Jéöyê’½h0cÎm˜‘Ë$¿Þ˜Ûºži¢ßÓB““`d¶``$(D:C•ˆfsÃêg®äá­x…Ë5Äÿ¨Ùv×ï‹ažŽ?€$'Öa2‰/—À£ãIœ%B¬ï­»Ø¯Ø„ùý×ýyàììmlÃ@Šf“I’÷Ù]3.>]Â\Ã=í‚¢†n¬
é¼ânÇsº+5%’®ú³¤ù$_îÅWöO4¹Oá@@‹‹è©ŽF,ÂEojÙºA‹”[îÚBçLÔ@A^8¤ß¶³ñèÚV‚ ö½»5ƒRì¨Áœ/9QyH¶#_Ô^»*aXËr:òeMÐ3Ú%£s%óÓ/’)äN r¸iÀ‡µ¶åÊ>HE˜$º[ [nûá–«ÒÙ’HÁa²§ j;Ž=Á¢.µ¦5Ãè oû0ËÛ>Ñ.úÄþ:Ã­§>7|9$}\ÌšjFæàg0öqž¢ Â=pCvã{i«óÁ+p¸8=a×°'1³Ågæt!V‡¤"…õ„ÚyDMi¢¼œ&ñÈå„RÀÚú¬PÖ‚¼pyfXÎu¡r9vèO(Zƒjò*Æë Šu?ƒ‘ô¿TNÆY#³é-x£.1Ç§Ö°Äº<Q´MLñçl¡f%‰ˆnýB¾Æ]¤Y(fŽÁßý‘èîã’Ó8IáeˆµÓ¹ÔÓlZRªÕá4RgÑÐÖÐ²5(úY­v/Ïe\\ÑZwËR»ƒ‰¨ª5)k#u7o|„²˜¤ãXÞë”™ó}„ä–SH`?ÛE#ºñjó62×R¬êñ ‘é˜9'?Ïâp»ŽîÇzªã»r-Æ¥KCŸ‘”¤FöX×‘`l¬³Hc'gmÍìÃ/nß|AyÒøa>q—ÊTeÒÃÝ¤~ö¢Ñ…ösƒÙì>÷€ožZ·°Õãñâð9q”ûp,çÂaB¦5ÃKo×ÂY
{vjøëèó¢$+²–ùë9v•0H´{¼a%IÖÎ«7tåUÎ»"–”B|’RMN&Úf²)Íì³´Ð³yäFéyŽEý(©‘>Fà½§guN1`ë^ÄQe¸í0}Ø¥yì=X”dx¹M1Cï­%ÞWÂÜ.ëØe÷§QŒ°Žõ2&Îi'Û‘ÌüåáÝb ¥ItçÝqLëyr"¦cJMGëÊ¦¸ƒS¬%ZY§#ÿ¢}­CŒ~]3N—å‚@ÐòYšà7’n“%-Ïë‹wC0ÅHèØÏ­ÅAÄj’ú]e·Rw?”¢ÁòPó'f,ÁÓúDE’<¤ “)p¼`Áµ0ŽÌË¹±?–‰ÂÌÄÁ‚^IN(¸Žb+fìtûá¡ùyžû§eÝê¾¸å¼­|Á%ÜN<ŠëQBmÍæïÃ*¥`lµœ‰•-õõ\ŸìAÔ0OL,Ú KOöÝ±ÃÆäÁ¥"˜JÒ|jœHÚÌÌc&J–GUÕ²Œuª•=žCNó)_/¹Ñ>h‚§ :ýÑÕf‹å¹œµ°–Öd+q_WÃSCŒÊ²¢Ž­+wAu †>Ñ8WüGã8kÓ¹FžwyÏŒ:ó~Í—Í*ê­B¾…!Tõ˜]Q‚Ë;æžzOŽç</N¤¾´#Âp´C £Âûh×*j³§FùpÊw¡8<aU0þX3+#_¼vŸ…kÜë7èŸ}HÞ¦ƒépo¾ÑÙ
³¶‡™æS!KˆaàÑKpîV„ŽS­”¯BÀm=¥¨Ó9G0Ï¡ÿLÃRøˆÃ~fù£çu*EQÒ)¦ÙäužMâÒrš«ßÕ«
óÑ4C{eoñ¼*¤Ý€1\öÃO%ÇÇ¯ƒ ÑîD[‘:}BêI0'±—4Ù4ˆe¹/Šïá¤é½v¤¢›JÒVINðQWâ`­mQº·Ê5´(ˆ7‹JÒNvÃUy ã7L‹(‡»th«¶¾¼²!}ÛêXýjÏ…³Êl‚ëCÙÙõû6€BúË³ö6jé;–cÛýd£±ÂPè›½Üìäþ’¨)øÞ;˜âº¥ŠÌå›%ç<B(×åf¹§•Võíz‰¹Ó¥Djðbf-£ËƒõÐtRã$l'Âÿë
‡îãø[Vœ‰ùÂ¾Ï²&¶Ü¥îÎµ<æha¯JàÂOodÔ2L‹ý.SOµÓ]¹Ç8ãƒå)«‘…í$°ýº+û/²q:ÍòH?gæG] BäYÿÄƒä2í³Þ“â¶ç_"Yæ½	š!•±¶ŒN`”‚ëÐ Rš‚ÏÜ¿÷A¾EéõcŽ~¶ÆÈ)¾<É®Ll´	†gÒŠõ™¯™Qé5å+è'Q
k‘Æ£½9I5ŽR¶ß«å2#„¶™dWóhÈƒV­·Ä$
>àc™Ü
¦×Z!Ç<­j×_5ù”NìM­#VÈã¸õNÏ_AÃ*‹÷Ôólq¶kê…?£Ï‡€=s'–)Æô8µáã!VŠ¹b–5­æ*‚p­üÒ-_ÄÐÕxÕKÞáë¹*­'Ó4{!XŸEP+ªûµ¢‘g¼gj,2[w‚°úì<À€øP‹SÌ[8ßu´8·þpëþÖ¾÷´v¶`kÂ¼ˆƒcd4”ÇyÒ¤.|nò%Go2†6Þ¨1ãictƒ¦»êfü#cPågj.X²à!k›¦$7‘ç²µ]ÛÞÒnº2‹EÂ·Pè	mªR3a™Ô'žÚ&D7hyƒÌWÙ9ÇâÑE1˜9V,Õ?Ñ0uBë¸J-v	²ø:Ü8…Ð¥úñ`°heÃP=\,¬\jWh®•ÙËŠ©K¼ýY±›Í¦t2DWAÖ_vÖ;-¾,Û°Ï¬Ìë+¶ÏŒu„Ê·°t†vR¥L\úT”ž?Í³ëÒUÆ?ÿõ©q³Ò^ÍNæô%iTÑÎâ‚Tf«üŒr®Ø×fo<ïˆOvÑr­û–ò¿Gi=p•š%n!îv—wë8V£Ñ\gH^áwÓŒ•È¼é‹k «ÜBä¯² -ç÷@Ÿ`©	U¤ËhüRò´xn!W‹g	ùZ<ËÙâ	ËÛR$Ø¤ƒå°¹²î¦&*•J¢êxPÊ¢"ð˜%ì©Äå†ã§¶ø(ÙJ6|ãS¸&ív4þ Ç3ï‘Õ»÷B5O«Ñ’‡úûYX×ÃjPæ‡áp·å§Ž'â»Î¥Œ:æTVöçItá¿æÙª~I?K]ÎÅ©&Tšjv¦­÷FWïp’öyñ,ŒËŽgæå Ì3óÓHû¹pÔô=.´J]7}ÏoãÎÉrJÕ9óR‘Î(,“Èqã	ÔÔx™E'ìôžmÔë¢V¡š¤T<ŸÙT‰Oõ<@ýžžŸ
f"ñ:ˆVúÕ¹ó½C×Ï]poP6ùîBM-à'ºsÇ~¢¾±Ôp¥xA¼{qeÆŒ!Æ¤m–þ«Ì{Ô7¬zäpÉâ·Ã,¯ÿJ'Ëx úž¹pß«çþç{îÚ7Ï÷,H•ÄvÕÓÀ‹wÙJMb[¸®{Ž»Ý²r‘1h¯Xç#-åv
CÈ£`‡"÷YØÅÈ3³ZÂo·Ô SÚ~‰ìfê·«ØZÙwÜ¥@§–ÐX¢øÌoë3E}W"ÿ³¤ƒ‘ÿYÞíÈÿüvÎHþ§–‹’ÿ	:.¹ïA/wÝáÈr±ôé$–—Ú«lû­}PÇqÉÿÜÚ)ð,·½ð©ïûxê¹D…ž
7ÄP—	²¯ZN—žîêN¥þJ[Ùç±ËÂ…A´xÚí!O´[eÂõ|%k´VŸ5
•¨l Ö”m6ÔEÐõÏ²V7ÀÀ«ÐèæJÆô0$ÿBJñšOÐqYôâ«amaöÝ/"„±½mœ"‡4påhiÙŒ¿¨ëâåªú°½aêÃ^©ÐœÑBºåÞföD'¼4#žPþ;¢ÓQx¥Ýêx¥ÃoÜG/á¤Ð
NÃáFàšùý²9Ë¦nŠÛËf{!~¾•ãC¸_¹š+'2ûÑ©Ž»pøš%(zO>çê‰,82¥Ngš=M?%ƒfe§ÆýçÿiÜ¯jÍU}Í’E˜yÈ]TCcþ‹iô¦­ìû¯çZF$m}oþ‚7¹ë1<J»<^¢ÃŽã—ÿ"£ÿ!A¿¿èIŠIH@©@/^ýª@	ríÔB.?Îø\·}A?(0{ÐÚÄCl‹hÊé§4ÈÆÊþ“ä2»ÈãÉ0í»>ªBÞÀR•Ñ£ô éAÓ¹'pTGõî&FúÙ†ŒF½ˆ•ðÑ‹8×ƒK-àQïîÝ`¸tŒa8Èc8( •2É…ßœ^3ê“F]^@ƒž¦ê;Ÿÿ®×òÉxö¯[L-gÉ]-çSj²î‚Îµô*žûK·Xõ/{Ýat?&£Éã4ï’òå/»çv(  t>¶8¼Â6ëß3©áÑ`—žTÖÍã§;«ZBë—Goï–ƒjW>E:ÛiŠÎ’ËÃrß ƒ¶ÌÃÚi3±O¼íŽ‚ü­Ëë(Ç!|á(µã ”» È‡ì$›x}k÷n6,#k¬ì»Ëï¿sµXT^‹ÑOKæ¾„åèˆJA@ÛoÓA½I&€‡0Q÷L5?øâžÖd~5s ÔÇôÆyÐi6Šó†ÇˆV0”ïH…Tïvê¸­Ò	™
—Á\çìJ£u
AßÜïâuuÀÀçñlÜJ"ðè0Ï³«7”ÕHwmu`í±âÛTQà•ßÞ9ë,?©/c+  m=sOŠ±¶öFÏ‚ÀöÈcL=Ñ*õÍ!æ/³èûÏX(ê~<™Îr<Ù´QÖÅXÏ™Ã"×®*Ôª^™_˜‡Ø+ßE µÕ›Q¥–<Š^œ]¾Ìr™J¼S|M–Ú3LLí°‚þ/a¿Hòå2›~˜G–ù¾aœ¡<+ô0Cô³^¢ÀÒT®D8|‘·ù{ßZTLˆªÐ¶ùÌÅ£àI¬JÝõãÐ°ö(¾uGñÂßÄgYt¼PxEŽêÚÂË“gãXú÷´ôî´Ìà ¡õWõîJ‡³ "¨v>2œ%E¢áA–cT.mù‹ß&ès¢|eX€uîB£Xdñ±E×½$ Ãb¹	&ý
ú$˜÷Âü3 ð:2;!,ßaÞìº‹A< >¢ÃŠqJç÷\©­ýz'Mkõ(¿ìr÷kP=‘«ã¥)!ð–é»£‹]›Úè‡ÁRVÜµö[mE®]¥Sj:ÈàæÊ“öKóƒT~,u½²¿«ƒÎ¨Ó'Í–µ>ÃöæN¤_¶­§7Àòéw³­Á+‡šm5ÊÀ¨ß]Ø†¦²Ay¶=«·Rs6C¹³&ãæ­J!Êp€VÖ›;”·J‡¸-3ˆb,%•A´Ë±«ˆ®R dØçÑ0Éa³!¢±œÉàv)|¾`%ØèC‹7I1Ê
T ì4N1ëîÅæ[ŒøË
¿ÅÈyaó*ÑB{‰7*›{ó>~G(û(lÀªúcgi<&¯6ðIä+Ïãë½•hc%Â5Mûê–)/¶·òßÎ»ç[çƒ1ýÃOirPÅAÿ-NðÄJ¨T-àäeçr0ÂuËá½ODØcrcí®·è×[~•Ð½\GÀÕÿíáf¼q¶Cé¼†fþ3Í|]ÂjïÍO¡EXÛw7Ñ¹h¨Ò	ðÙi:	½ƒ’p,R70:õ(ö¬€±v{“O¿ÑjM¿?7Â3ÛÜ£îü§½ÿÉ/Îšëþo-ZïtW!—ÜÐäAPS‹ËlœM1fA%°]ÃÅ$Òmžon'[åTèËP¯Ý@mªÕfM7Zz#¥÷‰YØÙ'²­í¥Û
œdÈ}ï#`ºR‡ ™Çåa¶üùªë¥ù"‰ÇÑ‹×Ç† p’'cSý/q@Žû¨³h]/²A<Òd7ûN¼æ)Ð÷ù¶WÅü;G7‡(	ž4ü Ñ[WÍ¥Ý£ô’TÚõù²[ëÚ=ù²{ñâ.|YS¾31G)ž€@ˆ¡p0/ò Ï&hJÎ1Á”Õ–tÐ‰ C‘[¦ôµÛ6Â»ú·Z‚£.ØdÕ.ÕóTsÁX¯;ß)™ð6(štõyÐ¥V€øµøÅ7S˜ëiÄí©Æ(*þçï¯Pâœ¤d¥²'¦¨ñÄÒöî,yS[6´¼#ÖÁ‘0lx3l»a±½!×ýÛ[ó2ñ€Åñ8Xs’ƒèsa}­âÎ¹èó»’b1¥p°/:qXfR-û¯Ñ›¶‚ßa²ðÁÖ¾5"¾¹SÓ½¶ü3+ËRî;!Q(’ˆè@O—˜©‡DïA¸¿ÎfQ1ã\ÅcÊàiß’ñ·Î®/bÆt–)‡ÒwÐÐt‰œ³¡ñ¬ïPÍK<ƒh:ÆßÂ÷¹QDFˆÓ<¸|¸ÚB–ü“«Š’oX–5,Ñ]_eÉÖ„!—û?&É´óÞ3ýÝ’éÏœkBÀ1ÊxT¦
ˆh‰žÙÝ§	ÕÈ=º8Sa5<KÅmFx!K©´”ÖOÞX¦LœÑL¬ž(5î}ùÄ»Ç(<‚]èžT}øù¯³÷Á‹’«ÁË%•š~D“÷[fA—¤ì)¡’³güòt9ùZªˆ±É’\´²ž-ŒEþ 0ôjÓwB0v—‘'¸0^‡²\,NYñ1˜¶‘-QË»ËÇ©J­õ€›ZÔ™¼Ñ ºgÉÛ“e°9ßÚx¬Æ^¿“jöù3æ¿ty(±Mú¶LÒÝE.<¹W˜Ä{G“ùÊ©!ÿ¾ùê+3àÅá	üï‡_ŽúþßŸG{Ñ)YyšŽÒI:Æ¸Zøó$´ò_/b``¨Sõþæ¸Ÿb·ü×a0 ~ô:C+³1(rÍÃ×«üë?âÑØàÑ`Ö'µl¥…oO’þpðâšXÛsÀØQ:Ì²*5Ož‰V^Ì
àŠXô0ŸŠa¼^hnÒê`‰“x4®|õî;1í—¯^þòûžºì¯dòüƒ;ýã“7G/8ùñèåÑ“_Ž<v`pt~žÕÀ”f—³qª÷E|– ûFËðÓ‡¸¸Ÿ~HÆx©?2À¤ÐÂ— ò$˜€‡&}žDÇ@€â^Ç°×c¬‚ÅE|ÿÐŒ§P– @+¥OfóøÕ›#gJ¯°-ÏlÞ0q“FñÝÆìƒ>;ì–4ÆÍý¡H?DE½…oøþo³Ñt–ã38ƒq³ªÅ¯'óì,þ¯ÿü¿Sü~$
ÂNfã‹[Õ{aíôº0­Ç Îòk˜;0¿=ƒ(¯4I’¯‡Ø/tœ4|÷6ËGe´ý]N²®TYÚ7ª‘7É†}ã+âxLm=“í…põÝ¿feÐ0-p…©àë<;¼¡¯$}?ŠóéP[[}á%ªoŸ§y¸+2‹¹eE6^GÙ9½ùq¢1JÈ…XÁò]ÏŠPq(òC½fÌpÈ¾ü„×AŠiÌÒ	=¦µLZÑq#›²ù:ƒY9˜¬£8áßùllÄ¬/þ‘&WM
Ú ¢dÑ~Äç"å)q4HEn®½xBnµW,‚k2à"?¾Ò’WàO3:¾á@DìÄŸNŠõ=†A«,’hÀ–yÇòÓOtµ^³ñ÷ —´¾ºÙŒ©íŠiCM{–»Q¾¿ºL§ä¼é ±Oò&`Î%ŒçÑÇ,ì·lx@ÝIL1ïK+Z¬ŒFKþ”w¥†õ”Ï‚ún„ÿ…FÎÓQ¢±2Óïb2k=dÓÐöÚÀ÷³,ébì®Îjw‘,ˆ¡œ†@SÆ©ªeÄ²òõW7LˆgtôCèãž ‘ Í„¨Wï MfE‚t i&‘lÌ«O¨ÌßgÉ,¡º¯Õo½â£l!øßE ˆçmýwQÛÅ°`‹6ZùÒûJç]20±ŽTôxêýï'c ^ûÍFÃÆ±À¹åŒìOž6Oßí7y:Ùp"¬ß4ðï £½ÿÿˆüT£eƒ}5!cãx‘\fM]¯£ÜÚâÈì§<À'kŠ|Ã÷"­ K#WçÀ¿¢»SK­Ý‡A—ÔëP"²Èê>¡NŸÓè£–À³ \µCQQÁC»øÑ]WZ.‚	T„0FŠep~'#Atè­-ÎÄu­*¾¾iY›Å3²w”díÿ€ttÔ^¨(HFƒ®<4 %o¤5ƒèoxåá1Ðµ´?Í.üO:4Á;ÝœÈß¥ûêÅ)P³ËtŒaúõ<K	ÅQ¤õý_IQ¤ð{|Ÿeÿý?túÙeCoÇÛF(W¬V +`4L@>þÚÖGM°3ž,BÞaŠ4sjÂtRxÄŠÚ%eà5UX¿VÕðªjÙ!	fîIäýxk“ž_kl\›%ž]	hÂmŽ£/:Š|´ÚOá‹<¼w¿Éöá^ÅøñÄì<‰±¤KJ¸ñ•9óhÄp¼h´¨6n¨Ì)²·[JÀÊ¢YÀMÑ¬²zÑÝhe…5Î%–“ë	öˆ¤ˆ÷ªÇùÜõá,Ñde¯®Ä™o‹½™H/€­uÞ^l—Ñ£•îF§Ýwì5¨PHNä+‘I€/ãˆ'hƒ59¿<œ&È`ˆ¤<%zE»ïýLd—†¯AœŠ§=õº´9Ù#¡Š‹>Í"ÀÀ8ù”g9õµbÏ"÷Lš0†õ®,±0g°LÏƒåÅ'·¹UÓìÉ‡F´P™	…‘æÆ34'ÿÈDHZ²sFÎPTuÍ,IÞ‰¸ë¼4ãAb,bîRÓâ¥¦ùŒb8Œì­ÐÄ&/:H£ãÆ)ß—QGCA—‰_'ö[Ó4É\¿z¢mwƒê¯½È"lÌPœO©Ë­§Àìí]¯Á+(9áª}WÖ;ñNìåÙÀ'gÊo6”hô@¼2Fï¬FS»ÌPC—Øˆ~…¡ü:KòkáTé|Øšƒ³V´2Ã(@+«-þù
ôš+b +Pboo¥%gÆ"t¯ê2ßlL„3`ãI1Ì¦Í_[°ÿà‡qØ!Y(¾¡Û¾#XL+w€GÁ”›ÍAÖ?¶[“½C½y4CuŒ£hˆNGüDí–êwžÖ£¹›gLŽ!
Q0gè†¹EÕÀ;“Y1lÎV=U¾ÓJ[©¥šq‡ŸYRükÀ†X¡øÊÊª•¾éÌ.}f”–zDB 5,L’çÎºÀÜ;ð>Ë›+GøOtžLûCdwœ°Î]ì2`:R‘k©aBˆ¦"M¡ÐòïƒÒ}¦SvÞ ±IPœ’Ù“šsÄüÕ*“wtæfÕ" VYƒl9ÁõAŠqˆqÝNn³%·Ï,»•Ho‹Éo>	Î'Ãù¤¸ ç“äê²›~”hjUš&u£­æ6)• €Ã‚ÆÅõ¸»e7z“žvpE>Âtµ…N¹àÝ“ä<ž¦"9qñ)ˆøªA™Üš_r””?uš_Å0ÃT×ÔUl_nÿ–{Ë­¬L„M³‚d[âí‚½Ot"ËWËÉDÔˆ§Y®ï!‚°ÙÚeAîWÂwŸn)Xq-0:ü°]ôóD»›á¸QY	íè0ùÔÞÁ3â$ˆñh)¢à„B˜®]ðZÎ. 0Øe?“ñ€…CÒî—|=·öžq¢EÿÃ5šðÏö&s¸ÒœÎºxuÌº‘¢ûXÕŒÃpÕÞÞŒ†ø#®q¿œÑNlXÚ—€þ™â?<zn›ð¼`	Îö+Â…ùœä´(ªQdÌÕðD™3«©:%à\!+X½ï¿@;Š@Oì†p šÿ@•›‰Ý/ô?ÇÈRFvWœ†9sÏ¡¶ácS™­'jG÷Ä“Adén–gN^È?Ñ¼±£9ªRAâÿÐvï½Ùq{n´ß©~0K~DØà!d¬Êè;Ø],.gÙi1Ò,Ì{ú‚§¹r;_v=CÂ‹oÿ  ÿÿ ¿7í³xœì½ÛBI²(úî¯Hkõ´ÄjI 6Æ€·²Í6Ð=3ËÛ§]’
©–%•\U204çÎ÷/Ùy©ÊkU‰‹MÏ²zKUy‰ŒŒŒˆŒŒŒ ý±Ç‡ÞÄß®$þeÒøÐZ™]~$½a#{‰ßh­¬ú‚ý|?g—6™]5Všë$
çÓ?hL¤F?âÿðâm(>ŸÍü¨ïÅ>I"¯ÿ9˜ÁÀrN¡]ôÂñ ²sê'	¼·–ã™7ÝyB”ÏÖò øj<œ} ¬ãõì	™x—‹Æå¸¢×†Ï{oê}Ï{ÿí÷“¸N†‘7  H?
?
¼:ñ¦ÒŸGQÐŸç2‹üØOb >"[q…XØ
Ãs€Aâuì¡p
ƒpúª9…Zä?H51‰Ùãêà€6½Ó4Ð0S‡aàE{ ýL¿\÷½éûpœ_òÁ“Ÿ&5¹!µ£ë§ðöá|Òó£šö¦‰Xôü¯þx‰l‘V‹¼RZ¦­÷æIsNwÇAÿóöum‰lïksÒ MIw ±ìjÓùx¼ôÒ^j?îp:é¤ÕÎ½qì»Ë:¼ñÑÌŸÖ’hn+wsc<’¦ÖÅ:®‹6¬X?ÁtCºbFáW?ÚÌž=Ôy1*S‰$]R—c¼Ax4KgˆÛ†7“ó±I ê$nôý)*ùïyœÀ\ŠŸCo‹ô¢qÈ!“ÁæEÃ›'!‰| Ìà«Oþš‚éçÆJE•¹N¶ŽÇs Îà_þöuëÙYÞ!€XÂ)Ç Q6µj3Kdó¾i€Íê© =NÆ&1ŽÃž7æ¯÷1Òí‡%I†QY^&'~cŽL×éùØRŒ|2A²ùASÓÔë0üŒ˜QéŠM'9Â	ÙMÙn9»QØ`ö2}Á™¡ø?dd3Añ4¹dcôoàPáß•y8Â™×÷WIž\/ÿ'Ùýõäd÷×ƒ_ß“ã“îi÷ì”üçrÑµ1Í±?&#²½½MV(Ï½c]2˜¶6&í3MúéåèìãŸF?"™lÒïQxß­TÑó“fÉbÍ­[£¶!/cF–”$%A¹–§%Tv2* lQ‚†0jëšâ	0tÍÒÍŽNÝ0fFÝ6Ä>íÉò†¯ÞxÄÌx÷m:gæRÇ0»‘7B­šOÙÖ±Ö¯ùÍÄ‹†~Ò¤Ý,ÙÛsçÙrÆ\ºšÄ'€äW)çIõ(:wÌñ{oF8MmùgF ~-·WøÞKöŠ„ódLýÆ4œú:£Àé€öpFç•¡¸R!ƒ özc°ÃyÃUá|2F„5›Í­eVÍÞæõ‡•:iÕI»NVëd­NÖëäY<¯“:y¯ð5¼oµ?6'Þ¬6Äù1ÉHð³p“ÒÂÍÎõ/÷W¤ò7@„½(ñ§ŠŸèü’Ÿ Ü§›|h—¬3º"¿…ÅÚtf­K}Q£`@ðò†¸ÑBŽ˜ýl“ñPú¹J.ÇÒÏ5¸æÎ??ÇúÕ+q¶mò×k^™­m˜Ç¢¶.Z—®Ÿäjãd%lIRZÛ¾yõSxDá;ý§s…©3ø	ÎAXëªA€ÃùQR«†bï@l’ã±•= že}ó Š“fÅª±Oä'óhêzo¯¬1©÷8Ë¬V=ñ¿±? CAšñõª³ÿ>pî„Œ¿ŽÉv5äW?Æ ¸ ÛmR£MÁR|'~´V–`e¾ïœÁo?ýõõ_»»g§MV¯F·h0m0ÍgcŸˆ>]B¥V¯æ‚Å­°~ 6%`´ë¥Jýÿ=÷ç~­:ñøoèÂE¯¤ÑD~®hŸ5ž•—m\)Uþjª¬rÕs2ÐUÏ!RGºÄ6CÐY‚ä
D“=cÿ<ÉÔLlê|íŒ‚ÁÀ·.W‡üÐØš×‹ÃñF–„³Œ#Žø÷¢±Ú&#üÓ“äÙòz6ÒÞ˜‰ÕÕx)ð]o­Ð*Ò@†Q\Ù±2e;„æÙ™©«þj­#ü#E›I`I(ÜÐÉ‘¶$vLèo¤MŠlûà"H¿"[!p‚HQ8½i0A
gHY¶Ãh¯ÑÆ&Ùú/o¦<s±±œ¹bØvƒ¹5Z3íB»übe%S{¤ÃÊg+ ê®åtbÚ¿>´ZhÀÓla“„šë@  æñt>¬ì ˆA¾3!ã ˜åE { ë~ùÄ‹@‚&§Røq¾Êön?¤ôã”Ò§ïNÉ.Nÿij=JF°àñE§pM‚>éŽâÇ!½¿¥·UýVR¶@G/Éý‰yãÁŸ[”‹A, ËE•Ç'Ì³Áh³©¼°8õ-òÜõê1ôï*œ']¦^¾\?Ã3,œoŒ;­v*àãÙ8HLœ›o,¦‡Í ­–c‹ïÖŠ´„;è¥4„ÅõƒÖòtû"yX½ _„B[¿ïtSIì’¥º$GÀØ :{·V!úEho<÷¿½ü´.Ø[ÈN
ý‚“–¿…Ô¼›ÌÌ•˜|ÚÌÉ€.,+ie‹ ´>¿›”¼©·åIÉµÆ)?î(ƒÉŽw§‰7xÑ€²,É«£ÖZO@–œ2GZ_¸dã‚rnr~Âÿi‚ðì¤{øöì]÷°»÷;JÅ…b<j€P|œò0ŒðÈóÏ+9üÈD^ãqIÅtÚªÀ.,yu‹lt¼ùþÒùÓÜÃnwK‡¿—ˆL"ê>âO}*ÄNT²ci;Y—èy…Às'ßBFæÖÖd"u«Ãæ™ÒÂ´ïK^:³Œ=ùÍœ—€à`
åaéÿýbW>S¿¹·&!õÜÁöµ!S so¼}}M8WÛ$+&gæt«k™ÅüË )jJ“ÛšÄ ž”z_hI½„R—×à7Ðê ¦	0H‰Ê~—ï†˜:‰û  À·æ‹õ:Gí²ÈJ«¶h=K5yåº“°“Ê á!G½ÉÆÃLH
6ºš¹á}Xù®_Ã?Ñ°W[©Óÿš­¥º0#Š–Š[ÃýJ#g*¬ù–G•ÒèàMÖå»BæÙdo?Cvñ>«?Ø¸,ßKYõþ>\]"T+³ù„ÑŽ-.âª/“É[•Ýpzç ã)\UñôääL•›ódg&F•Ô8u„úh/Éµ6ZPcöX¡*«7é¦ÅÊ],—ïÊpMsXAÍ!S(¡§\`}¥¤z¹ýIÒ_™{YLu‡Œ`s5‚­ñ½r£3†»Ä±b«ÄºJ],³{ÅÜG‘Œž­|}„Ýfœ„“FÜÂñ¸çEŽÅcsÞl5×í#{=Ø÷”õ³|¾Óm!ÇÉÑ~Ë=ÛfÆÞ¨ÈÃÑWMÙU©¾Ä‹—_•vqœ]6Ö$GéÒnŽÅŽŒN/FÝÚÎRžß—¿ã‚›ÎÌšbT0ç»Z yø@[ÝËY¬“N”Ä¤3‚˜&AßGÁ¬Nv#ŸÉ
Ðs¶¡ÇÛ4ûÓiø•ªÚÈ:rZ`ÄfêätÒßùÞ8ÑþÿîÇS?ŽudY+ül)¾0('@í^ÔeMP@öü8ÚqbÖ¨‹â?K…†äÌï`:ô¡nøïaô™ìO&~§ƒPŸ-Ô¤ÃS°²ãx‘×x¡ƒ¬ñ\¿§e·½-Î°oÇ²;1Î;ŒùÌ÷ú°€s¸6€ž°B»@UÁ ÚH/ìPÿc§ór¿ÇÂó9$Ý‰8¼Úñãâûrír>íøù3}ùÝÆŠq9F|r„5ß÷Ã˜d‘·¾ðc¡tjïç9µË½SÇö~sRçö~Ó§4àî”vÜ‡m^<{W‡ü¾£¨GjiKyŽÍîÏêº–?­g¹—–Ö¦³yÎ’`v
½kJ	Q÷ý¬k?ÂÅN'àù—Þd6ö›ýpBj¾B²7ö¦Ÿé¥²iHx¹%w³?–ã–£4'›ÚŽ¤ÜJµl+ðã¸ŸaÝ…aÙ»ï l¦áÜü¤—'JYšÛnŸ¥ÛlH”Í|L`ßÔreJ«™7µX7ÅåõÌÙYwR¶Ý^§Ô›A˜ãçÆ4³žåpé{“e¹¹”åÖ»xç¶5ç9Ì–q™-í÷*ü1ñÔhá …·¹ýâˆ2çØíŸê|‡„¹ˆ£V©Oþ8ÏÛ6÷dÍíšIÈñÇ±Û–a"Á™ÛãÃÓ“¸‘,ð²ÏºK²«H´ïÅPx×}«_ÇõÕ¤w–[éú­7CÚ.þê<ç)¦…Å‹W¤
{'Æg:ã15£f?]<.Ç¶¼CÊ¶±2—.«Âh´ºŽF#Ý¢¤‘HñŽãZE	*|5n5D—ro4âp¨Ö'Õ¸)–«¤÷H%~‹Fq2²ëé®»Dæù ¬º8Œ³0@ *åZ.û	¦ýñ‡‚¬|¶“Ç —¯þ+üÒcª†‘§@·J'nÎQŠG•¹~¯Ë=çñ¬<®•³oQ×Ãõ§‹Æ:5RR(6sBÑÔO.V`5d ê…$•¬ž)±({Ðø§P ¿êÍ§ÜÍÎb€ýü3ÙÚùÀÀy„5P’(üìÿ=$£íëÕ<Wægf—šä>ÿxÎƒ€w3vÉ\òÆ+s†8ÝÚMî(\WžgÉ¶Aüaù²Ä<!3Î8(—³™ðÝúØ-_ñãŽ’/ˆµ¨MÎ€ ÚñŠÍ7…\4ZË«åœiv½iß7Ã¡ä¸‰—À˜_Mû$3ÝÕÝT)¥xµ34VZœ…Ìf[ðDËêýXÊãÊ‰ÈXÆ²ÄO]99<‡=œG}_QÂí'”úÅ¦¢ÓIÃÿºàÒé¦¶àÅ*4|ÔØØèu­ð\Ÿ<ÉËª±u°-¡¦‰¡.ÎÙU/·ló.¼ êO¡q9,O¾RÇ%ù«žS	AÈ{ŸEvÙ$§I´™µòêsdÁ
 ñ…3XÍ+žH6ŸM¢›»_	­H6Q³ÛàüûÑ+f¶£ÁËªhE«ævxqñwò7I{=¯Ü,åÖWrà•kRÅ&'Ô´ŒýÜ$/^¼ÈÙz19šÉŸã:©ƒêŽ“\â¹µ~úéš±'‡ªY§Ã€TävžÄ âÏû}?ŽÑôqÕüäºzHú^Ò‘šñ<6—-…c¿	%Ã¨Vážxô×f¥Ž_œxãn¿o€š 0Øå „)¸›¤B~ÁêÍ	€ë]ëø†œSPÝŒs‘xpöÉ´îÏóÜ¨‹÷«+%üpbÝqÀÊÄü²Æ
3„¼b;äÚ·iû³zâ¦ÏøVl&¨¦‡HhbGWR€AStÐ£!æjf5óÐ`÷Ž­åÌ-ß·P<7|Å·ÓaÅ€ûîtH'òMM~øÞ«áÚåø‡“!}~7'CÇi‡æ|h7²ù"):ŸcpÒ¶ä„¦Ã”±ïŠãnVa%»®¡€QE0Ä¹
U¡úé3ûÖúü(Å%äŸ€ g0"ÚîUåâæm¼óöNŽƒŸÇíÙXJXÞ««ãlÁ&€; Ž	r*¾éö»nŸÚaì{þ¹7'5‹"…æU‹+MF¥ð#œþ:C_þÞ®aº7ÄËËäÏù†tvôŠ˜ \ÀâÅ=2kM­c#Öf0¨»uI¾Ûb‚’êÞ/6›M£i­:ªŠ×7KîmÌ‡c7q§<i&ÚÆ¬â:Ý³3Š‡ÖØìŒãÄˆR}ÅÖ`Ï0ÂM_®t	Oà%`Ñ[Btc8\Ã:ÎÂÌ{ KÆ9S!6àÈ±Ä<rŽØpºÂmäÇ
¸.ýÉ››0ríl´}Mÿ!s$d\é=E4ßé„ö½Ž9æ\1Ú>Öˆe=]|‰¥"ZK÷XVzÛÅ¡‡[Þtì‚l²¢­`Š]lâ–QÙ¨–&W3w7æñV—ÍmàÑ\	÷mÔ‡0xpc#ÇGÜ8Ñc;>«žq½(i,9þ\Ž&îx4@33Oz5óÒ;kå–[j‡ !ž‘cH~…ºà1gaPf^” 1PŽo×
FÖ.uIUW‡% ïäZ¡úø•rÂ'b9+Ñ›qó_äy‰E‹Î1¹	4ˆÅ*K­Âîƒ¨!|äžøñµ•ëHR¯öuÇ	N&½¬Š›VýÃ¶k€v’4†FcÅrZ¡žþÚ.ÖæCŸºù1_™>žÆõÂË
¡ß˜]G ñÆÖœK?ÈÓS·:ÞêÒBg´«ù§³üC‡;…øþ¢u”E‰žT>‰Ê>lJ×@‰^3\®ÄY¯~”Zq¹ÑÉs“{¾™Sx“{ÃÇ˜Veé-ò7yœÄÕ¼ðiÓ6<Ò^ˆu@Ï	JõPpŒËËäzÄÑOÞ¼Ýäør> ÿ2¢ÝçŽÒ¡Íš‰ Ä¢^p¿J]ªSÙÔÛÖPkYDvYVá‰»$­_0p“+«¤E“ïž¸Ûìr9<Û£f/
yû:}_ôœâƒÙÞJq;„êÂsºl’£Ãƒ
¯v%‰‚ÒJîÎÒ­ùä:Ù"è0”z+äø¹ÞåGzmµÌm:Ð[Þè `ÝêÀw%·î+«ï8ñ1}Ê©¦~Á0áK];hT½ËsY±¹˜/˜Á uG¿[¾Ílc¹Ùáä,/Ü>äø)à÷rë?–ÉÅ‚IYq8ñÙ…~-ãU3	Â,û5Æ÷Æ´BFV’âÁ™ ÞìXž•mYÝöŒõ­¯ÂP îz†BR¹¸È¿Cëç\¡-\‘ÁO©k2øy «2øùÁãîÀãÜ¼-ç&MÞ|äèý9è*¥…ÃN¤Œ2ñ7ÉYHª¿IÁÞ„=3µ*÷Ž©÷5z4ð“¬ó¥WSö‚þ£«<¥.Ï™1ï®YŽ`Km”»(¿“‚sÆb²1ÝŽ¹-Ù=P£0æJ÷rÏÐB-¨„&ù_æ0C®6ø‘Ù@¦¤Ó/®©ó %+`×V ReK±	ó¸Æ;
Ý¶5Î"{…‰Ú½|Ÿí<Øþ¬ç.êUžd,L&å-”GŠ}î5›”
çƒå”bŸ<5¡XI°[±k›˜.¹`ÊÑ>ñ’ O¸z>÷QCW0L_æón‚aË3sKNì¸ósgÆù!Yhû%¯és>åÉ‚ŸB½†;ºZ#³äé5ÿÞŒ¥ü-}+S”–b'þÅ^áV }ë00e»Õ@î'VŒ½Â­ ºˆ1î·é~BÇ8¿køK³÷B†6Ÿ+s„Í¢¢æA„–/’-¥Â]`n«PÇ$SÛv6Ùöö’Ñ3üæ°	kÎï¸+ëèi[!ƒJÂiîí´BAˆÕÙØÿà½nêú-ô¢‰Å‚9í9{ÞNyWMô¨MÑeÑOj|¤oÁþøÃvaF¤yE¬Y%ê$7Ä6èÐXM¿¼DkÙn5}ä'õ0²…‚é@ùT§§ßó,#9n–sy“ýeÛÂmxÖ--	üð‡šÔ~œ8?Fóã„äÇ	É’'$ÿÎ<îQœäÛ»Å.¯'íBò]NÚªËÉZAD²ôžH®ËÉÂÀA£rËì|â–#£ ²h9R˜³éÕNù*ø‰­]	vO˜Â¡†@Y×# ¤#¤¢éÅM5 Šæðk¬=ÃC#¦ÜÊFÖ««´;</ñ½&¾{ [‚ýßÅä§°pðp%Í?ûN?ûù(f_Ø“þŒÐ9>>Øïî= ðù7Ç¦ORtf³qcNzÄDpzÜÝÝïìÿ×ã N3¼j˜Qý™’ýõ(h€[ü‚ÝŠ=eïM?"·S‘ŽÎÏišó3?šÄÅÎÞÖP­"J#½Cty³|?éëÙa5;‘N ó·,·M˜Y.dƒ cÀÃ‡KÙ…Ú¸Ó2[^Ñ=ƒr÷OÊ¬qþ¡›R„#ËA?eÙÿ,u0ý(U	7˜8,qïCÜ3R¨0ý˜\LîS '.$8¶„úÃ ÜOÒO©¨…¥a’B­Ö‰IU›q%µÒ°Êu£á™‰‹¨-Ìs€†¾57—V™ªÂ)±_uîÙ·âÚüSâÎ)·òŠE:ýäOn®À-ºq‘Ë[™ƒa^ß¥¸ÑÜ¥PïÐV2õEV[¡+iÈ$V%Þ0«#’°§Sh¤ËëJlÂõTØÊ·•Ñ_xì©?!5ÆR[ägÒÎµ–¢Àï=ËThÿ˜åôÓžäY^…Y^»ë,ç2ŠûÖo£4J®¶÷ë8–Þ_»ý¡¹ÑPu!Ûî´ôVœyQìïOÓµõßõ„ý\ËJXÐSIö -‘HdL»¾Z_«¯×ŸÕŸ×7ê/ê­•z«U®­S¤	å(hšMo8ÝÂ·´¯[¦oy‹0u¦ûu$1YF'µAmâÊ¹ÛL©JëfŒqâÏ`›-w‘I0Å9v¾7}lV›9ÅeF1‡;¼çÓWWxÎÓ‡ù>óxÌ³íÀ['•wäé†&§B¨6Y;‚1eãáüéÍ8ô’”ÉÝVälþÜ«8eŽ%¾#û8Ž²rE[¯-çÄ·½Ñ/’'yñ½]ép¬Ž\Œ€Å>éÃþg&˜1@RKö‚8‰Ð7Öþ²äNŸúµÊ£gðÖ9|ÌÅûwÔá9ÃµÝªªÛ¹3‹P|Èwø+;‚„Š™¢+?…'ç
‹Ì+(ó,‰xk;&ËÈÂ»´4Ý¬”µûÞ’%°ÌJ„ú4zJåˆ±zÎ¬2Ü¤(…)û¸Ý séGL«Ç~„ŽAí¿½ŠˆØw¢×,¬öŸƒ^Å!Ô›mý¦ØNûqŒ¿ÁŠÐìw"Ø,¾ûŸƒ`3ËkIrMÍ¸K¬y¯4*ž$u[ð²JÆõ§TKUÒ;:ÂêòÈ2>9~qM~!
;¿¡PÝC†tCaç÷E	ú³U”ãÇ’Ó¨MFÒ˜)¡Ýô+"Ütc6Ç¾95ÏYL¿}ýÉà:y¦>`1wˆîN@Ï.€?/Î¦t&Þx“,ÂÍ_¬@·©3ì]«µ÷sd¬>>øËRŽãã­såì|îº%rmˆ(ÛÉÏ?Ylý.©YÕ¼¼jdA2ãÞ5/’ÆrÒ¸ìvŽTHù–çiìR;B³lº\<„¨s¼"O¡1ê¤uúOw±MR«ÕÔõˆ’{	VaM]–êãtu²Ç|R±/õk7ñRQvb¦Ô°¥ËH3\¤$¶º’Ÿ÷¢Lb§ì+Œ6Î¼^K“¢Ÿ^É8·qÃcÐç±ò°LŒyP˜©r1²÷ä%j¥ÇÚâ‚r£^Ä§wØ|œ™Äìéß˜Ô§÷˜÷C€Vs~ª©0®la¾K‰»šÌzÅv¥Wh3žÍ‰MY<Ø¤ß£ð¿[IJ$càY/µÀ}å’BëâA¯uÑØ %iCÉjú#›I—KÞ—²#p†kt¿Šì
­g†ÊdKc#¦Ñj¹8£Z dƒTw³ø’ŽxØ[Ë£U£û2q6Ö„PË=ÂµÁ”EHÚŸb`ÿ0º2€šàÍT@¬ä“Òg<ÉèS	Ž|Ëo&²²ùÊíQ‰\¶]TÂéÚbÛüiÈ<ëèÖ¦]ä§­ŽÅUOÎúho¨g•ÉêŒPÃR@_©¢qjj4t‡|Ä|Œ~/…æoí$áÏ(´¿Ú -‚@=Þ„&*;h‡b-'>Aþ±(©ým©tÝ–8›o•®ÒUÚ¥«¬Š*«¥«¬‰*k¥«¬‹*ë¥«<Už•®ò\Ty^ºÊ†¨²QºÊQåEù©Lý,Z+å+eÐ"ÿÿÿ÷ÿ–¯˜’A«WÑ~,nÛÿ}W&‰Î8wã‘ØÂmXdVï‡,Í!¹óyy&Gý:âq´ÆB,ŽÖXˆÃÑN·ÀÒÉ_cOß%Z‰~dâhÆEVÆòQûÚ(®™GvÜŸf¼•Â­‹(â™·WäÓO×Z©frûd–ÞÄÒ9}Þ`x6K{§£ðbúIkîFC½Î4½RûéÜ)¥Ù;.Yrž°åùÊ×ÑG#ÓŠºÉIp“`90`æ~ÿ<5“a*#o
õ$˜6.6VP×Ódä{åˆ(	úŸ¯HÎhjÇU•R2C€ø&¨bÙ’xd+‰–åÜª´iKYt¡&†»Fd+±Û6¬6Ò[¾[ËÉè¡»b‰¾“ï¡;RW:•ÿßºSê¼fïÔ#æá IÃv (÷CõK’ C‹Ü;…F‹¹ÿNeçïÿÆó!À‘È™K Ÿ}'¨tÍŽ™S€Î:ò‘¬ÄB9ë¿ÃÂ„Z	Fº¼§<ZçÛ½pp%ƒúm\þE9%±ç")”Ìö˜D[:„â1È‘p|
r[Æä+3µâ+Ø¡`Rs’Ä|ùo,ÝØßr]iÉ·Þäg%ÞE^pD^<Ò3¥Œ7È’ÝNdÂ¤{yß·à_0cÏÌ¹Ì#À¡Ú'BÉ@·?›×€KÏòºffyÍ‚ƒÜÁ5%K†\Ó—±a1d†Y4ôÌ†éÊËû,Ê—EFã?F{Kóð„ñˆwÂÖTŒ1Ïa$gè1C»ß2*pÎùk2°0Zƒ§¸¢á…ESà7k^ôèþµæ59²3¯©õäi9LÅŒ	µC\Ëé	Ùôã-X›«¶|ð4T­‹-$+w¯IëNJD³9>á5‰t<Y—ûÄÝ>E·ƒ5—ç‰{€RJ»¼5ïò¿Ð®ZÑY ÕŠ´UV›@ì<`såì†AÊÅÝDÃ¿,å…‚ÑD3àÝx6—Ó»­óüø#šÓ”r5íò6=º^Ž…¦cPa·rØ„,L‚ÔýÍ[r¶Sàõr;—·õH‘ÚU®˜ã­å¹B±(ß„uqË4®.ðtÚ—7rœr¼ñ{Ö15ÿ;¦µjØËâë6‘¶î“9Ðš¹n92Ù¥8ï“mæ¥òA†3ìgš®'ØaK±’HŒÑ¦µ¹/ràçZd+Lq£&3d‰Xö„Ÿ®ÍRî{ð¿6qú<9b¼ö]Æ[~§Ky¾Iª'sºŽ
N{|ºÛªv¼Î<|çÓ>æ	b[’­uÊé‚)µîó@yü½V&Fôx*0,P\qQì0gBU%† C÷Å)ÕåE˜]2•ÏR~Øvë.é“mb†	EÝ¼0:ªmPz€Ô|8 ˆWðGšð¾$m]å&ÌYªå§BÉuùtÑ±+ÝÈCl!H×zzê/ßƒÝüô^ÌŸüÌ[ù–¼QµªÝŽ-RË¾0œ6&Á`0ÎË¬[|,,$>lÐé>‰„3¯$°¯aÛÉÛ|Š§Ô¿O8AåKFÁT}Q*ˆÕ5õ8œS\ø+‡
ŠÎ S<Ð]síéS+èWxòŠsôqµ2W|#•gÅ›ILjK%Y™µt™Ï¹¾¿ÙgáHSâv¶DX$¨ÑnžµÌŽP®æ~ü>xc´tÕ@Tú…µ
Ã+)ÎéQ{æïÆ¨JßÇš†Mm¤6™GƒoñÂ†û¡¤súè2’¶`LÌ˜nh8 „"æ¹Q£	p!š){Å-H¹yçŠƒ2ma[má¹š{‹„×Ð9žb¾hÙÜ?
Éåã/wñ¶Ž•)ñ“»wÌå;ßq­‡Ó=Àhâs"YdñÞç2¤|”E¨Þµ*\‚â.ÖC/ÀÊ‰?	¿¦Y²ò+®³È‹G½¨Ø*/´¶k3–cð}Ý~®{†Ð9Õ5„ºj8œCÐ·§Ÿ9ýHïÒ¯°nž<a»˜Ý£÷ï=Üßíœíþ¿Ž»‡g§°·ùPéŠ¬2d7œL`Ûgé¶ê¤òÞë±7’¿…øâ³_Á‹/Ÿ<9‡­!ed<EÌ‰9Âv½h@…bíW|œÌ4x!~gð²ïiª¶'léÃ"¨Ã×¾7•Ê‹ð;ðVû·À¿À˜‘Þ˜Òlµ‡ó	5±¢¯i ^èÉÍ&‘»ß$§&ðÐÐ¦X>Ê°mÆ–¾†Á@†óÕ&¦„²:¼ð¢†cß›šÃ;vÑX=+ÿä†…´dóöaû{~Ü‚™HûºJµ_mo> Êi¬ªF‘A¹¡ˆcJ.Zgá*+öX‚²EgåhÂÉÓ$‚BY’y÷¯ðúªÑ+J•ÊK©*j¥7™EKÍÈ§qUjËþŸ•Æ‹Ë0„JEl~ù&ëb.#”)ø}k›¬b›:ù`Âñ*K#CÌž ¿ðb¥õ‹@²4:9”â;5- Þö2}ûT™DK!þ€Vs6ïƒxÄü­_5?|Ñt"‚è,ÐqH ƒ æOëíúcŒëS£CKIƒ†ûÌ~qú|•ÒgÁ°ªÕlP¢®aj5)ç…±Í¢­æZf,4*;Åèr#ã\ž<Ú­¥£Ò{2ù¶Lzƒ-õé8ûŸñ þŠp¦²³…Ï„([AQÆX¨¨8Ž”1wLYÀf¶²ïy«y²™4¸QÉòÅîà‰ªè
[yCbJÝ\ø¤‡vœ.À»ú‰Ö¡Ï`[ºÑ,o7*Fh!yT
9ßàŸt	@7@…ú½wIuì¢Ea¿éQKL@pwšŽ‡WÜZÒ&VeÞ—ÐuµUIS	¥ü°ß¤ÔÍ¹ŽòÞKFPá²ÖlÒ2 W—÷KÅ¢³Â?L…DDé‘Âã&;BšUÖ”dÊ€CÛ”È¤~ô)ìÚsä¸?©÷Î÷èÓô§vLÅÍN$F&Ìú iœøç¬|Ùzwöþ`/øÚûè¬µSCÓ½ÜÙÈ‹w9ÙýQÁ,@)wOg2-/'Ðbý§MRk
gÙcË\›…ä	?1¨ûÂ­†‡Å~¸áœ¾yñ{çì¬{¸×9ÜíþÊéÉ~÷4gPúøµñvÆZ‡mÔ{`V£˜*¼O}Ônÿ:_á¿ù„~;õg S0ü8ê'!ÿz['ñxÏï§ßÿêMç^Dyã÷"ñý=&¨¥-Ï¢`\I›s¬¦ÐPQ›ÔI0¸Ôö½°õa!¿·IµUÍ¶´8t±ÒéX×ÔèËËY6z)gÂÆL“¬1&µIVø_[ªGµˆÁ%j`/–Òž×¤ž	‹m.|–\Í-¸šlK-ÑÒsÁ_à¯5Ö«và7ÊÂ´æ€)ý–~á³&ƒI¡Ú$“ºôŒiløW~úÙ¿‚rYó©ä[’å£Rf1øJŸ\UÔÅ/{s‰Ufxr©ëGß‘w ^&ñZ/¢¯å¢=KQœ/Ö¦ˆÄÿ:ÓÊéó{ª­0ŠÉ&^j¼<: è|¡>Æd	zœ©EzF>=KRF@1V>û}½Ž˜wF	\ÚS‡–VuIÚ7‰r”6>ýtÍºù¿Jun>qRvªOGLmº@?t³Üm“œø}À—²u¾åØz×7™Räâ¶Š²i:£®×1ôeëäcV™ƒ
Ð½çâE^Ø0ˆPU†~sà]Q…få¥ÊT:ã8„†ýéyqÐgSH{Âä ÅÇ=¯ÿYc)O±ic–?.ûs 7Ö%Ï)šrM®2¥|ËÙAŸýõ’ßN·}äÌóm©—¢«‰Í£ÒÌQ¶>_ýÁox•,Îi*T
¦Í=aœÚŸuDJ3ÞÛS‚i§CªŠ‘ƒpô3½aËî¡Ø¿LœÐô˜•SÀ?ï‚áˆ0ÕÔÒ»¦?“nO÷f†}€¥EÖõ  tD\zy‹«51]Þq±Oá’ÊÃ<–µÉÕbìöÚ[Òù¨G]?›ã×în8A[1p%|¸¤õgy‚èYÎ‹t—ÞÃÏÿxÒ²x RÉ»ôîK£|â3@VKx¡¿UHS%L#ˆÉ{§@©t÷¢Œ$]Æ.*WôûlØt$æùi¿¯“òf—¬PÍ¢°ïÇ°¨öOžn„4œ`BlnˆD¬||).wR>«ÐÊ¶‰†•mË°4½Á 8w0ýV°ûælj2+OXr0`oþ¨ZÇ%}âÏñ6!> o)çíc¯1låMcžÔ'!´æhÁl ô«"U}Õa»&ËÄjº†ŠƒùdbmzÀuá#°©!$ãäé°Ó<£Œ^8ÂbSÎ=Uð›P`3ˆ?EîI(ˆãc¯Ö3,ÄDÉ-Kþ5] .ã°5!útu÷ÌŸÌÐâ…”ËkU`ÚæÞ4`ñäÄgF+ r Ôyý«ìí›`Ì‚i˜=éN‡h˜Í }ÅŸ môcõaöë´`Ì#ùõg¯çMc/{Ô‰<¤QrìM¡ËùÔ›’Zçx)¯€ôîXp0gIb
gÞzK¼Ôºññ^á²JŠó˜ÂÊR‘Xêìm`=L§x±QxBÝavÃ)´€P}²+f¿J€A‡›x°‚^‚¿†€ºùÈ»’Çß=–`:óû£i8‡W|RAf#4í‰ÔÎºKU‘
t¥™ìwß±#OÁSöÏ×8Z8c™ßÏQOÄŽ:Q"Íñè
^xc	N,ôÎ÷Æ25Ñê2]ä·!½“àæ*€£aÀäøÙÒåÍ5¬\Bÿ(ë0e	@%.Â¶dò;Ì%À0¬Ê¾ÃðG ‰ª'LBKàâòWtŽ—Ä%oÚÚ-’ØÖK­Ãs<FW$ºU?‘x]~‚UHP‚á²š/û§ÚCP-m…³Ó½†t|l(OæþÉÛÇM-ÕeT`ñô‡Ø[b[á<ˆ_põÊÂÕ[.[á²p	{¬Á!”DšTZ¢)YãŸJqK­·d[¦T»%tG½»Ž¦5¦«jD&e»Þ¦knÊ«TòËãçÊ}¤igtçé\ªÖ¥Q*gÕ3të!ß¹˜>ù|Åbà—{™à‚3è^ú2£\”	¸ë*3Ê)8:äèA|6F é¿©ûÛm™â¿¾C3¼¸Ubl´Ù@_àx
Ê´Vt¸Yãô$aBg²§ÂòàO1~‰"Æ0"ªûu†96ƒzjP×„Þ˜!;ð×‰«m»–_l.ãT*ÎüC¿1s¾óESÝÖÎ{bAýJîe· ¤Ò7ìÀKû
ÏÑâ`¬í‰À‚°Îàýå=†§¨ëŠµFßfÏ¶Q7 ö…§/èrôú Ôúi•QáKÄôéç`F¦á´!Ú (·*ÖU:vYJS9%Ó“u—¿8-i¤mñ.ŠdéºÓ$ºb^5hôñ'Õw…_LæVAþ Uê…QÕÎi¥f’šŸ´†;Â"¬À€Àçê>b¬Aá[N6¥RŽ¥ƒV±ú:ÁcâVuÜ`eúÅÖe+“âÍ¨NOû‘Kš\	}×Àû|°’¢ÊõíÚPñÅ¢eve‰R÷>[dÅÔ²„0ŸÈú"Z3òaÛäƒœ9Hõ”><ò¦¹b0î	¿‰—´FíÇÇ)ÓR&¶Iš¥oLA
ÕZÎTgêOL‡¼lR¬¶>ÏH•’îû“2Ô1ç¨½õ§x£½óþéˆîµbž5ØÝVä4•äA]G¶V8mÓ!PªV˜{^Ï8ÓNJ‹©Ÿ–è  tÇŸ`´:vW€GÅEÈx©´ KÌ˜>Wû9…Y=9OgÈŽj~ž§,ZÌ%./•Šì×meè¥[ûkÊù^ÙÞl’V3]6lý²-ñ?É\)Ì0eæâÜWš AüYÁzZZg¶—¥¸!KNlx„vCê µ'~YüŸ@Ð!bRÇ&Í‰*mã4ý¹x#{a_vÅ¢¿K4óÄå:ÆI]ó½Äƒö¼øjÚ'ê]vXñÂ´\“¤kìøhÙ˜yƒaØBÖFm " Â_VUñþ2÷£«ZV¿N.F~ä×*¢{tŒØÞ®èÞKûÃmëtêÍâQˆ'šÞ…Pe×¾h¢è©R¼	[½äÊv>ûXHÀšV€çñ‡•/
±Œf^»9€Ÿ5EŠ¨S\µÝŠâ“WËšnbD±£s~(K½À=©T:%ò%…ÈíErÚÉ(}I¥tG!›Í O}ÿj~é*T8ö›ð8Œj•.þÃÈ–npØ8‹›@XWÓlÙOÎk©Û†N=š¤?Aws¶îØweÍU½1HZô|ˆúo{:¨îÔèc¹!êub R‡×‡°Ãk< ¿jžGáz&‚6Sgºö{,XS êTkIsgÎÄ‡Ÿéc†YÞÙ‡V´?ª«õMæ™¥4„ƒ4ª±tðzK©®y‰ð^âÕ1›F‘n<êª×,C½ŒÒ¯AôÆ~æu‘i.üò¼(ÜA¨¾z 4>T[°¥VñÏZõ#õñÇRØÕºJ›X³Z#µ)T*VS?­Ë¥"üÚ}9Iî9Ûó½ &ÉÞ`:e/¨Ì†ÆúÍ›´UšØüe_%UÊEEZÕ€1bÃ{ç&õ[BK ã=u1úÈ¬¬3š”6Ù+uâõø×Ì¡p†Úv×äÅ/}Áj‰çTÝ‘<Å4VTEH8A’ô^Ç£ß”¹é°×åVëNÔ}Ô6ýúþ ‰1»eîü®À¬HKÈrõ%çÒ‹yS£Ñ¢ÛÕCì¼IFALA’ÈŸi0ù—BÌÆWÒ¶ÓŠË‘¸ÊL‰¿‹70¸›^l®¶l;DwUé»˜o©<ú&Ê¶mS1^¿¸NüË™/BÑÛyòÿ:±ònä}üµCB8¸ Þ+2¬Jã3êQ°r$ˆ	UeÅ®àbÙ¼ë (¿	;R”{*QÒ’Ãª¤4U¸³”v~HvÝ sù’¤Ø›€m¼2¤ú®Ü„
mZ	ß\.Ðôšc­‰1¹aJ¿•CKËh´âWÙ²*©…*uq)´ÆXíŸd«Š†QòwXøšuCÞ÷x=Æ"¼:…ë^‰á©s½˜:H¡ñgùÄŸxÑga8Æ¬zy¾K&x#QÜì$²b™Ê»/ê‘š0¿Kw0µ{}_ŒSŸD‹¦õ0Ü¯ÍGoW~„?U^«J…TµŠˆ«íþ­»'yñ[ÂNŽÎÑCãäj,n¢ãý¿M²Ñ\Ÿ%/Éˆ§äÅxW/÷Q‘]áß$­Ù%íÖ¬ÐÏKÐ–hv8hÞ=ƒVØe¹Þ0^š{IÐåxHÉ†Å"Ý$ÿq¾qî÷_òø¯f“°/ÉE0@%}"_ý(AQˆEµyÉsBütýåÆ¼¸~Ð[ÖÎ’pö’pºVf¯ÊÛ¡IîþãÅš·ÚÛ¨Þ(ýéšÏ£¦z>õô–¼ÊRz—œ¡3R—È:S ’vÞ	K¯J¡‰Øtvõ‘¹éµ-Þ/ôòÊë«3ªº:Úã§XÑÔÏ²åN>øTsÆícÍú\¤žle=J˜%:Ê”E“ÝÁÝ®ðmƒ^«­ª¾2àa8ÊZ§©íä¤»{t²§§¼RlWPMmÐ'ZÖ
[ótÛÖQë|ýü…mÕY²LŒYk¸ äå‰I3ÒÅÙj1ú¦÷»laâº>bVKÐ³ceŽ¸g»pÂí;
ËÊÀ…Qâ5ÚíÊO×Ê,Ó9¾©Üi8‚ÛL®¯=ó×3Æ‚}ÜØFöi‰‡#5ƒ‘ÞÅ&ËDûmã|%Åÿ£º³£³Î	¤%:¾&Ê2è‡¡¢ÊŽdœLI%ÝyÚiåðŽìZÚ¢á1±Ú
^SVý÷mØ°ªS‚%KÂ–’Åš»`A¡ºf×0Le3q›êžwÛ"ÏÜ…‡ÓA9F‹ÖQ0û÷UYíŠIƒnjÆ6…ÉÆ/˜ pæ	KÀ›Ü…®
x@‹‘4ñá{¨O7Å8Ù½µ*ÍË,[À˜¶Ãæõ“àÍ#$Jm0ÎvzµJŒBäÈ€ø·£F¯5ÍŒ°fÙO÷çýö{lÔ‚jžµÇÄ5m7W{f`Ž|Úô&P-žIvE©äŠ@ÞÄR:m¼<wúOLDhÄÕ`²7Ê•Qf76Ô»™[ŒpG­l–Çá0Äs`?â»i12Úl¸à3Ñ“$„mp«H“§g]µ²ð-!oQl¬VVþò’ˆYÁÌ¢/õL…›D|3û49òöQnÔmí‘‡Fã	g›Ž¿¤DÁBÒPáuÚlþ™‡còÊ­`2$qÔÇí^ú"Ûå¥–Ú#‰ýéVs« n¦‰L_bÂ¥Oý_ž6‰Ÿ3˜[˜ÜÇká/…‹Ô¦^5%Á0÷ºÇÝ=rpôöˆ‘¤–i ×`åÜq+ÈÇ7wÅ}æ@ #?{ógÄþéî»££ƒòèWY¹ŽÒ>€ÎÐ¤¡M1Ñßf–`;ñi(½>*°#Ç#¼Ò9ƒÁÄ9<Zê¶µjôº¬ÚÝiÊ¢[Þê³uTnöü™%Ô$`¤WóÊðbáQ+,°Í­¢‚›Gþo"'?\îTnÈÏ½ùxüRâ÷˜§/VÊ”ÄTkaLÑW´^z,t&zñEHjê ÎL´ê"Jd/°]ýÊ"„Ã­„g™èal‚ä|ìƒ50.-­½_æéMúð…ŒÂ {ó˜ig
Ï9 =õ£*îùÂ!ì[ð¤}ÆR%µÓ7/–ì’\MäìÒ]&üö‹Õž¬º¬d<RÎ:8úyp¡¯¹$¶h1•õÙ¨ý7 ¹¤Š¬5#)XÈJ¥½b
•ÔFú|}ý*Í'‡›¹b¬D‡j&kµÓ$]gü¾É8šJû£&ÿWÜ—øƒæ¯ÉçößÛø=ì¼ïÞ3‚sV¿{D2ÍR›ð0±ìÆû¾ô'Åiçí}£ÔŠ·48ÑÐÿsÓài÷ß™Ó…í_þ¹Qùö¤³×%?“SŒttß¬sQ´Ö
nÒ«•¿aÈ¸hš¢?eYÔ¨ëT¦å(©ÔHCzÃ“{Þn¦”¤ÙÖàŸÝÎÉ7aV“EôÁ"BÖv!Š>ôÉt8FfÓë<!µ÷ [Áï:Á`^2]‹Fî`"ìBÙâÁ4hÆ^³3œñ²9R–«}‚ÐÍ›ØP¶š«ë’:Éô7Yášå\NÃ¤Á:g·î3o¶}ÁLÅ1s]I-œu¦µÃ[Ñ2bj+æ%ñ(¼ˆéNÎëÁN.a[fBÃ½
çépŠF^°Á
¦°¥ÞnSAZ1øùP þwaÒá_èiS¹ÑHn_©{O³¨T_øóC“ý£¾ 8ñÀÁ¯? ñ$$Ÿ§á™`O^/œ'Ü ¯‹ÑÈÝk:ùý²˜sE²œ¥¤³®Må†ª8—â'Òf•g”6ÛžÍ3HçTÆÎÄ&m„mÕBÌÂ¸#jµõ«N[­g¦ÓÚuR¾î±ÈïÊ>T?ÄÖ,#F~cÅ« ë[û’²ˆ[ŒEÏ<€yÄú2Ð°æž©Í=[{¾¶ÍÕN$Ôà{0›BÃGÍÙ •Tè‰{A¥GKïJÑí'7ã®Ôã§7,É2%~0óÆß—òdM Õdl=Úaâ,®Â@ÞÎA6€“*IáPM*÷lÄ°Iú¶n7)Áž™×•pÁÅ3Ô/¦“‡åœÐ½¬øØ~ºÆÔSËŠ‡/sv¼ù‹d,ZµübËN,žvÛæPÊ*š}P{¼Øí¤jõ6ŒóF1(t#^¦ªU›ËÑË†ì5–k¯¯­I£h™Êkiuu­µ.ùã}ÑM¨æÊqxà”]PBA†é½”)×V„/º]œßó€&Ï‰P›uµKUÓµÓ+—Â´t	rÐÔÞ²ì9,eÉ]d8Á¡$b?X©ìü<íÅ³—<—‰H$u½o”ï½œîû¬B»°Ñmƒ.#vczÀð èåÖÔÅGø‡Ä’nmÈÆ;žËºŽÕi1÷ŒÒ¢ëÜƒ¶£“AªÖgìsÍ¹,›T´†»¢™ÖBí9ÏâQ^Åý·œø{Òhäê±·0;‰J›'Ò†¦ý¹e¨ívb%Ç`Ë]áõíLËb5`S¾‹ÎUÀi[<ó¦€l€ë?°Ø¾“È${ –Üc×Ï›,Ó¥ý}Š²uªrœÖûÁ	É¿%'d?,øNôÆIÐÏ¬¥äŒÒºä]ˆ7õQ8çôæ.ÙÆëöŠ>ˆ÷§‹òŸz7ãvyìŠyU0*tŒ<šc”?¬åö ›/#ßä“:À+Ü¼&
¹…|Ð¼æ7Øcì1È6~­YZ0n¿NxìXZ™ÆwÅxŠ êÀ?÷æcŒ­x-ÒUÇátXU"t¦ñÐôÛ‹,ì­ëO¤«A<Ð®µ€D¢5‘:/YC^8KÊ³RµEÛQf‘ÃÚÇÖk°Ç^Õge§l…Q«½;òû˜à&‚ ²ä{aA)ú0,]
«í4æ†Áø–Ž´1* ÙÍò·Q8Ÿ©)µÜY½ô;ÆÈRqmýh†<Ã›êø>Ë{‘%x¥éh²fùcµ¾5Mêý+¾˜“t‚‡7ö¸wéÅö~¿NxX8{òºu–B¨d‹MŸW-R/§êyÑèŒåÚ$0ª©ÞEü{ÿ««MýFC·YÆöß6H#R¤áÑˆ¹FªKûZ’†Û2Bi¼ßÇË·ð¼rkÄ xs—w”N#s)ñROð\œFãâ3åÅ”(è¥émš]•¿µ†:äkÎé~ÐYµ"^ç™…C„—^ùÐ=žà‰1Uµ«Fûjž&µ¥Oøäj,;b¶¨ä_R[=•:Ý¢å,±’Ú¬H}´`›O³lWöÁãQnµYQ‰NîR«g°»~JÝÿ¶èrT7•.PgbéÒÎ½;mx“¢Ä†#¶C‘ ªu–û¿&¸Ôú/¦A×%‰ÍzAl—ÂˆzåèÆÂ£xÃ–3þgËzØvn›…W…WÍÂk65Á^{¨,Þ”…MÝ¦D@S­ú/(¨lùäÙ‡Æ™•Ô¤^øjÒswB{Ìy$…†iˆoÂH$ŽÿêÕ´ñ‡óI.´Š’`I¯*î8YÐ+È~¥Q‘‡x£A`Ëùž×‹ï’Û$`ÁL¹qËüçrß¶\æÐ—*£Èl(&%ýt/ÆXÉ›ü ~ê;ËLC{ëÊƒNúQxñz¸‹‘ÆØ‘› xE>-@ã“\y“åÓýióÈÚŽÖXÔzóå“oÄÊë%ÞþÓu6ŠÓÍEâj®¦îãækîåA¬˜ÌÍï“4R#‹êùÉ	ð˜Ö“ÙQ­e¬“ûºãZ«•ùÔ¾´P&Xn´J‘'•$¦U HÆh=o @ŠÄÆ ­­‚¼¡ì[Aß^,$Ê†ëR§ã™ãÆDë¼™^z~«½Ú/2FY\|©õâ•b£-ï(öË‚+dStZ[,AiþÄMé¤]6|¼Ê·j¤†ü%Xž—SgN£Éà÷á”ÝãØOà	0Iö’ôä=5žtfÑbîoµÍ:k£:µØ:kÿXg?ÖÙ÷_gj¬aû:[}4ëlw"‹­³ÕëìÇ:{èuVz¡-ª{æ¢µ·öhÖÞìãÖžf€Áê«qíÇjü±b5¦_——	˜Í\âºOh»nXžRÜò,hF–ua©éÅ$%_±ÄW=‹ˆÜ5hð{©ÈTêÐe]&ÜMe‡Yqt<KëMuÖ´©·±à<ì€-+Í˜IYa<‚Aæ°¹ï<[Åþùàœ@·A®Oåƒ]ÅX ê¢äA­Õù˜Öˆe ”/LÇ^Ìx	-µMž¯¿üfÛMçŒCF£>¯=ßXÎ¢>÷^´ú­~õ†GËJwNO»{´Ð›Îþ|5èé»Ñ£<H‘Íx@jRvqšàx¡³ýì\WlãÔ7=vÅg6WƒŒDúâÌÆÌÊuÕs¹V;·VÛQk5·Öª£çÀvúî®¾¦áàÇÒ4€³€š#S>ó…ÝšG ÆÓâ“üØO?¡™]—=‘[¶œ„¸šwœˆˆ×·;‘`)w2bƒ®Ä	‰­šå¤„Sr\—8Rph³ºº¢Åh¼.„©¬ÁÊÕ™¹*E(JœöC1¹·1€¦uîîM¢ºÀk}çiƒI+7ˆÓ*üÝâ2ßBLÓ!¦ùî»!Äe¿+ƒû²±Ø‘dÚY¾’\†’†šzØ÷kžëwÒ mŽ¬Jò‘·ÇÂS‘{˜z5Å  f¼ÓSð’3Rçë9çÚòg‚zï}âl9–|ÛÂB»&ÞoiPÈ^,ÙnR^Ó*qI›8i²5½ëvú–†Z…š¿#Çþè2qdˆ0c¢}Ðº–§7Ìî-jAl[C®]¬4Ê‚í÷™XëDúkþ3i¹½hõZ=k$F?fõF]þ÷Ê™Ïs´'ŠÈÁ]ééÌ›îC–\ÞT”0.Z*v6I[´”ëÈ›ï¿+â•êH.séÝ¾÷×Ûîa÷¤s@:¿Á?o»ZÌÍ×XÁe™s#ýrÝO×	"”½}•KXï½ºLï&Ð$Êx·Ÿ^ÛéÂeªù¾K¯2Ø¦:åÕBúK!VÞ´¤ô‰BiJÐ¢¤œ™FÆ5#Akô~™->›=<ÌI÷øèäŒ’ƒnçäpÿð-9>9z{Ò==%Ã=‚\áôô}÷ðÌ)&/m™™´ìAH>u$wÐ§Æ¥J¶d¤7`‘×ËŠ˜ˆäÖ‰|ÏÌÃôÓµJtiò³Ã¹5ÿÙ] Å¿Ys…svŽGÊ‚ Z’]9“Ý3èëƒNÏ-éÉ(UÓ,I±îÂg+‹BÈqtÈŒ+¨êÂ2u—ÔEöF.¯ÝhUøç›ùxÌ¶vx„1é¯(û¤ùXÃ(€áÒ«ó
#º€—Øá^Ø—9Ð9Òåd<7Ãíê<šnÆý7n ”Q‡ç	àg²žŸ}ŸÿSUmß¬úE‰ê„­òvu”$³Íåå‹‹‹æÅj3Œ†Ëg'Ë'ÝÝ¸¶RMÑ¢áxâ'éðVe²]™'ç…×!7Ý9}óB‰^~àMqß›!­ÑY…§ÆØŸLâ¼ø(½P•é¿ØDŒBçœ_£Ù‹M”"ôJs²µÌéEþ+';­•,@¿ëöÂÃ09‚=Ì¸ê›0z!>,…]€l-+ o=ýàOÁùÇFCzHW–ÜÞÿš¡å@µ
1¦Þ~ñ|2!íÖÊd¢1 U¬Õ¨¸²@³V˜Ç¹_i®Só¯ëB‹5j=>ø@
7Ða×›)è®põk©@=÷&Áø
ôÿ]àg½(¨ÖIµÞ¾Ä [@Á¹~¼ÅXgŽöñ½Ô€äüS{îŽ»¯U ÷9H3$xV²áþ{ƒvà_zýÄ5lÊæ@¾ÓÆ0†®b@Ž:¡‚åŒ9a)ÆÃ84Aûn Ì‰¬ÌW‘È^$o‰>7(vÔË7QÃÁÁÚÑƒÉfl-Š¬?míµ-œ…«gÚÄ-ºfÇHöœÎ+?„’²\=?ßèoÈÓ`‚ŒÜ›:'¢©¨Ò¶%rvèómª´Êk·:k]{ü^¦mtRDOí§•r PËRVB	ÛÞ§!~”—ö„.¤¢Ä`¹tÐµ™Ö£°ëWöµ°¦Ãkœ.2wšŽ—‡ÅgzÇ–l$¹< Ûv=33µß¼ñÐreU»pvm}ºí8v¹tÞzÞöšAmsY’h,û€Å×t>Æ\|¾ c¥Æ³ªÇáëZµrà¯b0ù)ÿÄ/j.Ixç=}Áë¢
‡âdë·£{¡ƒ³KXí÷ë~ËŠ5%ZÞ6Ð®…]µ"mkYÑí·–å½Ó––ÿR2E	EUÌ;#rÜyÛ%-R;ë¼>è’£7¤Mv~}xºDäM…nˆJµ¢Ô´(³BÃdæ‰•:?è¾9Û$G¯O»'¿u÷Èoƒ_»§äg"eÑTAam,B“ÒA±eKí¥\è¯<[ž-ÞËûxÖíì¾ëž ß£%ï6¼ï;';µ†âÊ1îå„h+•…R‹ý,÷¨Û
•iÊ±Š ®ÿzü7­óEÌ>ÏìFA93“ÙÁßkŸ•Ýp2¡Ž˜©°»SKLñÜ…|[
xñùé:ìÁ†ð«?øf¡PLJóöFŒŒŠYËjæ[3€žä¬Ü“ý·ï`éîý4OŸíuO÷ßæ¯×tÿ‘»`ÓÝ†u½í*ìÁõÔÌ²öájOô$ÃJðjú¬—®jèE¾÷¹ÑóA¶ÀzðÆÞUü†î{?>zIw¡¬ºï¦ÑÁØ3	ü‰•O·ï›O«üŒÔµœ»Í9÷^·ƒ³¯Îÿ%H³_Oº§u²Û=9Û³¿Û9£ŸtOß Á|¦þÓu^¦@[,€Îng¯û~7;ÑaóôH—y„u‡¥=PRFª–o´ùZß{áÅtz˜)ýˆ¿aîÞ8ìñh‡¯ákíCõÿÌÏýóó*ùE¶~¬Kº#[QUCH±´ªË“¿6ejR®ò
™ëráqÞ¯'Í>,ÆÄ?¢Îãð»†Àh…1wü€ÛhyùîØÇ_µª—Å)ôš£È?‡²Ðxöl F¾M>å%ûkFþlìõýÚòÿ‰YÖIõ÷êÒÍï§o^üþ¾sÿ½…¦úé¡z
N@Ð ü}	Õ<	 > çsæ¦VŠüIøÕ×+!N"ÿkøYÂ	ˆ¿¿!}²æGRÜJDS›+xFµ
=Îè^R³}mVê+ð6žk†^Ÿ–ì^öiT°šäYŸ€|î…!FküÇÁé?šó$ÇM|ò;Œœ	ºžÐÐû>B•å÷?úð–6tâM‡~Zè	'ÕÝp<ŸLcX¬Ñ¼O3‹ô¨ÓZ8M‹¥sƒP>' i(Ý{—¼ì{/5ág-m N0ÿ.¬µN*¬1ÂTà§û~¡W(¤æ-Š¸M|2è­}ÿg¸:`ÌÙâAuîJ)˜4O²‹3G8ÛÊ‹^aÌPà@Uò©²ýJ9œ,¨7„’,ræKÄè;ÿ’m{@§KF˜÷ªúÕ´4}cVÀs1T8Ùû´4ªŸ¯Ä%©KÊÏF°*Jí¡C«-ý2çhfÊs¶PwÍø¢r§C\–¢çÆ"L(^ î¬ÿªÊ'ðª,Š}l5…îëfZA¢°ø™Ïƒ)½ÎTÁôð¢žVfÏ x]RW¢8åhš¿÷eÔ»Fn*{ntôß$~&Q©K¯âm
ri"¢ÐÖŠ\)g“<}*Jáoù½È—•`OÒ"7u•¦©ðÂ(øfKgÀÐ¢MM £Âè1FuˆÊ’†¡›i9ùíEäÍÎ@÷g©ì2ÐÌR'L%CÙŸ’"¼‰øeïí$ö2¨éã”¯ÍS¯.eR_/w“¶ƒ©H•m@ö†ÊdÏp?MÏ¨­Ð=’‚ skSPohM†¿|Ð²Ê—®K\VŽ.J'ž¸Ú@K¤è×Üy†ÿU(ûØEÞ¬~Ì' {W¼¨³'ièTE¾«©’Œ‚)¯¾‚Ž¬ã™ž	ûrç˜UdœõÄ^}eÿÝ2¦8Þ¶6×¿©žCœM6c|û*3‚òûXü=W2ÁüÎÏ`¾’•faÊâOfÉ­§†Á"j¨ŠÁßáý!ÊKh«	uÙÙL¿Üw
’OK9¼Å‹ËÄ‹¯góxTËdr­RÁhÛ æêa2—–2´(ƒ‡v,Ç­,yíM§œˆy8¾•}ŒL‘*=¾—JÔnd˜NºÇ¿¾>€=nÑÞuÉñ»ýƒýããýÃî)9<2Æ:ÇmuÂ÷")7¿Þ´Þ¬¿yÃáJ–ŠäZ5¹ÊÃÇ›‚Jq­ðÇL-cÊ(Im²ñ•m’tþóÇBjÒœªE­bì´tììuac{†6=ÄOwïWØÍîº0Óra¦Ûîn¼YÉÁL« 3­|Ì´ì˜i•ÂLJ@Ü”P7ÅîIõ4ÛÕrÆÝÎÉ©Ád	Ú9ý'q%Ú¥I
n>)˜m#¿­!?Ëí6GnëÍZ÷ùFÆ*oè§bL†ýíô·óÑß¶£¿]€~XË§èŽ ,bö„ï©lM€FewÆ§~Œlo´‡Qö¡Ùlò?JP½÷âþ»ÿYæš%VÑ,
NÞÒå$¸¼eFb‡÷ÝMc5±Yí¶_¬¾¶Íª`C0¨ºÙzÎ–Z	CãbnöVó0{ÅNï" Í8šªÙ*^¨\Kk!.ìËFšéüõ#Ì]H³Œcµä•$=_eˆ¯)ÍìY®ÅuG‹lëLkÏêòB]Ò:‚)zb¥ò¶ƒÊO»ÿÀœ ÝÃ½îÉMnì_jÁ•”)- éÎÛû^{.tð[ ·'½.9èþÖ=¸o€Ì¯È'Z)_ÙÛŒ ì»hˆ© *gÑêluÕEp»ïŽŽ‚§ªr—ÜÈîa9é)æ*8ºwnÊ0]tèE³Z–bVçªƒq®º'O*Eù§•ÌÖd¶·ÿÛþéÃ¡x Ý3œÞÂNºo¾ÈÞ:¾L÷÷t‘îî•N×ÊÒéš]¹-¥vfÙ¼øjH¤)Î¯ØËýéÀ/`™¢Âu427¾%/fåìöè„µWVŸ?[3'Ì¹ÝPàÊG¬R4—X°cnI\…r÷‡j¥8O©G,vNº¦F™KÙ:¢­¿†Á
¾ÐtGðt3~þòKfjÑ€3Œ.ŸÎº'ïiëO‹Â$O÷Sy³Ø9 T•qŒþÙ³õU;™ðž
ûànEcw)—ywå‘¶®Z,MŸŠ$Pô¦cY 2š2Ó9‰¿o™Íš-=yt$a+HÁö 	ØM¿&¬…Åù¶Œ¡9fF	Q&×­e&Ür¦ÛJiEd³H¶­{ÌµõP™¶î?ÏÖƒfÙRfB[ÑÎ[Œ<Ø­pà	’À2ž–Â¦ó4qt(q8n_øp6¹Ý
¹BÏÎ5AÂ?)Ô.ó½jèf
õ„:Aà-|¹1Å»Fã½i7:×UP˜¯äðÊ§Ó†Õö†K‡š =—1ÆUc€ZD‡/,	Öb„ì	´x !‘KsÄ)—zK®Q6Ï‘RIˆ>”%Ú0ô˜ÆFi:+ÀÔ•÷Cí-žp¢ÛÌœ”Ãzº&ôZ âÓÀÜiÁtÉ|LGÉç+C[FîßBµbô_äD”©wD˜±¨–ärô˜rð¶9Â N’Ï
aö¼ÖõÝ Üz€Sf2äS<%n“‡3Òcpæ‚ÅCrZaS™¤Pü^¬uV_oÜèF¤©|X‡×ˆûN”FUÊ¡oÑ•àeFàÇ­$µÈÒt1ÊQ¤s£HçÁÅ­•îî›½7ëª=Cï®ähqœÊáù½ãSïá.ØHƒAUX0(ê­Ä‚AÆgD©ÅBQÑZ¯_´v[»Š*tÏ(tl­*‹}«È”¶EöØÕ·‰\Í7(ðÞ¦ÊÃÇßXšiÐ[Sp«KÅª{*ªç"æÜ/¹‘¯¿˜ÂNª"|Ž;ýEkW¯v‰RÖ7EpiQZšé‹M—¡_,ñNÐÜZ‚æ‚Óeí£ÿ%³¼¾p¶\zPÚºå<±_¤•EÊjL‚WµïiT&Á‹ÊXó’Ý$ôp¨ªax‘(¨ßL¨Ë½}ªlH9üTã»ÝöL ¹~'+*…0oË[ÖNº€äuuz/*Œ0tß¬î>Wò½Œµ8*«£›¬¸u¢ß¼é®uŸI]¿xÑzÝzMt«ÄP,á'Ëk¶Ê6ÅCÅ”©Êiüì>°~Ÿtj,Ïœx]¢åÌå´LþèÖrL£¼Ê8‘Ëu¬ÔéÚ¿NJØ}RÆHæ£½¸ôÙ”µ«¹®Bßû!š  D©Ü™PÇmN‡å}îYZ>.ôêÈŠ:Ä_Ýò4MoH¼Ò|Ëã$YÊ˜³Rê8)+Wnfb«{ƒùÚ1/‹ÈÂ4·yÎäe/I0TTµ,½â#×xE„ÃÔ‘rÓûUóÃ—ð‡ÁÛêGz¼S¥™é˜p´Ü4Š]¶ÉO<¤¤ëôÍÆ›Î›]«·lÝÖÞH’\29ü4[J5Êp3Ó‹¢bgIöEW*qpE{NZ(}ç°vg,U¡"é¹I>LbÜ–çfw÷WZ/IÊ;2$‰•ÙJ¡2Nº»G'¦P¿³«ï¹@ÚñRùòN°Eè™ïóÝ² Ì[DCÎû£Ã³wÀåÞwÏNöwfrÎK˜Â
AÍ²ýA‡ËÐV˜AcN“Z¸Ù‰vms‹ä»(—Up„;A •³£³ÎÁm½LJQz+¤¥´¬×0Ç´=ï*Æ¥)Í8ólÂ|;%å0l’ð\®mgww™asŸï±¡è½7ûÀ¦ú³EYøJv€˜¡ÍY~ÓÖÎðšpÜŒíÖv÷Í^Ç=UJ'ùó¤•&‰ÎÎqäÇh_Wgi ¯ø÷4ÉõµyºËÌd·¾ée2*\³êÚt¸ÞÓ•IK\“‘²ªLòÈ4&)ˆ_½égq·†Ð4y;”
–d;ÊMŠöE5av+BP;Í§µ¬N
žƒØ‹B`…l½Þ;Ux=+Q¤c-G¬•”$
8ÃBôáÝš>Ò>‹É#-z‹]ji•ê”TÆaÐ5ª8ž&^Ä‰-G‚‚ÔåÄm”;>Á‹Ý=òúŸ¤¶{ÐAŸÐ½ßöO»'K¦×®õ| þp.î‡]n0²ÚññÉÑo|TÇ'û‡»ûÇƒû‘]}”0] g²‚¹J¤4Ç¦©¿”VÊ5·š×Üº¬ƒÓ*×RÀ¯üÝìùKá’(½I}³e*Å Ìý`æåºT£ÊÄ’Ç±–Ðççèœk>YS*Åc+±“â50óõPÃ›í	Ñ¸{9i^àºæEÁ²DŠ^X¹tŸXˆöÓZ.úO¬›û0(vRß3ÝÅÀW¤Ã(6dü|“œù ­)º-çr<È§áø8è«Â]‰ËäXÛ½ÅIZÕ…”ÅË-@«E„µz+ÂZ-"¬U“°PÌû	æÁø|ŸÞJša_áp‘¾V"Ay¡÷{þNßÔ^8Ài••§ø
Æ{b_³Î°u‹ˆlR¿ ä¾c/Í°R©¡1bÖÃ•—ìÛ–¡Ðç²Ý“xÙU-”ïN z4»„yX×¹˜i(Î÷Êéc{»T“ôøæ¥¦µ™Íí`4«ŸæÛ&ÏË@›5Íôk2wÌ ß(x»àØœíˆÌô½v"¿RTeý,‹Ijj!o¸6ø~!­<õ×še‘:ÐÃš¢<I½TP˜gqdoÌñ“ì¯¼±]ŒYËŠ˜¹è,ëŸ
 à;0šui¤£.Ê>³þ÷a‰qö	?ô5Ø§HÌLm{F-ºÿ/   ÿÿì}ëZI²àÿ~ŠjMÏ º‘Ðc°ƒp³_> {Î·]Hª±¤’U%ÍÑ÷í³ì£í“lDdfU^«J cw4ãFªÊKdddDddd%óA‡ãu&Öœa½Ùf~³)éXÌ«ÙLùB0­KhÚÁ¯Ñ¢‡í
æJ±ùÀøLèñöXœAÎjE\¾µ¬™5¯‚){(G^çËR÷TwŒØ?¤ˆÐé+¿‰Æ¼Ëi˜á0 ú€aYï¿aï¿ýp£u9¯_ã«ÔŒpàûÃ€’ÿPÆ![@Â0>ûì†ÆŽh6©,ôßŠˆ5ŠžYofÉŠ!+·RnÂË°!Ñöái4#w0h¿Æ½®™ŸsÚ1°cÑ"/¿º
>æHý€«OX˜üZµÔ×N°F|r¨*hÔG6Î?§AöP"RÃð€ÞÕÒ£mB­Wtcb'…®~ŽûÕj/sçë1‹[5Ø±â,+š‘Š¨ôz˜(Z§¬„x’ÖÈ®ê—¦sàÇ{©	W…RÆ§ˆþô“½¤“¥ÆXEy/eY.¾e:Þó+MçE‡¦†ÜO-gÑ–^´í,ÚÖ‹vl-íu;xPÙPë—»ª¡TQœãÂûdÇÅèAž{˜œ¨O¨¨HÏÓ«uçþPúÏŸ¢NžR…
ÀMP0R?ˆ¦"Æ&×d@­y<g_”K¹õÀzÑüù *µJ6°¹Ò·q!·îƒåjÏ²çÇÛe¡Nû´ez†~Â¹	*VÄ™Å¡?SÅ5½eoÉu@KyÁÂ"Ò¡¾Ü@ÚñsÏQŸ§S±DÔ¯(ùKñ’Í_a»… 4\m±Ä;ä™UÉ…ý$'‚–Bþÿp“dž›ë¶ ÛíåÖìŽÄ¡?Ü˜·¦Œ”È?Ü˜9b™éKKîŠ9‚Ètí†VÍ ‚`*Œ¨Ú\eŒÏdÕOMdÇè¥Q3“;1€Z9 µé; ÂP7++óE‘Ý÷ïÙíœ±µQJ9‘&~Í¤U~²ìÛÙÉ²ÃÅa
¤‰uóÉRàTùËLwáÎ XÑ‘W­w*ðsW¢Ä§„C±She-X.ëÈ¯o#¶Ø'GxAŸÆh´[ÁrçjJJ[Y@½£úuUÉ¬¯†/@OEyËÍ$o
Ó1_žzðgZÉˆmý­tä õ’&î£nÀ;¦‹>léábTdÏï¾Õµ¤\bãã¸ÕT#ê´rë´¬uÚ¹uÚÖ:®=‘£u_$5”nŽxE²$e53½?EºMV¦ßé©ÜKË€ÙFÞˆ”R†s !š|d¹y‚:”¥éÅ;‹¿“þw›!Ø9ŸêÒ:a¯@)¼G(sÅ^®¦ˆSK)==vñž£Eö
ÔH6È;ª’·‡<Gµì•Ñ-Ý3÷E`ÛÓÚðÙËR9áùÜª`a3ˆ ñ·R)Nht#¿‹vd¢©çíB —¿žÐéƒd1q]ÀF°q©–ùêÙiïâN6¸Ð|>*²Jh7MUÞZ-cåÙ”x[:¸5ï^Â`îÌR¥fõqé¿oI¶Ý”o¼¢‡/Ž»ó4Ö®æì›¼®5­|)c+Ç¨6‹F-~•gRò`2ÆôAa;S:¶ÃÃ·ŸO_y'ù~ÿÍÞé?ßv=9ÍÜ¶úCI¼¹My\Ÿá‘¤téÕ¼¼Dl(Z©ZÖŒ’?g¹ì1Ó[ue$“xk}Q×/¢èv•“óÿŒÖ{qÜz~îÂáõÎ!bëxÜß;Àâ6àß#ø÷þmÂ?`{ã'F;ñ¥?YQö Ç¬“ÚF’ÍÓnÇúã~Üƒ}˜ºÃciµ=ˆ,2~4RK_áäõ¤y‘™1‹œ-3.,JðÊš_ÇI0ªÍÂ5¯†û‚{o€kq0ÏUÈ3Q±…	Xm`\|0‚/²”ìZ{2çìc˜ÔÐ0aR©æ÷ÿ=‹AW~/ñ¾gSíõLßÖPRb3/&u<+dëÉãÑHíjÀåb«ÙÐ_¥ã²½J³”úçHx"I©Šh¹ VQ_szÜòÎ‡–ÈúÂŸØºÅëäçCL­3û° 4 ¢8DÇ˜-Xæ Q tâP«À°å5KCˆOjýpÊ|q¶¸„·”'µô@ÔüæÈM¯bïFežÀ{ÍbñH-öÄ^3ª›M{Éá…V®m”£·¨¡Š’ªÖj)‹ËJ/LJ™R6•P4G¢˜031$ji²I)~Y;Ç|y7ž’ÍV)¢eËN:­ù³åš”×´Î¤KÇm_&e¸;pˆ¥«d°f}Ü78²]ÊÛ¹€‘mÞHqmrëìôO«;ÇA-]õ–#Y½cx6Á Ó’ƒÝë§¦nîð™„¥p+BæÿvñMcØ|vQ‡›ÅL‰r²qq5¥†¸²‚‘åjÏ›À”ÃçN _"N>Ä½ŽPdß‰Š6Pb )§—n6r†æmÌvü¥!l9 “±é‚q{]Ñõ¶×e…r[Í»N	¢O~îvO½¦We©ÒÕ,ÝÛýð³HM"_=]Çú,»7Ï°ýæÅI÷ïëüº{ôK÷oðd¾µôßRÓrni¾j{ƒô=ŠoÓ<h‹¦%y²ôŠÅÔL³ž)_ð?XWè]°
R€Díó\AE`>Ú¦yGN„.s¡Ü\è)D–tè¬Yu/!¿™–BO‘+ˆÌx- p ²¤ó’ávv|TÎƒkÜpÃnfp‹ÆÁQy¶Ç¢SÄ^ê£êj[·9¥Oí(ÝNÔ…•}~¸A¯¥ø4:D—”í“í‘}‰Ða«É£o,?f‡úá'w¦q\ #µ—	©°á Ñ¬J_Y’«¤¦dÉÛ+áSd¥ÂoYèÉéG •ÝQ »}Ý·Òc&zW ]R+ì7Ê­ü…eI¥ÉyÒñÛg›+sÛˆ4”ÒiN_.¤vrÆÏÛÏWëÿŽÂqˆÁ<û‡¶lÄ‘c=ûNŽ2Âˆú¡É*òÀ²²îÊÉ‰‹ß—ÐÛ˜8.uÃ×v‚”Ëï|ÎÁÉÙ[‹}ÚÎªç±jÞ“)r¨Ê+tmv³b† ‡ƒ„üá~ÙØZüâ×Ù0ãLÌ6+²ÆQŸ)”mŸâkõEÀx
 ïr¸ÆUësº÷®†7?s‹fÎ;ß0ÂÁu¬tµZª,Yf‚àÀ)Á›Œ¾
`Éûyºr|Î;‚Œ¯·<û­s7Ìº“…ú‘¦ˆM3+˜`´Îhñ²Y¹Y—é4PtŒgZ£ò"w’ÎWÎ—#äDj¤cÌÉm±ž?7BêëÒ¥â°·ÎIbRRáá0=•gF#YÝòålIÄ÷¯Ä¹ÉbÜð£èrˆÏëÃz˜üÃç–ÂúöxæaPîŽåbÖ£µÇ,É‹WRÁÆözè­&%?²‚J*RCÞpªÈcŒ_Š`4ØÌÐ9÷N?,NÊƒ|,¡nlŸrÔã"9Î7L)þ-)Å¡äóWLÑ×_à)¶UÝECåÈ·ïÇƒÀ<óm¶JhóÍP)‡=ë ¥K¦ûxÝ÷u”x{Ñø<¼˜áG¼ëÈo›ÁíuëæåƒéÜ¢•ã6µãÃ—?ŸnÁ¯_»Ç™çö»'‡/_—´¤‰ÝZ?¸¥ÌÃc¾ðüº‹-¡UãõóÚY\ÁØbI“Ú–Ž>Ò>Ã©Í%€zØe‚#æšÎæ:ÒN.Û´ÑÌiÔ@¡ÅÒZµ`úÁ¤Û?Š."rÙG^<í¡*¾È”h±»~´!Û§èGD*{í<D(\?tyëäÌñA¢~†f±h”óâÞÛ}ÛÝ÷ŽÞ¼|ÃÅ (6BFœ¶!fo¾Ù1òä²¹ƒt¬/™8³³¼LvY ¥ãÊa «ZCÒg,‡ 9&³3`!ãaïí †“I8âEú·š$6$Ñi¤H­Áøš¼ª˜b?˜øÓ„¬{ ^·?ëùÈ—n‡øZWq‹Û•ÔìÁd|½¾»2÷þßÿù¿cÉ³·€		ÃŠ·v*úh#ðÙ18Fåâ•Š©GäYîïBàr¡-mx¢îbºß”íS-f jr•Nzs#Ùà™}ÇÊõ(µm÷xå$ËÌ³ïíï—[_¦lÒ#aê´T|:AF0Ûù†À ÆzšsVm¹l“ÛqšÖw4Ö­r  ûw2'€nJ—”‹¨GÇ¯·Üú×íºÖ]K1Þ’°ó4X<FÂp:Vƒ80¿12µÑòp:“»õÄ{Äµ»¸°ï½ù×‚ó}ñþ@8Ý½¸7”ÊÄ‰ŽH<	®¾L6õÇC%šñ7xê›@+ƒ)Ó(²œÜsòÁÏ—Á¾]tóp€¸£½×oì§eÝl:ì®-¶öÓæÓâ>0­»ùÀ¼m›ù›·×=>=<8ÜÛ=ízo¼ÓãÝ×'°•ÿbŽ0·ÛÞ+š¬jL1vNªG]{C¢:eµªzÓ¬(:GIMŽ1©_[Ð|rµáv‡gjÝ^ŸXûTôQµúé Œ¹›¾×C‡z¼ÃÓ®Ï?ƒ]_rMÉÆ'ÓèbÄ±wÍ¦^öƒ}ŒµWÇ^?¤x7°'b¼0¼1 aÎÃØ»Äx;ðzZ€ŠÕÃðŸÉó¢¾ ÄˆrÀcébÓ½hXùÀÂ¯ý ¡“$ò>Ž£Ko„=úgÑ,‘à_‰ÓQÙÁøŠº²KÛ°ÙtZ®céÛ3IqÎøÈ Ôf[,¦bsÁyä3â'²7GSì]«ŽXË++Z¦×NVs1ËÈc—éA	†›Ók))ÂgeSŸóÂÕŸjRKÁþŠsì|‹Ù.Ö%-h Êµ³lff–ò®<MÛaóÃÄH¼9a‚*¸’íw™³¾û…Ã¿Ðí›çÐçlË‡ê‡ GîˆE4™ÿUZcN.ÍsÉ5–. Íü6Éö-ö=b¾˜c£a7ŠA¡¹d´ºª)ËÃžÖdW•\Û¸yY]xÞ¶h`NÞòX_ºMÝU1Y8¹kßÃm”oý)©È¥tá#âÈIºà:YÊ±Òz¶#+óñ6nv^²‡.Ÿça•Fçž£êâ!V•¯-í¨2†Wy¶Û…IôQÁ£é–·^aeW•BÍé9\8&þ3“@'ŸÅ“§ÛëØð³t/~«Ž6Êw´€B¼áÀNx:ÐÑ-¢*¦S‰»áŠ¹…Ýa_\›~ôeg«OŸÝÐàçy_\ÇÚTt¬ÖPœMFñ¨nžà…Ìøv5ç?Ò¬~1ÍyY“ü•eý±[¸¢súÑÑîéá›×(]»G‡/_žþsk;vÙtî*y—¥Ã3òÜCOžáÎ‡é€œ¤³ä€¸•îÉáð–‚ññã–ß®—Gw¿xíÐ=õ`ìpº–[ÊÙg4[9·„þˆŒæžÙŒ‹¸sÎöùŽh©/Á~÷t÷ðèä~hFl‚Eïp1Óv¼Éï ™žx¹:õÄÀ‚JlQ§÷¨xóš¹[¾~™ah÷õ¾·{r_ñú§ý[]Ñ#¾ë)¯½RÑ½Ê\ç´Ü¯<VðÝià»ï ¸lwI8›h·z%nM”k»Ã†NÑ,Ù¾¡ÔåÓœù5½û»njÆ2[ü
Ÿü(ÿðŒ…‚’k\†ã>Ìj4F>^`=Ÿ‰•Võ²qœ†£ š%Ug™´9ŠUSÕn)Í×¼öFC¶ÿT‚Un{]3,Á4ê÷Ü¦>0bÓkU5Ž“”h…»ŽW©Úö(Žpb»ŽÃ$ô‡;77^„þ8É5y£‹‰ðÇáÄºòº™½®ÂÄU•Ønm€„W¤ƒ kï÷Ú»V£ñÞ;»¨Åè®¶ÑHylíºæÏ@BþÁD5F¦aK˜ã¤¬Öf£Áã¢¾?¬qC°X Å^Êé, ô>¢¦5á 4ePž@£ÔÝ óâSZ»z“«Ú¦7¹®u4Ð†[ô}]âwòò1Wà·P?ø©&ú
CB+_¨³õ&Ï3Ð9üúXkÈÑø´Á(°¨g½ƒ–\PÄÃ±‹§)üF©Œ ˆ†  æð"ªuÐ?Æôzµ{
ÿ±!¥ _@¡-¥ó‰Ñ÷•2wÐªäâ9JÐ™Tcã<­‘P(õöØüX3Ÿåû81e=Cu7ŽÛwÅ"ˆ²fª¦Æš'{_¤@(Ìkb°.ñ³Äì_Ný‰§ÐZ»bWy¤Ú@ø)ññø.*Mnx¤}h‚3%–EˆéÖ´iÛ>›ª;Ö­IÑxoënç†ßºE–úš)¬¶WŸâï±J±áÑ\—ð7`=¶q=6ë„…Óì½{2¹zï"ö©G:EÉ©8ÔC'R`q3ŽãsoÇWÈ#Ë ËñÙÓõGo€<n+{¶2×¼Çu×¦c±ŠÞu†ß»#½óÍ"½ó5‘Þ)tm=]Ö@ÿ wkªÕðF\ž®jM´~û›eLÅDýZSgDg½§‰‚®€qîiuP¤ÖoÅÉ=¡º*…bsC~£åf¨ªm1¹!‹ù…ˆìÍ¦q4­M`Ç„eyÅÆ“=Ù°J0X„ª“fIÃô¢ó¤ãÜ´„ãÉ,1OV0ÃN¥7zÉ–i WAçÆëÖÜ%-üñPa5 jÚýÅVµÔz$uÞ…e*ÍÇœÀ(Ü=Ø‘yŽ~`H€êr½Y¼ÅÈê#Òæ% | ÊˆÖÑºŽ-	Zäˆ^äâ«sÅü£qbdÂÄeÚàJõ¨¿EvÅ”iHU¶Ôx‚+Ô“»W½`èæ9+ ¶ƒÛÂá#ŒŸÝG¼"e§K@zÎð/ ¦­/|mˆ¢Ðf;[-ÃsA y©4çªä2—íýè’m¼Ñ–³sÓìÌ$<ÂÓ˜:Ãú?`„wGúÙpfèW	\S¹oÑˆš%à¿Dqpw$O¡ÂgŠazòXnwÀãÑ:Ïg^·bŒ·Q{²Q€ÊÿTqHC/+­?U&dc@µ¦fqPP)ì1f|G\n¦”Ô¶®Q„zagì‘ÿDƒû–6Á™&/Îøf6Óš„Ÿip¾sƒžÊÇÁ¹L’¥‰°Ÿl®I¶£5­Kª–%Y xµ¦T§Iuj—„F¿ÉGƒßòÈø÷ÔèÌ\Ñ•Š}O­Aê¢fèmÁªÞPVõ„Q6Aig¬RÃÀ:¥Î'ää—Q¢LK7ë?²ÛõMïÇõyŽìJçö²öŽ¢\¿üŽ‚Z¿ÀÞÁ6>¿CjÁ˜„¬çü×•Î»ða”™±ìdÂ›$Œ±'£ZC÷½1YµºÊp„ü(§U¤³ú
  £·x+«éçÉª†˜²ËŠD{ÚTódjŽ6÷ ¹È:—ÖG’¹éÞÍ}_ÂR7õFgÈgÈg0ÂÌ‚˜ãÓÙÂcñÔƒ!±)&¥[Ÿ}aÉL|¶ZKðÈ1?:ž‚Zè>×3*ª­•ÅDŠ°”â‰Rnwì FîÐ2|¤>Ú›Àjl('†‘EoÓ‡wù@£iG9A{rN‚28)•*‘D¯ÔìGrÕO´ç© gê}®wn>ÍóñèeÁ…r1É˜¶ª€fépY?"àÉ#vÞ˜tbY;v¥j2˜…X,+L€'2 66ÂÓ( cB¿çã¶Vó¼B»Úñ¡mPcØ5¬Ê³×‘${ÑT"`ø‹Aƒ~Ý4´Û?H¶ÌÊí›ÚQG	¤RãG¨…p³577ÈŽj4D¬‹õëÌ‡¯ÜÐ½¾Å''”h§ˆšó9t‘sÊæÉsú¡±Wy¾&…BÜr
ç.Lô Ÿù1úÆý"yírd¸“’P:&,~n¾7âÂÖ;÷èd›`)S¤­Üú9×òk“Ù0ÎåþÛ»Ã`šœNC|ÎÉlµ4òW²	>(oD£âA³JÆÌ¢ŽÝ«ÄqÁQÞz×Žáe©Sn—ØBQ­ëIé½Š
(sÒ\ŽO–Roš² ¬µ:EQRa6JÄ^j$àåÄþÑ€‹â/uœB­ŒÍ+éeXaŽ®m'>XŒ£˜Ï?NËZ˜fŠ.!ˆ™jF°‹»|5ùÁŠ#øLé›þfCZvB]*Œ`\¨Ü«A
½¹ü•["Š7,ßü8ž˜»ÌÖ€“ K¥_KšŠùËÚ&ÆãmªB*ãýØ#+)P¹èÈS –IQE|57®kþ1?x³—¶äv©)]=†=DÝð¹ã4†-Rd—Dtý;]å™%Z´#GŠ¾­”Â£L+Š_Ô‚¤K0ž/2ëå#N—žö2šDã¸ZC+“èz›Ô©ô¾;á©3­‡Æ±ÙÂSçËÂ/I‹w‹QýUI³L0ë%QæòI³dtko‰¤é¢G3ö·KŽù°…«[|æIÜ0ã`É:ÜG¦Úyú2õS1©Ë[I÷ö0³"ðîxîœQ›‡†<«ùàÑÜ0cÅ÷¤9†[`îÝÏ~8¤m{M¨b³ïÜ]Úá´(X3™e-Ï¤Ã¶¦Þ}øúàW}]zÑØ;ÆóH­Ô‰Údh™	«ÍˆÏÝè¬ö¨ì±Zz¯O²"5°…ŽB¥¬v¸ßðøÓ<¥õ#ŽJ¶Žâ£AB¶Ý;ø!…ö¶XzìèÁ¯8T<˜ìT*xÔL§Áômëë#”ÕÄ#¤[ÏâÑ.s"9d7‹²c}-,*Ä34JáÃïJXðEé¾ç›kóU"ÙíjºÜXá¶Ë´ƒ¦y{cX`Ï£ƒZ¥[gðA³ähÎÑfä3JÐl® gq¿°ßsÇpÍ‹2ªwQÖqÌûí(ÃµDòžë×brÆÚ)6™¾kÔ[Áè=v½É]§Æäo€ä‡×¶ ¤(–vÇ×–¹KUÈ\dJp{v„y­]fq•Æc”ú†Ì@ôºÎU¬‡Œ
Ýe,ªÈ’}Yk·$NÛ}gïûL½^dêCé*Ý-4ÛQi.ÿ­ ˜GÔ¾+†¥[]:n%{^‰eœ²ˆÚw&ZuúÁŸ	S,–öòˆÏŠ³8¸ú3áÌš}O‹·Ê˜ å^æ*]©i Kå?Bî ³€ê‰9drjÀÚzDí?ÍD©á¶¿à$Zí}Æd¹¨!–G–{KÂ½¶õgu¯Õük³ ài”CÍ«¶u'¯Zòœ•w/ºÚâ^µh%H©•Ý!LÝsuÔ®8NÌÝÝEG,Ò·¶¥)ˆä­7µõ›½uÈ-@ßOLoKB“.¦aßÃÿ Å0adþi)6HØ&ÙŒI¢9§Õjî´zW»%9§õê"¶t\ÛoÔ£þ¯_v_{ûÝ£]oïø—ÿræ‰²M«t­±”n¯•% …	´N «ÛÇÇ0j/§ºl
hÂ«¦Ž‰]PÌgj†¯:(ˆvõG €rq¾v¿AH±¾þÄàrµ‘²o’Ô:n‡ºAÇn$4	„45nãÃ]2ç|Ã¢•Ñ]ÅT&ò_WìÞ5yL)ª	ÙbA	<|ùz÷ô—ãn¡ñÛÝc¼QB1ÉÙ=Þ?=bÅKë;ª²KÐÊî1þ½ÆëÜW¹8¹Í…‚ßÈ¿PÖT'%&^),ºRŠÍ`Ü‚]ÈGÊ™Ï%¬¸Â‘çxüJð£á½°”ÇmóÖˆæeªs}‰’ò:Åévƒ‰†r
ë:ízx:ã;ö~ÄÄeÞQl°'Ç5Â“t!(»œRt  V·ƒQnøÙ;yëwn¡¢›¯Ù&áÌÁà×MÎ¯U-Ó°Î§C‡EÞà·B±rEc·³I—•œ_«vj¾ƒ—™Q£T×q#”»EÂØU¤+TÉ1ƒÏ=­ÛïÚž[ô/>æ’ÚAæ[âA­Sf)¤ÌÆ—@nìÏ’åè¾¦û.vü%6?vÕ³üõ˜îV {×îWë-`Ñbø¡/@e6Cß>aÜ2js¡læt“dw‡„´n-WT72Qm‰Ø$m†ÜçÔŒ“®ä•×¾˜ nå‰é;Éé°¼H]D>Ý&9"|!0—µN£,(yaxÑrb‹(š×‚z—cÃ91ÖÊ>ÎøÕxã7ÂóçÂÚ[y¦ê™ºëœî¾82‚´\®™¥}3‹#šXN^l^8wºŸÄb5Pe[EÝO}‡â‘}‡%‡Øa”Ç#ŸßÜxÿÎ>†	ÑÀFÐßíã:ÛòV‚+¿—¬xóù³òqòí—¨oª™Ðhº"„zý¾™AOŠ£NVn–X™U—FY 7Š–&³Øj(—’Ìåùœ‡±¹² ’ÑÃÒ³ùG@“ÓÝÓ_N¶<­/‡Ý'-Õ$D³e¢àƒ×=8èîþÚÅü~ãà’T-Å1ßÅQ„w¢ð×	»U‡ärôÓ_ón¼k<ÓöVÆ³Q0{+kì-<‰Ñ4ß}Ì’¾Ç‹ ìFÜãÀAA €»»'o^oIXV
Ù›´r#Ã‚bç0Ë¸(NëÕ\>Ê#»T4ƒðh1ÖÛÌßSç–F¾ÒbºKô[Àv •[«–¤r¼Oƒ=™8sÇ?*‚GU6ÐTU:2#22I~-
/±[À3
ÇµËÚ»v‹8²6	‡-ï+ÀÓº+<Ìwyð´—{9vò ¼Ñ6;zŒ.JD²}6]VŒä¶f&q]ŒJ/[^±¨J¯ö‚ÀÃ ñ8×§)Øñj®àìÞ]ŽY0ÊìöÝ•Gá¹W•úÃpëvá+î›ÉN4èûTcÇËÏÎ+w<¼ùvX[©(çb|¤¸?¢Œ¾I¥ö0_¬äE­`C3,ÐÊN: :¨ýjµ·åùãkšÇ»ºH8$HÜ­"úD›9˜ñ4˜øÓ88'i]
ÎAû³ÆŠ»7Ç²u<f#Nð&!ˆÈ§De*Ïáß–×. E½»M›­=í`ÐêèÜ3Ý!Ù± ¨3¦ã´9\>ÛñšM ÀÒ½Ê…‹†…y‚JXž·“ðÅGaœÔaiÌzAµê÷zkÝ!]óÂþU~€\©È‚)6ÛÈu1¹ó/èo6E?­S@ Fha—[ú…˜ù“`°‚Ë½‰ÙêaŸ½Çg5 ™Þ
:ª®ì½9îÒÅVµ4ÿ{š6ËÊIVÞœþÜ=Î¡´àÉ4øÜe·†Þ3¯Y0þßÖ¼æ{h~
g¹¦9"²^ž{ÕjúËŠ™ìmYì˜5ÊchµÄpˆ	HûýÎN:¸U‰ Ü!wœÁü64P1†ì.’yÎ)p0‰Æg;ø)ÞÃÂ|ÍÃ”Tö—Û2#Š²Ë‹Mû§& â"HhFhÅ¢…fûþÔrÖmÖm;ë¶ëvlÜÓÞX½-I”lå°Ö.ˆ'P+ç¨F­8gE´RÎße!Ãj5cÿ5å5PS ÑË³ã^àXŸ¶xx«¢PY¸(tx`õ~BÞ.=_Ôuîã g•ñbÉtæ.5/Â•Â´¿¶ ûj2Õ*VDöËgþßçÏðPÈåÓÕ0öÑwìgâ¦ˆ…¢POv‚‚¦i²Vùbn!··å>JùÐàI-ÔèVWŸzëëŸ!²#@c,?äO<«Qž„È?¢Ä,(Ñy[L¶ka
A‚x÷íÛ£Ãî>ÌŠÒäîd2a_RÜj0Ä˜e¶¦OÞv÷wÿËlþdôBþ~Ç.ºGÌØ¨·ßÅ8ð¸[ºeãß§‡/èóïD¢ã­·}À&¯~0õ/è*¶]EZN°&`-çÇE¾1ÖA±Ÿ +~d³!Å¼ÆyOŠƒóQàP[;Åb¤¼?™ÝO¾åa5A*6ÒFêbW"æ7ÃZ:ÕEáK„Ï-ŒŸ[à\¨NÇÍÝüÉÆ÷ÃSÛ\ÉŸAR¡AŽ·äð.¬˜xLe7èÔàÎv]yde‚dã©W[b§­~‘¯pòß.dUT­j“[%/#>¯©™½`8¬~j®are€<òQ%Þ(‚ÛD¨PØóÛ’e„qÓèRZ«”ß7[¿Bƒ-ÕS¦®R{&ü®öƒ&hµ“Nÿ,Ž†³$HsÖ–HÁ"ÜïTÓeÙØß* bmæÄ‚h¢·)_·-¶nïáLÏüè§{å†[.ä¸Ò¾fš,®º²©Öo¼h€…)Ùƒçíïžv·¼û?›,‹‚òØ.Ù¦ûôónÓBÇØ¦LÞàS"kûWxÊÑÜX(_ˆþ'µŽƒÚ¯„ßrí•Tjš<Ëç²ªµDYÕZóZK’U­Yõ «\ŸYõ «dÕŸXV¥žª¬j/QVµ×¼ö’dUûAV=È*×çAV=ÈªYõ?AV™^ªôê,QzuÖ¼Î-¥—	¦.Ï:òìAž¹>òìAž=È³oVžå5p—|Y@éž	å,“v?ÌS$¨H8ëíx»Sàçõói4ªÞxÌãm+£ó5¯úÛšRZ²Ú| Vë0ÿëêg,ñ¹ é~ð0ÿ{t1Œ"=õhÒ“¸Ê×ç®XX‰`Û,ÁD9 ÐoìÊÕb¤±
³8ØâÞ4œ ÀC- /˜èÌå4j—k-ËÐb=“eØ3®ÔäfÐFå"H4 iX¹79ž”æ  éâ‹Ûã­­¸@DS˜å¯DfÜ;­1ýjñ“¼¤Ÿâó§]‚Å“R~yàÏ…ÖÝÂëÄXì–Ë‚k 4ÅÒ`v¼Ç˜<ƒ0}•gK7}à‡Cù}IšÏ'÷üQàçârPI½%%hòUÆßÙMÜiäÞ™Â_™;ae›1l*×gYn¤•ÛHŽó²ÜH;·‘/f¹—+³£ÕrîÌR©O3oÜ³ó,vcÃz/‘û6Xûê†PÓ2rÓKM–áºx}XÛ´è›ÑkÁSÖwèžýƒ¦”—e2­µuÉœmbDvXÃZÐãND4ƒ¥¬÷|¢|ÇÑ±cçenigw;¨øb£[¾ÕêŽãe¦­EÆ{k¥‹Äv©Å~«ÝRAsnŽA`{]õvôao}¾j>u¨î4…ÛÉyÙûµ&ŸÎ	Öh‰3’ç~¼wÔR³ÝÖ¨½Syö2Sèí‚Jì_9 ¸@ÜhšL…ÔÌ¥¹’¾µJTLZ´#› O(—Û‘|õÝàó»OÜ›!Qñ)ä3X-hb{‚u#‘åÖ”wÙ‚9î^úa‚{Þ|©]‚„c*µÓY¦uáî;&&p øÒ¦"Ñ n`~¾Èo)¿RûÑœÍÒ]eÛ\”Âþæ¨Ô\Â
øê«xyö„El	¥WØÒìå—E)b¦pûÁÊ[‡µOIŒÙ¸ðáÁîá{˜‡¸Û½;¾‡UgHÓ/Ì¸þ)ÿ‘¥k-øäÂ!Î(¥;L ¦–aóMã²‘$­±€;’8€3d1Ôr¤X£KçÆvFd<’Ë »P«Ñž{UÉ	Šñ/?ûã®º*”šf£~-ñÇájQ$óÜä®O¨æ7Qe÷ë¢æE0îpìLüü*Ý3›Úæ“?4bö¢ñou2´$³d6¾ˆî†”ÇµÇ·GJAÎš?ÚšÜÇëðÑ$%»Ùl<ôûwCð#@pçMuÝQ0½à8‰Ã8út7œ4jn’%D3u¦ÖË~Ž"‘‹Y<•Šè¯Au›÷ÝùlL¡¼“Ù¸×õÉ H3í
ñ£øx~ðËÒìG€wµƒ>Ï0°øMì_â`Š?YØÜ=
ŸDãÓèâbœ<Ù.ÇÃÈï+Yg'ä»Â^ $Ç”Å-ûýbè?Š‡ó-OtËã­¼{¯À¼%®z‹ç*ø["S‚÷ß®@k˜c¢ÇÐ }hÏ·<á|rØßòXÈ‹5–!nˆ>xLŠöç(t#ÂÑóðýo—nÌ¯ à–èej¤2ü}`’– O?ÞÂ6 ,¬h`dh§ÞS¤ZŠI³á(ûÝœiâ<Ò£3Vã88‡-	èõðeûçÓWGûáçî0 «Xçö¬â;«úˆpŠÌ7ïYËˆÄ J1P¤Æä{Œ"eWÆÊ‘¹ž$B£˜çR0’çõ$â^D«hÌ­TžJmÀæJL&š¬Oƒ	p– ºþî7jOÞ¯ÃX*•U¾£â;¬ûŒ_ÆïÛ;,ªìÓÞå ôžZIGÛ*ùÊ¿âaÒl#¦ÍšJàd™VžˆØGÜûƒÙ–Ç›0‹µ^	{Ø[¢b³Æê°_ùÉ *\Uëu*‹38·Òî{Æ‡ÓˆØÈY¼æ?dJØf1vžUÛ2iq#Õ:aß•JÜLÏNUð/ZèŸUé±Ü¿”Ëd2¡èB;q¾÷ÆC|Ërír”á´YN~ÄÞ—wö®¹æµÞ«¼{ÏZ˜gÁ4,ÇZCÕwí5¯c´´Z?‡0üêÂ{…„*†ÂáœËŒ‰ù”çŒ¡ž¡t}Ýû9NÐªyþÙÙ4ø¢¿!géžÆ,{LÇ;“t²²"N€¥÷Ô‰ß¥´,/ý`è^õ‚	‰ìêÕîÛîÏiM¬kÿÔ;ö@ï¨®ÖÃqo8Ã`S+T#àˆ†éÖú1Èç ×ð¼A1Å(¯!f'P¤:€.>­Jë¬‡ò#èó€ŽJÊRþU­ÿø¯Ud)+"‘èñd2ïìOqF0ª~0Ga‚Ôª¤ïÆtÀ3òqB@à#Œ2ø$½ºÇ%¨o¸Þ%x8ÉÔcìÜ¿âµú¿jÿZÿÛûŸÖÅ† ˜KÕÆùntIA€.ÉSóR`73u q R* Sg4ÅÿÂuú†8F“äšÏxœVHP¼òi~C]ýQ4ÕŸ\†É@ŽS[Ì\C*!Ù§BlÖ²ÍlÂ˜ßŒÂ÷º ÑO‘é¦A€Œçð;e”ÔÚ»Æ{tCgˆ¨6•ª4«p©³ÓËÈ’§³Ô’Ü+ë“u~o@ï-}×§¾0VëÿŽÂqHÒ
Àw"ÎRéõ¸—1CÄ¶!Å¢q/€ÿx¨kA%à¶Ýós(a5½¢b”ä„^P†ø”öV<aÌ³åÉVI¡D™÷½&ÀmÏDj¦îÈ‡¶ˆnü‰Ôt=À²ÏÕ…C¤”×¶¹ÎpÈ²F¯W/	Ðt9xÁuí\ýBm$’ÐÓù²A
øùÄ;Š.ÂžÄjä0rrä8u\9ŠY£"IM=šœd0æ)'…Mp¬˜Drìˆx&…½\­#bªUÍ;#DøäÂR’ïù^4B¶_=£‡«sãRŒ‡¬rô›¡6Ó˜`wé6–¢c•ïZ‰v—î#rS,^ ‚,¤Øíºçtø4Nœö5¾ð) ï^è·
¨Ð¤RêýZ³ÁÈ×«¾ £Xà,¯Ùž?í¯~§õ)†ù^‡^$Ÿ„mWñ;ò'ø¸ÊšIªñÂQãL­A ë«š-Qö¦ÆŸ?UÙ}–9r2>5$XxŠ¾SÜ‹†³ÑØÅTÈ?ñD.	9dÿíÝÐ{¼¶Áz\Yô”Ú0ºj¶«–µDoniˆyA®Ùí
üáóRK‚_p›!5'åîB„š^ÌD±…o’*âaq6êæŒî†óøc>Ë[¨M…ñò²…šÎ8šÖn 5ùî6lÊËÂ«‰ypÍ¾¦-´Zaª^áƒç£Ù“¦i ’ýÊ?a+páýG„/>úñ5¼xÿÔÞ$sÆíÐ‚2d¥S`{£ Ú3\ð}•®ÀôÆêCCzL¦ì_€ÛÒŽï€É6[rÏªRÄ_Š©€(”nýäX+›À.(¼Ü”!õêT¿Ú«‡}	*–d}2‹Ìžš~4v"¿ÊX‹ÚµZ
‹Îz1f­ÆjV³è­{ÖI\‘ÚPþ79LMÄÙˆ×¼Ë 8òÌ¯=ÐG#rMÄMª‡'çŸÃ>¼òR'qD²ñrxUîeºÙyñZœ Ái{DGêH¤ÙýbFš€X€8®2Ñ?¶…]¶˜Ë	¶Ø€Múš.ðo(MCbBFB gvx†s
{î!KRñŽW«•Íü‹ ²&ž³‚´I?BËƒß»ÎÞ„ÃpŽ£ìIw|1ãAö Íƒ°ËIÂ^¬>Ì~ôÂ ö‡òëþ™?ŽýìÑî%ÀñÖC—³±?öª»oWó
HïÞJ ögly±™ã&þzKüÈ«vc¹AgA©H,5ü+žÄTìW¼yùêxOúE}XÒã1Zq­”·ýj&–þiL‰?ðqÐ~‚¿. ?³Xè¾U ~+tôãh]\óùé°ÿJ¯zzÔ]]¨ŠTø¨+MYÌè×û§2µe—OR‘•Ö™Å tcG»ÓD¢·ƒkx<)ƒýøC™p¨ºLùmHï$¸y£ÀÓ5Ëµ § Â*ôea¥!á˜õ/ãÈÔw 79W3‰€DÝgû¿GX°n±zf†Ç(FGö‡20h;ûÞ‚Œ‘e-È\HÄ÷G÷E¿°n% ò;Cp”á*ôU¤ÔaÞF%…ÎPluRK±©Ö¤›YsNüÃq?¸"K…'’ÞqÀý[ n­“øS¼³²àÝ<k’à‰}+ƒ¯Æu.«t±@Çù¹tG¥Þªmñ“Ö(J¨Tï½ØuO­1CUéÚ®Žæé£’Bªd/·•²•5å5j)Ÿ{Ò Ññs8M@c¬Y!`ê‰­2),P¶H•æ.ä"Uó]ªê©ün™šÕ=cÌIo ¢@2©.•¿U‹¸˜,Cågîº2gËp‘~ÑG©¿(¢ÔÙq‘l.£’ú0Ð+Óˆ©1“a|:çˆÔ8;,¤‹ðfŸ¥ìÀ¡JoY#	dßç©ELXkvû}`I#?¤•b²éml C—øùs¯Êý[îT<äa!ÃŽmÔÚ†"×2¸¦OTK!{Å]€¸UD8ÍÄH°ïÞ¯:,«\±@Ñ¬
"ä-ÑpüUÛdVë…µÖ™µ–Ðƒ°3ÍRJM1©t®2òSg É~Äèö£àÊvè³‚m¬HmžËh•µ"·K–¦;4û}
,Ýst‘{N;·Ü²ÆCN©O’Íü‹>[²[…NaŒ–Tãø¡d5rì§« 4O•Ö`½Pz•¯¤É$ûj•u™C°4öõ½Œ§Ñp¨ì$èÑù:ãÐYZ’U‰;pò¬µ(ÇÍë(ñDße«—Îxõèü<˜}vF‹“fy.©F¤ò[ËH¢c:²@ÔL!âÕ¼dÆ4uhiû”ãÍ ÔÃó¢.iiÅõ©¸µŽ½€Ý=<Ö–:L,½¡C÷¤bÞ™­2¨h•KìËv£¿õ>Ðj.­RÆ%î&¹f=½+!g`XZœ.!Ngiè{‰…¢>—°®R®hÜÚ¬›ÈW¥©QK‰qlóvÙÏÕl!Èæ
¢Žôæ  lQ-,4¿ªˆËÏ ž°°FÅ€.¨=B«"%©´ì	#ƒ‹“”èìå9ó¤›7UV=MVš{?yg˜’Ñ[×ÆÏƒph“ÃÐ`˜‡pž0a'C)¢ŠP¼ªÎÅ.¶¡rÃ‹Oí†í¨Vµ“äeq
‘³Z“õL†pÖ[7ÚÔ8‚ÊŒ–-tù·sÏêôîøºËa#ƒ†T—DÕXåÌîIK56öë$ÇÔîVó†6ÿîNÔVºRƒ"ûh£Ê_ûœ&¥å-þê…’õRfbD
0æFv¶.|Ñ>0 ¥+™XdÛªÛÑLZL–ýÙht-Cy—UnšdÖèfTE
„àTwåKRè!ÛXÒKú:,ÉF˜ñ—âFd–¶ðÕŒx,J·"z–?2÷uÉ$ô9`'ÇÅd{å˜FiŽÇ™šÁÎötµ¯pð$Ðú
ˆüWfŠ~…LŠ¯²?
"“£=U[Úí•lÈáð"ÝëÙ´áC†[ÖÏþ8Éœæ´N9¥÷t¢µycEÒbó¥¯)ò„ç·lb½|§Vx¨!Õ¦ã1,EÆÒ^øÓ$¶=Ÿˆ£Ù@ÍÚJè`Ööf”—ïŠó&-æl&…²A¢ÀÑÉºQédÕÎ=´$Þsý<ty²3ó¯:Œ~é­¿Ež#„6öæ–¾x3/*'"Ö~Ê#Ôc!‘0]ÚóÓZf[óÂ½¾Ìä”ã£˜õê—ÚŽ%»xy/úç#KW¯r”+5ÈØU b
H±~åÖ°¾Œ~•¯a¹F'þ3?—%¶¬Éûe$Åö—*_zÕô§¾LØi¾‘D=ÚXL“ŠT€	jÔõ¡¸WçBV&‹:·mŒÕ´)/ac²·¨lTð9x)Ðo„ÔèR0ÿÞRF¥´‘;×’¯=ô¥Ö31—3T3ØÞºgƒ#³wÊê\p…×Á¹ƒéÛý Æñ
˜yH»?^çw”l·§Äh¹I3™^kÈîG=î}õïz­f, š†Ð¨Ïb¬W2W†Ù8Ä0…£‘ôŒ ÂS¿#=E5{ÄÀ!peŠ5›¢J$`·Þ3…Í VÍÇøs8€ú «¼þš¬²Âæ÷>nyi‡*”·m$)'Ì[PŸ‘â°M<h –Yý‚îÉÁ‚|sNÕØcx5¶Šæöh>…?Û;R«ðà§Ÿt‹°ÇA‚ª¡Æù»ƒhœœ„¿ÕMûûÓàŠE¬67–"§©ú{ð~¸	çx[ñ‡›¬ù‡5*–rO±?í?Â~2 ò«yíFN±Ÿtµ¤rNOàÂN«ú“øoäCýÛ7ºÄ¥ÇõIÿüƒ,ã3š‚Ê!ä»5ÿÿ}öSÀÈÂñÏ##QãÕ–×È~]+¿.q¬[^kó±ülÜ.ÿÁÞ4[†§Qð(,é¼j0FS•GÃ N«\Í´Gc—¨)ÒùVeÍcÕJð¼÷UÊ^&”ÅØe4ýxE¡úüg}–„Ã¸ŽO~ƒe¯ç÷ýÄÇÄH<¬‡tõ†ŸÆS õ-½¦›ê>† ‹a¥ƒ.?0>ì#Ð·šô6<tÇG¬à1Ø7_fïÍâ$y“`ŠîüCDìv<²ÀíhëtOöj_Õþ×(ÔªÔCoø	òE\òÉ–7ÁODWÝaÙZÅÐ:ÏÓ€%’êO‘0moàùÅø9òÍàœÅK`áé+Åd•¶KgÏÅ¥¨§“Wh †‚£‰f‰·ò—Ì±‹Þ˜ÿ`°ö>-)Bž›ŠÔ%ó© ËD(ûÁ¹?2@Ç°UËnq¢nØ:¶ÜÅã×$5qãŒ0ÉÔÖÛŠ*`‚‡oÎþM¸ÆVSX>o¥51à	Š1ñ;ÍHšU¥âQÁl}&[‚çÐ%EŒšæ©ç¢ - ³kDØ–Â”™«Oe&ðlVdÿ½ø÷-AuD+ÚlÈ%N¶¼ï¿¥ð·üžÑ‹\‚=±±9¢ Q Ã7 ±ü;@D+¡¢MU £Âƒ<N*H•UŒÏÁ4ÁmüVZN~{9õ'(U™-iÜ)fIÏâ ÑÉâ^Gü²wˆvozq–AMS·i prš·-=w“•}*RegCb2Š• ”;%ß°
0ò°¯ èü‚î–> ³Ëh2üåƒ–­G¾„pšàò8‹¸(xâ^ÇT …Â•ÝGø¿
1‹=äTÀÉûálDa©yQgOÒÐ“h‚Ãæ«©’B¼×SÐ‘u<—éWG<üöõ‘o_›˜îbÕsæŽ3³:Ù±AMûçï¹h—ä˜p’aª¡¸FÜ›	WI\QLJˆ%l3ªš%“ok(.Îl[(¬1Ò«¬óZ­F¢¸±å½ ›2øDî/L†$É0–ÕÊÞ›×'oŽ1±Ü¾÷òxwÿðõKïäçn÷”¾7‡xÔÛÝÛÝï¾:ÜóŽ»oßŸV0c‰ÈIÖH"Õ­hg•f·õ¤ý"›‚Ê}0v	2´Œ;¾Åµ‹’aIS±³Ñ0oOy<4	èBñCŠ«š5Å±©^¤1‘ª“0÷ºqÊ£l"k0‘sÅëULJ“¬(Ô“6-1<†á~8¡¨OÞ?)1Ÿ©7³ PøvŽ÷µ=vú7/ïÆ˜3×às(äÔ$ó ãq>l0ðxd1Æ»Ò¯×w+óOµÁ¸Èßé4#D¦BAMNAÍƒƒ'¥$µ
R`Í#"G>)­åÒQÓ¤£fi:jmy¯‚ÄÇ¾½CÌ‡Ow5šÚ®©è‹7æxOö~~óæÈ{½ûªk,mBC·ÕÝ<h˜Øóö$C³;U+¥÷-z#EÇÒ—2å-6å>ÕîÑJ³»y°{°Çf1=ñ):cXg‡û÷±Ã~!¾nÑ—Ï?»»Ç÷="älwÓå vÝ^5í4ó‹*[øET‘)kÐ%jjK_´—»ê[´Ä›òªgÚŽ•Þ¶®ôö•þÂ¹Ò_˜£<î¾<|ózYlv Oð4¸àÑŸÒÉ-ZÔnà÷=<¹Wðñ®¼Ìœœî™úÓ zÉ’pÒ}Õ=9í.CØ E{Ä=/üegÄ|çkDrÄBðW)T9@“ò–;ó”exŠ]wâ)/,Œ¡ª$†1Ôõ{Šm8šÚü) g5ƒ–¶Ã,ì,ó2"£ÏbÀjZOÖ§ÒÐOóÃ±wŠY¸1Ö «`Óe™LK´ìÖI	¶>G0×¸÷I£4f›ss‚îu÷Ø®ôpm´Qß°Kî'ÃV÷B»»Q-¨¦©YXÊ4ÍLÀ ¢ÄÏ[˜ñ ÉzÔ½hlwFÏ‘vé±0¡—	ÀÜ—,X6¥7âX‰‹{VÞ^ÎÌô,wðíóóä.Ó£i¾a0vÚÆñNQåÌkfg+=ÃÒd9§Z/ø“e2°èY,­¾˜KŠ	ôB[XÉ£#n±Û–¯pÚ¨~Ò.ìçûj÷‡›Ox"e›ÆM÷4¶ÛæÆFþ4f‡Žy+ŽFäXç9 tol<zâ@˜Œ$ôïØðÿ“Xj²²§ål§,À/Éh ü“6}^udx8†ÅvHY{¼îh2À¸ÿ«…<îe8šo~…?/ÝlÎ9úƒÎ£n.úoµ†Ê­ Þ¹.+¿êê)±¾ÐJè´Û›{»yS1/–;¶|•7HGGÞÁáëÝ#Rœ„–Ç-k³Û|Ñq2_‹*‘„UÓÈF¤)Ü
£û_ÁÙÔ§´	…%¤¸Í1eÓòáÅÀû4°ŒM‘š„>‚T<.÷¢e;ÛÑ]†¢ÙDŽÅsãý3dŸ+¯vºxÁ<ÍÒ ÜANMÕY…ƒ®QE»¸l©ôæôçî±RG½”Ì«¼W][ê¢¸ìÆ‘È†”Ò1ýT¸:¿¹Ï^°I@‰×šz¦™ü¨V /f;|'"ï"2Ãc3ŒËì8{)y%k9ó?pPZVÀÎoÒj­5›iÏUÈiì“’ÍZÊdb)ñ„éã³òséIôûWä…k\,ÀÌæõÔÖ†¤`K¯=y›`†Yv–ú‘À”´75ãëû^9­TÿÓKå:'gÒ´ÕÑ•¹Z¿Ž’7üâõŽÕ]q«|n8ß~Ÿ9qÚ]\?iÎ;ÂÅ4ëØ–ÍO7I”\Svï
Ïå˜÷Ig·ýb³¢ÅhÁž2s7C7Ï{Ñ>ŠBU­ùGà˜Ö?$G’æßÇü	·½Çz{&˜"á®²18cF	T-Ân§û!«Q…^©õâIs¯¹GKWœ…ëÑP¤wÊPrŽåY¶{±>µTpÂq†Nl‡#¿š(•nzs‡™ðÚÏ©²¿ãÐÞác=XA<ë~Ç{B\±»w°°‘NÈªÞW6JsÙŒ¨Í5:77Ë3µš?/S!®`ËÅÙ×Z†7#¼’ôÓ²}·bª',J®w§[îU%ÃSj[—M§ÿùâWtÝq^NÊ¨HçiÏñö8!ñ_&-¥(Ò§&£(©¥ç,ìóÁ0òþ¼žDáUÐ¯¶VWSrs®fr%¨èt ¨J€BU•n÷ …ÇÛî­V•Ötûq»±Û¶u™.c¹+òÈ„{]ãaž.JMŸp=75„0~ÃšÊ¦Qj›O¥ôDŸNé«}^¥YÕVf6{WfvóçÖÍiØœk#ÆyßÛÝØ%®QÙ{¼ß:Àm5el¹¯=</@kgŒ«¥ÙõÐôêb-fûOž4_4_Pû|#¥qé§:Ýª.;•µX†r®þôSú|.m¥Ýz–ÆèÅ«º–ú‘ÿ[ýFoª¢7a1UÞU¾g:sIöUÝ¶½‡ŠËòÈ—ïß&~Ÿ6e˜	ó«9ý	¥€¤ó0 Ñp ¦U;2ÚbIJìwÙ#×_oþþ©l+öªÂVLW¾¾Ë³ƒªé¬×YhÔ½‡¼‹½'kÌdÆó§ÍÆÝ,Ù˜Äöƒ†ÓlaÇÜe›æ[„‡ÀúVÀººoeÝ—WnËQ ¶øµ]t¶¢Ã0šÅã Ž¿Óhm¯éÆ+ïÙEjÞ´yÁÙ=r9É/†	‹yŸ!ÛÁØ|°F¢‘FX°lXm‹ëtöNŒf0¹ÚòÚÄhØñú†ä•ouDyá'”[º‘¶Àz˜¢È‚å_ä•o¦åÙQSnÛêH3WE´‡ý+oc5·–4tkýG|u¦d3²Œ,µ0l‚2c™2]7EÇoý¯Ã02À ÖÜ®45"bÉ”-3ÊËºà”§{ãÿ
Æ}Î7…×þZÖØˆºX‹ƒ}(ÓE6
jír&ÁA8¤úäJ¿±JŽkRãø'ŠbüÛÊê¼Žîôì2ódä{!&•­‰nñ?˜/Äc-FwÇÚFÃ…ãÚ ƒøÆiv[½:T¸À ŒÜ¸¬¼„ü~tY‹G˜ï¼÷Ë|/%ÌÕõÏ 3rºœ`œø{Y{Ôñøè•'»ßh¬¨"uù9ŸgÓZûjèE8÷ÉuíQÃ«¦˜Þ¦6JðÏ$¢‹1µà3RXDŸé¹i5˜&µGÞ¨¿5©mz*Êà!}Gú†ï€‹Q\c#0æbäM¦ÐýÖ ì9¦èð~È”$ÂÖ™RšÇæ6 -4lèû²†×i´LÄz3—µ&b±©b‘%ˆç?52”ÍŽÅ¸øO5›<o¤©L}<€A¬5Œ4ÉÛ{ÃprùÓþÞ è}$3ÒÎM«3÷Öµq˜	†·-™ˆ·-y´4¬"Í¹Ly>“©ßÃèµ„¤É…úg¿*Ï”Ûëƒ–ÑßÄèN¬ ŽÔ«Ø³$|Îúµ"@ÇŸ“v[8†wŠ%ƒéöú¤ #Æƒ"j"ÂÅ&]µºB;øþêóx#§§Å{Ô:–l½§¼¨±%œJO6N¢€;¹¸Ì$LZ@ÔðØ –¹¥%´bIÔ½MíâµÖÂS%O5Î@¬9¿·Ãñd–˜f ü r§ÒCB?‹®›ûÐë ¿scM¬ÊØ'ïüñ¬œjÀnu;rWƒzâƒòžÔy7«ö†ü¢#&H–vÃdçQooám'éiÅÒÍºzJsjþ]³1¹z_j!Ikû}&!Á•}{(ÀXÛ&ËÑÐå¢kÖ=°ÀõÍÆ¢ä’«ÿ¹ÏÙ,I@“1à‡é†½0ûbòÓ‘mËg ß| Åc’» wx¡sN>9øÏV"êü?Ü¤I1ÑªÜÆÛ_éÊ×I'[á$´§›c£ek]zø¸ÑX™Ð‡nÎ|›$bcâ¦—1ol:ßÖt˜ ‡
ðM.@ž”›gÜ.$ö&›“À7DÿDÃ€Ü:—¿Ó™ 4ãßÖLp_Øoh&¸WîœJÒþmM÷6þ†¦û=ßš-Úç%=z‰q€\¬
Ãmx“ëZ«¾Á¬f
0Ù«Ä•LE¨ïÌ§È“MÚ,f³âSö¹­Ôžlxù2Ãî78ªúi1Ú`ð5ß~6aû©k Ó(¦9­˜j+ P›ë4-2'Aâú¬ìG—cÌ•ž3+Á-Ë}ÇÄ§F·üÈ?•Xjj¶t£Ö48ß¹ÑããÌshN¥¦GÌÚ¶Ð…ºK`} å ócf%4˜±o¼%´nñ'¼)é‰h’™ÀdœÐ-i¯›J(¯O‚ä£ŸO_íÜÜx¿ý†a|¶¼
~ÿŽÕ}Öºqh÷wCƒWºÉUh·ãýq¨c<MÃÄ4£ÑSÃäG¨U»Î>†IÚf›üšßGSÔ–\­yß‡#D±?NžzåJéý$t©AÜ˜ÀêCcz$þM©ÍƒÐ þÿª<§VjCÿ:šA¯d;‘_³Æ¡ÞäÊ#c÷— lž7òA¤pUåçm[ÞkÃ?ù%-îË€]¯§n¼å¾ ZE ¾ óæùÆù;@@©ûiQ§xš ýöYþž-ŽkvÆÀËæ×ŸBe$Ãž}ƒ‚°ÅÏ%ójÖÇQ“uÖ;-%w-ù×‡¹fÒ”¾Þ¬ÿè½9?ÉÅƒ»Œÿ¸.×ÖyÎè q@î3£ÉšAÓ`•.#è&0‹âÄ 6ƒ¤nmj›&Q®Ÿ—2FS”T‘ãÐã¦ÜHš¢Jœ÷¾¦äÂ8îÞn`…=ñ[ÍjÊùyyÃ(ŠÕ+`ðø÷´R»Œ¤é ÖLPÅ[V&½9GoC¯<³›ÂX»l—‡8Üßâ–-Ózæ>—¡16e"rÒGå™#|»¶¼R«ÕVæ„²›teÄÍ²#>¦«§÷?ÜìÊë»Qr°ûü¢êýW¾"{¯f[¿Æ€³+µ‹˜”ðTd1üÌtrÈ0Õ^påãË¯µöE‡»ÓGi~ÇC™|¥akÑR–°.Z‹Í6…’ùJ³-Â9Üãlëqî}äj¤{ &ŠÜGŸqkÇŽWSO€;õt­ëlc2'mCÃ­fOP);PÓÚÍ”m©±8	{¯¹[Æïµ¶õ0Tlu›
K‚ýô¶9ÀO §;7­¹¥s¼…Â{‡]0Ú9ôé· N,¸Ç¤†ØŽ¤²1²‚¶©áF@_aÃpëûÚˆ¾ÅÍ …–ÛåûËÚ`®¬±Í§í•7çqjçÏä{íÛëÉÀ†Í{1d­Ÿ¯gÈû\ïÜ`bß9îYí—Wäâú,GûBÒ_uº	Iõ±X2^­˜Túg°ãû"5 »“î8 wMÉªµ<b~atK§Tú~LcRŠŸMîÙ¦bÙ~Œëúi»p”³ˆ•›”QnÜ÷;Üã –àÇØ>Xx:½-L=„Þ=F»G	ï»ÇÉ¢\â8€Ö¦þðÎ8†sí8.ßÙÛ@í~Rg„qìÓÍr|ûRµr¸H‡¬¿ËõS ÝEßø±ó1ö»ŒÙÅ>š&¼ìñ¾v{]¥¡òŒr1R*EFH#Ê‰¿J4±U<÷IJ9âÄ=Þ¦D$-Sx,(2XÈÆ/GIvßIwôO:3=é¾Â +$ÙX,–%ÂÔXÏ¢þµŒ:4dôƒÚµÇ¿¤Tbá¤7òm}-´>Ý\HÐÊ©±N?SìñaÝ¡aí‘,~òLË\"­Žsš r™»¥®6ÒûQà^ÁäˆØº»PJE¸Èðä3	€¥íKSòö¯¬7ÎñÃ/•Ðm},¨ÞÓO7XxûKÆìŸô{ËøQüõÁ ÑKy{HÓ—|'rÏg¹k,;'ùá žpbœhÕµÿJÏ-©­šÙëïäiF.ó4ùÝ¦ðhŒ«€Y5õÜ=Q^W|›§¿é?VØfz« ë7ê¹-˜¾²7‚^ëqâ'3æð·rŠóL1Â›YB™âlåö§0Vfyô0µd |1ðTë1î`îîÐs—·­ü¹)°ƒç¡‚Ÿ;=æ[Qî½á)®š¥…#‘¡¼Ei]F}tˆ“|%v´˜U#³Ïœï¾>9èw÷Ë Ä©VæàKž¸%à*šâ©Š­ô§Ž/þbéÛ?~óöí°e±N–~í’%øqî·l¢}JF3)ŒÖaÄÍÐ»¸E<ù“+z8fÞ>r¬ñÑ³ñ^¬y¡SœZ0§âì]øÞ=¹ÞW	“Š”—Yi•­]:ô‰þ)1§ìƒòÞÜmÝ|˜Ð¶CÞUÈše	¡ýÃ2ÌÑRÒ eÙÒf²EÅ–\ÃÜáuÒM«™]»ÇZÐcÆøáû#ÝÛ +‰ˆ7XÇfEÝ…£ç}iÙÇÀaÍŠ§×ë»ø¼*ˆJV­×‰Œ´»["6C5ï€æ±ŽÅÊ³à:ZAõ"U(—" ­¸m'1æ0`ñ)Xyó‚nTý¶ˆÎ3)V‚âU- ñeZï¥‰™õ8Fýjˆ(‡¥Á2×GOq…|ÌˆÖÑÇ½"ä
êØ4—@çk,ƒ‚ÌË5Ö¦lŸ…Â›U>z:Þ´ù¦+TS@˜elcìã$_7áºÌgEš‡_2LLž03‘Ÿˆñ-‘aÔOÕâVHÝ_–G…2ÂÂ÷5»Ç}¯û}P­ã\ØiÞ ­ûiü_‰¶ƒC®­ä«ÔyÄ‚ÖleY°v‡[1™ß¿×‰ÒSV>€“cfË7Às—íŽÍ+]¡49å‘RIªxâ$ŠÇ:È($Û†:}¤9ÔbÙ>‹1Y[,.ýƒaYï–|àú‡3à­ÎÐãØñ'±¡ÊåžÇ=8ïÓGJ¦ÐeÈ{öíîÉIjPù—£:çá•g»‡GJU H7ôóÕª›Q9ÉÕn^¶rCÆM»óúÞÅ
NÜšû7/§~8¢øÆŽ(´9üB‡<S<SL<S<S<S<SÐçá˜âá˜âá˜âá˜âá˜âá˜âá˜âá˜BÿpLaû<S<SØ§üá˜âá˜âVTñpLñpLñg9¦xƒé	×Ã@Â‹1èòùJ6Ã‡óŠoì¼Â2_èÌB¥ƒ‡#‹‡#‰;/üÑ–t´ðç8XÈÝÔ.áPáÏr¤ƒ§‡óóóp^ðp^ðp^ðp^ðp^ðp^ðp^`§š‡ó‚‡ó‚‡óÛçá¼à¶Söp^pªx8/(u^ðÿ  ÿÿì½ëvÛ8²(üž­Ý»-glY’/8¶³ÄéÎwÇc;Ó{VvV‡–h›§%QMRq<¯õ­ó(çÎ+'9U€@€e;IïŽzÆ‘xÁ¥P(Ô½Äç›½à+±/c&&³Ne'] ôFþ:¿ùË_ÎgÊÀÊ¤šìE0€s/»¦Cs´\¬LWðG<9/.ÐgõF+tåâ‹ßOGÁä7~ñ/7ÛLkh[ªÈß½·´ùx6ñäËá6Ã\Ò“‹ÆU°<ûT	e‰ýË¦‰4”Xðû8Ì‚héÇQã~Ð~Å:æ¨÷|€–Ç”‰9žýËßg‚šðÒ-¹qg7‡Cç<©j§TÖ©^ÇêÖ®~Eµ‰±X°ÌÆ+êòb­âŠÅS5é—öï´,°“Ê/R"¸¾"p?/DJà<g‡ŸÔkö}ŠŽ.ä7j±o×6oZ±íœ\IØÿ¼•€–+Û¹n9S%â³bx<Ë˜¤H¥gËÉ«/
Å{¡ßâªåuJú§×·.³Ž”µØmu,—]²Rü¹¹ë…5ôF–ÙHYûõ¶å1ƒ"„Ÿž ·ô*¾
“g0d3pïcÐ’$	®G€Ï}®°‹wÅ#¤j:;/:[.¯’U»úÏXi6®® MÆ®×Áë$“!ó%sø_]Æì2ørÃ£ µ€nKCÛZµW·r!Kn›mW©œ0ë­ú&­¯9^d­é¥YœX+A^KûX(´¯‰ÃúÆ«%}pflÕ³n¹†™"ÀyPºËõRåzˆ…	cêµöcöR,X¾››×¶kq9³qði•ª»)‚Kkïô2L eáÿƒ`å$]³I\`.2Û°< Z¶6¡Åâ„µÎ Õ±×ì‘?‘ß­Â®‹$2üƒ8”õì-~öÙèBù¹ÎßR9s»Q)%X [ºÚàÐDÝ”²ß/Vºlú”¨ß1[5…){y½¾‚ÑÑÊ¢+9dõ"~ä{`Öì¶äfµ1 &{Ã·ðIfß"Î–J§ï†ËH{þ¡ài1/f ØYßfgx™ŽŽâ|áZ6Q&T*ÚŠª¡¤kƒÎF³Â¦L?¶¸ªÙi‰u;t@Mö³v×™¶ÞiýµñHù=ª8©‰ê’¢3+eWÕs¢Uã$aR"edÎbbæZ††ú#öÕñáváO0J&7¥#TYùÜ3wÏ¡ŸjWÿAç®•cî9˜QÊ(^8w ÃØ7} ƒÉ¡Ú‡æàód$²ÒfUÀIü[ø–8Ü¯—˜pD“ðŠ!\ÚX-û…E@ñ×	ÉÆmÝ9Ê¸+ g_ca¶4™Ã$,­°1€é®¤— ²Âï!ÛËïWšÀ*²éžqß0É„|O%U¢±PÐ—¼r²awF!Ò!d€‡Þ"@.ªã=låT•é­¹Ìí@,×Ç±‚¶5Íà”§U¦ŸnRæ¦êBöÊª–Ä½eU¬ùÇ¨e­¶YÐ0Ç»z÷Vu^¨~šÖ·Î½•æ2-ªZëg|Ýihÿò“EÙæC9ÝO^°GöçœÝ¬µ¼å¤-®ªãø±W(©»îvÑ•†Yy[éŠ»Z÷¢µÏ±ìˆEß,é|‡‹/ÔÚXi55åm§]°á+¹²Ö±²
$ÿR+ÈðÈ®;»ýÚ>,séµü,'–y8`~ž'azùìJ)¹íXŸcbò^30+íw­¡õTØY+Ä(ýžîZc
„òž‡Åà8†U§:nßÒí9›¥a²‚(§£ÖŒtÿxu›½ˆ’ðç­ñˆ Ó$>R¶ÍðÞÿ‘ëÓ™¦O—@·+,3ìÿ=ÛÅÖùÂ¥, <“ª_ !ÿ~ÂÂþÇÑ„_ :|¿bÝú}1‹†XñöW@–èb-íµóæÈL#zþ–:•LÔ¾ÛKÚS²¢+=z"~T<Û˜[9 eþ]{ú<¥¡úðqBà7ÜbÓšÌF£½6þU_%(<»¿½RzÝ7¯Zû‡VàÚÁù9ÖüRž¼í¾O-¡ëGz=0Ý2Š6K	›sÜ^Î#YvÙºjŸ´©%³P1šeÉµfÑä£ÀvÇáP‚.z—K¯ðþþ>“ë6ÖöãxÝž­°¿Ÿ¶–WØjgÚ-ÙdîîîÂ_£Wxr£¬Ý[vöw2	¦¨« ÊÈdRž¿q`ËO7|§Ž§Ù5Ç¸Øwä«ª¡¸~KAvÓ,¨Ý:½Y^™]Ç3Fd¸Ña¦lg,ü‘A‹	­*<‘#ë°£Qˆ„—P _O”ÖâçaÅx~‡Ëh}±Xl Ô¯Ó2¬¡Üœ¥^»1ABsÜ-Mßœdá ÌW× •æb#µÂ¥6ó^xû{8Öü–:ÞrWstºýØ2©Ô†B¦‹‚ê»4Gœ²@û¾ÊH@ÔUbQÊ‚Q(tÍ°~sÊQãV6»„{ùZwØ›Éèša-÷òû£ø
^š¢e‹ž/­ùÐ¸Ç—Ó2å•¿Ô¼¾¶Æ^à091OW{¶²3V˜<¾"ÔxÐ½+Dà^éþNÜáPÒjBŽ!¼ÒIãqØÚ¼YøËÃ à…a¿´KÒw;Ží‰¶$ã¾ó†~P‹Ûá8ˆFüþÿÓ4‚ß“‹à,þ¼ÑÄc @éá€¦ŒNY<Ó7=nt¢+ÈnAp¡ÿöw%èAGæ‰Cd·×…ÿÐ™Ê$ äI|ž±« ™à>äÄ¢µ«bTMpÿ–Û%ÿ~ÃA6¸dmà+–KG*¬F'ô¦Ì‰<]Ú4Æ—Ô^\ýß0rké‡¶õ /}¨¥ÛûâßˆåT˜`Û*Xï$÷«,_™Wéõï†Yq/Â"È
Œ/§(ÅXíÏê»¡8äŽ0»°œD6v¦žøÔœA:òêøPã@”ÃÆx€•g‡ì*‚¥&LŽ]v )<	ˆ~ ÇqÖ›VØ‘DÆ8ÉŒƒhíVn‹»@~VgÑŽÓ]lè¾Æ³ÌpF,xrÀßì2œ”œiihÔËù&)(ûøv³Â@j?$™§–h™”Óxè)xA‘ƒ¸ÔèùžYyM† D¢Þ¶+%ŒGñE»¥<;0–E®Y!3©[ÎFÉó„ÎÁV ¬@2®$N¨À)e„úÚª<._]•J|NÙ¤\R`)’,XUÁ Øx}‹ÁAy;;JQÛÀˆâdHæ8È¢í(dCÑj"ž¡^”vøD‚á&R>ƒ$	hm›àÓ)$Ö½ÞfÄ²?7¾ù ?> 2Äk?Ûf¹:/OÞkŽA§A4ül°t›½ë½×ï…Ÿ¦Q¦Zcø§3‰¯Ú˜a}k“=`ýø³Õ•z]ØÇz—*íÓhV‰¿¸±U¡0P¥AbŠÒß@¸ 	"‹s™ˆh’šäÚ¹½Ì-FsÊ‰iƒƒ_ÅËŠsÛãÔö?³:±Kçµ>pèÍº¿ÕãšHŸxÐv^çHðAžÖßÏ‹YÜ,z^¸ÃU•¡HÇqœI)—ÃGxÐi¢M7	ð ¹q›·=‹â@m«ÙkµŠé¶µ!>É%¡m~`æÏ£t:
®‰ØP“Êl¸èæIn ,ýÇÒò»î{ê‡®ôìAÚt´+SJPè@Ô˜Ì›-,MÃ	.ô’‚ËN§v[B;sü¹­^»ç¹â\LñGú”¾=Äÿu%_Åå¹ìhRŽæ"DXÍB…<
l©¾–œ’Â3ncøÏ²v¢+L£ÂÒX¹F]/ƒßX< §0 ²3ÒòŠ®¡ežmÖÊwÆ€àHwa!¥ÇÖ—óqš©cËáæº©w1—Näšy®Ö¬‚žW<>/˜¤Ð¼ˆžu†¹Ó1=8€ÎÐ2OW»2ïË÷2¼äÿÄÓ`e×«]6#ìu5üˆ ÕI<	+<ÓµÆ{k,Aofúvµún³KF§Ëü[a2îuÇ³Ñ,A+%„Ù«rµy¿Á¹˜EÁ£ÑÄ\¶Yw…Áß~—ÝÒJ0‰€)
µçzôœö˜æªIÃãŽˆ£‹"a:åsWÕ®æ(W8¿Iw9éö†~û.Ç¹|Y1ßŽ´¡¹á®ÆqÏVV:ê_­ö¶Ðn¸åçàå»6þ´Š&¹Ø“*VØô‚Åˆ«Y€«÷ÎWnô[ïF¿²7±Ãµ€Oß×]nöJnö­½Üì&Î)ÓËÚÏ+5CnÙã¬Ñaô¡F’C~6;Òd@ÌTs2ÝQjœJ­^¤ë–u·9ÆhaTLwºáYÞP-Êb•mVa/'j2c¶ªüÌÊ­‘è ¤!ÏHu#kîŠÊ˜J¦úÂ•ÓZYS×¹Ÿ¤}‘GH+"EÌ`[Æ¬^/O˜•{3s(”£ líFk,y‚/¹Æ9_R¬±˜È*r0|Ée¾ûU¾¨÷±ÊªzàK®´Á¿
¨Og	P\¹Øâ—\kåæ—Xê§qüÛ`­ïa¹¹Üÿ3 ƒ¡’&š¢i0º‡å·xf|I,°GA†ÜƒÛåúEÐà4¸¸{øI ‚=—€¸½¯Yõ?ó²W®â¤à—òU£
šÀ[`B0>ƒ¿ø‰Å­/'—Q8ÞEPŒý>˜PÇ$òËëÕM» `zœ…#Kœ@o‘ä²ÀêâÁoîÕþGõUh:ì¬QwÆ¢Ét–™°ƒÑà,õ-¦$àý%z¢ïÎC2z¨Þbí°“ÉE˜u¨‘åÇ¦EC•èÌ-ÑÊàžÈ¶kp—Ã·•ýÏ2
8Aé 7˜¥Û:ÿºI©½ð:*0¤¢ø¡<RŽc)"¡OG°Ü—°Fa²Û: ]¨ûé/ØD*åŠA+9/«’¶CÀ¾Q¬âÒ³K¸–Ï,¡À¸–<1ï9…À¦@íÕñ¡I]hš#*Fï”îÙ°M„Íôs hÁo»qT}¦’hÚë¯ªG™ŒeÇ!fÞÃCñp†DÞ|¿‘jwÑU:µç\	hà²3bÒ­7BµŽ±<žÊ#cIC2å«'YG*\Õ}[Æš¬«-÷±õŸÏ¢d€jN3‹ŒùJ/ae[íÊ°4étý°|Â•u ÔÊŠ
D2…¤]EÖ§³Ò"˜QnöÕ\V|ç%ÏÛÒB‡  wÃ®Ög%*¢Ò%Á´ºµÛ°7J‘à
1—qC«´a¦&ë:N@À&E“Rø5M§,l´œqbÁÇ BEù:Ž[Q¦ÒÂCæd¡RWQv¥˜.gN@þ_ÿbåå€‹ßÉ³š¼½ìçšÆ–éaî6¡öT&p®h |¥cÇ’‡zðñè‚ñ¨êíƒWßu;¾7Y^9ím©‡Í™_Ì’4N€‚f«Ò3³i„ºÄ9dŸ˜AB;¥…x˜hŠO{œ»>/9U‹þ	½é8Ch£‘Rd¬M¥è’J_u¾´¼‰]ÁBáñ
ˆC‰~8’v£x‚71(¾Å˜É$†8²Ø‹7¶Y›ŒZ2õf$†yÀ5
V +Ÿ’Á(o[8ÏX‚&\aÊ`0tW$_] 2á/ºKÏÛé#{mN=vw‹ßK€ëüÏpÈ}öÐÂ—„t ·×þ+ýëŒi©ÈVo×“Óäæ½9µõâ W;½©2þñ¥j«/¬ð5²˜]ÀÂØw×Æ85«SÙ ç%ÿ,s}Þ¼0Ìmä†¹Ü0—ËàN³ã'ÁéÛ´Ûéø¯ÀZGÂ=YëTó[CËfŒsé=îÊÇ[,%òú9M»h5Â™ù{šä¶²ÝŽ¹KÚaœ±83Ýèækrã¯2·©Ìì4óÏFÃÉeñ’3Í NÒq4Žqc¤9x“ ÈýNb’m!:èºRb|U
Ñ	†£”²x #Vƒ‚MG¢Âý:Ñ'þ€­iIVò”6.ÁŒµaâË6Ù*;…cC2¶ËÅÆ;\%Cø=>Ôž+o4'v”Ôl4°øªŒ†c+·ÿ]iù¬¬ºb„ýïÅ«›"õçã×O`MªaÖ»~"/(k-Fs{‚äŒo˜kåê¢
þrY•$ EêàÒ¶qCúä*B>pŸ{9²5ÆÇä£—?J%Gq’#-{+%ZM¹s*ÿÎK–ˆ®|Hü;šO/Ãqø:#¼Æeb™Ø¯ ò’cŠ¤£÷ø<‹Ëâêe|õ"‡g@¬ñJ”Ê_ØæÙ(NCõ!
#G‘‚'@{+~ŠñS2ŠÏÌ.›çcUg-S‡«üÛ»÷*T1Ê‘'æ:xÈå·¨C	ÇY¤9Bv#GcÂº•~3QWÃœ†¾2Ûpú€ Ø–È|“Ç÷«þ±<øÜXB‚ŒºŽù8ù”-ù)—.+ÄQNHOƒ3´.éi .¨ŠÉÊÂ=’¾Y†l ýDv'‰`ãáHø“p0Œaç`ð¿hD‹êàñŒ%Ï‚DÄök—ªcöñu%ë‰Ö†q½¾¡“½nþ6þ¨y…¼¹xe¢ç˜yÄ_.]Ö 9—[%ß)+Tci›á‚—º13½N³ P&¥®Žøw­}Ú({íwïÕ¡ÂKGÁõXDèÒ‹òwýËâP{Ë·_)4åºÙ-ÑL¾žƒ0šf¼sóª9÷äslâòÎ¾qQkÎ¸éœx.Ôf˜_¬œ¥Tˆ%/(¬:,å²%£l
 hK¶æžÁSqrmiR¿UÙì_\Ù%xð §	O:Ñp9÷ÿ74J9TÕ’¨{É¢ Vù25òµúU<Ö’¡Àkkì§ +n"1/¤+º0žšjœ½|ž——ÄiŠ1+ˆ^9©f—¦w¹fmló³¥äL)©à²2Ê<ñ9æ	×Êã¯]QŠÀ
Ná‰ùæÚ$Ù$ìyy¤oü6Ð…üâ{-¬D—hx¢¦™ÌQ˜øwßAƒEÄœñ¢–ÊV‹ž3w‚Du×‚VÎÉ•z…Ñ/hX3¬ˆygx~%tÒ Ÿ³õ®2aŠåá35§/¶Ú®wmõ73¨À4Í ãòd›¿a ì•¯ˆÄ¹Q˜±ÙHïXMqÞî² 9Ð-þ£Žˆ^ð„Û1ðÀi‘µåXWx@»!Êã‚0TKÍ€¨C+|$F¸)£ðð2öŸ—71Ö±ˆ(ÿP´{BQ`pžx ãò-,©‰)=s4–¡ï8”NŠ‰ÁÚÁ
;3ÂUó<!¾²cnj†âk0ì­uJ!AŸ ËÝîv·Ëïá3(J¶ö[;³·væÑšPÉæÍuF”«-`@>h-º¶bO $¼wÅÍŠÐ5k«œyžIÉO1~ô±œJ6ÃQ0“†ÀHŽ¹¸Ã(™xAäÉ¹×F-E“zP¼(P)ú(m,ûærm0
“+=-$NÛeúŽÉGP•ßOÌ­SÚ>ê“w³\BGSÑ´aFÕUc™¦IÌß¤¡ãü@’7ÏÀsà6Ã!â½W´\ß»„—{G‹F—Ý«´°ˆf§¢9ê¢/ë8 Ÿ¼É#Ø•lvúÙú¾žcáü“Ž´);ùbOUž…³äÜbÀÿz¼s‘nGÑ1öx-rn‚_BöB9ð5+Ë³$]ÒÎ4¼RÚw¢ý4[’“Z‚Ævw—rá³˜­õd1¯à­ÒK˜¿°ˆ„‚Ú©œ~(c§t·çÞ²J“…`£î¢ÛRbXºN€ožTGŽ©É5Ù•
‘/»ÑD>¡£Š¼ZB¥Á[£Œ$èÅA_½\x#ELwò9Þ/þÈÎ]ç='wyÖ#†ÉÉY¢NÝýÖÓ\ÚycpËÔÕXÛ’©k®%™ÌÆ¼3‰”¯Ãql!ÁšjŽª˜hWùDÌj]K"ú0^ÌKzÃ›†/'Y{ÐÁGÉ1ÈÈ“ò$HxáS°€šYÂÈ‘"Û5Ò£¤òúk:bïj¦ÜÓ©¼;ä€iÉµ)Qš0šþ@yŸ·4kŸªm±µécr¡=x/Â,Éˆ:ðÒ;Fu,ázv¼«ø[ ¥°u^£8	F­m“YŸól¼Û¬õ4
Uô°+Î.àjÉ±ÑVcËâ­ ›i/t[Eü9ˆ4×Vc_štõAÀÈ@0T†!.ä¿¡ä¯•C™*!rBO¬pûC	.²ƒ¬°…?óáÐ/c0â\rÝl%dò§çì”±äÎ¦s€ê}`G¾£Žgž³QV1Š7¤BÚˆ™·uˆ”jŒZÃ9Œaäæ§|…“`ËHãs†ØA	dùDƒÃ—¡(å=+k)…]ÞV9õIXRMuÐ¡N>’¦iò±#76ªˆ !Þ­¼úr¨0ûBíum†O:e‚@„¬tUOUoãpË³°Ñ³"Wˆ:s]KYÌž2©òÑÄ#Z_ú{*¬ªz÷ß/ŽUN"ËZc›ÊÖ¥w5Ìrn»`"‡ÜXo–øËýÄ
þ†J,µ†¹cP])Ar†@¦O«+Ý²(Nîûmq!ð*…³ž7a–>(û7=d—¼^¡%· ª3Ë+^®zZÔ±¼i3­ÛÛ+Óì\öFïGÒè]òf0Ýœ¤37‰ì¬]ö,ýÔ:;©µ[ª«¸%­½¹Ž¿Øª¥¸L]6ï‚HÞX >o»ð)¯7È«Ê”Š aª»JHˆ>v[†+ã…²ü°°X×Äy÷JÈxÏÌgáÆDÜ‹²žÑdõÊÕ§­êOu¨wÍ›MNÉw½>%\õ*ê&qÇgW=—ŠzK¶±ÛªæX÷ªíš½ò‚âÑ¢;#” •ì«g'53O˜ÅO6K…t¼U£A´xT%Žð^¾¥¨*QCDÒÔØI˜aêÔxØ×#&²,¬$“ÖÊ	®¢%
¨Uo‰?  ]•S@õP9¨-îJÅù¯üÈF½ ½ð+Qý"¼æ‰¦N~ŸaÙÂ…—Ââ·e?N6t°æQ`egFô“pàmÚ,Üy3Ë\ß¾p ð
ÇqMLò·Ú+x§kîÙ< Ò‘çŠQ	T20õÜSM¨§Œ[˜aHxVÃYµEgU—x®kh¤£R®Th¶—,TNÇ‡6Š_™J¤BBGb{í5³®$QÚÈý¹y¹8½:±qˆHlÁ÷Xös8ÅÒvË2ßÊÒò»Þû'2Cœ5U	Å;Œgï³Î±3_¬‚ÿÂ3Î¬Ñ„¦¿ýp[^áe&9C£•ß¥£×Â¶½ëvúáø½f¥Ü:à1ç÷ZËù¾	çøl„]m^ñ*BæhÝRVokïäl^–›>÷(æmî^Õ–C!´WáÇp´,µ•OXë õ“X§pÒbÛì&!±r^éµ›Us°—úsUí«¦zåÛÃÉÐYõÛÙf9îÕ`¨\ôÚ–éC"¥`Èëä’š
€îò"»Å”*³‰ñ…÷½û;f-Â¡PuÙaæZëu[	d‡ìTqYYÖú!“i;J4~¾ö€ª	ö³p‰âˆqÂ¬”nîòuêYëÐÕœ“îPŠ¾Yý÷%u)†ÇUW×R¼ï[Ã°¢âèŽ åËA\¥+p.¸1ÀŠŽ,ummrØÃ"®	“R˜K^U ÖG g¬<+RªaM¢±¬O\È•hî:¦·®Wª¾«$˜VR¸N—]:ì
P›ƒ‡óÉe2M)®â+Àâ*¹­è™.Y:£:6oÀTç*?a+ªÏå†:þ\þó±³cMéøÔ”—ª3u—³¥O©|¡éf¯@®¢4.‡š^¶–4>}‹ŽÇì”¨8R¼ëmÐáóý\Y ^Õ¶àJ5¦§Un5ÁÀjxPÏê¬Q¥{Ëò¶qç4v1§æU‚×Õzõ=O¥½çTÔÑ~épm©ªî´u˜--ÝG>J,Ý*0Kçy±Êˆ-k6î¼TÏ:WzU·_ïF-xerñ¥·“ß&ñÕD¤cª‡tUÁQþ)UŽ{9jo~FËÂªdU…
—×JÒõ-‡Ð:®©™¥¬¢w­#ÕhˆAÙ¼¹Ê¸X\a”)Î3Ë‹Bõ,gÞËcjŠ˜ºâ­Dü6uâ÷iÔ˜¯6Éä÷ó<ÚG$_q=OjgÈî9ç„Zß¶Ê1~[N’hÇiÚë©uÝ[añ¥‘qM_ÍÚäV_ãâˆ¨´†«3/¹ßÜQl})•°4ØŸk=Õ`¹/»¤nÞ£pqÇ‹U½^`;ê±„_Í¦4B¿Æ­ùLâg#ŸE¤çW³VÅ¾ÊuÊƒ­‘CŠvìúê©té›ÒfQËýñëI²k<¹Î±¯æ×lòâš<W²%–)™*2VâÇE?mª#w‘z8FÃdh:É„J’µLË‰/ €T¤ç0Þùí“·„C÷	{[, êõvl0¢³«?M‘£$ËK÷‹ø©’ãvžƒÐG^ØC!n<²£µ\+ .¼X÷¹Nöû?ØJq(ÝÅRUh”Èò¥gË†Öðàp¥ß²“ˆy©0ªù^éØçPäC À ñUzÙ¦Õ­è)¡Õ\)”>é¼Ky<vEäòÏŸ·;¹Z?RÙú®·Âú+l}…m¼ÇàÃ"›Ã»÷ËE¼³°Xæîþ¹P;µbzÃGøß¬ž2ºŒV³u®’ü_âä·cèâ#ì@d‘ï”§5ë ÛE6uNƒÔã…t6Sf»SàÎêÇ)|
ÆâArÆ~Mø±U~dƒ.=ÿÜTÜ®º‡Ë¯ã¡#Ð¾
Ð•:wVí’A^"…+¯‡ºªâ\vwy…©Ñ(?šjóUØØuK^iÏl‚N;]iPf•nmÍ_¬°µéê¦5M-mssÄ$w­½Ã˜k†29KZm[Sú+kÁá|2¬mÜÎ‹Jf³ÖÞ?“»Š0å3ˆ;AÂ0 NãŠ+Tí	Ñwd§èÆ'è@ÇGÑ]³ª-ó—ZÚÏ¦ñ6vQg@üÚÁ`°"	{Í©À4z^œŠŽ_b(®ÖxÅ;zþý2+¾Cïª©iñlg:K/Ûr">‡¼[à6§pu. ìLèÐX)òhíùœ=¼áà	QðÓ¶±&Â|ù®€Ó
‡¬|à=·•VšŒ=P±³ØX‘¶–Ø’„jÞP®¡<7e¡p±™åü˜öqØÖ	47b•[»š¶4;VóÑÈËÕé'Íâ1f³´¡õ™êÊƒ=ôZ©)Dè³(l®!(!°Ør5¤ƒÁÔŠ8ÓÆÜYÕøh,¿‹häß18“m6Fƒ›Ö±]D‹Ë,_¿/w(õ
'<eÎ¥Ngg£(½üI2«¿¿Ç€æÊAÆ˜ ŸZäL“`•òˆÙ
0SgXJþ#@R
²%Äo«ÏHŠüÞ
ã´¾²¿Ê¾WÅ×,Íb2ÊnÅ Üw¼ø+gÑŽò‡(™<U¢R!ó,Ù(üÅSL-Å>6l¥XôÍuª\R«©µº©è$µ´§ã’Œkä{Eºï–vñS»õ¬:!»2gH¼ù>³e3àmš4` ==§u•ŒÐÀâåžÈédvÁ(Û/43&CoŽÂEÖñc5.ÂB´r_ßyÁïÀ‚ú83Ð0¼yc»×œMØÐCñh<«†BmõêÃ9¦œÖuA!¡·u§B‚UR,ãÀÛ(˜ôál½Ç çÍUùÁS«.àé†¯ˆb·âÐ©U'èÍÆÙ›sÌ>T8ô˜_á'/G¶ëê!ƒµ_¬ÏD“Áš¶¯æ±‹ßSž’zþÙñ8MÔ,¿ß4yÅPº~§ ¤¯ Õ–f´=/xžQôw‡ëë£ZèzÀ]hú¨ X×ÔªöÂî–‡îSÊ\ž°%™Š{iFpMé»™%w9DmpmÐžW¨E’qKTWßôü“nr–Q(‰Ã-ZöaÐ‹ˆ˜4 Ò<.ƒ~™Ø<á.bË6é¡e&âòY¿ƒ@‚D‹ÜúÓòG OªL[,é#ó„3Ž·—ë^þ»Æó¤“–Þ›Ú9£P™®kí­6 2¼æêÝÝ ®âÀ?x#M!Žj:ÿÀC³¨”²á¤Í:f…è
¤£¢v^…Ú¤/—%?þ;°IÓ^‡¢ù_Œš˜byIË¾›õ&¾Ÿ£ð¹·Ë~ÜÌkƒ~áq!=“c­÷g‰S9ð|ß8ŸHÌÛ‚Í´ÿñ¢2PÍ£ó3RSIÅìO˜zuô[iª±W½4>N”©G“úAÔ<á2ÚÜ,·KîÅü3:Mªø’¶s®•ŽÞª=KBIVÿõ/6¿F5J™óq¹Âñ¡.²É)[Æsµ2k.xÅ¨B€ÊeÎuÅœGýU¸So”K;Û:¬A'‹éÓ°ØÏE[ù¦#SŸ¯’‡¥^†–ºáóá(‰?Â†eiÞ¯®4‡„˜AšK(G\µ¤‰+o{ºØTëK7,ùvôÏ}‰R¨³È‰ÖW+0Š,Tò5¥Áb±j©¸å§Ì­¿ßèÇ—’ë¥°°UZ‡Az–´m(Î(²G9-‡.5•kÐÏ¨òE.ùœsvd‹‡-L×Y"¬–y|ETc§¾|½í¤À?†ÙH^c«Dý˜*ç±0ÕUuÍ­²ü…š–ÔA—«ýª\[’Ëu¬m4¾`i2Ø-€uÃ‚QØoVvú=¬Éñ>­^ªUyÙH:mW©`¥Ö°sþ,«_ÈaþÁ
­°¶l)ÎO®H%RÃz;³öÁŠñ•ipPÂ^_Ý½<M¨Òæsžî°É»hš¾DŠ¯:°çQ2n·ŽÃ1 †È=,ôIk¹ÆÅøèÙà}>¼ìëŒŠÀi•_eqÖŠ®Š×E!=7üJÃn{÷¡8:„·ï·Ù0Ä:Ã/0@»Ò"VúT9ûXž¶––õûð²yyMŒY‡v…-q0.­°zkE"‰hx³&‡—sàÝ|h6vïg}Ÿ¬µmÉ­~ì*í³Õ5ø¢$ø“²œÍ­“ÈP-µ,
 *g3}E_5i.£¢€=àÃµ*ºZÉÕºHq$öaNSý^÷¦âÿéë^ª¼Sëé«>ëE }õ:¥ÌþN_ŽhFhõ†ávÑÈ­ÊkÝØÛ©âæëíŠÖìð«T˜Vr\è•Æe©px·–@ÍÔ=pjMØ€¢ìèw9çíGš›Š/AbU¬ÝÍ‹«tIërÀ« µ—èþ’7¦Ç;ÈÐ@›KÓÙìÕ`0§8 ¥h\„k¾OTT]aB*Ø1ÊS&cy1^ü¾ëúÚçsð­f'¬¬E¹owÙ$¼b‚YzmÓõ&Üm\hãï2Á/&MÆbt¨âÛÚ`˜˜Y€çIøàQFç‰Õ›ŒpÎíònîC¥a[Í·Û±n_žykÂ¾±"§ºÏG`9þ³Ÿ>²àíñ+¾ýü[ñæ›Q¤gß=ëÉªú!ÕšÉc,N¦ÕžÓH³+_F·Bã+SÇ8Yš²¹.SŒøø±Ç!U'ŽÁ‹Wðe&½yÄo'ü·þÛ	_ÿùvÂû>ÿí„·¾ðÆ^è+îþ€¯¢rJ£}Ý¦ÖxhQkäÙÄ;Ò8CÍ+ž£àìší?Fi˜ †ãöÞõTF‰ºànÕ}ÇáÞà²5¡³%æ‰&ñk;%èC€žª§AE†^·ÿ@­óÀÃš„­¶a7Ë).Ú°…fæ{ÇÀa˜t{ËïÁ¼Â×Qµ\ãuàt9PƒJ4G[Vk†G€Ð@@€•«PÙU"©_nŽ^eðâfb»ÓfžóÝfq†§y|Å$ž„¸|lÓõŠÕ©²Çjç€V·£Õ’v„·oM¬œ–ˆ€ÐûÞÿþ“LHpÿÞþìÞþYîmaú²:ýLÓš/õãÍª1~ËA,€-Cã.vuqp–IjíÖÄÉ§ò g™x8`egZ œÞ`](œ9¡à#M	ÿñT³]$ñþ¶›Iºæ˜ÍVÉ>†åN¿ˆ>…Ãv¿~ÂÜ™°ê	ŸËzÿÑ†2h%âØÚ{ööõÛWû§/ÿ~À~:Ú¯MS6©M?YLj"¾Îg>ŒJû–£0Wþrðl§TMO«Ü(ee}eceó=ÁQ¥ðäŠn9`£\˜|¶³Ë6‡_TÐY÷÷*xÔâM=ÇYQ‰CçkT)ì€&ÖðÓ”3Ïœ×(8œ$¾ Y6½ú4æe½R;s˜z¥j’ü„˜b‘PÃ‘lÀ…Ú¬ö™µ˜­±T¯ºXp?M2¦xÖ+,† T‹[·W‹s/‘6‘J®Ü’Ž¡‚Ý+±ÂÝjTV((¹J‹Â‰"iÞg°é—jÜ,ÀxW„CÔxòö	™®W·èßOnuqgÞ™‰^V;,c$ÙÊQ2YÖ_<6Ž²kÜHî§ÀÐ´û•²î¢ •X<!—¬+*|e 9	?Ý#@ÒðÓ­HœÏåÚã]Mi}	wŠüÓ”FÑ>¹¢WTyï8RÔ2§x Wv<yKzÿÜtO®­143­Æ“Ñ5ÅHÍ¿½‰Hb“æG&5wuYè‡v­:#û[¨×ÚcÚM+‹êY9¶v%¼ÖÍ““hŒ(aÊÄ!ý;œ%äBíNT‡õ«°øÎ(¢%Û…IÆN2h‡Š•ÊWÙ¡¤ü-Õ.“7Œêe¼>Õ&Ë…“uYÁL¾ ©ûÅ§ÔÒdæF.ÆT”–U–<<] Îk­}ªH£¡Ó¢'ðJTÆ<¶öž‡Óƒ!{C TÖ%ž°£Ó}Q§„H0Ü„½¬ŠÂYÆ¡2rj¦f©6Ä¸ö«¸á}ïx€Ùê)OÇöÓ4D„n¬ƒ]f:3ª 
¿lî>Æ£Ù$’ë:r^ÀaŒaº‚C!ÞR­öôzÿþû‰Ád@ð"ôLB¬‰EÅä1^d–Þ°íFiÞ;‹Ïó ´„gˆ˜íRÄòœüýàøÁvÂ•ìòðj}ßƒë¾@“0¡!±Â!l­krM(£J1ÏŽsš×êªb„qß¾œ)û	™`ÏZ
}KÇþ¹Á£3#¼<$­»Öüpž3—8Ç^„!;%ÿ:	¾B~E³;f/’º•JñÑ:­¾Q¿U“îZ{ÿ÷ýŸù4`°F¾¯sßÜQz=C3*i¡¡±£àZiépŠíL;çaø’×6;ÕÏ¦ëé5´ ³¼ðÊ²¨õ÷„2’m‹¼díóN0\ÈxÚŠÖnP©èë¢´«CnžÒLŠ:B…@¶ö^ÀžÏ€ëBo„"Y#nlŠÚ `\_ï¿ç¾¢ª§XEA¯{qw[Ë¬!yÛ­–ï­|;hûkªäÓkOÞÑãî×‚Ÿ§—˜–þ:žqfN6<ãßügÇËãpFÓ,e¯â‹Ü¸[tT2eÜ5d´æKáÕ›óóX¹&Eæ LÂ`§Š´HX’ô8šWHYUÂ^üÙiŒ07m ,X%7¯ôë]î¶>ËJeu=gQUVrÒð+MËËi¢ŠG9)hX§VÏ ½ajƒÕí×ÚS{µW_ˆÍÑ×
zAÔH«bœ*g9Þk<6^ÅèÑ§©â¥pNA¬V#ªv-dÉÊèÁªÝŠ†hÏàªÊ&S5ÒØ÷*­|þëÌ“åÆ’ïA\Òvhþ>ÃRð8ì):‰x¸tQ¼¸2åG\¼ ?W¯™øRd]® DÎÞQvnàƒï³ÃykÞáØ`HO¶(½h]V›s¥ïBÅ¾³Œ©¦Ñ¦“Çaf³Ñèú$Ì2î5cÌy¹#ÔE¨lßCt©‰ª(lßjF*Ì¹î.ÁZ•ºž+™C7xÍ[U”Z*Òa‘ýÜ+—Sƒå—{ûÂTjc—¥£Ì™'õjf™xÃ«¾2i!å#bk`¬(ÃeŽ×dÚ€¥Ð®Dç6’ÿÌÏ^ÅçÖ¦è›~"Æ¥[ÔÁ5¹Wÿìzù$=§ã<Í3UÞüá:%ÓQX VüþBäÉ¹=ÁQ_Ð¾Ñí^Ì¾É»¹µÐ´“€Ó‘ç÷LOIï ¨	HÈ8\Ó{½²"zTÞ¾ññA_4}´’ŽÎ*Ã0¸DºL¿)—AÀ!ŸE;hYõ)ò"Ÿ£à,-œ¾À.%·ö4mÃózgzò”U°Íã>Ü*MíTo H©ïÜŠô­=ÔÿcÏæ™ŠÞ””ÒXa+ž(<†26<séñ£ôDÏZ³xñ1g°(Õ&”vßáÏŽ$µÏIjzS§Ïye@UYShÍ°ÀD]"/H¿?Þ!cß³(ŒB™·…¬x&é¾{ŠM™„5õs-b^-Ùín»²­;Zi¶Ìîþ¦HP-$]Ýnr‰_S ÜÅ
éëüà„ÔÑpµï½ ûóÀÕUóâ¶PmV£>…ìpNPãôs}>OÝªì\UNâJ­]G[­úª²ä½=ÅX&mâ†òÙÔ¾ŸW©›käMŽëÐÀqÇŠ]Eù÷÷0ÞíL‰jÈä|¾é{¯ž·¨ÑékÔõ¬ä]©zSÏ¨{ÍÅŒ²`Ê±ØUÐøG<c—ÁÇê`ŒÑ!6˜\‹Ò˜°â<1:àäž>ºMù²
¯˜;Rþæ	\?ÕVÿÙÉ()µN@çˆ¶+êh±Ë0Öà,ñ£nÑÍô¸\eHìµ‡à˜Zm
#ö9¡z]î¬e—·hâÍ1ãN×·l‡XŒeL¤¹ê–îs‘Ž¶·jIxÛÅ·›¢K„›Æ£=x$©ÆÄµzTÜÉÎâáµ—½DÅÅõc¡Ñ4+6™T¦õeMùð®]Ÿ¢nÝG¶Î†ˆ×þü$ŸÄWI0E³zgÊÇƒx¢{V·c]s(Ä“ØŽ³Ù¥Þâ„o…[weÑŽSçaxÈÕâ·o8Ó”ýbŽ®žY¼Ëd6À4D´Ø»^ÙzšÐ@n­;™V¥Z£dØFª«4ÌŽ@ì
F'—ñ•`XÙ=¹¨CW„¡
‰GrÙR¤æÛ’5Å,XY¬·Ïp=¥§¿Gá•dÝ½ÀïŸA×)jÉ$V@©\h‰dï°FÌÃbœ_•Xäs¹>d†è†÷9c&çúšpe×$ü4‹x ˆPMÜ"ª P¹X&Þ1âùG·)(¼>þXê:ô{¿Å	\}s†þ÷œ­?ŠÖ]ß"® àFä8ÌD!õvVŒñBŽœÜ÷¹ß?#‰ã1‹•Œâs0"*§ ”½úYž"ýÁƒŽ¼‰pz¢I‘GLó0-`šF(3P`RS¨Ažg~D‰R¸˜Áà" ¸||Ã§lƒ±(ŸE€ù–â$¥~¯©·é <FÆSÜ.ÁˆšÁ›EŒÂ,EgÌ0ŸÆTPxÃ,9‘®ä1ˆµW£‹¥*A:‰rñ.ýcG.lÜyäÂæ×äÉÊ«_Nßµ«Â\V{~.¬ùÞ=(õ…üXsuš¢ô8–J"x¾p”H>ŸoôW…Qá¿kŒ’õ%î¡„'[‚xÒAâ"N®9÷SKË_æái‹el‹Ãé3úãU8'³§Ü5ÆÁªÂìKà\ fôuaÜÁp6 DÃSžóàRŒ;AEõh­ˆh¿kÔ;Íî„Øé‹Y­¿¨FÑwK¤-­h©ÞÅÜ$^ÎÑ¶Jäý
š×VtþxsàÐ‘y7tç¼é‚%·jqmÊžÉÙ Ñ»×ºCn“6´Y´
µ‹úÑ²q~	ctUcJAhQ¤™BÕÃ€©Vî;v|d¡S©wxÛ}*UZTwWîËÛå0©T7Å“g”/~w.Šä¥a¶_j¢'‚§^ª5X:"æŽuöðÑúd¬“²PEXí bkfév<ËÈÍƒÒŒòK˜D3å‡¢0áWuíýhB*áR	»§Wmßˆ¹×)_ŠV0´B}‚²Ô@-øCÕÔu?I‚ëÎyÛ˜ÿ$ÌÚÐÚAž‰€6B\0t’5cœòT‘OáBL–—±$r’µy6ÑôÚÃ"'C‘ôúF"|Ý;ùÃ½æR©ïÂNˆ]GÚ«¶ÿ3ÉýáH€ªí’³¸Z Û¾%=Ð›ùFäg!š €…~Áh¦3u)ºyKRzP%£æ­pv/çus^i¡å#ŒIaš›·g—¨}~ƒÿ×àG;¾D©êžÃ¯ÈÕÁ'nà~JNb5ç<ÊÝ§e ®
v&E÷üšÌq°e2 ª—•j9°ýE©œ§×/‡íV.¬^FXdãz•^m-?Ö&?Ÿ¾~U$‡YˆµÞjË|(#ü…JÅÀøæù·áûU,æ6k_fãÑ¶(ÐB3§—pH¢3zby¨Uœâ")»©­y‘›Á£6‰òt''´ýÁÃ‰#õz«wÊŸ¥J§…£_n£QªŸùÂÊ”›«ì¿¾¯NùÉõAš]{?Ì¹“ÌùpŒ£Ñõ6[z‰‚Hžéu
’Åê,‚¯Á$¡.‰Î³i0D{Ä6C²þÐg'ÛìßzaÿÑúÙcF'Çeˆüm‡Îcÿ¢-Õn.ôFÑÅd›ñ‹MÚÊ½´æyì~Ûz¼ÍúÓO,GÑý[ØžwhV”µÏÛ&°o3~¹I{S¬o>—@ÍÇØÛBØú7üÐ43†Ý|¦ÍZ™ªci>•3™SñbDV%Žœ?<ÎÍÁÃÆt›ÅSrç+‡Ö5à^X¯ßl²…+‘±ðÙ„]HôOÀŒ˜kÜ<×*‰ö¯Äžz´ÙhÎ-vT^ãy»à¯oR`"ç·™žÌÑ©7²¾@#Àâê4DZCä˜çíÑF°~öpÁ¦6µ¦¶6~ÜxxÖ¸)Å»«hkã|c+lDUuœMÐxs´´´óc³vÈ<Çü~ÓQ ›?æ–áL$Š!›0¬çy‚ÿŒš­æ«[(æpÃZå¿·DB‚'KgVÿët7—‘ÞŒ¨¦ ½Y¼À(¡‰žÑDCÊòp™þ7l¤p%ÚcØ_áÿú˜š'¹sjÑœ ºJeR.AÞñÚ º Rˆ7/´³æÍåíÔx—iÏ¢º„F±Û"ŸÉh˜]Ò^)f†¸ˆ*ÚÇ¶#np6Ü{
Ïµ¾‰ošG×¿¨¢7,ƒËl[NÿuzËýc©€7Õ¤	oØûÃ"ËJñâÞCõ,ó‚”ç³	‰‚íFóV‚s`,iŽF[òfÚHÌ›'ÝˆÙrf§Ñ8ŒgY»ºÇö°ÛmØµ£qÿòÑTU…ov½Ëù—B„½ì$;kž[v½èQ¤Ò*ŒÊe¬~¹rGUÜ¬ªô¨{&oðÚŽšË±Í¿¸ä…\*©–oÓ|‘ë
uHskq›*ÅRèšW•Æé ¯íÑ[¯ŠìbŒž.¤óWñ;¹C§J¸ÆËy¡XÉ\-Å^at$æ@fkw.¨z-XW¼í7«TÖ›+¤­âK—yGb®»êÆða4ÉÄ†¼îƒu¤#îÃÊ•tf¯peA«ð±=¹žÐÏRE‹´ÓéTÛÎ+êU²mæÔAÖ…
ÖD
ª«ãSâ§62ÖÒåÆ#ê5°ôðîuh3×’q}`Œ+UŸB7¾Ø•`•gö,kiÍ±ÝREå$c¹£u/ì”½@ÕTÐô‰íàó¸‡ •PÐ a§PSß¡£2úD'#ª8k—\¯ó Q\ä„{L“f.qÔv{óµ©H:´`Q­ªˆR×bW¡½ÅN@1o|îµ
~YÒ|H%ã/ÂLùžâ¥äýES…ÃNGÀÛc•îpXØ«±ðºn¿>Ši°#žPô'®¾ztˆír¯O,¦qLÙW¾ZÕCÅ­Q˜¡/{8IÃgå¹[]ËÍ4Ë~£5¼®˜ðY‚0u8a¥ä…•&¡†©6¿øÃø{(Õ¼Œ{´ƒ^Ç}0Æ±tIˆáû"Õ:ZŠ9 V~µxìÌýXMßÔq(ˆQ/a£*¦¯#TÛá¯¬WÕp7[qË+}c‘½1ÏM#¯-wæÁ«/¬—Cî|È‰2T'ëu›¬’ë‹g"®œÝÌ/;¤æIBÄ¯Ê‘DŽÁÃÍ?xgžQr*ÑÿŠS‰5ô’cÇ}?'ªÝ9»ðÉÂéê‰5—ôWIÞ<^Ó«ñ™ü¼€ç´Æs	ßpºÐhç1©3¯k¿a²©Ä>¿ÈãìHáW²b.Hüz˜d®—f˜c®t³7û“¡õæ:Þ\Oèæ‡ïµ–o²K@
l?Hy¯´Wü²':¨¹Ào³©=â@{<ÔLË…[ÊjM§QàˆWžå£g<¿n²ñ|à(Ù^˜áq‹¢ÖÜužtŠÜ°åCpÀøT¶msóSß):ûæhôË!j„Õ™YÌ,hÖ8“ŽEVº“:«žç!A±'?ä1|)_Ë¢FHè‹Uµ›×)uèÿÿ¿äYÃŸQ$HCåcÙS'Ü$5)àÔÝ"§×CÙÊF¡çE+zïÛEêèN¸“=p}r};k?,Ç›ÚgEµ¶Éƒ1l„°§W“VËL“p•§–i°eíˆÏ¢×¦[ö[òy¸ë·‹=0'g§ ª=Té¦T?JW‡oE’áœs{~;h¶çÑµCi,N“(˜\9Oû7¥
Ht[¾‡§h8J(ýõY(ãŽØf¡F™O’wß,ù–½Cã}´Ù5å¹¸28(ŸùE˜	&UÌBª_$RueÔ=,ð[oiEãƒ½xQ¿Üä.Yá‘%­ c<Ð­õ÷Ã3ì3:x@fÁõè@ IPX_BÎÿô2J†¼D6[e°$á8DY æí>½}b¥Êüõ“0‰âYJe#^D	lyçu4‰9Ç„Æ0¯¥»”½Ž®RF›ÒG‚‹§–<~'wFµî†å;EÕÁ'j¨q)OÎ,/¦*rÃ-¼§•„7µb.\­mØh·"c­ßÉ©h]Õ;Ûìw„xÍË|UT]˜bt«ô_Ò9MŸìÄ%òUk”líá½?ÐéŽÐ¿“$‰¤÷pmÉ›¹µÃ–½v³»ÙÚãe÷ØÙ5ú–'ñä¢¶/¯.ù®Ÿ~zVÛû˜6'LhÜÔîžß<P£ö‘
Ý¸;]r…IÊŽˆ¨?ù9­Êès¢Ï×ñ,“9ƒ0û*¹'¬=Á.ÂIÈ3xU†.GÃ]gäˆº\—4ß0cÕæ¬RÞ\M¾ëèyÞNnséà÷T8 .•|í?Îlù3è¾—¹;\ñæ]ÅAìó€%>–%vãV×î\ömvÔ&rÍ»n§¿Žß+“Ê=õøxNê¥¼+örBNÈKèW„Óî’ð ^Â¢ØÌáë@¡?ßïŒætNgg˜î7>'SëÑe4Š¦Óh‚!n—ýFsvÙª©s¶Ìp‰»ÄÂKþs]×çÚ=ïýØhJÏŽöO_ž²7/ØÁó·ÏöO_¾9¬™N¯\råÂUd³f>Ìç¡1Ÿ~w«÷£xæáï¼ô«ŽÀ_‰*çJ>¶Â ˆõáù;.{M²,H 3Ëgža¢f¾ù¸Ï¸9hÏ˜8,>ÍÉ¨ú(rzÞIòrü¼	±)Šo‰Â–P<‹dñŠiæþâKØÎÒ
yŒËÊ¢ÏÈ_|I8ŒãMô—äEz×.•ÜŽ’¤<¯<“@äÁ+yKÇÂù–CÍN¾*)UõÕ 4ŽjÛ"iG?Ð)Tº ¡²Þt<ç5û¤Xê«<q9ïWûÇ‡ÇìpÿõÁvíÑ^ÁÔK’7Û®×ÐûÇn×B•t„/Îû|i3TçÝ&¯ÊŸŽ^>;`‡o_?…íWÇ‡Ë‹âDEöf¥Ø‚>Û2´1Í2i¡/²pêÈ—¿3J&Þìw=*˜Äü4žª4ù¿1¢<{{|Œ,ÂÉÁ3äîZ¸hÃ–u¹µ£o‚‡kÿ”`…ü*&ãIór³ümÅ^ñƒÿÜýòðà9{sÈžïŸÞå±À’çîTË,~‚Qˆ?O(Ð½½NVßžÀ»síÄø¥ˆ«8]šêd6“¬”¡\@Yò8Òˆ­ÊC·¬Ìê=˜Á?Ï£Dj– ³ñ$g”jY–jWÉÌP~ªó˜¼c‡ÉÏí/yïî’î;>NrV9C8'2Ck%*¯YXbT3cú—‚7.¿…Ñxô`·†\å3TqU¸*s"î®sz:x€¼D]žŸf ˆIH¬ö|Cì*K"u²¤‹³ÐD1SîªWŸÎù
ü•õn:Ld‘b?œÍF£Çšï²·8¢g† ÝÌÛ"Ççõ~½oW1›Á"N¬r;ùØW¹cÛÖbíHb'§¸†gØásý*w	;~.\ÂèÆÍéÏpL-öæÅ‹ƒÃ“ƒåÜmµÃÒ®7 yê}«\3´;;`*´?à‰µª³Šîƒò„}øt–TÝ4>ðÚèw2qK‚å²rj\UP¯õó#K\	þìÕþÉ‰Ê	óËÕª«‹@–ý‹¼}úÿAcÛ
ŒU_-/P{y*˜ÞTîªãÉV7TÍq…Ê¥¬Ÿ©ÒæT)h¼yl¹,¸kÜüqI%XÍ —Ùé²>¸‹úà¼ôéÁþ³ŸAª~óôäàøï¤_e¯ÞüäK¦V5·y:)Cç‰~à
™qäø”4rŽÚâ2So÷óB³EmÉVô¬CÉ{A;»rqó|ýü<o$¿>·ÎCO2{_Èº5ì?>ºd}yx
H
Â>bélŸÈÜ	;Ýÿ‡þ%¹ãìÆ 7|´é…³ª9ÛÇVísÀÔZªõ3FµyQ),;ÝÍÁ“Ûw·so>»>L©UÐ•m½ÂÈ»&\"cïmOíº'Ü2œÓÂÛHàÆ\×]¦•+Õ|f_éF]î‡]…öðK}3Eˆ!§ù™Æ^eà"aÉR¿ß]Äk"¶L·„iLèÍºe,‰.Åon”¶Ù£´B¼sÄ6ÒeŠùc-Å´ÚÒ*Í÷aÐ]Üd*ýì.}Îƒ@Å[Bóh@˜`¬IÛé	ÕVš%µ™ýëUªßPúþQúäÙÏoÞ¼b?½}ù|Í: ¶¾|vðgEfL±›Â±·vgÜQŠ¼}nƒËµu|.kÇœþÀÎT+Žº}žãH”eP[š§TýžÉ°Ìlï¼Þ?…ÿ~*žyƒ‘)U¢·+­gæ!,Û]ij)ÝçRk
ˆoæ˜–7NC¥¸ç‰6ôöy0JËy¶"&ý¬ŒË1Ÿ‹RA¶°Fæî<Kf¥P§‹Q|ŒgãÓ0ÃH'â›þœæP®‡`ýtL~ûÜÿ×ulŠ†fk¤fIN^ô,1­;x™O” ÔÝ›iˆàøAŸt€¬nAuƒÇî\ÿ]jM{õ28À³³V¢ù­a8D9·„š,Q*Áßj9`ÄùœúÌ¤ŠÝ9þÍ¯®½Ï§fU_cõJg0VGfÑaµ«eÊÂTì|˜ÄS,” ïÉ?Wßõ7»ïëÞ –!¯jmÉÙRWyFMY SfQ˜Ñ…nÆ[yÜÃÓV
öŸq<6KÂšÕj®WšÎ¡–ZO?­Rôõ†]&Ò€$‹®–Që¶¹ ôÉž”`çYkèò£ß ã0øÙ²:óIÙCÑuÞD	£Íý}QÂK¢³¹ð
\t0ö£Ý]ßÚ§–õÆ&îºÍ <†²°Jb«ÒR~6ÿSÚš¿Ë‘OÍ*€—wsoä-Ž»=Óûœ¢ƒUN„7t-ÆYžK97DúïRÂôˆ¶"¦ÅE×gº ;Ùâ–äÁöÑsfUê€÷ONÞ<{ÉuÀí“£Óýe‡«­ÍÉVGó|0Ê
Nb-†—û¯ØñÁ³ƒ—G§‡WwA1·Ö"³Ô¶™MiçPíÔ”§íó²\U¡FÓ‹U…°yø¨“Ð`>fÀíœ…I…ˆQë<Wò¤î*_¯*i €Æ”ÏÛNœð!º=`\BŽ¤"DÑñ>¡{\“	šŸØædÏ”wò¼2zßq"øár]$Ê¤›è$¤ûM0¾þ¸·',êsrÙël6YÌš”Žùz·r¿üçaD£ª’ËµhcË"»£Wä›É¡Øç!éÈÖ¥/¼€n¿7lÀoN-b¶µ÷¹L|¨Ê+¯ª½Gy{¶Ü=ˆV6°
Ò¯.¯Ž+]S½ bó^v d”LnˆRÁuJèåcìó(GÄëqVÙ¾CëÒ{ø*”X¾J=uóŠˆÇJZUûíÂŽx…GE•»¦â÷L¤MÑ.—Ðh•ÈËzpý
ºì6k•’.¹9Tç6É¢ÁlDÕ«÷ÓÞþ˜|§Ž‚hxëÍ0õ’Nk²!Ua¼%ÌÜF­hx†ñâM4èÔÛMOXU˜ãA6ºfã@3H®Ù4HÉ¦°â‰§ç”§¶ñ¨ä5Á;*,þïÿú?p´î¸ì,~ê™v¿ÂºÑ.¤ÄfYÍ(6/–²ú0JaÑØ^ÓáßTÄÝo¹óšéµ‚u.kž[ÙY»ÔÙ´í?™(`Ó)'1Õ¶wøæôå³ƒmö÷7¯Þžîÿƒ‘õæðôøåÓ·<BÓæùP#¸ÙbÈ,'/°ï«ÓË(e‚-fð5-ã,Vs†;“ð–%áï³(¡Òy4æªÎVT@\aÓ$æÅWà	@&>ÚOáü™®@³éŒ¢7áÞ òDÉ>Âtó&'¼%èDèð©`r-[9'áy”áèïÂ;Œ'«r6é%fÅa'a:Áô&ôú”§TÁ÷ ÷‚áÇ æykSüïHp°p›ïÖµ‹Y£`bIºü…Lç¦h‚Ä ö +o3@¿I|5
‡Õ\,ç@ÕQC¹ýŒ‚Ÿ!a½Wðw”¥áè|…ã¯~˜fÁÙ(J/áÑ £çµÆ®` ƒx<RÚá	ü‚]o¸GÊæ3ì(™:T2Svà½Dð îÒ]EÙ¥H ô†(ÈaÜa½õ–vX¿Ûï{ÛF½tj ¹v&±'ùž¶B—{ßšK¡ûÓ‹[ôËÅ-Öõ„ˆ?þüV!R-~¡åÿõQ|’ÁÂSÝÙJÖš/X»Ó·b'¢ ØÑQ S-—¤•ÔÛOà|Ö«P*å” #ÿ½\M)¯KÙëUÔ;R»$¤0êMZJG
Ýï¿ƒÇ¥ºZÍ*íbeulsâ¢”5¦•YC\},<VSé²ÐWqnmm=®¨ôÜ ?µŽèLYÍ³)œ T{8²XFý°4êGXN-äEU¬ªÆ˜Pr›Ébcé; (µ¾¾Þpd}s¥SRå]´Ì}NÞ=.,ŒÒwPs´ã3AR‡ŒÕ®—UØªa¡ð•‹^èµAïÅ§ çÁáûjÝuÖ5ÀJ•º»¦
Û½AY×oßÐvøéÊíÛ€ðö»ÇRTo8*õz¶Šz]T¼´“g~,pûÿ»SZïIÖÍÑòöŒãË„üþ&m	CsÎÚßÏË¬7Ž‡ÛÑ°ÍŠ¥G>´Tˆyj³­í4ÜW¶à¥ÔÎ;ÿl íÕ1$•­Ñƒ»aé"È$¥Rþ è¨[ªí"~Ó´õ#ÞÄ_Q•/ÐjäÖòbÜ>>ãv‡c#ñ”´ãž¡Ä{úÞ–-äöûR'¥íh”F‰mÆ­·yŒ³¸	³úy™ÚÂN¼
Õ¾OÀrÍä ¤À×ý|Äl½7Ô¤+#¹CîWç’zç›À%9x0+m¸²DJV#žBÈòÎ;¾¬ŠœRò¿c©Òä6¬…ŽLµ¦}Y¤ÎuaïlãìóáÆ­HÑÓ¨°þx~nðáaxÞ§‹ÚU`js8êiÅÛ€8‘¶é”‰ð‚êTÉ ^gS]Œ’¾#IÀºØ²€©"³‘>'©à2hàC¢>ö¡š½/Ct[…^®‹­³.îo¶[Ou² ÿh6šš	{h~øFzÄ±>Wõý¸ÞÖ+wíÿ-Ú4‹SÄª{ìAÌÖjã¤èo/íPIóË0îíP* B—Šë%ã!VÙû+së¾àæÒÎo`‡À½÷SDØ9ãÐÝß¤·“ Ê
å{os<~Ìn`gJþ„®¢Ÿ‡ûŽ-î¬ñqR½vj&Àˆªï¢}<Áê×l—©uíY~38‡µ$Ø8‘ÙÙÍãâ­s `j¾òCñ,kW7´Âb½{l±æ˜xgS¼“—µ%ëEAzgÝÐÆeæ-4[Ýø:£Z}Åø…jþuãe<R‹Ð+ Á(ß·Ç{ðBð÷=Ívåk^Ñ+Éªã,EeeŒ]ãª7KÈYeÜÒ?Wßõú¾aIãá6†Rk¼Ù]{XŽu²ØuùÛÁ¡Xp.šÀú#ŒË‘ÿÈ®)9GŠÈ‰<Ú\a×( Z1Q®´öz/½Gï:^?EÙ¢ÝÚB°œ±WŸø·ËÕwº/ß—|ôŒr¯<Në“—Ùï2=¡.•Å+|óúÛ+(9Ü°­-h¥á‹²ŽfÌ†
ÀZœtúNyÖðÜyÇJ(ËÆoÜ¶l|uw–ñ4Ogfb=žFºØ`’ÅÖžeóË4]RáÖ¼~¼½|aeÕ<Â¸#Ìn«`5>P®á:tG×BJwÏ“âÀm4¬k;®N¤³(wävàŸ²›ÉIixN?þÑöa_uôß,ˆF¹9ã¨s‡Ù"öQ¸¹Jd×ïºQ½Ò÷Ä™ðÆF2€+0BY©ˆ¶8G€‰røÌÎge­<¥¸Ã©N‘/Ž®ÂYH¨'s§ ewîë=DÃŠ¼®ÂK%¸zd¦’)¾ù0žtÞUlÐhøÞþ öùó =?x±ÿöÕé¯§Ç¯}¾ºïˆó†wöW[èT}}"*ßâìòI–²“ÙxŒò_}µßÚˆ@âç:©ó)15Wÿ>ÆFÁY8ÚfK¿€”ýÿ%N~K—VØÇ`4ƒ³Ÿ/açêªs•*Z®&ÇŠ¥½ºâ©RPùw%±lzàÂüÐ£?R:¬•†£ViéiZFRYó‘O3çÈÃq˜£a>xù{±ñáßOÓ0MQ)>}8G tšÿâ#¯ø{ž¯Õ+,":äY w(Ó*Gj©Èùä¤¢ï*Cª3„¤ú‹bBØñ´C³õ.JÏj*|¹.8f€#O¿ÇÇAKÜ¨h.«ä6Ï kÔ˜6ªØY5CƒáÒ8,9	ÂÆ¦“¨ƒ©ØÖ5Æ;âhÝ\>•îš=º\›3Ø³ô,	|_‚Œù*JáX¸ëã€GX{Ob8‰÷+Eï:½Î fêáq¶<«×öqÛùˆYp2ÇÖYq.¼(
®ÞUlá£ÁØ1ýJ\V0(®(`ÛgÞ|é<a¨4Ò't'À2¿õîý2§ôtI’úŠ¢¥,+ð	xA{opï„:Þ/".¯[‘Õ¿ôA÷ij~w—u—%w‡ÒH“Vø0‘ñÙ5T” ù0›·-¯§¨Æ”ñ¢«~_;Y§ÿó¦cåÚ¿üòý<¢õÛp¢J¦é*n1ù”CËmÿø°Áåãüö(:å»ÊR£¬Ñù%†Q™^ÆcœkŒ”ò»suenöôŸÍ;Nw~x×Ì¿¢V!jFp“-<!g§Ö¨I:ÌaW.?ÿÓ|ñwªÊ“èw1Óò(Lµcˆ_,[H?[EÆÊRu\Ò'Ý¿çÍÑ¶öŽƒ~ÝÛ§¢(àd!RNUÑææß¿<óçÇÚ1ÎN•dÏo,•¥*æÅ¹ª¨¿nÎjZ—F{ÿÜU¹Ç¯šÃ*÷3sYG§N.ËÄµoœÖ7Në§õßÓ’'ÑŸÙÂ¸²¯”ÙòzÈCÙFF—,ú*úô”ýÀm«Ÿ‚ñú·¢0¤Ï|>cæË$V0dÒ° ;f˜,<X1O>l[Øº'<téùqêÌÇàj|D…@<~'•]ŸÂÒæì °;Ý†œ™÷3W9¿¦í/À¶Ô•.«7ð4=¤­éE<ÓT¶s`Kõ ¦9vø”-ª†€1O'îµoö%XŸ
×8cyyGŽ÷Ûliµ¶¤wÕ'oXø[°EÞLE1ûø"c¼9~Ñ¯aºˆiþczNM™sÖå&Ùó7Ã“D3X{½ûïäÚ/«/†FðùådÉ'G‰5¤YËì[ï.çlHÏŸíÓ€µ b5í­124{Á“=öªbJýŒë5g\ïžÏ¸¦íÿ9Ï¸þdøíŒÍ;ã¾qßÎ8ÞÏïŒk"Ð‹·îæ„CTìWœm·?ÕŠåyö¥N²b‹Õfam®Qö=ËêVÈÃ,Gh¸ªV4ƒÃŸá<ðýñk8Ð”ªB¦íGíD…B|´~Å‘¶á8Òþ   ÿÿì½ÝrÛH–.z_O‘¥¨)QU%R?¶UþZ’mÍ–-…¤ª>u|mˆ„(´A‚€’9EtÌì‹Ù±oOÄ¹=WóJýçÎZ+3‘?È@Iv¹º¬èv‘ ™È\¹þr­oÍýçi¿ŸHûç–i÷ì‘$è*æ‰Fóû»±pÁïúNHÊñØ£Á6}N“«ê#Jäp¥
iMF¥yCo•Àß®æ.6nÒJcªÈî¢ï ybÊù˜æB]l6O¹œÕÉoBús€‘jâ)TUêºéÑL£¤ÇNãÓˆZQ™ÈÙd£jEþãk½Ee\ZÚ}žƒË7Ñ¼Çds™–[$‰ÅHýfHõ<Ç])!uò±HHUÛ\¤ãÂñÚNMˆª*IÞõ-´Zs©”ñh
Òó^Vw«X^Gé7yö¬ûÄ‚Ÿá:˜q	U±9u±Oqæzû;|"Ò'}õ'T®¼ùcéþÊªªÆ0´›o¾‘ì(c"qo2I“Ë Æ2¹­k–Œ’a2Íífïã$JÃ~<ÿF)WËlœô`{¼@mm™Ê©'qÈn3\>,QÀ/“h 5ô±Vàæ`¬7©_Õ×¯ËnžI$r˜O2i¹iùKå
xÚeYW|F'<Že;BQ÷'T'â0g"¦;˜5w-ž§ÉHSòs¢Î‹DÐãó!ÞíI)Û\³I~½c5M<>ÀÉSq×	hBÞ‹x®E±HL®RÑÄ(Ì2DU{~M¦)aÎL9(Rš"P<cWA„ñ}àÄF0{AŽßD{mO³«(ŽA¬E]#¸Ð[å0/°®ý@°v‰@êQ˜ñ[ìµ½H³Š±sÅzKhw×4§IÆ³M`–éó–˜fN±¸O”ð“™L—;ÅóÅäDÀzAŠáÐÏ7,ã”$X9ÐpPŒ3x‡ª´Hù„5H¸Ú1F
ø?v¢´£µ‰@{‹žXY9XÑ‚M i8ä«Ë—~›¢(¸2v†
h*–L5´yIŽQ0ƒ›Ù`JàRÑÌ ‚OHÃÄLÇÁ4¿HRñ@ÐK›qÐ,j
à¢“â`Æá*tGá%ô€=Âÿ6‚[‚aÛ^T-*KT(®ERòÝª(æ©¦e­ÕóiÓf¬X¬7	;™e -2<£Ñ—Wì–@ éïïÒ¼Ž ZÀ`Í?—´ïzGGÇ‡¿ìím·YÏìkF. §jÁÐøV‡/çQJ7œ£y›sôþŒnIëÀ: ³¿%Ø¶kA9’Ùÿµ˜éK+¨Yñ ®Hã/|U‘5»’õW. ä•ÊŠã¥ŠØ6Í–‘kcð NPâŽ‚
•ÌMp–%ñÑ‰’É
Vµ9G”årÁÿ#397Ö€KdÐ
Ð5L¢ ¼P"úº`ˆèâT\tÃ÷R9ŠÎê¸¥OW+onQ!¼(>	.Ô±‚›áñ€Ñ·Fòlýa	T.}§Ýÿ ÊÅéëžÇQˆá¹Æ!µ+Óá„2ò •Àƒ<HE6>‘¾;=h4$X !€áhtÔ[­Ôƒ
¹«%?·B"öE	–h$¶Ð¿cÆ­ š$ki®ß×lŸ‡CA½?ÂB"(YÙw×o¿yoà’”˜…1RÁ¼*ôÔJhô‘¿ça“¾»æÂ£”OO×u]¾¤“ßÑÍý—¢û®IÆ˜ÝšŽí£ÆržÙ^/àÏ¦VgÏ*ä…#rø¯®õs%3’F%á°è$yÆ~U‚äMû$@ÒÄBYC•%äc/I!Ô\x'ˆØyI§"°\ í†WBDMÏ82îN.Îö‡@½èb·Pph YŽÂUhE–ÁgÕ”xÜý®P7jÆ 0æl2v $ÀHÒÐÓw•«Çÿs¥UŒ$¯˜ÌVÖÕÉ€Ip7àŒ¼ñ=búp²m‚qCÿå£‡ï9<5·Š&O¢á˜NóEtEÈ/ì{Ð¾I{9€WHo´9“(IßhÊ½÷ý÷¬j‡X‡/NX*•²m[y:-·‚éÒÞ(D†§`¬é’ã®0m¾yAÎpMGªgðÅ®½î
÷JÂ:g~rM	À$Ó÷­åýØiò H€Æ­Ï–Áó5Ûo‡NÄnDtcXT1OµQ¯4@÷ÉÈ‹^`ÆkÍ'QZi¢S…°úƒ}SÓÐ¾£r­)¤¾ÕW70þµôÃAjÓ`à0ú_Æ˜…ùèŸ5C{¨‚zD¥•1îQ©_(üíÊ )T,­zãÒQ1L[x±îªw”•–>|Kèß[µxu"°©
¹‡¡£Wr×[³Œ;¸]³ÃŸRý;Â]ÞíÒy¼Pf—pKSÛfyGË…§F“Ÿ$öAUº”¢‘íÂQÅÔ0}ÑHÛ‰è cL@ëº”>œgàŒs"ÜgÐó$LÕ¾Â–«x.z‰v`bÒ &g›¬¯¥2@†	7’PI“óstêœÏ1mö"3¤¨äÆYM ›t‡ Â´=¥ºMÅÍH24àâ&aK›q ´Áz¥aH^£ä›’=
ýYœ9ªvïÙ6lMœr—™sõjäØÇˆOšûœ³)}]+NéçhëúêèÖ&+åÊYé%¼ÇŒóÔj#2"ãD)ßõ¢æçŽ®y¼š_Ü¦„½‡…5C³Û6Ó§AŒËZG¯Ž–ªÚß<oŒO!|¼gqƒ^ë,Í•êÛa®õJšðêfUPüã|à|}‡2.ÐaF`Á‹yÞª²]“¶ž>|ù,„ýsË6Ô«$ÞÂÓüço>zTÕ¶ù~—ù}M—ïi‚;kìÿ/ÖÝüd“ÛYîü¡¦÷ H‡á=Ínw‹f6è'›ÞîòÆjz_‡ÃàÞh·#ØCp–\ÞvÍê§xcùÑm§~¡ª.Ù½JÂÛ«øÕªº¤öédU‡Œ»æ•ÌíC¯ðœ¹ñÅ™e·©»„½J®Ð•	:¹súÜéìó;yýœ[~?§wOü%ÔB²éƒd‘¨Œ]F(¯yšŒ‡O_îÙ[e»Ñ1êECcÙhqCáîÍÂñ@„@Ž¨·t*rr…*õ˜ÊÝl{(Ð”ï40‹ãÍê´þ¦Æ©v:T‹1ÜmX'ÁaÙ’³p­™ek-ÛÊø8‡ßïá§¬ÒàJÛÐÃf)Ú­YéäœðdòÊ„³kÎÔ“qÒÀ¶˜*kÖ6Yg³Ë¶vÜº~BÍ®ùé”Söd)Œôíýœ¼†2Nk¢m5Qåë<’&²öl;·éé(ý˜Q8
ÆCNÿ:!4x?	C’1lr^“‹Ÿã!!¾j–û¦ÅçB©p(˜—ÜîëšSz®˜?:±ú9L„û}ƒŽÀç@@ËøQ°Q¼¾GYo<u‚{ƒËH^çþƒ ÆzüÒ0NÎ‚ø$Ì1à,[¦vÑ¡¦Ú }ÂËÔœü†åVø=;X„J¿I”ÀÅ
oß}Ca…Å Í¸BsÀÛÿ=J“ó(}£×c
Kï±õöÞ¾s¼Î3ú©üRÆxJ/¨ú*¿©ý¤|kèIŒ_ÞˆqÄ“¤Œ¢iõ¸ÆÇÚ«¿}÷´õö…¡Š±ö¼=zÀ?A‘tˆô“ÙÑi²ÆaýÉ¾nÙBÞS^¥ÔÚpo­-ü:wK(ð>Ü ÔÖžvÁx£…×sÚ<ì™×œA¢*º4Òþ¦ðàÒâkE§túÃƒ7ÇñLE¥ªk¾ÈTÑØó'¼ª_õžúnL¸X^wh 7ûƒ$‹ŠFâjS©KgSG§=á§-Ó.ÍÑ6r4±WTßÌv£`8N@þ÷ecÎf¯Y4ñ¿?É³?x¦]ãqlHÚÕ·Â™üöŽv2»qŽOì<ÇàÊ¿˜K ·¬«Qâ1®6íÌ&é×r‹Tj^ä òuØÑ.Ô1Ý·îpa[Ð¥ýƒ8WWÙ›ðŠÑõŒ\·ø¬‚l‚Øì†wŒ“aÑ—ºT=`¸!ëÑ9þip&Ø—vÅ˜¯Å$\€6¿ìc1˜Âö¦Oƒbvù/ƒé$Æ¢­¸˜‹O[ÅSÆ¢áÓÅüöä·zŒ¶g<`]¬~åÉ‹]ZMYë—Ÿí%Ö/V7q	«‰‚25Ó–ä*4ô‹ó§ùyùGPÈÀ28ùµGÅRq=8cvü`´ÎYÔc¾—¥ˆ}ú´u}£w€¿ƒqÓ¼ÙÝâ«ñæ<ªX
_ºcöøUk^íe¡¸üævÐÖ€V÷ÎÏ¡-#åC™¿57‚Ä”ýIô^¢%’y°ÿo?MiO;uÇ•,Éþ¿Á»þ6ÓYKœì`iÑl¥…Iü•èü¯¸É–°p1XÏg­…<a	ÞÑdîs¦¿ÆÑ(Ê[µµ%1,¨-{¨ûXdU"×°ö)òuqñ§[Œëê"LA¸Ê†pPOžÀ¿Ð×-FýìtœMÏ`  Òƒ	¬PÞúm™µ2øb &è<€~Å
ªÃ*Ä%|k£^ÚnãíA@7KKENk©ÕæcXáµ¦©Ñ=Ö¹×“´µ°‡ÿaçaÞ¿@'ÍÃ¹RI¢pì6Ì6Ö¸sñ_§M£ Iâ5bap%†îZjó*Òè»;í¾ZôÆj#Öq6÷™‰n‘§3é‚¶Èf/µÉ¿ –È³Ë¾uFo¹^É€ÚhØ½ŸÌ]h£Õâ…ùå}’?ÞäÚÂh¹žÊœ5¦˜Œƒ©Þš	è|†óÄE¾ ]©uié/oñU1´6:pôba£ciŸæú6ï5Í7ñ€š™âuo !öÖµñî¥­%„8Ó4F	8™½¡øÔßð¯}ú·Œ4ã,Z[çwº ÚÉ ItÛ–I'{‡xWäFk+üö§y¹±òNr(ºLÒ·oº9G/¦OQ^™X‹›p3ÏG“|¦/Ì\š·Þ$&Ä£Bu¶½ Q¼ë•töç›Iû5©íÇ_æÉ,ä®y2!±¸Ï‰
Ÿ0ª¸N_`Š–Œ)Óë‰ÂÁQòØû^ O Ð9±e3ºhÈT—w¶Óð\{êãÇ-†Ç;†=Ž%Æ&^ª=™f-£›~2Bùª³#Öì]‹qèïªfóÆX~ãSÄâŸc,œ¢@EYØC¬%Vw½?™R´	FpÌŸ¹ûîšfYÕ 0¬X™µßJ‹±8ÙŠPì5bµÙ‰ è¼lIE2ä.Ršt<Óµ“²®#ê‹Kð)8ãðÌ#Å"D™ÅýÂ_Vv¸¼T’íò5CâU÷Ç—A˜hU6ÅPsÒö®¾ãnT»\Ëi¯qkû§xb!7ëBÕô$Ä²tDôxÑf™›ÁÆ9Ïáµáq±÷R”­aÈ÷¹Y­gï—Y13òÙÜÅv¨Q}Y4Nk’†—8qø_)~I?}ŠMƒ^I*ˆêÅ&›Cû3YktÔ˜péQžõˆQšÚZ2æ}‹¢”–Ñ˜ð¤·J`ä%³FäHGž/€ípWºX,ü+o‹°FsÒ@á“sAŠRI QÅÊ‹Wò¬µXê9Y¼_X¬²o}±»+ztÚ»·ÅÄ¶äéì]×µyd|‹%Ô<¡_à"ju_ë¨¼µšpàzü}‡û
±ˆ£ÕK|"ù ,”rræ#,§WÜObß¶ˆÈP+:DClG9*þc1í~JÔfç^©Qµ{_Ä(Üï.Æ²Ì°ºRC6ó^P‹q¢á…ï®±™›ƒNÞß‚ÏH:¹)ŸAÜ‘Õ;ë>WW4:ïÒº}ChñD>˜C´?K!˜„mä–*ª\kõešL'b‘„R¶¨[6š£„7`ûWàªßÁò›¦Ê8íd‡&áî½7.÷-¯èŸ^w×†ðs÷*ä¶Ù-\¬èQc]5Ó-¸¤§kÞN¹w­}Ý%ç›6Œ÷•‹}è™dù´=ÑtÝÑ8Ìó÷Ç÷QTñ´MTü½Cb\|S,YÎˆ²[hëoCÃ’pçõ	9_Lp`Á¹ø¦’îËþ©t›&U˜æmhO´ÌÅž3Òf½S&èÔ‰PE/æeô³Ã¸´k`ªgL˜TšWÁôðèV—œ ÛÊ9ß|ÎùS rüâ@›<>8ë¤}iÉß³®SŠ-x‡ÎÝ=	¿ í$PøÖú'"-0`›k’(ÏñPêýw×ôÀqÞˆ‹‹‹7L\ãò{QO±%ãYºu;µ–“Ý­(nuGÊmtâ	Thi<ë®½R+Ô©ôýÍã¬Wç` !”Çž–¸Þ]/”I­ÆÁWaHõƒ\f?©6Ð·ïsÚ*|M®mPm^‡£ÄPl$":þŽØpgq¢-â©–U…8éÔq„þÉ0Ç¯4Ãðß%óMàŽâB4bÄ?Ç’#âÑžPìaè¤Cm=H0âC¿÷ÈÂÂ’Ø"í<¡[v‚,”ïBÂK=]W•îrñU}²|a¦~EFïÿ	y(Û¹~­vLâÁj
•gÇ@5*h|ËaëjÃžhdÓâÂÏ˜þz4œñÕpñ‹3vsý‘¤ëM4×»a_kJ÷ï8©ˆò$éJ5§Hó«Qs)QÆ#br2±OpÆ|_f [l	E`N•·qæ¦¦^Òïs§¢±WóÍç×WçÐVõ¦ããäJÚÌ™øº#v
ýF"Ÿ”¤§¢À=iDöm±í‹ k™Oì[‰ˆ»rs™qæŒ)i*ÓõóuÝÇöŽUÏŸb8e¦Qž<2#ç·DëìP÷ÔJ´¤¶ñýSÚí¦ÊzÖ?_·°Ÿç°žÙâw*ÿh¢îböÛF¿l¥ÒòwÌ ù´ÕÞwÓæ¸)æ¯ˆ/f±r Ã~´9Vé‡b?–~AŠ³¯ésÇ+Æ…/l
t5wœ†hŽ'Õ„j:ƒ'LÃYnªaLéýGlÍƒ"+f){;ÈZ6²¬Ó¯i1üê"¬“þU[¢â5Ì¾µø‘&‘#Î˜9sµ¡#ß„ØÜ1/Ì6CcGËÀÐ}ô_ÍÀÑ9‚çÂö-6cvÕGÑ^*›*¯;$%.<©l~RÑ|ó£²/„•…ÎŽŠU".FC?¼)¸^K‘,qx› "™üa²ÒÚzl›- KÇNè-Æý09g¼Ýgø|[âSo³2ûi@*ÞÛyTÁ¥›ðhûdÇ:Ò#°žþHÇR£V´£ÿ0éþé)œó¶¼Ú¹{8Â“A.G:ãmˆƒ[JØ_ ñ(´…¿E>å=Z!øÙ‡H¸Aâ¡ú.³)ã•h@¾F-/Å“_ŠÏéóE$`^iïàM ÌÆQ–/Âé=kwy­P{Ÿo±£RúÊTó¸ð,ËŸ'ðò¡•	›Ñ­Û`×	 xJ„’èË„'%.jo[vÎL©ñŒ'Ð=a×Æû‰è€w$=¬.EË+Ûé×6ï¡%ËÑðiùrmXV\\>·ä>3¤{—­XQÞ¬é{Æêw×ö0nÞWò1™b
RÆ¡–
Öç¶uÞ~‘¤£=„Œ×¦=l£ ‚k»áy0sÃqªRiKDV>«ÏÍÆç‡¿š4pM5¶&&úš¢l3~v¢çàj*—‘Ø«’½îqÚåÔ¤»’=UÒFD}ˆ˜—ïR›t~—?ÞÃÁášXÞMmyîøwš=>€òì©~D{»Âœ©aR x\k¥Ð·ùI
÷›þŠ@X,soÜOp¥(9~ð<c\ÖjQóñn°F¨øÅlóÉµù]C‘£PÄcbð–°TJ¸[!àn:p8‡¹—upÚF0ÀÅ%ÀÛzôÚ-½6ièµ0¾,P«*˜	n¤`S8H©jØè¦µ)ÐÑcZ\…õjEƒ•*ÆÐ³2W2_­Hú+á ªB<ýÉµ‹Óß”FèGª‚‘uBŒÄÁY—g;óÌ¶§š£ ©QeáÚ›OUÑ: {¼J5ÇcõÂU>° ½Õ'RÑä#LG|ÔÙ?ÇÝ4Çm­É‹|ƒ~² ‹5ÂHYø4³¼Ëe)‘ZÕGãÉ4wUPÀè×p·æ³‰½ûwÐÝ¦°kôÖÜUS“ñiO®[¡D‹ÖÁ7À\ÎÀ/oS“žâ¯ðæýð¨#ÄoÛìß¦Á˜í†ì `;éôßÝ£,ã¬üË‡hå"%X½>h©h®"wQ_T¥ÄÕÎšøÁ„WFÀÕdš£¢â>vò2;íâ½û=þûöîøµ)d³û¢7Ì‡'ðÂcàÔÄv½APÜV	]dak¥£­XÃš
J[w£þOkÉôåt½(½ˆ8P»C¨”åwpmàt¯ÄŽ5sÃŽ×O{F¢Å5ÒÊ	ê`lvÕJ³TŸÌ¢R+å=Çke:Ä'5ªÕîZ1ÙÛ²¦–¬ûU[db®¥Ãx‰ouf'‚Bš-i©µgX¿Ky°…~¶’MPœ¬>¥‚"XÐóÒl±Ü¯–Þ…†ªH=R˜ñ¨ªöbØ_ˆj\FÚœ[Kýª)pM1mHÏJb“">\õë¥!UÿË¦âÃUÀ¡&µ<™@×ï!•Ù5¬>Í€Ç-Ð2~yà:=ày%¤ƒ°ò?òŒ-¾â¸ë­Ã+°Ü–°žN¹ã¢Îó3^‚2à	}°öªe+¤Ç7‡L›£FÙ¯¬€áâ·Zi××\Á%5L¿é®Ä«a0n¤¿ÝØÀvÖˆË¼Ì)œ¼¬§vö?ÊÜó%jªªÙÂ\ÒêæI•‡ŸDï(„æ›Cþ¶æ°\nµ‡vÁuýÓrjÛD*Ê¦ÈÀFA˜úJ~gìáÇ§i9JóÉúÃþ").	ü©¤-:“'ˆŸAÀÐù …Pi\<F£¥bDíø¤b´ÈfbW0‘ŒÆdlPÛð#æãÙ(IC“ÍÃ§ýãã½_öŽOöŸì}.._q.ù•Ý×N£õ;?Ç»Mcùxåóñ|ÑÿüLßÜ˜Ÿœùëˆó2þî­ÿÖ§gü>÷ßWàD²Âî¹Ï*hK	Žm#á|1üÜnó•—7åå& ØŸ‰¡æJðIù¹Q•¸zËŽÇäÑ™Jjr?Ì-èŸ¬ç¤§wùcF"…Š»k3¥ÈAÐ,Ñ«”à”SÌ‰gªq=íÑ8š3ü;É¾†ÒÏ|ÊáY!ùìjë%Vx½ú{EÅÑÙ«öî´…Ò×]®cžÃ­V:YÏÂü*tŒ¥iw·T·jˆÌSÓ®7’]¤ÑøÃŠ¯~AgU…Aé.o‰oE—è‡Åo"úíÒ˜Þši›ÝWÓ)ô¯ZÂ_;ZxêaD¶p/.Þ&ŠX
¯ðÔÄ˜§ðE…PrIv7Øt£Ã¤	H©j1î­N[]zVŠ˜õ-‡ˆqµh=EkjÜþv ‚+G`žfü@lÊÒÃ[J;6öM‚k|ž8z¯®—¥×#ê:·7±Ž†&‚»?U˜ÈXFÅa:kf™¢›b‹Àµ4 ¥–íh»—kÖ~Ód·=ó‰wí¦vÿ"H{ykeíÏØ¹ËÛºP~¦”†ŠŸ-:÷N%×³#Â®ü,¶\¾HM¬ÅíB_Ä1[
³lÃ9˜•ˆ†çLË_º§	·”½cAá5Ù¸.&µ¢eûh«·7A+¡3PÂ«$=j\DÊO²Xà©¨ëŸŸ1Ü­!fæføåi`þŒ2 Ac;›É‚KØ„—H>æV.®Kš´þ§'}c‡ÙI˜«Ìo¾ðÔ.Q–VmC1¸»dVw m´zm|O~]ôtã–¥D«q™h	žÉ¨à 'žÎ¯G3ÂÓi´×\šã=›­¼—¦Á¬}ž&£–9¥v–¤y«,³3¢ˆ³6lÀ w’:§[Á’¯B‚PÉTÈRR£ùç°RÌ¿ZÎ³QÖÍïë¨kÔVƒBzo>’4IFœªA¥¹ˆ&ˆŽÈ‚>#hMæÍÆ«’§‡2ëÚþWõœó-º{)Ä¤ê«Aù³„=ë•¬àÒ.ÃÛ’ƒ&Î¼;¡è·lë–÷¨ÐÄÛæ]7©"Ï¦{S¼¬¯A3rÔd×_$ÊdixWù—·ÙìEpd¬4$oCa1à	óu]¿3QÄ|gO®³™½S¥Šú«]b¾(¤YD(VµôÆ|©?Ë&òSÿóÐ)² [u–Þ½\{#®×6ûV­kÍ7K4J7¸ùWŽ­u_˜^ÎWKå–&qÓ8<÷ÄÍò¿ª¥mê&ñÕíÕÚ‘%"*Û•ÛC‹D«(Ž*Z¶•Öê0ç^mÂêzÅ³­7ÒxÆ_•VˆACïu-ñ;Ü¦ï«é¤Ju­® [Fq8 MÏœJ¸1–ˆR¨e)"~ãî˜[=J|µƒ³œáœ.:bçŸÂš»t‹µ,•§Æ]§Í—&=žÁž¸/ÓdüóÄ wx1ùË.’þ[õûÖ¾‰?pWýUü¤ß8ÈuöUòàlH1”;=ºÜ	]Wr[ÚcR±“ØÉ­žR—œÖXy”õtÞŒ¢©ÌO:ktl[r"ÓÉp8
Ó Ð–Õ½?ŽÄgËMŠ>ÓeÙÑ£ªÔ…§åIönÞ›¥š²Ðbˆõ[ÿü<‚,ØBÕ$èVKWã…µvËÂS¬ß#§IRc%3²6¸–ÊfÓh~È#ÖäÕ<žJÒið¼sŠÉ<öD£6õ“Poª7KY½Y7é~õ¡_%ë®ÑÚÊ'SYÃWvMÜmÕšª6ù†2Ò^­ä——Ñõ“)7¸Þá<÷Ï¡+œaSãOiy	B¾™nbõîeLFŸf\‚ô_¾LÁ¨g4€!~</Ãø†}³øÛÁv™ äF[LV3ftÛÛ+Ô3‹0´(ÔÈ€r@'ëô›9\oµ!XI”Î1!óÂÓ·äIÀ»Uƒµm5jg.•D:OZ„ÈŠ¹6˜hÓT+1t§¼8Nr(O–ùó*0Z¾á'Õ_D?Õ—bA®ýÆÉ½+0KæËÖ`äLýQT{’I‡©óLš÷æ§ô4{@©ÚÔ6,ûûï”,}¦lá6àý,6m¿Ö5hÿ)]Ç@5ÙnVø'ëoÞßN+¶Y?Ý“w+È¹—|œÅV`’„ú3—ŠQ«ûh	©eÕGÄ¶'uÎ:—VL‘ëkDwR_û´ªQ­¶ãÎâ½/eÇfôóê¨s½mCpó¥é0µ·TtRùì\g¾7K®|å*, ë*jZ/’$oLXãz*JÎŽ]nÐÏüõq…¶…0"‹ OÛùÿÐÜOSSÜ¡I†¼•ý®N‚d@2±¬þ4Í’te’DtP[z	‰2ûU*s,ü	ãÕ‘ËìpËJDQå«?Cþ!Ó;×ò©{cÌiŠóºGuÃ57‚t7>Æ2.îá&ÆÅ€Vz ¯}Þ§)’ek7ÚëdÄ¾ØÝæ‘»8äz%Â˜ÂÍ²qsûÀÝ&a»žâÔY6ydþmÃz7|§a:B¸êpÞy¼¦HµN¾4-GKÐaß3…Aëà­0OÔË‹øÝdœ”d¸Ö7¡ ±Cøðˆ‡ï¯ó—±£`ÆÍA“ÜçËÆQ£I.X\^ÆìÕ5£î«Ãt‰ñ–9må1tMÌµ>O¤àuYe¦ˆ‡'€¦µ2.£!-{îˆ€+ñ‡À P¨Up	ƒ*>v•“»çYáªòèôÓà¬µÈs…3W4©õõ{‡¸H!êb´lVx¥¯%rïùÎe¶ÆúÈùá³½S÷zÆU¢¡ÆÙÔ¥® Oº ä¹èöp}*õ'-O®Bï:5•òPË'áÒí!ôiT§Sœ‰–óé^Rû‹ú "ÈÜm(¢¿7‚¢äÂ?(9ñ±W“KPZÒbü_.I½Šxt¶ßOÆM
ë™Pv!;¥ÄÑÖu s5çág"2U$îÊ¹ô7¨ 8í0\£8ýª$9yí‹¦9š„(Ÿ5!8Œó#L•EÝ;Î/>uM¡ã~ Juý1ÉK…
ú
Fg@&u©k’¶ø•/š²v’I#ªÚÕ&¦Ž Ì«nEgüdö£ó¨_$tÁû,E‘ˆmçp	Cv“¼ì„.ÓDì–í*ÛWT¡79S—ÕŸ¿Æ^à((ÊhKéuöênmPd¯<¦D
wo)´±“oU/hUk)Dp÷¨Eƒ{+[~[:H(Uˆ2K·Tt¨×[´ª.F!—oƒêî‚†‰âfF}£¤Ë·“êŽ&;²j‚y*¾E^¾«»›uM%]¤=ýD‘Š¼LìcÊµUÐ®õµ’ŠÊZúŸ÷¨Ê‹,Ý(UÒHÈ3N3ŽÕGiòÒ(%_˜HÍ³ ÕA‹´™|ŒÐ’+™–>ólIÿ‘³»•é†ˆ`ÿ1,<=½@xŠØ(Æpè«³0NàK®çËH$–_9»
ÓP`30{f’dY˜e@2i:ää	D}X~v”NÇØt~ŽØUBY`÷SÙ¾3B€w¦¨àã;>ªCe¬-‚¨¦ý4¡Ó ÅêTlÇ/×&	Wž¡—ÅMgMO0’”Q8"AvI¶7BsÅz'1b·ÿa'Jû`Úk¦tŽ>
	w¶².ãÜ×»qî0å¶[_Ñ¢3 Û˜íÊ¥ù%LQF“ä¯8l”^Š‰¡2`!­ýÈèÇ`œŒ‚V™—Èk³_“iªJ†8=XÝ(µe6î_¤Éfcà/ð?ùc|œÅWÏÿ®K\ñ)ÐXe´s‰!yÜõU97pauÂM‰°×M•¨8vwùÖLÜJg^÷³³tA¹T
Ý£Uš.´ë¢Ðs6v$ÂéÌAvëµN/ƒÚ|‰<uK~ü×?Õ¦Ï;ÕMâ²€¾ÌƒÊâ¸_€ëç·l…ììïÞ¾	
¹¼íãBFr04ÜësÞSß"Ü“Öc7XíÇùY2˜Õ&(ž+ö)Éôì!ŠrâÐÉêº#y«Y^>°§ÝŽd!-e]ƒÈè•¼v›T5ÏOqŒ"š×ŒÅ7«½Å»ôemE£2‡èO¾kG‚T´P àú³ü-\Ù:‰Ð“ÍYª ¿'¤e&WªQðþ™j •G®¶aCšIœ(CN¿¬[gºß‚®é¥)â¡å§©J5ÔÿÄÉª”!1,T	¡A4k©qÜ±ÀH’õ™…âÁ9SêÞ&4XÏÜêcŸ¡:Ö· œõßRÎãÉg'vi‰_5¤²†¤bíéúª!ÝYCâzGéu–)X³Rßº‹ªT„žòJ§­Ém=‡Ö4gøñ©Q©xàO¢Q•&T*Ö„»ôI•+èZTí- 2ßàéZáÕ¹û~O½«Å	p™¹"üÿLºWF“¢©`|kUÁªÛøýT°’Sþ«VÒÁÄ1;B†”1{â¾jcwÕÆDI/HÛ&éìO¡…)‚F5,S	KÿŽ«´åSà?ù›O§k¥¿—¦•¶û‚\u³?¶^%i²…äõ§R¤
*%‘óUªnã÷S ´†¯ªSIuÂ`ƒZ“š­¯úÒ?Ÿ¾Ô!êŸB[BBþª'5êãËÒ“þñŸÿ}D©G,ÆY?*ü«F.X¾êFÕmü~ºQ9žó«ŽTÖ‘ø,ÁYS¥òÔ}U˜þÙ¦?”Â£äŸCñ1€àñÂ´’ßOú=E5¤§,3û]ÿ\Çc…êóòU{©nã“k/s=ÓlÈcdàÈÈ?WJÏvkIŸ#ÃÅºhä¸˜ÈFnEÏÜôeÁT,De†Œ†þQ#C°Q–#êÇeÈ¾g*×ú$OÃ`4_¾‚Æ¤wgã KÁ\ð\ï¢w–Ê	ÄYÇpm™õQ¡“¥âÓ°F“œ]&Ñ ¾b>K­Ù(™Þ$–J
.¥Ž×)Øµ¾`éÀ¨qm-\ù7ˆ2Ü†ƒ'×xqªêŸ1Á<Ö	¸Mãë›””iñõMô‰ÉË<_OÁ-c€ÎhåcÚ~.TšL>â×Úí6U!àu­ñGo=‚j6]UÈÎñË5ÖO°ÆÔ0j¶Ò5s ¬¼3ªa9Tê	¡mÃÔ¨A.±­³I46ÂfeIr­Q?V#/ZXèm`?ðé‚Ý[äÓ«Òß°ˆ·K8*íà/)M‡¶psÇ­Ï–‹F|øM"L$ž‘áúÂÁý$¢õôzîá`Ó	ZÖ~·ÙQ˜ž'XdÊDži`¢Ç¹B‚ï0ÃpŒ°S!’ÅÒaˆþ$Åò˜/­+3Þ×7›”4e“´¥Y.hñ!Þ]ƒ
]xu¶ì	¾;F°‹‚Ñ…’qd<Èªlg”&¿-¶ÜÏþÀ:kkk¼ä6–´;¡º…­¥Š6aJÍù:)·ŠL“Q*0;½?4À×Uˆº8Ë\¦i¡7–íeB»ÑåàµÒ¼¤¹!CÞ¨I`6†èBY®/Üto•JØ°zÙ¡2dš¦<ºfëÁfníÑ	ò¬íÂk`+ÑRÄ±NgîS88|Y[pˆ5†Ã÷@åj ÀšX.œfl±gVch„2ëU§×K5¸qŠaŽì¼	 r²ãmž>Ÿmó¥˜p&ž«z¹¨pñ†µì[TÈ2gòõÀ»7ÁÐ­Z:Ýêömòº·Žy¬Ýò±…ZŠÝßÓžµ³é/ÛZ[f[K7 áÔ¼pñÔL‰—­úÀïl¦73Èu„©ùÌrwzøíÌrW5§;cOhXW5¦õÂ3 ¤–>OGÕh Õ¶õÉt4
RÌÙg ¡òg:(05ûL0	$7‚nÐR)8 Úž¤†eð>	ˆ»Àô	 ÍÃ.50Èƒx–E·@‘°r˜F†ÿ Õ“­tX6ÚV_×¹¤­pŽ˜ò~Ó>Çòâ÷ê¿n¹º¡ ˜ýÊþ}ÀÚÚ"·º¾½…sÛ þÝc½Î¤óa•QÅlªñþýFíç‰¯˜n*	Çá¨/Lºiì•‚ÃÑ3ÍœudÁÝÜf¡‚ìÅ!a•äŸ?‰á„éDõkîwÿ´yÌ’iþå§æÑµ©s§@ó‘Ø÷NŸÈÀwˆ-Ë³ŸŒ¾þÙhÕØ (ðþ©´¨ ûÅÑ©Ÿ‰c¦²·'q’R:í‹îîƒP½?4P(Jô»î¥_½ÎºvX#UQŸËµR=¬cÉrÃ©î”™P90Kj£øj„'åtTA•<‡¾$£¥È»îõƒAˆ=Eâ}ŸÇ´VÙ6A»Dt4·ŽÛ¥C~é°Õü¹¹O}>ñdœR®Û	„¸·	ÐÅ€hZî®/s$òoqÃí&£ {@šëæDãuÓAqÝŸ¦ˆõŠ*¢‰~ó2NÎ`9Z‡Wã0¥p/sºx±…$eÇÁø{ó¤ý‹Ùí&Iªi&ëq•@.dM_šÄám§ÉWãÞ@¸&vu•½ ú`[7Ôð?2tW!HÀ2£B—r¹ºÚ¬x”{ºzãŒX3aWÁ0™öÃV+è÷)Ý;8Õò‡pÜÂ-øÿpA/Œ“™ß¿"~Y¼yïóòDç¬õ-Œâ-4ÿn‰ÉOÐÓÛw¾gäMíÉ4»À,|¯Iøßág©ev}Ã‚Ldø>æŽ¯e9ýoß=]rB‘Š#¹\²í!}jM¦QH`µÎÅðTHØÖÖÛ¿Òªdï¶Ù[9ª`Œ„˜¿ðƒ:øïxÃã›NTE[­kVÜ°Ì¢ŒpmãÅv4îÇÀ²³–sI—ØÍ’{zô,¥Ê-èY<ê¦g7ø­IÜùt.âÎ§FÑ8^û}i^â~i( 1}ËÕ+Ó·gqšÑw>õÐ7ü0/}ûÚ*èn¸/ú®<Ô›/VËõD3Çpa<Îå¦þªteÖà{[ïÍ kxnmNLâ€ ‡sX%PÜ®2ÍÚìÃ-å²²Ñ4Î£IŒ°Âbh,9WÕiAi‰eìýU´–CoRÈÃy¢~Ä±Œ_…X]€ª|»j6<Ö‹ãòªÊàVù:@Û(É3„tÒÎm^6ø³šP‡ŸúØGnŸþØÓg²®(ÞÖ1£2¶²¾òü¸ÇüÏOšµ	@îŽ?u»×Ï–´«8‡†øç›Ä6„÷ždõAÞÕ ‰I­€,|\j–Í¡Ç¨ÀSMò9™Y¾-®6Y…ú•àâ°¡;O)è’ì’‰õ	SÆß5M3§¿]{Çí%ÏÑ¿»0ÆƒU`š-­‰‚
QVã‡(¿ã\Å˜íqe×rÆÜ3"u0Cîé(Bz•áœòõNNö_¾ÙÛe'{;§û‡oÄ '{¯²²¶ÙwÖÌŠ{¹Î}LÖ<·~¢D=½Lýòæã­ÏCÁVbŸE©wIäkÆ•·²˜ÂÂS©m6NÄ«nn.àÍª¦î–Ý§µÜ F»·I¦¦t“Ü?õ§³¡¹°:õ.%Ö9‡ìüüúXöšÕ€hÎPÙ½©u˜ÌÀdhZzfóÜÀúÑÌ“%¨µ6_¾ úû<šêï—=¨þD¡à!9·l9Ó›·±y×—Ý>£PkbŽÜBý©ùH{>YŸyh´ÛœKÖf#ê·6RêÚ !?Hÿ»öú	¾šk5æšÚà›Ä;˜k²¡¯æZ£nïÓ\Ë§ÜhÐN niµ)'öW«m«M.ÀW«í«ÕV×ÜÁñÖŠÎñ´gé«éæøÓy™nùôö¦[>ýƒ™n|ÀŸÈtƒÆãt,M3¤ÄIš\Âfš£¨A}—_š}¦!»ðé¥“Õ¯–ÚWK­Éý_-5_#–Úý"ÙX×ð4¾Jí¯“A³I‚:{“âì²¤}ÙÖ°Aâ!<IÁ^¶f±­,ÌO.’+Laß‚8¶Îƒ8s•Ã3Ó‰)¡²k¦o:D™m1–MÊù±E<YÊÄÌFÑ“û7(Øº?M³$]™$aîX¯T^óÝdÚóèÜï%š±._Ñ<vô
¯w+]ž½ú§z³"³AZŠÏõaÆòd²²Æþ¸¹3£Yš¹‚ã¤¦‚’’ñsX8“búî**é¬•ž®I%[šÀá¶ƒWäX‹²s^¦Éø Íy²f±x×r–“4_tÊa	±ÛòHÏÅÈ¹
‚1¶ìu0†!ŠÿÇ««_dÏ¦½EªÑWRŒXko.<íõû¼”ø8­ƒ ”0ÈWÄÒðQLê)¶ø~Ý²ã…y¬®ÌòÆ”ÑEÔ`Ü·ñß—lÇØí <¼Ìâdå˜Eàmz´qk‘£Ëe.xŠ2#ÌÓiXÆ(³cýÛàÞ v9Ï6xP¸
‚+%Ý‰ab·,˜E%ß,	šÓ0…f@ÜUhU<þý—(¼"ð&ö=¨‘™ËÇãá¹5TÀÑ¸0)íÅ±WK!p!^?ºîšwA|–¥uãËþ¶“IÐòÙÊ¦®lo}º.FpëkÌ•;î±Sã*pª]x«<j8§šÑ?ÁGy‚Kx‚¶<Cmhh’ÌÇ±?ƒÃ1®›ZR·8sñÄãUP
ýlL1û ®V¶€>„ßMVˆÿÑ<g‚‘Ûô9M®j«5ŒF¥ jÀÆ¼y|bÆ‹AgYO

¤6‚ì€òÒYí²"pbT3º`¹,äZm•Öêq4žLs›Mä³‰´¶8‰ƒ~x{0LŸ,ˆò„ñvÛ¾÷2ˆ§!V!Ç»ñÙÌ¸ð¡!ÜÓ
ýº¸»¶ó †y›*)Ùe¿©¥!–9¸fšOâ•Nñª6¤n~žô§Ù6n`UÚ ™æq4WÆÉ8´ùŠˆ5çaµ‚Z|§jµÑ0@ŽÀ”¡ánj}›™–|ªåõûZ­ _È{¡«V²â‡—~g+Ö¨Ê¦Õ3¶¨ ¶
4%ýŠÊ©],?¿MÏWC¶”‡ÍµE£9ó$ÀÚ Ï1[ìŸ2( gr×öÛÂËá:al¹¸LˆŒÇá%Jõãð·i˜åÙ¢ I 0ˆ„r«NÛÁ€A|’ù4ãjãD´¼Ts¸j«\¿ñ»¡~VF¦týÎõjrÞ‹ìr±F|I¤ˆ7„7VÍ-³ü[¿ªÍ\óhl„²è°uxG²D3fâ8zvçõÛ=OÉøsµ÷`¡ölh=[8ÔŸ‰#vl0ÉÂ²Ó£t8d™ÄÎã!*ÿ¦ïhÜ±«aìó“+[H¤’.;
nµÊ#"Ë]Žñã;h¹·ÎŽÁšûä¿ùä}È4eï9ÚýõDüwcœvô$$‰«K—ÙsŠÆOËœÜö8t»2“
¶Dë.×i&<v»´é4'‰O€Ù=¹Þ´ ;Ý2„nY|›'÷^Oû³PïÜny×¬¡9Qæìe—ÏË¦fB™|Â”¾H¼a'Ž¹hMÛ`3‚BJ)‚Ï]ó*LwàeZK*O5gÞ±äi$Pˆ±‘·jÐÝ^œŽï­µFž&P¦EÖÿü]/9<>Õ‹'X=[ÅY®–éúy‘&¥ÀKš½—òë³Ón±Ï#êú‚œn;7vµ…¶ƒF©¶ƒçÒf›–S¸çGKó§“2Ž–¦!d{9}N
VsêTtÑ-u	vŠ—Á=ÏãíÎÈãÕ‹nEµžæl$ÜøANeÜ^„iH9¤ã„s?Nž¸-f˜v×OaÒ(h 9×Oóñåòàœš"§*Ð•ÔÎ·|?so=ìö*¶¿–þš³4úñÛÚ¥?ÝÍA›ö/ƒâ±õ(ëg"ª¬7¸Œp¨Nùpy`ŸÌóôë{1^P6'™ß6²«iÿ:Q B UvO•UF_Ð*[ÖðMnQý^0S_tBðÎƒË Ò’	å-ÐûñE°æw02³YCÁ†yÏºÚòÚ9ï¢!¾b‘ŽtþQ*(ðÂ—à¿mqw‘ ±°°ÔÎÓhÔZ2Å$­Ÿì½êÆ¹sý‹È¨i{jF•<T
Íå’±í°NÃP\;`HêÝ¥Q	 ¼ºBC¹…ë÷W /àÿó	1ë| ÁÊ|8øcß]ktéôHh×†~	Úƒñ½Ý¿Ò^Þ"°øŸQ‹T±-HßQu®©^éÐÁÅUmlµÁ#4Q'aè¤Èl:Æ(rÄ5¦Æª_dÝ0‹LuYÃÉ¯å>$¦ú·˜|ƒ³ä_‡|5’1YóG¾­|¤V„<c‹¯¸ÛGbj)¨+GU3U•?bèÌ/Q6ÀXç ÆÀk“sí;#4åÙýÑ«Á­v|M©Õ–Å-uç",´Í”µŸKØÎwæ~¸ÚY-;¾ñ@«Ë¨×Ã5lMÄsé'89z÷Žpô†jèüM*úÂÓ‰cì8»îðü5½!8$tùð_Þâ÷gérmÇVhPjÞµšyicäsKƒ29êzŸ–‡•*g%D›
œ<0 ÙA2"|¢FË­keþè#Ê›†IÍÂk“ž¦µîSï(ûŒ2'¢)JiKƒh_ß7LÛrG™¿Wi0qìº¦)AîâÛ›Åf…iPYð§äƒ$e>IgÛó¤Ï”f‰"à…
Ù¨ù:<þ”NKÍ‹ÆtÈèáSþ£ÂÚD¨~X*X"éH‰¯ó=*nÞð]ûÿþïÿùÿ2z‚£h:sÌy³°Ý¦¡µõm]WlËÎ­€þÞlÎ}`Ï‘–Åï¯ëdþ	0>Ü=Ò,{LÚ`éµ\©ÚþRIžf‚³0æmƒªöžµ¾StºôÏ,H÷_ƒšKæŸ¶Éº%ìó´%žÞp[óåí¯)(wÜý¸ÿÿë3ßy-ç½yºÆ|é‹ÉÀWèÅîú~˜F³püÛ=^éô¥KÌoÊ»Ja):32=AÈVü@“s@¡8µÓ¢‹Z‹E¿[\ª¬õ)_Û•†«RÁü°óô.2yëÿ_î /õŠZS1ú³¾HåáI,GºèµÜnM¢åå'ýÏ}ÆÅ¯…ƒE6ãSÎÐ›Ê¶çn>ÿFh•²ywèMeÃ‹Z%	=Ëô>Vã:».ÉHž÷ùY`¶÷}²À&Iõñ÷¥Ì¢f¹•×åÃ
îþoâBVqS£ˆ6Ë ¨S;ËËù­IÛÍÝ>õÞ4ËïÓ§ QÞ-O©^çsûØ»Mùd´-©W.;“Ý‘n|gWK¿×}y*ª~ö¬§b&Ÿs=‹^o±žÊ–±óp–\ñ÷\ÞczÍÏ±ºÍ¬µé@ö_’Ëü4ÙDyËn<÷âS¸f­ò™A½5WJ ²ÿ¬Ì9?YhaÅa(Ké.‹/’´ñ])Ò úþZ_$µã7.ÝÞˆdnEÅŠóôóŽöÆ‹áß£÷°"[þ–ÂLt¹ŸÅ¨«Yê›ã[h?¾¼xÇ®»±Ó·Kãp&Ã;’Þ«r{¯bÿVü £¹ùæ›óé˜Cöà²½œ‚ÖÇ=@ˆÈ™
_Ž<¾KMH¦¶AŽ€B•!Äþ‹@-.‹ßˆ&0òfßcU:ó†ßfO.¢„^ÂLÞ1³~M°ïmYÜk"`i^†qF	¤“4ºŒâpfEÛ}`¯Ý4À.%½ãö`ô/ßPÂ§I(v`xùtU¦r(cÝ‚Ã7Í¿¿„1(š¡D§ß9èœ°ÖVfbªª*0Êðt&OghDä0Ÿ¡%¶‡
&Ì
Œü(Ió n3‘weË)ÐÁä9 Â×ŸÍ.ÒÊs°¿òÎ‘¡Û:~ÞÛYÂ!…ãlš†²xÍzÐŸQÿˆkÎ$ØQVå$ôr¼aùŠ" C ³0‚/œýñÅFi-x;ÊÙŒYUÚò™÷ÌÒe`’2¥|±ž*Z›¤°	òéÄÚÈµtÄÇîŠ(Ê*ý`üE2…¡œG)Å#Ï£!.’•¨Ô$ÂÍ³¢¼­¤üQ8•?µ˜n¶ÄÎÂs, LCd) ÉÐ.‚`o m4h3y;EåA§c£ôBÁO‚Œ…üÍÏu¨‚ƒði«FòXö!/æ 3ˆå‚3Ä?m’gÖÛãpŸÀg`SMÒF‘aÊ_ñþ‚_XÔ•Àãê…a””0„sÂ£u±4MQ¹Z–ñkò,ªŽî+¶@©Þðh Õîºë{júsg:ncU6ˆÝø¸°«ÛakzjN}è«/ä•‚]âiæƒGðL°Üü›H‚
aD…ë$)%i¶å¦£igé	Óã‡µÏÏCŒt*Jb¾‚Ë Š)qh
wh}ìê"$òŸ%S~›AÐËLÝ2î1>,‹Ò`Wžü‚	vÇã]'˜êûÍA”žiûýH©Â/wOÄô<I>N07ì““Ï\êÞ…†N£)Ø¼¾0!mÃeàÀÁ`%Áp³sQ‹wx:JÐŒèfFü‘ž!ÇÅ$ñ¢fæ±àëÈþzyŽ%Tâïxd’–$¼kú*‘fè¿7Ëe]Rð×•Ñp”—4IÅ°%b‰­K–KŠ»UI9U ×ƒæ˜ÁF{Á:kËô¾§hýÀ¾m²‰Jh¨€Â»ˆËGç ºfXCK‰——¸íu!}4™†¨°F£ qd/W…òU¶rbA9rxØEY]jä"]çÅšp3r&ºRRÕq”…§¶âÝÝ…â
vÏÅ'œ½Ô²—…Á#ïMé/8—Ñ`

ÌåÊ4C‰„d·ð|`û£	°‘v9ðª_Dl£‚5I`&ËTT+[FßJ¸–Y‡È“0ø8ÊT#AœÉòYœ³‰{´NÐ?¹Í8Î2ÛMÐÍìpš/;3u]ØyŒ)§ d’¨<J“Q’»J*Éäo¾Ò8Ø, wtï•Âåª°A?Š±0ô÷¦’ý	É$'	F ê\Ãf &%¤uvˆ"ÔìNYtŽ¼ÒÈ!)§ø>A¦vþîÊÚ"M­´°K·xat`3¸ÅR^/Ê§¼~Õ¥ËÀ–…K›o£1•!£-G
òÂÜõîï…†=(”‡•³ð"¸Œ’´$×5ã{öÜ¾Kˆvg­{·tßU[½Éö®í\{f;Éˆ"[WC“~IŠãccŒ$–Z–„CÈqœ	ž+ŠLy@¯,ðUøßó‚>ÒÍ Ý`Éßf1sÓÃïÃD˜GÉöyclÞçâ¦zYBÃIÃ)FÑa‰;98Vƒ\
¹ÈÁ-HÊ<HaMpzìOÉ™Á[NCKÍm»¾¤wŽ†¥)Ãp…ëäI‚|™æÉ¶xyƒ]üO±Ž/@Ñ8…ÛÌE¶òØA¬{o+Øã
Æ0c]tä¦ 'ççQµÅá@P ëIð!EÆ˜–X‘ùm¥äðMƒÉvŽQAÀ°ùCÍxð}®îyØî+øárf~¦µ|b¢š±>.}okz,zÁEqYÑ§¨	Ø¶Nö0³¿ ©À„ÕÝð‹©íâƒ….ôPJI ïÀÖw¸cîKÎ
²"”œ²µL{[¾Z^’ÊƒáŸånåeí0B°µ—)Ç¯8¹Ãü÷®äõÅõƒ
ÒâaTÄWûÓX)ExÂEÌ”JËIònÊ{±7Ç:—¦Ò#V°qæáØ¨[U4$vjgái§­ê’~ÏþbÀz;·n£}cM…sœ_$|<BåE÷Åo–¦ý/i„’ý%-¼ÌŽ4ç4È>dR3®­ç“Àdýå[rG×Të.FÃy×É–-©Ùî¶Y¸C'%bÛÝ~¦ylÎœ`M#ôñáFÏ`ç¶ù™ŸÐ3$ýì'Ýi(TKDA¼’G#¡7šæÚ^ÐöÆÂ1ÿrMÛl?çö»‡¡¦„hÖ|EP+í)›Ž€Gÿ.¯±ó‘"šÚ°­×G'Kb4y8LÄôÀy‡g3îoèG WÍ
ö„æV«7¸â"Åÿ9üz¢ƒ¾í$ã1|øy—«ÍôyV˜ÄpÉtŠ Ž‚˜+Üç!}”Fß=cóÉ´cÐ»¢:ëäd¸Þ6yòí©ð¥XtÒ@qÉ…œÒïêÃ+eAtœsÉ]Åa™ä=ÑŒÜ€eTˆ‚x3OZ„ÑQcç„Õ›†Å)Ü$ÆÕ¤[úž¹å¼2Äˆ²óYØÕß³—ÆïB|¾
ã‰iYTP~ÄŽï{ñ3F¾MÑžO§Ü+q+¹iàPaÄÝZexÃÕJbºkf†Á­!lìjâåyÙXó×l”ÀkÊë8×ïˆç”0l©§êd&«‰N`h|êw“þE(ožÊWÂÓðˆÑ@¡Ø¯&Ä"dÛA|Eö_z<<O“?Ò¤ÅO´ÿ’Ã	Uß ¤.¥³?açÁ(Š#ä§!da|Î=@Ø¤rr±Í}ÓpO@ÈJK»áˆ_‡Ý@ŽZš³’ÇÌ(Gµ·É‰LÔÇãyh’ áË\ÁöpÁßKƒä8¸e'š|x¼„ûPLŽ&*¹ŠoÛf/Â›I¶ðjc’-mOÖˆ®˜h™-/(ˆ=“HHçi~+âõ›+§6Nf3»ËÙ•s`J™@˜€/K7ž¾·M ¼’]W¶.}cn€Ã"`‡«³yóªÞFpˆE‰™Hä‚„ô	`›£%Kxëx…kTÐP0‚f/.3ÜÅ€!œbußÏCdÿøÏÿÞ|ôhQ2w¯iÏ‰6:kìÿ/ÖÝÔÛè,wj[9@ÈjÑHw‹éRÑJwy£ÁX†A1’¼Op{GoecùµRjä‡òJ“«ey{CQ5¼PãÊjÞDÿ	Í5Œ±ï[QÕ¬:}ÇÎo“ùkØîøFVµÎî”T’ê6>5ò]Ñ',Ž÷]ÜÁ¸å¬ö9ãl+˜­‰®-Yí:°ÚgÐÉX+3ðt´{wíUŽù÷•<q¶ZÆ<p.ýª(‚äÃcy»Öî†#B¥ËMu`ˆè§=ÉÃI9Ð‘÷¸^§Ñ	ÅÍÑ³PáŠ3@B†ç‘8B-	W,€ƒ^¬7ŠÅ±s³ØÁHbŠÀÖëÀˆï$Œâ2
0_y:N>c°cgt ×Â(ž—;AvA±µ.=;šÆy´"6‹ù¸ÀÝÇ¦ÍQ0½æC^Å¨,˜ÞAšL¬.E½Ö¯,`ä²ŽÃ`ûÊ®äP5ÛF"hà”öŠ¾ž‰¹|3Es×éäèÓ6JÁÚ£µÍÎfwëa÷§QG²6ÏoR¾x_`¤Ò”üXGOåé‘ˆ;;Óår¸'gò8ìØv~o²¼ƒÑ	WX:®}VN0O~›¢
\¯ÿËc_h19Ã‰›Ù2hÏS þ˜<5ßSd#ŒêX¢-”ç qôCÜrðÁ©æœûá5Kß³CõVÂ(â~øAV¥è<óPÄ2Xwè$…˜¹e£L„NÑ@20½cX^ËD°³8ÂÌÉÀüIÍ"#¨ªK<´ ùEîÄñ°€7aÐ*ŒFN X<¶œÃ®|X›«~w×¦éîúò#ûäÌO«^Àì¡š.õ„!Áoµäñ_È|ÉÚ¨÷õo*_Ö˜ñÉ¸—hl Üèì?¢n³,°êØy€@2*Ÿáh)@\,›„ý8Q‘Q&Âò9A‰µ,Myòp¡ˆ!Üˆ¤óK2ÖEæÀf	:Ñ_K1ÍfxN{Ld=L)8-kò¿r‡JÖ¶VãkàþýÄZ»öÉ§¸î´±P›Î\›Gî—¡/KìÜñŠØ]^œ.^’(Bïö2èiãjgŽîVB¤LluŒ"³ˆÙ’Ø/´9Ä~}‹3d±½H­Œx¨d_Ë“î@YM”„0¶h›OõŸ= ùó)©²Ûi0Œ(°o_·Ÿ˜6{“	h$½…DÎC5ù/iª¶‡íå"¶peý)ÏYš ƒ)"U±Ì‘Á]%€÷…EÉÝ×dÇŒÂ@$	â)ÆÕ¹Fç`™}„YóRC¦NŒ—{"Ð^¦ùi
šÂð³èz^….½+uéÐ¥WP™þÄ”ú<ìÓL©¬@'¨´²~¦3!Ñej/&™"%¢Ú&I‘kÿ9'b„ˆÈŒ¡ËÓh8äê‹`'\Âgr×S¸J:âêAò
Eb’§Ã™hÀUàã€@Gá²ÀÏ%KÖÕg†çèˆw;Òn`œÁ¿§'b¿åšú‰°#½«g^{Çž`a<[2ÂùíÚ»v4XÒš
?â¦}MQj§ÉÑîxLG¤àw¶×Çáû[÷´¤™S"Êð”ZJƒH¥ãLÇúRG£â
Å|àµ`ƒƒÝHlvÞÑ´†¿D¬‚¶išAh¶ñ‡<P†9ÝÐIôê¹W™Põ ¿Ã|rà©?<Õ]Ó/ãQŽEk…µÄ#?°®h	ˆP¢Zÿ
7o¬‰wZ]exð‰¥€à– {¨!PFQÎë`0 y½„â¡Ú@»XÃÓ²È„~ü0Õ‡†ák¡õŠë5C`=üí¶Ù˜ü ªˆVýàWö#ÓïgOõÉ[aÝ‡K	N%{ki¨ÚËvþ„ïy	²_A£á¾jÜ”x~ïFïÜzØÞàó€NøÏÂqoG§Y’*ëhWØësbè½1ŒoTƒànÛƒz<Y$MëršLØ%ÇîC8Ãåheq~@<÷h`dªs¡Î¼æ‹(Ž	À¾µ¶Ì:õeÖí>X¢i@Ñ²ãdí>§¡ö 
cA:ðTwÙ ±e¶Ö~¸Ì_(D5VñêúTDJ³oa]WhéÖà¯¤akzi-\„ñeˆáÁËlŽ‹~´ûpŸ´´7íß°gþÂõ<ÿç‘þÊ/Ó`¦=„² µÀNO{ìÿ_ìä×“Ó½×ìðhï¸wºøæOŽÞÝ?e¯zovŸþ_1GöHx£Ç{{½“=öK·½¶¹°llMýÑevÍ`	‡È™è aQ1šÖ±&¥ Ð˜/½ÄÄ_º»«%þy`ÏÍ´ÂÒZ{Ýø)G-ø#‘s¬Š×,Só‹$ÉÌoÈÑ¬?"Ž7è\3S‚ñl	™w‹žÓjÿàæl!ãŠpÿÿyüDk.üø£Í	àu‰D+(>ÀŒ>Oò<ñ£DÜä8vuÓZ3±Ž©5ØWç¡{–­›ôŠ þ2Fi/”ÇæÜ,õÛÅ9i¤åô“ÉLw%ü0ã<7[jN=dGyÒ$O@Ö¶›9C]Ïhwgã #c¹¡P<|¤<Ò÷H)ì;<Þýé»kEZ7ï›,Q×³y7&÷‡q­¬¬°Ã_öŽÙQïåÛ³ºß;Øÿ?‰Í°ÖQŽÐS{‚Qhìä‚TÓ%|ê}YÆÞÝ„Ý*ÿá|îœÈù·:úÁø2ÈŠ&ˆÅƒLXÓ^P/Éàå {gèêçŒ‚ã¤<:RŒ")à–R§$s6aJ;È…Ö×íÉØ–˜°šKà4zæf§…ÿc 9?ÖZZÚ(¸it¬f^bþ¿%ÆDÿ(ñ×Lxùwci'söA©%©Tì
Ð•Öq`í®6]§xüq‡q®?ô³û†ÿ_ïˆ‰•õÆOtèyq
n½IZ}Ø0è-¹‡å°O¦g+yƒ¡›lÏ|gË7x·»=ç²ÞæAÇz›ÝHº7lJo1:]?ÕèËQG4 Êì¾>:Øï½ÙÙ+ë3ü-®id$yéF7'dojH#ié”ÚO†”|ÔusÝG:a$üd(MD˜öÌ$¶ÛÐË#ÿôv:´-éyWmh¤ð>a=¹'™ LÖÎcª«ÅÏâœÂ7Œˆ'=‡Rq³åâHƒ{[KøBét<–QéBu°Yä(ŽLÐÓEÙ\Ò½…Ya8òP"I8™fìóèUîñPB`¦.OÒ2Çxl¾Œ£§[Pf#šž†Ò¨/ÓíwÅ!£}Ê³òAœ?ñ	ÉÚúìbñƒI8Ø§…æöroD+sšÐª`Ú)ö6Ð[Ò4÷5¨¸H©°](´%´ÅWA|¾¤ŽmÐ²ì<Ø4)Ê'*oÎ¶¶6I­Óÿ4Ax;þñðVìc÷pçç×{oNÙÉÞÎÏÇû§¿²ã½—û'§Ç¿êã¡?~¶†©±Tzù?Ý®Ÿ5¬»YƒÕM§ãâðÁ¼ÉtÛ ¥¼‹++‘1Žt‰mØ¾?Ÿ¾:<†×ºðë¿®2û·6¸ ¶ò2;ºØm/¨x<õèÉ)°ÑÞñnñ°:MUì@¦4(õÖÙè†û/öwˆYíùïˆC~Pg‹…%ºw|¢7Š†)k•·¦ˆ‘ÈØÞGÜñá`iA(²ïÊÈiK:˜Äü¶Aì·jµÐ½¼Ìo–!þŠ[H-Øø§E·³˜lvn'AeSÐ7 MódR3L_·î¾´³ì¾a%tÉ»¦ºÆ{o–LË¡·»‹ñðÍ.7^ƒ0sŠT·,WXÙÖCƒ…ûí
Ïê=3ªTÊ›ò;·
¦\ÉÜaÁ¹HD<-Ëð_âM™½û
ƒL„ê,tÚìøð`Õ”‚åì½ÝÙ#>„¯7€Y<:	Ò ÄÎä"Û.Æ¿
ŠŸ×éša¦OŽV#Þ"ÂÛ"x°wr”€tµüM<ˆRbPRà=†ZÍØtr Œ¡pÀý$oi¡†qr†I8ƒ°‹Åiª’èí=Rx#™žý»;R@kÀ¢Á¶ùÀ?þþÿ8AA¶Ùó4	vlBÖ§Br,Ô<æ)ª¾QÂ:‰Dt³Óaå`â3¤ÉŒ=JÐ¢˜Õ‚õ!˜ü3%Øc¡.°ÝÞqœ}E“)Yâ¡¡Ì6	†EÃ¶ãµ5à:õÚ;I‚ø”F
.É”ò†åg<x˜rþ(ðcŒ¬„cexŽ™fE~):™)FÇhLo›í'SÌQ¸£—§äðyW…¯ˆƒà]Ñ–…9é“c¾*M\¸)®W<Å•®´4W:ÙBå°ÀÀ¬*Ï
ë6;+žÐ1Œ¤-àÏÔ6P°.|lFBW/•î˜LsxóŒö Ütò¢+1
–Eê\š‹Èn—éÁymòüNºg–½|¨Ûf'§?ï"Ë‘°¤£ãÃû{ì`ÿÅÞÎ¯;{MØ`;@C ×ÒaÂÏM0ã¥©Ðyž´/ƒuDŸäc¡¤çœ§bið8yBk;å\z³¡0¼¶UØþ€Õ"¬n‹³ôÛrŸ²_˜MÚ'DF„Æ•-«ºæ³Oõ#—<.%j`\½ËIgÊP)ðš8¯Úf„’Ä‘PJÜï'ÂÉ‡9‰£=:ÅSSÂIP¸\+x‹«‡×€#Ð—H‚Ñ‚¼¤üh¬”]û¸š´-ñžÍÌxl
™ä®8ÈÕ¶‹RÆ’¤ßÚ,2Dd™‹Ð×Û¬w
Ä.ùN^ííòãŽÓÃ×½Ó=P8v^ ®ñšuY¶àRª/á0FbþèBiK0|u˜ëiŸnDÂnžÀšQí2Îä­0O^qœvò!šÀx`’š 4,Ã{¸še…”R(‰^Ã9Ž+r‹ÿÁE­½"Ã•}‘³z…‡`ç$¯ó™ž¿N¸\¤Pf( xø’Ãþša"ÝoS¸…&“ÈÂ!§ò\S²ùµö´8ž…™$B6û•[(ÈO1þÏFæ™‹‚6@ï¿ÜÇÃ³Þ›½ÝCüô=Û½ôø` èÙ~}øfÿôðxÿÍKvpø²±öVä#ºT˜@¢‡‚håÔ•.cúvÂSQ¨øî²"D‰âè!–ŠD’ƒÈ‹Í7A*4 ’ úÑ4Š %MÆ öqAÛÒ¨€c£PØ†±J·Â™yÊÃórLË‹¸<ù$‰¼c,G‘ép›2@ÅÉŒ0ÆfÄxQB,Ñ&GdÐ£°%ç„ð7ñR0uÁ,cÍc²Š@ìQ
NDÔö¡¡¾-bµ0KäÉ[±ÝÅÒÀïÈyš—GœLAxq´ÌAa3Žp!\§r©Ó ­ãù4E£)-B‹ÛA#"2¢u$!Ö‡é€Ú;æv´ÐÝ§°²,²sª$›Ðò«=°€Ž÷Xo§·»÷z‡½<†èÁ+éåþ›F
ÉáT‘ú-4G=3H¤ -°6F ÐÁø¹]BR=±á6çÔhë‰Y3^I¦‚‘©±H¨…>Ì.2,Î§¨ö5#X%›S•:<ÒHxWAm}
yI]º//Ó [Br*¤Î¿ÊÆÉIëî Š%“ÅŸfa €*Wq<åFmnÅ	E0sƒÌÙø|4²ÅidwïÈ”Ü'ìäçýÓ=ßèÇ>yñÿÙh$Éµ£Y-ÑCø€S…QD
‘¤2Ya'é
¦€i&ÊiìRT5L´Îì’¦àÕhg¡Î¼ZôDË…Þ'¹%OHF#Æ«Wê=>ÄB;ò…2öüõ>°54G@4ósÒ¦ƒ¬-ììJœœÐêBWpåñà¡Ïh.aÀµúÑÓ! §*«”·ƒÛ€Á½,pl¤Q$j¸$(b±•ú•§ß3Òæ£ªm°xvöÞœì±×½7½—Üó½Œ“9:ÞßÉÞT¨ÇxBq0!ùz¦C„Òû (îþ6ãÀú©
LkP.¢ÂŒo˜Ë _åç	îÏGEÊ/>Ç“¾ÜA¹	žñ-Û Ê„6º›v#”õ]Õ¥|ËVº[Ø
OÜ4š¡´ïêÑ5–h#ï·Ú¡Äo_;
ƒÐ>D­<œç"}6Š¸‰dæ…Rz_‘
">Þ
ì’_ïqïÈ6Ó2—\„fø’5Ç r#[´Cáð a•`â¹—’Ã¤‰@R|v†¹uÒÇl ¶º[…ÖpB‘?ÇçÐA*}¥¶ç¹*¬ KÎs)3-  â¤Gõg÷ kîÒÿÜv<tâ,ž†ˆ—O"â/VÂÁ0$ÏÏ”ŠHáõ½'.ã¬"Ðs·½Æ‡êäm£ù:k·s¢#¡´itæ¶¾¨?²­â¼Y­}fú„u¶hÀòÃàÐ	Xë"Ø2“ ˜ªºjK{¤åæŒKzD-HË,òÌºà’Å½œ"©Îü(*·;}»öî'ënq¶‰Ghâ$ÚuPZ´é<(Õ&¦´o¬öeyûØF{lÖ´6î£ö¨:FíAg™=Äœ5û6ý„WŽRòÊ…v…ÃÚ×¼ÝC- Oð béÔÊZºVDxolþä›UýÆA˜8Â<h¶Y“ñ&`š\•f¸ò@ZÞ˜ÖŸF[‘¿Íw{Õi´s±[ÞjáŠíNïtïå¡y½¡ÿn–:áŸîõv^íáÑÙÏx¢Ô;êíìŸ­lm6h¦÷æÍÏ½v£pÆ÷Âk4•±‚Úrb¼+,¤q4úÐÞ÷pC¦¥áŸ@…Yà*©M³P@Ý,h˜¡õ¬²_A}Z0Qfd;BïÑ’ÊÞW|*[âªÞP¡ÿè-qÝ§fL ý˜#*poô¦¸úS4¥´Ç|ãT*åƒqÒýÁÇRÅSøûÖ¥ÂÚ%«"ª#Be:ÿGV•7Û×ÜÞtìMÇ,Üù*.‹ç•éÐÃÃ™kšÁZD£?â]![òW£r¸GÿhÊA´Ý+ …LÎ!F¼Ñ~8ÿ˜Ë®±³†…ƒY(´y›-ÝeŒÞy­
@uŒ6™Ÿá©Ö°;cÐü©'ìúÝÉµXÑÑC·<”Q‹hŒ}Œ';Ñe±Ñ>ÿ©ÙÝ®Wf·ú¶¸Í-²2yÄ±á¶oTW[LÃéÚòÛajÈ‘Ø<Åx3Â¬ôNŸLÆ»)M‰W©W÷vN÷áññGÇ‡;{f ñ–zKü6ßÔ+¥«Þ ãîqK>ÔyŒÊËúÄK14ô„,êÔRœŒ‡˜(ê6¬eaUìÀO¦°˜ž0´¡	ÃÖf­‡G¤Ý0xQíyR¾ÔfûÒëÄbôKN'tæ c/ÕKÝXÂH¹íMM2³Ó3lU]4ë]ËN§íÖŠ5íÝÜ¼hŒ™,Œ³P“Î–!¥Äý_¦$êE€Zö|£6ö„Ñmí<F­¥6a—e‰@H¢KÆä©¨%Èmý@¨n¸§ÇåV§g<ì¨ÕY×~r<ðzcÔBžÈ†Ú1wxÞZØ^°1¾P~¥|ú[Ð_VJ
Lau`Äˆê@mmY &¼T#š?Nøâñÿ  ÿÿ k¨5?xœì}ÛrG²à»¾¢Ìp@ Ô…&Å¥(jÌYÒ)Ïqp¸V]zÔèÆt7x1ˆ³ûû´ï±°¿4_°Ÿ°™uëºu£AIc¶ˆnTeUefefeee%E/Ÿ_äE%ãö(Óä8¼!ß’Áúwˆñ±Gi’ä:f3>KÃ[²GÂtÔËgqTœÒ›â4=‰~¡íø©à§íõV*hRü%
‹	é’Á–Ó
›PÒð{'À}ÔëC—´¶z1MÆ â²ÕÂOÛ½þ²îNèèÃ›`LOfÁˆ¶õšôbÇ´ø	z3šgâ§%Õ66Èó,¸&‡ó¼H§äY<§EÙ(¦Vy†<Z¼ˆâøèµû2lvÈpøÈé"æPÚÓ G	"¡£:ù-ö°zoØ!­­e#„®>ã=+h6% í"C’ÇAA»OúýŠž1Ûk_Ñ"k²†ÕÖ¼åK<émW•AÆá£>‘Ãÿ›.'bÙ
¶±·½ŒÎb$éÚö`¸Laä‰‰‘ÇððCzd
rG	…–®R¤$/‚¬ ôZJ‚"JAÀñ×ðà/4K	ÔÊâ`fsŽà`š²–òjIÖŠÞl”„ †)’¤Ù4ˆÐd9E:ä10Ù ï'#‰6IMBH\,m8ƒÛ	 Bd]‰‡6j„Æ9%wu²X!»`ú‚\¹Õo&·´l‰µù%H¬O+r˜´i*r¾8ŽÅZÕ¢Ã%xÛ~[KöaoÛâPíÉË­ NŠ 	ƒ,$!ÍGY4+"Q³ ÆÐÐ„\ÄéèƒQÇàï— Èjx|Æ®s¸5Ö:Ö–ÀõqnÃ8·lö6!6fmOG¢üd~ñ=BšA?X÷…}Ñ£I˜ÿd2êP%¿éàö…#;Ul¸\•E—¤­Á\w„OsMW!½V`óE52mþ—””s Rb{8½Š6Mn/{³Ð`>ðFþAÖ£¸<§ÈñEš‘˜¬UrA‹kJF——k_3°	òz{ØûÂgÒtF.ÓK‘qœ^q|K‚Q–æ9ïÀcÓYÓæ×˜r@!¨¬J[õLƒ8B’ÎhÆ”s“ñ<
¹]Çˆ\Yrøòàääç#˜^Ù,‹rúó»œf?ÿ$ó îÍÂKÎb9£Å<KH›Ø£+2Šƒ<LéÞÚÅ¸{=‰
J¦QÒtÏFA<júý«I÷áÖìfýœ\Æôfí©ýÝÆ7äºC^WÑ˜›ßlHì&üºû¸æF,ÛÍän B$ŸÀáC·O¼í¢õs§×ÝÛn0siÄLÞ.«4Ž/‚ŒuŒýÓ…%™u‚E>Ü‚m5 02ÞÔvc»¯Fà¢`z½!³›î–VËMz1äëîM„NŠîX‡{¥ZRdð˜¨[0yÆú¨æÝÚW³î^q4"s`òlF¡Ù*!HJÂIiþ`wü€Màÿ,ƒv/A·à°Áž‹Æ)Œ»O‚$šb÷fóÚÝ æ 7&óÅÌôÙ ?»9×G» 9Ð¤W#)1p<buZtkOU·½»1ÓHÀûQIFÕ›”è?0Pt—Ó2^Þ›³¶x {O‡+˜ó¢HKÎ} ·{@/
ÖÏir´ù°w×^Gˆ F¨Oxã°]Ö]·+—¸{Í©1ÚÌo‘ÙmwS‘
ù¨d¾@îØB&y„MtQt„s.ºC@ù×¶Ô& eŒî‘½½=RvÑ6(ð³OZjÒç“ V#Ýx,¿	Ö‰sFÌX9qËßZ>¸;¤5Á9»£s …¤.Ìˆ–eñÞÄ¨5/l.A$PxÀ?~¼Ši÷7Ñå­|TbGC5:)@x¯Ž`ŽM1Þ‡(p–ÔcwˆÜÑÈ`Í,a¥¼dÌÔåHfU´fõß\z¹ˆ¶qÓê-…±öFqšÐ£˜NY%³ƒ•D‚œð"ì_Q¤CîHFËöA+ÚSÂ8.¹‰éeQÊüIÂš”ÌŠn¿·mHbI©»÷SM&Ù<â€¤Ë)hÊqFíÕ¶õei/2K)Õ+¢"¦6^3³fÃÒ—mJÃh>%1X¥žA§BªMg 2}<Ý¥Ú°1°Õ`˜j‘&ëáŒÝ.²õ·ëKÙZ‘›ƒ¸&?B'Àˆ{óü9º™¥ LaÍ1¦…f›xô~Ñ}ŒöP‰&sÊÁ4ÝxÈƒ¡ÒD›JzLéÓ5Åíí+öÃšñ‹R2”õ•«úÓzobÎPõ^u¢‹ÚJiMl±ü°|g”UâK<?Rå4¡¶Š¤eöí–Nã–T®[RB@ÂæÌº“ƒAókø<Íº³4b Y]ÞD*›f{kÊ‚.&”@±(£äµ4¦sòg´¥Q’ŒY.Á*×ÁXü¨€¡„Û»l-È†U#yzôïo^¿=%?¼zwð’œ¾FØ»ì'I<ìí³¶žT[ÖìÏhÜÀ¢BC	²ÆÀ—¦	Ÿâ˜/(˜Ò²Ò-ËÙ|+€pUNXbÌQ®“ô’¡—.1º;+’Êy·¼P$#
Â(/òØ!0+¬Uq}}…“÷|¸¡|€…„šè8Í¹'d4ÐÓ J<†£½vPšDäÄãàËÚ%ApÓ½înÝÄæ,?àÖô›Œæ;MCœ›ATX8ß¦\(FW>ûÓÈ¶¼Œ˜+A¼wwX‡eiq»CúrËu¬]Z˜øFé+í)Lo¢Â·ë\ÎZ¬!Q¨ÒÛì
æþ9ë÷†ð ÍÁKtÔÛ`–é~\|=
Þ»$pWS›ÄR]º	 ÄLÍòäÂ^óU6KY\¦qnK,ß¢J}‰¹ØñŒ±¢æîdèˆ…íê¥ç¶½ôä”ƒËM)5€dOÎýƒ.V—0¾vÎV@h! Á`ñìú~•aƒKÊ¡oP®¨+í+nŽqÁ¸¥»OÒÑZÓ¤¡mâøf«)ž¯Ø]á5m`Jïn”rÆÔ4–¤ª”³(?ù“úaý»‹.Á|f¬û&KQKþÑëö™ç4o:`Ç¼›…Ð
~{ü‡A×&§Xü† );Ä¨´Ã¼„Òž?±Õ÷U…ö>1^š?Ã:„ù7¹k÷,MÒ4FuUœ°¯çdûtR@Ë»üù•$ Ÿ¶ñ_æ;•£ü(˜ŒYýcù¤ƒh_qNõJÀºÅ‹4›²:GâÁ¨Â×™a”ÏâàhGÇROûüú+iµ:¬<Éqh–oË’½3hÀÈþ¿äß½½‡ðîèòX±Í‘É{Éá\Òb4È®Ío“ÑKq'õW¾Ž­¤tÏÙ­ææàÿ@ÿ>§Ù-ÆÄ|6´Ã‹iq(yk½C®'4£í–„Û‚_÷öà_o£š7˜7‘'Á»ŽúšÀâày:ÊÛ×Š±`©ÎŠ[ÓË®¸fA`åÀZÊÏúç=dÉ^¯g¼¾ A´6yM­)¾l@ñ (+=Ï´£	iÓÌØÀÑ¥0rxfíµ#üÃÉ…mŽ5ÐØPKNlþ¨Q¶ÍÝÆræCé9çŽÍ	˜x1=	®¨—JfkƒIEË:å9˜9›ÿ¡h
@Ý!"1ÏrBÉ.AE^Ùñd¬š[<Ú¸§Ä˜1ï$l}ÒuTÑrÊ©rò•Ä¥Âª”fmsPêw]€hB£Š²&]Kò-`Ù’°-†»°D¶¶Ù zÎ§á3•áK¦7Üt–+ßÇÊ—÷%Xöø7#ö¥{™¥S°º
ôÐo•NKfIe³Ô “«G±cÙç†‚ó¸æ‡Øé/U7•±¤Á*7ýÚÓn¥’³á>“ej¬Å,3Fø»AW’ÛtË1àE¶bÂõç°î/qñS½jlÿšžqGÿþéO¼âÕ¾
Í[a¯vWtvXîÉn	ånÑÑùÃ ûPPo¬Šä{­6Â—nô@è^g`¹'„/~°|>¿ìPuS]2ÑèX˜oXU£˜{¶§iN™rtÚBG9¢lŸ„ôJœÜæ@r + c‹ó?F½ÜõMT8ß&s¡!VÉR¶¬ñÖ»·8þñGþñ¡ËPÛŒ¶«X §Ó¨,uIÕúÏ)†z}ŸNéjØöÍSwsªT'LÉVºk0ìßº°]†úõÈüÔˆ´xGi8á{#Äv­ÍZðèä;eÜ“}§+·Èå Q»Tñàe9`©<š~$«YÊöEØZ½‹ƒ»ûÒy…s ‡Õåƒnî²¼¥ãDz`aïn°Æœ.TkEsNi3V›“U»[K)÷ÚÓ;ÝŽ£Ø«…³`÷­Œ«Q7)¦1Øq{khÐ	È8”µÏƒÔçÜª$·
¡Q2›îžjºt
qÕs»
â9LŸ…ë:B@º€M?†òm*å‹\»¶ït+¼cÐ½"È`=ÕcÍy6};jRUM$; 9Fó|ÃÊ™›H=”jqcÐ?˜{¨1ÓyÁöÊ’4¡¶ª0êÛŠœ8; 6ó¹/|–“¿ö|÷Úf–Ôww¨:yÜe«z,è}ægá„6Ö,´jK¬„î@ßüªà|‡°ÆR¶&²¸Aç›þ€µà"¦áÞð¬Ô;¼ÑòŠ-–q•ÿRê—ëí•pT¥à5ÁV!É2_>{`J•8­PèÕÆ°¯pº#ö%PO4Û]\JäÐ¯|PÄwÖSOAÙ'»¸Ä¦ÙPÚ!“].ŽóY” EŽ;èÌ9Â…jÞZ,e{¨?®¼Ïj¡<&¸È‚€­ MHáNÚòcÖ9!%j÷Øƒ‹<çhÂ³˜¼WÜð÷ºûp‹`¤±ƒ…ÌX¶xž±±H¶xØ'Ýi†?]\jÃ`¸éØ¥WÐ“œÏ×§Ë¢ËÆY„»“Qˆ!9Ì—i¸S>caL‘DÈ/ðÔÈ€{ì1à–›án|‹ë¡1Eì¢Äú@¼

2.ä<t·³=l¨÷ÉÑµ¥Ýä³™GˆÛBžø?¸_w¸ÜÕiµW),ft]F4l¹Öcå˜m6ú8šVRUÆ–/i™¼œÖ?€µü›Óš­$H¹´hN÷x\º‚ö„ßšÄ—óÑ$Edù¼ÚÔ}–Eô’ééßš¦Lˆ¼Mã&±$f!É(˜±ê_¨EÓ}àò<^ëgÜô!­õÕ‰ìyU+¬KÍêAÌÂØŽè9máƒ÷Ñ\L/ eÉCüiEšG1Z3ÃßœƒÄFâñóOÇAÛ+”/]Ð)Í‚8TÄ•Ï÷#ï—BÝÕÔüR	!#Xòd>bsï÷]Ñ_"²>+ËXýUtü‡ÛRÃ¸­¤«`d¿2Ÿ½Á·{’ÖuÁø›Y™ÚèèÚ\{ú2ñÓ@ÇÉeZEôz;|(N@˜w¾ÒV¢ËóˆÝªÿø¥n]ÉàhÎXÛwK/ó‘NE¬»bìŒ5ÂY{ã ‚©kÈþ¹ÿ<ºŠòÏ?üP4óñÐûœÖÅÍ/à¶Y; •¡ß•õ1˜Ãœ£â³cŽ7ó1˜«%«X•/Lç÷TE „Ó(á*%ahˆ
9{ Îx¢UÊžùÌZ §1ï°Â'“ôú¥áV‚7Q.ŸpS›—9ŒÓœê…dÜÙ#gçX,›jÙŒG3{aE¹9]Úß!ArëvÌ€étrxláÀ×[»¦ì9´$Bq ž°¸\‹‹ËÀ8èáÙùÓöÙù*Ád*ÖG…Ï„a=Çêƒç¢üÝLoæ¸|®¯8gÅNæ£Íù°Þéoê+'ôú¤Œ|%ŸÌ =’0zÖ ¥[Ÿ&`š¼¾äUø.¼ùw)ÉäŸ:œ—é8¿ÒÙQX>òŸO¢q`¨>9Ê(†0f°/š>§´¯ÑV¾²I\øXÐ`4¡Ù!hÞ‚cóTcÀyKG =wyÂŸ ÄµÉÓ§í»Åò¸ÂÊÀ¿5Éµ¦ÂþÖp!ˆ¹ööð_Ñ¿5ç'ÂÉ’|~a^%Á,Ÿ¤EûïÒÆÀ<c÷„—±¡ìÿ1MÅ›©Ð¾ÞešAÓqfîÇp˜ö'²"ð@3¾ßi‘ú~ïÍ™QÑÜöÿ Â½¿Ž2<‘‚zÈ™A6KˆuDÈ™…™êhBõ\t³ú(žÉæb„Ê^Èà3Ö#Pfh„ŽYç*Vû9-‚(ÎJŽçD¶E‹ð2J(H_Wwù:˜â&Êh~PìËZó±Q@: †XÞs–V	§f¢jLƒ8n•¿]RŒXÜ~òDœàGs»{ä‰ÉWƒèÊxX¨g¸íôÛ¬´ u ý¾ÖKÜÀµ@·,PþNŒ«T“õ(L&Ë(=`‚Ê0ñ[â‘QŠ-žì“sp´Zú¼æl(Ù ÓÏ¨ï@/Þ«¶×{Ez|òú„§3Dƒ¨€Å ºªaA6ª˜ý‚ZŠ¥È~	A½ÄMõV}ÑÚ]gi>@ÐþDƒLÿ¡7ÖÞ³I½.³Bøpc¾ƒ!ãê+¦¢ Ž¼E“î»“žÎ‚í8M§ÉLp0G((!x¾…&µeföeyÝ:JBmú¨D±Vr…qêøŽò7AâCg”ä©Ñ¯f±ÕW: ŒS+ù‚ìZðä0…t²™»Sò´üª7V¾SÊW3@#}‰q;äý?þÇÿýú`(IÎ\¼—åó¹Sæï¸yFî¨¾å¹þýNSC©²vËÚì±xáèÞˆ€"ƒòõ¹(Þ(¬™p*Àìj³OŠu³ây€ó¿ÚFªÒòLœ•†ö>ó³s4­œ…;þÌÔQ©o”sUnƒF•é!k+óCƒíœ8XÜÃ)mðvii°ô¢Ëmq‡çàAX~_Dáb}]×øÞXpªç!/PxiFdœy„©-ýðÅ2ðt½†3ÏI‚œ¹èALxÏ \GI˜^÷ØÉÒlÚndÃ­I>_®ÐwEJÃR–„Ge¿µ¾îœ×N)øO¨\°}LOô> ·hÖ€¯ìÃÜŽÖáÇKz FD·B;k¢ÇO”'$:ìÐd ŒLu@­€R$~f‚72J§Ó¨Ð­SNYÈ,Q”Á¼…˜Ib2ì•¬Pu¥†­î¼|µXÂ_–4mxnùö-…Z €L±Ø˜kßŸ¼$9xûêøÕŸwˆä£(•FxHÚf©‡§¯ßþDÞê‡ÌCÑþ>9D9¹Ž 3šMƒ
 ¤-¿ÈÁË—D[yóU:?/ÍÖ;€Í›üü ·­ƒ³àÖ{tÀÝ"‡¯^½>ò %œ&ô+±¥yËÆÊ³À¹³,ÎŠöÚéíŒ’–1 QÔê•iÊ¸©Áú
®YSç ÎJk‚<!¢!P1°žÿÌ<æá‚šy‰ªƒqÔ¡0ãµôp,Ñå’kMp>%ž‰J¾n
Z«OIßMÇV?ÓøgYïø§j|Ä˜äß=pÆ"UZ~šÆ`Ÿ Ki6TrâgüÌÃ¨ø9NÇâ®¶×Î5° ÕpØ˜ÀmÂÂCÍ©;KãÂãº9r­¹SJÑÁ5G2Ÿ]í°—ÑK‡%
¿ýÖúÉ¦%¬^¶œ¼³?XÔÓ0o#žMâ“c–î²=hË7rÓÛàøˆæn`Q|Îþl×ž“qp‘þ—1þ€Úú2ÐêMM¸±AÐî²š¡ó…JÎ©¬`¾æé(bâÉ7©Tq$,g‘òßñ1¾ˆh¢Yg‰óŽNgqzK©§ø,å!Ön ì?‰k+	/å2Ó›äPdøè1Ýôüàô ´kÎÕþu43T>‘:$Û}€Nt±¶?‰QpÉûõ3Ói0„¶¤æPZÝ¢<xvòúå»Ó£—?¹–ÀˆIUfYmà,Öì¾,Vjp¶`E¥?Ë0%ÍY^–A€©#íÝ×Zý9ô‡‚5ÏT°š”Î™jâ:ÕìccKÞèò$ÙbÆ(5‡Ü*¥ÛÿÆ0«DÏ}äÎÂ‹ˆ¥êj©¶*•UéM«[I9^…2G WËßû‰ß{KßGb”Ë¬œoUñMLÀ|²ƒfHÃ”°•GÿÙ:Wí§©øí•›¥½ÖwÑÌœnÞ€‘æ
.!¬à6|¼4·ÝÂ#Ë!Lô‚†{S_åÞ´c½ÖëYýÓ–]m58–µ,¹]GÉ¡O=BÎ6–emOSGÛ)“)ÀG,OEê‚\kL+T•tA[WøûÛ‘ýÓXÙ¶õJqš
Þ2€1 ÃVcÓßªa–/ÎP‚0ÄqÔ8 Ëþøf‹ÜÑ¶Ž3é;È_ô®q•H¹‡ÇÂ–â»ÎÕrÂÜ°®žõœ^œK+XÏ…l§ÄÜ×s¬¬ŒÞÀÁ{ÑøÆ×wNã‹÷µÒ“µ ÅxŒnrÒ‘_•:Â#-»ßŸþðò‡Š|«O;ìÄçölóùUR‚•4o¹	|x~uZŸóýÞYÿ¼t­óÔK¦¤ÍdV|”ÂP~åÞ²÷¥8ååzi¢ÆƒX÷í‘GÓ±	ïxŒ©±U>kQ°X\9ßlgI…ü—Ùk[¼€ym¯:nžGS¨ºÙ7l>fñ²9öXØw»ÀDÞW€%øÃwz)_Q §¢¬mËè%xW „„ûÍžìÞïËwªKüýwË/xÀ8½Go@t¿“·	}t©=Ù%CâwP"È¡^qƒÛ¸¼40$KñxT†ÅŠ›ýæËç\Hï`ÚBøµÝ‘8v›@áý.‹ËfŠÝÄïÞ¾l·"¶1c{¢}v‹EAœf|g‰Ï4›††‡eÜ•Ú¦ÁC&‹~,L'—¶C_¶¥OàÕÚs„~m«÷];}­¤Ðó#ÏF(uPÉƒ‘­ù<.Ð@àqJ³Z²ÿä’dZ.%[¦†"QëáÉ§è¬áÆœl4‘²lMQïu¡Cð‚™ûTO<Ú·Cdà+~ãÚø¯ÉÚwø<@W
‚?ºá_¿ÎTpýÁps«Cþk:IÈó~uø¶ƒ©þ£8€ŸBà‹8½ó|mŸ‰|+š<Ç¥Ð8‰6FùU©ã……È& RHÉ×›‹Ð¢ALääzXƒá6tË7’¿!tãÏ… HûÄ*Øì7¼í#	'¬Û|„Çž¥J0+dtš^Q³ŽX5ý :¦]ƒan6ÆT)^a™4S¿÷R«_q½*m›bÊi‘ºCÇ\4ŒK­åfŠÙVËr´Žræ@~©O³ùÊ«`@Î‚¨n
~P{ã¯Ùþ_“uÄ^qÂî=ƒ¶ð¯8wÍýÑ¥¤G<1Hò¾—]2ÔE …/;€À-z‹_QÊ™Ž.¶ À£#ÐQ<ˆÎ\Yz­lyñêä90Bx†®òi¤„-1-NSX9°ÕÚÙ9/6qÊ»Xe8Á|‚ArM³Ã Ç-Çs«ÓZça<§(G­B‹W!xãžÎ²‘'!½iO°ú¤%£xÒ¼ÝÂÂ­0ÛÂÆõ£Ð©µ×Ç"X5ÀWRXT5!` ù
@8´ÖKxíøR‘8Èðò<g¡§¸äé³„ÊC¼–/ÑÜ$â1ÎwAÉ§{¤hâq§t_
zaaN4Q”?ì”1£‚4Çb0ZQù¸C†ªãÌãÇÂù0Ôð;ø³Kô9o¾ýÖNMYàtSŒ—s!±œ1¹Ð´æ‚ˆLþmžÔŠ”¿Š¨’Yî6¨~WýM‚ç+ôÄ4«ØÎ6þÈŒ¯5ÇèÒÚþJ~¯°áJ0~¤ÊÛ0ù{³y>ië½·–ž9íÞU×øvºÊeÙ 3¥£å„lú¼Ì×·'€ž%ÇçûêäîÆ[ûuíëàqúBP¹»ò* Ñê@t¿J	h²: qkOJ15@þr	PÌÒr!«ÃM{R$™°ùËûÂÇö¤¤²aça[S…ÑxÛÀ®z`9gk½°FÅÆÎXñù8Ÿ¬¯é†®YñÑ•9ŸCwN¯„ö[‰A÷Ó+hð²<Ïåä[’~CíÈ [¨t(Gë|¥¯Ñ8Iæô{^5ÂèÞWüTF©Ùæ2›\)xÌÍ@sç³i¤žE·Ê€=ñy:zËV;a¿Øf-¾gœÙV `1m"ÁxZ¶¯é¬Œ`Qâ4šÒt.Ãl+–²Ýïë7ênÐ4s¥»v(äÙ<Æ´QlEÁ^íðƒi¦Ã{`þ­5à­r¥º[«îÀ[!Ko@ƒÇünÃØ•&FÊ•âÇ¸K°¼íÐ‰¤Ùú½Q¢ 0Ü=JF)Ž‰ÈŸI+§ê’+-~1aîÝ™ÏÚÁnË©lf^uŽ¨GxL” š»}òK÷l0èŸ/O¢e¸~Òïolõ	(³tÖeù—òimî#'÷Ô¿‹Qäùã	¥1Ñ”ÈªkŸ;ßl®–
àóæ	ŒpBìïnL6-¨K/›€.¨‡kO+£‡=Ñ›,±®õš5êD®Ú@U°Éw÷Ý4–Uy7ÝÜ"þ”»¾±¾}ÚV¹áJyö,TLW IÝô¼Îeev67÷ ²'^UB½&h2v©VDË¸›Á|÷&Ök„VûQÿ^hàn„†UbKá#îþ+‰Ç¦Ø)ÓºbÇ7Ù¬ôæ¸´°Qî‘^5ùÊ@$x7Èñ>–ÑøDlåõØ—WÀ•ÌmçõíKÿ‹ìH“…›½Ì¸ëÜ¾øÐ;w<Iþ]¦Mé{Ò¦4œ5Ö@UÙ¢–'óSbÝõTuÆ7õ3Ï4Ü4KS›@‚d©HEìïòuw€éf¾:M¦™*"ò	Ga,•
Á«2RŠk­ìü¾·rÿÜ•DŠ}1ñ'nWçÙhÏ÷ûÂM¬˜bR¶ÑÅëœð–ºYw°F‚¸Ø[+©°c¼Ã™foR˜Ä·{kIÚ•¯DQïm©ú•ÌÆÕÜÀæÜë¹ìŠ“—ç›æ™£Ùˆ,"u]ã»¢ß¬¹Ù ½amÚQÛ£f:T™÷Sj™Á³o'}÷å1b\13Égž9Bdÿ1u–NRTÌ²À}&FˆßÅìÁ;¿óéÃ6Ì”úÿc5˜A
[µÓH•úˆ¹¤`ü>&TAó›Î©f™«îþe½Í}ä|ô¶É4Fò‰+çdÕýøWL˜áÞ~J—4¤Â7¡-IÌpåÄs±„ï^	üxï–¨½mD¿^ä‡~O”‘´^»`bXqÛÄ°ú¶	ß¥×°¨õŽíÃL€Z4Û[;bóGkK¼—~8·P025ËþèÏºøO^‹8,ˆ™`ë”Bz˜P®j«DÎ
¬X.›±ã¿CŠ›OÒ$õ³¦ÅœÇÏÉ+–_É_Ú+9“£ä/ªÃéù)™Lw–|F3}/¿OfkÄb¸[Kü—ág»ŸHÜ¬ðºËªŸ›eevÙå¬êð¤¾¼X…û¤ŸÏá»OÂa›Üe.¹àeRÛ{`ÝÜO_	ï¥Oõ?/æeRÜ{a^PXóÒýåaÞ¿vøg¬øE<¾¹çº€¯æðÌŸ_Š;”,c†ö}:eÀëiký¬Î¢“>z•¡í?Xñzv?ã+ˆ‰÷ãw±0©·›.7*½K÷a«o7Ó¯ôúèSÅo&ÔnVò]|¦íö²KÖ4’ÙÓÊ›Ï.%ŒÕÎú½'ÏÝ›Ñ6YÂï­å[Äì-öçÜ'ÞMÿÆ¬`¼Ïd7ÝÇˆ¹í§œÜ‚…§Ñ‡[q}Ø/Ý­~yw™u?øò9ÌE®—)k/-6îuXé2ký¾Æd&åkn¾=œÐ«,M^ÒË¢jÓ{—œ›‘Ýseú*·¤‹u:O•œÛ7¥7‰¸‘zHÜ²Yyí Ìg¯2ºaàvy5m” Os–ÂÀŠ¡©ãØ¦LbÝ¨n$÷Ü}=MYmÍ²(úñÞÝô4î`h?›Ýð­÷Ä½íR\"hT¨*·½‰ŠU0çiÝ­3Ò€h—=Çc“ŒmL=&A¼wÏŽ†ÃE¿ëÙ*Á]½4´„WI½‚yƒùWNU— vswzªÏ2Ûh™f´mUðÀ`/«t ~,=èËk¸ÔÆÀˆ" Ò#]á‹Ç–ÆRLŽÚÒ®9žº;Uô$Óþ)o”4{ðÄ½D?–þ¦I9Í"0âbyÕÙà±÷¾VžEÓ™iŸ?óÝp/ÊWÄŠ­J#o‚©FD’Acž@°FdÒ­‹Õ¨ô¹©Àb‚+÷!Æ®Óce7µ*ÝÌ²µf &*É—¿¡<øarò0ÊFËÈ#&ˆL…[!ÏÌìÉû¤¥G¢!AE¶…Ÿ˜U„üçJOÏ1ð¥3r¦Öè¾@³š•€¹	½4†“Àr‰¡Ñçòœ´ìæ
3SÕ­‰icëã/ø\h°÷V+Åd/Ò2½¾…\QDî,ãiôÊB^ÄÈU%Koƒ}°¼Êa_®fµ‹nü…+ÈZíi4ITd¸
egHš¨®ÖÅŸ\*Æ+©¯7ñ<oªµÊ@ÛÏ¢¨ÌÚÆòdwÖÑêaŠqÆì|,BšÂšMÆ8ßtƒy‘Ö,ƒ­µxµ³	¯Ø¶Â\|Ël·U‹÷…urÒ={Ô¿šœÃÔÏ‹tŠçnÒ8¾ìÉ¿[àDðx`ø\ñŠãy«`–S7¶¶@ïŽOaú6}—¸í™…%Ë+çsZX«y?z´~ä»é>ÄÙ°ED´Ì@ÝÇ¦CÕRØØ/&Ÿµ%ò™‘·D~ö†tûóó7VÅ<¯jÆ¿êüDóâwÑŒ„¹qÅ9¼Î\³M wZaž¯$ÁýªvoååsæÁÐm`LzŒ<·/üuˆÉÀO@
£~´Ð¶O¶Á}¸0%ã`hÄ-Ýò@Ó¦y,Ê{-Þ^¯Hr0äG'îˆ³ òÀ*š»ýÏŒÁ;Ã¾ŽˆšÛPy	:Qè‹­dÂxiÜäTŠþ‹Š("Ö¬çnb¿»pXiå <toWº@þ1rì«T’™¼À1ïnL†à',Ê4@»ÁÝY$ƒ¹ Kc
Ox…0{U×ä®Äo.cITyaî<ˆDOlÇá'~=À²³®ßU‚¡¨åm™musæ¯¿â%o2¼æÆç¨Ü­Á’—˜]@ýÌ{ÊŽ:	œËnL‚\ëƒÙ)í y5€ VåÕý*˜Eƒ«’(Àô
ïÒF¦_ðRÝV”sÌê—Ã ê|²s°qüÙþ ½óÞîÝaÖicÞ9G27|§2+¬"ôñ¨Bn1ÖÜ—[„^eWY÷¨­5éÔv¥Ô˜,¹ìÚVÄ-C«|Ö¬wòÝ{÷Ùs°?ªóâL…ŸÈªE*ž'-0à^±ð\Óæ~L&ð¿$^_¯,â¥Áâ5Ýô®:ÄÉnêzj©jZ2ˆiÖozŒ§[–<¬\\ª*ÕJK £ÊU ñ°¾¡šêžRT1e6ŽÜÚ“lQs-µ¯)iiÙá$ê:jsë}	ô%hªýùSOZïÜÖ­Û¶|Ñ"ïþñÿ«æÊíŠLDnñô*²lAØƒv%ôþÿñÈ×ÚËÅûº&?1†îÚž{¬È'(¯V0î>Ë­‹l}zÒÄïÑó_ÛÎ{Z‚sÞ$Þ±PÞ%P¿Vw*$UœÛ`¬¾LhØª,JX,+¿œ«ä}÷½q@­!R«_îÓV
ìeýDU3¿èÉ+0¤}Çq	Ü'é¶Ø ·Ä­Âl@|Ï[‹õe˜¨Õ½U¸6’³øxMÇf\ºL•ŠÞ,ÍŠyí}'‰u^fAIU¹Ð÷šƒ£âŸÿ÷¿ÿç'¯¥˜ÁÌ®KâclÖõFT©æÙuü«\d²á@ŽøŒÝáÔr®F­Ó”÷ë¼u?Ëmëc¨yÖ«Ù¤1òÊ{hÁDa×ü~rfðÉ¿­WÑÚçe'BÞdé4%åâÇ1Õj˜©µéJ€¸o ¥æe´Z=.ÖÛ•]øÔF…»$®—Ðóh»ôÊ¶w¶íõêQ¡ÜõUíñU=\ÆË„‡oÞÅÉÃOÙý70àqiçïCø&AV¬
F1<ÛKHõ+l¹(„A‹´úé²2²nðýÁ¥óYmÃV^Vññ\S÷¾2uÙ<QW-Wwûï×Ý{Ôü;­bÝ§Á@þk‹Yj"÷žÄÊOÓÜŽuËu§2?rç]Ó!W^ï&à¶:Üø	Ý¼d™1ÓãòlJxü4¹Z¯²»M™†]…ö^ñ&ËÓ¹ºY»­äå°÷¾aOª.J«ÿÜëâê%iPjy'Ž×ýØ&T€gtÍHþjÛŒíµV™°®Z=¨©ü,·gÞ)j.µkªÃ—ÊOãüËÍ_¾`öÜ'_÷ù]ÈåÇü‡X&åÕ…rm\ño,˜U€ð¿·Ø{rÌþ4Òõ˜ª[,?vžËåD´’^öz½¼ÙÌu‚#—ÕYÊ5þO@íçâƒe\€)H—xšÐ[úÞçQß_¹1æ¼D+kîª¬ÇyLã`èŠ÷Š×?26\Omýñóz÷4òÉ°îD•SåãgõÒÝ¼jB\_ü+îÎMgÂ=:²Á"Ü¬xÔÚô@áîFéò'õôfñÿ  ÿÿ yV?ÿ