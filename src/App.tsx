import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { useSession } from './app/session'
import { routes } from './app/routes'
import { Splash } from './components/Page'
import { CreateRoomPage } from './pages/CreateRoomPage'
import { HomePage } from './pages/HomePage'
import { IceBreakingCompletePage } from './pages/IceBreakingCompletePage'
import { IceBreakingPage } from './pages/IceBreakingPage'
import { JoinRoomPage } from './pages/JoinRoomPage'
import { LoginPage } from './pages/LoginPage'
import { PeopleChecklistPage } from './pages/PeopleChecklistPage'
import { TeamBuildingWaitPage } from './pages/TeamBuildingWaitPage'
import { TeamNumberPage } from './pages/TeamNumberPage'
import { TeamQuestionPage } from './pages/TeamQuestionPage'

/** 세션 복원이 끝날 때까지 로딩, 세션이 없으면 로그인으로 */
function RequireSession() {
  const { session, isRestoring } = useSession()
  if (isRestoring) {
    return <Splash />
  }
  if (!session) {
    return <Navigate to={routes.login} replace />
  }
  return <Outlet />
}

function App() {
  return (
    <Routes>
      <Route path={routes.login} element={<LoginPage />} />

      <Route element={<RequireSession />}>
        <Route path={routes.home} element={<HomePage />} />

        {/* 주최자 */}
        <Route path={routes.createRoom} element={<CreateRoomPage />} />
        <Route path="/host/rooms/:code/participants" element={<PeopleChecklistPage />} />
        <Route path="/host/rooms/:code/ice-breaking" element={<IceBreakingPage />} />
        <Route path="/host/rooms/:code/complete" element={<IceBreakingCompletePage />} />

        {/* 참가자 */}
        <Route path={routes.joinRoom} element={<JoinRoomPage />} />
        <Route path="/rooms/:code/wait" element={<TeamBuildingWaitPage />} />
        <Route path="/rooms/:code/team" element={<TeamNumberPage />} />
        <Route path="/teams/:teamId/question" element={<TeamQuestionPage />} />
      </Route>

      <Route path="*" element={<Navigate to={routes.login} replace />} />
    </Routes>
  )
}

export default App
