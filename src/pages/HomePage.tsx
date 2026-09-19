import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { routes } from '../app/routes'
import iceLinkIcon from '../assets/icelink-icon.png'
import { Button } from '../components/Button'
import { Page } from '../components/Page'
import { appConstants } from '../core/config'
import { usePolling } from '../hooks/usePolling'
import type { ActiveRoomResponse } from '../data/types'

const ACTIVE_ROOM_REFRESH_MS = 3000

function isResumableRoom(room: ActiveRoomResponse): boolean {
  if (room.status === 'FINISHED') {
    return false
  }
  return room.role !== 'PARTICIPANT' || room.participantStatus !== 'LEFT'
}

/** Flutter `HomePage` + `HomeController` */
export function HomePage() {
  const { session, refresh } = useSession()
  const navigate = useNavigate()

  const activeRoom = session?.activeRoom ?? null
  const resumableRoom = activeRoom && isResumableRoom(activeRoom) ? activeRoom : null

  const refreshActiveRoom = useCallback(async () => {
    await refresh()
  }, [refresh])

  usePolling(refreshActiveRoom, ACTIVE_ROOM_REFRESH_MS, Boolean(session))

  /** 진행 중인 방이 있으면 역할·상태에 맞는 화면으로 바로 이동 (앱 복원 시나리오) */
  const resumeActiveRoom = (room: ActiveRoomResponse) => {
    if (!isResumableRoom(room)) {
      return
    }
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

      {resumableRoom && (
        <>
          <Button icon="play_circle" variant="outlined" onClick={() => resumeActiveRoom(resumableRoom)}>
            진행 중인 방으로 이동 ({resumableRoom.code})
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
    </Page>
  )
}
