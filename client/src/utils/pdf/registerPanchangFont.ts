/**
 * Register Panchang font (normal + bold) with a jsPDF document so setFont('Panchang', ...) works.
 * Font files from src/assets/fonts/. Falls back to default font if registration fails (e.g. OTF not supported).
 */
import type { jsPDF } from "jspdf";

// Vite: ?url returns the resolved public path to the asset
import fontRegularUrl from "../../assets/fonts/Panchang-Regular.otf?url";
import fontBoldUrl from "../../assets/fonts/Panchang-Bold.otf?url";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function registerPanchangFont(doc: jsPDF): Promise<void> {
  try {
    const [regRes, boldRes] = await Promise.all([fetch(fontRegularUrl), fetch(fontBoldUrl)]);
    if (!regRes.ok || !boldRes.ok) throw new Error("Font fetch failed");
    const [regBuf, boldBuf] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()]);
    const regB64 = arrayBufferToBase64(regBuf);
    const boldB64 = arrayBufferToBase64(boldBuf);
    doc.addFileToVFS("Panchang-Regular.otf", regB64);
    doc.addFileToVFS("Panchang-Bold.otf", boldB64);
    doc.addFont("Panchang-Regular.otf", "Panchang", "normal");
    doc.addFont("Panchang-Bold.otf", "Panchang", "bold");
  } catch (e) {
    console.warn("Panchang font registration failed, using default font", e);
  }
}

/** Font family name to use with doc.setFont() after registerPanchangFont. */
export const PANCHANG_FONT = "Panchang";
