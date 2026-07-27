const express = require('express');
const { code128ToSvg } = require('../barcode/code128Svg');
const { parseFoilBarcode, getLabelFieldsFromFoilBarcode } = require('../barcode/foilBarcode');

const router = express.Router();

function buildLabelSvg({ barcode, labelFields, barcodeDataUri }) {
  // We embed the barcode image as a data URI (PNG base64) inside SVG.
  const { type, size, weightKg, version } = labelFields;

  const lines = [
    { label: 'Type', value: type },
    { label: 'Size', value: size },
    { label: 'Weight', value: `${weightKg}KG` },
    { label: 'Version', value: `V${version}` }
  ];

  const fontFamily = 'Arial, Helvetica, sans-serif';
  const w = 600;
  const h = 260;

  // The barcode image from bwip-js will handle its own sizing.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>

  <text x="20" y="40" font-family="${fontFamily}" font-size="18" font-weight="700">${barcode}</text>

  <g font-family="${fontFamily}" font-size="16" fill="#111">
    ${lines.map((l, i) => {
      const y = 70 + i * 28;
      return `<text x="20" y="${y}"><tspan font-weight="700">${l.label}:</tspan> ${l.value}</text>`;
    }).join('')}
  </g>

  <image x="20" y="175" width="560" height="70" href="${barcodeDataUri}"/>
</svg>`;

  return svg;
}

router.get('/foil/:barcode/label', async (req, res) => {
  try {
    const { barcode } = req.params;
    // Validate format early so we return 400 for invalid payloads.
    const labelFields = getLabelFieldsFromFoilBarcode(barcode);

    const barcodeDataUri = await code128ToSvg(barcode, {
      width: 3,
      height: 60,
      includetext: false,
      padding: 0
    });

    const svg = buildLabelSvg({
      barcode,
      labelFields,
      barcodeDataUri
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});

module.exports = router;

