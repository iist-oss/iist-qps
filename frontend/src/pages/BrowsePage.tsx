import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBrowseCourses, type BrowseCourse } from "../api/browse";
import { useCatalogue, useCourseSems } from "../lib/useCatalogue";
import { lookupCourseName, lookupCourseSem } from "../lib/courses";

export default function BrowsePage() {
  const [courses, setCourses] = useState<BrowseCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const catalogue = useCatalogue();
  const sems = useCourseSems();

  useEffect(() => {
    let alive = true;
    void fetchBrowseCourses().then((r) => {
      if (!alive) return;
      if (r.error) setError("Could not load the course list. Please try again."); else setCourses(r.courses);
    });
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map<number | null, Array<BrowseCourse & { title: string }>>();
    for (const c of courses ?? []) {
      const title = lookupCourseName(c.code, catalogue) || c.name;
      if (q !== "" && !`${c.code} ${title}`.toLowerCase().includes(q)) continue;
      const sem = lookupCourseSem(c.code, sems, catalogue);
      const list = map.get(sem) ?? [];
      list.push({ ...c, title });
      map.set(sem, list);
    }
    return [...map.entries()].sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a - b));
  }, [courses, filter, catalogue, sems]);

  return (
    <div className="page">
      <h1>Browse by course</h1>
      <p className="subtitle">Every course that has at least one paper. Tap a course to see its papers.</p>
      <input className="course-filter" value={filter} onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by code or name" aria-label="Filter courses" />
      {error && <p className="form-error" role="alert">{error}</p>}
      {courses === null && !error && <p className="message">Loading…</p>}
      {courses !== null && groups.length === 0 && <p className="message">No courses found.</p>}
      {groups.map(([sem, list]) => (
        <section key={sem ?? "other"}>
          <h2 className="browse-heading">{sem === null ? "Other courses" : `Semester ${sem}`}</h2>
          {list.map((c) => (
            <Link key={c.code} className="upload-card course-row browse-row" to={`/?query=${encodeURIComponent(c.code)}`}>
              <span><b>{c.code}</b> {c.title}</span>
              <span className="muted">{c.count} paper{c.count === 1 ? "" : "s"}</span>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}
