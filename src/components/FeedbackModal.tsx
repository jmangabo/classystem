import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageSquare, Star, AlertCircle, Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, safeGetDoc as getDoc } from '../firebase';
import { UserProfile } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export function FeedbackModal({ isOpen, onClose, user }: FeedbackModalProps) {
  const [step, setStep] = useState(1);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [ratings, setRatings] = useState({
    easeOfUse: 'Good',
    uiDesign: 'Good',
    performance: 'Good',
    accuracy: 'Good',
    features: 'Good',
    overallExp: 'Good'
  });
  const [functionality, setFunctionality] = useState({
    login: false,
    studentInfo: false,
    gradeProcessing: false,
    reports: false,
    navigation: false,
    dataSaving: false
  });
  const [issues, setIssues] = useState({
    hadBugs: false,
    bugDescription: '',
    featureNeedsImprovement: '',
    additionalFeatures: ''
  });
  const [overall, setOverall] = useState({
    likedMost: '',
    improvements: '',
    recommend: true,
    whyRecommend: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    async function checkStatus() {
      if (!user || !isOpen) return;
      setCheckingStatus(true);
      try {
        const feedbackDoc = await getDoc(doc(db, 'feedback', user.uid));
        if (feedbackDoc.exists()) {
          setAlreadySubmitted(true);
        } else {
          setAlreadySubmitted(false);
        }
      } catch (error) {
        console.error("Error checking feedback status:", error);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkStatus();
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'feedback', user.uid), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userRole: user.role,
        ratings,
        functionality,
        issues,
        overall,
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
      setAlreadySubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setStep(1);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // @ts-ignore
      handleFirestoreError(error, 'write', `feedback/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingOptions = ['Excellent', 'Good', 'Fair', 'Poor'];
  const criteria = [
    { key: 'easeOfUse', label: 'Ease of Use' },
    { key: 'uiDesign', label: 'User Interface Design' },
    { key: 'performance', label: 'System Speed/Performance' },
    { key: 'accuracy', label: 'Accuracy of Information' },
    { key: 'features', label: 'Features and Functions' },
    { key: 'overallExp', label: 'Overall User Experience' }
  ];

  const features = [
    { key: 'login', label: 'Login System' },
    { key: 'studentInfo', label: 'Student Information Module' },
    { key: 'gradeProcessing', label: 'Grade Viewing/Processing' },
    { key: 'reports', label: 'Reports Generation' },
    { key: 'navigation', label: 'Navigation/Menu Access' },
    { key: 'dataSaving', label: 'Data Saving and Retrieval' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className="bg-slate-900 px-8 py-6 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
                  <MessageSquare className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg tracking-tight">CLASS Beta Evaluation</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-indigo-400 text-[10px] uppercase font-bold tracking-wider">Step {step} of 4</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-1 w-5 rounded-full transition-colors ${s <= step ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-all"
                id="close_feedback_modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-8 custom-scrollbar">
              {checkingStatus ? (
                <div className="py-20 flex flex-col items-center text-center">
                  <div className="w-10 h-10 border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-slate-500 text-sm font-medium">Preparing evaluation form...</p>
                </div>
              ) : alreadySubmitted && !submitted ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-amber-50 p-6 rounded-full mb-6 border border-amber-100"
                  >
                    <AlertCircle className="text-amber-500" size={48} />
                  </motion.div>
                  <h4 className="text-xl font-bold text-slate-900">Feedback Received</h4>
                  <p className="text-slate-500 mt-3 max-w-sm text-sm font-medium leading-relaxed">
                    You have already submitted your evaluation for the beta testing. We appreciate your contribution!
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-8 px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              ) : submitted ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="bg-indigo-50 p-6 rounded-full mb-6"
                  >
                    <CheckCircle2 className="text-indigo-600" size={48} />
                  </motion.div>
                  <h4 className="text-2xl font-bold text-slate-900">Evaluation Submitted</h4>
                  <p className="text-slate-500 mt-3 max-w-sm text-sm font-medium leading-relaxed">
                    Thank you for participating in the CLASS Beta testing. Your feedback will help us build a better experience for everyone.
                  </p>
                </div>
              ) : (
                <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="pb-2 border-b border-slate-100 ml-1">
                        <h4 className="text-lg font-bold text-slate-900">General Evaluation</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Please rate the application based on your experience.</p>
                      </div>
                      
                      <div className="space-y-4">
                        {criteria.map((item) => (
                          <div key={item.key} className="space-y-3 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                            <label className="text-[13px] font-semibold text-slate-700 block ml-1">{item.label}</label>
                            <div className="grid grid-cols-4 gap-2">
                              {ratingOptions.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setRatings(prev => ({ ...prev, [item.key]: opt }))}
                                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                                    ratings[item.key as keyof typeof ratings] === opt
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                      : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="pb-2 border-b border-slate-100 ml-1">
                        <h4 className="text-lg font-bold text-slate-900">Functionality Testing</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Select the features you were able to test.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {features.map((f) => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => setFunctionality(prev => ({ ...prev, [f.key]: !prev[f.key as keyof typeof functionality] }))}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                              functionality[f.key as keyof typeof functionality]
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                                : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 shadow-sm'
                            }`}
                          >
                            <span className="text-sm font-semibold">{f.label}</span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              functionality[f.key as keyof typeof functionality] ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-transparent'
                            }`}>
                              <CheckCircle2 size={14} strokeWidth={3} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                       <div className="pb-2 border-b border-slate-100 ml-1">
                        <h4 className="text-lg font-bold text-slate-900">Issues Encountered</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Help us understand any technical difficulties.</p>
                      </div>

                      <div className="space-y-6">
                        <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-100 space-y-4">
                          <p className="text-[13px] font-semibold text-slate-700 ml-1">Did you encounter any bugs or errors?</p>
                          <div className="flex gap-3">
                            {[true, false].map((val) => (
                              <button
                                key={val.toString()}
                                type="button"
                                onClick={() => setIssues(prev => ({ ...prev, hadBugs: val }))}
                                className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all ${
                                  issues.hadBugs === val
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                                }`}
                              >
                                {val ? 'Yes' : 'No'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {issues.hadBugs && (
                          <div className="space-y-2">
                             <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Bug Description</label>
                             <textarea
                                value={issues.bugDescription}
                                onChange={(e) => setIssues(prev => ({ ...prev, bugDescription: e.target.value }))}
                                placeholder="Describe the bugs or errors encountered..."
                                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none min-h-[100px] text-sm font-medium bg-slate-50/30 transition-all"
                             />
                          </div>
                        )}

                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Feature Improvement</label>
                              <input
                                type="text"
                                value={issues.featureNeedsImprovement}
                                onChange={(e) => setIssues(prev => ({ ...prev, featureNeedsImprovement: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium bg-slate-50/30 transition-all"
                                placeholder="Mention features that feel incomplete"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Recommended Addition</label>
                              <input
                                type="text"
                                value={issues.additionalFeatures}
                                onChange={(e) => setIssues(prev => ({ ...prev, additionalFeatures: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium bg-slate-50/30 transition-all"
                                placeholder="Any new features you'd like to see?"
                              />
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                       <div className="pb-2 border-b border-slate-100 ml-1">
                        <h4 className="text-lg font-bold text-slate-900">Overall Feedback</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Final thoughts on the CLASS application.</p>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">What did you like most?</label>
                           <textarea
                             value={overall.likedMost}
                             onChange={(e) => setOverall(prev => ({ ...prev, likedMost: e.target.value }))}
                             className="w-full p-4 rounded-xl border border-slate-200 min-h-[80px] text-sm font-medium bg-slate-50/30 outline-none focus:border-indigo-500 transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Future suggestions</label>
                           <textarea
                             value={overall.improvements}
                             onChange={(e) => setOverall(prev => ({ ...prev, improvements: e.target.value }))}
                             className="w-full p-4 rounded-xl border border-slate-200 min-h-[80px] text-sm font-medium bg-slate-50/30 outline-none focus:border-indigo-500 transition-all"
                           />
                        </div>

                        <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-100 space-y-4">
                          <p className="text-[13px] font-semibold text-slate-700 ml-1">Would you recommend CLASS to others?</p>
                          <div className="flex gap-3">
                            {[true, false].map((val) => (
                              <button
                                key={val.toString()}
                                type="button"
                                onClick={() => setOverall(prev => ({ ...prev, recommend: val }))}
                                className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all ${
                                  overall.recommend === val
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'
                                }`}
                              >
                                {val ? 'Yes' : 'No'}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-2 pt-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Reason</label>
                            <input
                              type="text"
                              value={overall.whyRecommend}
                              onChange={(e) => setOverall(prev => ({ ...prev, whyRecommend: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:border-indigo-500 transition-all"
                              placeholder="Briefly tell us why"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </form>
              )}
            </div>

            {/* Footer Navigation */}
            {!submitted && !alreadySubmitted && !checkingStatus && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
                <button
                  type="button"
                  onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                  className="px-6 py-2 rounded-lg font-bold text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
                >
                  {step === 1 ? 'Cancel' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    if (step < 4) setStep(step + 1);
                    else handleSubmit(e as any);
                  }}
                  disabled={isSubmitting}
                  className="px-10 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <AlertCircle size={16} />
                    </motion.div>
                  ) : (
                    step === 4 ? <Send size={16} /> : <ArrowUpRight size={16} />
                  )}
                  <span>{step === 4 ? 'Submit Evaluation' : 'Next Step'}</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
