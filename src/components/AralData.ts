/**
 * ARAL (Academic Recovery and Accessible Learning) Program Forms Datatypes and Mock Data
 * Following Philippine Department of Education (DepEd) Standards
 */

export type AralRole = 'Admin' | 'ARAL Coordinator' | 'Teacher';

export interface AralSchoolInfo {
  schoolId: string;
  schoolName: string;
  region: string;
  division: string;
  district: string;
  schoolYear: string;
}

export interface AralSection {
  id: string;
  name: string;
  gradeLevel: string;
  subject: string;
  teacherName: string;
  teacherEmail: string;
  learnerIdentified: number;
}

export interface AralLearner {
  id: string;
  lrn: string;
  lastName: string;
  firstName: string;
  middleName: string;
  extension: string; // Jr., III, etc.
  gradeLevel: string; // e.g. "Grade 1", "Grade 7"
  section: string;
  sex: 'Male' | 'Female';
  birthdate: string;
  parentName: string;
  parentContact: string;
  learningNeeds: string; // e.g., "Reading Comprehension", "Fraction Operations"
  initialAssessment: string; // e.g., "Frustrated Reader", "Low numeracy level"
  teacherRecommendation: string; // e.g., "Needs intense remediation in vocabulary"
  status: 'Identified' | 'Enrolled' | 'Completed' | 'Dropped';
  consentSigned: boolean;
  consentSignature?: string; // Base64 data URL for electronic signature
  consentDate?: string;
  preTestScore: number; // Out of 50
  postTestScore: number; // Out of 50
  attendance: { [date: string]: 'Present' | 'Absent' | 'Excused' };
  progressRemarks: {
    [week: number]: {
      competencyId: string;
      intervention: string;
      assessment: string; // e.g. "Satisfactory", "Needs Improvement"
      remarks: string;
    }
  };
  program?: 'Aral Basic' | 'Aral Plus';
}

export interface AralSession {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string; // Reading, Mathematics, Science
  gradeLevel: string;
  section: string;
  competencyId: string;
  activities: string;
  presentCount: number;
  reflection: string;
  challenges: string;
  intervention: string;
  teacherName: string;
}

export interface AralCompetency {
  id: string;
  subject: string;
  gradeLevel: string;
  code: string;
  description: string;
}

// -------------------------------------------------------------
// DEFAULT DEPE-STYLE DATA
// -------------------------------------------------------------

export const DEFAULT_SCHOOL_INFO: AralSchoolInfo = {
  schoolId: "",
  schoolName: "",
  region: "",
  division: "",
  district: "",
  schoolYear: "2026-2027"
};

export const DEFAULT_COMPETENCIES: AralCompetency[] = [];

export const DEFAULT_LEARNERS: AralLearner[] = [];

export const DEFAULT_SESSIONS: AralSession[] = [];

export const DEFAULT_ARAL_SECTIONS: AralSection[] = [];

export const DEFAULT_NOTIFICATIONS: any[] = [];
