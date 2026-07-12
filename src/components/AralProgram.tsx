import React, { useState, useEffect, useMemo } from 'react';
import { 
  DEFAULT_SCHOOL_INFO, 
  DEFAULT_COMPETENCIES, 
  DEFAULT_LEARNERS, 
  DEFAULT_SESSIONS, 
  DEFAULT_NOTIFICATIONS,
  AralRole,
  AralSchoolInfo,
  AralLearner,
  AralSession,
  AralCompetency
} from './AralData';
import { AralDashboard } from './AralDashboard';
import { AralMasterData } from './AralMasterData';
import { AralForms } from './AralForms';
import { 
  LayoutDashboard, 
  FileText, 
  Layers, 
  Bell, 
  UserSquare, 
  RotateCcw, 
  BookOpen, 
  Building2 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';

const KEY_SCHOOL_INFO = 'aral_v2_school_info';
const KEY_LEARNERS = 'aral_v2_learners';
const KEY_SESSIONS = 'aral_v2_sessions';
const KEY_COMPETENCIES = 'aral_v2_competencies';
const KEY_NOTIFICATIONS = 'aral_v2_notifications';

import { AralClass } from '../types';

export interface AralProgramProps {
  enrolledStudents?: any[];
  selectedSection?: any;
  sections?: any[];
  userProfile?: any;
  globalSettings?: any;
  
  // Master data props for synchronization
  aralSchoolInfo?: AralSchoolInfo;
  onUpdateAralSchool?: (info: AralSchoolInfo) => void;
  aralCompetencies?: AralCompetency[];
  onAddAralCompetency?: (comp: AralCompetency) => void;
  onDeleteAralCompetency?: (id: string) => void;
  aralClasses?: AralClass[];
  onCreateAralClass?: (gradeLevel: number, name: string, tutorName: string, tutorEmail: string, studentIds: string[], targetSubject?: string) => void;
  onUpdateAralClass?: (classId: string, tutorName: string, tutorEmail: string, studentIds: string[], targetSubject?: string, name?: string, gradeLevel?: number) => void;
  onDeleteAralClass?: (classId: string) => void;
}

export const AralProgram: React.FC<AralProgramProps> = ({
  enrolledStudents = [],
  selectedSection = null,
  sections = [],
  userProfile = null,
  globalSettings = null,
  aralSchoolInfo,
  onUpdateAralSchool,
  aralCompetencies,
  onAddAralCompetency,
  onDeleteAralCompetency,
  aralClasses = [],
  onCreateAralClass,
  onUpdateAralClass,
  onDeleteAralClass
}) => {
  // 1. Local Storage Sync States
  const [schoolInfo, setSchoolInfo] = useState<AralSchoolInfo>(DEFAULT_SCHOOL_INFO);
  const [learnersProgress, setLearnersProgress] = useState<AralLearner[]>([]);
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<AralSession[]>([]);
  const [competencies, setCompetencies] = useState<AralCompetency[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Navigation & Simulation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'forms' | 'master' | 'notifications'>('dashboard');

  const mapUserRoleToAralRole = (role?: string): AralRole => {
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

  const [activeRole, setActiveRole] = useState<AralRole>(() => mapUserRoleToAralRole(userProfile?.role));

  const finalSchoolInfo = aralSchoolInfo || schoolInfo;
  const finalCompetencies = aralCompetencies || competencies;

  // Sync activeRole if userProfile role changes
  useEffect(() => {
    if (userProfile?.role) {
      setActiveRole(mapUserRoleToAralRole(userProfile.role));
    }
  }, [userProfile?.role]);

  // Load state on mount
  useEffect(() => {
    try {
      const savedSchool = localStorage.getItem(KEY_SCHOOL_INFO);
      const savedLearners = localStorage.getItem(KEY_LEARNERS);
      const savedSessions = localStorage.getItem(KEY_SESSIONS);
      const savedCompetencies = localStorage.getItem(KEY_COMPETENCIES);
      const savedNotifs = localStorage.getItem(KEY_NOTIFICATIONS);

      if (savedSchool) setSchoolInfo(JSON.parse(savedSchool));
      else {
        setSchoolInfo(DEFAULT_SCHOOL_INFO);
        localStorage.setItem(KEY_SCHOOL_INFO, JSON.stringify(DEFAULT_SCHOOL_INFO));
      }

      if (savedLearners) setLearnersProgress(JSON.parse(savedLearners));
      else {
        setLearnersProgress(DEFAULT_LEARNERS);
        localStorage.setItem(KEY_LEARNERS, JSON.stringify(DEFAULT_LEARNERS));
      }

      if (savedSessions) setSessions(JSON.parse(savedSessions));
      else {
        setSessions(DEFAULT_SESSIONS);
        localStorage.setItem(KEY_SESSIONS, JSON.stringify(DEFAULT_SESSIONS));
      }

      if (savedCompetencies) setCompetencies(JSON.parse(savedCompetencies));
      else {
        setCompetencies(DEFAULT_COMPETENCIES);
        localStorage.setItem(KEY_COMPETENCIES, JSON.stringify(DEFAULT_COMPETENCIES));
      }

      if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
      else {
        setNotifications(DEFAULT_NOTIFICATIONS);
        localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
      }
    } catch (e) {
      console.error("Failed to load ARAL storage state", e);
    }
  }, []);

  // Sync school info from active selected section in CLASS
  useEffect(() => {
    if (selectedSection) {
      const activeSchoolYear = globalSettings?.activeSchoolYear || selectedSection.schoolYear || "2026-2027";
      const updatedInfo: AralSchoolInfo = {
        schoolId: selectedSection.schoolId || schoolInfo.schoolId || "",
        schoolName: selectedSection.schoolName || schoolInfo.schoolName || "",
        region: selectedSection.region || schoolInfo.region || "",
        division: selectedSection.division || schoolInfo.division || "",
        district: selectedSection.district || schoolInfo.district || "",
        schoolYear: activeSchoolYear
      };
      saveState(KEY_SCHOOL_INFO, updatedInfo, setSchoolInfo);
    }
  }, [selectedSection, globalSettings?.activeSchoolYear]);

  // Save states helper
  const saveState = (key: string, data: any, setter: Function) => {
    setter(data);
    localStorage.setItem(key, JSON.stringify(data));
  };

  // 2. Action Handlers (CRUD)
  const handleUpdateSchool = (info: AralSchoolInfo) => {
    saveState(KEY_SCHOOL_INFO, info, setSchoolInfo);
  };

  // Load students of all sections in school
  useEffect(() => {
    if (!sections || sections.length === 0) return;

    let isMounted = true;
    const fetchAllSectionStudents = async () => {
      try {
        const tempStudents: any[] = [];
        for (const sec of sections) {
          const q = query(collection(db, `sections/${sec.id}/students`));
          const snap = await getDocs(q);
          snap.forEach((doc) => {
            tempStudents.push({
              id: doc.id,
              sectionId: sec.id,
              sectionName: sec.name,
              gradeLevel: sec.gradeLevel,
              ...doc.data()
            });
          });
        }
        if (isMounted) {
          setDbStudents(tempStudents);
        }
      } catch (err) {
        console.error("Error loading students for ARAL Program:", err);
      }
    };

    fetchAllSectionStudents();
    return () => { isMounted = false; };
  }, [sections]);

  // Derive learners dynamically from added classes and their identified student IDs
  const learners = useMemo(() => {
    // 1. Identify all student IDs that are enrolled in any of the aralClasses
    const identifiedStudentIds = new Set<string>();
    const studentClassMap = new Map<string, AralClass>();

    (aralClasses || []).forEach(c => {
      if (Array.isArray(c.studentIds)) {
        c.studentIds.forEach(id => {
          if (id) {
            identifiedStudentIds.add(id);
            studentClassMap.set(id, c);
          }
        });
      }
    });

    // 2. Map of existing progress details from learnersProgress state (attendance, test scores, etc.)
    const progressMap = new Map<string, AralLearner>();
    (learnersProgress || []).forEach(l => {
      if (l && l.id) {
        progressMap.set(l.id, l);
      }
    });

    // Helper to extract first/middle/last name if not present
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
        learningNeeds: student.learningNeeds || "",
        initialAssessment: student.initialAssessment || "",
        teacherRecommendation: student.teacherRecommendation || "",
        program: 'Aral Basic' as const
      };
    };

    const derived: AralLearner[] = [];

    // Match each identified student with their details in dbStudents
    dbStudents.forEach(student => {
      if (identifiedStudentIds.has(student.id)) {
        const matchedClass = studentClassMap.get(student.id);
        const mapped = mapStudentToAralInput(student, student.sectionName);
        const localProg = progressMap.get(student.id);

        derived.push({
          id: student.id,
          lrn: mapped.lrn,
          lastName: mapped.lastName,
          firstName: mapped.firstName,
          middleName: mapped.middleName,
          extension: mapped.extension,
          gradeLevel: mapped.gradeLevel,
          section: matchedClass ? matchedClass.name : mapped.section,
          sex: mapped.sex,
          birthdate: mapped.birthdate,
          parentName: mapped.parentName,
          parentContact: mapped.parentContact,
          learningNeeds: localProg?.learningNeeds || mapped.learningNeeds,
          initialAssessment: localProg?.initialAssessment || mapped.initialAssessment,
          teacherRecommendation: localProg?.teacherRecommendation || mapped.teacherRecommendation,
          
          status: localProg?.status || 'Enrolled',
          consentSigned: localProg?.consentSigned || false,
          consentSignature: localProg?.consentSignature,
          consentDate: localProg?.consentDate,
          preTestScore: localProg?.preTestScore !== undefined ? localProg.preTestScore : 0,
          postTestScore: localProg?.postTestScore !== undefined ? localProg.postTestScore : 0,
          attendance: localProg?.attendance || {},
          progressRemarks: localProg?.progressRemarks || {},
          program: localProg?.program || (matchedClass?.targetSubject?.includes("Plus") ? "Aral Plus" : "Aral Basic")
        });
      }
    });

    // Check if we have identified student IDs that are not in dbStudents yet (still loading or not resolved)
    const matchedIds = new Set(derived.map(d => d.id));
    identifiedStudentIds.forEach(id => {
      if (!matchedIds.has(id)) {
        const localProg = progressMap.get(id);
        const matchedClass = studentClassMap.get(id);
        if (localProg) {
          derived.push({
            ...localProg,
            section: matchedClass ? matchedClass.name : localProg.section
          });
        } else {
          derived.push({
            id,
            lrn: "000000000000",
            lastName: "Loading...",
            firstName: "Student",
            middleName: "",
            extension: "",
            gradeLevel: matchedClass ? `Grade ${matchedClass.gradeLevel}` : "Grade 7",
            section: matchedClass ? matchedClass.name : "ARAL Class",
            sex: "Male",
            birthdate: "2013-01-01",
            parentName: "Parent/Guardian",
            parentContact: "",
            learningNeeds: "",
            initialAssessment: "",
            teacherRecommendation: "",
            status: 'Enrolled',
            consentSigned: false,
            preTestScore: 0,
            postTestScore: 0,
            attendance: {},
            progressRemarks: {},
            program: 'Aral Basic'
          });
        }
      }
    });

    return derived;
  }, [aralClasses, dbStudents, learnersProgress]);

  const handleAddLearner = (learner: AralLearner) => {
    const updated = [learner, ...learnersProgress];
    saveState(KEY_LEARNERS, updated, setLearnersProgress);
  };

  const handleUpdateLearner = (updatedLearner: AralLearner) => {
    let updated = learnersProgress.map(l => l.id === updatedLearner.id ? updatedLearner : l);
    if (!learnersProgress.some(l => l.id === updatedLearner.id)) {
      updated = [updatedLearner, ...learnersProgress];
    }
    saveState(KEY_LEARNERS, updated, setLearnersProgress);
  };

  const handleDeleteLearner = (id: string) => {
    if (confirm("Are you sure you want to delete this learner record?")) {
      const updated = learnersProgress.filter(l => l.id !== id);
      saveState(KEY_LEARNERS, updated, setLearnersProgress);
    }
  };

  const handleAddSession = (session: AralSession) => {
    const updated = [session, ...sessions];
    saveState(KEY_SESSIONS, updated, setSessions);
  };

  const handleAddCompetency = (comp: AralCompetency) => {
    const updated = [...competencies, comp];
    saveState(KEY_COMPETENCIES, updated, setCompetencies);
  };

  const handleDeleteCompetency = (id: string) => {
    if (confirm("Are you sure you want to delete this learning competency?")) {
      const updated = competencies.filter(c => c.id !== id);
      saveState(KEY_COMPETENCIES, updated, setCompetencies);
    }
  };

  const finalUpdateSchool = onUpdateAralSchool || handleUpdateSchool;
  const finalAddCompetency = onAddAralCompetency || handleAddCompetency;
  const finalDeleteCompetency = onDeleteAralCompetency || handleDeleteCompetency;

  const handleDismissNotif = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveState(KEY_NOTIFICATIONS, updated, setNotifications);
  };

  // Reset to default sample datasets
  const handleResetDemoData = () => {
    if (confirm("Do you want to reset all ARAL workspace registries back to default DepEd demo data? This will clear any manual entries.")) {
      setSchoolInfo(DEFAULT_SCHOOL_INFO);
      setLearnersProgress(DEFAULT_LEARNERS);
      setSessions(DEFAULT_SESSIONS);
      setCompetencies(DEFAULT_COMPETENCIES);
      setNotifications(DEFAULT_NOTIFICATIONS);

      localStorage.setItem(KEY_SCHOOL_INFO, JSON.stringify(DEFAULT_SCHOOL_INFO));
      localStorage.setItem(KEY_LEARNERS, JSON.stringify(DEFAULT_LEARNERS));
      localStorage.setItem(KEY_SESSIONS, JSON.stringify(DEFAULT_SESSIONS));
      localStorage.setItem(KEY_COMPETENCIES, JSON.stringify(DEFAULT_COMPETENCIES));
      localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));

      alert("Workspace reset to default DepEd demo data successfully.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 px-1">
      
      {/* 1. TOP UTILITY BAR (ROLE SIMULATOR & DEMO RESET) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        {/* School branding header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#002060] rounded-2xl">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-tight uppercase tracking-wide">
              {schoolInfo.schoolName}
            </h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {schoolInfo.division} • SY {schoolInfo.schoolYear}
            </span>
          </div>
        </div>

        {/* Roles select & Reset */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Reset button */}
          <button
            onClick={handleResetDemoData}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Reset to default demo lists"
          >
            <RotateCcw size={14} />
            Reset Demo Data
          </button>

          {/* Role selector dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-1.5">
            <UserSquare size={16} className="text-[#002060]" />
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wide">Simulate Role:</span>
            <select
              value={activeRole}
              onChange={e => setActiveRole(e.target.value as AralRole)}
              className="text-xs font-black text-[#002060] bg-transparent outline-none cursor-pointer"
            >
              <option value="ARAL Coordinator">ARAL Coordinator</option>
              <option value="Teacher">Teacher</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. MAIN HORIZONTAL NAVIGATION CATEGORIES */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-2 flex gap-1 overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'dashboard'
              ? 'bg-[#002060] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <LayoutDashboard size={16} />
          Dashboard & Analytics
        </button>

        <button
          onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'forms'
              ? 'bg-[#002060] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText size={16} />
          ARAL Forms Workspace
        </button>

        <button
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'master'
              ? 'bg-[#002060] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers size={16} />
          Master Data Registries
        </button>
      </div>

      {/* 3. DYNAMIC VIEWS */}
      <div className="space-y-6">
        {activeTab === 'dashboard' && (
          <AralDashboard 
            learners={learners}
            sessions={sessions}
            activeRole={activeRole}
            notifications={notifications}
            onDismissNotification={handleDismissNotif}
            onNavigateToForm={(formId) => {
              setActiveTab('forms');
            }}
            schoolInfo={finalSchoolInfo}
            onUpdateSchool={finalUpdateSchool}
            competencies={finalCompetencies}
            onAddCompetency={finalAddCompetency}
            onDeleteCompetency={finalDeleteCompetency}
            selectedSection={selectedSection}
            sections={sections}
          />
        )}

        {activeTab === 'forms' && (
          <AralForms
            schoolInfo={finalSchoolInfo}
            learners={learners}
            onAddLearner={handleAddLearner}
            onUpdateLearner={handleUpdateLearner}
            onDeleteLearner={handleDeleteLearner}
            sessions={sessions}
            onAddSession={handleAddSession}
            competencies={finalCompetencies}
            activeRole={activeRole}
            enrolledStudents={enrolledStudents}
            selectedSection={selectedSection}
            sections={sections}
            aralClasses={aralClasses}
          />
        )}

        {activeTab === 'master' && (
          <AralMasterData
            schoolInfo={finalSchoolInfo}
            onUpdateSchool={finalUpdateSchool}
            competencies={finalCompetencies}
            onAddCompetency={finalAddCompetency}
            onDeleteCompetency={finalDeleteCompetency}
            activeRole={activeRole}
            selectedSection={selectedSection}
            sections={sections}
            aralClasses={aralClasses}
            onCreateAralClass={onCreateAralClass}
            onUpdateAralClass={onUpdateAralClass}
            onDeleteAralClass={onDeleteAralClass}
          />
        )}
      </div>

    </div>
  );
};
