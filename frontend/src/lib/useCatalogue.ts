import { useEffect, useState } from "react";
import { fetchCatalogue } from "../api/courses";
import { courseCatalogue } from "../config/courses";
import type { Catalogue } from "./courses";

// One fetch per page load, shared by everything that needs course names (upload page, admin review cards).
let shared: Promise<Catalogue> | null = null;
function load(): Promise<Catalogue> {
  if (!shared) shared = fetchCatalogue().then((db) => ({ ...courseCatalogue, ...db }));
  return shared;
}
/** Call after the catalogue changed (Admin > Courses) so the next reader gets fresh data. */
export function resetCatalogue() { shared = null; }

/** Static fallback first, replaced by the database list when it arrives. */
export function useCatalogue(): Catalogue {
  const [cat, setCat] = useState<Catalogue>(courseCatalogue);
  useEffect(() => {
    let alive = true;
    void load().then((c) => { if (alive) setCat(c); });
    return () => { alive = false; };
  }, []);
  return cat;
}
