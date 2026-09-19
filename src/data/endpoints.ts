/** Flutter `api_endpoints.dart` 와 1:1. 백엔드 `/api/v1` prefix 는 baseUrl 에 포함된다. */
export const endpoints = {
  health: '/health',

  users: '/users',
  usersMe: '/users/me',
  usersMeRooms: '/users/me/rooms',

  rooms: '/rooms',
  room: (code: string) => `/rooms/${code}`,
  hostRoom: (code: string) => `/host/rooms/${code}`,
  hostRoomTeamBuilding: (code: string) => `/host/rooms/${code}/team-building`,
  hostRoomParticipants: (code: string) => `/host/rooms/${code}/participants`,
  hostRoomParticipant: (code: string, participantId: number) =>
    `/host/rooms/${code}/participants/${participantId}`,
  hostRoomTeams: (code: string) => `/host/rooms/${code}/teams`,
  hostRoomTeamMembers: (code: string, teamId: number) => `/host/rooms/${code}/teams/${teamId}/members`,
  hostRoomFinalQuestions: (code: string) => `/host/rooms/${code}/final-questions`,
  hostRoomFinish: (code: string) => `/host/rooms/${code}/finish`,
  hostRoomEvents: (code: string) => `/host/rooms/${code}/events`,

  roomParticipants: (code: string) => `/rooms/${code}/participants`,
  roomMe: (code: string) => `/rooms/${code}/me`,
  roomMeSurvey: (code: string) => `/rooms/${code}/me/survey`,
  roomMeTeam: (code: string) => `/rooms/${code}/me/team`,
  roomMeEvents: (code: string) => `/rooms/${code}/me/events`,

  team: (teamId: number) => `/teams/${teamId}`,
  teamStart: (teamId: number) => `/teams/${teamId}/start`,
  teamName: (teamId: number) => `/teams/${teamId}/name`,
  teamQuestions: (teamId: number) => `/teams/${teamId}/questions`,
  teamCurrentQuestion: (teamId: number) => `/teams/${teamId}/questions/current`,
  teamNextQuestion: (teamId: number) => `/teams/${teamId}/questions/next`,
  teamQuestion: (teamId: number, questionId: number) => `/teams/${teamId}/questions/${questionId}`,
  teamQuestionAnswer: (teamId: number, questionId: number) =>
    `/teams/${teamId}/questions/${questionId}/answer`,
  teamQuestionRetry: (teamId: number, questionId: number) =>
    `/teams/${teamId}/questions/${questionId}/retry`,
  teamSummary: (teamId: number) => `/teams/${teamId}/summary`,
  teamEvents: (teamId: number) => `/teams/${teamId}/events`,
} as const
