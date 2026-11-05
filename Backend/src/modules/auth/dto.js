import { mapUserDTO } from '../../utils/dto.js'

export const toAuthUserDTO = (user) => {
  if (!user) return null
  const id = user.id || user._id?.toString()
  return mapUserDTO(user, user.role, id)
}

export default { toAuthUserDTO }
