import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Trash2, 
  Search, 
  Filter, 
  Star, 
  BarChart2, 
  Users, 
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  ratings: {
    easeOfUse: string;
    uiDesign: string;
    performance: string;
    accuracy: string;
    features: string;
    overallExp: string;
  };
  functionality: {
    login: boolean;
    studentInfo: boolean;
    gradeProcessing: boolean;
    reports: boolean;
    navigation: boolean;
    dataSaving: boolean;
  };
  issues: {
    hadBugs: boolean;
    bugDescription: string;
    featureNeedsImprovement: string;
    additionalFeatures: string;
  };
  overall: {
    likedMost: string;
    improvements: string;
    recommend: boolean;
    whyRecommend: string;
  };
  createdAt: any;
}

export function AdminFeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Feedback[];
      setFeedbacks(data);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      await deleteDoc(doc(db, 'feedback', id));
    }
  };

  const filteredFeedback = feedbacks.filter(f => {
    const matchesSearch = f.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.overall.likedMost?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.issues.bugDescription?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || f.userRole === filterRole;
    return matchesSearch && matchesRole;
  });

  // Analytics
  const scoreMap: Record<string, number> = { 'Excellent': 4, 'Good': 3, 'Fair': 2, 'Poor': 1 };
  
  const calculateAverageRating = (key: keyof Feedback['ratings']) => {
    if (feedbacks.length === 0) return 0;
    const total = feedbacks.reduce((acc, f) => acc + (scoreMap[f.ratings[key]] || 0), 0);
    return (total / feedbacks.length).toFixed(1);
  };

  const getCriterionStats = (key: keyof Feedback['ratings']) => {
    const counts: Record<string, number> = { 'Excellent': 0, 'Good': 0, 'Fair': 0, 'Poor': 0 };
    feedbacks.forEach(f => {
      if (f.ratings[key]) counts[f.ratings[key]]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const calculateFeatureTestRate = (key: keyof Feedback['functionality']) => {
    if (feedbacks.length === 0) return 0;
    const total = feedbacks.filter(f => f.functionality[key]).length;
    return Math.round((total / feedbacks.length) * 100);
  };

  const bugRate = feedbacks.length > 0 
    ? Math.round((feedbacks.filter(f => f.issues.hadBugs).length / feedbacks.length) * 100)
    : 0;

  const recommendRate = feedbacks.length > 0 
    ? Math.round((feedbacks.filter(f => f.overall.recommend).length / feedbacks.length) * 100)
    : 0;

  const chartData = [
    { name: 'Ease of Use', score: parseFloat(calculateAverageRating('easeOfUse').toString()) },
    { name: 'UI Design', score: parseFloat(calculateAverageRating('uiDesign').toString()) },
    { name: 'Performance', score: parseFloat(calculateAverageRating('performance').toString()) },
    { name: 'Accuracy', score: parseFloat(calculateAverageRating('accuracy').toString()) },
    { name: 'Features', score: parseFloat(calculateAverageRating('features').toString()) },
    { name: 'Overall', score: parseFloat(calculateAverageRating('overallExp').toString()) },
  ];

  const featureData = [
    { name: 'Login', rate: calculateFeatureTestRate('login') },
    { name: 'Students', rate: calculateFeatureTestRate('studentInfo') },
    { name: 'Grades', rate: calculateFeatureTestRate('gradeProcessing') },
    { name: 'Reports', rate: calculateFeatureTestRate('reports') },
    { name: 'Nav', rate: calculateFeatureTestRate('navigation') },
    { name: 'Storage', rate: calculateFeatureTestRate('dataSaving') },
  ];

  const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#06b6d4', '#8b5cf6'];

  return (
    <div className="space-y-6 px-4 py-6 w-full max-w-7xl mx-auto">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Evaluations</div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{feedbacks.length}</div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Recommendation Rate</div>
          <div className="text-2xl font-bold text-indigo-600 tracking-tight">{recommendRate}%</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-rose-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 text-slate-400">Bug Reports</div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight">{bugRate}%</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-emerald-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 text-slate-400">Overall Rating</div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">{calculateAverageRating('overallExp')} <span className="text-sm font-medium text-slate-300">/ 4</span></div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Evaluation Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-base font-bold text-slate-900">General Evaluation</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Average scores across criteria</p>
            </div>
            <BarChart2 className="text-slate-400" size={18} />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 4]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} width={100} />
                <ChartTooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Functionality Testing Check Rate */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8">
             <div>
              <h3 className="text-base font-bold text-slate-900">Testing Coverage</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">% total testers checked this module</p>
            </div>
            <CheckCircle2 className="text-slate-400" size={18} />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} dy={10} />
                 <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} />
                 <ChartTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 />
                 <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={32}>
                    {featureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#c7d2fe'} />
                    ))}
                 </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Detailed Responses</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Full breakdown of individual feedback</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Filter feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full md:w-64 font-medium"
                />
             </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400">Analyzing feedback data...</div>
          ) : filteredFeedback.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium">No evaluations found in the database.</div>
          ) : (
            filteredFeedback.map((f) => (
              <div key={f.id} className="p-6 sm:p-8 hover:bg-slate-50/50 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-6 flex-1">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 text-base font-bold">
                        {f.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="text-base font-bold text-slate-900">{f.userName}</span>
                           <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded uppercase tracking-wider">{f.userRole}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Rating</span>
                          <span className="text-sm font-bold text-slate-700">{f.ratings.overallExp}</span>
                       </div>
                       <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Modules</span>
                          <span className="text-sm font-bold text-slate-700">
                            {Object.values(f.functionality).filter(v => v).length} / 6
                          </span>
                       </div>
                       <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Bugs</span>
                          <span className={`text-sm font-bold ${f.issues.hadBugs ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {f.issues.hadBugs ? 'Reported' : 'None'}
                          </span>
                       </div>
                       <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Recommend</span>
                          <span className={`text-sm font-bold ${f.overall.recommend ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {f.overall.recommend ? 'Yes' : 'No'}
                          </span>
                       </div>
                    </div>

                    <div className="space-y-4 pt-2">
                       {f.overall.likedMost && (
                         <div className="space-y-1">
                            <h5 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider ml-0.5">Liked Most</h5>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed bg-white p-3 rounded-lg border border-slate-100">{f.overall.likedMost}</p>
                         </div>
                       )}
                       {f.issues.bugDescription && (
                         <div className="p-4 border border-rose-100 bg-rose-50/50 rounded-lg space-y-1">
                            <h5 className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Bug Detail</h5>
                            <p className="text-sm text-rose-900 font-bold leading-relaxed">"{f.issues.bugDescription}"</p>
                         </div>
                       )}
                       {f.overall.improvements && (
                         <div className="space-y-1">
                            <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Suggested Improvements</h5>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed italic">{f.overall.improvements}</p>
                         </div>
                       )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(f.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Delete feedback"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
