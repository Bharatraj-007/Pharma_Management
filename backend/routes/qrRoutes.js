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

module.exports = router;

