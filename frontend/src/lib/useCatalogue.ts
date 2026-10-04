import { useEffect, useState } from "react";
import { fetchCatalogue, type Catalogues } from "../api/courses";
import { courseCatalogue } from "../config/courses";
import type { Catalogue, CatalogueSem } from "./courses";

const staticSems: CatalogueSem = Object.fromEntries(Object.keys(courseCatalogue).map((k) => [k, 1]));

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
export function resetCatalogue() { shared = null; }

function useShared<T>(initial: T, pick: (c: Catalogues) => T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let alive = true;
    void load().then((c) => { if (alive) setValue(pick(c)); });
    return () => { alive = false; };
  }, []);
  return value;
}

export function useCatalogue(): Catalogue {
  return useShared<Catalogue>(courseCatalogue, (c) => c.names);
}
export function useCourseSems(): CatalogueSem {
  return useShared<CatalogueSem>(staticSems, (c) => c.sems);
}
