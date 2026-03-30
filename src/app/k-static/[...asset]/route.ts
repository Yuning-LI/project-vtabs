import { proxyKuailepuStaticAsset } from '@/lib/kuailepu/assetProxy'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { asset: string[] } }
) {
  return proxyKuailepuStaticAsset(params.asset ?? [])
}
