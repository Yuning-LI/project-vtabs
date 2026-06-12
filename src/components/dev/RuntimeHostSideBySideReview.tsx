'use client'

import RuntimeHostReviewClient, {
  type RuntimeHostReviewClientProps
} from '@/components/song/runtime-host/RuntimeHostReviewClient'

export type RuntimeHostSideBySideReviewProps = RuntimeHostReviewClientProps

export default function RuntimeHostSideBySideReview({
  basePath = '/dev/runtime-host/review',
  reviewTitle = 'Internal Side-By-Side Runtime Review',
  showExtendedDiagnostics = true,
  ...props
}: RuntimeHostSideBySideReviewProps) {
  return (
    <RuntimeHostReviewClient
      {...props}
      basePath={basePath}
      reviewTitle={reviewTitle}
      showExtendedDiagnostics={showExtendedDiagnostics}
    />
  )
}
