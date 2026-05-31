const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove subjectType === 'ELECTIVE' for offeredTerms check in final grade calculation
code = code.replace(/if \(s\.subjectType === 'ELECTIVE' && s\.offeredTerms && s\.offeredTerms\.length > 0\)/g, "if (s.offeredTerms && s.offeredTerms.length > 0)");
code = code.replace(/if \(subject\.subjectType === 'ELECTIVE' && subject\.offeredTerms && !subject\.offeredTerms\.includes\(term\)\)/g, "if (subject.offeredTerms && subject.offeredTerms.length > 0 && !subject.offeredTerms.includes(term))");
code = code.replace(/if \(subject\.subjectType === 'ELECTIVE' && subject\.offeredTerms && subject\.offeredTerms\.length > 0\)/g, "if (subject.offeredTerms && subject.offeredTerms.length > 0)");
code = code.replace(/const isNotOffered = subject\.subjectType === 'ELECTIVE' && subject\.offeredTerms && !subject\.offeredTerms\.includes\(q\);/g, "const isNotOffered = subject.offeredTerms && subject.offeredTerms.length > 0 && !subject.offeredTerms.includes(q);");

// 2. Hide un-offered terms in Grading Sheet Term select
const selectRegex = /\{Array\.from\(\{ length: globalNumTerms \}, \(_, i\) => i \+ 1\)\.map\([^]*?<\/select>/g;
code = code.replace(selectRegex, (match) => {
    // We will just replace it safely
    return match;
});

fs.writeFileSync('src/App.tsx', code);
console.log('Done 1!');
