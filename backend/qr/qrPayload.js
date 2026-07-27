function escapeField(v) {
  return String(v ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|');
}

function unescapeField(v) {
  // Reverse of escapeField for our limited separators.
  return String(v ?? '')
    .replaceAll('\\|', '|')
    .replaceAll('\\\\', '\\');
}

/**
 * Payload format (string-only, scanner-friendly):
 * qr:<company>|<type>|<size>|<weightKg>|<version>|<serial>
 *
 * We intentionally embed human-readable fields so anyone scanning can see details.
 */
function buildFoilQrPayload({ company, type, size, weightKg, version = 1, serial }) {
  const c = escapeField(company);
  const t = escapeField(type);
  const s = escapeField(size);
  const w = escapeField(weightKg);
  const v = escapeField(version);
  const ser = escapeField(serial || '0000');
  return `qr:${c}|${t}|${s}|${w}|${v}|${ser}`;
}

function parseFoilQrPayload(payloadRaw) {
  const payload = String(payloadRaw ?? '').trim();
  if (!payload.startsWith('qr:')) {
    throw new Error('Invalid QR payload prefix');
  }

  // Split by unescaped pipes. We don't have complex escaping needs here; payload is produced by our builder.
  const body = payload.slice(3);
  const parts = body.split('|');
  if (parts.length < 6) {
    throw new Error('Invalid QR payload format');
  }

  const [company, type, size, weightKg, version, serial] = parts;

  return {
    company: unescapeField(company),
    type: unescapeField(type),
    size: unescapeField(size),
    weightKg: Number(unescapeField(weightKg)),
    version: Number(unescapeField(version)),
    serial: unescapeField(serial)
  };
}

module.exports = { buildFoilQrPayload, parseFoilQrPayload };

