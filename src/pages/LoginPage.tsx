import { ArrowRight, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Gap, Intro, Page, Splash } from '../components/Page'
import { TextField } from '../components/TextField'
import { ApiError, describeError } from '../data/apiClient'

/** 이름만 입력하면 시작. 회원가입·로그인 없음. */
export function LoginPage() {
  const { session, isRestoring, login } = useSession()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isRestoring) {
    return <Splash />
  }
  if (session) {
    return <Navigate to={routes.home} replace />
  }

  const canSubmit = name.trim().length > 0 && !isSubmitting

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      await login(trimmed)
      navigate(routes.home, { replace: true })
    } catch (error) {
      const message =
        error instanceof ApiError && error.code === 'USER_KEY_CONFLICT'
          ? '다른 이름을 입력해 주세요.'
          : describeError(error)
      showToast('시작할 수 없어요', message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page maxWidth={480} centered>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <Intro
          eyebrow="ICE LINK"
          title={'이름을 입력하고\n시작하세요'}
          description="회원가입 없이 이름만으로 바로 참여할 수 있어요."
        />
        <Gap size={10} />
        <TextField
          label="이름"
          icon={User}
          placeholder="예: 홍길동"
          value={name}
          maxLength={12}
          autoFocus
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
        <Gap size={4} />
        <Button type="submit" icon={ArrowRight} loading={isSubmitting} disabled={!canSubmit}>
          {isSubmitting ? '준비 중' : '시작하기'}
        </Button>
      </form>
    </Page>
  )
}
