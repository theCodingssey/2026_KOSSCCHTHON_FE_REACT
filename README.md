# IceLink Web (React)

Flutter 앱(`2026_KOSSCCHTHON_FE/icelink`)의 화면 흐름을 **웹에서 테스트**하기 위해 React + TypeScript + Vite 로 옮긴 프로젝트입니다.
백엔드(`2026_KOSSCCHTHON_BE`, Spring Boot) API 를 그대로 호출합니다.

## 실행

```bash
npm install
npm run dev          # http://localhost:5173
```

백엔드 주소는 `.env` 로 바꿉니다 (기본값은 원격 개발 서버).

```bash
cp .env.example .env
# 로컬 백엔드를 쓸 때
# VITE_API_BASE_URL=http://localhost:8080/api/v1
```

```bash
npm run build        # tsc -b && vite build → dist/
npm run lint
```

## 배포 (Docker + GitHub Actions)

`main` 에 푸시하면 `.github/workflows/deploy.yml` 이 타입 검사·린트 → Docker 이미지 빌드(`VITE_API_BASE_URL=/api/v1`) → Docker Hub 푸시 → 서버 SSH 로 `docker pull` 후 `icelink-frontend` 컨테이너를 교체(`docker run`)합니다. compose 는 쓰지 않습니다.
이미지는 nginx 가 정적 파일을 내주고 `/api/` 를 같은 서버의 백엔드(8080)로 프록시합니다 (`Dockerfile`, `deploy/nginx.conf`).
서버 설정·시크릿·수동 배포 스크립트(`deploy.sh`)는 백엔드 저장소의 `docs/05-docker-deploy.md` 를 따릅니다.

```bash
docker build -t icelink-frontend:local .          # 로컬 확인용
docker run --rm -p 8080:80 icelink-frontend:local  # /api 는 host.docker.internal:8080 으로 프록시
```

## 화면 흐름 (Flutter 화면 → 경로)

| Flutter 화면 | React 경로 | 설명 |
|---|---|---|
| `LoginPage` | `/` | 이름 입력 → `POST /users` → 유저 키를 `localStorage` 에 저장. 재방문 시 `GET /users/me` 로 세션 복원 |
| `HomePage` | `/home` | 방 참가 / 방 생성 / 디버그(진행 중 방 종료·로그아웃). 진행 중인 방이 있으면 이어가기 버튼 표시 |
| `CreateRoomPage` | `/host/create` | 팀별 인원 + 마무리 질문(최대 5개) → `POST /rooms` → 핀 표시 |
| `PeopleChecklist` | `/host/rooms/:code/participants` | 참가자 목록 3초 폴링(설문 상태 배지) → 시작하기 = `POST .../team-building` |
| `IceBreakingPage` | `/host/rooms/:code/ice-breaking` | 팀 진행 상황 3초 폴링, 종료 버튼 = `POST .../finish` |
| `IceBreakingCompletePage` | `/host/rooms/:code/complete` | 수고하셨습니다 → 홈 |
| `JoinRoomPage` | `/join` | 핀 + 성격 6문항(5점 척도) + 취미 → `POST .../participants` + `PUT .../me/survey` |
| `TeamBuildingWaitPage` | `/rooms/:code/wait` | `GET .../me/team` 3초 폴링, 배정되면 자동 이동 |
| `TeamNumberPage` | `/rooms/:code/team` | 팀 번호·팀명·팀원 표시 |
| `TeamQuestionPage` | `/teams/:teamId/question` | 팀 세션 (아래 참고) |

## 팀 세션 화면 (Flutter 원본과 다른 점)

백엔드 규칙에 맞춰 흐름을 보정했습니다.

1. 입장 시 `POST /teams/{id}/start` (멱등) → INTRO 질문 + **팀명 정하기** 입력란.
2. "다음 질문 받기" = `POST /teams/{id}/questions/next` → AI 첫 질문이 도착할 때까지 2초 폴링.
3. 질문 단계에서 **녹음 시작**(브라우저 Web Speech API, `ko-KR`) 또는 **직접 입력** → **답변 전송** = `POST .../answer`(202) → PROCESSING 동안 2초 폴링 → 다음 질문.
4. AI 실패(FAILED) 시 **재시도 / 건너뛰기**, 방이 종료되면 **주최자 마무리 질문 + 키워드 요약** 표시.

Flutter 원본은 INTRO 단계에서 바로 답변을 제출해 서버 409 가 나는 구조였고, 종료 버튼은 API 를 호출하지 않았습니다.

