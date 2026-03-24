import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_VOICE, voiceOptions } from "./constants";
import { TextSegment } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Serialize Mongoose documents to plain JSON objects (strips ObjectId, Date, etc.)
export const serializeData = <T>(data: T): T =>
  JSON.parse(JSON.stringify(data));

// Auto generate slug from title (preserves decimal/version segments)
export function generateSlug(text: string): string {
  return text
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both ends
    .replace(/[^\w\s-]/g, "") // Remove special characters (keep letters, numbers, spaces, hyphens)
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

// Generate slug for filenames (removes file extensions like .pdf, .txt, etc.)
export function generateFilenameSlug(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "") // Remove file extension (.pdf, .txt, etc.)
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both ends
    .replace(/[^\w\s-]/g, "") // Remove special characters (keep letters, numbers, spaces, hyphens)
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

// Escape regex special characters to prevent ReDoS attacks
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Splits text content into segments for MongoDB storage and search
export const splitIntoSegments = (
  text: string,
  segmentSize: number = 500, // Maximum words per segment
  overlapSize: number = 50, // Words to overlap between segments for context
): TextSegment[] => {
  // Validate parameters to prevent infinite loops
  if (segmentSize <= 0) {
    throw new Error("segmentSize must be greater than 0");
  }
  if (overlapSize < 0 || overlapSize >= segmentSize) {
    throw new Error("overlapSize must be >= 0 and < segmentSize");
  }

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const segments: TextSegment[] = [];

  let segmentIndex = 0;
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + segmentSize, words.length);
    const segmentWords = words.slice(startIndex, endIndex);
    const segmentText = segmentWords.join(" ");

    segments.push({
      text: segmentText,
      segmentIndex,
      wordCount: segmentWords.length,
    });

    segmentIndex++;

    if (endIndex >= words.length) break;
    startIndex = endIndex - overlapSize;
  }

  return segments;
};

// Get voice data by persona key or voice ID
export const getVoice = (persona?: string) => {
  if (!persona) return voiceOptions[DEFAULT_VOICE];

  // Find by voice ID
  const voiceEntry = Object.values(voiceOptions).find((v) => v.id === persona);
  if (voiceEntry) return voiceEntry;

  // Find by key
  const voiceByKey = voiceOptions[persona as keyof typeof voiceOptions];
  if (voiceByKey) return voiceByKey;

  // Default fallback
  return voiceOptions[DEFAULT_VOICE];
};

// Format duration in seconds to MM:SS format
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

let pdfjsLibCache: typeof import("pdfjs-dist") | null = null;
async function getPdfjsLib() {
  if (pdfjsLibCache) return pdfjsLibCache;

  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
  }

  pdfjsLibCache = pdfjsLib;
  return pdfjsLib;
}

export async function parsePDFFile(file: File) {
  let pdfDocument: any;

  try {
    const pdfjsLib = await getPdfjsLib();
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF once
    pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // --- Cover image: render at 1x (not 2x) for speed ---
    const firstPage = await pdfDocument.getPage(1);
    const viewport = firstPage.getViewport({ scale: 0.5 }); // 1x is fast; bump to 1.5 only if quality matters

    // Create a fresh canvas for this invocation to avoid race conditions
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Could not get canvas context");

    await firstPage.render({
      canvas,
      context,
      viewport,
    }).promise;

    const coverDataURL = canvas.toDataURL("image/jpeg", 0.7); // JPEG is ~3x smaller/faster than PNG

    const segments: TextSegment[] = [];
    let globalSegmentIndex = 0;

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .filter((item: any) => "str" in item)
        .map((item: any) => (item as { str: string }).str)
        .join(" ");

      const pageSegments = splitIntoSegments(pageText, 500, 50);
      pageSegments.forEach((seg) => {
        seg.pageNumber = pageNum;
        seg.segmentIndex = globalSegmentIndex++;
      });
      segments.push(...pageSegments);
    }

    return { content: segments, cover: coverDataURL };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error(
      `Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    // Ensure PDF document resources are always cleaned up
    if (pdfDocument) {
      await pdfDocument.destroy();
    }
  }
}
