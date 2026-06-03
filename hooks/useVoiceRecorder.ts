'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export type RecorderState = 'idle' | 'listening' | 'processing' | 'error'

interface UseVoiceRecorderReturn {
  state: RecorderState
  transcript: string
  error: string | null
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  reset: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldRestartRef = useRef(false)   // mantém escuta ativa até botão ser pressionado
  const accumulatedRef = useRef('')         // texto acumulado entre sessões
  const transcriptRef = useRef('')          // texto mais recente (evita closure stale)

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    setIsSupported(supported)
  }, [])

  const getSpeechClass = () => {
    const w = window as Window & {
      SpeechRecognition?: typeof SpeechRecognition
      webkitSpeechRecognition?: typeof SpeechRecognition
    }
    return w.SpeechRecognition || w.webkitSpeechRecognition || null
  }

  const createSession = useCallback(() => {
    const SpeechRecognitionClass = getSpeechClass()
    if (!SpeechRecognitionClass) return

    const recognition = new SpeechRecognitionClass()
    recognition.lang = 'pt-BR'
    recognition.continuous = false      // Chrome é mais estável com false + reinício manual
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }

      // Atualiza o acumulado com texto final confirmado
      if (final) {
        accumulatedRef.current = (accumulatedRef.current + ' ' + final).trim()
      }

      // Exibe: acumulado + interim atual
      const display = interim
        ? (accumulatedRef.current + ' ' + interim).trim()
        : accumulatedRef.current

      transcriptRef.current = display
      setTranscript(display)
    }

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        // Reinicia automaticamente para simular microfone contínuo
        try {
          recognition.start()
        } catch {
          // Se falhar, tenta criar nova sessão
          setTimeout(createSession, 100)
        }
      } else {
        // Usuário pressionou parar
        if (transcriptRef.current) {
          setState('processing')
        } else {
          setState('idle')
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') return // ignora cancelamentos manuais

      if (event.error === 'no-speech' && shouldRestartRef.current) {
        // Sem fala detectada, mas ainda escutando — reinicia silenciosamente
        try { recognition.start() } catch { setTimeout(createSession, 100) }
        return
      }

      const messages: Record<string, string> = {
        'not-allowed': 'Permissão para microfone negada. Habilite nas configurações do navegador.',
        'network': 'Erro de rede. Verifique sua conexão.',
        'audio-capture': 'Microfone não encontrado.',
      }

      const msg = messages[event.error]
      if (msg) {
        setError(msg)
        setState('error')
        shouldRestartRef.current = false
      } else if (shouldRestartRef.current) {
        // Erro genérico mas ainda escutando — tenta reiniciar
        setTimeout(createSession, 300)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (e) {
      // Já em execução — ignora
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Seu navegador não suporta reconhecimento de voz. Use o Chrome.')
      setState('error')
      return
    }

    // Zera tudo
    shouldRestartRef.current = true
    accumulatedRef.current = ''
    transcriptRef.current = ''
    setTranscript('')
    setError(null)
    setState('listening')

    createSession()
  }, [isSupported, createSession])

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false

    const currentText = transcriptRef.current

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}  // abort é instantâneo vs stop que aguarda onend
      recognitionRef.current = null
    }

    // Transição imediata — não espera onend (que no mobile pode demorar 1-2s)
    if (currentText) {
      setState('processing')
    } else {
      setState('idle')
    }
  }, [])

  const reset = useCallback(() => {
    shouldRestartRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }
    accumulatedRef.current = ''
    transcriptRef.current = ''
    setState('idle')
    setTranscript('')
    setError(null)
  }, [])

  return { state, transcript, error, isSupported, startListening, stopListening, reset }
}
