import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatStudentName } from "../utils";
import { 
  FileText, 
  Activity, 
  Search, 
  Download, 
  Filter,
  BarChart,
  Users,
  ChevronDown,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Loader2,
  Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Section, UserProfile, School } from '../types';
import { db, safeGetDoc as getDoc, safeGetDocs as getDocs } from '../firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

interface SF8ViewProps {
  section: Section | null;
  students: Student[];
  userProfile: UserProfile | null;
  activeSchoolYear?: string;
}

const computeBMI = (weightKg: number, heightCm: number) => {
  if (!weightKg || !heightCm) return { bmi: 0, category: 'N/A' };
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  let category = 'Normal';
  
  if (bmi < 16.0) category = 'Severely Wasted';
  else if (bmi < 18.5) category = 'Wasted';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  
  return { bmi: parseFloat(bmi.toFixed(1)), category };
};

const computeHFA = (ageYears: number | string | undefined, heightCm: number) => {
  if (!heightCm || !ageYears) return { hfaCategory: 'N/A' };
  const age = typeof ageYears === 'string' ? parseFloat(ageYears) : ageYears;
  if(isNaN(age)) return { hfaCategory: 'Normal' };

  const expectedH = age * 6 + 77;
  const diff = heightCm - expectedH;

  let hfaCategory = 'Normal';
  if (diff <= -15) hfaCategory = 'Severely Stunted';
  else if (diff <= -5) hfaCategory = 'Stunted';
  else if (diff >= 15) hfaCategory = 'Tall';
  
  return { hfaCategory };
};

const calculateNutritionalStats = (displayData: {student: Student}[]) => {
  const active = displayData.filter(d => d.student.weight && d.student.height);
  const total = active.length;
  if (total === 0) return null;

  const male = active.filter(d => d.student.sex === 'Male');
  const female = active.filter(d => d.student.sex === 'Female');

  const getStats = (list: any[]) => ({
    SeverelyWasted: list.filter(d => computeBMI(d.student.weight!, d.student.height!).category === 'Severely Wasted').length,
    Wasted: list.filter(d => computeBMI(d.student.weight!, d.student.height!).category === 'Wasted').length,
    Normal: list.filter(d => computeBMI(d.student.weight!, d.student.height!).category === 'Normal').length,
    Overweight: list.filter(d => computeBMI(d.student.weight!, d.student.height!).category === 'Overweight').length,
    Obese: list.filter(d => computeBMI(d.student.weight!, d.student.height!).category === 'Obese').length,
    SevStunted: list.filter(d => computeHFA(d.student.age, d.student.height!).hfaCategory === 'Severely Stunted').length,
    Stunted: list.filter(d => computeHFA(d.student.age, d.student.height!).hfaCategory === 'Stunted').length,
    NormalHFA: list.filter(d => computeHFA(d.student.age, d.student.height!).hfaCategory === 'Normal').length,
    Tall: list.filter(d => computeHFA(d.student.age, d.student.height!).hfaCategory === 'Tall').length,
  });

  const maleStats = getStats(male);
  const femaleStats = getStats(female);

  return {
    total,
    male: { count: male.length, ...maleStats },
    female: { count: female.length, ...femaleStats },
    overall: {
      SeverelyWasted: maleStats.SeverelyWasted + femaleStats.SeverelyWasted,
      Wasted: maleStats.Wasted + femaleStats.Wasted,
      Normal: maleStats.Normal + femaleStats.Normal,
      Overweight: maleStats.Overweight + femaleStats.Overweight,
      Obese: maleStats.Obese + femaleStats.Obese,
      SevStunted: maleStats.SevStunted + femaleStats.SevStunted,
      Stunted: maleStats.Stunted + femaleStats.Stunted,
      NormalHFA: maleStats.NormalHFA + femaleStats.NormalHFA,
      Tall: maleStats.Tall + femaleStats.Tall,
    }
  };
};

