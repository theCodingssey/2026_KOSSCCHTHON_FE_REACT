import { ApiError, http } from './apiClient'
import { endpoints } from './endpoints'
import type {
  FinishRoomResponse,
  HostParticipantResponse,
  HostTeamResponse,
  InterestCategory,
  JoinRoomResponse,
  MeResponse,
  NextQuestionResponse,
  ParticipantMeResponse,
  ParticipantTeamView,
  PersonalityAnswer,
  RenameTeamResponse,
  RoomDetailResponse,
  RoomResponse,
  StartTeamResponse,
  SubmitAnswerResponse,
  SurveyResponse,
  TeamBuildingResponse,
  TeamDetailResponse,
  TeamQuestionResponse,
  TeamSummaryResponse,
  UserResponse,
} from './types'

/** Flutter `IceLinkApiService` 대응. 응답은 백엔드 DTO 타입으로 그대로 돌려준다. */
export const iceLinkApi = {
  // ---- user ----
  registerUser: (name: string) => http.post<UserResponse>(endpoints.users, { name }),
  fetchMe: () => http.get<MeResponse>(endpoints.usersMe),
  renameUser: (name: string) => http.patch<UserResponse>(endpoints.usersMe, { name }),

  // ---- host ----
  createRoom: (input: { title: string; situation: string; teamSize: number; finalQuestions: string[] }) =>
    http.post<RoomResponse>(endpoints.rooms, input),
  fetchHostRoom: (code: string) => http.get<RoomDetailResponse>(endpoints.hostRoom(code)),
  fetchHostParticipants: (code: string) =>
    http.get<HostParticipantResponse[]>(endpoints.hostRoomParticipants(code)),
  fetchHostTeams: (code: string) => http.get<HostTeamResponse[]>(endpoints.hostRoomTeams(code)),
  startTeamBuilding: (code: string, includeIncompleteSurvey = false) =>
    http.post<TeamBuildingResponse>(endpoints.hostRoomTeamBuilding(code), { includeIncompleteSurvey }),
  updateFinalQuestions: (code: string, finalQuestions: string[]) =>
    http.put<RoomResponse>(endpoints.hostRoomFinalQuestions(code), { finalQuestions }),
  finishRoom: (code: string) => http.post<FinishRoomResponse>(endpoints.hostRoomFinish(code)),
  kickParticipant: (code: string, participantId: number) =>
    http.delete<void>(endpoints.hostRoomParticipant(code, participantId)),

  // ---- participant ----
  joinRoom: (code: string, nickname?: string) => {
    const body: Record<string, string> = {}
    const trimmed = nickname?.trim()
    if (trimmed) {
      body.nickname = trimmed
    }
    return http.post<JoinRoomResponse>(endpoints.roomParticipants(code), body)
  },
  fetchRoomMe: (code: string) => http.get<ParticipantMeResponse>(endpoints.roomMe(code)),
  leaveRoom: (code: string) => http.delete<void>(endpoints.roomMe(code)),
  submitSurvey: (code: string, input: { personality: PersonalityAnswer[]; interestCategory: InterestCategory }) =>
    http.put<SurveyResponse>(endpoints.roomMeSurvey(code), input),
  fetchSurvey: (code: string) => http.get<SurveyResponse>(endpoints.roomMeSurvey(code)),
  /** 미배정이면 404 → null (Flutter fetchMyTeam 과 동일) */
  fetchMyTeam: async (code: string): Promise<ParticipantTeamView | null> => {
    try {
      return await http.get<ParticipantTeamView>(endpoints.roomMeTeam(code))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  },

  // ---- team session ----
  fetchTeam: (teamId: number) => http.get<TeamDetailResponse>(endpoints.team(teamId)),
  startTeam: (teamId: number) => http.post<StartTeamResponse>(endpoints.teamStart(teamId)),
  updateTeamName: (teamId: number, name: string) =>
    http.put<RenameTeamResponse>(endpoints.teamName(teamId), { name }),
  fetchQuestions: (teamId: number) => http.get<TeamQuestionResponse[]>(endpoints.teamQuestions(teamId)),
  /** 질문이 아직 없으면 404 → null */
  fetchCurrentQuestion: async (teamId: number): Promise<TeamQuestionResponse | null> => {
    try {
      return await http.get<TeamQuestionResponse>(endpoints.teamCurrentQuestion(teamId))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  },
  fetchQuestion: (teamId: number, questionId: number) =>
    http.get<TeamQuestionResponse>(endpoints.teamQuestion(teamId, questionId)),
  requestNextQuestion: (teamId: number, reason?: string) =>
    http.post<NextQuestionResponse>(endpoints.teamNextQuestion(teamId), reason ? { reason } : {}),
  submitAnswer: (teamId: number, questionId: number, input: { answerText: string; speechDurationSec?: number }) =>
    http.post<SubmitAnswerResponse>(endpoints.teamQuestionAnswer(teamId, questionId), input),
  retryQuestion: (teamId: number, questionId: number) =>
    http.post<SubmitAnswerResponse>(endpoints.teamQuestionRetry(teamId, questionId)),
  fetchTeamSummary: (teamId: number) => http.get<TeamSummaryResponse>(endpoints.teamSummary(teamId)),
}
