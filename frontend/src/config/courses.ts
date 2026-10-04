// FALLBACK catalogue (code -> name), used when the database list cannot be loaded. The live list is the `courses`
// table (migration 0010): it fills itself when papers are approved and admins can paste lists in Admin > Courses.
// Source: the B.Tech curriculum list. Semester 1 is complete; add later semesters below as you get them.
export const courseCatalogue: Record<string, string> = {
  // Semester 1
  MA111C: "Calculus",
  PH112C: "Mechanics and Electromagnetism",
  AV111C: "Basic Electrical Engineering",
  ES111H: "Introduction to Space Science",
  CH112H: "Environmental Science and Engineering",
  HS111H: "Communication Skills I",
  AA131V: "Basic Engineering Lab",
};
