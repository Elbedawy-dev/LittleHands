/**
 * معالجة وتصغير الصورة الشخصية للأفاتار إلى 256px كحد أقصى قبل الحفظ
 * Validate type (jpeg/png/webp), 5MB size limit, and resize client-side to max 256px via Canvas.
 */
export async function processAvatarImage(file) {
  if (!file) {
    throw new Error('ERR_FILE_REQUIRED')
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('ERR_INVALID_IMAGE_TYPE')
  }

  const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('ERR_FILE_TOO_LARGE')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('ERR_FILE_READ_FAILED'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('ERR_IMAGE_LOAD_FAILED'))
      img.onload = () => {
        try {
          const maxDim = 256
          let { width, height } = img

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          // استخدام webp أو jpeg مضغوط لتوفير المساحة في localStorage
          const dataUrl = canvas.toDataURL('image/webp', 0.85)
          resolve(dataUrl)
        } catch (err) {
          reject(err)
        }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

