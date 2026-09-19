import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'

/** Flutter `IceBreakingCompletePage` */
export function IceBreakingCompletePage() {
  const navigate = useNavigate()
  const { refresh } = useSession()

  const goHome = () => {
    void refresh().catch(() => undefined)
    navigate(routes.home, { replace: true })
  }

  return (
    <Page maxWidth={480} centered>
      <div className="text-center" style={{ color: 'var(--primary)' }}>
        <Icon name="celebration" size={92} />
      </div>
      <div className="gap-20" />
      <h1 className="headline headline--center headline--xl">수고하셨습니다!</h1>
      <div className="gap-12" />
      <p className="subtitle text-center" style={{ fontSize: 17, fontWeight: 700 }}>
        아이스 브레이킹이 종료되었습니다.
      </p>
      <div className="gap-80" />
      <Button icon="home" onClick={goHome}>
        메인으로 가기
      </Button>
    </Page>
  )
}
