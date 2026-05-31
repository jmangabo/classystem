import { formatStudentName } from "../utils";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, School } from '../types';
import { Download, FileText, Calendar, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
(window as any).html2canvas = html2canvas;
import { db, safeGetDocs as getDocs } from '../firebase';
import { query, collection, where } from 'firebase/firestore';

interface SF2ReportViewProps {
  students: Student[];
  calendar: any[];
  section: any;
  userId?: string;
}

const PHILIPPINE_HOLIDAYS = [
  '01-01', '04-09', '05-01', '06-12', '08-21', '08-25', '11-01', '11-30', '12-25', '12-30'
];

export const SF2ReportView: React.FC<SF2ReportViewProps> = ({ students, calendar, section, userId }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [headOfSchool, setHeadOfSchool] = useState<string>(section.headOfSchool || '');
  const [adviserName, setAdviserName] = useState<string>(section.adviserName || 'Adviser Name');

  useEffect(() => {
     setAdviserName(section.adviserName || 'Adviser Name');
     setHeadOfSchool(section.headOfSchool || '');
     
     if (section.schoolId) {
        // Fetch school
        const q = query(collection(db, "schools"), where("schoolId", "==", section.schoolId));
        getDocs(q).then(snapshot => {
           if (!snapshot.empty) {
              const schoolData = snapshot.docs[0].data() as School;
              setHeadOfSchool(schoolData.headOfSchool || section.headOfSchool || '');
           }
        }).catch(err => {
             console.error("Error fetching school head:", err);
        });
     }
     
     // We prioritize the adviserName stored in the section object.
     // We no longer overwrite it with the account display name of the email owner
     // to ensure that the specifically assigned teacher's name (e.g. "Analee R. Lumaday") is used.
  }, [section.schoolId, section.adviserEmail, section.adviserName, section.headOfSchool]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    if (userId) {
      return localStorage.getItem(`sf2_selectedMonthKey_${userId}`) || '';
    }
    return '';
  });
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleExportPDF = async () => {
    console.log("PDF button clicked");
    if (!reportRef.current || !currentMonthData) {
      console.error("Missing reportRef or currentMonthData");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const element = reportRef.current;
      
      await doc.html(element, {
        callback: function (doc) {
          const totalPages = (doc as any).internal.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 5);
          }
          doc.save(`SF2_${section.name}_${currentMonthData.month}.pdf`);
          console.log("PDF generated successfully");
        },
        margin: [5, 5, 5, 5],
        autoPaging: 'text',
        x: 0,
        y: 0,
        width: 287, // Landscape width minus margins
        windowWidth: 1200 
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
    }
  };

  const handlePrintNewWindow = () => {
    if (!currentMonthData) return;

    const win = window.open('', '_blank');
    if (!win) {
      alert("Please allow popups to print the report.");
      return;
    }

    const maxDays = Math.max(25, schoolDaysInMonth.length);
    const emptyDaysCount = Math.max(0, 25 - schoolDaysInMonth.length);

    // Male Rows HTML
    const maleRowsHtml = sortedStudents.male.map((student, i) => {
      const dailyData = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData.month] || {};
      let presentCount = 0;
      schoolDaysInMonth.forEach(dayInfo => {
        if (dailyData[dayInfo.day]) presentCount++;
      });
      const totalDays = schoolDaysInMonth.length;
      let absentCount = totalDays - presentCount;
      if (absentCount < 0) absentCount = 0;

      let remarksText = "";
      if (student.status === 'Dropped Out') {
        const dParts = student.dropoutDate?.split('-');
        if (dParts?.length === 3) {
          const dropYear = parseInt(dParts[0]);
          const dropMonth = parseInt(dParts[1]) - 1;
          if (currentMonthData.year === dropYear && monthIndices[currentMonthData.month] === dropMonth) {
            remarksText = `D/O: ${new Date(student.dropoutDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
          }
        }
      } else if (student.status === 'Transferred Out') {
        const dParts = student.dropoutDate?.split('-');
        if (dParts?.length === 3) {
          const dropYear = parseInt(dParts[0]);
          const dropMonth = parseInt(dParts[1]) - 1;
          if (currentMonthData.year === dropYear && monthIndices[currentMonthData.month] === dropMonth) {
            remarksText = `T/O to: ${student.transferredTo || ''}`;
          }
        }
      }

      const attendanceCells = schoolDaysInMonth.map(dayInfo => {
        const isPresent = !!dailyData[dayInfo.day];
        return `<td class="text-center" style="width: 14px;">${!isPresent ? '<span class="absent-marker">X</span>' : '<span class="present-marker">.</span>'}</td>`;
      }).join('');

      const emptyCells = Array.from({ length: emptyDaysCount }).map(() => '<td class="empty-day-cell"></td>').join('');

      return `
        <tr>
          <td class="text-center font-bold" style="width: 20px;">${i + 1}</td>
          <td class="student-name" style="width: 220px;">
            ${formatStudentName(student)}
            ${(student.status === 'Dropped Out' || student.status === 'Transferred Out') ? `<span class="student-status-sub">(${student.status === 'Dropped Out' ? 'Dropped' : 'Transferred'})</span>` : ''}
          </td>
          ${attendanceCells}
          ${emptyCells}
          <td class="text-center font-bold">${absentCount > 0 ? absentCount : ''}</td>
          <td></td> <!-- TAR -->
          <td class="remarks-cell" style="width: 130px; font-weight: 600; font-size: 7.5px;">${remarksText}</td>
        </tr>
      `;
    }).join('');

    // Female Rows HTML
    const femaleRowsHtml = sortedStudents.female.map((student, i) => {
      const dailyData = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData.month] || {};
      let presentCount = 0;
      schoolDaysInMonth.forEach(dayInfo => {
        if (dailyData[dayInfo.day]) presentCount++;
      });
      const totalDays = schoolDaysInMonth.length;
      let absentCount = totalDays - presentCount;
      if (absentCount < 0) absentCount = 0;

      let remarksText = "";
      if (student.status === 'Dropped Out') {
        const dParts = student.dropoutDate?.split('-');
        if (dParts?.length === 3) {
          const dropYear = parseInt(dParts[0]);
          const dropMonth = parseInt(dParts[1]) - 1;
          if (currentMonthData.year === dropYear && monthIndices[currentMonthData.month] === dropMonth) {
            remarksText = `D/O: ${new Date(student.dropoutDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
          }
        }
      } else if (student.status === 'Transferred Out') {
        const dParts = student.dropoutDate?.split('-');
        if (dParts?.length === 3) {
          const dropYear = parseInt(dParts[0]);
          const dropMonth = parseInt(dParts[1]) - 1;
          if (currentMonthData.year === dropYear && monthIndices[currentMonthData.month] === dropMonth) {
            remarksText = `T/O to: ${student.transferredTo || ''}`;
          }
        }
      }

      const attendanceCells = schoolDaysInMonth.map(dayInfo => {
        const isPresent = !!dailyData[dayInfo.day];
        return `<td class="text-center" style="width: 14px;">${!isPresent ? '<span class="absent-marker">X</span>' : '<span class="present-marker">.</span>'}</td>`;
      }).join('');

      const emptyCells = Array.from({ length: emptyDaysCount }).map(() => '<td class="empty-day-cell"></td>').join('');

      return `
        <tr>
          <td class="text-center font-bold" style="width: 20px;">${i + 1}</td>
          <td class="student-name" style="width: 220px;">
            ${formatStudentName(student)}
            ${(student.status === 'Dropped Out' || student.status === 'Transferred Out') ? `<span class="student-status-sub">(${student.status === 'Dropped Out' ? 'Dropped' : 'Transferred'})</span>` : ''}
          </td>
          ${attendanceCells}
          ${emptyCells}
          <td class="text-center font-bold">${absentCount > 0 ? absentCount : ''}</td>
          <td></td> <!-- TAR -->
          <td class="remarks-cell" style="width: 130px; font-weight: 600; font-size: 7.5px;">${remarksText}</td>
        </tr>
      `;
    }).join('');

    // Headers
    const datesHeaderHtml = schoolDaysInMonth.map(dayInfo => `
      <th class="border-cell font-bold" style="width: 14px; text-align: center; font-size: 8px;">${dayInfo.day}</th>
    `).join('') + Array.from({ length: emptyDaysCount }).map(() => '<th class="border-cell bg-slate-50" style="width: 14px;"></th>').join('');

    const dowHeaderHtml = schoolDaysInMonth.map(dayInfo => {
      const date = new Date(currentMonthData.year, monthIndices[currentMonthData.month], dayInfo.day);
      const dow = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'][date.getDay()];
      return `<th class="border-cell font-normal" style="width: 14px; text-align: center; font-size: 7px;">${dow}</th>`;
    }).join('') + Array.from({ length: emptyDaysCount }).map(() => '<th class="border-cell bg-slate-50" style="width: 14px;"></th>').join('');

    // Absentees Male Total
    const totalMaleAbsentHtml = schoolDaysInMonth.map(dayInfo => {
      let totalMaleAbsent = 0;
      sortedStudents.male.forEach(student => {
        const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData.month] || {};
        if (!data[dayInfo.day]) totalMaleAbsent++;
      });
      return `<td class="text-center font-bold bg-white" style="width: 14px; font-size: 8px;">${totalMaleAbsent || ''}</td>`;
    }).join('') + Array.from({ length: emptyDaysCount }).map(() => '<td class="bg-slate-50"></td>').join('');

    // Absentees Female Total
    const totalFemaleAbsentHtml = schoolDaysInMonth.map(dayInfo => {
      let totalFemaleAbsent = 0;
      sortedStudents.female.forEach(student => {
        const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData.month] || {};
        if (!data[dayInfo.day]) totalFemaleAbsent++;
      });
      return `<td class="text-center font-bold bg-white" style="width: 14px; font-size: 8px;">${totalFemaleAbsent || ''}</td>`;
    }).join('') + Array.from({ length: emptyDaysCount }).map(() => '<td class="bg-slate-50"></td>').join('');

    // Combined Total row
    const combinedTotalHtml = schoolDaysInMonth.map(dayInfo => {
      let totalAbsent = 0;
      students.forEach(student => {
        const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData.month] || {};
        if (!data[dayInfo.day]) totalAbsent++;
      });
      return `<td class="text-center font-black bg-slate-100" style="width: 14px; font-size: 8px;">${totalAbsent || ''}</td>`;
    }).join('') + Array.from({ length: emptyDaysCount }).map(() => '<td class="bg-slate-50"></td>').join('');

    const documentContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Attendance Report (SF2) - ${section.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          
          @page {
            size: A4 landscape;
            margin: 0.75in 10mm 10mm 10mm;
          }
          
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            font-size: 8px;
            line-height: 1.25;
            background: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-card-sf2 {
            width: 277mm; /* Total landscape printable width available in A4 minus margins */
            box-sizing: border-box;
            background: white;
            display: flex;
            flex-direction: column;
            margin: 0 auto;
          }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-black { font-weight: 900; }
          .font-extrabold { font-weight: 800; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          
          .header-title {
            font-size: 12pt;
            font-weight: 900;
            text-transform: uppercase;
            margin: 0;
            text-align: center;
          }
          
          .header-subtitle {
            font-size: 7pt;
            font-style: italic;
            text-align: center;
            color: #475569;
            margin: 2px 0 10px 0;
            font-weight: 700;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px 12px;
            margin-bottom: 10px;
            text-transform: uppercase;
            font-size: 7.5pt;
            font-weight: 800;
          }
          
          .col-span-2 {
            grid-column: span 2;
          }
          
          .info-item {
            display: flex;
            align-items: flex-end;
            gap: 4px;
          }
          
          .info-label {
            white-space: nowrap;
            color: #334155;
          }
          
          .info-value {
            border-bottom: 1px solid #000;
            flex: 1;
            text-align: center;
            font-weight: 800;
            color: #000;
            padding-bottom: 0.5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            font-size: 7.5px;
            line-height: 1;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 2px;
            box-sizing: border-box;
            height: 18px;
            vertical-align: middle;
          }
          
          th {
            font-weight: 700;
            background-color: #f8fafc;
            text-transform: uppercase;
          }
          
          .gender-row-header {
            background-color: #e2e8f0;
            font-weight: 900;
            font-size: 8px;
            text-align: left;
            text-transform: uppercase;
            padding-left: 6px;
            height: 16px;
          }
          
          .present-marker {
            color: #94a3b8;
            font-weight: 700;
            font-size: 7.5px;
          }
          
          .absent-marker {
            color: #dc2626;
            font-weight: 900;
            font-size: 8px;
          }
          
          .student-name {
            text-align: left;
            font-weight: 700;
            font-size: 7pt;
            white-space: nowrap;
            padding-left: 4px;
          }
          
          .student-status-sub {
            font-size: 5px;
            font-weight: 900;
            text-transform: uppercase;
            color: #dc2626;
            margin-left: 4px;
            display: inline-block;
          }
          
          .bg-slate-50 { background-color: #f8fafc; }
          .bg-slate-100 { background-color: #f1f5f9; }
          .empty-day-cell { background-color: #f8fafc; }
          
          /* Bottom Sections */
          .bottom-layout {
            margin-top: 12px;
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 20px;
            font-size: 7.5pt;
          }
          
          .summary-table {
            width: 100%;
            border: 1px solid #000;
          }
          
          .summary-table th, .summary-table td {
            height: auto;
            padding: 2.5px 4px;
            font-size: 7.2px;
          }
          
          .summary-table th {
            font-weight: 700;
          }
          
          .certifications-container {
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            padding-top: 5px;
          }
          
          .cert-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            width: 185px;
          }
          
          .cert-signature-line {
            border-bottom: 1px solid #000;
            width: 100%;
            font-size: 9pt;
            font-weight: 900;
            text-transform: uppercase;
            padding-bottom: 1px;
            margin-top: 15px;
            margin-bottom: 2px;
          }
          
          .cert-title {
            font-size: 6.5pt;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="print-card-sf2">
          
          <!-- Header Section -->
          <h1 class="header-title">Daily Attendance Report of Learners</h1>
          <p class="header-subtitle">(This replaces Form 1, Form 2 & STS Form 4 - Absenteeism and Dropout Profile)</p>

          <!-- Info Row Block -->
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">School ID:</span>
              <span class="info-value">${section.schoolId || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Region:</span>
              <span class="info-value">${section.region || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Division:</span>
              <span class="info-value">${section.division || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">District:</span>
              <span class="info-value">${section.district || ''}</span>
            </div>
            
            <div class="info-item col-span-2">
              <span class="info-label">School Name:</span>
              <span class="info-value">${section.schoolName || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">School Year:</span>
              <span class="info-value">${section.schoolYear || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Grade Level:</span>
              <span class="info-value">${section.gradeLevel}</span>
            </div>

            <div class="info-item col-span-2">
              <span class="info-label">Adviser Name:</span>
              <span class="info-value">${section.adviserName || ''}</span>
            </div>
            <div class="info-item col-span-2">
              <span class="info-label">Report for the Month of:</span>
              <span class="info-value" style="color: #4f46e5;">${currentMonthData.month} (Term ${currentMonthData.term})</span>
            </div>
          </div>

          <!-- Main Attendance Table -->
          <table>
            <thead>
              <tr style="height: 24px;">
                <th rowspan="3" style="width: 20px; text-align: center;">No.</th>
                <th rowspan="3" style="width: 220px; text-align: left; padding-left: 6px;">LEARNER'S NAME <br><span style="font-weight: normal; font-size: 5.5px;">(Last Name, First Name, Middle Name)</span></th>
                <th colspan="${maxDays}" style="text-align: center; font-size: 7.5px; height: 12px;">
                  <span style="font-size: 6px; font-weight: normal;">(1st row for date, 2nd row for Day: M,T,W,TH,F)</span>
                </th>
                <th colspan="2" style="text-align: center; width: 60px;">Total Month</th>
                <th rowspan="3" style="width: 140px; text-align: left; padding-left: 6px;">REMARKS <br><span style="font-weight: normal; font-size: 5.5px;">(If D/O state reason. If T/I/O name of school)</span></th>
              </tr>
              <tr>
                ${datesHeaderHtml}
                <th rowspan="2" style="width: 30px; text-align: center; font-weight: 700;">ABS</th>
                <th rowspan="2" style="width: 30px; text-align: center; font-weight: 700;">TAR</th>
              </tr>
              <tr>
                ${dowHeaderHtml}
              </tr>
            </thead>
            <tbody>
              <!-- MALE SECTION -->
              <tr>
                <td colspan="${maxDays + 5}" class="gender-row-header">MALE</td>
              </tr>
              ${maleRowsHtml}
              
              <!-- Total Male Absentees -->
              <tr class="total-row">
                <td></td>
                <td class="text-right font-bold uppercase" style="padding-right: 6px; font-size: 7.5px;">Total Male</td>
                ${totalMaleAbsentHtml}
                <td class="bg-white"></td>
                <td class="bg-white"></td>
                <td></td>
              </tr>

              <!-- FEMALE SECTION -->
              <tr>
                <td colspan="${maxDays + 5}" class="gender-row-header">FEMALE</td>
              </tr>
              ${femaleRowsHtml}

              <!-- Total Female Absentees -->
              <tr class="total-row">
                <td></td>
                <td class="text-right font-bold uppercase" style="padding-right: 6px; font-size: 7.5px;">Total Female</td>
                ${totalFemaleAbsentHtml}
                <td class="bg-white"></td>
                <td class="bg-white"></td>
                <td></td>
              </tr>

              <!-- Combined Total -->
              <tr class="total-row-combined">
                <td></td>
                <td class="text-right font-extrabold uppercase" style="padding-right: 6px; font-size: 7.5px;">Combined Total</td>
                ${combinedTotalHtml}
                <td class="bg-slate-100"></td>
                <td class="bg-slate-100"></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <!-- Bottom Summary and Certification Section -->
          <div class="bottom-layout">
            <!-- Left Side: Summary table -->
            <div>
              <table class="summary-table">
                <thead>
                  <tr class="bg-white">
                    <th colspan="4" class="summary-header-month">Month: ${currentMonthData.month}</th>
                  </tr>
                  <tr class="bg-white">
                    <th style="text-align: left;">Days of Classes:</th>
                    <th colspan="3" style="text-align: center; font-size: 9px; font-weight: 900;">${schoolDaysInMonth.length}</th>
                  </tr>
                  <tr class="bg-slate-50" style="font-size: 6.5px;">
                    <th style="text-align: left; width: 160px;">Summary for the Month</th>
                    <th style="text-align: center; width: 33px;">M</th>
                    <th style="text-align: center; width: 33px;">F</th>
                    <th style="text-align: center; width: 45px;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-bold" style="font-style: italic; font-size: 7px;">* Enrolment as of 1st Friday</td>
                    <td class="text-center font-bold">${summaryData?.enrolmentJune.m}</td>
                    <td class="text-center font-bold">${summaryData?.enrolmentJune.f}</td>
                    <td class="text-center font-bold" style="font-weight: 900;">${summaryData?.enrolmentJune.t}</td>
                  </tr>
                  <tr>
                    <td class="font-bold" style="font-style: italic; font-size: 7px;">Late Enrollment during month</td>
                    <td class="text-center font-bold">${summaryData?.lateEnroll.m || ''}</td>
                    <td class="text-center font-bold">${summaryData?.lateEnroll.f || ''}</td>
                    <td class="text-center font-bold" style="font-weight: 900;">${summaryData?.lateEnroll.t || ''}</td>
                  </tr>
                  <tr>
                    <td class="font-bold" style="font-style: italic; font-size: 7px;">Registered Learner end of month</td>
                    <td class="text-center font-bold">${summaryData?.registered.m}</td>
                    <td class="text-center font-bold">${summaryData?.registered.f}</td>
                    <td class="text-center font-bold" style="font-weight: 900;">${summaryData?.registered.t}</td>
                  </tr>
                  <tr>
                    <td class="font-bold" style="font-style: italic; font-size: 7px;">Percentage of Enrolment</td>
                    <td class="text-center font-bold">${summaryData?.percEnrolment.m.toFixed(1)}%</td>
                    <td class="text-center font-bold">${summaryData?.percEnrolment.f.toFixed(1)}%</td>
                    <td class="text-center font-bold" style="font-weight: 900;">${summaryData?.percEnrolment.t.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td class="font-bold" style="font-style: italic; font-size: 7px;">Average Daily Attendance</td>
                    <td class="text-center font-bold">${summaryData?.avgAttendance.m.toFixed(1)}</td>
                    <td class="text-center font-bold">${summaryData?.avgAttendance.f.toFixed(1)}</td>
                    <td class="text-center font-bold" style="font-weight: 900;">${summaryData?.avgAttendance.t.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td class="font-bold" style="font-style: italic; font-size: 7px;">Percentage of Attendance</td>
                    <td class="text-center font-bold">${summaryData?.percAttendance.m.toFixed(1)}%</td>
                    <td class="text-center font-bold">${summaryData?.percAttendance.f.toFixed(1)}%</td>
                    <td class="text-center font-bold" style="font-weight: 900;">${summaryData?.percAttendance.t.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Right Side: Certification & Signatures -->
            <div class="certifications-container">
              <div class="cert-box">
                <p style="margin: 0; text-align: left; width: 100%; font-weight: 700;">I certify that this is a true and correct report.</p>
                <div class="cert-signature-line">${adviserName}</div>
                <div class="cert-title">(Signature of Teacher)</div>
              </div>
              <div class="cert-box">
                <p style="margin: 0; text-align: left; width: 100%; font-weight: 700;">Attested by:</p>
                <div class="cert-signature-line">${headOfSchool || 'School Head / Principal'}</div>
                <div class="cert-title">(Signature of School Head)</div>
              </div>
            </div>
          </div>

        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    win.document.write(documentContent);
    win.document.close();
  };


  useEffect(() => {
    if (userId && selectedMonthKey) {
      localStorage.setItem(`sf2_selectedMonthKey_${userId}`, selectedMonthKey);
    }
  }, [selectedMonthKey, userId]);

  const monthsList = useMemo(() => {
    if (!calendar || calendar.length === 0 || !section) return [];
    const list: { key: string; month: string; year: number; term: string }[] = [];
    calendar.filter(c => c.schoolYear === section.schoolYear).forEach(c => {
      const term = (c.term || '1').toString();
      list.push({
        key: `${c.month}_${term}`,
        month: c.month,
        year: parseInt(c.year) || new Date().getFullYear(),
        term
      });
    });
    return list.sort((a, b) => {
       const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
       return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });
  }, [calendar, section]);

  React.useEffect(() => {
    if (monthsList.length > 0 && !selectedMonthKey) {
      setSelectedMonthKey(monthsList[0].key);
    }
  }, [monthsList, selectedMonthKey]);

  const monthIndices: { [key: string]: number } = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  const currentMonthData = useMemo(() => {
    return monthsList.find(m => m.key === selectedMonthKey);
  }, [monthsList, selectedMonthKey]);

  const schoolDaysInMonth = useMemo(() => {
    if (!currentMonthData) return [];
    
    // Find calendar entry
    const calendarEntry = calendar.find(c => 
        c.month === currentMonthData.month && 
        c.schoolYear === section.schoolYear &&
        (c.term || '1').toString() === currentMonthData.term
    );
    if (!calendarEntry) return [];

    // Filter calendar by school year
    const calendarForSchoolYear = calendar.filter(c => c.schoolYear === section.schoolYear);

    // Identify the first month of the school year
    const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    const monthIndex = monthIndices[currentMonthData.month];
    const year = currentMonthData.year;
    
    const openingDate = parseInt(calendarEntry.openingDate || '1');
    const closingDate = parseInt(calendarEntry.closingDate || '31');

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const schoolDays: { day: number, dateStr: string }[] = [];

    // First, collect ALL school days for this month (regardless of term) to allow for dynamic splitting if needed
    const allPossibleSchoolDays: { day: number, dateStr: string }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthIndex, day);
        const dayOfWeek = date.getDay();
        const monthNum = (monthIndex + 1).toString().padStart(2, '0');
        const dayNum = day.toString().padStart(2, '0');
        const dateId = `${monthNum}-${dayNum}`;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isLocalHoliday = calendarEntry?.localHolidays?.includes(day);
        const isHoliday = PHILIPPINE_HOLIDAYS.includes(dateId) || isLocalHoliday;
        if (!isWeekend && !isHoliday) {
            allPossibleSchoolDays.push({ day, dateStr: dateId });
        }
    }

    // Determine if we should use manual coverage or dynamic split
    const hasManualCoverage = openingDate !== 1 || (closingDate !== 31 && closingDate !== daysInMonth);

    if (hasManualCoverage) {
        // Use manual coverage
        for (let day = 1; day <= daysInMonth; day++) {
            if (day < openingDate || day > closingDate) continue;
            const date = new Date(year, monthIndex, day);
            const dayOfWeek = date.getDay();
            const monthNum = (monthIndex + 1).toString().padStart(2, '0');
            const dayNum = day.toString().padStart(2, '0');
            const dateId = `${monthNum}-${dayNum}`;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isLocalHoliday = calendarEntry?.localHolidays?.includes(day);
            const isHoliday = PHILIPPINE_HOLIDAYS.includes(dateId) || isLocalHoliday;
            if (!isWeekend && !isHoliday) {
                schoolDays.push({ day, dateStr: dateId });
            }
        }
        return schoolDays;
    } else {
        // Use dynamic split based on the number of entries for this month
        const allEntriesForMonthForSY = calendar.filter(c => 
            c.month === currentMonthData.month && 
            c.schoolYear === section.schoolYear
        ).sort((a, b) => (parseInt(a.term) || 1) - (parseInt(b.term) || 1));

        const currentTerm = parseInt(currentMonthData.term || '1');
        let startIndex = 0;
        for (const entry of allEntriesForMonthForSY) {
            if ((parseInt(entry.term) || 1) < currentTerm) {
                startIndex += parseInt(entry.days) || 0;
            } else {
                break;
            }
        }
        const daysToTake = parseInt(calendarEntry.days) || allPossibleSchoolDays.length;
        return allPossibleSchoolDays.slice(startIndex, startIndex + daysToTake);
    }
  }, [currentMonthData, calendar]);

  const allSchoolDaysOfYear = useMemo(() => {
    if (!calendar || calendar.length === 0 || !section || monthsList.length === 0) return [];
    
    const yearDays: { dateStr: string; dateObj: Date }[] = [];
    
    monthsList.forEach(m => {
       const calendarEntry = calendar.find(c => 
          c.month === m.month && 
          c.schoolYear === section.schoolYear &&
          (c.term || '1').toString() === m.term
       );
       if (!calendarEntry) return;

       const monthIndex = monthIndices[m.month];
       const year = m.year;
       const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
       
       const openingDate = parseInt(calendarEntry.openingDate || '1');
       const closingDate = parseInt(calendarEntry.closingDate || '31');

       const monthSchoolDaysRaw: { dateStr: string; dateObj: Date, day: number }[] = [];
       for (let day = 1; day <= daysInMonth; day++) {
           const date = new Date(year, monthIndex, day);
           const dayOfWeek = date.getDay(); 
           const monthNum = (monthIndex + 1).toString().padStart(2, '0');
           const dayNum = day.toString().padStart(2, '0');
           const dateId = `${monthNum}-${dayNum}`;
           const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
           const isLocalHoliday = calendarEntry?.localHolidays?.includes(day);
           const isHoliday = PHILIPPINE_HOLIDAYS.includes(dateId) || isLocalHoliday;

           if (!isWeekend && !isHoliday) {
               monthSchoolDaysRaw.push({ 
                 dateStr: `${year}-${monthNum}-${dayNum}`,
                 dateObj: date,
                 day
               });
           }
       }

       const hasManualCoverage = openingDate !== 1 || (closingDate !== 31 && closingDate !== daysInMonth);
       
       if (hasManualCoverage) {
           const filtered = monthSchoolDaysRaw.filter(d => d.day >= openingDate && d.day <= closingDate);
           yearDays.push(...filtered);
       } else {
           const allEntriesForMonthForSY = calendar.filter(c => 
               c.month === m.month && 
               c.schoolYear === section.schoolYear
           ).sort((a, b) => (parseInt(a.term) || 1) - (parseInt(b.term) || 1));

           const currentTerm = parseInt(m.term || '1');
           let startIndex = 0;
           for (const entry of allEntriesForMonthForSY) {
               if ((parseInt(entry.term) || 1) < currentTerm) {
                   startIndex += (parseInt(entry.days) || 0);
               } else {
                   break;
               }
           }
           const daysToTake = parseInt(calendarEntry.days) || monthSchoolDaysRaw.length;
           yearDays.push(...monthSchoolDaysRaw.slice(startIndex, startIndex + daysToTake));
       }
    });
    
    return yearDays;
  }, [calendar, section, monthsList]);

  const sortedStudents = useMemo(() => {
    if (!currentMonthData) return { male: [], female: [] };

    const reportYear = currentMonthData.year;
    const reportMonthIndex = monthIndices[currentMonthData.month];

    const filtered = students.filter(s => {
      if (!s.dateOfFirstAttendance) return false;
      const parts = s.dateOfFirstAttendance.split('-');
      if (parts.length < 3) return false;
      
      const foaYear = parseInt(parts[0]);
      const foaMonth = parseInt(parts[1]) - 1;
      
      const isVisibleByFOA = foaYear < reportYear || (foaYear === reportYear && foaMonth <= reportMonthIndex);
      if (!isVisibleByFOA) return false;

      // Check Transferred Out / Dropped Out
      if (s.status === 'Dropped Out' || s.status === 'Transferred Out') {
        if (s.dropoutDate) {
          const dParts = s.dropoutDate.split('-');
          if (dParts.length === 3) {
            const dropYear = parseInt(dParts[0]);
            const dropMonth = parseInt(dParts[1]) - 1;
            // Visible only if current month is BEFORE or EQUAL to drop month
            if (reportYear > dropYear || (reportYear === dropYear && reportMonthIndex > dropMonth)) {
              return false;
            }
          }
        }
      }

      return true;
    });

    const male = filtered
      .filter(s => s.sex?.toLowerCase() === 'male')
      .sort((a, b) => a.name.localeCompare(b.name));
    const female = filtered
      .filter(s => s.sex?.toLowerCase() === 'female')
      .sort((a, b) => a.name.localeCompare(b.name));
    return { male, female };
  }, [students, currentMonthData]);

  const summaryData = useMemo(() => {
    if (!currentMonthData || !schoolDaysInMonth.length) return null;

    const maleCount = sortedStudents.male.length;
    const femaleCount = sortedStudents.female.length;
    const totalCount = maleCount + femaleCount;

    // Determine late enrollees for the current month (beyond 80% yearly cut-off)
    const isLateEnrollee = (s: Student) => {
      if (!s.dateOfFirstAttendance) return false;
      const parts = s.dateOfFirstAttendance.split('-');
      if (parts.length < 3) return false;
      const year = parseInt(parts[0]);
      const monthIndex = parseInt(parts[1]) - 1;
      const reportMonthIndex = monthIndices[currentMonthData.month];
      
      // Must join in the current report month to be counted in this row
      if (year !== currentMonthData.year || monthIndex !== reportMonthIndex) return false;

      // 80% yearly cut-off logic
      if (allSchoolDaysOfYear.length === 0) return true;
      const firstAttendIndex = allSchoolDaysOfYear.findIndex(d => d.dateStr >= s.dateOfFirstAttendance);
      if (firstAttendIndex === -1) return true;
      
      const remainingDays = allSchoolDaysOfYear.length - firstAttendIndex;
      return (remainingDays / allSchoolDaysOfYear.length) < 0.8;
    };

    const lateEnrollMale = sortedStudents.male.filter(isLateEnrollee).length;
    const lateEnrollFemale = sortedStudents.female.filter(isLateEnrollee).length;
    const lateEnrollTotal = lateEnrollMale + lateEnrollFemale;

    const registeredMale = maleCount;
    const registeredFemale = femaleCount;
    const registeredTotal = totalCount;

    // Enrolment as of 1st Friday
    const enrolmentJuneMale = registeredMale - lateEnrollMale;
    const enrolmentJuneFemale = registeredFemale - lateEnrollFemale;
    const enrolmentJuneTotal = registeredTotal - lateEnrollTotal;

    // Calculate Average Daily Attendance
    let totalPresentMale = 0;
    let totalPresentFemale = 0;

    schoolDaysInMonth.forEach(dayInfo => {
      sortedStudents.male.forEach(s => {
        const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
        if (dailyData[dayInfo.day]) totalPresentMale++;
      });
      sortedStudents.female.forEach(s => {
        const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
        if (dailyData[dayInfo.day]) totalPresentFemale++;
      });
    });

    const avgDailyMale = totalPresentMale / schoolDaysInMonth.length;
    const avgDailyFemale = totalPresentFemale / schoolDaysInMonth.length;
    const avgDailyTotal = (totalPresentMale + totalPresentFemale) / schoolDaysInMonth.length;

    // Percentages
    const percEnrolmentMale = enrolmentJuneMale > 0 ? (registeredMale / enrolmentJuneMale) * 100 : 0;
    const percEnrolmentFemale = enrolmentJuneFemale > 0 ? (registeredFemale / enrolmentJuneFemale) * 100 : 0;
    const percEnrolmentTotal = enrolmentJuneTotal > 0 ? (registeredTotal / enrolmentJuneTotal) * 100 : 0;

    const percAttendanceMale = registeredMale > 0 ? (avgDailyMale / registeredMale) * 100 : 0;
    const percAttendanceFemale = registeredFemale > 0 ? (avgDailyFemale / registeredFemale) * 100 : 0;
    const percAttendanceTotal = registeredTotal > 0 ? (avgDailyTotal / registeredTotal) * 100 : 0;

    return {
      enrolmentJune: { m: enrolmentJuneMale, f: enrolmentJuneFemale, t: enrolmentJuneTotal },
      lateEnroll: { m: lateEnrollMale, f: lateEnrollFemale, t: lateEnrollTotal },
      registered: { m: registeredMale, f: registeredFemale, t: registeredTotal },
      avgAttendance: { m: avgDailyMale, f: avgDailyFemale, t: avgDailyTotal },
      percEnrolment: { m: percEnrolmentMale, f: percEnrolmentFemale, t: percEnrolmentTotal },
      percAttendance: { m: percAttendanceMale, f: percAttendanceFemale, t: percAttendanceTotal }
    };
  }, [currentMonthData, schoolDaysInMonth, sortedStudents, selectedMonthKey, allSchoolDaysOfYear]);

  const handleExport = () => {
    if (!currentMonthData || !schoolDaysInMonth.length) return;

    // Calculate table width
    const tableWidth = 2 + schoolDaysInMonth.length + 3;

    const xlData: any[][] = [];
    const rowTypes: string[] = [];

    // Title banner
    xlData.push([`DAILY ATTENDANCE REPORT OF LEARNERS`]);
    rowTypes.push("title");

    // Subtitle form name
    xlData.push([`School Form 2 (SF2) - Daily Attendance`]);
    rowTypes.push("subtitle");

    xlData.push([]); 
    rowTypes.push("spacer");

    // Define exact metadata column index partitions for standard columns alignment
    const c1 = 0;
    const c2 = Math.max(7, Math.round(tableWidth * 0.28));
    const c3 = Math.max(13, Math.round(tableWidth * 0.53));
    const c4 = Math.max(19, Math.round(tableWidth * 0.78));

    // Header metadata row 1: School ID, Region, Division, District
    const metaRow1 = Array(tableWidth).fill("");
    metaRow1[c1] = `  School ID: ${section.schoolId || ''}`;
    metaRow1[c2] = `  Region: ${section.region || ''}`;
    metaRow1[c3] = `  Division: ${section.division || ''}`;
    metaRow1[c4] = `  District: ${section.district || ''}`;
    xlData.push(metaRow1);
    rowTypes.push("metadata");

    // Header metadata row 2: School Name, Adviser Name, School Year
    const metaRow2 = Array(tableWidth).fill("");
    metaRow2[c1] = `  School Name: ${section.schoolName || ''}`;
    metaRow2[c2] = `  Adviser Name: ${section.adviserName || adviserName || ''}`;
    metaRow2[c3] = `  School Year: ${section.schoolYear || ''}`;
    metaRow2[c4] = ``; // Blank for alignment structure
    xlData.push(metaRow2);
    rowTypes.push("metadata");

    // Header metadata row 3: Report Month, Term, Grade Level, Section
    const metaRow3 = Array(tableWidth).fill("");
    metaRow3[c1] = `  Report Month: ${currentMonthData.month}`;
    metaRow3[c2] = `  Term: ${currentMonthData.term || '1'}`;
    metaRow3[c3] = `  Grade Level: ${section.gradeLevel}`;
    metaRow3[c4] = `  Section: ${section.name}`;
    xlData.push(metaRow3);
    rowTypes.push("metadata");

    xlData.push([]); // spacer
    rowTypes.push("spacer");

    const R_headers = xlData.length;

    // Column Headers 1 (Dates)
    const headerRow1 = ["No.", "Learner's Name"];
    schoolDaysInMonth.forEach(d => headerRow1.push(d.day.toString()));
    headerRow1.push("Absent", "Tardy", "Remarks");
    xlData.push(headerRow1);
    rowTypes.push("headers");

    // Column Headers 2 (Days of the week)
    const headerRow2 = ["", ""];
    schoolDaysInMonth.forEach(dayInfo => {
      const date = new Date(currentMonthData.year, monthIndices[currentMonthData.month], dayInfo.day);
      const dow = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'][date.getDay()];
      headerRow2.push(dow);
    });
    headerRow2.push("", "", "");
    xlData.push(headerRow2);
    rowTypes.push("headersSub");

    // MALE SECTION
    xlData.push(["MALE"]);
    const R_maleHeader = xlData.length - 1;
    rowTypes.push("maleHeader");

    sortedStudents.male.forEach((s, i) => {
      const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
      const row = [i + 1, formatStudentName(s)];
      let presentCount = 0;
      schoolDaysInMonth.forEach(dayInfo => {
        const isPresent = !!dailyData[dayInfo.day];
        row.push(isPresent ? "." : "X");
        if (isPresent) presentCount++;
      });
      const absentCount = Math.max(0, schoolDaysInMonth.length - presentCount);
      row.push(absentCount > 0 ? absentCount : 0, "", "");
      xlData.push(row);
      rowTypes.push("studentRow");
    });

    // Total Male row
    const totalMaleRow: any[] = ["", "TOTAL MALE"];
    let totalMaleMonthlyAbsent = 0;
    schoolDaysInMonth.forEach(dayInfo => {
      let dailyAbsentCount = 0;
      sortedStudents.male.forEach(s => {
        const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
        if (!dailyData[dayInfo.day]) {
          dailyAbsentCount++;
        }
      });
      totalMaleMonthlyAbsent += dailyAbsentCount;
      totalMaleRow.push(dailyAbsentCount > 0 ? dailyAbsentCount : 0);
    });
    totalMaleRow.push(totalMaleMonthlyAbsent, "", "");
    xlData.push(totalMaleRow);
    rowTypes.push("totalRow");

    // Separator space
    xlData.push([]);
    rowTypes.push("spacer");

    // FEMALE SECTION
    xlData.push(["FEMALE"]);
    const R_femaleHeader = xlData.length - 1;
    rowTypes.push("femaleHeader");

    sortedStudents.female.forEach((s, i) => {
      const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
      const row = [i + 1, formatStudentName(s)];
      let presentCount = 0;
      schoolDaysInMonth.forEach(dayInfo => {
        const isPresent = !!dailyData[dayInfo.day];
        row.push(isPresent ? "." : "X");
        if (isPresent) presentCount++;
      });
      const absentCount = Math.max(0, schoolDaysInMonth.length - presentCount);
      row.push(absentCount > 0 ? absentCount : 0, "", "");
      xlData.push(row);
      rowTypes.push("studentRow");
    });

    // Total Female row
    const totalFemaleRow: any[] = ["", "TOTAL FEMALE"];
    let totalFemaleMonthlyAbsent = 0;
    schoolDaysInMonth.forEach(dayInfo => {
      let dailyAbsentCount = 0;
      sortedStudents.female.forEach(s => {
        const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
        if (!dailyData[dayInfo.day]) {
          dailyAbsentCount++;
        }
      });
      totalFemaleMonthlyAbsent += dailyAbsentCount;
      totalFemaleRow.push(dailyAbsentCount > 0 ? dailyAbsentCount : 0);
    });
    totalFemaleRow.push(totalFemaleMonthlyAbsent, "", "");
    xlData.push(totalFemaleRow);
    rowTypes.push("totalRow");

    // Combined Total row
    const totalCombinedRow: any[] = ["", "COMBINED TOTAL"];
    let totalCombinedMonthlyAbsent = 0;
    schoolDaysInMonth.forEach(dayInfo => {
      let dailyAbsentCount = 0;
      students.forEach(s => {
        const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
        if (!dailyData[dayInfo.day]) {
          dailyAbsentCount++;
        }
      });
      totalCombinedMonthlyAbsent += dailyAbsentCount;
      totalCombinedRow.push(dailyAbsentCount > 0 ? dailyAbsentCount : 0);
    });
    totalCombinedRow.push(totalCombinedMonthlyAbsent, "", "");
    xlData.push(totalCombinedRow);
    rowTypes.push("combinedTotalRow");

    // Summary block
    let R_summaryTitle = -1;
    let R_summaryHeaders = -1;
    if (summaryData) {
      xlData.push([]);
      rowTypes.push("spacer");

      xlData.push(["Summary for the Month"]);
      R_summaryTitle = xlData.length - 1;
      rowTypes.push("summaryTitle");

      xlData.push(["Category", "Male", "Female", "Total"]);
      R_summaryHeaders = xlData.length - 1;
      rowTypes.push("summaryHeaders");

      const summaryRows = [
        ["Enrolment as of (1st Friday of June)", summaryData.enrolmentJune.m, summaryData.enrolmentJune.f, summaryData.enrolmentJune.t],
        ["Late Enrollment during the month (beyond cut-off)", summaryData.lateEnroll.m, summaryData.lateEnroll.f, summaryData.lateEnroll.t],
        ["Registered Learner as of end of month", summaryData.registered.m, summaryData.registered.f, summaryData.registered.t],
        ["Percentage of Enrolment", `${summaryData.percEnrolment.m.toFixed(2)}%`, `${summaryData.percEnrolment.f.toFixed(2)}%`, `${summaryData.percEnrolment.t.toFixed(2)}%`],
        ["Average Daily Attendance", summaryData.avgAttendance.m.toFixed(2), summaryData.avgAttendance.f.toFixed(2), summaryData.avgAttendance.t.toFixed(2)],
        ["Percentage of Attendance", `${summaryData.percAttendance.m.toFixed(2)}%`, `${summaryData.percAttendance.f.toFixed(2)}%`, `${summaryData.percAttendance.t.toFixed(2)}%`]
      ];

      summaryRows.forEach(row => {
        xlData.push(row);
        rowTypes.push("summaryRow");
      });
    }

    // Certification Signature Cards
    xlData.push([]);
    rowTypes.push("spacer");

    xlData.push(["", "I certify that this is a true and correct report.", "", "", "", "", "Attested by:", "", "", "", ""]);
    const R_certTitle = xlData.length - 1;
    rowTypes.push("certTitle");

    xlData.push([]);
    rowTypes.push("spacer");

    xlData.push(["", adviserName, "", "", "", "", headOfSchool || "School Head / Principal", "", "", "", ""]);
    const R_certNames = xlData.length - 1;
    rowTypes.push("certNames");

    xlData.push(["", "(Signature of Adviser / Teacher)", "", "", "", "", "(Signature of School Head)", "", "", "", ""]);
    const R_certLabels = xlData.length - 1;
    rowTypes.push("certLabels");

    const worksheet = XLSX.utils.aoa_to_sheet(xlData);

    // Apply merges dynamically
    const mergesByCode: any[] = [
        // Title Block merges
        { s: { r: 0, c: 0 }, e: { r: 0, c: tableWidth - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: tableWidth - 1 } },
        
        // Metadata Row 1 Merges (Row 3)
        { s: { r: 3, c: c1 }, e: { r: 3, c: c2 - 1 } },
        { s: { r: 3, c: c2 }, e: { r: 3, c: c3 - 1 } },
        { s: { r: 3, c: c3 }, e: { r: 3, c: c4 - 1 } },
        { s: { r: 3, c: c4 }, e: { r: 3, c: tableWidth - 1 } },
        
        // Metadata Row 2 Merges (Row 4)
        { s: { r: 4, c: c1 }, e: { r: 4, c: c2 - 1 } },
        { s: { r: 4, c: c2 }, e: { r: 4, c: c3 - 1 } },
        { s: { r: 4, c: c3 }, e: { r: 4, c: c4 - 1 } },
        { s: { r: 4, c: c4 }, e: { r: 4, c: tableWidth - 1 } },

        // Metadata Row 3 Merges (Row 5)
        { s: { r: 5, c: c1 }, e: { r: 5, c: c2 - 1 } },
        { s: { r: 5, c: c2 }, e: { r: 5, c: c3 - 1 } },
        { s: { r: 5, c: c3 }, e: { r: 5, c: c4 - 1 } },
        { s: { r: 5, c: c4 }, e: { r: 5, c: tableWidth - 1 } },

        // Table Header vertical merges across Dates + Days-of-week rows
        { s: { r: R_headers, c: 0 }, e: { r: R_headers + 1, c: 0 } }, // No
        { s: { r: R_headers, c: 1 }, e: { r: R_headers + 1, c: 1 } }, // Name
        { s: { r: R_headers, c: tableWidth - 3 }, e: { r: R_headers + 1, c: tableWidth - 3 } }, // Absent
        { s: { r: R_headers, c: tableWidth - 2 }, e: { r: R_headers + 1, c: tableWidth - 2 } }, // Tardy
        { s: { r: R_headers, c: tableWidth - 1 }, e: { r: R_headers + 1, c: tableWidth - 1 } }, // Remarks

        // Male / Female dividers
        { s: { r: R_maleHeader, c: 0 }, e: { r: R_maleHeader, c: tableWidth - 1 } },
        { s: { r: R_femaleHeader, c: 0 }, e: { r: R_femaleHeader, c: tableWidth - 1 } },
    ];

    if (summaryData && R_summaryTitle !== -1) {
      mergesByCode.push({ s: { r: R_summaryTitle, c: 0 }, e: { r: R_summaryTitle, c: 3 } });
    }

    // Cert Block merges
    mergesByCode.push({ s: { r: R_certTitle, c: 1 }, e: { r: R_certTitle, c: 4 } });
    mergesByCode.push({ s: { r: R_certTitle, c: 6 }, e: { r: R_certTitle, c: 9 } });

    mergesByCode.push({ s: { r: R_certNames, c: 1 }, e: { r: R_certNames, c: 4 } });
    mergesByCode.push({ s: { r: R_certNames, c: 6 }, e: { r: R_certNames, c: 9 } });

    mergesByCode.push({ s: { r: R_certLabels, c: 1 }, e: { r: R_certLabels, c: 4 } });
    mergesByCode.push({ s: { r: R_certLabels, c: 6 }, e: { r: R_certLabels, c: 9 } });

    worksheet['!merges'] = mergesByCode;

    // Apply styles
    const range = XLSX.utils.decode_range(worksheet['!ref']!);
    
    // Define styles
    const cellBaseStyle = {
      font: { name: "Arial", sz: 10 },
      border: { 
        top: { style: "thin", color: { rgb: "D1D5DB" } }, 
        bottom: { style: "thin", color: { rgb: "D1D5DB" } }, 
        left: { style: "thin", color: { rgb: "D1D5DB" } }, 
        right: { style: "thin", color: { rgb: "D1D5DB" } } 
      },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleTitle = {
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } }, // Slate 900
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleSubtitle = {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "2563EB" } },
      fill: { fgColor: { rgb: "EFF6FF" } }, // Sky Blue Accent
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleMetaCell = {
      font: { name: "Arial", sz: 9, bold: true, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "F8FAFC" } },
      border: { 
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const styleMainHeader = {
      ...cellBaseStyle,
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } }, // Navy Blue
      border: { 
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "3B82F6" } },
        right: { style: "thin", color: { rgb: "3B82F6" } }
      },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleMainHeaderName = {
      ...styleMainHeader,
      alignment: { horizontal: "left", vertical: "center" }
    };

    const styleMainSubHeader = {
      ...cellBaseStyle,
      font: { name: "Arial", sz: 8.5, bold: true, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "F1F5F9" } }, // Light Gray Slate
      border: { 
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "94A3B8" } },
        right: { style: "thin", color: { rgb: "94A3B8" } }
      },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleSexMaleHeader = {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "1E40AF" } }, // Deep Blue 800
      fill: { fgColor: { rgb: "EFF6FF" } }, // Soft Blue 50
      border: { 
        top: { style: "medium", color: { rgb: "1E40AF" } },
        bottom: { style: "medium", color: { rgb: "1E40AF" } },
        left: { style: "thin", color: { rgb: "BFDBFE" } },
        right: { style: "thin", color: { rgb: "BFDBFE" } }
      },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const styleSexFemaleHeader = {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "9D174D" } }, // Pink 800
      fill: { fgColor: { rgb: "FDF2F8" } }, // Soft Rose 50
      border: { 
        top: { style: "medium", color: { rgb: "9D174D" } },
        bottom: { style: "medium", color: { rgb: "9D174D" } },
        left: { style: "thin", color: { rgb: "FBCFE8" } },
        right: { style: "thin", color: { rgb: "FBCFE8" } }
      },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const styleNoCell = {
      ...cellBaseStyle,
      font: { name: "Arial", sz: 8.5, bold: true, color: { rgb: "475569" } }
    };

    const styleNameCell = {
      ...cellBaseStyle,
      font: { name: "Arial", sz: 9, bold: true, color: { rgb: "0F172A" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const styleTotalRow = {
      font: { name: "Arial", sz: 9, bold: true, color: { rgb: "374151" } },
      fill: { fgColor: { rgb: "F9FAFB" } },
      border: { 
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleCombinedTotalRow = {
      font: { name: "Arial", sz: 9, bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "E5E7EB" } }, // Grey-200
      border: { 
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "double", color: { rgb: "000000" } }, // Double accounting underline
        left: { style: "thin", color: { rgb: "94A3B8" } },
        right: { style: "thin", color: { rgb: "94A3B8" } }
      },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleSummaryTitle = {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "475569" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const styleSummaryHeader = {
      font: { name: "Arial", sz: 9, bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      border: { 
        top: { style: "thin", color: { rgb: "CBD5E1" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
        left: { style: "thin", color: { rgb: "CBD5E1" } },
        right: { style: "thin", color: { rgb: "CBD5E1" } }
      },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleSummaryCell = {
      font: { name: "Arial", sz: 9 },
      border: { 
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleCertTitle = {
      font: { name: "Arial", sz: 9.5, italic: true, bold: true, color: { rgb: "334155" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleCertName = {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "0F172A" } },
      border: { bottom: { style: "thin", color: { rgb: "000000" } } }, // Underline signature line
      alignment: { horizontal: "center", vertical: "center" }
    };

    const styleCertLabel = {
      font: { name: "Arial", sz: 8.5, color: { rgb: "475569" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    for (let R = range.s.r; R <= range.e.r; ++R) {
        const rowType = rowTypes[R];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
            if (!worksheet[cellAddress]) {
                worksheet[cellAddress] = { t: 's', v: '' }; // Ensure cell exists
            }

            const cell = worksheet[cellAddress];

            if (rowType === "title") {
              cell.s = styleTitle;
            } else if (rowType === "subtitle") {
              cell.s = styleSubtitle;
            } else if (rowType === "metadata") {
              cell.s = styleMetaCell;
            } else if (rowType === "headers") {
              cell.s = (C === 1) ? styleMainHeaderName : styleMainHeader;
            } else if (rowType === "headersSub") {
              cell.s = styleMainSubHeader;
            } else if (rowType === "maleHeader") {
              cell.s = styleSexMaleHeader;
            } else if (rowType === "femaleHeader") {
              cell.s = styleSexFemaleHeader;
            } else if (rowType === "studentRow") {
              // Standard student grid
              if (C === 0) {
                cell.s = styleNoCell;
              } else if (C === 1) {
                cell.s = styleNameCell;
              } else if (C >= 2 && C < tableWidth - 3) {
                // Presence/Absence marker
                if (cell.v === "X") {
                  cell.s = {
                    ...cellBaseStyle,
                    font: { name: "Arial", sz: 9, bold: true, color: { rgb: "DC2626" } }, // Bright Red
                    fill: { fgColor: { rgb: "FEE2E2" } } // Soft Red Fill
                  };
                } else if (cell.v === ".") {
                  cell.s = {
                    ...cellBaseStyle,
                    font: { name: "Arial", sz: 8.5, color: { rgb: "94A3B8" } } // Slate Gray dot
                  };
                } else {
                  cell.s = cellBaseStyle;
                }
              } else if (C === tableWidth - 3) {
                // Absent Column
                const numVal = Number(cell.v);
                if (numVal > 0) {
                  cell.s = {
                    ...cellBaseStyle,
                    font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "991B1B" } }, // Dark Red
                    fill: { fgColor: { rgb: "FEE2E2" } } // Highlight red cell
                  };
                } else {
                  cell.s = {
                    ...cellBaseStyle,
                    font: { name: "Arial", sz: 9, color: { rgb: "CBD5E1" } }
                  };
                }
              } else if (C === tableWidth - 2) {
                // Tardy Column
                cell.s = cellBaseStyle;
              } else if (C === tableWidth - 1) {
                // Remarks Column
                cell.s = {
                  ...cellBaseStyle,
                  alignment: { horizontal: "left", vertical: "center" },
                  font: { name: "Arial", sz: 8.5, italic: true }
                };
              } else {
                cell.s = cellBaseStyle;
              }

              // Add subtle zebra striping on student rows
              if (R % 2 === 0 && cell.s === cellBaseStyle) {
                cell.s = { ...cellBaseStyle, fill: { fgColor: { rgb: "FAFAFA" } } };
              }
            } else if (rowType === "totalRow") {
              cell.s = styleTotalRow;
              if (C === 1) {
                cell.s = { ...styleTotalRow, alignment: { horizontal: "right", vertical: "center" } };
              }
            } else if (rowType === "combinedTotalRow") {
              cell.s = styleCombinedTotalRow;
              if (C === 1) {
                cell.s = { ...styleCombinedTotalRow, alignment: { horizontal: "right", vertical: "center" } };
              }
            } else if (rowType === "summaryTitle") {
              cell.s = styleSummaryTitle;
            } else if (rowType === "summaryHeaders") {
              cell.s = styleSummaryHeader;
              if (C === 0) {
                cell.s = { ...styleSummaryHeader, alignment: { horizontal: "left", vertical: "center" } };
              }
            } else if (rowType === "summaryRow") {
              cell.s = styleSummaryCell;
              if (C === 0) {
                cell.s = { 
                  ...styleSummaryCell, 
                  font: { name: "Arial", sz: 9, bold: true, color: { rgb: "1E293B" } }, 
                  alignment: { horizontal: "left", vertical: "center" } 
                };
              } else {
                cell.s = { ...styleSummaryCell, font: { name: "Arial", sz: 9.5, bold: true } };
              }
            } else if (rowType === "certTitle") {
              cell.s = styleCertTitle;
            } else if (rowType === "certNames") {
              if (cell.v !== "") {
                cell.s = styleCertName;
              } else {
                cell.s = { border: {} };
              }
            } else if (rowType === "certLabels") {
              cell.s = styleCertLabel;
            } else {
              cell.s = { border: {} }; // Clean borderless
            }
        }
    }

    const colWidths = [
      { wch: 6 }, // No.
      { wch: 32 }, // Names
      ...Array(tableWidth - 5).fill({ wch: 4.5 }), // Attendance Days
      { wch: 8 }, // Absent
      { wch: 8 }, // Tardy
      { wch: 22 }, // Remarks
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, `SF2_${section.name}_${currentMonthData.month}.xlsx`);
  };

  const renderStudentRowModal = (student: Student, index: number) => {
    const dailyData = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData!.month] || {};
    let presentCount = 0;
    
    // We only count actual marked presence in the defined school days
    schoolDaysInMonth.forEach(dayInfo => {
        if (dailyData[dayInfo.day]) {
            presentCount++;
        }
    });

    const totalDays = schoolDaysInMonth.length;
    let absentCount = totalDays - presentCount;
    if (absentCount < 0) absentCount = 0;

    return (
      <tr key={`modal-row-${student.id}`} className="text-[9px] h-[22px] leading-tight transition-none">
        <td className="border border-black p-0.5 text-center font-bold h-[22px] leading-none">{index + 1}</td>
        <td className="border border-black px-1.5 py-0.5 font-bold text-[7.5pt] whitespace-nowrap leading-none h-[22px]">
          <div className="flex flex-col">
            <span>{formatStudentName(student)}</span>
            {(student.status === 'Dropped Out' || student.status === 'Transferred Out') && (
              <span className="text-[5.5px] uppercase font-black text-red-600">({student.status === 'Dropped Out' ? 'Dropped' : 'Transferred'})</span>
            )}
          </div>
        </td>
        {schoolDaysInMonth.map(dayInfo => {
           const isPresent = !!dailyData[dayInfo.day];
           return (
             <td key={`m-att-${student.id}-${dayInfo.dateStr}`} className="border border-black p-0 text-center min-w-[15px] h-[22px] align-middle">
               <div className="flex items-center justify-center h-full w-full">
                 {!isPresent ? <span className="font-bold text-red-600 leading-none text-[8.5px]">X</span> : <span className="text-slate-300 leading-none text-[8px]">.</span>}
               </div>
             </td>
           );
        })}
        {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
           <td key={`m-empty-${student.id}-${i}`} className="border border-black p-0 h-[22px] bg-slate-50" />
        ))}
        <td className="border border-black p-0.5 text-center font-bold bg-white leading-none h-[22px] text-[8.5px]">{absentCount > 0 ? absentCount : ''}</td>
        <td className="border border-black p-0.5 text-center bg-white h-[22px]" />
        <td className="border border-black px-1 py-0.5 truncate max-w-[160px] text-[7.5px] h-[22px] leading-none font-semibold">
          {student.status === 'Dropped Out' && (() => {
            const dParts = student.dropoutDate?.split('-');
            if (dParts?.length === 3) {
              const dropYear = parseInt(dParts[0]);
              const dropMonth = parseInt(dParts[1]) - 1;
              if (currentMonthData!.year === dropYear && monthIndices[currentMonthData!.month] === dropMonth) {
                return <span className="text-red-700">D/O: {new Date(student.dropoutDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>;
              }
            }
            return null;
          })()}
          {student.status === 'Transferred Out' && (() => {
            const dParts = student.dropoutDate?.split('-');
            if (dParts?.length === 3) {
              const dropYear = parseInt(dParts[0]);
              const dropMonth = parseInt(dParts[1]) - 1;
              if (currentMonthData!.year === dropYear && monthIndices[currentMonthData!.month] === dropMonth) {
                return <span className="text-blue-700">T/O: {new Date(student.dropoutDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>;
              }
            }
            return null;
          })()}
          {student.isTransferredIn && (() => {
            const foaParts = student.dateOfFirstAttendance?.split('-');
            if (foaParts?.length === 3) {
              const foaYear = parseInt(foaParts[0]);
              const foaMonth = parseInt(foaParts[1]) - 1;
              if (currentMonthData!.year === foaYear && monthIndices[currentMonthData!.month] === foaMonth) {
                return <span className="text-emerald-700">T/I: {new Date(student.dateOfFirstAttendance!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>;
              }
            }
            return null;
          })()}
        </td>
      </tr>
    );
  };

  const renderStudentRow = (student: Student, index: number) => {
    const dailyData = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData!.month] || {};
    let presentCount = 0;
    
    // We only count actual marked presence in the defined school days
    schoolDaysInMonth.forEach(dayInfo => {
        if (dailyData[dayInfo.day]) {
            presentCount++;
        }
    });

    const totalDays = schoolDaysInMonth.length;
    let absentCount = totalDays - presentCount;
    if (absentCount < 0) absentCount = 0;

    return (
      <tr key={student.id} className="text-[10px] sm:text-xs h-[30px]">
        <td className="border border-black p-1 text-center font-bold h-[30px] leading-none">{index + 1}</td>
        <td className="border border-black p-1 font-bold text-[7pt] whitespace-nowrap leading-none h-[30px]">
          <div className="flex flex-col">
            <span>{formatStudentName(student)}</span>
            {(student.status === 'Dropped Out' || student.status === 'Transferred Out') && (
              <span className="text-[6px] uppercase font-black text-red-600">({student.status === 'Dropped Out' ? 'Dropped' : 'Transferred'})</span>
            )}
          </div>
        </td>
        {schoolDaysInMonth.map(dayInfo => {
           const isPresent = !!dailyData[dayInfo.day];
           return (
             <td key={dayInfo.dateStr} className="border border-black p-0 text-center min-w-[1.2rem] h-[30px] align-middle">
               <div className="flex items-center justify-center h-full w-full">
                 {!isPresent ? <span className="font-bold text-red-600 leading-none">X</span> : <span className="text-slate-300 leading-none">.</span>}
               </div>
             </td>
           );
        })}
        {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
           <td key={`empty-${i}`} className="border border-black p-0 h-[30px] bg-slate-50" />
        ))}
        <td className="border border-black p-1 text-center font-bold bg-white leading-none h-[30px]">{absentCount > 0 ? absentCount : ''}</td>
        <td className="border border-black p-1 text-center bg-white h-[30px]" />
        <td className="border border-black p-1 truncate max-w-[150px] text-[8px] h-[30px] leading-tight font-medium">
          {student.status === 'Dropped Out' && (() => {
            const dParts = student.dropoutDate?.split('-');
            if (dParts?.length === 3) {
              const dropYear = parseInt(dParts[0]);
              const dropMonth = parseInt(dParts[1]) - 1;
              if (currentMonthData.year === dropYear && monthIndices[currentMonthData.month] === dropMonth) {
                return <span className="text-red-700">DROPPED: {new Date(student.dropoutDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{student.dropoutReason ? ` - ${student.dropoutReason}` : ''}</span>;
              }
            }
            return null;
          })()}
          {student.status === 'Transferred Out' && (() => {
            const dParts = student.dropoutDate?.split('-');
            if (dParts?.length === 3) {
              const dropYear = parseInt(dParts[0]);
              const dropMonth = parseInt(dParts[1]) - 1;
              if (currentMonthData.year === dropYear && monthIndices[currentMonthData.month] === dropMonth) {
                return <span className="text-blue-700">T/O: {new Date(student.dropoutDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{student.dropoutReason ? ` - ${student.dropoutReason}` : ''}</span>;
              }
            }
            return null;
          })()}
          {student.isTransferredIn && (() => {
            const foaParts = student.dateOfFirstAttendance?.split('-');
            if (foaParts?.length === 3) {
              const foaYear = parseInt(foaParts[0]);
              const foaMonth = parseInt(foaParts[1]) - 1;
              if (currentMonthData.year === foaYear && monthIndices[currentMonthData.month] === foaMonth) {
                return <span className="text-emerald-700">T/I: {new Date(student.dateOfFirstAttendance!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>;
              }
            }
            return null;
          })()}
        </td>
      </tr>
    );
  };

  if (!section) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col gap-0">
      {/* Standardized Header */}
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-5">
           <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 border border-indigo-500">
              <Calendar size={24} />
           </div>
           <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">SF2 Attendance Report</h2>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Daily Attendance Report of Learners (Form 2)</p>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-6 h-12 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-all active:scale-95"
          >
            <Printer size={16} />
            View & Print Form
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 h-12 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:scale-105 transition-all active:scale-95"
          >
            <Download size={16} />
            Excel Export
          </button>
        </div>
      </div>

      {/* Selectors Area */}
      <div className="p-6 border-b border-slate-100 flex flex-col gap-6 print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch gap-4 flex-wrap">
          {Array.from(new Set(monthsList.map(m => m.term))).sort().map(term => (
            <div key={term} className="flex flex-col gap-2 p-3 border border-slate-200 rounded-2xl bg-slate-50/50 flex-1 min-w-[200px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Term {term}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                {monthsList.filter(m => m.term === term).map(m => {
                  const calendarEntry = calendar.find(c => c.month === m.month && c.schoolYear === section.schoolYear && (c.term || '1').toString() === m.term);
                  const schoolDaysCount = calendarEntry?.days || 0;
                  const isSelected = selectedMonthKey === m.key;
                  
                  return (
                    <button 
                      key={m.key} 
                      onClick={() => setSelectedMonthKey(m.key)}
                      className={`group relative flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600 ring-offset-2' 
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-indigo-700'}`}>
                        {m.month}
                      </span>
                      <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        Days: {schoolDaysCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!currentMonthData ? (
        <div className="p-12 text-center">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-slate-300" />
           </div>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Please select a month to view report</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto text-black print:overflow-visible p-8 print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page { size: landscape; margin: 0.75in 5mm 5mm 5mm; }
                .sf2-report-container { width: 100% !important; border: none !important; padding: 0 !important; }
                table { border-collapse: collapse !important; width: 100% !important; }
                th, td { border: 1px solid black !important; }
                .no-print { display: none !important; }
                body { background: white !important; }
              }
            `}} />
            <div ref={reportRef} className="sf2-report-container min-w-[1100px] p-6 bg-white border border-slate-100 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0 print:min-w-0">
               {/* Header Section */}
               <div className="text-center mb-6">
                 <h1 className="font-black text-lg md:text-xl uppercase">Daily Attendance Report of Learners</h1>
                 <p className="text-[10px] md:text-xs tracking-tight italic">(This replaces Form 1, Form 2 & STS Form 4 - Absenteeism and Dropout Profile)</p>
               </div>

               <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold mb-4 uppercase">
                 <div className="flex gap-2 min-w-[200px]"><span>School ID:</span> <span className="border-b border-black flex-1 text-center">{section.schoolId || ''}</span></div>
                 <div className="flex gap-2 min-w-[100px]"><span>Region:</span> <span className="border-b border-black flex-1 text-center">{section.region || ''}</span></div>
                 <div className="flex gap-2 min-w-[150px]"><span>Division:</span> <span className="border-b border-black flex-1 text-center">{section.division || ''}</span></div>
                 <div className="flex gap-2 min-w-[150px]"><span>District:</span> <span className="border-b border-black flex-1 text-center">{section.district || ''}</span></div>
                 <div className="w-full flex gap-2"></div>
                 <div className="flex gap-2 flex-grow min-w-[300px]"><span>School Name:</span> <span className="border-b border-black flex-1 text-center">{section.schoolName || ''}</span></div>
                 <div className="flex gap-2 min-w-[200px]"><span>Adviser Name:</span> <span className="border-b border-black flex-1 text-center">{section.adviserName || ''}</span></div>
                 <div className="flex gap-2 min-w-[120px]"><span>School Year:</span> <span className="border-b border-black flex-1 text-center">{section.schoolYear || ''}</span></div>
                 <div className="flex gap-2 min-w-[200px]"><span>Report for the Month of:</span> <span className="border-b border-black flex-1 text-center text-indigo-700">{currentMonthData.month} (Term {currentMonthData.term})</span></div>
                 <div className="w-full flex gap-2"></div>
                 <div className="flex gap-2 min-w-[200px]"><span>Grade Level:</span> <span className="border-b border-black flex-1 text-center">{section.gradeLevel}</span></div>
                 <div className="flex gap-2 min-w-[200px]"><span>Section:</span> <span className="border-b border-black flex-1 text-center">{section.name}</span></div>
               </div>

               {/* Table Section */}
               <table className="w-full border-collapse border border-black text-[10px]">
                 <thead>
                   <tr className="h-10">
                     <th rowSpan={3} className="border border-black p-1 w-6">No.</th>
                     <th rowSpan={3} className="border border-black p-1 w-[250px] leading-tight">LEARNER'S NAME <br/><span className="font-normal text-[8px]">(Last Name, First Name, Middle Name)</span></th>
                     <th colSpan={Math.max(25, schoolDaysInMonth.length)} className="border border-black p-1 text-center h-4">
                        <div className="text-[9px] leading-none">(1st row for date, 2nd row for Day: M,T,W,TH,F)</div>
                     </th>
                     <th colSpan={2} className="border border-black p-1 text-center w-[100px] h-4">Total for the Month</th>
                     <th rowSpan={3} className="border border-black p-1 w-[150px] leading-tight">REMARKS<br/><span className="font-normal text-[8px]">(If DROPPED OUT, state reason, please refer to legend number. If TRANSFERRED IN/OUT, write the name of School.)</span></th>
                   </tr>
                   <tr className="h-6">
                     {/* Row for Dates */}
                     {schoolDaysInMonth.map(dayInfo => (
                        <th key={`date-${dayInfo.dateStr}`} className="border border-black p-0 min-w-[1.2rem] text-center font-bold text-[9px] h-6 align-middle">
                          {dayInfo.day}
                        </th>
                     ))}
                     {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                        <th key={`date-empty-${i}`} className="border border-black p-0 bg-slate-100 h-6"></th>
                     ))}
                     <th rowSpan={2} className="border border-black p-1 h-6">ABSENT</th>
                     <th rowSpan={2} className="border border-black p-1 h-6">TARDY</th>
                   </tr>
                   <tr className="h-6">
                     {/* Row for Days of the Week */}
                     {schoolDaysInMonth.map(dayInfo => {
                        const date = new Date(currentMonthData.year, monthIndices[currentMonthData.month], dayInfo.day);
                        const dow = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'][date.getDay()];
                        return (
                          <th key={`dow-${dayInfo.dateStr}`} className="border border-black p-0 min-w-[1.2rem] text-center text-[8px] font-normal h-6 align-middle">
                             {dow}
                          </th>
                        );
                     })}
                     {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                        <th key={`dow-empty-${i}`} className="border border-black p-0 bg-slate-100 h-6"></th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                    <tr className="bg-slate-200">
                      <td colSpan={Math.max(25, schoolDaysInMonth.length) + 5} className="border border-black p-1 font-bold">MALE</td>
                    </tr>
                    {sortedStudents.male.map((student, i) => renderStudentRow(student, i))}
                    <tr>
                      <td className="border border-black p-1"></td>
                      <td className="border border-black p-1 font-bold text-right p-r-2 uppercase">Total Male</td>
                      {schoolDaysInMonth.map(dayInfo => {
                         let totalMaleAbsent = 0;
                         sortedStudents.male.forEach(student => {
                             const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData!.month] || {};
                             if (!data[dayInfo.day]) totalMaleAbsent++;
                         });
                         return <td key={`male-tot-${dayInfo.day}`} className="border border-black p-1 text-center font-bold bg-slate-50 text-[9px]">{totalMaleAbsent || ''}</td>;
                      })}
                      {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                         <td key={`male-tot-empty-${i}`} className="border border-black p-1 bg-slate-100"></td>
                      ))}
                      <td className="border border-black p-1 bg-slate-50"></td><td className="border border-black p-1 bg-slate-50"></td><td className="border border-black p-1"></td>
                    </tr>

                    <tr className="bg-slate-200">
                      <td colSpan={Math.max(25, schoolDaysInMonth.length) + 5} className="border border-black p-1 font-bold">FEMALE</td>
                    </tr>
                    {sortedStudents.female.map((student, i) => renderStudentRow(student, i))}
                    <tr>
                      <td className="border border-black p-1"></td>
                      <td className="border border-black p-1 font-bold text-right p-r-2 uppercase">Total Female</td>
                      {schoolDaysInMonth.map(dayInfo => {
                         let totalFemaleAbsent = 0;
                         sortedStudents.female.forEach(student => {
                             const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData!.month] || {};
                             if (!data[dayInfo.day]) totalFemaleAbsent++;
                         });
                         return <td key={`female-tot-${dayInfo.day}`} className="border border-black p-1 text-center font-bold bg-slate-50 text-[9px]">{totalFemaleAbsent || ''}</td>;
                      })}
                      {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                         <td key={`female-tot-empty-${i}`} className="border border-black p-1 bg-slate-100"></td>
                      ))}
                      <td className="border border-black p-1 bg-slate-50"></td><td className="border border-black p-1 bg-slate-50"></td><td className="border border-black p-1"></td>
                    </tr>

                    <tr>
                      <td className="border border-black p-1"></td>
                      <td className="border border-black p-1 font-bold text-right p-r-2 uppercase">Combined Total</td>
                      {schoolDaysInMonth.map(dayInfo => {
                         let totalAbsent = 0;
                         students.forEach(student => {
                             const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData!.month] || {};
                             if (!data[dayInfo.day]) totalAbsent++;
                         });
                         return <td key={`total-${dayInfo.day}`} className="border border-black p-1 text-center font-black bg-slate-200 text-[9px]">{totalAbsent || ''}</td>;
                      })}
                      {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                         <td key={`total-empty-${i}`} className="border border-black p-1 bg-slate-100"></td>
                      ))}
                      <td className="border border-black p-1 bg-slate-200"></td><td className="border border-black p-1 bg-slate-200"></td><td className="border border-black p-1"></td>
                    </tr>
                 </tbody>
               </table>
               
               {/* Summary Table at Bottom */}
               <div className="mt-8 mb-4 grid grid-cols-[300px_1fr] gap-8 text-[10px]">
                 <div>
                   <table className="w-full border-collapse border border-black mb-4">
                     <thead>
                       <tr><th colSpan={4} className="border border-black p-1 text-left uppercase text-indigo-700">Month: {currentMonthData.month} (Term {currentMonthData.term})</th></tr>
                       <tr>
                         <th className="border border-black p-1">No. of Days of Classes:</th>
                         <th colSpan={2} className="border border-black p-1 text-center text-lg">{schoolDaysInMonth.length}</th>
                       </tr>
                       <tr>
                         <th className="border border-black p-1 text-center">Summary for the Month</th>
                         <th className="border border-black p-1 text-center">M</th>
                         <th className="border border-black p-1 text-center">F</th>
                         <th className="border border-black p-1 text-center">TOTAL</th>
                       </tr>
                     </thead>
                     <tbody>
                       <tr>
                         <td className="border border-black p-1 font-bold italic text-xs">* Enrolment as of (1st Friday of June)</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.enrolmentJune.m}</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.enrolmentJune.f}</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.enrolmentJune.t}</td>
                       </tr>
                       <tr>
                         <td className="border border-black p-1 font-bold italic text-xs">Late Enrollment during the month (beyond cut-off)</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.lateEnroll.m || ''}</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.lateEnroll.f || ''}</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.lateEnroll.t || ''}</td>
                       </tr>
                       <tr>
                         <td className="border border-black p-1 font-bold italic text-xs">Registered Learner as of end of the month</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.registered.m}</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.registered.f}</td>
                         <td className="border border-black p-1 text-center font-bold text-lg">{summaryData?.registered.t}</td>
                       </tr>
                       <tr>
                         <td className="border border-black p-1 font-bold italic text-xs">Percentage of Enrolment as of end of the month</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.percEnrolment.m.toFixed(2)}%</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.percEnrolment.f.toFixed(2)}%</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.percEnrolment.t.toFixed(2)}%</td>
                       </tr>
                       <tr>
                         <td className="border border-black p-1 font-bold italic text-xs">Average Daily Attendance</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.avgAttendance.m.toFixed(2)}</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.avgAttendance.f.toFixed(2)}</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.avgAttendance.t.toFixed(2)}</td>
                       </tr>
                       <tr>
                         <td className="border border-black p-1 font-bold italic text-xs">Percentage of Attendance for the month</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.percAttendance.m.toFixed(2)}%</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.percAttendance.f.toFixed(2)}%</td>
                         <td className="border border-black p-1 text-center font-bold">{summaryData?.percAttendance.t.toFixed(2)}%</td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
                 
                 <div className="flex flex-col gap-6 font-bold text-xs mt-8">
                     <div className="mb-4">
                        <p className="mb-6">I certify that this is a true and correct report.</p>
                        <div className="w-[300px] text-center">
                          <p className="text-[12px] font-bold uppercase text-slate-900 border-b border-black w-full pb-0.5">{adviserName}</p>
                          <p className="text-[10px] mt-1 uppercase text-slate-600">(Signature of Teacher over Printed Name)</p>
                        </div>
                     </div>
                     <div className="mt-2">
                        <p className="mb-6">Attested by:</p>
                        <div className="w-[300px] text-center">
                           <p className="text-[12px] font-bold uppercase text-slate-900 border-b border-black w-full pb-0.5">{headOfSchool || 'School Head/Principal Name'}</p>
                           <p className="text-[10px] mt-1 uppercase text-slate-600">(Signature of School Head over Printed Name)</p>
                        </div>
                     </div>
                 </div>
               </div>

            </div>
        </div>
      )}

      {/* Full-Screen Landscape Print Modal matching Learner's Progress Report Card */}
      <AnimatePresence>
        {isPrintModalOpen && currentMonthData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-50 overflow-y-auto flex flex-col font-sans text-slate-800 print-modal-container font-sans"
          >
            {/* STICKY TOP BAR */}
            <div className="sticky top-0 z-[210] bg-slate-900 text-white shadow-xl px-8 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 print:hidden shrink-0">
              <div className="flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400">School Form 2 (SF2) - Attendance Report</h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  Section: <span className="text-white uppercase font-black">{section.name}</span> • Month: <span className="text-white uppercase font-black">{currentMonthData.month} {currentMonthData.year}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold text-[10px] uppercase tracking-wide shadow flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <X size={12} />
                  Close Page
                </button>
              </div>
            </div>

            {/* PRINT WRAPPER */}
            <div className="flex-1 flex flex-col items-center justify-start py-8 overflow-y-auto bg-slate-100 gap-10 print:bg-white print:p-0 print:overflow-visible print:block w-full">
              <motion.div
                initial={{ scale: 0.98, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="flex flex-col gap-8 print:gap-0 print:block print:transform-none select-none shadow-xl border border-slate-200/50 rounded-lg p-2 bg-white/50 print:border-0 print:p-0 print:bg-transparent"
              >
                {/* PAGE 1 */}
                <div className="bg-white w-[297mm] p-[0.35in] shadow-2xl rounded text-black border border-black flex flex-col overflow-hidden print:shadow-none print:m-0 border-collapse print-card-sf2">
                  
                  {/* Header Section */}
                  <div className="text-center mb-4">
                    <h1 className="font-black text-[12pt] uppercase leading-none">Daily Attendance Report of Learners</h1>
                    <p className="text-[7pt] tracking-tight italic mt-1 font-bold text-slate-600 leading-none">(This replaces Form 1, Form 2 & STS Form 4 - Absenteeism and Dropout Profile)</p>
                  </div>

                  {/* Info Row block */}
                  <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-[7.5pt] font-black mb-3 uppercase leading-none">
                    <div className="flex gap-1 items-end"><span>School ID:</span> <span className="border-b border-black flex-1 text-center font-bold pb-0.5">{section.schoolId || ''}</span></div>
                    <div className="flex gap-1 items-end"><span>Region:</span> <span className="border-b border-black flex-1 text-center font-bold pb-0.5">{section.region || ''}</span></div>
                    <div className="flex gap-1 items-end"><span>Division:</span> <span className="border-b border-black flex-1 text-center font-bold pb-0.5">{section.division || ''}</span></div>
                    <div className="flex gap-1 items-end"><span>District:</span> <span className="border-b border-black flex-1 text-center font-bold pb-0.5">{section.district || ''}</span></div>
                    
                    <div className="flex gap-1 items-end col-span-2"><span>School Name:</span> <span className="border-b border-black flex-1 text-center font-bold pb-0.5">{section.schoolName || ''}</span></div>
                    <div className="flex gap-1 items-end"><span>School Year:</span> <span className="border-b border-black flex-1 text-center font-bold pb-0.5">{section.schoolYear || ''}</span></div>
                    <div className="flex gap-1 items-end"><span>Grade Level:</span> <span className="border-b border-black flex-1 text-center font-bold pb-0.5">{section.gradeLevel}</span></div>

                    <div className="flex gap-1 items-end col-span-2"><span>Adviser Name:</span> <span className="border-b border-black flex-1 text-center font-bold pb-0.5">{section.adviserName || ''}</span></div>
                    <div className="flex gap-1 items-end col-span-2"><span>Report for the Month of:</span> <span className="border-b border-black flex-1 text-center text-indigo-700 font-bold pb-0.5">{currentMonthData.month} (Term {currentMonthData.term})</span></div>
                  </div>

                  {/* Table Section */}
                  <div className="w-full">
                    <table className="w-full border-collapse border border-black text-[7.5px] transition-none leading-none font-sans">
                      <thead>
                        <tr className="h-8">
                          <th rowSpan={3} className="border border-black p-0.5 w-[20px] text-center font-bold">No.</th>
                          <th rowSpan={3} className="border border-black p-0.5 w-[220px] leading-tight text-left pl-1 font-bold">LEARNER'S NAME <br/><span className="font-normal text-[6px] uppercase">(Last Name, First Name, Middle Name)</span></th>
                          <th colSpan={Math.max(25, schoolDaysInMonth.length)} className="border border-black p-0.5 text-center font-bold text-[7.5px] h-3">
                             <div className="text-[6.5px] leading-none">(1st row for date, 2nd row for Day: M,T,W,TH,F)</div>
                          </th>
                          <th colSpan={2} className="border border-black p-0.5 text-center w-[60px] h-3 font-bold">Total Month</th>
                          <th rowSpan={3} className="border border-black p-0.5 w-[140px] leading-tight text-left pl-1 font-bold">REMARKS<br/><span className="font-normal text-[6px] uppercase">(If D/O state reason. If T/I/O name of school)</span></th>
                        </tr>
                        <tr className="h-5">
                          {/* Dates */}
                          {schoolDaysInMonth.map(dayInfo => (
                             <th key={`m-date-${dayInfo.dateStr}`} className="border border-black p-0 min-w-[14px] text-center font-bold text-[8px] h-5 align-middle">
                               {dayInfo.day}
                             </th>
                          ))}
                          {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                             <th key={`m-date-empty-${i}`} className="border border-black p-0 bg-slate-50 h-5"></th>
                          ))}
                          <th rowSpan={2} className="border border-black p-0.5 h-5 text-center font-bold">ABS</th>
                          <th rowSpan={2} className="border border-black p-0.5 h-5 text-center font-bold">TAR</th>
                        </tr>
                        <tr className="h-5">
                          {/* Days of week */}
                          {schoolDaysInMonth.map(dayInfo => {
                             const date = new Date(currentMonthData.year, monthIndices[currentMonthData.month], dayInfo.day);
                             const dow = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'][date.getDay()];
                             return (
                               <th key={`m-dow-${dayInfo.dateStr}`} className="border border-black p-0 min-w-[14px] text-center text-[7px] font-normal h-5 align-middle">
                                  {dow}
                               </th>
                             );
                          })}
                          {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                             <th key={`m-dow-empty-${i}`} className="border border-black p-0 bg-slate-50 h-5"></th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-slate-200 h-4">
                          <td colSpan={Math.max(25, schoolDaysInMonth.length) + 5} className="border border-black px-1 py-0.5 font-bold uppercase text-[8px] h-4 leading-none align-middle">MALE</td>
                        </tr>
                        {sortedStudents.male.map((student, i) => renderStudentRowModal(student, i))}
                        <tr className="h-4 font-bold col-span-full">
                          <td className="border border-black p-0.5 h-4"></td>
                          <td className="border border-black px-1 py-0.5 text-right font-bold uppercase text-[7.5px] h-4 leading-none align-middle">Total Male</td>
                          {schoolDaysInMonth.map(dayInfo => {
                             let totalMaleAbsent = 0;
                             sortedStudents.male.forEach(student => {
                                 const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData.month] || {};
                                 if (!data[dayInfo.day]) totalMaleAbsent++;
                             });
                             return <td key={`m-male-tot-${dayInfo.day}`} className="border border-black p-0.5 text-center font-bold bg-white text-[8px] h-4 align-middle">{totalMaleAbsent || ''}</td>;
                          })}
                          {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                             <td key={`m-male-tot-empty-${i}`} className="border border-black p-0.5 bg-slate-50 h-4 font-normal"></td>
                          ))}
                          <td className="border border-black p-0.5 bg-white h-4"></td>
                          <td className="border border-black p-0.5 bg-white h-4"></td>
                          <td className="border border-black p-0.5 h-4"></td>
                        </tr>

                        <tr className="bg-slate-200 h-4">
                          <td colSpan={Math.max(25, schoolDaysInMonth.length) + 5} className="border border-black px-1 py-0.5 font-bold uppercase text-[8px] h-4 leading-none align-middle">FEMALE</td>
                        </tr>
                        {sortedStudents.female.map((student, i) => renderStudentRowModal(student, i))}
                        <tr className="h-4 font-bold col-span-full">
                          <td className="border border-black p-0.5 h-4"></td>
                          <td className="border border-black px-1 py-0.5 text-right font-bold uppercase text-[7.5px] h-4 leading-none align-middle">Total Female</td>
                          {schoolDaysInMonth.map(dayInfo => {
                             let totalFemaleAbsent = 0;
                             sortedStudents.female.forEach(student => {
                                 const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData.month] || {};
                                 if (!data[dayInfo.day]) totalFemaleAbsent++;
                             });
                             return <td key={`m-female-tot-${dayInfo.day}`} className="border border-black p-0.5 text-center font-bold bg-white text-[8px] h-4 align-middle">{totalFemaleAbsent || ''}</td>;
                          })}
                          {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                             <td key={`m-female-tot-empty-${i}`} className="border border-black p-0.5 bg-slate-50 h-4 font-normal"></td>
                          ))}
                          <td className="border border-black p-0.5 bg-white h-4"></td>
                          <td className="border border-black p-0.5 bg-white h-4"></td>
                          <td className="border border-black p-0.5 h-4"></td>
                        </tr>

                        <tr className="h-4 font-extrabold col-span-full">
                          <td className="border border-black p-0.5 h-4"></td>
                          <td className="border border-black px-1 py-0.5 text-right font-bold uppercase text-[7.5px] h-4 leading-none align-middle">Combined Total</td>
                          {schoolDaysInMonth.map(dayInfo => {
                             let totalAbsent = 0;
                             students.forEach(student => {
                                 const data = student.dailyAttendance?.[selectedMonthKey] || student.dailyAttendance?.[currentMonthData!.month] || {};
                                 if (!data[dayInfo.day]) totalAbsent++;
                             });
                             return <td key={`m-total-${dayInfo.day}`} className="border border-black p-0.5 text-center font-black bg-slate-100 text-[8px] h-4 align-middle">{totalAbsent || ''}</td>;
                          })}
                          {Array.from({ length: Math.max(0, 25 - schoolDaysInMonth.length) }).map((_, i) => (
                             <td key={`m-total-empty-${i}`} className="border border-black p-0.5 bg-slate-50 h-4 font-normal"></td>
                          ))}
                          <td className="border border-black p-0.5 bg-slate-100 h-4"></td>
                          <td className="border border-black p-0.5 bg-slate-100 h-4"></td>
                          <td className="border border-black p-0.5 h-4"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Table at Bottom */}
                  <div className="mt-4 grid grid-cols-[280px_1fr] gap-6 text-[7.5pt] leading-tight font-sans">
                    <div>
                      <table className="w-full border-collapse border border-black">
                        <thead>
                          <tr className="bg-white"><th colSpan={4} className="border border-black px-1 py-0.5 text-left uppercase text-indigo-700 font-extrabold text-[7.5pt] leading-none">Month: {currentMonthData.month}</th></tr>
                          <tr className="bg-white">
                            <th className="border border-black px-1 py-0.5 text-left font-bold text-[7.5pt]">Days of Classes:</th>
                            <th colSpan={3} className="border border-black p-0.5 text-center text-[9pt] font-black">{schoolDaysInMonth.length}</th>
                          </tr>
                          <tr className="bg-slate-50 text-[7px]">
                            <th className="border border-black px-1 py-0.5 text-left font-bold w-[160px]">Summary for the Month</th>
                            <th className="border border-black p-0.5 text-center font-bold">M</th>
                            <th className="border border-black p-0.5 text-center font-bold">F</th>
                            <th className="border border-black p-0.5 text-center font-bold">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="text-[7.5px]">
                            <td className="border border-black px-1 py-0.5 font-bold italic text-[7px]">* Enrolment as of 1st Friday</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.enrolmentJune.m}</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.enrolmentJune.f}</td>
                            <td className="border border-black p-0.5 text-center font-black">{summaryData?.enrolmentJune.t}</td>
                          </tr>
                          <tr className="text-[7.5px]">
                            <td className="border border-black px-1 py-0.5 font-bold italic text-[7px]">Late Enrollment during month</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.lateEnroll.m || ''}</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.lateEnroll.f || ''}</td>
                            <td className="border border-black p-0.5 text-center font-black">{summaryData?.lateEnroll.t || ''}</td>
                          </tr>
                          <tr className="text-[7.5px]">
                            <td className="border border-black px-1 py-0.5 font-bold italic text-[7px]">Registered Learner end of month</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.registered.m}</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.registered.f}</td>
                            <td className="border border-black p-0.5 text-center font-black">{summaryData?.registered.t}</td>
                          </tr>
                          <tr className="text-[7.5px]">
                            <td className="border border-black px-1 py-0.5 font-bold italic text-[7px]">Percentage of Enrolment</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.percEnrolment.m.toFixed(1)}%</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.percEnrolment.f.toFixed(1)}%</td>
                            <td className="border border-black p-0.5 text-center font-black">{summaryData?.percEnrolment.t.toFixed(1)}%</td>
                          </tr>
                          <tr className="text-[7.5px]">
                            <td className="border border-black px-1 py-0.5 font-bold italic text-[7px]">Average Daily Attendance</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.avgAttendance.m.toFixed(1)}</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.avgAttendance.f.toFixed(1)}</td>
                            <td className="border border-black p-0.5 text-center font-black">{summaryData?.avgAttendance.t.toFixed(1)}</td>
                          </tr>
                          <tr className="text-[7.5px]">
                            <td className="border border-black px-1 py-0.5 font-bold italic text-[7px]">Percentage of Attendance</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.percAttendance.m.toFixed(1)}%</td>
                            <td className="border border-black p-0.5 text-center font-bold">{summaryData?.percAttendance.f.toFixed(1)}%</td>
                            <td className="border border-black p-0.5 text-center font-black">{summaryData?.percAttendance.t.toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-row justify-around gap-4 font-bold text-[7.5pt] mt-1 pr-6">
                      <div className="flex flex-col justify-end">
                        <p className="mb-3 font-bold text-[7.5pt]">I certify that this is a true and correct report.</p>
                        <div className="w-[185px] text-center">
                          <p className="text-[9pt] font-black uppercase text-slate-900 border-b border-black w-full pb-0.5">{adviserName}</p>
                          <p className="text-[6.5pt] mt-0.5 uppercase text-slate-500 font-bold leading-none">(Signature of Teacher)</p>
                        </div>
                      </div>
                      <div className="flex flex-col justify-end">
                        <p className="mb-3 font-bold text-[7.5pt]">Attested by:</p>
                        <div className="w-[185px] text-center">
                          <p className="text-[9pt] font-black uppercase text-slate-900 border-b border-black w-full pb-0.5">{headOfSchool || 'School Head/Principal Name'}</p>
                          <p className="text-[6.5pt] mt-0.5 uppercase text-slate-500 font-bold leading-none">(Signature of School Head)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
