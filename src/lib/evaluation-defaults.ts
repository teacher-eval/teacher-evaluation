export const DEFAULT_QUESTIONS = [
  "Subject matter knowledge",
  "Practical application of skills in teaching",
  "Fairness in grading and assessment",
  "Communication and explanation skills",
  "Use of teaching aids/tools",
  "Student engagement and interaction",
  "Timeliness and preparation",
  "Assessment and feedback to students",
  "Professional behavior and attitude",
  "Overall effectiveness as an instructor",
] as const;

export type QuestionItem = {
  id: number;
  questionNo: number;
  questionText: string;
  sortOrder: number;
  isActive: boolean;
};
