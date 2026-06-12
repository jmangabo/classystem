import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Plus, X, Users, Loader2, CloudLightning } from 'lucide-react';
import { Student, Section } from '../types';

const getGradeWeight = (g: string | number | undefined | null): number => {
  if (!g) return 0;
  const s = String(g).trim().toLowerCase();
  if (s === 'kinder' || s === 'kindergarten') return 0;
  const val = parseInt(s, 10);
  return isNaN(val) ? 0 : val;
};

interface ManualSiblingSelectorProps {
  siblingIds: string[];
  onChange: (newIds: string[]) => void;
  sections: Section[];
  currentStudentId?: string | null;
  currentGradeLevel?: string | number | null;
  currentSectionId?: string | null;
}

export function ManualSiblingSelector({
  siblingIds,
  onChange,
  sections,
  currentStudentId,
  currentGradeLevel,
  currentSectionId
}: ManualSiblingSelectorProps) {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const fetchAllStudents = async () => {
      if (!sections || sections.length === 0) return;
      setLoading(true);
      try {
        const promises = sections.map(async (sec) => {
          const sSnap = await getDocs(collection(db, `sections/${sec.id}/students`));
          return sSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            sectionId: sec.id,
            sectionName: sec.name,
            gradeLevel: sec.gradeLevel
          } as Student));
        });
        const results = await Promise.all(promises);
        if (active) {
          setAllStudents(results.flat());
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching all students for sibling auto/manual-matching:", err);
        if (active) setLoading(false);
      }
    };

    fetchAllStudents();
    return () => {
      active = false;
    };
  }, [sections]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Map of siblingId to actual Student details
  const linkedSiblings = useMemo(() => {
    return allStudents.filter(s => siblingIds && siblingIds.includes(s.id));
  }, [allStudents, siblingIds]);

  // Candidates that can be added as a sibling (excluding self, already added, and MUST be of lower grade level than the current student)
  const candidates = useMemo(() => {
    const currentGradeW = getGradeWeight(currentGradeLevel);

    return allStudents.filter(s => {
      if (currentStudentId && s.id === currentStudentId) return false;
      if (siblingIds && siblingIds.includes(s.id)) return false;

      // Rule: Candidate sibling must have a strictly lower grade level than the current student
      const candidateGradeW = getGradeWeight(s.gradeLevel);
      if (candidateGradeW >= currentGradeW) return false;
      
      const q = searchQuery.toLowerCase().trim();
      if (!q) return false;

      const nameVal = (s.name || "").toLowerCase();
      const lrnVal = (s.lrn || "").toLowerCase();
      const lastNameVal = (s.lastName || "").toLowerCase();
      const firstNameVal = (s.firstName || "").toLowerCase();

      return nameVal.includes(q) || lrnVal.includes(q) || lastNameVal.includes(q) || firstNameVal.includes(q);
    });
  }, [allStudents, siblingIds, searchQuery, currentStudentId, currentGradeLevel]);

  const handleAdd = async (studentId: string) => {
    if (siblingIds.includes(studentId)) {
      setSearchQuery("");
      setIsDropdownOpen(false);
      return;
    }

    const newIds = [...siblingIds, studentId];
    onChange(newIds);
    setSearchQuery("");
    setIsDropdownOpen(false);

    if (currentStudentId) {
      setSyncing(true);
      try {
        const me = allStudents.find(s => s.id === currentStudentId);
        const other = allStudents.find(s => s.id === studentId);
        const meSectionId = currentSectionId || me?.sectionId;
        
        if (meSectionId && other?.sectionId) {
          // 1. Update current student in db
          const currentRef = doc(db, `sections/${meSectionId}/students`, currentStudentId);
          await updateDoc(currentRef, { siblingIds: newIds });

          // 2. Update other student in db
          const otherRef = doc(db, `sections/${other.sectionId}/students`, studentId);
          const otherSiblings = other.siblingIds || [];
          if (!otherSiblings.includes(currentStudentId)) {
            await updateDoc(otherRef, { siblingIds: [...otherSiblings, currentStudentId] });
          }
          
          // Force update local cache of allStudents so UI updates instantly
          setAllStudents(prev => prev.map(s => {
            if (s.id === currentStudentId) {
              return { ...s, siblingIds: newIds };
            }
            if (s.id === studentId) {
              return { ...s, siblingIds: [...(s.siblingIds || []), currentStudentId] };
            }
            return s;
          }));
        }
      } catch (err) {
        console.error("Error setting manual sibling immediately:", err);
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleRemove = async (studentId: string) => {
    const newIds = siblingIds.filter(id => id !== studentId);
    onChange(newIds);

    if (currentStudentId) {
      setSyncing(true);
      try {
        const me = allStudents.find(s => s.id === currentStudentId);
        const other = allStudents.find(s => s.id === studentId);
        const meSectionId = currentSectionId || me?.sectionId;

        if (meSectionId) {
          // 1. Update current student in db
          const currentRef = doc(db, `sections/${meSectionId}/students`, currentStudentId);
          await updateDoc(currentRef, { siblingIds: newIds });

          // 2. Update other student in db if found
          if (other?.sectionId) {
            const otherRef = doc(db, `sections/${other.sectionId}/students`, studentId);
            const otherSiblings = other.siblingIds || [];
            if (otherSiblings.includes(currentStudentId)) {
              const updatedOtherSiblings = otherSiblings.filter(id => id !== currentStudentId);
              await updateDoc(otherRef, { siblingIds: updatedOtherSiblings });
            }
          }

          // Force update local cache of allStudents
          setAllStudents(prev => prev.map(s => {
            if (s.id === currentStudentId) {
              return { ...s, siblingIds: newIds };
            }
            if (s.id === studentId) {
              return { ...s, siblingIds: (s.siblingIds || []).filter(id => id !== currentStudentId) };
            }
            return s;
          }));
        }
      } catch (err) {
        console.error("Error removing manual sibling immediately:", err);
      } finally {
        setSyncing(false);
      }
    }
  };

  return (
    <div className="space-y-4" ref={dropdownRef}>
      {/* Sibling Badge Grid */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-indigo-700 uppercase tracking-widest flex flex-wrap items-center gap-1.5">
          <Users size={14} className="shrink-0" />
          <span>Manual Sibling Linkage ({linkedSiblings.length})</span>
          <span className="text-[10px] text-amber-600 font-extrabold normal-case italic">
            (must be the higher grade to link the siblings)
          </span>
          {syncing && (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black animate-pulse transition-all ml-auto shrink-0 shadow-sm border border-emerald-200">
              <CloudLightning size={10} className="text-emerald-600 shrink-0 animate-bounce" />
              <span>SAVED &amp; SYNCED IN REAL-TIME</span>
            </span>
          )}
        </label>
        
        {loading && linkedSiblings.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-1 font-semibold">
            <Loader2 size={12} className="animate-spin text-indigo-650" />
            <span>Loading sibling list...</span>
          </div>
        ) : linkedSiblings.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-semibold italic bg-slate-50 border border-slate-150 rounded-xl p-3">
            No active manual sibling linkages. Search for other learners below to link them.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {linkedSiblings.map(student => (
              <div 
                key={student.id} 
                className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50 p-2.5 px-3 rounded-xl transition-all shadow-sm"
              >
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-bold text-indigo-950 truncate leading-snug">{student.name}</span>
                  <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">
                    {student.lrn ? `LRN: ${student.lrn}` : "No LRN"} • {Number(student.gradeLevel) === 0 ? "Kinder" : `Grade ${student.gradeLevel}`} - {student.sectionName}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemove(student.id)}
                  className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-colors shrink-0 ml-2"
                  title="Remove sibling link"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sibling Search Input */}
      <div className="relative space-y-1">
        <div className="flex justify-between items-center flex-wrap gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search registry to link sibling</span>
          <span className="text-[9.5px] text-amber-600 font-extrabold uppercase tracking-wide">
            Only lower grade levels are eligible
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input 
            type="text"
            placeholder="Type other student's name or LRN..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-xs font-semibold"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setIsDropdownOpen(false); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors text-xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Results list */}
        {isDropdownOpen && searchQuery.trim() !== "" && (
          <div className="absolute z-[150] w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1 divide-y divide-slate-150">
            {candidates.length === 0 ? (
              <div className="py-3 px-4 text-center text-slate-400 text-xs font-medium">
                No matching or eligible students found
              </div>
            ) : (
              candidates.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleAdd(student.id)}
                  className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="block text-xs font-bold text-slate-700 truncate group-hover:text-indigo-650">{student.name}</span>
                    <span className="block text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                      {student.lrn ? `LRN: ${student.lrn}` : "No LRN"} • {Number(student.gradeLevel) === 0 ? "Kinder" : `Grade ${student.gradeLevel}`} - {student.sectionName}
                    </span>
                  </div>
                  <div className="bg-slate-100 text-slate-400 p-1 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-md transition-colors shrink-0">
                    <Plus size={12} />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
