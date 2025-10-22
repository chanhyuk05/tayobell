import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  AIAgent,
  Banner,
  BusArrivalCard,
  Header,
  News,
} from "@/feature/bis/components";
import { VStack } from "@/shared/components";
import { useStationData } from "@/shared/hooks/useStationData";
import { sortBusesByName } from "@/shared/utils/bus";
import { convertNumbersToKorean } from "@/shared/utils/korean";

import s from "./service.module.scss";

const NEWS_ITEMS = [
  "김정은 덕에 친해진 이재명·트럼프… 유대감 형성 큰 성과 [美 전문가 평가]",
  "'내란 방조' 한덕수 전 총리, 오늘 구속 기로",
  "[미니 다큐]죽음의 '손배 폭탄' 막을 노란봉투법...20년 만에 국회 통과",
];

export default function BISServicePage() {
  const { stationId } = useParams();
  const { stationData, refetch } = useStationData(stationId || "");

  // 단순한 상태 관리
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [selectedBusIndex, setSelectedBusIndex] = useState(0);
  const [fontSize, setFontSize] = useState(1.4); // 정류장 글씨 크기 배율 (기본값 140%)

  // 글씨 크기 자동 리셋을 위한 타이머
  const [fontSizeTimer, setFontSizeTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  const buses = sortBusesByName(stationData?.buses || []);
  const selectedBus = buses[selectedBusIndex];

  const toMinutes = (seconds?: number) =>
    Math.max(0, Math.ceil((seconds || 0) / 60));

  // 현재 재생 중인 오디오 요소를 추적
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null,
  );

  // 글씨 크기를 기본값으로 리셋하는 함수
  const resetFontSize = () => {
    setFontSize(1.4);
    if (fontSizeTimer) {
      clearTimeout(fontSizeTimer);
      setFontSizeTimer(null);
    }
  };

  // 글씨 크기 변경 시 타이머 설정
  const updateFontSizeWithTimer = (newSize: number) => {
    setFontSize(newSize);

    // 기존 타이머 클리어
    if (fontSizeTimer) {
      clearTimeout(fontSizeTimer);
    }

    // 기본값이 아닌 경우에만 타이머 설정
    if (newSize !== 1.4) {
      const timer = setTimeout(() => {
        resetFontSize();
      }, 10000); // 10초 후 리셋
      setFontSizeTimer(timer);
    } else {
      setFontSizeTimer(null);
    }
  };

  // TTS 함수
  const speak = async (text: string) => {
    // 기존 오디오 중단
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      URL.revokeObjectURL(currentAudio.src);
    }

    console.log(import.meta.env.VITE_ELEVENLABS_API_KEY);

    const audio = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/uyVNoMrnUku1dZyVEXwD?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            speed: 0.8,
          },
          output_format: "mp3_44100_128",
        }),
      },
    );

    const audioBlob = await audio.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audioElement = new Audio(audioUrl);

    // 재생 완료 시 정리
    audioElement.addEventListener("ended", () => {
      URL.revokeObjectURL(audioUrl);
      setCurrentAudio(null);
    });

    setCurrentAudio(audioElement);
    audioElement.play();
  };

  // 버스 호출
  const handleBusCall = async (busName: string, isCalled: boolean) => {
    try {
      if (isCalled) {
        // 호출 취소
        await fetch(
          `http://localhost:3000/api/v2/station/${stationId}/bus/${busName}/call`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          },
        );
        speak(`${convertNumbersToKorean(busName)} 호출 취소되었습니다`);
        refetch();
      } else {
        // 버스 호출
        await fetch(
          `http://localhost:3000/api/v2/station/${stationId}/bus/${busName}/call`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );
        speak(`${convertNumbersToKorean(busName)} 버스 호출되었습니다`);
        refetch();
      }
    } catch (error) {
      console.error("API 요청 실패:", error);
      speak("요청이 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        URL.revokeObjectURL(currentAudio.src);
      }
    };
  }, [currentAudio]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (fontSizeTimer) {
        clearTimeout(fontSizeTimer);
      }
    };
  }, [fontSizeTimer]);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "0" && !isVoiceMode) {
        // 음성 모드 시작
        setIsVoiceMode(true);
        speak(
          `음성 모드입니다. 키패드 이번 팔번 버튼으로 버스를 선택하고 엔터키로 호출하세요. ${convertNumbersToKorean(buses[0]?.name)} ${toMinutes(buses[0]?.arrivalTime)}분 남았습니다.`,
        );
        return;
      }

      // 음성 모드가 아닐 때 정류장 글씨 크기 조절 기능
      if (!isVoiceMode) {
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          const newSize = Math.min(fontSize + 0.2, 2.5); // 최대 250%까지 확대
          updateFontSizeWithTimer(newSize);
          return;
        }
        if (event.key === "-") {
          event.preventDefault();
          const newSize = Math.max(fontSize - 0.2, 0.8); // 최소 80%까지 축소
          updateFontSizeWithTimer(newSize);
          return;
        }
        return; // 음성 모드가 아니면 다른 키 처리 안함
      }

      event.preventDefault();

      switch (event.key) {
        case "+":
        case "2":
          if (buses.length > 0) {
            const nextIndex = (selectedBusIndex + 1) % buses.length;
            setSelectedBusIndex(nextIndex);
            const nextBus = buses[nextIndex];
            speak(
              `${convertNumbersToKorean(nextBus.name)} ${toMinutes(nextBus.arrivalTime)}분 남았습니다. Enter키로 호출하세요.`,
            );
          }
          break;

        case "8":
          if (buses.length > 0) {
            const prevIndex =
              selectedBusIndex === 0 ? buses.length - 1 : selectedBusIndex - 1;
            setSelectedBusIndex(prevIndex);
            const prevBus = buses[prevIndex];
            speak(
              `${convertNumbersToKorean(prevBus.name)} ${toMinutes(prevBus.arrivalTime)}분 남았습니다. Enter키로 호출하세요.`,
            );
          }
          break;

        case "Enter":
          if (selectedBus) {
            handleBusCall(selectedBus.name, selectedBus.isCalled);
          }
          break;

        case "Escape":
          setIsVoiceMode(false);
          speak("음성 모드를 종료합니다");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    isVoiceMode,
    selectedBusIndex,
    buses,
    selectedBus,
    fontSize,
    updateFontSizeWithTimer,
  ]);

  return (
    <VStack>
      <Header stationName={stationData?.name || ""} />
      <News articles={NEWS_ITEMS} />

      {/* 글씨 크기 인디케이터 */}
      {fontSize !== 1.4 && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          � 글씨 {Math.round(fontSize * 100)}%
        </div>
      )}

      {/* 음성 모드 인디케이터 */}
      {isVoiceMode && (
        <div
          style={{
            position: "fixed",
            top: fontSize !== 1.4 ? "60px" : "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "#007AFF",
            color: "white",
            padding: "12px 20px",
            borderRadius: "25px",
            fontSize: "14px",
            fontWeight: "bold",
            boxShadow: "0 4px 20px rgba(0, 122, 255, 0.3)",
          }}
        >
          🎤 음성 모드 - {selectedBus?.name}번 선택됨
        </div>
      )}
      <VStack gap={24} fullWidth className={s.container}>
        <Banner />
        <VStack fullWidth gap={12}>
          {buses.map((bus, index) => {
            const isSelected = isVoiceMode && index === selectedBusIndex;

            return (
              <BusArrivalCard
                key={bus.id}
                id={bus.id}
                name={bus.name}
                routeType={bus.routeType}
                arrivalTime={bus.arrivalTime}
                remainingStops={bus.remainingStops}
                isCalled={bus.isCalled}
                stationId={stationId || ""}
                selected={isSelected}
                fontSize={fontSize}
                onBusCall={() => handleBusCall(bus.name, bus.isCalled)}
              />
            );
          })}
        </VStack>
      </VStack>

      <p>마지막 업데이트: {new Date().toLocaleString()}</p>
      {stationData && (
        <AIAgent
          buses={buses}
          stationName={stationData.name}
          stationId={stationId || ""}
        />
      )}
    </VStack>
  );
}
