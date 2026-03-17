const DEFAULT_LIMIT = 100

function createCache(limit = DEFAULT_LIMIT) {
  const cache = new Map()
  cache.maxEntries = limit
  return cache
}

export function setBounded(cache, key, value) {
  cache.set(key, value)
  while (cache.size > cache.maxEntries) {
    cache.delete(cache.keys().next().value)
  }
}

export const templateCache = createCache(200)
export const remoteCache = createCache(200)
export const styleCache = createCache(100)
