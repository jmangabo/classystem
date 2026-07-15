import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, handleFirestoreError } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { School, UserProfile } from '../types';
import { 
  FileText, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Printer, 
  FileSpreadsheet, 
  Loader2, 
  Info, 
  RefreshCw, 
  Search, 
  CheckCircle,
  AlertTriangle,
  User,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  Columns
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx-js-style';

interface SF7ReportViewProps {
  schoolId: string;
  activeSchoolYear: string;
  userProfile: UserProfile | null;
}

export interface TeachingLoad {
  id: string;
  subject: string;
  gradeSection: string;
  timeSchedule: string; // e.g. "08:00 - 09:00 AM"
  days: string; // e.g. "M-F" or "Mon,Wed,Fri"
  minutesPerWeek: number;
}

export interface PersonnelRecord {
  id: string;
  name: string;
  sex: "Male" | "Female";
  fundSource: string; // National, Local, School-Funded
  position: string; // e.g. Teacher I, Master Teacher II
  educationalQualification: string; // e.g. BSEd, MAEd
  major: string;
  minor: string;
  teachingLoads: TeachingLoad[];
  ancillaryAssignment: string; // e.g. Guidance Coordinator, Advisership
  ancillaryMinutesPerWeek: number;
  remarks: string;
}

export const SF7ReportView: React.FC<SF7ReportViewProps> = ({ schoolId, activeSchoolYear, userProfile }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personnelList, setPersonnelList] = useState<PersonnelRecord[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSexFilter, setSelectedSexFilter] = useState<"All" | "Male" | "Female">("All");

  // Manual Editing States
  const [editingPersonnel, setEditingPersonnel] = useState<PersonnelRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLoadSubject, setNewLoadSubject] = useState("");
  const [newLoadSection, setNewLoadSection] = useState("");
  const [newLoadTime, setNewLoadTime] = useState("");
  const [newLoadDays, setNewLoadDays] = useState("");
  const [newLoadMinutes, setNewLoadMinutes] = useState(0);

  // File Uploading & Parsing Mapping States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [isPrintFriendly, setIsPrintFriendly] = useState(false);

  const databaseDocId = `${schoolId}_${activeSchoolYear}`;

  // Fetch School & SF7 data
  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // Get school details
      const schoolRef = doc(db, 'schools', schoolId);
      const schoolSnap = await getDoc(schoolRef);
      if (schoolSnap.exists()) {
        setSchool({ id: schoolSnap.id, ...schoolSnap.data() } as School);
      }

      // Get SF7 records
      const sf7Ref = doc(db, 'sf7_records', databaseDocId);
      const sf7Snap = await getDoc(sf7Ref);
      if (sf7Snap.exists()) {
        const data = sf7Snap.data();
        if (data && Array.isArray(data.personnel)) {
          setPersonnelList(data.personnel);
        } else {
          setPersonnelList([]);
        }
      } else {
        setPersonnelList([]);
      }
    } catch (err) {
      console.error("Error fetching SF7 data", err);
      handleFirestoreError(err, 'get', 'sf7_records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, activeSchoolYear]);

  // Save SF7 data to Firestore
  const saveSF7Records = async (currentList: PersonnelRecord[]) => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const sf7Ref = doc(db, 'sf7_records', databaseDocId);
      await setDoc(sf7Ref, {
        schoolId,
        schoolYear: activeSchoolYear,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.email || 'System User',
        personnel: currentList
      }, { merge: true });
      setPersonnelList(currentList);
      alert("School Form 7 data saved successfully to the cloud!");
    } catch (err) {
      console.error("Error saving SF7 records", err);
      handleFirestoreError(err, 'write', 'sf7_records');
    } finally {
      setSaving(false);
    }
  };

  // Filtered List
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.educationalQualification.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.major.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSex = selectedSexFilter === "All" || p.sex === selectedSexFilter;
      return matchesSearch && matchesSex;
    });
  }, [personnelList, searchQuery, selectedSexFilter]);

  // Statistics Summary
  const statistics = useMemo(() => {
    const total = personnelList.length;
    const male = personnelList.filter(p => p.sex === 'Male').length;
    const female = personnelList.filter(p => p.sex === 'Female').length;

    let totalMinutes = 0;
    let totalAncillaryMinutes = 0;
    personnelList.forEach(p => {
      p.teachingLoads.forEach(l => {
        totalMinutes += l.minutesPerWeek || 0;
      });
      totalAncillaryMinutes += p.ancillaryMinutesPerWeek || 0;
    });

    const averageMinutes = total > 0 ? Math.round(totalMinutes / total) : 0;

    return {
      total,
      male,
      female,
      totalMinutes,
      totalAncillaryMinutes,
      averageMinutes
    };
  }, [personnelList]);

  // Download a Blank Excel Template for Teacher Program Upload
  const downloadTeacherProgramTemplate = () => {
    const templateHeaders = [
      "TeacherName",
      "Sex",
      "FundSource",
      "Designation",
      "Degree",
      "Major",
      "Minor",
      "Subject",
      "GradeAndSection",
      "Days",
      "TimeSchedule",
      "TeachingMinutesPerWeek",
      "AncillaryAssignment",
      "AncillaryMinutesPerWeek",
      "Remarks"
    ];

    const sampleRow1 = [
      "Juan Dela Cruz",
      "Male",
      "National",
      "Teacher III",
      "BSEd",
      "English",
      "",
      "English 7",
      "7-Einstein",
      "M,T,W,Th,F",
      "08:00 - 09:00",
      "300",
      "English Coordinator",
      "120",
      "Class Adviser"
    ];

    const sampleRow2 = [
      "Juan Dela Cruz",
      "Male",
      "National",
      "Teacher III",
      "BSEd",
      "English",
      "",
      "English 8",
      "8-Newton",
      "M,T,W,Th,F",
      "10:15 - 11:15",
      "300",
      "English Coordinator",
      "120",
      "Class Adviser"
    ];

    const sampleRow3 = [
      "Maria Santos",
      "Female",
      "National",
      "Master Teacher I",
      "BSEd, MAEd",
      "Mathematics",
      "General Science",
      "Math 9",
      "9-Galileo",
      "M,T,W,Th,F",
      "09:00 - 10:00",
      "300",
      "Guidance Coordinator",
      "180",
      "SBM Focal Person"
    ];

    const csvContent = [
      templateHeaders.join(","),
      sampleRow1.join(","),
      sampleRow2.join(","),
      sampleRow3.join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `school_form_7_teachers_program_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload and parse the Excel/CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rawJson.length === 0) {
          alert("The uploaded file contains no data.");
          setUploadingFile(false);
          return;
        }

        // Extract raw headers
        const headers = Object.keys(rawJson[0]);
        setSheetHeaders(headers);
        setParsedRows(rawJson);

        // Attempt automated mapping based on column keywords
        const initialMapping: { [key: string]: string } = {};
        const mapKeys = [
          { key: 'name', keywords: ['name', 'teacher', 'personnel', 'employee', 'staff'] },
          { key: 'sex', keywords: ['sex', 'gender', 'm/f'] },
          { key: 'fundSource', keywords: ['fund', 'source', 'fundsource'] },
          { key: 'position', keywords: ['position', 'designation', 'rank', 'title', 'role'] },
          { key: 'educationalQualification', keywords: ['degree', 'qualification', 'educ', 'education'] },
          { key: 'major', keywords: ['major', 'specialization'] },
          { key: 'minor', keywords: ['minor'] },
          { key: 'subject', keywords: ['subject', 'subjectname', 'course', 'subject taught'] },
          { key: 'gradeSection', keywords: ['section', 'grade', 'grade level', 'class', 'gradeandsection'] },
          { key: 'days', keywords: ['days', 'day', 'sched days'] },
          { key: 'timeSchedule', keywords: ['time', 'schedule', 'scheduletime', 'hours'] },
          { key: 'minutesPerWeek', keywords: ['minutes', 'teachingminutes', 'duration', 'minutesperweek'] },
          { key: 'ancillaryAssignment', keywords: ['ancillary', 'other assignment', 'other load', 'coordinating'] },
          { key: 'ancillaryMinutesPerWeek', keywords: ['ancillaryminutes', 'otherminutes', 'ancillary minutes'] },
          { key: 'remarks', keywords: ['remarks', 'remark', 'notes'] }
        ];

        mapKeys.forEach(mk => {
          const match = headers.find(h => 
            mk.keywords.some(keyword => h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(keyword.replace(/\s+/g, '')))
          );
          if (match) {
            initialMapping[mk.key] = match;
          } else {
            initialMapping[mk.key] = "";
          }
        });

        setColumnMapping(initialMapping);
        setShowMappingModal(true);
      } catch (err) {
        console.error("Error parsing file", err);
        alert("Failed to parse the uploaded spreadsheet. Please ensure it is a valid CSV or Excel file.");
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  // Complete Column Mapping and Import Data
  const handleImportParsedData = () => {
    // Validate mapping: Name is absolutely required
    if (!columnMapping['name']) {
      alert("The 'Teacher Name' column mapping is required.");
      return;
    }

    try {
      // Group parsing by Teacher Name
      const teacherGroups: { [teacherName: string]: any } = {};

      parsedRows.forEach((row, idx) => {
        const getVal = (fieldKey: string) => {
          const mappedCol = columnMapping[fieldKey];
          return mappedCol ? String(row[mappedCol] || "").trim() : "";
        };

        const teacherName = getVal('name');
        if (!teacherName) return; // Skip empty rows

        if (!teacherGroups[teacherName]) {
          const sexRaw = getVal('sex').toLowerCase();
          const sex: "Male" | "Female" = sexRaw.startsWith('m') ? "Male" : "Female";

          teacherGroups[teacherName] = {
            id: `imported-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            name: teacherName,
            sex: sex,
            fundSource: getVal('fundSource') || "National",
            position: getVal('position') || "Teacher I",
            educationalQualification: getVal('educationalQualification') || "BSEd",
            major: getVal('major') || "",
            minor: getVal('minor') || "",
            teachingLoads: [],
            ancillaryAssignment: getVal('ancillaryAssignment') || "",
            ancillaryMinutesPerWeek: parseInt(getVal('ancillaryMinutesPerWeek')) || 0,
            remarks: getVal('remarks') || ""
          };
        }

        // Add teaching load if subject or section exists
        const subject = getVal('subject');
        const section = getVal('gradeSection');
        if (subject || section) {
          const schedMinutes = parseInt(getVal('minutesPerWeek')) || 300;
          teacherGroups[teacherName].teachingLoads.push({
            id: `load-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            subject: subject || "General Subject",
            gradeSection: section || "N/A",
            timeSchedule: getVal('timeSchedule') || "N/A",
            days: getVal('days') || "M-F",
            minutesPerWeek: schedMinutes
          });
        }
      });

      const parsedList: PersonnelRecord[] = Object.values(teacherGroups);

      if (parsedList.length === 0) {
        alert("No valid personnel records were parsed with the current mapping.");
        return;
      }

      // Merge with existing list or replace
      const confirmMerge = window.confirm(`Successfully parsed ${parsedList.length} staff members. Do you want to append them to the existing list? Click OK to Append, or Cancel to Overwrite existing records.`);
      
      let newList: PersonnelRecord[] = [];
      if (confirmMerge) {
        // Append: merge matches, insert others
        newList = [...personnelList];
        parsedList.forEach(parsedPerson => {
          const existingIdx = newList.findIndex(ep => ep.name.toLowerCase().trim() === parsedPerson.name.toLowerCase().trim());
          if (existingIdx > -1) {
            // Append teaching loads
            newList[existingIdx].teachingLoads = [...newList[existingIdx].teachingLoads, ...parsedPerson.teachingLoads];
            // Merge metadata if empty
            if (!newList[existingIdx].position) newList[existingIdx].position = parsedPerson.position;
            if (!newList[existingIdx].educationalQualification) newList[existingIdx].educationalQualification = parsedPerson.educationalQualification;
            if (!newList[existingIdx].major) newList[existingIdx].major = parsedPerson.major;
            if (!newList[existingIdx].ancillaryAssignment) {
              newList[existingIdx].ancillaryAssignment = parsedPerson.ancillaryAssignment;
              newList[existingIdx].ancillaryMinutesPerWeek = parsedPerson.ancillaryMinutesPerWeek;
            }
          } else {
            newList.push(parsedPerson);
          }
        });
      } else {
        newList = parsedList;
      }

      setPersonnelList(newList);
      setShowMappingModal(false);
      alert(`Successfully imported ${parsedList.length} personnel. Remember to click "Save to Cloud" to persist changes.`);
    } catch (importErr) {
      console.error("Error importing parsed records", importErr);
      alert("Failed to process and import the spreadsheet data. Please check your mapping configurations.");
    }
  };

  // Open Edit or Add Personnel Modal
  const openPersonnelModal = (record: PersonnelRecord | null = null) => {
    if (record) {
      setEditingPersonnel(JSON.parse(JSON.stringify(record))); // Deep copy
    } else {
      setEditingPersonnel({
        id: `personnel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: "",
        sex: "Male",
        fundSource: "National",
        position: "Teacher I",
        educationalQualification: "",
        major: "",
        minor: "",
        teachingLoads: [],
        ancillaryAssignment: "",
        ancillaryMinutesPerWeek: 0,
        remarks: ""
      });
    }
    setNewLoadSubject("");
    setNewLoadSection("");
    setNewLoadTime("");
    setNewLoadDays("");
    setNewLoadMinutes(0);
    setIsModalOpen(true);
  };

  // Add load to current editing personnel
  const handleAddTeachingLoad = () => {
    if (!newLoadSubject || !newLoadSection) {
      alert("Subject and Grade/Section are required to add a load.");
      return;
    }
    if (!editingPersonnel) return;

    const newLoad: TeachingLoad = {
      id: `load-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      subject: newLoadSubject,
      gradeSection: newLoadSection,
      timeSchedule: newLoadTime || "TBD",
      days: newLoadDays || "M-F",
      minutesPerWeek: Number(newLoadMinutes) || 0
    };

    setEditingPersonnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        teachingLoads: [...prev.teachingLoads, newLoad]
      };
    });

    // Reset load fields
    setNewLoadSubject("");
    setNewLoadSection("");
    setNewLoadTime("");
    setNewLoadDays("");
    setNewLoadMinutes(0);
  };

  // Delete load from current editing personnel
  const handleDeleteTeachingLoad = (loadId: string) => {
    if (!editingPersonnel) return;
    setEditingPersonnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        teachingLoads: prev.teachingLoads.filter(l => l.id !== loadId)
      };
    });
  };

  // Save changes from modal back to state list
  const handleSaveModalPersonnel = () => {
    if (!editingPersonnel) return;
    if (!editingPersonnel.name.trim()) {
      alert("Personnel Name is required.");
      return;
    }

    const updatedList = [...personnelList];
    const index = updatedList.findIndex(p => p.id === editingPersonnel.id);
    if (index > -1) {
      updatedList[index] = editingPersonnel;
    } else {
      updatedList.push(editingPersonnel);
    }

    setPersonnelList(updatedList);
    setIsModalOpen(false);
    setEditingPersonnel(null);
  };

  // Delete a personnel record
  const handleDeletePersonnel = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name} from School Form 7?`)) {
      const updatedList = personnelList.filter(p => p.id !== id);
      setPersonnelList(updatedList);
    }
  };

  // Export populated SF7 to structured, beautiful Excel workbook
  const handleExportSF7Excel = () => {
    if (personnelList.length === 0) {
      alert("No data available to export. Please import some personnel records first.");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      
      // We will build a styled sheet with standard DepEd headers
      const sheetData: any[] = [];

      // Headers
      sheetData.push(["SCHOOL FORM 7 (SF7) - SCHOOL STAFF ASSIGNMENT AND LIST OF PERSONNEL"]);
      sheetData.push([`School ID: ${school?.schoolId || schoolId}`, `School Name: ${school?.name || "N/A"}`, `School Year: ${activeSchoolYear}`]);
      sheetData.push([`Region: ${school?.region || "DepEd"}`, `Division: ${school?.division || "N/A"}`, `District: ${school?.district || "N/A"}`]);
      sheetData.push([]); // blank spacing row

      // Table Header Row
      const tableHeaders = [
        "Name of School Personnel",
        "Sex",
        "Fund Source",
        "Position / Designation",
        "Educational Qualification",
        "Specialization Major",
        "Subjects & Loads (Format: Subject [Grade-Section] Sched [Days] Mins/Wk)",
        "Total Teaching Mins/Wk",
        "Ancillary Assignment",
        "Ancillary Mins/Wk",
        "Remarks"
      ];
      sheetData.push(tableHeaders);

      // Populate personnel rows
      personnelList.forEach(p => {
        // Combine teaching loads into a beautiful scannable string
        const loadsStr = p.teachingLoads.map(l => 
          `${l.subject} (${l.gradeSection}) [${l.timeSchedule} / ${l.days}] - ${l.minutesPerWeek}m`
        ).join(" | ");

        const totalMinutes = p.teachingLoads.reduce((sum, l) => sum + (l.minutesPerWeek || 0), 0);

        sheetData.push([
          p.name,
          p.sex,
          p.fundSource,
          p.position,
          p.educationalQualification,
          p.major,
          loadsStr || "No active teaching loads",
          totalMinutes,
          p.ancillaryAssignment || "None",
          p.ancillaryMinutesPerWeek || 0,
          p.remarks || ""
        ]);
      });

      // Add summary statistics rows
      sheetData.push([]);
      sheetData.push(["SUMMARY STATISTICS"]);
      sheetData.push(["Total Staff Count", statistics.total]);
      sheetData.push(["Male Staff", statistics.male]);
      sheetData.push(["Female Staff", statistics.female]);
      sheetData.push(["Total Teaching Minutes", statistics.totalMinutes]);
      sheetData.push(["Total Ancillary Minutes", statistics.totalAncillaryMinutes]);
      sheetData.push(["Average Teaching Load (Mins/Wk)", statistics.averageMinutes]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Basic styling
      ws['!cols'] = [
        { wch: 28 }, // Name
        { wch: 8 },  // Sex
        { wch: 12 }, // Fund
        { wch: 20 }, // Position
        { wch: 22 }, // Educ
        { wch: 18 }, // Major
        { wch: 45 }, // Loads
        { wch: 18 }, // Mins
        { wch: 22 }, // Ancillary
        { wch: 15 }, // Anc Mins
        { wch: 20 }  // Remarks
      ];

      XLSX.utils.book_append_sheet(wb, ws, "School Form 7");
      XLSX.writeFile(wb, `SF7_School_Staff_Assignment_${schoolId}_${activeSchoolYear}.xlsx`);
    } catch (err) {
      console.error("Error exporting SF7 Excel", err);
      alert("Failed to export SF7 Excel document.");
    }
  };

  // Printing Trigger
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">Loading School Form 7...</p>
      </div>
    );
  }

  return (
    <div className={`p-1 md:p-4 bg-[#f8fafc] text-slate-900 font-sans min-h-screen ${isPrintFriendly ? "print-section bg-white p-0" : ""}`} id="sf7-container-root">
      {/* Top Controls: Hidden in Print */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText size={20} />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              School Form 7 (SF7)
            </h1>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Staff Loads & Program
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            School Staff Assignment and List of Personnel. Upload a Teacher's Program schedule spreadsheet or compile it manually.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Friendly Toggle */}
          <button
            onClick={() => setIsPrintFriendly(!isPrintFriendly)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
              isPrintFriendly 
                ? "bg-slate-900 border-slate-900 text-white" 
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Printer size={13} />
            <span>{isPrintFriendly ? "Interactive View" : "Layout View"}</span>
          </button>

          {/* Download CSV Template */}
          <button
            onClick={downloadTeacherProgramTemplate}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            title="Download blank Teacher's Program schedule template"
          >
            <Download size={13} />
            <span>Download CSV Template</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Upload size={13} />
            <span>Upload Teacher's Program</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />

          {/* Add Manual Button */}
          <button
            onClick={() => openPersonnelModal()}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Plus size={13} />
            <span>Add Personnel</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportSF7Excel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet size={13} />
            <span>Export SF7</span>
          </button>

          {/* Save Button */}
          <button
            onClick={() => saveSF7Records(personnelList)}
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            <span>Save to Cloud</span>
          </button>
        </div>
      </div>

      {/* Sheet Metadata Header Area: Standard DepEd layout */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400">
              LOGO
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                Department of Education
              </h2>
              <h3 className="text-sm font-bold text-slate-800 mt-1">
                {school?.name || "DepEd Public School"}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">
                School ID: {school?.schoolId || schoolId} • School Year: {activeSchoolYear}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-[11px] text-slate-500 font-medium border-l border-slate-100 pl-6">
            <div><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Region:</span> <span className="font-bold text-slate-800">{school?.region || "Region VIII"}</span></div>
            <div><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Division:</span> <span className="font-bold text-slate-800">{school?.division || "Leyte"}</span></div>
            <div><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">District:</span> <span className="font-bold text-slate-800">{school?.district || "Inopacan"}</span></div>
            <div><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Head of School:</span> <span className="font-bold text-slate-800">{school?.headOfSchool || "N/A"}</span></div>
            <div><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Staff Count:</span> <span className="font-bold text-slate-800">{statistics.total}</span></div>
            <div><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Avg Teach Load:</span> <span className="font-bold text-indigo-600">{statistics.averageMinutes}m / wk</span></div>
          </div>
        </div>

        {/* Dynamic Filters and Search: Hidden in Print */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search personnel, designation, major..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-xs font-medium px-9 py-2 rounded-xl outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 font-bold uppercase mr-2">Filter Sex:</span>
            {["All", "Male", "Female"].map((sex) => (
              <button
                key={sex}
                onClick={() => setSelectedSexFilter(sex as any)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                  selectedSexFilter === sex 
                    ? "bg-slate-900 border-slate-900 text-white" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {sex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SF7 Content Table */}
      {filteredPersonnel.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 border border-slate-200/50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <FileText size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Personnel Records</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by uploading your **Teacher's Program** schedule spreadsheet, downloading our template, or manually clicking "Add Personnel".
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={downloadTeacherProgramTemplate}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Download size={13} />
              <span>Get CSV Template</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Upload size={13} />
              <span>Upload Program</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-4 w-[200px]">Name of School Personnel</th>
                  <th className="p-4 w-[60px] text-center">Sex</th>
                  <th className="p-4 w-[90px] text-center">Fund Source</th>
                  <th className="p-4 w-[140px]">Designation / Position</th>
                  <th className="p-4 w-[160px]">Educational Qualification</th>
                  <th className="p-4">Daily Teaching Program / Schedule</th>
                  <th className="p-4 w-[100px] text-center">Teach Mins/Wk</th>
                  <th className="p-4 w-[140px]">Ancillary / Other Load</th>
                  <th className="p-4 w-[90px] text-center">Anc Mins/Wk</th>
                  <th className="p-4 w-[120px] print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredPersonnel.map((p) => {
                  const totalTeachingMinutes = p.teachingLoads.reduce((sum, l) => sum + (l.minutesPerWeek || 0), 0);
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="p-4 font-bold text-slate-900">
                        <div>{p.name}</div>
                        {p.remarks && (
                          <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                            Remarks: {p.remarks}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          p.sex === 'Male' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-pink-50 text-pink-600 border border-pink-100'
                        }`}>
                          {p.sex}
                        </span>
                      </td>
                      <td className="p-4 text-center text-[11px] font-bold text-slate-500">
                        {p.fundSource}
                      </td>
                      <td className="p-4 text-[11px] font-bold text-slate-800">
                        {p.position}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 leading-tight">{p.educationalQualification || "N/A"}</div>
                        {p.major && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Maj: {p.major} {p.minor && `• Min: ${p.minor}`}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {p.teachingLoads.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">No active teaching assignments</span>
                        ) : (
                          <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {p.teachingLoads.map((l) => (
                              <div key={l.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-[11px]">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{l.subject}</span>
                                  <span className="text-slate-400 text-[10px] font-medium mt-0.5">
                                    {l.gradeSection} • {l.days} ({l.timeSchedule})
                                  </span>
                                </div>
                                <span className="bg-indigo-50/80 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">
                                  {l.minutesPerWeek}m
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-800">
                        {totalTeachingMinutes}
                      </td>
                      <td className="p-4 text-slate-650 font-bold text-[11px]">
                        {p.ancillaryAssignment || (
                          <span className="text-slate-350 italic">None</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-650">
                        {p.ancillaryMinutesPerWeek || 0}
                      </td>
                      <td className="p-4 print:hidden">
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openPersonnelModal(p)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                            title="Edit staff load assignment"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePersonnel(p.id, p.name)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                            title="Remove staff record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section/Staff Summary Statistics Panels */}
      {personnelList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="text-slate-400 uppercase text-[9px] font-black tracking-widest">Total Staff</div>
            <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-2">
              <span>{statistics.total}</span>
              <span className="text-xs text-slate-400 font-medium">({statistics.male}M / {statistics.female}F)</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Registered DepEd educators</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="text-slate-400 uppercase text-[9px] font-black tracking-widest">Total Weekly Teaching Minutes</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{statistics.totalMinutes}m</div>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Active classroom instruction load</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="text-slate-400 uppercase text-[9px] font-black tracking-widest">Total Ancillary Load</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{statistics.totalAncillaryMinutes}m</div>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Advisership & coordinating roles</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm animate-pulse-slow">
            <div className="text-slate-400 uppercase text-[9px] font-black tracking-widest">Average Teacher Load</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{statistics.averageMinutes}m / wk</div>
            <p className="text-[10px] text-indigo-400 mt-1 font-semibold">Recommended load: 300m - 360m</p>
          </div>
        </div>
      )}

      {/* Column Mapping Modal for uploaded spreadsheet */}
      <AnimatePresence>
        {showMappingModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Columns size={18} className="text-indigo-600" />
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                    Map Teacher's Program Columns
                  </h3>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-full uppercase">
                  {parsedRows.length} Rows Imported
                </span>
              </div>

              <div className="p-6 max-h-[480px] overflow-y-auto custom-scrollbar">
                <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3.5 mb-5 flex gap-3 text-xs text-amber-800 font-medium">
                  <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-bold">Column Mapping Required:</span> To successfully compile the official School Form 7, map the variables in your uploaded spreadsheet to the fields recognized by our system.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Mapping Fields */}
                  {[
                    { key: 'name', label: 'Teacher Name *', required: true },
                    { key: 'sex', label: 'Sex / Gender' },
                    { key: 'fundSource', label: 'Fund Source (e.g. National)' },
                    { key: 'position', label: 'Designation / Rank' },
                    { key: 'educationalQualification', label: 'Educational Degree' },
                    { key: 'major', label: 'Major Specialization' },
                    { key: 'minor', label: 'Minor Specialization' },
                    { key: 'subject', label: 'Subject Name' },
                    { key: 'gradeSection', label: 'Grade & Section' },
                    { key: 'days', label: 'Schedule Days (e.g. M-F)' },
                    { key: 'timeSchedule', label: 'Schedule Time' },
                    { key: 'minutesPerWeek', label: 'Teaching Minutes / Wk' },
                    { key: 'ancillaryAssignment', label: 'Ancillary Assignment' },
                    { key: 'ancillaryMinutesPerWeek', label: 'Ancillary Minutes' },
                    { key: 'remarks', label: 'Remarks / Notes' }
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {field.label}
                      </label>
                      <select
                        value={columnMapping[field.key] || ""}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                        className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="">-- Do Not Import / Select Column --</option>
                        {sheetHeaders.map((header) => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportParsedData}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle size={14} />
                  <span>Import Records</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Personnel Modal */}
      <AnimatePresence>
        {isModalOpen && editingPersonnel && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-indigo-600" />
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                    {editingPersonnel.name ? `Edit Staff Assignment: ${editingPersonnel.name}` : "Add New School Staff / Personnel"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-800 text-sm font-black uppercase tracking-wider p-2"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Metadata Fields */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      value={editingPersonnel.name}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, name: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="e.g. Maria Clara Santos"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Sex</label>
                    <select
                      value={editingPersonnel.sex}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, sex: e.target.value as any })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none focus:bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fund Source</label>
                    <input
                      type="text"
                      value={editingPersonnel.fundSource}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, fundSource: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none focus:bg-white"
                      placeholder="e.g. National"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Designation / Position</label>
                    <input
                      type="text"
                      value={editingPersonnel.position}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, position: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none focus:bg-white"
                      placeholder="e.g. Teacher I / Master Teacher I"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Educational Qualification</label>
                    <input
                      type="text"
                      value={editingPersonnel.educationalQualification}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, educationalQualification: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none"
                      placeholder="e.g. BSEd"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Specialization Major</label>
                    <input
                      type="text"
                      value={editingPersonnel.major}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, major: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none"
                      placeholder="e.g. English"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Specialization Minor</label>
                    <input
                      type="text"
                      value={editingPersonnel.minor}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, minor: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none"
                      placeholder="e.g. Biology"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ancillary Assignment</label>
                    <input
                      type="text"
                      value={editingPersonnel.ancillaryAssignment}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, ancillaryAssignment: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none"
                      placeholder="e.g. LIS Coordinator"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ancillary Mins/Wk</label>
                    <input
                      type="number"
                      value={editingPersonnel.ancillaryMinutesPerWeek}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, ancillaryMinutesPerWeek: Number(e.target.value) })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-3">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Remarks</label>
                    <input
                      type="text"
                      value={editingPersonnel.remarks}
                      onChange={e => setEditingPersonnel({ ...editingPersonnel, remarks: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2 rounded-lg outline-none"
                      placeholder="e.g. Active adviser of 7-Einstein"
                    />
                  </div>
                </div>

                {/* Sub teaching loads list */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1">
                    <BookOpen size={12} />
                    <span>Teaching Program Loads ({editingPersonnel.teachingLoads.length})</span>
                  </h4>

                  {/* Add New Teaching Load Subform */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-slate-50/50 border border-slate-200/50 p-3 rounded-xl mb-4">
                    <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                      <input
                        type="text"
                        placeholder="Subject (e.g. Math 7)"
                        value={newLoadSubject}
                        onChange={e => setNewLoadSubject(e.target.value)}
                        className="bg-white border border-slate-200 text-xs font-semibold p-1.5 rounded-lg outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        placeholder="Section (e.g. 7-Einstein)"
                        value={newLoadSection}
                        onChange={e => setNewLoadSection(e.target.value)}
                        className="bg-white border border-slate-200 text-xs font-semibold p-1.5 rounded-lg outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        placeholder="Sched (e.g. 08:00-09:00)"
                        value={newLoadTime}
                        onChange={e => setNewLoadTime(e.target.value)}
                        className="bg-white border border-slate-200 text-xs font-semibold p-1.5 rounded-lg outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        placeholder="Days (e.g. M-F)"
                        value={newLoadDays}
                        onChange={e => setNewLoadDays(e.target.value)}
                        className="bg-white border border-slate-200 text-xs font-semibold p-1.5 rounded-lg outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-row flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="Mins"
                          value={newLoadMinutes || ""}
                          onChange={e => setNewLoadMinutes(Number(e.target.value))}
                          className="bg-white border border-slate-200 text-xs font-semibold p-1.5 rounded-lg outline-none w-20"
                        />
                        <button
                          type="button"
                          onClick={handleAddTeachingLoad}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active Loads list */}
                  {editingPersonnel.teachingLoads.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 italic py-4">
                      No teaching program loads mapped to this educator. Use the quick fields above to assign grade-level courses.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {editingPersonnel.teachingLoads.map((load) => (
                        <div key={load.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-2.5 shadow-xs">
                          <div>
                            <span className="font-bold text-slate-800">{load.subject}</span>
                            <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                              Class: {load.gradeSection} • Days: {load.days} • Time: {load.timeSchedule}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">
                              {load.minutesPerWeek} mins / wk
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeachingLoad(load.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveModalPersonnel}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Save size={14} />
                  <span>Save Record</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
