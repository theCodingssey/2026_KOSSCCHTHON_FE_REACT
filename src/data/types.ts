/** 백엔드 DTO(record) 를 그대로 옮긴 타입. 열거형은 문자열 유니언으로 표현한다. */

export type RoomStatus = 'WAITING' | 'TEAM_BUILDING' | 'IN_PROGRESS' | 'FINISHED'
export type ParticipantStatus = 'JOINED' | 'SURVEY_DONE' | 'ASSIGNED' | 'LATE' | 'LEFT'
export type TeamStatus = 'NOT_STARTED' | 'NAMING' | 'QUESTIONING' | 'FINISHED'
export type QuestionStatus = 'ANSWERING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'SKIPPED'
export type QuestionType = 'INTRO' | 'AI_GENERATED' | 'FALLBACK'
export type InterestCategory = 'MOVIE' | 'GAME' | 'FOOD' | 'TRAVEL' | 'SPORTS'
export type AiFailureReason = 'LLM_TIMEOUT' | 'LLM_ERROR' | 'LLM_INVALID_RESPONSE'
export type RoomRole = 'HOST' | 'PARTICIPANT'

// ---- realtime (SSE) ----
export type RoomEventType =
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'PARTICIPANT_SURVEY_DONE'
  | 'ROOM_UPDATED'
  | 'TEAM_BUILDING_STARTED'
  | 'TEAM_BUILDING_COMPLETED'
  | 'ROOM_FINISHED'
  | 'TEAM_STATUS_CHANGED'
  | 'TEAM_FINISHED'
  | 'TEAM_STARTED'
  | 'TEAM_NAME_CHANGED'
  | 'QUESTION_GENERATING'
  | 'QUESTION_CREATED'
  | 'ANSWER_PROCESSING'
  | 'ANSWER_PROCESSED'
  | 'ANSWER_FAILED'

/** SSE data 필드: {"roomId","teamId","occurredAt","payload"} */
export interface ServerEvent<P = Record<string, unknown>> {
  roomId: number
  teamId: number | null
  occurredAt: string
  payload: P
}

/** RFC 9457 Problem Details + 백엔드 확장 필드 */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  code?: string
  timestamp?: string
  errors?: { field: string; message: string }[]
  activeRoomCode?: string
  [key: string]: unknown
}

// ---- user ----
export interface UserResponse {
  userKey: string
  name: string
  createdAt: string
}

export interface ActiveRoomResponse {
  role: RoomRole
  roomId: number
  code: string
  title: string
  status: RoomStatus
  participantId: number | null
  participantStatus: ParticipantStatus | null
  teamId: number | null
}

export interface MeResponse {
  userKey: string
  name: string
  createdAt: string
  activeRoom: ActiveRoomResponse | null
}

// ---- room ----
export interface RoomResponse {
  roomId: number
  code: string
  host: { userKey: string; name: string }
  inviteUrl: string
  deepLink: string
  title: string
  situation: string
  teamSize: number
  finalQuestions: string[]
  status: RoomStatus
  createdAt: string
  expiresAt: string | null
  finishedAt: string | null
}

export interface ParticipantCounts {
  joined: number
  surveyDone: number
  assigned: number
  late: number
  total: number
}

export interface RoomParticipantSummary {
  participantId: number
  nickname: string
  status: ParticipantStatus
  teamNo: number | null
  joinedAt: string
}

export interface RoomTeamSummary {
  teamId: number
  teamNo: number
  name: string
  status: TeamStatus
  memberCount: number
  category: InterestCategory
  mixed: boolean
  extroversionAvg: number | null
  questionCount: number
}

export interface RoomDetailResponse {
  roomId: number
  code: string
  title: string
  situation: string
  teamSize: number
  finalQuestions: string[]
  status: RoomStatus
  inviteUrl: string
  deepLink: string
  counts: ParticipantCounts
  participants: RoomParticipantSummary[]
  teams: RoomTeamSummary[]
  createdAt: string
  expiresAt: string | null
  finishedAt: string | null
}

export interface FinishRoomResponse {
  roomStatus: RoomStatus
  finishedAt: string
  finishedTeamCount: number
  finalQuestions: string[]
}

// ---- participant ----
export interface RoomBrief {
  roomId: number
  code: string
  title: string
  status: RoomStatus
  teamSize: number
}

