export type Semester = "" | "odd" | "even";
export type Exam = string;
export type ExamFilter = "midsem" | "endsem" | "ct" | "lab" | "assignment";

export interface Paper {
  id: number;
  file_path: string;
  from_library: boolean;
  course_code: string;
  course_name: string;
  year: number;
  semester: Semester;
  exam: Exam;
  note: string;
}
