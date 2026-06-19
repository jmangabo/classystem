import { Student } from "./types";

export const capitalizeName = (str: string) => {
  if (!str) return "";
  return str.toUpperCase();
};

export const capitalizeFirst = (str: string) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const formatStudentName = (student: Student | null | undefined) => {
  if (!student) return "";
  if (student.lastName && student.firstName) {
    const parts = [
      student.lastName + ",",
      student.firstName,
      student.middleName,
      student.extension
    ].filter(Boolean);
    return parts.join(" ").toUpperCase();
  }
  return (student.name || "").toUpperCase();
};

export function isTleSubject(name: string | undefined): boolean {
  if (!name) return false;
  const upper = name.toUpperCase();
  return upper.includes("TLE") || 
         upper.includes("TECHNOLOGY AND LIVELIHOOD") || 
         upper.includes("COMPUTERS SYSTEMS SERVICING") ||
         upper.includes("COOKERY") ||
         upper.includes("BREAD AND PASTRY") ||
         upper.includes("DRESSMAKING") ||
         upper.includes("AGRICULTURAL") ||
         upper.includes("HORTICULTURE");
}

export function getTleDisplayName(name: string | undefined): string {
  if (!name) return "Technology and Livelihood Education (TLE)";
  let specName = name.replace(/^TLE\s*-\s*/i, '').trim();
  // If the specName is already a full title or includes "Technology and Livelihood", strip down redundant prefixes
  specName = specName.replace(/^Technology\s+and\s+Livelihood\s+Education\s*\(?|^\(?TLE\)?/i, '').replace(/^\s*-\s*/, '').replace(/\)$/, '').trim();
  if (specName.toUpperCase() !== 'TLE' && specName) {
    return `Technology and Livelihood Education (TLE - ${specName})`;
  }
  return "Technology and Livelihood Education (TLE)";
}

export const getSubjectSortScore = (name: string): number => {
  if (!name) return 1000;
  
  const orderTemplate = [
    "Language",
    "Reading and Literacy",
    "Filipino",
    "English",
    "Mathematics",
    "Math",
    "Science",
    "Makabansa",
    "Araling Panlipunan (AP)",
    "Araling Panlipunan",
    "AP",
    "Values Education",
    "Edukasyon sa Pagpapakatao (EsP)",
    "Edukasyon sa Pagpapakatao",
    "EsP",
    "GMRC",
    "Good Manners and Right Conduct",
    "Technology and Livelihood Education (TLE)",
    "Technology and Livelihood Education",
    "TLE",
    "Edukasyong Pantahanan at Pangkabuhayan (EPP)",
    "EPP",
    "Edukasyong Pantahanan at Pangkabuhayan",
    "MAPEH",
    "Music and Arts",
    "Physical Education and Health",
    "Music",
    "Arts",
    "Physical Education",
    "PE",
    "Health"
  ];

  const lowerName = name.toLowerCase().trim();
  
  // Exact matches first
  const exactIndex = orderTemplate.findIndex(t => lowerName === t.toLowerCase());
  if (exactIndex !== -1) return exactIndex;

  // Let's try custom strict containment to avoid "Music" matching "Music and Arts" completely
  // If the string starts with or exactly matches parts of our list, but be careful with subset strings.
  const index = orderTemplate.findIndex(t => {
     const tLow = t.toLowerCase();
     return lowerName.includes(tLow); // Only if the actual subject name CONTAINS the template name
  });
  
  if (index !== -1) {
    return index;
  }
  
  // As a fallback, try if the template name contains the given string, but this is risky
  // e.g. "Music" -> "Music and Arts". Let's check for exact word boundary match instead of substring.
  const indexFallback = orderTemplate.findIndex(t => {
     const tLow = t.toLowerCase();
     // match if given lowerName is a standalone word in tLow
     const regex = new RegExp(`\\b${lowerName}\\b`);
     return regex.test(tLow);
  });

  return indexFallback === -1 ? 999 : indexFallback;
};

export function printHTMLContent(html: string) {
  // Pre-process the HTML on the fly to convert premature timeouts for window.close into safe onafterprint triggers.
  // This prevents the print preview container from disappearing or showing blank document errors.
  let processedHTML = html;

  // Pattern 1: setTimeout(function() { window.close(); }, 500); or variations with whitespace
  processedHTML = processedHTML.replace(
    /setTimeout\(\s*function\(\s*\)\s*\{\s*window\.close\(\s*\);?\s*\}\s*,\s*\d+\s*\);?/g,
    "window.onafterprint = function() { window.close(); }; window.onfocus = function() { setTimeout(function() { window.close(); }, 800); };"
  );

  // Pattern 2: setTimeout(() => window.close(), 500) or similar arrow functions
  processedHTML = processedHTML.replace(
    /setTimeout\(\s*\(\s*\)\s*=>\s*\{?\s*window\.close\(\s*\);?\s*\}?\s*,\s*\d+\s*\);?/g,
    "window.onafterprint = function() { window.close(); }; window.onfocus = function() { setTimeout(function() { window.close(); }, 800); };"
  );

  // 1. Try opening a blank window
  let printWindow: Window | null = null;
  try {
    printWindow = window.open("", "_blank");
  } catch (e) {
    console.warn("window.open blocked or failed:", e);
  }

  if (printWindow) {
    try {
      printWindow.document.write(processedHTML);
      printWindow.document.close();
      return;
    } catch (e) {
      console.error("Failed to write to opened window:", e);
      try {
        printWindow.close();
      } catch (_) {}
    }
  }

  // 2. Dynamic Hidden iframe Fallback (No Popup Blockers can block this!)
  console.log("Using hidden iframe printing fallback...");
  let iframe = document.getElementById("robust-print-iframe") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "robust-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.zIndex = "-9999";
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(processedHTML);
    iframeDoc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }, 500);
  } else {
    // Ultimate fallback
    window.print();
  }
}

