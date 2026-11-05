import { mapUserDTO } from '../../utils/dto.js'

export const toUserProfileDTO = (user, viewerRole = null, viewerId = null) => {
  if (!user) return null
  const id = user.id || user._id?.toString()
  const role = viewerRole || user.role
  const vId = viewerId || id
  return mapUserDTO(user, role, vId)
}

export default { toUserProfileDTO }
