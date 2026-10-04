import { useEffect, useState } from "react";
import { fetchCatalogue, type Catalogues } from "../api/courses";
import { courseCatalogue } from "../config/courses";
import type { Catalogue, CatalogueSem } from "./courses";

// The static list is Semester 1 only (see config/courses.ts), so it also gives those courses their semester number.
const staticSems: CatalogueSem = Object.fromEntries(Object.keys(courseCatalogue).map((k) => [k, 1]));

// One fetch per page load, shared by everything that needs course names/semesters (upload page, admin review cards).
let shared: Promise<Catalogues> | null = null;
function load(): Promise<Catalogues> {
  if (!shared) {
    shared = fetchCatalogue().then((db) => ({
      names: { ...courseCatalogue, ...db.names },
      sems: { ...staticSems, ...db.sems },
    }));
  }
  return shared;
}
/** Call after the catalogue changed (Admin > Courses) so the next reader gets fresh data. */
export function resetCatalogue() { shared = null; }

function useShared<T>(initial: T, pick: (c: Catalogues) => T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let alive = true;
    void load().then((c) => { if (alive) setValue(pick(c)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/** Course names (code -> name). Static fallback first, replaced by the database list when it arrives. */
export function useCatalogue(): Catalogue {
  return useShared<Catalogue>(courseCatalogue, (c) => c.names);
}
/** Curriculum semester numbers (code -> 1..12), used to pre-fill odd/even. */
export function useCourseSems(): CatalogueSem {
  return useShared<CatalogueSem>(staticSems, (c) => c.sems);
}
