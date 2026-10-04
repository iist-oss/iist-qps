import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import { university } from "../config/university";
import { uploadPaper } from "../api/upload";
import { courseCatalogue } from "../config/courses";
import { withCourseName } from "../lib/courses";
import { readFirstPageText } from "../lib/ocr";
import { detailsFromFilename, extractDetails, mergeDetected } from "../lib/autofill";
import {
  EXAM_OPTIONS, SEMESTER_OPTIONS, checkFileBasic, fillBlanks, hasPdfMagic, toForm, validateForm,
  type FormDetails,
} from "../lib/upload";
import type { SemesterValue } from "../lib/autofill";

type Status = "reading" | "ready" | "uploading" | "done" | "rejected";
interface Item {
  key: string;
  file: File;
  status: Status;
  error: string | null;
  form: FormDetails;
}

const autofillOpts = {
  courseCodePattern: university.courseCodePattern,
  semesterAliases: university.semesterAliases,
};

export default function UploadPage() {
  const { user, loading, signIn } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  // OCR runs one file at a time so a phone is not overloaded.
  const ocrChain = useRef<Promise<void>>(Promise.resolve());

  function patch(key: string, change: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)));
  }
  function patchForm(key: string, change: Partial<FormDetails>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, form: { ...it.form, ...change } } : it)));
  }

  async function readPdf(key: string, file: File) {
    try {
      const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
      if (!hasPdfMagic(head)) {
        patch(key, { status: "rejected", error: "This does not look like a real PDF." });
        return;
      }
      let text = "";
      let note: string | null = null;
      try {
        text = await readFirstPageText(file);
      } catch (e) {
        console.error("pdf read", e);
        note = "Could not read this PDF automatically. Please fill in the details.";
      }
      const detected = extractDetails(text, autofillOpts);
      setItems((prev) => prev.map((it) =>
        it.key === key ? { ...it, status: "ready", error: note, form: withCourseName(fillBlanks(it.form, detected), courseCatalogue) } : it));
    } catch (e) {
      console.error("read file", e);
      patch(key, { status: "ready", error: "Could not read this file. Please fill in the details." });
    }
  }

  function addFiles(list: File[]) {
    if (list.length === 0) return;
    const current = itemsRef.current;
    const active = current.filter((i) => i.status !== "done" && i.status !== "rejected").length;
    let room = Math.max(0, university.maxUploadFiles - active);
    const added: Item[] = [];
    let skippedDuplicate = 0;
    let skippedLimit = 0;

    for (const file of list) {
      const dup = [...current, ...added].some((i) => i.file.name === file.name && i.file.size === file.size);
      if (dup) { skippedDuplicate++; continue; }
      const problem = checkFileBasic(file, university.maxFileMiB);
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (problem) {
        added.push({ key, file, status: "rejected", error: problem, form: withCourseName(toForm(detailsFromFilename(file.name, autofillOpts)), courseCatalogue) });
        continue;
      }
      if (room <= 0) { skippedLimit++; continue; }
      room--;
      added.push({ key, file, status: "reading", error: null, form: withCourseName(toForm(detailsFromFilename(file.name, autofillOpts)), courseCatalogue) });
    }

    if (skippedLimit > 0) toast.error(`You can add up to ${university.maxUploadFiles} files at a time. ${skippedLimit} not added.`);
    if (skippedDuplicate > 0) toast(`${skippedDuplicate} file(s) already in the list.`);
    if (added.length === 0) return;

    setItems((prev) => [...prev, ...added]);
    for (const it of added) {
      if (it.status !== "reading") continue;
      ocrChain.current = ocrChain.current.then(() => readPdf(it.key, it.file));
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = ""; // allow picking the same file again
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  async function uploadAll() {
    if (!user) return;
    setBusy(true);
    const nowYear = new Date().getFullYear();
    let okCount = 0;
    let failCount = 0;
    // Snapshot of what is ready now; each file is handled on its own and a failure never stops the rest.
    for (const it of itemsRef.current.filter((i) => i.status === "ready")) {
      const checked = validateForm(it.form, nowYear);
      if (!checked.ok) {
        patch(it.key, { error: checked.errors.join(" ") });
        failCount++;
        continue;
      }
      patch(it.key, { status: "uploading", error: null });
      const result = await uploadPaper(it.file, user.id, checked.value);
      if (result.ok) { patch(it.key, { status: "done", error: null }); okCount++; }
      else { patch(it.key, { status: "ready", error: result.error }); failCount++; }
    }
    setBusy(false);
    if (okCount > 0) toast.success(`${okCount} paper(s) submitted for review.`);
    if (failCount > 0) toast.error(`${failCount} file(s) need attention.`);
  }

  if (loading) return <div className="page"><p className="message">Loading…</p></div>;
  if (!user) {
    return (
      <div className="page">
        <h1>Upload question papers</h1>
        <p className="message">Please <button className="link-btn" onClick={signIn}>sign in</button> with your university email to upload papers.</p>
      </div>
    );
  }

  const readyCount = items.filter((i) => i.status === "ready").length;
  const readingCount = items.filter((i) => i.status === "reading").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="page">
      <h1>Upload question papers</h1>
      <p className="subtitle">
        PDF only, up to {university.maxFileMiB} MiB each, {university.maxUploadFiles} files at a time.
        An admin reviews every paper before it appears in search.
      </p>

      <div
        className={`dropzone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p>Drag PDFs here, or</p>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>Choose PDF files</button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={onPick} />
      </div>

      {items.map((it) => <ItemCard key={it.key} item={it} busy={busy} onChange={patchForm} onRemove={removeItem} />)}

      {items.length > 0 && (
        <div className="upload-actions">
          <button type="button" onClick={() => void uploadAll()} disabled={busy || readyCount === 0}>
            {busy ? "Uploading…" : `Upload ${readyCount} paper${readyCount === 1 ? "" : "s"}`}
          </button>
          {readingCount > 0 && <span className="muted">Reading {readingCount} PDF{readingCount === 1 ? "" : "s"}…</span>}
          {doneCount > 0 && <span className="muted">{doneCount} submitted</span>}
        </div>
      )}
    </div>
  );
}

function ItemCard(props: {
  item: Item;
  busy: boolean;
  onChange: (key: string, change: Partial<FormDetails>) => void;
  onRemove: (key: string) => void;
}) {
  const { item, busy, onChange, onRemove } = props;
  const { key, file, status, error, form } = item;
  const editable = status === "ready" || status === "reading";
  const id = (name: string) => `${name}-${key}`;

  return (
    <div className={`upload-card status-${status}`}>
      <div className="upload-card-head">
        <b className="file-name" title={file.name}>{file.name}</b>
        <span className="muted">{(file.size / (1024 * 1024)).toFixed(1)} MiB</span>
        {status !== "uploading" && (
          <button type="button" className="link-btn" onClick={() => onRemove(key)} disabled={busy && status === "ready"}>
            {status === "done" ? "Dismiss" : "Remove"}
          </button>
        )}
      </div>

      {status === "reading" && <p className="muted">Reading the PDF to fill in details…</p>}
      {status === "uploading" && <p className="muted">Uploading…</p>}
      {status === "done" && <p className="ok-text">Submitted for review.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {editable && (
        <div className="upload-fields">
          <label htmlFor={id("code")}>Course code</label>
          <input id={id("code")} value={form.course_code} placeholder="e.g. MA111C" autoCapitalize="characters"
            onChange={(e) => onChange(key, { course_code: e.target.value })} />

          <label htmlFor={id("name")}>Course name (optional)</label>
          <input id={id("name")} value={form.course_name} placeholder="e.g. Calculus"
            onChange={(e) => onChange(key, { course_name: e.target.value })} />

          <label htmlFor={id("year")}>Year</label>
          <input id={id("year")} value={form.year} inputMode="numeric" maxLength={4} placeholder="e.g. 2023"
            onChange={(e) => onChange(key, { year: e.target.value.replace(/\D/g, "") })} />

          <label htmlFor={id("exam")}>Exam</label>
          <select id={id("exam")} value={form.exam} onChange={(e) => onChange(key, { exam: e.target.value })}>
            {EXAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label htmlFor={id("sem")}>Semester</label>
          <select id={id("sem")} value={form.semester}
            onChange={(e) => onChange(key, { semester: e.target.value as SemesterValue })}>
            {SEMESTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label htmlFor={id("note")}>Note (optional)</label>
          <input id={id("note")} value={form.note} maxLength={200} placeholder="e.g. Slot A"
            onChange={(e) => onChange(key, { note: e.target.value })} />
        </div>
      )}
    </div>
  );
}
