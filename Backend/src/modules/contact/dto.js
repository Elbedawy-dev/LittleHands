export function toCustomRequestDTO(request) {
  if (!request) return null
  const r = request.toObject ? request.toObject() : { ...request }

  let claimedByName = null
  let claimedById = null
  if (r.claimedBy) {
    if (typeof r.claimedBy === 'object') {
      claimedByName = r.claimedBy.seller?.displayName?.ar || r.claimedBy.name || null
      claimedById = r.claimedBy._id?.toString() || r.claimedBy.id || null
    } else {
      claimedById = r.claimedBy.toString()
    }
  }

  return {
    id: r.id || r._id?.toString(),
    name: r.name,
    phone: r.phone,
    nurseryName: r.nurseryName || '',
    details: r.details,
    status: r.status,
    claimedBy: claimedById,
    claimedByName,
    claimedAt: r.claimedAt || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export default toCustomRequestDTO
