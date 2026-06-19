import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import { isTleSubject } from "../utils";
import { Student, Section, Subject } from "../types";
import { 
  AlertCircle, 
  CheckCircle, 
  Search, 
  Filter, 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  RefreshCw, 
  ChevronDown, 
  X,
  Plus,
  HelpCircle,
  FileCheck,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TleDashboardViewProps {
  sections: Section[];
  subjects: Subject[];
  currentUser: any;
  onBack: () => void;
}

interface StudentWithSection {
  student: Student;
  section: Section;
  enrolledTle: Subject | null;
  sectionSubjects: Subject[];
}

const PREDEFINED_SPECS = [
  "TLE - COOKERY",
  "TLE - COMPUTER SYSTEMS SERVICING",
  "TLE - TECHNICAL DRAFTING",
  "TLE - BREAD AND PASTRY PRODUCTION",
  "TLE - BEAUTY CARE",
  "TLE - DRESSMAKING",
  "TLE - ELECTRICAL INSTALLATION AND MAINTENANCE",
  "TLE - AGRICULTURAL CROPS PRODUCTION",
  "TLE - FOOD PROCESSING"
];

export const TleDashboardView: React.FC<TleDashboardViewProps> = ({
  sections,
  subjects: rootSubjects,
  currentUser,
  onBack
}) => {
  const [loading, setLoading] = useState(false);
  const [allRecords, setAllRecords] = useState<StudentWithSection[]>([]);
  const [sectionSubjectsMap, setSectionSubjectsMap] = useState<{ [secId: string]: Subject[] }>({});
  const [isSavingId, setIsSavingId] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // View state: students vs. class components
  const [activeTab, setActiveTab] = useState<"students" | "components">("students");

  // Add Component Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompName, setNewCompName] = useState("");
  const [newCompCustomName, setNewCompCustomName] = useState("");
  const [newCompTeacherEmail, setNewCompTeacherEmail] = useState("");
  const [newCompOfferedTerms, setNewCompOfferedTerms] = useState<number[]>([1, 2, 3, 4]);
  const [newCompGradeLevels, setNewCompGradeLevels] = useState<number[]>([9, 10]);

  // Teachers state
  const [teachers, setTeachers] = useState<any[]>([]);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<"unassigned" | "assigned" | "all">("unassigned");
  const [selectedSex, setSelectedSex] = useState<string>("");

  // Fetch teachers inside TLE tracker reactively
  useEffect(() => {
    const schoolId = currentUser?.schoolId || sections.find(s => s.schoolId)?.schoolId;
    if (!schoolId) return;

    const q = query(
      collection(db, "users"),
      where("schoolId", "==", schoolId)
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
      setTeachers(list);
    }, (err) => {
      console.error("Error loading teachers in TLE dashboard: ", err);
    });

    return () => unsub();
  }, [currentUser?.schoolId, sections]);

  // Filter G9/G10 active sections for filter drop-downs
  const g910Sections = useMemo(() => {
    return sections.filter(sec => {
      const lvl = Number(sec.gradeLevel);
      return lvl === 9 || lvl === 10;
    });
  }, [sections]);

  // Load students and subjects for all Junior High TLE sections
  const refreshData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const fetchedStudents: StudentWithSection[] = [];
      const sectionsWithSubjects: { [sectionId: string]: Subject[] } = {};

      await Promise.all(
        g910Sections.map(async (sec) => {
          try {
            // Fetch students from section's sub-collection
            const studentsSnap = await getDocs(collection(db, "sections", sec.id, "students"));
            const studentsInSec = studentsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Student));

            // Fetch subjects from section's sub-collection and merge assigned teachers
            const subjectsSnap = await getDocs(collection(db, "sections", sec.id, "subjects"));
            const secTeachers = sec.subjectTeachers || {};
            const subjectsInSec = subjectsSnap.docs.map(docSnap => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                ...data,
                teacherEmail: secTeachers[docSnap.id] || data.teacherEmail || ""
              };
            }) as Subject[];

            sectionsWithSubjects[sec.id] = subjectsInSec;

            studentsInSec.forEach(student => {
              // Ignore non-active status drops/transfers
              if (student.status === "Transferred Out" || student.status === "Dropped Out") return;

              const enrolledTle = subjectsInSec.find(sub => 
                student.enrolledSubjectIds?.includes(sub.id) && isTleSubject(sub.name)
              ) || null;

              fetchedStudents.push({
                student,
                section: sec,
                enrolledTle,
                sectionSubjects: subjectsInSec
              });
            });
          } catch (secError) {
            console.error(`Error loading section ${sec.name}:`, secError);
          }
        })
      );

      // Sort students by section name, then by gender (Male first, then Female), finally alphabetically
      fetchedStudents.sort((a, b) => {
        const secCompare = (a.section.name || "").localeCompare(b.section.name || "");
        if (secCompare !== 0) return secCompare;

        // Sort by sex first: Male then Female
        if (a.student.sex !== b.student.sex) {
          return a.student.sex === "Male" ? -1 : 1;
        }

        // Alphabetical sort within gender group
        const nameA = `${a.student.lastName || ''}, ${a.student.firstName || ''} ${a.student.middleName || ''}`.toLowerCase();
        const nameB = `${b.student.lastName || ''}, ${b.student.firstName || ''} ${b.student.middleName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setAllRecords(fetchedStudents);
      setSectionSubjectsMap(sectionsWithSubjects);
    } catch (err: any) {
      console.error("Error loading centralized TLE assignments:", err);
      setErrorMsg("Failed to load student TLE records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (g910Sections.length > 0) {
      refreshData();
    }
  }, [g910Sections.length]);

  // Handle assignment
  const assignTle = async (record: StudentWithSection, typeNameOrSubjectId: string, isNewSpecialization: boolean) => {
    setIsSavingId(record.student.id);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const { student, section, sectionSubjects } = record;
      let targetSubjectId = "";
      let finalTypeName = typeNameOrSubjectId;

      if (isNewSpecialization) {
        // Double check if subject name already exists in this specific section
        let matchedSubject = sectionSubjects.find(s => s.name.toUpperCase() === typeNameOrSubjectId.toUpperCase());
        
        if (!matchedSubject) {
          // Create new TLE subject
          const subjectsCollRef = collection(db, "sections", section.id, "subjects");
          const newDocRef = await addDoc(subjectsCollRef, {
            name: typeNameOrSubjectId,
            gradeLevel: Number(section.gradeLevel),
            group: "Revised K-10 Curriculum",
            subjectType: "CORE",
            sectionId: section.id,
            schoolId: section.schoolId || "",
            teacherEmail: "",
            wwWeight: 25,
            ptWeight: 50,
            taWeight: 25,
            unit: 1,
            order: 999,
            offeredTerms: [1, 2, 3, 4]
          });
          targetSubjectId = newDocRef.id;
        } else {
          targetSubjectId = matchedSubject.id;
        }
      } else {
        targetSubjectId = typeNameOrSubjectId;
        const sub = sectionSubjects.find(s => s.id === targetSubjectId);
        if (sub) finalTypeName = sub.name;
      }

      // Filter other subjects to prevent duplicate TLE enrollments
      const cleanEnrolledIds = (student.enrolledSubjectIds || []).filter(subId => {
        const match = sectionSubjects.find(s => s.id === subId);
        return !match || !isTleSubject(match.name);
      });

      const nextSubjectIds = [...cleanEnrolledIds, targetSubjectId];

      const studentRef = doc(db, "sections", section.id, "students", student.id);
      await updateDoc(studentRef, { enrolledSubjectIds: nextSubjectIds });

      setSuccessMsg(`Successfully assigned "${finalTypeName}" to ${student.lastName || student.name}, ${student.firstName || ""}`);
      
      // Quickly sync local state without completely resetting scroll/focus if possible, but full reload keeps it precise and synced with DB
      await refreshData();
    } catch (err: any) {
      console.error("Error saving TLE specialization: ", err);
      setErrorMsg("Failed to assign specialization. Please try again.");
    } finally {
      setIsSavingId("");
    }
  };

  // Remove TLE enrollment
  const removeTle = async (record: StudentWithSection) => {
    setIsSavingId(record.student.id);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const { student, section, sectionSubjects } = record;
      const cleanEnrolledIds = (student.enrolledSubjectIds || []).filter(subId => {
        const match = sectionSubjects.find(s => s.id === subId);
        return !match || !isTleSubject(match.name);
      });

      const studentRef = doc(db, "sections", section.id, "students", student.id);
      await updateDoc(studentRef, { enrolledSubjectIds: cleanEnrolledIds });

      setSuccessMsg(`Removed TLE specialization assignment for ${student.lastName || student.name}.`);
      await refreshData();
    } catch (err: any) {
      console.error("Error removing TLE assignment:", err);
      setErrorMsg("Failed to remove specialization.");
    } finally {
      setIsSavingId("");
    }
  };

  // Update TLE Enrollment Term
  const handleUpdateTerm = async (student: Student, sectionId: string, subjectId: string, term: string) => {
    setIsSavingId(student.id);
    try {
      const studentRef = doc(db, "sections", sectionId, "students", student.id);
      
      const updatedTerms = { ...(student.tleEnrollmentTerms || {}) };
      updatedTerms[subjectId] = term;
      
      await updateDoc(studentRef, { tleEnrollmentTerms: updatedTerms });
      await refreshData();
    } catch (err: any) {
      console.error("Error updating term:", err);
      setErrorMsg("Failed to update term.");
    } finally {
      setIsSavingId("");
    }
  };

  // Update teacher assignment for a TLE specialization subject
  const handleUpdateSubjectTeacher = async (sectionId: string, subjectId: string, teacherEmail: string) => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const email = teacherEmail.trim().toLowerCase();
      // 1. Update individual subject doc's teacherEmail field
      const subjectDocRef = doc(db, "sections", sectionId, "subjects", subjectId);
      await setDoc(subjectDocRef, { teacherEmail: email }, { merge: true });

      // 2. Update parent section.subjectTeachers map field
      const sectionDocRef = doc(db, "sections", sectionId);
      await updateDoc(sectionDocRef, {
        [`subjectTeachers.${subjectId}`]: email
      });

      setSuccessMsg("Successfully updated TLE teacher assignment.");
      await refreshData();
    } catch (err: any) {
      console.error("Error updating TLE subject teacher:", err);
      setErrorMsg("Failed to update teacher. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Delete a customized TLE specialization component from the section
  const handleDeleteTleComponent = async (sectionId: string, subjectId: string, subjectName: string) => {
    if (!window.confirm(`Are you sure you want to completely remove "${subjectName}" from this section? This will also unassign and clear TLE enrollment for all students currently registered under this specialization.`)) {
      return;
    }
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      // 1. Delete individual subject document
      await deleteDoc(doc(db, "sections", sectionId, "subjects", subjectId));

      // 2. Remove from parent section subjectTeachers map
      const sectionDocRef = doc(db, "sections", sectionId);
      await updateDoc(sectionDocRef, {
        [`subjectTeachers.${subjectId}`]: deleteField()
      });

      // 3. Clear from section students' enrolledSubjectIds
      const studentsSnap = await getDocs(collection(db, "sections", sectionId, "students"));
      await Promise.all(
        studentsSnap.docs.map(async (stDoc) => {
          const sData = stDoc.data();
          const enrolled = sData.enrolledSubjectIds || [];
          if (enrolled.includes(subjectId)) {
            const nextIds = enrolled.filter((id: string) => id !== subjectId);
            await updateDoc(doc(db, "sections", sectionId, "students", stDoc.id), {
              enrolledSubjectIds: nextIds
            });
          }
        })
      );

      setSuccessMsg(`Successfully removed customized TLE specialization "${subjectName}" and updated student records.`);
      await refreshData();
    } catch (err: any) {
      console.error("Error deleting TLE component subject:", err);
      setErrorMsg("Failed to delete specialization component.");
    } finally {
      setLoading(false);
    }
  };

  // Create & assign a new custom or predefined TLE specialization to Selected JHS sections
  const handleCreateTleComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = (newCompName === "Other" ? newCompCustomName : newCompName).trim();
    if (!finalName) {
      setErrorMsg("Please enter or choose a valid TLE specialization name.");
      return;
    }
    if (newCompOfferedTerms.length === 0) {
      setErrorMsg("Please select at least one Offered Term (1-4).");
      return;
    }
    if (newCompGradeLevels.length === 0) {
      setErrorMsg("Please select at least one Offered Grade Level.");
      return;
    }

    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const targetSections = g910Sections.filter(sec => newCompGradeLevels.includes(Number(sec.gradeLevel)));
      if (targetSections.length === 0) {
        setErrorMsg("No Grade 9 or Grade 10 sections found for the selected grade levels.");
        setLoading(false);
        return;
      }

      let addedCount = 0;
      let existingCount = 0;

      for (const sec of targetSections) {
        const existingInSec = (sectionSubjectsMap[sec.id] || []);
        const dup = existingInSec.find(s => s.name.toUpperCase() === finalName.toUpperCase());
        
        if (dup) {
          existingCount++;
          continue; // Skip if it already exists for this section
        }

        // 1. Add new subject to section's template of subjects
        const subjectsCollRef = collection(db, "sections", sec.id, "subjects");
        const newSubDoc = await addDoc(subjectsCollRef, {
          name: finalName,
          gradeLevel: Number(sec.gradeLevel),
          group: "Revised K-10 Curriculum",
          subjectType: "CORE",
          sectionId: sec.id,
          schoolId: sec.schoolId || "",
          teacherEmail: newCompTeacherEmail || "",
          wwWeight: 25,
          ptWeight: 50,
          taWeight: 25,
          unit: 1,
          order: 999,
          offeredTerms: newCompOfferedTerms
        });

        // 2. Add to parent section's subjectTeachers map if teacher is assigned
        if (newCompTeacherEmail) {
          const secDocRef = doc(db, "sections", sec.id);
          await updateDoc(secDocRef, {
            [`subjectTeachers.${newSubDoc.id}`]: newCompTeacherEmail.trim().toLowerCase()
          });
        }
        
        addedCount++;
      }

      if (addedCount > 0) {
        setSuccessMsg(`Successfully created customized TLE component "${finalName}" across ${addedCount} sections!${existingCount > 0 ? ` (Skipped ${existingCount} sections where it already existed)` : ''}`);
      } else if (existingCount > 0) {
        setErrorMsg(`"${finalName}" already exists in all ${existingCount} selected Grade sections.`);
        setLoading(false);
        return;
      }
      
      setShowAddModal(false);
      
      // Reset modal inputs
      setNewCompName("");
      setNewCompCustomName("");
      setNewCompTeacherEmail("");
      setNewCompOfferedTerms([1, 2, 3, 4]);
      setNewCompGradeLevels([9, 10]);

      await refreshData();
    } catch (err: any) {
      console.error("Error creating TLE component:", err);
      setErrorMsg("Failed to create customized TLE component. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Screen filtered records
  const filteredRecords = useMemo(() => {
    return allRecords.filter(rec => {
      // Search term
      const fullName = `${rec.student.lastName || ''} ${rec.student.firstName || ''} ${rec.student.middleName || ''} ${rec.student.name || ''}`.toLowerCase();
      if (searchTerm && !fullName.includes(searchTerm.toLowerCase()) && !rec.student.studentNumber?.includes(searchTerm)) {
        return false;
      }

      // Grade level
      if (selectedGrade && String(rec.section.gradeLevel) !== selectedGrade) {
        return false;
      }

      // Section ID
      if (selectedSectionId && rec.section.id !== selectedSectionId) {
        return false;
      }

      // Sex
      if (selectedSex && rec.student.sex !== selectedSex) {
        return false;
      }

      // Status (Unassigned vs Assigned)
      if (selectedStatus === "unassigned" && rec.enrolledTle !== null) {
        return false;
      }
      if (selectedStatus === "assigned" && rec.enrolledTle === null) {
        return false;
      }

      return true;
    });
  }, [allRecords, searchTerm, selectedGrade, selectedSectionId, selectedStatus, selectedSex]);

  // Compute metrics
  const stats = useMemo(() => {
    const total = allRecords.length;
    const assigned = allRecords.filter(r => r.enrolledTle !== null).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [allRecords]);

  // Auto-reset Section dropdown if Grade changes
  useEffect(() => {
    setSelectedSectionId("");
  }, [selectedGrade]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12" id="tle_tracker_dashboard">
      {/* Tracker Top Ribbon / Action Back bar */}
      <div className="bg-white border-b border-slate-200 py-4 px-6 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm print:hidden gap-4 flex-wrap">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft size={16} /> Back to Directory
        </button>

        {/* TAB SWITCHER */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
              activeTab === "students" 
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Learners Assignment
          </button>
          <button
            onClick={() => setActiveTab("components")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
              activeTab === "components" 
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Class Components & Teachers
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewCompName("");
              setNewCompCustomName("");
              setNewCompTeacherEmail("");
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Create JHS TLE Component
          </button>
          <button 
            disabled={loading}
            onClick={refreshData}
            className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            title="Refresh tracker records"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider hidden sm:inline">
            Active School Year
          </span>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-6 md:px-8 mt-8 space-y-8">
        
        {/* Contextual Header Banner */}
        <div className="relative bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl p-8 md:p-10 text-white shadow-xl overflow-hidden min-h-[180px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <GraduationCap size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3 text-slate-50 font-black tracking-tight leading-none uppercase">
                  Junior High TLE Tracker
                </h1>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1.5">
                  Automated Specialization Verification Dashboard • Grades 9 & 10
                </p>
              </div>
            </div>
            
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Grade 9 and 10 Technology and Livelihood Education (TLE) subjects must be configured and enrolled manually due to various specialized component pathways. Use this unified console to instantly track unassigned learners and enrol them to prevent incomplete student records.
            </p>
          </div>
        </div>

        {/* Alerts & Messages Panel */}
        <AnimatePresence>
          {successMsg && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 flex items-center justify-between text-emerald-800 text-sm font-semibold shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-600" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-800">
                <X size={16} />
              </button>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-rose-50 border border-rose-250 rounded-2xl p-4 flex items-center justify-between text-rose-800 text-sm font-semibold shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-rose-600" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-800">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bento Board Grid for Analytics Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Junior High Cohort</span>
              <h3 className="text-3xl font-black text-slate-900 font-sans">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded"></span>
                ) : (
                  stats.total
                )}
              </h3>
              <p className="text-xs text-slate-500">Total enrolled G9 & G10 learners</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <BookOpen size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assigned Specializations</span>
              <h3 className="text-3xl font-black text-emerald-600 font-sans">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded"></span>
                ) : (
                  stats.assigned
                )}
              </h3>
              <p className="text-xs text-slate-500">Learners with active TLE subject</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <FileCheck size={20} />
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-6 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80">Pending Allocation</span>
              <h3 className="text-3xl font-black text-amber-600 font-sans">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded"></span>
                ) : (
                  stats.unassigned
                )}
              </h3>
              <p className="text-xs text-amber-700">Requires manual allocation</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>

        {/* Tab conditionals */}
        {activeTab === "components" ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">TLE Specialization Components by Class Section</h2>
                <p className="text-xs text-slate-500 font-medium">Assign teachers and manage customization pathways for Grade 9 and Grade 10 classifications.</p>
              </div>
              <button
                onClick={() => {
                  setNewCompName("");
                  setNewCompCustomName("");
                  setNewCompTeacherEmail("");
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <Plus size={14} /> Add New Component
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {(() => {
                // Group by TLE component name
                const compGroups: Record<string, { section: Section; subject: Subject }[]> = {};
                g910Sections.forEach(sec => {
                  const secSubjects = sectionSubjectsMap[sec.id] || [];
                  const tleSubjects = secSubjects.filter(sub => isTleSubject(sub.name));
                  tleSubjects.forEach(sub => {
                    if (!compGroups[sub.name]) compGroups[sub.name] = [];
                    compGroups[sub.name].push({ section: sec, subject: sub });
                  });
                });

                const sortedCompNames = Object.keys(compGroups).sort((a,b) => a.localeCompare(b));

                if (sortedCompNames.length === 0) {
                  return (
                    <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      <AlertCircle size={32} className="text-amber-500 mx-auto mb-3" />
                      <p className="text-slate-600 font-bold text-sm uppercase tracking-wider">No TLE Components Configured</p>
                      <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">Use the "Add New Component" button to configure TLE customization pathways for Grade 9 and Grade 10 classes.</p>
                    </div>
                  );
                }

                return sortedCompNames.map(compName => {
                  const assignments = compGroups[compName];
                  
                  return (
                    <div key={compName} className="border border-slate-200/85 rounded-2xl p-5 bg-slate-50/25 flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-indigo-100/50 pb-3">
                        <div>
                          <span className="text-[10px] bg-indigo-50 border border-indigo-150/60 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            TLE Specialization
                          </span>
                          <h3 className="text-base font-extrabold text-slate-800 uppercase mt-1">{compName}</h3>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Offered In</span>
                          <span className="text-xs text-slate-600 font-semibold">{assignments.length} Section{assignments.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-150">
                        <table className="w-full text-left border-collapse bg-white">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                              <th className="py-3 px-4">Class Section</th>
                              <th className="py-3 px-4">Assigned Subject Teacher</th>
                              <th className="py-3 px-1.5 text-center">Enrolled learners</th>
                              <th className="py-3 px-4 text-center">Delete component</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {assignments.map(({ section: sec, subject: sub }) => {
                              const enrolledCount = allRecords.filter(r => r.section.id === sec.id && r.enrolledTle?.id === sub.id).length;

                              return (
                                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                  {/* Section Name */}
                                  <td className="py-3 px-4 font-bold text-slate-800 uppercase flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                      Grade {sec.gradeLevel} - {sec.name}
                                    </div>
                                    <span className="text-[9px] text-slate-400 ml-3.5 tracking-wider font-semibold">Adv. {sec.adviserName || 'N/A'}</span>
                                  </td>

                                  {/* Assigned Teacher Dropdown */}
                                  <td className="py-3 px-4">
                                    <div className="max-w-[280px]">
                                      <select
                                        value={sub.teacherEmail || ""}
                                        onChange={(e) => handleUpdateSubjectTeacher(sec.id, sub.id, e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-250 hover:border-slate-350 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none text-slate-700 transition-all cursor-pointer"
                                      >
                                        <option value="">-- No Assigned Teacher --</option>
                                        {teachers.map(t => (
                                          <option key={t.uid} value={t.email}>
                                            👤 {t.displayName || t.name || t.email} ({t.email})
                                          </option>
                                        ))}
                                        {/* Display assigned teacher email option if not found in registered teachers list to dodge empty/none selection fallback */}
                                        {sub.teacherEmail && !teachers.some(t => (t.email || "").trim().toLowerCase() === sub.teacherEmail.trim().toLowerCase()) && (
                                          <option value={sub.teacherEmail}>
                                            👤 {sub.teacherEmail} (External/Not Registered)
                                          </option>
                                        )}
                                      </select>
                                    </div>
                                  </td>

                                  {/* Enrollment count */}
                                  <td className="py-3 px-1.5 text-center font-extrabold">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                                      enrolledCount > 0 
                                        ? "bg-indigo-50 border border-indigo-100 text-indigo-700" 
                                        : "bg-amber-50 border border-amber-100 text-amber-700"
                                    }`}>
                                      {enrolledCount} Learners
                                    </span>
                                  </td>

                                  {/* Delete Action button */}
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => handleDeleteTleComponent(sec.id, sub.id, sub.name)}
                                      className="p-1 px-2.5 text-[10px] font-bold uppercase rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <>
            {/* Dynamic Filters Area */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Filter size={16} className="text-indigo-600" />
                  <span>Configure Verification Filters</span>
                </div>
                <button 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedGrade("");
                    setSelectedSectionId("");
                    setSelectedSex("");
                    setSelectedStatus("unassigned");
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search Input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name or student No..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-700"
                  />
                </div>

                {/* Status Selector */}
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="unassigned">⚠️ Unassigned Only (Default)</option>
                    <option value="assigned">✅ Assigned Only</option>
                    <option value="all">🔍 Show All Students</option>
                  </select>
                </div>

                {/* Grade Level Selector */}
                <div className="relative">
                  <select
                    value={selectedGrade}
                    onChange={e => setSelectedGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="">All JHS Grades</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                  </select>
                </div>

                {/* Section Selector */}
                <div className="relative">
                  <select
                    value={selectedSectionId}
                    onChange={e => setSelectedSectionId(e.target.value)}
                    disabled={!selectedGrade}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Grade Sections</option>
                    {g910Sections
                      .filter(sec => !selectedGrade || String(sec.gradeLevel) === selectedGrade)
                      .map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))
                    }
                  </select>
                </div>

                {/* Sex Selector */}
                <div className="relative">
                  <select
                    value={selectedSex}
                    onChange={e => setSelectedSex(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Main List of Students Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
                  <RefreshCw size={36} className="text-indigo-600 animate-spin" />
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider animate-pulse">Syncing junior high school cohort...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-emerald-500 border border-emerald-100">
                    <CheckCircle size={28} />
                  </div>
                  <p className="text-slate-700 font-extrabold text-base mb-1">Excellent Status - No Action Needed</p>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    {selectedStatus === "unassigned" 
                      ? "All Grade 9 and Grade 10 learners matched by your current search parameters are already enrolled in TLE components!"
                      : "No students matched your search filters. Try loosening filters to retrieve more records."
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100 tracking-wider">
                        <th className="py-4.5 px-6 font-extrabold">Student Detail</th>
                        <th className="py-4.5 px-4 font-extrabold">Section</th>
                        <th className="py-4.5 px-4 font-extrabold">Gender</th>
                        <th className="py-4.5 px-4 font-extrabold">Current Status</th>
                        <th className="py-4.5 px-4 font-extrabold text-center">Term Enrolled</th>
                        <th className="py-4.5 px-6 font-extrabold text-center max-w-[320px] md:max-w-[400px]">Assign Component / specialization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium font-sans">
                      {filteredRecords.map(({ student, section, enrolledTle, sectionSubjects }) => {
                        const isSaving = isSavingId === student.id;

                        // Retrieve the assigned TLE subject teacher's email/display-name with case-insensitive check
                        const subTeacherUser = enrolledTle ? teachers.find(t => (t.email || "").trim().toLowerCase() === (enrolledTle.teacherEmail || "").trim().toLowerCase()) : null;
                        const teacherLabel = subTeacherUser ? (subTeacherUser.displayName || subTeacherUser.name || enrolledTle.teacherEmail) : (enrolledTle?.teacherEmail || "");

                        return (
                          <tr 
                            key={student.id} 
                            className={`hover:bg-slate-50/60 transition-colors ${enrolledTle === null ? 'bg-amber-50/25 preload:bg-amber-50/40' : ''}`}
                          >
                            {/* Student Name */}
                            <td className="py-4.5 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold leading-none shrink-0 ${
                                  student.sex === 'Female' 
                                    ? 'bg-rose-100 text-rose-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {(student.lastName || "S")[0].toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {student.lastName}, {student.firstName} {student.middleName || ""} {student.extension || ""}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold font-mono tracking-wider mt-0.5">
                                    LRN: {student.lrn || "N/A"} • ID: {student.studentNumber || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Section */}
                            <td className="py-4.5 px-4">
                              <span className="inline-flex items-center bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                                G{section.gradeLevel} - {section.name}
                              </span>
                            </td>

                            {/* Gender */}
                            <td className="py-4.5 px-4">
                              <span className={`font-semibold ${student.sex === 'Female' ? 'text-rose-600' : 'text-blue-600'}`}>
                                {student.sex || "N/A"}
                              </span>
                            </td>

                            {/* Current Placement */}
                            <td className="py-4.5 px-4">
                              {enrolledTle ? (
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md">
                                    <CheckCircle size={12} className="text-emerald-600" />
                                    {enrolledTle.name}
                                  </span>
                                  {teacherLabel && (
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                                      👤 {teacherLabel}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md animate-pulse">
                                  <AlertCircle size={12} className="text-amber-700" />
                                  UNASSIGNED
                                </span>
                              )}
                            </td>

                            {/* Term Enrolled Dropdown */}
                            <td className="py-4.5 px-4">
                              <select
                                value={(enrolledTle && student.tleEnrollmentTerms?.[enrolledTle.id]) || "All Terms"}
                                onChange={(e) => {
                                  if (enrolledTle) {
                                    handleUpdateTerm(student, section.id, enrolledTle.id, e.target.value);
                                  }
                                }}
                                disabled={!enrolledTle || isSaving}
                                className="w-full min-w-[120px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all text-slate-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="All Terms">Entire School Year</option>
                                <option value="1">1st Term</option>
                                <option value="2">2nd Term</option>
                                <option value="3">3rd Term</option>
                                <option value="4">4th Term</option>
                              </select>
                            </td>

                            {/* Dropdown Allocator */}
                            <td className="py-4.5 px-6 text-center max-w-[320px] md:max-w-[400px]">
                              <div className="flex items-center justify-end gap-2.5">
                                {isSaving ? (
                                  <div className="flex items-center justify-center gap-2 py-1.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-bold text-[11px] leading-tight w-full">
                                    <RefreshCw size={12} className="animate-spin text-indigo-600" /> Saving assignment...
                                  </div>
                                ) : (
                                  <>
                                    <select
                                      value={enrolledTle?.id || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "UNASSIGNED") {
                                          removeTle({ student, section, enrolledTle, sectionSubjects });
                                        } else if (val) {
                                          const isNew = PREDEFINED_SPECS.includes(val);
                                          assignTle({ student, section, enrolledTle, sectionSubjects }, val, isNew);
                                        }
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all text-slate-850 cursor-pointer text-slate-800"
                                    >
                                      <option value="">-- Choose Specialization --</option>
                                      
                                      {/* Existing section subjects */}
                                      <optgroup label="Select Configured Subject">
                                        {sectionSubjects.filter(s => isTleSubject(s.name)).map(sub => (
                                          <option key={sub.id} value={sub.id}>
                                            {sub.name} (Assigned to class)
                                          </option>
                                        ))}
                                      </optgroup>

                                      {/* Predefined Specializations */}
                                      <optgroup label="Or Create & Enroll New">
                                        {PREDEFINED_SPECS.map(spec => (
                                          <option key={spec} value={spec}>
                                            ➕ {spec}
                                          </option>
                                        ))}
                                      </optgroup>

                                      {enrolledTle && (
                                        <optgroup label="Danger Zone">
                                          <option value="UNASSIGNED">❌ Remove TLE Enrollment (Unassign)</option>
                                        </optgroup>
                                      )}
                                    </select>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* ADD COMPONENT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-xl"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Create JHS TLE Component</h2>
                  <p className="text-xs text-slate-500 font-medium">Configure a customized Technology & Livelihood Specialization.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTleComponent} className="p-6 space-y-4">
                {/* Information banner */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl max-w-full p-4 mb-2">
                  <div className="flex gap-3 text-indigo-700">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-relaxed">
                      This component will be automatically created and assigned to <strong className="font-extrabold">{g910Sections.filter(sec => newCompGradeLevels.includes(Number(sec.gradeLevel))).length} sections</strong> of the selected grade levels simultaneously.
                    </p>
                  </div>
                </div>

                {/* Component Specialization name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">TLE Specialization component</label>
                  <select
                    required
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-705 cursor-pointer"
                  >
                    <option value="">-- Select Specialization Component --</option>
                    {PREDEFINED_SPECS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                    <option value="Other">Custom TLE Specialization Component Name</option>
                  </select>
                </div>

                {/* Custom Component text input */}
                {newCompName === "Other" && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Custom TLE Specialization Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g., TLE - BEAUTY CARE AND WELLNESS"
                      value={newCompCustomName}
                      onChange={(e) => setNewCompCustomName(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-indigo-805 uppercase"
                    />
                  </div>
                )}

                {/* Subject Teacher selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Assign Subject Teacher (Optional)</label>
                  <select
                    value={newCompTeacherEmail}
                    onChange={(e) => setNewCompTeacherEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-705 cursor-pointer"
                  >
                    <option value="">-- Leave Unassigned / Default --</option>
                    {teachers.map(t => (
                      <option key={t.uid} value={t.email}>
                        👤 {t.displayName || t.name || t.email} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Offered Grade Levels selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Offered Grade Levels</label>
                  <div className="flex gap-2.5">
                    {[9, 10].map((grade) => {
                      const isSelected = newCompGradeLevels.includes(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setNewCompGradeLevels(prev => prev.filter(g => g !== grade));
                            } else {
                              setNewCompGradeLevels(prev => [...prev, grade].sort());
                            }
                          }}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                              : "bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100 hover:border-slate-350"
                          }`}
                        >
                          Grade {grade}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Offered Terms selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Offered Terms (Select 1-4)</label>
                  <div className="flex gap-2.5">
                    {[1, 2, 3, 4].map((term) => {
                      const isSelected = newCompOfferedTerms.includes(term);
                      return (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setNewCompOfferedTerms(prev => prev.filter(t => t !== term));
                            } else {
                              setNewCompOfferedTerms(prev => [...prev, term].sort());
                            }
                          }}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                              : "bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100 hover:border-slate-350"
                          }`}
                        >
                          Term {term}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-1.5 text-[10px] font-semibold text-slate-400">
                    <button
                      type="button"
                      onClick={() => setNewCompOfferedTerms([1, 2, 3, 4])}
                      className="hover:text-indigo-600 cursor-pointer transition-colors"
                    >
                      ✓ Select All Terms
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCompOfferedTerms([])}
                      className="hover:text-rose-600 cursor-pointer transition-colors"
                    >
                      ✗ Clear Terms
                    </button>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600  hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    {loading ? "Creating Component..." : "Create Component"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
