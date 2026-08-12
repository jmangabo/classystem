const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf8");

content = content.replace(
  /className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner border-4 border-slate-100 relative shrink-0"/g,
  `className="w-full max-w-sm sm:max-w-md aspect-square rounded-2xl overflow-hidden bg-black shadow-inner border-4 border-slate-100 relative shrink-0 mx-auto"`
);

// also limit the max width of the wrapper buttons
content = content.replace(
  /className="flex justify-center gap-2 w-full mb-4"/g,
  `className="flex justify-center gap-2 w-full max-w-sm sm:max-w-md mx-auto mb-4"`
);

// and manual entry
content = content.replace(
  /className="w-full mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left"/g,
  `className="w-full max-w-sm sm:max-w-md mx-auto mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left"`
);

// I should also ensure that the photo block uses flex-col instead of flex-row so the big photo looks good centered
content = content.replace(
  /<div className="flex gap-4 items-start relative z-10">/g,
  `<div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start relative z-10 text-center sm:text-left">`
);

// the status badge wrapper
content = content.replace(
  /<div className="flex items-center gap-2 flex-wrap">/g,
  `<div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">`
);

fs.writeFileSync("src/App.tsx", content);
console.log("Updated camera size and photo layout!");
