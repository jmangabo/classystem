const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf8");

content = content.replace(
  /<img\s+src=\{globalRecentScan\.student\.photo\}\s+alt=\{formatStudentName\(globalRecentScan\.student\)\}\s+className="w-20 h-20 rounded-2xl/g,
  `<img\n                                  src={globalRecentScan.student.photo}\n                                  alt={formatStudentName(globalRecentScan.student)}\n                                  className="w-40 h-40 rounded-3xl`
);

content = content.replace(
  /<div className=\{`w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-sm \$\{globalRecentScan\.student\.sex === 'Female' \? 'bg-rose-500 shadow-rose-100' : 'bg-indigo-500 shadow-indigo-100'\}`\}>\s+\{formatStudentName\(globalRecentScan\.student\)\.charAt\(0\)\}\s+<\/div>/g,
  `<div className={\`w-40 h-40 rounded-3xl flex items-center justify-center font-black text-5xl text-white shadow-sm \${globalRecentScan.student.sex === 'Female' ? 'bg-rose-500 shadow-rose-100' : 'bg-indigo-500 shadow-indigo-100'}\`}>\n                                  {formatStudentName(globalRecentScan.student).charAt(0)}\n                                </div>`
);

fs.writeFileSync("src/App.tsx", content);
console.log("Updated photo size!");
