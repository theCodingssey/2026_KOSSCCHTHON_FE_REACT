import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import iceLinkIcon from '../assets/icelink-icon.png'
import { Button } from '../components/Button'
import { Page } from '../components/Page'
import { appConstants } from '../core/config'
import { describeError } from '../data/apiClient'
import { iceLinkApi } from '../data/iceLinkApi'
import type { ActiveRoomResponse } from '../data/types'

/** Flutter `HomePage` + `HomeController` */
export function HomePage() {
  const { session, refresh, logout } = useSession()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [isClearing, setIsClearing] = useState(false)

  const activeRoom = session?.activeRoom ?? null

  /** 진행 중인 방이 있으면 역할·상태에 맞는 화면으로 바로 이동 (앱 복원 시나리오) */
  const resumeActiveRoom = (room: ActiveRoomResponse) => {
    if (room.role === 'HOST') {
      navigate(room.status === 'WAITING' ? routes.peopleChecklist(room.code) : routes.iceBreaking(room.code))
      return
    }
    if (room.teamId) {
      navigate(routes.teamQuestion(room.teamId))
    } else if (room.participantStatus === 'SURVEY_DONE' || room.participantStatus === 'LATE') {
      navigate(routes.teamBuildingWait(room.code))
    } else {
      navigate(routes.joinRoom)
    }
  }

  /** Flutter `clearActiveRoomForDebug`: 호스트면 방 종료, 참가자면 나가기 */
  const clearActiveRoomForDebug = async () => {
    setIsClearing(true)
    try {
      const me = await iceLinkApi.fetchMe()
      const room = me.activeRoom
      if (!room) {
        showToast('진행 중인 방 없음', '종료할 방이 없습니다.')
        return
      }
      if (room.role === 'HOST') {
        await iceLinkApi.finishRoom(room.code)
        showToast('방 종료 완료', `${room.code} 방을 종료했습니다.`, 'success')
      } else {
        await iceLinkApi.leaveRoom(room.code)
        showToast('방 나가기 완료', `${room.code} 방에서 나갔습니다.`, 'success')
      }
      await refresh()
    } catch (error) {
      showToast('디버그 요청 실패', describeError(error, '진행 중인 방을 종료하지 못했습니다.'), 'error')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Page maxWidth={480}>
      <div className="gap-56" />
      <img src={iceLinkIcon} alt="" className="home-icon" />
      <h1 className="app-name">{appConstants.appName}</h1>
      {session && (
        <>
          <div className="gap-10" />
          <p className="subtitle text-center" style={{ fontSize: 17, fontWeight: 700 }}>
            {session.name} 님, 반가워요
          </p>
        </>
      )}
      <div className="gap-80" />

      {activeRoom && (
        <>
          <Button icon="play_circle" variant="outlined" onClick={() => resumeActiveRoom(activeRoom)}>
            진행 중인 방으로 이동 ({activeRoom.code})
          </Button>
          <div className="gap-12" />
        </>
      )}

      <Button icon="login" onClick={() => navigate(routes.joinRoom)}>
        방 참가하기
      </Button>
      <div className="gap-12" />
      <Button icon="add_circle" variant="outlined" onClick={() => navigate(routes.createRoom)}>
        방 생성하기
      </Button>
      <div className="gap-12" />
      <Button icon="delete" variant="text" loading={isClearing} onClick={clearActiveRoomForDebug}>
        {isClearing ? '진행 중인 방 정리 중...' : '디버그: 진행 중인 방 종료'}
      </Button>
      <Button
        icon="logout"
        variant="text"
        onClick={() => {
          logout()
          navigate(routes.login, { replace: true })
        }}
      >
        디버그: 로그아웃 (다른 이름으로 시작)
      </Button>
    </Page>
  )
}
