/**
 * Mongoose schema plugin that:
 * 1. Sets id = _id.toString()
 * 2. Removes _id
 * 3. Removes __v
 * 4. Removes passwordHash or private fields
 */
export function toJSONPlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret, _options) => {
      if (ret._id) {
        ret.id = ret._id.toString()
        delete ret._id
      }
      delete ret.__v
      delete ret.passwordHash
      return ret
    },
  })

  schema.set('toObject', {
    virtuals: true,
    transform: (doc, ret, _options) => {
      if (ret._id) {
        ret.id = ret._id.toString()
      }
      return ret
    },
  })
}

export default toJSONPlugin