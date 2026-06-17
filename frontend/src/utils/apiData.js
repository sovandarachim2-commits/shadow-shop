export function getListResults(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

export function getListCount(data) {
  if (typeof data?.count === 'number') return data.count
  return getListResults(data).length
}

export function getSettledData(result) {
  return result.status === 'fulfilled' ? result.value.data : null
}

export function getSettledError(result) {
  return result.status === 'rejected' ? result.reason : null
}
