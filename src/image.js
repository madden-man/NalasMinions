// Client-side image compression for staple brand photos.
//
// Photos are stored as base64 data URIs inside the grocery task document
// (option 1: no object storage, the image lives next to its item in
// tommy-data.nalas-minions). That only works if they're small — a full-res
// phone photo is several MB and would blow past the API body limit and bloat
// every /api/tasks load — so fileToThumbnail downscales to a bounded box and
// walks JPEG quality (then dimensions) down until the result fits the byte
// budget. A typical photo lands around 15–60 KB. JPEG rather than WebP
// because Safari's canvas.toDataURL can't encode WebP.

const MAX_DIM = 480 // px, longest edge — plenty for the 44px row thumbnail and hover preview
const MAX_BYTES = 120 * 1024
const QUALITIES = [0.85, 0.7, 0.55, 0.4, 0.3]

// Approximate decoded size (bytes) of a data URI's base64 payload.
export const dataUriBytes = (dataUri) =>
  Math.floor(((dataUri.length - dataUri.indexOf(',') - 1) * 3) / 4)

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("That file couldn't be read as an image"))
    }
    img.src = url
  })
}

// Compress a picked File into a small JPEG data URI. Tries decreasing quality
// first, then shrinks the dimensions and tries again (rare: very noisy
// images). Rejects if the file isn't an image or won't compress enough.
export async function fileToThumbnail(file, { maxDim = MAX_DIM, maxBytes = MAX_BYTES } = {}) {
  const img = await loadImage(file)
  for (let dim = maxDim; dim >= 64; dim = Math.round(dim * 0.7)) {
    const scale = Math.min(1, dim / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    for (const quality of QUALITIES) {
      const dataUri = canvas.toDataURL('image/jpeg', quality)
      if (dataUriBytes(dataUri) <= maxBytes) return dataUri
    }
  }
  throw new Error("Couldn't compress that image enough — try a smaller one")
}
