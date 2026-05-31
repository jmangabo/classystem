const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const searchGetSubjectFinal = `  const getSubjectFinalGrade = (student: Student, subject: Subject) => {
    if (subject.offeredTerms && subject.offeredTerms.length > 0) {
      const grades = subject.offeredTerms.map(t => getSubjectTermGrade(student, subject, t));
      const valid = grades.filter(g => g > 0);
      return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / subject.offeredTerms.length) : 0;
    }
    const terms = Array.from({ length: numTerms }, (_, i) => (i + 1) as TermNumber);
    const qGrades = terms.map(q => getSubjectTermGrade(student, subject, q));
    const activeQGrades = qGrades.filter(g => g > 0);
    return activeQGrades.length > 0 ? Math.round(activeQGrades.reduce((a, b) => a + b, 0) / numTerms) : 0;
  };`;

const replaceGetSubjectFinal = `  const getSubjectFinalGrade = (student: Student, subject: Subject) => {
    if (subject.offeredTerms && subject.offeredTerms.length > 0) {
      const grades = subject.offeredTerms.map(t => getSubjectTermGrade(student, subject, t));
      const valid = grades.filter(g => g > 0);
      return valid.length === subject.offeredTerms.length ? Math.round(valid.reduce((a, b) => a + b, 0) / subject.offeredTerms.length) : 0;
    }
    const terms = Array.from({ length: numTerms }, (_, i) => (i + 1) as TermNumber);
    const qGrades = terms.map(q => getSubjectTermGrade(student, subject, q));
    const valid = qGrades.filter(g => g > 0);
    return valid.length === numTerms ? Math.round(valid.reduce((a, b) => a + b, 0) / numTerms) : 0;
  };`;

code = code.replace(searchGetSubjectFinal, replaceGetSubjectFinal);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed getSubjectFinal');
