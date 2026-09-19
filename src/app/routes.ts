/** 화면 경로 한 곳에서 관리. Flutter 의 Get.to(Page) 호출을 경로로 치환한 것. */
export const routes = {
  login: '/',
  home: '/home',

  // 주최자
  createRoom: '/host/create',
  peopleChecklist: (code: string) => `/host/rooms/${code}/participants`,
  iceBreaking: (code: string) => `/host/rooms/${code}/ice-breaking`,
  iceBreakingComplete: (code: string) => `/host/rooms/${code}/complete`,

  // 참가자
  joinRoom: '/join',
  teamBuildingWait: (code: string) => `/rooms/${code}/wait`,
  teamNumber: (code: string) => `/rooms/${code}/team`,
  teamQuestion: (teamId: number) => `/teams/${teamId}/question`,
} as const
