import React, { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, Calendar, CheckCircle2, X, AlertCircle, Clock } from "lucide-react";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";


function EncodingClosedBanner() {
  return (
    <div className="bg-rose-50 border-b border-rose-100 text-rose-800 px-4 py-3 flex items-center justify-center gap-3 shadow-sm">
      <Clock size={16} />
      <span className="text-xs font-bold uppercase tracking-wider italic">
        Class Record Encoding is Currently Closed &bull; No Active School Year Found in Global Settings
      </span>
    </div>
  );
}

export function AdminSchoolYearView({ onBack, currentUser, onShowFeedback, isFeedbackOpen, onCloseFeedback }: { onBack: () => void, currentUser: any, onShowFeedback?: () => void, isFeedbackOpen?: boolean, onCloseFeedback?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [newSchoolYear, setNewSchoolYear] = useState("");
  const [isSettingDeadline, setIsSettingDeadline] = useState(false);
  const [tempDeadline, setTempDeadline] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      } else {
        setGlobalSettings({ schoolYears: [], activeSchoolYear: null });
      }
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const handleAddSchoolYear = async () => {
    if (!newSchoolYear.trim()) return;
    
    // Warn and validate format YYYY-YYYY as standard DepEd format
    const syPattern = /^\d{4}-\d{4}$/;
    if (!syPattern.test(newSchoolYear.trim())) {
      alert("Invalid format! Please use the standard DepEd format: YYYY-YYYY (e.g., 2024-2025).");
      return;
    }

    const syList = globalSettings?.schoolYears || [];
    if (syList.includes(newSchoolYear.trim())) {
      alert("This school year already exists.");
      return;
    }

    const updatedList = [...syList, newSchoolYear.trim()].sort((a, b) => b.localeCompare(a));
    const isFirst = updatedList.length === 1;

    try {
      await setDoc(doc(db, "settings", "general"), {
        ...globalSettings,
        schoolYears: updatedList,
        ...(isFirst ? { activeSchoolYear: newSchoolYear.trim() } : {})
      });
      setNewSchoolYear("");
    } catch (e) {
      console.error(e);
      alert("Failed to add school year. Please try again.");
    }
  };

  const handleRemoveSchoolYear = async (sy: string) => {
    if (!confirm(`Are you sure you want to remove school year "${sy}"? All related settings and closed status will be reset.`)) return;

    const updatedList = (globalSettings?.schoolYears || []).filter((y: string) => y !== sy);
    const updates: any = { 
      ...globalSettings, 
      schoolYears: updatedList,
      closedSchoolYears: (globalSettings?.closedSchoolYears || []).filter((y: string) => y !== sy)
    };
    if (globalSettings?.activeSchoolYear === sy) {
      updates.activeSchoolYear = updatedList.length > 0 ? updatedList[0] : null;
      updates.finalizationDeadline = "";
    }
    if (updatedList.length === 0) {
      updates.finalizationDeadline = "";
    }
    
    try {
      await setDoc(doc(db, "settings", "general"), updates);
    } catch (e) {
      console.error(e);
      alert("Failed to remove school year. Please try again.");
    }
  };

  const handleSetActive = async (sy: string) => {
     try {
       await setDoc(doc(db, "settings", "general"), {
         ...globalSettings,
         activeSchoolYear: sy,
         closedSchoolYears: (globalSettings?.closedSchoolYears || []).filter((y: string) => y !== sy)
       });
     } catch (e) {
       console.error(e);
       alert("Failed to set active school year. Please try again.");
     }
  };

  const handleCloseSchoolYear = async (sy: string) => {
     try {
       await setDoc(doc(db, "settings", "general"), {
         ...globalSettings,
         activeSchoolYear: globalSettings?.activeSchoolYear === sy ? null : globalSettings?.activeSchoolYear,
         closedSchoolYears: [...(globalSettings?.closedSchoolYears || []), sy]
       });
     } catch (e) {
       console.error(e);
       alert("Failed to close school year. Please try again.");
     }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {!globalSettings?.activeSchoolYear && <EncodingClosedBanner />}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
             <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manage School Years</h1>
             <p className={`text-xs font-medium uppercase tracking-wider mt-0.5 ${!globalSettings?.activeSchoolYear ? 'text-rose-500' : 'text-slate-500'}`}>
               {globalSettings?.activeSchoolYear ? `Active School Year: ${globalSettings.activeSchoolYear}` : 'No school year is active'}
             </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-8">
           {loading ? (
             <div className="p-10 flex flex-col items-center justify-center text-slate-400">
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-widest">Loading Settings...</p>
             </div>
           ) : (
             <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8">
               <div className="flex gap-3">
                 <input 
                   type="text"
                   value={newSchoolYear}
                   onChange={e => setNewSchoolYear(e.target.value)}
                   placeholder="Enter new school year (e.g. 2024-2025)"
                   className="flex-1 px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm"
                   onKeyDown={e => e.key === 'Enter' && handleAddSchoolYear()}
                 />
                 <button 
                   onClick={handleAddSchoolYear}
                   disabled={!newSchoolYear.trim()}
                   className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                 >
                   <Plus size={16} /> Add
                 </button>
               </div>

               <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Global School Years</h3>
                  {(!globalSettings?.schoolYears || globalSettings.schoolYears.length === 0) ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No school years added yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {globalSettings.schoolYears.map((sy: string) => {
                        const isActive = globalSettings.activeSchoolYear === sy;
                        const isClosed = (globalSettings.closedSchoolYears || []).includes(sy);
                        return (
                          <div key={sy} className={`flex items-center justify-between p-4 rounded-lg border ${isActive ? 'bg-indigo-50 border-indigo-100' : isClosed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                               <span className={`font-semibold ${isClosed ? 'text-slate-500' : 'text-slate-900'}`}>{sy}</span>
                               {isActive && (
                                   <>
                                       <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                                       {isSettingDeadline ? (
                                         <div className="flex items-center gap-2">
                                           <input 
                                             type="datetime-local"
                                             value={tempDeadline}
                                             onChange={e => setTempDeadline(e.target.value)}
                                             className="px-2 py-1 border border-indigo-200 rounded-lg text-xs font-bold"
                                           />
                                           <button 
                                             onClick={async () => {
                                               try {
                                                  await setDoc(doc(db, 'settings', 'general'), { finalizationDeadline: tempDeadline }, { merge: true });
                                                  alert('Deadline set successfully.');
                                                  setIsSettingDeadline(false);
                                               } catch (e: any) {
                                                  console.error("Firestore error:", e);
                                                  alert('Failed to set deadline. Error: ' + e.message);
                                               }
                                             }}
                                             className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors hover:bg-indigo-700"
                                           >
                                             Save
                                           </button>
                                           <button 
                                             onClick={() => setIsSettingDeadline(false)}
                                             className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
                                           >
                                             Cancel
                                           </button>
                                         </div>
                                       ) : (
                                         <>
                                         <button 
                                             onClick={() => {
                                                 setTempDeadline(globalSettings?.finalizationDeadline || "");
                                                 setIsSettingDeadline(true);
                                             }}
                                             className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-colors"
                                         >
                                             {globalSettings?.finalizationDeadline ? 'Change Deadline' : 'Set Deadline'}
                                         </button>
                                         {globalSettings?.finalizationDeadline && (<>
                                           <span className="ml-2 text-[10px] text-indigo-700 font-bold px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg whitespace-nowrap uppercase tracking-wider">
                                             Deadline: {new Date(globalSettings.finalizationDeadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </span>
                                            <button
                                              onClick={async () => {
                                                if (window.confirm("Are you sure you want to clear the finalization deadline?")) {
                                                  try {
                                                    await setDoc(doc(db, "settings", "general"), { finalizationDeadline: "" }, { merge: true });
                                                    alert("Deadline cleared successfully.");
                                                  } catch (e: any) {
                                                    console.error(e);
                                                    alert("Failed to clear deadline: " + e.message);
                                                  }
                                                }
                                              }}
                                              className="ml-2 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                                            >
                                              Clear Deadline
                                            </button>
                                            </>
                                         )}
                                       </>
                                       )}
                                   </>
                               )}
                               {isClosed && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Closed</span>}
                            </div>
                            <div className="flex items-center gap-2">
                               {!isActive && !isClosed && (
                                 <button 
                                   onClick={() => handleSetActive(sy)}
                                   className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-colors"
                                 >
                                   Set Active
                                 </button>
                               )}
                               {!isClosed && (
                                 <button 
                                   onClick={() => handleCloseSchoolYear(sy)}
                                   className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
                                 >
                                   Close
                                 </button>
                               )}
                               {isClosed && (
                                 <button 
                                   onClick={() => handleSetActive(sy)}
                                   className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-colors"
                                 >
                                   Re-Open
                                 </button>
                               )}
                               <button 
                                 onClick={() => handleRemoveSchoolYear(sy)}
                                 className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                 title="Remove School Year"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
