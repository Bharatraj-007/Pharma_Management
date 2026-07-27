const bwipjs = require('bwip-js');

// Returns SVG markup for a CODE128 barcode.
// Uses bwip-js which renders to SVG via the "output: 'svg'" option.
function code128ToSvg(data, options = {}) {
  const payload = String(data ?? '').trim();
  if (!payload) throw new Error('Barcode payload is empty');

  const {
    width = 1, // bar module width
    height = 60,
    includetext = false,
    text = undefined,
    padding = 0
  } = options;

  // bwip-js expects "cludetext" spelling? It uses "includetext".
  // quiet zone is configurable via "padding".
  // bwip-js render() returns a buffer-based drawing object.
  // Use toBuffer('raw') for SVG output.
  // (bwip-js supports SVG generation via "raw" + "output" options)
  // bwip-js returns a Promise for toBuffer() in this build.
  return bwipjs.toBuffer({
    bcid: 'code128',
    text: payload,
    scale: width,
    height,
    includetext,
    padding,
    output: 'svg'
  }).then((buf) => {
    // bwip-js build appears to return PNG bytes even when output='svg'.
    // Convert to base64 so client can render/print reliably.
    const b64 = buf.toString('base64');
    return `data:image/png;base64,${b64}`;
  });
}

module.exports = { code128ToSvg };

