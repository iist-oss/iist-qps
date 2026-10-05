import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const supabase = createClient(url, key, { auth: { persistSession: false } });
const worker = `gha-${process.pid}-${randomUUID()}`;
const work = join(process.cwd(), '.qps-worker');
mkdirSync(work, { recursive: true });

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function isPdf(path) {
  const b = readFileSync(path).subarray(0, 5).toString('ascii');
  return b === '%PDF-';
}

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
}

function extractText(path) {
  try { return run('pdftotext', ['-layout', path, '-']).trim(); } catch { return ''; }
}

function ocrFirstPages(path, dir) {
  // Keep OCR bounded: the first three pages are enough for course/exam metadata
  // in the normal IIST paper format and prevents a pathological PDF from
  // consuming a worker indefinitely.
  const prefix = join(dir, 'page');
  run('pdftoppm', ['-f', '1', '-l', '3', '-r', '180', '-jpeg', path, prefix]);
  const pages = [1, 2, 3].map(n => `${prefix}-${String(n).padStart(2, '0')}.jpg`).filter(existsSync);
  let out = '';
  for (const page of pages) {
    try { out += '\n' + run('tesseract', [page, 'stdout', '-l', 'eng', '--psm', '6']); } catch {}
  }
  return out.trim();
}

function safeName(path) { return path.replace(/[^a-zA-Z0-9._-]/g, '_'); }

async function processJob(job) {
  const { data: paper, error: pe } = await supabase.from('papers')
    .select('id,file_path,processing_status,ocr_text,file_hash')
    .eq('id', job.paper_id).single();
  if (pe || !paper) throw new Error(`Paper ${job.paper_id} not found`);

  const dir = join(work, String(job.id));
  mkdirSync(dir, { recursive: true });
  const local = join(dir, safeName(paper.file_path.split('/').pop() || 'paper.pdf'));
  try {
    const parts = paper.file_path.split('/');
    const objectPath = parts[0] === 'unapproved' ? parts.slice(1).join('/') : paper.file_path;
    const { data, error } = await supabase.storage.from('unapproved').download(objectPath);
    if (error || !data) throw new Error(error?.message || 'Unable to download source PDF');
    writeFileSync(local, Buffer.from(await data.arrayBuffer()));

    if (job.job_type === 'validate_pdf') {
      if (!isPdf(local)) throw new Error('File does not have a valid PDF magic header');
      const hash = sha256(local);
      const { data: dup } = await supabase.from('papers').select('id').eq('file_hash', hash).neq('id', paper.id).eq('is_deleted', false).limit(1);
      if (dup?.length) throw new Error(`Duplicate of paper ${dup[0].id}`);
      await supabase.from('papers').update({ file_hash: hash, processing_status: 'processing', processing_error: '' }).eq('id', paper.id);
      await supabase.rpc('complete_processing_step', { p_job_id: job.id, p_success: true, p_next_job_type: 'ocr', p_error: '' });
      return;
    }

    if (job.job_type === 'ocr') {
      if (!isPdf(local)) throw new Error('PDF validation failed');
      let text = extractText(local);
      if (text.replace(/\s/g, '').length < 40) text = ocrFirstPages(local, dir);
      if (!text.trim()) throw new Error('No text could be extracted from PDF');
      const { error } = await supabase.from('papers').update({ ocr_text: text.slice(0, 500000), processing_status: 'ready_for_review', processed_at: new Date().toISOString(), processing_error: '' }).eq('id', paper.id);
      if (error) throw error;
      await supabase.rpc('complete_processing_step', { p_job_id: job.id, p_success: true, p_next_job_type: null, p_error: '' });
      return;
    }

    throw new Error(`Unsupported job type: ${job.job_type}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const { data: jobs, error } = await supabase.rpc('claim_processing_jobs', { p_worker: worker, p_limit: 5 });
if (error) throw error;
for (const job of jobs ?? []) {
  try { await processJob(job); }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.rpc('complete_processing_step', { p_job_id: job.id, p_success: false, p_next_job_type: null, p_error: msg });
  }
}
