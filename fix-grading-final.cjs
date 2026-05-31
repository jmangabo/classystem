const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const getSubjectFinalGrade = \(student: Student, subject: Subject\) => \{[\s\S]*?const qGrades = terms\.map.*?return activeQGrades.*?0;\n  \};/,
  `const getSubjectFinalGrade = (student: Student, subject: Subject) => {
    if (subject.offeredTerms && subject.offeredTerms.length > 0) {
      const grades = subject.offeredTerms.map(t => getSubjectTermGrade(student, subject, t));
      const valid = grades.filter(g => g > 0);
      return valid.length === subject.offeredTerms.length ? Math.round(valid.reduce((a, b) => a + b, 0) / subject.offeredTerms.length) : 0;
    }
    const terms = Array.from({ length: numTerms }, (_, i) => (i + 1) as TermNumber);
    const qGrades = terms.map(q => getSubjectTermGrade(student, subject, q));
    const valid = qGrades.filter(g => g > 0);
    return valid.length === numTerms ? Math.round(valid.reduce((a, b) => a + b, 0) / numTerms) : 0;
  };`
);

code = code.replace(
  /const getColumnFinalGrade = \(student: Student, col: any\) => \{[\s\S]*?return 0;\n  \};/,
  `const getColumnFinalGrade = (student: Student, col: any) => {
    if (col.type === 'subject') {
      return getSubjectFinalGrade(student, col.subject);
    } else if (col.type === 'mapeh') {
      if (col.subjects && col.subjects.length > 0) {
        const grades = col.subjects.map((s: Subject) => getSubjectFinalGrade(student, s));
        const valid = grades.filter((g: number) => g > 0);
        if (valid.length === col.subjects.length) {
           return Math.round(valid.reduce((a: number, b: number) => a + b, 0) / col.subjects.length);
        } else {
           return 0; // Not all MAPEH components have final grades
        }
      }
      if (col.subject && !col.subject.dummy) {
        return getSubjectFinalGrade(student, col.subject);
      }
    }
    return 0;
  };`
);

code = code.replace(
  /const getStudentGeneralAverage = \(student: Student, term: TermNumber \| 'final'\) => \{[\s\S]*?return grades\.reduce\(\(a, b\) => a \+ b, 0\) \/ relevantColumns\.length;\n  \};/,
  `const getStudentGeneralAverage = (student: Student, term: TermNumber | 'final') => {
    const hasVirtualMapeh = summaryColumns.some(c => c.type === 'mapeh');
    const hasActualMapeh = summaryColumns.some(c => c.name.toLowerCase() === 'mapeh' && c.type === 'subject');
    
    const relevantColumns = summaryColumns.filter(c => {
      if (c.type === 'subject') {
        const s = c.subject;
        const lowerName = s.name.toLowerCase();
        const isComponent = lowerName === 'music' || lowerName === 'arts' || lowerName === 'physical education' || lowerName === 'health' || lowerName === 'music and arts' || lowerName === 'physical education and health';
        
        if (isComponent && (hasVirtualMapeh || hasActualMapeh)) {
           return false;
        }

        if (s.offeredTerms && s.offeredTerms.length > 0) {
          if (term === 'final') return true; 
          return s.offeredTerms.includes(term as TermNumber);
        }
        return true;
      }
      return true;
    });
    
    if (relevantColumns.length === 0) return 0;
    const grades = relevantColumns.map(c => term === 'final' ? getColumnFinalGrade(student, c) : getColumnTermGrade(student, c, term as TermNumber));
    
    if (term === 'final') {
      const valid = grades.filter(g => g > 0);
      if (valid.length < relevantColumns.length) return 0;
      return valid.reduce((a, b) => a + b, 0) / relevantColumns.length;
    } else {
      const offeredGrades = grades.filter(g => g !== -1);
      if (offeredGrades.length === 0) return 0;
      const sum = offeredGrades.filter(g => g > 0).reduce((a, b) => a + b, 0);
      return sum / offeredGrades.length;
    }
  };`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed calculation');
