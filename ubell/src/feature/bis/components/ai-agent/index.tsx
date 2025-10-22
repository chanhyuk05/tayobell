import { useCallback, useEffect, useRef, useState } from "react";

import { Bus } from "@/shared/types";

import s from "./style.module.scss";

interface AIAgentProps {
  onResponse?: (response: string) => void;
  buses: Bus[];
  stationName: string;
  stationId?: string;
}

// Web Speech API 타입 선언
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
  onnomatch:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

export default function AIAgent({
  onResponse,
  buses,
  stationName,
  stationId,
}: AIAgentProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 음성 인식 초기화
  const initializeRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window)) {
      setError(
        "이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.",
      );
      return null;
    }

    // HTTPS 체크
    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      setError(
        "음성 인식은 HTTPS 환경에서만 작동합니다. HTTPS로 접속해주세요.",
      );
      return null;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true; // 연속 인식
    recognition.interimResults = true; // 중간 결과 표시
    recognition.lang = "ko-KR";
    recognition.maxAlternatives = 1;

    // 음성 인식 시작
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setError("");
    };

    // 음성 인식 결과 처리
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);

      // 최종 결과가 있으면 바로 중지하고 AI 호출
      if (finalTranscript) {
        console.log("음성 인식 완료:", finalTranscript);
        // 타이머 정리
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        // 바로 음성 인식 중지하고 AI 호출
        stopListening();
        sendToOpenAI(finalTranscript);
      }
    };

    // 음성 인식 종료
    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };

    // 에러 처리
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("음성 인식 에러:", event.error);
      setIsListening(false);

      setError(event.error);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };

    return recognition;
  }, []);

  // 음성 인식 시작
  const startListening = useCallback(() => {
    if (isListening) return;

    setError(""); // 에러 초기화
    const recognition = initializeRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (error) {
        console.error("음성 인식 시작 실패:", error);
        setError("음성 인식을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.");
      }
    }
  }, [isListening, initializeRecognition]);

  // 모달 열기
  const openModal = useCallback(() => {
    setShowModal(true);
    setError("");
    // 모달이 열릴 때 자동으로 음성 인식 시작
    startListening();
  }, [startListening]);

  // 모달 닫기
  const closeModal = useCallback(() => {
    setShowModal(false);
    setTranscript("");
    setResponse("");
    setError("");
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    }
  }, [isListening]);

  // 음성 인식 중지
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  }, []);

  // OpenAI API 호출
  const sendToOpenAI = async (text: string) => {
    console.log("sendToOpenAI 호출됨:", text);
    if (!text.trim()) return;

    // API 요청 시 음성 인식 끄기
    if (isListening) {
      stopListening();
    }

    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/api/v2/ai/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          information: JSON.stringify({
            buses: buses,
            stationName: stationName,
          }),
        }),
      });

      if (!response.ok) {
        throw new Error("API 호출 실패");
      }

      const data = await response.json();

      // 응답 내 제어 토큰 파싱 및 처리
      const tokenRegex = /\[([^\]:]+):(call|call_cancel)\]/g; // [버스번호:call] or [버스번호:call_cancel]
      const firstMatch = String(data.response).match(
        /\[([^\]:]+):(call|call_cancel)\]/,
      ) as RegExpMatchArray | null;
      const actionMatched: {
        busName: string;
        action: "call" | "call_cancel";
      } | null = firstMatch
        ? {
            busName: String(firstMatch[1])
              .replace(/\s+/g, "")
              .replace(/번$/, ""),
            action: firstMatch[2] as "call" | "call_cancel",
          }
        : null;
      const cleanedText = String(data.response).replace(tokenRegex, "").trim();

      // 토큰에 따른 실제 API 호출
      if (actionMatched && stationId) {
        const url = `http://localhost:3000/api/v2/station/${stationId}/bus/${encodeURIComponent(
          actionMatched.busName,
        )}/call`;
        try {
          await fetch(url, {
            method: actionMatched.action === "call" ? "POST" : "DELETE",
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("버스 호출 API 실패:", e);
        }
      }

      const audio = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/uyVNoMrnUku1dZyVEXwD?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: cleanedText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
              speed: 1,
            },
            output_format: "mp3_44100_128",
          }),
        },
      );

      const audioBlob = await audio.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = new Audio(audioUrl);

      // ElevenLabs 요청 완료 후 텍스트 표시 (제어 토큰 제거된 텍스트만 노출)
      setResponse(cleanedText);
      onResponse?.(cleanedText);

      // 재생 완료 시 정리
      audioElement.addEventListener("ended", () => {
        URL.revokeObjectURL(audioUrl);

        setTimeout(() => {
          closeModal();
        }, 3000);
      });

      audioElement.play();
    } catch (error) {
      console.error("OpenAI API 에러:", error);
      setError(
        "AI 서비스에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.",
      );
      setResponse("죄송합니다. 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 단축키 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 넘패드 1번 키로 모달 열기/닫기
      if (event.key === "1") {
        console.log(event.code);
        event.preventDefault();
        if (showModal) {
          closeModal();
        } else {
          openModal();
        }
      }

      // ESC 키로 모달 닫기
      if (event.code === "Escape" && showModal) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal, openModal, closeModal]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 오버레이만 표시 */}
      {showModal && (
        <div className={s.modalOverlay}>
          <img
            src="/ai.png"
            alt="ai"
            className={`${s.aiImage} ${isProcessing ? s.aiImageProcessing : ""}`}
          />
          {isProcessing && (
            <span className={s.processingText}>
              사용자의 요청을 처리중입니다
            </span>
          )}
          {!response && (
            <span
              className={`${s.transcript} ${isProcessing ? s.processing : ""}`}
            >
              {transcript}
            </span>
          )}

          {response && <span className={s.response}>{response}</span>}
        </div>
      )}
    </>
  );
}
