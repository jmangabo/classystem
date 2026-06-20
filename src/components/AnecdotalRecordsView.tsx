import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, FileText, Calendar, Clock, User, BookOpen, Tag, Filter, X, 
  HelpCircle, Trash2, Edit2, ChevronDown, CheckCircle, BarChart2, MessageSquare, 
  ArrowLeft, Download, AlertCircle, Sparkles, AlertTriangle, Printer, Loader2
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, 
  query, where, orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, safeGetDocs as getDocs } from '../firebase';
import { Student, Section, Subject, UserProfile, AnecdotalRecord } from '../types';
import { formatStudentName } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface AnecdotalRecordsViewProps {
  currentUser: any;
  userProfile: UserProfile | null;
  selectedSection: Section | null;
  students: Student[];
  sections: Section[];
  preselectedStudent: Student | null;
  onClearPreselectedStudent?: () => void;
}

export function AnecdotalRecordsView({
  currentUser,
  userProfile,
  selectedSection,
  students: sectionStudents,
  sections,
  preselectedStudent,
  onClearPreselectedStudent
}: AnecdotalRecordsViewProps) {
  // State variables
  const [records, setRecords] = useState<AnecdotalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(selectedSection?.id || 'all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // UI Panels / Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AnecdotalRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form input states
  const [formSectionId, setFormSectionId] = useState<string>('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
  const [formCategory, setFormCategory] = useState<AnecdotalRecord['category']>('behavioral');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formObservation, setFormObservation] = useState('');
  const [formActionTaken, setFormActionTaken] = useState('');

  // Reading & Opening a record for Intervention Resolution
  const [readRecord, setReadRecord] = useState<AnecdotalRecord | null>(null);
  const [readActionTaken, setReadActionTaken] = useState('');
  const [isSavingIntervention, setIsSavingIntervention] = useState(false);

  const handleSaveActionTakenInRead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readRecord) return;
    setIsSavingIntervention(true);
    try {
      const recordDocRef = doc(db, 'anecdotal_records', readRecord.id);
      await updateDoc(recordDocRef, {
        actionTaken: readActionTaken.trim()
      });
      setReadRecord(null);
      setReadActionTaken('');
      alert("Action Taken / Interventions Conducted has been documented successfully!");
    } catch (err) {
      console.error("Failed to update action taken in read modal:", err);
      alert("Error documenting actions. Please try again.");
    } finally {
      setIsSavingIntervention(false);
    }
  };

  // Loaded section metadata
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  
  const [formStudents, setFormStudents] = useState<Student[]>([]);
  const [formSubjects, setFormSubjects] = useState<Subject[]>([]);
  
  // Refs for PDF exports
  const printContainerRef = useRef<HTMLDivElement>(null);
  
  // Roles permissions info
  const isTeacher = userProfile?.role === 'teacher';
  const isAdminOrSysAdmin = userProfile?.role === 'admin' || userProfile?.role === 'system_admin';

  const [globalSubjects, setGlobalSubjects] = useState<Subject[]>([]);

  // Fetch global subjects once
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'global_subjects'), (snap) => {
      setGlobalSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Subject));
    });
    return () => unsub();
  }, []);

  const [sectionSubjects, setSectionSubjects] = useState<Subject[]>([]);

  // Fetch form subjects and students
  useEffect(() => {
    if (!formSectionId || formSectionId === 'all') {
      setSectionSubjects([]);
      setFormStudents([]);
      return;
    }
    
    // Subjects
    const qSub = query(collection(db, `sections/${formSectionId}/subjects`));
    const unsubSub = onSnapshot(qSub, (snap) => {
      setSectionSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Subject));
    }, (err) => {
      console.error("Error loading subjects:", err);
    });
    
    // Students
    const qStu = query(collection(db, `sections/${formSectionId}/students`));
    const unsubStu = onSnapshot(qStu, (snap) => {
      setFormStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Student));
    }, (err) => {
      console.error("Error loading form students:", err);
    });
    
    return () => {
      unsubSub();
      unsubStu();
    };
  }, [formSectionId]);

  useEffect(() => {
    if (!formSectionId || formSectionId === 'all') {
      setFormSubjects([]);
      return;
    }
    
    const activeSection = sections.find(s => s.id === formSectionId);
    if (activeSection) {
      const globalIds = activeSection.globalSubjectIds || [];
      const activeGlobalSubjects = globalSubjects.filter(gs => globalIds.includes(gs.id));
      setFormSubjects([...sectionSubjects, ...activeGlobalSubjects]);
    } else {
      setFormSubjects(sectionSubjects);
    }
  }, [sectionSubjects, sections, globalSubjects, formSectionId]);

  // Handle cross-section student lists for Admin roles
  useEffect(() => {
    let active = true;
    const fetchStudentsForActiveView = async () => {
      if (selectedSectionId && selectedSectionId !== 'all') {
        const q = query(collection(db, `sections/${selectedSectionId}/students`));
        const snap = await getDocs(q);
        if (active) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Student);
          setAllStudents(list);
        }
      } else {
        // If "All classes" are selected and we are admin, fetch all students from known classes
        const list: Student[] = [];
        const fetchPromises = sections.map(async (sec) => {
          const snap = await getDocs(collection(db, 'sections', sec.id, 'students'));
          snap.docs.forEach(doc => {
            const st = { id: doc.id, ...doc.data() } as Student;
            if (!list.some(existing => existing.id === st.id)) {
              list.push(st);
            }
          });
        });
        await Promise.all(fetchPromises);
        if (active) {
          setAllStudents(list);
        }
      }
    };

    fetchStudentsForActiveView();
    return () => {
      active = false;
    };
  }, [selectedSectionId, sections]);

  // Real-time listener on Anecdotal Records
  useEffect(() => {
    setLoading(true);
    // Build query
    const recordsCol = collection(db, 'anecdotal_records');
    let q = query(recordsCol, orderBy('createdAt', 'desc'));

    // Filter by school if schoolId exists on current user/section
    const currentSchoolId = selectedSection?.schoolId || userProfile?.schoolId;
    if (currentSchoolId) {
      q = query(recordsCol, where('schoolId', '==', currentSchoolId), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as AnecdotalRecord);
      
      // Filter list on-the-fly based on permissions
      // If teacher role and not admin/system_admin, only show entries in their classes or ones they made
      let filtered = list;
      if (userProfile?.role === 'teacher') {
        const allowedSectionIds = new Set(sections.map(s => s.id));
        filtered = list.filter(r => 
          r.createdBy === currentUser?.uid || 
          allowedSectionIds.has(r.sectionId)
        );
      }
      
      setRecords(filtered);
      setLoading(false);
    }, (error) => {
      console.error("Error watching anecdotal records:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser, userProfile, sections, selectedSection]);

  // Monitor preselectedStudent and automatically trigger the form slide-over
  useEffect(() => {
    if (preselectedStudent) {
      setFormStudentId(preselectedStudent.id);
      const sectionId = preselectedStudent.sectionId || selectedSection?.id;
      if (sectionId) {
        setFormSectionId(sectionId);
      }
      setFormCategory('behavioral');
      setFormObservation('');
      setFormActionTaken('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
      setEditingRecord(null);
      setShowForm(true);
    }
  }, [preselectedStudent, selectedSection]);

  // Clean form input resets
  const openNewRecordForm = () => {
    setEditingRecord(null);
    const initialSectionId = selectedSectionId !== 'all' ? selectedSectionId : (sections[0]?.id || '');
    setFormSectionId(initialSectionId);
    setFormStudentId('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
    setFormCategory('behavioral');
    setFormSubjectId('');
    setFormObservation('');
    setFormActionTaken('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRecord(null);
    if (onClearPreselectedStudent) {
      onClearPreselectedStudent();
    }
  };

  // Create or Update Record Handler
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId) {
      alert("Please select a student.");
      return;
    }
    if (!formObservation.trim()) {
      alert("Please enter the observation details.");
      return;
    }

    const selectedStudentObj = formStudents.find(s => s.id === formStudentId) || allStudents.find(s => s.id === formStudentId);
    if (!selectedStudentObj) {
      alert("Invalid student selected.");
      return;
    }

    // Determine section context
    const studentSectionId = formSectionId && formSectionId !== 'all' 
      ? formSectionId 
      : selectedStudentObj.sectionId || selectedSection?.id || '';
    
    const activeSection = sections.find(s => s.id === studentSectionId) || selectedSection;
    if (!studentSectionId) {
      alert("No class context found for this student.");
      return;
    }

    const subjectObj = formSubjects.find(sub => sub.id === formSubjectId);

    const recordData: Omit<AnecdotalRecord, 'id'> = {
      studentId: selectedStudentObj.id,
      studentName: formatStudentName(selectedStudentObj),
      sectionId: studentSectionId,
      sectionName: activeSection?.name || 'Class Section',
      subjectId: formSubjectId || undefined,
      subjectName: subjectObj?.name || undefined,
      date: formDate,
      time: formTime || undefined,
      category: formCategory,
      observation: formObservation.trim(),
      actionTaken: formActionTaken.trim(),
      createdBy: currentUser?.uid || '',
      createdByName: userProfile?.displayName || currentUser?.email || 'Teacher',
      schoolId: activeSection?.schoolId || userProfile?.schoolId || undefined,
      createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString()
    };

    // Clean undefined values to prevent Firestore unsupported data type errors
    const savePayload: Record<string, any> = {};
    Object.entries(recordData).forEach(([key, value]) => {
      if (value !== undefined) {
        savePayload[key] = value;
      }
    });

    try {
      if (editingRecord) {
        // Edit record logic
        await updateDoc(doc(db, 'anecdotal_records', editingRecord.id), savePayload);
      } else {
        // Add record logic
        await addDoc(collection(db, 'anecdotal_records'), savePayload);
      }
      closeForm();
    } catch (err) {
      console.error("Failed saving anecdotal observation:", err);
      alert("An error occurred while saving the record.");
    }
  };

  // Delete observation handler
  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'anecdotal_records', id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Deletion failed:", err);
      alert("Failed to delete record.");
    }
  };

  // Populate form with existing data when editing
  const initiateEdit = (r: AnecdotalRecord) => {
    setEditingRecord(r);
    setFormSectionId(r.sectionId);
    setFormStudentId(r.studentId);
    setFormDate(r.date);
    setFormTime(r.time || '');
    setFormCategory(r.category);
    setFormSubjectId(r.subjectId || '');
    setFormObservation(r.observation);
    setFormActionTaken(r.actionTaken || '');
    setShowForm(true);
  };

  // Filter logs logic
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Check Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = r.studentName.toLowerCase().includes(query);
        const matchesObs = r.observation.toLowerCase().includes(query);
        const matchesAction = r.actionTaken.toLowerCase().includes(query);
        const matchesTeacher = r.createdByName?.toLowerCase().includes(query) || false;
        const matchesSubject = r.subjectName?.toLowerCase().includes(query) || false;

        if (!matchesName && !matchesObs && !matchesAction && !matchesTeacher && !matchesSubject) {
          return false;
        }
      }

      // 2. Filter by Category
      if (selectedCategory !== 'all' && r.category !== selectedCategory) {
        return false;
      }

      // 3. Filter by Student
      if (selectedStudentId !== 'all' && r.studentId !== selectedStudentId) {
        return false;
      }

      // 4. Filter by Class/Section id
      if (selectedSectionId !== 'all' && r.sectionId !== selectedSectionId) {
        return false;
      }

      // 5. Filter by Date range
      if (dateRange.from && r.date < dateRange.from) {
        return false;
      }
      if (dateRange.to && r.date > dateRange.to) {
        return false;
      }

      return true;
    });
  }, [records, searchQuery, selectedCategory, selectedStudentId, selectedSectionId, dateRange]);

  // Analytics Math
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    let behavioral = 0;
    let academic = 0;
    let social = 0;
    let attendance = 0;
    let other = 0;
    let interventions = 0;

    filteredRecords.forEach(r => {
      if (r.category === 'behavioral') behavioral++;
      else if (r.category === 'academic') academic++;
      else if (r.category === 'social') social++;
      else if (r.category === 'attendance') attendance++;
      else other++;

      if (r.actionTaken && r.actionTaken.trim() !== '') {
        interventions++;
      }
    });

    return { total, behavioral, academic, social, attendance, other, interventions };
  }, [filteredRecords]);

  // Category Colors Helper
  const getCategoryDetails = (cat: AnecdotalRecord['category']) => {
    switch (cat) {
      case 'behavioral':
        return {
          title: 'Behavioral',
          color: 'rose',
          bg: 'bg-rose-50 border-rose-100 text-rose-700',
          badgeBg: 'bg-rose-600 text-white',
          dot: 'bg-rose-500'
        };
      case 'academic':
        return {
          title: 'Academic',
          color: 'violet',
          bg: 'bg-violet-50 border-violet-100 text-violet-700',
          badgeBg: 'bg-violet-600 text-white',
          dot: 'bg-violet-500'
        };
      case 'social':
        return {
          title: 'Social/Emotional',
          color: 'blue',
          bg: 'bg-blue-50 border-blue-100 text-blue-700',
          badgeBg: 'bg-blue-600 text-white',
          dot: 'bg-blue-500'
        };
      case 'attendance':
        return {
          title: 'Attendance',
          color: 'amber',
          bg: 'bg-amber-50 border-amber-100 text-amber-700',
          badgeBg: 'bg-amber-600 text-white',
          dot: 'bg-amber-500'
        };
      default:
        return {
          title: 'Other Context',
          color: 'slate',
          bg: 'bg-slate-100 border-slate-200 text-slate-700',
          badgeBg: 'bg-slate-600 text-white',
          dot: 'bg-slate-500'
        };
    }
  };

  // EXPORT TO EXCEL ROUTINE
  const exportToExcel = () => {
    if (filteredRecords.length === 0) {
      alert("No records to export.");
      return;
    }

    const dataToExport = filteredRecords.map((r, idx) => ({
      'No.': idx + 1,
      'Date': r.date,
      'Time': r.time || 'N/A',
      'Learner Name': r.studentName,
      'Class Section': r.sectionName,
      'Category': r.category.toUpperCase(),
      'Subject Context': r.subjectName || 'N/A',
      'Observation Details': r.observation,
      'Action Taken / Interventions': r.actionTaken || 'None',
      'Recorded By': r.createdByName || r.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anecdotal Records Summary");
    
    // Auto-fit column widths
    const maxLens = Object.keys(dataToExport[0] || {}).map(key => {
      let max = key.length;
      dataToExport.forEach(row => {
        const val = String((row as any)[key] || '');
        if (val.length > max) max = val.length;
      });
      return { wch: Math.min(60, max + 3) };
    });
    ws['!cols'] = maxLens;

    XLSX.writeFile(wb, `CLASS_Anecdotal_Records_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // EXPORT TO PDF ROUTINE
  const exportToPDF = async () => {
    if (filteredRecords.length === 0) {
      alert("No anecdotal records found to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const activeSectionObj = sections.find(s => s.id === selectedSectionId);
    const filterContextLabel = activeSectionObj 
      ? `Class Section: ${activeSectionObj.name}` 
      : "All Managed Classes";

    // Build elegant document header
    doc.setFillColor(79, 70, 229); // Royal Indigo banner
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 38, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CLASS ENTERPRISE PORTAL", 15, 14);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("CENTRALIZED DIGITAL ANECDOTAL RECORDS REPORT", 15, 20);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | Scope: ${filterContextLabel}`, 15, 26);
    doc.text(`Total Observations Logged: ${filteredRecords.length}`, 15, 32);

    let startY = 46;
    const pageHeight = doc.internal.pageSize.getHeight();

    // Iterate observations and list nicely
    filteredRecords.forEach((r, idx) => {
      // Check if we need a new page (each card is about 40mm tall)
      if (startY + 45 > pageHeight) {
        doc.addPage();
        startY = 20;
      }

      // Draw subtle card border
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(12, startY, 186, 38, 2, 2, 'FD');

      // Index and Category Tag
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229);
      doc.text(`#${idx + 1}   |   ${r.studentName.toUpperCase()}`, 16, startY + 6);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont("Helvetica", "bold");
      doc.text(`CATEGORY: ${r.category.toUpperCase()}  |  CLASS: ${r.sectionName}  |  DATE: ${r.date} ${r.time ? `@ ${r.time}` : ''}`, 16, startY + 12);

      if (r.subjectName) {
        doc.text(`SUBJECT CONTEXT: ${r.subjectName}`, 16, startY + 16);
      }

      // Text observations split lines to prevent text-bleeding out of the A4 page limits
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59); // slate-800
      
      const detailsText = `OBSERVATION: ${r.observation}`;
      const splitDetails = doc.splitTextToSize(detailsText, 176);
      doc.text(splitDetails, 16, startY + (r.subjectName ? 21 : 18));

      // Action line
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129); // emerald-600
      const actionText = `INTERVENTIONS LOGGED: ${r.actionTaken || 'None recorded yet.'}`;
      const splitActions = doc.splitTextToSize(actionText, 176);
      doc.text(splitActions, 16, startY + (r.subjectName ? 30 : 28));

      // Logger info
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Logged by: ${r.createdByName || 'Staff member'}`, 16, startY + 35);

      startY += 43; // spacing to next card
    });

    // Save document
    doc.save(`CLASS_Digital_Anecdotal_ClassReport_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* Top Banner Context Title */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 md:px-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 border border-indigo-150 p-2 rounded-xl text-indigo-600 shadow-inner">
              <MessageSquare size={18} />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                Anecdotal Records Tracker
              </h1>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">
                Manage behavioral, academic, social and classroom developmental evaluations
              </span>
            </div>
          </div>
        </div>

        {/* CTA Actions */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={openNewRecordForm}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Add Behavioral Record</span>
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {/* Analytics Bento Area */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Logs Logged</span>
              <p className="text-2xl md:text-3xl font-black text-indigo-700 leading-tight mt-1">{stats.total}</p>
              <span className="text-[9px] font-medium text-slate-500 block mt-1">all categorized incidents</span>
            </div>
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <BarChart2 size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Behavioral Incidents</span>
              <p className="text-2xl md:text-3xl font-black text-rose-600 leading-tight mt-1">{stats.behavioral}</p>
              <span className="text-[9px] font-medium text-rose-400 block mt-1">requiring counselor alignment</span>
            </div>
            <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider block">Academic Progress</span>
              <p className="text-2xl md:text-3xl font-black text-violet-600 leading-tight mt-1">{stats.academic}</p>
              <span className="text-[9px] font-medium text-slate-500 block mt-1">learning curves context</span>
            </div>
            <div className="h-10 w-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block">Interventions Done</span>
              <p className="text-2xl md:text-3xl font-black text-emerald-600 leading-tight mt-1">{stats.interventions}</p>
              <span className="text-[9px] font-medium text-emerald-500 block mt-1">resolved active cases</span>
            </div>
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search observation notes or names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold tracking-tight text-slate-700 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Inline filters */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">📁 All Incident Categories</option>
                <option value="behavioral">⚠️ Behavioral Issues</option>
                <option value="academic">📚 Academic Concerns</option>
                <option value="social">🤝 Social-Emotional Traits</option>
                <option value="attendance">📅 Attendance Observations</option>
                <option value="other">💬 Other Contexts Details</option>
              </select>

              {/* Class Section Filter */}
              <select
                value={selectedSectionId}
                onChange={(e) => {
                  setSelectedSectionId(e.target.value);
                  setSelectedStudentId('all'); // Clear student filter when section updates
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">⭐ All Managed Sections</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>Class: {s.name} ({s.schoolYear})</option>
                ))}
              </select>

              {/* Individual Student Filter */}
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
              >
                <option value="all">👤 Filter by Learner (All)</option>
                {allStudents.map(s => (
                  <option key={s.id} value={s.id}>{formatStudentName(s)}</option>
                ))}
              </select>

              {/* Reset triggers */}
              {(searchQuery || selectedCategory !== 'all' || selectedStudentId !== 'all' || selectedSectionId !== 'all' || dateRange.from || dateRange.to) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedStudentId('all');
                    setSelectedSectionId(selectedSection?.id || 'all');
                    setDateRange({ from: '', to: '' });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold rounded-xl transition-all"
                  title="Clear Filters"
                >
                  <X size={14} />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>

            {/* Exporting Suite */}
            <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-xl transition-all shadow-sm active:scale-95"
                title="Download Class PDF Record Report"
              >
                <Printer size={14} className="text-rose-600" />
                <span className="hidden sm:inline">PDF Summary</span>
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-xl transition-all shadow-sm active:scale-95"
                title="Export Class Excel Report"
              >
                <Download size={14} className="text-emerald-600" />
                <span className="hidden sm:inline">Excel Export</span>
              </button>
            </div>
          </div>

          {/* Date Picker Range fields */}
          <div className="flex items-center gap-3 bg-[#fafafa]/50 p-2.5 rounded-xl border border-slate-100/80 text-[11px] font-semibold text-slate-500">
            <span className="uppercase tracking-wider flex items-center gap-1 text-[10px] text-slate-400">
              <Calendar size={12} />
              Filter by Date range:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="px-2 py-1 border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="px-2 py-1 border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Main Records Incident Feed */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          {loading ? (
            <div className="py-24 text-center text-slate-500 font-bold tracking-widest uppercase flex flex-col items-center justify-center animate-pulse">
              <MessageSquare size={36} className="text-slate-300 mb-4 animate-bounce" />
              Loading anecdotal logs...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-24 text-center text-slate-550 font-medium flex flex-col items-center justify-center">
              <AlertCircle size={42} className="text-indigo-200 mb-4" />
              <p className="font-extrabold text-slate-600 uppercase tracking-wider text-sm">No Observation Records Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                No observations match the current filter selection, or no behaviors have been logged yet for students in this class.
              </p>
              <button
                onClick={openNewRecordForm}
                className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                Log First Anecdotal Observation
              </button>
            </div>
          ) : (
            <div className="relative border-l border-slate-100 pl-6 ml-4 space-y-6">
              {filteredRecords.map((r, index) => {
                const catInfo = getCategoryDetails(r.category);
                const isCreator = r.createdBy === currentUser?.uid;
                const isSystemAdmin = userProfile?.role === 'system_admin' || userProfile?.role === 'admin';
                const matchingSection = sections.find(s => s.id === r.sectionId);
                const isAdviserOfThisSection = (matchingSection?.adviserEmail || "").trim().toLowerCase() === (currentUser?.email || userProfile?.email || "").trim().toLowerCase();
                const canEdit = isCreator;
                const canDelete = isCreator || isSystemAdmin || isAdviserOfThisSection;

                return (
                  <div key={r.id} className="relative group/timeline-card">
                    {/* Circle dot Indicator */}
                    <span className={`absolute -left-[31px] top-4 w-2.5 h-2.5 rounded-full ${catInfo.dot} border-[3px] border-white shadow ring-2 ring-slate-100 transition-transform group-hover/timeline-card:scale-125 z-10`} />

                    {/* Incident Card */}
                    <div className="p-5 bg-[#fafafa]/80 hover:bg-white border border-slate-100/60 hover:border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-start justify-between gap-4">
                      
                      {/* Left Column Content */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                            {r.studentName}
                          </h4>
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            ID: {r.id.substring(0, 5).toUpperCase()}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border ${catInfo.bg}`}>
                            {catInfo.title}
                          </span>
                          {r.subjectName && (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded">
                              <BookOpen size={10} />
                              Subject: {r.subjectName}
                            </span>
                          )}
                        </div>

                        {/* Metadata Line */}
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-300" />
                            {r.date}
                          </span>
                          {r.time && (
                            <span className="flex items-center gap-1 border-l border-slate-200 pl-3">
                              <Clock size={12} className="text-slate-300" />
                              {r.time}
                            </span>
                          )}
                          <span className="border-l border-slate-200 pl-3">
                            Class: <strong className="text-slate-500">{r.sectionName}</strong>
                          </span>
                        </div>

                        {/* Note Paragraph Content */}
                        <div className="space-y-2 bg-white/70 p-3 rounded-xl border border-slate-100/50">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Observation Notes:</span>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap mt-1">
                              {r.observation}
                            </p>
                          </div>
                          
                          {r.actionTaken && (
                            <div className="border-t border-slate-100 pt-2.5 mt-2">
                              <span className="text-[9px] font-bold text-emerald-500 block uppercase tracking-wider">Action Taken / Resolution:</span>
                              <p className="text-xs text-slate-600 leading-relaxed font-semibold italic mt-1">
                                {r.actionTaken}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Informational Author Indicator */}
                        <div className="flex items-center gap-1 px-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          <span className="inline-block w-4 h-4 bg-slate-100 text-slate-500 rounded-full text-center text-[8px] leading-4 mr-1">
                            {r.createdByName?.charAt(0).toUpperCase() || 'T'}
                          </span>
                          Recorded by {r.createdByName}
                        </div>
                      </div>

                      {/* Right Column Context Controls */}
                      <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end gap-2 self-end md:self-start md:border-l md:border-slate-100 md:pl-4">
                        {(() => {
                          const matchingSection = sections.find(s => s.id === r.sectionId);
                          const userRole = currentUser?.role || userProfile?.role;
                          const isAdviserOfThisSection = (matchingSection?.adviserEmail || "").trim().toLowerCase() === (currentUser?.email || userProfile?.email || "").trim().toLowerCase();
                          const isAuthorizedRole = userRole === 'school_head' || userRole === 'guidance_designate' || isAdviserOfThisSection;
                          
                          if (isAuthorizedRole) {
                            return (
                              <button
                                onClick={() => {
                                  setReadRecord(r);
                                  setReadActionTaken(r.actionTaken || '');
                                }}
                                className="px-3 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 hover:border-rose-300 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                              >
                                <FileText size={13} />
                                <span>Read & Open</span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                        
                        <div className="flex items-center gap-1.5 justify-end">
                            {canEdit && (
                              <button
                                onClick={() => initiateEdit(r)}
                                className="p-2 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all shadow-sm active:scale-95"
                                title="Edit Record"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteConfirmId(r.id)}
                                className="p-2 text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl transition-all shadow-sm active:scale-95"
                                title="Delete Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                );

              })}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Right Overlay Form */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="fixed inset-0 bg-black z-[110]"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[120] flex flex-col outline-none overflow-hidden border-l border-slate-200"
            >
              {/* Slideover Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 tracking-tight text-sm uppercase">
                      {editingRecord ? "Edit Observation Record" : "Log Anecdotal Observation"}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {editingRecord ? `Updating Record ID: ${editingRecord.id.substring(0, 5).toUpperCase()}` : "Log behavioral and educational developments"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeForm}
                  className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-900 bg-white transition-all shadow-sm"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Content Scroll Section */}
              <form onSubmit={handleSaveRecord} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                
                {/* Select Section context (For cross-selection) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Class Section</label>
                  <select
                    disabled={!!editingRecord}
                    value={formSectionId}
                    onChange={(e) => {
                      setFormSectionId(e.target.value);
                      setFormStudentId(''); // reset selection
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-slate-50 disabled:opacity-50"
                  >
                    <option value="">-- Select Section Class --</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.schoolYear})</option>
                    ))}
                  </select>
                </div>

                {/* Select Student / Learner */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Learner Name</label>
                  <select
                    required
                    disabled={!!editingRecord || !!preselectedStudent}
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-slate-50 disabled:opacity-50"
                  >
                    <option value="">-- Choose Student --</option>
                    {formStudents.map(s => (
                      <option key={s.id} value={s.id}>{formatStudentName(s)} ({s.lrn || 'N/A'})</option>
                    ))}
                  </select>
                  {preselectedStudent && (
                    <span className="text-[9px] font-black text-indigo-500 uppercase mt-1 block">
                      Target Learner Locked: {formatStudentName(preselectedStudent)}
                    </span>
                  )}
                </div>

                {/* Submitting Date & Time Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Date of incident</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input
                        required
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Time (Optional)</label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Incident Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'behavioral', label: 'Behavioral Issues', border: 'border-rose-200', text: 'text-rose-700', activeBg: 'bg-rose-50' },
                      { value: 'academic', label: 'Academic Curve', border: 'border-violet-200', text: 'text-violet-700', activeBg: 'bg-violet-50' },
                      { value: 'social', label: 'Social-Emotional', border: 'border-blue-200', text: 'text-blue-700', activeBg: 'bg-blue-50' },
                      { value: 'attendance', label: 'Attendance', border: 'border-amber-200', text: 'text-amber-700', activeBg: 'bg-amber-50' },
                      { value: 'other', label: 'Other Traits', border: 'border-slate-200', text: 'text-slate-700', activeBg: 'bg-slate-50' }
                    ].map(item => (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => setFormCategory(item.value as any)}
                        className={`px-3 py-2.5 rounded-xl border-2 text-[11px] font-bold text-left transition-all relative ${
                          formCategory === item.value 
                            ? `${item.activeBg} ${item.border} ${item.text} scale-102 ring-2 ring-indigo-50/50` 
                            : 'bg-white border-slate-100/80 text-slate-500 hover:bg-slate-50/50'
                        }`}
                      >
                        <span className="block">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Subject Context */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Subject Context (Optional)</label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  >
                    <option value="">-- No Subject Context --</option>
                    {formSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                {/* Observation Narrative Area */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Observation Details / Narrative</label>
                  <textarea
                    required
                    rows={4}
                    value={formObservation}
                    onChange={(e) => setFormObservation(e.target.value)}
                    placeholder="Provide a clear, unbiased depiction of the student's behavior, academic achievement, attendance issue, or general school progression..."
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs focus:ring-2 focus:ring-indigo-500 font-semibold bg-slate-50 text-slate-700"
                  />
                </div>

                {/* Submissions Action CTA Bar */}
                <div className="pt-4 border-t border-slate-200 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 text-center cursor-pointer"
                  >
                    {editingRecord ? "Save observation" : "Save Record entry"}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </motion.div>
          </>
        )}

        {/* Read & Open Modal */}
        {readRecord && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setReadRecord(null);
                setReadActionTaken('');
              }}
              className="fixed inset-0 bg-black z-[110]"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[120] flex flex-col outline-none overflow-hidden border-l border-slate-200"
            >
              {/* Slideover Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
                    <FileText size={16} />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 tracking-tight text-xs uppercase">
                      Observation Detail
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Inc. ID: {readRecord.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReadRecord(null);
                    setReadActionTaken('');
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-900 bg-white transition-all shadow-sm cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Slideover Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-black text-rose-900 uppercase">
                        {readRecord.studentName}
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                        Class: {readRecord.sectionName}
                      </p>
                    </div>
                    <span className="text-[8px] font-black bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider h-fit">
                      {readRecord.category}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Observation Notes:</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap">
                      {readRecord.observation}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide border-t border-slate-100 pt-2">
                    <span>Date: {readRecord.date}</span>
                    {readRecord.time && <span>Time: {readRecord.time}</span>}
                    <span>By: {readRecord.createdByName || 'Staff'}</span>
                  </div>
                </div>

                {/* ACTION TAKEN / INTERVENTIONS CONDUCTED */}
                {(() => {
                  const matchingSection = sections.find(s => s.id === readRecord.sectionId);
                  const userRole = currentUser?.role || userProfile?.role;
                  const isAdviserOfThisSection = (matchingSection?.adviserEmail || "").trim().toLowerCase() === (currentUser?.email || userProfile?.email || "").trim().toLowerCase();
                  const canSaveAction = readRecord.createdBy === currentUser?.uid || isAdminOrSysAdmin || isAdviserOfThisSection || userRole === 'school_head' || userRole === 'guidance_designate';

                  return (
                    <form onSubmit={handleSaveActionTakenInRead} className="space-y-4 border-t border-slate-150 pt-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Action Taken / Interventions Conducted
                        </label>
                        {!canSaveAction ? (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold italic">
                            {readRecord.actionTaken ? readRecord.actionTaken : "No action taken has been documented yet."}
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 not-italic select-none">
                              * Only Class Advisers, creators, or administrators can document interventions.
                            </p>
                          </div>
                        ) : (
                          <>
                            <span className="text-[9px] text-slate-400 block mb-2 leading-tight">
                              Document what steps, parental consultations, counseling sessions, or guidance procedures were took.
                            </span>
                            <textarea
                              required
                              rows={4}
                              value={readActionTaken}
                              onChange={(e) => setReadActionTaken(e.target.value)}
                              placeholder="Describe counseling, family conferences, disciplinary referrals, or follow-up actions..."
                              className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-slate-50 text-slate-700 focus:bg-white focus:ring-2 focus:ring-rose-500/10 focus:border-rose-300 transition-all font-mono"
                            />
                            
                            <button
                              type="submit"
                              disabled={isSavingIntervention}
                              className="w-full py-2.5 mt-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-md active:scale-95 text-center cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {isSavingIntervention ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={14} />
                                  <span>Save Action Taken</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </form>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="fixed inset-0 bg-slate-900 bg-opacity-65 backdrop-blur-xs z-[130]"
            />

            {/* Modal Window wrapper to center it perfectly */}
            <div className="fixed inset-0 overflow-y-auto z-[140] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
              >
                <div className="p-6 text-center">
                  {/* Warning Icon accent */}
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-100/50 shadow-inner">
                    <AlertTriangle size={24} className="animate-pulse text-rose-500" />
                  </div>

                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Confirm Permanent Deletion
                  </h3>
                  
                  <p className="text-[11px] text-slate-500 font-bold mt-2 leading-relaxed">
                    Are you sure you want to permanently delete this anecdotal record? This response is irreversible and will remove this observation log from the database history.
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50/80 px-6 py-4 flex flex-col gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(deleteConfirmId)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-center"
                  >
                    Permanently Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 text-xs font-bold rounded-xl transition-all active:scale-95 text-center cursor-pointer"
                  >
                    Keep Record
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
