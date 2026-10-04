import { useEffect, useState } from "react";
import { getStats } from "../api/papers";
import { formatCount } from "../lib/papers";

export default function Stats() {
  const [stats, setStats] = useState<{ totalPapers: number; totalCourses: number } | null>(null);
  useEffect(() => { getStats().then(setStats); }, []);
  return (
    <p className="stats">
      Serving <b>{stats ? formatCount(stats.totalPapers) : "…"}</b> question papers across{" "}
      <b>{stats ? formatCount(stats.totalCourses) : "…"}</b> courses
    </p>
  );
}
