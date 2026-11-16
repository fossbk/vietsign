// Matching keeps Vietnamese tones and letters. Search folding must be separate.
function normalizeSignIdentity(value) {
    return String(value ?? '').normalize('NFC').toLocaleLowerCase('vi').trim().replace(/\s+/g, ' ');
}
module.exports = { normalizeSignIdentity };
