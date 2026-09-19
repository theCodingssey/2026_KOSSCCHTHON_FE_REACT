import { ArrowRight, CirclePlus, LogIn } from 'lucide-react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { routes } from '../app/routes'
import iceLinkIcon from '../assets/icelink-icon.png'
import { Button } from '../components/Button'
import { Badge, Card, Gap, Page } from '../components/Page'
import { appConstants } from '../core/config'
import type { ActiveRoomResponse } from '../data/types'
import { usePolling } from '../hooks/usePolling'

const ACTIVE_ROOM_REFRESH_MS = 3000

function isResumableRoom(room: ActiveRoomResponse): boolean {
  if (room.status === 'FINISHED') {
    return false
  }
  return room.role !== 'PARTICIPANT' || room.participantStatus !== 'LEFT'
}

const ROOM_STATUS_LABEL: Record<ActiveRoomResponse['status'], string> = {
  WAITING: '참가자 모집 중',
  TEAM_BUILDING: '팀 빌딩 중',
  IN_PROGRESS: '아이스 브레이킹 진행 중',
  FINISHED: '종료',
}

/** 홈: 참가 / 생성, 진행 중인 방이 있으면 이어가기 */
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
      <Gap size={12} />
      <div className="flex flex-col items-center text-center">
        <img
          src={iceLinkIcon}
          alt=""
          className="h-[132px] w-[132px] rounded-[32px] shadow-md transition-transform duration-200 hover:scale-[1.02]"
        />
        <Gap size={6} />
        <h1 className="display-lg">{appConstants.appName}</h1>
        {session && (
          <p className="mt-2 text-[15px] text-muted">
            <span className="font-semibold text-ink">{session.name}</span> 님, 반가워요
          </p>
        )}
      </div>
      <Gap size={16} />

      {resumableRoom && (
        <>
          <Card interactive className="gap-4" style={{ padding: 20 }}>
            <button type="button" className="group flex items-center justify-between gap-3 text-left" onClick={() => resumeActiveRoom(resumableRoom)}>
              <div className="min-w-0">
                <div className="eyebrow">{resumableRoom.role === 'HOST' ? '내가 만든 방' : '참가 중인 방'}</div>
                <div className="mt-1.5 truncate text-[17px] font-semibold tracking-[-0.02em]">{resumableRoom.title}</div>
                <div className="mt-1 flex items-center gap-2 text-[13px] text-muted">
                  <span className="tabular tracking-[0.08em]">{resumableRoom.code}</span>
                  <span className="text-faint">·</span>
                  <Badge tone="ok">{ROOM_STATUS_LABEL[resumableRoom.status]}</Badge>
                </div>
              </div>
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand text-white shadow-sm transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight size={18} />
              </span>
            </button>
          </Card>
          <Gap size={4} />
        </>
      )}

      <Button icon={LogIn} onClick={() => navigate(routes.joinRoom)}>
        방 참가하기
      </Button>
      <Gap size={3} />
      <Button icon={CirclePlus} variant="secondary" onClick={() => navigate(routes.createRoom)}>
        방 생성하기
      </Button>
    </Page>
  )
}
