/*
  Normalize a Google Drive share link into a file id, then build preview/
  download URLs. Handles the common formats:
    https://drive.google.com/file/d/FILEID/view?usp=sharing
    https://drive.google.com/open?id=FILEID
    https://drive.google.com/uc?id=FILEID
  Also accepts a bare FILEID.
*/
export function driveFileId(url = '') {
  if (!url) return null
  url = url.trim()
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
    /[?&]id=([a-zA-Z0-9_-]{20,})/,
    /^([a-zA-Z0-9_-]{20,})$/
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

// In-site preview (embeddable iframe). Works for PDFs shared "anyone with link".
export function drivePreviewUrl(url) {
  const id = driveFileId(url)
  return id ? `https://drive.google.com/file/d/${id}/preview` : null
}

// Direct open in Drive (fallback / "open externally")
export function driveOpenUrl(url) {
  const id = driveFileId(url)
  return id ? `https://drive.google.com/file/d/${id}/view` : url
}

// Is this a usable drive link?
export function isDriveLink(url) {
  return !!driveFileId(url)
}
