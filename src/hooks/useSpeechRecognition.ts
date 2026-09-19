import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Flutter `speech_to_text` 대응. 브라우저 Web Speech API(Chrome/Edge/Safari) 를 쓴다.
 * Firefox 등 미지원 브라우저에서는 `isSupported=false` 이고, 화면은 직접 입력으로 대체한다.
 */

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string; message?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

function resolveCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': '마이크 권한이 거부되었습니다. 브라우저 주소창의 권한 설정을 확인해 주세요.',
  'service-not-allowed': '이 브라우저에서는 음성 인식 서비스를 사용할 수 없습니다.',
  'audio-capture': '마이크를 찾을 수 없습니다.',
  network: '음성 인식 서버에 연결할 수 없습니다.',
  'no-speech': '음성이 감지되지 않았습니다.',
  aborted: '음성 인식이 중단되었습니다.',
}

export interface SpeechRecognitionState {
  isSupported: boolean
  isListening: boolean
  /** 현재 세션에서 확정된 문장 + 진행 중인 임시 문장 */
  liveText: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

export function useSpeechRecognition(lang = 'ko-KR'): SpeechRecognitionState {
  const ctorRef = useRef<SpeechRecognitionCtor | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTextRef = useRef('')
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [liveText, setLiveText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ctorRef.current = resolveCtor()
    setIsSupported(ctorRef.current !== null)
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const reset = useCallback(() => {
    finalTextRef.current = ''
    setLiveText('')
    setError(null)
  }, [])

  const start = useCallback(() => {
    const Ctor = ctorRef.current
    if (!Ctor) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. 아래 입력창에 직접 적어 주세요.')
      return
    }

    recognitionRef.current?.abort()
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          finalTextRef.current = `${finalTextRef.current} ${transcript}`.trim()
        } else {
          interim += transcript
        }
      }
      setLiveText(`${finalTextRef.current} ${interim}`.trim())
    }

    recognition.onerror = (event) => {
      // no-speech 는 잠시 조용했을 뿐이므로 사용자 오류로 취급하지 않는다.
      if (event.error === 'no-speech') {
        return
      }
      setError(ERROR_MESSAGES[event.error] ?? `음성 인식 오류: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    setError(null)
    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setError('음성 인식을 시작할 수 없습니다.')
      setIsListening(false)
    }
  }, [lang])

  return { isSupported, isListening, liveText, error, start, stop, reset }
}
