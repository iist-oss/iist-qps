import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { splitSlug, trashPath } from "./validate.ts";

export interface Parked {
  filePath: string;
  undo: () => Promise<void>;
}

export async function parkPublicFile(
  db: SupabaseClient, id: number, filePath: string, fromLibrary: boolean,
): Promise<Parked | null> {
  if (fromLibrary) return null;
  const from = splitSlug(filePath);
  if (from.bucket !== "approved") return null;
  const to = { bucket: "unapproved", path: trashPath(id) };
  const { error } = await db.storage.from(from.bucket).move(from.path, to.path, { destinationBucket: to.bucket });
  if (error) throw new Error(`Could not make the file private: ${error.message}`);
  return {
    filePath: `${to.bucket}/${to.path}`,
    undo: async () => {
      const { error: e } = await db.storage.from(to.bucket).move(to.path, from.path, { destinationBucket: from.bucket });
      if (e) console.error(`ROLLBACK FAILED for paper ${id}: ${e.message}`);
    },
  };
}
