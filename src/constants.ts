/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, TermData } from "./types";

export const DEFAULT_TERM_DATA: TermData = {
  writtenWorks: { 
    scores: new Array(5).fill(0), 
    maxScores: new Array(5).fill(0),
    names: ["1", "2", "3", "4", "5"]
  },
  performanceTasks: { 
    scores: new Array(5).fill(0), 
    maxScores: new Array(5).fill(0),
    names: ["1", "2", "3", "4", "5"]
  },
  summativeTests: { 
    scores: new Array(2).fill(0), 
    maxScores: new Array(2).fill(0),
    names: ["1", "2"]
  },
  termExam: { score: 0, maxScore: 0 },
};

export const INITIAL_STUDENTS: Student[] = [
  {
    id: "1",
    name: "John Doe",
    sex: "Male",
    studentNumber: "2023-0001",
    grades: {},
  },
  {
    id: "2",
    name: "Jane Smith",
    sex: "Female",
    studentNumber: "2023-0002",
    grades: {},
  },
];
