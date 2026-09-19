/** Flutter `core/config/api_config.dart` 대응. Vite 환경 변수로 덮어쓸 수 있다. */
const DEFAULT_BASE_URL = 'http://fbwoalszz.iptime.org:8080/api/v1'

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_BASE_URL

export const apiConfig = {
  baseUrl,
  /**
   * SSE 전용 base URL.
   *
   * 브라우저는 HTTP/1.1 에서 호스트당 동시 연결을 6개로 제한하고, 이 한도는 같은 프로필의 모든 탭이 공유한다.
   * SSE 는 연결을 계속 점유하므로 한 PC 에서 탭 5~6개를 열면 일반 요청(팀 빌딩, 참가 등)이 대기 끝에 타임아웃된다.
   * 로컬 백엔드(localhost/127.0.0.1)라면 탭마다 다른 루프백 주소(127.0.0.N)로 SSE 를 열어 연결 풀을 분리한다.
   * 원격 서버는 `VITE_SSE_BASE_URL` 로 별도 호스트(예: IP 주소)를 지정하거나 브라우저 프로필을 나눠 테스트한다.
   */
  sseBaseUrl: resolveSseBaseUrl(baseUrl),
  /** Dio connect/receive/send 8초와 동일 */
  timeoutMs: 8_000,
} as const

export const appConstants = {
  appName: 'IceLink',
  /** Flutter 컨트롤러들의 3초 폴링 주기 */
  pollIntervalMs: 3_000,
} as const

const SSE_SHARD_STORAGE_KEY = 'icelink.sse_shard'

function resolveSseBaseUrl(apiBaseUrl: string): string {
  const override = (import.meta.env.VITE_SSE_BASE_URL as string | undefined)?.trim()
  if (override) {
    return override.replace(/\/+$/, '')
  }
  try {
    const url = new URL(apiBaseUrl)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = `127.0.0.${loopbackShard()}`
      return url.toString().replace(/\/+$/, '')
    }
  } catch {
    // 잘못된 URL 이면 그대로 둔다
  }
  return apiBaseUrl
}

/** 탭마다 고정되는 2~250 사이 숫자. 재연결에도 같은 주소를 쓰도록 sessionStorage 에 둔다. */
function loopbackShard(): number {
  try {
    const saved = Number(window.sessionStorage.getItem(SSE_SHARD_STORAGE_KEY))
    if (Number.isInteger(saved) && saved >= 2 && saved <= 250) {
      return saved
    }
    const shard = 2 + Math.floor(Math.random() * 249)
    window.sessionStorage.setItem(SSE_SHARD_STORAGE_KEY, String(shard))
    return shard
  } catch {
    return 2
  }
}
