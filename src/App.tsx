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
                              const docRef = doc(collection(db, `sectionxœì½krÛHÒ(úß«(3:>‘Ó$%R–jI>²,·ÕÇ¯ÏrÏãúsŒ!16 êÑFœÜ-Üˆ³³§»‚»„›Yï'I¶ÇÓŸa(TeUeeeeeee–ë?,Êxt4^®—Õ|gUù±Óùé©ýDÕhÒ/ãª=ÎGoãÓ.Y¬(AÔR%yv4Þ&´ÂîÊY4·IGE}|[]&Êê•QN¤þ“´Z«!œ&…B&5…1MÆã46¨´¦PâË*ÎJÀ™"“šÂàƒúj>=‰)…ð4ªâ~–_´;ý*?®Š$;kw ¹ÈPº2’Të¾6íBtXœEEeU[€€ÔBØXà$)ªÉºª “ã1¾T¥áeu‰‹89›Tª{oØä‰UxrÂ'ÓDëé4iX,›àÒã*ªæ¥6÷ìOr±\QüúôÎŸý
Hwe#m¼Ÿ›IR¾+¢¬<‹"ii}@x§QZ6à”,fi4²I…¦5&Øñ¸ˆK}<¡iùY‘L£âê Ïªh¤™N¡FÕ$.šp5šÑbk2­1_Ë](*­)”³yTŒ“(3áè©×…ô6N#$Ïr’Ì\ˆú×¦GÉ6ß4’óñ49KN’4©®4¨›N¦³"Ç@VMòÆY‘§i<>žŸüÞ£1”{ÿ¡a/âóXãÖ*­9·¤k½9ÀZ"ƒ³Ìr…²ê{t%UFùtšTíÚË;5AÖùu–æ t4‚¹ü4*''9ÐW»*æq-\(ú.™Æù¼j·;dw¯eS.ÙÚØØXóx’_Ç)CêË|¥6œ Þ ¿…ÿ­ï?¬*údž~²¸6Š
D«U"Jã¢j·öÓTPGIJ†ŒÓyš^‘9ÅO<&QÿÊ29Ëà¥Ê	ðš¤ ÀMgØñóXZy·®Æ%!6,	ZY&x™§q2æÍÞ ‡˜™Œç(?‘ÀoŸ¼î•1MâÑ'	»¾¥§	¬²€‚ºVÂ•Œ† Êæã¾|ñ§/ýÉ#¨KœÅ»‹§i|I’*ž–½ˆ™ÀÏ¢YoHf—½ûdvÕö·ÈÉY/J;Ë{÷76È$?†ªÒ@ZbmïbpH‘Ï3÷ÞeJN×öNòtÌ¾_–€ÕY\Œ¡U>A×{É*Í‹2/z³<¡m¨pù§òJPIÊI4Î/zÓ±xRÍYnˆÒv9‚Ñì=Ú"´!åüˆÆE4#?„Æ¢xF™[I'&Jã¨Z~ë—Éï1ÙÝÝ%ò˜¬åP¬ ½­Ñ‡,¯°ÑùE,››åY¼F¶ÉÚš˜>úÆiÏ›wámðcÒtpÇ†~z3´ìÒîbpo©QF+Ê@V©â^9K²Y¯˜Îöérê÷û;ë4)Ô¢ ¬ è&½øµŒ‹:=U?V6D0ØN	kö(Ÿ´µc¾ìÜ°[¾±ÝY?™WUî¶³>NÎídOâÎ:ˆm0?úÖ+«¬}g}Ÿè`½1°{–GfžËçÓyF¹19TÒÍ³¼˜¶0›‹i¾“%H14i8ü•L§o°°Sæ‡ì²Ò…'²K‹¸¢ÓO2÷|†[ŠC£L›%–8]€ÙtæuBÛ€èXóI¦k)]|ç°€O3ñê†ÿ‹¸šÃŽšÑßàDŸ
£<íáÐ÷pi#'y³¦W‰‡2Åi2 .8«zÉ´êÝ#Œù\õî·ÄPìL6u”!–SÎ"aoò‰ñHì! °J@Q€e·Ô¨ïÐùp£4³âþÒ©?žÆE”Žwm3\Ç> •¾8|¹þËóãõãçÇÚŒ‘”5ÙeE’…À³"ü¯¨,{2o«×!mÿ}½ýVyN½+N@¢µ{õ~°1»üÀìVf[{ï®f1ÉOÉA>¥1 vgVbTËØ1¦ãy”ÎË±õ+„EÅd“äÙÁ$ÊÎ07’²Cð@ÎXt›Äý**ÎâªOƒÅç–	Nëþ'Ð3ÙYN£&©Ú*+ý=\é7e£y¹2¤h/¬6øRûf¯Ú /Ã‚ÓÕÇ4'ó)©¾}°˜[>£LˆaµÕ"ã¤ŒN`3´w0És¸«|^èdº³ÎJÔ‚9Lc$[Ø€“ãÀIÕ0·öj>6þ<9›xÀz“üež%0÷pë¾6ÿæðÍ;òH¡i/
ï¿8&ûä?È¡„`§4óõeký%í7iÙ'Ç°/HN¯:>°Ó¹§q
¶~Éww¢¨¶V3ºkä?þÃ;,Y£/¢9???ú9Îpz‘}¹£³ØÃhÅI6›[	ØÖw§NõaÍãb·÷ÏúäáVÖ'£‡³ÅÙþùò¶µ5WºiÀß ‡ÃÙ¬ö†¿u[€seº%©$Õ±Á–è”ì¿ú[ç‹Û_’jBžçYó¿	ÉDënNtÄw²û–ÈŽ*Aâr8ôg$?=Á22eõmæ©Êô¶¾%ÚâKýÑÓ¯EKGãÏBIxÂþŽjéÈÜ’UªÚçgÀ´¾.§ÚW‡·&±}qÂùÎŒý…¡9[µ«ðî¾¾ï'¾ï'¾	bþ“'"ü¹ˆÆs*x¯ó9_Šð^¾\útýoðkDx“R5é)·%º!	Ú ¾ã·DŒb—ñ5ìIùY6:˜ïÄô-ÓW !Ü^ü³ }§ªÛuøï2àwð› éï2àJÂûÇgXßÉñ["Ç¯)þã3‰ÿø.~«äô•åÀ|>AÐõ®n#	jÖß´àGÛù–áììËRê,žU¬ž[Ð¨ò:¿%®'dºÃËhJÚÓéúx¼~¿/f/pMyéæ–bœ ñðnÃm“°oš7ªÆ~¥å­ù£„ñJ¿%öˆ`Ö5Éð¤â@PKí/NV¬š£ì4¿i)8ßÉë6L™¶º¬ïFæ_€\¦·*õÓh˜B=ôIï—¼?}6 NJêü£ÐæºI†¡k>2ÝºÚ#oö sâ7FéSÀ(äa·gîÈ;5ô9ÏŽ£ó˜?àÑo'å>½pwü7|NGðù,ÍO¢”ßX.É.¿°\:	ìÊ§ö¨¾åÙ»"9;‹¼¢Ê®ºÝ¡—x+ù}#ÕT•ÀÚ»MÚðïmª>~?<‡æÑ[Cçy2îjœFºêØãm ˆ<£LïâcZk¦ÙUøÂÍ;é¬·˜ÌžÈ?I$©cB}"ä±Þò;Æm«÷%Œíhò¢Èè¬cñö</ctþ‹Ë½¼DR²\@É]v1U¾¥ÔÝT£ª—å™V¼…Äe–µµ.%k|¢7¯$ÞoÊ	¤Q /ãiÎ/\³û^É)iKZŽ*žûiœU²‡w2ÅMO~£Kæ9MRXÑ°<½Á=?éK6”U‹¡é'c~ÿ–Í)Çoó&€oÚUû+>	èÚwvý¬xäP»V-]Ñ¨:¾f“¼Ê¿O¦àaçù»—/h*·¤Ýk#aéÃ5*òÙÑ4:‹‹±-A´’:’á´)IHÀ¡ÇiLK>KÒ˜ql¼§'çK¢3Ïm˜5¢w%¤ÆT­e%½ßøÐáãÀF†5¿A­N^=OãWÈ•Åû–&?ìs?ÏpVÑHf!è›HSy5û ÚÍÓJ¿…náÒÈÏ³ãõ-†Vy»›Ñ×Òh	þÙ/aóýúöE{Ä³[Ëˆkêö¢>,lB†¨¼ÊFÄž?w%`·œùKš6m3’][S}ÓçµšËôn½šÐüŽ<»‹eäÅÛWxÓŸ_ÓÜ<ècÈz‡W¢ñÝƒ¿z›•H@U¡nÝ¯¯“yŽùI’†RîhágXÙgí5ÁÓ×:<?Ãáo€¸ßæqqÕ¶KŒOºD+Õ% †Äíµ´È =k»»k]ÊguY4Ã‘¡~-`0Ÿæ£²ý›Ì¤QÜ]ÌÚ§³êJ'4èÔ»èSŒN˜›+2E·8YyÓÖJtÙÉ¼böé
ê§°ÇP7Lôàén5ôºØµjh/+$lF¯(RçE©œKÿÐR’L		ònñy7î—ù4n—”'S§V”«æbZÇôøÐˆ&ßM ­Ü5…ÞláVÛXw¾E'úk–[fÝêz“Ïæ(3rê$ä^°.Ð±ôF)NÇÐ’F­UR×K-DFÇè#/ºS¸(Ðu´gjàÿ/ñˆ‰LfcŽW¯/ðîÌ)Ê§æPËëÐZëÅÅh-I9X3Ð¬9Yƒ	¦å×Ü©é—jf	Ýyš^Ät f–Ñ\¥éEwif	êÃÌ¢7—æ:LÏk¸³ZÂ<­ÞÎÌœt%6sÒ$7gÀ‹–^2èIË„TrÇ^zÑRzôZ{Ÿ=Fæ·ìïŸÎÌR2Ù­„9+ûûhj–Éžf¡w5£Mñ%Íõ2Jc#'u§ç„Ï è÷ø¡{]Zú¸˜ŸYpW5Š]ð›V}B]ÌøÜ³_&L•ƒ“Î`Kh.¬‹•ZêU.ù›Ì´–jU¸€š°SúÀQüÐôvÃýØ”b)l“V—(·2š·ŸšBòåócá‡A×Úçz¼±tÝ©ÍòŽßå‚òf!—ÁvÊQº»€-?s²²M6”KîŸÄø<PŸa´ªPQM#pš\Òµ ZÜÛ ¿£.eãƒÇÃÂ?æ0ö§Wâuû©Ex»þûä$}Ã’×;Iç…¶{‡ÝfšŒ>í.Ä¶“5C:†p{nôzµæ÷muµÞt	ü?ÜÐ]ühá…Z‰-a8j^…ìÒ ,Ù1ðž|özQûž¶¦~ÑÐ¸bÞ¸f]ö.z÷.S©g^J7?øˆ‹âi
/X3âŒþ‡.#hñIïý£óÉæ°÷ˆYï¾Ðïœ¸N;(d1¼'quCuÆØkê¢õ­Ó…«|žë
Iºù VälN8ÚYŸ-ˆ3`éxú3­zƒ:¬ÀÇPP—RõÊ2vÖg5ª&¿~$÷,ååBiWPþóh5l%)­‹ùÉ±R…Þ‘}tuãÚ”sj©U^‡¼a]Ë–ëöJhÑ™–¦Xz¹²ZYÞ±|N°l$x<áö÷×Y½—$æ	±Eø ´Žÿp}ä÷bd)`ùÚŠã WôŽ
Ž€Ä¹«¢¥Åšja8·Ìžü•£e¸á Å×KkNØ^(ì"¹ÙU/šÃl›õêÞn¨TO5`SdÈL¹ôa=4&•ö¸Xÿ9>Ü{ðœ<yýWòìõ[ºÿÓú²fâ*
vá<} ¡Ù²é¦‡ÂôŸI¸ŠC¬wm4=ém’“4‡]çj/G¼\á¡Ü­ïžv(D6!Þ\!Z¬áõvøXÖ¿éÖ[û†CÚ¹Á°øI˜ì×ïÏû¤ŠaåÉž®ým›ê£ú<ºÌˆ\³½”qí3Iiî‰úÔô„dÅ©]ë4^8t]š‹,áŽhw¡éÎkqz­Dø^Ü8SÔ'MóED4z[¹,\½hèDw‡òh”z4d	Î9žiðÖ/ä!B1à•thñœMqB¦aÅÏ/°âþ ×!OfÙvûDayãØÐNÞÑ0qùqéÁM-Ø}t-êø`æ´òÏ¶¾çÒ…Ï³šÕ×^—Â¶¶´æe€JþoÓç"¿`¾Û8âK`2•Ã!qmzCõ"\¤ø¿p6›KÓê:=R™ØLŒ·/ØºZN€Õ|ê‰Å¬WÀ#|o}<ü…w_NzN'¸hôyýSpùöOô,ƒ")äerÇØ ªŸÚ’Ñ™q:ÔçÚÇýæi{}Q~úòù6æèmû<¶ÅN{O¦³Cñ0ŽÊ	l¬cuÎù¾¯É[­†¬]9Å<–22,û>?Õeu•Ò­2F59?À\ëJÇýkƒ{HðùÐuˆœ:¶dê¿7Ö ÓdzFÊb´«AY’(­v[ŠFâó$¾hyÌ&ìONI€á‡­ö,‹NÊ<Ãª#” ¶^C,„’G¡H˜‹6O¾î ±uÏPÈØƒ>ƒ)G§›Ïl•Ý=ˆ×xÁ¤u7ðpË„«UN`=Þ[Å'_zØéí5¸¡O,õ÷xÏí?ìÍ-s|u™}Ë·¡BY}XGg~vùÈ\kÛv½„÷iL$S¹±%œFÖ²×ÚF?ÀF[È
éY*dÔ©" ™åEEŽõuÕ‰ÆÃ®yC›!ïâòÒò}.âÓÝ…±fø–µ³ðýûŠD£Q<þ•`Öõ?ùX°†f¶¢xZè!/Óz¤EŠŽô¯0Âw þ,Öš*ÖÚ3`ÂÊ	1ó;Œi]qÔj‘eÇ»Ê’Ú© *‡ÖÈÑf‡Zí%ÓÜ±Ñ\¶Èrðë[Ú&„§á¶cˆÛŽ\Ù§cß¸ù©øm<€l’ù†$èñÚA—+µÒT?„¦6q-|KŠ>¡. Ã¾ÁËR«;£¸_/ ¾ˆ€W!˜€]0­18µëuøs/d?ÙŽóßý¸’Î0óDØOÓ®Ê@KÜê°yÍ’*Jâ»£X=i¾”ñæULàÏ§fõ’ø¿šéáó×¥Ç_æ‘Gƒ?-[ƒÒ¢fÈðõý&‰ñ%5ùºÔñ*_MŽ¶ËéQ7“ùNú ~“IÇûð²ê=æXtÉÑÑÑj‚´¬¤nHš	ÖwrÔÕ¿çúÆÈóÅÛW_ˆ0iÑ—ù2eói\$#¾"þmžñx5uËÃ®ŒZÇ7E‹Û‘6µ4©ø¿'cDûD˜aÞŠtÀj’&Ÿh(0ŒÙS+ýâ­%³-+´y<®
ýÞB™ÑJz\Õ¸cõŸPÓUv«oªc¡pÐ8V¦ÊÇÑ•^¦¦o4ä¦¥úÐËg0þGE»Cz¬~3uUõSØK •‰	‰'…Á n¦d‡l '€'ƒ5@*ëd‘@YJ§>b t´×»~È=¢†´ðË!P!@.»ÒŒ–ÇU—™Ì²ÊB!3WFúû#2³•‰ž¤ÚSÎ:æ÷yß!µ(ç÷Äot+œÚ¤¯0-y“ ÅQ]lY’@	CT†îMìKl’YÎ¯^gÿÝÉÒIüN-m5RTºTw­åùóÒè~Ð9äê‡4ÙL–¬‘$ñÏë,½ò|2HýðÍÑvÿ´È§DÊ¾Úô	ùO3V’>eÑMÌÒ§*úëÐ¾A®†E¿GîF$uûïšN5R¿MB<Ž/Ã„è‹ÆçŽ«qåF#Lo¸Ür„¿æ¶£oƒÔã’ŠW:7Cº!~[{ø¿?œ·Ð3X8°û.è†é¡•ÿ:9Ä‚ÿÅ[¤¿P{Òþtò°Eë\¹IªÛj—U<ÛmmôM5S÷¶ ï+w\ì†Ù­6îÜç´wo4Õ|b¯_õ¯¥Îçœ:GÓoˆ:®e+ûéÄ9¹=qN¾§üÝéfWÞÌò°j¯ýNˆ¶W¹òšÃ†Ñ[¨czÅ6`Åã¯ÕÝY3§êõ‘w†.§'B¢ú”9™&]¼ŸåÅY’]øB…Þ'/Ú³¨(ãgiUmwÞ7ºÄþ:Ñ¾õüÂ&T‹žVÈcòñ‡¼,Iü°íX~Djêhà(q‡øk>ËŽÇÕ‡á&t¤q½ú Ýöý•/s†žŸu‰ûFÛ{ÿfEg`Þã7Øµî¦ÿAvñZ`7_GnþË›â^p^ Æ¹•Öa'<×`Ãcm\1uŒðþÀI~éáÍÉx·•”ï%§1ÞÛ>òXP x…’’•Ù ½³íYÈV’“K#$^§w}4hi‹Lzê¢dzÆ‘£çŸF!ÕZ‡žÀže‹MþI5M¡.æÂlAqu^áƒÚ›möNº‘áö©.:^(Ç%Z{€£®¿D#»#çB¬ÿÛõçæŒTC…µ/räe”%iTÏ:OdSn¬ëT nrZþß˜u~=‚{Žþwn£bo@r"ä¨§žî¢kyî÷hýîú¿S˜y­Ù/ÿ1›ý-ïµön  úæUöÞ“_	@¥ìgºR]+	žârK»Ð5·á—ÖZ§]ë	\SáÓÍº"'y‹dlX$Ó¨¸‚ÙÕ²dþå °*vùò”uh©Í$Ó‚_M%³ø¶*Û1nÈð	álßÌ.¯Á0<Çx‹ÖWƒà †ûsŸÁMÐ»„Jÿ]Âl.W‘0LÕ›?®6Æ•@nfmöGáoÿ0×e+/ó?[™æ7g+¢ìw¶²Š­0LÝ’­( ßÙÊŒ­ü<Šqe Ær&ºt#Ö¢Jÿ7c.G§$Ë+Tb£ÙU|E é–œEó·|ã¼¥%¹yK½YäY9If_–,©úižUÉÊµN“Þ¸Ï@›:8Fé:üHovD©-¡ák­8Ó%oÈ:«‹"ðEõ¦ÃÍ{[÷<|T¯Ä±6±&ÝX•e@ù®Ðº¡Bk†
-?Q¾Œ²y”''Ðº³czÜ.‘”,ÃÑ¸–r2Çöý‡¥[F“U²ør$j›°Œ(©¸MàOÐ¹{òŒ>sdÄ½áP…A)‚ù~–Q6$P=ôö¬¶ü±¢OÆ¡bM†T‹aDK#†Æ—sX} .(â¢^÷h!—^×='w¶<}²6o°ØÛ#áS×ã°«†íí<ÉóO¯gqVã©GÉ²­õ=r(<ù‹p);ë“Moë½t-;)u#Äæ	uµ”Œæé|ªâUzP‹yP¬Gè;îØ4zð!»VÛ\Nmó&w}¼uŸØ>EYUù´WŽ°5'zòûEZxîô§ÑŒ†Ö©±;af'I)ñ¾K˜ñˆ@ (9G§Ÿd£&lIA«À:ÎÏpîùñöS|s„Ò©cñQ#8êƒNÇozŽßXhxLÖ<nP5/—Ô! å3äÐŒ{B‡Î¦ÒrÓ¨Î}®ƒDw#`Ø§ÊÔXÛÉßJ;ý'w²
qá[Qô§-q­1“ªƒ‘×¸äWÔ`º‚¼ÂW¶ø†î±¬:XÄ­¢Iõ£Îý±Ô8Æ£¾æ=7dœ¾l“ý¢ˆ®úxM¡•tB7¼ä/pÕKþAé™À¿FÀ+û›˜k‰£ÆmZ74ö½þ3ñ²îºuG¸ý¢>¸Z{ŒW bféeÌ+jâžè¬…B¿_òÑ$ªfþñº"}åëÈ;tŠróÁë·‡km«GbÑ-¡‘ÿÜDÿ¾Ï»*ð¸jò¦e€A£Y,¹ÜçrÓ’Ò\5?Žužýš,ë5ÚGAD­½W¹Zâ&gs´¶)ËV|«oP¹’P2<j·öçæI¼¦[W<ã6õ«q6Dåz{õûK«ó•|-ÿíÜŸ1º¿¯Ã[ºodï&Î\Fëº³vY¢¹×-q]÷Kê•Ýî¾ò }WÅ5hˆèÛ	lrMOÐ4MÈ¤›f‰‚MÓ;´‹A?Üíiz&ž(Ü¡»me÷h*­å
‹ ×õZD3wÆ†#c+:´—Fmoã0€•ãâøØÇ%T7>/ôè†N¸]ê•CôÑ§FÕ	/³k@0‡h¾,ƒYfñø	0”û÷¼rMs_,th3k;ª Œç¨~K§”æµC‚^Äf,«"Ò°ÏvŠP–oÊŸÃŠ‘W"¨,.Ò¥œÝoÒ ®<u[’Ÿõˆ¦ÄŒh:a€iÈJ^‰­R,]2njWTó"E©V—àòZTÖåû{m.LòúÐGµˆ…ú‚=!My|B( I‡§§ Ç°Ø§Î(K@—…pÁâ1J¬ÆÕhÂ»Óîá&ïòæÓØw…á7¸£µÍ¯„?3bV=6âgŠv¨µR«¾Q¨CŸyÈm‘ÆöG1<Ž¡ÆSÂH7¥0àyÓ)ú´?MŠÇ FìNaºŠ&u16ß¤ò¤ŒûÀ1%DÚÜúËhŠ¦—	#ð"í4qûˆm2†ÝCùÁ˜G_$KÊ{ø“„a„…{÷‹ø´ÏÎ¾ø½³(óÛŽ/$¼cwxôb&—á0iHJ©Q¶}.5$pf’uVä]¯FÇYÅŽ°ÊÂ({š[j4ËÉ•ki NUéš ˜5—ÅjUð Õ¢6:¢T-2.9§CWÊ±+Í>0ž*8=õgór‚|QÐ9G”IçŠ¼‰½Ôù¶z^º$¯³	+n¦à7¢Me^ ïŠº'l‘’1‘ûåh’çÔ³îTZ­N?ÅæÅhï
4×ŽÂ9MÔð)Ñt×®(:rbÛQ¶©…%|uØÆwPþ§ëqKYþord–—i¦{WlBù‰ï¥!œ/4‚5­²«c¨-kÎÐtÑB‹œJKŠpÔ‚à)"Èëyµ&b$›©?5€¢ß10!Ù_BÐ¬{. r”‰Âì\%«¼ŠRvÁ9?Ã ‚ˆ§Ÿ¬¿fI¥`ÿ«ÈÞyq&>ý%÷|ÓÝqS¥åûAwØÝìÞû@gw…% #ê‘îïÚî„ìÀù b'V>yØÀOÌ)@®Q?¢I«Ü§Üh)ú6¢1‹vÉË¨šô©po@ÏG1›¶»{ÑÀû Þ:qk²™«dNis@,¹€û¨;‹°êêÊŒf*mþc-a›úVU¾¡ýq×èàŸÈÜWˆ6äÕ¿r^!y¢"C­ŒW1³ýsžÖ­kÕëˆà˜½]ò`µÆo@4È¡4Õ¿«Ñ'H|©·RD¢÷Ì>Ô±Ý£ÍûŒ9ø’1qð=.&‹¹©ÅÅ|?,âé‡k‡Æ|¸Õ84&F¼é=\!Ó;èâR¶vï„ÇÆ°°uPu3íÀ:üª={!xþ8õÅ
ÙáKþ°-
`Íá£«ßØÁº1MF„Ã²”Bz
…N	`|j1Öô…3¨R„RMî ÌäUŽäÖ–•A<}:/ÿŒôÐ-"Ó
Ý¡…%Pv.+£6Ö…i´pöW-†ÉºÙ7[ydõ¶	ù¯<N5£À2*6‰iÁnüŸkÄr±ùéUo`£ÚwpÒm\9Š6‡ýrØ+gI†a[îym?›¥€4›ƒøÛÚã25ˆÅœü¹0Û#W=î Æ¾Œ“†/Œ¿ç~pï¡OD¡ÆËüféYØ*àèioy†sÅoÖà-ôRÏ<gkT˜Ä»âHNPÁ7~$M²Ox È#ÿbÐÉ†#¶bhBåð·£‚7ßƒva[}>!¾.ô]³­*­ó6}*©GV‰÷DU(hP£¶Á»j·ÖÖa–þY_nYÄdg —xIp hO$< ÂñÂfû+Õ2Ü¤I½ýQßñù¾»;¼à¼Û~@F	¶|ÉË=Ð·‚×ª_9J°/Ü_»\Ø¾VõôEV.jU7¥”z“:«¨¹ÌŽ¥Wbä'«*¼áÐ5N™in†—v(=;Šã½€³fQ¹FË%Rd:!T^Kþ³‹6õ©#C©[b 
KñÈRO­ýš}Êò‹ŒÿmmY
¬¦Â²·^V«ƒ¿S$ bU³LìÈ%píûŽ‹3À}œá&ó#;|þaa–X~D<4‘
…µÝ¹i |ÖŠ:¥fIJ$7//^HäÓäÕ°Â~¤©S'L(´vˆ¯Øj4…¤/³JÅ­´iõ
ízí=Ñ
Úm ®X“
çív®$¡Ú±RÛ£à¨y¢o£d««-X|äMX±ÍÂvIFÍ§)Žf—h´ÇLí5÷/@òŠ){CñÚ¿…âû+¬¥Í‰tXó9üÍ#T8–9® ¦2ß®}f»?óãø?'ñEWCj¡vGž`ã#‹DOùQ K='{zJMâð9†4jìÍ``ÐbT—r0ô™²vP­ =™§Ÿ˜m¡ø%ˆ¯m6Ž'}•Leþu†N¬”÷*•ç J1æ;Kó“(=Ž+l'ïÉ»üì,É³ÄÇÛ7ª÷'i”}ÒY±7ó“4)'”/ðÞÐc¹ãä,¸E¬õ ¹ù¯e\¨*ö³x4Fý#„Q·iþýñyùÄ‰ƒÖudõþ&Ï3i\ÈÇJ~‚£ŸöÓ”:­¤´Aˆ4špÏë9YP;6ä;#ØÀ¿·q4ªúøùðª—§ù:ùÈSÙ0  (®>Å@z”Hì9$Õ‰¯„™è›D(>ºÄÏéÂ­Ó¨n`Ó+|*¨(NøÉÍvl¼ƒÙ÷lz¦)E•¼„D”"t½ÑŠàÍ®Ø„°§GAæ‚M`œrÖfE\zas@Ö¢úØe×z¶y³Æìá}s'Ñcô©ôx[ž©¡érÙz[ŠáØ{g‚iæ©–w5=×Ñ5kkóz&ócƒâºôhEà‰¢mD‚<£ÌËœÿ7„&nžH“¶5¢ÉIjzm3˜Ç²	.‹y¬Lú9Ícw^Ûç±˜BÎÜ(Õn¤úLÉ°*'ù¬dÔäˆšëk	†ÍŽ:õ5ì2JôTÍò½Œ§¹aÆÃwhïÑhçþÀ—[qêG-Jt.þ¸_å/ò‹¸8 §Ýá~#ÐÙxG”gíäÄRw°¡ð¾'s•ãQ`þøÃ"²Ãpv	&Ú?vú@[Ó¶c_ƒ ž Ôê‰êI¨)´±–I ­J¬w¬£ñÒ8‰Ìå÷Óøû¬ƒ×è2ã–C`cýíïzÆéf½+§=j)|øT¾£g§´à<Ã˜T:_ãJuÅô:í¬l
:™ß'å¯3ÝòH½×²VŒ5.‚‰³|ð°óüÝË4õ0§Píž2gåõÍ)ôã9VCküUO©­ó=»šóŽ^õ¡eŸj	†µ(_¨øZê6ƒA‚•¯ih xŠk-JS*°Ì3ØÃrOµ³À3¥ wRGÐoÌ48¹lÛT\ñØ%EXÍuÏL®G»~†–:ãË`˜i&Òâj‡É+{{mq;«£C<yØò!ŒÁ·(ä'þoF[-š8PÒmŠ•½T\í‡¿_k°GOß€XV™ÈÔëQ™ŒiÎ7(_3ê=
}½^3™\Ä„*ÈÝôëÀM€M$ N“‡k"%E×ÐÀäKà=;‹Nòÿq†ú£|º¦Ã9¾*«xê…Mãº÷’fú{„¹è!E ŸÊ 5P¯MmŠïÞµY#¿—Í&RÐ
^Ï¢Œöî]ksÓgæ~ÇJ…‹Ëjç¤vMÉï0¼23¤Êû¯« wduß¼|&€2ýìÖ·ù…Üuì,H©ÙžGE¡ýžWPu:MÊ$¢Ïü j,÷pAƒ²²ßË%UD„ÝkìÓè
ÕBwmì¥aZ9×¶7#u	ÒÉ¤Íúc Æ}Î£	{üÉ®øÛ¹ªZ_S¢gž"ÊvÙ$WA ‹eÇßi¨!è›‰V±º-û'¼)Ô–l]¶7ºzzF»ù*®KSâÐÇÒókÌÞó™ZóTrŸœõ~Xð!\®ò<®ålÐ¬ô¦â:Öâ¿($ŒûÎ<n¢‡HºzÖV„³ðø´ruòå}9ÑâãEï!™À?Ã¦¤®««Ølë*ÙñrŒüSoÃV?/Ê>½ÐãZ-dzFJ¼ZÄó,I”VøÆÌw\—&ö'§DpîñÓå9„';ÈCÅ¬{KW#¯¡áÞôÁê¹_h"Þ²Æitö2t­üVÜ2»Éhîõ -dùLO¼k-šñ@ž3T –³‰uB8×ðhAŽÿX ®Þû±#šGÖñˆíàÞ<ôž]Ò‘»¢'.sk‡mZ;üívnž.V ëÖ¡V¼+Ò~`eG¬v4ïŒÁàÖí&¼º	Çµzq”5ê„Ï7Uðñ¢ˆfÍÍCGtêDwšg¹3çîÕšX²™’Yx¢xãŠ4³vËä-|z¦pë(øXfioè?IÜòŒà§ž­u}ôÝònJÇLî$]%›–cŒõHºØ`Ñ(”¶Ã©·}ÖJeW@Êç4âòY2Ï2¼<ÆR=ß’ ‚h{,ßéÚ¢!mÖ|-Õ+ˆóežal%UÉJgÁ•<îÖ˜_àôq’T™]wÝ”Ëjô`H—¡ƒ–"7Z‘´ŠöEEL°Ôã=Ä‡±áñ)ùópr®ø•°ÕÐínR]id[+nxä@?ZÅTõâUó'£f›z!S'/ ñZ´2Ë®Äd§OC‹µWå’qÇ:¾~„ÈÆ7 (W»ÞÝ<¾6l¿ÍlÍë–o×IG½-ÐbýO„4–äOëFƒÛ=¹±Á:»›º”3´7Ý4¢6\	Â&D¶1ZA§ªñ˜Ã–,4×KÂàÛäjÚÛï’„]ŠMÈdÐ±¯ÿ¡	óo+Ì–“’*Ó{‡xX?bî¿ÿM»°®ýV˜†²Ëþ„þ4zR•hç¼‡ßÈÐ¼Úìòóo]rWëZ Ü%üª¤Jq8yVŠ?XÔ~[²aù,hîñè>¬Ø¼˜QÑÛ¹=BÆó‚^·¢êX2càN=X>=bzSÃÃÜÀ‰åhK¹}Ó\º…ÚvÎdÏEíº×&tjÓì”´¨eCÃ½‹*1ØK§OÊ½ÌpÚ%=…ö)èÁËï+‡ÿnd½æ¢¤uÑ›]ÒáÕï¹—)¾=æ"l;þu¼å0£~‚g1Nø§0‹ùwáO5^©£Y~O¼À½æ9¿3?c5ìŸ/ì™sBsv~d 5¶(ëE9?Ä6KBÏ–ñîNÌ ”²X#Ž:Á[oÀ1.zï7â40Yë%Þí3uÀ×`«–:UÞM`N7Å>7ïoxœnêþ®[¤÷q{ƒÅœ¶ÏB	@™äóÛ»P×`‹„÷–âÚ|×b¦Ü£g–WˆØa%Ø!jÐ£+Ú@©K¼îj±r/CM¸-¬Æ·(²Øí«,G³µ÷h¦Ö¼ù°øÕ¾éÂq8,çn–žÝ´0ôzBö°¿k7üÙw¶~©œÏˆ³Äz6ã¹÷ý“,7)‰/¤{Õ
la5¹ôËátQGgf²N¿wHÙ6òvG{¥±ÜÑ=÷‰½…ôv'fÒ¦«é÷¡Bh•5î!ß]Þ¡Üá‰LëCÊD>†û†ÜR[–ã_š¨Üú†~VÀ—„•]m½åþ©€ß3Ô· á-y™²µ\øÞ]ýñV·¡vLä»³d	ÿ¶SÉÖËiÓÈã(ÇéÚa
Ù(PçKÚÒRê¦ÊvóI$£6›ÓH…nÖ'’ªð:SÉêr`i¹šÎ"<j}™dPÏ&ÒNÝÉ+]æ”‰»w‘MÃF“°é¬Ò[Ñ.}y<Tn9ˆWgðÊ'©¼PëúB½o#°ðdPR"³­ÙfÂâ£-×{5#—v?#N¸ÏX>KÒø4£nÈýî^íjÂ¿zŒµ¦Üb Wb©wòu›vµé?Í/24?ý\C®®eü«G\µä¡ªÂp–,œ½>Ðœ%}•_ß‰ì-÷;ìÄ‹óŒýË¸,Ñeîos˜nM ±m0²ÍÆµÞÖ7ÆÎ»ãkGÄíÑµ]¼b'íóŽ±>¥mÇK+U»®]<ÃêÔEÛ¹”IÍH5»ÒÎ¿nf×™·ýbªÇÒY¸6¶³~%à¡Z<ÑUÖ9„¿£ ½†³äèiöp4>ˆŠÏ°0hÊÍ´‹vX-ÊvA“¨ÔnûU´æí¾~™OiL,ìzç'ŽO
å®ÂŽ¦Ee½5µåcèöuqW”ÂýìÑ˜Ð‚tùÎ½ôOw£¾¤ÏR<ö¨Õ{×ìŽñ×p‡Œ¿æ_üùo¦<þ‚Jj3ZÁY¸Ýd-xÐt-0f·È¸u£é²ê{&>ûñéÏ°&cˆùs‡t¶NÐ²MÃ¨W˜Cí6r·Rç?£hí±Ô©yë´¼^%oÛ¨äÖÚŸætÍÜø…Ó »Ë‘á%É¿ÕÈ.¶fB#õÏ²ø(ú»ÁEŠÌú/ÔÞ5?ëúÝ—H©úm¨¥ý¼CÈúÚpßQ9¹á(ÖªŽêÌ’´—Žò3,$†lœÆ¨à`×-ÑÍ>T¡|z0WÔ«‡{Ó¹-„÷?ˆ¼†ïxš¼ÁO“éº‹‰JÿKÓÍ+¦º(j_5|¸k51:Áäñã.`Êæ}ìØ[š®\ºã[?Ï¬ÞJ§%BºÎÃ/ñÂýÌ»ô¸2ö<¥.Á™O‡ŸŒ"xÑ Å/,Ú/g)ð²õÿ*ÿW¶ÎÎöS¬%å÷¥ñ'Ü„‹_å.8x˜že}<Ñ›TH&q:C‡pÑl†—ÌxôH(.(äéÑøRs¤N¿Ê›Êòó@ÿ<MÆ@Æ÷¡þúÃ&">oêŸÓB}¸g”C“dùiKÿt’ÕM«åçûúgØ™Ëôe|)?<Ô?(ùQ~ïÌ’T~|5šòHÿÂìâÄN¬ÌXÅƒÅkÅ*—\æt\}4P;JªÈhõÀD0LÐcé€MeÚòg‚MÌrßŸe<Â/U>û³xV1Ïî*ÃC;ÃS•—0§­âÃëû•ìŽ²Ó\å1°š£+ƒòx’Ó+•g(gf²îŠ!“È0½Œ3ÇŒ…òæA¼™N#l³1Df†i¾"ƒˆþÞ ‹ >ÕÌmä1øå/ïì2~'ù;ãðê;nmå›éB]]C…¯ÖèÍËù‹¬iV¶c‡Á	Š+Á›¨¨4wLV !:Ž¶¶Ö%IöŸó¼Rá?d&ˆ’e®ðgGk÷¬@’4ýŽRt#4‘õ}bX\!Gì4«E¯di|_lg¦3ž é´Fžæu*¬úx—?ÖCèÒ†‰¼64Ã,þÍŒ¯zæ`|Èpì©ËÓ·‘‘íŽûÔ¸Ze§â¬‘:ôÄyùú´ÝTÚÒöMîúé-J³Ùe=‹«·0Ëg—v—^oa,Yõ’42®]z§y§)Ô/‘eÓáêòƒH
#¿)VøëÁ,zWÞð–“Ùô²º0â-ôüºŒâÍôüÑÅ[ŒæK1ŸY›)×j¤™ôr«‘9òSJÔêþ½Â¼@Xž¿:³)É,ÌÉ¨9DÜ¤A)–çï£©ÝŽ‰¯Í!„øü$ª2cRƒ L‘ÐOÀ*Î¤:²¢·œÈe¶Û+FšO™O‡UùäÌ0’±‚-t­ ±ì:,¨ê‚ù
šÏ.ýtåÁ\³pD\?ËHK·V¿ø*Ït 	dÕaøÅc/–µdY[úJŸ½`’²R™“Ìáº¦€f»4Ÿ1­=Ò·&BF	ÐÙíÂS¼)tqù¥~?‘°¼\æ6¤
w[à+h>G®p÷~¹"÷•ön(üŒ†çAðî7j!Z	ƒy·%~.Æ²2¿/
ÆRÓš<‹0¨Ëè“Ð’ 5Ø '…°òDns<¥j”*XÌ•ûx¹:mËõD¬M½˜&E‰nùô2´]€ÐýºÌîÈN¼H‡f<³xµ:,òè¥•ÕÒóhyié.-Âœ
ê¢Ð]ja0O?Œ.(Ns1E)tš‹JÏÃÇÄ/;ˆÑ	©’î™PLÉ¶5L[f[nà¥\ÕÓ}»Å>©A6Ø¯™z‚¡d‚®¶z*ïgò5Š­G&$W^à <‚ÄpÃ-ûÔ¥+GˆZ´åÈ
bž¸j²¡SÒ•TiŸÍ¢7¯œÀ!Tl÷t	@¤$$C-òse½˜ÂÃðþmV÷¡E|þU\ž‰Zè®ábup÷¡Erî
.Vwiß´HÎ·~‹éî[Ú7þò¾ÕÛ‚ã]à7-‚ô®Ý‚“x×õMIŽ¨	Ÿ~t6½q6=ø,lzx6½yC6}ï3°é­[²éàRqm6mÏÙk°i{±hÊ¦í¥álzãÖlzpk6=ü<lzólúÞ­ØôÖg`Ó÷oÁ¦ÜœMÛËÃuÙ´½DÜšMoÜšMK‚”›+z$Cr·ñN`kæõÔjùi<Ö’7ÙÔ^@Ëç^“°³;þ”Ìø¶K&è»Mâož_ ý·IÿØ2sª´zVœ'áÙS“Üò ªQfy
Ö‘Ý$n?îf_æàJoçÊ£+-óªÃ+#ë¿ÇñÕÌ=AúÜGUÞ*LÍ²ˆØñ°ÿ6›ÉíD„ú]ò½©·ø€Ø2bjç¸FAKu,©T²¨­½–•ê
YÔR`Kb cÙÅbUnîÆZÔ¡ÔÁRo!KYšŒ`ÉèL•‘ÊŒ`î2¾¤fT²ˆTj°"èÀßSÛa–kÐ2î§L”Ð%ß`™‰YfR_ÆE¼)ì¾.Ô(øä`L•Ì6Yãfg°¬ó0‚c& ^A=[¿9|óŽ¼‰Ê’¿ï¿8&ûä?È¡žH#^”k8ëàÙìÌíT‘£ÜLÜî Ö¨·P¯A²¦kTÜ<P‹ÓïÛVEå™@eŸ?Ý©£Èh2ÈŠŽ¨®kdaÛžmN9ú&ˆŒ™]ìwDsÿã-bnr¶%º[ŸÅ1Î•]XìzVåB®[Þ~½@ÔÎF”¶÷:Áb¸­Ñ=µ‰YDnhDk‡*¤ö1ZA{sã-llaDaÏ¾†ÖZ%Z{#y·9AÎh»Þõ€Î¢«¸dÒà5Ê %l¨“bk…Œn½Ì•LÛ…—2FwŠûÛ;± »67\P¼ÍÉË³c Ø«Õ	Åòíòxl Z’Šo¾Ïlÿü,6F®ôiwATää¤%·ŠJŽ²vaA*wÊÚ»Ç`Y}£(K»»Ç•åõ¢ÇÝ=áûD	È³{”4°}û9Îâ¥/ê‹Š†YB÷—°‡Ãðõé•S!f¡ç¸ý1FRJÄ?jÇtè	¢K=?´:&·‘YÌd%ÒZÜ[È«Zê‡)·Ù\h©luÿy’µ[¤¥ÂCY´/»!ìÿÄH¿6ñ²:ädšt‰ðŒ
»Ø‡(/ª0$eü,Í£Š+FY¬‹.Ñ>L´Ö!ãFìm~2ç¿Æ 5ÑC6s¨y†áO.A€{I]dÆâNQ!ì¥åKïJùgòAv¥¸æü°èÓèÊå_’jÒ^;e¼“Qlõ,)ÒÀ'6Î/:‚­~fF'c¿å«óÌ|Ÿíðlhbl»N-^ZS£Fö‡Ì“HÇ){£möÇD²Sî‡ìÑ“'JØ¡TxÂË	ËÊV"<Ú½Õ·Õ¶ÇÎÏ(x›„ˆÚÊ>q³Oj²ã<²’Ô	ó¶k›ÇO›þi}ç<r+#&¹úÎ©%Dãc¸lì³¢ tÕ&>Ú½Î$¶%»°r-BQòºýÉO¼„CÅ‡r˜la'›k±3IäúêÌ’<ôE_CßôÕÎÎc,dæ¼ïøñ´ì†
’/µðYm„ÜÐp²„aÝim“±Ù$|¼o¤Ž&ŽUÞ	gú Í·.gé°ˆºêuÎ¹µÐŽ-Ù~ã
ÿì—èF§M¯áGý&Ú˜{\98þó»öàL	Óv.˜1í..ø­‚>“ó¥b‘øßáeÕ}ñöU÷[÷‰ä]ûgqùÏÏrŽv¹w‡îSêþEØªvŸkÑî¡µwý™nP»|ÛÙ=4¶‘ÚëÑX{á’ulGEiø<ØÆó$xR»¦îk}Ô=²&Þ5Óž+Ñ½ûÆœOÏÔz©fÌÏúùÙ7'ôIÀe@¡Ö‹Pw2À¡y
EÈA1ÿ½ûË<ÊºÝ_Šî`¸yoëþƒ‡6Ãî? µ?†L#Èó?bV®;Ülô6½Áäï¢dÐ}Ð=L |œdðu¸ÙÛ¸ßÛØêÞƒ[ÝN÷áVrt»o“ß£”`Nž‡7¥K¯r¨&KÒS	Ë{\õ	Od|†ö‚ÈN‘ã¢¥Š$Ri jã‘ì£1CDÌq”UyÉ
wîv=|pëÞæp°ñèawŠ©ý’f1‘2èmlö†ÝÁ ËZ†ÝÁ½‡]MËÔgÝì>ÜèCyÈ:„|ˆ_øý-.»ÿ9Ï3r€ÚNøûþyÜ'ÿyÐeÜ´û&9Ñ/^°Û²F·Gå9™öñ‡Ÿ¹ËÿÊ~XZÑ_†Ë¬¸ã$ÍO»ÒùÛïÐ]u™iïZ®Ã§ŸF\Û«ÝyuÚ{øÓšdÌòjæ'€6ÎGs¤šþ˜Rsj·¢–‘{^ òø×·/x>yÞÛØ*žAöÑOKîÉcYNŠø´ÕÅâá<‚ÛA¾çÖgqµ±)¯8ìCŸZ”ê*ûçI©Ôjk,Vgº²o'ùøªÍ0îèÁ$IÇx÷I5ÂkßBŠ6‹ñ4?bˆŠ">Ï?i¨½d¬Üp’ázûfŽÎ©—Ú«Þ™ôÊk·Ýö+xâ^ÿÆXLè¨‚{€ðÏ³ãåy¢!Wº·aØr~º"U>ƒäß{÷64‡´Í|ÚnÕE¯d@Ë'øŸé&Ãã,)=[íiÙñÓ¨\Xžt©Ã7©t`8´ãÛ4‰ÿ68^+.S'6(ßfù-nî‡rF¶úYßkýgîlÔÏµÃ‹QgØ¼ê]kïõéi2J"¯ãõÉÀJ™9mT^1òJ#€S¸Ó
›ì 
+<€â"=Ù]ðíÕ`jænˆpAÇŠ#´³>«!Ÿ?À´•sþSý¡>yö3Cª˜÷Å ¯q>DI¥åZ`l^\¨PjûGÚ¼«ì»©ÊÉ‹éîÿ7{øýÄÌ¯yvÇÊ†½¹iæ¼–Ai»^´¸°-zd‰Ðì·´[t€¢g*¼áûA˜eTw!G³"ò7 ‚?™ßMQ»óÝ‚%s•þïŒÖv-z¿–òsicà]‘œÅ†fÛPh€&ø¥¹Þ%Ó8ŸWAWZzüò>QüØ\+ÕoÙ% „Ö£ÆYµ¡ZÀ4G±þhì6ºyù·¢í ÕŠ'ì‘™'ÒG¬?Z_à¯3Ü³©Í‚¶ÓÌ2#ÂðaÄ(¶&0‹|ø|ý	õ­L˜ ­5g<¹1ï5 QŸ&Å4’j “ê8Ÿ`n©up,Xª=þXh¦æ«³m JÜÀ¶!¾\ýVsLBcŒí§)=á¶Q;"@S—=“T2˜ÓT¾!¶É†ÝÄˆ-~F¦)¾Lªz0ºð™\Æc¨:K%Õ÷ƒÁÆ‡ÕãLº"Ã;Qq]0ƒ˜=mÙØÕƒ³Här<¹Øµ„ ÞÌQ‡KÐáþ£­®Öÿ.ÿ‡|ò¢­Ü€–ó¾nu¶³,W¬çªZ (ß-ºìÑÍ†@ßaçõAˆðC©í€Ôæ6Ç`*HÊÑ}¸Âª³âvd¨"önéÞµ¶4·Y›(é¯"¯éIï¾èÇejÄ_ Xë{WBÛdxÇºç‹»éÝ·elùzX»	ÇÅ#Ôqö²<‹±÷Z{ŒÌm¶@Þ£4eAðï6Yû5ƒf$gÆù|¡ÓÖ•[+¶hÞŒÄ‰MzèÁÝ~“«|ë¸ˆ2$ˆ5:°Sr#®¶öjº)äE¡¶Þ–)T!É“—òØ‹ïŽj1ÇE¬ôŠ0õåe¤š$¥Xí(b§	à5;C“ ´íM£“8-ÇäæŒhFXö³,¯ÈIL€RaüúõÌVÏ:3ÏŠdLÿÃiVÂV‘ê	|4ÛÄ±^C~)~úfêJgÓ7¦‚˜”½k®GÙµ6“nä#7¨^3Çvÿ3Žg.nnçŽ°&·§«:ž¬&Y›VmaCTÎ†¶ÓWmžž¡”tQJ	xVõ®/ïJ¿‡|È}mn5Ú~nÌypRà!¶6¶«Vp¦FDÁù&`¤1iø¡¯+ÁÁÔPøÒu1®tN·¾ËržÁúCf+¥¬{—ìiÒ{ÿpë|òá¦2×õÄ*ÃêkäåáºjÍ±ºoñi¤‡ö-[^}ôõÑÃÕúèa°¹BZ¶Ó“×Lûý£¤@Ñ© pŒxC±µ÷6>Çè/¤˜ãÊy¼ÖÆŠßú0¤ •ÍLƒ )kâ  ÈD¯þ¿ÿë£Þ×°
è#6—D¤z„ œ†’Qž«Ð§eë|¥7Œ Ê<C¸Ý¤k¿U®5—úÕ˜R„üÀµŸ†Pí&ÖÙiXµzÓnÝoìY\D¾õùÈfÌ`v	‹u¿2Dç{ô#Uëõ®ÑçfÙ?³¼D^3ú¸ÕxÊCc±[;V¯>üÕyN¿ûm|ê{Ï¸¡lœ®#ÝQÜ@‚!uç¯¡3ÁÕ(ñïÌp 4Õ=1zH„Ø[wäë_3Ùîï=¿NÁÃ¨zy05ðs(º½ôÌžÕdèa/ýhÌCòSB­ŠˆÒZ“öþl–â)3œ¢³³Nk÷¶+Áƒ	ïÐ¡Ä.uËçaànq…²á$Íhôäœ²«CñÓ|4/­i»EÕ˜ŽQõTWlòp´¨¿‰Ô|lwq2O?YÖWˆ>ÿD™F½“ï.b>Óžø‹·M+5ï¼óúbo¼üUÍª°åÊb“fNÞÍOkª:èåÄ‹¹kL" žv@?Ô}=§!©€’¥ìJºT¶½(èáºgH'³"?Jåª—˜ÿ™!3553KF aÄé¸bÏyLâé¬¢„;Gzçe(´¾WÂ¸àØ•bùU/ Ž“ ÙUù´WŽ°‡'QÑ€XªÚŠØš¿àâÈ`tÕNaÕ³ëíØ0ž•øÑxèP<•¥q@t•z«R†µF†C—Sy
÷'QÙÆît(¬>S¬Ð”pa*ÑìÑx¼"¯W&º¬n¯fñ1´&à?¹Íô‡[t§Ç¥KVáá½gyÂ¶/´‘LüCˆgJ!}áˆ=ÄŒ¾å	¾VWš…>÷\ÕB™Û\…?_¡9¯<¸ÆœT‹½û#Ë_ÇfÉ‘Tn„i'œ¼Ú±ºâ5v»¹Q‡`œvWòÔZ²£o_1¼GYù§ø/É¸šì.èvšä9{Á£µÙßÔ<\«1‚Ph÷ÂÞâ¼4°qg×°qm³ùº·i
Q?Ô!tMß…<Ú ‡×ÌHrk8Z‹”E×Æ»o‚¯Æ[[n‰ÅôBE4[Õ¡ž¦y–×Éu	èZdºïUü Þ‡x·‚ú®Õ59ÒÍ7›?@JîŠ…ßƒÏƒkC/NÅÈCÁF=‡¬êN½C'âÈùð9½\Aï_µ>ôºò£Æü(¶!­ˆèäÒšõ‡nƒ-fIËb¾ÕXDòÓ XPŠä,Ézi|Z­bôG¯Y˜ø_’YÈq7Ø‘dÿûmQ¸ž•†??u|±Ôn±SFu²k³WÝ@µì“”}»µåålÈÜôz‡ÿ *b$+R0M)îÒÍùãSŒÂÎv$0ÿûäðÒq7òâí«RnlæÔ¼klàzpo§üŠšœK¨šÃÇä¯nkT½…Þ‡YM}NØ8)£“4ï†õtÌ¥¼UÜà³àqºj·A,–âªùýl¥hõJaÝ+uvç×/Ôk—U“ä³
Ö^~¿ÛÈÀí×@dy]%±®6Çø/º­fóýªâª!ÚyÃ¨¢š†Y÷«Õ€õD[Ñ±o \— ³xPÁy¿¢œ}‘óý‡U%B¬V«¦äoðŽ&¤EÝh2MAžÆ}È˜4{TzS;­ÓÚÛ¡ ŸùdÃP78¹¼µÝ„ªÃ¶œx?èo?¬0žÌq[ìËa%—i !]Ñ‚*IXe„”ßÃk›h%ìC¹÷û(`äqÝM;DdìUÜìpÀLº‘­ÇÎºu§$x9EªNtŠUoYÔ\«?ð×d·õ­š;kð\kàžë{.iù¤"¹]liÝmýŠ8å·7æâW÷â'ÜdøˆŸt™Q—I¹Ï¨Ë%]iÔeÊV ÍxmÌÝF8u¦þLh0'¡,a"SøÒç˜¬Ìa¹€ØfGƒÔÚµp<MˆŸ0å÷)ŽÆèôTD¯ç]ÙD9£¡ié_­]R½QÍj%Êþòü˜Ô‡¦G¡ö
µ«2éÎÆR¯ÌXÌ5ÚR˜ÞrÞjÿx.‹‚baÇ2fô¯¸aGãŠUP [eáXÅ4“eƒn«,ê¬"Q› ­mQ$N=£ÇPIÆ‰^Ú»-²®×îŽÒä•²"ò¬™þÕ´³´µ«9´sžÝh4YÊ«7z†ë#Ý”©lÊ:œ±Ãµ?è!vX\ëU#Al{(v»}püçNXãÄÎáý;ß">Ý]è—ýò+;¯Ç|-?œ¶(³j·E= ø³hãÉå’ ƒ’ÛÑ¾ýmS›÷Ûsï¹×zá&DÛ@¬ðøŒù¼GØêâÎsÝËÖ†—ñÌ[XP=¹7ä;O9.4j·µyj’ÏæŒ^‡3™	XÊømóýñyŒ‘é|Ž¯Jýñ4É:48“u¯d»cÑ„§ål>±Ï¾íPSIôhü¦ ¬ÓÛ ³Æ…úåÊxô”–ý«£²SõQèÃÕë£–ñÚ¼ZÙ™nºH¢b¼Š1St
äèiyR4ÙÍg ¸¦e^¡÷R¾]èv†È$™–Œ‚RSŽ¥LÂn6þÆM¿àø«$Rñps
¸‰Vkw¦ìy¤«1¢|ÍÙAOcx†OÔ×QÎÆÈþYÜï»fQ®£'ÁÑkèås]›é£ßš«;.]ré¿`¸îBó{³»_j`›*šxQ:–WPÅ;wÜâ±;vÎ›éá§1kèÑ<âmàá¡[*H*›;ê|éø®£ÿò+»Ú5”vœQ®uÎs³1V–ä·bç“Là¯bhÕ¥vG½Ê0q7ÎÐ9V{å,ÉZ{ãâ7EŽGY:pì»wXQG%î"‹ºz®nL·/z÷mSÖchÔh¢ŒNÊ<‹FK ÀzË¬	Cå¨W4Ád±­0ã÷o­˜t‡@ìñ£n'@	q±ÛâÔggç6Æ%Íø.¶¥è{%~Ã?ÏT–¼ÊŒØ5³,Ê^KþYJ]'‚úÝuW3´¾ç·ºF™,d¦Ï+Œ±Ä¬­5^®è&Êê<ƒY¯wŒÔ€ÞTyã”Ôo³/æ™T÷‰‹»ÀðÜÔ¹Í£òP§ì%Ä°d}ð4`¦9.(í)PÛ›rªøð¼R¿‰—ù7ãÙ,<"˜xìšš¨Qúaàº¶Aâ@øÚ‚Ë÷Ó¸¨Þ	Ì…4³ø¡»Ód•"oœo6OËØ»ídêÏÐË;náoLŸŠ'Y\@¤VbBX\[~üJ¸¾—ìS÷¸.ûÕ;þ“ªÀ&@nòŒ›¤*êvW?¥V¹ò$„¿Úqµ,h=; …y)Õ³$ÔÖÕž<r­C–WÈò‹x¬o"-â±æË2HGN3uôÖæcX\?¥qY/1ŠâG™úî!4æ¾-„ïxÒÝBHÜ®ã9¯Î¯ËxšPTy<x¸·DÞMÅˆv}ù'¼jq‚#ÙE´¥*©…@³	DùÐ@÷º¼â_“Ñ<OÕ¹‰½À¾aà¨›3@_UäÐ
•Ç«ðoÕ¤Òü{Ø:t£Å.„$H¾@R8X´ÕWx]:†íJA§_ô†•]‚ÎjËg&¾0W…ôää$Ï?aRTÏò$ê¨—}k´ìÍÕªkÀ¡õké™öº¸8ícDòDÅ£<À6Ð+xÚ²ôD–¤uS«ˆ7(7¨uf*—-ó" ºéèzÝ—ÞZ=^'}³Â»È˜Z)h Ÿ/?­½E)l·½“îÜ·äÎ=ÏòÖìÄ·	@Æ€qèûòÕúþZ¨†ðuòÏtS¹s=ÝåµCwuÖ0—ü™†3ôZþ6^9ŒK
·[;Ò3cS×pýhnìb1*ïÈ_ËbÅ¶æ]¥ÀÑ‘¬ÿ‰ày=yeqJþ´®>}¼›ix©¨ÛîQw!õlkÙ4å¯ïÂ74ÅuÛ8”õÈ‹;ôM×]j:é©O\}¥&¥6t'æ¿ò9ÙlÎæBW5ˆdz”4›Í±ƒl¯ÎD¡.•yÌŸ[,ŸmV3#ŠZ¤un¸%¢³%m	tŽ!H<0®ñœaõì  V°4 }ú|½)¾ûÛÆð$Z…Üúù±«Ç«Ý]Ö; z¨ÏÊ­ÞaN)€)+ÜžÅÉÔÜ×ç¦^Uy¬vxÉnðz%aZ«6q‡ží¥¸äßO†ïl{ëªó#ç6­ñÚ¼Ê‰=y½Þ_<ÓWNéøQb¢ÂKyh‚d¢ä¼æœÃÖí½éel–¯ÁZOêÀyåYžú}wý¤óhDFŒ»6–õm~¡KÃèÅvIÎ1–DVÁ²ÈñŽ§{‡Æ×«exÎÚwkp-fA4þ «1?¶ûâ«1­g<I\µÿ9ÎæßèrÌÉá¿Ñ‚ì3¤»å‚¬û¼þ‚Ì¢î}Õ%Y«òË-ÊbrÖ.ÊæÌºÅ¢, }‰EYŸ¿¾UY˜l~½U™Ö(Vew7]—å\¨Y—­ü[­Ì!Ÿcm>&e}ÑåÙx¹cuE÷/ìúÔù¬oÖM;CÝX¼‘^{g¯à¢¹_výV²iÔ
îã6Ïãtv#ãÄ§©knw™VÓWM‰³¨¤ŠÒdÔÚû™¹yÆð„{[l{‰aÙq×ê/Œ.ß/ùÞ®Ü{Ãk»Ìhz¶M}nµöä'òŽxLNâ¦!jô…»kî!/TÀ\æúÚ'"¬:¥
+*¯¡¤t-ÚæÊç¹GkéÑX~Žƒ0yò¥k0å÷À­ô—þqê+uýf£CvïQ—i"ç?è
zXnx¤µR’š9Îæ¯½ YÓ¶n5j¶qC.Ïbt]ý¬ñÊËjib‚í"oyƒj3oÒjß¸ˆFÑ8ž&#ž~…ÌµŠ§êõŽ­Ý:ˆK½ No rÍEÁ~¸$w:¯Ê¯kÝ×ú{ô”ß"b‘×Ü.—–É3íg3ƒoTÄê	!DW¥ž9–ÚèP-`Ä­“G]¤Á'®°]*¢7 ñ…êâ«Ãþã¥
ËðHšŒÚgcî»i}=öåjR°NQ<tÀ¾°|*Ì×µÎË%€…©ß´Uˆ·€a¡y¤¦ú8Mu´ÃÂdq£Üë5p=Ä‹`Ì`Lî°»ˆO‹èì—­gèc$/H2î’†ë,â¬KòÓS¨°ìbµ¯ÅsRâÉ"`<î*þi[£ŠÂóbI–Ûh4 	UÉ Bù}2¦áÇÔ.TørGÂ’EØU#lëaFŸÇ¸ÏàÐ–ì47ë!Z[Ûm˜Ôçê»¼Üï÷ñ‹¸)Š­Ð›C[hILÜ¿¤1Ý;äGZ[Ÿµ¼¯…œ¿2²_y³‹xèl<¸Ç#Ô©B«Thö¸¼øÐ =¾ÌQÝ3ÇHn8ƒäG—¸¨Å_en%4¶<Ðç.¿)„ñQ@âYë’ß@ò <lÁ T9ìÚöy\ù5´ù[Óæ»fçù%v+¢ïJvSbæç1wËšB¥' ïà^¨s</"VáF_… ûûa!ß–Ò"q(ŸÆ õ€ô%^Mw²Ê—ÕÀ¹¤ Xu×\ãî
ä&Ó’a¤kX7A˜¤®­˜ç.Û£ÄûûRã'½Ûº®³§¹ÊÇ¼µ#P"$¿ëÕ£³¤dÿÍ³ôÞHÿ[´b&re¹å|îÿûþïÿC`	ì15Žm¯õ`ŒÖÈšæ.A{‚m–cš+ÄŽ"g!ÒÁ@“žmòQÿ¶XÂZÎ€¶äë¼v>zéC‡1dN35ÎÓ‘"ïzK¼òè*)§2Ä¶éÞÀ)íJ2ù'A6¹8·ß–W’Ø'øƒc~
ô:Æl¦´ð˜22ZÜX:«ž/gÛÜ¿ÑyžP@\d€œ'P0Ž2ºœÂlã¢<]më½ìz»ÖU]é:Íí:æýþCWµ²«ZŸ(»«FñÌÍú:÷qM]Ÿ\ÀX4O+ÜÜÊ62ë¶„Y—rüA ŠæYz¥TpI5!³IŽNˆéýÜBK¸¹½—¾LÆlM<Vï ó2>®€\w hû5ííBqìâQùÙákð»ûÞÍáøÇŠ`••7Ót×wï–}ÖQ¬Øc:…FÞE—‰köÍ~Q×vŸŸáÿðr–0þLÖÉŸ£4cqêL
/©Ì+öípàŒ»íCÃ»cJãcJ´‚ £ R °Ê+_Û07P)ÒÕâlb&D¯†Z‹ÙzOÝ CövÉ`€ýÖÒv mˆþA[´Û¼¥¯ZÀ³Ì0]§§ÊÕ&gÔwÆq­mý2¶»	Ûpcø %ª|Ù6›»¨Öú3‹
˜JUÓ/giR!36bÌ—äÄïè®C×˜NK¿ßøÐA™jÞÒKÀœôç°ümòG2`cÏ\£±›#ÔÒÄS>ÑÝ÷/Ïeæ”Å
D6(a«CÚ‚gPó1¯™ê#kÌ ·þžê7‚ÕoÈêYQ½Ñmkþ"ˆÃúŽH<Lc”î¢â
9[ŽJÖ¤ÒÛ
ÕÚŸ¬&|4šðÃBóùÑCrW0âå[ô,“!«Ü%/£j\á²² VgO«Ó E–éX£H”Løn¹CI—‚BÝ2w8ÂžÆÀÚ`ý`žã!?™‚4¡¬f]a¨º0®ƒPS±}¡ð’¸ÄÌÜ zÍµB1— ¢c»lNó¡ßžB»0ÏUÙ=? °‹˜aÛÕÊ`-–È ¯›=¨á]q%Úmt”º2êbÿ©ËFXèàúGIŠ[?£¬»vý|!!ÏõG¢Gžô‡âÀô[†“ÀPe†ìÂ -¯ƒŒ’(¼¦'4 t°‘êâˆ¥Wøw~6/+|:ŽgUŒ«¾¼U9|Û ‘ü4Éç_¢l3ŸÅ'…x~‰7»(dØË¤,åªõá'«Y°Å‚•üPöù=È½¼;úø±ÝŽ`ähmøô Rß×ÙuÔÇ$Ê¬O@*û=ûI ;"•ÁF€“¾‚«[/Ä¿+D÷Ü1¾>…jhbJy¾Fü«‚µK‹j:N%ÄN&g°–©‚Øn™ÓôU¨ÏS™…ÕŒÝ×§®^ïÄRà/(ƒ ÏÔq§€hy:6­ò0…­‹LÅ6Ì¼†vÍ!
×À*Lé
 ·+ñBí£‘OqõWó©¿OWT|Äø'
þh|‰ËÂëWïžÿýèÕÓ£ƒÃã÷ãÈãÇdë§@Q:¥N(y{º
âx=x£Ó‡Ð¦~ñŽý´ÔW.g)`áŒ Ñ—wYPŽN­¬”n±ùaÊQ’’ èÁ'm”:]’T”ÅÒ0p¨­nßOrFÓ3Uåzw¾B·%*4)ÀKz”­Íe}ÛÔZÉ|$0W¡,>“ò»$îŸõiûÉæ€ÊÐZºÐÏÄlu~XÈV/	{Â[¢Ê@5\ˆ=¶œÎÅr&ˆ3åßø%å3ØŸŠÕ¢ÔO©JÐ·~Ê]/‰WŒÞMbôì ÅÄ›±]\Ãm^‚»µ$J×È?ÉÚ4®Šœ>¡›ë²¢¤N®øË6m%Æ4þ'ªä’‚>œåé˜>ä#ØäÓ§rŽA@Y‘«“˜å;‡ýut³Ÿ®ØßèÓ¼ˆXíy–&E>×öÚfãŒ®Ñ˜9O@¬8£Ê*ÖC+Ñè(N®íØS§€¯ÙåB/\þÍ Ïö‰{í÷ÂËÁæ°rdlKÊ4ÙêÝXjŠ(aØJA†,GÑŒá@|Ñá¦ÑU>¯ðìš‚}!_M¨§ÕÛAË{çqQ%#>Æ*]{EÅ}¥ùéTï¡·ä4Mfˆš7ÌM:mÎ33­–H“l”ÎÇñT<É/…›iMÊ?ŽCTqžT[:¾¤Y_å´.ZúÐH2ðÉ5X{˜‹€¨øô"?cPþ¢§˜ƒRNðÌƒ>0†ò<gCÁÖD<ê'ïñàø,ÎFW¯ò*fš C#Éè.e5-s™.Yž1Ï§qA¥pÜ¯LçÔ¯=¹Èñ4 Ã9§¯R0§	^‚Œ˜â«J¦ ã‚UÄ#4SˆaÎØõK!¼å:€m	LAJùÔ£1ù€Ä¢QõJèZ`Êé)F—ZþúWò×¿²ÿZ:æ+«Ð1W”Y©&8ÂŒ,=€ …ßh	F¹ŽÎ£Y7ŸÇcDÇòÕÃ‚öÚ-®‰B]ã(™E©ÙúQÒ±|½;c@Ž“³,‚áˆ5H2­8®q'¥ìHï0@×€Ðƒ3GªÈÓRÕ=¡Ù^€84 õ>Wï~t¼gó“4	ÙèÍ$2ƒ¥xhú?Q«DÍ’ôáx>¢ôçÊpÃ¼ IÈ*ÑÞçM4Æ{ÒÓ ˆ$ïr1¼çé Œõqò»Þ‘ä…±ùÐ…±Ÿr™f²#fŒÄÖø”-@Z–³'´Ž–Éh M?âå<¸œŸTI•ÆÏ€2¬~ØŸ¼ý¹ßßr"Ñ½ç3D#Ýì˜<˜bH4£†y¿Ç\nÉèêª2y:2É/ä<|n$Õ.lÚ _T&U$¿ÓéCC–tK€¨=`¼=Œn\æ¤&S£Ôó;ÐŒ¶ÊÂžEÓ$eÉ3ùê¥Ìµ#gh’ò)=´K¤|õ÷DYeˆu‡i_k§ò‡F’ç-,ÅxGˆÐ‹K¥H¿Ë½½öBéõßbŸ)ž°s€
fò³"šM®ˆ8×QÍÁËÖ}½Òü‚Ù}w€=ZcS‡1Ž«(IKÈS3- "òfEÅœXúÖD¸D$¸óâ•zÛYa£Ñ1È ÔÅ¸6*ôÇOùÚ¤7´ðsêž[•fïþâÃ‡Nñ't—ü6'óRÑS HÇ“ˆËÖoä«%ÆUj™ 7‹Êu&Ãýû`Ž_jrÌ)/ ’()‘{ÆgPh¼M³gÊ!`CrF/…y4B×tZR‚b•ªJÒŽ˜™Z‰§…Ð¾ÃÓSô
nŸýÝçÔ)·˜þJ%dpÃ,‹Àu‘‡P ]­øÖ­Ÿ§qâ]J©)ô.ñ…ÁaZÂÛ8_ŽÆ¶¯™…+6iÞòm|Šz,ôkA´Ç']Òâõ¨#¬Ôoù·y\\µUù.¹˜€,Ûn‰êQq±»‹¶E<ÚŒl—agÑ¬rÁ>Ò1¨OÊGeû7-?ð#ÑAÐQ9Åç5l û4VmÇ£šç#Ì$ú#@º©³$Zµ›—ëáUWxy~¼¢¤}ìC5”7qìA“«æ”@x›u<µõ§Q²cÈ­²Ý±Ušf"vGMÍž{Å„o~ëã*òú”ÑvÇüƒÙìniù”äß1%ÿ@¦• ¤¬ßñÈÿuÙuÈáJ’±p¯l‚8àrÍ.ñ–2µì(€}éKÕUÇP]ù2ÔA±7ôAš¹t|ºpáëTÄ5Dêã9W‚ª«]S2u,%“?S,¥Xê˜Š%o–@–^Çƒ
KË,Ú ®ê	WÂ3„
ÖUaèv:Žn'”±¢©Ãé¸:œ`Ö:Ô5&G‡ÊXQí9:æžÃ›¥®¿ÆF¡ãî‚Yk€6ápÁÌ5p•ë¡&%Ñú
¬Ë¤Ù\öÕ[d%d]ÄÁ×óÔ_Y•…C•Ð¾u`õÝœ°¾·óªnnõ<àÍ_¨`]ÖNÐS‡µ/]5éÞÐ_î=ÙWaÞØ,v¼[Èº+QO5A¼Ó¯Þ"Í k!½EVCVª¿ x•%\xuEB;¬Fdl€%®<#Šg\]…T-jPeZ83‡ûÿ  ÿÿì½]sÉ–ö~ENïÜAãºÑŸ@CK‚äd’ƒ%83÷š1±,tºKìîê­j ±x[éÁvè:¤mHZÅ;Ù/V8BŽµì'í?Ù? ý	>çdfUfVf} ~ÌEÝÝ!º*++óäÉ“çûä,ƒ¡/t/†Ñ°¨£âOgw…Eá˜ÿRñô„6Ñ=-ÑÀõb‘Ÿ‚£ ¦^>³öÿár:„ÍÅ¥]êÔêšÂñÿ4{.Z¡ž #Æÿ¬KxXÆI9Àªp)ä,<Ìâ[¯½¥_ïÁcvBLþ2d1z»I˜¥Â¿ªLàSQ
è1ÎÐä³Œä€V2ƒ‹À!ò” l,T¨»AÒílÏ|ª!ÑíçØ4˜K™ôäo |f/óeÕ£-3*ôò1î¥¾iýûk·:=ué³äøPÌü`æýÌ‡6Ø Õÿi5·|HdÄdF)ŒöL¨©ó1šø&·ÒÙt³Q?f›LÆÖÃiô²sùUº;ªª•V«Tª¦RÒ^’H/4 )¨R±{W×í$N"êMcýwM¼Ék,]'”&ª„r[ñbPµ†G@ö‘4ö+Ot¼òÀ0˜ë
)Åê¬<PŒ-jGº$£VKl×@Kµ©¢!7ï
Õ·y[Si›¹–Z¹«ÙE”û†½CybZ18pÓ„ñÝèù7ýZow²·ÓkæYbNÍv&¤™'©é3û)Ó2™iQ03yî¦'mÚFÕòí2Å# iQ€'’%.©e´À‰˜*«
¸ù')£ÀÉÈéÏHéJïnh”Cá+Ä9§kr\ãéÊY~òÆ<Ns(\|‘ÒÄŒ"yjäë+‘Ëª3àQºsé&`²jÜÁŠ·°Ú”<ò±C\XEo™XYÂÉ¨kã,O1cÁÄ‹¹Óf)§D, 8µTj¶Æ=ŸxœâF&ÝŠ\˜ÝÌR™pya½IUù—…ï6›MÜÚS³¾kø 9—@á•9°'ÁÛYÍ¶Â:?ÚÉ¿"ÖHù`ö)Ò!Àè¤Oë°ßü0'ÃªÉ¸îRF}Ñ
Âüj_^š€»ªÁ·ü˜'ÎG¤&W`xYxŒ9á‰çá¬…vÔŠ¢ARÌÈÇ±¦Ì¬?óÞÂpÑR\»ÐµŒ^É¯>÷æÀv	¶<f0Ò|SÎ­:ZRØ[€ñÚ’Íþ;ù€À‡tyÀÖØ×ðtu[bþ~ô¢>0¿9Á	`ô,ró0-QmŸRLJ§šF÷p?4Š[H¤~O)	C¦äçþ,Ìj3~lIH„üMkl¶ùRs>Ïüh†%Í^F7Z|¦€Od¯¿,µåq=‰â­ëIvúZÍlFMR¡P†ófGúsj§)P1«¼#Ê¦¥:ÅÑ©ñ«×Z´C6oê†:	¬m­óPTkk
	ÒÜE)SHèŠDNtÝã®öî2Õ¯¯¬ÐSâ€õ§püŽdl Þ£So*^ã{}<žú©×ÿ-€x”4ÛcuÜsÄºÎÑp/øM%0Aƒ„@	dº;¢¤Oø@ÌT?©ð~Jú¯÷LP²Y¨hñp:U¶Z]ÏÑ¡÷aÄ,1ÈŽþrÌÞ×ûŠ52: ùøÈ¿æôÔ®„Ã	#¯V¶ðÆHFqM1õ„ðM„×1ž°2¡Àžkûi>´?ósÞÞ°EO¹ãÃ¯¸ò@¼û-ºÂ"a-ù;á“)xJiý’’fÀP'ÁB}Ãl§ÙÃH¨W~c[ÄYÛd%îfGgkÝ‹ç’Ï±6:ñ0¨6·É,T›¸ Á`ÈšÖã­‹Æø€ÁYŠ¿0.½h´Ðøy(§Ë!vrB¬Ý,€NzÑ…X+N/ù8Ö¶Œ3¥2%×*}õýE©Äì5jUi>îI¤ð«<‰ôÕ‚IˆU¹þ$$þ¸§¡"å‰¨/çO¥vëAž%ª`íY#Ô¥…@´UÖoâýømª‘bÁ2Z&'ÿƒ!?hUò|>2¿†×AÂ#.CCv5á6u¢­gDa(‚4ó@s2ÊúxMáþ«ð‡8UÜVèPåî/c$H¼ÌÆ,Ž†{—É‡®€W_îÕjz>Æ×[­_ÿÌ&âß²Ž5h‚y:?IÀÃi0¼Ø«ÍÃ†¼edTT¥ìä/5ÛŠƒ0œ'²úTUòXær/~7fˆ!Âó½Z‹µX§ÿWIg:ÅÍýòNá[˜Žˆß§a”7O3KåhŽè„T†{—í+6Ú«=owX§=6h´[?ö§A£Û°î»ía‹m±k·è?ïkfñK·RÛç­0i÷£O›ûÌ²á9Ì·Òàÿ7‚ZWx˜µWs6í6[;l«ÙÙzÖé°fg{Úè³^s°ÍÚÍö žÏ a{»¹¶ð^·Ùé?ƒç½fæÊ_Újî´íf«;Õ L¡^ÊN8uXw²åõXá—Ûðoï]»çuY—n´ ÓºßeæœÛ#vÙHûl5Œ>ÛúœlWÄVF'!)ÒÙ|Â€]ñ®Õt˜Þ«Œ…BNÖ#Oóð?®Ä†#.
ãX€uBr3U$LÎ)Þz^Š°¯=Lb%ÍOOçC‘qèQÊ¿$¿WFVôP!¿ðƒ>Ä,U=ç.”X£¿t·àH	4 ˜¤:Çªµ…µFÓwwí_¡1Ø?ÖK ´2¶þÛ<¯žÞ‰ãKysI?…Ü2úØµ÷á†G[­×°öšŽ<TV/wñDÈX¥•³OÀ½(¹Ýg–Íºk–Ù¤âžž4å²`sþ Á‘fÀV“CRBoWbÇ÷X;5(¡â	%_ëñååM±Íco?1@º}®Þ¤<ŒL_¨	»ÙrÁMh¯ÂÅ.¦(ÐíjW‹ó7–ÆÂ%jŸ$`êmðdLÜKÚp^úk5{ëëØ]Êo¥ƒW÷.uª2›„°`:Z•È¤mÒ$¥{—‚æÈ‡)mÄd¿Ï€,!µûÈ;š†Köí)4çUHJ²gRõ÷fŸƒ7ÊÀŸÓ3 Ù“FG¯L¢—dù?“beÀhb=Y†‰Ê›•2yßè¶l5s«8œÑØ'Z•YÁ£­W6É”•R˜~ñ7%³J9póÚÙGœ}ÚƒžÈœ³ùÚ-u×è<>0åp&½m´2Ó°UœåPí¨å/fKÊd*ÞINðN0_UÞ^S÷MK¦
=Ãó\ÙFÒMÛ€…=:›5òD¥¡²TëJŒŠ±î—oD{ É†™¨èr©ØçÍÅDÎEÖ´ªFÒWYšRº*Éa9ØÍÊ bÅ¯aˆW€–qùû«§ž¯›£M²Å¯¥j»ßµôWŒ%É$ýW eæä×
Whé¹•·:w0® ãNyP´Á×FS &¡É`M$4´Ì‡hôä%“¨P•uãƒ¶@´*$+ÂQƒ¢Q ,ã°œšÖ÷œàð¿1û€ ´5½ªÑ"s6È:SÄïëFr#c?1œž{‹T˜ûKzHDÉÏ˜,„ÎK	úÒõ]<%QF´S×ErL@¿“ê(ÛZe¸5u¼áŒçKÉòW¶ú-K;îƒ…]«¥{-½í„H} I•¢¤ŒŸöÎ×Þu×l‰B(¬—Þ—L¨f¿Ã,ékÒíöÚýþùÍ„X,ô¶ûý­5ÕÒ®‹Ð"ÁSÀŠº%i½#yÃ
7¾²áv«„Ón±ú•Ìi3}4;% -Ûvú`ÝÚêùÝc¬[½íA;ÖI­
Ð~ »L-~ÂZ´+jQÑ9ÔÉ·µ¡ì â Z4íTÁéÞ°=Ú±áôö°ëù£8ËädÀ,+ð)õø
AL­ÊXVtÊƒ®h£V4ÑÒYjX	ƒv·»m«ßnzƒ¸R¢·
@ÅÒfu¹÷Á|˜!‰Y@S?% <÷OáðŸ" P¦O&D™~á²ëÂÝî´ŠñšV¢Ô-º,ÐoàÇ9Ð§ìzUÀ%0ÊäÇX=ÿyácu0*GAp¿Û…K‘Ô‡+±éG6{9Ç$3=&å¨a/º7Ç’ýö°½Ó¶â¾wÜmåá>OiXüÃoŽ;Ø}zÔkõ…ÖCžš•£6¢ÿ\°SImäXaNæÆÈÅ÷ð&=Ûi¹u¼5êå@\¤Ž¬ òç1’Í¾èâa‚òâw1àEÃr O¿’ü¤•6”2 šVZ‚^¿íµº–%8ÙÙî¶·òRJÙYa8=µ"½äµz&Ûh’ÏUñÌLBúÍÁØÎ‚2l»½aîÞØÿÙ8ÉnoÔÝÉãÚeÕ
KÃ)·º7ô¯½œªÉª¹ŽûémÂ&i›·+’²®›}m(eLÑ²éÚ£ííVÞ¶ÀœµUâ·$‡špÇû[•äSÞQéZ ØDÂÿ.C}D·0¼»µãµm>8ä·"p0/PYlƒ3=HÈý*äí©U96‡švó->ªŒ ¸eÏåá}ì·ý‘Ô÷¶;Çy8­$]® sÉq,`—Ï*¡¸|©šËÖyjÙ&á0å2<¦ë¹‹ÐÙÂÿÙ×.þ/g´\×E^îU¥Þvt2Ú¶Jü™9?µ/·,¼-n‰-÷º$5ðøÓ1.ŠhÚ®"ô¶ýöqÏvÔ:‰}ê[!á¤ÙÜ3õ˜u=93fBžz§‹	ÆÞb¹ŸL$µÌÅUÃß$ïDýÊL7èÌ*åqò"œwõ/ciùì–ô¢ÖÉÁàÛz4>öê~Cþÿ——êkWë¬°	´9¦õ//ÍA^­¿a»ìóá†mð\‡¾€ø5Bã×k²‘(ð+y•B(àX.I2`z@˜EÖÚ…‡ž;dÌ“Ã5e5¹k‹ðíDòmIŠåa~Ã§˜õ<qiÁ;ø%·Ë(ˆ ¦gús¦11F£öM¶™¨ZzB5ÄW)‘HL±5µ›m¯É‚FºrŸîâ[G¿£:[À½u¶l¯'é¦ßNôìá¯š	©ùëè</^V\wãŒ‡{l¸³Ç¥}×•/¾±ÛY=vz¦ÇåÝÐÉe¶ÈÝ<¶ú–Û@’u$·OËéHn‹â5[]ÄmcÉúƒ;Æâò·EsþŽžÞEè’?"÷¢Û}¸EDŽØÉ‰“6õTì³àØï™*zJÍgÃÑ"5Èi®gTcèO§5^íý¯—ð%/û®›ß3V{½¬ŒJîzÒå¡{>%Ê~‚ª®I0‚IJùT:
¥GäÓÝ¾¤ÇÑ›«ÔAÍ"Ýl6å™sue˜myFÌR÷äÊmÜ úŸm'|¾³ïË¡.Bî=$\úæ¬aÍåØ_R‘^áŠA‡ÇZê{!so’§ÞBçN¼ÅOÞ]W¾
~$oHŸ›'är#‹oPX5¬JïÉJÅ-ÓÌÍq¨”‡^†'íºÞú4½
ì!ñ[”ºÐœ™d#á¨yèÍ}/¬¹BQ­Ýì‹¦£§Œš¼ÚàÑ‰ªß‰üš”d<£L—<'¤l³~‰ÇþòÌ4_4z†Ïœ¹r|èTNáÊŽÿœçózê¡#lŸÁ¨ø0¹™sÌ!	iàGâUFxÛ(áõ%'l«¦¬R~ßÈ˜½*°\3gó3#Oêë™)Þ`)`¾ó–Àfùc4ŒŠîä+Éérƒb5jr¿ÈAÅG“¯¾ðo¿aÑGXV»æô,Ô<
%B_i>„¼l¹N2z÷A†æÙ–=C Uã¿®Mä÷;-ÕO­#fçï«©¤¥Ij6Á¯ïò’ÚíV¿fsUKSÎdÜÔ”¼3üÙ±’l&m¡¦ ¾lY°l’ðCÜs©°½Wº»"­ê„ÿ“x ¾C–­|Œ½æm¬þm&£-·´bÙqY¸u–w¯Np¡ßÚ´J-¡\ï´”²E9ì2ÁT¤Ât3•¤Ù×¬ÖëÕÜ‹ÿ&‰A¦Û^ÃÁ¼ÞÙnÃøC- &7%÷án]ÃÅoÍ66j(‰åV«:F”YÿÂ½©i2l{i@RKAõF£Ùu€¿Ë[îBÀe° äeqcXŒŠ<O]å5¾j·ÜÄC¥šÃ‰=\Ö[\ nÔ²ü•{y³mïï3×–—Ö òŽC8­·Á×­f»ãÏ~æk…zQrlöÙâ¼ÑÁ.È¯XóJVOå`ŽzXå=53‹[	Xý²K 9$&ûƒ3¹fÐk¶û6'ÅuIØ/SUÆÕ½M„›	á¬+ …a 	üA¡³€ÙGj–C"ÃcÄNÍó3˜7&×½Þâüç[áîMzÌR69'hkÔ=POUÂèf¶€óp­]ÓÙÖdyµ\É.oSÓ¿4“´Í±µ“:;ÓÍI¯ô§Y†±ƒ˜H‰¦@~¨ñx¸öŽ•{z]]™AuñÐ~&vŠ† åÅ•(¨”â~àN?°Jý@™˜'šjqOUF=%>ÒšD´Ù[Uè“m6yáO‰cu6p9ËF H`]FR§"(±É‡^1–áÁc†Xú!´1ýmŒz:ÍÂ‘Šçý‘+f¾\Z°?{	¨9âµ\_ò£‰“Ìîå£’¿$öQƒm6,c(žCÆîÝŽzÆ(ùb9zlH° ¶=‰L0n˜„CÚý³—ñwÞôÔßS™f!÷;W@NßùÓ½ÚóŠâé•¹Ð6JGÑJÖ^'ýŒýz Ü¯*¦B©ŸÂrƒÐPªÝ×ì+ö˜r…¢­Ä¾uHÇˆ2ÒšsÔ´Ð€Q@#…!Š`Žå¸ÔÓ<“ÐxpÂÂW)MŒ.Ìfþ(€qM/šÙsalZJ\Jêÿ0aÅŠ+	OÉìÂêeÛ¾´7ž/óínˆÜû	»·$5Y°tÇ¥*ZFJ˜Ä ;ôàÛxô„}ÿ”=yþäå·O^ìÿÎŽ‹6Ll·ÏªX	  ÜK‡’&„V¤¼4L¡6yÊ†C%ö
LÚ¡V2„JcóâbÚ†ª[w“«wo0øv+/éSÜ€.T£ƒîâ‚S‚®TÌhŒž¦~1&¡&öåÊX‘KÍ¹ÔîN+àè†8‡Z$q˜píh rNç…€”`ánÉlbspèØSÞþJç wÄ>{Ýîþé3tcS¹.WöNòš”%«œZb«.1Y'ŽÔçBauÜCUqpkÈ6^7º#ü³Žµ|j8tm~n‹Í¬à:&S¿û¡fÓ÷Ù5ª†¤3È:9'2 —‚,P. ×&ÈêLK“ªm“Î:Õ÷:e±Dê™1Ýª®K?~ô@Eò÷OÎ`V{ÈëK@•€VKÒŒBÁH@®ÙO`§x æŸåöCªmÁÝÌžÓb0k÷	@ì‡ù2˜î’<•	aTO\æÐÒ†l9ù©™7¶7œÞu©kÝ:V’õ–‘S?îÖžâ.çÉ¶dötrø=	üè¦ëXaå¤Xï@úBæ"‹ô®%“;àà1,K¦˜Áõñ“Ã'aB;­NÍPÙÙ÷OŸì<|Æîï?9:Ê…~Ñ‚(ZhKH™®¾ðj.©ãIWÐD)d²ëª™77ÙcáíÍ~ô£e +cM0Q*‡šÙª
5Ïw¢;©‚–¿mjè’Jè¤Ï¬&=b7ÏÛšŒüðxÚ;,H
?ëËpÁ&ÞôdÝXàìN{ÝéÑ14i¼î:t YGlÎ9Ñõ‰ñÞéÎ?uÝ9úÖUÚõg‰R9ÝüV'ó)¡Mæ¢ý­zè=
G²dUÌ?•ª??ŠÃÞuµ¿Tê\^D¢~…‹0Â=êM±¼~ŠÊ˜Ì¨4
?dO“–ÑîÜñnÕïÎÓî<íVãgwçBwçBwçBwçB÷Ëp¡Ÿ¿s¢»s¢3ñãÄë.+v¡3¤ñ§HR;ùp$>=^N‘†Oq	y›|1|R…ê|w’$ÒG’:ø=ž)Å~D-[IKéæ¶ytÚÁbURP	SGqÌÕR\MÑ`O§£Í—d3±ö õ_ÿ•ë’€Þu~kúi«€ÏÞ©6>7ÕÆ[àÊÝ…' (¥ñénf$/y¥@:þó³PÒ¸ªŸrº°BÀ;Õ‰UvïÎ“ïõäëî<ù’!Ýyò}†ž|]ôäkê~|†EùÎ©ïÎ©¯Ð©ïÎ•ïÎ•ïÎ•ÏzªÝ¹òÝ¹ò}DW¾;/¾ë,áŸýÜ[y®uÊ½FÑ!­›îOißM`NýèW2—ÿÍ[í±º¿|ðÍ§@‰I·§¤~D%QÂo¯®¦$zïDvÇøUH}6§þ|¼œPB½VNô?ZÖk/B\hŽxDóÓÅ4ÌqdÌ¼H*(H¦ŠxåVX¿&;ä’C¦Ä“ïAK ¦ÖíÉ9IÝì™üÒOð%t'!›ýZ³–ÔÙåR–šo¸‰WÁÌ‡Öuµ€ƒÑÎA
oÒp$®6XGä8Us©rëÃ·Q	*‡ÞØ¿ƒ¶mú‡lá]àWž`ÞÎQ8<E.¯‰Ô‘3|.FõT5&Z7`ðžšëò‹¤› 8¶ËrÀ¢pŠlbExÉ…¿,3V¡vüîÕóg0Úä“MÒÿáÝoô™}ÑôÍ¯î}ñøûýW¿;|Â&ËÙôþ¯îÉ€BáN¾G%ëîÓ`a@)î9fö¥I”òëÝÛä=aŸ3é14”fïÕN—'àmî÷–M€¯v¹\Ä»››HFãæ8Ç°ü‹ sLÎ6‡qÜyÀc÷ÈÈ³{gáŸ«ôMþþN·o€ùf§ÕúJ´ü'þòQìoüõsŸÒW¶E3!®íÅgÞÞ)w/¦>œðþ’õ½x‹%qàÉ‡£yÆ¸a`8ÀÚ} ±ÔTy‹“FÙsežcX‰K‘I9¡®p²ø¨¨VO“º:ÖïÀóÇ¼ÉX·ßÂ”ËÃãQßok¹›ñêñ§;=¯{<È<íó§[½íÞà8ót‹?ÕÎÌ§Û­¾Z$M{ªžÔJè_©ÿâu â2pø£“¥œhªÎoƒ?9iŸôOvä¦™yÑ8˜ï²–¼!ªí*w”¸y4a¦­I ûQp¢ÒbúÏŸè›þ,òðÌOÆ”|%¯tçaûò2Œ094çAye Ï ,|*ÚÙÙžÍ(‘r§Ý‚¿®ÌÉ`Ç…Öo2`Øe¤¡M„ç®¬EË
¬œ&ktá?”yºµAÿk¶×7 Enoáó^öyÚ'qM‘pÃio)³D—aÞ+ž&MŽ¦I¾Ò¼'J‘(<×_3!½ãØW#î.£»_3tèôæKÙ3Þn _· v0æt6‡)DþÂ÷–õ¢÷`¬]8`ûÝæÎ`6[·| aî9IÞe‚´Å[ ì:³ƒ®,Ï²PžîìS;ˆ,ü'|É4È€3‰_ÈÂ”¸âìHe2’Jì]Æ¡êž‘€ž¥ÄœA¿¹em€èUØ‹²Ór)ˆêþôTØèXäÊoÃ†‰){‰ ·Î¶ÉÎé5ûÖ.¥õk—	ó—¥§Ýã†™lK<îÇÀ—¼Ákì2ï]hÝåZ¥ÖþÄycül‹âçH›²gþñÛ`)Q'ÜðF¸×váŒÄ\Ù–a–nëÞi¼ÍÇÛíí~³ówCÎ÷”íànõIí‡»Mp³Md?»ÔÑ–Üšr–œòQÖÕ…‚°Î&
º:¿¤ ««Í2u3$mp½Õôm§zÒ°§Ò†:¹¨‘¸IXzx&g`§ö'(^Ù>&e	jI„Ú¸Qaµåü’‚P®6wõ¡*áËMDròirí\§`æ;©»Óe•…n–GEÌƒ7Æóés‡ò"†nÒÛed^É6CoÉF,Ü%mÞ£U‚»OZÎgé­	RâÇ&C„Ã²°®ufãëƒøÝ8Yô“`Šê¥Ô­Ž"™mSà}À+%ãü _ÿSrëáï¥:U!SE4Q¥SÛÓTUcy,FÍyØÐÇ£l46Ëw9Õ>LUÇâø`Á\Š ¡aÎäëRúgUèëæ^1	¸?E†ZSL1{ºÒç*;¿B¥J ‰^ôQ3”3”ß(Ã¸Î¨FkRõ¤c34­›³,J
½'WvÞÛäZø{¸ÁHúE£!lièe…Ó˜=âj4¨AbôÜ«iãHöHâ”ÔáåK½8ol¡CPÏpƒ‰g»ô7z*ÃßšM~›fQôcíIïÐÚh‚áÛrhç‘!ÂÚ©4klÅ^º‰]T›Ö…H‚±Î¥ôYšŽ•é(6Õ{HËÏgÓyÌõõ»››gggÍ³n3ŒÆ›V«µ	-jò ÃYc«†dŠ>.s¿ÆÐBó(<ß«µ`vzðèP…oý½Úð4ŠÈë	°G3åÞ[x}CÍèž(¾W£áÖÔÛÿió>íå½Z§ÆF{µç]Ø“öàù6k÷'íYÁ¯Yc›õ&íŽ×e]T«Õmt$¿ðó»-å'ë¾KŸÂ¿ï5g’{‹—_i7iK@q«÷Œ¹É7¡vÿè"†•eŠýˆÌŽÂF€ãm¥ÿ…Ö½pdQìh£O½Z]Ž5n¯B·|¤v3DŽéE³ÙdõÃpqºˆ™?Gyd´®¸”(Wþ¬Ž¯©Ã…˜ÇylCìÏšG²)Ñ_†òÐ5OqÈä¶9ñ‘ÿF<n˜Â+@¿î!&aX‚2±5ÐpÇÍ«£¸‰”}¨y
	Õ=àÞñér	Ô:ùR8Na_ïÕ„z8c¿¾®„‰ÏjãnWÉ­mI€R¨ð
U2]˜ éš z¨Ž(Å›Ö\Fï¤`zÄ³ Ž“™òÉËžú¡Í=Bû_Ì~üBlÑÅÐÊDˆ…ùòR1Î^é=«FAÉpNVà=vr:'b}Ý´ö‡sïn!œ%Ô†L_oÒb·É»'áð46_Sò»Û`ô-Hû-xSz&à›}á• Ê½¦Ö=X:ß€í›¼kê A·Ï¡X—ÆëŒƒJ…ñ¡½„ƒj•°ãÐ»ZV§{³_hÂ%²\€…1d&•qÒø1‘‰C{ÜNûçÁÒõªêþ ¯¾Œ¤y^ÔýŸ‹ýÆðDvp`©‡úæv+IÓÞ“i3[Ò¯Ô-APÎ¤è#Tg?¢OBƒ}'ª¾Íá`ò°†ïˆýp°!yµŽqðÎŸ^ U¼IêŒÅÍ¶läÍÇ>lÑxzqä/¤WÂæÏÿ}—½IöçŸrÖˆJÞ®•öøþty,N Òà†}âÑ×;,½é½ÕÚÀ÷Z[ô_|¯wä›Gèsüõ·†G¼Õ¿³¶ÚæïýiÖ±@>öÞùÞR{¬ù¬­“ú¾5])Ý•²¾Î6ì7¥Z!™/ÕpQªìœRí&½rÍúšCƒf§æ?
ì½ dåÑñ"¡õ¾&=àUÄ¦óîÓ¿ÿÄêäê”;(÷jŠWxŠXx•³ª˜…?¶T¼9‡µÝ˜ÃæÎ¯[·¼ó«¼rL«À
Ï¯"Ù¯ÒêR}¥vù¼5ÈšèµQºÍ|ü*´h‹–±.Ê¹”°1¦½–@ë;¿JYãøUÂ–(ú,o2P¥m5d©bSUß(´¬ŠÆ4v|eJ˜+ùu=Á¿â{%kyâWÅMã¶{ÐÜú®)A)+½€ñÝ¾¹…}óyo–ŒÉŸ_T~ÜDŠm¶t…–Û´Ç’ß.áÀ¯Ò¶\£y‹®X´2æDÑ»ËºË/·—_¥µâÞú¤µ€º—ÃZ—UŸ_·‹µß.á{À¯;¬ý°6ë¼À¯"~92ÈÏ+?L)÷ÃAAXçKBÌ
²¬†JyDÌñÉàW‘g¿Êùgð«ª ZÒWƒ_e<6ø•ë·Á¯ï~}pŒqûsðË¾½*úvð«¼‡Ç‡†…cGdŒËzTæ_o´dY<a×òNc¡@æê7F—»Qß"ÇvcGŠ9¸apÞÉ	 8ü	K‡ù“Â3E¹|9ÁaéR'Z]4ÊØCó´	ÊØvI3§Ó.F€Í“(œÕ/hÜå‡~0-Š}ÜTíëìj½9óõúŸoxD™è´HNŽödÇàöäG”r|¹¾Oƒ¡_O:
¯|PùŠþ€}­K]ÔLmeKª]‘t§äÃ{Pt{xB»gÍ›žÁþYËdsæC•`&ú™²6ž°„ŸÃt‹$ŽˆôëÙHïKþäÕœ§¤9¤"ªø,»YÃ<W*hùzÄ´<Ó¿€0ZQë±Èñ/SýgSJ‰aÆþÂÃ€Z‚¼Å»bO©ÝêÁ²Ö±ÞAžÁ'm™ãÕ9|‘7‡º{²k|iÎ§këö\_• ²ŒNS ]Ùôj‚Ù,9X¨n.‡J]”ù ¡V'DÔŸE±ôIm¼®’—y+C©ÑÉ_ßÉZ0m`ÜsÇ§Á”\€ù9Mk©9éôCF`§¿ÁÐ˜ÙW“e*æNÑ°M­´ŒšÒè™ß•š
1I*§[îÙè”g¡ × áR„™Çu%#Ç~¦ü…Ý ~
mŽàØðçÚÂ<À¼£¦¶Óú9q+ KH-‘/…g‚BÁŒþ\Ózr8íÊ×_wšý“s;’åmöÉ”ËûÝÆäêüÇ¤ñz§ónòsÚ÷Õ	Cå¨2Kœ¨{)›Ç¯—±cþþ$)†‘{¦ÝÏKî(Ý¾¬ÉþŠ³Òë~3®wxâA«Ûš„0â…@‘é8›šô`DÕºyfÁN+SäÛ–øÂ–ŠnÒÉ$R™Žž2g‘é¥çç3£¸¹\$)Hcë‘Âá½ÍI'3 g²Ÿdš«Q¿Œ»œNÎ„fÕbüÙWÇ°Á¾a—¨Qð–ßb~˜#Þ-Œ’0³|[²v.
–){£Î™Y…ƒ“ñù%œ{5þÈLÎ÷ÉJäøªq —ú*©ÉÌKÇnu½¶u'¨si8QåÕW‘{Sié”Õt8“8dà±ØZç±	Êé°w©N¨ií	oÅüÖOäT²˜„	üô¹‘!2ÃÝgOì{Ö¬™Ïád›Á–ïˆßÞrêØ¶d"˜Ù“ÄÁ‚¾°”t¬vß˜¬3O¦{‚4Ç\¼ó1œ;ª:“ÍQ]ê’»×ßcøGg²ú»·QÏ¶¶V½ì{¡¶ïÍ‡þTd–µ\Ô¾÷[¹žË¡”…£=û’Æ
O9Æåbv´˜FBj‘Ì”¢šŽSÇoÓ}L‘ü$9£zs˜zýê÷ÉÅ£¸äñmðµ³ÆÎVb~Ë2!È±$ã¸à)$üÐy™Ž™s˜†H'ë3.CîSâÁ^f—_éeùŠI7³	%ñ,8ql-wNÑ7iW¶›4#}&±+«×¤›M©GÔCLÝk2¥¢Òª{›Û}c¯ð'ÈÇpºŠ?nGæqT]¹yû7Q /½hÉç=¥™¦ÕdŽF¦c{"ç£	eµÌ¤\…2"¤‚rPk¾iz¢1fÆéY€üãÉØ¾ðT€³cLýpô.ÀòT˜;”‰DjïAxµædÌE%€}Óï<MC‡úµÚ}Õ/Ç¦iÃˆM¼˜üªž±œ1OóB#2­B1#}»šLŒ9fC8nøª¥9¿.’úgƒy£l_‘U`y¾¯(œ±Y8á‚Š•ð®½Bg~¶y9ü‚‘ñôLM4Â­·íêÚeGÒù•×”°7Ù°nâ©w„²8q§5Ïx¿×Ê<ðqba9Ø{›ôËÇ³{›Š®0»¥ËH„bÛÚ·æµDC×ÛzPP¿¥eÑÜÖŽpGÐç~ä‚¥"&ZNä¤±­äØœßÈîÌä´0Ó´ÌªK°Ä/¼Ö\<xÜh¯;©€]VÜ1ÂiJÉ‡‰tØmv·4þýß°N³Ý¿„¸‡öJ¼KI6›¹I“nîÖä¥Jªs•Å<÷²Þà&w÷¦£1äïíÓ'Ÿtú-£PZî!Ä³x>¤*Cn®ÙšÚÞrÓ®CÉ¤ˆ+#>èwÿ4Œ ¤Ø»°&ÖVI“8µä$”OáÐ}7]âC°`Ús´QZÚˆBhÞ oÙÒ3‚˜‚¾öîÇÖ
Ä	,€pïKé~_v[÷›ÀžŒýe“>È<<Ñ.,ùugZ¼8ŸÔ*Â†Œë°,_	‡"%¼ù’áTÜ]%D°¥J+<g ‚ÆÃÓ(£†0:³/Svð[KËSÊvóp‰OxæÈa|-ÕC¦—uÿ†ÂX¾:µõ<m/²ÿø‡ßÿ»ÿöw¿g4fö-Î¬~¨4òÆß/ÑõÌ„úü7Øç>f{~îƒ2$«?Ç§Uº;	‘+Áþþ§ÿ‹=Aø/Ø·¤€¨?¥gUz$XN.xÿò_°—á°NÅÍ
ý£`ƒ¤ŒÃúØ£ÓhèrÁ~ô§ïü%«ïóÇUF6ƒ»û×ÿ½€?‚Î¿BcJÕýûÙ³ÓóÓè‚²ÂûáÐ÷ø”þöØ÷ì¹a–ÿú÷ø ÊdâSÔßSWÿŒÑö-`m_#éú‡û¿°>Ü~Â€->¨2˜wQ5öq4ÿÇfTƒ	0ñáÐù³8ÇýEàUšÜÛšÙ ôÝ½½`àq•~¼· /RWÇö'~aa_]?¢‡•ö]8‡`Ûi¦ÿûÿÍŽ˜1Ò½yÓ MŸÏ“&9ÃÁI´½|Fð}.(•ï~à‰ox<mû±WÍY5/¢ƒ¸Ü'¦¢L.åüˆD&uÝy–Âè‚ùâÔv˜J¥ÛI0õm)£ê–‹å^pìoþÆÞ(sJ^Z›I·üÛcÉé‰¿ãÍ×­Ÿ¿q¼‡é“±Õº³gÙwÄ_{lîŸ±§ðÊKºQ_wuÍÄ+"ÜÖŸcÄ­_Ìá¤ÈKúMî.éM±èV^=ù<.‘-@™v>v!MÞ<Ãc1öig^Þ:À¨ëŸ¢\ñŸVs;gŽ»oÔO¬§ŸËyõªrøÏÃø±·ô~xùŒ¯“ëoÄlE	&Š\JÛA­¡k1nÁ‡wg¦­À¿ˆ]âË{
KE¿3.ýJx+ü¡kGxkU®LßP„K®J6£BYç±l»È*^–*èÉ/©êªªÐ<‰¾”PlôŸÑä‘!"½™U“§—®¹zúÖ>¥n²weoIáS?`‘Ý5\·X~Ôšæiª=8ñvO’„Ceiâà8˜³êõW3È!ê¡^ý:ÿýœƒ‚Óa‘­ð*/~bDHï-u`å5ÃD&­¼Þù^­ÝÊk"Å8Ç4Ý/Z¥6{/õ§¨r5D¹u«Ç¯¬Á‚W€VÑØOIÇÇ+“UÃ2#ÃÆœ!æsJ¹aiÐˆ(U€Ñ@ŠÍŒžâÆVé/:ì»æéÆÜ—þúUX'ŽÚì†éSÇæ¶ÕVÊQ¶XÉÔ*D†³a®uèfº®Ð¾e‹˜Ä÷§KÜÉT)úšš}ŒnUKêW·Z]Ë³¤ß;eËM”-I’ôÿ#
O¥[mýa5Ø+ŒÔ!¯ÕöHD*â†­¤2I¾‡ŸùW%¼`¿ânŸGÒSó?Å•»EMýÿG£§žP9Íma¥{Kœ?iŒÿ^Œ­¸£êâ)wî¢lWß+¹VKO”¬	·ATìs¸&]±ŒÕM\Ô+¥.Ê<,äeC"ÁÖØ_ª)(îh+§àà£Ýõ?“
þ$*“üh°.C`˜L+
ÏªP™dMÄ'ž%±tøôWƒõJ¤úæNê“ph-þQ-ÂŠ”‘ŽöY8K†)ŸåmôŠOg£ÝôgÏé¢ zmåá. rqWÒµFã€Âç ·Æ®ÌZBú»äÓ¡¼ûfBÅ½=
ß‡¯¼ÍÕ±¨HÅûï‡á[åÝÿnž	‚O?ÂV=ÇÏ?p†´Ç!Â[ÝâäEÁ7gÍÀZl¯<ÿ9y•£•xe%Žspmê8’<&/•(’ažBÕ‹Ž›p¹—KJòè¶¬‰©û«~éÖÇ©¤ødŽRì.¤JJ…c`BX7{º^‡s-¯ïÝ¤ï”â›>‡f¥pÝCgÍÑû•ƒ„÷m$<uoä_VŒÖnêŽ—Kˆ$¬·¿•'¸Ù¤êŠâÕìcƒ™8Îcà(_ú<ä;õ<,O}»éŠd[lÇ6zŠƒ•
ê•°úÇÜ‚Aa`IŽÜ~Þ.ÇšŒ—q7ëe¬¨<œþ1¤Šâëö4Â¹`n-Už)£¼ˆ©œÕÔ·úâJMm¿¥9ŒHl˜ÒBë®bÐTyò'Ú¿Bÿþû;
Ï¿‚N­³ÌuÉÜç‚„†Led‘Ýîvu¤¤+QNÝTžŒµûÉðÄxÎ¨¶¡føŒ|,u0xLË£™8ÃÄ^†áÜÿ7íÎ`Nï3Jã¶Á0[g°Á0;PgƒÅœ7 œ|€ñ‰¿É(Ž)Yeçïÿ¦ßéÐwZò;ù}gÀ?³/•ü—xŸ¡ _h÷á½d&í>ÿBOÌ¤'>‘H1¥>ñ×ÿ™íÑµT­–	ªŸB¿Å?0¤æeõ{ Ó³”×8þV_t?Ãoõùðeï¤ç,Ùûþ7vô§èG
ÐÁÁ·“Á·ÅàÛ-­û˜š;»ç<ÛÂÍ³qm‚o[ä™x•aÞª°o.ÏŒ	[ô0!_õEó¬È’x˜7h>)Õü‘Ú—”L^ŠJ½t4ùZÇ’ÕÌ±S–Ñ}#Š±M.NÔNô(Ny>”±ô0 6 Š†;åH·'9}”áNyÜiªp1’ür0ª‰áÐ£‡¹»¯Ä©æ³£yV…¢í•oM°{òÝÅ­‡3_pÁ†V;˜©Ø|y÷hÓÔ¨ñu&GdÞ[-3(&ùÒ|u•£Yœ¯çÙË¹p»¡E$ôºÄ£S•­xomµJLƒ(Fþ;¼KY?fÞy}ºÙ`ÒæÂ>›4” æv6~'³»$‘*Î®l}w)ð¾±ã4Hº·TãZ[éƒ-åý=ÖÞ^ÍZó:t%óë_äb~½Z+«ûA‘Ÿ÷°6 ‡-Çä¸³À¶ã©0(ôÊÚ¬,ód³(ØSÉa „³Àõ|ƒòÎ!Áb\ë úDÎ 1…º&Fî§˜ÔõŽ!ÉmßCt}ôsH,&D ªÕ¬&œDÖÝId{úiD—‹—z	¢u;G‘ÀŸOÿ,Ú)ŸÍKD6EIÿYJæ\Äé¤*6
Ï(‡®ÕˆÅìIW<íÒ}e€©×GY›ÒwìÝÜ.Ë¶DD[M¼h!g$„¿ä¤aÍeâqëíok;æíF×VU7£¶F·³%5ýÖ'¾1só=äžÅgIÅ£ÎU·“Š`î–‚è¡ò¾¨©¶íNa{®gLµþŽŠTY%ÄZYI«‹­xž$~u½P+dù¤üãþú¯Ðºæ/…”r  ½Ô?ñN§¶ýç>w-¸œÁWálÎÑ]öU8Oý*ØÎµ,°‰ùöÃØbÝþ+¶ÒÖîÌ‡ÓÓ‘Ïž½|ÁyÑ0¹]wi–È~ËiR»/ªlÂâœÎƒ¿8pO.bÊª
Ü¥ÆoÅÕ’gÜ”TT ºfŠ5'¢úö»Ð¢“ÞqÍZlÿ‚Ì¾†¦_ó¿sªýõî>M7 ûžÖ„ïº´æ+Ó˜—’‘= C/Ý…–\YÓGv²Ô„¦vÞèÑ¸Ô;-¤#Ž“¹N/GÚ¨Icq®É@5%µûíOŸ$<<9	ÎE?„WýIˆÉ[WCŽF1yñ$ANgÑõ4J©±OŸU,ÀyBäGäþ8ƒ:Û;Ê Ÿ¬œ2<9Ì‚L¨õS°œ`äÏ!ß´« yö}žµÿà1§I¯3ø <çTÎc2?,¹È’—!Á¡þ…¯ýþD@ÀõiÀ‡ßÐÙ‘ßÞ~¶Þ´Éä¼§˜%
âAç~6ò—^`uÿt¤§¼ïår&âŠÃí’¸ñxçƒÇ<,‰'N‚Wò|#W*cåKVyßË1±Tw5ìç»bN–±?^°Ÿ€$qãÈ™yKŒ»Ç N5µPù²óXéÙ­Œ¯è–•Ñ=Ñ¾cjÊù5e"^a ‰Óqq¨eÓm´{FòHÍ´ÐwEõmîéê¹¼Ùo9]/ßÇÆRç
^r‹Êaä¿ü3QN"?báÍþ!ãêEVÿÒú~“ÊŒÈôìÖ˜cýj-f‡QHù:ÞäG2Ô’oÖ\S°åÜ
`¼ø!ðtÛâÄž´ì«[§IåÃ‡K.ÌU_ÃDÛÚm÷öZ¤ÂÖ^­µóÛß²ßþ–ÿ§”ÅÐ:R8mªÐ‘ˆ&?«^<ÀHM¬C Ës³Ä¼:®a&ùøƒQ^Ú¼–ÑEA&²Ùœ.F°]‡Ãúÿÿxƒ½ß‰7¿”0Æi3EŽÞlØ1FµQøQ¦/õ.¨à•«\¿T”Ã†TŽ©îGQ\ø²„S¿	Ã¨^{‚ÿp àQ%æ(Éæ|”µ†Œ#çéó§±YPÐ¼0‡„
œ:À&÷›î/–t½Õ(NMoë²Ri4{yY/Ü™ëýØZA²bÎ?Šb0ÏÂ!…9op›ÀWì±ã9;ªœE´‹F‰ž\ ef¥lZø[L^J$çÖÛ„¡&^Z †ÃÁ}xi¹Ñó‚ŒÜáT»_ÿ0Ò
Hó°-s³›wK‹&·Ë¦Béƒà9n:ªäœ×>‡53rLhh¤mK¶ƒ°lbÒG§ÇTËÕŸaÊv^š=àÍÌ Í«ˆ%âq|íÛ“Q¾K?R^@Ñ8(¿9n²—þâôÓ°†'l9ñÙá$˜‹t›©'“^®CˆÈmœ}×ù1 óã#É6·¿ƒ:bu>üêTØA±ƒ:7ÙA1yÎ’j§Âz2:å'ûÝîùˆ»‡g±@¡zµ[H$Ã Q¾.Y9ÜEÝ»‹”ù•ÛJGI…¸ÛÞOé—®·©ªUµûä6™ïª/ø	éàÜ[°œÁ+bâ¦´Zí4õ!e'Òø•Ìä—““Ç6‚„¸#8Tý7?)Åˆ¿J§‘oÂËï~¤p‡*¾ð|âÉtëk\ª³§Øâ—ËKëÄS6X{•-%v]•(Þ‰>:^1XŒ0WµÂí{ŠÏNM¦>¬¦«P³šIM²Q»9aº×ˆ¹Ý'88•Á':ãF¸‡QÞŸ2æÑøþèñë	þ’°.BŸæOíø ÿèñî%‚á…xX»É¦¢šKŽDÌ°?·ŠrÈôØHî¨´ê×¤—ý¥!f%ªø‰`æ¡¤‹Ì_s½>Ñü„Ii3ì0äØÁ¾?9Á|f·dÿ(a,ÒKÝ†PšBO¾@ñT[&Æ[@xÊ’«xü8òÆÏyXHòw-Ñ©‰85 ¡oQ’^ƒŠ0–MYTÙFÃ¢î)jäb*³ß;yû=oÇçíyZvu:ÿø‡ñ2¼1F?^“†þû?²§‘ïÓCªdìˆ2Å«èør¬i•¯5ß k¿^Gc\r—+Ø®Íšó‰$mFïÑ©cÊê¿ÍDVßºô§>e‚¸½I™ü¤[ûùAó5¢­«Åyaeš¼²;…ZéÑÀü¢˜àÆÀ™€€Ú`lp~“xé/öj9Öj¼Mê7Zžùd­\I5~©î_öØã|o"tBÕ¤¦¨¹85›MlëJÏ(/»ì’“?Ö»Ø¥”8]œr}Ðc+ßm©á¿Iè5¿ÜÕ}rèÑ'OR~åBXýw+$(we¥åâŽ p‚â $œà©Á9ý2J¥GNn™‘¾b	é ŸÃMvè(oJEKÜª„§Ü¯Å$1ãüW,;	H¤3¯ó¸øý»¢t17Oj¶JQËžKŸf7Ð!«HvPµôf˜'»(µ™±ë’0·O$V¾àäJpV,ý|ð¥ÅÔB+[Û`^ïÑâ$:û¬×•î¬„fö$¾€*Á
4p>E¨ç|Ì™§³æ”@GãJujžA	ÖU,ñ¹ª#Üë:†©ú$*M…‡~Z6¯²	õéŒûtf•^U´;õ´zÝãÑ$<cJ%¨"g·OÆŒ§òH_L´ß¥ƒ8DßVwŽ—>Œ	¢dè9^(›»%r½PéVŒ\ÏÎûÚ‘ë4ª2æ
ë3s$9Šñ[Ó¬¦oVà…Sš&¹_¼ƒ7Š¹_çü*qÀÔK!«„WYv	¯<–IÎ¹áv.Ë„—‹˜È^–¸]Ž'ÆëgðÊ_¶<þ¯b™Z}œÅ~y«·ÊÅžy«WŠgÆë°ønþ¯2‹_¤?ü€êÅ¶“s¦&”Ê´W¬]Ì‰f1ãY$]™:2'¬E¢kEf¯­3Ë«ÿ’¯êzÊKO¿÷±á>·È¡—ˆNùà¬@FàE% KØ¼SŽÈÝ­¥"^
vj¾ü+³çlR¾E_/'“Ì}UR‰c{ÊïTßž«Ûœ&@ë“ÞI,dvÈGŸÚnÈAv^•e…»!ƒ[Þæ÷>óÝQ¨ÂÉ;mnEC¾€ûÞ"XzÓà=ù‘©rlsÒØÖ…Vš5õá,‘ˆB^—õ×kÉ¨×6ØÚP‘~QmäŸ±â YA×©d}†Ndy… iø%$*‰½å3ðåÅ‘j<œ[äÀÕz…‘“0šñùæw¤…&(žrVÏ)LTó’“ú+mläs‹ã+xU:Ür­‘YX¸×žÇùîµx¡ªHGz%w{ÝœßOžg]‘$DèÂ=S¼ÅÉ=|´Š¬ô±‚ÉôüxHŠ.þÍû|±(å¦‚«µFûæï±2Û¦tiT#ïE-/{EŽÏ€ü_s…ð—éB‰w®•z!1ƒtz¥†(¹®»ÊËÝ,3	óàÝjöË¼—´owË4×	š²uJQªò—Q®·Kž§KâËâðVá)-v•çsâô7É&"â'uåŠ)E†Ó0Š‘Oè°ãi8|ËÔ`vÁUØs?µûe‹¦üÃ?ÿ/¢Z…–‹Iu·…+bqqÓ,±ª˜dVXŸph˜.+#Y–}<÷–§‘ËŽ9Ü¬éfsIØ
kÝnj­<Ohîç§Ã(M^ [Š+K’«kÄR™9ø~ÃíÖpäå¸~n^uÞ›ì0
æÃ`áñ<ù!ûÅöù¼œ˜‘Ãœ—£©«xkhûùQòVÙœY9(a»ŠÒ]œO1Ê¢‹¼c‡e¸T*Œ,Kb§\ Ê&ÖyîEÇö§^ämÀ¡üx%Výk¢ñÊUPñÙ1
~*Þf(ÚMóÈº€Bñb¹WfÞØßüM_VÖG•û§â7Õ„§ø;~Ð|ÝúÙ}^cÎSÊy["ŸjÄ¦=6÷ÏØSxé%Ý¨çú‡ò—šáœ’áÏGðºHãZÚï6Œ`uæÞô¬ïV:}F~Ç!J¦ñ¨Î8ß—÷5gÀ‚Ä±O¡,¬òÖ.G]ÿØëaJúO«¹]ìæË‘*A£zú½|/Ú ÄÆ½¥÷ÃËg|ÑÜo¹HSö)Ëê 2$>üüî,‚#šþ"rÅÿ:—÷’F¿¡ï&´èù³yëqJÒ”7‰•³oFãöMÜ‘€Y‰õõ«âž0[r¯ŒÂÔFh§yüRëòL!˜Y÷Ìq_©› TXxüOý!0­Ì˜é=’3Ø¶r|0o
„+Ï‚g­ŽžøQòUáÅ^m6ä­šÛ•ˆ¯y	·¯ûhnÆ9 tYÛ›†÷QûF*7Ex §(ZX¤ƒ™£f¿òô/ý|"=‘Ü ¼¾ódž­¯Ôm{¶Ý‡£wÞ|HµïÍßy>rKŸIb]÷Fä¼2ãÃ(L¦ëâü9ßŸ¹{u±Ç‘·˜\€!Í"è+ŸÂ< ÞFÜUùJš2Š80AÙµå“l] Çbº3šÁÀ¨4J¼Ö«Ý½ÊŒ%U&ä6Ž®õÌ­Š›Ëzæ$]¶¥ÀSÎKíDÕW_žð@Õ\+AÝÔ÷,œ‡îê»Øä]®~ÍÈáÅ1»‚z¹6-(ìÞSoL/®Ån%ˆ˜g êå€Ô9l²£åÅ´@ÎàƒÈ‘Õ¡æË¾Ø’úv¼ÌŸ&ýW—’“$‘UCrI¹“&9Y½´lp’®,’Õ~D#\,Ç0Á#¬ NË@B#L‰YýUäh¤ ©~ÅA,˜Ãõ<:DÕ!G‚ÚÚ«`½ ùíe8óækŒîlÀ
Â‡j÷÷qM‚!ãß­Í×ïmòþJð[?ŒÆ—ôÿ“ÍdçâÙ5:õ"HÑhƒYæ#>$“|L¼Sýkk‡SïâÄ"ö8ˆð7|ÄœÖXaYžLý1r¬._»Æ÷ƒù{jùÎKè|*þ‚Õy»ÂÐsB«òx{¢¡#f§ˆP½?õÊ#ÝCÌûÎŸ¾ó1fƒ½'½ÁGx©iV§ÖÕav€Tï9éSŒü‡V§f×X‘ç@S ÛÈ[®éy„t–iæ/#À¶zÚð_ùþty˜_£UèY7ºFïGx²o#¬ªõÖ6W>VrÑš]ã3¯"ÿøt8ñ—ìù‘ñ•ïNaÀo×ÕFÕ¿ñ£¼¹‡ûcî¿3ê™?°¢0«‹¦·±G`©Cb-È"B¤¡%ÞO£ Î ] %ñkƒÍd§5äý³(Àƒ?Û=}åëòOüå£Dÿ˜z[Ó?+?§àäý‡æê­¯±gÐóv½‚‹?‡“3?˜š[ô;ß{wAX<§a{Ò[×¡˜!Ñz\rÂºµ}ïO›æàÌ‘èñéF4!Xišé{7Æ`l‰«ÎÚÊš;”l;õ…;š’üR‘Ç­åVÂpÇÉðn…ˆß×&'|üÐTSÁ³ï“úVçCA.E¹'=Õå}3¼¥µ!3NÔ1ÌÄ²õæ2|œû£z{}½‚/yŸŠ¸~JAŸk$¸¶Þ÷÷X§b¸k½ƒy½3P×ûë?žõþ,ƒÃÛÎÉrßø‚èð_`!µk”òVäv?ŸØpÅx«Fž\óÐü„ÎKY^Œã¯òÉŸ˜úŒ®&ÅqhîÎLãúøg¦±âxjæT—ª¶äxnvîÎMãú„ÏÍü¤*gPgÙc³\8Ù*Òª|†GçcéÓ˜m²´\ü/è •ÓûŠ‰‚¾±<FGüÉ/é5¦„év5ªúXïÁ8I·ïNRãúø'©¹æp”¶·V¶èp–¶·îÎRãú„ÏÒíÜ³´½uÓ³Ô¤š·r˜šùùœ¦ß6cä?AýØSœ>û“TN*„+ó««®¹Gè­ã~¾þ¥Ýs>çØ_„ûé<oëŸÊî?#|'=¾ÄÌs}¼
ÇãiÕ”ùæ
»¯Óp\ƒÏÅá›–¼|í<T.¹%q—­ýpxøäåþÃ£'kˆz»Z`ë•;÷sÚ×íónÞ…üZª‡1{‚¸â’>(øÛýöÏ>Ì/æ‡(|ˆHŸÇX\Ÿkª®×c%ihgàÍ/JWNYvŸÃ„'“¤oOF¯‡‚«^ÄaássÄýL£Î}G„g*-iŽ‚ªáN¿¥ò\¥CÆw“¯¤<_N‘¦*5™nP£eØ$Ä¿AÁ•üŠ+ÎÊúg§€‡ªðaä_£¼Ò&©ÙñÞ€˜v
}ssÉ)îƒ],·ó¯þ–e=ÃNÈ;q—zÁmPGÈ‡î²6HÀ"ÿÝÍ§¥É~ÿ¿¦NMäÓ¤Œ`-Ï%jMûü–ñyôw,9€÷ßþî÷Œ{Œ%e)\>f¹_/;ùùÿrg"ái’~5Ç	EûpßœvÑ´XÉ´hâ>ú!”OíugÛE“C·84M³ôñ™âŸÅ/šÎE3]š•”† ïô÷UŠìÉ ºçÑ2,”i=aµÃõT…(ó!‘O,Yˆ‚¥k%²ahÚÞZi
SÁÐnå·OE3@²âaWÏ­Q&S'ã’|åd
¹p†¢¹póÿð×%’R(Çü2”™(ˆ{DÙû6…G%IñX\çÊªœì6¥ø8ª&»v “ïS»/2ˆ<Ç0Bô".J6¶°0†	Ò%Ì ô‹Å
¿b™—äà1"›#ê2èt‘t«ƒnL™*©bnV$S\Ù!wÅ$õ*òä‰w™º˜×ÈU¿ÂLõ%-e–$Çr…,õúlo¡>•;@¿§xé&°…q]/8¶ÞŒÃ™_‹¸c”"{KÅµ¾ á»…–ËÓþtýžÑÙ”L—W4‹×#´pj”#€’›dx6CKí735eDBš4¬Cý¢|(%ÎC¢Ï¼ØÔI‚¦ÛKÌdÉ	¤î.™§ k§Šg[c*ŒLöÕÖ¦ã¥-óÜ;˜Ÿ„2¾¶§Å×Æ“(˜¿m´ðhGÓ”3¾–[(^Çl¼õI~!þÙËRzD‘^ÆÏÃß‹I¸á_ËÙŸ½dC€]G×œÍûl„%zý%ìýéì$Jl'² çãÅØ”V¾Éh£±áDyÇxÔzó‹e0ó±5@.lF¼–ÀŠ,š8©D…H¨ÃÀ0õ¼wÀ½Î¸MmD!Kf˜_jëÑvïñŸ‚¬†/áT•Ô””KTj¢Ó±Íg#“ dáb]„‚§V\¤6˜ã€;¤JPZöµXp s+{b©a#I4ôWìLÕp„­#ßcõçÁVžQõy¶NOgsÌys®šE×ÜhùIf£]ú;‚-ƒ«x\CcÉÄùëcô¢á„F»gâßNá¯8—9¢ì˜$ŽvÏ[I~w¾hl#7F«*6ÛÈÎsÒ“¡Z«Ë+1;Æ”˜]ÇB;M±’h œKRää­W!æW[6§þ|¼œ\e‚_Èö®gÐ*›[ÎøIëÃ¿ˆ%Éáü*‘ŸÃ™M&gËÊqsBÅðp:•P( SoEX¸êi²¹eõ?±Ix]›niÇ-šYd±Ô£Å¤K4!.\‹2,J˜.ÁOÁrrˆgèu"å9’UP¸+{Ñ¹ù:(¬ÍMÀ…FVÊ§MÎC˜a.fg Á`Àp(ÙÙ¨Üb"TõÃ®)P¨ŠKæ«ÉOkc?•ËÜpýíÔï¯~;azTõÄ¶QÓGœu<›ïIO#f…§¶‹|ŠÞ”W¼ãK€<ê´)Æ2¼ÙaT>¾ †æFò2+/ãôÈÉOÅ©¥Žä6L>æf³ik/sqRx¯ühfÃ=k:NóÅ2ùFn˜‘sÚÀQËÓr&©F2êê“sfV)/CoN§È
°gœ&q^«Ü‘žz)d)Uš°Pïä	ÄÍmd¸:,µAÃä—á¬Ó¨Ž=›‚T @ÊÜ®†œZìAy™V*¸/€ç3X.ûJ‘_ÌÐ!Ÿ¾ÙÌ[' ó¡5+ol×:ðÌd©ŒBœcEá	+ƒøHð€lIvð`7'^\›+¯$ÑÉï~ñ4§
õâÏæ2
fõuRJ­¹Œr ßÏ‚%‡>œÂ4^„‡²¿/ä—ì]D>ˆàóÜTŠN(Yfq¦¥.ÉM@šƒö‡V¹Ò£Žp˜lÐ<«1N$#oz@åºò$0ÎiÃŒÜCª3hû·¨Ã®Š_¹-™®†%'½Âªm¦v‘x¶VÔ£é”ò…Úäót095ZWSpµ§•¡•ðLÏRù‚uOÁÔò+Š]áßÖç»9¦“[ÃöÍU®q[ìñ{$·K&¢}…iwÃ·þOÁh9Ù»$Iž<¿¶ ýPÊ×0w‘oô+U*u¡!ƒý<YF§ó!@›LêRÞskFí´âà yCå%ÚÞ|	?àƒdV¾Ú`øó$ˆÄï7WNãZ²h	)ÎK^›LÏî¶]Ì™/IŸ´^«I*>Ý˜SÔä?JL‡SË’½à¶KEÆ
kæ:òœ¦äbfŽa4IŠ˜Qôö…CÌ¦C„¿†‹<(‚§öâ{ÔR³ƒÇµüõÌ/j–“×Õv
_™:"\ÜÚÈ¬jÏ›ŽÃs®s<
f§8û#G.…%šÈÿ¾ºª€,VôIÝ°t³Ñîp]›gîekšÐI8•²Z½kQ‹Êi>Š³È[Ø$¶R³ŽÃÇquÊF—ž¯n“=¾ Š_*+Ÿk¯RqÉm ”+•Š-D4HTÖÝ§kÖÌùt,Á÷Åd’Ò3_àeLží¦–µØþ™„´e’•ëú.…¡¨ª±Ú9Üå¸âêòD‡Pµ—áÏ­ÓED»6¦™—1†58¯d“ö õ_ÿŒ.âJg”ŽN !IâD÷Z5²¥ZG„ßã¡ïãª2˜ˆ¤ü^w|i5†Ö•;»ÏÚeí­‹È¬ÐF, ½Î¹8]ÞæPy7ÙAI@pkƒ¬¡¬ÁÚ¥Â“º²Ð¥l±F îNJü„íiî	ˆ])&¹âÀœG+pºï€œ=C¯Ñ`‘‹§ƒÃRXH#es
×þw2ORó£#À×xõð¤µ]»*Ç›ÿ¶Pö~ªêplCÀ¿• t0¯Iàü×8ÏÙ´!}Y¿·6ó¥ÓÆš.ˆ·)s)	áqXÖ`©±‘m+ô\àiß³)-ù2ˆHó¶CWi‡Îï,Þ¨Autäª2ÎÃSJa
›æÙq0‡ÉK¦*qG±ÇÝ˜3³ª@^wzD°& è/‰šÝó¬i]0$Š÷ì——Ë‰?ó›¸lèÖ•ÁÐ'–±ß šá¹—K–æ0ßÀZ‚ÇcÊMÌ®r”l²C	M‚	÷[Å= ¡ÀÏú2\°‰7=ÉÊ'9ð©iàé:DÙí“3rrb.ùê®TG~iLÐ/ð©@L MõcÌ®¯ŠÞ¢B0µÂ¾åÒIgaª¾ÊíWk,˜u¦Âg¨D‚‡ÀÿzÝ·
¥¿yõš§Þ:	¦·$èÜ.3‡þ=À6YË6	%ì“wHÛeHë;ýˆkjÒ{ïé„ ”ù¥~Yn½›ÜWsjáè)¨>à'õÎEÐ,ŠNèLJm_\3ƒ©÷ ‹ä–è±$T%RÖ=âe£ÐšýÌ›_àÎú.„íÉs$ç÷2"‚™xoõŒ×êÓ<³Æô(]$é|Pgp„D3/z[tÜñƒÊ¯,Žêb¹åßSù%ƒB~yI®ßÆ”qÿÊNår)›e¨µ`Ô á¬‘Î5±Ó^kØŠÛçŸd `Ôbï4|Ú<Âs]1f¼odg6Ž¼bR
U|—cù“èÁ0œ×*lç•O:…ÅçÚOÃEñz	 LÔE\2ï	NyšæS|ú:bßÏê§FD¬?É€Ó´b!Xø)eTÃ%aˆLä0fÈýÀ.hÎðt±)úùVØ»Ô=Ë¯Éý^>Ëìœ+Ø9X¡ wÎžâ7\€\yÎ
ç¤d+¡ÄµòKÂiçšŠátãËº¥¼vZÒ£ýÅÜ6¤–îOqT½ùò’¦Aæ«Åù›ôÔ’¾£ßüÒKoœÆi‹GÊ]lW¸ã¨$•ßÜ ¾¢CÚÞ€‚-nþOR-îÖo»nq7e¸E:v~¡ñ<˜“mùƒçüšX¢#ÂÈ‹'2¡T>ÇŸÿ?   ÿÿì½ëVI¶ ü¿ž"­©)¤)IèØV³d6ÝÆø Üuêc±Ú‰” <%)Õ™’bñóg~Îšg™šGøbï¸GFd¦¶±Ûê.#eÆ=vìØ÷õT¥êæ×…	^n‰ÑÑð£?ÀïåzóYýÒÆF©8}H@=¼ž¥¹U•Ì±œ3Ÿ§ã'ØÒkÔÛ›•tv,™#Òv{HÅõÃCÎ*p’‹2Ä½íHA"½ÅÕ h	èÉ]÷P¬QÔù@F´66•Uø®Ù(ŽÔnËà>ëÏ’‚*Û°W”hN´VÙ©F~Ü—X°TsŒW´LÒ“ÍƒÐ ¨S9Ï£iÒ%Ç8ŒNGcWx£Å\×nc2&+ÈÀÚy4Ë¬Mj>h˜^ã»àº¡S?o4ÖŸk^3-eÜøR„‡ŽùºÊô¯Z;%ÄÂ–¨Ù4BAé(‰Ó%èÐÆÔêüMƒ’L5”§QÂ©“®õ|“	Üd#9ÆÊâfèÌ‹Å•êLÔëáÿþ/íF(¢Ç#Èg¡~ŠÆ¬ÐêPSç½`€×pÈE+K	,K\íuÂ£Ï€ ÷/1ìV¹òJfÅr”¯4=ÃÈ¼š·Q!s¹qþÑm•›ŠÊNŠTMMÜ–b ì^KÉR—ÛY8Þ¤ú)¶¹ž÷»;ü¨úÉEª•þR0s0ý0qKŸ"Ðüúo
4îè¥êç‘@4~&¨¡—G)T3úwE5o¾Tó…¡¸¤‚Í¿)²yóðÈ¦8ýý í¤H8SÏõí§z³LTÂ${`.’Ïªt/o¡ˆHÃ)ú„ 5–›IÖo)Vj³(ƒvÁÂ)"M‹bÆÿ^³ÞÜ$Ê"Ô-Õ›T*\e—qKÆZ­V*Dº¾X×Å§Ä¸­•ø^ÒYà
KaWJ‹²¡Kpm¶ra8­j§„âÿòBÙÑF
pƒt²çÖ§ÔP×°ÛE $ÍL˜—~³¤+ ôh¹Î,pBÅs5þUÇ´ˆàö!¸ÿ|ô0ÚXR³Êæi$PWÔýÕvTSgE™BÁ;§G‘)ÐäëäDaŠNdÎQ@•jÉâƒ% Xk`™eTçàXÁ¦—+Šê%ä/ÊYÄŒKù	p¥(êÍ™±î¾ÙXš-¹,²œVƒØÎ”=Ö0“„š¦³`¸NM2‡Ì&“nÄ$ŠÈ)PYf¥LR†H‹)(GqxI¥cœ¶÷\‹q.52zê‡QÄ£ùÉ5ŠÐ¬úãhî½^€åÔr¨VHHÁ›º•!½ª=#‡¤¥“|V}“†;6ÔX¦à”°Q@BÒeœÅÁ5B/}ØJø¸…L.]-íö<oÅˆÔà^`x<ž:Z;Ïì/,TYŽ	ÆfŽ	†`ý‡9Æg3ÇxYÓÿã’‹|ë˜ºS<îº!`\©R”-4þ¿âu.¶øðÂÃÖ h¯´/MÌß2m÷+?dDr3–Á 3¡š¡" iëà¶†(ì„GzûcÜ7·!“lOéŽ)”7žÝ,ú)o—){qîùú7;}W`®/F›YŽ~ËDc…qŠóÊJ/u°ÿÅÛÃ8sy‰p%›X B«Êùþ»»!B«$\ÚúÛ€'|Íƒ·øà‚4GnBCŒQôÆ\ûA¿="ÀGÃ ù ¬“9%áT…‚ó&“`’QŽoêt²¹®®…@fÁƒÌ‹(RRãÆU”XÃÚ€6fCTˆ…
r È¹åMnh€Ä/.}°œ‘åâøÄQBNÌfÃp=xçAïhßëöŽ_÷ÞíþQäXØE³iŒH= ›zä('þu‹„˜'wÓ6f9øzAˆ›ÐÏð- Î8¬œÝÞÄðø§‘‘UC~Ž‘d"iÎ:bŠêÓÏ4MÅ
¥¬îÍË5økÓ`³Ml–‰k5²WÊô­’¾*9ÐÜ]÷^–ðTŸÇ6Ud3«	JyCNÜDVm˜2(ª[hFtyZŠÞ=rQŠXJ;J£ö.¥zÎÄi³…€*$	„S¯†ná*-n£Õÿ"ÔW‰	îgTYÌÞÍ®æ»MO7Ð9'ô’'„Çä3§µö0¸<Ó6LK›û\ˆ}u-$º(TŒ¡ÛÎE‡"¦4ùš¤!ÙzÆ1Íyš¹/àH­f#¿•ï+u…VÄÁ¦Ó3§i£~­kW 6K/YL\p§„3ü9pà?üq8Éð•½ëYÈHÎ=(Ö\dh—'ÇŽ÷òcÑ5¦éi2Òª9c­X8ŠeÕœ’ Ã¸xÞ‡é<wÿ—ëWN({²S¿Œýað˜9—òÅ,óJ±Ú2ÿüYˆV£µIPFk«T©I7ýy\P…XLÞ°
/œ	a„áE:$– .—rœ´\¢.}ÒŠí>?„{p ×vä`ˆû±×{ßÛ#Ó{ÞhÓåò¦ö÷vºo½îîn¯ß_bW.°rD‡Ø€’QÜ¿xB¹r¢Üf~±/¨«Pâöº-»}n×`‘í¯!„ìZF.ˆ‚ŠšT’Gî“»¬Ê&_a³Šº¦ˆ²æ;UÕ¬¨¨É m2ˆ)ÅEô½?%·Ã*.¢è 
ãÁ”Ö\K±”¦ôsxƒ†„/|@Sùq®âôx%úp
é>Ú;YÞá[Òh,©Ï(fÊÑýäÏ	Ó.qõj"ŽÖ0$G}­Ÿ37Ò{;‘Þ×…ô‡©eM¾%÷Ñbz¡]GíŽ£°æ!\GSNiÐoÒuôÑ;Ž†™å!ä‡Ëè£q-j1ª;„:1Ú*Ž£¤´~h—ÑåF¸‹~6wÑ¯í,ºŒ/Îòž8÷pýJN¢Ú§˜ûM!÷Ð¥\o¾Œ¬âúµœB¿ )â¡õè€d%7Ð¯åú@I!÷ÏG%+¹}~5§ÏïL™¥™ïÙÆ'Ï/ëä¹”ö^8x±¬ü7qîü^];¿€cgž[gq§Î"|¯¨[^7ß¥ó‹;tÞ[ŠÈ/¢ÇxÔß¼<ßGñ‡ºûßNÝ½ŠGâ÷ëøðÞˆ9Ä"´LÛ˜ÝCÔ¨y\è:#¸6zŠïQ|ü…í–qüâ¶°îCÂ´ý0]S-dºð@n˜ß›æ
.˜_Òse÷ËÍÖRî—øé<-ÖŠŽ—ÜíòË:]~U—Ëöù¹Ö»KŠ VtµüÞ-ÐÍrUÏÊ¯äW¹œWe>Ä~eÊûúS®4ÁÇâK©úÜö%|*s–fiT´‚7åwêK¹‚'å·éGYÄ ì{ñ¡\ÂƒòÞ)µ?ïä£ðœ|„~“KcºûøL~×“ß“¿d1¡À}|%¿OÉÏæ'¹¢—d1È"
ª›`<Ž®<Â†³BHíòO-_ ãêWÕ@ÙÊ§».f«-v!³üY­Ù"uçKÈ[JÞöµ®Q¦Éd˜ãÅ‚vòÿÉ$2í–Ëè˜MB´«jh†iÕ‰"cÐOHéå»H$ƒî³üÆn©åN»NÔ&áŠ¦èó=•@F9r>bØdî¡ì“åÂÅWçÑ5UöÅ$Ç@W“²3ô$ä/y?#ÃK(ZÌg˜‹ "š—eø­;î¾û§V­÷£6õ¼ráÛI^^Ú1`Zø·!áêÙ¦ÝàãÆ
`¤¹“a¿ƒuùž‰AhºA)¦ôdÜRÐ$YÁ53S¹†)CaÈãJ/O!<öŽèn¿‚4Œnt˜áwqNzB&Ö¢å	'9Lîì:ŠÖÙ/SÄ£BcèƒÏËŸN¡‡o’…çoƒk”9¿‹¨}–ú;7}¼<ÿI?¥Š=Ž±QòhZ0M†œÒÒ­F–Hº|ËÎxR¿ÇsðÁ¥	ÖéªÓ:ò“rR‡T£ÿ$anzäöd_ëä*š@bv° X«TÄÚE“pNéxÓˆú¢Tœ×‹{]÷‹U¸çzû Ìµí(Ãø1ßØQ(ÂBrÚoiÝšMÓÚžƒrŸJÃá*•{þé¦ælŠÍDåOmS°ï	ÎÅÛÅµ³îNFù{­ç0Là,·sÎ-ÂbÃ¾ÚbOFä–¯r¡’õÁêïýËB{´E÷ˆIPûã¡jÝ	’aüÉßÃ	æ£ï¨Jqù”+"75§·Â„cq¤Óû&†Hn¬æ¦aQºi:àØG+P„!ïÑŒÜg¾7¯ƒqŒ÷è²*á M‘fd…R@²`=ñÉMí'Þû½}²Â?ß‡Â½k2¼©?~NÿdôXsÓ©˜çÍ‚¡›ý­C/V[b¹9ò¦`Ùë¯¯r€_ \©âp|CÚEòÐ¼daÁ4c‘.½sB¾_,å§£)Ò¾ƒE]|E†
¶§1Ø«‡[N‘æ‚,œ·íS°]
^­×¡åaê‘ñ@ûùb}Áê×Å3óIå·Ÿî~úéb1P	Ù‰y°M/B°%£¡?.ß‚™L"íG«ð›€7-ÈùÓa-~º#¼Q¾ƒ<ðôR¯GxLtø…C­õi¯âÝþäq­+%Ô^ÈipžpJ Íƒ}‹0vSLÓXDíuS¾®Ã¹«ªJŽ„ [æö*J®q–/IcLŠtÆÜj;ZFeÂR¥Cp5è0Äž¦g®Í~ýù¦bõ×¨zäß–fª§¬«ÔTj4±†V¯Qñ.L§‹Ë‡,¬Fà¶L¦EÙ}Âq«,œbOjú‹ØÁW\9=)æò™FiZLé¶À’nvå”Á²]Y—¼â¼¶eÐ¶/Nb?µ!ÆzÆùYE+-NÛe`8úÒKzò¹ÐbçÅú¨¥5šQÝ0ÈXÃÃ˜G7¼›há%öåÊ'h™q0!ûçPôØF&6 C(1M(â‡–Pæ±ãŒÂo'‚ãþtÍ½óÀ#C®œº¶˜3*Ur×Ë˜ +ø`.‘,lÓàñ™¢Û!:p€å¤JaÃË”Gm¨þM|³,Üe:V‚z[ê[JÇ¦­_ú~Ë ½Vš!ž²-u‚âšósÏâ ©zÇ„™S¹ßÕÚ›ÆÑxÜ-·+)=¦o—`‹yU»\•{¾‡	AŸƒ IÈIÃ«Ö¨L8xTÞkh7­ã¢5ï@ˆ€ÎÜp«ñ0ðd˜º€ÕÕðv ]˜+ªãý¸›»y2|Ôw³Æ)‚º­¹û3?þs$V%ƒ	B%,™…Ó#ñàœd”îs¹+ž•¶ž" ` ~Ë'Ë_ó[.KË$˜„K#ç¥ÐÑ [h±Ê=Ò'G®}Ý‰{Li
<ú²œTÈÉÃö£B„	×ï®%È†ƒÅx1z`“ì¸¨€4`Mæ™Ì(ƒ.îS…=R~Wð!„œ–~új
î|ãÌu÷¼ÿ÷¿ÿçÿ!K;#Èÿd¡ª@I5:dý°ÌKJ$]…cðºº$dÈQ0Ý‚eÌ6_2´BaLI²¿1“x¨]§Ðè¸D*çÌô%hìÉ °qò€šÑªõÈÅó'¹“ûû-¤ßÈWPRÅÁ,Šç4—hò“º¾ŒÆ®eðÅŠ˜“’&Y ‡®“Œso§ú¬ò â” Óäõkˆ½nŠë¿)`+¼r¹7x-¿ŒæEbª«^X$JÉ'íà«WGó~n˜3/yà.F|Ó „‡ìUt½]jZ£µAþoW»Âx0´l‘Z›%o@h¶Èßú7&Ð+Žþ$E™|}ÃøS$³]Úpèã_Ì|‚m,Ý=ÝäÐ[n—7¼fËæ=#Si4ŸÕžý£±»Yo?mÃok¶FMZäwëy³û´þ|«åÑ¡4ñ¦1hxízc£^ýíMRôYš6k?·k­úÖÆÓ¿¬#'¨öÓ¥m£à£×3ÙÝz½n×±™†6#Úr4ò¾·5§©êˆ×AIé˜íÒ¾ûì¢@.ËùÆµw<&Qÿ2$ §Rùx|9ŽÎ}Ñ©A¿žÁËÄñ˜^óä)ýB›ïûŸ‚þb 'Hï$Í£iÃ.+#®ÊVSƒó¶½Ó³ª2,ù€Ž£jŽ¸7×BQŽk‘‹Ó;¥´jxÁJmÞ“¿ÏH/‹$èƒ}ë*c=={Yf®óš¬RtÁ§g•ßdëaBÆ„²YÒôû¡¶[¾ðÇI V	â8ŠZ¥Ç~hUJ%R^T“×Ïâ×Í)BMËm¦zT+ýF˜W¨ÙPZg¥ø"¾+Ê!áéËt¯olÃ¯,¶ç—_ÄVq]ÎK¯QaE»+Êpûâµî‹ó:ëø`ˆcƒ‡¸VžGkG‡£5>_Ò¨9ÕŒ¥ÀnîªÞ)cÕèEØ4ž©»a EÖ‚ñ5H¯°2ÿBîQÂdyô%ø–C4ÝPU­ªÓÿä‡c¸tt |{9döÆáe6#ÛÞ“ÌIüÆÅˆ@KpcPš$ ö$LNÄh[MC´v÷“£2¡ÂKW•§ÌºÛr«,átXl§aÊŽ¯Tuº«t§CŠúNp»üäf:ðÊ ËUuLÊ”„VžÇ¾ê
Ò¢ˆ
Îã6cOp¨‚ßï
<o}Ýë¢>k¸˜AÁN(ñÓz¬Æ8˜{°ÑG•ŒAÛ®r}} âr——ÌÌ‡¯þJŒKê'zo*l3LËº%dÕø8¸ Ã‘ƒ.Ï«ÞG6ódýgnÄKÖànWü(ºåMNƒ+ÖÝ^4€M½òCrô‡Cò³lôWUäa$œŽ˜]Uy#QdÇ@Ÿ*öÔkD‹YÇ+ŸÂ„°³ê]!%(©eÙ  
©±{tÜÓ_sHèxr´Ì¦Y¾×¬œµÆæO6$îM|°x×ß]]ýÎÂ~´6Õç³9¾ÙÐÚòíåSˆÒT!Û×ñž?®=½¸b‚H‚xBh¨ÓfÕkU½vÕÛ8…î”ýM®ºy!Xš©[o,Ò·º¹ßÜ†™÷†	vñÇ
µI6QÅþœ¦Ü«¼.n?A¼rÿÝ7Å_!Ež
Î—Ò³5rRô›Õ(`\²&¶Ó‰èò)á¹Ì¹V &Ã;Íøã ž—?¾®¼“·=¯?¡?ÿ¢X½ôó-‡Ü»¹Áï‡Jöƒ|é0ÄŒ4Ñ$Š¹¸½‘wÅl¹Á¥°Îqç7€yeB…wH›ŠvoEã Žôy¹„—œ±QÞ#eðM@“\¹q,&¤]‰ûxéàÈ(i5m‚õ’
®ÚXÞœê+Ù
^w©k˜!y‘“wLŽÏ¼¾Å@¤\åÑ}÷‚1ž—å]~+žñIô.’'óc`«¼žz¿Ó‹‹ô‹—h·
.S\XG=G@Ýzè=ß·¸@Wa,¯‹ÙB ïTa‹ÁÚþ)°è1?XQÿÒïS±Øl}NËiaüCyXÛ¸¯¦=„ê£ÚéóÖ§ÑYá–ÃdÛØ²éì¡m½šZd³‘R>Z%ÌpžËë„ˆŒFüž4ut.!M”iŽ¸†a§´¥a©eÊóáïJ¶rÅ!Áw[ÙfÛÚk[Ö2Õ-Smkh=–°üxÁ]ÃZ”âÕ!•¿Ñ9É™	œy£i^f,ü— ã{ @QeÐèñ,n¹˜-íŸ’†ì¶j¦ëñ)@¸n2cj,9e9Å.Þ”bàEH¤]ª`Æ³[ãY1IR ¦?º•ÅÜµQõ_Ž€P(HÅ?Çˆ’á¤Òs,ä«Œ©Þ¨nõÒÇÈ|-Kd>å,sMÎlAnS»¦!Ã_Ñª.ÔB9¡ó¶UÕóµºÏ½_<²ò@¢É,š‚}õºA$Ü<]øcJ5X\Olîv#è<ïH‹éaŽnÜó>L‡T½íí³ÞP±¨ZÞÄûäJ	t6âS8„¹¡z»Î<<á¹H¤´Õ´³L®±PçÁuïh:¾AÇM¦øN÷
–Š`¦È©¶zjµf)ÏJ¢=v¼Uµ6b¸lª=ŒÊ2÷ç‹B7.&S«ï²å¼Ñ+Þá‰Ió1JäÃ}
’å"3Ô¸›nm5\w]ºèœqKpÁÝ®m·)ª+(‹Å\¤UÈá^ñ@"Æ–éÊÊß5)‘	(_¦ïqº¦FN	ÁEªÇ™ñÐ2H'þ0£b‹øéÅ£TEf\w´ü®úrs†eÔ ;…€Œ!d§:ÎÉ³P,·‚¤¢+º%ý1$ÀCø«ËaÈ¿O¶·-b¡ˆ±2bøêÞImHEÃp‚C7¿M³¢7Md9¿ÉXMWeñŽäAópƒZÊöWýd§Up‰;´‘?x–kM¸y#PS›wXz÷±}Ù¤Ql–¿Ñ;_À5±G8?‚Å§KÝ4uØM­íä–fªÄ›±O®QíÖ¡ñÏrƒeÜhßéQ³;ŠÀ“ý`t¹ˆƒ¡*UK:Ž5ÆÑºÜâ‘xpôÉ¢Ž¦3¨–¨ºÀul	n!,Ée ®¸Ï7ÊÂH_ ß­Ïýø2˜×±k7º })RÉDZ´at-,=v·ó0eÛça¤Ì¶Ï]æ[‹š/Vöã,_;Þ8ñxÚÈ1“Rké," ~š‰ˆ»Ìá"›t°£)?$I¶Þj°¬/…Z‹sËFÃ¯¥XÕ‘”PëI×Xl:;ÂwÞÜÑÑ"=Z¥ÒËZmA½+gÚ«Õ^¬Ó*®o³¬ðJÖâL^Ÿø3úÚõÏàfûÀùŽcü‘Äè6a’òF„\ýXþ™ý¸#üO8O*Á=#,mÞÌ+Ž(t„F¬–9Æî-©€Ó&·ÃÊâëÜG±×%ÌÞ/ÜäNr}:C÷™®‡’‹âyW€Ë~k~nì–aÒû´¡yÂëÑµ´(ˆÿiLÇQVz•Ë•î…¿!­žÑ(48;Äq21Óó@t§Îý*´Dztô÷ÞñšÚÛQððý‡“Þ±×ÿ£Ò;ì{ýÞñ?vÞ½Î¯{ÒÛ}óî`·ûÖÛ;îîŸªóê¸×Ýóºïö¼÷ÝþÉñÞûã£½»'Gï
Tîu?œüáívk ká½ã^¿Øý{¡aõÞövOŽq.ïú'Ý·o»0$èa÷àÝIï]÷Ýn^»¯I+Þž|8&Mí½ï/5Ãý££=¨ ò`àŽògôÒ"à³Ì½EŠË{äƒl® O~h›_ã+ô¸H]¸½Šo‹çMk=Ã+Žaº±­O#üß4è¯¡Œ /M5Û,NÝw˜X¼šÞC¹ZÐèÔÃiX¡²JqÙaÑŠHè·L	ý¦ŸÚä³Q¤oÌc‘½)•ƒ¸€Y	#
*œ®!ÿ·¤RÅ‚E„ÿ þo;Åw)ºçi–_ÏËÔÞ¾Xµ‹Gó2¥·j04{T}eºBgÅ<Sx‡ÌóÖ0¶ Ô8rF…~–ÑÛý-,s* OuMºUK0¶s?Æóåqù‡8ìó@ôËìpñ9­èŒ¢bj¥›ƒ(ÿT0…c¶ ?-äOx8mC¦ÝÊóØç•ìr³ÝÈ”u;¿<dnV„ClÍ-7·yæ:EæÂl:[HNË!B_é¡Îœä«) ’¼Äwv]‹<¡‚Ó‡´–2/«ªšDmø30ÈË¹$Æ{§N½=óºëáWñK²–);Ä¯3vz¶Èß¢x~}DÎÞ¢ñ*p„_Šy*<[UçR8!'cšÙz"ZC§aˆ¸œ@¦¶#ø<z*Ó‘?´ð;JhÅ”åƒUàæ5Ì%fÌ³<5‹eFuT 
&uK2ZL fÛ•,3@ž#†¯eí^OjH<²¹Géæ F6ý³^½xEbÀCGh(›m¸µH"7Iõ.’N|Ýg5ëèá¡En§8˜ìpÌhÕÂÓŠ¹í‹á±z1^ONúâA[¥xcì”1]1ÂÕyŒLY÷¿7ƒ!ÅðŸŸ£Hoå`)ØGÁ~a(¬nˆ‚£ Žx9~â‹qö?6B±¨-ÂHh—0ÛÅ–5dÃzÓÔý`(~0ßC¡hFðN~TæzxŠŸÎ
1×¨È‘æL2Ü‹‰N¶Œ‹ã©ÎZPÒÂÎWøÜD½hIp¼³ã‹Q²Éä° §Ñ·Và;Þ<ÒY³™‘W›Æ!!½e™“¢7Ý£æFv!MËn*pŽ&KØüB,IJ‚Qz¹NŠ½¯ÆœŒdFºõS@F$<ØXl7_ù|ÜIêA†¾f6¯mznãÍÏ(˜iBy´YzJ3HœÍÁ&ƒæ%´°¤²zmW0ÙÍF*¬XÓð%É ¹Ì-Hsá„ÌÙ'ècÎ^F½³ç¿ÅçŸo7U?½€Îåáx|2´È‘´ û°Ÿ½šb¢h’~#·#F™DGÛžDú¦³%$›>Ü–%+Ã9:©”‡&1î;¹Ô÷ùwêñª…ƒõµ?Ÿ“³?÷ü¹Oc)} ¿Ö +ÞÀSX>Sˆ—D?Û–jú¬¼‰»ã;å&N¸êLä:ŽÓ»93ö}zâ;´eëôÉ»ò„ÀÜHFÛ¿€|”„ÄÅABz\óçŸã×*UÉópÁZŸ|iol!ÄbîˆöµUÝƒÓë»£ÄèR—9õœNÁ»È€ÑP—_¾„]ÐeÑ3tâŸc`ª.ÿ¥ÉZ;÷“p@WB,ÝÚË2{^ùXjåÀR˜7ê`:[0‡z²RäË‹7'‡oñ)KŽü²[ªÆÄÑì`â_ýx€[·«<°„8cP!úI+€5÷Ãq@ÍßH}yúè#<é;úDXÂ‘E0tšñè´qVaû@w†ÇÍÀ E©²j™˜Ð?„ôÚF‹,ì1>à>þôu=šŽ#ˆ30"Ð!âSÖÍNœòÅX‹Ûc¬¥Vž‡œ>,r’äN	üé&€ƒ>¿-ÃŒXqÝ\Ðƒ¼b>ðÏOÖ¹ÿGÚŽoÇ»¿ñ=x÷
H¤­y·@6py\Ê¿ßÆ”ŠT‹_kF§E%â
×›ü£pç²xÔkbÆŸoÅÝJs²[t‡|»¤i×…l'aGášÆ&èŒÄÚÝÇ»—¯ ï`z¹¤…f§\å6E¥ÍûÏS’i''¯“ƒZ"QÈã¤`€{:VÂ3ÓÑŒªˆÇÐ@)qÍø”«O¶R§ÝVÊt‘Î–©)e©…&Å6	¹-ÓÎõ ð¤¹H?ÌðÆÿÿÀ†<?ûm†¼Š"Ž‰‡+ºšBÎÀ@ä0fgV‚ü%<ò9¹áÇ¹]W™Ÿ-u	·pÔf1‚=rù U…‹ä*ºtWêÐèÔ:½S@™²Up¬Yã‚ â ¹aæo^hê½ÇVVÄ’wå¼ÖT\ˆd6©e´-yÈ«WHh©Š+…€ajw¡Jæ7c¤2® 7AqMØFÂ7ŽXTºµæF“<°ùdX©xåÑ„´Nßy§<9œ\zI<ØVZ¹óüñ|»$!$€€åšCƒ~®»Gæ…,Yß¬êÆ#s4^ª†Ó&IÈÅ@j°F7?mê˜”=^vÓÑR*ù°S®K•³l½Ð‹]$¿JóüR'÷‚qq?å­²•eYº"kÅ©3VÔ•18=±;„6õý•4À¦í®d’ûlI–nÔ–Ña™þ‹ægÎ™ˆ5sÈO?,”+Üê¥Á
ä=iÓyôÉ²g+‰–öPO=×Û.*@†‹¥d{Û·Úma»¤›Uü`«âÁŒà®Š®ÿúU–™™¥Gh.Ëºt^vaºº"L¡`/’&ÄA¤YÆ˜,!Ø–Üzõ:m¬Ò\M½;—egÖA$ƒ0ët¢<›½§q]:¢cIÒõTD%»ä#dÆ0õc‡bfî‰‡Ì¶%NM¨KGU€.$C-â:´ÁhÄ¦gœnº6¤œo3V¶²I¿·>ÁUÐL†‡¬ûhsP†þìJî«`DÆÄÛ¥ ~Y‡ô·¾·/þ²W`>lxÂÈ1ï$šM8L&$bÔƒrÑfQÝÁéx†>þÂ¨±e]¦V¹Ë?4Òé5Ï•ÊðhÝ É¦wýõ¿`ÀšJóÜ·Ý<˜m+íÆÏTa“`.¬Þ®Ö\)v7ñ¯’ûaü¥aòoßa£‚ãìÞð(Zùß@Ò€pÅ_"	+>òAr‚C»7LÊf~ å7”¸ç½ëyýË!É¸êä%i3 û Šå{À¤håHãÁŠV^F«xÁ§ƒX.w˜~=~ç•¹Ê‡ðŽALÓ»Wœg#[u¬vI‘ébÄáÀV*þµck48¼3NH>]““¡ûIø>ÎAêãÑ¾$,¾
ãùñæƒÃ]úÓpìÛÊª v.†tH“¬†Š  @HäT!œSð àø&"Bw8Œƒ$ù¼ ¹Mfã`.zËƒJŸ»H²~ À\øÓ`Îe1M…É› Å ×ûcÃ¬V»w ë—ûþ|Äk‰öŒmsÉ¾Óãt»’™ÑÆ¤žÈå€@=I±?£&ÝÚ.ÍâpâÇ7`°Ròà¦ FÔT¬L_í’eòÔ•jí‚ÎèN6W±Ÿ½zGÖÕL6Jº#Ø#æ£ÓW³€>{ËX_'âù¬	ÄšU%IUòïyH‰®S6+/Üü¸*µÍþ¶1Êaô½a”I´:Fáu`”tM8= F‘üÀ(ÚfÛåõÂ‡¡?ýžpÊ%ŸÓJXEÖþ·Â+Þ4âys9'¾H÷D*j3?ÐŠ¶×­”¢ðŽÑ2š&£pöäKÝÅtæ^qÔÁ= \ªÍ©ð‰×ï·	 <ò÷ÞÐPet,e Î–G™j Ufr´ÄÿAAœ¡fo÷½·îñ…Jð€îó, Oƒxãy³ÕÞØÜzúìyº¸
å:&:$xç·ÖJÉÕcáUpìú£B¦(¡‡Þ•(T.$t‡‚…1¡=¸?õaÎ¦*<çàðHå¬—Ž¢àÕ8œ»“
ÐžÏqÔyr|…*®l´Æ<ú7jgy6XRëÔÉÜ€×gB1ÖhßúÓì®'jS‡à¡­·Ã¹™x/¼ìù&šˆ6é|HÑ$}RÉÊÍ@¦X«¹útEÏ›H¾ÔçQýF]C·7âPâÀÈ;¢ªÐt‡udOŸcMñ=`¤ÏrM~æ²7ñÃqŽ.'ûN …œK‘;y`YÀ ûc´¤¶iu4£¬´êÝˆµÿîÄeAíÛ3Ìè^>¼üÞÖà_9a‹(4sHq‘[Õ«×¼¼SŽ(ùžúÌtVÈœC»\Ð2æ ëÑU`1ÈÿØè~píG–¶'gw“àw÷Ð«í0iá;ÑXûd¥ýœ¡—¸w­R7=Ó¬mé%ü›•RÆ¨´On¨Fÿº+º²Í¬xý8Ù…„¿²èïèHê•ÿ¼t[Ã±¥ŒìÆŸÉ<˜m—õf¾mèÎ}C¯˜kl‘ƒô¥•­@íŽx_ÚÞ0hL´îm£ÐF÷l5$©E÷1¢æ†‹±àR«w¬XsÂ¼[Î–‰°84c¹C;dïUD”®“B=E3IÛc—³‘SqÆ­w>	«–¾ŒâïÎÛ&o*}uxPžùqì#^VÐj ½QõÌ·#å­SÂbH‘n!’¤2ýù–ü¸ójÞÏ·|wÍtTyÓ3û[³Ê*–(¶õ}\œ6u>‹.<5–Ì
ü¶]Pq”8ºÀþd_+3ÐÖÖ~0ÔNˆ²ëÏÛ<YÃj37ee²úz°RÍ†%L‹óŽ£ðÚôóèÚ‚|Ãáv‰Ls~œÀ²\1aflþ‰ºJ>ÔË(]øãtHÚ"àd´¥ ëÓzj°´éÈj¸nØH¶d4ƒ“€±Üci	¬¥æm¹›(
Í'c2ûêÉ¬Á:ÍH­™Öuû
ÊR°0é%á®)aâ)ã!Èsý|ÕRQÛ­Ø¦D»M{1V²]wèOþ¸ž!á:N%ŠÓ@›ÐÃ„óÂâ€ÙéÙ]ºŽb2®HI‡!ˆlªãÑ‚` ’‹LºÍ3'\F£19æ8C$„±tVy-ârŠöÕ`¹õû<˜¨RÝÝm|Õ‡—áy8ç7°`¨Ð¡ó¹ã‹}á—»”šÂžÂz+#ž6¡-›ŒÆ6Ä–ÉÆíú9h	¬•qQËTSî˜:2®siýe:ƒª=%ŽçHbÐ•4Kðù› ÂÁb¼˜È Çó9÷c†®B¸\5¼º=–º+ÂJžL8™¤dÂmßqs«@²G£[Kˆ^-Ãƒ’¥„l˜ˆußö(9j¤5H¤R§ƒ19»I™§¨s«Z¼SË‡]Z2-`¡p+NÜþmËmÿó­2	¤P&±HeÉá‘
ÕLX®ÀcÂîcí.#—9Æ0—×ÌÇ;wŒ([œü†ƒó—u2ØqñÉ%[Ô LäÂe¥~ñ´Û"Èdd¼†	Ó7÷ƒyx¹8ñÁ`¿¡S.Àc)&å' DÖÀ¯hÑ‹¥æÒñºqìßÔA3Q&Tìê[åcÕä*jƒ„lžfs©êWH6%uŽ	Ì™À‘à,;“ç¾n”iÔuïh™œŠ'prôÄbÆ…ªLq'l3•Ý™ƒ*9cË^Ä©œ‡Òí².ë­P$Œ—á£Ö4,[ôFÃJ6%ââÒY¾ŠŠ‹$éÉ%	º/@ÔƒÆo|WÝCºÒCÒ½k÷Ž¾fy¨U-”NeÃ•4e2OGe½_¢K]g¦e3¥Ò‰Ç—)å‰ÌæP<YŠ,ŠÙòÀÈ2QŠX‚v£xª ”°çì¶ÛJËdhÇ4W/öB³È¹ef.4MÌ¤î©Ks©PŠ ÉÝÌ4*ôcp©§ý „•Nøá£*ËìúñÐhlûVÿ}'š†`vr'²lßòoœ±–9A-+¾[“Tã©Æ¨%t¿MQœœ H}™À¶îJõäÂ@Fù[5…yM¼Àð}O“ØhM†¬Î¶Ö‚~Šz!ï	EfÁðÁå[V’²xPE­-ˆ¯hÞ“f
‘|C~îRãDt£xÈ¤[P«(û-žÍ„‘(/¥sÂ>ÿ#®h– ™ƒ~ ¯¡<É>gO1[´š4ö¯˜Ô%Qóæ`OìÉ«ÅøOúT-¡´Æâ„îÅð¢€ª:(™+ˆ¦Ky·˜@ÉDæÏÙUÒ‘~Èý<Eï87½é>&…³NF ==‰./ÇÁ>«ÀÇ‡Äd=’ V²ïó9¡‘«ˆ/¥šuÇºª<Ã’~ÇXcršCQLK$Wž-;Mí£¯;©žpQ˜LW´À	Ëž”˜£©T ¹•,‹Ô=”mkcX²= µ’¥º:^=i“€—ŽÿRÃzvH£s£ˆ¾’:\Ù’"épÆ§’†7%‘“ìvÌ¤Si´q¤cµÌ¹B¼AZWdŽÒ³PI˜–i¯tÈ¦Ïõ,P0\É´4%¼2¢4ÒäJè£*2ƒ½²6|ÙýšÃì@r~3ÒM=1ºâyˆT|§æ
“þ›¾·mÜq"”öFKõÒk6ôÖN0Åþe#(#ÂUa7Œ˜Ž€,VJåÃRÆ-’XÑÕMKvqœÑi8¬Ø²d«É­Ô‹!…ÃÍÔ]Í0
ân’„—SQÄµ[´5BÞöÊ*XKÓäR©R'çdR&¢·ÑUï’]fƒÊJ†é½Ø˜zy"˜b·–,_ÊØÎô¼ZIÁÉÂFk3$[`Âè56Â5©ó˜û‹ðöuU²¨ñ!«÷«š6ƒd]½@j†‰ÄÀd!5Êmu”p0žXæ­¤-ƒ6€îMçñÍ›p:ÇÜe}ó©šÀ¬ŒjÏŠÑÈ.P¿ÇÁ Š‡Ç¶‹†Ro¬ÉÖF`E|ÑGÜ¼QX2©½4OýN]m‚êüi¤fïâÎ¹ºßF›ã’*Mo-@›;Ð‰ý‹ý_‹ ¾) `éòð¼ê•h¤T©zWdß‚r‰·Q"o··K©³-;d0xÌDƒ¤ü/rXFÁ´œLýÙ˜¹NšS´Ë^‘£;›ßè6Ô°ydÛºåÅ‡¤}‚äÁ¶Â'è']•Ç%µµ¥3=yRëî¨¦6/Ivþí®RøóÁ¨Ä±>W˜
9uò"ŠË¥üñ.RÈBÚ›=¡hIí²Ü¤ŠÌ$§àbD5®Oí’9ÚYÆ3ƒ‚Šp~ƒ¬˜8/ÚÓüƒÇ‹¿.	™”j…>Öšœ¥¥.[<áTÐ.ŠÜhCÛíÞæ‘¤
É»s&?<G„Ag|Œà­ü­õKñÉÞ£ý'¡¯^’OùöN6AŒ¦‰ÿ)2IE6æÓìàùj±îûáBpvô'&5yÐ´¯©Á™P±ã©z©üŠÚXmò|/¸ðã¹êèÔé¥õ–õ°ôG´ =}
¼ËM= c‚„Õ7Ñ"ö£³E®{Ý8€ÇØ—+
¾Š þÿì”dìŠÔº§Œ¹"4it*!œ¾ƒ)!Jç8ÓÎ”ÑôŠˆ™qý%.k/Æì+6É~j›´3&ŒÑàçe˜IM…ÉkdÔÒkPçggØ¢)+á¨£"(¦S]é¾È5–ª&ú{NÊ&Ñ$à„l‚–œ”ÎxG“ˆ4°†¥µWÇÁÜ	É±&)4A§ê“LaMcM¦,o]9‰©“½Ê*"‡©¬Ÿäq+Âžë7Í3ŠÂ#„G”.[…×òýñøè"í½3VèœféÍx¯ÐœÞNvK„Û=mV½VÕkW½3¸Ú%“+t»,E.$©Š	­¹­Œ—ÓôHsÌ½Ê’i-\(ûhKß+*¥Õ@ù‰Öà6BQa¢ªÜà¹’¸ð~vÅÈg{“•/™ŸM39v‹ï6UVHf9±3êá¢\£±7
Eª7©Í6öÄ¨E×•F½Rè°/ûàò¼ŸyÙÛYMƒLü\'((>†g-Ø¢ø¾1ì»ò¦™¯+öXvÿY_÷¨¾‡4Ð}û–KŠ_ð>ç¶äC,Â'ºÊöCdOä˜w£¼ñ|K%gÅ=Â€Z˜¸èÜ]1¢m¦Ž×œûfµUmW7Î*ê!Oó*™ H&ô¨ŽÏ4†Âˆ*ÝÏ7GvEY…_5yÑ®ºTÛÛ&ˆe@½M @PÓXä/ÇuÊ»Õ¤îE(Ï`ÀØE:”HÞP©½cÉã³î¢Tb#««¶é¼éçB¢–iK¼˜J’‹½ïN‡üªs-qšòë{ªeLÒ¬o Œr-¿ÑsÑÑæíÝ3ÁÉ=b_ws}@øM`°·Å.©dÁ“‚ûD–µ¥P"ÀjÖg‹dT6W”Uù¢òAÉz§€ƒ€+h1-RLo¯.—£të{ÚÅ«˜S&åcz¶Hd`«zëI•Ôo.0‘RÒ¡å"€ò’tÊ§Ùñ¨ª>-õG[ý±?èBüöÓ· b¤Øè¬â­<Ó.¹§ó3Mš˜
7„ÚVµÓÊ¨›Å
©TÉ–rÝHÙ–DZº™9™1ñðÁt\›:$|˜­HÚáV•?éRÈR+5SÉ9íT;°†úU\L§Z•š×<“æœÈykR|Á»àz^p/Rdé @T+ÂýZsÙ¡þš9Ô0yÍœÜNêÌhp£‚YVEõ\e´aò#F#6†gBˆËÃDZÞ(Šþ„„¬bz‚ÛúQmfkúøEX¯×9}s¦‘È|Ñ‘Xáä2ª[ö¨aˆw´˜£2C«zü@	‹R†c„ú´-0¦”µ˜†Ü ð{?¦D½ZµžÌÆá¼¼V[Ón)Qžï¯míGv W
iI¦sÙÈiÃ¼Q‡h®3ÚÍV¾y¡¸šÆTÈÖ‘ëjè]|Fr{~pö@S²-YK°tt”\ ï…x~V¯zûGÇ=|ÎÚ‚Æ=´ó'wå(ðrR—ÍüN
ÀA]9¸	Ö<ž}ˆÉjŒC0àDéø…Ù«kK}â’àiv;¸¨XÔq| ¶i®U”€_ˆò”öå›Š*vÄ?íÏNF[`‰Lüu0·Lný¶>º0×P› –<Bk]Bÿ•þ¶˜ úÛb|»‹ËE2‡oý`6ÐŸü8Ì#öõ]ôI<ÞâûßÀ'-ÆFöƒó˜?ôãÁ[žÅá˜>¹)é€˜ày?Q×Žµ\œ³:)—ýªw^I_Í~§Çã¿Šõ`í³ç5ùˆMÉ‘åFðñÑ©¡ºåí9{›æÖ´Yb
I~ÞÌ)£‘ƒ¶& øæa–MècWªðÞ¼ùçÁ»½ƒÝ^ÿT©ˆc=K9”x G%f
öÛ(°Fh’G1ÚÏâž¬
ò|¨”€åÔÜñ@s„5Ä‚ï* â`ãFÀ…¢n`@\ƒÊz€¡½Ät@_ˆW—K¤öBY8K³¨’4ÒùAyüî*.¤k$Z¤–H¬1ó‚ßRE^y ¢–"êµBÛ%;VÀÜø-UJ¼kþ»ð~1÷ÎÇþ”\©>CÓ¡YI6X3‘;{ŽM×Qg€d‚ ø2­é–,(v€âÔ™š›„ •]Jîdp4 šø×TEÇÊ±ÑJyg%4ŒÀnfT1%|ªâQqðŸÁMR…T¦ä`hŠƒlUN±ä™¬9ÇØ)kUv«¨gJš–¨ì>Fº@ëàJŸÈßÞYëŒüäØ¿juX¿ŠC0þý=ŠÿL@gCN¯ðÑC]K9Hƒ<nÚ4¨¼lÀÍä¢ñðCZŸ1Xhƒùë‰Ÿ|Ž’ÅdâS(JæŸ¡}@/½kÂZVì»ä;ú
4–›©Sa±É€†õ	ú`#çNÝE!‚ø˜P|èö¯ËÚ‹ª—ŠÒªš+\\ŠyÓ¤äÐåP.E›§³gmŸJ±P«Þ‹^Ñæ¤o]YBÌj%»íHI[Y­("uÎ€²
Z¬X…ÚF:¡ÔÎ24
REB)bu&Ëò“9A…80eQÕ°Äær0„ÉÊ)	úc`Ð¬ÂŠu±Ãöë†Ü’êêÃÝzƒ{ª>%{±^Q¼&§ç±ôNnýP«æk1 ç TÕàqWNUÙœ+Z›•*ùO#ñ…`2ç øº¯´ö×_Ûƒ—KìÁKçxwB›²qdu\•ÚÍßäúITÄÆ,öB¯VÕ€fmª2íš`´„î`±;ål~ÅbÑS´DZ˜`*Ñ‚ë‹è„$\#ÐtšnáL±ÓáÓ†×ýE°ä Ž€˜^¶ÿ[íú@QžeDº‡	µèQKö„wÓ=p1òàl6O¢Þõ [¤m¦hIWSÔVCÑLBQ:xÜÏšâ’Ô Á8¡§CdÂ”5@¥Zžâ5Mö³¸í>`‚éX’ÊŽ•	“>¢mC‰«I¥R–/¦TÊÐ\á@€eØÉS´Œ¶6q'¯- …ò9ØEÖßÌâ”çÉ+N©Òö$I®	—rëµÑÈÃšfjD¹W¶rJ1óÉ¾¶åôöú•ŠÁ¥ËœWì”Z\ð˜ÝÆÿT>5K:„Þç¶k¢³›%¤«Ø–•&Áz–~­Èc±ÀN…\h“iâ•ƒkÑÒÓ"c åß);á!?áýâ½—€‡@Em÷÷ßÉ…án£©AøV†›?Dý>ùón™ð×_M³Dr?ô‘Dßæ:›þŽÁäð‚äëixFcå¥¹nÒŒ£>¼¥uíÇ•Pü| Ú!Ql×L3„¡}‹’J
ÞÊœû0G•˜SªpN¼ÅR½¤Ö&S–cŠ\½çM¢Z©ÐT]*»ŠÚ.QÞÛNµ ©ßŒ—^Çã®;:”¼?ùìP’fV—‡”tZ\¬øç‚±a!F”#[°@Œ,î‚˜þÒÓZbLáÃòðb¶ðX Å.Vù\°ÒÏƒesƒkrè_[vCŠjøÔëEŠ®aÁL¯Ÿ!6J­_1FàQ'T€@l†lù´!Ÿg®™Æ¡iáò÷ßéRé8Y0Ê¾ôŒ‡×šç®ïý*æÃV8ë^s¸¨ŠÀ³lïO”1È3½ârtÆ8úlæò­8Ì³Ÿ1Œž€_u×wÄ®wt€½<éÒÒlü¿Š$¥&œ‹½yI\(EæAœDiêêj7÷!¾q
 ýêµÕ¾gs£B
#_Vp@)YH}ÞM˜qÅl	'BƒÛ I^Ê±ÿªëW¥Ç_	úVû	£2Ùê¦Õ5!°ŽV¤Ð¾íÿg}1ÇIžüs\é‚Ap5;Ž®æü­\&Ü
!¾„Û:ŸQHìFâ#üÍ‚1g´ˆ% t>¼«¬Ñõ8¹®ýÄ«»ª3È&ïcä}î!(LxsÃ‡¦D f@ Yˆ³#\žNCWÛÞç—Sòbm\ cé­Ñ"ø5†ZJ$èóKaú%bDËsˆ³Ã—ÒÆ}:x»6¤BØÂ½Apì[z+XøÌ0!‡öûfD°4”‰£½\æ€¬ãÑùáâ)ÖjdE;¢&ø„Á9æ¿!˜Îø’À-•<,(¬æ6‚Ò%LÖø¸ûIë·6Ý5îéhB¶)Zt•ÈÏã°¤Zt%uøn×aYQšÙPKÀÆw¼'Ox)ø­¾§  – O¤¯ªƒÄ$0Ç7Šâð/Hw8–ƒÁ¢xUñå(±]dMJ R¥Š:ŒOA<Ð/§¾½ŠýÙIpMúÍjJ¼(Wh>?•ÐÀ¯ÃúÒw°ì^|y.GÉm€éÊkÿm­
ÎµÒìÎÖÏù¥¥“¨ºJ3ˆ°O!¼™dªC›ãÅå.ôÞ1Çt~i\‚ÔÐ(pÑÃDZ?ºîüOx¾iƒ—‡Ž8jé	±HmÛŠ>ñŽ†>t—T&7fhgLA¾4…ÓR•"1a9ä;è „çc®^ mõÚ1Í±Lõ¬Ý¡§Nå„¤Aƒ~dï…¨ÝSèÍ1¿‚p	Ê{¡\"ƒ;¿$'îþÜy0Fe›;l¥x‰\JÍºG®5¯ÑñÀšleñÊŸNƒ‹Ñ»M8ãÔ;€€`Hâí‘rûÞ´î96
ƒEI"_e
Gûû»Ý·^w·»×;<Øõ^“/}ï¸·{t¼ç•ñç«££¿WJUœ`9@U¼^:^sVlW³ñtw£)7¬´ò q”D8 ~fC©×ë qÄØ›e9‘
žë²±Ö·Z?/
[at§èº)3WV¿EW¿Ùaì˜Þû…ÿ:Øƒ×{ÐLï}ÔT–>«j+]•jjÂiùYUÝÊš÷¬R°QÑÂs£…§•ŒîÈí¥—ÞZº¿fÓhb3³Ã£t{ù7&Z™n¥›ËwøTmÂÒYêð)§/nò“'a\PÇÄÑÃ>SýŠÀ=e.œf­€üy[;º
wRgOJoþg=€zÛ-£m{Ô‰wL¶°ön½»òf‘ÊH5š–Ž©ìÝw"Y YhŽCëóûKC¦c’ ,~¸iêðYhŠ\‡;I£²¾lÚ¦Ø´Î,—¨ Þ?…	ûwæ`žƒP[i„Ú*ˆP[i„Úº7Bm-ƒP[÷G¨fÙÕ,½B5›ÈF¨féªÙ„¡¶òjëAjËP)¯|6[ÅpiŒ½Á£­¥ñ(?÷Ã=Ðèa•	@¢¯<Ü—Â CŽÖògg`Ï–‰=7(ölwX4ë_<aG#\ÞÿcÝñ:ZüpL*!Þb:Õ™YË&ÈDšÉ¤"Æ«¼jM‡–WmxÕŽñÕÚÆ|´–uªÛi¼Ý.ˆ·Ûi¼Ý¾7Þn/ƒ·Û÷ÇÛfÙxÛ,½Þ6›ÈÆÛféð¶Ù„o·óñvûAðvÛ·ó³2jhÛøGÚþÏ·î “4›Ÿù3|ÌÀíå	eÁöžS\¿+1—˜R”èá&”‰Î?þ|+ðæ:\‚ n›(|“¢ð‹ŒÕ’»/ˆshÞ4îÜ(ˆ;7Ò¸s#ÿôm<ÈéÛpœ>mê+ïãF1âÉ§ÝäDýÛ0÷o‹îßfÇ{…ÖUý`æÇ>¤jã;¨·°Úú)>­{'ê	ÿÐ	F°…ÖŽðíiÆîo¥ç)s†xb<X¡Ü¦šjSô‘Ôý‰&ÿ½@CªÖ0£QU¡(:x²dZ+Å:Sµ—¢ã~7·cýÚL/½ùž7}0ç¡?¦´Ý2½dõ ZG¯Ö¶rÒGUŒši¯
©“šÛêR]·—ýAPaîû£n­Xþý÷Š~i²ûåêêw‘]ºÝ¸ûïl˜š¬YØÇâOBPFEeÏéÙ¿?qÏ>e›é•ßŸØW`6—+°ùeV@ž“û­@¿ë^>·áðÀˆòhšPîwí‹1÷åb´¾ÌbHDqÅPËk¸àáŽÚE¸žÔ‹ªZ±¡˜–ÅØÇŠ(ÈØ-È¬¬¼h:¾©Èí1ìfàvÁÄDSÂ1ß}xñ+úš÷ó½vÛ:oëòžÀu_tM·¶6Û…wî}ÿó´ûû¶«¡¸‚û&Í—~ìÛ×ß7‚˜ó÷Í´"³oÜÇþ	¤î¤ûvWØ82Ã\íÔdñ²(º>î.ÏÀŽùìÄ8!¦(BÏ+Ç//%iU+³&ï…}zFùµgïÍÁë7=ˆïúýƒWo{^’8zå7ïûCP:š%ÇèÚl»­²Ú±³²d=[»»Š•C?ÊªrÔN¿ï/yÁ­`œ=ðb¸“š3;Zêm>^>›F½áZÌeZr²
;ÞG7#QŸGûáu0,7*„|£¸šk0{Ï·ìB
;­ŸÚÊ¼;oEóêÙN´ÔÛ)øëvò·Ÿg;qQ·³ØU¸’•úÊ»™}?rKõe›wß…ÔþQƒŒà­ Ãß~IÍîA¦M-ÝŽÊ¨w(Þ|üþÄˆ4@}É¹k/þ“^è<ÞN:4µòçN§á
z	ËîT;Wmù-©fîÌa™ë=Õ–¤ÏûŽ·vØ}Û=¦Y€¹ÀC‘ý/´vtò¦w¼féç'Bx ±¾jg,\R¾T[iI®½ˆÕ¶SëPßòSñÜ87lÍ~õJÞÛ^÷ø]ï8M5"¤í=ïu÷Ú
}Ól?íµ{%aîÙpS:K-mÑÉúÑŠ_?)^ú—8<Ítçl¡EÑhHmu-ÁX6ÕD5½‡@êÒÑnšAsRŒöèè#?y3¥OÊñ,íf¨æ¿7L7¢x*ªõ¸‰µ\"6LÁŽÍ=Ñ< L…xØc‡—ÛÙq	”íÒ!œ(K›"d™?kù’Ð…uê¹EŸ(:ðš…ƒ'o´ÛJÅ~cCáˆúù~wÿî³Wp4d]”¡Ìq]5+æJp¦‡åJ{ck©¡\iC¹’CiY‡R|,½ÍÞÓÞ+7ø[Äã™GÀ ´‹<¯óÂÇ ÓÁûñê*v|67Ž‚xðEŽBz4ÊQÀ__ì(¤‡r¥å]Oq=¨†Äu¬¬JÑ‘íT_ø8dx°?®Ã`á¡ì“X¡´£»\4¨²Í‚ÚZjg'÷”9È}øŒ›…u“ðk]<ø"==å ã¯/vÐÓC¹Ò†ò¥º:&Ñ÷ËzÈ´…|Pì·>¬â{CG÷‚èãå*º¦¿–ïM0¢Ámïé&, Ñßko6^) -P…a¶ƒ,,=ÈRü¼îu‡C <“y8 <Ù'Cò!œ^Â#‚}ujTÂP‡£|Äáû¾Èï4/:¨ ÈY«Ð·©JGŸ‚ØG7B­–C™Ó{ˆ¹J’™?âÄÂÑ¯l€ô€M©s´ßô!Š3•±[dO¬W¶pÄ–vSÉŠjôfgˆ5‹µ·Ý~Ÿú9zý‡‡Ýã? zÖñÑþh Nº'ä:ÝM3ÈŒnr}ÊþFïé³’EÝââù–eŽUgÒ8“*^úVP}É!®ôÒ[aTNÛ†Ù
´s­mµ6òšÝZ©Ù§yÍ yn!‰¹§Ñ¤ÞXÚvò°wr|°ë­{¾{rtlÊ4{­çíWE ÍÚo3Õo÷moÕžLËèkÃì‹
Ú>SoOSÆÄG'Ý·^¸Cƒ·|§:JÑ‡`ž=V\‘Ý ; èÂ»¨‘ô™%^âõ¦1d‡4´“Ž¸›)ò'y[õ.:Êõ#žÎ;êýÂKozwoïý$!i/äŠÑç_š}ò§FŸô±­OÂËÃú—t=Â¥VþïÐ”“¦æÊ¨ã‹ætÀ
y¨HðEc¶EÒ›ãs)Ø }}µÅ:d5i[žCÈ„­¬å)Ê‡ ¹^÷ºÐìePh©ÄÓÉ,±‡E–GyžÓHÖ’¨/lÍØ–A€d8ãq: (Ao
¯ü¼Qk6&|ú¼˜	¢Êc˜âMÞ^ÓÁˆ*£xÖ¨={nâ\)hŽCgE}™7šÝh:
VŽåéfíij,QÌ‰úÆ‡|•7Š=è:š)£Ø"£Ø0G1ÅÌQ¨oŒQÈWy£è Œ¡QÛJ!`eÌÈçF÷ü!ÂMT4ô­(Á|K&\Â—Ð€W¥x¡µÒ–ò¼­©zr›Ùp4³µ\3OÍ œtÉ}è%ÚH‘I°þu·«­i:Xs’- Š-DÖ»È¯g’XožÃ++mátû”Ä š‰àp¿æ0¼Ìc•Ò,9â;²ÓTôïhÉ•,~’ Þ!§™=MY (µXˆOK4w¥-Ú”µh…ß…;"Ó í‡ÜÔÃd6öoÞÙÞÑá’§ÜÏ;¡ã,‰>:+ô‘ã+•îLW`h jÙ utÁbVXZ7ßóðÐ¡cÞÇ!¹wgþ¸¤!¹‡4ÿ –‹qÅ
'Lj¶´q‘
‡á°å)iYZUÑ‡8‡„AB`áš/EóÍªè´£¬Ù¯œÑ—U«¯æÄs/æ“¶’æþÞÇàç	ÄnÒþz<LŽºÙV	½;6ÿ”› Ä»I¯»a›ëÊ]üˆ]t?Ì–3ÖD‡€7ÑX6Ì‰bY^¢tÕZs­Ì)è`Õ³Çªùrå\k9@NGiØ­ÜZË€H;DÚ	"íb âpã·¢¦öƒ€I;šÌ;
ö‰J]Ÿ¯m:rÝV«whƒŠ¶~Æ  n2
‚¹×üÎ£â›2o†µ*ªœ–žÐÍ.ÁTèWew ‡Ä¡ÂH|d¢_¥ºHêj0"ÜÊÜIuá1lˆ©…w$Û]Vï©K¬-|	–îvzùgJyö¨‰Ð«üà¼›¾PkO`¦k¸ãä‹²HfÔaÌ†9dÏ£WeSU¯$]êN0a+`ì‡ã@©g1AÅÿüŸo¥!ÚÝ?{˜Y§‘‡?b›4üä"	zu:/ÕÎÁçZWó[Ë¹Ý03WCb'³ùªh¼j¶Äô¶añÞy„v6”Ãð“7€( bÛ¥Qí"ý^Œƒkü§Fv‰ÜýÁ$©Ñƒæý×"!´Âÿ9«=óÎ/k	èÏj›Âyn}Xk]Ù‰dX‘V£Aø‰ë9«_z)„XæPà¤×š[²õfC6/G™5¸ÉuÍ_Ì#or^ÛPz"}½"@qéV¡—íÛÖ³;µk ít”ÊëÊ(×É0õAkZ©†`) Þn.5Oiûiûå»ˆ‡J@´t^røb}ÔÒÚ9Æ·I…\Cµ«Úd(çK:-½D,oš<=.CÈ6õQºr-bš0NHýÅúÌ1Kå=2UÚDS1îˆ\:©|Y–äëôUæâœÐôl{"ÑKï¹S?%-œ‘?òä¢=ÌßúGïê˜5®Œ_ihXå½Þ~÷ÃÛ“žôŽÿ¹×=éòÛÎ
æ"zÍ2‡²žBl?Ý<Åì$IK‚9å 5³GØ¼Ú8«s'1€èF¶,‘5ÿ)èŽÇoeu*¹™rÓ‚é	^“`~ô}È,_Ê‹­Ð<¾1¤k‹äZò·a"÷ZônË7›¶Z—
|…3!­8VMa‚*¥NÅbV…—ñP¬Ë-ZéàDÄ*®á£|ÕRØªÝeg¾õ´¾YJZ1Û;Û8ÜÝÍ¢«Ä$£Aá™gŒ-•®mÈ§¬æ™ÍZ@·m.²TÕVÑ2QÏ(o¬É6pEØ	x2"\kC@Ï!¦ÎÊèL|ÿI>c_&m°gòô¯üpNnñW‹ñŸ°–­rÊvž«ù<ža”oïôwoüäÃÆpwy’2æñV
ùã ž³°]	¹>ƒ Ià¶½AD3„‹RcÆÑbø¤$j¦â ³†Èõ¶ =zÚ¥7æ8™ºR›"<oàÏ#¯Ä±ž|(}AG1¾âµXÝ©‡ï¼h€"¸¡w5"ÄŒî9ºŸ¢³;šÁc,‘šŠ÷Ôå¸3-þp J®žr×y ò*L"¸ŒâùóÊ¬*Ÿüñ"Ð—k—c*½jyÖËpÈÒ¶³~•{ì	wmÐÐºÒ4À? ošðgÁ‚Ý£Ë8Û”EÂU|Ë·h?6µ¿7h8EÑf˜÷¶¦z"@Ë©ÓÏ?zŠå66cZrg6µ¦ºªT„ƒúØuù‚¼	½ÝQ0øS™Ùh–ô	A4<-­ KãŠù«y	3/VfrAYK÷qi¶¾xsŸ*|fXüi™´`T,Ã‡ÜY%Í0"âÅKì’<QûÎJê¬~ìÁ)êx= É)¢†°åŸoyän
êÞ}L€?EL «I
‘fï*uðß¬âd˜F„’(ê¨TðŒžYÞ’Þªˆ,Í°&¿^¡²º–°¾ä%ÅÖ
œ\@×¶ÄÚà™ÓivÏ²ñ”æS?³Õà[´-k.u¤<‹ƒO–Ô ü@ZÊŠÇF{nä‡÷I'ˆË8uoX›KW¶¡¶iRØ²¦ÖÀ4¸:QÛÐˆbÙº¼h5@ïð…Ôé_Ñ‡Ò†ÅQš“Ë¤ge‘—<_õ²·­OÇ r uEtbA]ŸŽ¾*Í¦¤.‘AHúj4xúKõÌ;èË^1÷¾]î‹¥?+’Îñ6ø]Ø˜¥ñ£æe—bÉÅÛJ•º#×ëî*u¡R¾juÙ`Ò‚˜ôÐŸ.ü1†hÃÎîUÝø³§ec@À¢'<ãAòéo‹¦•HñÔÁ"†9hhäÉ"ÁCÌ¯‚`
m@x?Œ ù/ÜI”üã¸¥ŽÛÄ ‰¤~œ¹Âg.I¨´ÎYš]¾Ðþ®	ö‡¦?„ŒÀk.f¸'ó@~£ÜªUÈªÒj ½µˆQ—»©’s¢LXK»¬²JáŽò8 |Sµ¸#ü0ò×&ÿ%êé,|Ôj’	[–…1¾(ìqU¤ÀN:úXÝé ÅÄ@s“šÂ´uBXÜ˜Lñqb»Ù­+A")°œh\Tëø›Öí¹ñ·Ò˜ÙŒ†²x¬:ØE1}µÅŒþ·S=
±-GÒªTXH‚å*)ˆ¿dInImí¬,I‡¬Jté})<ó­€š$§Wá[8‚PY—û€çªÐù€ÀùræVþò"Œ¹àaByr¸$âÅ|„æÐœb“"!þôjªÎö>…ÁÕO
ÞOI&ÀâvSÌ÷–-h¾^iŒ´/àR©Mlü:Ž38jÌÅÓ!—ðœ¯˜¢ádÞi˜\—&ÕK¨‘/¥Ž¨æRU›»?\ôˆ{‡™8+œÖ„žçžð´‚iâ¡¨õç±jF ÚmýøÏŽxð¬ÑX'™åÆyÚ„ƒWŸ¢1ƒBî¼˜a™Àxhû¶µ©ÙW€SøŸ7˜’¶Öðf×µovSkQÛˆë„ZK$Á$4-&¶x×º…ŸÅÖ$=Ð§P>oæ‘ÊÚt<ïvL3“ˆ,ßÚ¶E‰¦ó¡jU1å/£¶Ù2±›;Œ•€–4 H““ØŸ&¨ÇŽÊùªƒ[Ä"¡×†RÈ#¥Ra×Âd/Žf³¬&XGõ÷q4‰(µi«Ì_[jsvØkò×CŽÕÙm§—„ u~é†¦,4ó¶«UlBÌñ™Í¿>…­¿ÿî`M‰6Ã‹Çþ• ¸ËÎ0bŒF­'½r"ù-fLT¨“s²<ê§œ©éóôöÿ  ÿÿì}ÙvW’à»¿"ÅqÀ6 àbŠÉ¡%ÊV—¶éÒxxt¬$$r"áL@ÍsúÌ7ÌË|ÆüRÉDÄÝ·ÌH¹d›YÝ‘y×¸qc»q#üp>O_v8™¿þU´g|f_YöÃìŠY§×ÙÕXÃ}{ŸÉP¤åŒ{×Å4¹|Ì®¤Ð;Ç6`X[Üd îÍ•ŽNÎçï‡ÙÇ$ßuˆªõš“Ö)<E›ØhÁ"Æ-W[Ä×l÷Óé5Ðü2r½µNa"äT›÷7&u'vâPÐÝÕ0&Vç¡y{;  ïGèžØ‹â{­jÎ·ãá|½%8ße:n_µO{½õÉ§w‡s}0M?Ð‹xÒ^ïl9µ ^)94”HXÖPÃöt¹F·'¸µÎV·p—É ]6nöça~yóhëÎAb7OÃÒÿÕØ	¡ù2ÌÓ.µÆ¤ØhÇ8Æ‘š4š¦&c#IÒ‡uãR`Z«ná¹Ãûn9Í­€Xv9à>:^HØ k²Ùô	Ú¢÷xÜ•\Eø³é)Ân?LðÏZ!c{¡;ú% zÄ4Ÿ6@5ºYÅëÿÆíA¨‰Bÿ
ð	Aë÷:)"-8¼#–B ÞnUOàÖ3‘béÒ3‰Q*°æÁÞUÎBt~›YXþìì•®´ÐD×þÍ
‚ûl<™
ôokf{óÓõVÔmá•¶V´ùÎðß{eÜï¼ŒÙ¥X+d	•-¬¬ø›Áùq¼¿ìù´À¨?<Pá5¹…~½Ì¦¯ÎÏ©p¥0»ÒŠ/ø
vá]?Ð{ì'£ÑI:¥àfïß¾é›îllœ1ìñÝˆý}Ã7æ×s>(øFy2° ¹P¨ù2#›L‘LWA²ûôˆ~#@8"ðýÕUÒ“!ÿMÚÝ…‘óHt…â—Lvhk 0¨ä† @âþ”Èy64¡k­g‹‡ ¡­mr	ñ¢M’'Þ®O]Ï4EÄöKúx Â6ðŠ÷;U}‘ Ðx”(íûË8‘”ÄÿöÑÔˆYt÷æåÁ1T¥Ÿ(GÑ –A”Lò=…õeö‚¿Îñmo.QÏ_*3õÞ¼™ºäxÇ6•¶ÐRçm­(mEè&Õ·ÃŒÒþt»b~tœ1$f&ø¡0ÝE±º—#A¯FæÒ;V-ýÛyÖŸYÓñ ½Èˆ×@5½ã
~mS<ñðe*“d¹~ÝUŠÑ:F(²&9Å.³«dÐðV¼Ñ4m*U‡*aP×†ÛK]¹w™g@kÂá9ü²‘6	‰'¦®6_iÍâiY‹ªPWx+S«íMK–aG	A‹PYö÷$Kq˜íä#Z	%(÷çÜ—]DE¿ÑÁv+@{=èt×mð|»þ›Âæ¡6ÝÏ #z.‡Êwn”wGÆ«#ÝùäºZ‘Ýmó—%Õ¹m„%»*™î·”æ<rÜë“Ï&ÇywBv›Lÿ¨²›_jËkÕ’ZM—ÎJsø%´Åd³*©lQyLw^ª#“ýñ¤±°’À”½¾©Ë·LIKÝÀ»—®¯‰6î¥+*÷ÒU6Ò•JòK®jËT5’ƒ|™Q©ˆRüqE”Ò“µ’ &î]ÀDUfžªcšªg–Ò…ž’Ì2!£Ô¢©EÅ9¤š†¦?žXSn`
—6,}1âÇ $PË{*8“yXóì–Épo›6‹3Æ¤ó–ÒT]ÖÛXÿ:E
çåUï9Î¼Ùlê¾!%»Š»ïFkHÂW£‹6ÖWu–ì1«ùŽ¬‚ÎÐÂ"âèMA nWèúìYNanDíbï~0¡ÔwnÅ’£ßö´ÈLùåó2:nFö|WrIy"/‰g›˜{Ê¨ê=+ú#29Ob°ÏÈØÔÅnƒ¯Ýó1ëùÜ|l™Mùçák›µø§+ŸA	›Š-9‡Hz­]ä¼¹‡6a‹FŒþv;ç¢i×ðƒ8JïÎÑëIý}§& J–jç®àdSg67+¤MÏê@ÑôæÀ´âˆXCAV_Ø‹ðÆ<1‹y)¯1·ðåEqa	Ó:«æõ˜–+èýú­ÏÝy]ÿù×´dV	–ªè²~§¼GŒúý7L)Å¶õ9–ïÈ•2×uÃ»®Ûõ@k¡Ÿ“!û1]Aak?4ÙŽàe‚#‰\âáEâ¥íÎ¿”`Tµ‹]¡´Ìï$2%{ç"Ès!Gª¼î²˜ìN®˜˜¢¨0U¹Æ†ÑXxìÌ¨”§ƒÄë‡æ÷)eÊÎÊ µ²"™‘~V o·ÀXÍ@»sŠ(Þ9Ï³Ëæ<bwåv£M
´ßü¥¥U\æ6üMfð1†+Ý÷úÕšc%ã1”¾ë‹ïÓ+Fµê_Kiû•YhoZ;EëÁ­Jô5Eó
¡cšyD¼Öï•ëùmÑØATT»Îj	¦ÏÆSÄÃPèàh±ts»Ñz+b‰ÙŸ"÷ýºœ°2çýÒÓ®Ñ•ÿŒ~ªDdôS$£\´úvy5Ž®Râ¤ì›råwäVÅ]Ü¬+“/·åyj½=±’zÆ$
 Æ¿Wsÿµ ¢ÿ`|•ooOØrðµ‘ûÎø¢e£3ÞkùáŒ÷2q½ýJß<Dñ…a…c e›aOä£–ª‹Â3T?hÊñó,DÑ6Œ’;PRŸRiáo·VµY–Ý†¢jâvQ1uñÞJàÂrî) #š>£xe&¸yyKk¥Ð84S/¼x*@Êz±mÖOšÍ¸ßoE,„ü}#ºn1›2kÑ¸C.0W ­†³aEoÞšH«c¬Ž®
W¢êZ®•\–®\Ö¤ÿUT"#û=žB¡šyLË§.£l=lýƒqMÚ áv'ín¯$‹ïiD€nâ“âc@	XÛQ6 :&k(†1ÈÂíâÒ¥Ô‹²õ9ˆgía: H U¨k]ì·FŸÙhƒ˜fP+ø•É-Fðï°ÝæLÊÛV>·=Œ‡\:–’§4@¨vŒ\‹ä‚Ø¶àÅ›ì23‡P<N/’gÐO?Y‰Šé5ú`Íù*žÌr­²±Q4¢ûÐGK1a9â8¹#6ëLAê–%åÏ0gR?FJEÙ¹ÐªÚÇ=×ž"ôa)bÌYÏd{˜÷†¥²$Á"z“ôCrc€Ãª—ö=6Ñ'"è¾n«Û·	¢Lûðõ:›EƒŒâRcÀ¾xŒ§0“"|Œû@½0i`²x@iG§Ã´`cÉ³ì2â7#;¦Aødú*0ž¤EQGÌÉbTÑ,’³¢¸¤˜ Cˆ<~£ëˆí«Ý×0E 9R’ÙhÊÒhLDŽ¢A²ôEñ ¶zZÀšL1ðIÆ'fÍÞS@Ë¦þ“²}’ŽIqs¯éö´¨:õñŠ®™¶ÅZ-ÇªLyY¨UuMÍHË"¶RùÛ†]z!NCu…Û©¯ÒÐ/%¾9JøË,:$V=F£õuÞ¯mó³ß¥2ŠÁê³Ë‘ÄbrZvƒ%7Ñ—Öbw¨³¨³iåNEc.YA]EXI†¦,ÃrBn–ò?o
>^õ¶qÓeÄqÖÖ!aÅß ×ÎF˜›Œ.ª™I1„ÿ¡í¢_ôèÕøg@Ý_¿qö€çÎeâÔ»¦ïÒ ßE}O~¢Pz"ÓÄÐÎä0+ûþ¤Zvö"ÞwõÖ·F°e09ƒ`PÓrÛ¢‹ñP‹¯mÀÿBDú°¦BÒ3%¶^
ÝA´ò7ŒÉ—_ žÃ6þ=3µ¸éÅTuŸ5Êðåµ.Ô[íÕüÑB&Nx#ŒÌ‘´gúÏZ¹µEËŸæ-æØÎBWãŒ¬Ê™Á² aD„–&¾Ú—XU§X†Ûãx“NºöÜT_@ÄltqŽÞòe§äôi’3ê¹ëaØ\-ó)3nÛ´É™âZå©NžÞ°Ci $…×‚w1ÊÎâ¬¸0­y)è˜]fËûµzÝ3>—=ÇØtÐáßXzÆc_ÇxU^D·ÑÃÿjbV [JîI‹Ç°Kþ*­’ð—2ó>àcð^C– ÿ•&ÑÅõídÜfozø¦7¨7øf#§7Íé°qCS‰dGH¼š€2Ç™Õ²KÀ4‹rÓ©}?S<7^“jØ¢
ß“9hSxFÃ¸f·gº K%“é•]R6»k½ˆmCÂçkzá9°+Ý,›îfáÃOÕC #—:º’ÉäH&Šiõ¦õ-
eµ; htÕlµo“ÄøÉ|å½÷>¦b8Ë>­øÑgÂk{óvÒâ&yö=°p
bü–lÍ2Ù˜¶´Ò[úÛ5Š:|>¥p'î(wÕÑŸ•wLüSªä,+â<mñs>ŸÄ&óÉs;Eû-.s˜Øè;ò }ÑÍ³*×FãqêdZ‹öcÌ/×¯y_A?òFy´Fª†@æq—¥«7½Jõæl6±Æûd”ö?À6¡]R$ÓãavuˆBX:½~‘â‹¾¾Ã‡*Þßy¶{â–i+ãÅ¹aªQ>¯CW’©M·ŒÙ8u4H§‚ylzh7Ë­j­$ð- NF%fSz“`æàZ‡¹qØtõPFäâ¥ô*bêW¸j÷- ^eè\Ð˜Xùx’'ñ€¥Ë.ƒ¹nrcð¹ƒH(EóIvô©ºÕŸ	ÇQ@B³aÌYë ˜—Gt<	=Oóëa u|SCqM“‘ çï¾P?ÎË Œ6Æb«ñ¹†A‘ÿšÜŒu¯%çhMu ø—›×Ð:`Z~}é18Í¯ö°®]L˜ù¢UØé×ÎEù¿§yÓy²ÕØv3ukÔ±7sÙÅgš‚Êq±Ï”$Í„IÈw@X`…x–y:È: `gÓ"}6¼ÇWtìî=‡Gª˜gã“ìâb”ˆÞ5T@wïiñsçGãB8ßÓÎlÝMMüP¡c ×"Ïü®7D<^‡ØÕ¼&ZìüZØ(yªWÿóQeƒd
1ØXÏo}±ë5‡,G`}–ŽG?‰•§v¨‡z$âŸÆbÖÎjû8š‘2‚`:7{èÚÜíæðÚÖ†¾»9…™=B+JC5ûîÆÐNä(ŒìZ­8=$‰ýî	~À~b¬^§>s4ÕO¾umÁ¼Y¡×u½Dçî`¢GÇx©ˆ¿MndÄF$60Wô´6 £@Þ¾üsÕ)’;â¿uÈ<Á¬Ì	ràè2ƒ?ÙìD‡ 7À.¸õŽ¢9‘šÇ  u¾p·.ù)A“ ò2Ä
E‚Ü„õÁÐ½!YffòAs èTôùP#ðÐ]ÆX„ øî*Uã<>ïëC&éòßwÒ®»&úo®×º å˜€r§á ]`Åòžˆ£ßb’ŽÅî°v“³;¢ˆJ8iÇ¢ àŠ:”èh"×È+8¨c®!ªÃ-½¦%Ê6j/{ÐÅ3óiÛšûÛ>:#ÁQqÿ®„NfÆNãñÚœ>ÇG=ÀoóY¾þE›Ó³=ý0=¸õ^bÛ“‹èõÖN÷€Ó=§ñÁ|ò²O{G`wß…äË;¹T’¹ÑÃŸ¼ˆÓqD'ãh‡¡¨Å¹û$ä€ {ÍuOxû&‡«ðìTº½ô4ÝF8Õ¹«¬‹CA?ÃóË³~_*m#¬ìcî^Ì™f³‚6!¦ûEO©ëd*· ìÏ"cþPDJÎ²ì–˜:–‘½b–¸©ÖŒQØˆÛS ON²IÚ/è^fnŠž'	hAzhGh%»*·•ºQ4ò°¸O‰%#ß•’ú=ÀüÕ$—h¨’ˆøôSïÏP`Èù!¼¦rß’R€¢üÚc7 =Xzµ¤“J-/m÷ŽHÚ;ë¸]R»ùÄh8¢_Ž§÷!&dµ7”nÕSW$üŠ'•`œ›»žÚ¤;@¹—+ÛáÍ…ónõÆmËççAúR8'@;ë)x/¬ùÏÝ9â™ùx
Ê,èF§£Â96˜²«ÏŠ|½:ÒªCTÑp‘§úN½€	_vÕÏBG`£XTÜ“³?Ëƒ³8f¼0­Ú46zˆF}0§£kr`;ù|Ø<Ç‘WÌÈ/ìÍg£Yâø¥zH/>f^ƒ¦ãÆuuÅ¢ÜüeÕG7«Ý­`°}ôNèÕÈdç÷P«U=w’[Aoªf†¤(Mø(2eb@º:ý©p³!0³°q#Ú6m_rÆvüÞªe÷xYÎ±w>cÔtòò£¦ªJ–ccÓR·o)øï®´-—4ÂÃê¼"b¡ƒC×[£ð·1§ý9[ÿÂ«ˆ^S‘Ñ°wóããUR}v`¿£CéíïƒÔè)gjP7Ê¶Kq&Ó?ÅY0ê·ÛÜÀÿÕ”ÇZû‹£<¯O–¡<ë{ªó…QÿÍ› Í9Ôî7¹Ôf!Ôf)"³P\·1‹ÄØ­}9Æ÷‹#0ÇKù÷Með&IUIV U\ÀbR¶¾xÜC¯·¨†\à¥ñ"ˆ‡(ñ÷^©ÉG×½
®VéZ2$/E).1aA¾RúJkËfC_ø[Ôrúi¤ü¢Jí§â–m&’ßàMì2:ë±ŸFñ¯k- 
‡ÉCOuáo_‚Zè~˜Ä¾T½ìöù?ßV[›—ËhÏ´ÿ#-0ÖÎ	ž…F?à5*<µÓ!òçÖ‚V…ÈòúU×¼[›é"$K3—ŒòŸÐª¼`l»–U… £±a7f.â*9
Ù€ÄWÇ°u÷æ½›ýçIœã1ÿÑÚtè•£Ì9
Û`o™!—-¼XlA»4CcáV@±Ùì.ÝÆ6…¤å	”ÛªÐ¿{Àl £)_É=‘|(ßÄb‚ÿg‡Qí@!bBúH§I6ž±àŒìÜ»þ,7o5Ë’p¡áã».›¦ŽÑ‰ iNV¼dnf 15_›G…¨eý­ü˜çx/ËDü]VÚCb¾nb^p)VMC·?•°ÞÐß«´D@R‘•wèQUTþºÂ—›(EOT/r½×ÙRT•ËÎÊ_WrÝuèñì¤•NUË5ÕpDloÀ€§´`ÓÌ¤_6
Å5*½€)žªÄâÑ½'í@æŽy0¼yÙ|äÕZéÒ‚ÁÀ™EÁ®e6µÜÀÚc$	~…ä•ƒH¢2Ï©É–¦qùEDO’¢Ÿ§tºÄ.OEþŠ°úƒ¸Ö¿jÞWD×|R+Ô J@¡[u:^íF¢Ã×&ëT<ð}Ë<¢g¡þ›·ÁÊP}ó«4ó°x¼vRö”˜‚ÂRÑBf"K¸¨-
…n£ÝQ\qa2<Áxñ5£/mì¯øR’YïNFîÈ¼²ÿ68‡€<ôúä·’‡IÂë6vgÇƒµå¢É´\.ªŸ­¨¦ddë¦÷Òèë'÷ÒQð©!™™zs	Id«¾—î%$öÜKH÷Ò!!ä¡ãúòÐrbPØM`Q!hi÷…Ú"Pñ[‹@–ú^ ŠŽï ðSC ÒsúþæâÏñ½øs/þXM‰¨ìÄd¡”Fú¢kÉ­híS¤]˜?™]‰¼õçÇìC0†x. ÀËD}e_žŒ–€¯j™¦ÉØ;y«‰8HÙ*¯cÄÞÍòu^BbÃÌnÇßHnÓ—G‡ù2ró—:™Eiá®«O„½{/·ˆ'·\tºKiZ%’¨28úŠQÂþñÙ?˜ýúÕññ³ïŸEÇ_½9ŠÞ¼zë•¶ò€Zä”øÛ€ìefS\ÐµiÃumªõ¥…E?­±c£ƒ¡¯ìÿ˜^Qà~,$)e4eà{ÏØA(_Øpj…µ§Ô“â”;Óª£˜„[+¤è:t,ãâùÜ’6—²k¹0õPOñÒ]Ï„••¹z±£]Ùø‚Ò»!¹·ÃÀ®¯{ßÒõêËJ‚þYßj‘´J Ã!âÏ©hÑäÛ›—üùL%$äÕåðÊ ™Wí\Ów«*ãÚn4¦Xò­èl³±äkÑ7‘H:q¶ÊnP6Úpþèé~PÛ@½­Œ€ñÇÛžÂgšŸƒM¦÷,è³² ÊS]?ªs|[Vd£Ý³£{vô‡aG%ûçž%ÝK:®fIp¢â_Ï‰êŸ§ÔI|ÏÚ¬<¦¨wH±‡û-4,.WqlççqÕg}¥nñ£’e9\}wÏå>—+=ƒ˜/€UU·ŽÙ8­{¨Á,Ùº¥[œ¯¼ˆ?Eì¦3IUœ–BñÝhc½³~‹óÒ r—ûo#>ÜÕ6O8êhÜšfÿÁõÏE|?uößØ_FçÀV ‰yæÁ{½âwCqƒôö¶qðùBè+Q×Í2êZN[¼ð1ÃCýªæÂ·Ô¾¾)P«ðO©¨}†ž¬KÅŸ³'›áû{òÂâqm;…MÏ²ÁuÍ{¼°_ÓAÒ¾XÛÏxË.ãº'ÁÀ`Vý¢ÙxPë(¦³FšÂŸ ƒ`$Î†‡h˜uŸ&—fmöêcŠNo}Qò€"	_96Úþió|ðZûTš§ãu·} 0‚ÒŽâB‘OŒ)%Ðñ§ú[…CçÑ_‹ËÑ1tÌkDÑ.øK3èëNÝ ¯gí®é3?5&3(Ý!0D¹nñ´Ø.'|å(š.|æñQ…ìgãÝèÑ‹8/´H×kûÑM+Ð´¶¬¢q±°¢yÂÙö?’ñ¬nãƒx¿Ñ:§šg‚Šêà§"qF¯µÏì7MJ‹½êZqTX.*Ñ¡¡ÜÔÜp‹ÝÄž´·´ˆ=Ë&€ÇÀs›ˆ=G¶³Ùmõå{[‚™¿'Nû5üÆòù²>‚$óþfŸ¿Ã%	†bªq/(sÒÏË•}s©Ž1Gºƒ¾Ðvµ²¯‹hwn øex‰^ãÉ Bo˜r°ŠŽÆy6Ëþïm6Ãá¡§‹.vÁáI{T›°Ÿn¼DÂ5ˆãqƒ55®ã”V—SE´xP±èõw«ï“q,êkg½½ópIhé¹PTWâí¦¯3­çßÈgã1rnØ·[ío—E07¡E¯\Põe¿+@=I>&£Œ¢¦5·P›KJ&cóùàZ È>W :‚mrA€Zoo/'Êuo‚‰^¹PJxwÁ¨hK¥!¨ ³.˜}I?*@ÿ½|k€›êa‚Tß­¡z¼Ä×Î4{š~JÍÞêÀ¯pÒˆ8ÉuQÀÊBÚ	ÏFùE"J¬¢'k:dIÞ^çIdZSˆæ}_†1Û.æl'œr”Ž‹dJ·ÖKÒ[
Ÿ;·eôè2ÃÑv°q@)‹øµ7Ÿ‹K » ':	Êxî:£X×-–|J§UMéñÎŠl4@LPW
Ö6áwÜÿ0È³	Ò÷EV«­º™[1Ø°¥È®ÝD YõAYƒ¿:·Z‚£.ØdÕ.ÕóTsÁX¯»zÊ–ìÕa#eéå ¡MÛ Ue@­©£•¾èþõÆ*´4éw{ç»gDö®Þ¤éy²ßy·dG¤3SRŠìÏ¶l«J Înù%ÞO{'ÓºúØ³º÷`7$y¶üÎMÚ…(>-O*<–‡SRb6Æ“<ÇÖW×ä¡¸vOª.ÁÑYa	}¼¬z®+™ß­…ÊQ,_»³s“{ÙEW„æ³Ù^b6V{½?Ì)_fTÌøWñxM3™/¢û\_ZG«ùÍÈyˆ¢ÔU
›Šgò¦H™ƒ´˜Œâëh:®Æré÷žÑì–Œf6^d<ÎA”‡ç×±û°|„ŒÆùŒÁ4§·á-ì±†Â.]÷Êâ^Öï¹±¾îÔŒÔ 2Ÿ¦E£­÷ßš§,C˜{´ê“ï£/ÝÈ#ù³«-f¤Ì%P’Á6˜Y¶,ímÓ~2ák+À(Ûd\¿äÇUåû6¦ÖZXŽgÞ{©åÈ7¯cá“*ÐÈÍçÏ[ÅE+S'ß³?«sÜÔ¨+oú²ÏúN·½×¼ê3‹™8L$¼)¼š‰BKNR$±y´æhšžbÞÉ/Z"™å_ÉSÓV\ŒL{ì£¡šÜ‘bbJøÛ¶„Z¨È’Ž£sà3øï€gstrv.Àð¿°HË$ähA™‡íÓ‡ë‡ï,ññ|½ÓÁ ôrmVÿÌ²Kø·ýp+<1‰ ½µè1EÉ‚ø“¼Ö=:©cÝ¿Båaˆÿ1DhÈ¼á
ÖªD*sy#6LøëPàd=·hoÝ›[´ÄüåmÑ{—;¢9ùke_îc3³©O<¥ž½¶:ö':(‰þë?ÿØæ*Íùí,0%ò@4¶çñ¨¨Èc{ÕÞäÛY‘,QÝÉ¨ú­)G…ý¸8·\4Ãê£ÿ!Î^w<XšBµ‚rl+rtÝŽg ‹‹sºme1zTôñXì,Î	sCy¯`†¡°~V«G^«áñ$éÃz –ÁÜ·H÷ð_Ý¦ÈH« ÂäQ÷‡QÌ1¤'S:aˆÇÄçèŒ¤ fª4»w<øëŒËŸîé'|n

p5Íæe¤šÒ¤ù‰—y,fá<l‹¤`ó¸ìÕÊ2»_æ@g%ôxûv•hOIb4üYÙê^Èdmw˜÷ñ_5ÿà ØVýäj—Hlýicm?›W³ìA‹°VºåWJw¼JiÉk¡B1ú..wå¯eB-|"2'|‹~_™›­"ŠQh–ÛÆ,wÊgù'Ž’vÇAôçïYœ³fÒ¹èDŸ¥ÿä¡üVk‡9[ÑÝÓ\O˜e¨Ìã¼ÊmÒð^_Þ%½lå—|Z‚Â›
/–	T6ÚÀæ¦]ÙÇpŠ¿m<ÁÅ.ëý¦;K%çä÷=0Êäî´å¯Ø-rÉ®lS9ô[cMu-ÕÝy›û‚7áoœ-˜"U8éÈîåº9ÒKeeOž·×'yYå{ûÊË¿iV…;”›½IÏïåæºr3Ï‹p/7ÿáÒ+˜²³–ä^v~¾—ÿ²óaÂç^~Ï÷w$?›ùî¥gGzu‹ÈÎ‡E‘Å%^uôÌ*ùï¿B`þÂÓnÜ¡Œ\ÜËÈ·‘‘ïeä/AF¾ó¦„¬¨Õ½œ|/'{Ÿ?›œ|GÜî¥ä/EJö‰YÖ^þ2Ä‚[‹ŸQ`ùZÂtg\.Ë þi™îAÁäH¸Mp:+ûŸÅ9Ìet­q½»žÒmyÁòûðr¿Ûðr|$fæ×€»•k¾s<oyK:\ÇFæWéüŽ<Q'Ÿ0â¿÷£¹8k÷0ô;:7VÏÍ¿)wkd\Ôóô	`³B%î¦ÁÆOÅ×éÖ4‚$z“ÀîÀ?“,ŸFÍ'Éäh?í­?ÝŒFñ5àôª{§šê²ª¬&•½¦Å«I2Þ£NQµ8¸ Y‘XêTpU„ÅÚ“aµ´o¦åhÏ6%©’ÊwzO÷£v[b>­%öB•„ÕEÕ£5íÍµZ‰xÔŸá «PÈø­Êqú+)¶øÂ·¾\MÛ`-Ïgcf||Ã³,ÎÿH“«æù—€Æ£â¨Øßlðh^:}‡/´ñâÏ‹Qv¸Ë.ÕÈÆ/ãé–ýz,ÆÎ{«nÜh¯yg¬®-²¬q?…¦Ð 
ø--gÓa–#/{SIÙP 
Aœ¯+É8ø˜¢®c0üwè‚kâh<Móä¸?Ì²‘ä¡øiŠŽËIþvÿà³Žïf°Âð¯|ÑÌè€XœK`H#:D›ð‰ôãñ³'_ÝìFÆâìFÇì/V[¬¼fñ×|Év…µÙY¹
Îè®Ÿz¯VÞ5§ñÙ.Œ"‡2´õ>féÀ¿ºXÚ*â,µS†X8ú	¹"8x°ÊœØ“xìÁl@^ôÎÎÆ»9…G#øµ«Ý)´ D2ï8Z‘Ý\K^–£°ëÅSsÌ:ÆÈXÚ*$0±–½!.Mƒa§>KàƒCõs_«¡ºô6õÏGlc¿ºaE™Õûù–ckœðßï`ÍŠ„Ð…3„ïTÅ<Aé‹R½7ò§^íÑœbïT5ŠY¿êL³‘äy–7`jð"¾HÔäøôä6åhÝð?öÕP>óÃf¡ôOy*iÀ_9ë{ü1Í³1n€Æ~Óø©7Êl‰#.µþÜ~ktÂfée<žÅ£çùøê+ÔÞã•ñGVÖ‡óßäqŠg7TáEr™5Ù7Ùq‰Ê®ö÷Whihé {îãrQIñlfØ: Á»äÎ]Ëfô†ú2z T~E²¾ÝêéÊ¿ÏÆÉJ+‚G×øïáìDVüë8™ Å„Ç¯úÓŒÿùdBñú	  øûßª95ò49ËÅß/â¼?¤–'y:bo®WÞÙƒ<OGSÔ	5Vc•Í¯c?°˜hlæw”t¾Uq8túî;­	N¹;¬&xYÐlŒU2	ƒ³zd_š}i_k”ÆÀ;Óûb­òE³¥ÀfÜŠÎhÊjá:¸ÈŸ^7ã½Ä[à‚ð·}åÎœrÔå€Ýy+ò€¢¥5i¬RŸ×zOÄQ.ž pú!¹dæ¾`]<‰¯EM¯¡Cõ‹± Î@Ú†?@bLT>ÈÖÎKÐ»ÓÞ¶Õ~ÄüÚÆ s70›ùÍw|C™˜Ø9Ïò#`?lqÅÁ(›'ÝÈß‹š}v70±Ñm¬v¦Ù1¸)íŽÚN„ò}{uÌb 5(ôþë9•ºùåë9E¦xo–º&ôŠ&q^$ÏÆSÃµÂ,QHƒ˜YVÿÀ‡mÖÔÀjÖÔ?`Í§ªgš®ù†‚o›Uðý³ñŸqraûÍkBÆæ‹W/O~üåÙË'ÏŸTDoÐÏs}µs‘L©ÃVÕp<;HwúŽ$Y1¼Ë×%0
xÝýþy´§Þ|óéAŒ™@cÖ7V4´œñ«ó·Iò!Ú£–Ø®›ž‚S`N9Ã?( :Òu&ñ ØÐ’^+j¬7VoÚ_Ï¥ÞÛ½¦Ž6 O•¬h yóÕ¶[›/6Ô~ýã³çÏ^¿~öòè—_=öäðçc SýHE“ON›4‘gÕû_ÿ=­™Ñ6Œ¥íLfÅ°©ƒYè”7&Bã‚ñÿÇhÛ 9†¨o†0Ÿ.N±©#:¾Ýèâhì·žÈÎ—<ˆ#ÝWj¢Î`ôÊ ž9WÎmHÑ¾9#!°6P9°›(ÁÁÁdh„ð<MŠ§Y.6¡KY¯ žä×Ø3ýÁ)býµª-ÍÏš’Š0Ë+EÇï"S_Îô/ÚjZ#æ:!W3tEÕU=\ŠQýrFÔvÕ7Ú÷¬=6©ìÜ
épÕÔhô¹<²†fˆÑÆò6jÖâË3 ŸW9‹†ÏYžÄŒRâë´õ$;‰?X„\öf"ž¾«†Å(í'M5£–1;­_…ùA@@á ·Ä\­­.°ñµÔGF^åOºö“O%×6„z©íˆ–;=õÊàVbäl
7¦äÓb•½]¹)- ‡'üKèY{R÷”º—-…QK,æu¤¾:šæÅTi¹«–àrzÎä¼sBqøÆ‡‹QÚH§˜ŒÒi³Ñ=Å¸½À’úS»Ï¸ã|,KÔÑh!É3¢sCG­æ;»^Lm
üj÷ý(j²	‰jâkÔ_{Ð«Qnöˆ åmˆí:Žàúz0]œšl<É³Éô‡W³iƒôO™´¯Ÿƒ²ÎË©I«-e3’y\ÉätÀVwÀWw`¯®ª\±¦Ë­ªF®å¢§
®¬µ¶{mý‹eP¹º%ë;p×Xé ´ÀºD¡-µÐáP#'Z m{v4ˆÊ=ítRòÏó±aµ3[QBŒ€u®iV…¤Â¸ŠÑ¡Í‚N:#
©œª%]ëeUhRS³9¶¢÷Ïß¼Œ¾ž«vo¢q†ù§fcÆM‡i!Ý÷Ò¦´ËI¡ Ç“ô2ìkÊÓmd½iEëëë²Š	t®}eLÂ”øª®¬ó5gZ8+‹2öSèß™…ÿýøBèc”Ñ3eñäNŒ(ï<Ã'eâ¿ã©œ}m®ú*>!ÐÈ’†r„BòÏ¿%×'3ˆ
”¦?vÀ5b%'¡j
RÒ+æ®¿Š¦fXµÙ´£¨Š××):éÈ­¯/íÉi¬I˜LlòO¥%?WJ†‚ÈªIU,ÀHat:í°¤,/ eµ´Ô;!tn~=·¦yÉW0…›U&hïÅLváRÑ/Úˆ‰„·¶?ÓÁ†K5 ¼€”#xVK_Ý–½˜-q5š¥:X
¦_Ïé^Ë”OÆÅpVoé˜!D€ãÔ„géà;ç3E–´#Ô,Ýo’ù§ƒ–»:øZÄ·ôáúÁ%ês? lø†»„ÓÅ?¥müMrÎìðGSqUªoÎÏvH½j‡ƒšPu…Ü®Þ;{íœ<°Q€Œ?ÂðÍ&`œÊ§, Ù(é26Wxíˆªï½‡÷p”á7Ÿ>’eøõ¢¸€nV~#ÚcüÚ˜–	v5^Øî¬h2âÔ@R‰.[@™ñ‰‘‘è†M‘áûKvþ¢»| FA¯ñ]FÄXv¦½AÆÎçÙU’?Ž‹D¯ŒÒâ5 kZ <½Œˆ…$ªrD8ê—ÙôeŽ$x‘ì/i7YU~"Ë·TËêEÙ$×heƒi¬Ú;¥Uû5
óT˜€D†kaDÒ††ÎçJ=&ŠÔP#6$~ä™:Ñ³s
žç	 :J$ÚÅ“	ÆÜL	q  S»Îsh²MXÄæ>ú-EtŠAVô
œÄg(ž²ÐjÙ¤SFL@T½Äq4GqŽðyÙ‡[@8¶ØòPµöÆç'Ð:4TQjœµY·â“HÎeëå/Á‡ÞXõCþ¥( ÇA1Á¹z†˜:­/N“Ð2³TÃ?†cî×#F‚CÊãt„ô¦½fk‰ö°â*ö‡ˆ¬JpIMðv¬}·”eÕ†M½˜0êP/ÜŒHˆy«^ÒƒÍ‰re»ÙSÆÞÃž"úÎõ|vöër#úÙ¶„H"å;Âo²šòT²‚ùrÚà½ „ÌFSîÜa©ÒìË:‰i©(ÕŠød^ótý]'¯þAî»špbtŠ©Ý¸¬TèJ¹²¢ê¹ãä:Oû Æ“"°ô -—Ûxgø?'ÓGÌ ¸¿ßDU^4Wuˆ´ G ,¿Fr‚ˆA?ó~ò:¡Èö(=N2J‚©,Èšä§Âÿ9f|fÌw»>r‚rÅ1>K—+¤}»Öá©öôSÝ'½\Ï‘2E]/´ ¦Ç‡¿ÒëÉsaxáž«DÒÀ4Õ€æF–šÙYGNÚ8AR bøÒQ/ôb²rd5FÚlüaœ]ž\ÔR±
5ŒC*5˜™£“E<ƒŒ¬µÂ(:g¤P3ÄÑÐåÙ¹ýU;À¯nJaYE«ZAìÀ‡-/þµ¼¨vúN¡˜3ÚÒþ;ïè¤~	º$¬:ÜÉZtUúÄJ$4èžÐqªB=ºŽGs½mÝîc‘Ã|lŸüÅQ;:“´Þªihvö$™‚0	7rqßUÃ•Uœ!–÷x]dxT5Ž/1'­úvž "n=|øÒÅY“ö¢‡šÔh#Ò[`BŠ2²Þ–¿¡tYÃj©Û-k
bzÛzŽ×L¬¦z›VSþA\ÄV=¨&ê)3aZ<Í“äi {ÊÌÍµÕO“”E"½„þÈ×“yå	|â’.›¾ü«§¹ Ú=;~ezÑð•gžXÎV?bO¿­q<:Â±&Åá”ÓF">ê]™³£#q»5çãj´«¾Ê?´ñÃ6ÑìÑÚÓNMîbB>ˆ›ïH*F /€l$ãöOÇV4ç‰Qò5?Olð\qø(_(ê" ™Sî­ƒ_Ÿ7k%˜§Pkã”ƒzÎ,A’Ó{àCYè`N	…_Ñ#«=‹ˆÚ[¦¥vŠøSïL½“ŠW còœeÇ~ÿ_ÿûÿ}=‡6ä	¿y/Ê;ü•dH;u´mä¯¥;Ê4õÔ›U¤Løb;‡œ¼Ç!o×qø+µ¦Î}¿RŽ#½ÜúA)hZ(™H¥£¾Î³ËlÊÌ<Ö§7È`HO–\RÜ"ýðÏ`Úø–¹ñ—s&nN6ÎçÈo†ñŠ¼ :!ýmà<é	’<Î¤'³Ï†c«:¨±—
¼z ]Ñ°>¨~v9™M“ï_<kŠñ=hÉá=Xí(Æ¯°–VVùàD/Ñn<º‹XKN(/°ÊwÑ‰jÍíè,)’;é²š¿±qŽ£ÚÚZôRá¥D|¥0LÐ\;:|þöðçcD<£QAiÒ>¬;Ç:ÊYJfyãª”’®ðûIö„gUÛsPû;m£>&CvŠ§"`Šÿ³ñÊ;4Ñ!w¥{ñúM[–ôX¡²]y%Œ;Ê0Þƒhñk÷˜»Ö[ð§¼ª¤D_{ê{Ï÷}C}ßð}ßTß7µïr«Yª¼ò}´Tw±Å®›Pvã”Hs‚zÖ˜ý=Œ¼ø&\ùM¿&öåôx+œ”I…Npq{“èÎg¢&Ç{òL›*áµäXÜÓ¾Â¨ûÓoÖø˜ö+©šÐ~…C‚Ò€}2¾0K!a2H6Kì‡;ú]cÒ‚/‘_ëc·#›*¾•C§d¬ÑƒŽÐ@ãÖ4|Zb£&d]¿1>®zHÙî²cní¶£:öä-µ¤xcÔìÕ©ÙóÕÜ¨SsÃWs³NÍMåK-ðƒœÑ³QÃõµÐÑPAyÚípl_Å+ PèPÜº,«ÙwZ›ß|óßöF¾ýñëÝtÏ×t/ÐtïØ.À)‡·é_Ó¦7Žíœèx›Þô5½hzóØ.ÀékÚj[[!U#Ïþ¶½¥,?#n;üxAÖ¥ËhMžYÏ$Gßì¹M˜å5«õ²¿}»e;2ÌÛøzãC#pfi×Kö&`F# âíPÍ}
&aNyÍ-¶Ë.×j3¶Õ4h¶ÛÖjôohÐ›”<ÄZVñ]c%rÚs
ß%Öê6Z,3Ñ®d²l4l®É·”,ºh¥§µÒ3ZéñVz5ZÙÐZÙ0ZÙà­lÔheSkeÓhe“·²éiåéRßaÙšpi2›n¥âB‹W˜ij¶wÀZbK˜O>fÛ€}åKþ†YXþNâ«,ðßª@çS£ˆXxŸÞõ&‰×f±Çö4õ ßÑˆ©éŠÅ¸HHc{ ¾h¾@f“•ã ÿèRÆáóç‘”ù¸†ñÇ„Äz`` Yb1QX]'°Ü×>ÑG2IKô
E¦D¤î”åˆö˜˜ÒÉXÌFÚñU·Õkm´6ß­òÑXâ•<©`õ Ì›9eyAØ”u¬3é¦XsØ«Vux»:¨ö¼‡b¢’¥¥ó‚–“ýáH±œªlšXNÂ !Ês°V‘_»ãŽØ”ÌµCÍß~©I—@ªÜ:»QóTËg`.H`åuuÄ 6…¡†µz Î­§««°} æšçëd< õýõ	»ÿ¶† VüÀÏ Y¬“GÂj4RiQúN€Õ8×æ­£Ë8ÅÛýÜCõæôÝ¾vÓÝåA)ðéé?6ô›òð¥ì ïZK±ˆbtÖþfÝU«ê¸»²Å8¾cÇH¦œE‚M²Pê1WgÆOîÌ2úbñBú+]óÝÒˆajÌ¥ˆ‰¨r)7)6õ€"kñ¨_@°Ë¦Ç¥ûYW/¯ùñ©v¼¼»nÔ¹œnÁ+Ù3þk µlÜDÉ¬îÜSA³€9±x”6bÞÉ§O¯¬ÚXu|Î“[´É*{ZÍ¦Z0Ó!£­M¢­wOÓŠ;«Âpu3S$6Z{=šœaxHB+ë¡íªy2bÑÕeâèI{'ºìN°…pl\;»³™ûêÓßyvå„WgñJ-F4*Ú£‹ÏŠl4›2G¡õˆ\…àß«ööf4Äÿ™•õøç%ÓÆLÕ@%^cöeƒ‡¦øÖæp§ r5ÝŽïÒY6Å´±ë j³AmbºçÍu-÷g!0Ctûòÿ©7¤’ÑÉåü'6'bƒ'îî}Ù9¶‡]'#ŽþÞ„¿	Xlû<î Î×žÒÑEï¡'ÉíÛdò,9?~~x|lv¼6ìZCq³6«  "È æ…æ“‚Ž@•Àaáì?%n€»Ÿ³Y¡»wÎ¥0¨£/t¬"Kc¢]~¡¸. G£!Ðº´@›ö “êâÒèìš;æ#ÿ¿Æféð/:‹§ý!:±ñ–œµqÉšý¤n9wÙ´·q•>±\Æææ+Ëð|™Ž1_û6åk×£4ÊtÈ¥ûP7^oÓˆèh ù¢I¦}Á»n.xävÏ½ig‡önZÑ{zõLä6âD®ì¿Ì¢çb1ÄeŒŸ“)`noÌe«u9‹…ÄGâ³ƒ¹?ds’hEô¾Mã3|{–\¤ °†¼å“0ëâÛ(¦ý`ŒYWe^Äéøp xíEy…8âÿ‚M”ÂïñE|–ý÷üÐ­Ï¼·Þµ4ç²+*võ‰ó«OD@¯±:þ„?¶Ãü«„#²û6¸½ŠË*ÞF—Ï±œSwÓÙ]K’c_º‘‡,&¦F¡Ý¾‚&£ãjËä+wÃÊþÜ”Nì¤î%¿§Ñ8Ìúñ4ËAâw£Æêéú;o.†‰=í-œ¬3éñ‰3þhÄZœQ`01C2ãöA¿¡×$3^Œa!»Ú_î^ŠY3œ{îc!ÔEH7º&lçáQ\ÝXÊVWÛ¢»&5{nJC½V
,mÅõÆvU±am
}‰[~‹Êv¶$ï¡ÅƒÅ3_(/ÿ‹7¶kþÇ‹}ôwô	gHÝí_°`ÂÌ}òÿû›èÙ(lœY+¤®µñLVù%F
MöÊP9m~¿i°ÀÖN°GÂªP´Èå0.ÔÚ!‘JªH¼ë:²…øÒø%^ì"±<–AygOW#Ñ÷qþmæ=lB&	;e%ŒdÄ‘„ñÒØVCT0e—+d‡KB$¼vÙÏÓ.Llòé ç¹+²¹ÇQËÀEGA§—ÈIR4šèßb”Òíó46Ô%{Ñ`ÆœÛ0#—I~½1·u=ÓD+þ¾§…&'Á2ÈlÁÀ"HPˆt.†*Íæ†Õ	Î\ÉÃ[ñ
—kˆÿQ³í®/*ÞÃ< IN¬Ãd6*_.GÇ“8ÿ0J„Xß[w±_±	òû®ûóÀÙÙÛØ†Í&“$ï³»f\|º„)¸†{Ú%EÝXÒyÅÝŽçtW*jJ$]õgIóI>¾ÜŠ®ìŸhr=žÂ"€ÑS':X„ŠÞÔ²uƒ)·Üµ…Î™¨‚¼pH¿mgãÑµ­2Aì{wk¥
ØQƒ9_r¢ ólG¾¨½>vUÂ°–åtäËš g´KFçJæ§_$SÈ äpÓ€kmË•}Š0It·@·ÜöÃ-4V¥³%‘‚ÃdOÔv${‚E]jMk(†ÑÞö`–·}¢]ô‰ýu†[O}nørHú¸˜%4ÕŒÌÿÀÏ`ìã8<EA„{à†ìÆ÷6ÒV!çƒVàpqzÂ<®aObf‹ÏÌéB¬IE
ë	´óˆšÒD-x9Mâ‘Ë	¥€µõX¡.¬yáòÌ°œêBårìÐŸP´Ôä?TŒ×Aë~#é'~©0œŒ³FfÓ[ðF1\bŽO­`‰uy¢h›˜âÏÙ,BÍJÝú…|»H³QÌƒ
¾û!"ÑÝÇ%¦q:+’ÂËk§s©§Ù´¤T3ªÃi¤Î¢¡­¡ekPô³[í^žË¸:¸6¢µî–¥vQUkRÖFênÞøe1IÇ+°¼×#(3çûÉ-§À~¶‹FtãÕæmd®¥XÕãA"Ó1sN~žÅávÿÝõTÇ!våþZŒK—†>#)Iì±®#ÁØXg‘ÆNÎÚšØ‡_Ü¾ù‚ò¤ñ;Ã|â.•©Ê¤‡»IýìE£íç³Ù9|î9Þ<µna«ÇãÅásâ(÷áXÎ…Ã„Lk†—Þ®…³ ö:ìÔð×ÑçEIVd-#ò×sì*`h÷þxÃJ’¬Woè$Ê«œwE,)…ø$¤šœLµ7ÌdSšÙgh¡góÈÒó‹úQR#}ŒÀ{NÏêœbÀÖ½
ˆ¢ÊpÛaú°KóØ{° )?Èðr%šb†Þ=Z)J"¼¯þ„¸]Ö±ËîO¢a*êd0L"5œÓN¶#™ùËÃ»Å J“èÎ»ã ˜Ö;òäDLÇ”šŽÖ•Mq§XK´²$NGþEûZ‡ýºfœ$.Ë å³4Áo$Ý&K&Zž×ïÿ†`Š‘Ð) ±Ÿ;[‹ƒˆÕ$õ»Ên¥î~(Eƒå¡æOÌX‚§õ‰Š$yHA&SàxÁ$‚k;a™—sb,…ÿ˜‰=‚½’œPpÅVÌØéöÃCóó<÷OËºÕ}qËy[ù ‚J¸x×£„ÚšÍß‡UJÁ
Ø2j99*[<êë¹>Ùƒ¨až˜X´–žì/ºc‡ÈƒK7D0•¤ùÔ8‘´+˜™Ç:M&*”,ªªeëT-*{<‡œæS¾^r£}ÑOAtú£«ÍËr9ka-­ÉVâ¾®†§†•e#D[ÿVî‚ê }¢q®øÆqÖ§s=ïòžuæý*š/›UÔ[„|C¨ê0»¢—wÌ=õžÏy^œH}iG„áh‡@G…÷Ñ®UÔfNòá”ïBq*xÂ:«`>ü±fVF¾xì>×¸×oÐ->û¼MÓáÞ|£³6fm3Í§B–ÃÀ£—à(Ü10¬§Z#(_…€ÚzJ?P§sŽ`žCÿ™†=¤ð‡ý(*ÌòGÏëTŠ¢¤SL³Éë<›Ä¤å4W¿«W3æ£i†ö ÊÞây5THºc¸ì‡ŸJŽ_¢Ý3ˆ¶"u&ú„Ô“`Nb/i²iËr_ßÃIÓ{íHE'6•¤­’œà£¯ÄÁZÛ¢to•khQ	n•¤œì†«ò@;Æ=n˜QwéÐVm}yeCú¶Õ±úÕ:Ÿf•Ù%Ö‡²³ë'<öm …ô—gímÔÒw,!Æ¶úÉFc…¡Ð7{#¸ÙÉý1$QSð½w0ÅuK™Ë7KÎy„P®ËÍrO+­êÛõs§K5ˆÔàÅÍ
ZF–;ë¡é¤ÆIØN4„ÿ×ÝÆñ·¬8ó…}Ÿe(Ll¹KÝœkyÌÑÂ^”À…Ÿ6ÞÈ¨e˜û]¦žj§»r/pÆ5ËSV?"ÛI`ûuWö_dãtšå‘~ÎÌº@…È³ÿ‰ÉeÚg½'ÅmÏ¿,D²Ì{4C*cmÀ(×¡A¥4Ÿ¹ïƒ|‹ÒëÇýlŒ‘S|y’]™ØhÏ¤ë3_2£ÒkÊWÐO¢Ö"G{s’j¥:4l¿WËeFÿm2É®æÑ­Zo‰+H|ÀÇ2¹L¯µBŽyZÕ®¿jò).Ø›ZG¬8Çqëž¿‚†Uï©çÙâ:>l×4ÔFŸ{æN,S2ŒéqjÃÇC¬rÅ,kZÍUá Zù¥[¾ˆ¡«ñ
ª—,¼Ã×sUZO¦iö"B°>‹ V(T=ökE#ÏxÏÔXd¶îaõÙ'x€; ñ¡§˜·p¿ëhqnýáÖý­}ïiílÁÖ„yÇ2È&h(ó¤I]øÜäKŽÞdm¼QcÆÓÆèMwÕÍøGÆ ÊÏÔ4\°d;ÁCÖ6MIn"Ïej»¶½¥Ý(te‹„o¡ÐÚT¥fÂ2©O<µMˆnÐò&™¯²;rŽÅ£‹b0s¬Xª¢aë„Öq•Zì<dñ/t¸q
¡KõãÁ`ÑÊ‡¡z¸XX¹*Ô®Ð\-*³;0–S—xû³b7›Médˆ$®‚¬¿ì>¬w !Z|9X¶aŸY™×WlŸë•naéì¤J™¸þô©(=š+fÖ¥«ŒþëS%âf¥½šÌéJÒ¨¢Å©ÌVùå\±®ÍÞxÞŸì¢åZ÷-åÒzà*5KÜBÜí.#îÖq>¬F£¹Î¼Âï¦%+‘yÓ'× V¹…È_eAZÎï>ÁRª&H—Ñø¥äiñÜB®Ïòµx–³Å–·¥H°IËaseÝMM>T*•DÕñ ”EEà1KØS‰ÊÇ5NmñQ²•løÆ§pLÚíhüŽgÞ#«wï=8„jžV£%õ÷³°®‡Ô þÌÃánËONÄwœKuÌ©¬ìÏ9’èÂÍ³1Uý’~–ºœ‹SM¨4ÕìL[ï4þ®Þá$+ìóâY—ÏÌËA™gæ§‘ös3à¨é{\h•ºnúžßÆ“å”ªsæ¥"QX&‘ãÆ¨©ñ2‹NØ;é=Û¨×E­B5I©x>³¨Ÿêy€ú==?ÌDâu­ô«sç{‡®Ÿ5ºàÞ lòÝ…šZÀOtçŽýD}c©á:Jñ‚x÷âÊŒBŒIÛ*0,ýW™÷¨oXõÈá’Åo‡Y^ÿ?”N–ñ ô=sá¾WÏýÏ÷ÜµožïY*‰'ìª§ï²•š<Ä¶p]÷w»eå"cÐ^±Î4FZ0Êí †GÁ"Eî³°‹‘gfµ„ßn©A§´ýÙÍ:>ÔoW)°´²ï¸KN-¡±,Dñ™ßÖg(Šú®DþgI#ÿ³¼Û‘ÿùíœ‘üO-%ÿt\r=Þƒ^îºÃ‘åbéÓI,/%´WÙö[û< Žã’ÿ¹µ;SàYn{áSß÷)ðÔs‰
=nˆ¡.2d_µœ.=ÝÕ'œJý•¶²Ïb—%„ƒh	ð,´ÛCžh·Ë…ëùJÖh­>k*PÙ@­)Ûl¨‹ ëŸe9þ¬n€W¡Ñ;Í•Œ5èaHþ…”â4Ÿ ã ÿ²èÅWÃÚÂì)º_D8c{Û8EiàÊ/ÐÒ²Q×ÅËUõa{ÃÔ‡½R¡?8£…tË½Íì‰NxiF$<¡üw"D§£.ñJ»ÕñJ‡Þ¸^ÂI¡œ(†ÃÀ5óûes–MÝ·—ÍöBü|+Ç‡p¿r5WNdö£Swáð5KPô8ž|ÎÕYpdJÎ4{š~JÍ.ÊNÿúÏÿÓ¸_Õš«úš%Š0ó»¨†ÆüÓèM[Ù÷_ÏµŒHÚúÞüor5Öÿbx”,vy¼D‡Ç.ÿEFÿC‚~Ñ““€R^¼úUäÚ©…\~œñ¹nû‚~P`ö µ‰‡þØÑ•ÓOi,•ý'Éev‘Ç“aÚw|T…¼¥*£GéÒƒ¦sOà¨ŽêÝMŒô-²z+á£q®—ZÀ£ÞÝ»ÁpéÂpÇpP@*e’¿9½fÔ'º¼€=MÕw>ÿ]¯å?’ñì_·˜ZÎ’»ZÎ§ÔdÝkéU<÷—n±ê_öºÃè~LF“ÇiÞ%åË_vÏíP@-@è|lqx…mÖ¿gR'Â£Á.=©¬›ÇOwVµ„Ö/ÞÞ-Õ®|Št,¶Ó%—‡ä¾Am™?†µÓfbŸxÛ5ù[—×QŽCøÂQjÇA)wÙI6ñú*Öî!ÜlXFÖXÙw—ßçj±¨¼<£Ÿ–Ì}	ËÑ•‚€¶ß¦ƒ$z“L2 a¢î™j~ðÅ=­Éüjæ@'¨éŒó Ólç;­`(ß‘
3¨ÞíÔq[¥2.ƒ¹ÎÙ)”Fê‚¾¹ÞÅëê€ÏãÙ¸?”DàÑažgWo(«‘îÚêÀÚcÅ·©¢À+¿½sÖY~R_ÆV @ÛzæŸcmíží‘Æ˜zþ¢Uê›CÌ_fÑ÷/ž±PÔýx2åx²i£¬‹±ž3‡E®]U¨U½2¿0±W¾‹@j«=6£J-9x½8»|™å 3•x§øš,µg˜˜Úaý_Â6~äËe6ý6.0,ó}Ã8CyVèa†èg½0D¥©\‰pø"nó÷¾µ¨˜U¡9ló9˜‹GÁ“X•ºë'Æ¡/`íQ|ëŽâ!…¿‰Ï²èx¡ðŠÕµ…—'ÏÆ±ôïiéÝi™ÁABë¯êÝ)”gDPí|d8KŠDÃƒ,Ç¨\Ú:ó¿+LÐçD5ø$Ê° ëÜ-„F±Èâc‹®{I@†Å,rLúôI0ï…ùg àudv::BX¾Â:½Ùuƒx@|D‡ã”Îï¹R[ûõNšÖêQ~Ùåî× z"WÇKSBà-ÓwG» 7µÑƒ¥¬¸kí·ÚŠ\:ºJ§Ô"tÁÍ•'-ì—æ©üXêze?~W?P§Nš-k}†íÍH¿l[Oo€åÓïf[9‚W5Ú"28j”Q¿	º°Meƒòl;{Vo'¤æl†rg-MÆÍ!Z•B”á ­¬7w(o9”q[fÅXJ*ƒh—cW]¥ È°5Î£a’ÃfCDc9’ÁíRø|ÁJ°Ñ‡o’b”¨ ØiœbÖÝ+ŠÍ·ñ—~‹‘ÿòÂæ9T¢…öoT6÷æ}üŽPöQØ€Uõ1ÆÎ(ÒxL^3,là“ÈWžÇ×{+ÑÆJ„kšöÕ-S^loå¿wÏ·Îc>ú‡ŸÒ"ä Šƒþ[à5ˆ•P©ZÀÉËÎå`„ê–Ã{Ÿˆ°ÇäÆÚ]oÑ¯·ü*) z¹Ž€«5þÛÃÍxãl‡Ò!xÍügšù »„ÕÞ›ŸB‹°¶ïn¢!rÑP¥à³Ótz	$áX¤n`têPìYcíö&Ÿ-þ~£Õš~:&n„g¶:¸GÝ-øO{þ“_œ5×#üßZ´Þé®6B.¹¡!#Èƒ ¦—Ù8›bÌ‚J<(`»†‹I¤Û<ßÜN¶*Ê©Ð—¡^3º?€ÚT«Íšn´ôFJï³°³Od[ÛK·8ÉûÞGÀ<t¥A3ÊÃlùóU×J,òE£¯à$OÆ¦ú_â.€"÷QgÑº^dƒx¤ÉnöxÍS ïóm¯ŠùwŽnQ:.<iø'@£·þ®šK»Gé%!©´ëóe·Öµ{òe÷âÅ]ø²¦|g*bŽR<Cá`^äAžMÐ”œc‚)«-7è ÿ†"·Lék·l&<„wõnµ"G]°Éª]ªç©æ‚±^w¾S2!ámP4!éê!ó K­ ñkð‹+n¦0×ÓˆÛSQTüÏß_¡:Äÿ8IÉJeOLQã‰¥íÝYò¦·lhyG¬ƒ#aØðf.ØvÃb{C®û··>æ;eã1 ‹ãq8±æ$ÑçÂúZ#ÄsÑçw%ÅbJá`)^tâ°Ì¤2Zö_£7	(l¿Âdá‚­}kD|s§¦{mùgV–¥Üw B
¢P$Ñž.1S;<ˆÞ‚pÍ¢bÆÿ¸ŠÇ”ÁÓ¾%ão]_ÄŒé,S¥/î ¡é9,fCãYß¡š—xÑtŒ¿…ïs£ˆ#Œ"§xpùpµ…,ø&W;!%ß°,kX¢»¾Ê’­	C
.ö<L’iç½gú»%ÓŸ9×„€c”ñ¨L:Ñ=³»Oª‘{tq¦Âk(x–Š!ÚŒðB–Ri)­Ÿ¼±L™8£™X=Q:kÜûò‰wQy»Ð=©úðó_=f)îƒ%Wƒ7–K*5ýˆ&ï¶Ì‚.IÙSB%f.ÎøåéròµTc“%¹he<[‹ü@4`èÕ¦ï„`ì.#Opa¼e¹Xœ²âc0m#[¢–w—S•Zë7´¨3y£AuÏ’·'Ë`s¾µñX½~'ÕìógÌéòPb›ôm™¤»‹\xr¯0‰÷Ž&ó•SCþ	(|óÕW,fÀ‹Ãøß¿ÿôý¿=>9Žö¢S(²ò4¥“tŒqµðçH:i1ä¿^ÄÀÀP§êüÍq?Ånù¯Ã` üèu<†VfcPäš‡¯Wù×Ä£°Á£Á¬OjÙJßž$ýáàÅ5±¶ç€±£t˜eU0jž<?­¼˜À±èa>Ãx=¼.ÐÜ¤ÕÁ?&ñh:\ùêÝwbÚ/_½üå÷=uÙ_ÉäùwúÇ'oŽ^þpòãÑË£'¿ÿxìÀàèü<!ª)Í.gãTï‹ø,-@öþ–á§qq->ýŒñRd€Iÿ ¡…/AäI0Mú<‰Ž?€ Å+¼Ža¯ÇX;Š‹øþ O¡,€,VJŸÌæñ«7GÎ”^a[žÙ¼aâ&â-:»/Ø}vØ-,iŒ›ûC‘~ˆŠ8zßðýßf£é,7Æ#fpãfU/Š^)NæÙYü_ÿù§ø/ü:I> „ÌÆ¶ª÷ÂÚéuaZAœå×0w`~1zQ^i’$_±_è8)høîm–Êhû»œd9\©²´oT#o’ûÆWÄñ˜Úz6&Ûá ë»ÍÊ ;`Zà
SÁ×yvx1B_Iú~çÓ¡¶¶úÂKT5Þ>OópWd sËŠl2¼Ž²szóãDc”±‚å»ž¡âPä	†zÍ&˜á}ù	¯ƒÓ˜¥zLk™´¢ãF6eòu³r0YGqÂ¿óÙØˆY_ü#M®š´ADÉ¢ýˆ9ÎEÊSþâhŠÜ\-zñ„"Üj¯X×dÀE~|¥%¯ÀŸf>t|ÂˆØ‰?ë{,ƒVY$Ñ€-óŽä§	žèj½fãïA.i}u³SÛÓ†šö,w£&|u™NÉy7ÒAcŸäMÀœKÏ£Y:ØoÙð€º)’˜bÞ—V´X;–ü5,(ïJë?(9žõÝÿœ§£D+be¦ßÅ dÖzÈ¦ íµïgYÒÅØ]Ôî"XC9¦ŒSUËˆeåë¯n˜Ïèè)†ÐÇ=A" š'Q¯ÞšÌŠé@Ò$L"Ù˜WŸP™¿Ï’YBu_«ßzÅGØBð¿‹ ÏÚúï¢¶‹aÁþm´ò78¤÷•8Î»d`b©èñÔûÞOÆ@¼ö›†;crËÙŸ<mž¾Ûoò t²áD0X5
¾iàßAGzÿÿù'¨FËûjB(ÆÆñ"¹Ìšº^G¹µÅ‘ÙOy€OÖù†ïEZA–G®Î+:~%Dw§–Z»ƒ.©'Öÿ Dd‘Õ}B>§ÑG-)€g¸j‡¢¢0‚‡vñ£»®´\4¨#`ŒËáü -NF‚èÐ[Zœ‰ëZU|}Ó²6‹gdï<(ÉÚÿ/0èè¨½6PQŒ]yh J6Þ$HkÑßðÊÃc ki6š]øŸth‚wº9	¿K÷?Ô‹S f—éÃôëy–Š£Hëû¿’¢Há÷ø">Ëþû~èô³Ë†ÞŽ·P®&X­@9VÀh˜€|ü3´­š`g<X„¼ÃiæÔ„é¤ð<ˆµKÊÀkª°~­ªáUÕ²CÌÜ“ÈûñÖ&=¿ÖØ¸6K<»Ð„9ÚG_tùhµŸÂyxï~“í	Â+¼Šñã1ˆÙy)bI—”pã+sæÑˆáxÑhQmÜ&P™ÿRdo·”&>€•E³€›"¢Yeõ¢»ÑÊ
kœK,'×ìIïUó¹ëÃY
¢ÉÊ^]‰3ÿÞ{3‘^ [ë¼½Ø.£G+ÝN»ïØkP3 œÈW"“ _ÆOÐkr$~y8M5
ÀIyJôŠ;vßû™"È._ƒ8O{êuis²=FB}šE€qò)ÏrêkÅžE"î™4aë]3XbaÎ0`™ž/Ë‹Ons«¦Ù“h¡2
#Ígh
Nþ‘‰´dçŒœ¡¨êšY’8¼p×yiÆƒÄXÄÜ¥¦ÅKMó/ÄpÙ[¡‰M^<tFÇS¾/£Ž†‚.¿Nì·¦i’¹&~ôDÛîÕ_{‘7DØ˜¡83ž8R—[OÙÛ»^ƒWPrÂUûþ®¬wãØË³OÎ”ßl*>(ÑèxeŒÞY¦v™¡†.±ý
Cùu–ä×Â©Óù°!5g­he†Q€VV[üó:è5WÄ V ÄÞÞJKÎŒEè^Õe¾Ù˜fÀÇ“b˜M›¿¶`ÿÁã°C²P>|C·;}G±˜Vî <‚)7›ƒ¬l·&{‡zóh†ê/FÑ;Žø‰Ú,Õî<­Gs7Ï˜C¢`ÎÐs‹ªw&³bØœ­z6ª|§•¶RK5ã?³¤ø×€±Bñ••U+}Ó™]úÌ(-;ô"ˆ…@kX˜$Ïu¹wà}–7WŽðŸè<™ö‡Èî8aœ»ØdÀt¤"×RÃ„MEšB;¡åß¥ûL§ì¼Ac“ 8%³'5çˆø«U&ïè2ÌÍªE ¬²Ù$r‚=êƒããºÜfKnŸYv+‘Þ“ß|œO†óIqA9Î'É)4Ôe7ý(ÑÔª4MêF[Í!lR*A ‡‹ëqvËnô&=íàŠ}„éjrÁ»'Éy<MEr6"â(âSñUƒ:3¹5¿6ä()ê4'¾Ša$†©®©	ªØ¾Üþ7,÷–[Y™›fÉ8¶
ÄÚ{ŸèD–¯–“‰"þ¨	N²\ßCa#²µÊ‚Ü¯„ï>ÝR°âZ`tøa»èç‰v7Ãq£²Û Ð`ò©½ƒgÄ;HãÑRDÁ	…$0]»àµœ]@`°Ë~&ã‡¤Ý/ùzní9<ãD‹þ‡k4áŸíMæp¥9uñê˜u#E÷±ª‡áª½½ñ?F2\ã~9¢œØ°µ/1 /ü3ÅxôÜ6áyÁœíW„ó9É1hQT£È˜«á‰2gVS7tJÀ¹B:V°z%Þ4v-:€ž0Øá@4ÿ*77º^èŽ‘¥Œì®8sæžCmÃÇ¦2[NÔŽ6î‰'ƒÈÒÝ,Ïœ¼¢ycGs8T¤‚Äÿ¡íÞ{³ãöÜh¾Sýa–üˆ°ÁCÈX•Ñw°»X\;Ï²Ób¤Y™÷ôOsåv¾6ìjü   ÿÿ ™¡ìexœì½ÛBI²(úî¯Hkõ´ÄjI 6Æ€·²Í6Ð=3ËÛ§]’
©–%•\U204çÎ÷/Ùy©ÊkU‰‹MÏ²zKUy‰ŒŒŒˆŒŒŒ „~¶â™7%ý±Ç‡ÞÄß®$þeÒøÐZ™]~$½a#{‰ßh­¬ú‚ý|?g—6™]5Všë$
çÓ?hL¤F?âÿðâm(>ŸÍü¨ïÅ>I"¯ÿ9˜ÁÀrN¡]ôÂñ ²sê'	¼·–²'Dùl-‚¯ÆÃ™1 Öñz
ö„L¼ËÆEãr\ÑkÃç½7õ†>‰ç½ÿöûI\'ÃÈ ¤‰^xÓéÏ£(èÏÇó	™E~ì'1 
“(ÄÂVžÚ¯cýøƒSø„ÓWÍ)Ô"üAªÉ(ˆIÌWo ´é¦†™:/ÚígúåºïMß‡ƒàüê”žüü3©É©]?Õ€G°ç“žÕ´7MÄ¢àõÇKd‹´Zä•Ò2m½7OhÄ˜“pº;úŸ·¯kKd{‡\›“hJºƒ ‰eP›ÎÇã¥—öRûqg€ÓyL'­vîcß]Ðáfþ´–Ds[¹›ã‘4õ°.Öq]´a]Àú	¦ƒ`Ò3
¿úÑföì¹ Î‹P™J$é’º“xäÂ¤aX:Ó8@Ü6¼ñ˜œýKU'q£ïOPÉÏãæRüz3X¤s@™6/Þ<	Iäe_}ò/XØÐ|L?7V*Ú¨Ìu²u<žuÿò·¯[ÏnÈòÄN9‰²©U›Y"›÷MlVOíq26‰qö¼1½?ˆ‘n?|,I2ŒÈò29ñsdb¸NÏÇÞr€dä“	’ÍšZ˜¦^‡ágÄŒJWl:ÉyNÈnÊvË‘ØÂ³—éÎÅ/ø!#›	Šç€¤É% ‡
ÿ¶¨ÌÃÎ¼¾ß¸jlHòäzù?Éî¯''û»¿üúžŸtO»g§ä?—3ˆ®…ŒiŽýé0‘íím²Byîë’Á´µ1	hŸiÒO/Ggÿ4ú!Éd“~Âün¥ŠžŸ\ø0{Hk†lÝµ±x3²¤$)	Êµ<-¡²“Qa‹4„Q[ïÐO€ kþËnv4pê†13ê¶é öiO–7„|õÆs fÆs¸oÓ93—:~€Ù¼éjÕ|Êî°Žµ~Ío&^4ô“&ífÉÞžc8ÏÖƒ0îàÒÕ$>$¿J9OªGÑ¹›øƒ`Žßûóx3ÂijË?83õk¹½Â_ð^²W$œ'ã`ê7¦áÔ×~lH´‡3:¯Å•
±×ûƒÎ3n¨
ç“1"¬Ùln-³jö6¯?¬ÔI«NÚu²Z'ku²^'ÏêäylÔÉx…¯á}«ý±9ñfµ!ÎIF*€Ÿý+ €›”nv®‡|¹¿"•¿"ühèE‰?­€PüDç—üå>ÝäC»dqÐéø-,Ö¦3kmXÊè‹b‚7ÄrÄìg›Œ‡ÒÏUr9–~®9øÃ5gpþù9.Ð¯þ[‰³íl“ç¸^óÊlmÃä8µuÑºtü$W3'+a#H’ÒÚöu (È«ŸÂ#
ßé?+¼HÁOp²À:XWÎ’Zå0{"Ø`“}d¨ìñ,ëƒœQœ4+Veˆ}"?™GS×{ûxeíŒI½·ÀYfµê‰ÿ5ˆýù
ÒŒ¯Wý÷s'düuL¶ó¨!¿úy0ÁÝn“m
–âœ8ñ£µ²+ó}çþ{ûûé¯¯ÿÚÝ=;m²z5ºEƒiƒi>û|@ôé*µz5,n…õ°)£]/Uêÿï¹?÷kÕ‰—ÀCî,z%Åˆ&òsEû¬ñ¬¼ÌhƒÐàJ©ÂðWSe•«ž“®z‘:Ò%¶‚Î$W *˜ìûçI¦fbSçchg¾u¹:ä‡ÆÖ¼^Žç0²$œ5`Áp”À¿Õ6áŸž$Ï–×³‘öÆL¬6¨ÆKoèêxk…V‘
ì0ŒâÊŽ•)Û!4gÈÎL]õ/Pkáy(ÚLª K@á†€NŽ´%±cB#mRìdÛ×ArhøÙ:DŠÂéMƒ	Rh<@Ê²F{î06ÉÖy3å™‹åÌÃ¶Ì­ÑšišØà++™Ú› Vv8[Uw-§Óþõ¡ÕBžf›$Ô\1×ˆ§óaeØ@ò	À,/Ø› Y÷ÃÈ'^Ä09•ÂóU¶wû!¥§”>}wJvqúOS³èQ2‚/:}€kôIwÌ0?é}xtøû-%¸­ê·’â°j<zIîOüÈþÜ¢\bY.ª<>ažF›Mä…Å¹¨o‘ç®WA xWá<yì2ýðòäúžaá$xcÜiµSÏÆAò`âÜ|c1=,hhµ[|·žP¤%ÜAG(¥!,®<°v§ØÉÃêù"Úú}÷è¤›Jb—,Õ%i<ÆÐÙ»µ
Ño(B{ã¹ÿíå§uÁÞBvRèœ´ü-¤æÝdf®ÄäCÐfNtaYI+[¥õùÝ¤ä}ÈHí¼-OJ¨5NùqGù(Lžp¼›h<M¼éÀ‹”eI^µÖzê²ä”9BÐúÂ%”ƒt“óCþO„g'ÝÃ·gïº‡Ý½ßQ*.,ãQ„âã”‡a„Gž^‰Èá_@&òK*¦ÃÐfPvaÉÈ«[d£ãÍ÷—ŽÈŸæv»[Ê8ü½DdQ÷êS!öp¢’KƒÜÉºDÇÈã(ž;ù22·¶ö ©[6Ï”¦}_òÒ™eì±Èoæ<¸S(Kÿ_è»ò±˜úÍe¸5	©ç¶¯1˜™{ãíëkÂ¹Ú&Y193§[¥XË,æ_IQSšÜÖ$õ¤Ô«Øø¢@Kê%”º¼¿V0MÐ€A
LTö»|7ÄÔIÜ¾5_¬×	<j—EVZµEëYª™È+×„T	9êM6fBR°ÑÕÌïÃÊïèpýûþ‰†½ÚJþ×l-}Ô…Q|´TÜîW9SaÍ·<ª”FoÚ°.ß2ÏÆ {ûY²‹÷YýÁÆeù^Êš¨Çð÷áê¡Z™Í'ŒvlqW}™LfØªìì†Óó`8Oá¨Š§'ï gªÜœ';3€41ª¤Æ	¬#ÔG{I®µÑ‚³Ç
UÉˆX½I7-V~ìb¹|ÏP†hšÃ
j™B@	=åë+%ÕƒÌíO’þÊÜË
`ª;d›«lýCˆï•é0¬Ø%Ž[%ÖUêb™-Ø+æ>Š,`Ôøðlåëè#ì6ã$œ4â~ŽÇ=/r,›óf«¹néØëÁ¾§¬Ÿåó@˜¶hh9NŽö“XîÙ63öFEŽ¾BhÊ®Jõm$^¼üª´‹ãì²±&9J—vs,vdtz1êþÓv–òü¾üÜtfÖ£‚Y8ßíÐÈ›ÀÚê^ÎÂxdt¢$&Ä4	ú~<
fu²ùLV€Î8˜³=Þ¦ÙŸNÃ¯TÕf@–h¬Ð‘Ó#6S'§³þûÎ÷ÆÉˆöÿw<žúq¬#ËZágKñ…A9j÷¢þ(k‚²çÇÁÐŽ³F]ÿY*¼0$g~Ó¡Ýx¼pÃ£Ïd2ñ£8„úl¡&ž‚•Ç‹¼Ædçú=-»ímq†};–Ý‰qÞaÌg¾×‡œÃµô„Úª
ÐFzá`‡ú;—óø=~žÏ!éN¼ÀáÕŽß—k—óiÇÏŸ˜éËï6VŒË1â“s ¬ù¾ï†Ä$‹¼õ…m S{?Ï©]î:¶÷›ó`:·÷›>¥w§´ã>lóâÙØ»:ä÷E=RK›XÊƒ plvßxV×µüi=Ë½´´f0Ís–³°Sè]SJŒºï`]û.v:ÿË¿ô&³±ßì‡R;ð=’½±7ýL/•MCÂË-¹›ý±ï°¥9ÙÔv$åVªe[Çýë.ËÞ}`3çîä'½<éTÊÒÜvû,ÝfC¢læcû¦Î`+ãŠ/¯gÎÎº“²íö:¥ÞÂÿè<7¦™õ,‡Kß›ô(ËÍ¥,·ÞÅ;·­9Ïa¶ŒËli¿Wá‰§¦@è,¼ÍíG”9ÇnÿTç<$ÌEµŠH}òÇyÞ¶¹'kn×LBnˆ?ŽýÛ¶{	ÎÜ~ožžÄEèŒd—}ÖX’]E¢}w(†Â»À¸î[eø:®¯&½³ÜJ××xh½ÒvñWç9O1¥(ô(^¼"UØ;1>Ó©í4ûé:àq9¶århT¶•¹tÙXF£Õu4é%ÝˆDŠw×*JPá«q«!Â¸”{£‡Cµ>©ÆM±„XÍè$½G*ñ[4Š;‘]OwÝ%2ÏaÕÅaÔ˜…P)ÏÐrÙO0íç°8då³<ö ½|Ehð_á—S5Œ<ºU:qsŽR<ªÈ­ð{]î9gåq­œ}‹º®?]4ÖÉ¨‘’B±Á˜ŠÆ ~r±ë¬!P/$©dõL‰@ÙƒÆç8…ýUo>ånvìçŸÉÖîÈÎƒ ¬¢DágÿïÁ m_¯æ¹283»Ô$÷ùÇs~¼›±K~à’7^™3äÀéÖnrGáºòì8K¶ÅâËŸ%æ	™qÆA¹œÍ„ïÖÇnqøŠw4|A¬EmrÑŽWl¾)ä¢ÑZ^-çL³ëMû¾%ÇM¼Æ¼øjÚ'yìœé¦¨î¦J)Å«¡±Òâìì,Ä`6Û‚'ZVïÇRWÎHDîÀ2–- ~’èÊÉá9ìá<êûŠn?¡Ô/6Nþ×‡”N7µ/V¡á£ÆÆF¯k…çêüäI^V­ƒm	5MµpytÎ®z¹e›wáP
ÝˆËayò•:.	¬ÈgXõœJBÞû,²Ë&±8M¢Í¬•WŸ#ëV ˆ/œÁj^ñD²ùlÝÜýJhE²iˆšíØç×Ø^1³^VE+Z5·Ã‹‹¿ûx”¿IÚëyåf‰(·¾’; ¯\{”*69q ¦ÕÀhdìç&yñâEÎnÐ‹ÉÑ$H¶ø×I5Twœ„äÌ­õÓO×Œ=9\PíÈ
8¤"·ó Þ ¯xÞïûqŒ¦«æ'×ÕCÒ÷’þˆÔüpˆç±¹l)ûM(Fµ
÷Ä£¿6+uüâÄwû}Ô€Á. LÁÝ$òVoN \oèZÇ7ä<˜‚jèfœ‹Äƒ³O¦užçF]¼_])á‡ëŽV&æ—5V˜!äÛ!×¾MÛŸÕ7}Æ·bÓ0A5=¼@B;º’ú"˜¢ƒ1W+0«™‡¸wl-g>hù¾…â¹á[(Þ¸ƒ,Üÿp§C:‘oÂhòÃÇð^}×.Ç?œéó»9:N;4çC»‘ÍñHÑùƒ“¶%'4¦Œ}Ww³
+ÙuŒ*‚!ÎU¨B€õÐ¿HŸÙ·ÖäG).!ü=s€Ñv/¨*7oãÅ˜·otrü<nÏÆRÂò^]·`6ÜuLSñM·ïØuûÔ~cßóÏ½ù8©Y)4¯Z\i2*…áô×ú"ð÷vÓ½!^^&§x|Î74 ³£WÄà/î‘Ykj±6ƒAÝ­KòÝë”T÷~±ÙlMkÕQU¼¾Yroc>¤û¸‰;åI3Ñ6f×éžQÜ8´^Àfg‡$F”ê+¶{†nŠør¥Kx/‹Þ¢ÃáŠÖqv`ÞY2Î™
±GŽ%vàéëtÄ€Ón#?VÀuéOÞÜ„‘kg£íkºø™#á ãJï)2 ùN'´ïuÌ©0ŸàŠÑö°F,kèéâ‹H,ÑZºÇ²²ÐÛ.=Üò¦cdCmSìš`·ŒÊF@µ40¹š¹û»1·Ò°¸ühnæJ¸o£>„Áƒ9>âÆ‰ÛñYõŒëEIcÉéðçr4qÇ£qh š™yÒk¬™—ÖØY+(w°ÜR;ñŒC
ð+Ô9ƒÚ0ó¢r||»žP0²v©Kªº:,© yÇ ×
ÕÇ¯”>ËY‰ÞŒ›ÿâ ÏK,êl\tŽÉM A,VYjvDáû ÷Ä¯­\ß@’zý°°·Ø¨ë„8Np2éeUÜ´êg¶]´“¤14+–Ó
õô×v±6úÔÍùÊôñ4®^VýÆì:‰7f°æüƒXúAžžºÕñV—:£¥XÍ?åz8¼Ø)t0À'ð­£Œ(Jô¤òITöaSºJôšár%Îzõ£ÔŠËNž›ÜóÍ¬˜Â›Ü>Æ´*;H§h‘¿Éã$®æ…O›¶á‘öB¬zNPª‡‚c\^&×#Ž~òæí&Ç—óù—í>w”¦Ý`hÖL%õ‚ûUêRÊ¦¾Ø¶„ZË"²Ë²
O¬Ø%iýº€„›\YÅ -š|÷ÄÝ&`—ËáÙ5{ÁPàÈÛ×éCø¢çÌ–ðVŠÛ!TžÓe“üSxµ+I”Vrw–nÍ'×ÉA‡¡4Ð[!ÇÏõ.÷8Òk«ensÐÞòF³èV~¸+¹u_YuxÇ‰éSN5õk†	_êÚA£ê]žË’ˆÍÅ|Á©;úÝòhfËÍ'gyáö!ÇOg¸—[ø±L.nLÊŠÃ‰Ï.„ðk¯šIx^`¡Ø¯1¾o4¦2²’ÎðfÇò¬ÜhÈê¶×`d¨o}†p×ë0’r¨ÈÅEþÕZ?çzm¡àŠ~J]“ÁÏ]•ÁÏwçæm97iòæ#GïÏAW)-v"md”‰¿IÎBªPýM
ö&ì™©UA¸wL½¯ÁÐ£Ÿd/½š²Dðo]å)uyÎŒywÍr [j£ÜEùœ3“évÌmÉî…1Wºÿ“{†jA%4™Èÿ2‡rÝ°ÁÌ2%î|qM(Y»¶•
([ú‹Mxœ·À5ÞQè¶­qÙ+L„Ô.èåûlçÁög`=wQ¯ò$ca2)o¡<Rìs¯Ù¤T8,§ûä©	ÅJ‚5ÐØŠ=ÐXØ„ÄtÉE SŽ–ð‰—}êÀÕó¹º‚aú2Ÿ§p[ž™[rbÇŸ;3Î‡ÉBÛ/yMŸó)gHüê5ÜÑÕ™%O¯ù÷f,åoé[™
 ´;y°ð/ö
·è[‡)ÓØ­r?±bìnÐ}DŒq×¸H÷:ÆÑø]ÃÇXš½Ï2´ù\9˜#l5"\°|‘l)î;pë\…:8&™Ú®°³É†°·—Œžá7‡MXs~?À]Y?@OÛÂTNso§
B¬¾ÈÆþÏ  ïuSïÜÐo¡oM,ÌiÏÙóv¢È»j¢@mŠ.‹~Rã }öÇ¶3"}È+bÍ*Q'¹!¶A‡Æjúå%ZËv«é#?©‡‘-LÊ§:=ýžgÉ‰p#°œË›ìÇ(ØnÃ³niIà‡?Ô¤öã„Äùù30š'$?NH~œü8!ùwæqâ„$ßÞõ(v!x=¹h’ïrÒV]NÖ
"’¥÷Drp]&H~Ì •[î`ç·i”EË‘Âä(˜M¯vj”ÈWÁOlíJ@°{Â5Êº%!ÝM/nªQ4‡_cíš1åV6z´^åX¥Ýá™x‰ï5ñÝØìÿö(&?……€‡[(iþÙïtúÙÏG1ûÂžôg¤€ÎññÁ~wï1€ …Ï¿‘86}’Ò€xð(¨ 3›ƒsÒ#&‚Óãîî~ç`ÿ¿!Èàpb˜áUÃŒèÏ”è¯GAÜâüëtPì){oú¹Štt~NÓœŸùÑ$.vö¶†jQé¢‹È›åûI_È«Ù‰t—¸Õ`¹mÂÌr!n>|\Ê.œÐÆ½˜ŽÙòŠî”»RfóÝ”"ù[ú)Ëøg¨ƒéG‰¨J¸ÙÀÄa‰{âæ ˜‘¢@…éÇäbrÿ›8q! Á±%ÔÑXà~’~JE-,“jµNLªúØŒÃ(©•†­¸P®ÿÈL\Dmaž4äð­¹¹´ÊTN‰ý¢¨sÏ¾×æŸ7hpvH¹•W,Òé'rsnÑ‹\ÞÊóú.Åà.…z‡¶:©,²ªØ‚]±HC&±*ñ†‘X‘„8Â@#…8X^Wb®— ÂV¾­¤ˆþZÀcOý	©1–Ú"?“v®í°~ïY¦BûÇ,§Ÿöt Ïò*ÌòÚ]g9—QÜ·Þx¥Qrµ½_Ç±ôþÚíÍ•ˆ†ªÙ¶p§­ ·âÌ‹bš˜®­ÿ®'ìàZ¦PÂ‚ž2@H²i‰D2 cÚõÕúZ}½þ¬þ¼¾QQo­Ô[­ºpm"M(GAÓôhzÃé¾¥}Ý2}ËcX„©3Ý¯Ó ‰É2:©‚¤hWÎÝfJUZ7cŒ3Øl¹‹L‚)Î±ó½éc³ÚÌ).3Š9ŒØá=Ÿ¾Â°¸Âsž>Ì÷™_ÀcžmŸ Ø:©¼#O749BµÉÚŒ)çOoÆ¡—Ô Lî¶"g£ðçæXÅ)s,ñÙÇq”•“(Úzm9'¸í~‘<É‹ïíJ‡c½päb,öIoö?3ÁŒ‚XZ²ÄI€¾ì°ö—%wúìüÓ¯U=ƒß°Îác.Þ·¸£Ï®íVUÝÎY„âC¾Ã_Ùù{$TÌ]ù)<9WXd^A™g‰HÄ\Û1YFÎØ¥½ éf¥¬Ý÷–,eÖP"$Ðï ÑkT*GŒÕsf•á&E)LÙÇí˜«H?bZ=ö#œpjÿ½èUDÄ¾½faµÿô*¡ Øìhë4ÅvâØc€ø½V„f¿ÁfñÝÿ›Y^K’kjÆ}XbÍ{¥Qñ$i¬Û¢€—U2®?¥Zª’ÞÑV—Ï@–ñÉÈñ£ˆkòQØ¡ø-…êî2¬è Ê›8¿‡,JÐŸ­¢?–œFm2’ÆL	í¾ _á¦³ù8ö5È)¨yÎbúýëëO×É3õ‹¹Ã@tw
|vüyq6¥³0ñÆ›d1nþ²`ºME˜aïZ­½Ÿ#cõñÁ_–roÓ(gçs×-‘kCô@ÙŽH~þÉbëw¹HÍz¬æåU#’ð®y‘4n”“ÆÀe·s¤BÊ·<—@hLc—Úše£pÐåâ!Dày
Q'­Óº‹m’Z­¦®G”ÜK°
kê²T§«“=æk”Š}©_»‰¿Š²Ã3¥†-]Fšá"%±Õ•ü¼es8e_a´qæõZšÕøôJÆ¹ƒþx<•‡ebÌÓ€ÂL•‹‘½— /Q+=Ö”Óõ">½ÃæãÌ$fOÿ†Ä¤>½Ç¼" ´šóSMÅ€qeó]JÜÕdÖë,Ž°+½B›ñlNljÈâÁ&ý…øÝJR"Ìz©î+—Zz­‹Æ(IJPÓÙLº\2ð¾”Á €3\£ûýPdWh=3T&[r1VËÅÕ ¤º›Å—tÄÃÞZ­Ý—‰³±&„Zî®¦,BÒþû‡Ñ•Ô¬ o¦b%Ÿ”>ãIFŸ"HpäcXvx³0‘•ÍWnJä²í¢N×ÛæOCæYGÏ°6íZ ?m5p,®zrÖG›xC=«LVg„–úJSS£¡;ä#æ;`ô{)4k'	÷xF¡%øÕhêñ&4QÙé@;k9ñ	òEIíoK¥ë¶ÄÙ|«t•¶¨Ò.]eUTY-]eMTY+]e]TY/]å™¨ò¬t•ç¢ÊóÒU6D•ÒU^ˆ*/ÊOeêgÑZ)_)#€ùÿÿ¿ÿ·|Å”Zí¼ŠöcqÛþï»2ItÆ¹ÄnÃ"³z?8diÉÏË39ê×¹£5bq´ÆBŽÖp2¸–Nþ{Âø.yÔJô#‡D3.²2–jØ×FqÍ<²³àþ4ã­n]DÙÏ¼½"Ÿ~ºÖJÝ0“Û'³ô&–ÎéóÃ³YÚ;…ÓOZs7êuþ é•ÚOçN)ÍÞqÉ’«ð„-ÏW¾Ž>™VÔMN‚›Ë3÷ûç©™Sy3P¨'Á´qÑø°±‚¸®˜&#ß(GDIÐÿ|E’pFS;®ª”’Ä7AË–Ä#[I¤°,ç¦P¥M[Ê 5Áø3$Ø5"[‰Ý¶aÅ°‘ÞòÝZNFÝ»Hüðýð˜|Ý‘ºÒ©üÿÖRç5{§¶1H¶@±X¸ª_’ÉZäÞ)4úXÌýw*;ÿû7žŽä€@Î¼Xéøì;D¥kvÌœtÖqd%~Ê‰Xÿ&ÔJ8ð0Òå=åÑ:ßî…ƒ+<0ÐoãŠð/Ê)‰=I¡d¶Ç$ÚÒ!AŽ„ãSÛ2&_™©_Á“šÓ$æËðxcéÆ†ü–ëJK¾õ&?+ñ†,âðB€Û :ðâ‘ž!(`¼A–ìv2 &ÝËû¾ÿ‚{fæÈem¬Ðî8JºýÙì¸\z–×53Ëkä®)9 X2äš¾ˆ‹!ó0Ì¢¡g6LWÎXÞgQÞ¸,20ÿ1Ú[š‡'Œˆ7@¼¶¦bŒ	|û 9CÚý–QsÎ_“…Ñ<Å/,Ú˜¿©Xóê¤G÷¯5¯ÉÈ‘y5H­'?HƒÌÑ`*Ž`L¨ŠàrXNOÈ¦oÁÚ\µåƒ§¡j]l!Xy¸{MZwR"*˜Íñ	¯Iì¤càÉºÜ'îö)º¬¹<OÜ”RÚå­y—ÿ…vÕŠ^È¨V¤­"°:Ø„bç›+g7„ªP.þcè&þe)/Œî jœÁ ïÆ³¹œÞmçÇÑœ¦”û«i—·éÑðÂp,4ƒ
»•Ã&da¤ÆèoÞ’³¯—ëÜ¹¼­GŠÔ®rÅh-ÏåŠEù&¬‹[¦qu§Ó¾¼‘ãÜXãßƒ´Ž©ùßa0­UëÄ~„\_·‰´uŸ|ÈÖÌuË‘É.Å‰È@xŸl3×(•º0œ™`?Ót=Á[Š•DbŒ6­Í}‘?×"[aŠ5™!K¤À²'ütm–rßƒtøµ‰ÓçùÈãµ_è2Þò;]ÊóMRm8™Óíp´PpÚ»àÓ½ØVµãuæá;Ÿö1OÛ’|h­SNL©uŸß Êãïµ21B0 ÇSa9€â’ˆ‹b‡9ª*1"¸/N)¨./ÂìŠ©|–òÃf°[wIŸl3L(êæ…ÑQmƒÒ¤æÃÀ @¼‚?z¬Ð„÷$ië*7aÎR-?J®Ë§‹Ž]éF‚d™@ºÖÓ‹Pùìîà§÷bþœàgÞÊ·äªUívl‘ZÎð…á´1	ƒq^fÝâƒda!ñaƒN÷I$œyý }ÛN6ØæS<¥þ]xÂ	*_2
¦ê‹RA¬®©Çá$˜âÂÇX9TPt˜âîškOŸòXA¿Â“Wœ3 «•¹â©<+ÞL¢`R[*ÉÊ¬¥Ë„|ÎõýÍ>Gš·k8°%Â"A®pó¬ev„r5÷ã÷áÀ£¥«¢Ò/¬U^Iq†LÚ37FUú>Ö4thj#µyÌ<|‹6Ü%³ÐG—‘¼°cbÆtCÃ%1ÏêM€iÔLÙ+nAÊÍ;W”iÛj—ÈÕÜ[$¼†ÎñóEËæþQH.·Á¸‹·u¬LqˆŸÜ½c.ßùŽk=œîFŸÉ"‹÷>—!½à£,Bõ®Uáw±zVNüIø5Í’•_©p…œE^<zèEÅ&øPyAø£…´]›±ƒïëösÝ3„È©®!ÔUÃá‚¾=ýÌéGz—~…upóä	ÛÅì½ÿëáþnçlÿèðwøu|tØ=<;…½Í‡JWd•!»ád{Ü>K·U'•÷^/ˆ½éü-ÄŸ½ø
^||ùäÉ9l)#ã)bN|Ì¶ëE*k×¸âãd> Áñ;ƒ—}OSµ=aKA¾ö½1¨T^„ß×°Ú¿þÆŒôÆ¬Ðf«=œO¨	Œ}Mó ðBOn6‰Üý&95á€‡€6ÅúøðQ†m“0¶ô52œ¯61E ”Õá…½0ûÞÔ„Þ±‹ÆèYù'7,¤%›·óØßóã~ÌDÚÐUê¨}üj{óp UN`U5ŠÊESêpÑ:WY±÷À”-:+GNž&âÈ’ÌC¸…wÐW^QªT^JUa`P+½É,ZjF>«R[þðÿ¬4^|\†!T*bóË7¹Xs¡LÁï[ÛdÜÔÉŽPYböø…³(­_’¥Ñ±È¡ß©iõ¶—éÛ§Ê$Z
ñœ°š³yoÄ#æoýªùá‹ DgŽCä 0Zo×c\ŸZJ4Ügö‹Óç«”>†U­fƒukøS«I9/Œmm5×2c¹ QÙi(F—çòäÑn-•Þ“É·eÒl©OÇAØÿŒðW„«0•-|&DÙ
Š2ÆBu@Åq¤Œ¹ó`Ê6³•}È[È“mÈì¤ÁJ–/vOTEWøØÊCpCPâèæÂ'm<´ãtÞõÐO´}ÛÒfy»Q1BÉ£RÈùÿ¤Kh º*Ôï½Kê¨cçh-
ûM×ˆúXb‚»Ót<ü»âÖ’6±*ó¾„®«í¬JšJ(å‡ý&¥nvÈ­p”÷^2‚
—µf“–Ñ¸º$¸_*5˜øa*$"J‡´ˆ$¶7ÙÑ‚Ð¬²– $SêØ¦D&õ£Ha×ž« ÇýH½w¾7 @Ÿ¦?°c*nvj 12aÖMãÄ?gåàËÖ»³÷{Á×îØGg­šîåÎF^¼ËñÈîrf
H¹{:“iy9è?}h’ZS¸8Ë[æÚ,¤ OøYˆAÝÏxDn}0<,öÃçôÍ‹ß;ggÝÃ½Îán÷wPNOö»§9ƒÒÇ¯G°3Ö:l£Þ³ÅTáýë|ê£vû×ùø
ÿíÌ‡ <ðÛ©?™‚A`àÇQ?	ù×CØ:‰Ç{~?ýþWo:÷"ÚÈ¿‰ïï1A-myãJØœc5…†²ˆÚ¤N‚Á¥¶ï…­ù½Mª­j¶¥Å¡‹•NÇº¦†@_^Î‚°ÑK96î`š„d1©M²ÚÀÿÚR=ªE.Q{±”ö¼&õLXls©à³¬àjnÁÕ¬`[*h‰–žþª ­±ÖXµ¿Q¦5Lé·ôŸ5L
Õ&™Ô¥gLcÃ¿òÓÏþ”ËšO%ß’,ç•2‹Á÷ Púäª¢.~Ù›K¬2Ã“K]g8úŽ¼ð2‰×zi}-íYŠâ|±6E$þ×™VNŸ7ØSm…QL6ñRãåÑ9 Açõ1&KÐãL-Ò3ŠðéY’2Š±òÙïëuÄ¼3JàÒž:´´ªKÒ¾I”£´ñé§kÞÐÍïøUªsó‰Ã²S}:êdjÓú© ›åîô`h›äÄï.¸”­ó-ÇÔ»¾É”"·U”M£Ðyu½þˆ¡/[?Ø ³Ê¼T€è=/òÂ†A|€*¨2ô›ïŠ*4+/U¦ÒÇ!4ìÏHÏ‹ƒ>›BÚ&)>îyýÏKyŠM³üq‰ØŸ» ¸±.yN©Ð”kr•)å[Îúì¨—üvºí#¯`®ð˜oK½´]Ml•fŽz°õùê~Ã«dqNS¡R0mî	ãÔþ¬; Ršñ¶ØžLk<RUŒ„Ã Ÿéíì[vÅþeâ„¦ßÀ¬œúÓ þyG„©†¤–Þ5ý™´xp{º73ì,-²® ¥#âÒË[\­‰éòŽ‹}
—Tæ±¬M®c·×Þ’ÎG=êúÙ‡¸vwÃ	ÚŠ+áÃ%­×8Ë´@Ïr^¤»ô&xþÇ“–Å ºHÞ¥w_êåŸš°ZÂý­Bš*aAL&Øc8J¥»7 e$é2vÙP¹¢ßgÃ¦#1ÏOû}í˜”7»d…j…}?†Eµ?@˜xbðt#¤ábsC$båãKq¹“òYe€V¶M4,¨l[†¥éÀ¹ƒì·‚Ý7góxT“YyÂ’ƒ{óGÕ:.éŽ·	ñ}K9o{id+o:Ãð¤68	¡57@cfh¤_©ê«Û5Y&VÓ5TÌ'»hÓ®«€M!'O‡æeôÂ›rî©‚?Ø„›Aü)rOB¡@{µža!&rHnYªð¯éâx, q‡­	Ñ§«»gþd†/¤\^«r Ó6÷† ‹''>3Z –Èë_eoßã`LÃìIw:DÃlö í+þh£«³_§ý cÉ¯?{=o{Ù£Nä!’co
]Î§Þ”Ô:ÇKy¤wÇ€ƒ9£H{Px8ófÐ[â…¤Ö—ðB—ÍPRœÇV–ŠÄRgoÃp ëa:Å‹%ˆÂê³N¡í„êû“]iø3ûU:ÜÄƒøðü5ÔÍGÞ•<þî±Ó™ßMÃq8¼â“
2;! iO¤vvÐ]Z¨ŠTø +Ídç¸ûŽy
î˜²¾ÆÑÂËDø~Žz"vÔ‰‰hŽGWðÂKpb¡w¾7–©‰V—é"¿é7oT&ÇÏ†”.o®aåŠúGY‡)ëHøêl(q¶%“ßa.†aU¦ð†?HT=a:Z—¿¢s¼$.y{ÔÖnÄ¶^jžã1º"Ñ­ú‰Äëò;@¬B‚—ýÓ|Ù?Õ‚ji+œè5¤ãcCy2÷OÞ>nj©.£‹ˆ§ï8ÄÞ"Û
çAüÒ€«W®Þ"pÙ
—…KØã`¡$Ò¤ÒŠMÉøTŠs¨Xj½%Û2¥Ú•(¡;²è½Øu4­1]U#2)Ûõ6]sS^¥’_?WÎè#M;£«8OçRµ.mŒR9«ž¡[ùîÈÅlô¹Èç+¿ÜËü˜1@÷Ò—å¢LÀ]W™Qn¨HÁÑ!7@â³1MÿMÝ§ØnËhÿõšáÅ­c£ÍúÇSP¦µ¢ÃÍ§'‘:“=–ŠñK1†QÝ¯3Ì±ÔSƒº&ôÆdÙ¿N|ü XmÛµübs§Rqæú™˜ó/šbè¶vÞjè'Pr/» •¾a· ^ÚWxŽ¯ c]hO„uï/Gè1<E]W¬5ú6[x¶-ˆº±/<}A—£×¥ÖoL«Œ
_"¦O?32§ÑA(@¹U±®Ò±›ÈRšÊ¡(™ž¬»üÅiI£ m[ˆwQ$K'€Ô&ÑóªAÛ ?©¾+üb2·
ò©R/Œªv>H+5“Ôü$ 5Ü0Ø)aí Ž >Woðó``
ßr²)•Bp,…´ŠÕ×	·ªã+Ó/¶Þ([™oFuzÚØ§ˆ\Ò”à²Hè»Þçƒ•U®o×†Š/Ö-³+K”º÷Ù* +¦–%„ùDÖÙÐš‘Û&tàÌAª§ôá‘_0ÍƒqOøH¼ü 5j?>N™–2±MªÐ,}c
R¨Ör¾ :“Pb:äe“Ø`µõùxFªœ¬pßŸ”A Ž9GÍè­?Åí¯ðwHDt¯ó¬Áîö°"ï ©$ 
è:²µÂi›RµÂ´ØózÆ™vRZLý´D¹ ¥;þ£Õ±»<*.BÆK¥XbÆô¹ÚÈ)ÌêÑÈy:{Ð@þpTóó<eÑb.qy©Td¿në(C/ÝÚ_SÎ÷Êöf“´šéš°aë—myˆÿIæJa†9(3ç¾ÒâÏ
îÐkÔÒ:³õ¸,ÕÀ5 Yrbû0À#´ƒpR¨=ñËâÿ‚“:6iNTi§éÏÅÙûû²+ý]¢™'.×1NZèš·è%´çÅWÓ>Qïz°{ÀŠ—¦eàÊ˜, ]cÇGËÆÌÃ²6jþ²b¨Š_ ð—¹]Õ²úur1ò#¿VÝ£cÄövE÷^Ú·žh[§SoB<Ñô.¼€*3€Ä¸öEEO•âMØê%W¶³ðAØÇBÖ´<?¬||iTˆe4óÚÍü¬)RDâš(¨íVŸ¼ZÖt#ŠóCYênìI¥Ò)‘/)Dn/’ÓNFéK*¥;
Ùl}êûWó£HW¡Â±ß„ÇaT«tñF¶tƒÃÆ‰XÜZÀºšfË~jt^KÝ6têÑ¼ ý	º›³uÇ¾+k®êAÒ¢çCœÐÛÓAu§FËQç¨³‘:¼>„í^ãýUó<
' Ð3´™:“ Ðµßë$`ÁšP§ZKš;s&Î8üL/@3ÌòÎ>´ê¤ýQm@X­o2Ï,¥!¤ÑP¥ƒ×[JuÍK„÷¯ˆ¡Ø4ŠtãQW½fêe”~â 7ö3¯‹L+pá—çEázDõÕ¡ñ¡ÚÂ€-mü³ŠÖªA8¨?–Â®ÖUÚÄB˜Õ©}H¡R±šúi].á×îËièLrÏÙ†˜oŒè- 1IöÓ)sxAen04ÖoÞ¤Í¨ÒÄæ/û*©R.B(ÒªŒÞ;Ø0©ßZï©‹ÑGfeÑ¤,°É^©¯Ç¿f…3Ô^°»&/(^xéVK<§êŽä)¦´¢*BÂ	’Ì ÷:ý¦ÌM‡½.·Zw¢î£¶é×÷HŒÙ…,sç_pfEZB–«/9—^Ì›Ý®‚`çÕH2
b
’DþLƒÉ¿b6¾’¶V\ŽÄU¦`Jü]¼ÁÝôbsµeÛ!º«JïÜÅ|KÅàÑ7Q¶m›ŠñrøÅuâ_Î|ŠÞÎóÿ×‰•w#ïã¯ÂÁõ^™aUòŸQ‚•#AL¨r(+vËæ]@ù-àHØ‘¢ÜØS‰’–V%¥©Â¥´óC²ë. ˜›È—$ÕÀÞ´ l‹Øà•!Õwå&ThÓJøÜ°0ààpà ×kMŒiÈSú­ZZF£¿ÊFUI-T©‹›°H¡5Æ:èlø$[¥P4Œ’¿ÃÂ×¬ò>¸Çëy0áÕ)\GðJOëÅÔA
?Ë'þÄ‹>Ã1.`ÕËó]2Á‰âf'‘ËTÞ}QÔ„ù]ºƒ©Ýëûbì˜ú Z4­‡á~m>ªx»ò#ü©òZU*¤ªUD\õàh÷oÝ=É‹ß2 vrt~Œ'Wcqïÿm’æú,yIF<%/Æ»zi„¼ˆŠì
ÿ&iÍ.	l€°þc…~^‚¶D³ÃA‹ðî´Â.Ë]ð†ñÒÜK‚.ÇCJ6,é&ùósï¼ÿ’ÇÄx5›„Ýh|I.‚*éùêG	ºˆB,ªÍKžâ§ë/7æÅõ[€Þ²v–„³—„ƒüÓµ2{UÞMr÷/Ö¼ÕÞFõÆ@éO×|0Õô©§·äU–Ò»ä‘ºDÖ™h´óNXzU
MÄ¦³»¨ÌM¯mñ~¡—W^_QÕ¥ÐÑ?ÅŠ¦~–-wòÁ§š3nkÖç"õd+ëQÂ,ÑQ¦,šìîv…ïhôZmEPð•a ÃPÖ:èLm''ÝÝ£“==å…”b»‚jjƒ>Ñ²VØB˜§Ø¶ŽZçëç/l«Î’eb´ÈªXÃ!/OLš‘.ÎV‹Ñ7½ßeÿÓõ³Z‚ž+sÄ={Ø…fhßQXV.Œ¯ÑnW~ºVf™ÎñMåNÃÜF`rí|í™¿ž1ìãÆ6²OK<©Œô®(0Y&Úoûç+)þ×ÕuL -Ññ51P–A?Uvì$ãd
H*éÎÓN+÷€wd×Ò~ïŒ‰ÕVðš²ê¿÷øhÃ†U,Y¶Œ,ÖÜ
Õ5».€a*›˜YˆÛT÷¼«Øyæ.´°8œZÈ1X´Ž‚Ù¿¨ÊjWL*àtãP3¶)L6~ñÀ€3OXÞä.pmPÀZ¤ˆ¤ÁˆßC}z¸)ÆyÌî­Ui^fÙÆ´6¯Ÿt o!Qjƒ1htö˜h´Óû¨ÅPú`ê$GÄ¿5z%¨Ñlf„5Ëvxº?ï·ß‹`£Tó¬=&®i»¹Ú3Û säÓ¦7y€jñL²;(J%WÒðh –Òiãå¹Ób"B#®;½‘P®Œ2C¸±¡ÞÅÈ„Üb„;je³<‡!žûßM‹ÙÑfÃŸ‰^˜$!lƒ[mDš<=ëª•…o	y‹bcµ²ò——DÌ
f}©g*Ü$â›Ù§aÈ‘·r£nk<4O8Ûtlü%%
jX†
¯ÓfcðÏô8“Wn“!‰£>n÷ÒÙ./µ¬Ð9HìGH·š˜[q3M¼`ú.}Âèÿò´I¤øœ™ÀlÜÂä>^ÿ{)\¤6•Øðª)	†¹×=îî‘ƒ£·GŒ$µL¹+çŽ[A>¾¹+î3ùÙ›?#öOwß”G¿ÊÊÍp”ö¼p€Î mŠ‰þ6³„( Û‰OCéõQ¹€9á•Î&ÎáÑR·­U£×dÕîNSÝòVŸ­£r³çÏ¼(¡&i #½šW€ZamnÜ<ò‡x³9ùár§rC~îÍÇã—¿Ç<}±R¦$¦ZcŠ¾ õÒc¡3Ñ‹/BRStf¢UQ"{èBèWY †l%<ËDc$äct¨qii}ìý2OoÒ‡/dÝ›ÇL;SxÎì©UqÏaß‚'½xèC0–*©¾y±d—äj"g—î"0á·_¬ödÕe%ã‘
tÖÁÑÏƒí|…È%±E‹©¬ÏFí·¸È%Ud­IÁBVb(íS¨¤6ÒçëëÏPi>89ÜÌc%:T»0Y«&é:ã÷MÆÑTÚ5ù¿â¾Ä4M>·ÿnØ.Àïaç}÷žœ³úÜ#’i–Ú„‡‰e7fØ÷¥?)N;oï¥V¼¥Á‰†þŸ›O»ÿøÎ$˜.lÿòÏÊ·'½.ù™œbd £ûf‹¢µVp#^=¨üCÆECÐý)Ë¢F]§2-GI¥FÒžÜóv3õ $Í¶ÿìvN¾	+°š,ª ²¶Qô¡O¦ƒÀ12›6èXç	©½Ý
~×	æ ó’9èZ4r£a÷Ê¦A36ðšéàŒ—Í±€”²ôXí„nÞÄ†²Õ\]—ÔI¦¿É
×,çàr&Ö9»uot˜Yx³íî€`*Žé˜ëJjá¬3­~ÜŠÎS[10/‰GáELwr^vr	‹Ø2îU8H„S4òb€P0…},õv›bzÐŠiÀŸÈ‡ð¿“ÿBOË˜ÊFrûJÝ{šå@Ýà úÂŸšì‡õÀAˆç ~øq '!ù</È{òzá<‘à}]ŒFî^ÓÉïÏÅÌ˜+’å,%um*7TÅ¹?‘–¸0«<3 ´ÙölžA:§2v&6i#l«bÆQ«­XuÚj=3¶Ð®“òuE~Wö¡ú!¶f1òƒ+^YßÚ—”EÜúc,zæÌ#Ö—†5÷LmîÙÚóµl®v*8 ¡ßã(€Ù>ÂhÞàÈ­lè¤BOÜ*ý;XzWŠn¿8¹w¥?½q`éH–)yôƒ™7þ¾”'k© `ëqÐgqòv²) œTI
‡jR¹g#†MÒ·u»I	öÌ¼®„.ž¡~1<,ç„îeÅÇöÓ5¦žZV<|™³ãÍ_$cÑªà[vbñ´Û6‡RVÑìƒÚãÅn'UÛ¨/°aœ7ŠA¡é8ð2U­Ú\Ž^6d¯±\{}ÕÈøkMõ@ËT^K««k­uÉï‹nB5WŽÃ§ì‚
2Lï¥L¹¶"|Ñíâüž4ypxN„Ú¬[¨]ªš®nX¹¦¥K{€¦ö–eÏa)Kî"Ä	%ûÁJeççi/ž½ä¹LD"©{ì}£|ïåtßg¥Ú…Åˆnôp±Ó†@/·¦.>Â‡8$–tkC6ÞñÌXÖu¬N‹¹g”]ç´RµÆ8›`Ÿ»hÎeÙ¤¢5ÜíÍ´njÏyò*î¿åÄß“Fû(è W½…Ù©HTÚ<‘64íÏ-Cm·“+9[î
¯ogZ«›ò]t®nH£Øâ™7 Ì`\ÿÅvðD&Ùµä»~þØd™.íïS”­P•ã„´ÞNHþ-9!ûa1Àwú 7N‚~f-%g”Ö%ïB¼©7ˆÂY8§7wÉ6^·W¬ðA¼?õX”ÿÔ+¸'°ËcWÌ«‚Q¡cäÑƒ¤üa-·ÝÌxù&ŸÔ^áæ59PÈ-äÛ€æ5¿Á`A¶ñkÍÒ‚qûuÂcÇÒÊ4¾+vÀSUþ¹7clÅk‘n¨:§Ãª¡3‡¦ß^daoåX"]âv­$¨AˆÔyÉòòÂYRž•ª-ÚŽ2‹4Ön8¶FXƒ=öª>ë,;e+ŒZíÝ‘ßÇ¿0•%ßòHÑ‡aéRXm§y47Æ·t¤QÉn–¿ÂùLH©ÅàÎ"è¥×Ø1F–Šk{ìG3äÞTÇ÷YÞ‹,Á+MG“5Ë«õ­élRï_ñÅœ¤<¼±Ç½K/¶÷ûuÂÃÂÙ“×¨«°B%[lú¼j‘z9UÏ£ˆFgd(×&áPMõ.âßû_]•hê7ºÍ2¶ø¶AZ‘"FdÈ0R]Ú×’4Ü–¹²Hãý>^¾…ÿ»ˆà•+X#À›»¼£tY˜K‰—z‚çâ4Ÿi(/¦DA/MoÓìªü­5Ô!¿x\sN÷ƒÎªñòô8Ï,"¼<ðzÈ€îñOŒ©ª]½0ÚWó4©-uxÂ'WciÜ³E%ÿ’Úê©”Ðé-g‰•ÔfEê£Û|še»²rË€¬ÍŠJtr—Z=“€µØôSêþ·E—£º©t:K¿vîÝiÃ› 6±ŠÜ P­³Üÿ5Á¥Ö1º.IlÖb»FÔ+G7Åã¶œñ?[fÐÃ¶³pÛ,¼ê,¼j^³©	öÚkè@eñ¦,lÒè6%šj•ÐA	DeË'Ï>4Î¬¤&í°ðÂ_P“ž»
ØcÎ Á(4LC|F"qüWo¬¦?œOr¡U”KZxU‰pÇÉ‚~\Aö+Š<Ä[Î÷¼ÖX|—Ü&fÊ[æ?—û¶å2‡¾TEnl`C1)é§x1ÆJÞäñ{TØYfÚ[WtÒÂ‹×Ã]äˆ4ÆŽÜ„À+òi¡ ŸäÊ›,Ÿî_H›GÖv´Æ¢&Ð›/Ÿ”x#V^/ñöŸ®³QÜ˜n.Ws5u7_s/¯ˆàbÅdn~Ÿ¤‘ÑÈXTÏ?HN€Ç´žÌŽj-cÜßÐ×Z­Ì§ö¥…2Ár£UŠ<©ì 1­]x@2–@ëy*P$6 imäeß
úöb!Q6\—:wÈ7&ZçíÌôÒó[íÕ~‘1ÊââK­¯ô½hyG±_\!›¢ÓúØb	Jó'nJ'í²áãU¾U#5\à/Áêð¼œ:sMž ¿§ôè‡À~O€I²—¤'ï©ñÔ 3‹së¬ýhÖYÕ©ÅÖYûÇ:û±Î¾ÿ:ScÛ×Ùê£Yg«¸Yl­þXg?ÖÙC¯³ÒhQÝ3­½µG³öÖ`_°ö4s V_k?VãÕø«1ýº¼LhÀlæGÐ}BÛuÃò”¢à.gA3Š°¬KMÿ+&)ùŠ%¾êYDä¾¨AƒßKE¾ Rÿƒ.ë2án*;ÌŠ£ãYZßhª³¦M½çalYiFÀLÊêã2‡Í}ç1Ø‚(öÏçl8 ºr}*„ì*ÆU%j­.ÈÇ´F,( |aú;öbÆKh©mò|ýå7[Øn:Çø`2õyíùÆúsõ¹÷¢Õoõ«7<ŠXVê¸szÚÝ£…Þtöà«AOß†½àAŠlÆR“²‹ÓÇígçºêd§¾é±+>³¹d$Òg6fVF¨«žÛÈµÚ¹µÚŽZ«¹µVµð8þ°Ówwõ5í?–ö œÔ™Z°ðAˆ˜/ìÖ<1žŸ|àÇ~úÁÍìºì)ˆÜ²å$ÄÕ¼ãDD¼¾Ý©ˆK¹“t%NHlÕ,'%´˜’ãºÄ‘‚C›ÕÕ-Fã½p!¼HeVf¨ÎÌmTù+"@Qâ´2ˆÉ½4­[pØp¿ÈpoÕ^ë;OLZ¹y@„˜Váï†—Yø~bšîì1Íwß!.û]„Ü—ÅŽ$ÓÎòÝä2´Øô0ÐÔÃ¾_ó\¿“msdU’¼=îžz˜ˆÜÃÔ«)5ãå˜ž‚—œ”:_‡Ì9×–·8|Ô{ïëgË‘°ä›ØÚ5©ð~KƒBnôbÉÖpòšV‰KÚÄI“­é]·Ó·4Ô*Ôüíì9öG—‰#C„í[€þÓµ<¸avoQb`Ûríb¥Qlh¿ÏÄZ'Ò_óŸIËíE«×êY#1Ê¸ø1«7êò¿W~XÈ|˜£=QDîJOgÞt/²äò¦¢„qÑR±³IÚ¢¥\GÞ|ÿ]¯T@Zp™K¿èö¼¿Þv»'ÒùþyÛÕb–h¾Æ
.Ëœé—ë~º–L¡ìí«\ÂzïÅÐez7&QÆ»ýôÚNž(SÍçð]z•Á6Õ)(¯Ò?X
é´ò¦%¥§HJS‚%åÌ42®	Z£÷ËlñÙìáaNºÇG'gäèt;'‡û‡oÉñÉÑÛ“îé)éîä
§§ï»‡g¶H1yiËÌ¤eBò©#¹ƒ>5.½P²%#½‹¼^xPÄD$·Nä{f¦Ÿ®U¢K“ŸÎ­ùÏî: -þÍš+œ³s<R4 Ñ’ìÊ™ìèžA__tznIOF©šfIŠu¿>[YB~ˆ£Cf\AU–™¨¸¤.z”°7ryíF«Â?ßÌÇc¶µÃ#ŒIo|EÙ'ÍÇF—^WÑ¼Ä÷Â¾ÌFÈ‘.'ãi¼nWçÑt3î`¸q ŒÂ8<O ?“Íðü<èûüŸªjûfÕ/JTG l•·«£$™m./_\\4/V›a4\>;Y>éî6Àµ•jŠÇ?ñH„·*“íÊ<9ol(¼¹éÎé›Jôòo:ˆûÞiÈ*<m4>À¶h˜ød‡äÅGé€ªLÿÅ&b:ÇàüÍ^l¢¡Wš“­eþK/ò_a8Ùi­¬`ú]/°†Éìa&ÀUß„Ñkôña©(dèdkYyëé:Î?6ÒCº²äöþ×-ªUˆ1õö‹ç“	i·V&Õˆ¨j`­†D}À•šµÂ<ÎýJs-˜š]X<¨QëñÁR¸é€»ÞLAw5€«_«Hê¹7	ÆW ÿï?ëEAµNª(ðÆð%ÙÚ ‚Îõã-ÆÂ8s´ï¥$çŸÚswÜ}¥¨½ÏAÒ˜!Á³’oðßó´ÿÒë'®aS6ò5˜6†0trÔ	,gÌ	K1ÆÁ 	Úwõ``Nde–¸ŠDö"yãHô¡¸A±£^n¼‰ÖŽL6ckQdýik¯má,\=Ó&nÑ5;FZ°çt^ù!””åêùùFc@ždäÞÔ9ME•¶­(‘³CŸoS¥U^»ÕYëÚã÷2m£“"zj·8­¨”€Z–²JØö>ñ£¼´'lp!5 Ë¥ƒ®Í´…|„]¿²¯…5^ã|t‘¹Ót¼<,>Ó;¶d#ÉåÙ¶ë˜™©ýæ‡†+0¨Ú…³këÓmÇ±Ë¥óÖó¶·Ðj›Ë’DcÙ,¾¦ó1æâó+5žU}<o\×ª•ƒÉOù ~	TsÙXHÂ;ïé^U8'[¿íÜ…œ]Âj¿7X÷[V¬)±ÐòÖ°v-ìªi[ËŠn¿µ,ï¶´ü—’)J(ªjd.Ø‘ãÎÛ.i‘ÚYçõA—½!m²{tðëûÃÓ%"o*tCTª¥¦E™Æ 3O¬ÔùA÷ÍÙ&9z}Ú=ù­»G~ëüÚ=%?)‹¦

ks `š”Š-["h/åBåÙòlñöXÞÇ³ng÷]÷pø-y§°á}ß9ùÛ©5WŽq/'D[©,”Zìg¹GÝV¨LSŽÕPý+pý×ã¿i/böyf7
Êqø˜™Ì–þ^û¬ìì†“	uÄL€ÝZbbˆç.äÛRÀ‹ÏO×a6„_ýÁo4…jdRš·7bdTÌZV3ßšäðD gåžì¿}Kw÷è7 yúl¯{ºÿö0½¦ûÜ›î6¬ëµhWa®§f–µW{¢'V‚WÓg½tÕPƒD/ò½Ïž²Öƒ7¾ð®â—0tß‹høñÑKºeÅÐ}7ÆžÑHàO¬|º}ß|Zàg¤®-àÜmÎ¹÷ºœý`xuþ/A*èœýzÒ=­“ÝîÉÙþ›ýÝÎ…üì¤sxúæ{0õŸ®ó2í,¸ Úbtv;{Ý÷û»Ù‰›§GºÌ#¬;,…ì’2Rµ|£Í×jøÞ/¦ãÐÃäHÁpèGü³p÷ÆaG;|_kªÿg~îŸŸWÉ/²õûc]ÒÙŠªzBŠ¥U]žÄXø¥°)S“r•WÈœ°X—óó~=9höa1&þu‡ß5F+Œ¹ãÜFËËwÇ>þªU½,N¡×Eþ9”…Æ³g1òmò)/Ù_3ògc¯ï×–ÿOüËò°Nª¿W—n~?}óâ÷÷3øï-4ÕOÕSxpš€àï»˜H¨æI õ9Ÿ30µRäOÂ¯¾^	qù_ÃÏN`@üýéÓÈ5?’âV"šBØ\ÁÃ0ªUèqF÷’ší»øh³R'X·ñDøX3ôú´d÷²O£‚Õ$Ïúô äs/1Zã?NÿÑœ'Á8nâ“ßdÄèxäLÐ­ð„†Þoøðª|ø(¿ŸøÑÐ‡·´¡o:ôÓBO8©î†ãùdÃbæ}šY¤GÖÂizX,5˜„ò9MCéÞ»äeß{É¨	?kiu‚ùwa­uRa¦?Ø÷½B!5ÇhQÄmâ“Ao-Àèëüw8ÃÕcÎªs¯PJÁ¤y’]œ9ÂÙÞP^ô
c†ª’?H•í¸èWÊá¤`A½!”d‘3_"Fßù—lÛ:]2Â¼WÕÿ¨¦¥é³ž‹¡ÂÉÞ§¥Qý|%.aH]Rþx6‚U‰PŠh§Zmé—A8G‹0Sž³°•€ºkÆ•;â²=7aBñ
u/`ýWU>WÅ`ÑPìc«)t_7Óšý€ÅoÌ||Léu¦
¦ÿƒõ´"0{Á+è’ºÅ)GÓü¸/£Þ5¢pSÙs££ÿ&©ð3‰J]zÿkSK€¶VäH9›äéSQ
ËïEŽ¸¬{’¹©«4…ìH…oFÁ¿0[Ê8†EhjFˆ1ªCT–d0„ÝLËÉo/"ovº?Ke—f`–:ar(Êþ”áMÄ/{‡h'Ñ°—AM§|h˜zu)”jøz¹›¬°LEªl²7´@Pö £x†ûhzFeh…î‘³ðX›ú€zCËh2üåƒ–­P¾„p]šà²rtQ:ñÄÕZ E¿æÎ3ü¯BÙÇ.ò.`õƒ`>¥Ø»âE=IC§*òµXM•dLAxõtdßÈôLˆØ—;Ç¬²  ã¬'öÊè+›xøïö1Åñ¶µ¹þ½Hõªàl²ÓàÛW™”ßÇâï¹²	æwþxó•„¨4ÓTž2K®h­80YPCPþïðP^B\M¨ËÎfúå¾P|ZZÈá-^\&^|=›Ç£Z&“k•
FÛ–ˆ 0‡T“¹´”¡E<´c8neÉko:åDÌÃñ­ìcdŠTéáð½TŠ v#ÃtÒ=þõõìap‹ö®KŽßíìïvO9¸Èá‘1Ö‰8n«¾I¹)Èxøõ¦õfýÍW²T$×"¨ÉU>ÞTŠ«h…?fj{TFIj“¨l“¬ óŸo<êTƒ´æTå(jc§¥cg¯Û3´é!~º{¿ÂnvÿèÐ…™–3ÝvwãÍJfZ˜iåc¦eÇL«fz”Pâ¦„º)vOª§Ù®–û0îvNöHv KÐÎé?‰+Ñ.MRpóIÁl»ùmùXl·9r[oÖºÏ72þSyC?c2Üèo ¿þ¶ýíôÃZ>Ewe³'|ÿK=`k4*»k4v8õcd{£Å8Œ:°Íf“÷øQ‚ê½ŸxX÷ßýÏ2×,±ŠfQpúð–.'Áå%(3;ì¼ïn«‰Íj·ýbõµmV‚AÕÍÖs¶ÔJs³·š‡Ù{(~prxÏhiÆÑTÍVÁðBåZºXqa_6ÒLç¯©`îBše«%¯$éù*[@|íLifÏr-®;Zd[ï`Z{V—ê’ÖLÑ+•·T~ÚýæíîuOhrcÿR®¤LiIwÞÞ÷Úp¡ƒß€¼=éìuÉA÷·îÁ}d&àxE>±ÐJ™øÊÞÞ`a7ØEË @ŒHU	<‹V`««.‚Û}wttð<U•ó¸äî@vËIO1WÁÑ½sSŽ€é¢C/¢˜Õ²³ZÀ8WŒsÕÅ8yR)Ê?­d¶æ ³½ýßöOÅƒ ížáôvÒ}ûpðEþðnÐñeº¿÷ ‹tp¯tºV–N×ìÊm)µ3ËæÅ·¸PC"Mq~Å^îO~ËÎ¨£‘¹ñ-y1+g·G'¬½²úüÙš9aÎí†W>b•¢¹,À‚sKâ*”»?T+ÅyJ=b±sÒ55Ê\ÊÖ©mý5Vð…¦;‚¤›yðó—_2S‹œatùtÖ=yOÓXZ&é|ª¸ŸÊ›ýÃÎ¡ªŒcôÏž­¯ÚÉ„÷TØw+Z»K¹dÈ»+Gˆ¼°uÕbiúT$¢‡x4=Ë•Ñ”™ÎIø}ËlÖükéÉ£#	[A
¶IÀ¶hú5a-,Î·eÍ13Jèˆ2¹¶h-3á–3ÝVJ+Z ›E²mÝc®­‡Ê´uÿy¶4Ë–2ÚŠv¦ØbäÁn…O†(ñ´6§‰£C‰Ãqû²À/€³Éí~T€È"xv®	þI¡v™ïUC7S¨'Ô	oáË)Þ5ïM»Ñ¹®‚Â|%‡T>6¬¶ç0\:Ôé¹Œ1®Ô":|aI° dO Å	‰ü[š#N¹Ô[r²yŽ”JBôé¤,Ñ†™ Ç46JÓÁè\¦®¼joñ„[Ýfæ$ ÖÓ5¡×ŸæN¦Kæc:J>_™`Ú’0rÿš¨# ÿ"'¢L½#ÂäˆEµ´ —£Ç”ƒ·Í°pÂ|V¨Ëà°Gàµ®ï]àÖœ2“!Ÿâ)q›Œ8œ‘ƒ3,’Ó
›Ê$…â÷b­³úzã>@7"MåÃ:Ì˜¸FÜw‚¤4ªR}‹®/3<¾h%©E–¦‹QŽr E:(nÝ¨twßì½YWízw%G‹ãTÏïŸzwÁFªÂ‚AQo%Ê˜0>#J-ŠŠÖzý¢µÛÚUT¡{F¡c³hUYì[E¦„,°-²Ç®¾Mäj¾A÷6ýS>þ®ÀÒLƒÞš‚[]*VÝSQ=1_(à~É|ýÅvêPá»pÜé/Z»"xµK”²¾)‚K‹ÒÒLÇXlºýb‰wê„æÖ4$˜.køký/™åõ…³åÒƒÒÖ-oä‰ýû"­,RVc¼ª}O£2	^T–Àš”ì&¡‡CUÃ‹DAýfB]îíëPeCÊá§ßí¶gÍõ;YQ)„y[Þ²vÒ$¯«Ó{Qa„É ûfu÷¹²ïe¬ÅQYÝdÅ­ýæMw­ûLêúÅ‹ÖëÖël¢[%†b	?Y^ã°U¶)*¦LUNãg÷õû¤ScyæÀëª-_`.§eòlD·–cåUÆ‰\®c¥N×ŽøuRÂî“Š0F2íÅ¥ÏÖ ¬õXÍuúÞÑ ùó JåÎ„:ns:,ïsÌÒòq¡WGVÔ!ðøê–§izCêÄà•æ['ÉRÆœ•RÇIY¹r3[ÝÌ×ŽyYD¦¹Ís&/³xIj„¡¢ªeé¹Æ+"¦Ž”›Þ¯š¾|„?ôXÞV?Òã*ÍLÇ„£å¦Qì²M~â!%]' o6ÞtÞìZ½eë¶öðF’äBÉá§ÙØRªQ†›™^;3H²/ºR‰ƒ+ÚsÒBé;‡µ;c©
IÏMòaã¶<7»»g¸ÒzIRÞ‘!I¬ÌV
•qÒÝ=:1…ú]xÏÒŽ—Ê—wÊ€-BÏ|Ÿï–1`Þ"rÞž½.÷¾{v²¿»0“ãøp^ÂVjží:\†¶Â“pšŒÐÂÍN´k+˜[$ßE¹¬‚#Ü	Š ©œunë­`RŠÒ[!Å(¥e½†9¦íyW1.MiÆ™g¾àÛ)y,‡a“„çrmûÀ8»»Ë+p˜û|oŒEï½Ù6ÕŸý+ÊÂW²ÄmÎò›Î°v†×„ãfl7°¶»oö:î©R:ÉŸ'¥¨4ItvŽ#?Fûº:KxÅß¸§I®¯ÍÓ]f&»õM/“QášU×¦Ãõž®LZâšÌˆ”Ue’G 1IAüzìM?‹¼5„¦ÉÛ¡T°$ÛQnR´/Ò¨A³[‚Úi>%¨euRèô”À^+ô`ëõÞ©ÂëY‰"k9š`­¤$QÀêÀ ïÖô‘öYLiÑ[ìRK«T§ ¤z4ƒ®QÅÁð4ñ"Nl9ê¤.'n£Üñ	^üëî‘×ÿ$µÝƒú„îý¶Ú=Y2½v­çõ‡sq_°8ìúpË€‘ÕŽOŽ~ã£:>Ù?ÜÝ?îÜÏˆìê£„é9“ÌU"¥965Hý¥ì°R®¹Õ¼æÖe´˜V¹–: ~åGèfÏoX
—DéMê›-S)`î3o,×¥âU&–<Žµ„>?Gç\óÉšR)[‰¯™¯‡–Øl/øHˆÞÀÝƒÈIó×…4/
–%RôÂÊ¥û´ÀB´ŸÖrÑZ`ÝÜ‡A±“úþ;˜é.¾"Fa°!ãç›äÌiMÑm9—ãA>?ÀÇA_¾ØèJ\&Ç‚Üîm,NÒâ¨.¤,^n
X-"¬Õ[Öja­š„…bÞO0ÆçxäûôVÒc¸ør‡‹ôµ	Ê½ß“ðwú¦&ðÂN«|¨<eÀW0ÞûšuŽ€h¬ËXDd“ú%÷{i†•J³®¼dß¶}„>—íŽx˜ÄË®j¡$xwÑ£Ù%ÌÃš¸ÎÅLC‘p¾WN§ÛÛ¥š¤Ç7/5­Íln£Yýü3Ø6y^Ú¬i¦_“‰¸c^ øFÀÛ¥ Çæl—ˆ@d¦ïµ3ù•j *3èg)XLRóPyÃµÁ÷iåÁ¨¿Ö,‹Ô¶Ö…,à™Hê¥‚ºÀ<‹#{cŽŸdååˆEèbÌZVÄÌEdYoøT  ßÑ¬Kã uQö™õ¿KŒ³Oø¡¯Á>EbfzlËØ“úû¿   ÿÿì}ëZI²àÿ~ŠjMÏ º‘Ðc°ƒp³_> {Î·]Hª±¤’U%ÍÑ÷í³ì£í“lDdfU^«J cw4ãFªÊKdddDdddë¯™.CJ´ÎÃÄš3¬7ÛÌo6%kƒy5›)_¦£uÉM;Øá5Zô0¢]Á|@)6ØŸ	=Þ‹3ÈY­ˆË·–5³æU0eåèÂë|YêžŠâŽûç±:] 0bå7Ñw9“à @0l"ëý7ìý·n´.çõ«a|õ’ƒüqPòÊ8dHÆ‡cŸÝÐØ‘-À&•…þ[±FÑ3ëÍ,YQ2dåöAÊMx6"$Ú><fäí×¸×5ósN;v,Zäå÷AWÁÇÂ©põ© 3‚_«–úÚ	ÖˆOUú(ÂÆyâç4Èª@Dj0Â»Zz´M¨õŠnLì¤ÐÕÏÃq¿Zíeî|=fqa«;VœeEò"R•^Eë”•OÒÙµ AýÒtüx/5áªPÊøÑŸža²—t²Ô«(ï¥,ËÅ·±LÇ{~¥¢é¼èÐÔû©å,ÚÒ‹¶EÛzÑŽ- ¥½n*jýrW5”*J‚s\xŸ¬ñ¸=Ès3‚õ	éyzµîÜÊAÿùSÔÉSªÐ@¸	
FêÑTÄØ¤àš¨5çìËr)·X/šÿ#D¥VÉ6Wú6n!ä¶Ã}°\áY¶áüx»,ÔiŸ¶LÏÐâC87A…"ÀŠ8²8ôgcª¸¦·ì­ ¹h)/XXD:Ô—H;~îÙ"êót*–ˆú%)^²ù+l·„†«-–x‡<³*Ù²p¡ŸäDÐRÈÿn²‘ÌssÝd»=¡üÑš½Ñ‘8ô‡óÖ”‘ù‡3G,3}iÉ]1Gð™®ÝÐªDL…U›«Œñ™¡ú©‰ì½4jfrç/P+ 2}@êfee¾(²[ãþý!»3¶6J)'²ÓÄ¯™´ÊO–}{ ;9@v¸8L4±n>Y
œ*y‚é.Ü +:òªUãN~îñJ”ø”p(v
­¬ËeùõmÄûä/èÓv+Xnâ\MIi++b¨w´A¿®*¹€õÕðè©(o¹™äíOAb:æËSþÌ!B+±­¿•Ž”¡^2Ã¤Â}ÔxÇtÒ‡­1=\ŒŠì9àÝ·º–tƒKl|w¢š
bDVn–µN;·NÛZÇµ'r4¢î‹¤†ÒÍ¯H–¤¬f¦×á§H·£ÉÊô;=•{i° ÛèÀñRÊpÀ"D³ƒ,#7OP‡²4½xgâwÒÿn3;ç³@]Z'ì(…÷eŽ¢ØËÕñcj)¥§Ç®1ÞãÀs´È^ÉyGUòöç¨–½2º¥{æ¾È l{Z>{™@*'<Ÿ[,l þV*Å	îoäwÑŽL4õ¢]ô²ã×:},&®˜Â6.uÃ2_@Ý"Û í]ÜÉšÏGEV	í¦©ŠÀ[K£…a¬<»“okBç·æÝKÌYªÔ¬>.ý÷-éÃ¶û‘òWÔáðÅqwžÆÂÕœ}“×µ¦•/elåÕfÑ¨Å¯òLJLÆ˜>(lgJÇvxøöóé«#Oâ$ßï¿Ù;ýçÛ®'§™ÛV(‰7·)ë3<’”Ž"½š——ˆE+UËšQ²ñâçï,—=fz«®’do­¯#êâúE]À®rbþŸÑz/Ž[ÏÏýQ8¼Þ9Dìo]û{XÜü{ÿÃ¿MølïoüÄh'¾ô'+Êäï˜uRÛH²yÚíxCÜ{°Swx,í£¶‘EÆFjé+œ|¢ž4/²3³3f‘³¥sfÃ…EI^Yóâë8	FµY¸æÕ0c_PcOàÐ`-¦á¹
y&*¶0K¢Œ‹FðÅC–’]kÏAæœ}“ú&L*Õüþ¿g1ˆ¡àÊï%Þ÷lªý±žé{ÁJJlæÅ¤¢Žg…l=y<©]¸\l5ú«t\¶Wi–Rÿ	O$)U-À*êkN[Þù0ÐY_ø[·xü|ˆ©ua”T‡è³Ë4
à‚Njuâ¶¼fiñI­N™/Î÷ƒ°ã–ò¤–ˆšß¹éUìÝ¨Ìx¯Y,©ÅžØ‹aÆAµ`³i/9¼ÐÊµrô5TQRÕZ-eqYé…I)SÊ¦RŠæHf&†D-M6)Å/kç˜/ïÆS²Ù*E´lÙ©S§5¶\“òšÖ™´aé¸íÒ¤w±t•Ö¬ûG¶Ky;0²Í)®Mnþiu‡á8¨¥ë£Þr$«wÏ&dZr°{ýÔÔÍ>“p¢nE(Ãüß.¾i›Ï.êp³˜)QN6.®¦ÔWV0²\íy˜røÜ	äKÄÉ‡¸×Šì;QÑfJ åôÒÍFÂÐ¼ÙŽ¿4„-„b26]0n¯+ºÞöº¬Pn«y×)AôÉÏÝî©×ôª,Uºš¥{»~i Iä«§ëXŸe÷æ¶ß¼8éã}_w~éžàžìÂ·–þ[jZÎ--ÁW­co¾GñmÚmÑ´$R–^±˜šiÖ3åþë
¡VA
(Ð¢}ž+¨ÌGÛ4ïÈ‰Ðe.”›=…È’5«î%ä7ÓRè)r‘¯ D–t^2¼ÓÎŽêQÃypnØÍnÑ¸!8*ÏöXtŠØK}T]më6§ô©¥Û‰º°²Ï7èµŸF'ƒè’R }²!²Ï":l5yôåÇìP?üäÎ4Žd¤ö2!6$šUé+KÒb•Ô”,y{%|ŠL¢Tø-#=9ýTãa Ò"£;
@b·¯[àVzbÌDï
¤Kj…ýáF™¢•¿°,©”!ù/O:~ûlsen‘†R:ÂéË…ÔNÎøù`›âùjýßQ8®1˜gÿÐ–Øá1r¬gßéÏQFQ?4Y@AXVÖ]99qñ»ñrzÇ¥nøáÚNrù½“Ï989{k±OÛYõã<VÍ{2EUy…®ÍnVÌàp?Ü/[‹_\ã:ÛfÜƒ‰ÙfaEÖ¸3ê3%ƒ²íS|­¾Oä]@×xƒ j}N÷ÞÕ0âægî`ÑìÃyçæ@ø1¸Ž•®Vë1C•%ËLü8%x³aâÑ÷Q,y?OW@î‘ÏyçQ°‘ñ5âƒg²uî†Yw²P?Á±ifŒ¶Ã-^öÏ#+7ë2ŠŽñ,@kT^DàN’Ãù
Òùrc„œHí‘tŒ9¹-Öó‡áF¨S½a]ºTöÖ9ILJ*<¦§òŒÂh„"«[¾œ-‰ø~â•87YŒ~]ñy}X“¸1càÜRXßÏ<ÊÝ±\ÌÚa´ö˜%yñJ
#ØØ>B½Õ¤dáGVPéÂ@EjÈNyŒñKŒ›:çÞé‡ÅIùc%ÔíSŽz\¤"GÂù†)Å¿%¥8”|þŠ)úú<Å¶ª»hè±ùöýx˜g¾ÍV‰m¾*å°g tÉt¯û¾Žo/Ÿ‡3¼óˆ÷oùâm3¸½nÝ¼|0[´rüÃ¦v|øòçÓ-øõk÷Ø#óÜ~÷äðåë’–4±›Aë·”yxÌž_×`±%´Jb¼~^;’Ë [,iRÛÒÑGÚ‡a8µ¢$P»LpÄ\ÓÙ\GÚÉe›6šy"(”£XZ«VL?˜tûGÑED.áèÂ‹§=T¥Ó™-v×6dûýˆHe¯‡%€ë‡€.oœ9>ÈCÔÏÐ,r^\À{»o»ûÞÑ›—o¡ÅFÈˆÓ6ÄìÍ7;Fž\6wŽõ%gv–—É.´t\9`õOkHúŒå ÇÁdv,c¼"ì½„Ãp2	ÇA¼HÿV“Ä†$:Ô©5_“W³AìšuÀëög=ùÒíãñ_ë*nq»’š=˜lƒ¯×wWæÞÿû?ÿWbŒ"ùqVà0!aXñÖNeAm>;Ç¨¼S<°R1õHƒ<Ëý]\.´¥OtÂ]L÷›²}ªÅTMn¡Ò)¢Qon#»<³ïX¹¥¶í¯œd‚yöà½ÝãýrëË”M:bä#L–ŠO'Èf;ßÄøBOsÎª­#—­ar;NÓšáŽÆºUtÿNÆáÐMéò€rõèøõ–[ÿº]×ºk)æÑÀ[vž‹ÇHNÇjæ7F¦6ZNgr·žx¸¶`ö½¡7ÿZp¾/Þ§»÷†R™8Ñ1ðIƒ'ÁÕ7B‚éÂf! þx¨dA3þ&O}he0eE–“{N>¸â¹ó2Ø·‹nw´÷ºâý´¬›-‚@‡ÂµÅÖ~Ú|`ZÜ¦u7˜W ma3óöºÇ§‡‡{»§]ïÍwz¼ûúä ¶ò_ÌævÛ{E“U)ÆÎIõ¨koH”@§¬VUobšE§ã(©É1&õkšO£6ÜáðL­ÛëkŸŠ>ªV?„1wÓ÷zèPwØbÚõùg°ëK®)Ùød]Lƒ8ö®£ÙÔëÁ~°±– "à
áØë‡ïödCŒ†7& $Ìy{—oþBOëP±z˜þ3y^Ô€QÀAx,]lº!ŸXøµÄ!t’DÞÇqté°Gÿ,š%ü+q:*;_BQWvi6›NËu,}{&)Î€Úl‹ÅTl.˜"o‚|FüDöæhŠ½kÕkyeEË´áÚÉJ`.fyì2=(Ápsz-%Eø¬lê“b^¸úSMj© Ø_qŽÁo1ÛÂº„¡T¹v–ÍÌÌRÞ•§ia;l~˜‰W`à/g BPW² ý.sÖ·a¿pøº}óúœmùðAýpÃäÈ±ˆ&ó¿JkÌÉÂ¥y.¹ÆÒ´™ß&Ù¾Å¾GÌsl4áF1(4—ŒVW5eÙbØÓšìª’k7/«KÏ[ÃÌÉ[ëK·©»*æ1'w-ð{¸ò­?%¹”.œbD9I7\'K9VZÏvde#ÞÆ-ÐÎKöÐåó<ìa ÒèÜaT]<Äªòµ¥UÆð*Ïvû£0I‚>*x´1Ýò¶Ñ+¬ìªR¨9=‡Ç¤ÓŸafèäoã³xòt{~–îÅoÕÑFùŽPˆ7ØéïBç:ºETÅt*q7\1·°;Œá‹kÓ¾¬âlõé³ü<ï‹ëX›ŠŽÕúŠ³É(ÕÍ¼¢ß®æüGšÕ/¦9/k’¿ ²¬?vWtN?:Ú==|ó¥k÷èðåá‹Ã£ÃÓ."`mÇÁ.›Î]%ï²txFž{èÉ3Òù0“4`–·’Ã"9ÞR0>^@cÜòÛõòè®âw¯º§ŒN×rK9ûŒf+ç–Ð‘ÑÜ3›qwÎÙ¾ñ ß-õ%ØïžîÜÁÍˆM°èÎ"cÚŽ7ù Ó“/W§~ƒXP‰-êtaào^3w‹Ã×/3í¾Þ÷vONà+^ÿ4°«K "zÄÂw=åµW*ºW™ëœ–û•GÂ
¾;|÷—Í¢à.	gí¶qC¯Ä­‰rmwØÐ)š%Û7”º|šÓ"¿¦w×MÍXf‹_á“åž±PPrËpÜ‡YÆÃÈÇ¬ç³1±ÒªC6’ÓpD³¤ê,“6G±jªÚ-¥ùš×Þh¨ÑöŸJ°ªÀm¯Ëc†%˜F]âžÛÔFlÚcb­ªÆq’­p×ñ*UÛEÂNl÷Âq˜„þpçæÆ‹Ð'¹&ot1þ8XW^7³×ÁU˜¸ª{À­pƒðŠtÀc­áý^{×j4Þ{gµÝÕ6)­]×ühAÈ?˜¨ÆÈ4lÉ3`œ”ÕÚl4x\ QÔ÷‡5nèK ¤ØK9=ƒÔÞGÔ´&”¦Êh”ú `^<ðaJkWCorUÛô&×µŽÚðb‹¾O£KüN^¾"æ
üê?ÕD_ahBhâu¶ÞäãÙbb:‡_k9Ÿ6õ¬wÐ’Šx8vñ4…ß(õ€qÂ Ä^DµNúÇ˜^¯vOá 6ÄA£ä(´¥t>1ú¾RæZ•\<G	:“jlœ§5
¥Þ›«sæ³|'¦¬¢g¨îÆqû®XQÖLÕôÀXódï‹…yMÖ%~–˜ýË©?ñÚCBkWì*T?%>ßE¥Éô Ï‚Mp¦Ä²1Ýš6mÛg3PuÇº5)ïaÝíÜð[·ÈR_ó …ÕöêSü}ÂB#V)V"<šëÒ þæ¬Ç6®Çf]ƒP¢pš½wO&Wï]Ä>õHÇ (Y ‡zèD
,nÆq|î­ âø
ydct9>{ºþ¨áÇmeÏVæš÷¸.ãÚ”c,VÑ»Îð{w¤w¾Y¤w¾&Ò;å‘®­§ËèßäîbMµÞˆË³ÑU­‰Ö/c³Œ©£˜¨_kêŒè¬÷4QÐ0îÑ=­ŠÔúM !¹'CW¥PlnÈo´ÜUµ!&#7d‘!¿‘½Ù4Ž¦µ	ì˜ð±,¯Øx²'V	‹P•`Ò,i˜^tžtœ›vp<™%æÉ
¦sØ©ôAï#Ù2ô*èïÜXcÝš»$ å?¾ *¬DÍ@»¿ØªVƒzâO/‚¤Î»°ìA¥yá˜Eƒ»» 2ÏÑ	PC]®7‹·øY}DÚ¼„@Ñ:Z×±%A«‘Ñ‹\|u®˜4NŒL˜¸±L\©õ·È®˜2ã"É ÊÖ‚Op…zr÷ªÝÜ#g Áv`[8œ`„ñ³ûˆW¤ìt	HÏþÅÔ´õ…¯­QtÚlg«exa.4/•æ\•\æ²½]²7Úrvnš9„GxZSgXÿŒðîH?Îãâ!Ãý*k*÷M Q³<ã—(îŽä)´BøL1LO«Âí8c<Zçù,ÃëVŒñ6jO6
PùŸ*ièeÅ£õ§Ê„l¨ÖÔ,
*…}!ÆŒïˆËMÃ”’Ú6Ð5ŠP/ì‚=òŸhaßÒ&8ÓäÅßÌbZ“ð3ÎwnÐSù88—ÉB²4¶ñÂà“Í5Év´æ¡uiCÕ²$¯Ö”ê4©NC­â2Ðè7ùhð{Cÿž™€‹ƒ!ºR±ï©5H]Ô½-XÕÊªž0Êf"h#íŒUjX‡¢Ôù„œü2J”iéfýGv»¾éý¸>Ï‘]éÜ^ÖÞQ”ë÷ ƒßQPë÷ Ø;ØÆ‡ã÷bH-“õœŸáºÒy>#Œ23–Lx“„1ödTkè>""¢7&«VWŽå´
‚tV_äcôoe5½£à<YÕSvY‘hOC›ªcžLÍÑæ4YçÒâàH27½Ã»¹ïKXê¦Þè,ùLùF˜Yóc|Ú [x,žz0$6Å¤të³o#,™‰ÒVk	9æGÇÂSPÝçºb¦AEµµ²˜H–R<QÊíŽÀÈZ†ÔG{XåÄ° ²èmúà.h4í('hOÎIP'¥2@e2’hâ•š=ãH®ú‰ö<ÕôL½ÁõÎÍ§y>½,¸P.&™ÓÖCpÁ,n ëgCd<ù`aÄÎÛ “N,aÇ®TM¦³‹e…é ðD$ÂÆRx:tLè7â¼bÜÖÂjž·@hW»!ž!´j»†Uyö:dc/š‚êA1HcÐ¯›†vûÉ–B¹bS;ê(Tjüµ®`¶ææÙQ†ˆuq£~ùð•z¡×·øäÄƒíQs>ç€.òbN¹Ã<yN?4ö*Ï×¤Pˆ[NáÜ…‰ô3?FÁ¸_$¯]ŽwRJÇ„ÅÏÍ÷F\XÃzç=ƒl3,eŠ´•ÛÀC?Ç‚áZ~m2Æ¹Ü{wL“Óiè/Ð9™­–FþjA6ÁåhT<hVÉ˜YÔ±{•8.#8ÊÛBïÚ1¼,uÊí[(ªu=)=°·S±AeNšËñÉRêMS€µV§(J*ÌF‰8ÀK¼œXÀ_"pQ<à#£ŽS¨•±y%½+ÌÑµíÃkÁƒqóâùÇÃiYÓLÑ%1SÍ–bqW ‘¯æ¢3?XñbŸ)bÓßlHËN¨K…Œ•{•!H¡7—¿rKDñ†å›ÇSc—Ùpd©´ák	RS1YÛÄ˜ c¼MUHe¼{då"*y
Ô2)ªˆ¯æÆuÍß æoöòÃÂ–Ü.5¥«Ç°‡¨£>wœÆ²EŠì’ˆ®G¢«<S£D‹väHÑw •Rx”iEñ‹Z0t	ÆóEf½|ÄéÒÓ^F“ècWkè`e]ïo:•Þw'<u¦õÃ86[xê|Yø%iñn1ª¿*i–	f½$Ê\>i–Œní-‘4]ôhÆÀþvÉ1?v¡pu‹Ï#‰Û f,Y‡ûÈT»3O_¦~*&uy+éÞfVÞÃs jóÐGc5<šf²Xàž4Ç°`Ì½ûÙ‡´m¯	•Blö»KÛ œkæ#³¬å™tØÖÁ»_¼ñª¯£K/{Çx c©•:Q›-3aµñ¹Õ•=VKïõIV¤¶ÐQè¡”Õ÷Þ ÿcš§´~¤ÃQÉÖQ|4HÈ–£{§?¤ÐÞKÏ€ýá=ø‡Šç“JÚƒé4˜¾`}]c„²šx„tëY<ÚeN$‡ì&cñBv¬¯…E%‚x†F)|ø}ãQ	¾("Ý÷|sm¾Jä!»]C—+Üv™vÐ4ooìytP«tëŒ>h–mÃ9ÚŒ|F	šÍµ à,î·ö{î®yQFõ.Ê:Nƒyc¿e¸–HÞsýZLÎX;Å&Ówz+½Ç®7£+ðÔ˜\ãüðÚ”ÅÒÎáøÚ2w©
™‹L	nÏŽ0¯µË,®ÒxŒRß9ˆ^×¹ŠõQ¡»ŒEY²/kí–äoÁÂi»Oàì}Ÿ©×‹L}ˆ!]¥»…‚f» *Íå¿óˆÚwÅ°t«KÇ­dÏ+q¡ìÏ€SQûÎDk£Nÿ"ø3aŠÅÒ^ñYqW&œ™A³ïiñV´ÜË\¥+5t`©üGˆÂýtP=1‡LN@íR[¨ý§™(5Üöœ$Ck¢½ïÂ˜,5ÄòÈroI¸×¶þ¬îµšm <r¨yÕ¶îäUKž³òîEwA[Ü«­)µ²;²I¢{®ŽÚÇ‰¹›£»èè¢“EúÖ¶4‘¼õf¡±¶>âo3¢·¹èû‰ém‰Ch’ÀÅ4ì{ø¤±&ŒÌ?-Å	Û$›1I4ç4 ZÍVïj·$ç´> B]Ä"Žk[âz”ÀÿõËîko¿{´ëíÿò_Î<Q¶i•®5–òÏÁíµ²´0Ö	tuûØâFÍâåT—MMxÕ4À1±ŠùŒAÍ°ñU'Ñ®þP.ÎÒÃî×")Ö×’\n 6R@–âM’ZÇíP7èØ„&¦FÂm¼s¸KæœoX´2º«˜ÊD~áëŠ]À»&)E5![,(‡/_ïžþrÜ-ô#~»{Œ7J(&ù/»Çû‡ G¬xi}çAÕ Sv	ZÙ=ÆãÁ¿×xû*'·¹0@0ðûùÊšê¡ÄÄ+…E7BJ±™’[°ùH9ó¹„W8ò_	~4¼–ò¸mÞÑ¼Lun /QR^§!Ýnð/ÑPîa@aýB§ýB¯Bg|ÇÞ˜¸Ì;Šöä¸Fx’.e—SŠ.Àêv0Ê?{'o}àÎ-Rtó5Û$œ9øÃüºÉùµªeÖùtcè°ÈüV(V®hìv6é²’ókÕNÍwbð23j”ê:n„r·H»Št…*9Æbã¹¢ç 5`û]Ûs‹þÅÇ\2@{!È|K<¨uŠÁ,¥”ÙøàÈ‚ãY²Ý·ÁtßÅ‚¿ÄæÇ®z–¿žÀÓÝjdïúÑýj½,úC_b#ôˆ£ÌfèÛ'Œ[Fm.”Íœn’ìîÖ­åŠêF&ª-›¤Íûœš‚qÒ•¼ÒáÚÔ­<1}'9–©‹È§ÛÀ$G„/æ²Öi”%Ï#/ZNlEóZPïrl8'ÆZùÏÇ¿oüF¸c¾à\BX{+ÏT½1SwÓÝGF°“–Ë5³´ofqDËÉ‹ÍçN÷“X¬ªl+£¨û©ïP<²ï°ä;Œòxäó›ïÁÙÇ0!ØÃú»}\g[ÞJpå÷’o>V>N¾ýõM5sÀºcMW„@¯ß73èIqÔÉÊíO#À+³ê²Ã(äæCÑÒd[åR’¹<0Ÿó’"6WT2šb¸Az6ÿà¨qrº{úËÉ–§õå°û¤¥ú€„h– ì@|ðºÝ½ÓÃ_»˜ßo\R¢‘ª¥8æ»8ŠðNþ:a·ê\Î~úkÞwgÚÞÊx6
¦aoeÝ¢…'ñ š&ð»™CÒ÷xàƒÝˆ¡ƒ{ø1(ðqw÷äÍë-	ËJ!{“VndXPìfÅi½šËGyd—Šf-Æz»‘ùûoªñÜÒÈWZLw)‚ÞbØ rkÕ’€TŽ÷i°'gîøG¥Bð¨ÊšªJç£@cDF&É¯Eá%öqxFá¸vY{×n‘G¶À&ã°å}xZw…‡‚ù.žöÒà1Ã`/ÂN„·"ÚfGÑE‰H¶Ï¦ëÏ
’‘Ü¶ÃÂÌ$®‹Qé…cË+#UéÕ^8b$çú4;^Í|Ý»ãÃ1F™Ý¾»³áè1<÷ªRnÝ.|Åýb3Ù‰}Ÿjìx¹âÙyåŽ‡× #ßk+å\Œ¯€÷gC”Ñ7©ÔFã‹•¼¨¬ah†ZÙIT• _­ö¶<|MóØcW	‡‰»UDŸh33žF ‡ã$­KÁ9hÖXq÷æX¶ŽÇlÄ	Þ$ã”¨Lå9üÛòÚ´È¢w7£i³µ‡¢¡Z{¦;$#;Ä uÆtœ6‡Ëg;^³	 Xš¡W¹pÑ°0OR	Ëóv2£¾ø(Œ“:,Y/¨Vý^oÍ£;¤k^Ø¿Êð‚+ùC0Åf¹³n"&wþýÍ¦è§u
Ä-ìrkB¿s#Vp¹±71R=ì³÷á¬4Ó[AGÕ•½7Ç]ºØª–æOÓfY9©ÂÊ›ÓŸ»Ç9”–<™Ÿ»ìÖ0âÏ{æ5 !ÆßáÛš×|ÍAá,×4GDÖËs¯ZMY1“½-‹³Fy­–1ib¿ßÙI·*”;äŽó ˜ß†*Æ=ðÏE2Ï9Å &Ñ£àñlç ?Åûá`8@˜¯y˜’Êþ’a[fäBQvy±iÿÔT\	Í­¡X´Ð,bßŸZÎº­ÂºmgÝvaÝŽ{Úë ·%‰’­ÂÚÑãjåÕ¨ç¬ˆ6Ð@Êù»,dØB­fì¿¦¼j* ú£byvÜëÓoU*…¬ÞOÈÛ¥ç«‚ºÎýaä¬2^,™ÎÜ¥æE¸R˜ö×d_M& šAÅŠÈ~ùÌÿ›âü
¹|ºfÃ>úŽýLÜÑ¢PêÉAPÐ4­SÖ*_Ì-äö¶ÜG)‚<©…ÝêêSo}Ýã3DvhŒå‡ü‰g5ÊÓùG”˜E#:o‹Évm#L!Hï¾}{tØÝ‡YQšÜL†!ìKŠ[†³ÌÖôÉÛîÞáîÑá™ÍŸL‚^èÃßïØE÷ˆõö»wK·lüûTãpà}þƒ(Pr¼õ¶ØäÕ¦þ]Å–¢«HË	Ö¬åü¸È7Æ:(ötÅl6¤˜÷À8¯ñIqp>
¼"âjk§8PŒ”÷'³ûÉ·<¬&HÅFÚH]ìJÄüfXK§º(œ`‰ð¹…ñsœÕé¸ù ›?Ùø~¸qj›+ù3H*4HÀñ–Þ…©ìÜÙ®+¬Ll<õjËAì´•À/òNCþÛ…,¢ŠªUmr«ä¢ñ…`$Àgà55³‡ÕOÍ5LŽ¡G>* ÄEƒCp›
{~[²Œƒ0b]Jk•òûfëWh°e¢zêÑÔUÊcÏ„ßõÂ~Ð­vÒéŸÅÑp–iÎÚ)X„ûjº,û[@¬ÍœXMô6åë¶ÅÖí=œé™ýt¯ÜpË…WÚ×L“eÂµSWÖ ÕúM °°"%{ð¼ýÝÓî–wÿg“eQPÛ%ÛtŸ~ÞmZèÛ”É|Jäcmÿ
O9šåÑ?â¤ÖqPû•ð[®½‚JM“gùÜAVµ–(«Zk^kI²ªõ «d•ëó «dÕƒ¬úËªÔ“B•Uí%Êªöš×^’¬j?ÈªYåú<ÈªYõ «þ'È*ÓëO•^%J¯Îš×¹¥ô2ÁÔåYçAž=È3×çAž=È³yöÍÊ³¼î’ï"ˆ!Ý3Á œeÒîá‡yJ€	g½ow
ü¼~>FÕy¼mebt¾æU[óBê@KV’Ôj= æ]ýŒ%>$½Ãæ/Ã€‚.æñ€Q¤§MzWùúÜK"l›%˜( ú=C¹ZŒ4VaûAÜ›†x¨àù¯œFír­eZ¬±g²{Æ•šÜÚ¨¢\‰d€#M+ã&Ç“Ò 4]Übq{¼µ·ˆh
³ü•ÈŒ{§5¦_-~’—ôS|þ´K°xRÊ/ü¹Ðº[xK€ÝrYp”¦XÌŽ÷x“gPãoÆ /¢òl‰á¦ïüp(¿/Ióùäž¿ 
ü\\*©·¤äM¾Êø;»é‘;Ü;Sø+s'¬l3†Måú,Ë´rÉq^–iç6’ãÅ,7ârev´ZÎYê õiæ’ÛaÖb>ÅnløAï%r_Ãëa_ÝjZFnÚc©É2\ï¡k›}ó1z­1xÊúÝ³Ð”ò²L¦µ¶.™³MŒÈkXzÜ‰ˆf°”•àžO”ï8:vì¼ìÑ-íâŽ£c_ltË·ZÝq¼Ì´µÈxo­t‘Ø.µØocµ[Š#hÃÍ1l¯«þÂŽ>ì­ÏWÍ§UÀ¦p;9"{¿ÖäÓ9Á-qFòÜ—àŽZj¶Ûµw*Ï^ã`ê½]P‰ý‹ ‡ è‚{­B“©š¹4WÒ·V‰ŠI‹vd3ä	år;’¯¾á |¾`÷‰{3$*>…|«M,`O°n$²Üšò.[0ÇÝK?Lp/Ã›/µ‹@pL¥v:Ë´.Ü}ÇÄ _zÃT$ÄÌÏù-å·Sj?š³Yºë¢l›‹RØßœ •ZƒKX_}/Ïž°ˆ-¡ô
[š¡ü²(EÌ4 n?Xy‹á°ö)‰1><Ø=<bów²wÇ÷°êiºcã…×¿#å?²t­Ÿ\8Ä£t‡	ÄÔ2lÞ¢i\6’¤5pG² °q†,†ZN‚ktéÜ¸ÂÎˆŒgArc7
b5Ús¯*9A1þågÜÃUW…R³ÑìcÔ¯%þø"\-Šdž›ÜõIµÃü&
£ì~]Ô¼Æ½2Ž‰?‚ÿA¥»af³QÛ|ò‡FÌ^4ã­N†–d–ÌÆÑÝòx£öøöH)ÈYóG[“ûx>š¤d7›‡~ÿn~îü¡©®;
¦'q‡#PŸî†“FíÑíQ²„h¦ÎÔzÙÏQ$r1‹§Rý5¨nóï¾;Ÿ)´‚w2÷º>if B!~¯Ñ~Yšýð®vÐçÖà¿‰ýKLñ'›»ÇƒAá“h|]\ƒ“ƒ'ûÑåxù}å1ëì„|WØ„ä˜²¸e¿_ýñGñp¾å)€ny¼•wï˜·ÄUoñ\KdJðþ›ÂhÃ¡ssLô´íù–'œOû[y±Æ2ÄmÑG IÑþ…nD8ša> ÿíÒù Ü½LT†¿LÒôéÇ[ØD€…ŒíÔ{ŠTK1i6e¿›3MœGz`tÆjç°%½¾lÿ|úêh?üÜd«â<Ðþ‚U|gUÿN‘ùæ=k‘T)ŠÔ˜¼c b¯‚Q¤ìÊX¹!2×“ãQhó\
Fò¼žDÜ‹h¹•ÊS©Ø\ÉÉD“õi0ÎT×ßýïFíÉûuK¥²ÊwT|'€uŸñËÁø}{‡Eƒ}Ú»€ÞS+éhûAB%_ùW<LšmÄ´YS	œ,ÓÊûˆ{r0Ûòxf±Ö+â!a{ËB´Ql6ÂXCö+?@…«j½NebqGãVÚ}ÏÂøpY"‹×ü‡L	Û,ÆÎ³j[&-nä£Z'ì»R‰›éÙ©
þEý³*=–û—r`9ŒA@†!]h'Î÷Þx`ˆoY®]Ž2œ6ËÉØûòÎÞ5×¼Ö{µwïYó,˜†åBk¨ú®½æuŒ–Vëçá†_½Bx¯PÅP8œsy‚±11Ÿòœ1Ô3”®¯{?Ã	ZU"Ï?;›ŸCô7ä,ÝÃÓÀ˜eéxça’ÎBVVÄi°±´àž:Ñã»”–Åâ¥ÿ Ý«^0!Ñ€]½Ú}Ûý9­‰aíÿ‚zÇèÕÕz8îglj…ŠbÑ0=ÐZ?ùàš ž7â ¦%ð5ÄŒ¢ãŠT°ÃÅg£UiõP~}Ð‘@IYÊ¿ªõÿµŠ,eEÄ"=žL†aâ]ã)ÎFÕ†á(L0Z•ôÝ˜xF>N¨B|à`„1@ßƒ¤W—á¸õ×»'™zŒ}ƒûW¼VÿWí_ë{ÿÓº8Às©ZÂ8ß.)Ð%yj^
ìf¦$DJ`ª ãŒ¦ø_ø±Nß‡Áh’\óÓŠ‚ ©ŠC>Òo¨«?Š¦ú“Ë0èÏÂqj‹™‹àbH%„ ;ãTˆÍZ¶™­@ó›q@øÞB7  ú)2Á4±à~§Œ’Z{×xnèÕ²R•f. uvzy@ò”c–Z’{eýa²ŽÀïè½¥oâú4Ã— ÆjýßQ8®IZøNÄC*½÷2fˆØ6¤X4îðu-¨Ü¶{~%¡¦WTlƒ’œÐÊpŸÒÞ*‚'Œy¶¢<Ù*)”(ó¾×¸í™HÍÔùáÐÑ?‘š®Xö¹ºpˆ”òÚ6×YÖèõêï%ƒ./¸®«_¨¤Cz:_6H?ŸxGÑEØ“XFNŽ§Ž+G1kT$©©G““ÆœÃ"åï¤°	Ž“HŽÏ¤°—«uDLµê¯yg„Ÿ\XêCò=ß‹FÈö«gôp5cn\ŠñUŽþc3Ôfì.ÝÆRt¬ò]+1ÃîÒ}Rn*Â€Å@…»]÷œßÆ‰Ó¾æÁ>ô]ÂýVšTJ½ÿQk6ùzÕtôœå5Ûó§ýÕï´>Å0ßëÐ’ä³ƒ°í*^`'PþWÙ@Ó!I5^8jœ©5Hd= @cU³%ÊÞÔøó§*»ÏÃ2GN¦Á§†OÑwŠ{Ñp6»˜
ù'žÈ%¡ ‡ì¿½z×6X+k‚žR{ FWÍvÕ²–èÍ-1/È5»]?|^ªqIðn3¤æ¤±¼Ã]ˆPÓ‹™(¶ðM2PE<,ÎFÝœÑÝpÌgyµ©0¾B^¶PÓGÓÚ¤&ßÝ†MyYx51O£®Ù×´¥‚V+L•Â+|ð|4cÒT T²_ùg!l.¼ÿˆðÅG?¾†ïŸÚ›d.Â¸= ZP†¬t
loT{c†¾¯Ò˜ÞX}hHÉ4‚ýpÛCÚ‘à°“ ÙfKîYUŠøK‘#…Ò­Ÿk¥`Ø…—›2¤þ@êW{õ°/AåÑ’¬Ofñ€ÙSÓÆNäWkQ»VK!caÑY/¦Ñl¢µÁXÍŠc½uÏ:‰+RJÀà&‡©‰Ø#ñšw GžùÃáµúhD®‰¸IõðäüsØ‡W^ê$Žˆ@6^¯ÊÁ½ŒB7;ï1^‹ 8mèH‰ô#»_ÌH“k ÇU&zàÇÀ¶p¢KÂs9 Á°I_ÓþM ¥iHLÈHäÌÏpNaÏ=dI*Þñj•# ²™TÖÄ“cvA6éGhyð{×ÙÛƒpNÂq”=éŽ/†a<È yv9IØ‹Õ‡Ù¯“^ÀþP~ýÑ?óÇ±Ÿ=Ú£8Þúcèr6öÇ^u÷íj^éÝ[	ÀþŒ- /ö1sÜÄŸ@o‰yÕn,7è,(‰¥†Å³‚Øƒj‚ýŠ7/_ïI¿¢¨Kz<F+¢•òÖÁ¢CÍÄÒ?)ñ>ÚOð×àg6ð¯Ý·
Ôo%NƒÞ`£‹k> ýÃöŸBéUOº«U‘
u¥I#‹ýzÿT¦¶ìòI*²Ò:³”nìhwšHôñvp/€'epb¡Ÿ(U—I ¿é7oÔxºf¹àTX…þ£,¬”!$ü³þe¼ƒúä&Çãªaf#ñ¨û¬qßà7â(Ö-VÏÌðøÅèÈ>â0Cmgß[°‘1²¬™‰øþè^£èÖ¢D~gŽ2\…¾Š´“:ÌÛÈ¡¤ÐŠ­Nj)6Õšc3kÎ‰8îW¤`©0ãDÒ;¸À­ur j€wV¼³[€g­S<±oeðÕ8 ¢Ãe•.èX#?—î¨Ô[µ-~ÒE	•ê=£»î©5f¨ *]ÛÕÑ<}TRH5€ìå¶R¶²¦¼Fm#ÅásO4º1~§	hŒ5+L=±U&…ª³Ã©ÒÜ…‚\¤j£KU=•_Â-S³ºgŒ9é@H&Õ¥ò·j“eÈ¢üÌ]Wæl.Ò/ú¨3õE”:;.òÍeTRze1µ f2ŒO‡â‘g‡…t±Þì³”8Té-kÄ ìû<µˆ	kÍn¿,iä‡” RL6½tè?îU¹Ë½Š‡<,d8Ð1 ZÛPäZ×4ã‰j)d¯¸·Š§™	öÝûU‡e•+6 (šUÃ@„¼%Ž¿j;‚Ìj½°Ö:³Özv¦YJ©)f •ÎUF~ê$ÙøÝ~\Ù}V°©Íó`­²VävÉÒt‡f¿O¥{ŽÎ"rÏiç–[ÖxèÏI õI²™ÑgcKv«Ði#ŒÑ’jŸ!”¬FŽýtT‚fã©Ò¬Jo£ò•49‚d_­²®1s–fÁ¾¾áq‚ñ4• :_g:KK²*qNžµå¸y%žhã»lõÒ¯ŸÓ ÏÎhqÒ,Ï%ÕˆT~kItLGˆš)D¼š—Â˜¦N-mŸr|¡”zx^ÔE#í!­¸>·VÂ±°³›ã ‡ÇÚR§‚‰¥7tèžT¬Ñ#³U­r‰}Ùnô—£ÞZÍ¥UÊ¸Ä½Ñ$×¬§w%äKë‚Ó%Äé,}/Ñ¢PÔçÖUÊ[›uùª45j)1ŽmÞ.û¹š-Ù\AÔ‘Á€Þ€-ª……æWqù ÀÖ¨ÐµGhU¤$•–=adpq’½<g~ƒtó¦Êª§ÉJÓÃ`ï'ïS2zëÚøyma²s¸¡óÎ&ìÄa(ETŠ—AÕ¹ØÅ6T®bxñ©Ý°Õªv’¼,N!r¶Bk²ž)ÀÎzËâR›GP¹‚±Ñ2@¢….ÿvnâÂ@Þ_w9ldÐê’¨«œÙ= i©ÆÆ~ä˜ÚÝjÞÐæßÝi€ÚJWjPdmTùkŸÓ¤4 ¼Å_½P²^Êl@ŒHáÆÜÈÃÖ…/Ú t%3’l[u;šI«‘É²?®e(ï²ªÓM“ÌÝŒªHœê®|I
=dÂKz`I_‡%Ù3þRÜˆÌÒÞ¡šïƒEéVDÏ²±ñ‡Cæ¾.™â„>Lãä¸ø‚l¯Ó(Íñ8SSC"ØÙž®–ážZßA‘ÿÊLÑ¯I‘áUöCãGAäÀbr´§jK»½’9^¤ {=ƒ6|ÈpËúÙ'™ÓœÖ)§ôžnA´6o¬HZŒb¾ô5Ežðü6‚Í@¬—ãÔ
5¤Ú4p<†¥ÈXÚšÄ¶çq4ˆ£Y[©ÌÚÞŒÒcãò=PqÞ¤ÅœÍ¤P6H8:yA7*¬Ú¹‡–Ä{®Ÿ‡.OvæoþU‡Ñ/½õ·ÈÓb„ÐÆÞÜÒoæEåDÄÚOy„z,$¦K{~ZËlk^¸×—™œÒ`œc³^ýRÛ±äq/ïE¿â|déêUŽrå¢»
TL)Ö¯ÜÖ—Ñ¯ò5,×èÄ_cæç²dÀ–5¹`¿Œ¤ØþRåK¯šÞãÔ—	;Ò÷!’¨G‹iR‘
0A­‘º>÷ê\ÈÊdQç¶±š¶1á%lLö•í‘
>g/ú­ÃÀƒ]
æß[Ê¨”6rçZòµ‡¾Ôz&ær†ªaÛ[÷lpdöNY®ð:8w0}» Àø1^3/i÷ÇëüŽ’íö”-7i&ÓkÙý¨Ç½¯þC¯ÕŒDÓõYl€•áJæÊ0‡¦p4’ž±@xêw¤§¨fOƒ8®L±fST)ìÖ{¦°ÔªùP$£a•×_“U6PøÏüÞÇ-/òP…ò¶$å„yê3R¡‰gÀ2«_Ð=9XoÎ© {¯ÆVÑÜBÍ§ðg{Gjüô“Îaö8H°@5Ô¸!w““ð÷ ºi\±è‘ÕæFÃRã4U?`Þ7áo+þp“5ÿ°FÅÒANà)ö‡£ýGØO@~5¯ÝÈ)ös€®–TnÃ)à	\ØiU?pÿ|¨ûáF—¸â¸>éŸe|FSPù"’|·±æñÿ¿ÏÞbêY8¾àyd$j¼ÚòÙ¯kå×%ŽuËkm>–ŸûÑå?Ø›f«Ñð4
ž…%½W¦Óhª²áhÔéqµ‚«ù‚öhì5E:ßª¬y¬Z	~€7°ñ¾JÙË„²»Œ¦Ï¢è#TÿÏ£“ÿ¬Ï’p×ñÉo°ìÕãü¾Ÿø˜‰‡õ®ÞðÓø`
D£¾¥×tSÝÇ`1¬tÐå§Æç€}úÖB“Þ†‡òøˆ<¦ RãæË¬ñ½YœD#oLÑŸb¨¢“È€ÝŽG6¸=mîÉ^ã«Ú¿ã…Z•zèM?¡@¾ˆK>Y ÂÒà&ø‰èª;2[«Zçy°DRý)¦í<¿?G¾œ³x	,<"}¥˜¬Òvéìâ¹¸õ”aò
­ÀPp4Ñ,ñVþ’9vÑ³òÖÃÞ§¥1EÈsaS‘ºd>µ`™e?8÷gCè¶jÙ-n@Ô[Ç–»xaüš¤&nœ± &™ZÂz[Q,PððÍÙ¿	×Øj
Ëç­´&<A1&~§‰@³ªT<*˜­Ïd‹Cðº¤H€±@Ó<õ\´”`vÛR˜2sõ©ìÁžMÃŠì¿ÿ¾%ˆ£ŽhE@›¹ÒÉ–÷ý÷¢þ–ß3z‘K°'66G4
tø –¨‘hE#T¡©
tTxgÀI)°²*ƒñ9˜&¸ßJËÉo/§þ¥Š"³%;Å,éY":Y¼Âëˆ_öÑîM/Î2¨éqê6NNÓâV Å¢çn²Ò OEªlòìÂaHÌ@F1°”r§äVFö_ÀÝÒtvaM†¿|Ð²õÈ—®B\g¥OÜë˜J¤P¸²ûÿW!f±‡œ
8y?œ(,5/êìIzMpØ|5U’Aˆ÷áz
:²Žç2=ãêH€‡ß¾>òíkÓ]¬zÎÜqfV'û"6¨iÿü=í’N2L5wÂˆ{3á*‰+*‚I	Q£„mFU³dòmÅÅù‘m…5Fz•u^«ÕH7¶¼tSŸÈý…É¤#9fÂ²ZÙ{óúäÍÑ!&–Û÷^ïî¾~éüÜíž‚Ò÷æàào€z»{»ûÝW‡{Þq÷í›ãÓ
¦‘c,9ÉÉ"P¤:°uí¬Òì¶ž´_dSP9 Æ.A†–q'Ð·¸bQ²3,i*v6æí)‡&](~(BbU³¦x!6UÂ‹4&òAuÒæÞ@7Î@y”Md&r®x½ŠIi’…zÒ¦%†Ç0Ü'õÉû'%æ3õf
ßÎñ¾¶ÇÎ@ÿæ¥ñÝØ³bfâš|…œšd`<Î‡Oƒ,ÆxWúõúneþá©6™á;f„ÈT(¨É)è y°qðD¢ ”¤–BA
¬yDÄáÈ'"¥µ\:jštÔ,MG­-ïUøØ·÷bˆYâðé®FS£€@Û5}ñÆïÉÞÏoÞy¯w_u¥Mhè¶º›ûbÞždröb§j… ô¾Eo¤èXúR¦¼Å¦¼Ã§Ú=Ziv7vöØì"¦'>E§baËáìpÿ¾1vØ/Ä×-úãùgw÷ø¾G„œícºÀ®Û«¦f>€bQe¿ˆ*2eºDM­`é‹örW}‹–xS^õìQÛ±ÒÛÖ•þÂ¾Ò_8Wús”ÇÝ—‡o^/k‚Íô	ž<úS:¹E‹Úüþá¯‡'÷
>Þõ—9€“ÓãÃ=Sú‚@cB/YÒ Nº¯º'§Ý¥qÛ ´h¸ç…¿ ìŒ‚˜ï|HŽXþ*…*hr@Þrgžò¢O± ëN<å……1t@•Ä0†º~O±§BóB›?à¬fÐÒv˜…e^FdôYXMëÉú´@ºúé#`c~8öN1‹·"Æäalº,“i‰–Ý:É##ÁÖçæ÷>i”Æ¬qsnŽ@Ð½îÛ•®6êbÉÝâdØÊà^h—b!ªÕÔ"5ëO™¦™	T”øy34YºíÎ(àù€B#Òn"=&Tã2˜û’Ã¦ô¦Q+QcqÏÊÛË™™žå¾}~žÜez4í±Á7ÆNÛ8ÞÉ#ªœyÍìl¥gXš,çTë²A&=+€¥ÕsIq#^èo+ytÄ-vÛòõNÕOÚ…ýbÿ@íþpó	O¤lÓ¸éžÆv»ÓÜØÈŸÆìÐ1oÅÑˆë<€ÎãGO\ “‘„þþKMVö´œmâ”ø%€Ò¦Ï«îƒÇ°Ø)k×M÷µÇ½ì‡CóÍ¯ðç¥›Í9GÐyÔÍEÿ­ÖP¹Ä;×eåW]=%ÖÂZ	v{so7o*æÅrÇ–ï¯ò‰ãèÈ;8|½{DŠ“Ðòø£…amv›/:NækQ%2‚°jÙˆ4EƒûÀâBáqtÿ+8›út€6¡°„·!¦lZÞ ¼xŸf v‚1¢)R“ÐGŠ§Ñå^4£lg;ºËP4›È±xn¼¡†ìsåÕîQ/˜§Y”;È©©:«pÐ5ªh—-•ÞœþÜ=Vê¨—’y•÷ªkK]—½Á8ÙR:¦Ÿ
Wç7÷Ù6	ˆ!ñZSÏ4“ÕªôÅl‡ïDä]DfØcl†q™‡a/…"£d-gþJË
ØùMZ£µf3í¹
9}bR²YK™L,%ž0}\`V^`.=‰~ÿ
¢ƒÜ¢p‹˜Ù¼žÚÚléµ'oÌp 2ËÎRß!˜’ö¦f|}ŸaÁ+§•Êàz©\çäLš¶:º²"Wã×Qò†_¼Þ±z¢+n•ÏçÛï3'N»‹ë'ÍyG¸˜fÛ²ù‰ã&‰’kÊî]á¹³‚á>éì¶_lV´-øÑSæqîÆbèæy/ÚGqA¨ª5¿âÓzà‡äH²Ãüû˜?á¶÷xCoÏSd"¼ÀõÂ@6gŒÁ(ƒÊÀ EØítá"äc5ªðÁ+µ^<iî5÷héŠ³p!Š”àNJÎÃ±<Ëv/Ö§–Š N8ÎÐ‰íp„âW¥ÒMoî#ó^û9UváWbÚ›"¼s¬g +ˆgÝïxOˆ+v÷ö6Ò	YÕûÊ¦Ci.›µ¹FçñæÆcy¦Vóçe*Äl¹8ûZËðf„W’~Z¶âVLõ„EÉõN¢ótËÀ½ªdxJmë²éô?_üŠ®;ÎËIéœ"Í"ðù"£"Þ'$þË¤¥EúÔd%µôœ…}>F~ÂŸ×“è ¼
úÕÖêjJnÎÕL®UIP¨ªÒí´ðxÛ½ ÕªÒšn?n7vÛ¶.Ó%`,wåA™p¯kœ !ÌÓE©é®ç¦†ÆoXSÙ4Jmó©”žèÓ)}µÏ«4«ZÃÊÌfïÊÌnþÜº9›smÄ8ï{»»Ä5*{÷[¸­¦Œ-ƒáµ‡çhíŒqõ±4»š^]¬ÅlÿÉ“æ‹æjŸo¤4."ýT§[Õe§²ËPÎuÃŸ~JŸÏ¥Í£´ÛAÏÒ½xU×R?òK¢ßèMUô&,æ¢Ê»Ê÷Lg® "É¾ªÛ¶·SàP±`Y¹áòýÛÄïÓ¦³"a~5"§¡?¡t4NÀ´jGÆ@[¬!I‰½ñ.{äúëÍß?•mÅ^UØŠéÊ×wyvP5õ:­‘º÷w±÷d™Ìøcþ´Ù¸›¥1“Ø~Ðpš#ì˜»lÓœb‹ðXß
XW÷­¬ûïòÊmb9JÄÖ¿¶‹ÎVt¸F³xÄñw­­à5Ýxå=»HÍ›6O#˜#»G.§!ùåÑ0a±b ï3d;›ÖH4Ò–«mqÎÞ‰Ñ&W[^û‘;þ@ß¼ò­Ž(/ü„rK7ÒÖXSôY°ü‹¼òÍ´<;jÊm[if#ðªˆö°åm¬æ6Ð’†n­ÿˆ¯Î”,cF–1¥†MPf,S¦«ã¦èø­ŸàuFf@ÀšÛ•¦FD,™ò eFyYœòto|à_Á¸Ïù¦ðÚ_Ë[QBB`q°eº ÈFA­]NÃ$8‡Tÿƒ\é7VÉqíB
bÿDQŒ[Y×Ñž]Æ`žŒ|/Ä¤²5Ñ-þó…ƒx¬ÅèîXÛhx£p\ÔbßÁ8Ín«W‡
—„‘—5ƒ—0âß.kñó7ð~™¡â¥„¹z£þ `FN—¬³ /k:Þ ÿ½òd÷u U¤.?ÇÃá³álZk_½ç>¹®=jxµÑÓÛÔF	þ™Dt1¦|F
«Ñè3=7­Ó¤öÈõ·&µMOE<¤ïHßðp1Škl#c$Æ\ì¼Éºß„} ÇÞï ™’DØ:SJóØÜ …†}_Öð:–‰Xoæ²ÖD,6U,²ñüç£F†RÀ£Ù±ÿ©f“ç4•©0èµ†‘&y{oNÎ"Úß½dFÚ¹iuæÞº63Áð¶%ñö %–†ÕÂA¤9—é#Ï' c2õ{˜½–4²PÿìWå™’Ab{}Ð2ú›Ý‰Ä‘z{–„ÏY¿ Vèø“`ÒnÇðN±d0Ý^Ÿ`ÄxPDMD¸xÀ¤«¶AWaÂ_}oäô´xZÇ’­÷”w 5¶d‚SéÉÆIp'W W‚™„I¨‘{Ô2·T¢„V,‰º·É ]¼ÖZxªâ©Æˆ5ç÷v8žÌÓ„4CîTzHègÑ•aóazôwn¬éƒuCûDã½?¾€•SØ­nGŽájPO|PÞ“:ïfÕÞ Â0_tÄ©ÓÒn˜¬ã<êÍâ-¼í$=­XºY·âOOiNÍ¿k6&WïK-$ib¿Ï$$¸²¡o¯kÛd9º\tÍº¸¾ÙX”¼CrõŸ 7Ðá9›%	h2ü0ýÃ°÷f_L~š!²m™àà›´xLrà/tÎÉg"ÿÙJDÿ‡›4)&Z•Ûxû+]ù:éd+Ü$ötsLc´l­K7+óúÐÍ™o“ƒDlL<Ãô2& óM@çÛš€ÎàP¾ÉÈ“róŒÛ…$ÐþÂ$`sø†¨àƒh[çòWb:”füÛš	îûÍ÷Êý‚Ó@IÚ¿­iàÞÆßÐ4p¿ç[³Eû¼¤³¢G/1‹Ua˜£or]kÕ7ƒÕL&{•8°²1‚©õÙãy²IB›ÅlV|Ê>·c‚‚Ú“ !_fØÝãGU?2F^¢æÛÏ&l?utÅ4§Smjb¦Eæ„"HüOŸ•ýèrŒ¹Òsf%¡e¹ï˜ÂbáÔè–ù§òÃaKMCÍ–nÔšç;7z|œyŽÍ©”Àôˆ™BÛÚ¡Ð@w	¬´d~Ì¬„3ö·„Ö-þ„7%=M2˜Œº%íõqS	…âáõI¢bôóé«£›ï·ß0ŒÏ–÷AÁïßñ¢ºÏZ7íþŽahðJ7¹
ív¼¡?îuL‚§i˜˜fc4zj¸ƒüµj—ÁÙÇ0©QÛl“_óûhŠÚò‚+ 5ïûp„(öÇÉS¯\)½Ÿ„.5ˆX}èObLÄ¿)µyÀÿ_•çÔJmè_G3è•l'òkÖ8Ô›\ydìñþ´‚ÍóF>hƒ®¢ªü¼mËÛ€bmø'¿¤Å}°ëõ´À·ÜT«h Ô·tÞ<ß8b¨ã(u?-êO ß>Ëß³ÅqÍÎXbÙüúS¨ŒdXÃó¡ ãcP¶ø¹d^Íú8ªq²Îz§¥ä®%ÿú0×LšÒ×›õ½7çç!¹xp—ñ×åÚ:Ï È}f4Y3h¬ÒeÝ&cQœ¸ÔfÔ¢M­sÓ$Êõ3à’BÆhŠ’*rzÜ”IST‰óÞ·Á”\Ç½ÀÛíŒ£°ç1~«YM9?/oE±zÿ^ƒVj—‘4Ôš	ªxËÊ¤7çè-bè•gvSk·ƒíò‡û[Ü²eZÏÜç24Æ¦LDNú¨<s„/`×–WjµÚÊœƒPv“®Œ¸YvÄÇtõôþ‡›]y]Â`7JvŸ_T½ÿáÊWdïuÀìbë×pv¥vÑóƒ’žŠ,†‚ù‚N¦Ú®||ùµÖ¾òpwú(Íïx(“¯4l-ZÊÖEk±Ù¦P2_i¶E8‡{œm="Î½\´c´ãÂD±¢ûèó!níØñjê	Pb§žî±uÝ‚m`Læ¤mh¸Õì	*ebjZ»™²-5'aïã5wËø½Ö¶¦‚Š­îo3CbI°ŸžÂ6øá	àtç¦5·tŽ·Pxï°F;‡>ýÔ‰÷˜ÔP‚Û‘T6FCÐ65Üè+,pn}ÿAÑ·¸ Ðr»|¹BÌ•5¶ù´½òæ<Níü™|¯}{=Ø°q£y/¦‘¬õóõyƒëLì;Ç=+Ã£ýòª‚\\Ÿ%ðh_Hšâk N7!©>KÆ«3€Jÿv|ŸC€A¤`wÒà®)Yµ–GÌ/Œné”JßiLJñ³É ÛT,Ã/ƒqÝC?mŽr±2p“2Êû~‡{ÀüÛO§·å©‡Ð»Çh÷(áÝ`÷8Y”K0ÂúÁÔ¿  ÞÇp®Çå;{û‚¨ÝOêìƒ0®“}ºYŽo_ªVéõw¹³~
 »è?v> Æ~—1»øÂcÂGÓÁ„—=þƒÃ×îáo¯«4TžQ.FJ¥ÈiD9ñWiã‘&¶Šgà>I)Gœ¸ÇÛ”ˆ¤e
EÙøå(Éî{€!éŽþIg¦'ÝW”`Å$‹Å’ D˜ëYÔ¿–Q‡†Œ~P»öø—”J,œôF¾­¯e¶Ñ§›Ë	Z95ÖégŠ‚=>¬;4¬=’ÅOž)b™K¤ÕqN@î#s·ÔÕFz?
Ü+˜BwJ‰Â ž|&°´}iJ¾Ãþ•õÆ9~ø¥º­Õ{úéoÉ¸ƒý“~o?Š¿¾1 :b‰"oiú’ïDîù,weç$?Ü ÄóNŒ­ºö_é¹%µU3{ý<íÑÈež&¿{Âq0«¦¾‘»'Ê+ãŠoóô7ýÇ
ÛLo`ýF}#·ÓWöFÐk=NüdÆþVNqþÏƒ)Cx3K(Sœ­Üþ4fÀÊ¬"†ã –`‚/žj!Æ½ÌÝ:bîò¶•?7¥ v0à<Tðs§Ç|+Ê½7<Å•C³´Ðc$2”·(maR£Ë¨ña’¯¤ÓŽ³jdö™ÓãÝ×'Ýããî~„8ÕÊ|É·\ES<õO±•þÔñÅ_,cûÇoÞ¾]¶,ÖÉÒ¯]²?Îý–M4°OÉh&…Ñ:Œ¸z·ˆ!rEÇÌÂÛGŽ5>z6Þ‹5/tŠSæTœ½ß»Ç ×û*`r@‘òòñ +­²µK‡>Ñ?%æ”}PÞ›»­›ÚvÈ»
Y³,!´¸Qæ9ZJ¤,[ÚL¶¨Ø’k˜;¼Nº‰a5³k÷XzÌ?|¤{`%ñë˜À¬¨»ptà¼/Í#û8¬Yñôz}ŸWåQÉªõ:’‘vwKÄf¨æÐ<Ö±Xyv\Gë ¨^¤j åR¤¤·íD"Æ,>+o^ÐªßÑy&ÅJP¼ªåÃ ¾Lë½41³Ç¨_qå°4ØBæúè)®ÑZ"ú¸W„\A]›æè|% aPyY¢ÆÚ”íÓ Px³ÊGOÇ›6ßt…j
³ŒmŒ}œäë&\—ù¬HóðK†‰Éf¦ ò³ 1¾%2Œú)£ZÜJ ©ûË’â¨PFXø¾f÷¸ï5`¿j¡uœ;­Ã¤u?¿ã+ÑvpÈµ•|•:øoAÐš¡,Öîp+&óû7ð:RzÊÊprÌlùxNã²Ýñ y¥+”&§<R*IOœDñØB…dÛP§ïƒ4‡Z¬ Ûg1&k‹Å¥0ã"ëÝ’\ÿp\ Õz;þ$Ö!T¹<Àó¸‡€àÝaúˆCÉºyÏ¾Ý=9IÍ*ÿrTç<¼òì`÷ðH©
é†~¾Zu3*'¹ÚÍËVnÈø iw^ÿÑ; XÁ©[sÿæåÔ€ÂGßØ…6‡_èB#‚‡cŠ‡c
‰‡cŠ‡cŠ‡cŠ‡c
ú<S<S<S<S<S<S<S<SèïŽ)lŸ‡cŠ‡c
û”?S<SÜŠ*Ž)Ž)þ,Ço0=áú/cHx1]>ÿÀBÉføp^ñWX¦ñY¨tðpdñpd!0qçã…?úáÂ’Žþ¹›Ú%*üYŽrðôp^`~ÎÎÎÎÎÎÎìTóp^ðp^ðp^`û<œÜvÊÎnCçÎó‚ÿ  ÿÿì½ëvÛ8²(üž­Ý»-glY’/8¶³ÄéÎwÇc;Ó{VvV‡–h›§%QMRq<¯õ­ó(çÎ+'9U€@€e;IïŽzÆ‘xÁ¥P(Ô½,Ÿoö‚¯Ä^`¼Œ™˜Ì:5”tÒùWèüæ/9ŸM(+“j²Á Î½ìš
ÍÑr!°2]Áñä4¾¸@ŸyÔ­Ð|”gˆ/~?“ßøÅ¿Ül3­¡m©"÷ÞÒæàÙÄ“/‡ÛsIO.VWTÁòìS%”%ö/›&ÒPbÁïã0¢I8¤GI<Ž3øAûë˜3 ÞóZS&æxö/7|Ÿ	nhÂK·äÆÝóh¤ªRY§z«[»úÕ&ÆbÁ2¯¨Ë‹µŠ+JOÕ¤s\Ú¿Ó²ÀN*¿H‰àúŠÀý¼X)óœy~R¯Ù÷),@:ºß¨Å¾]Û¼iIÄ¶sr$aÿóV~X®læºåL•ˆÏ~`ˆáñ,c’"•ž-'¯¾(ï…v~‹«–×)éŸ^ßºÌ:RÖb·Õ±\vÉJñçæ®ÖÐYf#eí×Û–ÇŠ~zÜÒ«ø*LžÁpÍÀ½AK’$¸>Kô¹Â^,Þªéì¼èl¹¼JVüíê?ce¤Ù¸º4»^¬“L†üÌ—Ìáu³ËàcÈ‚Ôº5.m;hTÔ^ÝÊ…,¹m¶]A¦rÂ¬W´ê›4´¾æx‘µz¤—fqb­y-ìc¡Ð¾&ë¯–ôÁ™±UCÎ6ºåfŠ çAé.×K”ë!2$Œ©×Ú;ŒÙK±`ùnl^7Ú®ÅåtÌÆÁ§Uªî¦.­½ÓË0”…ÿf€•“ltÍ&q¹ÈlÃò€hÙ2Ø„‹ÖR8ƒVÇ^³GþD~·
».’hÈðâP
Ô°·øÙg£åç:?|KåÌMìF¥”`léjw€CuSÊ~3¼Xé²ékPz ~ÇlÕ¦ìåõú
FG+‹®äÕ‹ø‘ïY³Û’›ÕÆ€˜ìß2À&™}‹8[*¾. ýíù‡‚§iÄ¼˜U `g}_˜áe::^ˆó…kÙD™P©h+ª†’®8Í
›2ýØâªf§%ÖíPÐ 5ÙÏÚ]gÚz§õ×Æ#å÷tªâ¤&ªKŠÎ¬”]aTÏ‰V“„I‰”‘9‹‰™kUêØWÇ‡Û…?Á(™Ü”ŽPe9äsCÎÜ=‡~ª]ü»bTŽ¹ç`F)£xáÜcßôE &_„jšg€Ï“aÈJ›]T'ñoá/Xâpw¾^bÂMÂ+†pi[`µLìÅ_'$·qtç(ã®€œ}…mØÒd6“h°´ÂÆ ¦K¸’^‚È
¿‡Xl/¿_i«XÈ¦{Æ}Ã$7ò=•\T‰ÆBA_òÊQÈ†Ý…H‡z‹ 6¸¨Ž÷°•k4RU¦·æ2·±\Ç
ÚÖ4ƒSNœV™~ºI™›ªÙ+#¨Z÷–uV±æ£–µÚfAÃïêYÜ7XÕy¡øiZß:÷TšSÈ´¨j­Ÿñu§¡yüËOe#˜åt?yÁÙŸst³Öò–“¶¸ªŽãÇ^] ¤îºÛEW^dåm¥+îjÝ‹Ö>Ç² Y|³¤ó.¾XPkc¥ÕÔ”·vÁ†¯äÊZÇÊ<*üK­ Ã#»îìökû°Ì¥×ò³œ4Zæá€ùqxž„éå³+¥ä¶c}Žaˆ1È{YÌ8À¬´ßµ†ÖSag­£ô{ºk)Ê{ƒãVê¸E|K·çl–†É
¢H<žŽBX3ÒýãÕmö"JÂ3Xœ·Æ3 ‚N“øHÙ6Ã{GüG®Ogš>ý]Ý®°4Ì°ÿ÷l[Gäw–²0€ðLª~†üûu
ûk0G~êðýŠu/è÷Å,bÅÛ_Y¢‹	4¶´×Î›#3èø[êüU2Qûn/iOÉŠ®ôè‰øQñ<ncnå€–ùwíéó`”†êÀ3Ä	=~€ß40p‹	Lk2öÚøW}• ðì2üöJéuß¼jíZkççXóK5zò¶ø>µ„®éõdÀtË(Ú,%l:0Ìq{9dÙeëª}Ò6¦v–ÌBÅh–%×šE“Û‡C	v4¸è]>.½Âø<úû,L®ÛXÛãu{x¶ÂZü~ÚZ^aW¨i·d“-¸»»^áÉQ4Ž²voÙÙßÉ$˜" ®‚(#“}<HxþÆ-?ÜðN8žf×xã^`ß‘¯ª†âú-ÙM°D vëô2dydvÏ‘=àF‡q˜²Iœ±ðSD-&´ªüñDŽ¬ÃŽF!^B|=QZ‹œw†ãù,£õÅb±P¿NË°†rs–zíÆ	Íq·4}s’…ƒ0_]ƒTš‹Ô
—ÚxÌ{áíïáXówZêxË]IÌÑéöcË¤R
™.ZªïÒqÊ^ ìOø*#QW‰E)F	 Ð5ÃúÍ)GsXÙìîåkÝao&£k†µÜËïâ+xiŠ–-z¾´æ7,Bã_NË”WþRóúÚ{ÃäÄ<]QìÙÊÎXaòøŠPGàA÷®?z¤ûS8q?†CI«	9†ðJ'Ça{hófá/ƒ,€†üÒ.90H4Þí8¶'Ú’ŒûÎúA-n‡ã ñûÿ3LÓ~O.‚³ø?.ðFg 	¤‡šj0:Qdñ@Lßpô¸Ñ‰® »Á…þÛß• ™'‘Ý^þCg*€'ñyÆ®‚d‚û‹Ö®ŠQ5Áý[n—üûÙà’µ¯X.©°PÐš2'òtiÐ_R{qõÃÈ­i¤ÚÖƒ¾`xô¡–flï‹?~#–SaN€m«`M¼“Ü#¬.°|e^¥×¿fÅAZ¼‹ +0¾œ¢cµ?«ï†â<’;ÂìÂrÙØ™zâSsé|È«ãCQãVž²«–"˜09vIØY0€¤Xð$ úÇYlZaGRã$3¢6¶[¹-îù-XEc8Nw±¡SøÏ2Ã±àÉ³ËpRrV¤¥¡Q/ç›¤ ì7âÛÍ
©YüdžZ eRvNã¡§àEâR ç{NdåQ4‚‰fxÛ®”0Åí–òì ÀX¹f…Ì¤n9ah$XÌ:[°É¸’ P8¡§”êk«ò¸|uU*ñ9e“rI5¦H²l`U`?âõ-åìì(Em 6ˆ“!˜ã ‹´£E«‰x†zQÚá	†C˜Hø’$ µm‚O§X÷z›}ËþýÜxøæƒþø È¯ýl›åv4ê¼<y#¬9žÑð°ÁÒmö®÷^¿~šFI˜jáŸÎ$¾jc>†õ­Mö€õ7àÏVWþéuaë]ª´O£Y%þâ.ÆBXT…Â@•‰)Já$ˆ,Îe ¢Ij’kçö2·Í)'¦~/+ÎmSÛÿÌ^èÄ.×
,øÀ¡7ëþVk"}âAÛy#ÁyZ?/fq³èyýáWU†"Çq&¥\áA§‰6Ý$4VÀäÆmÞö,Rˆu´­v
d¯Õ*@¤ÛÖ†ø$—„¶ù™?;ŒÒé(¸>$bCM*W°á¢›'¸H°ôKËïºï©WºÒ³iÓÑ®<L)A¡Qc2o¶°4'¸ÐK
.w:Úm	íÌñç¶zíœç~ˆ7r1Å?éSBúöÿ_lÔ•|—Wä²£I8š‹a5òX(°¥úZrJ
Ï¸á?ËÚ‰®0
Kcåu½~cñ€œÂ€ÈÎHË+º†–i,@z¶Y(?vÞ‚#Ý……”[_ÎÇir¤Ž-‡›ë¦ÞÅ\:‘kæ¹Z³
z^ñø¼`’Bð"zÖ>äNÇôà :CË\<]íÊ¼/WÜËð’ÿOƒA”]¯ntÙ4Ž°×Õð#j€V'ñ$¬ðL×ï­m°½™éÛÕê»Í..óo…É¸×5üÏF³­T”f¯ÊeÔæýçb#ŒFsÙfÝû]vSH+Á$¦(ÔžëÑsÚcš«&;"Ž.Š„9è”Ï]U»š£\áü&Ýå¤Ûúí»çòeÅ|;Ò†æ†»Ç5>[}Xé¨µÚÛB»á–ŸC€—ïÚøÓ*r˜äbgLªXaÓ#®f®Þ38_¹Ño½oýÊÞÄ×z >}_w¹Ù?*¹Ù·ör³›8§L/k?¯Ô]@¸e³fD‡Ñ‡Iv4ùUØìH“1SÍQÈtG©q*µz‘®[ÖÝæd`£…UP1Ýé†g=dxCµ(‹U¶Y…½œ¨É<ŒÙªò3+·F¢ƒ’†<[< Õ¬¹+*w`*9˜êWNkeqL]ç~’
8ôE!­ˆ1ƒ-l³z½<aVîÍÌ¡PŽ°´­±ä	¾äç|I±ÆJ`"«ÈÁð%—ùîWYø¢ÞÇ*«ê/¹Òÿ* >%@qåb‹_r­•›_b©ŸÆñoo€µ¾‡åærÿÏ †Jšh2ˆ¦Áè–ßâ™ñ%±À2rn—?êAƒÓàâî1à'ö\â>ö¾fÕÿÌË\	<¸Š“‚_ÊW*ho	Áøþ
Tà?$.·¾2œ\FáhxA1öû`B“Èc,¯W7í€1èQpŽ,q½E’Ë«?Š¿Q¸WúaÔW¡é|°³FÝCˆ&ÓYfzÀ~F3€³Ô·˜^€÷—è‰¾;Éè¡z‹µÃN$aÖ¡F–›U¢3·D+€{"Û®À]ßVöO<Ë(à¥c€Þ`–nëüë&¥öÂë¨TÀŠâ‡òH9Ž¥ˆ 4†>Ár_Â…Énë€v¡îC¤¿`©”+6­ä¼¬JÚû2D±ŠKÏ.áZ>³„ã<XòÄ¼oä›µWÇ‡V$u¡iŽ¨½SºgÃR46GÐÏ¢¿íÆQõ™Hj i¯¿
¨e2
”‡˜yÅÃyóýRDªÝEW9èLÔžs% ËÎˆI·ÞÕ:Æòx*ŒU$É”¯ždy©pU÷mk²®F4¶ÜÇÖ>‹’ª9Í4.2æ+½„•ýmµ+ÃÒ¤ÓõÃò	WÖP+?**5È|’FtuXŸBÌbH‹`F¹ÙWsYñYœ—<oKi‚ ÜG¸ZŸ•¨ˆ~H”ÓêÖFloÀFÜ(E‚+Ä\Æ­Ò†™˜¬ë8›MJá×4mœ²°ÑrÆ‰ƒåwèt:nE™
H™s…J]EÙa”bºœ!P8ùý‹•—.~'Ïjòö²Ÿ#h[¦‡¹Û„ÚS™À¹¢€ðm”BŒ5Kb4êÁÇ£Æ£ª·S\}×í<zøÞdyå´·¥6g~m0KÒ8
š­JÏÌ¦1êç}b	í”Bvàa¢)>uìqî^ø¼äT-ú'ô¦ã¡FJ‘±6•¢K*}ÕùÒò&v?…Ç+ :0%úáHÚâ	ÞÄ Lø_`&“<âÈbS,ÞØfm2jÉÔG˜‘æ×(X¬|J£¼ýmá<c	šp…-(ƒÁÐ]‘|uÈ„¿è.=o§CŒìµ9õØÝu,~/®ó?Ã!÷ÙC_ÒÜ^û¯ô¯k0¦¥"CZ½]ON“›÷æh`ÔÖ‹ƒ\íô¦ÊøÇ—ª­¾°Â×ÈbtY cß]ãÔ¬Neƒœ—ü²ÌõyóÂ0·‘æ6rÃ\.ƒ;ÍrŒŸl§klÓn§ã?¾k	÷d­SÍo-wš1Î¥÷¸+So±”Èëçp4ì¢Õgæïi’ÛÊft;æ.i‡qÆ^àÌt£›¯É[¼ÊÜ¦2³_ÐÌ?'K”ÅHÎ48IÇÑ@:Æ‘æà1L‚ ÷;‰I"´…è ëH‰ñU)D'~ŒRÊâŽXi:6ˆ
÷ëDžø¶¦%YÉgPÚ¸3Ö†‰/ÛDd«|ìŽÉØ.ïüq•4á÷øP{®¼ÑœØQ.P³ÑÀâ«2:Œ­Üþw¥å³²êŠö¿¯nŠÔŸ_?]H4©†Yìúqˆ¼ `¬µ4Íí	’3¾a®•7¨‹*øËeU’ ©ƒKÛÆé“«ùÀ}îåÈÖ“z\þh(•ÅIŒ´ì­”h5åÎ©ü;/Y"R¸ò!ñïh2<½ÇáëxŒð—‰eb¼XÈKJŒ)’ŽÞãó,.‹«—ñÕ‹0ž±Æ+Q*a?ü™g£8Õ‡(ŒE
ž í­ø)ÆOýÉ(>3»lžU1\´L®òoïÞ«PPÅ(Dž˜èà!—?Þ¢%gyæÙ	Oè6T~ø5fÌD]súÊlÃé‚J`["óMß¯úÇòàsc		2ê:æãäS¶ä¦\º¬G9!=ÎxÐºü¥§¸ *B$+÷Húd.°ôÙ$‚‡#áLÂÁ0†ƒÁÿ¢-ª€Ç3–<Û¯]ªŽÙÇ×•¬'ZÆõú†N^ôºùÛø£æòæâ•‰žcFä¹tYƒä\n•|§¬P¥m†/^êÆÌ4Pô:Í@™”º:âßµöi£ìµß½W‡
/×c¡K/Êßõ/‹CíY,ß~¥\Ð@”ëd·D3ùzÂhšñÎÍ«æÜ“Ï±‰Ë|8ûÆE­9ã¦svâ¹P›a~±r–bP!F”¼ °ê°”Ë–Œ°)€ -Ùš{O]ÄÉµ¥IýVe³qe—àÁƒœ&<éDÃåÜÿßÐ(å@PUK¢î%8ˆXåËÔÈ×êWñXK†¯­±Ÿ¬¸‰Ä¼®dèÂxjªqöòy
\^§)Æ¬D zå¤š]F˜Þåšµ±	ÌÏ–’3¥¤‚ËÊ(óÄç˜'\?>(¿vE)+8…'æ˜k“d“°Säå‘¾ñÛ@ò‹ïµ°B]¢á‰:˜bd2spDaâß}sÆ‹Z*[-zÎÜ	Õ]Z8'WêF¿0 i`YÌ°r æáùu–ÐIƒBdX|ÎÖ»Ê„)–‡ÏÔœB
¼dØj»ÞµaÔßÌH Ód4ƒŒË“mbüN„@²W¾"çFaÆf ½/`5Åy[¸Ë‚ä@·ø:"zIÀnÇÀ§EÖ–c]áíz„(ÂP-5 ¢­0ð‘á2¤ŒNÀÃËØ^ÞÄXÇ"¢PüCÑî	EÁy:àŒË·°¤&¦ôÌÑX†¾ãP:)&k+ìÌWÍó„øÊ>Œ¹t¨Š¯Á°·Ö)…@|‚.w»ÛÝ.¿‡_Ì (ÙÚSlíÌÞÚ™GkB%›7×Q®F´@€ù µèÚŠ=ðÞ7+B×l¬­pBæy&%?IÄøÑÇr"(1ØGÁL#9æâ£dâ‘$O\,ä^µMêAñ¢@¥è£´±ì›ËµÁ(L®Lô´8m—é;&@U~?1·Niû¨OÞÍ6rmMDÓ6„UWe>˜&1W|“†Žó=HÞ@>wÎÛ‡ˆcô^Ñr}ï"^î-]v¯ÒÂ"šŠæ¨‹¾¬ã€|ò&`W²ÙégëûzŽ…ðO:Ò¦ìä[ˆ=Uy:ÌRWp‹Güë9ðÎEºaDÇØãµhÈ¹	~	ÙåDÀ×¬,Ï’ltI;ÓðJiß‰FôÓlINj	ÛÝ]Ê…Ïb¶ÖÅt¼‚·J/QüaþÂR 
j¦rú¡ŒaldœÒÝž{Ë*M‚º‹nK‰amè:¾QxR9¦B>R$×dW*PD¾ìFù„Ž*òj	]”o2’ o}!ôrá1uÜÉçx¿ø#;w÷œ<ÜåY&'g‰:u÷[Osi3äiÀ-SWcýmK¦®¹–<d2óÌ$R¾Ç±…kª9ªb¢]1ä1«u-]ˆèÃx1/én¾œdíA%Ç #OÊk á…OmÀjd	#GŠl×H’Êë¯éˆ½«™rO§òî¦%×¦`4FiÂhúå}jÜÒ¬}ª¶ÅÖ¦5Ê…öài0¼O°$#rèÀoHïÕ±„ëÙñ®âo–ÂÖYx|Œâ$µ¶Mf}Î³ñn³ÖÓü)TÑÃ®8»€«%ÇF[!,‹·üm¦½Ðmñç| Ò\[5Œ}iÒÕ#ÁP†¸Dü6†’¿Vef¨„È	=±vÀí%¸Èj²ÂþÌ‡C¿ŒÁˆ,pÉu³•ÉŸbœ³SÆ’;˜Îª÷1ùŽ:žaxÌFYÅ(Þ:i#fÞÖ!Rª1jç0†‘›ŸòaN>‚-#K8Ìb%å_jl„ ”÷¬¬¤v-`x[åÔ'aI5ÕAo„v8ùHš¦ÉÇŽÜØ¨"‚†x·òêË¡Âìµ×5´>é”	²ÒU=U	¼Ã-ÏÂFÏŠ\!êÌu-e1{Ê¤ÊG?h}éï©°ªêYÜC~¿8V9‰,km*[—ÞÕ0Ë¹	ì‚‰rc½Yâ/÷+ø;*	°ÔæŽAu¥Éý™>­>¬0tË¢8¹ï·Å…À«ÎzÞ„Yú ìßô]òz…–ÜX<ªÎ,¯x¸êiQÇFð¦Í´nKüm¯L³sÙs½I£wÉ›Áts’Î4Ü$²³vÙ³ôSëì¤Ön©®â–´öæ:þb«–â2uÚ¼"yc@út¼íÂ§¼Þ ¯*S*‚†©6ì>>6\(!!úØm®ŒÊòÃÂbi\çÝ+!ã=3Ÿ…]p/ÊzF“Õ+WŸ¶ª?Õ¡Ü5o6A:-\$ßõú”pEÔ[¨¨›ÄŸ]õ\*ê-ÙÆn«šcÝ«¶köÊŠG‹îŒP€Vn°¯"œ5žÔÌ<a?Ù,JÐñVÑâQ•L8Â{Ixø–¢ªD1AJSc'a†9¨Sãa\@šÈ²°’LZ+'¸Š–( V½%þ €vAVNÕCå ¶h¸+ç¿ò#õ‚ôÂ¯Dõ‹ðš'š:ù}†e^
‹ß–ý8ÙÐÁšG•ÑNÂ·i#°pçÍ,k8p}ûÂHÀ+üwÆA41Éßj¯à®¹gó Hs<Fž+F%tRÉÀÔsO5¡^œ2na†!áYgÕU]â¹®¡‘2ŒjH¹R¡Ù^²P9Ú(~e
(‘
	‰íµ×lüÍº’Di#÷çæåâôêÄÆ!"]°ßc=ØÏáhc|HÛ}8,ËL|+KËïzïŸÈupÖTT%ï0ž½ÏZ8ÇÎ|±
þ7Ì8³FšþöÃmy…—™äV~—Ž^Ûö®Ûé‡ã÷.˜•rè€ÇœSÜk-çû&œã³vµyÅ«9˜£uKeX½­½“°yYnúÜ£˜·¹{U[…üÑ^…ÃÑ²ÔV>a­ÿÔ?L.`ÂI‹m³˜„,ÄÊy¥×n>TÍÁ^êÏUµ¯šhè•l'CgÕog›å¸Wƒ¡vpÑk[F¤‰”‚!¯“Kj* ºË?ŠìSª0Ì&ÆÞ÷n,`ìï˜µ<
‡BÕe‡™k}¬×m%²SÅ	d9@dYë‡L¦í(ÑøùÚV¨&ØÏÂ%Š; Æ	{°fPº¹Ë×©g­CWsNºC)úfõß[”Ô¥W]]K5ð¾oÃŠŠ£;”/q•®À¹àÆ +:²ÔµµÉa‹¸&LJa.yUZœA²ò¬HQ¨†M4‰~Ä²z<q!W¢¹ë˜Þº^©Bú®’`ZIáJ8]vé°+@mÎ'—É4¥¸Š¯ ‹ÿ©ä¶¢dºdéŒêØ¼S«ü„­¨>—êøsùÏÇÎŽ5E¤ãSS^R|¨8ÌÔ]Î–>¥ò…¦›½¹ŠÒ¸jzÙZÒøô-:C°S¢âHò®·A‡Ï÷sexUÛ‚+Õ˜žJ@V¹Õ«áA<«³F•>î-Ë?ÚÆÐØÅœJ˜T	^OTëÕ÷<•öž[PQGû¥Ãµý¥ªºÓÖa¶´tù(±Ht«`À,7äÅ*[ ¶¬Ù¸ðR=ë\éUÞ~¼µà•ÉÅ—ÞN~›ÄW‘Ž©ÒUGù§T9J|ìå¨½ù-O¨’U*\\+mH×·B7ê¸¦f–²ŠÞµŽT£!eóJä*wâbq…Q¦8wÌ,/bUÔ³œy/©)B`êŠ·ñÛÔ‰ß§Qc¾Ú$“ßÏóh‘|QÄõ<Q¨!»ç\œj}Û>(Çøm9I¢§i¯§VÔuo…Å—FÆ5}5k“Z}‹#¢Ò®Î¼ä~sG°õ¥TÂÒ<
`®õTƒå¾ì’ºyÂÄ!/Võzí¨Ç~5›Òqü·æ3uˆŸ|‘ž_ÍZCú*×)h´F)Úu°;è«§fÐ¥WlJ›eD-÷Ç¯'É®ñä:Ç¾š^³ýÉ‹?jò\É–X¤dªÈX‰ý´©ŽÜEêá“1 é$*IÖF0-7&¾€ R5ž?Âxç·LÞÝ'ìm±€Z¨×#Ø±ÁˆÎ®Fü4EŽ’t./Ý/bà§JŽÛyBxy`~Pa„¸ñÈŽÔr­€¸ðbÝç:UØïÿ`+Å¡tKU¡Qn Ë—ž-"XÃƒÃ•R|ËN"æ¥Â¨æGx¥cŸC‘ÄWée›V·¢7¤„Vs¥Pú¤ó.åñØ-Ë?ÞîäjýHeë»Þ
ë¯°õ¶ñƒ‹lïÞ/ñÎ2Àb™»ûcäBíÔŠéaTá;|³z>Êè2ZÍvÖ¹J"dð‰“ßRŒ¡‹Ž°QF¾SžÖ¬lÙÔA8RÒÙxL™íN;«§pð)‹É	wøy4áÇVù‘=Tºô\üsSq»ê.¿Ž‡Ž@û*@WêÜYµKy‰®¼êªŠsÙÝå¦F£ühªÍWac×-y¥=³	:ít¥A™uTº5´5±ÂÖ¦?¨›Ö4µ´ÍÍ“Üµöc®uÊä,iµmMé¯¬‡óÉ°¶q;/*™9ÌZ{ÿPLjì*Â”Ï î	Ã <8(®Pµ'@Dß‘iœ¢Ÿ Ew-Ìª¶Ì_jiw<›jÄÛØEI8œñkƒÁŠ$ì5§Óèyq(:~5ˆ¡¸ZOàaïèù÷Ë¬ø]¼«¦¦Å³é,½lË‰øðn€WØœÂÕ¹ °3¡Cc¥È£µWä3pöð†ƒ'DÁ?LÛÆšóå»N+²ò÷ÜVZi~@2Bö@ÅÎbc6D>ÚZR`KªyC¹r„òÜ”…ZÀÅf–ócÚÇaw4Zw$ÐÜ|ˆUníjhÚÒìXÍG/<"/W§Ÿ4CˆÇ˜ÍÒ†Ögª+öÐk¥¦¡Ï¢°¹† „ÀbËÕN8S+âLsgUã£±ü.¢‘ÇppàL¶Ù flZÇv-.³|ý¾Ü¡|Ô+,œð”9—:¢ôò'É¬þþš+!c‚n|j‘3M‚UÊ#f+ÀtNEœ`)ù I)È–¿­>#):ð{+ŒÓrøÊþ*û^A_³4‹É(»ƒrßñâ¯œE;Ê¢dòT‰JU„Ì°d£ðgO1µ4ûØ°•bÑ?6×©rI­r¤Öê¦¢“ÔÒžŽK2®‘ïé¾[ÚÅOíÖ³ê„ìÈœ!ñæûÌ–Í€·iÒ€ôôœzÔU2B‹—{"§“Ù£l¿ÐÌ˜½9>Y?ÆÕ¸7ÑÊ}}ç¿êãÌ@Ãðæí^s6a`CÅ£ñ¬
5´Õ«7ç˜rZ×…„ÞÖ
	VmH=°Œo£`66Ðw„³õƒœ7WäO­º€¤¾~ NˆÝŠC§V 7{goÎ1øPáÐc~…Ÿ¼pÙ®«‡Ö~±>M#hÚþ½šÇ.>~OyJêùgÇã4Q?t²ü~ÓäCéúZ ¾‚T[šÑö¼à5xFÑß®?®j¡Sèw¡é£‚b]SK¨Ú»[ºO)syÂ–d*îu¤Á5¥ïf–\Üå-´ÁµuP@{z \¡BIÆ-Q]}ÓóOºÉYF¡$·hÙ‡A/>"bÒ€HKð¸úebð„C¸ˆ-Û¤[„.”™ˆÈgIü	-.HpëOË<©2}l±¤ÌÎ8FÜv\®{ùìÏ“N~LXzojç,ŒBeºZ¬µ·Úp€Èðš«wwƒt¸Šÿà-Œ4…8N¨éü[Í¢RÊ†;6ë˜Q¢+lŽŠÚyqj“¾\–üøïÀ&M{Šä1.hþaŠåU$M,ûnÖg˜ø~ŽÂçÞ.ûq3w¬Uú…Ç…,ôLŽµ>ÜŸ5$NåÀó}ã,|"1o6ÓþÇ‹Ê@5ÎÏHM%[°?aêÕÑo¥ª~Ä^õÒø8Q¦MêQó„Ëhs³Ü.¹óÏ\è4©âKÚÎ¹V:zO¨>ö,	%Yý×¿ØüFÕ(eÎÇå
Ç‡ºÈ&W¤lÏÕÊP¬5ºà£
(—5:×1wpõWáN½Q.ílë°,¦LÃb?må›ŽxL}¾JV”zZê†G`Ì„£$þ–¥yO¼ºÒt
b1Hh.¡quÖ’$®¼íébS­/Ý°äÛÑ?÷%6J¡Î"'Zw\­À(²PÉ×”‹Åªm¤â–ŸF0·Zü~£_J®—ÂÂZTiéeXÒ¶¡8£Èå´ºÔT®Ao<£Ê¹4äsÎUØ‘},¶L0]g‰°ZæðQúrðõ¶“oüf y=®õcªœÇÂTwTÕ5·ÊòjZR]®ö«rmI.×Qü±v´Ñø‚¥É`· ÖF`w¾YÙé÷°&tÆ7ø´z©V=äe#é´]¥‚u–ZÃÎAø³¬~!‡ù+´ÂØ²¥8?¹"E”HëíÌÚ+:ÄS8T¦ÁE@	{}uOôò4¡J›ÏyºÃ&ï¢iú
)¾êÀ
œGÉ¸Ý:Ç€"÷°\Ð'­åOã£gƒ÷ùð²¯3*§U~•Å5Z+J¸*^5†ôÜð+»eìÝ‡âdèÞ¾ßfÃë¿À íJ‹XéSåìcyÚZZÖïÃËæå51dÚ¶ÄÁ¸´Â>Hè­‰$¢áÍš^Îwó¡ÙØ½Ÿõ}²Ö¶%?¶ú±«X@¶ÏVdÔà‹’àOÊr6·N"CµÔ²( ¨œÍô}Õ¤¹ŒŠö€×ª>êj%Wë>"Å‘Ø‡9Mõ{Ý›Šÿ§¯{©òN­§¯ú¬öÕë”2Wø;}y8¢¡Õ†ÛE#_´*¯uc`o§Š›¯·+Z³Ã¯RaZÉq¡W—¥ÂáÝZ=4S÷À©5aŠ²£ßåœ·i2l*¾]ˆAT±v7/®Ò$!¬Ë¯‚Ô^¢ûKÞ4šï Cm.QLg³WƒÁ œâ€–¢qp®=hø~<PQ]t…	©d`CÆ(O™ŒMäÅxñwú®ëk7dœÏÁ·š°²6å¾Ýe“ðŠ	fé´uL×›p[L´p¡¿Ë¿˜4e‹Ñ¡Šokƒabfž'à€D'Vo2ÂE8·/È»9¸7•†m5cÜnÇº}yæ­	ûÆŠœê>åøÏ~ú<È‚·Ç¯øöóoÅ›clF‘Hœ}÷¬'7ªêw„Tk&±8™Vkx.L?"Í®|QÝ
¯LãdiÊvæºL1âãÇj‡TUœ8/^Á—™ôæ¿ðßNøo'|ýçÛ	ïûü·ÞþùvÂÿOx¡¯¸û¾~ˆÊ)öu›Zã¡E­‘g/ìHãU4¯xŽ‚³k¶?ü¥a‚ŽÛ{#Ô?R%ê€»U÷‡{ƒËÖ„Î–˜'~˜ÄS¬í” z¨žzÝþµÎk¶Ú†Ý,§¸hÃš™ïs„aÒí-/¼ó
_GEÔr×Óå@(eÐlY­þBV®BeW‰¤~¹9z•AÀ‹›‰í~L›yÎwK˜Åzœæñ“xàò±M×g(>T§Ê«-œZÝŽVKÚýÞ
¼5±rZ"
@kì{ÿûO2!Áý{û³{søg¹·…éËêô3-<LkB¾Ô7[¨Æøý-± ¶»@Ø]ÔÅÁY&©µ['ŸÊƒœeâá€ý•ipzƒu¡p
Pä„‚4%üÇwRÍv‘ÄûÛn&éšc6[	$û–;Yü"úÛýú	sgÂª'||.ëýG:È ”ˆckïÙÛ×o_íŸ¾üûûéh¿v4u\LÙ¤6ýd1©‰ø:8Ÿù0*í[ŽÂ\ùË5À³ZtPu6=­rs ”ý•õ••Í÷D#D•Â“+º1ä€rY`òÙÎ.Û~Q@gÝ{Ü«àQ‹7õgE%¯QP¥°šXÃOSÎ<s^£àp’ødÙôvèÓ˜—õJìÌaê•N¨IòbŠEBG²?j³ÚgÖb¶ÆRq¼êbÁý4É˜âY¯°‚R-nÝ^-Î½DÚD*¹rK:†
v¯Ä
WTt«I,PY¡ ävü)-
'Š¤y?œÁ¦\ªq³ ã]QãÉÛ'dº^Ý¢?U¸EÔ-Äyg&B6zu|Xí8°PŒ‘d+GÉd1X	PðØ8Ê®q ¹ŸCÐîWÊº‹‚Tbð„\²®¨<ò•ä$üt IÃO·"q>—kw5¥õ]$Ü)òOSEûäŠ^Qå½[àHQËœâ\AØñä-éýsÓ!<¹¶ÆÐÌ´OF×C"5ÿö&"‰9tNš™ÔÜÕe¡ÚµêŒìo¡^ÿhwŽi7­,ªgåØÚ•4òZ7[LL¢1¢h„)‡ôïp–µ;QÖ¯Ââ;£ˆ–l&;É *nT*_e„’ò·T»LÞ0ª—ñúT›,NÖe3ù‚¦îwŸRK“™¹SQ
XVYòð4t:¯µö©"†NWˆžÀ+IPóØÚ{N†ìPY—xÂŽN÷E"Ápw4ö²*
g‡ÊÈ©™š¥Úã6@Ú¯â†÷A¾ãf«§<5ÛOÓxº±6v™ièÌ¨‚*üd°¹<øf“,H®<èÈy‡ý1„é
…xKµÚÓëýSøï'“Á‹Ð3	±&“Çx}YBxÀ
´c¥yï,>ÏƒÐž!v`¶?JËsþ=xpxð÷ƒãØYW²ËKÀ«ô}®CøMÂ„†dÄ
‡°µB¬É5¡Œ*Å<;Îuh^««ŠÆ}û:Dp¦ì'd‚=wj)ô-ûçk\ŒÎŒðò´îZóÃexÎü]â{†ì”üê$ø
ùÍî˜½HêV*ÅGë´úFýVMºkíýßÿõæÓ,€Áù¾Î}s7FéItöÍ¨¤…†ÆŽ‚kY¤¤Ã)¶3íœ‡áK^Ûì\T?›vü­§×ÐÌòÂ+Ë¢ÖßÊH¶-ò’µÏ;Áp!ã9h+Z»Am¤¢s¬‹Ò®V¹yJ31(êÙÚ{{>_ ®½Šd¸±)jƒ‚q}A¾ÿžûŠ¨žb½îÅÝm-³†äm·Z¾·òí í¯©’O¯=x{DCŽ»_~ž^bZúëxÆ™eX,8ÙðŒ|óŸ/ÃAM³”½Š/.0pãnÑQÉ”q{|ÔQÐš/…WoÎÏ#`åF˜™0	/€*Ò"aIÒ{àh^!eUI{	ðg§!0Â0Ü´<²`•Ü¼Ò¯w¹Ûú,+•ÕõœEUYÉIÃ¯4-/¤‰
(:å¤ aZ=ƒö†©V·_kOíÕ^m|!B4G_+èQ#­ŠqªLœYäx¯ñØx£GŸ¦Š—Âu:±Z=Œ¨Úµ%+£«v+¢u>ƒ«*›LÕHcß«´òù¯3O–sK¾qIÛ¡IøûKÀã°§è$âáÒEñâÊ”upñ ü\½fâK‘u¹9{GÙ¹¾?Î:ä­y‡S`?€!=Ø¢ô¢uYmÎ•¾CúÎ2¦šF›2LS„™ÍF£ë“0Ë¸×Œ1ç=>äBŒP¡²}Ñ¥&ª¢°}s¨©L0çº»kUê^x®dÝà5oUQj©H‡Eös¯L\N–O\îíS©]n”Ž2gž`Ô«˜eà¯>øÊ¤…”ˆ­±¢—9^“i–"@»Û4Jþ3?{Ÿ[›¢oú‰G@”nQ×ä^ý³ëå“ôœŽwò4ÏTyó;„ët–LGaXñûAV?&çö\G}@ûF·{1û&ïæÖBÓNN3Džß3=%½ $ 1 càpMïõÊ2ˆèQyûÆÇ}ÑôÑvJR@8:ªÂàé2ý¦\_„|	ì eÕ§È‹|Ž‚³p´pú»”ÜÚÓ´5Ïë5êÉoPVÁ6ûp«4µS½"¥¾s+Ò·öPÿ=›g*zSRJc…­x¢ðÊØðÌ¥ÇŒÒ=kÍâÅÇœÁ¢T7šPÚ}‡?;’Ô>'©=VèM>ç•UeMA 5_Àu‰¼ ýþz‡Œ}Ï¢d0
eÞ²â™¤ûî)6eÖxÔÏµŠyµd·»í"È¶îh¤Ù2»ø›"Aµltu»5È%~Mp+P¤¯ó_€#PGwÂÕ¾÷ìÏWWÍ‹ÛBµY>ú²ÃQ8AÓWÌõù<u«²sU9‰+µ6vmµêW¨2È’/ôölcy˜´‰ÊgSû~^¥n®‘796®ÿAÇ+våßßÃx_´3%ª! 7óø¤ïe¼zÞ¢F§¯Q×[°’w¥ê5L=w î53Ê‚Q4(ÇbWAãñŒ]Cªƒ1F‡Ø`r-JcÂŠó,Äè€“{úè>>6å/üÉ*¼bîHù›'pýT[ýg'£¤ÔZ8#Ú®¨ Åv.Ã`XG€³Äj¸E7SÐãr•!±×€cjµ)ŒØç„ê9t¹³–]Þ¢‰7ÇŒ;]ß²bi0–1‘æª[6¸ÏE:.ØÞª%ámßnŠF,nöà‘¤×êQq';‹‡×^öÔ…:DÓ¬ØdR™Ö—5åÃK¸v}ŠºuÙ: ^gtøó“|_%ÁÍê)â9ˆîYÝŽu5Î¡ObG8Îf—z‹¾nÝ•E;Nœ‡á!W‹/Ü¾áLSö‹Q8ºzfñ.“Ùd ÓÑbïz}dëiB¹µîdZM”j’a©®Ò0;±+\ÆW‚ad÷Lä¢]†*$EÈqdK‘šoKÖ³`e±Þ>Ãõ”žþ…W’u÷¿]/¤¨%“X¥r} $’U¼Ã1‹q~Ub‘ÏåúHI8¢ÞçŒ˜œGèkÂI”]“,ðÓ,â B5q‹¨‚BåbU˜xÇˆçÝ:¤ ðúøcE¨ëT,Ðìiü~'põÍúßs¶þ(Zw}‹¸‚‚{hUã0…ÔWØY1Æ9rrßç~ÿ4Œ$ŽÇ,Vf0Š/xÌÁ8ˆ¨œPFôêgyŠô:òb$Âéeˆ&E1ÍÀ´€i¡Ì@IYL¡yžø%B6J1Làbƒ‹€âòñCž² Ä¢|æ[Š“”ú½¦Þ¦3 ðdyOq»#jo1
³mœ1Ã|jSAá³@xäPDº’Ç< ÖR\Œ.–ªé$ÊÅ»ô¹°qç‘›_“'+w®~8}×N¬
sYqìù¹°æ{÷X ÔòcÍÕiŠÒãX*1ˆ0àùÀQ ù|¾Ñ_F„ÿ®1JÖ—¸„žl	ràIŠ‹8¹æÜOqL,-M˜‡§-–±-§ÏèÿUáœÌžr×«>
³/s˜Ñ×…qÃÙ€OyÎƒÿI1îÕ£µ"¢ý®Qïl4»b§/fµþ¢Eß-‘v~´´¢¥x_s/x9GÛ*‘÷+@h^[ÐùàÍCGæyDÜÐó¦/–ÜªÅU´){$wfƒDï^ë¹MÚÐfÑ*Ô.êGËÆùu&Œ!ÐýU)¡E‘d.U¦Z¹wîØñM…"L¥Þámö}8¨TiQ}Ü]¹/Cl—Ã¤RÝOžQ¾øÝ¹(’—†Ù~©‰vžžz©Ö`éˆ˜;VÔÙÃGè“±NJÈBaµˆ­9˜¥Ûñ,#7J3Ê/aþuÍ”ŠÂ„_Õ58´÷£	©„7H%ìž^µ}#æ^§|)ZÁÐ
õ	ÊRµàUS×ý$	®;çI<ncü“0kCky&nØqÁÐIÖŒqÊSE>…a0Y^Æ’ÈIÖæÙDÓk{ˆœYDÒë‰`ðuïäÿõšK¥¾;!vi¯ÚþÏ$7ô‡#ª¶KÎâ>hlû–ô@oæMŸ…h‚ fúQ£™BÎÔ¥èæ-IéA•Œš·ÂÙ½œ×Íy¥…F”3Œ0&…inÞRœ]¢öùþC^K€7íø¥ª{¿" WŸ¸=‚û)9‰ÕœSðp(wŸ–¸*ØE˜ÝókR0GÄýÁ–É€¨^VªåÀö¥rž^¿¶[¹T°za‘ëUzµµüXÿI˜ü|úúUef!Öz«-ó¡Œð*ã›ç#Ü†ïW	°˜Û¬}™GÛ¢@Íœ^Â!‰Îè‰å VqŠ/ˆ¤`ì¦¶æE>l>Ú$ÊÓœ4Òöc$ŽÔ3è­ÞA(–*Ž~¹F=¨~æ+Sn®²ÿú¾:å'oÔsivíý0cäN2çÀy0ŽF×Ûlé%
 y¦×)H«³¾“„º$:Ì¦ÁíÛÉúc@ŸQœl³ë…ýGëg—!Zð·:ý‹¶tT¸¹ÐE“mÆ/6i+÷Òšç±û1lëñ6ëO?±4ECöoa?|xÞ] YQÖ>o›À¾Íøå&íM±¾ù\5coaëßðC[ÐÌ
8tó™n4keªŽ¥ù TÎdNÅ7.ˆY•8rþð<84wgÓmOÉ-œ¯Z×€{a½~³É®DÆþÁkd~,t!Ñ?30b®qó\«$Ú¿{êÑf£9<´ØQyçí‚¿n¼I‰œßfz2G§ÞÈú ‹«7Òi‘cž´GÁúÙÃ›ÚÔšÚÚøqãáYã¦ï®¢­ó­°UÕ5r6AãÍÑÒÒÎÍÚ!CðóûMGlüý˜[†3‘(†lÂ°žç	þÿ1j¶š¯n¡˜Ãÿi•ÿÞ		ž ,]œX1Dü¯ÓÝ\nDz3¢š‚ôfñ£„&zF)7ÊÃeúß°‘Â•h=`…ÿëcjzœäÎ©Es‚èr(•I¹<ywÄ_hè6 H!Þ¼ÐÎš7—·Sã]¦=‹êÅn‹|&£avI{¥˜â"ªhÛŽ¸ÁÙp3ì)<×ú&¾i][ü¢ŠÞ°T.³UlM`8ý×é-?ö¥ÞT“&¼aï‹,+Å‹{IÔ³ÌRžÏ&$
¶4Ì[	Î±¤9mÉGH˜i#IhPP0ožt#fËi˜Fã0žeíêWØÃn·a×ŽÆýÈGOPiT-¼Ùõ.ä_
ö²?’ì¬ynQØõ>R G‘J«0*—±úåÊUq³ªÒ£î™¼Ák;j.Ç6ÿâ’r©¤Z¾MóE®+Ô!Í­ÅqlZ¨K¡k^U§#\€¼¶Go½*²‹1zºÎ_Åìä2*á/ç…b%sµ{…Ñ‘˜™­1Ü¹d vèµd`]ñ¶;Ü¬RYo®¶zˆ/]æ‰¹îªÃ‡Ñ$òºcÖ‘Ž¸+WÒ™½Â•­ÂÇöäz2@?K-ÒN§Sm;¯¨WÉ¶™SY*X)¨®ŽO‰ŸÚÈXK—W¨×ÀÒÃ»× Í\KÆõ}0¬T}
ÝxøbW.€uVžÙ³¬¥5ÇvK•“8ŒåŽÖ½°SöATSAÓ'¶€Ïãn`^€TBAh<„BM}‡ŽÊè`Œ¨â¬]r½ÎƒFq‘î1Mš}¸ÄQÛíqÌ×¦"éÐ‚Eµª"J]‹]…ö;Å¼ñ¹×*øeIó!•Œ¿3iä{Š—N÷M;UooŒUºÃaa¯ÆÂëºýú(¦iÀŽxJ@ÑŸ¸úrèÑ!Z´Ë½>±˜Æ1e_ùjU·Fa†¾ìá$ŸQ”çnu-G4Ð,ûÖðºbÂg	ÂÔá„•’Všt„þ¥Øüâ?àCî¡Tó~0îUÐVxGôUÀÇvÐ$!†ì‹Tëh)Bæ XùÕâ±3÷c5}PÇ¡ F½„þ©˜¾ŽPl‡¿²^UÃUÜlÅ-¯ôEöÆ|<7¼¶Ü™#;¬¾°^¹ó!'ÊP¬×m²J®/ž‰¸~pvw2¿ìš'	¿*Gu87ÿàyFÉ¨Dÿ+N%ÖÐKŽÿõýœ¨vçìÂ'§c¨W$Ö\Ò_m$yó@^xeL¯ÄKdòóžwÒÏ%|ÃéB£œkÄ¤Î¼®}<ü†Éb¤Rûü"S°#…_UÈŠ¹ ñëa’¹^šaŽ¹ÒÍ>ÞìO†Ö›ëxs=¡›¾×Z¾É.)°ý å½Ò^ñËžè æ¿Í¦öˆíñ8P3-.l)/¨5F#^yR”žñüºÉÆó£dxaf„Ç-6ˆZs×yÒ)rÃ–/ýÁ ãSÙ¶ÍÍOE|§èì›£Ñ/‡¨Vgf1³ YãL.8YéNê¬zž‡aÄžügÄð¦|-‹!¡/^TÕn^§Ô¡ÿÿÿng[|F‘ a”eOp“Ô¤€Sw‹œ^5d+…ž­èi¼o©£;áL2ôÀõÉõí¬Uü°onhŸ}ÔÚ&Æ°Âž^MZI,3MÂUžZ¦Á–Q´#>‹^›nÙoÉçuâ®ß.öÀœœ¨ölP¥›:Pý(]¾I†svÎíùí ÙžG×¥±8M¢`rQä<íß”( Ñmùž¢á(¡ô×g¡Œ;bk˜…2e>IÞ}³ä[ö÷Ñf×”{äâ6Èà |æa&˜T1©~‘HÕ•Q÷°4Âo½¥öâEýr“»d…G–H´‚Žñ@B·ÖßÏ°Ïè<â™×£v&Aa}	9ÿÓË(òÙl•À’„ãeš·ûôöIˆ•*ó×OÂ$Šg)•x%°ä×Ñ$æÃ¼–îRjô:ºJmJ	.žZò4ø-œÜÕº
”ï!xTŸ¨¡Æ¥<9?°¼˜ªÈ·ðžVÞÔˆ¹pµ¶a£ÝŠŒµ~'§¢uUïl³ßâ5/óUQuaŠÑ­ÒIç46}²—ÈW­Q²µG„öþ@§;BÿN’$’ÞÃµý%oæÖ>[öÚÍîfk—Ýcg×è[žÄ“‹Ú0¼¼ºä[¸~úéu>X!lïcÚœ0¡qS»{~ð@ÚG*tãîtÉ&);"¢þäçh8´*G ÏAŠ>l\Ç³LæÂì«äž°vôü»'!ÏàUºw‘#êr]Òh|ÃŒU›³Jys4ù®£çyK8¹Í¥ƒßSá€¸Tòµþ@8³åÏ û\æîpÅ›t±Ïc –øX–Ø[]»sÙ·ÙQ›È5ïºþf8~¯L*÷Ôãã9-<¨—ò`¬ØË	9!/¡?4\N»KÂx	‹bg0‡¬…þ|K¼3šÓq8aºßøœL­G—Ñ(šN£	†¸]öÍÙe«~¤ÎÙ2Ã%îÿ-ùÏu]Ÿk÷¼÷c? )=?8Ú?>}}pxÊÞ¼`Ïß>Û?}ùæ°f:½rÉ•W=’Íšùl,0Ÿ‡Æ|úÝ­Þâ™_„¿óÒ#¬:S|%ªœ+ùØ
G€"Ö‡çï¸ì5É²  Ì,Ÿy†‰šùæ3à>ãæ =câ°ø4'£ê£Èéy'ÉGÈñ[ð&Ä¦(¾%
[Bñ,’Å+¦™û‹/a;K+ä1.+‹>#ñ%á0Ž7Ñc\’é]»Tr;.H’òt¼òL‘¯ä-ç[5;ùª¤TÕgTƒÒ8ªm‹¤ý@§Pé„Êz?Òñœ<Ôì“b¨¯òÄå¼_ì³Ãý×ÛµG{sdP/IÞl»^Cï»]UÒ¾8cìó¥ÍPœw›¼*8>xqp|pøì€¾}ý.´_./ŠÙ›•búl_ÈÐÆ<6Ë¤…¾ÈÂ©#_þÎ(™x³ßõ¨`óÓxªÒäÿÆˆòìíñ1²'Ï;¸Cjá¢[ÖåÖŽ¾	z¬ýS‚ò«˜Œ3$ÍËÍò·_xÅþsÿõËÃƒçìÍ!{¾z—ÄKž»S-w²øU<F!þ<¡@÷öR8Y}{ïÎ1´ãw–F ®âtiª“Ù8L"d°R†reÉ[àH#¶*Ý²2K¨÷@bÿ<©MX`ÌÆ“œQªeYª]%W0Cmø©ÎcòŽ&?·¿ä½»Kºïø8ÉY}äáœÈ­•¨¼fa‰QÍŒé_
Þ¸üFãÑƒÝr•ÌPÅUáªPÌ‰¸3¸Î1\èéàJðuy~š| &!±Úó±«,‰ÔÉ’.ÎBÅL¹«^}:ç+ðWÖ»é0‘EŠýp6k¾c@ÈÞâˆž‚t3o‹\Ÿ×ûõ¾=\Ål‹8±Êíäc_äŽmOX‹µ[X }`8ˆœâ^ža‡Ïõ«Ü%ìø¹p	£7§?À1µØ›/O–[p·ÕzH»Þ€æ©÷­rÍÐBdìì€©Ðü€'ÖªÎ*ºÊöá?ÐYRuÓøÀk£ßÉÄ},	”ËÊ©qUA½ÖÏ,q%ø³Wû''*'Ì/W«þ­.f Yö/vòöéÿm+0V}µ¼@íå©`xS¹#t>ªŽ'[ÝP5Ç*—²~¦J›S¥ ñæ±å²à®qóÇ%•`5ƒ\f§Ëúà.êƒðÒ§ûÏ~©úÍÓ“ƒã¿“~•½zó“/Y˜ZÕÜæé¤'ú+d:Ä‘ãSÒxÈ9j‹ËL½ÝÏÍµ%[Ñ³%ïíìÊÅÍóõóó¼‘üúp8Ü:=Éì}!ëÖ°ÿpøèNõåá) )ûˆ¥?°}"s'ìtÿú—änŒ³ƒÞðÑ¦Îªæl[µÏSk©ÖÏÕæE¥°ìht7OnßÝÎ¼ù@ìú0M¤VAW¶õ
#ïšp‰PŒ½·=µëžpËpNo#s]w™V®Tó!p˜-|¥u¹vÚÃ/õÍ!†œæg~p{•‹„%Ký~wk¬‰Ø2-Ü¦1¡7ë–±$6º¿¹QÚf0ŒÒ
ñÎÛ4Jo”)æµÓjK«4Ü‡	@wq“©ô³»Tô9o9Í£a"€±&m§'T[i–Ôfö¯W©~CéûGé“g?¿yóŠýôöåó}4ë€ØúòÙÁŸ™1Ån
ÇÞÚaœqG)òö¹.×Ö=ð¹¬sú;kXP­8êvöy>Ž#Q–AmižRmLô_x$Ã2³½ózÿþû©xæu<F¦T-ˆÞ®´ž™‡°lw¥©¥tŸK­)< ¾™O`ZÞ8•âž'ÚÐÛçÁ(-çÙˆ8h˜ô³2.Ç|.JÙÂ™»ó,™•B.FñY0:œOÃd#ˆoúsšC¹6‚õÓQ0ùípcü_Ô±)š­‘š%9yÑ³Ä´îàe>QZ€Rwo¦!‚W4à=|Ò²ºÕ»sýw©5ìÕËà ÏÎZ‰nä·^„áåÜjJ°D©|«ýå€_äsê33*vçø7¿ºVô>ŸšU}Õ+ÁX™EX„Õ®–)CR±óaO±PP‚¾'ÿ\}×ßì¾¯OxƒZ†¼ªýµ%gK]å5eL™EI`F2¸oå}pO[)ØÆñØ,	kV«¹^}h:‡Zh-\<ý´JÑ×v™H’,ºZvD­wØæ‚Ò'{R‚g1¬¡Ë~ƒŒÃ<âgËHèÌ'eE×y%Œ6÷÷E	/‰ÎfäÂ+pÑÁØvw}kŸZÖ@›¸ë6ðLÊÂ*90ˆ­JKùÙlpüO	hkþ.G>5« ^VÜ=Ì½‘·8îöLïsrˆN8V9-ÞÐµguz.åÜé¿K	CÐ#ÚŠ˜]Kœé‚ìd‹[’?ÚGÏ™U©Þ?9yóì%×·OŽN÷—®¶6'[ÍóÁd(+8}ˆµ`^î¿bÇÏ^:^ÝÅÜXgˆÎRÛf6¥CµSSž¶ÏËrU…5L/VÂæá£NB€ù˜·s&"F­ó\É“º«|½ª¤p kP>o;qÂ‡èö€q	9NŠQDÇû„îQpM$h~n`›C’<SÞÉóÊè}Ç‰à‡ËuI(’n¢“î7ÁøúãÞž°¨ÏÉe¯³Ùd1kR:æëÝÊýòŸ‡YªJ.×¢-‹ìŽ^‘o&‡bŸ‡¤ [—¾ðºýÞ°¿98µˆÙÖÞä2ñ¡*¯¼ªöåíÙr÷ ZÙÀR(H¿R¸¼:®tMõ‚ˆÍ{ÙQ2¹= J×)¡—#Œ±Ï£¯ÇYdû­Kïà«PbùBV(õÔÍ+"+UhUí?´;âUîšNˆß3‘6E»\Bl@£U"/ëÁõ+è²Û¬UJºäæP{NØ$‹³Us¬ÞO{ûcò:
¢á­7ÃÔK:­É†T…ñ–0sE´¢áy
tÆ‹7Ñ So4=aU9`ŽÙèš}ŒG Í ¹fÓ A&šÂŠs$žžSžÚÆ ’×tï¨°ø¿ÿëÿXÀÐºã²w²øªgÚý
wêF»›eA6£Ø¼XÊêÃ(…9Dc{	L‡Sw¿åÎk¦×
Ö¹¬QxnegíBRgÓ¶ÿd¢€M§œÄTcØÞá›Ó—Ï¶Ùßß¼z{xºüFBÔ›ÃÓã—OßòM›çCàf‹!ÿ±œ¼À¾¯N/£”	¶˜Á×´Œ³XÍîLbÀ[–„¿Ï¢„JçQÐt˜«:WXQq…M“˜S\W`$ ™ø\h?…ógºÍ¦3ŠÞ„{ƒÈ%ûÓ5Ì›œð– ¡SÀ§‚Éµlå,œ„çQ† ¿S4;ì0ž¬ÊÙ¤—˜=‡„élÓ›ÐëSžRßÜ†˜ç¬ULñ¿#ÁÁÂm¾[×.fA2Œ‚‰%éòZ0	œw˜¢	ƒØ¬¼Í ý&ñÕ(^DTs±œU7F}äö3
~„„õ^ÁßQ–†£ó6ŒC¾úašg£(½„GƒŒž×»‚âñt6Ji‡'ðvE8¼à)›ÏH°£dêPHÈLÙ÷Áƒ¸GHwe—"Ð¢ ‡q‡õÖWXÚaýn¿ï9lôÒ©üPäÚ™Äžäx6Ú
]î}k.…îO/nÑ/·X×"þXøó[…Hµø…–ÿ×GñIOug3(YCj¾`íNßŠ|ˆ‚N`0DGNµ\’VRo?óY¯B©”SŒü÷r5¥¼.e¯WQïHí’Â¨7i))t¿ÿ6—ê6j5«´‹•Õ±Í‰‹RvÔ˜Vfqõ±ðXXM¥ËB_-Ä¹µµõ¸¢ÒpƒüÔ:¢3e5ÏV¤p‚RuìáÈbõÃÒ¨aq8µU±ªcn@Ém&‹¥ï€ ÖúúzÃ‘YôÍ•NI•w}Ð2÷9Az÷¸°0JßAÍuÐŽ{ÌI2V»^Va«†…ÀW.z¡×n<½Ÿ‚œ‡ï«u×5X× +UêB:ìš*l÷e]¿};@Ûá§+·oÂÛïKQ½áp¨TÔëÙ*ê=tQñÒNRœù±Àí#üïNi½'Y7GËÛ3Ž/òû›´%Í9k?/G°Þ4:nGÃ6k(–ùÐR!æ©Í¶¶Óp_Ùv‚—R;ïü³´WÇTB´Fî†¥‹ {”Jeøg  £n©¶‹øMÐÖŒxEU¾@«M[Ë‹qûøŒÛŽ ÄSxPÒŽ{†ïé{[¶ÛCìK”¶£Q%¶·JÜNä1Îâ&Ìêç=fj;ñ*Tû>Ë5Gƒ’_÷ó³õÞP“®Œä¹_Kêo—äàÁ¬4¶áÊ)Yxv!Ë78ï|ø²*:pJÉÿŽ¥J“Û°:2Õšöe‘:×q„½³³Ï‡·"EwL£Ânøãù¹Á‡‡áyŸ.ZhWu¨Íá¨§o/T âDØ¦S&ÂªS%C€zMuI0JúŽ$ëbWÈ¦~ˆÌFúœ¤‚Ë ‰úØ‡jö¾Ñmz¹.¶Îº¸?¾Ùzüm=ÕAÈ€þ£Ùhj&ì¡ùáéÇú\Õ÷ãz7X¯Ü´ÿ·h44Ð,N«î}°1[«“¢¿½´C%Íw.Ã`¸·C©€
]*®—Œ‡XeKì¯Ì­û‚›K;k¼÷ÞLaçŒCw“ÞN‚(+”ï½Íñø1»aX€)ùºŠ~îc8¶¸³ÆÇIõÚq<ª™  ª¾‹zôñ«_³]¦ÖµgùÍàÖ’`ãxDdg7‹·Î€©ùBÊsÅ³¬]ÝÐ
{ˆõî±Åšwh`âMñN^Ö^”¬éuC—™·ÐluãëŒjõã2¨ù×—ñ,H-B¯ £ |ßïÁÁÜ÷4Û•7¬yEÿ­$¨Ž³••1v«Þ,!g•qKÿ\}×ëû†%‡ÛJQ¬ñfwía9ÖÉb×åGl‡bÁ¹hëŒ0.7Fþ#»¦ä)ü!'òhs…]£€hÅD¹ÒÚë½üõ½ëx5üe‹vkÁrÆ^m|âß.Wß=ê~¼|_òÑ3Ê½ò8­O^dk¼ËôL„ºT¯ðÍëo¯ äpÃ¶¶ •†/Ê:š1* kqÒé;åYÃsçiS(¡,¿qÛ²ñÕÝY
ÄÓ<™‰õxébƒI[{–Í/ÓtI…[óúñöò…•UG0ðãŽ0»	¬V€Õüù@¹†ëÐ])Ý=O>ˆ·Ñ°¬í¸:‘Î¢Ü‘Ûu‚Ên&'¥á9ýLøGÛ‡}ÕÑ³t"åæŒ£ÎfWŠØGáæ*e]¿ëFõJßgÂÉ ®Àe¥"Úâ&
ÈUàg@2;œ•µòL”Ntà#¤:E¾8º
g!¡žÌ”Ý¹c¬÷+òº
/•àêy˜JR¤øæÃxÒyW±A£á{ûØç{ÌƒôüàÅþÛW§¿ž¿þõùþé¾{ ÎÞÙ_m¡Sõõ‰¨|7ˆc°Ë'YÊNfã1ÊõÕ~k# AŠŸë<¤Î§ÄÔü]ý3øgáh›-ýPôÿ—8ù-]ZaƒÑÎ~¾„««ÎUªh¹V˜+–öêŠ§JAaäß•Ä"°é?
óC~üHé°VŽZ¥¥§Aj9HeÍG>Íœ#ÇaŒ†ùàåïÅÆO„?MÃ4Eq¤4ú,X`ôYà}€Òi>vþ‹¼~àïy¾jT;¬°ˆègÜ¡L«©¥"ç“Vˆ¾«©Îjlê/Š	aÇÓÍÖ»(=«	¨<ðyäºà˜Ž<!ü-q£¢¹¬’Û<ƒ®QcÚ¨bgÕ†Kã°ä$›N¢¦`[@X×ïˆ£ucpùTºköèrmÎ`ÏÒ³p$ð}	2æ«(…cá®aíq<‰áh$Þ¯½ëLô:ƒ˜=¨‡GÄyTØò¬^ÛÇmç; fÁMÈ@[gÅ¹Tð¢(¸zW±…cOÄô+qYÁ ¸¢€mŸy[ði¤ó„¡ÒHŸtÒAœ ËüÖ»÷ËœÒÓ%Iê+Š”>²¬À'àí½Á½êx¿ˆ¸¼nEVÿÒÝ§©ùÝ]Ö]–ÜJ#MZáÃDÆg×PQ‚äÃlÞ¶0¼ž¢"SÆ‹®~øA~ídI4žþ;Ì›Ž•k?üòË÷óˆRÔoÃ‰(™¦?¨¸ÅäS-·ýãÃ—?ŽóÛ£ è”ï*K²Fç—FezW4Žq®1RÊïÎÕ•¹ÙÓ6?î8Ýùá]3ÿŠZ…¨ÁM¶ð„œZ£&é0‡]¹8üüOóÅß©*O¢ÜÅLË£0ÕŽ ~}°l!ýl+KÕqIŸtüž7GÛÚ;2øuWlŸŠ¢€“…H9UE››ÿòÌŸkÇ8;U’=¿±T6–ª˜çªJ þº9«i1\íýsWå¿j«<ÜÏÌe:¹,×¾qZß8­oœÖNKžDBfãÊ¾RfËë!e]²èc¨èÓSö·­|
ÆèßŠÂ>óùŒ™/“XÁIÀ‚ì˜a²ð`Å<ù°ElaëžðÐ¤çÇ©3ƒ«ññ0PøTv}
K›³ƒÀîtrf6ÞÏl\åüš¶¿ ÛRWº¬ÞÀÓô¶¦ñLSiØn@Ì-Õ˜æØáS¶¨6nÄ<¸KÔ"¼Ù—`}*\sàŒAtäå9Þo³¥ÕÚ’ÞUŸ¼E`áoÁy3Åìà‹Œñ6äøE¿~<„é"¦ùé95eÎY—c˜dÏ[ÜTOÍ`íõî¿“k¿¬¼Áç—“m$Ÿ%Öf-³l½»œ³!=¶OÖ‚ˆÕ´·ÆÈÐìOöØ«Š)}ô3®ÿÕœq½{>ãš¶ÿç<ãú“á·3N4ÿíŒûvÆ};ãx?¼3®‰@/Þº›=R±_q¶ÝþT+”çÙ—:ÉŠ-V›…µ¹FÙ÷,«/X!³¢IàªZÑ†óLÀ÷Ç¯á@Sª
ý™N´µM
ñ=ÒúGÚ†r¤ý?   ÿÿì½ÝrÛH–.z_O‘¥¨)QU%R?¶UþZ’mÍ–-…¤ª>u|mˆ„(´A‚€’9EtÌì‹Ù±oOÄ¹=WóJýçÎZ+3‘?È@Iv¹º¬èv‘ ™È\¹þr­o}‘¶ñû‰´n™vÏNðI‚®bžh4¿¿lð®ï„¤=lÓç4¹ª>¢DWªÖdTz7ôV	üíjîb³á&­4¦Šì.Šñ~’'¦œi.DÐÅfÓñ”ËYÍ‘ü&¤ß1H©&žBU¥®›Í4Jzì4>h° •‰œM6ªVä?^±Ö[TÆ¥¥Ýç9¸|Í{L6—i¹E’XÑ‰Ôß9a†TÏsÐ•R'‹„TµÍE:.,¯íÔô€¨ª’ôç]ßB«5˜J¦ =ïeu·Šåu”~“gÏº/A,ø9±®ƒ—P›Sûg®·¿Ã'"}2ÑWBåÊ›?–î¯¬ªj<C»ùæ	1ÁŽÂ1&÷&“4¹b,“ÛºfÉø &ÓÑnö>N¢4àÇãðo”rµÌÆIo ¶ÇÔÖ–©œêq‡ì1ÃåÃü2‰ZCÏknÆz“úU½qýºìæ™D"‡ù$“–›–o±T®€§]–qÅ÷w`tÂãX¶#õqBu"s† "aºƒYSp×âyšŒÄ1%?'ê¼xñ'ñH=>âÝž”²Í5Ûä×;V#ÐÄãÜ˜<w€&ä¹ˆçZ‹Ää*MŒÂ,CT¸ç×dšæÌ”ƒ"õ§)Å3vD_AÐGNl³äøM´×fð4»ŠâÄZDÐ5Ð0‚Í°UóëÚ	ôÛ`—¤…¿eÀÁ^Û‹4«;W¬·„vwMsšd<Ûf™>o‰ùaæ‹ûD	?ù9Át¹S<_LÞA¬¤ý|ÃB 1NI‚•Å8Ãw˜¡J‹”OXƒ„«ãa¤€ÿc'Jû0Z›´·è‰••ƒ-Ø†C¾ºpé·)Š‚‹ cg¨€¦âa‰ÀdPC›—ä3¸™¦.ÁJá!øDAÔ0LÌtLó‹$…½´ÙÍB ¦ !Ê0)f®Bq^BØ#ü/`#¸%ø¶íåÑyAÕ©Â`°D…ráZ$%ß­ŠbžjZÖZ=ŸF1mÆŠÅz“°“YÚ"£Á3}yÅNa	šþþ.Íé0¡ÖùSpIû®wtt|øËÞ®Ñv›õÌ¾F`tàrJ Öouør¥tÃ9š·9GïÏè‘´¬:û[‚m»”#™ý_‹™¾´‚*ÕŸêŠ4þÂWYƒá±+Y_ÑxåA B^©¬8^ªH€-aÓl9±6æ àõ!Þè(¨PÉìÑgYO(™¬`U›sDÉP.ü?2“sc¸$A­ ]Ã$
À%¢¯†ˆ.NÅu@÷1|/•£è¬np€[útµòèÂ‹â“àB+¸‰}kT ÏÖ–@åÒwÚýª\œ®á°îy…žkR»2ýN(#€Q	<ÈƒTdãé»ƒÐƒFI‚ÒhŽFG½ÕúG9¨ Á‘‹°Zòsk $b_”`‰Fbý;fÜŠªI²–æú}Íöép8Ôû#,$‚’•}w­ñö›÷.I‰YØ#¥\Á«BOÝ9¡„Fù{Ž6é»k.<Jùôt]×åK:ùÝØ)ºïšdŒÙ­éøÐ>j,ç™íàõþljuö¬B^8"‡ÿêºPÿ1Wb1#iôW‹.@’gláW%H@ŽÐ´OÒ$M,”5TYB>ö’BÍ…w‚ˆ—t*ËÚnx%DÔôŒ#ãáîtáâlßqÔ‹.v‡’å(\…V´`|ÖQM‰ÇÝïÚu£f
cÎ&cJRŒ$=½qWY°zü?WZÅHòŠÉle]8À‘wÎÈ{ßã!¦¿ 'Û&7ô_>zøN‘ÃSs«hyñ$ŽÙá4_DW„üÂ¾í›´—x…tñF›3‰’ôÖ Ü{ßÏªvˆuøâ„¥r`Q)Û¶•§ÓÐr+˜.íBdx
Æš.9î
Óæ›äÑt¤jp6_ìÚë®p¯ô!¬sæ'×” L2}ßZÞ˜Ö(ß	ÒhÜºñl<_³ývèä@ìFD7†EÓhðTõJÓ tŸŒ¼èf¼Ö|¥•ö!!:UxÐ©?Ø7•1í;*Ñ ×š¢Aê[}uÃé_K?¤6£ÿeŒYQ˜þùQ3Ô¸‡*¨GTºP3à•ú…Â¿Ð®ÜBÅ²áÐª7.Ã´å€ë®š±pGYÙaéÓÀ·„þ½U‹W'›ªÀð{:z%‡p½5«Á¸óÛ5;üÙ ÑáÐ¿#Üå]Ð.Çevé·ô8µ}`–wÄ°\xZ°à`4ùI²aT¥K)Ù.œUL}Ó´ˆ0Æd ´®;0@éÃÉpÎ8'Â}=OÂTí+l¹Šç¢—h&&br¶ÉúZ*	d˜p#	•49?G§ÎùóÐf/Â0cAŠJnÌ‘ÕØº™AwX*LÛSªÛTÜŒ$C.nò¶´çJ¬W†ä5zA¾)Ù£ÐŸÅ)s¡j÷žmÃÖÄ)wù˜9W¯FŽ}Œøô¡¹Ï9›Ò×µâ”þqŽ¶®¯ŽnmÂ±òX®œ•^Â{Ìø8Oý§V0"#2N”ò]/j~îˆàšÇ«ùÅmšAØ{XXQ34»m3½ñxÄH°¬uôêh©ªøÍóÆøÂÇ{‡0èµþ°ÀÒ\™1ñ¡>°æZo ¤	¯nVÅ?ÎÎ×w(ã2Öiö¼˜ç­*Û5ikáé#Á—ÏBØ?·lÓA½Jâ-<ýÇþ÷æ£GUmû—ïw™ß×tùž&¸³Æþñ÷ÿbÝÍO6¹åÎjz‚tÞÓìv·hvaƒ~²éí.oü¡¦÷u8îv;‚=gÉåm×¬~Š7–ÝvŠáªŠá’Ý«$¼½Š_­Z¡KjŸAæPuÈ¸+a^ùÇÜN1ô
Ï™_œYv›ºKØ«ä
]™ “;§ÏÎ>/°“×Ï¹å÷sz÷Ä_B-ä!›N0hA‰ÊØe€òš§ÉxøôåN]°U¶£žQ4Ô9–7îÞ,D„páˆzKç "'W¨R©ÜÍ¶‡=AùN³8Þ¬Nëojœj§CµÃÝ†u–-9×šY¶ñ°Ö²­Œsøý~Ê*®´=l–¢ÝšEà‘NÎ	OÖ(¯LØ0»æL='lk©²öhm“u6»lëa÷Á­ë'ÔüèšŸN9eO–‚ÀHÐÞÏÉk(ã´&ÚVU¾Î#h"kÁ¶s›žÎ€Ò¿Ù…£`<áô¯ÃBƒ÷“‘0$YÃ&ç5¹ø9N‚Qâ¡fù7°oZ|.”
‡‚yÉñç¾®9¥çŠù£«Ÿ3°ÀD¸ß7è|´ŒÅè{”õÆ3Q'¸7¸Œäuî?Ø	b, Ç/ãä,ˆOÂÎ²ejŠ`ªÐ'¼LÍÉoXn…ß³ƒE¨ô›D	\¬àðöÝ7VXÒŒ+4¼Íðß£49âÐ7z=¦°ôÛXoïí;Çë<£ŸÊ/eŒ§ô‚ª¯ò›ÚOÊ·†žÄˆñåG<IÊ(º‘Pk|¬½úÛwO[oßQªxkŸÁ[Ð£ü³I‡H?™&»aæaÑŸ¼àë–ý!ä=åuQJ­í÷ÖÚÂ¯s·„ ïÃJmíiŒ7ZXp=w ÍÃžyÍ$ª¢KÃ í_`ê.-¾VtJ§?<xópÏTTªºæ‹L-€=Â«ðUï©ïÆÔ‰‹åu‡zã°?Hò°h¡¸`4!®ñ1•ºt6utÚ~Ú¢1í’Ñm#G{EõÍl7
†ãä_6æüÑhöšEÿû“Ü1ûƒgÚ5Ç†ô ]}û!œÉoïh'³çøÄÎs®ü‹¹rËº%ãjÓþÁl’~-·H¥FáE’!_‡íBùÑÝxë¶]Ú?øˆsu•½	¯]ÏÈu‹ÑÁ*Èö×É ˆÍñgxÇ8}©KÕ†²ãŸg‚}iWŒùZLÒÉhó‹À>ƒ)loú4(f—ÿ2˜Nb,ÚŠ‹¹ø´U<e,>]ÌoO~«'qÁh{ÆóÖÅêWžL±Ø¥ÕÄ‘u±~™ñ‰Ð^býbu—°šØ!(SÃ1mI®@C¿8šŸ—…,ƒ“_{T,×ƒ3fÇFëœE=æÛyYŠØ§O[×7z¸ð;7Í›Ý-¾oÎ£Š¥ð¥0f_A±æÕ¾PŠËß`nmhuïüÚ2Rî1”ù[s#HLÙŸDï%Q"™ûÿöSÑ”¦ñ´Sw\ÉR‘ìÿ¼ëoÓ0µÄÉ–ÀVZ˜äÁ_‰ÎÿŠ›la	ƒõð|ÖZÈ£–àMà>0gúøk¢¼ÕY[[ÃÚ²'°EVõ!rkŸ"_ºÅ¸®.Â„«lõä	ü}ÝbÔß¨ÁNÇÙô*Ý8˜À
å­ß–Y+ƒ/b‚ÎèW¬ š1| R@\2Á·6ê¥í6ÞÑy „p³´Tä¹–Zm>†^[ašÝã`aÛp=I[{øvæýtBÐ\1œ+•ä!
ÇnÃL`c;ÿ•qÚ4
š$^#Wbè®¥6¯"¾»Óþà«Eo¬v1bg³qŸ™èy:Ó.hë€löR›Üøj‰<»ì[gô–ëõ—¨†ÝûÉÜÙ…6Z-^˜oA PÞg@!ùCà}@®-ˆö˜ë©|ÀYcŠÉx1˜ê­)‘€Îg8O\äZÐ•Z—–þò_Ck£G/f1Z1–6ðÙa~¡ßhó^Ó|¨™)^÷±úbo]ï^ÚZBˆ3Ms`”€“ÙŠOýÿjÑ§ËH3Î2¡µu~§› âDw±ma™t²wˆw%@n´¶Âaš—+ï$‡Ò¡Ë$}›ñ¦›sôbúå•‰µ¸	7#ñÜp4ÉgúâÁÌ¥ykáMbò@LaÀ0*TgÛÅ»^Ig¾™´ïÑY“Ú~üeÎÌBîºw ‹ûœ¨ð	£Šëô¦hÉ¸‘2½ž(%o€½ïð
[F1£‹ö€Luyg;Ïµ >~üÑbx¼cØãXbÜ`aâ¥Ú“ivÑ2ºé'#”¯:;bÍÞµ‡þ®j6oŒõç7>E,þ9ÆÂ)
ôÐQ”…m0ÄZâauQÐû“)E›`ÇŒñ™°ï®iæ‘UÝÃŠõ1‘Yû}¡¹‹“­Å^#V›‚~ÁË¦a‘T$CÞáBÑ!¥IÇ3];©!ë:¢¾±¸Ÿ‚h1É<R,B”YÜ/ìðee‡ËK%Ù.oP3$^u|ÄÑ€‰VeS5'mïê;îFµËµœ¶ð·¸Š'r³.TMOB,k@GDÏ€m–¹lœãð^>{/EÙ*†|Ÿ›UÑzö~™3c ŸÍ]l‡Õ—Eóè´&ix‰‡ÿ•â—ôÓ§Ø4è•¤‚¨^l²9´ß8sµFG	—åYH¥©­%cÞ·(ÚIi	Oz«F^2kDttáùØw¥‹Å¢Á¿ò±k4'>9'¤x!•U¬¼x%ÏZ‹¥žs‘Åû…Å*ûÖ»k°¢G§½{[LlKžÎÞuQK‘GÆ·XBÍú.¢6Q÷µŽÊ[«	®Çß·p¸¡‹8ÚP½Ä'’Â²Aù 'g>ÂrzÅý$öm‹ˆõ¸¢C4TÁv”£â?Óî§Dmvî•U»÷EŒÂýîb,Ë«+5d3ïµ('^øî›¹Y0èäý-øŒ¤“[ð˜òÄYM±³îsuE£ó.­Û7„&Oäƒ9Dû³ä‚yA8ÑFî a©¢Êå°V_¦Ét"I(e‹ºe£9Jx¶®ú,¿iªŒÓNvhîÞ{ãrß²ñŠþ¹àuwm?w¯Bn›ÝÂÅŠ5ÖU3Ý‚Kzºæí”{×Ú×ÝQr¾iÃx_¹Ø‡žI–OÛM×Ý‰Ã<üwEOÛDÅÐ;$ÆÅ7Å’åŒ(»õ€&±þ64,	×p^ŸóÅœ‹o*éAà¾ìŸJ·iR…iÞ†ö$@Ë\üç0#ýQá`Ö;eÒN-ðõWôb^F?;ŒK»¦zÆ„I¥yLnuÉ	r‘±­œóÍçœ?u  Ç/´Éãƒ³NÚ—–ü=ë:¥Ø‚wèÜÝ“ðÒNÒ…o­"RÑ¶¹&‰ò¥ÞwMß	ç¸¸¸xÃÄõ80.¿õQb0žUQ¡[·S‹a9ÙÝ*€âVw¤LÑ¶A'ž@…–Æ³îÚ+µBJßß<ÎzuByìi‰ëÝõByÔj|ÖˆT?Èeö“j}û>§½ Â×äÚÕæu8JÅF"¢ãïˆ]w'Úb!žÊaIQUx€³NGèŸsüJ3ÿ]2ßî(N!D#Æ0AÌðsüp 9"-à	Å†N:ÔfÁ0ð×ƒ#>ôûq,,,‰-ÒÎºe'ÈBù.$¼ÔÓEqUé._µÐ'Ëfê×pQd”ñþŸ‡²ë×jÇ$¬¦PyvT£‚Æçñh€á°¶®F0ì‰F6í!.¬ñŒé¯GÃ_¿8cÇ1×IºÞDs½öµ¦tßøŽ“ŠÈ!ßI’¡TsŠ4¿5—e<"&'[ðgÜÉ×ðe°Å–ÐPæTygnjê%ý>çq*{5ß|~}umU`:þ0N®¤Íœ	‰¯‹1b§Ðo$ò‰@Iz*
,Ñ“FdßkÑ¾²–ùdÁ¾•ˆ¸‹!7—gÎ˜b‘¦2]?_·Ð}lïXõü)ÆXfåÉ#3r~K´ÎuO]¡DKjß?¥Ýnª¬gýóuûyëÙ˜-~·¡òÿ&ê.f¿môËV*-ÇšO[íýq7mŽ›ògþŠøb+0ìG›c•~(öcé¤8ûš>wü·b\øÂÖ¨@YsÇiˆæxXM¨†¡3xÂ4ìå†¡Æ”ÞÄ†Ñ<(²bfr±°ƒ¬e#ÛÈZ1ýšÃ¯.Â:é_µ%*^Ãì[‹i9òçŒ‘3W:òMAˆÍóÂl34v´ÝGÿÕ#X@q.lßb3†Qa÷P}à… ²ù ¢ñºCRâÂ“Êæ'Í7?*ñBXÙQèì¨ØYåÀ!âb8dðÃ›‚ëµäÉg€·	"’É&+­À Ç¶Ù°tìÞò`Ü“sÆÛ}†Ï·%>õ6;!³Ÿ¤â½‘G\º	¶Oöx¬#=ëét,5jE;ú“î?žÂ9oÀ«¡»‡#<äBp¤3Þf€Øx1¸¡„ÝñB[ø[„áSÞ£‚Ÿ}ˆ„Ë¤!~ªï2›Ò)0^‰äkÔòRœ1ùµ¡øœ>_Dæ•öÞÊleù"ü—Þs±¶q—ÇÑ
µ÷ùû0Š!¥¯L5Ï²üy/Z™°Ýºv ‚§D(Y€¾LxRâ¢ö¶eçÌ”ÏxÝv]`¼ŸˆxGÒÃêR´¼²~móZò°\™–/×†eÅÅåƒqKî3CºWqÙŠå=Àš¾§a¬~wmãæ}%“)¦ µaj©`}Ža[çíI:ÚCÈxmÚÃ6
*¸¶žÓ87§*•¶”Adå³úÜl|~ø«‰@×Tckb¢¯Ù Ê&q0ãg'z®¦r‰½*Ùë§]IMºK ÙÓP%mDÔ‡ˆùpù.µIçwùã=®‰åÍÐÔ–çŽÿx§Ùã(Ïžê×A´·+ÌPÀ™&ŠÇõ·V
}›Ÿ¤p¿é¯ô‡Å2÷ÆýWŠ’ãÏƒ1Æe­…0ï†Á k„Š_Ì6Ÿ\›ß5D9
E<&o	K¥„€Û¹î¦×€s˜ùwY§m\<Q¼­G¯Ý2Ñk³‘†^[ãëÀµª‚™àF
6E€ƒ”ª†Î`Z›=¦ÅUX¯öX4X©2`=+sUñ!óÕJ€¤±ª*ÄÓŸ\»8ýMi„>p¤*Y'ÄHœ…qy¶3Ïl{ª9
U®½¹ðôX¡°Ç«ÔYs<V/\åð×[}B!M>ÂäpÄGýÓyÜMsÜÖÚ™¼ÈG1Há'ºX#Œ”…O3Ë»\–©UÍp4žLsWŒ~p×yk>›ˆÑ»Ým
»FoÍ]55ïÖùäºJ´h|Ìåüò65é)þ
oÞ/€:Bœñö°ÍþmŒÙnÈ¶“NÿÝ=Ê2ÎjÁ¿|ˆV.R‚Õëƒ–Šæ*rõEUJ\í¬‰Lxe\M¦9Ê!*îcW!ð ï!³ÓÞY!Þ»ßá¿_`ïŽ_›B6»/ºpÃ|¨q/Ü1NMüg×”Åm•ÐEÖ¸V:ÚŠ5¬Y à ´u7ê?€ð´–L_N×Ë€Ò‹8µ;„JY~×ÞA÷JìX37ìxý´g$Z\#­œÀ¡ÆfWÝ¨D1KõÉ, *µRÞsL°V¦C|R£Zí®“½-kjÉº_µE&æZ:Œ—øVgv"(¤Ù’–Z{†õ±d‘[Qèg+ÙÅÉêS*(‚Ý8/ÍËýzaé]xa¨ŠÔ#…ªj/†]ð…¨Æe¤Í¹µÔÏ¡š×Ó†ÔðÌ¡$6)âÃU¿^Rõ¿l*>\jRË3	tÍ`ðR™]ÃêÓxÜ-ãÇN¡³ÑžWB:‹ )ÿ#ÏØâ+Ž»Þ:¼Ëm	ëé”;.ê<?ã%(ž‘Ðk/¡Z†°òÀ@Êp|sÈ´9*`”íðÊ
.~«Õ6q}-ÁõÀ\RÃôë‘îH¼ãFúÛ¬ag¸ÌËœÂÉËzjgÏð£Ì=_¢¦ªš-¼ðÀ%­îažTy(ñIôŽBh¾9äoÛhËÕáVqh\×?-§¶Md¨¢lŠ, l„©¯äwæÀ~|š™£4Ÿ¬?¼à/’â’ÀŸJºÐ¢3y‚øRu‘ÆÅc4Z*FAÔO*FA‹LÀ`&vuÉx`LÆ	Õ±?b^A0ž’44Ù<|Ú?>ÞûeïødÿùÁÞçâòç’_Ù}í4ÚQ¿ós|±Û4–W>ÏýÏÏôÍùÉ™¿ŽØ1/ãïÞŠño}zÆïsÿ}~@„ +<ážû¬2¶”àØ6ÎÃÏè6_yyS^n‚ý™º`®4Ÿ”Ÿ»U‰«·ìxLm‘©¤&÷ÃÜ‚þÉz.à‘AzzG‘?fÄ!R¨¡¸»6SŠÍ½J	ÎA9ÅÌ‘x¦×Ó£i1Ã¿“ìk(ýÉ§ž’Ï®¶^b…×«?°WTý°jïN{P(}ÝÅá:æ9Üj¥“õ,Ì¯BÇXšV!qW1qKu«†È<Õ0íz#ÙE?¬øê'4qVU”îò–xðVÄp‰~Xü&¢ß.Éá­™¶Ù}u1Bøª%üµÓ©…§Fdûñââa¢ˆ¥ð
OMŒy
_T%—dwƒM7:Lš€”ªãÞê´Õ¥g¥ˆYßrˆ÷ÑAQ‹ÖS´¦Æíï` ¸ræiÆdÀÁ¦,=¼Õ¨ô°caß$¸öÇç‰£÷êzYz=¢®s{ëhh"¸ûS…‰ŒeT¦³f–)z°)¶\KRPjÙŽ¶{¹fíá7MvÛ3Ÿx×nj÷/‚´—·ÖPÖþŒ±¼­ågJi¨x`ñÙ¢sïTr=;"ìÊÏbËå‹ÔÄZLÐ.ôE³¥0Ë6œƒY‰hxÎ´ü¥{špKÙ;^ÃëbR+Z¶f°q{´:å1 ¼JÒ£ÆE¤ü$KžŠºÎñù)£ÁÝÑâ`fn†_~ ™FæÏ(4¶³™,¸DÁ€Mx‰äcnåâº¤IëzÒ7v˜„¹ÊüàOMàõgiÕ6ƒ»KfuÚö@Kð¡×ÖÉ÷ä×EO÷7¾aYJ´—‰–à™ŒZÐzâéÜùz4#<F{Í¥9Þ³ÙêÁÀ{iÌÚçi2j™YjgIš·ZÁ2;#Š8kÃâp'¡sº,ùú!$Õ˜L…,%5š+Åü«å<eÝ¼Añ¾Ž*°Fm5(¤÷&á#I“dÄ©Tš‹h‚èˆ,èƒ‘1‚ÖdÞ|A`¼ú!yz(³®íUÁ9ß¢»—BLª¾”ï1k@Ø³^É
.íà²1\±-9hâÌ»Š~Ë¶ny:M¼mÞu“*òlº7ÅËúô1#GMvýE¢L–v÷q•y›ÍÞQTG&ÁJCò6ž1_×õ;EÌ‡pöä:›Ñ;uQª¨¿Ú%æ‹BšE„buQKoÌ—ú³l"?µð?O"²U× aYáÝËµ7âzm³oÕºÖ<q³TA£tƒ[‘å8ÐZ÷…éåá|µTnÙaâ7ÃsOÜ,ÿ«ZÚ¦n_Ý^­Y"¢"°]¹=´H´Šâ¨¢e[i­s~PáµÐ&¬®W<Ûšñx#ç`¼PñUi…4ô^×¿Ãmú¾šNªT×ú÷ç
ºe‡ÚôÌ©„s`‰(…ºP–"â7îŽ¹Õ£ÄW;8ËÎé¢#öpþ)¬©±K·X»ÀRyjÜuÚ|iÒãì‰‹ð2MÆ?Oz‡“¿ì"!é¿U¿oí›øwÕ_ÅOúðƒ\g_%Î†C¹Ó£ËÐu%·µÑ =&;‰Üê)epÉi•GYOçÍ¸ šÊü¤³¶AÇ¶%'2‡£0âmYÝûãHüq¶Ü¤è3]–=ªJýXxZždïæ½Yª)-†X¿åðÏÏ#È’-TM‚Þùh`µt5^Xk·,<Åú=rš$ 5V2#kƒk©l† 1æ‡<bM^ÍãY $Ï;§˜ÌaO4jÃP?	Åñ¦z³”Õ›u“îWÚùUò·îý¨­Lq2•5|e×ÄÝV­©j“oh #íÕJ~y]?™‚±ÐpƒëÎsÿºRÁ65Î°ð”–— ä›é&Vï^ÆdôiÆ%HÿåËŒzFâÇƒð2ŒoØ÷g0‹?±l—	Jn´Å´a5cF·½½B=³C‹2@(t²NA/ñ°™ÃõV‚•Dé2)Ì1}Kž¼[5XÛV£væRI¤ó¤Eˆ¬˜kƒ‰6MµCwÊ‹ã$‡òÔ`™?¯£å~RýEôÓX})äÚoœÜ»ã±d¾lFÎÔE…±'™t˜:Ï¤ùwo~JO³”ªMmÃ²¿ÿNÉÒ÷hÊnÞÏbÓök]ƒöŸÒÕpT“íf…²Þñæýíô¸bû—Õ8ñÓ=iq·Rœ{ÉÇYlõ&I¨?s©µº–ZV}Il{Rç¬siÅ¹¾Ft'õµO«Õj;î,ÞûRvlF?¯Ž:×Û6d 7_šS{KE'•ÏÎuæ{³äÊW®Â°®¢¦õ"Iò†Á„5®§R0¡äláØåýlÁ_Wh[#²ò´ÿÍýd05ÅšdÈ[Ùïê$H$ËêOÓ,IW&IDµ¥—p‘!#±¿P¥2ÇÂÏ‘0^¹¬Á·¬DU¾ú3ä1=°Cq-Ÿº7Æì‘¦8¯{T7\s#Hwãc,ãânb\œh¥ðÚç}š"Y¶&p£½NAì‹Ým¹‹C®W"Œ)Ü,7·Üm¶Kà)Ne“Gæß6¬wÃøw¦#D€«çÈÈkŠTëäKÓr´ö=S´Þ Þ
óD½¼ˆßMÆII†k}
;„ïxøžñ:;
ÆaÜ4É}q¾lÅ0šäâ€ÅåeÌÎP]3ê¾:L—o™ÓæQC×Ä\ëóDŠ ^'‘UfŠxxhZ+ãà2Òr±çŽ¸ø…Z—08¡âcWi0¹{ž®*N?ÎZ‹<W8sE“ªQ_¿÷xˆ‹¢®!FËf…WúZ"Wðžï\fk¬œ>ËÑ;u¯glQ%jœM]ê
ú¤@ž‹nØ§RÂÑòÔèÚ ô®SS)µ|î Ý¢AŸ¦Q@u:Å™h9Ÿ‘î%µ¿¨*‚ÌÝÖ€"ú{#(J.üƒ’{1¹¥%!-Æÿå’Ô«GgûýdÜ„ °ž	e²SJm]2×Ps~&"SEâþ¨œKƒ
‚ÓÃ5ŠÓ¯J’“×¾hš£IˆòY‚Ã8ß8ÂTYÔ½ãüâóQ×:î¢T×“¼ôW¨ ¯`tô`R—º&i‹_ù¢)k'™4¢ª]mbêÊ¼êVqÆO&a?:úEB¼ÐÈR‰Øv—0d7)ÁËNè2MÄnÙ®²}Ez“3uYýùkìŽ‚¢üØ¶”^g¯îÖEöÊcJô pWñ–"@;ùVõBðVµ–RAwZ4¸·²å·¥ƒ„R…(³tKE‡z½µ@«êbrù6¨î.hØ™(nfÔw1Jº|;©îhÒ°#«&˜§â‹QäåÛ°ºë°Y×TÒEÚÓO	©ÈËÄ>¦üQ[íšQ_+©¨¬¥ÿyª¼ÈÒR%ô÷‡<ãD0ãX}”&O!Rò…	Ô<P´H›É'Á-±’iIÁá3_ðÈ–Dàñ9{ÑP°[™nˆöÃÁÂÓÓ„§ˆb¬‡¾:ã¾äz¾ŒDR`ùE³«06ã ³g&I–…Y$“¦ÓINžÐAÔ‡ågGétŒMçáˆ]E ”v?•í;#x·aŠ
N0°óè£:TÆÚ"ˆjÚOC:ýZ¬NÅvürm’påzYÜtÖô#I…#bd˜¤a{#4W¬÷p#vûv¢´Ö©½fz@çè£pg+ë2Î}½[ç^Sn»õ} :3°Ù®\š_Âe4IþŠsÀFé¥˜J!ÒÐŒ~ÆÉ(ˆa•y‰¼6û5™¦¡dˆÓƒÕbP[fãþEšŒa6þðïñ“?ÖÀÇY\põüïºÄŸUF;—’Ç]_•scV'Ü”{ÝT‰Šcw—oÍTÁ­tæu?;K”K¥Ð=Z¥éB¸.
=G`cG"L‘~Ád·^èôøR0¨Í—ÈS·ôàÇÍñSmú¼SÝ$.èË<¨,Žû¸~~qËVxÀÎþîí› ËÛ>.d$@Ã½>ç=õ-Â=iÝ9vƒÕ~œŸ%ƒYm"¢á¹bŸ‘’|AÏ¢('n¬®;’·šÅàå{ÚíHÒRÖe0ˆŒ^Ék·IUóüÇØ(¢yÝÈX|³Ú[¼K_ÖV4*sˆþ´Pà»v$HµA• ®?ËßÂ•­“=Ùœ¥
úkqBZfr¥àŸ©æðpZyäj6¤™Ä‰2äTñËºu& û-èš^š"Z~šªTCýOœ\¡JòÃB•D³–ÇŒDá!YoY(l3¥îmBƒõÌ­>öÚ¨cmpÊYÿ-Õá<ž|vb—–‘øUC*kH*ÖØž®¯Ò5$>¡wÔ^G`™‚5+õ­»¨JEèá)¯túçÐšÑÖshMs†‘•Šþ$UiR@¥b-A¸KŸT¹‚®EÕÞ*sñŽ‘®^»á÷Ô»Zœ —™+ÂÿÏ¤{e4)š
Æ·öW¬ºßO+9å¿ê`%LÌQ³ã!dH³'î«6vWmL”Ôø‚´±x¡a’ÎþZ˜"hTÃÒ9•°ôà¸JÛY>þ“¿ùtºVú{iZi»/ÈUG0ûcëU’&[H^*EªÐ R9_¨ê6~?J‹`øª:•T'†‘A0¨5©Ùúª/ýóéK½‚¡þ)´%$ä¯zR£>¾,=éÿùßÐw@”zÀbü‘õ# Â?±j4á‚å«nTÝÆï§•ã9¿êHe‰Ï|5EQQ*OÝW…éŸMaúC)<:Aþ9/ÜI+ùýT¡ßSAQTCzÊ2³ßõÏu<V¨.a1/_µ—ê6>¹ö2×3MÁ†0FŽŒüs¥”ñÜi·–ô92\¨‹FŽ‹‰l$áVôÌM_LÅBTfÈhèÕ92ûe9¢~\†ì{¦r­Oò4Fóå+hLzw6°ÌÏõ.zg¡œðAœEq×–Y:Y*>ûa4ÉÙeà+æ³ô±Ðê’A‘IáMb©¤àRêx‚]Ëà–Œj×ÖÂ•ƒ(Ãm8xr='§ªþÌc€Û4¾¾II™_ßtAŸ˜¼ÜÁóõÜ2èü€V>¦íçB¥iÁ´á#~­ÝnS^×ôÖ#¨fÓU…ì¿\cýkLS f+]3ÊÊë11£–C¥žÚ6LäÛ:›Dcƒ!lV–$×õc5òB À€…ÞöŸ.Ø½E>½*ý‹x»„£Òþ’²Ñth7wÜúl¹hÄ‡ß$ÂDâàþ§ÿ!ÜO"ZO¯ç†0 µaí÷q›…éy‚Õ±A¦Lä™&ªqœ+ $ø³0Ç;"Y)Í†èOR¬!ùòÑº2ã}}³IIS6I+Pš5á‚âÝ5¨Ð5€WaËžàû·óh»(MP(ÐHÆƒ¬ÊÖxFiò»ÐbËýì¬³¶¶ÆKncI»ª[ØZªh¦Ô˜¯“r«È¤1¥³ÓûC|]…¨‹ã°Ìe`šzcÙ¾Q&´]^+ÍKš2äšfcˆ.”åúÂM÷V)¡„«—*C¦iÊ£k¶lèÖ@!ÏÚ.¼¶-e@ët6á>…ƒÃ—µ‡Xc8|T®
¬‰åÂ	aVÁ{¶a5†F(³^uz½Tƒ§hæÈÎ› "×@ ;ÞváéóÙ6_Š	gâáà¹ª—Ë
oXË¾E…,s&ÿWQïq±¼{Ýª¥Óý§nïÑ&¯{Ûá˜ÇZÑ-[¨¥Øý]1MÑàY;›žñ2°­µe¶µtNÍ×OÍ”xÙªüøÎfz3ƒ\G˜šÏ,w§‡ßÎ,wUsº3ö„†uUcZï <C AJaéótTPm[ŸLG£ Åœ}*p¦ƒBS³Ï“à@p#èV-•‚ íIjXï“€¸LŸ Ú<ìRƒ0 ƒ<ˆgYt	{!‡i4`øZ=ÙJ‡e£mõuKÚ
çˆ)ï7ís,/~¯Žñë–«
‚Ù¯ìß¬­-r«ëÛ[8·êß=FÐëLú7VÙUÌ¦ïß/aÔqžøñŠé¦’púÂ¨›Æ^)8=ÓÌYGÜíÁm*È^VÙAþ	ñ“øN˜NT¿†à~÷O›Á,™æ_qj]›:w
4‰]pïô‰|‡Ø²<ûÉèëŸV€ïŸJ‹
º_ú™h1f*{{'ù'¥Ó¾èî>ÕûC…¢D¿ë^úÕëà¬k‡5Rõ¹\+ÕÃÚ8–,7œêþ@™	•S°t 6J€¯FxRN÷AÕTÉsè[@2ZŠ¼ë^?„xÐS$Þ÷yLk•mó´KDGsë¸]:ä×‘YÍŸ›ûÔçOÆ)åºðHˆ{› ]ˆ¦åîú2§A"áP@áñ7Ùn2
¢±¤¹nN„0^7×ýiŠX¯¨"šè7/ãä–£ux5S
ù2§‹[HRvŒ?°W0_AÚ¿˜Ýn’¤šf²WÙ	äBÖô¥IÞvš|õ1îà=Ð„k`bWWÙ &±uCÿ#Cw‚,3ú(t)—«[ ÍŠG¹§«7Èˆ5v“i?lµ‚~Ÿò×½ƒS-gÐˆÀ] Ü‚ÿøôÂ8Y‘ùý+â—Å›÷>/OtÎZßÂ(ÞBóï–˜ü=½}ç{FÞÔžL³ÌÂ÷ú„ÿpÖ‘Zf×7,ÈD†ïcîøZ–ÓÿöÝÓ%'©8òË¥!ÛÒ§6Ðd…Vë\ßI…„mm½ý+­Jön›½•£
Æ8Aˆù?¨ƒÿŽ·1<¾iáDU´ÕºfÅË,Êx ×6^lGã~,;k9—t‰Ý,¹§ÇAÏRªÜ‚žÅ£nzvƒßšÄOç"î|jäAãµß—Æá%î—ÆÓ·\½2}{§}çS}ÃóÒ·¯­‚¾á†û¢ïÊC½ùbµ\O4sÆã\naê¯J÷Wh.q±·% ñ>Ðº†ç6ÑæÄ$p8‡UÅèº Ó¬ÍN1ÜR.+Mã<šÄ+,†Æ’sU”–XÆÞ_E@k9ôVð'…<œ'êAËØñUˆØµ¨Ê·«fÃc½8.o¡ªn•¯´’Ü1CH@×(íÜæeƒ?k 	uøÉ }äö)á=}V@ ëŠâ½aÓ0*#`+ë+Ï{Ìÿü¤Y› äîøS§¹{ýlÉ@»Šshˆ¾I¼aCxïIVŸä]’˜Ô
ÈÂÁÇ¥fÙzŒ
<Õ$Ÿ™yåÛâj“U¨_	.°ó”‚.ÙÈ.™XŸ0eü]Ó4ÓqúÛµwÜ^òý[±c<X¦ÙÒš(H e5~ˆò;ÎUŒÙžWv-waÌ=#R1äžŽ"¤WþÀ)Yïädÿå›½]v²·sºøFL p²÷*+k›}gÍ|¡¸—ëàÜÇdÍsë'JÔÓ{ÀÔ/o>Þú<l%öY”z—D¾f\Ùx+‹),<•ÚfãD¼êææÞ¬jênÙ}ZËòh´{›djªA7ÉýS:š«SïRbsÈÎÏŸ¨e`¯Yˆæp•ÝØ›Z‡É||@†¦Õ g6Ï¬Í<Y‚Zkóåª¿Ï©©þþxÙƒêOä
’sË–3½y›w}Ùí3
µ&æÈ-ÔŸš´çá“õ™‡F»Í¹dm6¢~k#u¡~ òƒ4ð¿k¯Ÿà«¹Vc®i ¾I¼ƒ¹&új®5êö>Íµ|Êíà–V›rbµÚæ°Úä|µÚ¾ZmuÍ¿a­èO{–¾šnŽ?‘é–OooºåÓ?˜éÆü‰L7h<NÇÒ4CJœ¤É%l¦9ŠÔwù¥Ùg²Ÿ^:Yýj©}µÔšÜÿÕRó5Ra©Ý/’uÍOã«Ôþ:1{‘$¨³7)Î.KÚ—m$Î°ÂñÀ“ìekÛÊÂüä"¹ÂöÝ(ˆ“aë<ˆ3W9<3˜*»f:ñ¦C”ÙcÙ¤œ[Ä“¥LÌl1¹ƒ‚­ûÓ4KÒ•IæŽõJå5ßMÆ¡=Îý^¢ë‚ñUÍãq`G¯ðøz·rÐåÙ«qª7+2¤¥ˆñ\f,O&+kìß›;³1š¥™›!8Nj*()?‡…3)Æ ï®¢’ÎZIáéšT²¥	n;xEŽµ(;áešŒÐÌ˜'k‹w-g9IãñE§–»Ý ô\Œœ« cË^ã`¢ø¼zÑ±:ðEölÚ[¤}%ÅØˆµöæÂÓ^¿ÏK‰sÐ:B	ƒ|E,Å¤žb‹ï×-;^˜ÇêÊ,oL]DÆ}ÿ}ÉvŒÝâÀÃË,NVŽYÞv G·9º\æ‚§(3Â<†eŒ2›1Ö¿îáb—ólƒ…{  ¸RrÐ&ögpË‚YTòÍ’ 9ShÄ]…VÅãß‰Â+obß3™¹|<ž[CC‘Ò^»pµâÕ`ð£ë®yTÀgYZ7.°ìo;™ý(Ÿ­lêÊöÖ§[àb÷°¾Æ\¹Ãá;5®§JÑ…±jÁ£†sªÙý|”Ç!ø¸Ô€'hË3Ô†v6 IÀìpû38ãº©%u‹3O<^õ¡`Ñ1ÁÆ³	ÚèjeèCøÝD `…øÁs&Ùh°MŸÓäªV1°ZÃhTJ ¢lÌ›Ç'!f¼tp–%ñ¡ @j#È(/Õ.[!'F5£–ËB®ÕVi­GãÉ4·ÙD>›Ik«“8è‡°ÃôÉ‚ Oo·í{/ƒxbr¼ŸÍ<€Â=­°Ð¯‹»[a;Òa˜·©¡’’]ö›Zb™ƒk¦ù$^ét¯jCêæçIšmãæV¥}1	’iGãpeœŒC›¯ˆ(PsV+¨ÕÀwªVäLî¦Ö·™yaÉ§Z^¿¯åÐ
ò…¼ºj%+xxéw¶BaªlZ=c‹
	b«@SÒ¯¨œÚÅòóÛô¼ax5dKyØ\[4š3O¬òƒ±Åþ)ƒr&wm¿-¼®Æ–‹Ë„Èx^¢T?›†Yž-:’ ƒHh ·ê´LÐ	Ä'yO3®6NDËK5‡«ö±Êõû¿êgedJ×ï\¯&ç½È.kÄ—DŠxCxcÕÜ2Ë¿õ«Ú¼À5ÆF(‹[‡w$K4c&Ž£gw^¿ÝCñ”Œ?çP{ÖjÏ†Ö³…CýÙ‘0bÇ“,,;=J‡C–Iì<ò¡òoúŽÆÛ±öÀ>?ù¸²…Dº!é²£àV«<"Â°Üå?¾ƒ–{ëì¬¹OÞÉÁñ›OÞ‡LSöž£Ý_O´Á?q7ÆiGOB’¸ºt¹‘=§hü´ÌÉ-`C·+3ù¡°`K´.árfÂc·K›Ns’ø˜Ý“ëMÐ±Ó-Cè–Å·yrïÅaPð´?õÎí–wÍšeÎ^v9ðl@°lúa&”É'Lé‹ÄûÐqâ˜‹Ö´6#(¤”"øŒÐ5¯Ât^¦µ¤RðTsæKžfA…y«ÝíÅéøÞZkäi%`ZdýÏßõ’ÃãS½xBA€Õ³ÕQœåj™Þ /‘iR
¼¤Ù{!¿>;íûL0¢®/hÁé¶scW[h;h”j;xNP Ía¶i9…kq~´8:)ãhiB¶‘Óç¤`5§N5@ÝR—`§xÜCðÌ1Þ^àŒ<^½èVtPëiÎFÂm€ä¤QÆÝéE˜†”C:N8÷ãä‰Ûb†iwýV ‚	šsý4_.oÎ©)"pª¢]Ií|Ë÷ƒ1÷ÖÃn¯ògûøké¯9K£¿­ýQúÓÝ´iÿ2([²Þx&¢ÊzƒË·ê”—ö¹Áœ1O¿¾ães’ùa#»šö¯Â  ZegñTYeô­²eÝß4áÕïS1õøE'Ä ï<¸ò ÝÁ! ™ÐPÞm±_k~W 3›5Œa˜÷¬«-!¯ó.â+&éHÇà¥‚ß)|	þÛw	Kí<F­%SLÒúÉÞ«nœ;×¿ˆŒš¶§V`TÉ“A¥Ð\.Ûë4Åµ†¤ÞÝX• Â«+4”[¸~‚ðþ?Ÿ³Î¬LÀ×‰ƒ?öÝµF—N„öwmè— =ßÛý‹ íå-‹ÿµhAÛRôÝQÕQÐášê•\\ÕÆV;Ð<B³u6NjÌ¦cŒ"GŒPcj¬úðu@Ö³ØqÁT—5œüZîCbªIÀ÷ñ08KþuÈW#“ÕÙ0äÛÊGjEÈ3¶øŠ»}$¦–¢ºrT5SUù#†ÎüeÓ Œu`¼69×±30BSžÝ±:ÜjÇ×”ZmYÜRw.ÂBÛLYû¹t€í|gî‡«Õ²ãD±ºŒz=\ÃÖ´A<—~‚“£wßéGo¨†Îß¤¢!<8ÆŽ³ëÏ_àPÓÛ‚CB—ÿå!~ðx–.wÑvüa…Ö¥æ]«™—	1v@>·4x “£®ñiyX9¡rV@´Ið ÀÉ’$ƒ!Â'j´ÜºöPæ>¢¼i˜Ñ,L±6éiêQë>õŽ²Ï(s"š¢”Fa°4ˆöõMqÃ´-×p”ù{•Ç®kšä.nð°½YlV¸•J>HRæ“t¶=OúLi–(^¨Z¯ÃãßAé´Ô¼hL‡Œ>å?º1 ¬M„ê‡¥‚%ò—Ž”ø:ß£âæß…±ÿïÿþŸÿ/£!8Š¦s0Çœ7ÛmZ[ßÖuÅ¶üçÜ
èïÍæÜöiYüþºNæŸ ãÃÝ#Í²×Á¤–^Ë•ªí/•äiö 8cÞ6¨jïYë;E§KïñÌÒátÿ5¨¹dþi›\ [Â>_qA[âùè=1 ·5_Þþš‚rÇÝûÿ¿þ7Sð×rÞ›§kÌ—¾Ø|…^ì®ï‡i4Ç¿Ýã•ŽA_ºÄü¦¼«–¢3# Ó„lÅ49ŠS;)º¨µøWô;±Å¥ÊúQŸòµ]i¸*Ì;Oï"“·þñ÷ÿåðøRß ( 55£?ë‹TžÔ	Ér¤‹^ËíÖ$ŠñQ^ŽqÒÿÜg\üZ8Xa3>å½©l{îæÓðo„V)›w‡ÞT6¼¨U’Ð³ÜñAïc5®³ëÒh‘ŒäyŸŸÖ`{ß'l’Y_Ê,j–[y]>¬àîÿ&þ(ta'05Šh³‚:µ³¼œßš´ÝÜíSïM³ü>}
åÝâñ”êu>·½Û”OFÛ’zÕè²3Ùí€éÆwvµôø{Ý—§¢êgÏz*fò9×³èõë©l;×XaÉÏå=¦×ü«ÛÌÁZ›dÿe!¹ÌO“½A”·ü˜áÆx/>…kÖ*ŸÔ[s¥"ûÏÊœó“…V\†²”î²ø"Iß•"ªï¯õER;ÞxãÒíHæV4Q¬8O?oàho¼þ=z!²åïa)ÌD—ûYŒºš¥¾9¾…öãË‹wìº;}»4g2¼#é½*·÷ñ*¦áðoÅ0š›o¾9ŸŽ9d.ÛË)hÝxÜ„ˆœ©ðåÈãû·Ô„dZÑ`ä(TBìO±Ôâ²øh#ïñgö=V¥3oˆ ñmöøä"
Aè%Ìäƒ0ë§ÑûÞ–Å}±&fÆáeg”@:I£Ë(‡aV´Ýç özÐM3 ìRÒ;nFÿò%|ú˜„b†—OWe*‡2Ö-8|ÓüûKƒ¢JtúƒÞÉ	kí`e† ¦ªª£Og`ðt†f@DóZb{¨`Â¬ÀÈ’4â6y·QÆ°œL‘ |ýÙŒá"­<ûk ïÜº­ãç½%R8Î¦i(‹wÐ¬ýõ¸æLR€eUNB/Çûv¯(²1 0#øÂÙ_l”Ö‚·ó¨œÍ˜U¥-ŸyÏ,X&)SÊë©¢µI
› ŸN¬|±QKG|ì®ø€¢¬‚ÑÆ_$SÊy”R<Òø<ââ!Y‰JM"Ü<+Ê+ÑJÊESùSK€éfKì,<ÇÂ4D–R’í"øöÚFƒ6“·STt:6J/ü$ÈXÁÏ@Ðü\‡*8Ÿ¶j$¿€eòb0ƒX.8c@üÓ¶ yf½=Gð	|6Õ$a¦üï/ùu€E]Ù<®^FI	C8'<ZKÓ•k u`	¿&Ï¢êè¾b”êZ½á®»Þ°§Æ ?w¦cá6VeƒØ_aÑˆ»Š°¶¦§æÔ‡¾úB^)Øõ(žf>xÏËÍ¿Y$¨ÐFTÈP°N" R’æ`[n:šv–ž0=~Xñü<ÄH ¢$æ{ ¸¢˜‡¡pÇ€ÖÇ®.B"ÿY2å·½ÌôÑ-ãÞãÃ²(!mváÉÿ ˜`w<Þu‚©î°ßDé™¶ß”*ür÷DLÏ“äÃásÃ>91IñÌ¥î]hèD1š‚ñÈ[àKÒ6\V÷7;•Ñ¹x‡§£ÍˆnfÄéâqüWL/jf¾Žì¯—çXB!þ.€G&iIÂ»¦¯i†þ{³\Ö%]GyI“T["–Øºd¹¤¸[•”SzÝ9hŽl´¬³¶Lï{ŠÖlàûÐ&›¨„†
(¼‹¸Üqt¢k†5t°Ä‘xy)q[Ñ^ÒG“‘iˆ
k4
Òg@örUÈ!_e+'”#çY‡]”Õ¥F.Òu^¨	W1#Wa¢+%UGYxj‹!®ÑÝQ(¡`÷\|ÂÙK-ëpYœ1òÞ”þ‚q¦ ÀÌP®L3”HHvÏ§ñ¶?š Y`çaŸ¡úEÄ6ú hP“f²LEµ²ea„ñ­Ä€[a™Õ qˆ€<¹ ƒ£L5Ä™,ŸÅ9›¹Gëý“ÛŒƒá,³Ý4Ý|À§ùr±3S×…}Ç˜r
J&‰Ê£4%¹«¤’L@þæ+ƒÍzG÷^)\®
{ô£Co*ÙŸÜAr’`ªÎå0lÖ	jRBZWa‡(BÁî”Eç¸Á+’ÑxŠïdj'áá®¬¡-ÒÔúˆAk»qp‹F6ƒ[,åUð¢|Êë×Q]ºlYØ¹´ù&Á0S2Ú¢aÁq¤ /Ì]ïñ^h(ÐƒByX9/‚Ë(IKr]S0¾gÏí»„hwÖºwK÷]PµÕ«‘lï
ÑÎµg¶“Œ(²uõ81ùáw‘ô§8>6ÆHb©uaI8„Ç™à¹¢È”ô:`À_…ð=0¿!è#ÝÐ–Lðmæó·17=ìñ>L„y”lŸ7Ææ}.nª—%4œ4œb–¸“ƒc5È¥‹œÑÒ¤ÌƒÖx§Çþ”œ¼%à4´ÔÜ¶ëKzçxaXš2ü W¸N~‘ÄÑ ˜Á—ižŒ`‹÷Q7ØÅÿëøS¸Í\Da+¿€Äº÷¶‚=>Á `Ã1ÖEGn
úxr~õQËQ²^oRdŒù!`‰ÅÉß¦QJß1˜lç›?ÔŒßçêáž‡í¾‚.gægZËW!&ªéãÒ÷¶¦ÇB \—}Šš€Ý`»ádo ƒ 1ûÂ`‘Z LXÝ¿˜Ú.>X˜áB/ ¥”òl}‡;æ¾ä¬!+BÉ)YË´·å«å%©<ˆþYîV^Ö#[{™rüŠ“‹0ÌáJ^_\Ÿ1¨@!-ÎFE|µ?•R„'\ÄL©ô°œ$ï¦¼ÛyÓqÌ¡Ãqi*=bgŽºU±QECb§vžvÚª.é÷ì/!L¡·së6Ú7ÖT8ÇùEÂÇ#X^t_\ñfiÚÿ’FÈ!Ù_ØÂËìHÓqNƒìC&53àÚ!q>	|@Ö_¾%wtMµîb4<wlÙ’šín›…;tR"¶Ýígš×ÁæÌ	Ö4Bn´ðvn›Ÿù	]1CÒÏ~Ò†BµDAÄ+y4z£i®ímoœÑa |ó/×´Íösn¿yjJˆfÝÀWµÒÎ²éØxôïÒÑð‹1)¢9¡Ûz}t²$F“‡ÃD<0Aoü—wx6ãþ†~zÕ¬`OhnµzƒK .RüŸÃ¯(:èÛN2£Á‡Ÿw¹ÚLŸ÷`Õ€I—L§à(ˆ¹Â}ÒGiôÝ#11ŸL;½+!ª³NN†ëm“'ßž
_ŠE'˜\ÈY!ý®.0¼RDÇ9—ÜU–IÞÁÈXF…(ˆ7ó¤E5vNX½iXœÂMÒhÜPMº¥ï™[Î+CŒ(;Ÿ…]ý={iü.Äç«0ž˜–E… åGìø¾ð?cäÛíùtÊ½·’›FÜ­U†7\­tñ(¦»ffÜÂÆ®&^ž—5xÍF	¼¦¼°ŽsýnxN	Ã–zªNö‘a¹šè†Æ§~7éOQôˆrðæ©|%<Š-ñjBì!bA¶ÄWd¯ñ¥ÇƒÀó4ñ#mAZüDû/!9œPõúGJá²P:ûvŒ¢8B~ÒA@ÆçÜ„Mj W wëÐÜ7÷4¬´´ŽøuØä¨¥9+ylÀÜ‰rT{›œÈD}<ž‡&	¸Ìlÿ‡ü½4H€3Pv¢É‡ÇK¸hÅäh¢’[ ø¶mö"¹‰€0h¯6&ÙÒödèŠ‰–Ùò‚‚8Ð3‰„tž†á·"^¿¹rjãdÖ9³»\ ‘]9 ¦”„Ù ø²„qãIñá{ÛÊ+ÙueëÒ‡1æ8,¢v¸ê1›!1¯ÚèPa·X”˜‰D.HHŸ 6±9Z"°„·ŽW¸F#hFñâ2Ã]üÂ(VWðý<DFñÿüïÍG%sq7ñšöœh£³Æþñ÷ÿbÝM½Îr§¶•„¬t·¨‘)­t—7Œe#éÀûg°wôV6–Q+¥FÞq(¯4¹Zf‘·°g1UÃ5®¬æM´ñŸÐ\ÃÛð¾UÍªÓwìü6™¿†íŽodUëìNÙA%©nãS#ß}ÂâxßÅŒ[ÎjŸ3Î¶‚ÙšèÚ’Õ®«-pŒµ2OG»w×^å˜Op_Ég«eÌ÷çÒ¯Š"H><–·kín82!TºÜôX†ˆ~Ú“<œ”yëuPÜ=®8$dx‰#Ô’qÅ8èÅz£X;7»€$Æ Ø laÍ°ŒøNRÀ(.£ ó•§ãä3;vFp-Œây¹d[ÈáÒ³£iœG+b±˜¿¼Ð}lÚS€Ðk>äUŒÊ‚é¤ÉÁêRÔkýÊBF.ë8¶¯ìJU³m$‚VþHi¯èkáé‘˜Ë7S4wÝNŽ>mƒ¡d¬=ZÛìlv·vxu$kóü&å‹÷F*MÉu´ðôPž.‰¸³3].‡{r&Ãþ mç÷&Ë;p…¥ãÚ×`åÃðä·)ªÀõú¿<ö…“30œ¸I‘-ƒö<âÉSó=E6Âè`Ñ©Ž%ÚBYpGÿ÷8Ä-œjÎ¹~P³ô=;To%|"^à‡d•QŠ~Á3¿E,ƒu‡NÒQˆ™{Q6ÊDètÝ $Ó;†5áµLä;‹“!ÌœLÀŸÔ,2‚ªºÄCš_äNx­Âhatðà$‚ÅcË9|àÊ‡µ¹ºáwwmšî®/?²ßIÎü´êÌªébQÿGüVKñ…Ì—¬zQÿ¦òeYŸŒ{ÖÀÂÍÎÎð#ê6Ë«Ž$£BñùñŽ–R ÄÅ²IØ€Cåe",Ÿ”hPÛÉÒ”'Ú€ÒÈ}Hz0¯±$c1Pd,`– 3ýµÓl†çÄ ±ÇDÖÃ”‚s` IÑ²&Ÿñ+w¨dmk5¾îßO¬µkŸ|Ê€ëNµéÌµyä~ú²ÄÎ¯ˆÝåÅéâ%‰"ôn/ƒž6þ vFáèn%DÊÄVÇØ!2˜-‰ýB›CìØ×±8CÛ‹ÔÊˆ‡Jöµl0é”ÕAIc‹¶ùTÿÙs Ê‘?Ÿ’*»mÃˆûöuqû‰i³7™€f@Ò[Hô8à<T“ÿ’¦Za{Ø^.bQÖŸòœ‘e¡	ÐÙ8˜"RËÀLÑõGPx_ˆQ”Ü}MvÌ(D’ žbLQaTp–Ù@˜51/5dêÄx¹'íÅašŸ¦ )?‰®·ñèUèÒ»R—>]zå •éOL©ÏÃ~0Í”Ê
t‚J+ëi:]¦öb’)R"ªm’¹ö‘s"Fˆˆ<Àº<†C®¾°vÂ%|&w=…«¤#®Ž$¯P$&)ñq:œ‰\Ž1t(ü\²d]}fxŽŽhq·#íÆüËqÚy"ö[®©ŸH ;Ò»zæµwì	Àø°%#œß®½kGƒ%­©ð#nÚ×¥vší¾€ÇtD
~h‹p}^±¿epOKš‰0%ò¨O‰ ¥4ˆT:Ît¡/u4*®PÌ^68¸ÑÄfçM@køK4ÀŠ!Øi›¦„f8Á•a˜Ó-‘D¯ž{E‘	Uò;Ì'GžúÃSÝ5ý²0åXÔ¸VXK<òëŠ–€%ªõ¯póÆšx§ÕU†ŸX
(n	²‡aå\±š×KX!ª´‹5L1-‹ÜHèÇS}hØÐ¾Z¯¸^ã0ÖÃßn›Éb ŠhÕ~e?2ý~öTŸ¼Ö}¸¤‘àTÂ±·–†Z ½l÷áOøžÇ! û4î«ÆM‰ç÷ønôÎ­‡íÍÑ>è„ÿ,‡Añvtú%©²Žip…½>'†ÞÃhñF5î¶½1¨ÇóEÒ´.§É„]rìn1„3\ŽV‡áÄsFF6 :ÊaálÀk¾ˆâ˜ ì[kË¬ÓY_fÝîƒ%š½!;NfÐîóxj¢0¤Ou—[fkí‡Ëlñ…BdQcoA¡®¯AE¤4ûÖu…–.`ÝþJ¶ö`¡—ÖÂE_†¼°Ìè8±èG»÷IëA{Óþ{æ/ÜYß€Áóé¯ü2fÚC(Züàôèðø´wÀþñ÷ÿÅN~=9Ý{ÍöŽ{§û‡oNðäøçÝýSöª÷f÷ùááÿ€ñsd„7z¼w°×;Ùc¿tÛk›ËÆÖÔ]f×–pˆœ‰³¡i}k‚ðX

ùÒ»@Lü¥»ë°ZâŸöÜ@+œ!­µ×‘rÔ‚?Â9Çú¨xÍ25¿H’ÜAÀü†Íú#âpƒÎõ03%Ï–éq·èá9Ý¨önÎ2®7ñOðŸÇO´áÂ?Úœ ^—8A¤±‚âÌèó$Ï“?JÄMŽ3`7P7­5ë˜Zƒ}uºgÙºI¯âß(c”VñBylÎÍR¿]œ“v@ZN?™ÌäqWÂ3Îs£a±¥æDÑC@v”7ñ(MòT`m»™3ÔõŒvw602–
ÅÃGÊ#}”Â¾ÃãMÐŸ¾»V¤uó¾Éu=û—wcr×ÊÊ
Û9üeï˜õ^î±ý7û§û½ƒýÿ“Øk¥á=µ'…ÆN.H5]Â§¾Ñ—µ`ìÝMØ­òÎçŽÐ Á‰Ì‘op«£Œ/ƒ¬h‚X<È„5íõ÷’^ºw†©~Î(8NÊ£³ Å(’‚ n)uJ2g¦´ƒ\h}ÝÈ‘Œm‰	«ù±Nƒ¡gn6pZø?Æ ’ósa¡¥¥‚›FÇú`6à%6áÿ[bLôÍ„—7–v¢1gß”ºP’JÅ® ]i¶±ÑîjÓuŠÇwçúCß0»`ˆðÿõŽ˜XYoü„@‡ž§àÖ+¤Õ‡ƒÞ’{Xûdz¶’7ºÉöìÁw¶|ƒwq»Ûs.ëmt¬·Ù¤{Ã¦Ôù£ÓõS¾uDªÌÎáë£ƒýÞ›½²>ÃßâášFF’—^`tsBöf¡†4’–I¹¡ýdHÉG]7×}¤öAÂO†ÒD„iÏLb»½<òOo§CÛ’þ‘7qÕ†Æ@
ï¶Ð³{’‰ð À„aí<F¡ºZü,Î)|ÃˆxÒs(7[.Ž4¸·µ„/”NÇc•.TW›EþâÈ=]”Í%Ý[˜†C  õ(’„“iÆÎ0^åÅ!fêrð$-sŒÇæË8zºe6¢éÉÐhø!ú2Ý~W2Ú§<+ÄùŸ¬½ Ï.?˜„ƒ}Zhn/gðF´2§	­Z± ¦bo½%Ms_Ó‰Šû@”
Û…‚A[B[|ÄçKÚà(Ð-ËÎƒM“¢|¨RÐðælkk˜Ô:ýO„·ãoÅ>vw~~½÷æ”ìíü|¼ú+;Þ{¹rzü«Î1Êñãgk˜k@¥—ÿÓíúYÃº›5XÝt:.>Ì›L·ZÊ»¸²éH—Ø†íûóé«Ãcx­Ë ¿þá*³k#€b+/³£‹Ýö‚ŠÇSžœíï«ÓTÅdJƒRomn¸ÿb‡˜uÑžðŽ8Dáu¶XX¢{Ç'z£h˜²VykŠ‰Œí}Ä–„"û®Lœ¶¤ƒIÌoÄp«VÝËËüðÖaâ¯¸…Ô‚=€Zt;ûÉfçvÔY6}ã Ú4O&5ÓÀ”ñuëîK;ËîVB—¼kªk¼÷fÉ´z»»¸ßìróáÅá1ó7§¸AuÁr…•Ý`=4X¸ß®ð|¡Þ3£jP@¥¼)¿s«`šÁ•Ìœ‹DAÄÓ²ÿ%Þ”Ù»¯0ÈD¨ÎB§ÍŽöPM)XÎÞxÑ=âCøºp(‘Å£“ @ìL.²í¢aü[  øyQ®fúäh5â-"¼-‚kq'G	HWëÀßÄó0€(%%Þc¨ÕŒM'Ê
ÜOò–j'g˜d€38»Xœ¦*‰Þ^Ð#…8’é‰Ð°»#´Ü(l›üãïÿd›=O“``Ç&d}PpÚ $ÇB]À`ž¢*à%¬“H4@7;†P&>Cª‘ÌØ£-ŠÉP-ˆP‚9Á?S‚=êÛMàÇ	ÑW4™’õ!ÊlC‘`XÔ8l;^[®S¯½“$ˆ@Ù`¤Àá’L)oX¾qÆƒ‡)ç?ÆÈJ8VP†ç˜iVä—òà “™ÂatŒÆÔø¶Ùþx2Å…K0zyJŸw5QøŠ8Þm‰Q˜“‰09æ«Ò„À…+‘âzÅS\éàJKs¥“-TÌŠ¡òlQ¡°n³#±â	cÁHÚþLmëÂÇ&`$tõRéŽÉ4‡7ÏaÀM'/º£`Y¤ÞÈu ¹ˆìvÙ™œ×V Ïï¤{fÙË‡ºmvrúó.²©ñ K::>|±°Çö_ìíüºs°×„	¶4r-&üÜ„ Ó8^š
çIû2X·@ôIÎ0JzÎy*–“'´¶S~Àå '1
Ãk[…M!àX!Âøà¶8K¹ ÷)!û!€Ù¡ýxBdDh\Ù²ªkÎ1ûÄQ?‚qÉãR¢Æ%Ñ»œt¦•¯‰óªmV@(Iì	¥Äý~"œy(“8Ú£ÓX<5%œ…Ëµ‚·è°zx˜1}‰)-ÈKJÀÆ*AÙµË IÛBpÐïÙÌŒÇ¦IÎàŠƒ\m»Ð¸x e,IJ@@ð­ÍÂ CD–¹}½Íz§ Aì’?àäÕÞÞ)?î8=|Ý;Ý…cçÕááê¯Y—µ`.5¡úc$æÞ ”6°ƒÁW‡¹žöé†A$ìæI ¬	Ð(!ãÌAÞ
óäÇ™a'¢	ŒÇ ¦‘á ©	BÃ2¼·€«YVH)…€’è5œãh±"g°ø\ÔÚ+2ÌQÙ9ë0 WxvNò:Ÿéùë„ËE
…`†‚‡/9ì¯&Òý6…‹Qh2‰,rê Ï5%›QkO‹ãY˜ÙI"dc±_¹…‚üãÿldž¹(hÄðþË}<<ë½ÙÛÙ=ÄOß³}ÐKŠží×‡oöO÷ß¼d‡/koEž1¢K…Y$êp(ˆ€VN]é2¦o'<ˆŠï.+B”(ŽÒ`©H$9ˆì°Ñ|¤B 	 M£ZÒdjÿ'´ 
86…mh«tpû!œ™‘§<</Çô°¼ˆËS‘Ï@’È;Ær™·)TœÌáalFŒ%ÄmrD=
[rNØ/S|À2Ö<&«Ä…¡ÐàDDm?ºêÛ"Vc°Dž¼Û],üŽœ¨yIqÄÉDPGËì6ãÂu*Çñ:Ú:žOS4šÒ"´¸4""#ZGb}˜¨½cnGÝ}
+ËÒ(û0§J²	-¿Úèxõvz»{¯÷wØËcø€\°’^î¿i¤NE`©ßBsÐ3ƒD
Ðkc„ŒˆŸÛ%$ÕnÃ±qN¶N‘x‘5ãÕ˜d*™‹„ZèÃì"Ãâ|Šj_3‚U²9U©Ã#„wÔ†Ñ§—Ô•¡ûò2‚°%$§Bêü«lœœ´.à¢X2yQLði	8¡rÇSnDÑÆàVœ0Q3ç0ÈœÏG#[œFv÷ŽLÉ}ÂN~Þ?ÝCñ~ì“ñŸF’\;šÕ=„8UE¤I*!“6q’®`
x‘f¢œÆ.EUÃDë¬ñÁ.i
Þ( QvêüÈ«…AO„±\è}’[ò„d4b¼z¥ÞãCìð!ô·#_(cÏ_ï[CsD3?!­a*ð0ÈÚÂÎ®ÄÉé ­.ÔépqWO¡úŒæ\©0zª²Jip8¸ÜËÇFE©†K‚"[©_yZ ñÀ0#ma>ªzÐ‹ggïÍÉ{Ý{Ó{É]1ßË8™£ãýìM…z\€'’¯g:D(½Šâîo3, ŸªÀ´±5à"*Ìø†¹ðU~žàþ|T¤üâs<é[Á”›àß² Lh£»i7BYßUÍPÊ·l¥»…­ðÄM£Jû®Í0Pcé 6Âð~«Jüöµ£p0íCÔÊcÁyN!Òg£ˆ›Hf^(¥÷I¡ âCà­À.ùõ÷Žl3-#qÉEh†/Ys*·1²E;V	&ž{)9Lš$•Ágg˜['}ÌF b«»Uø`'4ùs|¤ÒWj{ž«Â
²ä<G‘2Ó
*NzTöq²æ.ýÏaÇC'Îâiˆxù$)þb%CòñL©ˆ^ßxâ2Î*â 1wÛk|¨ŽAÞ6š¯³v;':J›Fg`ë‹ú#Û*Î›ÕÚa¦OXg‹¦,?€µ.‚-3y €©ª«¶´GZnÎ¸°¤G¤ÑÑâ€´À"Ï¬.YÜË)’ÊàÁ¢Òy[±Ó·kï~²îg›x„&N¢]¥E›ÎƒRmbJûÆj_–·ÿm´7ñÈfMkã.1jªcÔt–ÙCŒÀY³oÓOxå(Õ!¯\hWX0¬}ÍÛ=Ôð*–‘N­¬Å kE„÷ÆæO¾YÕoü„‰s!Ìƒf›5™o‚¦ÉUi†+¤åiýi´ùÛ|·WF;Û±å ®ØîôN÷^šGÑÚñïf©þøé^oçÕýŒ'J½£ÞÎþ©ÑÊÖfƒfzoÞüÜ;`Ç0
g|/|°FS+¨-'Æ»ÂBG£í}7dÚQþ	T˜®òÚ´@à0ÔÍ‚€†YZÏ*ûÔ§eF¶#ô½!©üèípÅ§²%®úèúÞ×}jÆÚ9¢÷FoŠ«?ESJqÌ7N¥R>'Ý|,U<E1€?°a]*¬ÝY²*¢:"4Q¦óô`Uy³±ípÍíM÷ÀÞtÌÀòÁ¯â²x^™=Ü8œ¹6 Ù¬E4ú#Ñ²%5Ú(÷×€{Ôñ¦DÛ½RÈäbÄí‡ó¹,à1kX8˜…B›·ÙÒ]Æè×ª TÇa“ùž`»3ÍŸzÂ¨ß¬Q‹e=tËCµˆÆhÑÇx²ƒ]íóŸ
™Ýíze¶q«_`‹ÛÜ"Û!“×H‹nûFµqµ•Á4œ®-¿¦†‰ÍSŒ1#ÌJïôÉd¼›Ò”x•zuoçtÿt|¸³go©·Äoó½A½Rú°ê0î·äCÇ¨¼¼ O¼CCOÈ¢.A-ÅÉxˆ‰¢nÃZVÁüd
‹é	Cš0lmÖ*pxDÚ=ƒgÕN‘'åKm¶/½N,F¿ätBg2öR½„Ð%Œ”Û°ÐÞÔ$3;=ÃVÕE³ÞµìtÚn­XÓÞÍÍ‹ÆH‘yÁÂ85élRJÜOðeJ¢^¨eÏ§1jcOÝÖÎÓhÔZjvYö—„$ºdLžŠZ‚|ÐÖ„ê†{z\nuzÆÃŽZ%qí'ÇÓ¯7F-ä‰l¨Ms‡ç­…íëãåWÊ§¿ýe¥¤ÀVFŒ¨ÔÐÖ–Õ `ÂK5¢ùãÿ?   ÿÿ ?¼3æxœì}ÛrG²à»¾¢Ìp@ Ô…&Å¥(jÌYÒ)Ïqp¸V]zÔèÆt7x1ˆ³ûû´ï±°¿4_°Ÿ°™uëºu£AIc¶ˆnTeUefefeee]¤á-Ù#Yp}˜&E/Ÿ_äE%ãö(Óä8¼!ß’Áúwˆñ±Gi’ä:f3>ãÃtÔËgqTœÒ›â4=‰~¡íø©à§íõV*hRü%
‹	é’Á–Ó
›PÒð{'À}ÔëC—´¶z1MÆ â²ÕÂOÛ½þ²îNèèÃ›`LOfÁˆ¶õšôbÇ´ø	z3šgâ§%Õ66Ès@19œçE:%Ïâ9@È(ÊF1µÊ3äÑâEÇ‡@‡¬ÝïÁ`³C†ÃGN±0‡ÒžÙ8J	ÕÉoÉ°‡Õ{Ãi½h-!tõïYA³)hi’<
Ú}ÒïWôˆÙ^›ÐøŠÑ(Xë5¬¶æí¬(ÏXâIo»ª2ýð	Œþßt9ËP°½íet#I×v°kÀe
#OLŒ<n€‡Ò+ SÓ8J(´t"%yd¡7ÐRQŠŽ¿Ž€¡YJ V3›s§ Ó”ýx´”WKr°Vôf£$€4lL‘$Í¦AÜ€&Ë)òhÐ!É}?ùI´IjBâbél«ÀüÛöH "ëJ<´Q» 4Î)¹«“]8À
Ù%$¤+·úÍä–Ö‚-±6¿‰õiE“6MEÎÇ±X«Zt¸¯bÛokÉ>ìm[ª=y¹„ÁI$a…$¤ù(‹fE2jdÁš‹8}0êüýYÏøÀu·ÆZÇÚ¸>Îmç–ÍÞ&ÄÆ¬íéH”ŸÌ/¾§AH3èë¾°/z4	ó¿€LF]`ªä7Ü¾Ð`d§Š—«²è’´5˜ëŽði®é*¤×
l¾¨F¦Íÿ’’rTJl§WqÁ¦ÉíeoÌ>ÀÈ?Èúo—ç9¾H3’Ó€µJ.hqMiBÂèò’bMà«`6Aþ@oÛb_øLšÎÈešb)2ŽÓ‹ ŽoI0ÊÒ<'ðxl:‹bÂüS(5ð‚Uik žƒi§AHÒÍ˜rb2žG!·ë‘‚+0K_œœü|Ó+›eQN~—Óìç‚dÄ½YxÉYlÁ g´˜g	i3»atEFqç¯‚)Ý[»w¯'QAÉ4Jº“îÙ(ˆGíA¿5é>ÜšÝ¬Ÿ“Ë˜Þ¬=£¿Ûø†œ@wÈ«à*sóá›IƒÝ$0€_w÷ÁÜÈ€e»™üÂ@h‚äX |èö‰·]´~.ãôº{Ûæ`.˜ÉÛa•ÆñE±Ž±º°Ä ³îC°¨¢Ñ‡[°­f FÆ›Úîol÷Õ\L/ 7dvÓÝÒ
a¹É@/†|Ý½‰ÐIÑ½ ëða¯”AKŠ^u&ÏXÿ µÓ¼;Bû*#ã`ÖÂ« ŽFdLžÀ(4[%II8)ÍìŽ_°	üŸ¥s°àÂî%è6ØsÑ8…q÷IDSìÞlcC» ÂäÆd`¾˜9ƒ>ôg7çúh· 4Çšôj$%®G@¬N‹î`íé ê¶w7f	x?*IÂ¨:`“’ýŠîr:BÆË{Ó`Ödï©àpób^ibÉ¹ôvOèEáÂú9M6öîÚë$âÁ5ã	¯q¶Ëºëvår wï¯95Æ@›ã-2»ín*R!•ìÁWÈ[ˆÂ$°‰.ŠŽpÎå@w(ÿÚ–Ú¤ŒÑ=²··GÊ.Ú~öIKMú|Àj¤å7Á:0aÎˆ+'nù[Ëw‡´&8gwtt¡°ñÔ…Ñ² ,Þ›µæ…Í%ˆä
øÇW1íþ’#º¼•Jìh¨F'ïÕÌ±)Æû… Î’zìƒ;¬™e"¬”—Œ™ºÉ¬ŠÖ¬þ›K/Ñ6naZ½¥0ÖÞ(NzÓ) «dv°’H^„ý+ŠtÈÉÁhÙ!Ã>hE{J¸Ç¥#21½,J™?‰BX“’YÑí÷¶mI,)u÷ž#pªÉ¤"›'#@t9M9Îh£½Úö¡¾,íEf)¥zETÄÔÆbfÖlXBú²¡MiÍ§$+°Ô3èTèBµéD¦§" T6¶S-#Ò¤Ñ`=œ±»ÁE¶þv]c)[k 1òos×äGèqož¿ G7³„)¬9Æ´ÐlÞ/º‘Ã*ÑdN9˜¦™a0TšhSIƒ)}º¦¸¡}Å~X3~QJ†²¾rUšBïMÌªÞ«NtQ[)­‰-––ïŒ²J|‰çGªœ&ÔV‘´ÌÞ£ÝÒiÜ’ÊuKJH˜ÂœYwr0a~m£Ÿ§Yw–F$«ËÁ›HeÓloMYÐÅ„(e”¼–ÆtNþŒ¶4J²€1Ë%Xå:‹0”p{wƒ­Ù°Š c$OþýÍë·§ä‡ƒWï^’Ó×{wƒý¤3‰‡½}ÖÖ“*cËšýƒXTh(AÖXâòÏ4ÁáSóS:BVºc9›`e ®ÊéKŒ9Êu’^2âÒ%¦@wgEÒA2Ï¢â–Š‚dDAåEÞ»3f…µ*®¯/£±°bòž×"”°P§ù!÷$ƒŒú‚cD‰Çp´×JÓ‚ˆ’x¼|Y»$nº×Ý­›ØœåÜš~“Ñœâ`§iˆs3ˆ
ç»Ó”ÅèÊgZÙ–—Qs%ˆ÷îî ë°,-nwH¿Cn¹ŽµKß(=`¥=…éMTxàv}€ËY‹5¤!
Uz›BÁÜß!gýÞ 9x‰ŽºsÌ2Ý‹¯¡GÁ{—îjj“XªK7„˜©Yž\Øk¾Êæa)‹ËÔ!ÎMc‰å[T© 1;ž1VÔÜ±°]½ôÜ¶—ž€œrÐb¹)¥ìÉ¹ÐåÂêÆ×ÎÙ
-4,ž]ß¯2lpI9ôÊu¥}ÅMÀ1.·ta÷I:Zkš4´Mßl•#ÅÓã»+¼¦LéÝRÎ˜šÆ’T•rå'R?¬÷`ñàÁ%˜ÏŒußd)jÉ#zÝ¾#óœfâMì˜w³ZÁoÏ€ÿð/èÚätKƒÒ4Åb‡•v˜wÃ°CÚ3ã'¶ú¾J£PÂÞ‡"ÆK³!ãgX‡0ÿ&wížå£IšÆ¨®ŠöõœìaŸN
hy—¿"¿’´âÓ6þË|g¢r”… “1«,ŸtíË Î©^	X·x‘fSVçH<Uø:3ŒòYÜ"íèXêi?_%­V‡•ç#9ÍÂòmYr¡wÙÿ—ü»·÷PÞ]^+¶92y/9œKZŒ&YÀµùm2"z)î¤þÊ×±uá‚”îÙ"»ÕüÏüßèßç4»Åx˜Ï†vxÑ!-%o­wÈõ„f´Ý’p[ðëÞüëmTóó&ò$˜a×Q_X<OGyûïZ16 ,Õ£ÓYqkzÙ÷À,ˆ€¬XKùYÿ¼‡,ÙëõŒwÀ× hÖ&¯©5åñÂ—(e¥ç™À‚v4!mš; 8ºF¯Ó¬½v„8¹Ð¡Íñ±jI Â‰Í5Ê¶¹Û¸CÎ|(=ç\Â±9/¦'Áõ²CÉlm°3©hY§<3gó?M¨;D¤!fàYN(Ùe"¨Èk!Û!þì‚Us‹'@û÷”3æ„­OºŽ*ZN9UN¾’¸TX•Ò¬mJý®MhTQÖ¤kI¾,[¶ÅpW–È6À6Û@Ïù4Üa¦±2|Éô†›ÎråûXù’Áâ¾ËÿæqÄ¾t/³t
VWú­ÒiÉì#©l–trõ(ö`,ûÜPp×ü;ò¥ê¦2–”!Xå¦_{úÃ­Tr¶3Üg²Lµ˜eÆ7èJr›Îa9¼ÈVL¸â|Öý%î"~ªW@í_Ó3îèß?ý©‘W¼ÚW¡y+làÕîïŠÎË=Ã-¡Ü-::ÃcdÊêUñ‘|¯ÕFøÒM‚Ýká,,÷„ðEÀ–ïÁç—ªnêo¡K&óM «jôsÏÂöÂá4Í)SŽN[è(G”í“^‰“Û(@`%dlqþ'Â¨—»¾‰
çÛÂd.4Ä*YÊ65¾Áz÷ãÇ?þ¨Â?>tj›±Àvät5`ƒ¥.©zBÿ9ÅP¯ïÓ)]Û¾yênN•ê„)ÙJ÷a†ý[¶ËðQ¿™Ÿ‘oâ('ao„Ø®õ±YÝƒ|§Œ{²¯ñtå¹4j—*œ¢,,•çCÓd5 KÙ¾[ë±wqpAcw_:¯p ó°ÚÂ¢|Ð2À]–·tÈ@à,ãÝÖ˜Ó…j­hÎ)mÆjs²jwKc)åà^{z§Ûq{µpì¾•q5ê&Å4;no:‡²öyúœ[•áV!4JfóÂÝSB·“N!®º±sîoWA<‡)ã³p]GH°éÇP¾M¥|‘k×ön…w,ºW¬§z¬9Ï& o'CMªª‰äc Çhžï`X9s©‡R-núâso5f:/Ø^Y’&ÔRFÝc[‘gÀf>÷…Ï’cò×žï^ÛÌ’úîµA'»lU/ƒ½¡ÏÁü,œÐÆšåVm‰•Ðè›_œ£‘ï¡áÖXÊÖD7èœbÓ°\Ä4Ü»ž•z‡÷!Z^±Å2®ò_Jýr½½Žª¼&Ø*$Y¦ãËg¬€C©§¡
½ÚöNwÄ¾ê‰f»‹K©ƒú•OŠøÎzê)(ûd—Ø4J;ä¡a²ËÅq>‹´Èq9G¸PÍ[‹¥,`/ õÇu€÷Y-”Ç·Y°„¡	)Ü‰C[~ÌÚ!#¤Dí{p‘§ñMx“—áŠþ^wnŒô#v°ËÏ36Éû¤;Í0à§‹Km7»ô
z’óùútYtÙ8‹pw2
1D"‡ù2wÊÇ!c,Œ)’ùžp=Ür3Üoq=4&¢ˆ½@”XCˆ7@AAfÁ…œƒ‡îv¶‡õ>y!ºÖ ´›|Ö óq[ÈÿâWãËá—»:­ö*…¥ÃŒŽ¢Ëˆ†-×z¬³ÍFGÓJª*ÃØò%-³“—Óú°–sZ³•)—Íé«AWÐ¾bð[“ør>šäQ ˆ,ŸW›ºÏ²ˆ^2=ý[Ó”	‘·i¼Â$–Ä¬"$3¶Sýµhš¡\žÇkýŒ›>¤µ¾:‘=¯j…u©A=ˆY»Ó=ç±­ |ð>š‹‚é´,yˆ?­ÈAó(Fkfø›sØH<~þé8Èbc…ò¥ë :¥Y‡Š¸òù~äýR¨»šš_*!dKžÌÇ@lNàý^¢+úKDÖg%p«¿ŠŽÿp[jø·•tŒìWæ³7¸ãvOÒº.3+S]›kO_¦#~è8¹L«ˆ^o‡Å	óàÁWÚJ´bYcñ±[õÿâ¿ÔÂ­+Íkûn)àe>Ò©ˆuWŒ±F8koT0uÙ?×àŸGWQþù‡Šf>z_€Óº¸ùÜ6+p¤2ô»’¡>s˜cT|vÌñf>sU¢d5«ò…éÜàþƒª´ƒp%\¥ä"íQ!gÔO´JÙ3?‚yBô4æVød’^¿ 4¼ÀJð&Êånjó2‡qšS½ŒÛ#{äìü‹eS-›ñhf/¬(7§Kû;$HnÝŽ0Nî ‚-øzk×”=‡–Dh!À—kqq¹=<;Ú>;_%˜LÅú¨ð¹ƒ0,£çøC}ð\”¿›éÍ—Ïõç¬ØÉ|4¢9Ö;ýM}å„^Ÿ”q‚¯ä“´GæCoÁ¤t‹ãÓL“×—¼
Ã…7ÿ.%™|â³S‡ó2§âW:;
ËGþóI4NÕç/GÅð¢ÂöãåOÓçƒö5ÚÊW6‰+Œ&4;Í[plžêo8oé¤ç.OøÓ€¸6yú´}·XWXø·Æ"¹ÖTØß.1—ÃÞþ+ú·&ãüD8Y’Ï/ "Ì«$˜å“´hÿ½CÚ˜gìžðÒ#6”âï?£©x3Ú×»L³#h#ÎÌýÃþDVhÆâ;-0Rß¯á½93J šÛþ@¸÷×1C†'RP93È&`É ±Ž9³0SM(°ž‹ÎbVŸ Å3¹Á¼CŒ0CÙ|Æša*ÃÂ10ëüBÅj?§EÅ9Ã@ÉñœHÀ¶h^F	é«óêŽ _SÜDÍŠ}YËa>6
h@ÀË{ÎÒ*AÃã4ÃLT­“iÇ­ò·KŠ‹ÛOžˆüH`rw<Ñ"ù*`C5à·ý€~`›•¤Á Ô ß÷Ãz‰¸¨á–Êß‰q`Õƒj²Þ…)Ðd¥LC&~K<2J±åÃs€}R`ŽVKŸ×œí%`úõèÒ›`Õöz¯HO^ŸðÔc†h°TW5,ÈF³_PK±Ù/!¨—¸I£Þª/Z»ë,ÍÚŸhé?ôÆÚ{6©×eVnÌw0d\}ÅTÀ‘·hÒ}wÒÂÓ¹S°' )â4£‚	náæ%Ï·Ð¤ö¢Ìl!Â¾£,/°[GI¨£M•#ÖJ®0NßQþ&ˆBüqèŒ’<5ZàÕ,¶úJ€qj%_]ž¦N6swJž–_õÆÊwªAùjh¤/1Îc‡¼ÿÇÿø¿_ßE#É™‹÷²¼C`>wÊü7ÏÁÈÀÕ7°< !×¿?Ðij(UÃnY›=/ýÂPdP¾>Å…5N˜]möI±nV<¯³pþWÛ ÂHUZž‰³ÒÐÞgÞavŽ¦•³pÇŸ™:j!õr®ÊmÐ¨2=dme~h°‹{Ø#¥Þ.-–ÞâC4c¹-îð|<«¢Ã!à‹(\¬¯ëßîQõ<¤à
¯"Íè‘Œ3ï€° #µ¥¾X¾®×pæ9Ið‚3=ˆc	ï¹d€ë(	Óë;YšMÛ­ƒŒb¸5ÉçâËu ú®H‰`XÊ’ðˆ¡ì·Ö×}óÚ)ÿ	•¢é‰¢‚>ÃàÍºð•}˜ÛÑ:üxIÄˆèVhçqbMôøéòDƒ¤A‡ÃƒDƒ±ƒ©¨pãOŠÄÏLðFFétºu
Â)+ ™%ª€2˜·Ó!IL†½’ªÎ£Ô°Ã—¯KøË’†¢ Ï-ß¾¥PP€)sÍáÛãÓãÃƒ—ä/o_¿úó‘|% ²ÂèIÛ,õâàðôõÛŸÈÛ£“£Sýy(Úß'§“('×àqF³i@€²å9xù’h+o¾Jçç¥Ùz°y3¢³‚Ÿà¶u0bÜzƒ¸[äðàÕ«×§@´„Ó„~¥3¶4oÙX¹c8—c`–¥ÓYÑ^;½QÒ2ÔÂ!ŠZ½2M7"5X_¡À5kêÀYiM‡à!D4¤1*ÒóŸ™'Ã<\P3/Qu0Ž:f¼–Ž%º\2c­	Î§Ä3QÉwÂM!Ckõ)é»éØêgÿ,ëÿT“ü»ÎX¤JËOÓÃìôa)Í†JNüŒßƒy?ÇéXüÂÕöÚ¹¤ã³¸MXx¨9ugi\x\7G®5bcJ):¸æHæ³«ö2ziã°Dá·ßZ?Ù´„ÕË6“wVã‹zæmÄ³I|Ò`ÌÒ½¡A¶­`ùFnz_ÑÜ,*‚ÏÙ¿íÁs2.Òÿ2ÆA[_Z½©	76ÚÝBâA3tž¢P‰Ây •Ì×<EL<ùF"•*Ž„å,Rþ;>ÆC4«â,qÞÑé,No)õŸ¥<äÑúÁ€ý'qam%¡â¥\fz“Š=¦›žœ€vÍ¹Ú¿Žf†Ê'R‡Äb»Ð‰.Öö'1
.y¿~fúâ#M&Ð–ÔJ«[”ÏN^¿|wzôò'×1©Ê,K£œÅš]À—%Â*`#CÎ¬¨ôg¦ ¤9«ÂË20õ¯`¤½ûZ«#‡þP°&ã™
V“Ò9SM\§š}llÉ½Qž$[Ì¥fÂã[¥tûßf•è¹ÜYx±T]-ÕV¥²*½iu‹#)Ç«Pæàjù{?ñ{oé{àHŒr™•ó­*ž ‰	˜O¶âbÐiø‘¶òè?[çªý4Ÿ£½Òc³´×ú.š™3ÂÍ0Ò\Á%„œÂ†—æ¶[xd9„‰^Ðpoêï«Ü›Vc¬×z=«Ú²«­Ç²–%·ë(9ô©¡çQÈÙÆ²Ì¢ íiªáhÛ"e2øˆå©H]ki…ª’.hë
;²+Û¶^)"NSÁ[† 0dXÂjlú[5ÌòåÂJ†8Ž`Ùßl‘;ÚÖq&}ù‹Þ5®)÷páØBBØR|×¹ZN˜ÖÕ³žÓ‹sië™ ít‚˜ÛàzŽ••QÀ{8x/ßøúÎi|ñ¾Vz² ¤QÀMNº#ò«ò#CGx¤e÷ûÓ^ãñP‘oõi‡øÜÁ^€mÞ"¿JJð¯’æ-7Ï¯¢Nkâs¾ß;ëŸ—®užzÉ”´™ÌŠ²QÊ/ Ü[ö¾§¼\/MÔxp ë¾=òh:6áOƒ15¶Ê§c’c#
’« ç›í,i¡ÿ2{m‹0¯àU§ÁÍóh
U7û†ÍÇ,^v!Çëûn˜Èû
°øN å+
òT”µm½ï
”p¿Ù“ÝÛà}ùNu‰¿ÿnùØ€ §·Àáèˆî—cò6¡Ž#µ'»ä`Hü® J9Ô+np——†d)o€jÃÐ¢Xq³ßÃ|ùœK éL[ÿ±¶;Çn(¼ßeqÙL‘¢›øÝÛ—íV„À6flO´Ïnñ±(ˆÓŒï,ñ™fÓÐò°Œ»RÛ4ø`ÈdÑ…éäÒvèË¶ô	¼Z{ŽÐ¯mõ>°k£¯•a~äÙ¥Ê!y0²5ŸÇ<.CiVK–àŸƒ\’LË¥dËÔP$j=<ùñ5Ü˜sƒ&R–­i!ê¢N#t^°!sŸJã‰Gûvˆ|Åo\ÿ5YûNŸèJAðG7üë÷À™
Î ?nnuÈM'	yžBÃ¯ßv0Õð3@¨ |§Bb>ƒ¯í31oE“ç¸z'ÑÆ(¿*u¼°ÙD D
)ùúâo`ó bºQ4¨‘©œœAok0Ü†ÎbùFÒã7„nü¹éaŸxA›Ýã†·}$áá$‚u[ €ðØ³T	f…ŒNÓ+jVÀq«¦´qAÇ´k0ÌÍÆ˜*Å+,“fê÷^jõ+®W¥mó@L9-²QwèØ‹†q©µÜL1ÛjYŽÖQÎhÁ/õi6_yÈYÕMÁojoü5Ûÿk²±ŽØÀ+NØ½gÐþç®¹?º”ôˆ'IÞ÷²K†º´ðeç¸Eoñ+JC9ÓÑÅxt:ŠÑ™"K¯•-/¾@½ƒ<&# CÏÐµC>”0°%¦Åi
+¶Z;;gáÅ&Ny÷«'˜O#H®ivä¸¢åxnuZë<L€çå¨Uh1@â*¯aÜ“ÀY6Òã$¤7í	VŸô¢dÏCš·[X¸Uf[Ø¸~:µ±VãúXÄ «£Æ øJÊ‹ªÆ äÌ$_çÖzia ¯_*^¾“ç,ô—<}–Pyˆ×òE#š›D<Æù.(ùtô1M<î”îKA/,Ì‰&Šò‡2fTæXF+*wÈPuœyüX8†~v‰>gáÍ·ßÚ©)œnŠ‘£órÎ"$–3&—šÖ\±ƒÉ¿ÍÓ‚ZqƒòWUò#Ë=ÃÃÕïª¿£Iá|…ž˜fÛÙÆ™ñµæ]ZÛ_Éï6\	¦ÃÂTy&ro6Ï'm½÷–ÃÒ30§Ý»êßî±QW¹,t¦4ã`t¢œÍÀ#CŸƒ—ùúöÐ³äø|_ÜÝøok¿®}½<B_*×bWžA$ZˆîW)MV$N`íIÉ#¦† È_.Šy@Z.du¸iOŠ$6y_ØâøÏž”T6ì¼1lkª0úoûØU,çl­Ö¨ØØ+>ç“õ5ÝÐ5+>º2çsèÎIã•0ãÁ~+1èþbz^–ç¹œ|KÒo¨t•Eãh¯ ô5'ÉÜ‚~Ï«FÝûŠŸÊ(5ÛCf3+¹hî|6Ô³èV°§ #>OGoÙj'¬óÛ¬Å÷¬€3Û
,¦M$OËö5µ±,JœFSšÎe˜mÅr¢C¶û}ýRÝšf®t×…<›Ç˜6Š­(Ø«~ð#ÍtxÌ¿µ¼•C®TwcÃx+déhá˜ßm˜»ÒÄH¹¢Rüw	–·:‘Ô"[?£7J†»GÉ(Å1±yá³ I`å±ñT]R"c¥Å/&Ì½;óY;Øm9•ÍÌ«Îõï‚‰@s·O~éžýóåI´Œ×Oúý­>Á…a–Îº,ÿR>­Í}ääžºáw1Š<<¡4&šYuísç»“ÍÕR\`Þ<NˆýÝÉ¦uéeÐ% õpíieô°'z“%Ö5°^“ FÈU»¨
"ùî¾›Æ²*Oà¦›[ÄŸr×—"Ö·ïQ› ÑÊ!7\)Ïž…Š©â
 ©›ž×¹¬ÌÎææ@ö¤Ó«J¨×MÆ.ÕŠhw3˜ïÞÄzÐÀj?êß¼ÃÐ°êQl)|äÑÝ%±óØ;eºAWìø&›•€Þ—6Ê=Ò«&_ˆï9ÞÁÇ2Ÿˆ­<°¾ûòqá
¸’¹íü ¾}é‘i²pÓ —wÛzçŽ'iÁ¿Ë´)}OÚ”†³Æº ¨*[Ôòd~J¬û¯žªÎØá¦~æ™†›fiaj¨B,©ˆý]¾î0]ãÀÌW§É4SE„A>¡à(Œ¥RÁ"xUFJq¢•ßw£áVCáŸ»2H±/&þÄíê<íù~_¸‰u SìOÊ6"ºxÞR7ëÖH{k%Ö`Œ—`8ÓìM
“øvo-I»ò•H#ê½-U¿’Ù¸úØœ{=—]qòò|Ó<s4»‘E¤Î k|Wô›57´7l¡M;j{ÔL‡*ó~JÍ 3xöí¤ï¾<F¬“+f&ùÌ3Gˆì?¦ÎÒ©Sj‚Š¹S¸ÏäÑñ»˜="xçw>}Ø†™RÿÌ 3Ha«v©R1—ŒßÇ„*#h~Ó9Õ,³`ÕÝ²¬·¹œƒÞ6™ÆH#Qcåœ¬ºŸ?âŠ	3ÜÛOé’†Tø&´%‰®œx.–ðÝ+ïÝµ·è×K€üÐï‰2’ÖkL+n›Vß6á»ôµÞ1°}˜	P‹f{kGlþˆcm‰÷Òç
F¦fÙýYÿÉk‡1lR¨aAÊUm•ÈYËr3vüWcHqóIš¤~Ö´˜óø9yÅò+ùK{%ço`r”ü%Cu8=?%“éÎ’OÀh¦ïå÷ÉlXwk‰ÿ²#ü¬Âb÷‰›^wYõs³¬Ì.»œUžÔ7€«pŸôó9|÷I8l“»Ì%|b¢Lj{¬›ûé+á½ô©þçÅ¼LŠ{/Ìë
+b^ú¯¿<Ìû×ÿŒ¿¨ƒç#cÁ7÷\ðÕžùóKq‡’eÌÐ¾ï@§x=m­ŸõÏYtÒG¯2´ý+þ@Ïîgüb1ñ~ü.&õv`ÓåFÅ¢wé>lõífú•^}ª¸áÍ„ÚÍJ¾‹Ï´Ý^vÉšF2{ãoZyóÙÀ¥„q¡ÚY¿÷äñ¹{3Ú&Kø½µ|‹˜¡åÃþœûÄ»Iàß˜Œwá¹ì¦û1·]ã”“[°ð4úp+®û¥»Õ/ï.³î_~!‡¹Èõ2eí¥ÅÆ½+]f­ß÷À˜Ì¤|ÍÍ·‡z•¥ÉKzYTmbzï’s3²{®L_å–t±Nç©’sû¦ô&7R‰[6+¯”ùìUF7Ü.¯¦à‰bÎRX14uÛ”I¬Õ¤âž»¯§)Kƒƒ ­Y%@ß Þ»»“žÆíg³¾õž¸·]ŠK*UeàV 7Q±Jæ<­»uF0í²çxl’±©Ç$ˆ×ãî¹±ÑQ Àð`¸èw=[%¸«—†–ð*	¡W0o0ÿÊI¢êÔnîNOõYf-ÓŒ¶­
ìe•Ä¥}y—ÚQDz¤#|ñØÒX*€ÉQ[Ú5ÇSwç¢ŠždšÁ?å’&C`ž¸—èâ§ÂÒ?À4)§YF\,¯:<öÞwÃÊ³h:3-ãóg¾îEùŠX±UiäM0ÕˆH2hÌÖˆLºu±•>7x¢ALpc`å>ÄØur¬ì¦V¥›Y¶ÖÔ£A%ùò· ”?LNFÙhyÄ‘©p+ä™™=yŸ´ôH4$¨Èö±ð³Šÿ\éé9¾tFÎÔÝhV³07¡—ÆpòX.14ú\ž“–Ý\afªº51m¬` süŸöÞjÅ øìeCZæ¢×·+ŠÈe<^YHÃ‹¸¹ªdém°–W9ìËÕ¬vÑ¿pY«ý1&‰ŠWA¢ìIÕµÂºø“KÅx%õõ&žçMµVhûY•Y@ûÑXžìnÀ:Z=L1NÃ˜EHóCX³Éç›n0/Òše°µ¯v6áÛV˜‹o™í¶ jñ¾°NNºgúW“s˜úy‘NñÜMÇ=ùwœ?‚+^Ña<oÌrêÆÖèÝ1â)LÁ¦ï·Ý"³°dyå|Nk5ïGÖ/ƒ|7Ý‡8¶ˆˆ–¨»âØt¨Z
»ãÅä³¶Äc@>s#ò–ÈÏÞn~þÆŠ ˜çUÍøWŸ¨q^<ã.šƒ‘0·¡#®8‡×™k¶±	äN+Ì³â•$¸_Òî­ü¢<`Î<¸ºŒI‘çö…¿1ø	HaÔÚöÉ6˜£¦d¸³¥[hÚT 3/Ey¯…ÁÛëõ I†üèÄý qTXEs·ÿ™Q xgØ×Qsª!/AG"
}±•L/›œJÑQEÄšõÜMìwn+­€‡îÍáJÈ?FŽ}•J2“8æÝÉ°|£ó„E¹ƒˆa78°;‹d0`iLá	¯¦a¯êšÜ•øÍe,É*/Ì§‘è‰í8üÄ¯XvÖõ»J0"µ¼-³­nÎüõW¼äMæ‚×Üø•»58Còò³¨ŸyÏ @ÙQ'sÙIk}0;¥ ¯Äª¼º_3£hpUò˜^áBÚÈô^ªÛŠrŽY½!ãrD¯Cvö1Ž?Û´w>ÐÛ½;Ì:mÌ;çHæ†ïTf…U„>^ UÈ-Æšûr‹Ð«ì*+âµµ&Ú®”“E —‚]ÛjÀƒ¸eH`µ‘ÏšõN¾{ã>{öGu^œ©ðYµ¨BÅsã¤|Ã+žkÚÜÉþ·‚Ä+ãë•E¼4X¼¦›~ÁU‡8ÙM]O-UMK10ÍúMãtËÒcƒ‡•‹KU¥Zi	dT¹
$–À7TSÂSŠ*¦ÌÆ‘[{’-j®¥ö5%--;œD]Gmn½/¾Mµ?êIë½ƒÛºuÛ–/ZäÝ?þãÕ\¹]Ñ‚‰È-ž>@E–-{ÁN „Þÿã?þùZ{¹x_×ä'ÆÐ]ÛsoƒõùåÕ
Æ}Âg¹u‘­OOš€ø=zþ+bÛyOKpÎ›Ä;Ê»êà×êN…¤ŠsŒÕ—	[•E	‹åqå—s•¼ï¾w#î ¨5DjõË}ÚJ½¬Ÿ¨jæ=yæ‚´ï8.û$Áàö€¸U˜íˆïyk±¾µº·
×Frÿ¯éØŒC—©RÑ›å Y1¯½¢ï$±ÃË,(©*ú^³`Ð`Tüóÿþ÷ÿüïä5°3˜ÙuI|ŒÍºÞˆ*uÃ<{¢Ž•‹lCB6ÈŸ±;œZÎÕ¨ušò>ãq·îg¹­"`}5Ïz5›4Æ"C^y-˜(ìšßOÎ~"ù·õ*Zû¼ìDÈ›,¦„¢\ü8¦Z3µ6]	°÷-´Ô¼lbV«ÇÅz»²ŸÚ¨p—ÄõÚam—^ÙöÎ¶½£^=*”»¾ª=¾ª‡Ëxb™ððÁ»8yø)»ÿæ<.íü}ß$ÈÊ€UÁ(†g{É©~…-…0hV?]VæCÖ¾?¸t>«mØÊëÏ*>žkêÞW¦.›'êêã¯åênÿýº{šÿc§U¬û4¸Èm1KMäÞ“XùišÛ±îc¹îTæGî¼k:äÊëÝÜV‡û?Á ›—,3fz\žM	Ÿ&WëUv·)Ó°«ÐÞ+ÞdyÚ£"W7"kw¢•¼öÞ7ìIÕEiõŸ{]\½¤#J-/ãÄñºÛ„
ðŒ®©Á_m›±½Ö*ÖU«5•ŸåöÌ;EÍ¥vMuøRùibœY¢ùËÌžûäë>¿¹¼â˜ÿËä¡¼ºP®+þ³
>â÷{OŽÙŸ†BºSµa‹åÇÎs¹œˆVÒË^¯—7›¹Npä²:Ky¡Æßã	¨ý\|°Œ0éOBzëAßû<êû+7Æ¼—heÍ]•õ8oài]q€ã^ñàúGÆ†ë©­?~^ïžfA>Ö¨rª|ü¬^º›Wí@¨€ë‹aÅÝ¹élC¸GG6X„›ºÁR›(ÜÝÀ(]þ¤~€Þ,ü   ÿÿ bŸD0