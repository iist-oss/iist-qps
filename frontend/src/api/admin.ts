import { supabase } from "../lib/supabase";
import { approveProblems, chunk, findSimilar, formToFields, normCode, type AdminPaper } from "../lib/admin";
import type { FormDetails } from "../lib/upload";

export type AdminList = "pending" | "approved" | "trash";
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const COLS = "id,file_path,from_library,course_code,course_name,year,semester,exam,note,upload_timestamp,approve_status,is_deleted";
export const PAGE_SIZE = 50;

export interface PagedPapers { rows: AdminPaper[]; total: number }

export async function listPapers(list: AdminList, opts: { page?: number; search?: string } = {}): Promise<Result<PagedPapers>> {
  const from = (opts.page ?? 0) * PAGE_SIZE;
  let q = supabase.from("papers").select(COLS, { count: "exact" }).range(from, from + PAGE_SIZE - 1);
  if (list === "pending") q = q.eq("approve_status", false).eq("is_deleted", false).order("upload_timestamp", { ascending: true });
  else if (list === "approved") q = q.eq("approve_status", true).eq("is_deleted", false).order("upload_timestamp", { ascending: false });
  else q = q.eq("is_deleted", true).order("upload_timestamp", { ascending: false });
  const term = (opts.search ?? "").replace(/[%,()*\\"']/g, " ").replace(/\s+/g, " ").trim();
  if (term !== "") {
    const idPart = /^#?\d{1,9}$/.test(term) ? `,id.eq.${term.replace("#", "")}` : "";
    q = q.or(`course_code.ilike.%${term}%,course_name.ilike.%${term}%,note.ilike.%${term}%${idPart}`);
  }
  const { data, error, count } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { rows: (data ?? []) as AdminPaper[], total: count ?? (data ?? []).length } };
}

export async function countPending(): Promise<number> {
  const { count, error } = await supabase.from("papers").select("id", { count: "exact", head: true })
    .eq("approve_status", false).eq("is_deleted", false);
  return error ? 0 : count ?? 0;
}

export async function listSameCourseYear(code: string, year: number): Promise<AdminPaper[]> {
  const { data, error } = await supabase.from("papers").select(COLS)
    .eq("course_code", code).eq("year", year).eq("is_deleted", false).limit(50);
  return error ? [] : ((data ?? []) as AdminPaper[]);
}

export async function listByCourseCodes(codes: string[]): Promise<AdminPaper[]> {
  const uniq = [...new Set(codes.filter((c) => c !== ""))];
  if (uniq.length === 0) return [];
  const { data, error } = await supabase.from("papers").select(COLS)
    .in("course_code", uniq).eq("is_deleted", false).limit(2000);
  return error ? [] : ((data ?? []) as AdminPaper[]);
}

export async function signedPdfUrl(filePath: string): Promise<Result<string>> {
  const i = filePath.indexOf("/");
  if (i < 0) return { ok: false, error: "Bad file path." };
  const { data, error } = await supabase.storage.from(filePath.slice(0, i)).createSignedUrl(filePath.slice(i + 1), 600);
  if (error || !data) return { ok: false, error: error?.message ?? "Could not open the file." };
  return { ok: true, data: data.signedUrl };
}

interface Envelope<T> { status: "success" | "error"; message: string; data: T }

async function call<T>(name: string, body: unknown): Promise<Result<T>> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let msg = error.message;
    const ctx = (error as unknown as { context?: { json?: () => Promise<Envelope<unknown>> } }).context;
    if (ctx && typeof ctx.json === "function") {
      try { const j = await ctx.json(); if (j && typeof j.message === "string" && j.message) msg = j.message; } catch {  }
    }
    return { ok: false, error: msg };
  }
  const env = data as Envelope<T> | null;
  if (!env || env.status === "error") return { ok: false, error: env?.message ?? "Unexpected reply from the server." };
  return { ok: true, data: env.data };
}

export interface EditFields {
  course_code: string; course_name: string; year: number; exam: string; semester: string; note: string;
}

export const savePaper = (id: number, fields: EditFields, approve: boolean, replace: number[]) =>
  call<AdminPaper>("approve-paper", { id, ...fields, approve_status: approve, replace });

export interface DeleteReport { id: number; status: string; message: string }
export const deletePapers = (ids: number[], mode: "soft" | "restore" | "hard") =>
  call<DeleteReport[]>("delete-paper", { ids, mode });

export async function deleteMany(ids: number[], mode: "soft" | "restore" | "hard"): Promise<Result<DeleteReport[]>> {
  const all: DeleteReport[] = [];
  for (const part of chunk(ids, 100)) {
    const r = await deletePapers(part, mode);
    if (r.ok) all.push(...r.data);
    else if (all.length === 0) return r;
    else all.push(...part.map((id) => ({ id, status: "error", message: r.error })));
  }
  return { ok: true, data: all };
}

export const notifyChanged = () => window.dispatchEvent(new Event("qps:papers-changed"));

export type AutoApprove = { approved: true } | { approved: false; reason: string };

export async function autoApprove(id: number, form: FormDetails): Promise<AutoApprove> {
  const problems = approveProblems(form, new Date().getFullYear());
  if (problems.length > 0) return { approved: false, reason: problems[0] };
  const code = normCode(form.course_code);
  const year = Number(form.year);
  const similar = findSimilar({ id, course_code: code, year, exam: form.exam, semester: form.semester, note: form.note },
    await listSameCourseYear(code, year));
  if (similar.length > 0) return { approved: false, reason: `possible duplicate of #${similar[0].id}` };
  const r = await savePaper(id, formToFields(form), true, []);
  return r.ok ? { approved: true } : { approved: false, reason: r.error };
}