export interface JoinRoomResponse {
  participantId: number
  nickname: string
  status: ParticipantStatus
  room: RoomBrief
}

export interface HostParticipantResponse {
  participantId: number
  nickname: string
  status: ParticipantStatus
  teamId: number | null
  teamNo: number | null
  extroversionScore: number | null
  interestCategory: InterestCategory | null
  joinedAt: string
}

export interface TeamMemberView {
  participantId: number
  nickname: string
  isMe?: boolean | null
  extroversionScore?: number | null
  interestCategory?: InterestCategory | null
}

export interface ParticipantTeamView {
  teamId: number
  teamNo: number
  name: string
  status: TeamStatus
  category: InterestCategory
  members: { participantId: number; nickname: string; isMe: boolean }[]
}

export interface ParticipantMeResponse {
  participantId: number
  userKey: string
  nickname: string
  status: ParticipantStatus
  room: {
    roomId: number
    code: string
    title: string
    status: RoomStatus
    teamSize: number
    participantCount: number
    finalQuestions: string[] | null
  }
  survey: {
    personalityDone: boolean
    categoryDone: boolean
    extroversionScore: number | null
    interestCategory: InterestCategory | null
  }
  team: ParticipantTeamView | null
}

// ---- survey ----
export interface PersonalityAnswer {
  no: number
  score: number
}

export interface SurveyResponse {
  status: ParticipantStatus
  personalityDone: boolean
  categoryDone: boolean
  extroversionScore: number | null
  extroversionLevel: 'INTROVERT' | 'BALANCED' | 'EXTROVERT' | null
  interestCategory: InterestCategory | null
  personality: PersonalityAnswer[]
}

// ---- team ----
export interface TeamQuestionResponse {
  questionId: number
  orderNo: number
  type: QuestionType
  content: string
  status: QuestionStatus
  failureReason: AiFailureReason | null
  retryable: boolean | null
  answer: {
    answerText: string
    submittedBy: { participantId: number; nickname: string }
    speechDurationSec: number | null
    keywords: string[]
    submittedAt: string
    processedAt: string | null
  } | null
  createdAt: string
}

export interface TeamDetailResponse {
  teamId: number
  teamNo: number
  name: string
  isDefaultName: boolean
  status: TeamStatus
  category: InterestCategory
  mixed: boolean
  questionCount: number
  questionLimit: number
  members: TeamMemberView[]
  currentQuestion: TeamQuestionResponse | null
  keywords: string[]
  startedAt: string | null
  finishedAt: string | null
}

export interface HostTeamResponse {
  teamId: number
  teamNo: number
  name: string
  status: TeamStatus
  category: InterestCategory
  mixed: boolean
  extroversionAvg: number | null
  questionCount: number
  currentQuestion: TeamQuestionResponse | null
  members: TeamMemberView[]
  startedAt: string | null
  finishedAt: string | null
}

export interface TeamBuildingResponse {
  roomStatus: RoomStatus
  teamCount: number
  assignedCount: number
  lateCount: number
  categoryGroups: {
    category: InterestCategory
    participantCount: number
    teamCount: number
    leftover: boolean
  }[]
  teams: {
    teamId: number
    teamNo: number
    name: string
    category: InterestCategory
    mixed: boolean
    extroversionAvg: number | null
    members: TeamMemberView[]
  }[]
}

export interface StartTeamResponse {
  status: TeamStatus
  started: boolean
  currentQuestion: TeamQuestionResponse | null
}

export interface RenameTeamResponse {
  teamId: number
  teamNo: number
  name: string
  isDefaultName: boolean
  updatedBy: { participantId: number; nickname: string }
}

export interface NextQuestionResponse {
  status: TeamStatus
  generating: boolean
  skippedQuestionId: number | null
  questionCount: number
}

export interface SubmitAnswerResponse {
  questionId: number
  status: string
  estimatedSeconds: number
  nextQuestionGenerated: boolean
}

export interface TeamSummaryResponse {
  teamId: number
  teamNo: number
  name: string
  members: TeamMemberView[]
  category: InterestCategory
  finalQuestions: string[]
  questionCount: number
  answeredCount: number
  durationSec: number | null
  keywords: string[]
  highlights: { question: string; keywords: string[] }[]
  startedAt: string | null
  finishedAt: string | null
}
