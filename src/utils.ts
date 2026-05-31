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
