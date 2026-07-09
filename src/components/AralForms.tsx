import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  AralSchoolInfo, 
  AralLearner, 
  AralSession, 
  AralCompetency, 
  AralRole 
} from './AralData';
import { 
  FileText, 
  Users, 
  Calendar, 
  TrendingUp, 
  Activity, 
  FileSignature, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Printer, 
  Search, 
  ArrowRight, 
  CheckCircle, 
  ChevronLeft, 
  Award, 
  HelpCircle,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

const mapStudentToAralInput = (student: any, sectionName: string = "") => {
  let last = student.lastName || "";
  let first = student.firstName || "";
  let middle = student.middleName || "";
  
  if (!last && !first && student.name) {
    const parts = student.name.split(',');
    if (parts.length > 1) {
      last = parts[0].trim();
      const firstParts = parts[1].trim().split(' ');
      if (firstParts.length > 1) {
        first = firstParts.slice(0, firstParts.length - 1).join(' ');
        middle = firstParts[firstParts.length - 1];
      } else {
        first = parts[1].trim();
      }
    } else {
      const spaceParts = student.name.trim().split(' ');
      if (spaceParts.length > 1) {
        first = spaceParts[0];
        last = spaceParts.slice(1).join(' ');
      } else {
        first = student.name;
      }
    }
  }

  const parent = student.guardianName || student.fatherName || student.motherName || "";
  const contact = student.contactNumber || "";
  
  return {
    lrn: student.lrn || "",
    lastName: last,
    firstName: first,
    middleName: middle,
    extension: student.extension || "",
    gradeLevel: student.gradeLevel ? `Grade ${student.gradeLevel}` : "Grade 7",
    section: sectionName || student.sectionName || "Sampaguita",
    sex: student.sex === "Female" ? "Female" as const : "Male" as const,
    birthdate: student.birthdate || "2013-01-01",
    parentName: parent,
    parentContact: contact,
    learningNeeds: "",
    initialAssessment: "",
    teacherRecommendation: "",
    program: 'Aral Basic' as const
  };
};

interface AralFormsProps {
  schoolInfo: AralSchoolInfo;
  learners: AralLearner[];
  onAddLearner: (l: AralLearner) => void;
  onUpdateLearner: (l: AralLearner) => void;
  onDeleteLearner: (id: string) => void;
  sessions: AralSession[];
  onAddSession: (s: AralSession) => void;
  competencies: AralCompetency[];
  activeRole: AralRole;
  enrolledStudents?: any[];
  selectedSection?: any;
  sections?: any[];
}

export const AralForms: React.FC<AralFormsProps> = ({
  schoolInfo,
  learners,
  onAddLearner,
  onUpdateLearner,
  onDeleteLearner,
  sessions,
  onAddSession,
  competencies,
  activeRole,
  enrolledStudents = [],
  selectedSection = null,
  sections = []
}) => {
  const [activeFormTab, setActiveFormTab] = useState<number>(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(learners[0]?.id || '');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Signature Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form Modals states
  const [showAddLearnerModal, setShowAddLearnerModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [editingLearner, setEditingLearner] = useState<AralLearner | null>(null);

  // Form input states
  const [newLearnerInput, setNewLearnerInput] = useState({
    lrn: '',
    lastName: '',
    firstName: '',
    middleName: '',
    extension: '',
    gradeLevel: 'Grade 7',
    section: 'Sampaguita',
    sex: 'Male' as 'Male' | 'Female',
    birthdate: '2013-01-01',
    parentName: '',
    parentContact: '',
    learningNeeds: '',
    initialAssessment: '',
    teacherRecommendation: '',
    program: 'Aral Basic' as 'Aral Basic' | 'Aral Plus'
  });

  const [newSessionInput, setNewSessionInput] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: 'Mathematics',
    gradeLevel: 'Grade 7',
    section: 'Sampaguita',
    competencyId: competencies[0]?.id || '',
    activities: '',
    presentCount: 2,
    reflection: '',
    challenges: '',
    intervention: '',
    teacherName: 'Teacher Karen Villena'
  });

  // Automatically update selected student ID if list changes and current is empty
  useEffect(() => {
    if (!selectedStudentId && learners.length > 0) {
      setSelectedStudentId(learners[0].id);
    }
  }, [learners, selectedStudentId]);

  const selectedLearnerObj = useMemo(() => {
    return learners.find(l => l.id === selectedStudentId);
  }, [learners, selectedStudentId]);

  const isCustomSec = useMemo(() => {
    if (!sections || sections.length === 0) return true;
    if (!newLearnerInput.section) return false;
    return !sections.some(s => s.name === newLearnerInput.section);
  }, [sections, newLearnerInput.section]);

  const isCustomSessionSec = useMemo(() => {
    if (!sections || sections.length === 0) return true;
    if (!newSessionInput.section) return false;
    return !sections.some(s => s.name === newSessionInput.section);
  }, [sections, newSessionInput.section]);

  // Unique sections list
  const uniqueSections = useMemo(() => {
    const secs = new Set<string>();
    learners.forEach(l => { if (l.section) secs.add(l.section); });
    return Array.from(secs);
  }, [learners]);

  // Filtered learners
  const filteredLearners = useMemo(() => {
    return learners.filter(l => {
      const matchesSection = selectedSectionFilter === 'All' || l.section === selectedSectionFilter;
      const fullName = `${l.firstName} ${l.middleName} ${l.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || l.lrn.includes(searchQuery);
      return matchesSection && matchesSearch;
    });
  }, [learners, selectedSectionFilter, searchQuery]);

  // Sync default form inputs with selected section and competencies
  useEffect(() => {
    if (selectedSection) {
      setNewLearnerInput(prev => ({
        ...prev,
        section: selectedSection.name || prev.section,
        gradeLevel: selectedSection.gradeLevel ? `Grade ${selectedSection.gradeLevel}` : prev.gradeLevel
      }));

      setNewSessionInput(prev => ({
        ...prev,
        section: selectedSection.name || prev.section,
        gradeLevel: selectedSection.gradeLevel ? `Grade ${selectedSection.gradeLevel}` : prev.gradeLevel,
        competencyId: competencies[0]?.id || prev.competencyId,
        teacherName: selectedSection.adviserName || prev.teacherName
      }));
    }
  }, [selectedSection, competencies]);

  // -------------------------------------------------------------
  // CANVAS SIGNATURE BOARD CONTROLS (Form 7)
  // -------------------------------------------------------------
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    const { x, y } = getCoordinates(e);
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#002060';
    setIsDrawing(true);
    e.preventDefault();
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedLearnerObj) return;
    const signatureData = canvas.toDataURL('image/png');
    onUpdateLearner({
      ...selectedLearnerObj,
      consentSigned: true,
      consentSignature: signatureData,
      consentDate: new Date().toISOString().split('T')[0]
    });
    alert(`E-Signature captured and saved successfully for ${selectedLearnerObj.firstName}!`);
  };

  // -------------------------------------------------------------
  // EXPORTS & PRINTS HANDLERS
  // -------------------------------------------------------------
  const exportMasterlistExcel = () => {
    const exportData = filteredLearners.map((l, index) => ({
      'No.': index + 1,
      'LRN': l.lrn,
      'Last Name': l.lastName,
      'First Name': l.firstName,
      'Middle Name': l.middleName,
      'Grade Level': l.gradeLevel,
      'Section': l.section,
      'Gender': l.sex,
      'Parent Name': l.parentName,
      'Parent Contact': l.parentContact,
      'Status': l.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ARAL Form 1 Masterlist");
    XLSX.writeFile(wb, `ARAL_Form_1_Masterlist_${schoolInfo.schoolYear}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // -------------------------------------------------------------
  // CRUD SUBMISSIONS
  // -------------------------------------------------------------
  const handleAddLearnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newL: AralLearner = {
      id: `learner-${Date.now()}`,
      ...newLearnerInput,
      status: 'Identified',
      consentSigned: false,
      preTestScore: 0,
      postTestScore: 0,
      attendance: {},
      progressRemarks: {}
    };
    onAddLearner(newL);
    setShowAddLearnerModal(false);
    // Reset
    setNewLearnerInput({
      lrn: '',
      lastName: '',
      firstName: '',
      middleName: '',
      extension: '',
      gradeLevel: 'Grade 7',
      section: 'Sampaguita',
      sex: 'Male',
      birthdate: '2013-01-01',
      parentName: '',
      parentContact: '',
      learningNeeds: '',
      initialAssessment: '',
      teacherRecommendation: '',
      program: 'Aral Basic'
    });
  };

  const handleAddSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newS: AralSession = {
      id: `session-${Date.now()}`,
      ...newSessionInput
    };
    onAddSession(newS);
    setShowAddSessionModal(false);
  };

  const isEditable = activeRole === 'Admin' || activeRole === 'ARAL Coordinator' || activeRole === 'Teacher';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      {/* SIDEBAR FOR FORM SELECTOR */}
      <div className="xl:col-span-1 space-y-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
            ARAL Form Registry (Memorandum Compliant)
          </span>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 1, name: "ARAL Form 1", desc: "Learner Masterlist", icon: <Users size={15} /> },
              { id: 2, name: "ARAL Form 2", desc: "Learner Profile & Needs", icon: <FileText size={15} /> },
              { id: 3, name: "ARAL Form 3", desc: "Attendance Monitoring", icon: <Calendar size={15} /> },
              { id: 4, name: "ARAL Form 4", desc: "Session Log Sheets", icon: <Clock size={15} /> },
              { id: 5, name: "ARAL Form 5", desc: "Pre/Post Assessment", icon: <TrendingUp size={15} /> },
              { id: 6, name: "ARAL Form 6", desc: "Progress Reports", icon: <Activity size={15} /> },
              { id: 7, name: "ARAL Form 7", desc: "Parent Consent Form", icon: <FileSignature size={15} /> },
              { id: 8, name: "ARAL Form 8", desc: "Accomplishment Reports", icon: <FileText size={15} /> },
              { id: 9, name: "ARAL Form 9", desc: "Completion Summary", icon: <Award size={15} /> },
              { id: 10, name: "ARAL Form 10", desc: "Consolidated Statistics", icon: <TrendingUp size={15} /> }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFormTab(f.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
                  activeFormTab === f.id
                    ? 'bg-[#002060] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#002060]'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activeFormTab === f.id ? 'bg-white/15 text-yellow-300' : 'text-slate-400'}`}>
                  {f.icon}
                </div>
                <div className="leading-tight">
                  <span className="text-xs font-black block">{f.name}</span>
                  <span className={`text-[10px] ${activeFormTab === f.id ? 'text-blue-100' : 'text-slate-400'}`}>{f.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* SELECT STUDENT FOR INDIVIDUAL FORMS */}
        {[2, 7, 9].includes(activeFormTab) && (
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
            <label className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
              Focus Learner Selection
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 outline-none transition-all"
            >
              {learners.map(l => (
                <option key={l.id} value={l.id}>
                  {l.lastName}, {l.firstName} ({l.lrn})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* CORE FORM VIEWS */}
      <div className="xl:col-span-3 space-y-6">
        
        {/* UPPER TITLE & GENERAL TOOLBAR */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-[#002060] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
              ARAL Form {activeFormTab}
            </span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">
              {activeFormTab === 1 && "ARAL Form 1 – Remedial Learner Masterlist"}
              {activeFormTab === 2 && "ARAL Form 2 – Comprehensive Learner Profile"}
              {activeFormTab === 3 && "ARAL Form 3 – Attendance Monitoring Sheet"}
              {activeFormTab === 4 && "ARAL Form 4 – Remedial Session Log Registry"}
              {activeFormTab === 5 && "ARAL Form 5 – Diagnostic Pre-Test & Post-Test"}
              {activeFormTab === 6 && "ARAL Form 6 – Individual Learner Progress Logs"}
              {activeFormTab === 7 && "ARAL Form 7 – Official Parent Consent Letter"}
              {activeFormTab === 8 && "ARAL Form 8 – Weekly Accomplishment Report"}
              {activeFormTab === 9 && "ARAL Form 9 – Student Program Completion Report"}
              {activeFormTab === 10 && "ARAL Form 10 – School Consolidated Statistics"}
            </h2>
          </div>
          <div className="flex gap-2 shrink-0">
            {activeFormTab === 1 && (
              <button 
                onClick={exportMasterlistExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow"
              >
                <Download size={14} />
                Export Excel
              </button>
            )}
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
            >
              <Printer size={14} />
              Print Form
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------
            FORM 1: LEARNER MASTERLIST
            ------------------------------------------------------------- */}
        {activeFormTab === 1 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            {enrolledStudents.length > 0 && learners.length === 0 && (
              <div className="p-5 bg-indigo-50/70 border border-indigo-100/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                      Auto-Populate ARAL with Section Learners
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                    We detected <b>{enrolledStudents.length} students</b> in your active advisory class section <b>{selectedSection?.name || ""}</b>. You can instantly import them to auto-initialize DepEd ARAL Forms.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to import all ${enrolledStudents.length} students into the ARAL Program masterlist?`)) {
                      enrolledStudents.forEach(student => {
                        const mapped = mapStudentToAralInput(student, selectedSection?.name);
                        const newL: AralLearner = {
                          id: `learner-${student.id || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                          ...mapped,
                          status: 'Identified',
                          consentSigned: false,
                          preTestScore: 0,
                          postTestScore: 0,
                          attendance: {},
                          progressRemarks: {}
                        };
                        onAddLearner(newL);
                      });
                      alert(`Successfully imported ${enrolledStudents.length} students into ARAL masterlist!`);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition-all shadow"
                >
                  Bulk Import Learners ({enrolledStudents.length})
                </button>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-3 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by Name or LRN..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-100 focus:border-[#002060] rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all"
                  />
                </div>
                <select
                  value={selectedSectionFilter}
                  onChange={e => setSelectedSectionFilter(e.target.value)}
                  className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2"
                >
                  <option value="All">All Sections</option>
                  {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {isEditable && (
                <button
                  onClick={() => setShowAddLearnerModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  <Plus size={14} />
                  Identify Learner
                </button>
              )}
            </div>

            {/* Print Friendly Form Layout container */}
            <div className="print:block border border-slate-100 rounded-2xl overflow-x-auto">
              {/* PRINT HEADER DEPED */}
              <div className="hidden print:block text-center py-6 border-b border-slate-200 space-y-1">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-widest">Republic of the Philippines</span>
                <h4 className="text-sm font-black text-slate-800 uppercase">Department of Education</h4>
                <p className="text-xs font-bold text-slate-600">{schoolInfo.region} • {schoolInfo.division}</p>
                <p className="text-xs font-medium text-slate-500">School ID: {schoolInfo.schoolId} • {schoolInfo.schoolName}</p>
                <h3 className="text-base font-black text-[#002060] pt-2">ARAL Form 1 – Remedial Learner Masterlist</h3>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">LRN</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Grade/Section</th>
                    <th className="p-3">Parent Name & Contact</th>
                    <th className="p-3">Consent</th>
                    <th className="p-3">Diagnostic (Pre/Post)</th>
                    <th className="p-3">Status</th>
                    {isEditable && <th className="p-3 text-center print:hidden">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {filteredLearners.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-800">{l.lrn}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800">{l.lastName}, {l.firstName} {l.middleName}</span>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider">{l.sex}</span>
                      </td>
                      <td className="p-3">
                        <span className="block text-slate-700 font-bold">{l.gradeLevel}</span>
                        <span className="text-[10px] text-slate-400 block">Section {l.section}</span>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                          l.program === 'Aral Plus'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}>
                          {l.program || 'Aral Basic'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="block text-slate-700">{l.parentName}</span>
                        <span className="text-[10px] text-slate-400">{l.parentContact}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          l.consentSigned 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {l.consentSigned ? 'Signed' : 'No Consent'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Pre: {l.preTestScore || '--'}</span>
                          <span className="text-[10px] bg-blue-50 px-1.5 py-0.5 rounded text-[#002060] font-bold">Post: {l.postTestScore || '--'}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded ${
                          l.status === 'Completed' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : l.status === 'Enrolled' 
                            ? 'bg-blue-100 text-blue-800' 
                            : l.status === 'Dropped' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      {isEditable && (
                        <td className="p-3 text-center print:hidden">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingLearner(l);
                                setNewLearnerInput({
                                  lrn: l.lrn,
                                  lastName: l.lastName,
                                  firstName: l.firstName,
                                  middleName: l.middleName,
                                  extension: l.extension || '',
                                  gradeLevel: l.gradeLevel,
                                  section: l.section,
                                  sex: l.sex,
                                  birthdate: l.birthdate,
                                  parentName: l.parentName,
                                  parentContact: l.parentContact,
                                  learningNeeds: l.learningNeeds,
                                  initialAssessment: l.initialAssessment,
                                  teacherRecommendation: l.teacherRecommendation,
                                  program: l.program || 'Aral Basic'
                                });
                                setShowAddLearnerModal(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteLearner(l.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 2: LEARNER PROFILE
            ------------------------------------------------------------- */}
        {activeFormTab === 2 && selectedLearnerObj && (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 max-w-3xl mx-auto">
            
            {/* DEPED HEADER MOCK */}
            <div className="text-center pb-4 border-b border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Republic of the Philippines</span>
              <h4 className="text-xs font-black text-slate-800 uppercase">Department of Education</h4>
              <p className="text-[10px] font-bold text-slate-500">{schoolInfo.region} • {schoolInfo.division}</p>
              <h3 className="text-base font-black text-[#002060] pt-2 uppercase">ARAL Form 2: Comprehensive Learner Profile</h3>
            </div>

            {/* Profile Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">A. Personal Information</span>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Learner Name</span>
                  <strong className="text-slate-800 text-sm">{selectedLearnerObj.firstName} {selectedLearnerObj.middleName} {selectedLearnerObj.lastName} {selectedLearnerObj.extension}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Learner LRN</span>
                  <strong className="text-slate-800 font-mono text-sm">{selectedLearnerObj.lrn}</strong>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Grade & Section</span>
                    <strong className="text-slate-800">{selectedLearnerObj.gradeLevel} - {selectedLearnerObj.section}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Gender</span>
                    <strong className="text-slate-800">{selectedLearnerObj.sex}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">B. Parent / Guardian Information</span>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Parent / Guardian Name</span>
                  <strong className="text-slate-800">{selectedLearnerObj.parentName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Contact Number</span>
                  <strong className="text-slate-800">{selectedLearnerObj.parentContact}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Consent Form Signed</span>
                  <strong className="text-slate-800">{selectedLearnerObj.consentSigned ? "Yes (Electronically Captured)" : "Pending Signature"}</strong>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-4 text-xs text-slate-600">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">C. Diagnostic Needs Assessment</span>
              
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Identified Learning Gaps / Needs</span>
                  <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-700 leading-relaxed mt-1">
                    {selectedLearnerObj.learningNeeds || "No learning gap entered yet."}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Initial Performance Level (Diagnostic Assessment)</span>
                  <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-700 leading-relaxed mt-1">
                    {selectedLearnerObj.initialAssessment || "No initial diagnostic comments logged."}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Teacher Remedial Recommendations</span>
                  <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-[#002060] leading-relaxed mt-1">
                    {selectedLearnerObj.teacherRecommendation || "No recommendation entered."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 3: ATTENDANCE MONITORING
            ------------------------------------------------------------- */}
        {activeFormTab === 3 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Log and review day-to-day attendance for enrolled ARAL learners</p>
              </div>
              <select
                value={selectedSectionFilter}
                onChange={e => setSelectedSectionFilter(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2"
              >
                <option value="All">All Sections</option>
                {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Learner Name</th>
                    {["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06", "2026-07-07"].map(d => (
                      <th key={d} className="p-3 text-center">{new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</th>
                    ))}
                    <th className="p-3 text-center">Auto attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {filteredLearners.filter(l => l.status === 'Identified').map(l => {
                    // Calculate individual attendance percentage
                    const dates = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06", "2026-07-07"];
                    const presentCount = dates.filter(d => l.attendance[d] === 'Present').length;
                    const logCount = dates.filter(d => l.attendance[d] !== undefined).length;
                    const attendancePercent = logCount > 0 ? Math.round((presentCount / logCount) * 100) : 100;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{l.lastName}, {l.firstName}</td>
                        {dates.map(d => (
                          <td key={d} className="p-3 text-center">
                            {isEditable ? (
                              <select
                                value={l.attendance[d] || ''}
                                onChange={e => {
                                  const updated = { ...l.attendance, [d]: e.target.value as any };
                                  onUpdateLearner({ ...l, attendance: updated });
                                }}
                                className={`text-[10px] font-bold px-1.5 py-1 rounded border outline-none ${
                                  l.attendance[d] === 'Present' 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                                    : l.attendance[d] === 'Absent' 
                                    ? 'bg-rose-50 text-rose-800 border-rose-100' 
                                    : 'bg-slate-50 text-slate-500 border-slate-100'
                                }`}
                              >
                                <option value="">-</option>
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Excused">Excused</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                l.attendance[d] === 'Present' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : l.attendance[d] === 'Absent' 
                                  ? 'bg-rose-100 text-rose-800' 
                                  : 'text-slate-400'
                              }`}>
                                {l.attendance[d] || '--'}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="p-3 text-center font-bold text-slate-700">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                            attendancePercent >= 85 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {attendancePercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 4: SESSION LOGS
            ------------------------------------------------------------- */}
        {activeFormTab === 4 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Logging remedial tutoring schedules and learning competencies covered</p>
              </div>
              {isEditable && (
                <button
                  onClick={() => setShowAddSessionModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  <Plus size={14} />
                  Log Remedial Session
                </button>
              )}
            </div>

            <div className="space-y-4">
              {sessions.map((s, idx) => {
                const comp = competencies.find(c => c.id === s.competencyId);
                return (
                  <div key={s.id} className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-3 relative overflow-hidden">
                    <span className="absolute top-0 right-0 px-3 py-1 bg-blue-50 text-[#002060] text-[10px] font-black rounded-bl-xl border-l border-b border-blue-100">
                      Session #{sessions.length - idx}
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-bold uppercase">Date Conducted</span>
                        <strong className="text-slate-800">{s.date}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-bold uppercase">Subject</span>
                        <strong className="text-[#002060] font-bold">{s.subject}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-bold uppercase">Target Class</span>
                        <strong className="text-slate-800">{s.gradeLevel} - {s.section}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-bold uppercase">Attendance</span>
                        <strong className="text-emerald-600">{s.presentCount} present</strong>
                      </div>
                    </div>

                    <div className="text-xs space-y-2 pt-1">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-bold uppercase">Competency Covered</span>
                        <p className="font-semibold text-slate-800 leading-relaxed">
                          <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 mr-2">{comp?.code}</span>
                          {comp?.description}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-bold uppercase">Activities Conducted</span>
                        <p className="text-slate-600 font-normal leading-relaxed">{s.activities}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        <div className="p-3 bg-white border border-slate-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Reflection</span>
                          <p className="text-slate-500 font-normal mt-0.5 italic leading-normal">"{s.reflection}"</p>
                        </div>
                        <div className="p-3 bg-white border border-slate-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Challenges</span>
                          <p className="text-rose-600 font-medium mt-0.5 leading-normal">{s.challenges}</p>
                        </div>
                        <div className="p-3 bg-white border border-slate-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Remedial Intervention</span>
                          <p className="text-emerald-700 font-medium mt-0.5 leading-normal">{s.intervention}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 5: PRE-TEST & POST-TEST
            ------------------------------------------------------------- */}
        {activeFormTab === 5 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div>
              <p className="text-xs text-slate-400">Review learning diagnostic growth scores out of 50</p>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Learner</th>
                    <th className="p-3 text-center">Pre-test (out of 50)</th>
                    <th className="p-3 text-center">Post-test (out of 50)</th>
                    <th className="p-3 text-center">Gain Score</th>
                    <th className="p-3 text-center">Improvement %</th>
                    <th className="p-3 text-center">Performance Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {filteredLearners.filter(l => l.status === 'Enrolled' || l.status === 'Completed').map(l => {
                    const gain = Math.max(0, l.postTestScore - l.preTestScore);
                    const improvement = l.preTestScore > 0 ? Math.round((gain / l.preTestScore) * 100) : 0;
                    
                    // Determine performance level
                    let level = "Beginning";
                    let levelColor = "text-rose-600 bg-rose-50";
                    if (l.postTestScore >= 45) {
                      level = "Highly Proficient";
                      levelColor = "text-emerald-600 bg-emerald-50";
                    } else if (l.postTestScore >= 35) {
                      level = "Proficient";
                      levelColor = "text-blue-600 bg-blue-50";
                    } else if (l.postTestScore >= 20) {
                      level = "Developing";
                      levelColor = "text-amber-600 bg-amber-50";
                    }

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{l.lastName}, {l.firstName}</td>
                        <td className="p-3 text-center">
                          {isEditable ? (
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={l.preTestScore}
                              onChange={e => onUpdateLearner({ ...l, preTestScore: parseInt(e.target.value) || 0 })}
                              className="w-16 text-center border border-slate-200 rounded px-1.5 py-1"
                            />
                          ) : (
                            l.preTestScore
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isEditable ? (
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={l.postTestScore}
                              onChange={e => onUpdateLearner({ ...l, postTestScore: parseInt(e.target.value) || 0 })}
                              className="w-16 text-center border border-slate-200 rounded px-1.5 py-1"
                            />
                          ) : (
                            l.postTestScore
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-[#002060]">+{gain}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">+{improvement}%</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${levelColor}`}>
                            {level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 6: INDIVIDUAL PROGRESS LOGS
            ------------------------------------------------------------- */}
        {activeFormTab === 6 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">Target Student:</span>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 outline-none"
                >
                  {learners.map(l => (
                    <option key={l.id} value={l.id}>{l.lastName}, {l.firstName}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedLearnerObj && (
              <div className="space-y-6">
                {/* Form to log progress */}
                {isEditable && (
                  <form 
                    onSubmit={e => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const fd = new FormData(form);
                      const week = parseInt(fd.get('week') as string);
                      const compId = fd.get('competencyId') as string;
                      const intervention = fd.get('intervention') as string;
                      const assessment = fd.get('assessment') as string;
                      const remarks = fd.get('remarks') as string;

                      const updatedRemarks = {
                        ...(selectedLearnerObj.progressRemarks || {}),
                        [week]: { competencyId: compId, intervention, assessment, remarks }
                      };
                      onUpdateLearner({ ...selectedLearnerObj, progressRemarks: updatedRemarks });
                      form.reset();
                      alert("Weekly Progress remarks updated successfully!");
                    }}
                    className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-4"
                  >
                    <span className="text-xs font-black text-slate-700 block uppercase tracking-wide">
                      Log Weekly Progress for {selectedLearnerObj.firstName}
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Remedial Week</label>
                        <select name="week" className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2">
                          {[1,2,3,4,5,6,7,8].map(w => <option key={w} value={w}>Week {w}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Mapped Competency</label>
                        <select name="competencyId" className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2">
                          {competencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.description.slice(0, 40)}...</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Assessment Level</label>
                        <select name="assessment" className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2">
                          <option value="Developing">Developing</option>
                          <option value="Satisfactory">Satisfactory</option>
                          <option value="Highly Proficient">Highly Proficient</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Intervention Strategy</label>
                        <input name="intervention" required placeholder="Describe strategy used..." className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Remarks</label>
                        <input name="remarks" required placeholder="How did the student respond?" className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none" />
                      </div>
                    </div>

                    <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow">
                      Log Progress
                    </button>
                  </form>
                )}

                {/* Progress Logs Table */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="p-3">Remedial Week</th>
                        <th className="p-3">Competency</th>
                        <th className="p-3">Intervention</th>
                        <th className="p-3">Assessment</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                      {Object.entries(selectedLearnerObj.progressRemarks || {}).map(([weekNum, value]: any) => {
                        const comp = competencies.find(c => c.id === value.competencyId);
                        return (
                          <tr key={weekNum} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">Week {weekNum}</td>
                            <td className="p-3">
                              <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mr-2">{comp?.code}</span>
                              <span className="text-slate-500 font-normal">{comp?.description}</span>
                            </td>
                            <td className="p-3 text-slate-500">{value.intervention}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                value.assessment === 'Highly Proficient' 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : value.assessment === 'Satisfactory' 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {value.assessment}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 italic">"{value.remarks}"</td>
                          </tr>
                        );
                      })}
                      {Object.keys(selectedLearnerObj.progressRemarks || {}).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 italic">No weekly progress records entered yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 7: PARENT CONSENT
            ------------------------------------------------------------- */}
        {activeFormTab === 7 && selectedLearnerObj && (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 max-w-2xl mx-auto print:block">
            
            {/* DEPED LETTERS */}
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Republic of the Philippines</span>
              <h4 className="text-xs font-black text-slate-800 uppercase">Department of Education</h4>
              <p className="text-[10px] font-bold text-slate-500">{schoolInfo.region} • {schoolInfo.division}</p>
              <h3 className="text-sm font-black text-[#002060] pt-4 uppercase tracking-wider">ARAL Program Parent Consent & Permit</h3>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-4 pt-4">
              <p className="font-bold text-right">Date: {selectedLearnerObj.consentDate || new Date().toISOString().split('T')[0]}</p>
              
              <p>To the Adviser of <strong>{selectedLearnerObj.gradeLevel} - {selectedLearnerObj.section}</strong>,</p>
              
              <p>
                I hereby permit my child, <strong>{selectedLearnerObj.firstName} {selectedLearnerObj.middleName} {selectedLearnerObj.lastName}</strong>, to participate in the 
                <strong> Academic Recovery and Accessible Learning (ARAL) Program</strong> remediation sessions officially scheduled by the school.
              </p>
              
              <p>
                I understand that this remedial program is designed to support my child's learning progress in crucial academic areas such as <strong>{selectedLearnerObj.learningNeeds || 'Reading and Mathematics'}</strong>. 
                The sessions will be handled by qualified school tutors/teachers after regular school hours or during scheduled remedial blocks.
              </p>

              <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[9px] mb-1">Parent / Guardian Name</span>
                  <p className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-1">{selectedLearnerObj.parentName || "_______________________"}</p>
                  <p className="text-[10px] text-slate-400 italic mt-1">Authorized Parent/Guardian signature authority</p>
                </div>

                <div className="space-y-3">
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Captured E-Signature</span>
                  {selectedLearnerObj.consentSignature ? (
                    <div className="border border-slate-200 p-2 rounded-xl bg-slate-50/50 flex justify-center items-center">
                      <img src={selectedLearnerObj.consentSignature} alt="Parent Signature" className="max-h-16" />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 p-4 rounded-xl text-center text-slate-400 italic">
                      No signature captured yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Electronic Signature Drawing board */}
              {isEditable && !selectedLearnerObj.consentSignature && (
                <div className="p-5 border border-slate-100 bg-slate-50 rounded-2xl space-y-3 print:hidden">
                  <span className="text-xs font-black text-[#002060] block uppercase tracking-wide">
                    Capture Electronic Signature
                  </span>
                  <div className="flex justify-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="cursor-crosshair bg-white"
                    />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50"
                    >
                      Clear Board
                    </button>
                    <button
                      type="button"
                      onClick={saveSignature}
                      className="px-4 py-1.5 bg-[#002060] hover:bg-blue-800 text-white rounded-lg text-xs font-bold"
                    >
                      Save & Attach Signature
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 8: WEEKLY ACCOMPLISHMENT REPORT
            ------------------------------------------------------------- */}
        {activeFormTab === 8 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 max-w-3xl mx-auto">
            
            {/* DEPED HEADER */}
            <div className="text-center pb-4 border-b border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Republic of the Philippines</span>
              <h4 className="text-xs font-black text-slate-800 uppercase font-sans">Department of Education</h4>
              <p className="text-[10px] font-bold text-slate-500">{schoolInfo.region} • {schoolInfo.division}</p>
              <h3 className="text-base font-black text-[#002060] pt-2 uppercase">ARAL Form 8: Weekly Accomplishment Report</h3>
            </div>

            {/* Accomplishment details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Week Range</span>
                <strong className="text-slate-800">Week 1-2 Summary</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Active Learners</span>
                <strong className="text-slate-800">{learners.filter(l => l.status === 'Enrolled').length} Learners</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Sessions Conducted</span>
                <strong className="text-slate-800">{sessions.length} sessions</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Avg Attendance Rate</span>
                <strong className="text-emerald-600">95% average</strong>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-600 pt-2">
              <div>
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider mb-2">A. Core Competencies Covered</span>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  {competencies.slice(0, 3).map(c => (
                    <li key={c.id}>
                      <strong className="font-mono text-[11px] mr-1 text-slate-500">[{c.code}]</strong> {c.description}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">B. Accomplishment Logs</span>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Highlights & Achievements</span>
                  <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-700 mt-1 leading-relaxed">
                    Successfully introduced signed integers arithmetic rules. Active student-to-student coaching model responded incredibly well.
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Challenges Encountered</span>
                  <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-rose-700 mt-1 leading-relaxed">
                    Juan dela Cruz requires individualized support and slower instructional pacing. Slow comprehension rate under timed quiz worksheets.
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Recommendations & Adjustments</span>
                  <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-[#002060] mt-1 leading-relaxed">
                    Integrate more visual colored block models for fraction computations. Extend remedial time from 40 to 60 minutes for select slow readers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 9: COMPLETION SUMMARY
            ------------------------------------------------------------- */}
        {activeFormTab === 9 && selectedLearnerObj && (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 max-w-2xl mx-auto">
            
            {/* DEPED HEADER */}
            <div className="text-center pb-4 border-b border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Republic of the Philippines</span>
              <h4 className="text-xs font-black text-slate-800 uppercase">Department of Education</h4>
              <p className="text-[10px] font-bold text-slate-500">{schoolInfo.region} • {schoolInfo.division}</p>
              <h3 className="text-base font-black text-[#002060] pt-2 uppercase">ARAL Form 9: Learner Completion Report</h3>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Student LRN</span>
                  <strong className="text-slate-800 font-mono text-sm">{selectedLearnerObj.lrn}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Student Name</span>
                  <strong className="text-slate-800 text-sm">{selectedLearnerObj.lastName}, {selectedLearnerObj.firstName}</strong>
                </div>
              </div>

              {/* Progress and diagnostic growth stats */}
              <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-4">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Remediation Program Summary Metrics</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pre/Post improvement rate */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Diagnostic score improvement</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-emerald-600">+{Math.max(0, selectedLearnerObj.postTestScore - selectedLearnerObj.preTestScore)} / 50</span>
                      <span className="text-xs text-slate-400">Score Gain</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(selectedLearnerObj.postTestScore / 50) * 100}%` }} />
                    </div>
                  </div>

                  {/* Attendance overall rate */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Attendance Rate Percentage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-indigo-600">92%</span>
                      <span className="text-xs text-slate-400 font-bold text-emerald-600">Passed Threshold</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `92%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Assessments */}
              <div className="space-y-3 pt-2">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Tutor Assessment Summary</span>
                  <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-700 mt-1 leading-relaxed">
                    The learner demonstrated substantial growth and active engagement throughout the remediation blocks. 
                    Can solve multi-step integer math rules correctly and skim basic educational readings with ease.
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Final Program Recommendation</span>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl mt-1 flex items-center gap-2">
                    <CheckCircle className="text-emerald-600 shrink-0" size={16} />
                    <strong className="text-emerald-800 font-bold">PROMOTED: Learner has completed all recovery milestones and is recommended for regular level progress.</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            FORM 10: CONSOLIDATED STATISTICS
            ------------------------------------------------------------- */}
        {activeFormTab === 10 && (() => {
          // Aggregate learners dynamically
          const groups: {
            [key: string]: {
              grade: string;
              subject: string;
              track: 'Aral Basic' | 'Aral Plus';
              identified: number;
              enrolled: number;
              completed: number;
              totalPre: number;
              totalPost: number;
              testedCount: number;
            }
          } = {};

          learners.forEach(l => {
            const grade = l.gradeLevel || 'Grade 7';
            const track = l.program || 'Aral Basic';
            let subject = 'Reading';
            const needs = (l.learningNeeds || '').toLowerCase();
            const initial = (l.initialAssessment || '').toLowerCase();
            if (needs.includes('math') || needs.includes('number') || needs.includes('fraction') || needs.includes('numeracy') ||
                initial.includes('numeracy') || initial.includes('math') || initial.includes('computation')) {
              subject = 'Mathematics';
            } else if (needs.includes('science') || initial.includes('science')) {
              subject = 'Science';
            }

            const key = `${grade}-${subject}-${track}`;
            if (!groups[key]) {
              groups[key] = {
                grade,
                subject,
                track,
                identified: 0,
                enrolled: 0,
                completed: 0,
                totalPre: 0,
                totalPost: 0,
                testedCount: 0
              };
            }

            groups[key].identified++;
            if (l.status === 'Enrolled' || l.status === 'Completed') {
              groups[key].enrolled++;
            }
            if (l.status === 'Completed') {
              groups[key].completed++;
            }

            if (l.preTestScore > 0 || l.postTestScore > 0) {
              groups[key].totalPre += l.preTestScore || 0;
              groups[key].totalPost += l.postTestScore || 0;
              groups[key].testedCount++;
            }
          });

          let rows = Object.values(groups);
          
          // Fallback static entries if no real learners exist yet
          if (rows.length === 0) {
            rows = [
              { grade: 'Grade 7', subject: 'Mathematics', track: 'Aral Basic', identified: 2, enrolled: 2, completed: 1, totalPre: 15, totalPost: 33, testedCount: 2 },
              { grade: 'Grade 7', subject: 'Reading', track: 'Aral Plus', identified: 1, enrolled: 1, completed: 0, totalPre: 14, totalPost: 34, testedCount: 1 },
              { grade: 'Grade 8', subject: 'Science', track: 'Aral Plus', identified: 1, enrolled: 1, completed: 0, totalPre: 0, totalPost: 0, testedCount: 0 }
            ];
          }

          return (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight text-[#002060]">ARAL Program Track Diagnostics & Completion Analytics</h3>
                  <p className="text-xs text-slate-400">Consolidated recovery statistics across Grade levels, program tracks, and subjects</p>
                </div>
              </div>

              {/* Consolidated Statistics Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="p-3">Grade Level</th>
                      <th className="p-3">Program Track</th>
                      <th className="p-3">Remedial Subject</th>
                      <th className="p-3 text-center">Identified</th>
                      <th className="p-3 text-center">Enrolled</th>
                      <th className="p-3 text-center">Completed</th>
                      <th className="p-3 text-center">Avg Gain Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {rows.map((row, idx) => {
                      let gainRateText = 'Not Tested yet';
                      if (row.testedCount > 0) {
                        const preAvg = row.totalPre / row.testedCount;
                        const postAvg = row.totalPost / row.testedCount;
                        if (preAvg > 0) {
                          const rate = ((postAvg - preAvg) / preAvg) * 100;
                          gainRateText = `+${rate.toFixed(0)}% Improvement`;
                        } else if (postAvg > 0) {
                          gainRateText = `+${(postAvg * 2).toFixed(0)}% Gain`;
                        }
                      }
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{row.grade}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.track === 'Aral Plus' 
                                ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}>
                              {row.track}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-600">{row.subject}</td>
                          <td className="p-3 text-center">{row.identified} {row.identified === 1 ? 'Learner' : 'Learners'}</td>
                          <td className="p-3 text-center">{row.enrolled} Enrolled</td>
                          <td className="p-3 text-center">{row.completed} Completed</td>
                          <td className={`p-3 text-center font-bold ${gainRateText.includes('Not') ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {gainRateText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      </div>

      {/* =============================================================
          MODAL: ADD/EDIT LEARNER (FORM 1)
          ============================================================= */}
      {showAddLearnerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                {editingLearner ? "Edit Learner Record" : "Identify Learner for ARAL Program"}
              </h3>
              <button 
                onClick={() => {
                  setShowAddLearnerModal(false);
                  setEditingLearner(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-xs"
              >
                Close
              </button>
            </div>

            <form onSubmit={editingLearner ? (e) => {
              e.preventDefault();
              onUpdateLearner({ ...editingLearner, ...newLearnerInput });
              setShowAddLearnerModal(false);
              setEditingLearner(null);
            } : handleAddLearnerSubmit} className="space-y-4 text-xs">
              
              {!editingLearner && enrolledStudents.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-1.5 mb-2">
                  <label className="text-[10px] font-black text-indigo-600 block uppercase tracking-wider">
                    Select Student from CLASS Database (Optional)
                  </label>
                  <select
                    onChange={(e) => {
                      const studentId = e.target.value;
                      const student = enrolledStudents.find(s => s.id === studentId);
                      if (student) {
                        const mapped = mapStudentToAralInput(student, selectedSection?.name);
                        setNewLearnerInput(mapped);
                      }
                    }}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 focus:border-indigo-600 rounded-xl px-3 py-2 outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Click to Choose a Student to Auto-Fill Form --</option>
                    {enrolledStudents.map(s => {
                      const exists = learners.some(l => l.lrn === s.lrn);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.lastName ? `${s.lastName}, ${s.firstName}` : s.name} {exists ? " (Already in ARAL)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[9px] text-slate-400 font-medium">
                    Selecting a student will automatically retrieve and fill in the LRN, Section, Full Name, Gender, Birthdate, Parent/Guardian, and Contact Number.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Learner LRN (12 digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="LRN Number"
                    value={newLearnerInput.lrn}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, lrn: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Advisory Section</label>
                  {sections.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={isCustomSec ? "custom_option_key" : newLearnerInput.section}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "custom_option_key") {
                            setNewLearnerInput(prev => ({ ...prev, section: "" }));
                          } else {
                            const matchedSec = sections.find(s => s.name === val);
                            setNewLearnerInput(prev => ({
                              ...prev,
                              section: val,
                              gradeLevel: matchedSec ? `Grade ${matchedSec.gradeLevel}` : prev.gradeLevel
                            }));
                          }
                        }}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                      >
                        <option value="" disabled>-- Select Advisory Section --</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} (Grade {s.gradeLevel} - {s.adviserName || 'No Adviser'})
                          </option>
                        ))}
                        <option value="custom_option_key">-- Type Custom Section --</option>
                      </select>
                      
                      {isCustomSec && (
                        <input
                          type="text"
                          required
                          placeholder="Type Custom Section Name..."
                          value={newLearnerInput.section}
                          onChange={e => setNewLearnerInput(prev => ({ ...prev, section: e.target.value }))}
                          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none animate-in slide-in-from-top-1 duration-200"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Section Name"
                      value={newLearnerInput.section}
                      onChange={e => setNewLearnerInput(prev => ({ ...prev, section: e.target.value }))}
                      className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLearnerInput.lastName}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newLearnerInput.firstName}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={newLearnerInput.middleName}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, middleName: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Gender</label>
                  <select
                    value={newLearnerInput.sex}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, sex: e.target.value as any }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Grade Level</label>
                  <select
                    value={newLearnerInput.gradeLevel}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, gradeLevel: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Birthdate</label>
                  <input
                    type="date"
                    required
                    value={newLearnerInput.birthdate}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, birthdate: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-indigo-600 block uppercase mb-1 tracking-wider">ARAL Program Track</label>
                <select
                  value={newLearnerInput.program}
                  onChange={e => setNewLearnerInput(prev => ({ ...prev, program: e.target.value as any }))}
                  className="w-full text-xs font-black text-slate-700 bg-indigo-50/40 border border-indigo-100 focus:border-indigo-600 rounded-xl px-3 py-2 outline-none"
                >
                  <option value="Aral Basic">Aral Basic (Foundational Literacy & Numeracy)</option>
                  <option value="Aral Plus">Aral Plus (Grade-Level Competency Enrichment)</option>
                </select>
                <p className="text-[9px] text-slate-400 font-medium mt-1">
                  <b>Aral Basic</b> focuses on reading and fundamental numeracy. <b>Aral Plus</b> focuses on advanced grade-level recovery.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={newLearnerInput.parentName}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, parentName: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Parent Contact Number</label>
                  <input
                    type="text"
                    required
                    value={newLearnerInput.parentContact}
                    onChange={e => setNewLearnerInput(prev => ({ ...prev, parentContact: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {/* Comprehensive Form 2 parameters */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Learning Gaps / Needs (Form 2)</label>
                <input
                  type="text"
                  placeholder="e.g. Struggles with division of negative integers"
                  value={newLearnerInput.learningNeeds}
                  onChange={e => setNewLearnerInput(prev => ({ ...prev, learningNeeds: e.target.value }))}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Initial Assessment Comments (Form 2)</label>
                <input
                  type="text"
                  placeholder="e.g. Low numeracy level (Beginning)"
                  value={newLearnerInput.initialAssessment}
                  onChange={e => setNewLearnerInput(prev => ({ ...prev, initialAssessment: e.target.value }))}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Tutor Action Recommendation (Form 2)</label>
                <input
                  type="text"
                  placeholder="e.g. Needs intense diagnostic worksheets and visual blocks"
                  value={newLearnerInput.teacherRecommendation}
                  onChange={e => setNewLearnerInput(prev => ({ ...prev, teacherRecommendation: e.target.value }))}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                />
              </div>

              {/* Status field if editing */}
              {editingLearner && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Program Status</label>
                  <select
                    value={editingLearner.status}
                    onChange={e => setEditingLearner(prev => prev ? ({ ...prev, status: e.target.value as any }) : null)}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="Identified">Identified</option>
                    <option value="Enrolled">Enrolled</option>
                    <option value="Completed">Completed</option>
                    <option value="Dropped">Dropped</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md uppercase tracking-wider"
              >
                {editingLearner ? "Save Learner" : "Register & Identify Learner"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: ADD REMEDIAL SESSION (FORM 4)
          ============================================================= */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                Log Remedial Tutoring Session (Form 4)
              </h3>
              <button 
                onClick={() => setShowAddSessionModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xs"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddSessionSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Session Date</label>
                  <input
                    type="date"
                    required
                    value={newSessionInput.date}
                    onChange={e => setNewSessionInput(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Target Subject</label>
                  <select
                    value={newSessionInput.subject}
                    onChange={e => setNewSessionInput(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Reading">Reading / English</option>
                    <option value="Science">Science</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Grade Level</label>
                  <select
                    value={newSessionInput.gradeLevel}
                    onChange={e => setNewSessionInput(prev => ({ ...prev, gradeLevel: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Section</label>
                  {sections.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={isCustomSessionSec ? "custom_option_key" : newSessionInput.section}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "custom_option_key") {
                            setNewSessionInput(prev => ({ ...prev, section: "" }));
                          } else {
                            const matchedSec = sections.find(s => s.name === val);
                            setNewSessionInput(prev => ({
                              ...prev,
                              section: val,
                              gradeLevel: matchedSec ? `Grade ${matchedSec.gradeLevel}` : prev.gradeLevel
                            }));
                          }
                        }}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                      >
                        <option value="" disabled>-- Select Advisory Section --</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} (Grade {s.gradeLevel} - {s.adviserName || 'No Adviser'})
                          </option>
                        ))}
                        <option value="custom_option_key">-- Type Custom Section --</option>
                      </select>
                      
                      {isCustomSessionSec && (
                        <input
                          type="text"
                          required
                          placeholder="Type Custom Section Name..."
                          value={newSessionInput.section}
                          onChange={e => setNewSessionInput(prev => ({ ...prev, section: e.target.value }))}
                          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none animate-in slide-in-from-top-1 duration-200"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={newSessionInput.section}
                      onChange={e => setNewSessionInput(prev => ({ ...prev, section: e.target.value }))}
                      className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Present Count</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newSessionInput.presentCount}
                    onChange={e => setNewSessionInput(prev => ({ ...prev, presentCount: parseInt(e.target.value) || 1 }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Select Core Competency</label>
                <select
                  value={newSessionInput.competencyId}
                  onChange={e => setNewSessionInput(prev => ({ ...prev, competencyId: e.target.value }))}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                >
                  {competencies.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.description.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Activities Conducted</label>
                <textarea
                  required
                  rows={2}
                  value={newSessionInput.activities}
                  onChange={e => setNewSessionInput(prev => ({ ...prev, activities: e.target.value }))}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Teacher Reflection</label>
                  <input
                    type="text"
                    required
                    value={newSessionInput.reflection}
                    onChange={e => setNewSessionInput(prev => ({ ...prev, reflection: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Challenges Encountered</label>
                  <input
                    type="text"
                    required
                    value={newSessionInput.challenges}
                    onChange={e => setNewSessionInput(prev => ({ ...prev, challenges: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Remedial Intervention</label>
                  <input
                    type="text"
                    required
                    value={newSessionInput.intervention}
                    onChange={e => setNewSessionInput(prev => ({ ...prev, intervention: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Remedial Tutor / Teacher Name</label>
                <input
                  type="text"
                  required
                  value={newSessionInput.teacherName}
                  onChange={e => setNewSessionInput(prev => ({ ...prev, teacherName: e.target.value }))}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md uppercase tracking-wider"
              >
                Log Session
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
