import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

const MIN_TEXT_CHARS = 40;

export async function readFirstPageText(file: File): Promise<string> {
  // @ts-ignore
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  try {
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const text: string = content.items.map((i: any) => (typeof i.str === "string" ? i.str : "")).join(" ");
    if (text.replace(/\s+/g, "").length >= MIN_TEXT_CHARS) return text;

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return text;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const result = await worker.recognize(canvas);
      return result.data.text;
    } finally {
      await worker.terminate();
    }
  } finally {
    await pdf.destroy();
  }
}
