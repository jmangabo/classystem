const fs = require('fs');
let code = fs.readFileSync('src/components/SF10View.tsx', 'utf8');

code = code.replace(/calculateGrade\(stud, s, t\)/g, "calculateGrade(stud, s, t as TermNumber)");
code = code.replace(/calculateGrade\(student, subject, t\)/g, "calculateGrade(student, subject, t as TermNumber)");
code = code.replace(/calculateGrade\(student, s, t\)/g, "calculateGrade(student, s, t as TermNumber)");
code = code.replace(/!f\.offeredTerms\.includes\(termNum\)/g, "!f.offeredTerms.includes(termNum as TermNumber)");
code = code.replace(/borderTheme: "all"/g, 'borderTheme: "default"');

fs.writeFileSync('src/components/SF10View.tsx', code);
