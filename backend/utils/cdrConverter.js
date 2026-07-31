const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const TaskFile = require("../models/TaskFile");

/**
 * Background job to process uploaded .cdr files:
 * Generates/converts to viewable PDF (previewFileUrl) and PNG/JPG (thumbnailUrl).
 */
async function processCdrConversion(taskFileId, filePath, serverBaseUrl) {
  try {
    const taskFile = await TaskFile.findById(taskFileId);
    if (!taskFile) return;

    const absFilePath = path.resolve(filePath);
    if (!fs.existsSync(absFilePath)) {
      taskFile.status = "failed";
      await taskFile.save();
      return;
    }

    const ext = path.extname(absFilePath).toLowerCase();
    const dir = path.dirname(absFilePath);
    const baseName = path.basename(absFilePath, ext);

    const pdfName = `${baseName}_preview_${Date.now()}.pdf`;
    const pngName = `${baseName}_thumb_${Date.now()}.png`;

    const pdfPath = path.join(dir, pdfName);
    const pngPath = path.join(dir, pngName);

    // If file is already PDF or Image, set direct preview links
    if (['.pdf', '.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      const relPath = path.relative(path.resolve('./'), absFilePath).replace(/\\/g, '/');
      taskFile.previewFileUrl = `${serverBaseUrl}/${relPath}`;
      taskFile.thumbnailUrl = `${serverBaseUrl}/${relPath}`;
      taskFile.status = "ready";
      await taskFile.save();
      return;
    }

    // Try Inkscape CLI conversion if available
    const inkscapeCmd = `inkscape "${absFilePath}" --export-filename="${pdfPath}" && inkscape "${absFilePath}" --export-filename="${pngPath}"`;

    exec(inkscapeCmd, async (err) => {
      if (!err && fs.existsSync(pdfPath) && fs.existsSync(pngPath)) {
        const relPdf = path.relative(path.resolve('./'), pdfPath).replace(/\\/g, '/');
        const relPng = path.relative(path.resolve('./'), pngPath).replace(/\\/g, '/');
        taskFile.previewFileUrl = `${serverBaseUrl}/${relPdf}`;
        taskFile.thumbnailUrl = `${serverBaseUrl}/${relPng}`;
        taskFile.status = "ready";
      } else {
        // Fallback: If CLI conversion isn't locally available, set relative original link / PDF fallback
        const relOrig = path.relative(path.resolve('./'), absFilePath).replace(/\\/g, '/');
        taskFile.previewFileUrl = `${serverBaseUrl}/${relOrig}`;
        taskFile.thumbnailUrl = `${serverBaseUrl}/${relOrig}`;
        taskFile.status = "ready";
      }
      await taskFile.save();
    });
  } catch (error) {
    console.error("CDR conversion error for file", taskFileId, error);
    try {
      await TaskFile.findByIdAndUpdate(taskFileId, { status: "failed" });
    } catch {}
  }
}

module.exports = {
  processCdrConversion
};
