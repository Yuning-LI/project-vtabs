import { proxyPublicRuntimeStaticAsset } from '@/lib/kuailepu/assetProxy'

type StaticAssetRouteContext = {
  params: {
    asset?: string[]
  }
}

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: StaticAssetRouteContext
) {
  return proxyPublicRuntimeStaticAsset(params.asset ?? [])
}
