/**
 * Flutter `SessionStorageService`(flutter_secure_storage) 대응.
 *
 * 웹에서는 `sessionStorage`(탭 단위) 를 쓴다. `localStorage` 는 같은 브라우저 프로필의 모든 탭·창이 공유하므로
 * (크롬 시크릿 창도 서로 공유한다) 한 PC 에서 주최자 + 참가자 여러 명을 동시에 테스트하면 마지막 로그인 유저로
 * 전부 덮어써진다. `sessionStorage` 는 탭마다 독립적이고 새로고침에는 유지되므로 다중 사용자 테스트에 맞다.
 * 탭을 닫으면 키가 사라지고 새 탭에서는 다시 이름을 입력해 새 유저가 된다.
 */
const USER_KEY_STORAGE_KEY = 'icelink.user_key'

export const sessionStorageService = {
  readUserKey(): string | null {
    try {
      return window.sessionStorage.getItem(USER_KEY_STORAGE_KEY)
    } catch {
      return null
    }
  },
  saveUserKey(userKey: string): void {
    try {
      window.sessionStorage.setItem(USER_KEY_STORAGE_KEY, userKey)
    } catch {
      // 저장이 막히면 세션(메모리) 동안만 유지된다.
    }
  },
  clearUserKey(): void {
    try {
      window.sessionStorage.removeItem(USER_KEY_STORAGE_KEY)
    } catch {
      // ignore
    }
  },
}
