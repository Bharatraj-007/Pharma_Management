const express = require('express');
const { qrPayloadToSvg } = require('../qr/qrSvg');

const { parseFoilQrPayload } = require('../qr/qrPayload');

const router = express.Router();

// Builds a supermarket-style foil label that embeds the QR SVG.
function buildFoilLabelSvg({ qrPayload, qrSvg, parsed }) {
  const { company, type, size, weightKg, version, serial } = parsed;

  const fontFamily = 'Arial, Helvetica, sans-serif';
  const w = 600;
  const h = 320;

  const lines = [
    { label: 'Type', value: String(type).toUpperCase() },
    { label: 'Size', value: String(size) },
    { label: 'Weight', value: `${weightKg}KG` },
    { label: 'Version', value: `V${version}` },
    { label: 'Serial', value: String(serial) },
    { label: 'Company', value: String(company) }
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>

  <text x="20" y="40" font-family="${fontFamily}" font-size="20" font-weight="800">FOIL QR LABEL</text>

  <g font-family="${fontFamily}" font-size="16" fill="#111">
    ${lines.map((l, i) => {
      const y = 70 + i * 26;
      return `<text x="20" y="${y}"><tspan font-weight="700">${l.label}:</tspan> ${l.value}</text>`;
    }).join('')}
  </g>

  <g transform="translate(420,85) scale(1)">
    ${qrSvg}
  </g>

  <text x="20" y="${h - 25}" font-family="${fontFamily}" font-size="12" fill="#444">${qrPayload}</text>
</svg>`;
}

router.get('/foil/:qrPayload/label', async (req, res) => {
  try {
    const { qrPayload } = req.params;

    const decoded = decodeURIComponent(qrPayload);
    const parsed = parseFoilQrPayload(decoded);

    const qrSvg = await qrPayloadToSvg(decoded, { width: 160, margin: 1 });

    const svg = buildFoilLabelSvg({ qrPayload: decoded, qrSvg, parsed });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});

// Returns just the QR code as a PNG image (for React Native Image component)
router.get('/foil/:qrPayload/qr.png', async (req, res) => {
  try {
    const decoded = decodeURIComponent(req.params.qrPayload);
    const QRCode = require('qrcode');
    const buffer = await QRCode.toBuffer(decoded, { type: 'png', width: 200, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});

// Returns a standalone print-ready HTML page with ONLY the QR label
router.get('/foil/:qrPayload/print', async (req, res) => {
  try {
    const decoded = decodeURIComponent(req.params.qrPayload);
    const parsed = parseFoilQrPayload(decoded);
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(decoded, { width: 200, margin: 1 });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 80mm 50mm; margin: 2mm; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .label { width: 76mm; border: 2px solid #222; border-radius: 4px; padding: 3mm; display: flex; flex-direction: row; gap: 3mm; }
    .info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 1mm; }
    .info h2 { font-size: 14px; margin-bottom: 2mm; border-bottom: 1px solid #999; padding-bottom: 1mm; }
    .info p { font-size: 11px; line-height: 1.4; }
    .info p strong { font-weight: 700; }
    .qr { display: flex; align-items: center; justify-content: center; }
    .qr img { width: 28mm; height: 28mm; }
    .payload { font-size: 8px; color: #666; margin-top: 1mm; word-break: break-all; }
  </style>
</head>
<body>
  <div class="label">
    <div class="info">
      <h2>FOIL QR LABEL</h2>
      <p><strong>Type:</strong> ${String(parsed.type).toUpperCase()}</p>
      <p><strong>Size:</strong> ${parsed.size}</p>
      <p><strong>Weight:</strong> ${parsed.weightKg} KG</p>
      <p><strong>Serial:</strong> ${parsed.serial}</p>
      <p><strong>Company:</strong> ${parsed.company}</p>
      <p class="payload">${decoded}</p>
    </div>
    <div class="qr">
      <img src="${qrDataUrl}" alt="QR"/>
    </div>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});

module.exports = router;

