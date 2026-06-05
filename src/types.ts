/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GradeComponent {
  scores: number[];
  maxScores: number[];
  names?: string[];
}

export interface MonthlyAttendance {
  present: number;
  absent: number;
}

export interface DailyAttendance {
  [day: number]: boolean;
}

export interface TermData {
  writtenWorks: GradeComponent; // Max 5
  performanceTasks: GradeComponent; // Max 5
  summativeTests: GradeComponent; // 2
  termExam: { score: number; maxScore: number }; // 1
}

export type TermNumber = 1 | 2 | 3 | 4;

export type RatedValue = 'AO' | 'SO' | 'RO' | 'NO' | '';

export interface ObservedValues {
  [term: number]: {
    [statementId: string]: RatedValue;
  };
}

export interface Eligibility {
  type?: 'Elementary School Completer' | 'High School Completer' | 'Junior High School Completer' | 'PEPT Passer' | 'ALS A & E Passer' | 'Others';
  genAvg?: string;
  citation?: string;
  elemSchoolName?: string;
  elemSchoolId?: string;
  elemSchoolAddress?: string;
  elemCompletionDate?: string;
  peptRating?: string;
  peptDate?: string;
  alsRating?: string;
  alsCenterInfo?: string;
  othersSpecify?: string;
  hsSchoolName?: string;
  hsSchoolAddress?: string;
  hsCompletionDate?: string;
  jhsSchoolName?: string;
  jhsSchoolAddress?: string;
  jhsCompletionDate?: string;
}

export interface Student {
  id: string;
  name: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  extension?: string;
  studentNumber: string;
  email?: string;
  lrn?: string;
  birthdate?: string;
  birthplace?: string;
  dateOfFirstAttendance?: string;
  age?: number;
  sex?: 'Male' | 'Female';
  address?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianRelationship?: string;
  photo?: string;
  attendance?: {
    [month: string]: MonthlyAttendance;
  };
  dailyAttendance?: {
    [month: string]: DailyAttendance;
  };
  observedValues?: ObservedValues;
  signatures?: {
    [term in TermNumber]?: string;
  };
  publishGrades?: {
    [term in TermNumber]?: boolean;
  };
  parentSignatureEnabled?: {
    [term in TermNumber]?: boolean;
  };
  grades?: {
    [subjectId: string]: {
      [term in TermNumber]?: TermData;
    }
  };
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  nutritionalStatus?: {
    bmiCategory?: string;
    heightForAge?: string;
    weightForAge?: string;
  };
  sf9CardUnlocked?: boolean;
  adviserSignature?: string;
  status?: 'Active' | 'Regular' | 'Irregular' | 'Transferred Out' | 'Dropped Out' | 'Retained' | 'Promoted';
  dropoutDate?: string;
  dropoutReason?: string;
  isTransferredIn?: boolean;
  eligibility?: Eligibility;
}

export interface Subject {
  id: string;
  sectionId?: string;
  group: 
    | 'SHS Core Subjects, Other SHS Academic Electives'
    | 'SHS Field Exposure, Arts Apprenticeship, Creative Production and Innovation'
    | 'SHS Arts, Sports, Health and Wellness Electives'
    | 'SHS Research Electives and Design and Innovation'
    | 'SHS TechPro Electives'
    | 'SHS Work Immersion'
    | 'Revised K-10 Curriculum';
  name: string;
  gradeLevel: number;
  subjectType: 'CORE' | 'ELECTIVE';
  teacherEmail?: string;
  wwWeight: number;
  ptWeight: number;
  taWeight: number;
  order?: number;
  offeredTerms?: TermNumber[];
  finalizedTerms?: TermNumber[];
  isZeroBasedGrading?: boolean;
}

export const DEFAULT_TERM_DATA: TermData = {
  writtenWorks: { scores: [], maxScores: [] },
  performanceTasks: { scores: [], maxScores: [] },
  summativeTests: { scores: [], maxScores: [] },
  termExam: { score: 0, maxScore: 0 }
};

export interface School {
  id?: string;
  name: string;
  schoolId: string;
  headOfSchool: string;
  region?: string;
  division?: string;
  district?: string;
  createdAt?: string;
  isFinalized?: boolean;
}

export interface Section {
  id: string;
  name: string;
  gradeLevel: number;
  adviserName: string;
  adviserEmail?: string;
  createdBy: string;
  region: string;
  division: string;
  district: string;
  schoolName: string;
  schoolId: string;
  schoolYear: string;
  headOfSchool?: string;
  teacherId?: string;
  teacherSubjects?: string[];
  signatureEnabled?: {
    [term in TermNumber]?: boolean;
  };
  deletionStatus?: 'pending' | 'approved' | 'rejected';
  deletionRequestedBy?: string;
  disapprovalReason?: string;
  deletionReason?: string;
  isFinalized?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'system_admin' | 'school_head' | 'guidance_designate';
  displayName?: string;
  lrn?: string; // For student users to link to their record
  schoolId?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  expiresAt?: string;
}

export interface Course {
  name: string;
  code: string;
  instructor: string;
  section: string;
  termWeight: {
    written: number;
    performance: number;
    summative: number;
    exam: number;
  };
}

export interface AnecdotalRecord {
  id: string;
  studentId: string;
  studentName: string;
  sectionId: string;
  sectionName: string;
  subjectId?: string;
  subjectName?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  category: 'behavioral' | 'academic' | 'social' | 'attendance' | 'other';
  observation: string;
  actionTaken: string;
  createdBy: string; // User email or UID
  createdByName?: string; // User display name
  schoolId?: string;
  createdAt: string; // ISO DateTime
  // New fields
  parentConferenceDetails?: string;
  recommendations?: string;
  status?: 'Pending' | 'Ongoing' | 'Resolved';
  guidancePersonnelName?: string;
  documents?: string[];
}

export interface PTAFee {
  id: string;
  name: string;
  amount: number;
  description?: string;
  schoolYear: string;
  semester: '1st Semester' | '2nd Semester' | 'Full Year';
  status: 'active' | 'inactive';
  isVoluntary: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  schoolId: string;
}

export interface PTAPayment {
  id: string;
  studentId: string;
  studentName: string;
  lrn: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: number;
  feeId: string;
  feeName: string;
  amountPaid: number;
  paymentDate: string; // YYYY-MM-DD
  orNumber: string;
  collectorName: string;
  collectorEmail: string;
  schoolYear: string;
  remarks?: string;
  schoolId: string;
  createdAt: string; // ISO DateTime
}

export interface PTAAuditLog {
  id: string;
  actionType: 'fee_setup_create' | 'fee_setup_update' | 'payment_record' | 'payment_void' | 'settlement' | 'system_action';
  details: string;
  performedByEmail: string;
  performedByName: string;
  timestamp: string; // ISO DateTime
  schoolId: string;
}

