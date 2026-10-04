export type Semester = "" | "odd" | "even";
/** '' | 'midsem' | 'endsem' | 'ct' | 'ct<N>' */
export type Exam = string;
export type ExamFilter = "midsem" | "endsem" | "ct";

/** Row shape returned by the search_papers RPC. */
export interface Paper {
  id: number;
  file_path: string; // "<bucket>/<path>"
  from_library: boolean;
  course_code: string;
  course_name: string;
  year: number;
  semester: Semester;
  exam: Exam;
  note: string;
}
