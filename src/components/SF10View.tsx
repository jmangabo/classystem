import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  User, 
  AlertTriangle, 
  Check, 
  ShieldCheck,
  QrCode,
  Calendar,
  Building,
  GraduationCap,
  History,
  FileCheck,
  Upload,
  X
} from 'lucide-react';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import * as XLSX from 'xlsx-js-style';
import { Student, Section, Subject, TermNumber, UserProfile } from '../types';
import { calculateGrade } from '../lib/calculations';
import { PhotoCropModal } from './PhotoCropModal';
import { formatStudentName, getSubjectSortScore, isTleSubject, getTleDisplayName } from '../utils';
import { db, safeGetDoc as getDoc, safeGetDocs as getDocs } from '../firebase';
import { collectionGroup, query, where, onSnapshot, doc, collection, updateDoc, writeBatch, addDoc, deleteField } from 'firebase/firestore';

export const getEligibilityTitle = (gradeLevel?: number) => {
  if (!gradeLevel) return "ELIGIBILITY FOR JUNIOR HIGH SCHOOL ENROLLMENT";
  if (gradeLevel >= 1 && gradeLevel <= 6) {
    return "ELIGIBILITY FOR ELEMENTARY ENROLLMENT";
  } else if (gradeLevel >= 11 && gradeLevel <= 12) {
    return "ELIGIBILITY FOR SENIOR HIGH SCHOOL ENROLLMENT";
  } else {
    return "ELIGIBILITY FOR JUNIOR HIGH SCHOOL ENROLLMENT";
  }
};

export const getSortedSubjectsForSection = (subjects: Subject[], gradeLevel: number): Subject[] => {
  if (gradeLevel >= 11) {
    const core = subjects.filter(s => (s.subjectType || 'CORE') === 'CORE');
    const applied = subjects.filter(s => s.subjectType === 'APPLIED').sort((a, b) => a.name.localeCompare(b.name));
    const specialized = subjects.filter(s => s.subjectType === 'SPECIALIZED').sort((a, b) => a.name.localeCompare(b.name));
    const otherElectives = subjects.filter(s => s.subjectType === 'ELECTIVE').sort((a, b) => a.name.localeCompare(b.name));

    const getSHSCoreScore = (name: string): number => {
      const n = name.trim();
      if (n === 'Effective Communication / Mabisang Komunikasyon') return 1;
      if (n === 'Effective Communication') return 2;
      if (n === 'Mabisang Komunikasyon') return 3;
      return 100;
    };

    const sortedCore = [...core].sort((a, b) => {
      const scoreA = getSHSCoreScore(a.name);
      const scoreB = getSHSCoreScore(b.name);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.name.localeCompare(b.name);
    });

    return [...sortedCore, ...applied, ...specialized, ...otherElectives];
  }

  return [...subjects].sort((a, b) => {
    const scoreA = getSubjectSortScore(a.name);
    const scoreB = getSubjectSortScore(b.name);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.name.localeCompare(b.name);
  });
};

interface SF10ViewProps {
  section: Section | null;
  students: Student[];
  subjects: Subject[];
  schoolCalendar: any[];
  userProfile?: UserProfile | null;
}

