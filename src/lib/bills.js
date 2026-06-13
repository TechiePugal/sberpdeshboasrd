// Turn an uploaded bill into a small data URL we can store directly in
// Firestore (no Cloud Storage needed). Images are compressed; PDFs are kept
// only if small enough to stay well under Firestore's 1 MB document limit.
const MAX_BYTES = 700 * 1024 // ~700 KB ceiling for the stored string

function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = dataUrl
  })
}

async function compressImage(file, maxDim = 1280) {
  const raw = await readAsDataURL(file)
  const img = await loadImage(raw)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  // step quality down until under the size ceiling
  for (const q of [0.6, 0.45, 0.35, 0.25]) {
    const out = canvas.toDataURL('image/jpeg', q)
    if (out.length <= MAX_BYTES) return out
  }
  return canvas.toDataURL('image/jpeg', 0.2)
}

// Returns { data, name, type } or throws with a friendly message.
export async function fileToBill(file) {
  if (!file) return null
  if (file.type.startsWith('image/')) {
    const data = await compressImage(file)
    return { data, name: file.name, type: 'image' }
  }
  if (file.type === 'application/pdf') {
    const data = await readAsDataURL(file)
    if (data.length > MAX_BYTES) {
      throw new Error('PDF is too large — please upload a photo of the bill instead.')
    }
    return { data, name: file.name, type: 'pdf' }
  }
  throw new Error('Please upload an image or PDF.')
}
