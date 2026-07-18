import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('teacher'), // e.g. system_admin, admin, teacher, school_head, cashier
  name: text('name').default(''),
  approvalStatus: text('approval_status').notNull().default('approved'), // approved, pending, rejected
  schoolId: text('school_id').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Schools Table
export const schools = pgTable('schools', {
  id: serial('id').primaryKey(),
  schoolId: text('school_id').notNull().unique(),
  name: text('name').notNull(),
  address: text('address').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Sections Table
export const sections = pgTable('sections', {
  id: serial('id').primaryKey(),
  sectionId: text('section_id').notNull().unique(),
  gradeLevel: text('grade_level').notNull(),
  name: text('name').notNull(),
  schoolId: text('school_id').notNull(),
  adviserEmail: text('adviser_email').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Students Table
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull().unique(),
  lrn: text('lrn').notNull(),
  name: text('name').notNull(),
  gender: text('gender').notNull(), // male, female
  sectionId: text('section_id').notNull(),
  schoolId: text('school_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Subjects Table
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  subjectId: text('subject_id').notNull().unique(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  gradeLevel: text('grade_level').notNull(),
  sectionId: text('section_id').notNull(),
  schoolId: text('school_id').notNull(),
  teacherEmail: text('teacher_email').default(''),
  isCore: boolean('is_core').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Attendance Table
export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').notNull(), // present, absent, tardy
  term: integer('term').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. ARAL Classes Table
export const aralClasses = pgTable('aral_classes', {
  id: serial('id').primaryKey(),
  classId: text('class_id').notNull().unique(),
  name: text('name').notNull(),
  coordinatorEmail: text('coordinator_email').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations Definitions
export const usersRelations = relations(users, ({ many }) => ({
  attendance: many(attendance),
}));

export const studentsRelations = relations(students, ({ one }) => ({
  section: one(sections, {
    fields: [students.sectionId],
    references: [sections.sectionId],
  }),
}));

export const sectionsRelations = relations(sections, ({ many }) => ({
  students: many(students),
  subjects: many(subjects),
}));
