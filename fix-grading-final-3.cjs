const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const searchGetSubjectFinal2 = `  const getSubjectFinalGrade = (s: Subject) => {
    if (s.offeredTerms && s.offeredTerms.length > 0) {
      const grades = s.offeredTerms.map(t => getSubjectTermGrade(s, t));
      const valid = grades.filter(g => g > 0);
      return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / s.offeredTerms.length) : 0;
    }
    const q1 = getSubjectTermGrade(s, 1);
    const q2 = getSubjectTermGrade(s, 2);
    const q3 = getSubjectTermGrade(s, 3);
    const q4 = numTerms === 4 ? getSubjectTermGrade(s, 4 as any) : 0;
    
    const activeGrades = [q1, q2, q3];
    if (numTerms === 4) activeGrades.push(q4);
    
    const validGrades = activeGrades.filter(g => g > 0);
    if (validGrades.length === 0) return 0;
    return Math.round(validGrades.reduce((a, b) => a + b, 0) / numTerms);
  };`;

const replaceGetSubjectFinal2 = `  const getSubjectFinalGrade = (s: Subject) => {
    if (s.offeredTerms && s.offeredTerms.length > 0) {
      const grades = s.offeredTerms.map(t => getSubjectTermGrade(s, t));
      const valid = grades.filter(g => g > 0);
      return valid.length === s.offeredTerms.length ? Math.round(valid.reduce((a, b) => a + b, 0) / s.offeredTerms.length) : 0;
    }
    const q1 = getSubjectTermGrade(s, 1);
    const q2 = getSubjectTermGrade(s, 2);
    const q3 = getSubjectTermGrade(s, 3);
    const q4 = numTerms === 4 ? getSubjectTermGrade(s, 4 as any) : 0;
    
    const activeGrades = [q1, q2, q3];
    if (numTerms === 4) activeGrades.push(q4);
    
    const validGrades = activeGrades.filter(g => g > 0);
    if (validGrades.length !== numTerms) return 0;
    return Math.round(validGrades.reduce((a, b) => a + b, 0) / numTerms);
  };`;

code = code.replace(searchGetSubjectFinal2, replaceGetSubjectFinal2);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed getSubjectFinal 2');
