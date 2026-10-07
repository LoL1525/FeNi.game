const publicSiteUrl = import.meta.env.VITE_PUBLIC_URL?.replace(/\/$/, '')

export function getNftMetadataUri(catalogKey: string): string | null {
  if (!publicSiteUrl || !publicSiteUrl.startsWith('https://')) return null
  try {
    if (new URL(publicSiteUrl).hostname.endsWith('.example')) return null
  } catch {
    return null
  }
  const uri = `${publicSiteUrl}${import.meta.env.BASE_URL}nft/planets/${catalogKey}.json`
  return new TextEncoder().encode(uri).length <= 200 ? uri : null
}
