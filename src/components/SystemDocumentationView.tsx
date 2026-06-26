import React, { useState } from 'react';
import { 
  Book, 
  Users, 
  Calendar, 
  ShieldCheck, 
  Database, 
  FileText, 
  Terminal, 
  ArrowRight,
  ChevronRight,
  Info,
  Server
} from 'lucide-react';
import { motion } from 'motion/react';

export function SystemDocumentationView() {
  const [activeSection, setActiveSection] = useState('overview');

  const navigation = [
    { id: 'overview', label: 'System Overview', icon: <Info size={16} /> },
    { id: 'modules', label: 'Core Modules', icon: <Database size={16} /> },
    { id: 'roles', label: 'Roles & Security', icon: <ShieldCheck size={16} /> },
    { id: 'workflow', label: 'Data Workflow', icon: <ArrowRight size={16} /> },
    { id: 'stack', label: 'Technical Stack', icon: <Terminal size={16} /> },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Enterprise Architecture</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                CLASS (Centralized Learner Assessment & School System) is built on a distributed, cloud-native architecture designed to handle thousands of simultaneous users while maintaining millisecond-level responsiveness for grade calculations.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                  <Server size={24} />
                </div>
                <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tight">Cloud-First Data</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Real-time synchronization across devices ensures that teachers and admins always see the latest records without manual refreshes.</p>
              </div>
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tight">Automated Compliance</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Built-in algorithms for DepEd-standard grade transmutation and attendance reporting eliminates manual tallying errors.</p>
              </div>
            </div>
          </div>
        );
      case 'modules':
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Functional Modules</h3>
            <div className="space-y-4">
              {[
                { title: 'Student Management', items: ['Learner Enrollment', 'Permanent Records', 'Transfer Management'], color: 'indigo' },
                { title: 'Attendance & Behavior', items: ['Daily Tracking', 'Class Reports (SF2)', 'Monthly Summary (SF4)', 'Teacher Comments/Remarks'], color: 'rose' },
                { title: 'Academic Engine', items: ['Subject Weighting', 'Gradebook (Record Assessment)', 'Grading Summaries'], color: 'amber' }
              ].map((group, i) => (
                <div key={i} className={`p-6 rounded-3xl border border-${group.color}-100 bg-${group.color}-50/30`}>
                  <h4 className={`font-black text-${group.color}-600 uppercase tracking-widest text-[10px] mb-4`}>{group.title}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {group.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-white shadow-sm">
                        <ChevronRight size={14} className={`text-${group.color}-400`} />
                        <span className="text-xs font-bold text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'roles':
        return (
          <div className="space-y-8 animate-in backdrop-blur-sm duration-500">
             <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Roles & Security</h3>
              <p className="text-slate-600 leading-relaxed">The system employs Attribute-Based Access Control (ABAC) to ensure that users only interact with data pertinent to their scope.</p>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Scope</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Capabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">System Admin</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">Platform-Wide</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 text-indigo-600">Global Configuration, Security, Schools</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">School Admin</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">Institutional</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 text-indigo-600">User Management, School Profile, Academic Years</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">Teacher</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">Class/Section</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 text-indigo-600">Grading, Attendance, Enrollment, SF Exports</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'workflow':
        return (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
             <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Operational Pipeline</h3>
             <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-100 hidden md:block"></div>
                <div className="space-y-8">
                  {[
                    { title: 'Configuration', desc: 'Administrators initialize schools, years, and global grading parameters.' },
                    { title: 'Provisioning', desc: 'Secure accounts are generated for educators and linked to their sections.' },
                    { title: 'Enrollment', desc: 'Teachers populate sections through manual entry or bulk CSV/Text imports.' },
                    { title: 'Data Entry', desc: 'Real-time assessment scores and daily attendance are recorded cloud-side.' },
                    { title: 'Certification', desc: 'Official reports (SF2) are generated and signed for compliance.' }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-6 relative group">
                      <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center font-black italic text-xl shadow-lg shadow-indigo-100 z-10 shrink-0 group-hover:scale-110 transition-transform">
                        {i + 1}
                      </div>
                      <div className="pt-2">
                        <h5 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{step.title}</h5>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-lg mt-1">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        );
      case 'stack':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center py-6">
              <Terminal size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Stack & Infrastructure</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Frontend', value: 'React 18', color: 'indigo' },
                { label: 'Language', value: 'TypeScript', color: 'blue' },
                { label: 'Styling', value: 'Tailwind CSS', color: 'sky' },
                { label: 'Motion', value: 'Framer Motion', color: 'rose' },
                { label: 'Database', value: 'Firestore', color: 'amber' },
                { label: 'Auth', value: 'Firebase', color: 'orange' },
                { label: 'Realtime', value: 'NoSQL Sync', color: 'emerald' },
                { label: 'Pipeline', value: 'Vite / CI-CD', color: 'slate' }
              ].map((tech, i) => (
                <div key={tech.label} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{tech.label}</p>
                  <p className="text-sm font-bold text-slate-800">{tech.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[600px] flex gap-8">
      {/* Sidebar Navigation */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <div className="px-4 py-6 mb-2">
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight leading-none mb-1">
            System <br /> Docs
          </h2>
          <div className="h-1 w-8 bg-indigo-600 rounded-full mt-2"></div>
        </div>
        {navigation.map((nav) => (
          <button
            key={nav.id}
            onClick={() => setActiveSection(nav.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeSection === nav.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className={activeSection === nav.id ? 'text-white' : 'text-slate-400'}>
              {nav.icon}
            </span>
            {nav.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-[40px] p-10 overflow-auto max-h-[70vh] shadow-xl">
        <div className="max-w-3xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
