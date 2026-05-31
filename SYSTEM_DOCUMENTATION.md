# SYSTEM DOCUMENTATION: CLASS (Centralized Learner Assessment & School System)

## 1. Overview
**CLASS** is an enterprise-grade school management and learning assessment platform designed for educators and school administrators. It streamlines academic workflows, automates official DepEd-style reporting, and ensures data integrity across seasons and school years.

## 2. Core Modules

### A. Student Management
*   **Learner Profile**: Centralized repository for student data (LRN, Gender, Birthdate, etc.).
*   **Permanent Records**: Automated consolidation of academic history into academic records.
*   **Transfer Facility**: Secure migration of student records between sections, grade levels, or schools.

### B. Attendance & Behavior
*   **Daily Attendance Tracker**: Calendar-based interface for recording daily presence, absences, and tardiness.
*   **School Form 2 (SF2)**: Automated generation of monthly attendance reports with statistical tallies.
*   **Observed Values**: Tracking system for Core Values (Maka-Diyos, Makatao, Makakalikasan, Makabansa).

### C. Academic Records
*   **Subject Configuration**: Flexible weighting for Written Works, Performance Tasks, and Quarterly Assessments.
*   **Record Assessment (Gradebook)**: Real-time grade calculation and transmutation engine.
*   **Grading Sheet**: Holistic overview of all subject grades for a section, used for summary reports.

### D. System Administration
*   **School Profile Management**: Configuration of school details, logos, and IDs.
*   **User & Role Management**: Authorization controls for System Admins, School Admins, and Teachers.
*   **School Year/Calendar**: Global control over grading periods, holidays, and active enrollment seasons.

## 3. User Roles & Permissions
| Role | Access Level | Primary Responsibilities |
| :--- | :--- | :--- |
| **System Admin** | Global | Global configuration, tenant management, system-wide settings. |
| **School Admin** | School-Wide | School profile, User (Teacher) registration, assigning advisers. |
| **Teacher** | Section-Specific | Daily attendance, grading, learner enrollment, report generation. |

## 4. Data Workflow
1.  **Setup**: Admin configures School Profile and School Year.
2.  **Registration**: Teachers are registered and assigned to sections.
3.  **Enrollment**: Teachers enroll learners into their respective sections.
4.  **Curriculum**: Subjects are defined with specific grading weights.
5.  **Operations**: Daily recording of attendance and assessment scores.
6.  **Reporting**: Automated generation of SF2 and Grading Summaries.

## 5. Technical Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS.
- **Backend/Database**: Firebase Firestore (Enterprise NoSQL).
- **Security**: Firebase Authentication & Hardened Security Rules.
- **Build System**: Vite.
