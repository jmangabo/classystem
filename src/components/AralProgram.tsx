import React, { useState, useEffect } from 'react';
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

const KEY_SCHOOL_INFO = 'aral_v2_school_info';
const KEY_LEARNERS = 'aral_v2_learners';
const KEY_SESSIONS = 'aral_v2_sessions';
const KEY_COMPETENCIES = 'aral_v2_competencies';
const KEY_NOTIFICATIONS = 'aral_v2_notifications';

export interface AralProgramProps {
  enrolledStudents?: any[];
  selectedSection?: any;
  sections?: any[];
  userProfile?: any;
  globalSettings?: any;
}

export const AralProgram: React.FC<AralProgramProps> = ({
  enrolledStudents = [],
  selectedSection = null,
  sections = [],
  userProfile = null,
  globalSettings = null
}) => {
  // 1. Local Storage Sync States
  const [schoolInfo, setSchoolInfo] = useState<AralSchoolInfo>(DEFAULT_SCHOOL_INFO);
  const [learners, setLearners] = useState<AralLearner[]>([]);
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

      if (savedLearners) setLearners(JSON.parse(savedLearners));
      else {
        setLearners(DEFAULT_LEARNERS);
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

  const handleAddLearner = (learner: AralLearner) => {
    const updated = [learner, ...learners];
    saveState(KEY_LEARNERS, updated, setLearners);
  };

  const handleUpdateLearner = (updatedLearner: AralLearner) => {
    const updated = learners.map(l => l.id === updatedLearner.id ? updatedLearner : l);
    saveState(KEY_LEARNERS, updated, setLearners);
  };

  const handleDeleteLearner = (id: string) => {
    if (confirm("Are you sure you want to delete this learner record?")) {
      const updated = learners.filter(l => l.id !== id);
      saveState(KEY_LEARNERS, updated, setLearners);
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

  const handleDismissNotif = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveState(KEY_NOTIFICATIONS, updated, setNotifications);
  };

  // Reset to default sample datasets
  const handleResetDemoData = () => {
    if (confirm("Do you want to reset all ARAL workspace registries back to default DepEd demo data? This will clear any manual entries.")) {
      setSchoolInfo(DEFAULT_SCHOOL_INFO);
      setLearners(DEFAULT_LEARNERS);
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
            schoolInfo={schoolInfo}
            onUpdateSchool={handleUpdateSchool}
            competencies={competencies}
            onAddCompetency={handleAddCompetency}
            onDeleteCompetency={handleDeleteCompetency}
            selectedSection={selectedSection}
            sections={sections}
          />
        )}

        {activeTab === 'forms' && (
          <AralForms
            schoolInfo={schoolInfo}
            learners={learners}
            onAddLearner={handleAddLearner}
            onUpdateLearner={handleUpdateLearner}
            onDeleteLearner={handleDeleteLearner}
            sessions={sessions}
            onAddSession={handleAddSession}
            competencies={competencies}
            activeRole={activeRole}
            enrolledStudents={enrolledStudents}
            selectedSection={selectedSection}
            sections={sections}
          />
        )}
      </div>

    </div>
  );
};
