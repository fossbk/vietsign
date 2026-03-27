export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function repairVietnameseMojibake(str: string): string {
  if (!str) return "";

  // Typical mojibake markers when UTF-8 bytes are interpreted as Latin-1.
  const looksBroken = /[ÃÂÄÅ][\x80-\xBF]|á»|áº|â€”|â€œ|â€|�/.test(str);
  if (!looksBroken) return str;

  try {
    const bytes = new Uint8Array(Array.from(str).map((ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return decoded || str;
  } catch {
    return str;
  }
}
