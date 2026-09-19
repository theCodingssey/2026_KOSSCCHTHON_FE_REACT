import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Page, Spinner } from '../components/Page'
import { TextField } from '../components/TextField'
import { ApiError, describeError } from '../data/apiClient'

/** Flutter `LoginPage` + `LoginController` */
export function LoginPage() {
  const { session, isRestoring, login } = useSession()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isRestoring) {
    return (
      <div className="page page--splash">
        <Spinner />
      </div>
    )
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
      showToast('로그인 실패', message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page maxWidth={480} centered>
      <form onSubmit={handleSubmit} className="page__content">
        <div className="gap-28" />
        <h1 className="headline headline--center">{'이름을 입력하고\n시작하세요!'}</h1>
        <div className="gap-50" />
        <TextField
          label="이름"
          icon="person"
          placeholder="예: 홍길동"
          value={name}
          maxLength={12}
          autoFocus
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
        <div className="gap-18" />
        <Button type="submit" icon="arrow_forward" loading={isSubmitting} disabled={!canSubmit}>
          {isSubmitting ? '준비 중' : '시작하기'}
        </Button>
      </form>
    </Page>
  )
}