## 실시간 동기화 (SSE)

백엔드 SSE 스트림 3종을 `src/hooks/useServerEvents.ts` 로 구독합니다. `EventSource` 는 헤더를 못 붙이므로 `?userKey=` 쿼리로 인증하고,
끊기면 브라우저가 `Last-Event-ID` 를 실어 자동 재연결합니다. 연결이 안 되는 동안만 3초 폴링으로 폴백하며, 화면 우측 배지가 `실시간 / 폴링` 을 표시합니다.

| 화면 | 스트림 | 반응하는 이벤트 |
|---|---|---|
| 팀 빌딩 대기 | `/rooms/{code}/me/events` | `PARTICIPANT_*` → 참가자 수, `TEAM_BUILDING_COMPLETED` → 팀 번호 화면 |
| 팀 번호 | `/teams/{id}/events` | `TEAM_STARTED` → 팀원 한 명이 시작하면 모두 질문 화면으로 |
| 팀 질문 | `/teams/{id}/events` | `TEAM_NAME_CHANGED`, `QUESTION_GENERATING`, `QUESTION_CREATED`, `ANSWER_PROCESSING/PROCESSED/FAILED`, `ROOM_FINISHED` |
| 참가자 명단 (주최자) | `/host/rooms/{code}/events` | `PARTICIPANT_*` → 목록 갱신 |
| 아이스 브레이킹 (주최자) | `/host/rooms/{code}/events` | `TEAM_*`, `QUESTION_*`, `ROOM_FINISHED` → 팀 진행 상황 갱신 |

### 한 PC 에서 탭을 많이 열 때 (연결 6개 제한)

브라우저는 HTTP/1.1 에서 **호스트당 동시 연결을 6개**로 제한하고, 이 한도는 같은 프로필의 모든 탭이 공유합니다.
SSE 는 연결을 계속 점유하므로 주최자 + 참가자 4~5개 탭을 열면 남은 연결이 없어 팀 빌딩·참가 같은 일반 요청이
대기 끝에 `서버 응답이 없습니다. (시간 초과)` 로 실패할 수 있습니다.

- **로컬 백엔드(localhost)**: 자동으로 탭마다 다른 루프백 주소(`127.0.0.N`)로 SSE 를 열어 연결 풀을 분리합니다. 설정할 것 없음.
- **원격 백엔드**: `.env` 의 `VITE_SSE_BASE_URL` 에 같은 서버의 다른 호스트명(IP 주소 등)을 넣어 SSE 풀을 분리하거나,
  사용자마다 다른 브라우저 프로필(또는 다른 브라우저)을 쓰세요. 이 경우 한 프로필당 SSE 탭은 5개 이하로 유지합니다.

## 음성 인식

`speech_to_text` 대신 브라우저 내장 `SpeechRecognition`(Chrome / Edge / Safari) 을 씁니다.
Firefox 등 미지원 브라우저에서는 녹음 버튼이 비활성화되고 텍스트 직접 입력으로 테스트할 수 있습니다.
마이크 권한은 `localhost` 또는 HTTPS 에서만 허용됩니다.

## 구조

```
src/
├── app/          SessionContext(유저 키·세션 복원), ToastContext(Get.snackbar), routes
├── components/   Page/AppBar/Card, Button, TextField, Icon(Material Symbols)
├── core/         config (API base URL, 폴링 주기)
├── data/         apiClient(fetch + Problem Details), endpoints, iceLinkApi, types(백엔드 DTO), sessionStorage
├── hooks/        usePolling, useSpeechRecognition
└── pages/        화면 10개
```

## 여러 사용자 동시 테스트

유저 키는 **탭 단위 `sessionStorage`** 에 저장됩니다. 일반 탭을 사용자 수만큼 열고 탭마다 다른 이름으로 시작하면
주최자 1명 + 참가자 N명을 한 PC 에서 시연할 수 있습니다. 탭을 새로고침해도 유지되고, 탭을 닫으면 사라집니다.

주의: 크롬 **시크릿 창은 여러 개 열어도 하나의 세션(프로필)** 이라 `localStorage` 를 공유합니다. 그래서 `localStorage` 방식이면
마지막에 로그인한 유저로 전부 덮어써집니다. 현재 구현은 `sessionStorage` 라 시크릿 창이든 일반 탭이든 탭마다 독립적입니다.
같은 이름은 100번까지만 등록되므로 이름을 다르게 입력하세요.
