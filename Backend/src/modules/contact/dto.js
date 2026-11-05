export function toCustomRequestDTO(request) {
  if (!request) return null
  const r = request.toObject ? request.toObject() : { ...request }
  return {
    id: r.id || r._id?.toString(),
    name: r.name,
    phone: r.phone,
    nurseryName: r.nurseryName || '',
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export default toCustomRequestDTO
