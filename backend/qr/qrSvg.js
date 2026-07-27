const QRCode = require('qrcode');

// Returns an SVG string that can be embedded/printed.
async function qrPayloadToSvg(payload, { width = 280, margin = 0 } = {}) {
  const text = String(payload ?? '').trim();
  if (!text) throw new Error('QR payload is empty');

  // qrcode supports converting to SVG.
  return QRCode.toString(text, {
    type: 'svg',
    width,
    margin
  });
}

module.exports = { qrPayloadToSvg };

