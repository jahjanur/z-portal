/**
 * Register Inter (TTF) with jsPDF for the Send Offer PDF.
 *
 * Raw TTF from Google Fonts triggers jsPDF's "No unicode cmap" error inside its
 * PubSub handler (so it never throws to our code) and can leave a broken font
 * that causes "Cannot read properties of undefined (reading 'widths')".
 * We therefore do not register raw TTF here and always use Helvetica.
 *
 * To use Inter: convert the font with the jsPDF font converter
 * (https://raw.githack.com/parallax/jsPDF/master/fontconverter/fontconverter.html),
 * then register the generated script and use that font name instead.
 */
import type { jsPDF } from "jspdf";

/**
 * Returns the font name to use for the Offer PDF. Always "helvetica" so PDF
 * generation never hits jsPDF's TTF/cmap or .widths bugs. Call once after creating the doc.
 */
export async function registerInterFont(_doc: jsPDF): Promise<"Inter" | "helvetica"> {
  return "helvetica";
}
