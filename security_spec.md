# Firestore Security Specification

## Data Invariants
1. A Student or Subject cannot exist without a parent Section.
2. A User must have a valid role ('admin' or 'teacher').
3. Only an admin can create or delete Users.
4. Only teachers or admins can create Sections.
5. A Teacher can only modify Sections they created.
6. Student score data (`data`) must follow the nested schema structure (checked via validation helper).

## The Dirty Dozen (Test Matrix)
1. **Unauthenticated Write**: Attempt to create a student without login -> DENIED.
2. **Role Spoofing**: A 'teacher' user attempts to update their role to 'admin' -> DENIED.
3. **Orphaned Student**: Create a student with a nonexistent `sectionId` (requires relational sync check) -> DENIED.
4. **Section Hijacking**: Teacher A attempts to edit a section created by Teacher B -> DENIED.
5. **Score Injection**: Injecting a 1MB string into the `lrn` field -> DENIED (size check).
6. **Immutable Field Change**: Attempting to change `createdBy` in a section after creation -> DENIED.
7. **Type Mismatch**: Sending a string for `age` which expects number -> DENIED.
8. **Shadow Fields**: Creating a Student with an extra secret field -> DENIED (keys check).
9. **Cross-Section Student Write**: Teacher A attempts to add a student to Teacher B's section -> DENIED.
10. **Admin Bypass**: User with role 'teacher' trying to read `/users` blanketly -> DENIED.
11. **Negative Weights**: Setting `wwWeight` to -10 -> DENIED.
12. **Malformed ID**: Using a 2KB string as a `studentId` -> DENIED.

## Test Runner (firestore.rules.test.ts)
(To be implemented if testing environment is set up, for now we follow with the DRAFT rules).
