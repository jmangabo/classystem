import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Student, Section, Subject, TermNumber } from '../types';
import { X, Printer, Download, BookOpen, Loader2 } from 'lucide-react';
import { formatStudentName } from '../utils';
import { calculateGrade } from '../lib/calculations';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface SF10ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  allEnrollments: { student: Student; section: Section }[];
  schoolCalendar: any[];
}

export const SF10ReportModal: React.FC<SF10ReportModalProps> = ({
  isOpen,
  onClose,
  student,
  allEnrollments,
  schoolCalendar
}) => {
  const printableRef = useRef<HTMLDivElement>(null);
  const [enrollmentsWithSubjects, setEnrollmentsWithSubjects] = useState<{ student: Student; section: Section; subjects: Subject[] }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchSubjects = async () => {
      setLoading(true);
      const results: { student: Student; section: Section; subjects: Subject[] }[] = [];
      
      try {
        for (const enroll of allEnrollments) {
          const subjectsRef = collection(db, `sections/${enroll.section.id}/subjects`);
          const snapshot = await getDocs(subjectsRef);
          const subjects = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
          results.push({ ...enroll, subjects });
        }
        setEnrollmentsWithSubjects(results);
      } catch (err) {
        console.error("Error fetching subjects for SF10: ", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubjects();
  }, [isOpen, allEnrollments]);

  const numTerms = useMemo(() => {
    if (!schoolCalendar || schoolCalendar.length === 0) return 4;
    const terms = schoolCalendar.map(c => parseInt(c.term) || 0);
    return Math.max(...terms, 4);
  }, [schoolCalendar]);

  const handlePrint = () => {
    if (!printableRef.current) return;
    const printContents = printableRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>SF10 Learner's Permanent Academic Record - ${formatStudentName(student)}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              *, *:before, *:after { box-sizing: border-box; }
              body {
                font-family: 'Inter', Arial, sans-serif;
                font-size: 10px;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-container {
                width: 100%;
                max-width: 100%;
              }
              h1, h2, h3, h4, p { margin: 0; padding: 0; }
              
              /* Header */
              .header { text-align: center; margin-bottom: 20px; }
              .header-title { font-size: 14px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; }
              .header-sub { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #333; }
              .sf10-label { font-size: 16px; font-weight: 900; margin-top: 10px; }

              /* Learner Info Box */
              .info-box {
                border: 2px solid #000;
                padding: 8px;
                margin-bottom: 15px;
              }
              .info-row { display: flex; flex-wrap: wrap; margin-bottom: 4px; }
              .info-item { margin-right: 15px; display: flex; align-items: baseline; }
              .info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #444; margin-right: 4px; }
              .info-value { font-size: 10px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #000; padding: 0 4px; min-width: 50px; }

              /* Academic Record Section */
              .record-section {
                margin-bottom: 20px;
                page-break-inside: avoid;
              }
              .record-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f1f5f9;
                border: 2px solid #000;
                border-bottom: none;
                padding: 6px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 0;
              }
              th, td {
                border: 2px solid #000;
                padding: 4px;
                text-align: center;
                font-size: 10px;
              }
              th {
                background-color: #e2e8f0 !important;
                font-weight: 800;
                text-transform: uppercase;
              }
              td.text-left { text-align: left; font-weight: 700; }
              .font-bold { font-weight: 800; }
              
              .cert-box {
                border: 2px solid #000;
                border-top: none;
                padding: 8px;
                display: flex;
                justify-content: space-between;
              }
              .cert-item { text-align: center; width: 45%; }
              .cert-label { font-size: 8px; font-weight: 600; text-transform: uppercase; margin-bottom: 15px; }
              .cert-sig { border-bottom: 1px solid #000; width: 100%; height: 15px; }
              .cert-role { font-size: 9px; font-weight: 800; margin-top: 2px; }

            </style>
          </head>
          <body>
            <div class="print-container">
              ${printContents}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!isOpen) return null;

  // Sort enrollments by school year (oldest to newest)
  const sortedEnrollments = [...enrollmentsWithSubjects].sort((a, b) => {
    return (a.section.schoolYear || "").localeCompare(b.section.schoolYear || "");
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Permanent Record (SF10)</h2>
              <p className="text-xs text-slate-500 font-medium">Learner's Permanent Academic Record</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              <Printer size={16} />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div 
            ref={printableRef}
            className="max-w-[800px] mx-auto bg-white p-8 rounded shadow-md border border-slate-200"
            style={{ fontFamily: "'Inter', sans-serif", color: "#000" }}
          >
            {/* Header */}
            <div className="header">
              <p className="header-sub">Republic of the Philippines • Department of Education</p>
              <h1 className="sf10-label">LEARNER'S PERMANENT ACADEMIC RECORD (SF10)</h1>
            </div>

            {/* Learner Info Box */}
            <div className="info-box text-[10px]">
              <div className="info-row">
                <div className="info-item">
                  <span className="info-label">Last Name:</span>
                  <span className="info-value">{student.lastName || "-"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">First Name:</span>
                  <span className="info-value">{student.firstName || "-"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Middle Name:</span>
                  <span className="info-value">{student.middleName || "-"}</span>
                </div>
              </div>
              <div className="info-row mt-2">
                <div className="info-item">
                  <span className="info-label">LRN:</span>
                  <span className="info-value font-mono tracking-widest">{student.lrn || "-"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Date of Birth:</span>
                  <span className="info-value">{student.birthdate || "-"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Sex:</span>
                  <span className="info-value">{student.sex || "-"}</span>
                </div>
              </div>
              <div className="info-row mt-2">
                <div className="info-item">
                  <span className="info-label">Eligibility:</span>
                  <span className="info-value">{student.eligibility?.type || "Elementary School Completer"}</span>
                </div>
                {student.eligibility?.elemSchoolName && (
                  <div className="info-item">
                    <span className="info-label">School:</span>
                    <span className="info-value">{student.eligibility.elemSchoolName}</span>
                  </div>
                )}
                {student.eligibility?.genAvg && (
                  <div className="info-item">
                    <span className="info-label">Gen. Avg:</span>
                    <span className="info-value">{student.eligibility.genAvg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Academic Records by Enrollment */}
            {sortedEnrollments.length === 0 ? (
              <div className="text-center py-10 italic text-slate-500 text-xs">No academic records found.</div>
            ) : (
              sortedEnrollments.map((enrollment, idx) => {
                const { student: enrolledStudent, section, subjects } = enrollment;
                
                // Only show subjects that have grades
                const gradedSubjects = subjects.filter(s => {
                  const grades = enrolledStudent.grades?.[s.id];
                  if (!grades) return false;
                  return ([1, 2, 3, 4] as TermNumber[]).some(term => {
                    const t = grades[term];
                    return t && ((t.writtenWorks?.scores?.length || 0) > 0 || (t.performanceTasks?.scores?.length || 0) > 0 || (t.summativeTests?.scores?.length || 0) > 0 || (t.termExam?.score !== undefined && t.termExam?.score >= 0));
                  });
                });

                let totalFinalGrades = 0;
                let validSubjectsCount = 0;

                return (
                  <div key={idx} className="record-section">
                    <div className="record-header">
                      <div>
                        <span>School: <span style={{borderBottom: '1px solid #000'}}>{section.schoolName || "-"}</span></span>
                        <span style={{marginLeft: '15px'}}>School ID: <span style={{borderBottom: '1px solid #000'}}>{section.schoolId || "-"}</span></span>
                      </div>
                      <div>
                        <span>Grade & Section: <span style={{borderBottom: '1px solid #000'}}>{Number(section.gradeLevel) === 0 ? "Kindergarten" : `Grade ${section.gradeLevel}`} - {section.name}</span></span>
                        <span style={{marginLeft: '15px'}}>School Year: <span style={{borderBottom: '1px solid #000'}}>{section.schoolYear || "-"}</span></span>
                      </div>
                    </div>
                    
                    <table>
                      <thead>
                        <tr>
                          <th rowSpan={2} style={{ width: '40%' }}>Learning Areas</th>
                          <th colSpan={4}>Quarterly Rating</th>
                          <th rowSpan={2} style={{ width: '12%' }}>Final Rating</th>
                          <th rowSpan={2} style={{ width: '15%' }}>Remarks</th>
                        </tr>
                        <tr>
                          <th style={{ width: '8%' }}>1</th>
                          <th style={{ width: '8%' }}>2</th>
                          <th style={{ width: '8%' }}>3</th>
                          <th style={{ width: '8%' }}>4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradedSubjects.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center italic" style={{ color: '#666' }}>No graded subjects recorded for this school year.</td>
                          </tr>
                        ) : (
                          gradedSubjects.map(subject => {
                            const q1 = calculateGrade(enrolledStudent, subject, 1).final;
                            const q2 = calculateGrade(enrolledStudent, subject, 2).final;
                            const q3 = calculateGrade(enrolledStudent, subject, 3).final;
                            const q4 = calculateGrade(enrolledStudent, subject, 4).final;
                            
                            const activeQs = [q1, q2, q3, q4].filter(q => q > 0);
                            const finalRating = activeQs.length > 0 ? Math.round(activeQs.reduce((a, b) => a + b, 0) / activeQs.length) : 0;
                            
                            if (finalRating > 0) {
                              totalFinalGrades += finalRating;
                              validSubjectsCount++;
                            }

                            return (
                              <tr key={subject.id}>
                                <td className="text-left">{subject.name}</td>
                                <td>{q1 > 0 ? q1 : ""}</td>
                                <td>{q2 > 0 ? q2 : ""}</td>
                                <td>{q3 > 0 ? q3 : ""}</td>
                                <td>{q4 > 0 ? q4 : ""}</td>
                                <td className="font-bold">{finalRating > 0 ? finalRating : ""}</td>
                                <td className="font-bold" style={{ color: finalRating >= 75 ? '#000' : '#d32f2f' }}>
                                  {finalRating > 0 ? (finalRating >= 75 ? "Passed" : "Failed") : ""}
                                </td>
                              </tr>
                            );
                          })
                        )}
                        {/* General Average Row */}
                        {validSubjectsCount > 0 && (
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <td colSpan={5} className="text-right font-bold uppercase" style={{ paddingRight: '15px' }}>General Average</td>
                            <td className="font-bold text-lg">
                              {Math.round(totalFinalGrades / validSubjectsCount)}
                            </td>
                            <td className="font-bold uppercase" style={{ color: Math.round(totalFinalGrades / validSubjectsCount) >= 75 ? '#000' : '#d32f2f' }}>
                              {Math.round(totalFinalGrades / validSubjectsCount) >= 75 ? "Passed" : "Failed"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    
                    {/* Certification Block per SY */}
                    <div className="cert-box">
                      <div className="cert-item">
                        <div className="cert-label">Prepared by:</div>
                        <div className="cert-sig"></div>
                        <div className="cert-role uppercase">Adviser / Teacher</div>
                      </div>
                      <div className="cert-item">
                        <div className="cert-label">Certified True and Correct:</div>
                        <div className="cert-sig"></div>
                        <div className="cert-role uppercase">School Head / Principal</div>
                      </div>
                    </div>

                  </div>
                );
              })
            )}

            <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '9px', color: '#666', fontWeight: 600 }}>
              NOTE: This is a system-generated Permanent Record (SF10) Learner Profile.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
