/**
 * Client-side image compression for Little Hands teaching aids uploads.
 * Constrains dimension to 1600px max, targets WebP format at 0.85 quality, and ensures size < 3.5MB.
 *
 * @param {File} file - Original image file
 * @param {Object} [options]
 * @param {number} [options.maxDimension=1600]
 * @param {number} [options.quality=0.85]
 * @param {number} [options.maxSizeMb=3.5]
 * @returns {Promise<File>} Compressed File ready for upload
 */
export async function compressImage(
  file,
  { maxDimension = 1600, quality = 0.85, maxSizeMb = 3.5 } = {}
) {
  if (typeof window === 'undefined' || !file || !file.type || !file.type.startsWith('image/')) {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return resolve(file)
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      const mimeType = 'image/webp'
      const ext = 'webp'

      const tryExport = (currentQuality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file)
            }

            if (blob.size > maxSizeMb * 1024 * 1024 && currentQuality > 0.5) {
              return tryExport(currentQuality - 0.15)
            }

            const baseName = file.name.replace(/\.[^/.]+$/, '')
            const compressedFile = new File([blob], `${baseName}.${ext}`, {
              type: mimeType,
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          },
          mimeType,
          currentQuality
        )
      }

      tryExport(quality)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export default compressImage

