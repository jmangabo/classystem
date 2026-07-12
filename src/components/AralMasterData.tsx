import React, { useState, useEffect } from 'react';
import { 
  AralSchoolInfo, 
  AralCompetency, 
  AralRole 
} from './AralData';
import { 
  School, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  BookOpen, 
  User, 
  Layers, 
  ListPlus, 
  CheckCircle2 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

interface AralMasterDataProps {
  schoolInfo: AralSchoolInfo;
  onUpdateSchool: (info: AralSchoolInfo) => void;
  competencies: AralCompetency[];
  onAddCompetency: (comp: AralCompetency) => void;
  onDeleteCompetency: (id: string) => void;
  activeRole: AralRole;
  selectedSection?: any;
  sections?: any[];
  aralClasses?: any[];
  onCreateAralClass?: (gradeLevel: number, name: string, tutorName: string, tutorEmail: string, studentIds: string[], targetSubject?: string) => void;
  onUpdateAralClass?: (classId: string, tutorName: string, tutorEmail: string, studentIds: string[], targetSubject?: string, name?: string, gradeLevel?: number) => void;
  onDeleteAralClass?: (classId: string) => void;
}

export const AralMasterData: React.FC<AralMasterDataProps> = ({
  schoolInfo,
  onUpdateSchool,
  competencies,
  onAddCompetency,
  onDeleteCompetency,
  activeRole,
  selectedSection = null,
  sections = [],
  aralClasses = [],
  onCreateAralClass,
  onUpdateAralClass,
  onDeleteAralClass
}) => {
  const [subTab, setSubTab] = useState<'school' | 'competencies' | 'subjects' | 'sections'>('competencies');

  // Edit School Info States
  const [editSchool, setEditSchool] = useState<AralSchoolInfo>({ ...schoolInfo });
  const [isSaved, setIsSaved] = useState(false);

  // Editing tutor states
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingTutorName, setEditingTutorName] = useState<string>('');
  const [editingTutorEmail, setEditingTutorEmail] = useState<string>('');
  const [editingLearnerIdentified, setEditingLearnerIdentified] = useState<number>(0);
  const [editingAralLearnerIds, setEditingAralLearnerIds] = useState<string[]>([]);
  const [sectionStudents, setSectionStudents] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);

  // Add ARAL Class Modal States
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGradeLevel, setNewClassGradeLevel] = useState<number>(1);
  const [newClassTutorName, setNewClassTutorName] = useState('');
  const [newClassTutorEmail, setNewClassTutorEmail] = useState('');
  const [newClassStudentIds, setNewClassStudentIds] = useState<string[]>([]);
  const [newClassTargetSubject, setNewClassTargetSubject] = useState('Mathematics & Reading');
  const [addClassModalStudents, setAddClassModalStudents] = useState<any[]>([]);

  // Edit ARAL Class Modal States
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [editClassId, setEditClassId] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [editClassGradeLevel, setEditClassGradeLevel] = useState<number>(1);
  const [editClassTutorName, setEditClassTutorName] = useState('');
  const [editClassTutorEmail, setEditClassTutorEmail] = useState('');
  const [editClassStudentIds, setEditClassStudentIds] = useState<string[]>([]);
  const [editClassTargetSubject, setEditClassTargetSubject] = useState('');
  const [editClassModalStudents, setEditClassModalStudents] = useState<any[]>([]);

  // Delete ARAL Class Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<any | null>(null);

  // Fetch students belonging to the chosen grade level for the new class modal
  useEffect(() => {
    if (!isAddClassModalOpen || !newClassGradeLevel) {
      setAddClassModalStudents([]);
      return;
    }

    const gradeLevelSections = sections.filter(s => {
      // If gradeLevel is missing, we try to include it to be safe
      if (s.gradeLevel === undefined || s.gradeLevel === null) {
        return true;
      }
      const secGradeNum = parseInt(String(s.gradeLevel).replace(/\D/g, ''), 10);
      return secGradeNum === newClassGradeLevel;
    });
    if (gradeLevelSections.length === 0) {
      setAddClassModalStudents([]);
      return;
    }

    const loadStudentsForNewClass = async () => {
      try {
        let allStudents: any[] = [];
        for (const sec of gradeLevelSections) {
          const q = query(collection(db, `sections/${sec.id}/students`));
          const snap = await getDocs(q);
          snap.forEach((doc) => {
            allStudents.push({ id: doc.id, sectionId: sec.id, sectionName: sec.name, ...doc.data() });
          });
        }
        allStudents.sort((a, b) => {
          const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
          const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setAddClassModalStudents(allStudents);
      } catch (err) {
        console.error("Error loading students for new class: ", err);
      }
    };

    loadStudentsForNewClass();
  }, [isAddClassModalOpen, newClassGradeLevel, sections]);

  // Fetch students belonging to the chosen grade level for the edit class modal
  useEffect(() => {
    if (!isEditClassModalOpen || !editClassGradeLevel) {
      setEditClassModalStudents([]);
      return;
    }

    const gradeLevelSections = sections.filter(s => {
      // If gradeLevel is missing, we try to include it to be safe
      if (s.gradeLevel === undefined || s.gradeLevel === null) {
        return true;
      }
      const secGradeNum = parseInt(String(s.gradeLevel).replace(/\D/g, ''), 10);
      return secGradeNum === editClassGradeLevel;
    });
    if (gradeLevelSections.length === 0) {
      setEditClassModalStudents([]);
      return;
    }

    const loadStudentsForEditClass = async () => {
      try {
        let allStudents: any[] = [];
        for (const sec of gradeLevelSections) {
          const q = query(collection(db, `sections/${sec.id}/students`));
          const snap = await getDocs(q);
          snap.forEach((doc) => {
            allStudents.push({ id: doc.id, sectionId: sec.id, sectionName: sec.name, ...doc.data() });
          });
        }
        allStudents.sort((a, b) => {
          const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
          const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setEditClassModalStudents(allStudents);
      } catch (err) {
        console.error("Error loading students for edit class: ", err);
      }
    };

    loadStudentsForEditClass();
  }, [isEditClassModalOpen, editClassGradeLevel, sections]);

  // Fetch school users (teachers and coordinators, excluding students) reactively
  useEffect(() => {
    const sId = schoolInfo?.schoolId || (sections && sections.length > 0 ? sections[0].schoolId : null);
    if (!sId) return;

    const q = query(
      collection(db, "users"),
      where("schoolId", "==", sId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        const u = d.data();
        if (u.role !== "student") {
          list.push({ uid: d.id, ...u });
        }
      });
      list.sort((a, b) => (a.displayName || a.email || "").localeCompare(b.displayName || b.email || ""));
      setCandidates(list);
    }, (err) => {
      console.error("Error loading candidates in AralMasterData: ", err);
    });

    return () => unsub();
  }, [schoolInfo?.schoolId, sections]);

  useEffect(() => {
    if (!editingSectionId) {
      setSectionStudents([]);
      return;
    }
    const cls = aralClasses.find(c => c.id === editingSectionId);
    if (!cls) return;

    // Fetch all students for the school and filter by grade level (or fetch via group collection)
    // Actually, since we have the sections array, we can find all section IDs for this grade level.
    const gradeLevelSections = sections.filter(s => {
      if (s.gradeLevel === undefined || s.gradeLevel === null) return false;
      const secGradeNum = parseInt(String(s.gradeLevel).replace(/\D/g, ''), 10);
      const clsGradeNum = parseInt(String(cls.gradeLevel).replace(/\D/g, ''), 10);
      return secGradeNum === clsGradeNum;
    });
    if (gradeLevelSections.length === 0) {
      setSectionStudents([]);
      return;
    }

    const loadStudents = async () => {
      let allStudents: any[] = [];
      for (const sec of gradeLevelSections) {
        const q = query(collection(db, `sections/${sec.id}/students`));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        allStudents = [...allStudents, ...list];
      }
      allStudents.sort((a, b) => {
        const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
        const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setSectionStudents(allStudents);
    };
    loadStudents();
  }, [editingSectionId, aralClasses, sections]);


  const handleSaveTutor = (classId: string) => {
    if (onUpdateAralClass) {
      onUpdateAralClass(classId, editingTutorName, editingTutorEmail, editingAralLearnerIds);
    }
    setEditingSectionId(null);
    setEditingTutorName('');
    setEditingTutorEmail('');
    setEditingLearnerIdentified(0);
    setEditingAralLearnerIds([]);
  };

  const handleSaveNewClass = () => {
    if (!newClassName.trim()) {
      alert("Please provide an ARAL Class Name.");
      return;
    }
    if (onCreateAralClass) {
      onCreateAralClass(
        newClassGradeLevel,
        newClassName.trim(),
        newClassTutorName.trim() || 'Teacher Karen Villena',
        newClassTutorEmail.trim(),
        newClassStudentIds,
        newClassTargetSubject.trim() || 'Mathematics & Reading'
      );
    }
    setIsAddClassModalOpen(false);
  };

  const handleOpenEditModal = (cls: any) => {
    setEditClassId(cls.id);
    setEditClassName(cls.name || '');
    setEditClassGradeLevel(cls.gradeLevel || 1);
    setEditClassTutorName(cls.adviserName || '');
    setEditClassTutorEmail(cls.adviserEmail || '');
    setEditClassStudentIds(cls.studentIds || []);
    setEditClassTargetSubject(cls.targetSubject || 'Mathematics & Reading');
    setIsEditClassModalOpen(true);
  };

  const handleSaveEditClass = () => {
    if (!editClassName.trim()) {
      alert("Please provide an ARAL Class Name.");
      return;
    }
    if (onUpdateAralClass) {
      onUpdateAralClass(
        editClassId,
        editClassTutorName.trim() || 'Teacher Karen Villena',
        editClassTutorEmail.trim(),
        editClassStudentIds,
        editClassTargetSubject.trim() || 'Mathematics & Reading',
        editClassName.trim(),
        editClassGradeLevel
      );
    }
    setIsEditClassModalOpen(false);
  };

  const handleDeleteClass = () => {
    if (!onDeleteAralClass) return;
    if (window.confirm(`Are you sure you want to permanently delete the ARAL Class "${editClassName}"? This action cannot be undone.`)) {
      onDeleteAralClass(editClassId);
      setIsEditClassModalOpen(false);
    }
  };

  // Active Grade Level text normalization (e.g. "Grade 7")
  const activeGradeText = React.useMemo(() => {
    if (!selectedSection || !selectedSection.gradeLevel) return 'Grade 7';
    const gl = String(selectedSection.gradeLevel).trim();
    if (gl.toLowerCase().startsWith('grade')) return gl;
    return `Grade ${gl}`;
  }, [selectedSection]);

  const [showAllGrades, setShowAllGrades] = useState(false);

  // Competency States
  const [newComp, setNewComp] = useState({
    subject: 'Reading',
    gradeLevel: activeGradeText,
    code: '',
    description: ''
  });

  // Sync newComp grade level when active grade level changes
  React.useEffect(() => {
    if (activeGradeText) {
      setNewComp(prev => ({ ...prev, gradeLevel: activeGradeText }));
    }
  }, [activeGradeText]);

  const handleSchoolSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchool(editSchool);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAddComp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComp.code || !newComp.description) return;
    onAddCompetency({
      id: `comp-${Date.now()}`,
      ...newComp
    });
    setNewComp(prev => ({ ...prev, code: '', description: '' }));
  };

  // Filter competencies based on active grade level
  const displayedCompetencies = React.useMemo(() => {
    if (showAllGrades || !selectedSection) return competencies;
    return competencies.filter(c => c.gradeLevel.toLowerCase() === activeGradeText.toLowerCase());
  }, [competencies, activeGradeText, showAllGrades, selectedSection]);

  // Filter sections list to show same grade level by default
  const [showAllSections, setShowAllSections] = useState(false);

  const displayedSections = React.useMemo(() => {
    if (!aralClasses || aralClasses.length === 0) return [];
    if (showAllSections || !selectedSection) return aralClasses;
    
    const activeGradeNum = selectedSection.gradeLevel ? parseInt(String(selectedSection.gradeLevel).replace(/\D/g, ''), 10) : 0;
    
    return aralClasses.filter(s => {
      if (s.gradeLevel === undefined || s.gradeLevel === null) return false;
      const secGradeNum = parseInt(String(s.gradeLevel).replace(/\D/g, ''), 10);
      return activeGradeNum === secGradeNum;
    });
  }, [aralClasses, selectedSection, showAllSections]);

  const isEditable = activeRole === 'Admin' || activeRole === 'ARAL Coordinator';

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Tab Navigation header */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('school')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            subTab === 'school' 
              ? 'bg-[#002060] text-white' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <School size={15} />
          School Information
        </button>
        <button
          onClick={() => setSubTab('competencies')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            subTab === 'competencies' 
              ? 'bg-[#002060] text-white' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ListPlus size={15} />
          Learning Competencies
        </button>
        <button
          onClick={() => setSubTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            subTab === 'subjects' 
              ? 'bg-[#002060] text-white' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <BookOpen size={15} />
          Subjects & Programs
        </button>
        <button
          onClick={() => setSubTab('sections')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            subTab === 'sections' 
              ? 'bg-[#002060] text-white' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Layers size={15} />
          Remedial Sections & Grades
        </button>
      </div>

      <div className="p-6">
        {/* TAB 1: SCHOOL INFO */}
        {subTab === 'school' && (
          <div className="max-w-2xl">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2 text-[#002060]">
              <School size={18} />
              Philippine DepEd School Registry
            </h3>

            <form onSubmit={handleSchoolSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block uppercase mb-1">School ID (6 digits)</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditable}
                    value={editSchool.schoolId}
                    onChange={e => setEditSchool(prev => ({ ...prev, schoolId: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] focus:ring-1 focus:ring-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block uppercase mb-1">School Year</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditable}
                    value={editSchool.schoolYear}
                    onChange={e => setEditSchool(prev => ({ ...prev, schoolYear: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] focus:ring-1 focus:ring-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block uppercase mb-1">Official School Name</label>
                <input
                  type="text"
                  required
                  disabled={!isEditable}
                  value={editSchool.schoolName}
                  onChange={e => setEditSchool(prev => ({ ...prev, schoolName: e.target.value }))}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] focus:ring-1 focus:ring-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block uppercase mb-1">Region</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditable}
                    value={editSchool.region}
                    onChange={e => setEditSchool(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] focus:ring-1 focus:ring-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block uppercase mb-1">Division</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditable}
                    value={editSchool.division}
                    onChange={e => setEditSchool(prev => ({ ...prev, division: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] focus:ring-1 focus:ring-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block uppercase mb-1">District</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditable}
                    value={editSchool.district}
                    onChange={e => setEditSchool(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] focus:ring-1 focus:ring-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              {isEditable && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow"
                  >
                    <Save size={14} />
                    Save Changes
                  </button>
                  {isSaved && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      School settings updated successfully!
                    </span>
                  )}
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 2: COMPETENCIES */}
        {subTab === 'competencies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 text-[#002060]">
                  <ListPlus size={18} />
                  Learning Competencies Registry
                </h3>
                <p className="text-xs text-slate-400">Manage diagnostic benchmarks mapped to session logs and progress reports</p>
              </div>
            </div>

            {isEditable && (
              <form onSubmit={handleAddComp} className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-4">
                <span className="text-xs font-black text-slate-700 block uppercase tracking-wide">
                  Add New Competency Code
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Subject</label>
                    <select
                      value={newComp.subject}
                      onChange={e => setNewComp(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2"
                    >
                      <option value="Reading">Reading / English</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Grade Level</label>
                    <select
                      value={newComp.gradeLevel}
                      onChange={e => setNewComp(prev => ({ ...prev, gradeLevel: e.target.value }))}
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2"
                    >
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Competency Code (e.g. M7NS-I-b-1)</label>
                    <input
                      type="text"
                      required
                      placeholder="Code identifier"
                      value={newComp.code}
                      onChange={e => setNewComp(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Competency Description</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Describe what skills the learner must master..."
                    value={newComp.description}
                    onChange={e => setNewComp(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Plus size={14} />
                  Add Competency
                </button>
              </form>
            )}

            {/* Grade Level Filter Notice & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#002060]"></span>
                <span className="text-xs font-semibold text-slate-700">
                  {selectedSection ? (
                    <>
                      Currently filtering registry for <strong className="font-bold text-[#002060]">{activeGradeText}</strong> matching the active advisory section's grade level.
                    </>
                  ) : (
                    "Manage competencies across all Grade Levels."
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAllGrades(prev => !prev)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-[#002060] text-slate-600 hover:text-[#002060] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                {showAllGrades ? "Filter to Active Grade" : "Show All Grade Levels"}
              </button>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Subject</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Description</th>
                    {isEditable && <th className="p-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {displayedCompetencies.length > 0 ? (
                    displayedCompetencies.map(comp => (
                      <tr key={comp.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            comp.subject === 'Reading' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                              : comp.subject === 'Mathematics' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-teal-50 text-teal-700 border border-teal-100'
                          }`}>
                            {comp.subject}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{comp.gradeLevel}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{comp.code}</td>
                        <td className="p-3 max-w-sm font-normal text-slate-500 leading-relaxed">{comp.description}</td>
                        {isEditable && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => onDeleteCompetency(comp.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete Competency"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isEditable ? 5 : 4} className="p-8 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ListPlus size={24} className="text-slate-300" />
                          <p className="font-bold">No benchmarks registered for {activeGradeText} yet.</p>
                          <p className="text-[11px] font-normal text-slate-400">You can add custom competencies using the form above or click "Show All Grade Levels".</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SUBJECTS */}
        {subTab === 'subjects' && (
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 text-[#002060]">
              <BookOpen size={18} />
              Approved Academic Remediation Core Subjects
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              Remediation programs officially mandated under the DepEd ARAL Program framework:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-5 border border-blue-100 bg-blue-50/20 rounded-2xl space-y-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded">Mandated Core</span>
                <h4 className="font-bold text-slate-800 text-sm">Reading Program (English & Filipino)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Focuses on phonics, word mechanics, reading fluency, vocabulary contexts, and structured reading comprehension guides.
                </p>
              </div>

              <div className="p-5 border border-amber-100 bg-amber-50/20 rounded-2xl space-y-2">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded">Mandated Core</span>
                <h4 className="font-bold text-slate-800 text-sm">Mathematics Numeracy Program</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dedicated to fundamental numeracy, fractions, integers arithmetic, and word-problem translation models.
                </p>
              </div>

              <div className="p-5 border border-teal-100 bg-teal-50/20 rounded-2xl space-y-2">
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-black uppercase rounded">Supplemental</span>
                <h4 className="font-bold text-slate-800 text-sm">Science Remedial Electives</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Available for Grades 7 to 10 covering critical scientific methods, systemic models, force mechanics, and life organs.
                </p>
              </div>
            </div>

            {/* ARAL Tracks Division */}
            <div className="pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight text-[#002060] mb-2">
                ARAL Program Tracks
              </h4>
              <p className="text-xs text-slate-400 max-w-xl mb-4">
                The program provides two customized recovery tracks tailored to individual student needs:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border border-indigo-150 bg-indigo-50/30 rounded-2xl space-y-2">
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-850 text-[10px] font-black uppercase rounded-md tracking-wider">
                    Track A
                  </span>
                  <h4 className="font-bold text-indigo-950 text-sm">Aral Basic</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Designed for learners requiring foundational intervention. This includes basic decoding, syllable-based reading diagnostics, letter sounds recognition, and fundamental single-digit and double-digit math operations (addition, subtraction, multiplication tables).
                  </p>
                </div>
                <div className="p-5 border border-purple-150 bg-purple-50/30 rounded-2xl space-y-2">
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-850 text-[10px] font-black uppercase rounded-md tracking-wider">
                    Track B
                  </span>
                  <h4 className="font-bold text-purple-950 text-sm">Aral Plus</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Designed for grade-level competency recovery and academic enrichment. Focuses on advanced reading comprehension, paragraph summary mechanics, vocabulary contexts, fractional operations, word problems translations, and core Science system models.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECTIONS */}
        {subTab === 'sections' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 text-[#002060]">
                  <Layers size={18} />
                  Grade Levels & ARAL Classes
                </h3>
                <p className="text-xs text-slate-400">
                  Listing of available ARAL classes participating in remedial tutoring:
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onCreateAralClass && (
                  <button
                    type="button"
                    onClick={() => {
                      let gradeLevelNum = selectedSection?.gradeLevel ? parseInt(String(selectedSection.gradeLevel).replace(/\D/g, ''), 10) : 0;
                      if (!gradeLevelNum && sections.length > 0) {
                        for (const sec of sections) {
                          if (sec.gradeLevel) {
                            const parsed = parseInt(String(sec.gradeLevel).replace(/\D/g, ''), 10);
                            if (parsed) {
                              gradeLevelNum = parsed;
                              break;
                            }
                          }
                        }
                      }
                      if (!gradeLevelNum) gradeLevelNum = 7;

                      const currentGradeClasses = aralClasses.filter(c => {
                        const classGradeNum = parseInt(String(c.gradeLevel).replace(/\D/g, ''), 10);
                        return classGradeNum === gradeLevelNum;
                      });
                      const nextClassNum = currentGradeClasses.length + 1;
                      setNewClassName(`Class ${nextClassNum}`);
                      setNewClassGradeLevel(gradeLevelNum);
                      setNewClassTutorName('');
                      setNewClassTutorEmail('');
                      setNewClassStudentIds([]);
                      setIsAddClassModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#002060] hover:bg-[#001848] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <ListPlus size={14} />
                    Add ARAL Class
                  </button>
                )}
                {aralClasses && aralClasses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSections(prev => !prev)}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-[#002060] text-slate-600 hover:text-[#002060] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs"
                  >
                    {showAllSections ? "Filter to Active Grade" : "Show All Grade Levels"}
                  </button>
                )}
              </div>
            </div>

            {/* Filter Notice */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {selectedSection ? (
                  showAllSections ? (
                    "Showing all registered ARAL classes."
                  ) : (
                    <>Showing ARAL classes for <strong className="font-bold text-[#002060]">{activeGradeText}</strong>.</>
                  )
                ) : (
                  "Showing all registered ARAL classes."
                )}
              </span>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                    <th className="p-3">ARAL Class</th>
                    <th className="p-3">Grade Level</th>
                    <th className="p-3">Target Subject</th>
                    <th className="p-3">Active Tutor / Teacher</th>
                    <th className="p-3">Learners Identified</th>
                    {isEditable && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {displayedSections.length > 0 ? (
                    displayedSections.map(s => {
                      const isCurrentSection = selectedSection && s.name === selectedSection.name;
                      return (
                        <tr key={s.id || s.name} className={`hover:bg-slate-50/50 ${isCurrentSection ? 'bg-blue-50/40 border-l-4 border-l-[#002060]' : ''}`}>
                          <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                            {s.name}
                            {isCurrentSection && (
                              <span className="px-1.5 py-0.5 bg-[#002060] text-white text-[8px] font-bold uppercase rounded">
                                Active Section
                              </span>
                            )}
                          </td>
                          <td className="p-3">Grade {s.gradeLevel}</td>
                          <td className="p-3">{s.targetSubject || 'Mathematics & Reading'}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-between group/tutor max-w-[280px]">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{s.adviserName || 'Teacher Karen Villena'}</span>
                                {s.adviserEmail ? (
                                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">{s.adviserEmail}</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-normal italic mt-0.5">No email registered</span>
                                )}
                              </div>
                              {isEditable && s.id && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(s)}
                                  className="opacity-0 group-hover/tutor:opacity-100 p-1 hover:bg-slate-100 text-slate-400 hover:text-[#002060] rounded-lg transition-all ml-2"
                                  title="Edit ARAL Class"
                                >
                                  <Edit size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">{s.studentIds?.length || 0}</span>
                              <span className="text-[10px] text-slate-400">Learners</span>
                            </div>
                          </td>
                          {isEditable && (
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(s)}
                                  className="p-1.5 bg-slate-50 hover:bg-[#002060]/10 text-[#002060] border border-slate-200 hover:border-[#002060]/30 rounded-xl transition-all font-semibold flex items-center gap-1 text-[11px]"
                                  title="Edit ARAL Class"
                                >
                                  <Edit size={13} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClassToDelete(s);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-xl transition-all font-semibold flex items-center gap-1 text-[11px]"
                                  title="Delete ARAL Class"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={isEditable ? 6 : 5} className="p-8 text-center text-slate-400 italic">
                        No ARAL classes have been defined or created yet. Click <strong className="text-[#002060]">"Add ARAL Class"</strong> above to set up a remediation tutoring class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isDeleteModalOpen && classToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-sans animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">Delete ARAL Class</h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to permanently delete the ARAL Class <strong>"{classToDelete.name}"</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setClassToDelete(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteAralClass?.(classToDelete.id);
                    setIsDeleteModalOpen(false);
                    setClassToDelete(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {isAddClassModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-base font-black text-[#002060] uppercase tracking-tight flex items-center gap-2">
                    <ListPlus size={18} />
                    Define ARAL Class
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configure your remedial tutoring class room.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Metadata & Tutor Details */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Class Name & Grade Level */}
                    <div className="space-y-4">
                      {/* Class Name */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">ARAL Class Name (e.g. Class 1)</label>
                        <input
                          type="text"
                          required
                          value={newClassName}
                          onChange={e => setNewClassName(e.target.value)}
                          placeholder="Enter Class Name"
                          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none"
                        />
                      </div>

                      {/* Grade Level Selection */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Grade Level</label>
                        <select
                          value={newClassGradeLevel}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            setNewClassGradeLevel(val);
                            // Update default class name based on grade level
                            const currentGradeClasses = aralClasses.filter(c => {
                              const classGradeNum = parseInt(String(c.gradeLevel).replace(/\D/g, ''), 10);
                              return classGradeNum === val;
                            });
                            setNewClassName(`Class ${currentGradeClasses.length + 1}`);
                            setNewClassStudentIds([]);
                          }}
                          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 outline-none transition-all"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(lvl => (
                            <option key={lvl} value={lvl}>Grade {lvl}</option>
                          ))}
                        </select>
                      </div>

                      {/* Target Subject (Manual Input) */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Target Subject (e.g. Mathematics)</label>
                        <input
                          type="text"
                          required
                          value={newClassTargetSubject}
                          onChange={e => setNewClassTargetSubject(e.target.value)}
                          placeholder="Enter Target Subject"
                          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* Active Tutor / Teacher */}
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <span className="text-[10px] font-black text-[#002060] block uppercase tracking-wider">
                        Assigned Remedial Tutor
                      </span>
                      
                      {candidates.length > 0 ? (
                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Registered Tutor Select</label>
                            <select 
                              value={newClassTutorEmail}
                              onChange={e => {
                                const val = e.target.value;
                                const matched = candidates.find(c => c.email === val);
                                setNewClassTutorEmail(val);
                                setNewClassTutorName(matched ? (matched.displayName || matched.email) : val);
                              }}
                              className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none transition-all"
                            >
                              <option value="">Select Registered Email...</option>
                              {candidates.map(c => (
                                <option key={c.uid} value={c.email}>
                                  {c.displayName || c.email} ({c.email})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">— OR ENTER MANUALLY —</div>
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Tutor Email</label>
                          <input 
                            type="email"
                            value={newClassTutorEmail}
                            onChange={e => {
                              const val = e.target.value;
                              setNewClassTutorEmail(val);
                              const matched = candidates.find(c => (c.email || '').toLowerCase() === val.toLowerCase());
                              if (matched) {
                                setNewClassTutorName(matched.displayName || matched.email);
                              }
                            }}
                            className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 outline-none transition-all"
                            placeholder="tutor@school.edu"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Tutor Name</label>
                          <input 
                            type="text"
                            value={newClassTutorName}
                            onChange={e => setNewClassTutorName(e.target.value)}
                            className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 outline-none transition-all"
                            placeholder="Tutor Name"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Learners Checklist */}
                  <div className="lg:col-span-7 space-y-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-[#002060] block uppercase tracking-wider">
                          Identify Learners (Grade {newClassGradeLevel})
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {newClassStudentIds.length} Selected
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 min-h-[300px]">
                        {addClassModalStudents.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                            {addClassModalStudents.map(student => (
                              <label key={student.id} className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 hover:bg-white border border-transparent hover:border-slate-100 rounded-xl transition-all select-none shadow-xs">
                                <input 
                                  type="checkbox" 
                                  className="rounded-md border-slate-300 text-[#002060] focus:ring-[#002060] w-4 h-4"
                                  checked={newClassStudentIds.includes(student.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewClassStudentIds(prev => [...prev, student.id]);
                                    } else {
                                      setNewClassStudentIds(prev => prev.filter(id => id !== student.id));
                                    }
                                  }}
                                />
                                <span className="text-[11px] text-slate-700 truncate font-semibold">
                                  {student.lastName}, {student.firstName} <span className="text-[9px] text-slate-400 font-normal block sm:inline">({student.sectionName || 'N/A'})</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
                            <span className="text-xs text-slate-400 italic block">No registered students found for Grade {newClassGradeLevel}.</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Please make sure you have added advisory sections and registered students for Grade {newClassGradeLevel} first.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewClass}
                  className="px-4 py-2 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  Create Class
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditClassModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-base font-black text-[#002060] uppercase tracking-tight flex items-center gap-2">
                    <Edit size={18} />
                    Edit ARAL Class
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Modify your remedial tutoring class configuration.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsEditClassModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Metadata & Tutor Details */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Class Name & Grade Level */}
                    <div className="space-y-4">
                      {/* Class Name */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">ARAL Class Name (e.g. Class 1)</label>
                        <input
                          type="text"
                          required
                          value={editClassName}
                          onChange={e => setEditClassName(e.target.value)}
                          placeholder="Enter Class Name"
                          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none"
                        />
                      </div>

                      {/* Grade Level Selection */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Grade Level</label>
                        <select
                          value={editClassGradeLevel}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            setEditClassGradeLevel(val);
                            setEditClassStudentIds([]);
                          }}
                          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 outline-none transition-all"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(lvl => (
                            <option key={lvl} value={lvl}>Grade {lvl}</option>
                          ))}
                        </select>
                      </div>

                      {/* Target Subject (Manual Input) */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">Target Subject (e.g. Mathematics)</label>
                        <input
                          type="text"
                          required
                          value={editClassTargetSubject}
                          onChange={e => setEditClassTargetSubject(e.target.value)}
                          placeholder="Enter Target Subject"
                          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* Active Tutor / Teacher */}
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <span className="text-[10px] font-black text-[#002060] block uppercase tracking-wider">
                        Assigned Remedial Tutor
                      </span>
                      
                      {candidates.length > 0 ? (
                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Registered Tutor Select</label>
                            <select 
                              value={editClassTutorEmail}
                              onChange={e => {
                                const val = e.target.value;
                                const matched = candidates.find(c => c.email === val);
                                setEditClassTutorEmail(val);
                                setEditClassTutorName(matched ? (matched.displayName || matched.email) : val);
                              }}
                              className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2 outline-none transition-all"
                            >
                              <option value="">Select Registered Email...</option>
                              {candidates.map(c => (
                                <option key={c.uid} value={c.email}>
                                  {c.displayName || c.email} ({c.email})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">— OR ENTER MANUALLY —</div>
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Tutor Email</label>
                          <input 
                            type="email"
                            value={editClassTutorEmail}
                            onChange={e => {
                              const val = e.target.value;
                              setEditClassTutorEmail(val);
                              const matched = candidates.find(c => (c.email || '').toLowerCase() === val.toLowerCase());
                              if (matched) {
                                setEditClassTutorName(matched.displayName || matched.email);
                              }
                            }}
                            className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 outline-none transition-all"
                            placeholder="tutor@school.edu"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Tutor Name</label>
                          <input 
                            type="text"
                            value={editClassTutorName}
                            onChange={e => setEditClassTutorName(e.target.value)}
                            className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-[#002060] rounded-xl px-3 py-2.5 outline-none transition-all"
                            placeholder="Tutor Name"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Learners Checklist */}
                  <div className="lg:col-span-7 space-y-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-[#002060] block uppercase tracking-wider">
                          Identify Learners (Grade {editClassGradeLevel})
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {editClassStudentIds.length} Selected
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 min-h-[300px]">
                        {editClassModalStudents.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                            {editClassModalStudents.map(student => (
                              <label key={student.id} className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 hover:bg-white border border-transparent hover:border-slate-100 rounded-xl transition-all select-none shadow-xs">
                                <input 
                                  type="checkbox" 
                                  className="rounded-md border-slate-300 text-[#002060] focus:ring-[#002060] w-4 h-4"
                                  checked={editClassStudentIds.includes(student.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditClassStudentIds(prev => [...prev, student.id]);
                                    } else {
                                      setEditClassStudentIds(prev => prev.filter(id => id !== student.id));
                                    }
                                  }}
                                />
                                <span className="text-[11px] text-slate-700 truncate font-semibold">
                                  {student.lastName}, {student.firstName} <span className="text-[9px] text-slate-400 font-normal block sm:inline">({student.sectionName || 'N/A'})</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
                            <span className="text-xs text-slate-400 italic block">No registered students found for Grade {editClassGradeLevel}.</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Please make sure you have added advisory sections and registered students for Grade {editClassGradeLevel} first.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  {onDeleteAralClass && (
                    <button
                      type="button"
                      onClick={handleDeleteClass}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
                    >
                      Delete Class
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditClassModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditClass}
                    className="px-4 py-2 bg-[#002060] hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={13} />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
