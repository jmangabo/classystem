const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `<button 
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
          </button>

          <div className="h-4 w-px bg-white/15 hidden md:block"></div>

          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold text-[10px] uppercase tracking-wide shadow flex items-center gap-1.5 transition-all active:scale-95"
          >
            <X size={12} />
            Close Page
          </button>`;

const replacement = `<div className="flex items-center gap-2">
            <button 
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all"
            >
              <Download size={14} /> Excel
            </button>
            <button 
              onClick={exportWord}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all"
            >
              <Download size={14} /> Word
            </button>
            <button 
              onClick={handlePrintCard}
              className="flex items-center gap-2 px-5 py-2 bg-slate-950 hover:bg-black border border-slate-700 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95"
            >
              <Printer size={14} /> Printable
            </button>
            <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block"></div>
            <button 
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wider shadow transition-all active:scale-95"
            >
              <X size={14} /> Close
            </button>
          </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Replaced successfully!");
} else {
  console.log("Target not found!");
}
