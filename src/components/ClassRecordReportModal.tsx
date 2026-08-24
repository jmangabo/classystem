import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Student, Subject, Section, School, TermNumber } from '../types';
import { formatStudentName, printHTMLContent } from '../utils';
import { FileSpreadsheet, Printer, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { db, safeGetDocs as getDocs } from '../firebase';
import { query, collection, where } from 'firebase/firestore';

interface ClassRecordReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  selectedSubject: Subject;
  activeTerm: TermNumber;
  selectedSection: Section | null;
  currentUser?: any;
  calculateGrade: (student: Student, subject: Subject, term: TermNumber) => any;
  refData: any;
}

export const ClassRecordReportModal: React.FC<ClassRecordReportModalProps> = ({
  isOpen,
  onClose,
  students,
  selectedSubject,
  activeTerm,
  selectedSection,
  currentUser,
  calculateGrade,
  refData,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);
  const [headOfSchool, setHeadOfSchool] = useState<string>(selectedSection?.headOfSchool || '');
  const [schoolName, setSchoolName] = useState<string>(selectedSection?.schoolName || '');

  useEffect(() => {
    setHeadOfSchool(selectedSection?.headOfSchool || '');
    setSchoolName(selectedSection?.schoolName || '');

    if (selectedSection?.schoolId) {
      const q = query(collection(db, "schools"), where("schoolId", "==", selectedSection.schoolId));
      getDocs(q).then(snapshot => {
        if (!snapshot.empty) {
          const schoolData = snapshot.docs[0].data() as School;
          if (schoolData.headOfSchool) {
            setHeadOfSchool(schoolData.headOfSchool);
          }
          if (schoolData.name) {
            setSchoolName(schoolData.name);
          }
        }
      }).catch(err => {
        console.error("Error fetching school details for Class Record:", err);
      });
    }
  }, [selectedSection?.schoolId, selectedSection?.headOfSchool, selectedSection?.schoolName]);

  // Filter out blank/dropped/transferred students and sort
  const sortedStudents = useMemo(() => {
    const list = students.filter(s => {
      const name = formatStudentName(s)?.trim();
      const isInactive = s.status === 'Dropped Out' || s.status === 'Transferred Out';
      return name && !isInactive;
    }).sort((a, b) => {
      const nameA = formatStudentName(a);
      const nameB = formatStudentName(b);
      return nameA.localeCompare(nameB);
    });
    return {
      male: list.filter(s => s.sex?.toLowerCase() === 'male'),
      female: list.filter(s => s.sex?.toLowerCase() === 'female'),
      all: list,
    };
  }, [students]);

  // Determine active columns (do NOT include blank/unused columns from Written Works & Performance Tasks)
  const activeWWIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < 5; i++) {
      const maxScore = Number(refData?.writtenWorks?.maxScores?.[i]) || 0;
      const name = refData?.writtenWorks?.names?.[i]?.trim();
      const hasAnyScore = students.some(s => {
        const sc = s.grades?.[selectedSubject.id]?.[activeTerm]?.writtenWorks?.scores?.[i];
        return sc !== undefined && sc !== null && sc !== '' && Number(sc) > 0;
      });
      if (maxScore > 0 || name || hasAnyScore) {
        indices.push(i);
      }
    }
    return indices.length > 0 ? indices : [0];
  }, [refData, students, selectedSubject, activeTerm]);

  const activePTIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < 5; i++) {
      const maxScore = Number(refData?.performanceTasks?.maxScores?.[i]) || 0;
      const name = refData?.performanceTasks?.names?.[i]?.trim();
      const hasAnyScore = students.some(s => {
        const sc = s.grades?.[selectedSubject.id]?.[activeTerm]?.performanceTasks?.scores?.[i];
        return sc !== undefined && sc !== null && sc !== '' && Number(sc) > 0;
      });
      if (maxScore > 0 || name || hasAnyScore) {
        indices.push(i);
      }
    }
    return indices.length > 0 ? indices : [0];
  }, [refData, students, selectedSubject, activeTerm]);

  const activeSTIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < 2; i++) {
      const maxScore = Number(refData?.summativeTests?.maxScores?.[i]) || 0;
      const name = refData?.summativeTests?.names?.[i]?.trim();
      const hasAnyScore = students.some(s => {
        const sc = s.grades?.[selectedSubject.id]?.[activeTerm]?.summativeTests?.scores?.[i];
        return sc !== undefined && sc !== null && sc !== '' && Number(sc) > 0;
      });
      if (maxScore > 0 || name || hasAnyScore) {
        indices.push(i);
      }
    }
    return indices;
  }, [refData, students, selectedSubject, activeTerm]);

  const hasExam = useMemo(() => {
    const maxScore = Number(refData?.termExam?.maxScore) || 0;
    const hasAnyScore = students.some(s => {
      const sc = s.grades?.[selectedSubject.id]?.[activeTerm]?.termExam?.score;
      return sc !== undefined && sc !== null && sc !== '' && Number(sc) > 0;
    });
    return maxScore > 0 || hasAnyScore || (activeSTIndices.length === 0);
  }, [refData, students, selectedSubject, activeTerm, activeSTIndices]);

  // HPS Calculations for active items only
  const wwTotalMax = activeWWIndices.reduce((sum, idx) => sum + (Number(refData?.writtenWorks?.maxScores?.[idx]) || 0), 0);
  const ptTotalMax = activePTIndices.reduce((sum, idx) => sum + (Number(refData?.performanceTasks?.maxScores?.[idx]) || 0), 0);
  const stTotalMax = activeSTIndices.reduce((sum, idx) => sum + (Number(refData?.summativeTests?.maxScores?.[idx]) || 0), 0);
  const examMax = hasExam ? (Number(refData?.termExam?.maxScore) || 0) : 0;
  const qaTotalMax = stTotalMax + examMax;

  // Compute stats for a group
  const computeStats = (group: Student[]) => {
    if (group.length === 0) {
      return {
        count: 0,
        takers: 0,
        passed: 0,
        failed: 0,
        passingRate: 0,
        mps: 0,
        outstanding: 0,
        verySatisfactory: 0,
        satisfactory: 0,
        fairlySatisfactory: 0,
        didNotMeet: 0,
        avgWW: 0,
        avgPT: 0,
        avgQA: 0,
        rows: [],
      };
    }

    const calculated = group.map(s => {
      const g = calculateGrade(s, selectedSubject, activeTerm);
      const data = s.grades?.[selectedSubject.id]?.[activeTerm] || {};
      const wwScores = (data.writtenWorks?.scores || []).map((v: any) => Number(v) || 0);
      const ptScores = (data.performanceTasks?.scores || []).map((v: any) => Number(v) || 0);
      const s1 = Number(data.summativeTests?.scores?.[0]) || 0;
      const s2 = Number(data.summativeTests?.scores?.[1]) || 0;
      const se = Number(data.termExam?.score) || 0;
      const qaScore = s1 + s2 + se;

      return {
        student: s,
        grade: g,
        wwScores,
        wwTotal: g.ww?.total || 0,
        wwPs: g.ww?.ps || 0,
        wwWs: g.ww?.ws || 0,
        ptScores,
        ptTotal: g.pt?.total || 0,
        ptPs: g.pt?.ps || 0,
        ptWs: g.pt?.ws || 0,
        stScores: [s1, s2],
        examScore: se,
        qaScore,
        qaPs: g.ta?.ps || 0,
        qaWs: g.ta?.ws || 0,
        initialGrade: g.initial || 0,
        finalGrade: g.final || 0,
        hasData: g.hasData,
      };
    });

    const takersList = calculated.filter(c => c.hasData);
    const takers = takersList.length;
    const passed = takersList.filter(c => c.finalGrade >= 75).length;
    const failed = takersList.filter(c => c.finalGrade > 0 && c.finalGrade < 75).length;
    const passingRate = takers > 0 ? (passed / takers) * 100 : 0;
    const mps = takers > 0 ? takersList.reduce((acc, c) => acc + c.finalGrade, 0) / takers : 0;

    let outstanding = 0;
    let verySatisfactory = 0;
    let satisfactory = 0;
    let fairlySatisfactory = 0;
    let didNotMeet = 0;

    takersList.forEach(c => {
      const f = c.finalGrade;
      if (f >= 90) outstanding++;
      else if (f >= 85) verySatisfactory++;
      else if (f >= 80) satisfactory++;
      else if (f >= 75) fairlySatisfactory++;
      else if (f > 0) didNotMeet++;
    });

    const avgWW = takers > 0 ? takersList.reduce((acc, c) => acc + c.wwTotal, 0) / takers : 0;
    const avgPT = takers > 0 ? takersList.reduce((acc, c) => acc + c.ptTotal, 0) / takers : 0;
    const avgQA = takers > 0 ? takersList.reduce((acc, c) => acc + c.qaScore, 0) / takers : 0;

    return {
      count: group.length,
      takers,
      passed,
      failed,
      passingRate,
      mps,
      outstanding,
      verySatisfactory,
      satisfactory,
      fairlySatisfactory,
      didNotMeet,
      avgWW,
      avgPT,
      avgQA,
      rows: calculated,
    };
  };

  const maleStats = useMemo(() => computeStats(sortedStudents.male), [sortedStudents.male, selectedSubject, activeTerm, refData]);
  const femaleStats = useMemo(() => computeStats(sortedStudents.female), [sortedStudents.female, selectedSubject, activeTerm, refData]);
  const overallStats = useMemo(() => computeStats(sortedStudents.all), [sortedStudents.all, selectedSubject, activeTerm, refData]);

  const teacherName = useMemo(() => {
    if (selectedSubject?.teacherEmail && currentUser?.email && selectedSubject.teacherEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) {
      return currentUser?.name || currentUser?.displayName || currentUser?.email || "Subject Teacher";
    }
    return currentUser?.name || currentUser?.displayName || selectedSection?.adviserName || "Subject Teacher";
  }, [selectedSubject, currentUser, selectedSection]);

  const adviserName = selectedSection?.adviserName || "Class Adviser";
  const schoolHeadName = headOfSchool || selectedSection?.headOfSchool || "School Head / Principal";

  // Total columns span calculation
  const wwColSpan = activeWWIndices.length + 3;
  const ptColSpan = activePTIndices.length + 3;
  const qaColSpan = activeSTIndices.length + (hasExam ? 1 : 0) + 3;
  const totalTableColumns = 3 + wwColSpan + ptColSpan + qaColSpan + 3;

  // Print function with complete CSS styling for the report header and tables
  const handlePrint = () => {
    if (!printableRef.current) return;
    const content = printableRef.current.innerHTML;
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Class Record Report - ${selectedSubject.name} - Quarter ${activeTerm}</title>
  <meta charset="utf-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page {
      size: A4 landscape;
      margin: 8mm 6mm 8mm 6mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 8px;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-wrapper {
      width: 100%;
      margin: 0 auto;
    }
    
    /* Reset Tailwind constraints for print */
    .print-wrapper > div {
      max-width: none !important;
      width: 100% !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      margin: 0 !important;
    }

    /* Print Table Auto-Fitting */
    table {
      table-layout: auto !important;
      font-size: 6.5px !important; /* Smaller font to fit more columns */
    }
    
    th, td {
      padding: 1.5px 1px !important; /* Tighter padding */
      word-wrap: break-word !important;
    }
    
    /* Remove all forced width classes so the browser calculates optimal table layout */
    .w-6, .w-7, .w-8, .w-12, .w-14, .w-20, .min-w-\[140px\], .max-w-\[160px\] {
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
    }

    /* Allow names to wrap instead of cutting off */
    .truncate { 
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }
    
    /* Header & Metadata Styles */
    .report-header {
      text-align: center;
      margin-bottom: 12px;
    }
    .report-header p.sub-title {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #475569;
      margin: 0 0 2px 0;
    }
    .report-header h2.dept-title {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .report-header h1.main-title {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      color: #1e1b4b;
      margin: 0;
    }
    
    .meta-box {
      border: 1px solid #000;
      background-color: #f8fafc !important;
      padding: 6px 8px;
      margin-bottom: 8px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      font-size: 9px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 7.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .meta-value {
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
    }
    
    .legend-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background-color: #f1f5f9 !important;
      border: 1px solid #cbd5e1;
      font-size: 8.5px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 7.5px;
    }
    thead {
      display: table-header-group !important;
    }
    tfoot {
      display: table-footer-group !important;
    }
    tbody {
      display: table-row-group !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th, td {
      border: 1px solid #000;
      padding: 2.5px 2px;
      text-align: center;
      vertical-align: middle;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th {
      background-color: #f1f5f9 !important;
      font-weight: 700;
      text-transform: uppercase;
    }
    .hps-row {
      background-color: #fef3c7 !important;
      font-weight: 800;
    }
    .section-header, .section-header-row, tr.section-header-row {
      background-color: #e2e8f0 !important;
      font-weight: 900;
      text-align: left;
      padding-left: 6px;
      text-transform: uppercase;
      font-size: 8px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .student-row, tr.student-row {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: monospace; }

    /* Summary Grid - 2 columns side by side */
    .summary-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 12px !important;
      margin-top: 12px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Signatures Section - Strict Horizontal View Across the Page */
    table.signature-table {
      width: 100% !important;
      border: none !important;
      border-collapse: collapse !important;
      margin-top: 24px !important;
      padding-top: 10px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      table-layout: fixed !important;
    }
    table.signature-table td {
      border: none !important;
      padding: 0 12px !important;
      text-align: center !important;
      vertical-align: top !important;
      width: 50% !important;
    }
    .sig-role {
      font-size: 8px !important;
      font-weight: 700 !important;
      color: #334155 !important;
      text-transform: uppercase !important;
      margin-bottom: 24px !important;
      text-align: center !important;
    }
    .sig-name {
      font-weight: 900 !important;
      font-size: 9.5px !important;
      text-transform: uppercase !important;
      border-bottom: 1px solid #000 !important;
      width: 90% !important;
      padding-bottom: 2px !important;
      margin: 0 auto 2px auto !important;
      text-align: center !important;
    }
    .sig-title {
      font-size: 8px !important;
      font-weight: 600 !important;
      color: #475569 !important;
      text-transform: uppercase !important;
      margin: 0 0 3px 0 !important;
      text-align: center !important;
    }
    .sig-date {
      font-size: 7px !important;
      color: #64748b !important;
      margin: 0 !important;
      text-align: center !important;
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${content}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.onafterprint = function() { window.close(); };
        window.onfocus = function() { setTimeout(function() { window.close(); }, 800); };
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;
    printHTMLContent(html);
  };

  // Export to Excel without blank records
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const createCell = (v: any, options: any = {}) => {
      const cell: any = { v: v ?? '', t: typeof v === 'number' ? 'n' : 's' };
      cell.s = {
        font: { name: 'Arial', sz: options.sz || 9, bold: !!options.bold, color: { rgb: options.color || '000000' } },
        alignment: { horizontal: options.align || 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      if (options.bg) {
        cell.s.fill = { fgColor: { rgb: options.bg } };
      }
      return cell;
    };

    const emptyCell = () => createCell('', {});

    const rows: any[][] = [];

    // Header Lines
    rows.push([createCell("Republic of the Philippines", { bold: true, sz: 10, align: 'center' })]);
    rows.push([createCell("Department of Education", { bold: true, sz: 11, align: 'center' })]);
    rows.push([createCell("CLASS RECORD REPORT (QUARTERLY SUMMARY)", { bold: true, sz: 12, align: 'center', bg: 'E2E8F0' })]);
    rows.push([]);

    // Metadata
    rows.push([
      createCell(`School: ${schoolName || selectedSection?.schoolName || "DepEd School"}`, { bold: true, align: 'left' }),
      createCell(`School ID: ${selectedSection?.schoolId || "-"}`, { bold: true }),
      createCell(`School Year: ${selectedSection?.schoolYear || "2025-2026"}`, { bold: true }),
      createCell(`Grade & Section: Grade ${selectedSection?.gradeLevel || ""} - ${selectedSection?.name || ""}`, { bold: true })
    ]);
    rows.push([
      createCell(`Learning Area: ${selectedSubject.name}`, { bold: true, align: 'left' }),
      createCell(`Quarter / Term: Quarter ${activeTerm}`, { bold: true }),
      createCell(`Teacher: ${teacherName}`, { bold: true }),
      createCell(`Adviser: ${adviserName}`, { bold: true })
    ]);
    rows.push([]);

    // Table Header Row 1 (Category Banners)
    const h1: any[] = [
      createCell("No.", { bold: true, bg: 'F1F5F9' }),
      createCell("Learner's Name", { bold: true, bg: 'F1F5F9', align: 'left' }),
      createCell("LRN", { bold: true, bg: 'F1F5F9' }),
      
      // WW
      createCell(`WRITTEN WORKS (${selectedSubject.wwWeight}%)`, { bold: true, bg: 'DBEAFE' }),
      ...new Array(Math.max(0, activeWWIndices.length - 1)).fill(emptyCell()),
      createCell("WW Total", { bold: true, bg: 'BFDBFE' }),
      createCell("WW PS", { bold: true, bg: 'BFDBFE' }),
      createCell("WW WS", { bold: true, bg: 'BFDBFE' }),

      // PT
      createCell(`PERFORMANCE TASKS (${selectedSubject.ptWeight}%)`, { bold: true, bg: 'DCFCE7' }),
      ...new Array(Math.max(0, activePTIndices.length - 1)).fill(emptyCell()),
      createCell("PT Total", { bold: true, bg: 'BBF7D0' }),
      createCell("PT PS", { bold: true, bg: 'BBF7D0' }),
      createCell("PT WS", { bold: true, bg: 'BBF7D0' }),

      // QA
      createCell(`QUARTERLY ASSESSMENT (${selectedSubject.taWeight}%)`, { bold: true, bg: 'FEF3C7' }),
      ...new Array(Math.max(0, activeSTIndices.length + (hasExam ? 1 : 0) - 1)).fill(emptyCell()),
      createCell("QA Total", { bold: true, bg: 'FDE68A' }),
      createCell("QA PS", { bold: true, bg: 'FDE68A' }),
      createCell("QA WS", { bold: true, bg: 'FDE68A' }),

      // Final Grades
      createCell("Initial Grade", { bold: true, bg: 'F1F5F9' }),
      createCell("Quarter Grade", { bold: true, bg: 'F1F5F9' }),
      createCell("Remarks", { bold: true, bg: 'F1F5F9' })
    ];
    rows.push(h1);

    // Table Header Row 2 (Sub-headers for active columns only)
    const h2: any[] = [
      emptyCell(), emptyCell(), emptyCell(),
      
      // WW sub-headers
      ...activeWWIndices.map(idx => createCell(`WW ${idx + 1}`, { bold: true, bg: 'DBEAFE' })),
      createCell("Total", { bold: true, bg: 'BFDBFE' }),
      createCell("100%", { bold: true, bg: 'BFDBFE' }),
      createCell(`${selectedSubject.wwWeight}%`, { bold: true, bg: 'BFDBFE' }),

      // PT sub-headers
      ...activePTIndices.map(idx => createCell(`PT ${idx + 1}`, { bold: true, bg: 'DCFCE7' })),
      createCell("Total", { bold: true, bg: 'BBF7D0' }),
      createCell("100%", { bold: true, bg: 'BBF7D0' }),
      createCell(`${selectedSubject.ptWeight}%`, { bold: true, bg: 'BBF7D0' }),

      // QA sub-headers
      ...activeSTIndices.map(idx => createCell(`ST ${idx + 1}`, { bold: true, bg: 'FEF3C7' })),
      ...(hasExam ? [createCell("Exam", { bold: true, bg: 'FEF3C7' })] : []),
      createCell("Total", { bold: true, bg: 'FDE68A' }),
      createCell("100%", { bold: true, bg: 'FDE68A' }),
      createCell(`${selectedSubject.taWeight}%`, { bold: true, bg: 'FDE68A' }),

      emptyCell(), emptyCell(), emptyCell()
    ];
    rows.push(h2);

    // HPS Row
    const hpsRow: any[] = [
      createCell("", { bg: 'FEF08A' }),
      createCell("HIGHEST POSSIBLE SCORE (HPS)", { bold: true, bg: 'FEF08A', align: 'left' }),
      createCell("-", { bg: 'FEF08A' }),
      
      // WW HPS
      ...activeWWIndices.map(idx => createCell(Number(refData?.writtenWorks?.maxScores?.[idx]) || 0, { bold: true, bg: 'FEF08A' })),
      createCell(wwTotalMax, { bold: true, bg: 'FDE047' }),
      createCell("100.00", { bold: true, bg: 'FDE047' }),
      createCell(selectedSubject.wwWeight.toFixed(2), { bold: true, bg: 'FDE047' }),

      // PT HPS
      ...activePTIndices.map(idx => createCell(Number(refData?.performanceTasks?.maxScores?.[idx]) || 0, { bold: true, bg: 'FEF08A' })),
      createCell(ptTotalMax, { bold: true, bg: 'FDE047' }),
      createCell("100.00", { bold: true, bg: 'FDE047' }),
      createCell(selectedSubject.ptWeight.toFixed(2), { bold: true, bg: 'FDE047' }),

      // QA HPS
      ...activeSTIndices.map(idx => createCell(Number(refData?.summativeTests?.maxScores?.[idx]) || 0, { bold: true, bg: 'FEF08A' })),
      ...(hasExam ? [createCell(examMax, { bold: true, bg: 'FEF08A' })] : []),
      createCell(qaTotalMax, { bold: true, bg: 'FDE047' }),
      createCell("100.00", { bold: true, bg: 'FDE047' }),
      createCell(selectedSubject.taWeight.toFixed(2), { bold: true, bg: 'FDE047' }),

      createCell("100.00", { bold: true, bg: 'FEF08A' }),
      createCell("100", { bold: true, bg: 'FEF08A' }),
      createCell("-", { bold: true, bg: 'FEF08A' })
    ];
    rows.push(hpsRow);

    // Render group function
    const renderExcelGroup = (title: string, groupRows: any[]) => {
      rows.push([createCell(title, { bold: true, bg: 'E2E8F0', align: 'left' })]);
      groupRows.forEach((r, idx) => {
        const row: any[] = [
          createCell(idx + 1, {}),
          createCell(formatStudentName(r.student), { align: 'left', bold: true }),
          createCell(r.student.lrn || "-", {}),

          // Active WW Scores
          ...activeWWIndices.map(i => {
            const sc = r.wwScores[i];
            const hasHps = (Number(refData?.writtenWorks?.maxScores?.[i]) || 0) > 0;
            return createCell(hasHps || sc > 0 ? sc : "-", {});
          }),
          createCell(r.wwTotal > 0 ? r.wwTotal : (r.hasData ? 0 : "-"), { bold: true }),
          createCell(r.wwPs > 0 ? r.wwPs.toFixed(2) : "-", {}),
          createCell(r.wwWs > 0 ? r.wwWs.toFixed(2) : "-", {}),

          // Active PT Scores
          ...activePTIndices.map(i => {
            const sc = r.ptScores[i];
            const hasHps = (Number(refData?.performanceTasks?.maxScores?.[i]) || 0) > 0;
            return createCell(hasHps || sc > 0 ? sc : "-", {});
          }),
          createCell(r.ptTotal > 0 ? r.ptTotal : (r.hasData ? 0 : "-"), { bold: true }),
          createCell(r.ptPs > 0 ? r.ptPs.toFixed(2) : "-", {}),
          createCell(r.ptWs > 0 ? r.ptWs.toFixed(2) : "-", {}),

          // Active QA Scores
          ...activeSTIndices.map(i => {
            const sc = r.stScores[i];
            const hasHps = (Number(refData?.summativeTests?.maxScores?.[i]) || 0) > 0;
            return createCell(hasHps || sc > 0 ? sc : "-", {});
          }),
          ...(hasExam ? [createCell(r.examScore > 0 ? r.examScore : (r.hasData ? 0 : "-"), {})] : []),
          createCell(r.qaScore > 0 ? r.qaScore : (r.hasData ? 0 : "-"), { bold: true }),
          createCell(r.qaPs > 0 ? r.qaPs.toFixed(2) : "-", {}),
          createCell(r.qaWs > 0 ? r.qaWs.toFixed(2) : "-", {}),

          // Final Grades
          createCell(r.initialGrade > 0 ? r.initialGrade.toFixed(2) : "-", {}),
          createCell(r.finalGrade > 0 ? r.finalGrade : "-", { bold: true }),
          createCell(r.finalGrade >= 75 ? "PASSED" : (r.finalGrade > 0 ? "FAILED" : "-"), {
            bold: true,
            color: r.finalGrade >= 75 ? '15803D' : 'B91C1C'
          })
        ];
        rows.push(row);
      });
    };

    renderExcelGroup(`MALE LEARNERS (${maleStats.count})`, maleStats.rows || []);
    renderExcelGroup(`FEMALE LEARNERS (${femaleStats.count})`, femaleStats.rows || []);

    // Summary Statistics
    rows.push([]);
    rows.push([createCell("SUMMARY OF LEARNER PERFORMANCE & MPS", { bold: true, bg: 'E2E8F0', align: 'left' })]);
    rows.push([
      createCell("Category", { bold: true, bg: 'F1F5F9' }),
      createCell("Enrolled", { bold: true, bg: 'F1F5F9' }),
      createCell("Takers", { bold: true, bg: 'F1F5F9' }),
      createCell("Passed", { bold: true, bg: 'F1F5F9' }),
      createCell("Failed", { bold: true, bg: 'F1F5F9' }),
      createCell("Passing %", { bold: true, bg: 'F1F5F9' }),
      createCell("MPS / Average", { bold: true, bg: 'F1F5F9' })
    ]);
    rows.push([
      createCell("Male", { bold: true }),
      createCell(maleStats.count, {}),
      createCell(maleStats.takers, {}),
      createCell(maleStats.passed, { color: '15803D', bold: true }),
      createCell(maleStats.failed, { color: 'B91C1C', bold: true }),
      createCell(`${maleStats.passingRate.toFixed(2)}%`, { bold: true }),
      createCell(maleStats.mps.toFixed(2), { bold: true })
    ]);
    rows.push([
      createCell("Female", { bold: true }),
      createCell(femaleStats.count, {}),
      createCell(femaleStats.takers, {}),
      createCell(femaleStats.passed, { color: '15803D', bold: true }),
      createCell(femaleStats.failed, { color: 'B91C1C', bold: true }),
      createCell(`${femaleStats.passingRate.toFixed(2)}%`, { bold: true }),
      createCell(femaleStats.mps.toFixed(2), { bold: true })
    ]);
    rows.push([
      createCell("Combined Total", { bold: true, bg: 'FEF3C7' }),
      createCell(overallStats.count, { bold: true, bg: 'FEF3C7' }),
      createCell(overallStats.takers, { bold: true, bg: 'FEF3C7' }),
      createCell(overallStats.passed, { bold: true, bg: 'FEF3C7', color: '15803D' }),
      createCell(overallStats.failed, { bold: true, bg: 'FEF3C7', color: 'B91C1C' }),
      createCell(`${overallStats.passingRate.toFixed(2)}%`, { bold: true, bg: 'FEF3C7' }),
      createCell(overallStats.mps.toFixed(2), { bold: true, bg: 'FEF3C7' })
    ]);

    // Signatures
    rows.push([]);
    rows.push([]);
    const colMid2 = Math.max(2, Math.floor((2 * totalTableColumns) / 3));

    const sigLeadRow = new Array(totalTableColumns).fill(null).map(() => emptyCell());
    sigLeadRow[1] = createCell("Prepared by:", { bold: true, align: 'left', sz: 9 });
    sigLeadRow[colMid2] = createCell("Certified Correct:", { bold: true, align: 'left', sz: 9 });
    rows.push(sigLeadRow);

    rows.push(new Array(totalTableColumns).fill(null).map(() => emptyCell()));

    const sigNamesRow = new Array(totalTableColumns).fill(null).map(() => emptyCell());
    sigNamesRow[1] = createCell(teacherName.toUpperCase(), { bold: true, align: 'center', sz: 10 });
    sigNamesRow[colMid2] = createCell(schoolHeadName.toUpperCase(), { bold: true, align: 'center', sz: 10 });
    rows.push(sigNamesRow);

    const sigRolesRow = new Array(totalTableColumns).fill(null).map(() => emptyCell());
    sigRolesRow[1] = createCell("Subject Teacher", { sz: 8, align: 'center' });
    sigRolesRow[colMid2] = createCell("School Head / Principal", { sz: 8, align: 'center' });
    rows.push(sigRolesRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `Q${activeTerm}_Class_Record`);
    XLSX.writeFile(wb, `Class_Record_Report_${selectedSubject.name}_Q${activeTerm}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Top Modal Navigation / Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Class Record Report</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedSubject.name} • Quarter {activeTerm} • Grade {selectedSection?.gradeLevel || ""} - {selectedSection?.name || ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download size={14} className="text-emerald-600" />
              Excel (XLSX)
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable View Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex-1">
          <div 
            ref={printableRef}
            className="max-w-[1200px] mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200"
            style={{ fontFamily: "'Inter', Arial, sans-serif" }}
          >
            {/* DepEd Official Header */}
            <div className="report-header text-center mb-4">
              <p className="sub-title text-[10px] font-semibold tracking-wider uppercase text-slate-500 mb-0.5">Republic of the Philippines</p>
              <h2 className="dept-title text-sm font-black tracking-wide uppercase text-slate-800 mb-1">Department of Education</h2>
              <h1 className="main-title text-base font-black uppercase text-indigo-900">CLASS RECORD REPORT</h1>
            </div>

            {/* School & Section Metadata Grid */}
            <div className="meta-box grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 border border-slate-900 bg-slate-50 text-[10px]">
              <div className="meta-item">
                <span className="meta-label text-slate-500 font-bold uppercase block text-[8px]">School Name:</span>
                <span className="meta-value font-extrabold uppercase">{schoolName || selectedSection?.schoolName || "Department of Education School"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-slate-500 font-bold uppercase block text-[8px]">School ID:</span>
                <span className="meta-value font-extrabold font-mono">{selectedSection?.schoolId || "-"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-slate-500 font-bold uppercase block text-[8px]">School Year:</span>
                <span className="meta-value font-extrabold">{selectedSection?.schoolYear || "2025-2026"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-slate-500 font-bold uppercase block text-[8px]">Grade & Section:</span>
                <span className="meta-value font-extrabold uppercase">
                  {selectedSection ? (Number(selectedSection.gradeLevel) === 0 ? "Kindergarten - " + selectedSection.name : "Grade " + selectedSection.gradeLevel + " - " + selectedSection.name) : "-"}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-slate-500 font-bold uppercase block text-[8px]">Learning Area (Subject):</span>
                <span className="meta-value font-extrabold uppercase text-indigo-700">{selectedSubject.name}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-slate-500 font-bold uppercase block text-[8px]">Term / Quarter:</span>
                <span className="meta-value font-extrabold uppercase">Quarter {activeTerm}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-slate-500 font-bold uppercase block text-[8px]">Subject Teacher:</span>
                <span className="meta-value font-extrabold uppercase">{teacherName}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-slate-500 font-bold uppercase block text-[8px]">Class Adviser:</span>
                <span className="meta-value font-extrabold uppercase">{adviserName}</span>
              </div>
            </div>

            {/* Component Summary Legend */}
            <div className="legend-bar flex flex-wrap items-center justify-between gap-2 mb-2 px-2 py-1 bg-slate-100 border border-slate-300 text-[9px] font-bold">
              <div className="flex items-center gap-4">
                <span>Components:</span>
                <span className="text-blue-800">Written Works (WW): {selectedSubject.wwWeight}%</span>
                <span className="text-emerald-800">Performance Tasks (PT): {selectedSubject.ptWeight}%</span>
                <span className="text-amber-800">Quarterly Assessment (QA): {selectedSubject.taWeight}%</span>
              </div>
              <div className="text-slate-600">
                Total Enrolled: {sortedStudents.all.length} (Male: {sortedStudents.male.length}, Female: {sortedStudents.female.length})
              </div>
            </div>

            {/* Main Class Record Table with Dynamic Active Columns */}
            <table className="w-full border-collapse border border-slate-900 text-[8px]">
              <thead>
                {/* Level 1 Headers */}
                <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-center">
                  <th rowSpan={2} className="border border-slate-900 p-1 w-6">No.</th>
                  <th rowSpan={2} className="border border-slate-900 p-1 text-left min-w-[140px]">Learner's Name</th>
                  <th rowSpan={2} className="border border-slate-900 p-1 w-20">LRN</th>
                  
                  {/* WW */}
                  <th colSpan={wwColSpan} className="border border-slate-900 p-1 bg-blue-50 text-blue-900">
                    Written Works ({selectedSubject.wwWeight}%)
                  </th>

                  {/* PT */}
                  <th colSpan={ptColSpan} className="border border-slate-900 p-1 bg-emerald-50 text-emerald-900">
                    Performance Tasks ({selectedSubject.ptWeight}%)
                  </th>

                  {/* QA */}
                  <th colSpan={qaColSpan} className="border border-slate-900 p-1 bg-amber-50 text-amber-900">
                    Quarterly Assessment ({selectedSubject.taWeight}%)
                  </th>

                  {/* Final Columns */}
                  <th rowSpan={2} className="border border-slate-900 p-1 w-12 bg-slate-200">Initial Grade</th>
                  <th rowSpan={2} className="border border-slate-900 p-1 w-12 bg-slate-200">Quarter Grade</th>
                  <th rowSpan={2} className="border border-slate-900 p-1 w-14 bg-slate-200">Remarks</th>
                </tr>

                {/* Level 2 Sub-Headers for Active Columns */}
                <tr className="bg-slate-50 text-[7.5px] font-bold text-center">
                  {/* WW sub-headers */}
                  {activeWWIndices.map(idx => (
                    <th key={`head-ww-${idx}`} className="border border-slate-900 p-1 w-7 bg-blue-50/50">
                      {idx + 1}
                    </th>
                  ))}
                  <th className="border border-slate-900 p-1 w-8 bg-blue-100 font-extrabold">Total</th>
                  <th className="border border-slate-900 p-1 w-8 bg-blue-100 font-extrabold">PS</th>
                  <th className="border border-slate-900 p-1 w-8 bg-blue-100 font-extrabold">WS</th>

                  {/* PT sub-headers */}
                  {activePTIndices.map(idx => (
                    <th key={`head-pt-${idx}`} className="border border-slate-900 p-1 w-7 bg-emerald-50/50">
                      {idx + 1}
                    </th>
                  ))}
                  <th className="border border-slate-900 p-1 w-8 bg-emerald-100 font-extrabold">Total</th>
                  <th className="border border-slate-900 p-1 w-8 bg-emerald-100 font-extrabold">PS</th>
                  <th className="border border-slate-900 p-1 w-8 bg-emerald-100 font-extrabold">WS</th>

                  {/* QA sub-headers */}
                  {activeSTIndices.map(idx => (
                    <th key={`head-st-${idx}`} className="border border-slate-900 p-1 w-7 bg-amber-50/50">
                      ST {idx + 1}
                    </th>
                  ))}
                  {hasExam && (
                    <th className="border border-slate-900 p-1 w-8 bg-amber-50/50">Exam</th>
                  )}
                  <th className="border border-slate-900 p-1 w-8 bg-amber-100 font-extrabold">Total</th>
                  <th className="border border-slate-900 p-1 w-8 bg-amber-100 font-extrabold">PS</th>
                  <th className="border border-slate-900 p-1 w-8 bg-amber-100 font-extrabold">WS</th>
                </tr>

                {/* HPS Row */}
                <tr className="bg-amber-100/70 font-black text-[8px] text-center border-b-2 border-slate-900">
                  <td className="border border-slate-900 p-1">-</td>
                  <td className="border border-slate-900 p-1 text-left font-black">HIGHEST POSSIBLE SCORE</td>
                  <td className="border border-slate-900 p-1">-</td>
                  
                  {/* WW HPS */}
                  {activeWWIndices.map(idx => (
                    <td key={`hps-ww-${idx}`} className="border border-slate-900 p-1">
                      {Number(refData?.writtenWorks?.maxScores?.[idx]) || 0}
                    </td>
                  ))}
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">{wwTotalMax}</td>
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">100%</td>
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">{selectedSubject.wwWeight}%</td>

                  {/* PT HPS */}
                  {activePTIndices.map(idx => (
                    <td key={`hps-pt-${idx}`} className="border border-slate-900 p-1">
                      {Number(refData?.performanceTasks?.maxScores?.[idx]) || 0}
                    </td>
                  ))}
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">{ptTotalMax}</td>
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">100%</td>
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">{selectedSubject.ptWeight}%</td>

                  {/* QA HPS */}
                  {activeSTIndices.map(idx => (
                    <td key={`hps-st-${idx}`} className="border border-slate-900 p-1">
                      {Number(refData?.summativeTests?.maxScores?.[idx]) || 0}
                    </td>
                  ))}
                  {hasExam && (
                    <td className="border border-slate-900 p-1">{examMax}</td>
                  )}
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">{qaTotalMax}</td>
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">100%</td>
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">{selectedSubject.taWeight}%</td>

                  {/* Final HPS */}
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">100</td>
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">100</td>
                  <td className="border border-slate-900 p-1 font-black bg-amber-200/80">-</td>
                </tr>
              </thead>

              <tbody>
                {/* MALE LEARNERS SECTION */}
                <tr className="section-header-row bg-slate-200 font-black text-[8px] uppercase">
                  <td colSpan={totalTableColumns} className="border border-slate-900 p-1.5 text-left tracking-wider">
                    MALE LEARNERS ({maleStats.count})
                  </td>
                </tr>

                {maleStats.rows.length === 0 ? (
                  <tr className="student-row">
                    <td colSpan={totalTableColumns} className="border border-slate-900 p-2 text-center text-slate-400 italic">
                      No male learners registered.
                    </td>
                  </tr>
                ) : (
                  maleStats.rows.map((row, idx) => {
                    const isPassed = row.finalGrade >= 75;

                    return (
                      <tr key={row.student.id} className="student-row hover:bg-slate-50 text-center">
                        <td className="border border-slate-900 p-1">{idx + 1}</td>
                        <td className="border border-slate-900 p-1 text-left font-bold truncate max-w-[160px]">
                          {formatStudentName(row.student)}
                        </td>
                        <td className="border border-slate-900 p-1 font-mono text-[7px]">{row.student.lrn || "-"}</td>

                        {/* WW Active columns */}
                        {activeWWIndices.map(i => (
                          <td key={`m-ww-${i}`} className="border border-slate-900 p-1">
                            {row.wwScores[i] > 0 ? row.wwScores[i] : (row.hasData ? "0" : "-")}
                          </td>
                        ))}
                        <td className="border border-slate-900 p-1 font-bold bg-blue-50/50">{row.wwTotal > 0 ? row.wwTotal : (row.hasData ? "0" : "-")}</td>
                        <td className="border border-slate-900 p-1">{row.wwPs > 0 ? row.wwPs.toFixed(2) : "-"}</td>
                        <td className="border border-slate-900 p-1 font-semibold">{row.wwWs > 0 ? row.wwWs.toFixed(2) : "-"}</td>

                        {/* PT Active columns */}
                        {activePTIndices.map(i => (
                          <td key={`m-pt-${i}`} className="border border-slate-900 p-1">
                            {row.ptScores[i] > 0 ? row.ptScores[i] : (row.hasData ? "0" : "-")}
                          </td>
                        ))}
                        <td className="border border-slate-900 p-1 font-bold bg-emerald-50/50">{row.ptTotal > 0 ? row.ptTotal : (row.hasData ? "0" : "-")}</td>
                        <td className="border border-slate-900 p-1">{row.ptPs > 0 ? row.ptPs.toFixed(2) : "-"}</td>
                        <td className="border border-slate-900 p-1 font-semibold">{row.ptWs > 0 ? row.ptWs.toFixed(2) : "-"}</td>

                        {/* QA Active columns */}
                        {activeSTIndices.map(i => (
                          <td key={`m-st-${i}`} className="border border-slate-900 p-1">
                            {row.stScores[i] > 0 ? row.stScores[i] : (row.hasData ? "0" : "-")}
                          </td>
                        ))}
                        {hasExam && (
                          <td className="border border-slate-900 p-1">
                            {row.examScore > 0 ? row.examScore : (row.hasData ? "0" : "-")}
                          </td>
                        )}
                        <td className="border border-slate-900 p-1 font-bold bg-amber-50/50">{row.qaScore > 0 ? row.qaScore : (row.hasData ? "0" : "-")}</td>
                        <td className="border border-slate-900 p-1">{row.qaPs > 0 ? row.qaPs.toFixed(2) : "-"}</td>
                        <td className="border border-slate-900 p-1 font-semibold">{row.qaWs > 0 ? row.qaWs.toFixed(2) : "-"}</td>

                        {/* Final Grades */}
                        <td className="border border-slate-900 p-1 font-mono">{row.initialGrade > 0 ? row.initialGrade.toFixed(2) : "-"}</td>
                        <td className="border border-slate-900 p-1 font-black bg-slate-100">{row.finalGrade > 0 ? row.finalGrade : "-"}</td>
                        <td className={`border border-slate-900 p-1 font-extrabold ${isPassed ? 'text-emerald-700' : (row.finalGrade > 0 ? 'text-rose-700' : 'text-slate-400')}`}>
                          {row.finalGrade > 0 ? (isPassed ? "PASSED" : "FAILED") : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* FEMALE LEARNERS SECTION */}
                <tr className="section-header-row bg-slate-200 font-black text-[8px] uppercase">
                  <td colSpan={totalTableColumns} className="border border-slate-900 p-1.5 text-left tracking-wider">
                    FEMALE LEARNERS ({femaleStats.count})
                  </td>
                </tr>

                {femaleStats.rows.length === 0 ? (
                  <tr className="student-row">
                    <td colSpan={totalTableColumns} className="border border-slate-900 p-2 text-center text-slate-400 italic">
                      No female learners registered.
                    </td>
                  </tr>
                ) : (
                  femaleStats.rows.map((row, idx) => {
                    const isPassed = row.finalGrade >= 75;

                    return (
                      <tr key={row.student.id} className="student-row hover:bg-slate-50 text-center">
                        <td className="border border-slate-900 p-1">{idx + 1}</td>
                        <td className="border border-slate-900 p-1 text-left font-bold truncate max-w-[160px]">
                          {formatStudentName(row.student)}
                        </td>
                        <td className="border border-slate-900 p-1 font-mono text-[7px]">{row.student.lrn || "-"}</td>

                        {/* WW Active columns */}
                        {activeWWIndices.map(i => (
                          <td key={`f-ww-${i}`} className="border border-slate-900 p-1">
                            {row.wwScores[i] > 0 ? row.wwScores[i] : (row.hasData ? "0" : "-")}
                          </td>
                        ))}
                        <td className="border border-slate-900 p-1 font-bold bg-blue-50/50">{row.wwTotal > 0 ? row.wwTotal : (row.hasData ? "0" : "-")}</td>
                        <td className="border border-slate-900 p-1">{row.wwPs > 0 ? row.wwPs.toFixed(2) : "-"}</td>
                        <td className="border border-slate-900 p-1 font-semibold">{row.wwWs > 0 ? row.wwWs.toFixed(2) : "-"}</td>

                        {/* PT Active columns */}
                        {activePTIndices.map(i => (
                          <td key={`f-pt-${i}`} className="border border-slate-900 p-1">
                            {row.ptScores[i] > 0 ? row.ptScores[i] : (row.hasData ? "0" : "-")}
                          </td>
                        ))}
                        <td className="border border-slate-900 p-1 font-bold bg-emerald-50/50">{row.ptTotal > 0 ? row.ptTotal : (row.hasData ? "0" : "-")}</td>
                        <td className="border border-slate-900 p-1">{row.ptPs > 0 ? row.ptPs.toFixed(2) : "-"}</td>
                        <td className="border border-slate-900 p-1 font-semibold">{row.ptWs > 0 ? row.ptWs.toFixed(2) : "-"}</td>

                        {/* QA Active columns */}
                        {activeSTIndices.map(i => (
                          <td key={`f-st-${i}`} className="border border-slate-900 p-1">
                            {row.stScores[i] > 0 ? row.stScores[i] : (row.hasData ? "0" : "-")}
                          </td>
                        ))}
                        {hasExam && (
                          <td className="border border-slate-900 p-1">
                            {row.examScore > 0 ? row.examScore : (row.hasData ? "0" : "-")}
                          </td>
                        )}
                        <td className="border border-slate-900 p-1 font-bold bg-amber-50/50">{row.qaScore > 0 ? row.qaScore : (row.hasData ? "0" : "-")}</td>
                        <td className="border border-slate-900 p-1">{row.qaPs > 0 ? row.qaPs.toFixed(2) : "-"}</td>
                        <td className="border border-slate-900 p-1 font-semibold">{row.qaWs > 0 ? row.qaWs.toFixed(2) : "-"}</td>

                        {/* Final Grades */}
                        <td className="border border-slate-900 p-1 font-mono">{row.initialGrade > 0 ? row.initialGrade.toFixed(2) : "-"}</td>
                        <td className="border border-slate-900 p-1 font-black bg-slate-100">{row.finalGrade > 0 ? row.finalGrade : "-"}</td>
                        <td className={`border border-slate-900 p-1 font-extrabold ${isPassed ? 'text-emerald-700' : (row.finalGrade > 0 ? 'text-rose-700' : 'text-slate-400')}`}>
                          {row.finalGrade > 0 ? (isPassed ? "PASSED" : "FAILED") : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Statistical Performance Analysis Box */}
            <div className="summary-grid mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Summary Performance Table */}
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-wider mb-1 bg-slate-200 p-1 border border-slate-900 text-slate-800">
                  I. Summary of Evaluation & Mean Percentage Score (MPS)
                </h4>
                <table className="w-full border-collapse border border-slate-900 text-[7.5px] text-center">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase">
                      <th className="border border-slate-900 p-1 text-left">Category</th>
                      <th className="border border-slate-900 p-1">Enrolled</th>
                      <th className="border border-slate-900 p-1">Takers</th>
                      <th className="border border-slate-900 p-1 text-emerald-800">Passed</th>
                      <th className="border border-slate-900 p-1 text-rose-800">Failed</th>
                      <th className="border border-slate-900 p-1">Passing %</th>
                      <th className="border border-slate-900 p-1">MPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-900 p-1 text-left font-bold">Male</td>
                      <td className="border border-slate-900 p-1">{maleStats.count}</td>
                      <td className="border border-slate-900 p-1">{maleStats.takers}</td>
                      <td className="border border-slate-900 p-1 font-bold text-emerald-700">{maleStats.passed}</td>
                      <td className="border border-slate-900 p-1 font-bold text-rose-700">{maleStats.failed}</td>
                      <td className="border border-slate-900 p-1 font-bold">{maleStats.passingRate.toFixed(2)}%</td>
                      <td className="border border-slate-900 p-1 font-bold">{maleStats.mps.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-1 text-left font-bold">Female</td>
                      <td className="border border-slate-900 p-1">{femaleStats.count}</td>
                      <td className="border border-slate-900 p-1">{femaleStats.takers}</td>
                      <td className="border border-slate-900 p-1 font-bold text-emerald-700">{femaleStats.passed}</td>
                      <td className="border border-slate-900 p-1 font-bold text-rose-700">{femaleStats.failed}</td>
                      <td className="border border-slate-900 p-1 font-bold">{femaleStats.passingRate.toFixed(2)}%</td>
                      <td className="border border-slate-900 p-1 font-bold">{femaleStats.mps.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-amber-50 font-black">
                      <td className="border border-slate-900 p-1 text-left font-black">COMBINED TOTAL</td>
                      <td className="border border-slate-900 p-1">{overallStats.count}</td>
                      <td className="border border-slate-900 p-1">{overallStats.takers}</td>
                      <td className="border border-slate-900 p-1 text-emerald-700">{overallStats.passed}</td>
                      <td className="border border-slate-900 p-1 text-rose-700">{overallStats.failed}</td>
                      <td className="border border-slate-900 p-1">{overallStats.passingRate.toFixed(2)}%</td>
                      <td className="border border-slate-900 p-1 text-indigo-900">{overallStats.mps.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Proficiency Level Breakdown */}
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-wider mb-1 bg-slate-200 p-1 border border-slate-900 text-slate-800">
                  II. Learning Area Grading Scale Distribution
                </h4>
                <table className="w-full border-collapse border border-slate-900 text-[7.5px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-center">
                      <th className="border border-slate-900 p-1 text-left">Level of Proficiency</th>
                      <th className="border border-slate-900 p-1">Grading Scale</th>
                      <th className="border border-slate-900 p-1">Count</th>
                      <th className="border border-slate-900 p-1">% Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-900 p-1 font-bold text-emerald-800">Outstanding</td>
                      <td className="border border-slate-900 p-1 text-center font-mono">90 - 100</td>
                      <td className="border border-slate-900 p-1 text-center font-bold">{overallStats.outstanding}</td>
                      <td className="border border-slate-900 p-1 text-center">
                        {overallStats.takers > 0 ? ((overallStats.outstanding / overallStats.takers) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-1 font-bold text-blue-800">Very Satisfactory</td>
                      <td className="border border-slate-900 p-1 text-center font-mono">85 - 89</td>
                      <td className="border border-slate-900 p-1 text-center font-bold">{overallStats.verySatisfactory}</td>
                      <td className="border border-slate-900 p-1 text-center">
                        {overallStats.takers > 0 ? ((overallStats.verySatisfactory / overallStats.takers) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-1 font-bold text-cyan-800">Satisfactory</td>
                      <td className="border border-slate-900 p-1 text-center font-mono">80 - 84</td>
                      <td className="border border-slate-900 p-1 text-center font-bold">{overallStats.satisfactory}</td>
                      <td className="border border-slate-900 p-1 text-center">
                        {overallStats.takers > 0 ? ((overallStats.satisfactory / overallStats.takers) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-1 font-bold text-amber-800">Fairly Satisfactory</td>
                      <td className="border border-slate-900 p-1 text-center font-mono">75 - 79</td>
                      <td className="border border-slate-900 p-1 text-center font-bold">{overallStats.fairlySatisfactory}</td>
                      <td className="border border-slate-900 p-1 text-center">
                        {overallStats.takers > 0 ? ((overallStats.fairlySatisfactory / overallStats.takers) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-1 font-bold text-rose-800">Did Not Meet Expectations</td>
                      <td className="border border-slate-900 p-1 text-center font-mono">Below 75</td>
                      <td className="border border-slate-900 p-1 text-center font-bold text-rose-700">{overallStats.didNotMeet}</td>
                      <td className="border border-slate-900 p-1 text-center text-rose-700 font-bold">
                        {overallStats.takers > 0 ? ((overallStats.didNotMeet / overallStats.takers) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* Official Certification & Signature Blocks - Pure Horizontal Layout for Screen, Print & PDF */}
            <table className="signature-table w-full mt-8 pt-4 border-none border-collapse text-[9px]">
              <tbody>
                <tr className="border-none">
                  <td className="w-1/2 border-none p-2 text-center align-top">
                    <p className="sig-role text-slate-700 uppercase font-bold text-[8px] mb-6">Prepared by:</p>
                    <p className="sig-name font-black border-b border-black pb-1 mb-1 text-[10px] uppercase w-full max-w-[220px] mx-auto text-center">{teacherName}</p>
                    <p className="sig-title text-slate-600 uppercase font-semibold text-[8px]">Subject Teacher</p>
                    <p className="sig-date text-slate-500 text-[7px] mt-1">Date: ________________________</p>
                  </td>

                  <td className="w-1/2 border-none p-2 text-center align-top">
                    <p className="sig-role text-slate-700 uppercase font-bold text-[8px] mb-6">Certified Correct:</p>
                    <p className="sig-name font-black border-b border-black pb-1 mb-1 text-[10px] uppercase w-full max-w-[220px] mx-auto text-center">{schoolHeadName}</p>
                    <p className="sig-title text-slate-600 uppercase font-semibold text-[8px]">School Head / Principal</p>
                    <p className="sig-date text-slate-500 text-[7px] mt-1">Date: ________________________</p>
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>

      </div>
    </div>
  );
};