export function SF10View({ 
  section, 
  students, 
  subjects,
  schoolCalendar,
  userProfile
}: SF10ViewProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  const [currentStudent, setCurrentStudent] = useState<Student | null>(selectedStudent);

  useEffect(() => {
    if (!selectedStudentId) return setCurrentStudent(null);
    setCurrentStudent(selectedStudent || null);
  }, [selectedStudent, selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId || !section) return;
    
    // Listen to the specific student record for real-time updates (like photo changes)
    const unsub = onSnapshot(doc(db, 'sections', section.id, 'students', selectedStudentId), (snapshot) => {
        if (snapshot.exists()) {
            setCurrentStudent({ id: snapshot.id, ...snapshot.data() } as Student);
        }
    });
    
    return () => unsub();
  }, [selectedStudentId]);

  const [learnerPhoto, setLearnerPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [termMode, setTermMode] = useState<3 | 4>(3);
  const [semMode, setSemMode] = useState<'all' | '1st' | '2nd'>('all');

  const defaultEligibleGrade = useMemo(() => {
    if (section?.gradeLevel) {
      const gl = typeof section.gradeLevel === 'string' ? parseInt(section.gradeLevel) : section.gradeLevel;
      if (gl >= 12) return "Higher Education / College";
      if (gl >= 1) return `Grade ${gl + 1}`;
    }
    return "Grade 1";
  }, [section?.gradeLevel]);

  const [eligibleAdmissionTo, setEligibleAdmissionTo] = useState<string>("");

  useEffect(() => {
    setEligibleAdmissionTo(defaultEligibleGrade);
  }, [defaultEligibleGrade]);

  const [currentSchool, setCurrentSchool] = useState<any | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isUploadingSeal, setIsUploadingSeal] = useState(false);
  const principalSignatureRef = useRef<HTMLInputElement>(null);
  const sealRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!section?.schoolId) {
      setCurrentSchool(null);
      return;
    }
    const q = query(collection(db, "schools"), where("schoolId", "==", section.schoolId));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setCurrentSchool({ ...snap.docs[0].data(), id: snap.docs[0].id });
      } else {
        setCurrentSchool(null);
      }
    });
    return () => unsub();
  }, [section?.schoolId]);

  const handlePrincipalSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentSchool?.id) return;
    setIsUploadingSignature(true);
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        await updateDoc(doc(db, "schools", currentSchool.id), { principalSignature: base64 });
      } catch (err) {
        console.error("Error uploading signature:", err);
        alert("Failed to upload signature. Check permissions.");
      } finally {
        setIsUploadingSignature(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentSchool?.id) return;
    setIsUploadingSeal(true);
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        await updateDoc(doc(db, "schools", currentSchool.id), { logo: base64 });
      } catch (err) {
        console.error("Error uploading seal logo:", err);
        alert("Failed to upload seal. Check permissions.");
      } finally {
        setIsUploadingSeal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  type HistoricalRecordData = {
    student: Student;
    section: Section;
    subjects: Subject[];
  };
  const [historicalData, setHistoricalData] = useState<HistoricalRecordData[]>([]);

  useEffect(() => {
    if (currentStudent?.photo) {
      setLearnerPhoto(currentStudent.photo);
    } else if (historicalData.length > 0) {
      // Try to find a photo in historical records if current one is missing
      const recordWithPhoto = historicalData.find(h => h.student.photo);
      if (recordWithPhoto?.student.photo) {
        setLearnerPhoto(recordWithPhoto.student.photo);
      } else {
        setLearnerPhoto(null);
      }
    } else {
      setLearnerPhoto(null);
    }
  }, [currentStudent, historicalData]);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentStudent) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          setCropImageSrc(ev.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleApplyCroppedPhoto = async (croppedBase64: string) => {
    setLearnerPhoto(croppedBase64);
    setCropImageSrc(null);
    if (!currentStudent) return;
    try {
        const lrn = currentStudent.lrn;
        if (lrn) {
          const q = query(collectionGroup(db, 'students'), where('lrn', '==', lrn));
          const snapshot = await getDocs(q);
          
          const updatePromises = snapshot.docs.map(async (d) => {
            try {
              await updateDoc(d.ref, { photo: croppedBase64 });
            } catch (err) {
              console.debug("Skipping photo update for a record due to lack of permission:", d.ref.path);
            }
          });
          await Promise.allSettled(updatePromises);
        } else {
          const studentRef = doc(db, 'sections', section!.id, 'students', currentStudent.id);
          await updateDoc(studentRef, { photo: croppedBase64 });
        }
    } catch (error) {
        console.error("Error updating photo:", error);
    }
  };



  useEffect(() => {
    if (!currentStudent || !currentStudent.lrn) {
      setHistoricalData([]);
      return;
    }
    
    // Fetch all student records across all sections to build academic history
    const q = query(collectionGroup(db, 'students'), where('lrn', '==', currentStudent.lrn));
    const unsub = onSnapshot(q, async (snapshot) => {
      const promises: Promise<HistoricalRecordData | null>[] = [];
      
      snapshot.docs.forEach(d => {
         const sData = { id: d.id, ...d.data() } as Student;
         const sectionId = d.ref.parent.parent?.id;
         
         if (sectionId && sectionId !== section?.id) {
           promises.push((async () => {
             try {
               const sectionDoc = await getDoc(doc(db, 'sections', sectionId));
               if (sectionDoc.exists()) {
                 const subjectsSnap = await getDocs(collection(db, 'sections', sectionId, 'subjects'));
                 const historicalSubjects = subjectsSnap.docs.map(sd => ({ id: sd.id, ...sd.data() } as Subject));
                 
                 if (historicalSubjects.length > 0) {
                   return {
                     student: sData,
                     section: { id: sectionDoc.id, ...sectionDoc.data() } as Section,
                     subjects: historicalSubjects,
                   };
                 }
               }
             } catch (error) {
               console.error("Error fetching historical section/subjects:", error);
             }
             return null;
           })());
         }
      });
      
      const results = await Promise.all(promises);
      const historicalDetails = results.filter((r): r is HistoricalRecordData => r !== null);
      
      // Sort by School Year and Grade Level
      historicalDetails.sort((a, b) => {
         const syDiff = a.section.schoolYear.localeCompare(b.section.schoolYear);
         if (syDiff !== 0) return syDiff;
         
         const aGrade = typeof a.section.gradeLevel === 'string' ? parseInt(a.section.gradeLevel) : a.section.gradeLevel;
         const bGrade = typeof b.section.gradeLevel === 'string' ? parseInt(b.section.gradeLevel) : b.section.gradeLevel;
         
         return aGrade - bGrade;
      });
      
      setHistoricalData(historicalDetails);
    });
    
    return () => unsub();
  }, [currentStudent, section?.id]);

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || !selectedStudent) return;
    
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 816, // 8.5in at 96dpi
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [8.5, 13] // Legal size
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 13);
      pdf.save(`AcademicHistory_${selectedStudent.lrn}_${selectedStudent.lastName || selectedStudent.name.split(' ').pop()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleDownloadExcel = (range: 'elementary' | 'jhs' | 'shs') => {
    if (!selectedStudent) return;

    // Use XLSX style book
    const workbook = XLSX.utils.book_new();
    const data: any[] = [];
    const merges: any[] = [];
    
    let r = 0;
    const addMerge = (startRow: number, startCol: number, endRow: number, endCol: number) => {
      merges.push({ s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } });
    };

    // Helper to generate perfectly styled cells compatible with xlsx-js-style
    const createCell = (
      val: any,
      options: {
        bold?: boolean;
        italic?: boolean;
        align?: 'left' | 'center' | 'right';
        bg?: string; // Hex color without '#' (e.g., '1A5235')
        color?: string; // Hex for font color
        size?: number;
        borderTheme?: 'default' | 'none' | 'double-bottom' | 'thick-bottom';
      } = {}
    ) => {
      const isNum = typeof val === 'number';
      const cellObj: any = {
        v: val === null || val === undefined ? "" : val,
        t: isNum ? 'n' : 's'
      };

      const style: any = {
        font: {
          name: "Calibri",
          sz: options.size || 10,
          bold: !!options.bold,
          italic: !!options.italic
        },
        alignment: {
          horizontal: options.align || (isNum ? "center" : "left"),
          vertical: "center",
          wrapText: true
        }
      };

      if (options.color) {
        style.font.color = { rgb: options.color.replace('#', '') };
      }

      if (options.bg) {
        style.fill = {
          patternType: "solid",
          fgColor: { rgb: options.bg.replace('#', '') }
        };
      }

      const borderCol = "A6A6A6"; // nice clean medium-gray border
      if (options.borderTheme === 'none') {
        style.border = {};
      } else {
        style.border = {
          top: { style: "thin", color: { rgb: borderCol } },
          bottom: { style: "thin", color: { rgb: borderCol } },
          left: { style: "thin", color: { rgb: borderCol } },
          right: { style: "thin", color: { rgb: borderCol } }
        };

        if (options.borderTheme === 'double-bottom') {
          style.border.bottom = { style: "double", color: { rgb: "000000" } };
        } else if (options.borderTheme === 'thick-bottom') {
          style.border.bottom = { style: "medium", color: { rgb: "385723" } };
        }
      }

      cellObj.s = style;
      return cellObj;
    };

    const isGrade7to10 = true; // Export strictly for JHS (Grade 7-10) as requested
    const totalCols = termMode === 3 ? 6 : 7;

    // Row helpers to fill out styled columns so borders align and merges look pristine
    const padRow = (rowCells: any[], total: number, bgHex?: string) => {
      const result = [...rowCells];
      while (result.length < total) {
        result.push(createCell("", { bg: bgHex }));
      }
      return result;
    };

    // --- Title block ---
    data.push(padRow([createCell("REPUBLIC OF THE PHILIPPINES", { size: 9, italic: true, bold: true, align: "center", color: "595959", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    data.push(padRow([createCell("DEPARTMENT OF EDUCATION", { size: 12, bold: true, align: "center", color: "107C41", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    let sf10Title = "";
    let sf10Sub = "";
    let sheetName = "";
    let fileNamePart = "";

    if (range === 'elementary') {
      sf10Title = "SCHOOL FORM 10 (SF10-ES) - ELEMENTARY SCHOOL";
      sf10Sub = "LEARNER'S PERMANENT ACADEMIC RECORD FOR GRADE 1 TO GRADE 6 (FORM 137)";
      sheetName = "SF10 ES Permanent Record";
      fileNamePart = "Elementary_PermanentRecord";
    } else if (range === 'shs') {
      sf10Title = "SCHOOL FORM 10 (SF10-SHS) - SENIOR HIGH SCHOOL";
      sf10Sub = "LEARNER'S PERMANENT ACADEMIC RECORD FOR GRADE 11 TO GRADE 12 (FORM 137)";
      sheetName = "SF10 SHS Permanent Record";
      fileNamePart = "SHS_PermanentRecord";
    } else {
      sf10Title = "SCHOOL FORM 10 (SF10-JHS) - JUNIOR HIGH SCHOOL";
      sf10Sub = "LEARNER'S PERMANENT ACADEMIC RECORD FOR GRADE 7 TO GRADE 10 (FORM 137)";
      sheetName = "SF10 JHS Permanent Record";
      fileNamePart = "JHS_PermanentRecord";
    }

    data.push(padRow([createCell(sf10Title, { size: 14, bold: true, align: "center", color: "107C41", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    data.push(padRow([createCell(sf10Sub, { size: 10, bold: true, align: "center", color: "333333", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;

    // --- I. Learner's Personal Information ---
    data.push(padRow([createCell("I. LEARNER'S PERSONAL INFORMATION", { size: 11, bold: true, bg: "107C41", color: "FFFFFF" })], totalCols, "107C41"));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    // Personal Info grid (beautifully colored headers)
    const headerBg = "E2EFDA"; // Sage green header bg
    const defaultSecBg = "F9FBF9"; // Soft white row bg
    
    if (termMode === 3) {
      data.push([
        createCell("LRN:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.lrn || '', { bg: defaultSecBg }),
        createCell("Sex:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.sex || '', { bg: defaultSecBg }),
        createCell("Birthdate:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.birthdate || '', { bg: defaultSecBg })
      ]);
      r++;

      data.push([
        createCell("Last Name:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.lastName || selectedStudent.name.split(' ').pop() || '', { bg: defaultSecBg }),
        createCell("First Name:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.firstName || '', { bg: defaultSecBg }),
        createCell("Middle Name:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.middleName || '', { bg: defaultSecBg })
      ]);
      r++;
    } else {
      data.push([
        createCell("LRN:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.lrn || '', { bg: defaultSecBg }),
        createCell("", { bg: defaultSecBg }), // padded for merge
        createCell("Sex:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.sex || '', { bg: defaultSecBg }),
        createCell("Birthdate:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.birthdate || '', { bg: defaultSecBg })
      ]);
      addMerge(r, 1, r, 2);
      r++;

      data.push([
        createCell("Last Name:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.lastName || selectedStudent.name.split(' ').pop() || '', { bg: defaultSecBg }),
        createCell("First Name:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.firstName || '', { bg: defaultSecBg }),
        createCell("", { bg: defaultSecBg }), // padded for merge
        createCell("Middle Name:", { bold: true, bg: headerBg }),
        createCell(selectedStudent.middleName || '', { bg: defaultSecBg })
      ]);
      addMerge(r, 3, r, 4);
      r++;
    }

    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;

    // --- I-B. Dynamic Eligibility Title ---
    const estGradeLevel = range === 'elementary' ? 1 : range === 'shs' ? 11 : 7;
    const eligibilityTitle = getEligibilityTitle(estGradeLevel);
    data.push(padRow([createCell(`I-B. ${eligibilityTitle}`, { size: 11, bold: true, bg: "107C41", color: "FFFFFF" })], totalCols, "107C41"));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    const elig = selectedStudent.eligibility || {};
    const eligType = elig.type || 'Elementary School Completer';

    // Unified helper to prevent duplication between 3-term (6 cols) and 4-term (7 cols) layout formats
    const addEligRow = (lblL: string, valL: string, lblR: string, valR: string) => {
      if (termMode === 3) {
        data.push([
          createCell(lblL, { bold: true, bg: headerBg }),
          createCell(valL, { bg: defaultSecBg }),
          createCell("", { bg: defaultSecBg }), // padded for merge
          createCell("", { bg: defaultSecBg }), // padded for merge
          createCell(lblR, { bold: true, bg: headerBg }),
          createCell(valR, { bg: defaultSecBg })
        ]);
        addMerge(r, 1, r, 3);
        r++;
      } else {
        data.push([
          createCell(lblL, { bold: true, bg: headerBg }),
          createCell(valL, { bg: defaultSecBg }),
          createCell("", { bg: defaultSecBg }), // padded for merge
          createCell("", { bg: defaultSecBg }), // padded for merge
          createCell(lblR, { bold: true, bg: headerBg }),
          createCell(valR, { bg: defaultSecBg }),
          createCell("", { bg: defaultSecBg })  // padded for merge
        ]);
        addMerge(r, 1, r, 3);
        addMerge(r, 5, r, 6);
        r++;
      }
    };

    // Row 1: Type & Gen Average
    addEligRow("Eligibility Type:", eligType, "Gen. Avg:", elig.genAvg || 'N/A');

    // Row 2: Graduating School & School ID
    const schName = elig.elemSchoolName || elig.jhsSchoolName || elig.hsSchoolName || 'N/A';
    const schId = elig.elemSchoolId || 'N/A';
    addEligRow("Graduating School:", schName, "School ID:", schId);

    // Row 3: School Address & Date Completed
    const schAddress = elig.elemSchoolAddress || elig.hsSchoolAddress || elig.jhsSchoolAddress || 'N/A';
    const compDate = elig.elemCompletionDate || elig.hsCompletionDate || elig.jhsCompletionDate || 'N/A';
    addEligRow("School Address:", schAddress, "Date Completed:", compDate);

    // Row 4: PEPT/ALS/Other details & Citation
    let optLabel = "Special Rating:";
    let optValue = "N/A";
    if (eligType === 'PEPT Passer') {
      optLabel = "PEPT Rating / Date:";
      optValue = `${elig.peptRating || 'N/A'} / ${elig.peptDate || 'N/A'}`;
    } else if (eligType === 'ALS A & E Passer') {
      optLabel = "ALS Rating / Center:";
      optValue = `${elig.alsRating || 'N/A'} / ${elig.alsCenterInfo || 'N/A'}`;
    } else if (eligType === 'Others') {
      optLabel = "Other Spec:";
      optValue = elig.othersSpecify || 'N/A';
    } else {
      optLabel = "Credential Status:";
      optValue = "Verified Completer";
    }
    addEligRow(optLabel, optValue, "Citation/Cert:", elig.citation || 'N/A');

    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;

    // --- II. Scholastic Record ---
    data.push(padRow([createCell("II. SCHOLASTIC RECORD", { size: 11, bold: true, bg: "107C41", color: "FFFFFF" })], totalCols, "107C41"));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;

    // Helper to process a grade level/section details and append to excel
    const appendAcademicYearTable = (sec: Section, stud: Student, subs: Subject[]) => {
      // Filter based on selected export range
      if (range === 'elementary') {
        if (sec.gradeLevel < 1 || sec.gradeLevel > 6) return;
      } else if (range === 'shs') {
        if (sec.gradeLevel < 11 || sec.gradeLevel > 12) return;
      } else {
        if (sec.gradeLevel < 7 || sec.gradeLevel > 10) return;
      }

      // Block Header Row: Grade & Section, School Year
      const blocBg = "D0EAD6"; // slightly darker sage
      const blockTextCol = "1E4620";
      data.push([
        createCell(`Grade Level: Grade ${sec.gradeLevel}`, { size: 11, bold: true, bg: blocBg, color: blockTextCol }),
        createCell("", { bg: blocBg }),
        createCell(`Section: ${sec.name}`, { size: 11, bold: true, bg: blocBg, color: blockTextCol }),
        createCell("", { bg: blocBg }),
        createCell(`School Year: ${sec.schoolYear}`, { size: 11, bold: true, bg: blocBg, color: blockTextCol }),
        createCell("", { bg: blocBg }),
        createCell("", { bg: blocBg })
      ]);
      addMerge(r, 0, r, 1);
      addMerge(r, 2, r, 3);
      addMerge(r, 4, r, totalCols - 1);
      if (termMode === 3) {
        data[r] = data[r].slice(0, 6);
      }
      r++;

      // Meta row: School ID, School Name, Adviser
      const metaRowBg = "F2F2F2";
      if (termMode === 3) {
        data.push([
          createCell("School ID:", { bold: true, bg: "E6E6E6" }),
          createCell(sec.schoolId || '', { bg: metaRowBg }),
          createCell("School Name:", { bold: true, bg: "E6E6E6" }),
          createCell(sec.schoolName || '', { bg: metaRowBg }),
          createCell("Class Adviser:", { bold: true, bg: "E6E6E6" }),
          createCell(sec.adviserName || '', { bg: metaRowBg })
        ]);
        r++;
      } else {
        data.push([
          createCell("School ID:", { bold: true, bg: "E6E6E6" }),
          createCell(sec.schoolId || '', { bg: metaRowBg }),
          createCell("School Name:", { bold: true, bg: "E6E6E6" }),
          createCell(sec.schoolName || '', { bg: metaRowBg }),
          createCell("", { bg: metaRowBg }), // padded
          createCell("Class Adviser:", { bold: true, bg: "E6E6E6" }),
          createCell(sec.adviserName || '', { bg: metaRowBg })
        ]);
        addMerge(r, 3, r, 4);
        r++;
      }
      
      // Compute grades helper exact duplicate
      const currentGradeLevel = typeof sec.gradeLevel === 'string' ? parseInt(sec.gradeLevel) : (sec.gradeLevel || 7);
      let sortedSubjects = getSortedSubjectsForSection(subs, currentGradeLevel);

      // Check if MAPEH components exist, but MAPEH itself is missing
      const hasMapeh = sortedSubjects.some(s => s.name.toUpperCase().trim() === 'MAPEH');
      if (!hasMapeh) {
          const musicAndArts = subs.find(sub => sub.name.toUpperCase().trim() === 'MUSIC AND ARTS');
          const peAndHealth = subs.find(sub => sub.name.toUpperCase().trim() === 'PHYSICAL EDUCATION AND HEALTH');
          const music = subs.find(sub => sub.name.toUpperCase().trim() === 'MUSIC');
          const arts = subs.find(sub => sub.name.toUpperCase().trim() === 'ARTS');
          const pe = subs.find(sub => sub.name.toUpperCase().trim() === 'PHYSICAL EDUCATION' || sub.name.toUpperCase().trim() === 'PE');
          const health = subs.find(sub => sub.name.toUpperCase().trim() === 'HEALTH');
          
          if (musicAndArts || peAndHealth || music || arts || pe || health) {
              sortedSubjects.push({
                  id: 'dummy-mapeh',
                  name: 'MAPEH',
                  subjectType: 'CORE',
                  gradeLevel: 0,
                  wwWeight: 0,
                  ptWeight: 0,
                  taWeight: 0
              } as Subject);
          }
      }

      // Check for SSH SHS Communication components
      const commSubName = 'Effective Communication / Mabisang Komunikasyon';
      const hasComm = sortedSubjects.some(s => s.name === commSubName);
      if (!hasComm) {
          const effComm = subs.find(sub => sub.name === 'Effective Communication');
          const mabKom = subs.find(sub => sub.name === 'Mabisang Komunikasyon');
          if (effComm || mabKom) {
              sortedSubjects.push({
                  id: 'dummy-comm',
                  name: commSubName,
                  subjectType: 'CORE',
                  gradeLevel: 11,
                  wwWeight: 0,
                  ptWeight: 0,
                  taWeight: 0
              } as Subject);
          }
      }

      sortedSubjects = getSortedSubjectsForSection(sortedSubjects, currentGradeLevel);

      const processedSubjects = sortedSubjects.map(s => {
        const terms: TermNumber[] = termMode === 3 ? [1, 2, 3] : [1, 2, 3, 4];
        let grades = terms.map(t => calculateGrade(stud, s, t as TermNumber).final);
        
        if (s.name.toUpperCase().trim() === 'MAPEH') {
          const musicAndArts = subs.find(sub => sub.name.toUpperCase().trim() === 'MUSIC AND ARTS');
          const peAndHealth = subs.find(sub => sub.name.toUpperCase().trim() === 'PHYSICAL EDUCATION AND HEALTH');
          const music = subs.find(sub => sub.name.toUpperCase().trim() === 'MUSIC');
          const arts = subs.find(sub => sub.name.toUpperCase().trim() === 'ARTS');
          const pe = subs.find(sub => sub.name.toUpperCase().trim() === 'PHYSICAL EDUCATION' || sub.name.toUpperCase().trim() === 'PE');
          const health = subs.find(sub => sub.name.toUpperCase().trim() === 'HEALTH');

          let activeComps: Subject[] = [];
          if (musicAndArts || peAndHealth) {
             if (musicAndArts) activeComps.push(musicAndArts);
             if (peAndHealth) activeComps.push(peAndHealth);
          } else {
             if (music) activeComps.push(music);
             if (arts) activeComps.push(arts);
             if (pe) activeComps.push(pe);
             if (health) activeComps.push(health);
          }
          
          if (activeComps.length > 0) {
            grades = terms.map(t => {
              const compGrades = activeComps.map(c => calculateGrade(stud, c, t).final).filter(g => g > 0);
              return compGrades.length > 0 ? Math.round(compGrades.reduce((acc, curr) => acc + curr, 0) / activeComps.length) : 0;
            });
          }
        }

        if (s.name === 'Effective Communication / Mabisang Komunikasyon') {
          const effComm = subs.find(sub => sub.name === 'Effective Communication');
          const mabKom = subs.find(sub => sub.name === 'Mabisang Komunikasyon');

          const activeComps = [effComm, mabKom].filter(Boolean) as Subject[];
          if (activeComps.length > 0) {
            grades = terms.map(t => {
              const compGrades = activeComps.map(c => calculateGrade(stud, c, t).final).filter(g => g > 0);
              return compGrades.length > 0 ? Math.round(compGrades.reduce((acc, curr) => acc + curr, 0) / activeComps.length) : 0;
            });
          }
        }

        const valid = grades.filter(g => g > 0);
        let final = 0;
        if ((s.subjectType === 'ELECTIVE' || s.subjectType === 'APPLIED' || s.subjectType === 'SPECIALIZED') && s.offeredTerms && s.offeredTerms.length > 0) {
           final = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / s.offeredTerms.length) : 0;
        } else {
           final = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / terms.length) : 0;
        }

        let isMapehComponent = false;
        const mapehComponentNames = [
            'MUSIC AND ARTS',
            'PHYSICAL EDUCATION AND HEALTH',
            'MUSIC',
            'ARTS',
            'PHYSICAL EDUCATION',
            'PE',
            'HEALTH',
            'EFFECTIVE COMMUNICATION',
            'MABISANG KOMUNIKASYON'
        ];
        if (mapehComponentNames.includes(s.name.toUpperCase().trim())) {
           isMapehComponent = true;
        }

        return { id: s.id, name: isTleSubject(s.name) ? getTleDisplayName(s.name) : s.name, grades, final, isMapehComponent, offeredTerms: s.offeredTerms, unit: s.unit, subjectType: s.subjectType || 'CORE' };
      });

      const validFinals = processedSubjects.filter(f => !f.isMapehComponent && f.final > 0);
      let totalWeightedGrades = 0;
      let totalUnits = 0;
      validFinals.forEach(f => {
        const u = (f.unit !== undefined && f.unit !== null && f.unit > 0) ? f.unit : 1.0;
        totalWeightedGrades += f.final * u;
        totalUnits += u;
      });
      const genAvg = totalUnits > 0 ? Math.round(totalWeightedGrades / totalUnits) : 0;

      // Inner Table Headers: Learning Area, Quarters, Final Rating, Remarks
      const tableHeadersBg = "C6E0B4"; // beautiful green header row
      const gridTitleStyle = { bold: true, align: "center" as const, bg: tableHeadersBg, color: "1E4620" };

      if (termMode === 3) {
         data.push([
           createCell("Learning Area", { bold: true, align: "left", bg: tableHeadersBg, color: "1E4620" }),
           createCell("Term 1", gridTitleStyle),
           createCell("Term 2", gridTitleStyle),
           createCell("Term 3", gridTitleStyle),
           createCell("Final Rating", gridTitleStyle),
           createCell("Remarks", gridTitleStyle)
         ]);
      } else {
         data.push([
           createCell("Learning Area", { bold: true, align: "left", bg: tableHeadersBg, color: "1E4620" }),
           createCell("Term 1", gridTitleStyle),
           createCell("Term 2", gridTitleStyle),
           createCell("Term 3", gridTitleStyle),
           createCell("Term 4", gridTitleStyle),
           createCell("Final Rating", gridTitleStyle),
           createCell("Remarks", gridTitleStyle)
         ]);
      }
      r++;

      // Subject Rows
      let lastType = '';
      processedSubjects.forEach(f => {
         const isGrade11or12 = currentGradeLevel >= 11;
         const currentType = (f.subjectType || 'CORE');
         
         if (isGrade11or12 && lastType !== currentType) {
           let typeTitle = 'Core Subjects';
           if (currentType === 'APPLIED') typeTitle = 'Applied Subjects';
           else if (currentType === 'SPECIALIZED') typeTitle = 'Specialized Subjects';
           else if (currentType === 'ELECTIVE') typeTitle = 'Elective Subjects';
           lastType = currentType;
           const groupRow = [];
           const colCount = termMode === 3 ? 6 : 7;
           groupRow.push(createCell(typeTitle, { bold: true, italic: true, align: "left", bg: "E2EFDA" }));
           for (let i = 1; i < colCount; i++) {
             groupRow.push(createCell("", { bg: "E2EFDA" }));
           }
           data.push(groupRow);
           addMerge(r, 0, r, colCount - 1);
           r++;
         }

         const isComp = f.isMapehComponent;
         const rowBg = isComp ? "F2F2F2" : "FFFFFF";
         const namePrefix = isComp ? "   * " : "";

         const row: any[] = [
           createCell(namePrefix + f.name, { bold: !isComp, italic: isComp, bg: rowBg })
         ];

         f.grades.forEach((g, i) => {
           const termNum = i + 1;
           const isGrade11or12 = currentGradeLevel >= 11;
           const isNotOffered = isGrade11or12 && f.offeredTerms && f.offeredTerms.length > 0 && !f.offeredTerms.includes(termNum as TermNumber);
           
           if (isNotOffered) {
               row.push(createCell('', { bg: "000000", align: "center", borderTheme: "default" }));
           } else {
               row.push(createCell(g || '', { bg: rowBg, align: "center" }));
           }
         });

         const rating = f.isMapehComponent ? '' : (f.final || '');
         let remarksText = '';
         let remarkCol = "000000";
         if (!f.isMapehComponent && f.final > 0) {
           if (f.final >= 75) {
             remarksText = 'Passed';
             remarkCol = "107C41"; // Safe Green text
           } else {
             remarksText = 'Failed';
             remarkCol = "C00000"; // Elegant Red text
           }
         }

         row.push(createCell(rating, { bold: true, bg: rowBg, align: "center" }));
         row.push(createCell(remarksText, { bold: true, bg: rowBg, align: "center", color: remarkCol }));
         
         data.push(row);
         r++;
      });

      // General Average row
      const avgRowBg = "D0EAD6"; // highlighting general average
      const avgRow: any[] = [
        createCell("General Average", { bold: true, bg: avgRowBg })
      ];
      for(let i = 0; i < termMode; i++) {
        avgRow.push(createCell("", { bg: avgRowBg }));
      }
      avgRow.push(createCell(genAvg || '', { bold: true, bg: "FFF2CC", align: "center" })); // Yellow highlight
      
      let promotionalStatus = "";
      let statusColor = "000000";
      if (genAvg > 0) {
        if (genAvg >= 75) {
          promotionalStatus = "Promoted";
          statusColor = "107C41";
        } else {
          promotionalStatus = "Retained";
          statusColor = "C00000";
        }
      }
      avgRow.push(createCell(promotionalStatus, { bold: true, bg: "FFF2CC", align: "center", color: statusColor }));
      
      data.push(avgRow);
      addMerge(r, 0, r, termMode); // Merge Learning Area word across Q1-Q4
      r++;

      // Signature & Status Block
      const sigHeaderBg = "F2F2F2";
      data.push(padRow([createCell("Certification & Signature Verification", { size: 9, bold: true, bg: sigHeaderBg, color: "333333", align: "center" })], totalCols, sigHeaderBg));
      addMerge(r, 0, r, totalCols - 1);
      r++;

      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const signatureAuth = stud.adviserSignature ? `Digitally Signed via CRM Enterprise on ${dateStr}` : "Awaiting Signature";
      const signatureColor = stud.adviserSignature ? "107C41" : "A6A6A6";

      data.push([
        createCell("Class Adviser:", { bold: true, bg: "FAFAFA" }),
        createCell(sec.adviserName || "N/A", { bg: "FAFAFA" }),
        createCell("", { bg: "FAFAFA" }), // padding for merge
        createCell("Verification Profile:", { bold: true, bg: "FAFAFA" }),
        createCell(signatureAuth, { bold: true, color: signatureColor, bg: "FAFAFA" }),
        createCell("", { bg: "FAFAFA" }), // padding
        createCell("", { bg: "FAFAFA" })  // padding
      ]);
      addMerge(r, 1, r, 2);
      addMerge(r, 4, r, totalCols - 1);
      if (termMode === 3) {
        data[r] = data[r].slice(0, 6);
      }
      r++;

      data.push(padRow([createCell("", { borderTheme: "none" })], totalCols)); // separation blank row
      r++;
    };

    // 1. Process historical JHS data first (Grade 7 - 10 only)
    historicalData.forEach(h => {
       appendAcademicYearTable(h.section, h.student, h.subjects);
    });

    // 2. Process current active section if in JHS range Grade 7-10
    if (subjects.length > 0 && section) {
       appendAcademicYearTable(section, selectedStudent, subjects);
    }

    // --- 3. Append Certification Section to Excel Data ---
    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;

    data.push(padRow([createCell("CERTIFICATION", { size: 11, bold: true, align: "center", color: "107C41", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;

    const activeStud = currentStudent || selectedStudent;
    const studFullName = `${activeStud.lastName || ''}, ${activeStud.firstName || ''} ${activeStud.middleName || ''}`.trim() || activeStud.name;
    const studLrnStr = activeStud.lrn || 'N/A';
    
    // Resolve next eligible grade
    const nextGradeStr = eligibleAdmissionTo || "the Next Grade Level";

    const firstCertLine = `I CERTIFY that this is a true record of ${studFullName.toUpperCase()} with LRN ${studLrnStr} and that he/she is eligible for admission to ${nextGradeStr}.`;
    data.push(padRow([createCell(firstCertLine, { size: 10, align: "left", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;

    // Name of School / School ID / School Year row
    const schoolRowText = `Name of School: ${section?.schoolName || 'N/A'}      School ID: ${section?.schoolId || 'N/A'}      Last School Year Attended: ${section?.schoolYear || 'N/A'}`;
    data.push(padRow([createCell(schoolRowText, { size: 10, align: "left", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;
    data.push(padRow([createCell("", { borderTheme: "none" })], totalCols));
    r++;

    // Date and Signatures lines
    const dateFormattedStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const signatureLineText = "__________________________________________________";
    const principalSignatureOrLine = currentSchool?.headOfSchool?.toUpperCase() || signatureLineText;
    
    // Align Date on col 0, Signature across center cols, Seal on totalCols-1
    if (totalCols === 6) {
      data.push([
        createCell(`Date: ${dateFormattedStr}`, { size: 10, align: "left", borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell(principalSignatureOrLine, { size: 10, align: "center", borderTheme: "none", bold: !!currentSchool?.headOfSchool }),
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("(Affix School Seal)", { size: 9, italic: true, align: "right", borderTheme: "none" })
      ]);
      addMerge(r, 2, r, 4);
    } else {
      data.push([
        createCell(`Date: ${dateFormattedStr}`, { size: 10, align: "left", borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell(principalSignatureOrLine, { size: 10, align: "center", borderTheme: "none", bold: !!currentSchool?.headOfSchool }),
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("(Affix School Seal)", { size: 9, italic: true, align: "right", borderTheme: "none" })
      ]);
      addMerge(r, 2, r, 5);
    }
    r++;

    // Signatures Description row below lines
    if (totalCols === 6) {
      data.push([
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("Signature of Principal/School Head (Over Printed Name)", { size: 9, bold: true, align: "center", borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" })
      ]);
      addMerge(r, 2, r, 4);
    } else {
      data.push([
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("Signature of Principal/School Head (Over Printed Name)", { size: 9, bold: true, align: "center", borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" }),
        createCell("", { borderTheme: "none" })
      ]);
      addMerge(r, 2, r, 5);
    }
    r++;

    // Build the sheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set custom column widths for highly premium presentation
    const cols = [
      { wch: 38 }, // Learning Area (very wide to fit indented MAPEH component titles)
      { wch: 11 }, // Quarter 1
      { wch: 11 }, // Quarter 2
      { wch: 11 }, // Quarter 3
    ];
    if (termMode === 4) {
      cols.push({ wch: 11 }); // Quarter 4
    }
    cols.push({ wch: 14 }); // Final Rating
    cols.push({ wch: 14 }); // Remarks
    worksheet['!cols'] = cols;

    // Apply merges
    worksheet['!merges'] = merges;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Download file
    const safeStudentName = selectedStudent.lastName || selectedStudent.name.split(' ').pop();
    XLSX.writeFile(workbook, `SF10_${fileNamePart}_${selectedStudent.lrn || 'Record'}_${safeStudentName}.xlsx`);
  };

  const getSubjectFinalRating = (student: Student, subject: Subject) => {
    const terms: TermNumber[] = [1, 2, 3, 4];
    const grades = terms.map(t => calculateGrade(student, subject, t as TermNumber).final);
    const validGrades = grades.filter(g => g > 0);
    return validGrades.length > 0 ? Math.round(validGrades.reduce((a, b) => a + b, 0) / terms.length) : 0;
  };

  const hasAnyRecord = historicalData.length > 0 || subjects.length > 0;

  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-500 mb-8 shadow-xl shadow-indigo-100 border border-indigo-100 animate-pulse">
           <FileText size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Learners Records System</h2>
        <p className="text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">Please select a class section to manage and generate learner permanent academic records.</p>
      </div>
    );
  }

  if (!selectedStudentId || !selectedStudent) {
    return (
      <>
        {/* Standardized Header */}
        <div className="bg-white border-b border-slate-200 px-10 py-5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-sm sticky top-0 z-40 no-print">
          <div className="flex items-center gap-5">
             <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                <FileText size={20} />
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                   LEARNER'S ACADEMIC HISTORY
                </h1>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">
                   Section: {section.name} • JHS Grade {section.gradeLevel}
                </p>
             </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...students].sort((a,b) => a.name.localeCompare(b.name)).map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className="group relative bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[5rem] -mr-10 -mt-10 opacity-50" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-inner overflow-hidden border border-slate-100">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 uppercase tracking-tight leading-tight mb-1">{formatStudentName(student)}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LRN: {student.lrn}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                     <div className="px-4 py-1.5 bg-indigo-50 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        Open Record
                     </div>
                     <ShieldCheck size={18} className="text-emerald-500" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Standardized Header */}
      <div className="bg-white border-b border-slate-200 px-10 py-5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-sm sticky top-0 z-40 no-print">
        <div className="flex items-center gap-5">
           <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
              <FileText size={20} />
           </div>
           <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                 LEARNER'S ACADEMIC HISTORY
              </h1>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">
                 {formatStudentName(selectedStudent)} ({selectedStudent.lrn})
              </p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-200 flex items-center gap-2 text-[10px] uppercase tracking-widest"
          >
            <Download size={14} />
            PDF
          </button>
          {section && (typeof section.gradeLevel === 'string' ? parseInt(section.gradeLevel) : (section.gradeLevel || 0)) <= 6 && (
            <button 
              onClick={() => handleDownloadExcel('elementary')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-200 flex items-center gap-2 text-[10px] uppercase tracking-widest"
            >
              <Download size={14} />
              Excel (Elem 1-6)
            </button>
          )}
          {section && (typeof section.gradeLevel === 'string' ? parseInt(section.gradeLevel) : (section.gradeLevel || 0)) >= 7 && (typeof section.gradeLevel === 'string' ? parseInt(section.gradeLevel) : (section.gradeLevel || 0)) <= 10 && (
            <button 
              onClick={() => handleDownloadExcel('jhs')}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-200 flex items-center gap-2 text-[10px] uppercase tracking-widest"
            >
              <Download size={14} />
              Excel (JHS 7-10)
            </button>
          )}
          {section && (typeof section.gradeLevel === 'string' ? parseInt(section.gradeLevel) : (section.gradeLevel || 0)) >= 11 && (
            <button 
              onClick={() => handleDownloadExcel('shs')}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-teal-100 flex items-center gap-2 text-[10px] uppercase tracking-widest"
            >
              <Download size={14} />
              Excel (SHS 11-12)
            </button>
          )}
          <button 
            onClick={() => setSelectedStudentId(null)}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all hover:-translate-y-0.5 flex items-center gap-2 text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </div>

      <div ref={pdfRef} className="p-4 md:p-10 max-w-6xl mx-auto py-10 space-y-10 bg-white print:p-0">
        {/* Learner Info Card */}
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="row-span-4 flex items-center justify-center">
                 <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                 <button onClick={() => photoInputRef.current?.click()} className="group relative w-48 h-48 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden hover:border-indigo-500 transition-all">
                      {learnerPhoto ? (
                         <img src={learnerPhoto} alt="Learner Photo" className="w-full h-full object-cover" />
                      ) : (
                         <div className="text-center text-slate-400 text-[10px] p-2">Upload Passport Photo</div>
                      )}
                 </button>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Name</p>
                <p className="font-bold text-slate-900">{formatStudentName(currentStudent)}</p>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">LRN</p>
                <p className="font-bold text-slate-900">{currentStudent?.lrn}</p>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sex</p>
                <p className="font-bold text-slate-900">{currentStudent?.sex}</p>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Birthdate</p>
                <p className="font-bold text-slate-900">{currentStudent?.birthdate}</p>
            </div>
        </section>
        
        {/* Eligibility Details Card */}
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck size={16} />
            </div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{getEligibilityTitle(section?.gradeLevel)}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 gap-y-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Credential Type</p>
              <p className="font-bold text-slate-700 uppercase tracking-tight">{currentStudent?.eligibility?.type || 'Elementary School Completer'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">General Average</p>
              <p className="font-extrabold text-indigo-600 text-[15px]">{currentStudent?.eligibility?.genAvg || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Graduating School</p>
              <p className="font-bold text-slate-700 uppercase tracking-tight">
                {currentStudent?.eligibility?.elemSchoolName || currentStudent?.eligibility?.jhsSchoolName || currentStudent?.eligibility?.hsSchoolName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">School ID</p>
              <p className="font-bold text-slate-700 tracking-tight">{currentStudent?.eligibility?.elemSchoolId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Address</p>
              <p className="font-bold text-slate-700 uppercase tracking-tight">
                {currentStudent?.eligibility?.elemSchoolAddress || currentStudent?.eligibility?.hsSchoolAddress || currentStudent?.eligibility?.jhsSchoolAddress || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Date Completed</p>
              <p className="font-bold text-slate-700">{currentStudent?.eligibility?.elemCompletionDate || currentStudent?.eligibility?.hsCompletionDate || currentStudent?.eligibility?.jhsCompletionDate || 'N/A'}</p>
            </div>
            {currentStudent?.eligibility?.type === 'PEPT Passer' && (
              <>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">PEPT Rating</p>
                  <p className="font-bold text-slate-700">{currentStudent?.eligibility?.peptRating || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">PEPT Exam Date</p>
                  <p className="font-bold text-slate-700">{currentStudent?.eligibility?.peptDate || 'N/A'}</p>
                </div>
              </>
            )}
            {currentStudent?.eligibility?.type === 'ALS A & E Passer' && (
              <>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">ALS Rating</p>
                  <p className="font-bold text-slate-700">{currentStudent?.eligibility?.alsRating || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">ALS Center Info</p>
                  <p className="font-bold text-slate-700">{currentStudent?.eligibility?.alsCenterInfo || 'N/A'}</p>
                </div>
              </>
            )}
            {currentStudent?.eligibility?.type === 'Others' && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Other details</p>
                <p className="font-bold text-slate-700">{currentStudent?.eligibility?.othersSpecify || 'N/A'}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Citation / Certificate</p>
              <p className="font-bold text-slate-700 uppercase tracking-tight">{currentStudent?.eligibility?.citation || 'N/A'}</p>
            </div>
          </div>
        </section>

        {/* Scholastic Record */}
        <section className="space-y-6">
           {hasAnyRecord ? (
             <>
               <div className="flex items-center justify-between">
                 <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Academic History</h2>
                 <div className="bg-white rounded-lg border border-slate-200 p-1 flex items-center">
                   <button onClick={() => { setTermMode(3); setSemMode('all'); }} className={`px-4 py-1 text-xs font-bold rounded ${termMode === 3 && semMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>3 Terms</button>
                   <button onClick={() => { setTermMode(4); setSemMode('all'); }} className={`px-4 py-1 text-xs font-bold rounded ${termMode === 4 && semMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>4 Terms</button>
                   <div className="w-px h-4 bg-slate-200 my-auto mx-1"></div>
                   <button onClick={() => { setTermMode(4); setSemMode('1st'); }} className={`px-4 py-1 text-xs font-bold rounded ${semMode === '1st' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>1st Sem</button>
                   <button onClick={() => { setTermMode(4); setSemMode('2nd'); }} className={`px-4 py-1 text-xs font-bold rounded ${semMode === '2nd' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>2nd Sem</button>
                 </div>
               </div>
               
               {historicalData.map((data, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <AcademicYearTable 
                      section={data.section} 
                      student={data.student} 
                      subjects={data.subjects}
                      termMode={termMode}
                      semMode={semMode}
                      userProfile={userProfile}
                    />
                 </div>
               ))}

               {subjects.length > 0 && (
                 <div className="bg-white p-6 rounded-3xl border border-indigo-200 shadow-sm shadow-indigo-100">
                   <AcademicYearTable 
                      section={section} 
                      student={selectedStudent} 
                      subjects={subjects} 
                      isCurrent 
                      termMode={termMode}
                      semMode={semMode}
                      userProfile={userProfile}
                   />
                 </div>
               )}

               {/* Bottom Certification Card */}
               <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none break-inside-avoid">
                 <div className="border-b border-slate-100 pb-3 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                     <FileCheck size={16} />
                   </div>
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest text-[#107C41]">CERTIFICATION</h3>
                 </div>

                 <div className="text-xs text-slate-700 leading-relaxed space-y-6">
                   <p className="indent-8 text-justify leading-relaxed">
                     I CERTIFY that this is a true record of <span className="font-extrabold text-slate-950 uppercase border-b border-slate-300 px-2 inline-block pb-0.5">{formatStudentName(currentStudent || selectedStudent)}</span> with LRN <span className="font-extrabold text-slate-950 border-b border-slate-300 px-2 inline-block pb-0.5">{currentStudent?.lrn || selectedStudent?.lrn || 'N/A'}</span> and that he/she is eligible for admission to <span className="font-extrabold text-slate-950 border-b border-slate-300 px-2 inline-block pb-0.5">
                       <select
                         value={eligibleAdmissionTo}
                         onChange={(e) => setEligibleAdmissionTo(e.target.value)}
                         className="bg-transparent font-extrabold text-indigo-600 outline-none cursor-pointer border-none py-0.5 pr-2 focus:ring-2 focus:ring-indigo-200 rounded-md transition-all duration-150 print:hidden"
                       >
                         {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((g) => (
                           <option key={g} value={g} className="text-slate-900 bg-white font-normal">{g}</option>
                         ))}
                         <option value="Higher Education / College" className="text-slate-900 bg-white font-normal">Higher Education / College</option>
                       </select>
                       <span className="hidden print:inline">{eligibleAdmissionTo}</span>
                     </span>.
                   </p>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Name of School</p>
                       <p className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">{section?.schoolName || 'N/A'}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">School ID</p>
                       <p className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">{section?.schoolId || 'N/A'}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Last School Year Attended</p>
                       <p className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">{section?.schoolYear || 'N/A'}</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 items-end">
                     <div className="text-center md:text-left">
                       <p className="font-bold text-slate-800 border-b border-slate-200 pb-0.5">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                       <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-1">Date</p>
                     </div>
                     <div className="text-center relative group flex flex-col items-center justify-end h-full">
  <input type="file" ref={principalSignatureRef} onChange={handlePrincipalSignatureUpload} className="hidden" accept="image/*" />

  <div className="w-full flex items-end justify-center relative -mb-2 h-28 group/sign">
    {currentSchool?.principalSignature ? (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
         <button onClick={() => principalSignatureRef.current?.click()} className="relative w-full h-full flex items-center justify-center outline-none hover:bg-slate-50 transition-colors rounded-lg" disabled={isUploadingSignature}>
           <img src={currentSchool.principalSignature} alt="Principal Signature" className="max-h-20 w-auto object-contain z-10 drop-shadow-sm scale-125 origin-bottom translate-y-8" />
           {!isUploadingSignature && <div className="absolute inset-0 bg-white/60 items-center justify-center border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 tracking-wider shadow opacity-0 group-hover:opacity-100 transition-opacity z-20 print:hidden hidden md:flex"><Upload size={14} className="mr-1" /> Replace</div>}
         </button>
         <button 
           onClick={async (e) => {
             e.stopPropagation();
             if (window.confirm("Remove this signature?")) {
               try {
                 await updateDoc(doc(db, "schools", currentSchool.id), { principalSignature: deleteField() });
               } catch (err) {
                 console.error(err);
               }
             }
           }} 
           className="absolute top-0 -right-2 z-30 print:hidden opacity-0 group-hover/sign:opacity-100 bg-rose-100 text-rose-600 p-1.5 rounded-full hover:bg-rose-200 transition-all shadow-sm"
           title="Remove Signature"
         >
           <X size={14} />
         </button>
      </div>
    ) : (
      <button onClick={() => principalSignatureRef.current?.click()} className="absolute z-10 bottom-4 print:hidden flex items-center gap-1 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider shadow-sm transition-all opacity-0 group-hover:opacity-100 outline-none" disabled={isUploadingSignature}>
        {isUploadingSignature ? <span className="animate-pulse">Uploading...</span> : <><Upload size={12} /> Upload Sign</>}
      </button>
    )}
  </div>

  <div className="w-full border-b border-slate-200 pb-1.5 mt-2 relative">
    <span className="font-bold text-slate-800 uppercase text-xs z-0">
      {currentSchool?.headOfSchool || "____________________________________"}
    </span>
  </div>
                       <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest pt-1 bg-white relative z-20">Signature of Principal/School Head</p>
                       <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">(Over Printed Name)</p>
                     </div>
                     <div className="text-center md:text-right flex flex-col items-center md:items-end justify-center relative group">
                       <input type="file" ref={sealRef} onChange={handleSealUpload} className="hidden" accept="image/*" />
                       
                       {currentSchool?.logo ? (
                         <button onClick={() => sealRef.current?.click()} className="w-24 h-24 relative flex items-center justify-center outline-none group-hover:bg-slate-50 transition-colors rounded-full" disabled={isUploadingSeal}>
                           <img 
                             src={currentSchool.logo} 
                             alt="School Seal" 
                             className="w-full h-full object-contain mix-blend-multiply opacity-25 grayscale contrast-150"
                             style={{ filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.4)) drop-shadow(-1px -1px 0px rgba(255,255,255,0.8))" }}
                           />
                           {!isUploadingSeal && (
                             <div className="absolute inset-0 bg-white/60 rounded-full flex flex-col items-center justify-center text-xs font-bold text-indigo-600 tracking-wider shadow opacity-0 group-hover:opacity-100 transition-opacity z-20 print:hidden hidden md:flex">
                               <Upload size={14} className="mb-1" />
                               Replace
                             </div>
                           )}
                           {isUploadingSeal && (
                             <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
                               <span className="animate-pulse text-[10px] font-bold text-indigo-600">...</span>
                             </div>
                           )}
                         </button>
                       ) : (
                         <button onClick={() => sealRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-full flex flex-col items-center justify-center text-[8px] text-slate-400 uppercase tracking-widest text-center leading-normal p-2 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-500 transition-colors group cursor-pointer outline-none relative" disabled={isUploadingSeal}>
                           {isUploadingSeal ? (
                             <span className="animate-pulse font-bold text-[10px] text-indigo-600">Uploading...</span>
                           ) : (
                             <>
                               <Upload size={14} className="mb-1 text-slate-300 group-hover:text-indigo-400 print:hidden" />
                               <span>Affix School</span>
                               <span>Seal Here</span>
                             </>
                           )}
                         </button>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
             </>
           ) : (
             <div className="bg-white p-12 rounded-[3rem] border border-slate-200 text-center space-y-6">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                   <History size={40} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-bold text-slate-900">No Assessment Records</h3>
                   <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">This learner's academic assessment will be displayed here once subjects are assigned and grading has commenced.</p>
                </div>
             </div>
           )}
        </section>
      </div>
      {cropImageSrc && (
         <PhotoCropModal
           imageSrc={cropImageSrc}
           onCrop={handleApplyCroppedPhoto}
           onCancel={() => setCropImageSrc(null)}
         />
      )}
    </div>
  );
}

interface AcademicYearTableProps {
  section: Section;
  student: Student;
  subjects: Subject[];
  isCurrent?: boolean;
  termMode: 3 | 4;
  semMode: 'all' | '1st' | '2nd';
  userProfile?: UserProfile | null;
}

const AcademicYearTable: React.FC<AcademicYearTableProps> = ({ section, student, subjects, isCurrent, termMode, semMode, userProfile }) => {
  const [signature, setSignature] = useState<string | null>(student.adviserSignature || null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSignature(student.adviserSignature || null);
  }, [student.adviserSignature]);

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          const base64 = ev.target.result as string;
          setSignature(base64);
          try {
            // A signature belongs to an adviser for a SPECIFIC year.
            // We should only update the record for THIS specific section year.
            const studentRef = doc(db, 'sections', section.id, 'students', student.id);
            await updateDoc(studentRef, { adviserSignature: base64 });

            // If we want to OPTIONALLY sync only if the current user is also the adviser for other sections 
            // of this same student, we could do a filtered search, but for Adviser Signature it's better
            // to be specific to the table being edited.
          } catch (error) {
            console.error("Error saving signature:", error);
          }
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const finalGrades = useMemo(() => {
    const gradeLevelVal = typeof section.gradeLevel === 'string' ? parseInt(section.gradeLevel) : (section.gradeLevel || 7);
    let sortedSubjects = getSortedSubjectsForSection(subjects, gradeLevelVal);

    // Filter un-enrolled JHS TLE subjects
    const isJHS = gradeLevelVal === 9 || gradeLevelVal === 10;
    if (isJHS) {
      sortedSubjects = sortedSubjects.filter(s => {
        if (isTleSubject(s.name)) {
          return student.enrolledSubjectIds?.includes(s.id);
        }
        return true;
      });
    }

    // Check if MAPEH components exist, but MAPEH itself is missing
    const hasMapeh = sortedSubjects.some(s => s.name.toUpperCase().trim() === 'MAPEH');
    if (!hasMapeh) {
        const musicAndArts = subjects.find(sub => sub.name.toUpperCase().trim() === 'MUSIC AND ARTS');
        const peAndHealth = subjects.find(sub => sub.name.toUpperCase().trim() === 'PHYSICAL EDUCATION AND HEALTH');
        const music = subjects.find(sub => sub.name.toUpperCase().trim() === 'MUSIC');
        const arts = subjects.find(sub => sub.name.toUpperCase().trim() === 'ARTS');
        const pe = subjects.find(sub => sub.name.toUpperCase().trim() === 'PHYSICAL EDUCATION' || sub.name.toUpperCase().trim() === 'PE');
        const health = subjects.find(sub => sub.name.toUpperCase().trim() === 'HEALTH');
        
        if (musicAndArts || peAndHealth || music || arts || pe || health) {
            sortedSubjects.push({
                id: 'dummy-mapeh',
                name: 'MAPEH',
                subjectType: 'CORE',
                gradeLevel: 0,
                wwWeight: 0,
                ptWeight: 0,
                taWeight: 0
            } as Subject);
        }
    }

    // Check for SSH SHS Communication components
    const commSubName = 'Effective Communication / Mabisang Komunikasyon';
    const hasComm = sortedSubjects.some(s => s.name === commSubName);
    if (!hasComm) {
        const effComm = subjects.find(sub => sub.name === 'Effective Communication');
        const mabKom = subjects.find(sub => sub.name === 'Mabisang Komunikasyon');
        if (effComm || mabKom) {
            sortedSubjects.push({
                id: 'dummy-comm',
                name: commSubName,
                subjectType: 'CORE',
                gradeLevel: 11,
                wwWeight: 0,
                ptWeight: 0,
                taWeight: 0
            } as Subject);
        }
    }

    sortedSubjects = getSortedSubjectsForSection(sortedSubjects, gradeLevelVal);

    return sortedSubjects.map(s => {
      let terms: TermNumber[] = termMode === 3 ? [1, 2, 3] : [1, 2, 3, 4];
      if (semMode === '1st') terms = [1, 2];
      else if (semMode === '2nd') terms = [3, 4].filter(x => x <= termMode) as TermNumber[];
      
      const fullExpectedLength = terms.length;

      const offeredTermsForSubject = s.offeredTerms && s.offeredTerms.length > 0
        ? terms.filter(t => s.offeredTerms!.includes(t))
        : terms;

      let grades = terms.map(t => calculateGrade(student, s, t as TermNumber).final);
      
      // Calculate MAPEH components average if it's MAPEH
      if (s.name.toUpperCase().trim() === 'MAPEH') {
        const musicAndArts = subjects.find(sub => sub.name.toUpperCase().trim() === 'MUSIC AND ARTS');
        const peAndHealth = subjects.find(sub => sub.name.toUpperCase().trim() === 'PHYSICAL EDUCATION AND HEALTH');
        const music = subjects.find(sub => sub.name.toUpperCase().trim() === 'MUSIC');
        const arts = subjects.find(sub => sub.name.toUpperCase().trim() === 'ARTS');
        const pe = subjects.find(sub => sub.name.toUpperCase().trim() === 'PHYSICAL EDUCATION' || sub.name.toUpperCase().trim() === 'PE');
        const health = subjects.find(sub => sub.name.toUpperCase().trim() === 'HEALTH');

        let activeComps: Subject[] = [];
        if (musicAndArts || peAndHealth) {
           if (musicAndArts) activeComps.push(musicAndArts);
           if (peAndHealth) activeComps.push(peAndHealth);
        } else {
           if (music) activeComps.push(music);
           if (arts) activeComps.push(arts);
           if (pe) activeComps.push(pe);
           if (health) activeComps.push(health);
        }
        
        if (activeComps.length > 0) {
          grades = terms.map(t => {
            const compGrades = activeComps.map(c => calculateGrade(student, c, t).final).filter(g => g > 0);
            return compGrades.length > 0 ? Math.round(compGrades.reduce((acc, curr) => acc + curr, 0) / activeComps.length) : 0;
          });
        }
      }

      // Calculate Communication components average
      if (s.name === 'Effective Communication / Mabisang Komunikasyon') {
        const effComm = subjects.find(sub => sub.name === 'Effective Communication');
        const mabKom = subjects.find(sub => sub.name === 'Mabisang Komunikasyon');

        const activeComps = [effComm, mabKom].filter(Boolean) as Subject[];
        if (activeComps.length > 0) {
          grades = terms.map(t => {
            const compGrades = activeComps.map(c => calculateGrade(student, c, t).final).filter(g => g > 0);
            return compGrades.length > 0 ? Math.round(compGrades.reduce((acc, curr) => acc + curr, 0) / activeComps.length) : 0;
          });
        }
      }

      const offeredGrades = grades.filter((g, i) => {
         const termNum = terms[i];
         const isOffered = !s.offeredTerms || s.offeredTerms.length === 0 || s.offeredTerms.includes(termNum);
         return isOffered;
      });
      const validOffered = offeredGrades.filter(g => g > 0);

      let final = 0;
      if (s.offeredTerms && s.offeredTerms.length > 0) {
         final = validOffered.length === offeredTermsForSubject.length && offeredTermsForSubject.length > 0 ? Math.round(validOffered.reduce((a, b) => a + b, 0) / offeredTermsForSubject.length) : 0;
      } else {
         final = validOffered.length === fullExpectedLength && fullExpectedLength > 0 ? Math.round(validOffered.reduce((a, b) => a + b, 0) / fullExpectedLength) : 0;
      }

      let isMapehComponent = false;
      const mapehComponentNames = [
          'MUSIC AND ARTS',
          'PHYSICAL EDUCATION AND HEALTH',
          'MUSIC',
          'ARTS',
          'PHYSICAL EDUCATION',
          'PE',
          'HEALTH',
          'EFFECTIVE COMMUNICATION',
          'MABISANG KOMUNIKASYON'
      ];
      if (mapehComponentNames.includes(s.name.toUpperCase().trim())) {
         isMapehComponent = true;
      }

      return { id: s.id, name: isTleSubject(s.name) ? getTleDisplayName(s.name) : s.name, grades, terms, final, isMapehComponent, offeredTerms: s.offeredTerms, unit: s.unit, subjectType: s.subjectType || 'CORE' };
    });
  }, [student, subjects, termMode, semMode]);

  const genAvg = useMemo(() => {
    const validFinals = finalGrades.filter(f => !f.isMapehComponent && f.final > 0);
    let totalWeightedGrades = 0;
    let totalUnits = 0;
    validFinals.forEach(f => {
      const u = (f.unit !== undefined && f.unit !== null && f.unit > 0) ? f.unit : 1.0;
      totalWeightedGrades += f.final * u;
      totalUnits += u;
    });
    return totalUnits > 0 ? Math.round(totalWeightedGrades / totalUnits) : 0;
  }, [finalGrades]);

  const termColsCount = useMemo(() => {
    const has1stPart = (semMode === 'all' || semMode === '1st');
    const has2ndPart = (semMode === 'all' || semMode === '2nd');
    return (has1stPart ? 2 : 0) + (has2ndPart ? (termMode === 4 ? 2 : 1) : 0);
  }, [semMode, termMode]);

  const totalColsCount = useMemo(() => {
    return 1 + termColsCount + 1 + 1;
  }, [termColsCount]);

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-5">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isCurrent ? 'bg-indigo-600 shadow-indigo-200' : 'bg-slate-900 shadow-slate-200'}`}>
                <GraduationCap size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Grade Level & Section</p>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none italic">Grade {section.gradeLevel} - {section.name} <span className="text-slate-300 font-medium not-italic ml-2">({section.schoolYear})</span></p>
                  {(student.status === 'Dropped Out' || student.status === 'Transferred Out') && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${student.status === 'Dropped Out' ? 'bg-orange-100 text-orange-600' : 'bg-rose-100 text-rose-600'}`}>
                      {student.status.toUpperCase()}
                      {student.status === 'Dropped Out' ? ` ON ${student.dropoutDate || 'N/A'} - ${student.dropoutReason || 'N/A'}` : ` TO ${student.transferSchool || 'N/A'}`}
                    </span>
                  )}
                </div>
             </div>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">School ID / Name</p>
             <p className="text-xs font-black text-slate-900 leading-none uppercase">{section.schoolId} • {section.schoolName}</p>
          </div>
       </div>

        <div className="overflow-hidden border border-slate-600">
           <table className="w-full border-collapse">
              <thead>
                 <tr className="bg-slate-50 text-slate-900 text-[10px] font-bold uppercase tracking-wider h-10">
                    <th className="px-3 text-left w-1/3 border border-slate-600">Learning Area</th>
                    {(semMode === 'all' || semMode === '1st') && <th className="px-1 text-center w-10 border border-slate-600 font-bold">1</th>}
                    {(semMode === 'all' || semMode === '1st') && <th className="px-1 text-center w-10 border border-slate-600 font-bold">2</th>}
                    {(semMode === 'all' || semMode === '2nd') && <th className="px-1 text-center w-10 border border-slate-600 font-bold">3</th>}
                    {(semMode === 'all' || semMode === '2nd') && termMode === 4 && <th className="px-1 text-center w-10 border border-slate-600 font-bold">4</th>}
                    <th className="px-2 text-center w-20 border border-slate-600 font-bold">Final</th>
                    <th className="px-3 text-center w-24 border border-slate-600 font-bold">Remarks</th>
                 </tr>
              </thead>
              <tbody className="text-[10px]">
                 {finalGrades.map((f, index) => {
                   const isGrade11or12 = (typeof section.gradeLevel === 'string' ? parseInt(section.gradeLevel) : (section.gradeLevel as number || 7)) >= 11;
                   const currentType = (f.subjectType || 'CORE');
                   const prevType = index > 0 ? (finalGrades[index - 1].subjectType || 'CORE') : null;
                   const shouldShowHeader = isGrade11or12 && currentType !== prevType;
                   
                   let typeTitle = 'Core Subjects';
                   if (currentType === 'APPLIED') typeTitle = 'Applied Subjects';
                   else if (currentType === 'SPECIALIZED') typeTitle = 'Specialized Subjects';
                   else if (currentType === 'ELECTIVE') typeTitle = 'Elective Subjects';

                   return (
                     <React.Fragment key={`${f.id}-${index}`}>
                       {shouldShowHeader && (
                         <tr className="bg-slate-100">
                           <td colSpan={totalColsCount} className="px-3 py-1.5 font-bold italic text-slate-800 border border-slate-600 text-xs text-left">
                             {typeTitle}
                           </td>
                         </tr>
                       )}
                       <tr className="h-8">
                          <td className={`px-3 text-left font-medium text-slate-900 border border-slate-600 truncate ${f.isMapehComponent ? 'pl-8 italic text-slate-500' : ''}`}>{f.name}</td>
                          {f.grades.map((g, i) => {
                             const termNum = f.terms[i];
                             const isNotOffered = isGrade11or12 && f.offeredTerms && f.offeredTerms.length > 0 && !f.offeredTerms.includes(termNum as TermNumber);

                         if (isNotOffered) {
                           return (
                             <td key={i} className="px-1 border border-slate-600 bg-slate-900" />
                           );
                         }

                         return (
                           <td key={i} className={`px-1 text-center font-medium border border-slate-600 ${f.isMapehComponent ? 'italic text-slate-500' : 'text-slate-700'}`}>{g || '--'}</td>
                         );
                      })}
                      <td className="px-2 text-center font-bold text-slate-900 border border-slate-600">{f.isMapehComponent ? '' : (f.final || '--')}</td>
                      <td className="px-3 text-center font-medium uppercase text-slate-700 border border-slate-600">
                         {f.isMapehComponent ? '' : (f.final > 0 ? (f.final >= 75 ? 'Passed' : 'Failed') : '--')}
                      </td>
                   </tr>
                   </React.Fragment>
                   );
                 })}
              </tbody>
              <tfoot>
                 <tr className="bg-slate-50 h-10">
                    <td className="px-3 font-bold text-slate-900 text-xs border border-slate-600">General Average</td>
                    <td colSpan={termColsCount} className="border border-slate-600"></td>
                    <td className="px-2 text-center font-bold text-slate-900 border border-slate-600 text-sm">{genAvg || '--'}</td>
                    <td className="px-3 text-center font-bold uppercase text-slate-900 text-[10px] border border-slate-600">
                       {genAvg > 0 ? (genAvg >= 75 ? 'Promoted' : 'Retained') : '--'}
                    </td>
                 </tr>
              </tfoot>
           </table>
        </div>

       <div className="grid grid-cols-1 pt-8 px-6">
          <div className="space-y-4">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Academic Certification</p>
             <div className="flex justify-between items-center italic">
                <div>
                   <p className="text-[9px] font-black text-indigo-600 uppercase mb-2">Adviser Name</p>
                   <p className="text-[10px] font-black border-b border-slate-300 pb-1 uppercase">{section.adviserName}</p>
                </div>
                <div className="flex flex-col items-center">
                   <input type="file" ref={signatureInputRef} onChange={handleSignatureUpload} className="hidden" accept="image/*" />
                   <button onClick={() => signatureInputRef.current?.click()} className="text-center group">
                      {signature ? (
                         <img src={signature} alt="Adviser Signature" className="h-12 w-24 object-contain" />
                      ) : (
                         <div className="w-32 h-12 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 group-hover:border-indigo-500 transition-colors text-[8px]">
                            Upload Signature
                         </div>
                      )}
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-900">Digital Authentication</p>
                   </button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
