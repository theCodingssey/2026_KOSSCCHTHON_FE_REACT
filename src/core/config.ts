/** Flutter `core/config/api_config.dart` 대응. Vite 환경 변수로 덮어쓸 수 있다. */
const DEFAULT_BASE_URL = 'http://fbwoalszz.iptime.org:8080/api/v1'

export const apiConfig = {
  baseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_BASE_URL,
  /** Dio connect/receive/send 8초와 동일 */
  timeoutMs: 8_000,
} as const

export const appConstants = {
  appName: 'IceLink',
  /** Flutter 컨트롤러들의 3초 폴링 주기 */
  pollIntervalMs: 3_000,
} as const