export function SF8View({ section, students, userProfile, activeSchoolYear }: SF8ViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [viewType, setViewType] = useState<'section' | 'consolidated'>(
    userProfile?.role === 'admin' || userProfile?.role === 'system_admin' ? 'consolidated' : 'section'
  );
  
  const [schoolStudents, setSchoolStudents] = useState<{student: Student, sectionName: string}[]>([]);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolInfo, setSchoolInfo] = useState<School | null>(null);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'system_admin';

  useEffect(() => {
    if (userProfile?.schoolId) {
      const q = query(collection(db, "schools"), where("schoolId", "==", userProfile.schoolId));
      getDocs(q).then(snapshot => {
        if (!snapshot.empty) {
          setSchoolInfo(snapshot.docs[0].data() as School);
        }
      });
    }
  }, [userProfile?.schoolId]);

  useEffect(() => {
    if (viewType === 'consolidated' && isAdmin && userProfile?.schoolId) {
      fetchSchoolData();
    }
  }, [viewType, userProfile?.schoolId, isAdmin, section?.schoolYear, activeSchoolYear]);

  const fetchSchoolData = async () => {
    setLoadingConsolidated(true);
    try {
      const targetYear = section?.schoolYear || activeSchoolYear;
      let sectionsQuery;
      
      if (targetYear) {
        sectionsQuery = query(
          collection(db, 'sections'), 
          where('schoolId', '==', userProfile?.schoolId),
          where('schoolYear', '==', targetYear)
        );
      } else {
        sectionsQuery = query(collection(db, 'sections'), where('schoolId', '==', userProfile?.schoolId));
      }

      const sectionsSnap = await getDocs(sectionsQuery);
      
      const allStuds: {student: Student, sectionName: string}[] = [];
      
      for (const sectionDoc of sectionsSnap.docs) {
        const secData = sectionDoc.data() as Section;
        const studentsSnap = await getDocs(collection(db, `sections/${sectionDoc.id}/students`));
        studentsSnap.docs.forEach(doc => {
          allStuds.push({
             student: { id: doc.id, ...doc.data() } as Student,
             sectionName: secData.name
          });
        });
      }
      setSchoolStudents(allStuds);
    } catch (error) {
      console.error("Error fetching school nutritional data:", error);
    } finally {
      setLoadingConsolidated(false);
    }
  };

  const displayData = useMemo(() => {
    if (viewType === 'section') {
      return students.map(s => ({ student: s, sectionName: section?.name || 'Current' }));
    }
    return schoolStudents;
  }, [viewType, students, schoolStudents, section]);

  const filteredData = useMemo(() => {
    return displayData.filter(item => 
      formatStudentName(item.student).toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.lrn?.includes(searchTerm)
    ).sort((a, b) => {
      // Sort by Sex first: Male then Female
      // Assuming 'Male' and 'Female' are the values. If 'Male' < 'Female' alphabetically, we can use localeCompare
      // but to be explicit:
      if (a.student.sex !== b.student.sex) {
        return a.student.sex === 'Male' ? -1 : 1;
      }
      // Then sort by Name
      return formatStudentName(a.student).localeCompare(formatStudentName(b.student));
    });
  }, [displayData, searchTerm]);

  const stats = useMemo(() => {
    return calculateNutritionalStats(displayData);
  }, [displayData]);

  const schoolStats = useMemo(() => {
    return calculateNutritionalStats(schoolStudents);
  }, [schoolStudents]);

  const consolidatedStatsBySection = useMemo(() => {
    const emptyStats = () => ({
      Normal: 0, Wasted: 0, SeverelyWasted: 0, Overweight: 0, Obese: 0,
      NormalHFA: 0, Stunted: 0, SevStunted: 0, Tall: 0,
      total: 0
    });

    const grouped: { [key: string]: { male: any, female: any, total: number } } = {};
    
    schoolStudents.forEach(item => {
      if (!grouped[item.sectionName]) {
        grouped[item.sectionName] = { 
          male: emptyStats(), 
          female: emptyStats(), 
          total: 0 
        };
      }
      
      const { category } = computeBMI(item.student.weight || 0, item.student.height || 0);
      const { hfaCategory } = computeHFA(item.student.age, item.student.height || 0);
      
      const sex = item.student.sex?.toLowerCase() === 'female' ? 'female' : 'male';
      const stats = grouped[item.sectionName][sex];

      if (category !== 'N/A') {
        const catKey = category.replace(' ', '') as keyof typeof stats;
        if (stats[catKey] !== undefined) stats[catKey]++;
        stats.total++;
        grouped[item.sectionName].total++;
      }

      if (hfaCategory !== 'N/A') {
        let hfaKey: any = 'NormalHFA';
        if (hfaCategory === 'Severely Stunted') hfaKey = 'SevStunted';
        else if (hfaCategory === 'Stunted') hfaKey = 'Stunted';
        else if (hfaCategory === 'Tall') hfaKey = 'Tall';
        
        if (stats[hfaKey] !== undefined) stats[hfaKey]++;
      }
    });
    
    return Object.entries(grouped).map(([name, data]) => ({
      sectionName: name,
      ...data
    })).sort((a, b) => a.sectionName.localeCompare(b.sectionName));
  }, [schoolStudents]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const element = reportRef.current;
      
      await doc.html(element, {
        callback: function (doc) {
          doc.save(`SF8_${viewType === 'consolidated' ? 'Consolidated' : (section?.name || 'Report')}.pdf`);
        },
        margin: [10, 10, 10, 10],
        autoPaging: 'text',
        x: 0,
        y: 0,
        width: 190,
        windowWidth: 1000 
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
    }
  };

  const handleExportExcel = () => {
    let data: any[] = [];

    const padRow = (row: any[], length: number) => {
       while (row.length < length) row.push("");
       return row;
    };

    if (viewType === 'consolidated') {
      const w = 12;
      data = [
        padRow(["School Form 8 (Nutritional Status) - Consolidated"], w),
        padRow([] , w),
        padRow(["Section", "Sex", "Normal (BMI)", "Wasted", "Severely Wasted", "Overweight", "Obese", "Normal (HFA)", "Stunted", "Severely Stunted", "Tall", "Total"], w),
        ...consolidatedStatsBySection.flatMap(s => [
          padRow([s.sectionName, "Male", s.male.Normal, s.male.Wasted, s.male.SeverelyWasted, s.male.Overweight, s.male.Obese, s.male.NormalHFA, s.male.Stunted, s.male.SevStunted, s.male.Tall, s.male.total], w),
          padRow(["", "Female", s.female.Normal, s.female.Wasted, s.female.SeverelyWasted, s.female.Overweight, s.female.Obese, s.female.NormalHFA, s.female.Stunted, s.female.SevStunted, s.female.Tall, s.female.total], w)
        ])
      ];
    } else {
      const w = 8;
      data = [
        padRow(["School Form 8 (Nutritional Status) - Section: " + (section?.name || 'N/A')], w),
        padRow([] , w),
        padRow(["No.", "LRN", "Name", "Sex", "Weight (kg)", "Height (cm)", "BMI", "Status"], w),
        ...filteredData.map((item, idx) => {
          const { bmi, category } = computeBMI(item.student.weight || 0, item.student.height || 0);
          return padRow([idx + 1, item.student.lrn, formatStudentName(item.student), item.student.sex, item.student.weight, item.student.height, bmi, category], w);
        })
      ];
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Apply merges
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: viewType === 'consolidated' ? 11 : 7 } } // Title
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

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
            if (!worksheet[cellAddress]) {
                worksheet[cellAddress] = { t: 's', v: '' }; // Ensure cell exists
            }

            // Apply styles based on Row
            if (R === 0) { // Title
               worksheet[cellAddress].s = titleStyle;
            } else if (R === 2) { // Column Headers
                worksheet[cellAddress].s = headerStyle;
            } else if (R > 2) {
                worksheet[cellAddress].s = cellBaseStyle;
                // Add Zebra striping for table data
                if (R % 2 === 0 && data[R] && data[R].some((v: any) => v !== "")) {
                   worksheet[cellAddress].s = { ...cellBaseStyle, fill: { fgColor: { rgb: "F9FAFB" } } };
                }
            }
        }
    }

    if (viewType === 'consolidated') {
       worksheet['!cols'] = [
          { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 }
       ]
    } else {
       worksheet['!cols'] = [
          { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 20 }
       ]
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SF8 Nutritional Status");
    XLSX.writeFile(workbook, `SF8_${viewType === 'consolidated' ? 'Consolidated' : (section?.name || 'Report')}.xlsx`);
  };

  const totalConsolidatedStats = useMemo(() => {
    const empty = () => ({
      Normal: 0, Wasted: 0, SeverelyWasted: 0, Overweight: 0, Obese: 0,
      NormalHFA: 0, Stunted: 0, SevStunted: 0, Tall: 0,
      count: 0
    });

    return consolidatedStatsBySection.reduce((acc, curr) => ({
      male: {
        Normal: acc.male.Normal + curr.male.Normal,
        Wasted: acc.male.Wasted + curr.male.Wasted,
        SeverelyWasted: acc.male.SeverelyWasted + curr.male.SeverelyWasted,
        Overweight: acc.male.Overweight + curr.male.Overweight,
        Obese: acc.male.Obese + curr.male.Obese,
        NormalHFA: acc.male.NormalHFA + curr.male.NormalHFA,
        Stunted: acc.male.Stunted + curr.male.Stunted,
        SevStunted: acc.male.SevStunted + curr.male.SevStunted,
        Tall: acc.male.Tall + curr.male.Tall,
        count: acc.male.count + curr.male.total
      },
      female: {
        Normal: acc.female.Normal + curr.female.Normal,
        Wasted: acc.female.Wasted + curr.female.Wasted,
        SeverelyWasted: acc.female.SeverelyWasted + curr.female.SeverelyWasted,
        Overweight: acc.female.Overweight + curr.female.Overweight,
        Obese: acc.female.Obese + curr.female.Obese,
        NormalHFA: acc.female.NormalHFA + curr.female.NormalHFA,
        Stunted: acc.female.Stunted + curr.female.Stunted,
        SevStunted: acc.female.SevStunted + curr.female.SevStunted,
        Tall: acc.female.Tall + curr.female.Tall,
        count: acc.female.count + curr.female.total
      },
      total: acc.total + curr.total
    }), { male: empty(), female: empty(), total: 0 });
  }, [consolidatedStatsBySection]);

  if (!section && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-400 mb-6 shadow-sm border border-rose-100">
           <Activity size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">School Form 8 (Nutritional Status)</h2>
        <p className="text-slate-500 max-w-md mx-auto mt-3 leading-relaxed font-medium">Please select a class section to view nutritional records or generate consolidated reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col gap-0">
        {/* Standardized Header */}
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 border border-rose-500">
               <Activity size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">School Form 8 (Nutritional Status)</h2>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Record and monitoring of Learner's Height, Weight and BMI</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="bg-white p-1.5 rounded-xl flex border border-slate-200 shadow-sm">
                 <button 
                   onClick={() => setViewType('section')}
                   className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'section' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                 >
                   Adviser
                 </button>
                 <button 
                   onClick={() => setViewType('consolidated')}
                   className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'consolidated' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                 >
                   School
                 </button>
              </div>
            )}
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-6 h-12 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 hover:scale-105 transition-all active:scale-95"
            >
              <FileText size={16} />
              PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-6 h-12 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:scale-105 transition-all active:scale-95"
            >
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>

        {/* Filters/Summary Area */}
        <div className="p-6 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4 print:hidden text-black">
            <h4 className="font-bold text-slate-700 text-sm italic">
                {viewType === 'consolidated' ? `School Summary (${consolidatedStatsBySection.length} Sections)` : `Class Section: ${section?.name || 'N/A'}`}
                {loadingConsolidated && <Loader2 size={14} className="inline ml-2 animate-spin text-rose-600" />}
            </h4>
            
            {viewType === 'section' && (
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder="Find learner..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all"
                />
              </div>
            )}
        </div>

        {/* Main Content Area - This is what gets exported to PDF */}
        <div ref={reportRef} className="p-8 bg-white print:p-0">
           {/* Report Header for Paper/PDF */}
           <div className="text-center mb-10 hidden print:block border-b-2 border-black pb-6">
              <h1 className="font-black text-2xl uppercase text-black">School Form 8 (Nutritional Status)</h1>
              <p className="text-xs tracking-widest font-bold text-slate-500 mt-1 uppercase italic text-black">(Consolidated Record of Learner's Height and Weight)</p>
              
              <div className="flex flex-wrap justify-between mt-8 text-[10px] font-bold uppercase gap-y-4 px-2 text-black">
                 <div className="flex gap-2"><span>School:</span> <span className="border-b border-black min-w-[200px]">{schoolInfo?.schoolName || section?.schoolName || 'N/A'}</span></div>
                 <div className="flex gap-2"><span>District:</span> <span className="border-b border-black min-w-[150px]">{section?.district || 'N/A'}</span></div>
                 <div className="flex gap-2"><span>Division:</span> <span className="border-b border-black min-w-[150px]">{section?.division || 'N/A'}</span></div>
                 <div className="flex gap-2"><span>School Year:</span> <span className="border-b border-black min-w-[100px]">{section?.schoolYear || 'N/A'}</span></div>
              </div>
           </div>

           {/* Official DepEd Header (Print Only) */}
           <div className="hidden print:flex flex-col items-center text-center mb-12 border-b-2 border-black pb-12 text-black">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Department_of_Education.svg/1200px-Department_of_Education.svg.png" className="w-20 mb-4 opacity-80" alt="DepEd Logo" referrerPolicy="no-referrer" />
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-400">Republic of the Philippines</p>
              <p className="text-base font-black uppercase text-slate-900 mt-1">Department of Education</p>
              <h1 className="text-2xl font-black text-rose-600 uppercase italic tracking-tighter mt-4 leading-none">School Form 8 (SF8)</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">(Nutritional Status Record)</p>
              
              <div className="grid grid-cols-3 w-full mt-8 text-[10px] font-black uppercase gap-y-4 px-2">
                 <div className="text-left">
                   <p>Region: {section?.region}</p>
                   <p>Division: {section?.division}</p>
                   <p>District: {section?.district}</p>
                 </div>
                 <div className="text-center">
                   <p>Grade Level: {section?.gradeLevel}</p>
                   <p>Section: {section?.name}</p>
                 </div>
                 <div className="text-right">
                   <p>School Name: {section?.schoolName}</p>
                   <p>School ID: {section?.schoolId}</p>
                   <p>School Year: {section?.schoolYear}</p>
                 </div>
              </div>
           </div>

           {/* Nutritional Status Summary Table - Official DepEd Style */}
           {viewType === 'section' && stats && (
              <div className="mb-10 text-black">
                <h3 className="text-sm font-black uppercase mb-4 text-center border-y border-black py-2">Summary of Nutritional Status</h3>
                <table className="w-full border-collapse text-[10px] text-black">
                  <thead>
                    <tr className="bg-slate-50">
                      <th rowSpan={2} className="border border-black p-2 text-center uppercase">Nutritional Status</th>
                      <th colSpan={3} className="border border-black p-2 text-center uppercase">BMI-for-Age</th>
                    </tr>
                    <tr className="bg-slate-50">
                      <th className="border border-black p-2 text-center uppercase w-20">Male</th>
                      <th className="border border-black p-2 text-center uppercase w-20">Female</th>
                      <th className="border border-black p-2 text-center uppercase w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Severely Wasted', key: 'SeverelyWasted' },
                      { label: 'Wasted', key: 'Wasted' },
                      { label: 'Normal', key: 'Normal' },
                      { label: 'Overweight', key: 'Overweight' },
                      { label: 'Obese', key: 'Obese' }
                    ].map(row => (
                      <tr key={row.key}>
                        <td className="border border-black p-2 font-bold">{row.label}</td>
                        <td className="border border-black p-2 text-center">{(stats.male as any)[row.key]}</td>
                        <td className="border border-black p-2 text-center">{(stats.female as any)[row.key]}</td>
                        <td className="border border-black p-2 text-center font-black">{(stats.overall as any)[row.key]}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50">
                      <th colSpan={4} className="border border-black p-1 text-left uppercase pl-2 text-[8px]">Height-for-Age (HFA)</th>
                    </tr>
                    {[
                      { label: 'Severely Stunted', key: 'SevStunted' },
                      { label: 'Stunted', key: 'Stunted' },
                      { label: 'Normal', key: 'NormalHFA' },
                      { label: 'Tall', key: 'Tall' }
                    ].map(row => (
                      <tr key={row.key}>
                        <td className="border border-black p-2 font-bold">{row.label}</td>
                        <td className="border border-black p-2 text-center">{(stats.male as any)[row.key]}</td>
                        <td className="border border-black p-2 text-center">{(stats.female as any)[row.key]}</td>
                        <td className="border border-black p-2 text-center font-black">{(stats.overall as any)[row.key]}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-black">
                      <td className="border border-black p-2 uppercase">Total Screened</td>
                      <td className="border border-black p-2 text-center">{stats.male.count}</td>
                      <td className="border border-black p-2 text-center">{stats.female.count}</td>
                      <td className="border border-black p-2 text-center">{stats.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
           )}

           {viewType === 'consolidated' ? (
             <div className="space-y-8">
               <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm print:border-black">
                 <table className="w-full text-left border-collapse text-[10px] text-black">
                   <thead className="bg-slate-50 print:bg-white text-black">
                     <tr className="border-b border-slate-200">
                       <th rowSpan={2} className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest print:border print:border-black">Section</th>
                       <th rowSpan={2} className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest print:border print:border-black">Sex</th>
                       <th colSpan={5} className="px-2 py-2 text-center font-black text-slate-400 uppercase tracking-widest print:border print:border-black border-l">BMI-for-Age</th>
                       <th colSpan={4} className="px-2 py-2 text-center font-black text-slate-400 uppercase tracking-widest print:border print:border-black border-l">HFA</th>
                       <th rowSpan={2} className="px-4 py-4 text-center font-black text-slate-400 uppercase tracking-widest print:border print:border-black border-l">Total</th>
                     </tr>
                     <tr className="border-b border-slate-200">
                       <th className="px-1 py-1 text-center text-[7px] uppercase border-l">Normal</th>
                       <th className="px-1 py-1 text-center text-[7px] uppercase">Wasted</th>
                       <th className="px-1 py-1 text-center text-[7px] uppercase">Sev.W</th>
                       <th className="px-1 py-1 text-center text-[7px] uppercase">Over.</th>
                       <th className="px-1 py-1 text-center text-[7px] uppercase">Obese</th>
                       <th className="px-1 py-1 text-center text-[7px] uppercase border-l">Normal</th>
                       <th className="px-1 py-1 text-center text-[7px] uppercase">Stunted</th>
                       <th className="px-1 py-1 text-center text-[7px] uppercase">Sev.S</th>
                       <th className="px-1 py-1 text-center text-[7px] uppercase">Tall</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 print:divide-black text-black">
                     {consolidatedStatsBySection.map((row) => (
                       <React.Fragment key={row.sectionName}>
                         <tr className="hover:bg-slate-50/30 transition-colors">
                           <td rowSpan={2} className="px-4 py-3 text-xs font-black text-slate-900 uppercase tracking-tight print:border print:border-black">{row.sectionName}</td>
                           <td className="px-4 py-2 font-black text-blue-600 print:border print:border-black">M</td>
                           <td className="px-1 py-2 text-center border-l print:border print:border-black">{row.male.Normal}</td>
                           <td className="px-1 py-2 text-center print:border print:border-black">{row.male.Wasted}</td>
                           <td className="px-1 py-2 text-center print:border print:border-black">{row.male.SeverelyWasted}</td>
                           <td className="px-1 py-2 text-center print:border print:border-black">{row.male.Overweight}</td>
                           <td className="px-1 py-2 text-center print:border print:border-black">{row.male.Obese}</td>
                           <td className="px-1 py-2 text-center border-l print:border print:border-black">{row.male.NormalHFA}</td>
                           <td className="px-1 py-2 text-center print:border print:border-black">{row.male.Stunted}</td>
                           <td className="px-1 py-2 text-center print:border print:border-black">{row.male.SevStunted}</td>
                           <td className="px-1 py-2 text-center print:border print:border-black">{row.male.Tall}</td>
                           <td className="px-4 py-2 text-center border-l font-black print:border print:border-black">{row.male.total}</td>
                         </tr>
                         <tr className="hover:bg-slate-50/30 transition-colors bg-slate-50/10">
                           <td className="px-4 py-2 font-black text-rose-600 print:border print:border-black border-t">F</td>
                           <td className="px-1 py-2 text-center border-l border-t print:border print:border-black">{row.female.Normal}</td>
                           <td className="px-1 py-2 text-center border-t print:border print:border-black">{row.female.Wasted}</td>
                           <td className="px-1 py-2 text-center border-t print:border print:border-black">{row.female.SeverelyWasted}</td>
                           <td className="px-1 py-2 text-center border-t print:border print:border-black">{row.female.Overweight}</td>
                           <td className="px-1 py-2 text-center border-t print:border print:border-black">{row.female.Obese}</td>
                           <td className="px-1 py-2 text-center border-l border-t print:border print:border-black">{row.female.NormalHFA}</td>
                           <td className="px-1 py-2 text-center border-t print:border print:border-black">{row.female.Stunted}</td>
                           <td className="px-1 py-2 text-center border-t print:border print:border-black">{row.female.SevStunted}</td>
                           <td className="px-1 py-2 text-center border-t print:border print:border-black">{row.female.Tall}</td>
                           <td className="px-4 py-2 text-center border-l border-t font-black print:border print:border-black">{row.female.total}</td>
                         </tr>
                       </React.Fragment>
                     ))}
                     <tr className="bg-slate-900 text-white font-black print:bg-white print:text-black">
                       <td colSpan={2} className="px-4 py-3 text-[10px] uppercase tracking-widest print:border print:border-black">Grand Total</td>
                       <td className="px-1 py-2 text-center border-l print:border print:border-black">{totalConsolidatedStats.male.Normal + totalConsolidatedStats.female.Normal}</td>
                       <td className="px-1 py-2 text-center print:border print:border-black">{totalConsolidatedStats.male.Wasted + totalConsolidatedStats.female.Wasted}</td>
                       <td className="px-1 py-2 text-center print:border print:border-black">{totalConsolidatedStats.male.SeverelyWasted + totalConsolidatedStats.female.SeverelyWasted}</td>
                       <td className="px-1 py-2 text-center print:border print:border-black">{totalConsolidatedStats.male.Overweight + totalConsolidatedStats.female.Overweight}</td>
                       <td className="px-1 py-2 text-center print:border print:border-black">{totalConsolidatedStats.male.Obese + totalConsolidatedStats.female.Obese}</td>
                       <td className="px-1 py-2 text-center border-l print:border print:border-black">{totalConsolidatedStats.male.NormalHFA + totalConsolidatedStats.female.NormalHFA}</td>
                       <td className="px-1 py-2 text-center print:border print:border-black">{totalConsolidatedStats.male.Stunted + totalConsolidatedStats.female.Stunted}</td>
                       <td className="px-1 py-2 text-center print:border print:border-black">{totalConsolidatedStats.male.SevStunted + totalConsolidatedStats.female.SevStunted}</td>
                       <td className="px-1 py-2 text-center print:border print:border-black">{totalConsolidatedStats.male.Tall + totalConsolidatedStats.female.Tall}</td>
                       <td className="px-4 py-3 text-center border-l bg-white/10 print:border print:border-black">{totalConsolidatedStats.total}</td>
                     </tr>
                   </tbody>
                 </table>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 print:hidden">
                 <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Normal Rate</p>
                   <p className="text-3xl font-black text-emerald-700 italic">
                     {totalConsolidatedStats.total > 0 ? (((totalConsolidatedStats.male.Normal + totalConsolidatedStats.female.Normal) / totalConsolidatedStats.total) * 100).toFixed(1) : '0'}%
                   </p>
                 </div>
                 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col items-center">
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Wasted Rate</p>
                   <p className="text-3xl font-black text-amber-700 italic">
                     {totalConsolidatedStats.total > 0 ? (((totalConsolidatedStats.male.Wasted + totalConsolidatedStats.male.SeverelyWasted + totalConsolidatedStats.female.Wasted + totalConsolidatedStats.female.SeverelyWasted) / totalConsolidatedStats.total) * 100).toFixed(1) : '0'}%
                   </p>
                 </div>
                 <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col items-center">
                   <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">High Risk Rate</p>
                   <p className="text-3xl font-black text-rose-700 italic">
                     {totalConsolidatedStats.total > 0 ? (((totalConsolidatedStats.male.Overweight + totalConsolidatedStats.female.Overweight + totalConsolidatedStats.male.Obese + totalConsolidatedStats.female.Obese) / totalConsolidatedStats.total) * 100).toFixed(1) : '0'}%
                   </p>
                 </div>
                 <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center">
                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Normal HFA Rate</p>
                   <p className="text-3xl font-black text-indigo-700 italic">
                     {totalConsolidatedStats.total > 0 ? (((totalConsolidatedStats.male.NormalHFA + totalConsolidatedStats.female.NormalHFA) / totalConsolidatedStats.total) * 100).toFixed(1) : '0'}%
                   </p>
                 </div>
               </div>

               {schoolStats && (
                 <div className="mb-10 text-black mt-12">
                   <h3 className="text-sm font-black uppercase mb-4 text-center border-y border-black py-2">School-Wide Summary of Nutritional Status</h3>
                   <table className="w-full border-collapse text-[10px] text-black">
                     <thead>
                       <tr className="bg-slate-50">
                         <th rowSpan={2} className="border border-black p-2 text-center uppercase">Nutritional Status</th>
                         <th colSpan={3} className="border border-black p-2 text-center uppercase">BMI-for-Age</th>
                       </tr>
                       <tr className="bg-slate-50">
                         <th className="border border-black p-2 text-center uppercase w-20">Male</th>
                         <th className="border border-black p-2 text-center uppercase w-20">Female</th>
                         <th className="border border-black p-2 text-center uppercase w-20">Total</th>
                       </tr>
                     </thead>
                     <tbody>
                       {[
                         { label: 'Severely Wasted', key: 'SeverelyWasted' },
                         { label: 'Wasted', key: 'Wasted' },
                         { label: 'Normal', key: 'Normal' },
                         { label: 'Overweight', key: 'Overweight' },
                         { label: 'Obese', key: 'Obese' }
                       ].map(row => (
                         <tr key={row.key}>
                           <td className="border border-black p-2 font-bold">{row.label}</td>
                           <td className="border border-black p-2 text-center">{(schoolStats.male as any)[row.key]}</td>
                           <td className="border border-black p-2 text-center">{(schoolStats.female as any)[row.key]}</td>
                           <td className="border border-black p-2 text-center font-black">{(schoolStats.overall as any)[row.key]}</td>
                         </tr>
                       ))}
                       <tr className="bg-slate-50">
                         <th colSpan={4} className="border border-black p-1 text-left uppercase pl-2 text-[8px]">Height-for-Age (HFA)</th>
                       </tr>
                       {[
                         { label: 'Severely Stunted', key: 'SevStunted' },
                         { label: 'Stunted', key: 'Stunted' },
                         { label: 'Normal', key: 'NormalHFA' },
                         { label: 'Tall', key: 'Tall' }
                       ].map(row => (
                         <tr key={row.key}>
                           <td className="border border-black p-2 font-bold">{row.label}</td>
                           <td className="border border-black p-2 text-center">{(schoolStats.male as any)[row.key]}</td>
                           <td className="border border-black p-2 text-center">{(schoolStats.female as any)[row.key]}</td>
                           <td className="border border-black p-2 text-center font-black">{(schoolStats.overall as any)[row.key]}</td>
                         </tr>
                       ))}
                       <tr className="bg-slate-100 font-black">
                         <td className="border border-black p-2 uppercase">Total Screened</td>
                         <td className="border border-black p-2 text-center">{schoolStats.male.count}</td>
                         <td className="border border-black p-2 text-center">{schoolStats.female.count}</td>
                         <td className="border border-black p-2 text-center">{schoolStats.total}</td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
               )}

               <div className="hidden print:block mt-20 pt-10 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-24 text-black text-center">
                    <div>
                      <div className="border-b-2 border-black mb-1 mx-12"></div>
                      <p className="text-[10px] font-black uppercase tracking-widest">School Nurse / Health Provider</p>
                    </div>
                    <div>
                      <div className="border-b-2 border-black mb-1 mx-12"></div>
                      <p className="text-[10px] font-black uppercase tracking-widest">School Head / Principal</p>
                    </div>
                  </div>
               </div>
             </div>
           ) : (
             <div className="space-y-6">
                <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm print:border-black">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 print:bg-white text-black">
                       <tr>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">No.</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">LRN</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">Learner Name</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">Sex</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">Age</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">W (kg)</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">H (cm)</th>
                         <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">BMI</th>
                         <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">BMI-for-Age Status</th>
                         <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest print:border print:border-black print:text-black">HFA Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-black text-black">
                      {filteredData.map((item, idx) => {
                        const { bmi, category } = computeBMI(item.student.weight || 0, item.student.height || 0);
                        const hfaCategory = computeHFA(item.student.age, item.student.height || 0).hfaCategory;
                        return (
                          <tr key={item.student.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-4 py-3 text-xs font-black text-slate-400 italic print:border print:border-black print:text-black">{idx + 1}</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-slate-400 tracking-widest print:border print:border-black print:text-black">{item.student.lrn}</td>
                            <td className="px-4 py-3 print:border print:border-black">
                               <div className="flex flex-col">
                                 <p className="text-sm font-black text-slate-900 uppercase tracking-tight print:text-black">{formatStudentName(item.student)}</p>
                                 {item.student.status === 'Dropped Out' && (
                                   <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest w-fit mt-1">
                                     Dropped {item.student.dropoutDate ? `(${new Date(item.student.dropoutDate).toLocaleDateString(undefined, { month: 'short' })})` : ''}{item.student.dropoutReason ? ` - ${item.student.dropoutReason}` : ''}
                                   </span>
                                 )}
                                 {item.student.status === 'Transferred Out' && (
                                   <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest w-fit mt-1">
                                     Transferred {item.student.dropoutDate ? `(${new Date(item.student.dropoutDate).toLocaleDateString(undefined, { month: 'short' })})` : ''}{item.student.dropoutReason ? ` - ${item.student.dropoutReason}` : ''}
                                   </span>
                                 )}
                               </div>
                            </td>
                            <td className="px-4 py-3 text-center print:border print:border-black">
                               <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.student.sex === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'} print:bg-white print:text-black`}>
                                  {item.student.sex === 'Male' ? 'M' : 'F'}
                               </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs font-bold text-slate-700 print:border print:border-black print:text-black">{item.student.age || '-'}</td>
                            <td className="px-4 py-3 text-center text-xs font-black text-slate-700 print:border print:border-black print:text-black">{item.student.weight || '-'}</td>
                            <td className="px-4 py-3 text-center text-xs font-black text-slate-700 print:border print:border-black print:text-black">{item.student.height || '-'}</td>
                            <td className="px-4 py-3 text-center text-xs font-black text-rose-600 italic print:border print:border-black print:text-black">{bmi || '-'}</td>
                            <td className="px-4 py-3 print:border print:border-black text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                               {category}
                            </td>
                            <td className="px-4 py-3 print:border print:border-black text-[8px] font-black uppercase tracking-widest">
                               {hfaCategory}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="hidden print:block mt-20 pt-10 border-t border-slate-100 text-black">
                  <div className="grid grid-cols-2 gap-24">
                    <div className="text-center">
                      <p className="text-[11px] font-bold mb-1 uppercase underline decoration-2 underline-offset-4">{section?.adviserName || 'Adviser Name'}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest">Class Adviser</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold mb-1 uppercase underline decoration-2 underline-offset-4">{schoolInfo?.headOfSchool || 'School Head Name'}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest">School Head / Principal</p>
                    </div>
                  </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
