// Foil barcode format (CODE128 payload + label parsing)
// Example: BLISTER-10CM-14KG-1001-V1
//
// Segments:
// - type: BLISTER / ALUALU / WRAPPER / POUCH / LAMINATED / ROLL (etc)
// - size: 10CM (kept as-is)
// - weight: 14KG (numeric part only used)
// - serial: 1001 (4-digit-ish, but treated as string)
// - version: V1

function normalizeString(v) {
  return String(v ?? "").trim();
}

function parseFoilBarcode(barcodeRaw) {
  const barcode = normalizeString(barcodeRaw);

  // Allow either "KG" uppercase or "kg"; allow optional serial length.
  const re = /^([A-Z]+)-([0-9]+(?:\.[0-9]+)?[A-Z]+)-([0-9]+(?:\.[0-9]+)?)KG-([0-9]+)-V([0-9]+)$/i;
  const m = barcode.match(re);
  if (!m) {
    throw new Error(`Invalid foil barcode format: ${barcode}`);
  }

  return {
    type: m[1].toUpperCase(),
    size: m[2].toUpperCase(),
    weightKg: Number(m[3]),
    serial: m[4],
    version: Number(m[5])
  };
}

function formatFoilBarcode({ type, size, weightKg, serial, version }) {
  const t = normalizeString(type).toUpperCase();
  const s = normalizeString(size).toUpperCase();
  const w = Number(weightKg);
  const ser = normalizeString(serial);
  const v = Number(version);

  if (!t || !s || !Number.isFinite(w) || !ser || !Number.isFinite(v)) {
    throw new Error("Missing fields for formatFoilBarcode");
  }

  // Keep the same pattern as the example
  return `${t}-${s}-${w}KG-${ser}-V${v}`;
}

function getLabelFieldsFromFoilBarcode(barcodeRaw) {
  const parsed = parseFoilBarcode(barcodeRaw);
  return {
    type: parsed.type,
    size: parsed.size,
    weightKg: parsed.weightKg,
    version: parsed.version,
    serial: parsed.serial
  };
}

module.exports = {
  parseFoilBarcode,
  formatFoilBarcode,
  getLabelFieldsFromFoilBarcode
};

