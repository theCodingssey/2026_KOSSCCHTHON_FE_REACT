import { House, PartyPopper } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Gap, Page } from '../components/Page'

/** 종료 화면 */
export function IceBreakingCompletePage() {
  const navigate = useNavigate()
  const { refresh } = useSession()

  const goHome = () => {
    void refresh().catch(() => undefined)
    navigate(routes.home, { replace: true })
  }

  return (
    <Page maxWidth={480} centered>
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-soft text-accent shadow-sm">
          <PartyPopper size={36} strokeWidth={1.75} />
        </span>
        <Gap size={8} />
        <span className="eyebrow">Done</span>
        <h1 className="display-lg mt-3">수고하셨습니다</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          아이스 브레이킹이 종료되었어요.
          <br />
          오늘 나눈 대화가 좋은 시작이 되길 바라요.
        </p>
      </div>
      <Gap size={16} />
      <Button icon={House} onClick={goHome}>
        메인으로 가기
      </Button>
    </Page>
  )
}
