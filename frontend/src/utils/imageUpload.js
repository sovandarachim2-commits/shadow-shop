export async function compressImageForUpload(file, options = {}) {
  const {
    maxSize = 1200,
    targetSize = 120 * 1024,
  } = options

  if (!file || !file.type?.startsWith('image/')) return file
  if (file.size <= targetSize) return file

  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })

  let scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  let blob = null
  for (const quality of [0.74, 0.64, 0.54, 0.44, 0.34]) {
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
    if (blob && blob.size <= targetSize) break
    scale *= 0.82
  }

  URL.revokeObjectURL(image.src)
  if (!blob || blob.size >= file.size) return file

  return new File(
    [blob],
    file.name.replace(/\.[^.]+$/, '.jpg'),
    { type: 'image/jpeg', lastModified: Date.now() }
  )
}
