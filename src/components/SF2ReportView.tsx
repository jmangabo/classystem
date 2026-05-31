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
    
    // Helper to pad rows
    const padRow = (row: any[]) => {
       while (row.length < tableWidth) row.push("");
       return row;
    };

    // Header Info with padding
    xlData.push([`Daily Attendance Report of Learners`]);
    xlData.push([]); 

    // Header Info: Create a more structured layout
    // We will use 12 columns as a base for this reporting structure
    xlData.push([
      `School ID: ${section.schoolId || ''}`, "", "",
      `Region: ${section.region || ''}`, "", "",
      `Division: ${section.division || ''}`, "", "",
      `District: ${section.district || ''}`
    ]);
    xlData.push([
      `School Name: ${section.schoolName || ''}`, "", "", "", "", "",
      `Adviser Name: ${section.adviserName || ''}`, "", "",
      `School Year: ${section.schoolYear || ''}` 
    ]);
    xlData.push([
      `Report Month: ${currentMonthData.month}`, "", "",
      `Term: ${currentMonthData.term}`, "",
      `Grade: ${section.gradeLevel}`, "",
      `Section: ${section.name}`
    ]);
    xlData.push([]); // spacer

    // Column Headers
    const headers = ["No.", "Learner's Name"];
    schoolDaysInMonth.forEach(d => headers.push(d.day.toString()));
    headers.push("Absent", "Tardy", "Remarks");
    xlData.push(headers);
    
    const headerRowIndex = xlData.length - 1;

    // Male Students
    xlData.push(["MALE"]);
    sortedStudents.male.forEach((s, i) => {
      const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
      const row = [i + 1, s.name];
      let presentCount = 0;
      schoolDaysInMonth.forEach(dayInfo => {
        const isPresent = !!dailyData[dayInfo.day];
        row.push(isPresent ? "." : "X");
        if (isPresent) presentCount++;
      });
      const absentCount = Math.max(0, schoolDaysInMonth.length - presentCount);
      row.push(absentCount > 0 ? absentCount : 0, "", "");
      xlData.push(row);
    });

    // Female Students
    xlData.push(["FEMALE"]);
    sortedStudents.female.forEach((s, i) => {
      const dailyData = s.dailyAttendance?.[selectedMonthKey] || s.dailyAttendance?.[currentMonthData!.month] || {};
      const row = [i + 1, s.name];
      let presentCount = 0;
      schoolDaysInMonth.forEach(dayInfo => {
        const isPresent = !!dailyData[dayInfo.day];
        row.push(isPresent ? "." : "X");
        if (isPresent) presentCount++;
      });
      const absentCount = Math.max(0, schoolDaysInMonth.length - presentCount);
      row.push(absentCount > 0 ? absentCount : 0, "", "");
      xlData.push(row);
    });

    // Add summary data if it exists
    if (summaryData) {
      xlData.push([]);
      xlData.push(["Summary for the Month"]);
      xlData.push(["Category", "Male", "Female", "Total"]);
      xlData.push(["Enrolment as of (1st Friday of June)", summaryData.enrolmentJune.m, summaryData.enrolmentJune.f, summaryData.enrolmentJune.t]);
      xlData.push(["Late Enrollment during the month (beyond cut-off)", summaryData.lateEnroll.m, summaryData.lateEnroll.f, summaryData.lateEnroll.t]);
      xlData.push(["Registered Learner as of end of month", summaryData.registered.m, summaryData.registered.f, summaryData.registered.t]);
      xlData.push(["Percentage of Enrolment", `${summaryData.percEnrolment.m.toFixed(2)}%`, `${summaryData.percEnrolment.f.toFixed(2)}%`, `${summaryData.percEnrolment.t.toFixed(2)}%`]);
      xlData.push(["Average Daily Attendance", summaryData.avgAttendance.m.toFixed(2), summaryData.avgAttendance.f.toFixed(2), summaryData.avgAttendance.t.toFixed(2)]);
      xlData.push(["Percentage of Attendance", `${summaryData.percAttendance.m.toFixed(2)}%`, `${summaryData.percAttendance.f.toFixed(2)}%`, `${summaryData.percAttendance.t.toFixed(2)}%`]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(xlData);

    // Calculate dynamic rows for summary
    const summaryHeaderRow = xlData.length - 8;

    // Apply merges
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: tableWidth - 1 } }, // Title
        
        // Header Info
        { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, // School ID
        { s: { r: 2, c: 3 }, e: { r: 2, c: 5 } }, // Region
        { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } }, // Division
        { s: { r: 2, c: 9 }, e: { r: 2, c: 11 } }, // District
        
        { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // School Name
        { s: { r: 3, c: 6 }, e: { r: 3, c: 8 } }, // Adviser
        { s: { r: 3, c: 9 }, e: { r: 3, c: 11 } }, // School Year
        
        { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, // Report Month
        { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } }, // Term
        { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } }, // Grade
        { s: { r: 4, c: 7 }, e: { r: 4, c: 11 } }, // Section
        
        // Sex Header
        { s: { r: headerRowIndex + 1, c: 0 }, e: { r: headerRowIndex + 1, c: tableWidth - 1 } },
        { s: { r: headerRowIndex + sortedStudents.male.length + 2, c: 0 }, e: { r: headerRowIndex + sortedStudents.male.length + 2, c: tableWidth - 1 } },
        
        // Summary
        { s: { r: summaryHeaderRow, c: 0 }, e: { r: summaryHeaderRow, c: 3 } }
    ];

    // Apply styles
    const range = XLSX.utils.decode_range(worksheet['!ref']!);
    
    // Define styles
    const cellBaseStyle = {
      font: { name: "Arial", sz: 10 },
      border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };
    
    const titleStyle = {
        font: { name: "Arial", sz: 16, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "E2E8F0" } } // Slate-200
    };

    const headerStyle = {
      ...cellBaseStyle,
      font: { name: "Arial", sz: 11, bold: true },
      fill: { fgColor: { rgb: "D3D3D3" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const rowHeaderStyle = {
      ...cellBaseStyle,
      font: { name: "Arial", sz: 11, bold: true },
      fill: { fgColor: { rgb: "E5E7EB" } },
      alignment: { horizontal: "left" }
    };

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
            if (!worksheet[cellAddress]) {
                worksheet[cellAddress] = { t: 's', v: '' }; // Ensure cell exists
            }

            // Apply styles based on Row
            if (R === 0) { // Title
               worksheet[cellAddress].s = titleStyle;
            } else if (R === 6) { // Table Column Headers
                worksheet[cellAddress].s = headerStyle;
            } else if (xlData[R] && (xlData[R][0] === "MALE" || xlData[R][0] === "FEMALE")) { // Sex Headers
                worksheet[cellAddress].s = rowHeaderStyle;
            } else { // Standard Data
                worksheet[cellAddress].s = cellBaseStyle;
                // Add Zebra striping for table data
                if (R > 6 && R % 2 === 0 && xlData[R] && xlData[R].some((v: any) => v !== "")) {
                   worksheet[cellAddress].s = { ...cellBaseStyle, fill: { fgColor: { rgb: "F9FAFB" } } };
                }
            }
        }
    }

    const colWidths = [
      { wch: 5 }, // No.
      { wch: 30 }, // Names
      ...Array(tableWidth - 5).fill({ wch: 4 }), // Attendance Days
      { wch: 6 }, // Total
      { wch: 6 }, // Absent
      { wch: 6 }, // Remarks
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
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-6 h-12 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-all active:scale-95"
          >
            <FileText size={16} />
            PDF Report
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
                @page { size: landscape; margin: 5mm; }
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
    </div>
  );
};
