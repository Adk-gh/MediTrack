// frontend/src/utils/pdfDownload.js
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Save or share a generated jsPDF document.
 *
 * jsPDF's doc.save() works by programmatically clicking a hidden
 * <a download> link, which relies on the browser's own download
 * handling. That mechanism doesn't exist inside a Capacitor WebView
 * (no download manager, no "Save As" dialog), so on the mobile app it
 * silently does nothing (or throws) instead of producing a file.
 *
 * On native platforms we instead write the PDF to the filesystem and
 * hand it to the OS's native share sheet, where the user can save it
 * to Files, send it via a messaging app, print it, etc. On web/desktop
 * we keep the normal browser download behavior unchanged.
 *
 * @param {import('jspdf').jsPDF} doc - the generated jsPDF instance
 * @param {string} filename - e.g. "Dela_Cruz_Juan_MedicalCertificate.pdf"
 */
export async function savePdf(doc, filename) {
  if (!Capacitor.isNativePlatform()) {
    // Web / desktop build (or the app opened in a regular browser tab):
    // unchanged behavior.
    doc.save(filename);
    return;
  }

  try {
    // jsPDF can emit the PDF directly as a base64 data URI; we just need
    // the base64 payload after the comma to hand to Filesystem.writeFile.
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.split(',')[1];

    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache, // temp storage; fine since we hand it off via Share immediately
    });

    await Share.share({
      title: filename,
      url: written.uri,
      dialogTitle: 'Save or share PDF',
    });
  } catch (err) {
    console.error('[pdfDownload] Native save/share failed:', err);
    throw err; // let the caller's existing try/catch show the "PDF generation failed" alert
  }
}