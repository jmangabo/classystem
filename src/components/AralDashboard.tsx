import React, { useMemo, useState } from 'react';
import { 
  AralLearner, 
  AralSession, 
  AralRole,
  AralSchoolInfo,
  AralCompetency
} from './AralData';
import { 
  LayoutDashboard, 
  Users, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Bell, 
  BookOpen, 
  GraduationCap, 
  Activity,
  Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Legend, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

interface AralDashboardProps {
  learners: AralLearner[];
  sessions: AralSession[];
  activeRole: AralRole;
  notifications: any[];
  onDismissNotification: (id: string) => void;
  onNavigateToForm: (formId: number, studentId?: string) => void;
  schoolInfo: AralSchoolInfo;
  onUpdateSchool: (info: AralSchoolInfo) => void;
  competencies: AralCompetency[];
  onAddCompetency: (comp: AralCompetency) => void;
  onDeleteCompetency: (id: string) => void;
  selectedSection?: any;
  sections?: any[];
}

export const AralDashboard: React.FC<AralDashboardProps> = ({
  learners,
  sessions,
  activeRole,
  notifications,
  onDismissNotification,
  onNavigateToForm,
  schoolInfo,
  onUpdateSchool,
  competencies,
  onAddCompetency,
  onDeleteCompetency,
  selectedSection = null,
  sections = []
}) => {
  // 1. Core Analytics Calculations
  const stats = useMemo(() => {
    const total = learners.length;
    const identified = learners.filter(l => l.status === 'Identified').length;
    const enrolled = learners.filter(l => l.status === 'Enrolled').length;
    const completed = learners.filter(l => l.status === 'Completed').length;
    const activeSessions = sessions.length;

    // Calculate Average Attendance Percentage across enrolled and completed learners
    const activeLearners = learners.filter(l => l.status === 'Enrolled' || l.status === 'Completed');
    let totalPossibleDays = 0;
    let totalPresentDays = 0;

    activeLearners.forEach(l => {
      const dates = Object.keys(l.attendance || {});
      dates.forEach(d => {
        totalPossibleDays++;
        if (l.attendance[d] === 'Present') {
          totalPresentDays++;
        }
      });
    });

    const avgAttendance = totalPossibleDays > 0 
      ? Math.round((totalPresentDays / totalPossibleDays) * 100) 
      : 0; // Fallback to 0 if no logs

    // Calculate Overall Improvement Rate (Pre-Test vs Post-Test Score difference)
    const testedLearners = learners.filter(l => l.preTestScore > 0 && l.postTestScore > 0);
    let totalPre = 0;
    let totalPost = 0;
    testedLearners.forEach(l => {
      totalPre += l.preTestScore;
      totalPost += l.postTestScore;
    });

    const improvementRate = totalPre > 0 
      ? Math.round(((totalPost - totalPre) / totalPre) * 100) 
      : 0; // Default average improvement to 0

    return {
      total,
      identified,
      enrolled,
      completed,
      activeSessions,
      avgAttendance,
      improvementRate
    };
  }, [learners, sessions]);

  // 2. Chart Data Generation
  // A. Pre/Post Score Comparison
  const improvementChartData = useMemo(() => {
    return learners
      .filter(l => l.status === 'Enrolled' || l.status === 'Completed')
      .slice(0, 5)
      .map(l => ({
        name: `${l.firstName} ${l.lastName.charAt(0)}.`,
        'Pre-Test': l.preTestScore,
        'Post-Test': l.postTestScore,
        Gain: Math.max(0, l.postTestScore - l.preTestScore)
      }));
  }, [learners]);

  // B. Attendance Trend
  const attendanceTrendData = useMemo(() => {
    // Group attendance by date
    const datesMap: { [date: string]: { present: number; total: number } } = {};
    learners.forEach(l => {
      Object.entries(l.attendance || {}).forEach(([date, status]) => {
        if (!datesMap[date]) datesMap[date] = { present: 0, total: 0 };
        datesMap[date].total++;
        if (status === 'Present') datesMap[date].present++;
      });
    });

    return Object.entries(datesMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'Attendance Rate': Math.round((d.present / d.total) * 100)
      }));
  }, [learners]);

  // C. Enrollment Status Pie Chart
  const enrollmentStatusData = useMemo(() => {
    const identified = learners.filter(l => l.status === 'Identified').length;
    const enrolled = learners.filter(l => l.status === 'Enrolled').length;
    const completed = learners.filter(l => l.status === 'Completed').length;
    const dropped = learners.filter(l => l.status === 'Dropped').length;

    return [
      { name: 'Identified', value: identified, color: '#94a3b8' },
      { name: 'Enrolled', value: enrolled, color: '#002060' },
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Dropped', value: dropped, color: '#f43f5e' }
    ];
  }, [learners]);

  // D. Subject Performance Average Scores
  const subjectPerformanceData = useMemo(() => {
    // Dynamically calculate subject performance based on registered learners
    const subjects = ['Reading', 'Mathematics', 'Science'];
    return subjects.map(sub => {
      const subLearners = learners.filter(l => {
        const needsSub = l.learningNeeds?.toLowerCase().includes(sub.toLowerCase()) || 
                          l.initialAssessment?.toLowerCase().includes(sub.toLowerCase());
        return (l.status === 'Enrolled' || l.status === 'Completed') && needsSub;
      });

      const tested = subLearners.filter(l => l.preTestScore > 0 || l.postTestScore > 0);
      let avgPre = 0;
      let avgPost = 0;
      if (tested.length > 0) {
        avgPre = Math.round(tested.reduce((sum, curr) => sum + curr.preTestScore, 0) / tested.length);
        avgPost = Math.round(tested.reduce((sum, curr) => sum + curr.postTestScore, 0) / tested.length);
      }

      const gain = avgPre > 0 ? Math.round(((avgPost - avgPre) / avgPre) * 100) : 0;

      return {
        subject: sub,
        Pre: avgPre,
        Post: avgPost,
        Improvement: gain > 0 ? `${gain}%` : '0%'
      };
    });
  }, [learners]);

  return (
    <div className="space-y-6">
      {/* Role Notice & Info Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-cover opacity-10 pointer-events-none" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=600')` }} />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-400 text-blue-900 text-xs font-black uppercase rounded-full tracking-wider shadow">
              ARAL Workspace ({activeRole})
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Academic Recovery and Accessible Learning Program
          </h2>
          <p className="text-blue-100 max-w-3xl text-sm leading-relaxed">
            Welcome to the centralized DepEd ARAL workspace. Track learner diagnostic improvements, log weekly session objectives, check daily attendance sheets, and auto-compile reports compliant with DepEd memorandum guidelines.
          </p>
        </div>
      </div>
          {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Identified */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
            <Users size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Identified</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">{stats.identified}</span>
              <span className="text-xs text-slate-400 font-medium">learners</span>
            </div>
          </div>
        </div>

        {/* Total Enrolled */}
        <div className="bg-white p-5 rounded-2xl border border-blue-50 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-[#002060]">
            <GraduationCap size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Enrolled</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#002060]">{stats.enrolled}</span>
              <span className="text-xs text-slate-400 font-medium">active</span>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white p-5 rounded-2xl border border-amber-50 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
            <Calendar size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Sessions</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">{stats.activeSessions}</span>
              <span className="text-xs text-slate-400 font-medium">conducted</span>
            </div>
          </div>
        </div>

        {/* Completed Learners */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-50 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
            <CheckCircle size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Completed</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{stats.completed}</span>
              <span className="text-xs text-slate-400 font-medium">graduated</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-500">
            <Activity size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Avg Attendance</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600">{stats.avgAttendance}%</span>
              <span className="text-xs text-emerald-500 font-bold">Excellent</span>
            </div>
          </div>
        </div>

        {/* Improvement Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Gain Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-orange-600">+{stats.improvementRate}%</span>
              <span className="text-xs text-slate-400 font-medium">average score boost</span>
            </div>
          </div>
        </div>

        {/* ARAL Tracks Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <BookOpen size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">ARAL Program Tracks Breakdown</span>
              <div className="flex gap-4 mt-1">
                <span className="text-xs font-bold text-slate-700">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1.5"></span>
                  Aral Basic: <strong className="font-black text-slate-800">{learners.filter(l => (l.program || 'Aral Basic') === 'Aral Basic').length}</strong>
                </span>
                <span className="text-xs font-bold text-slate-700">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500 mr-1.5"></span>
                  Aral Plus: <strong className="font-black text-slate-800">{learners.filter(l => l.program === 'Aral Plus').length}</strong>
                </span>
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-[#002060] text-white text-xs font-black rounded-lg">Basic & Plus</span>
        </div>
      </div>

      {/* 2. Charts and Analytical Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Pre-Test vs Post-Test Score (Diagnostic Growth) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Diagnostic Progress (Form 5)</h3>
              <p className="text-xs text-slate-400">Pre-test vs Post-test performance scores out of 50</p>
            </div>
            <span className="text-xs font-bold text-[#002060] bg-blue-50 px-3 py-1 rounded-full">Top Learners Growth</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={improvementChartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 50]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Pre-Test" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="Post-Test" fill="#002060" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Enrollment Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Status Breakdown</h3>
            <p className="text-xs text-slate-400">Distribution of ARAL Learners</p>
          </div>
          <div className="h-44 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enrollmentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {enrollmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-800">{learners.length}</span>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            {enrollmentStatusData.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-500 font-medium">{s.name}: <strong className="text-slate-700">{s.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Attendance Trends */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Attendance Trend Rate</h3>
              <p className="text-xs text-slate-400">Weekly progression of registered learner attendance</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Target: 85%+</span>
          </div>
          <div className="h-60">
            {attendanceTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Attendance Rate" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No attendance logs entered yet. Go to Form 3 to log daily entries.
              </div>
            )}
          </div>
        </div>

        {/* Notifications & Warning alerts panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              Notifications
            </h3>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-black rounded-full">
              {notifications.length} Alerts
            </span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[240px] pr-1">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-3.5 rounded-2xl border text-xs relative flex gap-3 ${
                  n.severity === 'high' 
                    ? 'bg-rose-50 border-rose-100 text-rose-900' 
                    : n.severity === 'medium'
                    ? 'bg-amber-50 border-amber-100 text-amber-950'
                    : 'bg-blue-50 border-blue-100 text-blue-900'
                }`}
              >
                <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${
                  n.severity === 'high' ? 'text-rose-500' : 'text-amber-500'
                }`} />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="font-bold uppercase tracking-wider text-[10px]">
                      {n.type}
                    </strong>
                    <button 
                      onClick={() => onDismissNotification(n.id)}
                      className="text-[10px] underline hover:no-underline absolute top-2.5 right-2.5 opacity-50 hover:opacity-100"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="leading-normal">{n.message}</p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                <p>All clean! No critical warnings or missing consents.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Subject Diagnostic Metrics */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Subject Competency Boost Rates</h3>
          <p className="text-xs text-slate-400">Diagnostic growth results consolidated by core remediation subjects</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subjectPerformanceData.map((sub, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="font-black text-[#002060] text-sm">{sub.subject}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">+{sub.Improvement} Gain</span>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Pre-Test: <strong>{sub.Pre}/50</strong></span>
                  <span>Post-Test: <strong>{sub.Post}/50</strong></span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(sub.Post / 50) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
