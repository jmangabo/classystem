const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `<div className="flex bg-white/10 border border-white/15 rounded-full p-0.5 shadow-inner">
            <button 
              onClick={exportExcel}
              className="px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider text-emerald-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
            >
              <Download size={12} /> Excel
            </button>
            <button 
              onClick={exportWord}
              className="px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider text-blue-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
            >
              <Download size={12} /> Word
            </button>
            <div className="w-px h-4 bg-white/20 my-auto mx-1"></div>
            <button 
              onClick={handlePrintCard}
              className="px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider text-amber-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
            >
              <Printer size={12} /> Print
            </button>
          </div>`;

const replacement = `<button 
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 h-10 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
          >
            <Download size={14} /> Excel
          </button>
          <button 
            onClick={exportWord}
            className="flex items-center gap-2 px-4 h-10 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95"
          >
            <Download size={14} /> Word
          </button>
          <button 
            onClick={handlePrintCard}
            className="flex items-center gap-2 px-6 h-10 bg-slate-950 hover:bg-black border border-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all active:scale-95"
          >
            <Printer size={16} /> Printable
          </button>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Replaced successfully!");
} else {
  console.log("Target not found!");
}
