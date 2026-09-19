/** AI 문장을 문장 단위로 나눠 한 줄씩 보여 주기 위한 분리. 한글 어절은 CSS break-keep 으로 끊기지 않게 한다. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.?!。？！])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
