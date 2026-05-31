import React, { useState, useMemo, useEffect } from 'react';
import { db, handleFirestoreError, safeGetDocs as getDocs } from '../firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { Section, Student, School, TermNumber } from '../types';
import { FileText, Download, Loader2, Calendar, RefreshCw, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

interface SF4ReportViewProps {
  schoolId: string;
  calendar: any[];
  globalSettings?: any;
}

interface MonthlySummary {
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  maleEnrolment: number;
  femaleEnrolment: number;
  // Attendance
  maleAvgAttendance: number;
  femaleAvgAttendance: number;
  maleAttendancePercentage: number;
  femaleAttendancePercentage: number;
  // NLPA (Dropped Out) 
  maleDroppedPrev: number;
  femaleDroppedPrev: number;
  maleDroppedMonth: number;
  femaleDroppedMonth: number;
  // Transferred Out
  maleTransOutPrev: number;
  femaleTransOutPrev: number;
  maleTransOutMonth: number;
  femaleTransOutMonth: number;
  // Transferred In
  maleTransInPrev: number;
  femaleTransInPrev: number;
  maleTransInMonth: number;
  femaleTransInMonth: number;
  // Late Enrollees
  maleLatePrev: number;
  femaleLatePrev: number;
  maleLateMonth: number;
  femaleLateMonth: number;
}

export const SF4ReportView: React.FC<SF4ReportViewProps> = ({ schoolId, calendar, globalSettings }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectionStudents, setSectionStudents] = useState<{[sectionId: string]: Student[]}>({});
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'dropped' | 'transOut' | 'transIn' | 'late' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch school info
        const schoolQ = query(collection(db, 'schools'), where('schoolId', '==', schoolId));
        const schoolSnap = await getDocs(schoolQ);
        if (!schoolSnap.empty) {
          setSchool(schoolSnap.docs[0].data() as School);
        }

        // Fetch sections
        const sectionsQ = query(collection(db, 'sections'), where('schoolId', '==', schoolId));
        const sectionsSnap = await getDocs(sectionsQ);
        const fetchedSections = sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
        setSections(fetchedSections);

        // Fetch students for each section
        const studentsRef: {[sectionId: string]: Student[]} = {};
        for (const section of fetchedSections) {
          const studentsQ = query(collection(db, `sections/${section.id}/students`));
          const studentsSnap = await getDocs(studentsQ);
          studentsRef[section.id] = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        }
        setSectionStudents(studentsRef);
      } catch (error) {
        handleFirestoreError(error, 'list', 'sf4_data');
      } finally {
        setLoading(false);
      }
    };

    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  const monthsList = useMemo(() => {
    if (!calendar || calendar.length === 0) return [];

    let filteredCalendar = calendar;
    if (globalSettings?.activeSchoolYear) {
      filteredCalendar = calendar.filter(c => c.schoolYear === globalSettings.activeSchoolYear);
    }

    const list: { key: string; month: string; year: number; term: string; schoolYear: string }[] = [];
    filteredCalendar.forEach(c => {
      const term = (c.term || '1').toString();
      list.push({
        key: `${c.month}_${term}_${c.schoolYear}`,
        month: c.month,
        year: parseInt(c.year) || new Date().getFullYear(),
        term,
        schoolYear: c.schoolYear
      });
    });
    
    const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    return list.sort((a, b) => {
       if (a.schoolYear !== b.schoolYear) return a.schoolYear.localeCompare(b.schoolYear);
       return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });
  }, [calendar, globalSettings]);

  useEffect(() => {
    if (monthsList.length > 0) {
      if (!selectedMonthKey || !monthsList.some(m => m.key === selectedMonthKey)) {
        // Try to find current month and year
        const now = new Date();
        const currentMonthIndex = now.getMonth();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthName = monthNames[currentMonthIndex];
        const currentYear = now.getFullYear();

        const matchedMonth = monthsList.find(m => m.month === currentMonthName && m.year === currentYear);
        if (matchedMonth) {
          setSelectedMonthKey(matchedMonth.key);
        } else {
          setSelectedMonthKey(monthsList[0].key);
        }
      }
    } else {
      setSelectedMonthKey('');
    }
  }, [monthsList, selectedMonthKey]);

  const currentMonthData = useMemo(() => {
    return monthsList.find(m => m.key === selectedMonthKey);
  }, [monthsList, selectedMonthKey]);

  const monthIndices: { [key: string]: number } = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  const reportData = useMemo(() => {
    if (!currentMonthData) return [];

    const monthKey = `${currentMonthData.month}_${currentMonthData.term}`;
    const reportMonthIndex = monthIndices[currentMonthData.month];
    const reportYear = currentMonthData.year;

    const summaries: MonthlySummary[] = sections
      .filter(sec => sec.schoolYear === currentMonthData.schoolYear)
      .map(section => {
      const students = sectionStudents[section.id] || [];
      
      // Filter students who were enrolled in or before this month
      // And were NOT yet dropped/transferred in PREVIOUS months
      const activeOrLaterStudents = students.filter(s => {
        // If dateOfFirstAttendance is missing, assume they started at the beginning of the school year
        let joinedBeforeOrIn = true;
        if (s.dateOfFirstAttendance) {
          const parts = s.dateOfFirstAttendance.split('-');
          if (parts.length >= 2) {
            const foaYear = parseInt(parts[0]);
            const foaMonth = parseInt(parts[1]);
            const foaMonthIndex = foaMonth - 1;
            joinedBeforeOrIn = foaYear < reportYear || (foaYear === reportYear && foaMonthIndex <= reportMonthIndex);
          }
        }
        
        if (!joinedBeforeOrIn) return false;

        // If dropped/transferred, check WHEN
        const isCurrentlyInactive = s.status === 'Dropped Out' || s.status === 'Transferred Out';
        if (isCurrentlyInactive) {
           const statusDate = s.dropoutDate || s.updatedAt;
           if (statusDate) {
              const datePart = statusDate.split('T')[0];
              const parts = datePart.split('-');
              if (parts.length >= 2) {
                const statusYear = parseInt(parts[0]);
                const statusMonth = parseInt(parts[1]);
                const statusMonthIndex = statusMonth - 1;
                // If they dropped in PREVIOUS months, they are not counted as enrollment for THIS month
                const droppedBefore = statusYear < reportYear || (statusYear === reportYear && statusMonthIndex < reportMonthIndex);
                if (droppedBefore) return false;
              }
           }
        }
        return true;
      });

      const maleS = activeOrLaterStudents.filter(s => {
        const sx = s.sex?.toLowerCase();
        return sx === 'male' || sx === 'm';
      });
      const femaleS = activeOrLaterStudents.filter(s => {
        const sx = s.sex?.toLowerCase();
        return sx === 'female' || sx === 'f';
      });

      // Movement for THIS month vs PREVIOUS months
      const getStatusCount = (gender: 'Male' | 'Female', status: string, period: 'prev' | 'month') => {
        return students.filter(s => {
          const sSex = s.sex?.toLowerCase();
          const targetSex = gender.toLowerCase();
          const sexMatch = (targetSex === 'male' && (sSex === 'male' || sSex === 'm')) ||
                           (targetSex === 'female' && (sSex === 'female' || sSex === 'f'));
          
          if (!sexMatch || s.status !== status) return false;
          
          const statusDate = s.dropoutDate || s.updatedAt;
          if (!statusDate) return false;
          
          const datePart = statusDate.split('T')[0];
          const parts = datePart.split('-');
          if (parts.length < 2) return false;
          
          const sYear = parseInt(parts[0]);
          const sMonth = parseInt(parts[1]);
          const sMonthIndex = sMonth - 1;

          if (period === 'month') {
            return sYear === reportYear && sMonthIndex === reportMonthIndex;
          } else {
            // Previous months in same school year
            return sYear < reportYear || (sYear === reportYear && sMonthIndex < reportMonthIndex);
          }
        }).length;
      };

      const transInCount = (gender: 'Male' | 'Female', period: 'prev' | 'month') => {
        return students.filter(s => {
          const sSex = s.sex?.toLowerCase();
          const targetSex = gender.toLowerCase();
          if (sSex !== targetSex) return false;
          
          if (s.isTransferredIn !== true) return false;
          
          if (!s.dateOfFirstAttendance) return false;
          
          const parts = s.dateOfFirstAttendance.split('-');
          if (parts.length < 2) return false;
          const foaYear = parseInt(parts[0]);
          const foaMonthIndex = parseInt(parts[1]) - 1;
          
          const joinedThisMonth = foaYear === reportYear && foaMonthIndex === reportMonthIndex;
          const joinedPrev = foaYear < reportYear || (foaYear === reportYear && foaMonthIndex < reportMonthIndex);
          
          if (period === 'month') {
             return joinedThisMonth;
          } else {
             return joinedPrev;
          }
        }).length;
      };

      const lateEnrolleeCount = (gender: 'Male' | 'Female', period: 'prev' | 'month') => {
        return students.filter(s => {
          const sSex = s.sex?.toLowerCase();
          const targetSex = gender.toLowerCase();
          if (sSex !== targetSex) return false;
          
          if (s.isTransferredIn === true) return false;
          
          if (!s.dateOfFirstAttendance) return false;
          
          const parts = s.dateOfFirstAttendance.split('-');
          if (parts.length < 2) return false;
          const foaYear = parseInt(parts[0]);
          const foaMonthIndex = parseInt(parts[1]) - 1;
          
          const joinedThisMonth = foaYear === reportYear && foaMonthIndex === reportMonthIndex;
          const joinedPrev = foaYear < reportYear || (foaYear === reportYear && foaMonthIndex < reportMonthIndex);
          
          const syMonths = monthsList.filter(m => m.schoolYear === currentMonthData.schoolYear);
          const firstMonth = syMonths.length > 0 ? syMonths[0].month : 'June';
          const firstMonthData = monthsList.find(m => m.month === firstMonth && m.schoolYear === currentMonthData.schoolYear);

          if (period === 'month') {
             return joinedThisMonth && currentMonthData.month !== firstMonth;
          } else {
             if (!firstMonthData) return false;
             return joinedPrev && (foaYear > firstMonthData.year || (foaYear === firstMonthData.year && foaMonthIndex > monthIndices[firstMonth]));
          }
        }).length;
      };

      // Attendance Calculation
      const calendarEntry = calendar.find(c => 
        c.month === currentMonthData.month && 
        c.schoolYear === currentMonthData.schoolYear &&
        (c.term || '1').toString() === currentMonthData.term
      );
      const schoolDays = parseInt(calendarEntry?.days) || 0;

      const calcAvgAttendance = (genderStudents: Student[]) => {
        if (schoolDays === 0 || genderStudents.length === 0) return 0;
        let totalPresent = 0;
        genderStudents.forEach(s => {
           if (s.attendance && s.attendance[monthKey]) {
             totalPresent += (s.attendance[monthKey].present || 0);
           } else if (s.dailyAttendance && s.dailyAttendance[selectedMonthKey]) {
             totalPresent += Object.values(s.dailyAttendance[selectedMonthKey]).filter(v => v === true).length;
           } else if (s.attendance && s.attendance[currentMonthData.month]) {
             totalPresent += (s.attendance[currentMonthData.month].present || 0);
           }
        });
        return totalPresent / schoolDays;
      };

      const mAvg = calcAvgAttendance(maleS);
      const fAvg = calcAvgAttendance(femaleS);

      return {
        sectionId: section.id,
        sectionName: section.name,
        gradeLevel: section.gradeLevel.toString(),
        maleEnrolment: maleS.length,
        femaleEnrolment: femaleS.length,
        maleAvgAttendance: mAvg,
        femaleAvgAttendance: fAvg,
        maleAttendancePercentage: maleS.length > 0 ? (mAvg / maleS.length) * 100 : 0,
        femaleAttendancePercentage: femaleS.length > 0 ? (fAvg / femaleS.length) * 100 : 0,
        maleDroppedPrev: getStatusCount('Male', 'Dropped Out', 'prev'),
        femaleDroppedPrev: getStatusCount('Female', 'Dropped Out', 'prev'),
        maleDroppedMonth: getStatusCount('Male', 'Dropped Out', 'month'),
        femaleDroppedMonth: getStatusCount('Female', 'Dropped Out', 'month'),
        maleTransOutPrev: getStatusCount('Male', 'Transferred Out', 'prev'),
        femaleTransOutPrev: getStatusCount('Female', 'Transferred Out', 'prev'),
        maleTransOutMonth: getStatusCount('Male', 'Transferred Out', 'month'),
        femaleTransOutMonth: getStatusCount('Female', 'Transferred Out', 'month'),
        maleTransInPrev: transInCount('Male', 'prev'),
        femaleTransInPrev: transInCount('Female', 'prev'),
        maleTransInMonth: transInCount('Male', 'month'),
        femaleTransInMonth: transInCount('Female', 'month'),
        maleLatePrev: lateEnrolleeCount('Male', 'prev'),
        femaleLatePrev: lateEnrolleeCount('Female', 'prev'),
        maleLateMonth: lateEnrolleeCount('Male', 'month'),
        femaleLateMonth: lateEnrolleeCount('Female', 'month'),
      };
    }).sort((a, b) => {
       if (a.gradeLevel !== b.gradeLevel) return parseInt(a.gradeLevel) - parseInt(b.gradeLevel);
       return a.sectionName.localeCompare(b.sectionName);
    });

    return summaries;
  }, [currentMonthData, sections, sectionStudents, calendar, selectedMonthKey]);

  const categoryStudents = useMemo(() => {
    if (!currentMonthData || !selectedCategory) return [];
    
    const reportMonthIndex = monthIndices[currentMonthData.month];
    const reportYear = currentMonthData.year;
    const results: { student: Student, sectionName: string, gradeLevel: string }[] = [];
  
    const syMonths = monthsList.filter(m => m.schoolYear === currentMonthData.schoolYear);
    const firstMonth = syMonths.length > 0 ? syMonths[0].month : 'June';
    
    sections.filter(sec => sec.schoolYear === currentMonthData.schoolYear).forEach(section => {
      const students = sectionStudents[section.id] || [];
      
      students.forEach(s => {
        // dropped / transOut logic
        const isDropped = s.status === 'Dropped Out';
        const isTransOut = s.status === 'Transferred Out';
        const statusDate = s.dropoutDate || s.updatedAt;
        let sYear = -1, sMonthIndex = -1;
        if (statusDate) {
          const parts = statusDate.split('T')[0].split('-');
          if (parts.length >= 2) {
            sYear = parseInt(parts[0]);
            sMonthIndex = parseInt(parts[1]) - 1;
          }
        }
        const statusThisMonth = sYear === reportYear && sMonthIndex === reportMonthIndex;
  
        // transIn / late logic
        const explicitTransIn = s.isTransferredIn === true;
        let foaYear = -1, foaMonthIndex = -1;
        if (s.dateOfFirstAttendance) {
          const parts = s.dateOfFirstAttendance.split('-');
          if (parts.length >= 2) {
            foaYear = parseInt(parts[0]);
            foaMonthIndex = parseInt(parts[1]) - 1;
          }
        }
        const joinedThisMonth = foaYear === reportYear && foaMonthIndex === reportMonthIndex;
  
        if (selectedCategory === 'dropped' && isDropped && statusThisMonth) {
          results.push({ student: s, sectionName: section.name, gradeLevel: section.gradeLevel.toString() });
        } else if (selectedCategory === 'transOut' && isTransOut && statusThisMonth) {
          results.push({ student: s, sectionName: section.name, gradeLevel: section.gradeLevel.toString() });
        } else if (selectedCategory === 'transIn' && explicitTransIn && joinedThisMonth) {
          results.push({ student: s, sectionName: section.name, gradeLevel: section.gradeLevel.toString() });
        } else if (selectedCategory === 'late' && !explicitTransIn && joinedThisMonth && currentMonthData.month !== firstMonth && s.dateOfFirstAttendance) {
          results.push({ student: s, sectionName: section.name, gradeLevel: section.gradeLevel.toString() });
        }
      });
    });
    
    return results.sort((a,b) => {
       const aName = (a.student.lastName || a.student.name || '');
       const bName = (b.student.lastName || b.student.name || '');
       return aName.localeCompare(bName);
    });
  }, [selectedCategory, currentMonthData, sections, sectionStudents, monthsList]);

  const handleExportExcel = () => {
    if (!currentMonthData || reportData.length === 0) return;

    const tableWidth = 37;
    const padRow = (row: any[]) => {
      while (row.length < tableWidth) row.push("");
      return row;
    };

    const row2 = padRow([]); row2[0] = `School Name: ${school?.name || ''}`; row2[18] = `School ID: ${schoolId}`;
    const row3 = padRow([]); row3[0] = `District: ${school?.district || ''}`; row3[18] = `Division: ${school?.division || ''}`;
    const row4 = padRow([]); row4[0] = `Month: ${currentMonthData.month} ${currentMonthData.year}`; row4[18] = `School Year: ${currentMonthData.schoolYear}`;

    const exportData: any[] = [
      padRow([`School Form 4 (SF4) - Monthly Learner Movement and Attendance Report`]),
      padRow([]),
      row2,
      row3,
      row4,
      padRow([]),
      padRow([
        "Grade Level & Section", 
        "Enrolment", "", "", 
        "Attendance", "", "", "", "", "",
        "NLPA (Dropped Out)", "", "", "", "", "", "", "", "",
        "Transferred Out", "", "", "", "", "", "", "", "",
        "Transferred In / Late Enrollees"
      ]),
      padRow([
        "", // Merged with Grade Level
        "M", "F", "T", // Merged below
        "Daily Average", "", "", "Percentage", "", "", 
        "(A) Cumulative Prev. Month", "", "", "(B) For the Month", "", "", "(A+B) Cumul. End Month", "", "",
        "(A) Cumulative Prev. Month", "", "", "(B) For the Month", "", "", "(A+B) Cumul. End Month", "", "",
        "(A) Cumulative Prev. Month", "", "", "(B) For the Month", "", "", "(A+B) Cumul. End Month"
      ]),
      padRow([
        "", // Merged with Grade Level
        "", "", "", // Merged with Enrolment M F T
        "M", "F", "T", "M", "F", "T", 
        "M", "F", "T", "M", "F", "T", "M", "F", "T",
        "M", "F", "T", "M", "F", "T", "M", "F", "T",
        "M", "F", "T", "M", "F", "T", "M", "F", "T"
      ])
    ];

    reportData.forEach((row: any) => {
      const maleCumulNLPA = row.maleDroppedPrev + row.maleDroppedMonth;
      const femaleCumulNLPA = row.femaleDroppedPrev + row.femaleDroppedMonth;
      const maleCumulTO = row.maleTransOutPrev + row.maleTransOutMonth;
      const femaleCumulTO = row.femaleTransOutPrev + row.femaleTransOutMonth;
      const maleCumulTI = row.maleTransInPrev + row.maleTransInMonth;
      const femaleCumulTI = row.femaleTransInPrev + row.femaleTransInMonth;
      const maleCumulLate = row.maleLatePrev + row.maleLateMonth;
      const femaleCumulLate = row.femaleLatePrev + row.femaleLateMonth;
      const totalEnrolment = row.maleEnrolment + row.femaleEnrolment;
      const totalAvgAtt = row.maleAvgAttendance + row.femaleAvgAttendance;
      const totalAttPct = totalEnrolment > 0 ? (totalAvgAtt / totalEnrolment) * 100 : 0;

      exportData.push(padRow([
        `Gr. ${row.gradeLevel} - ${row.sectionName}`,
        row.maleEnrolment,
        row.femaleEnrolment,
        totalEnrolment,
        row.maleAvgAttendance.toFixed(2),
        row.femaleAvgAttendance.toFixed(2),
        totalAvgAtt.toFixed(2),
        row.maleAttendancePercentage.toFixed(2) + '%',
        row.femaleAttendancePercentage.toFixed(2) + '%',
        totalAttPct.toFixed(2) + '%',
        row.maleDroppedPrev, row.femaleDroppedPrev, row.maleDroppedPrev + row.femaleDroppedPrev,
        row.maleDroppedMonth, row.femaleDroppedMonth, row.maleDroppedMonth + row.femaleDroppedMonth,
        maleCumulNLPA, femaleCumulNLPA, maleCumulNLPA + femaleCumulNLPA,
        row.maleTransOutPrev, row.femaleTransOutPrev, row.maleTransOutPrev + row.femaleTransOutPrev,
        row.maleTransOutMonth, row.femaleTransOutMonth, row.maleTransOutMonth + row.femaleTransOutMonth,
        maleCumulTO, femaleCumulTO, maleCumulTO + femaleCumulTO,
        row.maleTransInPrev + row.maleLatePrev, row.femaleTransInPrev + row.femaleLatePrev, row.maleTransInPrev + row.maleLatePrev + row.femaleTransInPrev + row.femaleLatePrev,
        row.maleTransInMonth + row.maleLateMonth, row.femaleTransInMonth + row.femaleLateMonth, row.maleTransInMonth + row.maleLateMonth + row.femaleTransInMonth + row.femaleLateMonth,
        maleCumulTI + maleCumulLate, femaleCumulTI + femaleCumulLate, maleCumulTI + maleCumulLate + femaleCumulTI + maleCumulLate + femaleCumulLate
      ]));
    });

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);
    
    // Apply styling and merges
    const range = XLSX.utils.decode_range(worksheet['!ref']!);
    
    const cellBaseStyle = {
      font: { name: "Arial", sz: 10 },
      border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };
    
    const titleStyle = {
        font: { name: "Arial", sz: 16, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "E2E8F0" } }
    };

    const schoolInfoStyle = {
        font: { name: "Arial", sz: 11, bold: true },
        alignment: { horizontal: "left", vertical: "center" }
    };

    const headerStyle = {
      ...cellBaseStyle,
      font: { name: "Arial", sz: 11, bold: true },
      fill: { fgColor: { rgb: "D3D3D3" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true }
    };

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
            if (!worksheet[cellAddress]) {
                worksheet[cellAddress] = { t: 's', v: '' }; 
            }

            if (R === 0) {
               worksheet[cellAddress].s = titleStyle;
            } else if (R >= 2 && R <= 4) {
               worksheet[cellAddress].s = schoolInfoStyle;
            } else if (R >= 6 && R <= 8) { 
                worksheet[cellAddress].s = headerStyle;
            } else if (R > 8) {
                worksheet[cellAddress].s = cellBaseStyle;
                if (R % 2 === 0 && exportData[R] && exportData[R].some((v: any) => v !== "")) {
                   worksheet[cellAddress].s = { ...cellBaseStyle, fill: { fgColor: { rgb: "F9FAFB" } } };
                }
            }
        }
    }

    // Setup Merges for headers
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 36 } }, // Title
      { s: { r: 2, c: 0 }, e: { r: 2, c: 17 } }, // School Name
      { s: { r: 2, c: 18 }, e: { r: 2, c: 36 } },// School ID
      { s: { r: 3, c: 0 }, e: { r: 3, c: 17 } }, // District
      { s: { r: 3, c: 18 }, e: { r: 3, c: 36 } },// Division
      { s: { r: 4, c: 0 }, e: { r: 4, c: 17 } }, // Month
      { s: { r: 4, c: 18 }, e: { r: 4, c: 36 } },// School Year

      { s: { r: 6, c: 0 }, e: { r: 8, c: 0 } }, // Grade Level
      { s: { r: 6, c: 1 }, e: { r: 6, c: 3 } }, // Enrolment
      { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } }, // Enrolment M
      { s: { r: 7, c: 2 }, e: { r: 8, c: 2 } }, // Enrolment F
      { s: { r: 7, c: 3 }, e: { r: 8, c: 3 } }, // Enrolment T
      
      { s: { r: 6, c: 4 }, e: { r: 6, c: 9 } }, // Attendance
      { s: { r: 7, c: 4 }, e: { r: 7, c: 6 } }, // Daily Avg
      { s: { r: 7, c: 7 }, e: { r: 7, c: 9 } }, // Percentage

      { s: { r: 6, c: 10 }, e: { r: 6, c: 18 } }, // NLPA
      { s: { r: 7, c: 10 }, e: { r: 7, c: 12 } }, // NLPA Prev
      { s: { r: 7, c: 13 }, e: { r: 7, c: 15 } }, // NLPA Month
      { s: { r: 7, c: 16 }, e: { r: 7, c: 18 } }, // NLPA End

      { s: { r: 6, c: 19 }, e: { r: 6, c: 27 } }, // TransOut
      { s: { r: 7, c: 19 }, e: { r: 7, c: 21 } }, // TransOut Prev
      { s: { r: 7, c: 22 }, e: { r: 7, c: 24 } }, // TransOut Month
      { s: { r: 7, c: 25 }, e: { r: 7, c: 27 } }, // TransOut End

      { s: { r: 6, c: 28 }, e: { r: 6, c: 36 } }, // TransIn
      { s: { r: 7, c: 28 }, e: { r: 7, c: 30 } }, // TransIn Prev
      { s: { r: 7, c: 31 }, e: { r: 7, c: 33 } }, // TransIn Month
      { s: { r: 7, c: 34 }, e: { r: 7, c: 36 } }, // TransIn End
    ];
    worksheet['!merges'] = merges;
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // Grade Level & Section
      ...Array(36).fill({ wch: 6 }) // M, F, T columns
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SF4 Report");
    XLSX.writeFile(workbook, `SF4_Report_${currentMonthData.month}_${currentMonthData.schoolYear}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!currentMonthData) return;
    const element = document.getElementById('sf4-print-area');
    if (!element) return;

    try {
      setLoading(true);
      
      // Temporarily modify styles to ensure the full table is visible for capture
      const originalStyle = element.style.cssText;
      const parentElement = element.parentElement;
      const originalParentStyle = parentElement ? parentElement.style.cssText : '';
      
      if (parentElement) {
        parentElement.style.overflow = 'visible';
      }
      
      element.style.width = `${element.scrollWidth}px`;
      element.style.maxWidth = 'none';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      // Restore styles
      element.style.cssText = originalStyle;
      if (parentElement) {
        parentElement.style.cssText = originalParentStyle;
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Add multiple pages if the content is taller than A4 landscape
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`SF4_Report_${currentMonthData.month}_${currentMonthData.schoolYear}.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl shadow-sm border border-slate-100">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Generating School Form 4 Report...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-5">
           <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 border border-indigo-500">
              <FileText size={24} />
           </div>
           <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">SF4 Summary Report</h2>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Monthly Learner Movement and Attendance Report (Form 4)</p>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
               // Re-trigger fetch
               setLoading(true);
               setSectionStudents({});
               // The fetchData useEffect will run again if we toggle schoolId or similar, 
               // but simpler to just reload the page or add a proper refresh logic.
               // For now, let's just use the effect dependency.
               const sid = schoolId;
               // We'll just re-fetch manually here for immediate feedback
               const reFetch = async () => {
                  try {
                    const sectionsQ = query(collection(db, 'sections'), where('schoolId', '==', schoolId));
                    const sectionsSnap = await getDocs(sectionsQ);
                    const fetchedSections = sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
                    setSections(fetchedSections);
                    const studentsRef: {[sectionId: string]: Student[]} = {};
                    for (const section of fetchedSections) {
                      const studentsQ = query(collection(db, `sections/${section.id}/students`));
                      const studentsSnap = await getDocs(studentsQ);
                      studentsRef[section.id] = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
                    }
                    setSectionStudents(studentsRef);
                  } catch (e) {
                    console.error("Manual refresh failed", e);
                  } finally {
                    setLoading(false);
                  }
               };
               reFetch();
            }}
            className="flex items-center gap-2 px-6 h-12 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            Refresh Data
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-6 h-12 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:scale-105 transition-all active:scale-95"
          >
            <Download size={16} />
            Excel Export
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-6 h-12 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 hover:scale-105 transition-all active:scale-95"
          >
            <FileText size={16} />
            PDF Export
          </button>

        </div>
      </div>

      <div className="p-6 border-b border-slate-100 print:hidden bg-slate-50/50">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Report Period</h3>
        <div className="flex flex-wrap gap-2">
          {monthsList.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMonthKey(m.key)}
              className={`flex flex-col items-start px-3 py-2 rounded-md border text-left transition-all duration-200 min-w-[100px] ${
                selectedMonthKey === m.key 
                  ? 'bg-slate-900 border-slate-900 shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`text-[11px] font-bold tracking-tight ${selectedMonthKey === m.key ? 'text-white' : 'text-slate-700'}`}>
                {m.month}
              </span>
              <span className={`text-[9px] uppercase tracking-wider ${selectedMonthKey === m.key ? 'text-slate-400' : 'text-slate-400'}`}>
                SY {m.schoolYear}
              </span>
            </button>
          ))}
        </div>
      </div>

      {reportData.length === 0 ? (
        <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
          No data available for the selected month.
        </div>
      ) : (
        <div className="p-8 overflow-x-auto text-black">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { background: white !important; }
              .print-hidden { display: none !important; }
            }
          `}} />
          
          <div id="sf4-print-area" className="max-w-[1200px] mx-auto bg-white p-8 border border-slate-100 rounded-3xl print:border-none print:p-0">
            <div className="text-center mb-8">
              <h1 className="text-xl font-black uppercase">School Form 4 (SF4)</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Learner Movement and Attendance Report</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Transfer & Dropout Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div 
                    className="flex flex-col text-center p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow-md transition-all active:scale-95"
                    onClick={() => setSelectedCategory('dropped')}
                  >
                    <span className="text-2xl font-black text-rose-600">
                      {reportData.reduce((acc, row) => acc + row.maleDroppedMonth + row.femaleDroppedMonth, 0)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Dropped (Month)</span>
                    <div className="flex justify-center gap-2 text-[8px] font-bold text-slate-400 mt-1">
                      <span>M: {reportData.reduce((acc, row) => acc + row.maleDroppedMonth, 0)}</span>
                      <span>•</span>
                      <span>F: {reportData.reduce((acc, row) => acc + row.femaleDroppedMonth, 0)}</span>
                    </div>
                  </div>

                  <div 
                    className="flex flex-col text-center p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-orange-300 hover:shadow-md transition-all active:scale-95"
                    onClick={() => setSelectedCategory('transOut')}
                  >
                    <span className="text-2xl font-black text-orange-600">
                      {reportData.reduce((acc, row) => acc + row.maleTransOutMonth + row.femaleTransOutMonth, 0)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Trans. Out (Month)</span>
                    <div className="flex justify-center gap-2 text-[8px] font-bold text-slate-400 mt-1">
                      <span>M: {reportData.reduce((acc, row) => acc + row.maleTransOutMonth, 0)}</span>
                      <span>•</span>
                      <span>F: {reportData.reduce((acc, row) => acc + row.femaleTransOutMonth, 0)}</span>
                    </div>
                  </div>

                  <div 
                    className="flex flex-col text-center p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all active:scale-95"
                    onClick={() => setSelectedCategory('transIn')}
                  >
                    <span className="text-2xl font-black text-emerald-600">
                      {reportData.reduce((acc, row) => acc + row.maleTransInMonth + row.femaleTransInMonth, 0)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Trans. In</span>
                    <div className="flex justify-center gap-2 text-[8px] font-bold text-slate-400 mt-1">
                      <span>M: {reportData.reduce((acc, row) => acc + row.maleTransInMonth, 0)}</span>
                      <span>•</span>
                      <span>F: {reportData.reduce((acc, row) => acc + row.femaleTransInMonth, 0)}</span>
                    </div>
                  </div>

                  <div 
                    className="flex flex-col text-center p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-teal-300 hover:shadow-md transition-all active:scale-95"
                    onClick={() => setSelectedCategory('late')}
                  >
                    <span className="text-2xl font-black text-teal-600">
                      {reportData.reduce((acc, row) => acc + row.maleLateMonth + row.femaleLateMonth, 0)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Late Enrollees</span>
                    <div className="flex justify-center gap-2 text-[8px] font-bold text-slate-400 mt-1">
                      <span>M: {reportData.reduce((acc, row) => acc + row.maleLateMonth, 0)}</span>
                      <span>•</span>
                      <span>F: {reportData.reduce((acc, row) => acc + row.femaleLateMonth, 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-[11px] font-bold uppercase tracking-tight content-center px-4">
                <div><span className="text-slate-400 mr-2">School Name:</span> {school?.name}</div>
                <div><span className="text-slate-400 mr-2">School ID:</span> {schoolId}</div>
                <div><span className="text-slate-400 mr-2">District:</span> {school?.district}</div>
                <div><span className="text-slate-400 mr-2">Division:</span> {school?.division}</div>
                <div><span className="text-slate-400 mr-2">Month:</span> {currentMonthData?.month} {currentMonthData?.year}</div>
                <div><span className="text-slate-400 mr-2">School Year:</span> {currentMonthData?.schoolYear}</div>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-900 text-[9px] print:text-[8px]">
              <thead>
                <tr className="bg-slate-50">
                  <th rowSpan={3} className="border border-slate-900 p-2 text-left">Grade Level & Section</th>
                  <th colSpan={3} rowSpan={2} className="border border-slate-900 p-2 text-center uppercase font-black">Enrolment</th>
                  <th colSpan={6} className="border border-slate-900 p-2 text-center uppercase font-black bg-indigo-50/50">Attendance</th>
                  <th colSpan={9} className="border border-slate-900 p-2 text-center uppercase font-black bg-rose-50/50">NLPA (Dropped Out)</th>
                  <th colSpan={9} className="border border-slate-900 p-2 text-center uppercase font-black bg-orange-50/50">Transferred Out</th>
                  <th colSpan={9} className="border border-slate-900 p-2 text-center uppercase font-black bg-emerald-50/50">Transferred In / Late Enrollees<br/><span className="text-[7px] text-slate-500 lowercase">(Trans In / Late)</span></th>
                </tr>
                <tr className="bg-slate-50">
                  <th colSpan={3} className="border border-slate-900 p-1 text-center">Daily Average</th>
                  <th colSpan={3} className="border border-slate-900 p-1 text-center font-black">Percentage</th>
                  
                  <th colSpan={3} className="border border-slate-900 p-1 text-center leading-tight">(A) Cumulative Prev. Month</th>
                  <th colSpan={3} className="border border-slate-900 p-1 text-center font-black leading-tight">(B) For the Month</th>
                  <th colSpan={3} className="border border-slate-900 p-1 text-center font-black bg-slate-100 leading-tight">(A+B) Cumul. End Month</th>

                  <th colSpan={3} className="border border-slate-900 p-1 text-center leading-tight">(A) Cumulative Prev. Month</th>
                  <th colSpan={3} className="border border-slate-900 p-1 text-center font-black leading-tight">(B) For the Month</th>
                  <th colSpan={3} className="border border-slate-900 p-1 text-center font-black bg-slate-100 leading-tight">(A+B) Cumul. End Month</th>

                  <th colSpan={3} className="border border-slate-900 p-1 text-center leading-tight">(A) Cumulative Prev. Month</th>
                  <th colSpan={3} className="border border-slate-900 p-1 text-center font-black leading-tight">(B) For the Month</th>
                  <th colSpan={3} className="border border-slate-900 p-1 text-center font-black bg-slate-100 leading-tight">(A+B) Cumul. End Month</th>
                </tr>
                <tr className="bg-slate-50 text-[7px] font-black">
                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1 bg-slate-100">T</th>
                  
                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1 bg-slate-200">T</th>
                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1 bg-slate-200">T</th>

                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1">T</th>
                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1">T</th>
                  <th className="border border-slate-900 p-1 bg-slate-200">M</th><th className="border border-slate-900 p-1 bg-slate-200">F</th><th className="border border-slate-900 p-1 bg-slate-200">T</th>

                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1">T</th>
                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1">T</th>
                  <th className="border border-slate-900 p-1 bg-slate-200">M</th><th className="border border-slate-900 p-1 bg-slate-200">F</th><th className="border border-slate-900 p-1 bg-slate-200">T</th>

                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1">T</th>
                  <th className="border border-slate-900 p-1">M</th><th className="border border-slate-900 p-1">F</th><th className="border border-slate-900 p-1">T</th>
                  <th className="border border-slate-900 p-1 bg-slate-200">M</th><th className="border border-slate-900 p-1 bg-slate-200">F</th><th className="border border-slate-900 p-1 bg-slate-200">T</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(row => (
                  <tr key={row.sectionId} className="hover:bg-slate-50">
                    <td className="border border-slate-900 p-1 font-bold whitespace-nowrap">Gr. {row.gradeLevel} - {row.sectionName}</td>
                    
                    <td className="border border-slate-900 p-1 text-center">{row.maleEnrolment}</td>
                    <td className="border border-slate-900 p-1 text-center">{row.femaleEnrolment}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold bg-slate-50">{row.maleEnrolment + row.femaleEnrolment}</td>
                    
                    <td className="border border-slate-900 p-1 text-center">{row.maleAvgAttendance.toFixed(2)}</td>
                    <td className="border border-slate-900 p-1 text-center">{row.femaleAvgAttendance.toFixed(2)}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold bg-slate-50">{(row.maleAvgAttendance + row.femaleAvgAttendance).toFixed(2)}</td>

                    <td className="border border-slate-900 p-1 text-center">{row.maleAttendancePercentage.toFixed(1)}%</td>
                    <td className="border border-slate-900 p-1 text-center">{row.femaleAttendancePercentage.toFixed(1)}%</td>
                    <td className="border border-slate-900 p-1 text-center font-bold bg-slate-50">{((row.maleAvgAttendance + row.femaleAvgAttendance) / (row.maleEnrolment + row.femaleEnrolment || 1) * 100).toFixed(1)}%</td>
                    
                    <td className="border border-slate-900 p-1 text-center">{row.maleDroppedPrev}</td>
                    <td className="border border-slate-900 p-1 text-center">{row.femaleDroppedPrev}</td>
                    <td className="border border-slate-900 p-1 text-center">{row.maleDroppedPrev + row.femaleDroppedPrev}</td>
                    
                    <td className="border border-slate-900 p-1 text-center font-bold">{row.maleDroppedMonth}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold">{row.femaleDroppedMonth}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold">{row.maleDroppedMonth + row.femaleDroppedMonth}</td>

                    <td className="border border-slate-900 p-1 text-center bg-slate-50 font-black">{row.maleDroppedPrev + row.maleDroppedMonth}</td>
                    <td className="border border-slate-900 p-1 text-center bg-slate-50 font-black">{row.femaleDroppedPrev + row.femaleDroppedMonth}</td>
                    <td className="border border-slate-900 p-1 text-center bg-slate-100 font-black">{row.maleDroppedPrev + row.maleDroppedMonth + row.femaleDroppedPrev + row.femaleDroppedMonth}</td>
                    
                    <td className="border border-slate-900 p-1 text-center">{row.maleTransOutPrev}</td>
                    <td className="border border-slate-900 p-1 text-center">{row.femaleTransOutPrev}</td>
                    <td className="border border-slate-900 p-1 text-center">{row.maleTransOutPrev + row.femaleTransOutPrev}</td>
                    
                    <td className="border border-slate-900 p-1 text-center font-bold">{row.maleTransOutMonth}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold">{row.femaleTransOutMonth}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold">{row.maleTransOutMonth + row.femaleTransOutMonth}</td>

                    <td className="border border-slate-900 p-1 text-center bg-slate-50 font-black">{row.maleTransOutPrev + row.maleTransOutMonth}</td>
                    <td className="border border-slate-900 p-1 text-center bg-slate-50 font-black">{row.femaleTransOutPrev + row.femaleTransOutMonth}</td>
                    <td className="border border-slate-900 p-1 text-center bg-slate-100 font-black">{row.maleTransOutPrev + row.maleTransOutMonth + row.femaleTransOutPrev + row.femaleTransOutMonth}</td>
                    
                    <td className="border border-slate-900 p-1 text-center"><span className="text-[7px] text-emerald-800">{row.maleTransInPrev}</span> / <span className="text-[7px] text-teal-700">{row.maleLatePrev}</span><br/><span className="font-bold">{row.maleTransInPrev + row.maleLatePrev}</span></td>
                    <td className="border border-slate-900 p-1 text-center"><span className="text-[7px] text-emerald-800">{row.femaleTransInPrev}</span> / <span className="text-[7px] text-teal-700">{row.femaleLatePrev}</span><br/><span className="font-bold">{row.femaleTransInPrev + row.femaleLatePrev}</span></td>
                    <td className="border border-slate-900 p-1 text-center bg-slate-50 font-black">{row.maleTransInPrev + row.maleLatePrev + row.femaleTransInPrev + row.femaleLatePrev}</td>

                    <td className="border border-slate-900 p-1 text-center"><span className="text-[7px] text-emerald-800">{row.maleTransInMonth}</span> / <span className="text-[7px] text-teal-700">{row.maleLateMonth}</span><br/><span className="font-bold">{row.maleTransInMonth + row.maleLateMonth}</span></td>
                    <td className="border border-slate-900 p-1 text-center"><span className="text-[7px] text-emerald-800">{row.femaleTransInMonth}</span> / <span className="text-[7px] text-teal-700">{row.femaleLateMonth}</span><br/><span className="font-bold">{row.femaleTransInMonth + row.femaleLateMonth}</span></td>
                    <td className="border border-slate-900 p-1 text-center bg-slate-50 font-black">{row.maleTransInMonth + row.maleLateMonth + row.femaleTransInMonth + row.femaleLateMonth}</td>

                    <td className="border border-slate-900 p-1 text-center bg-slate-100 font-black">{row.maleTransInPrev + row.maleTransInMonth + row.maleLatePrev + row.maleLateMonth}</td>
                    <td className="border border-slate-900 p-1 text-center bg-slate-100 font-black">{row.femaleTransInPrev + row.femaleTransInMonth + row.femaleLatePrev + row.femaleLateMonth}</td>
                    <td className="border border-slate-900 p-1 text-center bg-slate-200 font-black">{row.maleTransInPrev + row.maleTransInMonth + row.maleLatePrev + row.maleLateMonth + row.femaleTransInPrev + row.femaleTransInMonth + row.femaleLatePrev + row.femaleLateMonth}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black">
                  <td className="border border-slate-900 p-1 uppercase">School Total</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleEnrolment, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.femaleEnrolment, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center underline font-bold">{reportData.reduce((s, r) => s + r.maleEnrolment + r.femaleEnrolment, 0)}</td>
                  
                  <td className="border border-slate-900 p-1 text-center">{(reportData.reduce((s, r) => s + r.maleAvgAttendance, 0)).toFixed(2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{(reportData.reduce((s, r) => s + r.femaleAvgAttendance, 0)).toFixed(2)}</td>
                  <td className="border border-slate-900 p-1 text-center underline">{(reportData.reduce((s, r) => s + r.maleAvgAttendance + r.femaleAvgAttendance, 0)).toFixed(2)}</td>

                  <td className="border border-slate-900 p-1 text-center">{(reportData.reduce((s, r) => s + r.maleAvgAttendance, 0) / (reportData.reduce((s, r) => s + r.maleEnrolment, 0) || 1) * 100).toFixed(1)}%</td>
                  <td className="border border-slate-900 p-1 text-center">{(reportData.reduce((s, r) => s + r.femaleAvgAttendance, 0) / (reportData.reduce((s, r) => s + r.femaleEnrolment, 0) || 1) * 100).toFixed(1)}%</td>
                  <td className="border border-slate-900 p-1 text-center underline">{(reportData.reduce((s, r) => s + r.maleAvgAttendance + r.femaleAvgAttendance, 0) / (reportData.reduce((s, r) => s + r.maleEnrolment + r.femaleEnrolment, 0) || 1) * 100).toFixed(1)}%</td>
                  
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleDroppedPrev, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.femaleDroppedPrev, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleDroppedPrev + r.femaleDroppedPrev, 0)}</td>
                  
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleDroppedMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.femaleDroppedMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleDroppedMonth + r.femaleDroppedMonth, 0)}</td>

                  <td className="border border-slate-900 p-1 text-center bg-slate-200">{reportData.reduce((s, r) => s + r.maleDroppedPrev + r.maleDroppedMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200">{reportData.reduce((s, r) => s + r.femaleDroppedPrev + r.femaleDroppedMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-300">{reportData.reduce((s, r) => s + r.maleDroppedPrev + r.maleDroppedMonth + r.femaleDroppedPrev + r.femaleDroppedMonth, 0)}</td>
                  
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleTransOutPrev, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.femaleTransOutPrev, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleTransOutPrev + r.femaleTransOutPrev, 0)}</td>
                  
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleTransOutMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.femaleTransOutMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center">{reportData.reduce((s, r) => s + r.maleTransOutMonth + r.femaleTransOutMonth, 0)}</td>

                  <td className="border border-slate-900 p-1 text-center bg-slate-200">{reportData.reduce((s, r) => s + r.maleTransOutPrev + r.maleTransOutMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200">{reportData.reduce((s, r) => s + r.femaleTransOutPrev + r.femaleTransOutMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-300">{reportData.reduce((s, r) => s + r.maleTransOutPrev + r.maleTransOutMonth + r.femaleTransOutPrev + r.femaleTransOutMonth, 0)}</td>
                  
                  <td className="border border-slate-900 p-1 text-center"><span className="text-[7px] font-normal text-emerald-800">{reportData.reduce((s, r) => s + r.maleTransInPrev, 0)}</span> / <span className="text-[7px] font-normal text-teal-700">{reportData.reduce((s, r) => s + r.maleLatePrev, 0)}</span><br/>{reportData.reduce((s, r) => s + r.maleTransInPrev + r.maleLatePrev, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center"><span className="text-[7px] font-normal text-emerald-800">{reportData.reduce((s, r) => s + r.femaleTransInPrev, 0)}</span> / <span className="text-[7px] font-normal text-teal-700">{reportData.reduce((s, r) => s + r.femaleLatePrev, 0)}</span><br/>{reportData.reduce((s, r) => s + r.femaleTransInPrev + r.femaleLatePrev, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center whitespace-nowrap"><span className="text-[7px] font-normal text-slate-500">{reportData.reduce((s, r) => s + r.maleTransInPrev + r.femaleTransInPrev, 0)} / {reportData.reduce((s, r) => s + r.maleLatePrev + r.femaleLatePrev, 0)}</span><br/>{reportData.reduce((s, r) => s + r.maleTransInPrev + r.femaleTransInPrev + r.maleLatePrev + r.femaleLatePrev, 0)}</td>

                  <td className="border border-slate-900 p-1 text-center"><span className="text-[7px] font-normal text-emerald-800">{reportData.reduce((s, r) => s + r.maleTransInMonth, 0)}</span> / <span className="text-[7px] font-normal text-teal-700">{reportData.reduce((s, r) => s + r.maleLateMonth, 0)}</span><br/>{reportData.reduce((s, r) => s + r.maleTransInMonth + r.maleLateMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center"><span className="text-[7px] font-normal text-emerald-800">{reportData.reduce((s, r) => s + r.femaleTransInMonth, 0)}</span> / <span className="text-[7px] font-normal text-teal-700">{reportData.reduce((s, r) => s + r.femaleLateMonth, 0)}</span><br/>{reportData.reduce((s, r) => s + r.femaleTransInMonth + r.femaleLateMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center whitespace-nowrap"><span className="text-[7px] font-normal text-slate-500">{reportData.reduce((s, r) => s + r.maleTransInMonth + r.femaleTransInMonth, 0)} / {reportData.reduce((s, r) => s + r.maleLateMonth + r.femaleLateMonth, 0)}</span><br/>{reportData.reduce((s, r) => s + r.maleTransInMonth + r.femaleTransInMonth + r.maleLateMonth + r.femaleLateMonth, 0)}</td>

                  <td className="border border-slate-900 p-1 text-center bg-slate-200">{reportData.reduce((s, r) => s + r.maleTransInPrev + r.maleTransInMonth + r.maleLatePrev + r.maleLateMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200">{reportData.reduce((s, r) => s + r.femaleTransInPrev + r.femaleTransInMonth + r.femaleLatePrev + r.femaleLateMonth, 0)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-300">{reportData.reduce((s, r) => s + r.maleTransInPrev + r.maleTransInMonth + r.femaleTransInPrev + r.femaleTransInMonth + r.maleLatePrev + r.maleLateMonth + r.femaleLatePrev + r.femaleLateMonth, 0)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div className="mt-12 grid grid-cols-2 gap-12 text-[11px] font-bold">
              <div className="text-center space-y-8">
                <p>Prepared by:</p>
                <div className="border-b border-slate-900 mx-auto w-64 pb-1"></div>
                <p className="uppercase text-[9px] text-slate-500">(Signature over Printed Name of School Head)</p>
              </div>
              <div className="text-center space-y-8">
                <p>Submitted to:</p>
                <div className="border-b border-slate-900 mx-auto w-64 pb-1"></div>
                <p className="uppercase text-[9px] text-slate-500">(Signature over Printed Name of District/Division Official)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {selectedCategory === 'dropped' ? 'Dropped Out Learners' :
                   selectedCategory === 'transOut' ? 'Transferred Out Learners' :
                   selectedCategory === 'transIn' ? 'Transferred In Learners' :
                   'Late Enrollees'}
                </h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {currentMonthData?.month} {currentMonthData?.year} • SY {currentMonthData?.schoolYear}
                </p>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-white flex-1">
              {categoryStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="font-bold">No learners found</p>
                  <p className="text-sm">There are no records for this category in the selected month.</p>
                </div>
              ) : (
                <div className="space-y-3">
                   {categoryStudents.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-600 ${
                            item.student.sex?.toLowerCase() === 'female' || item.student.sex?.toLowerCase() === 'f' 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                             {((item.student.lastName || item.student.name || '?')[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                               {item.student.lastName ? `${item.student.lastName}, ${item.student.firstName} ${item.student.middleName || ''}` : item.student.name}
                            </p>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">
                              Grade {item.gradeLevel} - {item.sectionName} • {item.student.sex || 'Unknown'}
                              {item.student.dropoutDate && (item.student.status === 'Dropped Out' || item.student.status === 'Transferred Out') && (
                                <span className="ml-2 text-indigo-600">• {new Date(item.student.dropoutDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{item.student.dropoutReason ? ` - ${item.student.dropoutReason}` : ''}</span>
                              )}
                              {item.student.dateOfFirstAttendance && (selectedCategory === 'transIn' || selectedCategory === 'late') && (
                                <span className="ml-2 text-emerald-600">• FOA: {new Date(item.student.dateOfFirstAttendance).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
