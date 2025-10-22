import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import s from "./service.module.scss";

interface BusCallResponse {
  hasCall: boolean;
  reason?: string;
  busInfo?: {
    routeNo: string;
    stationName: string;
    currentArrivalTime: number;
    arrPrevStationCnt: number;
  };
  details?: {
    currentArrivalTime: number;
    arrPrevStationCnt: number;
    meetsTimeCondition: boolean;
    meetsStopCondition: boolean;
  };
}

export default function SISServicePage() {
  const { stationId, busId } = useParams();
  const [callStatus, setCallStatus] = useState<BusCallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isFirstLoadDone, setIsFirstLoadDone] = useState(false);
  const [previousHasCall, setPreviousHasCall] = useState<boolean | null>(null);

  // 버스 호출 취소 API 함수
  const cancelBusCall = async () => {
    if (!stationId || !busId) return;

    try {
      console.log(`버스 호출 취소: 정류장 ${stationId}, 버스 ${busId}`);
      const response = await fetch(
        `http://localhost:3000/api/v2/station/${stationId}/bus/${busId}/call`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json();
      console.log("버스 호출 취소 결과:", data);
    } catch (err) {
      console.error("버스 호출 취소 실패:", err);
    }
  };

  // API 호출 함수
  const checkBusCallStatus = async () => {
    if (!stationId || !busId) {
      setError("정류장 ID 또는 버스 ID가 없습니다.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/v2/bus/${stationId}/${busId}/status`,
      );
      const data: BusCallResponse = await response.json();

      // 상태 변화 감지 및 처리
      if (previousHasCall === true && data.hasCall === false) {
        console.log("버스 호출 상태가 true -> false로 변경됨. DELETE API 호출");
        await cancelBusCall();
      }

      // 이전 상태 업데이트
      setPreviousHasCall(data.hasCall);

      // 이전 상태와 동일하면 갱신 생략 (불필요한 리렌더 방지)
      setCallStatus((prev) => {
        const prevStr = JSON.stringify(prev);
        const nextStr = JSON.stringify(data);
        return prevStr === nextStr ? prev : data;
      });
      setError(null);
    } catch (err) {
      console.error("API 호출 실패:", err);
      setError("API 호출에 실패했습니다.");
    } finally {
      if (!isFirstLoadDone) {
        setLoading(false);
        setIsFirstLoadDone(true);
      }
    }
  };

  // 컴포넌트 마운트 시 API 호출
  useEffect(() => {
    checkBusCallStatus();
  }, [stationId, busId]);

  // 5초마다 자동 업데이트
  useEffect(() => {
    const interval = setInterval(checkBusCallStatus, 5000);
    return () => clearInterval(interval);
  }, [stationId, busId]);

  // 18시 이후 다크모드 적용
  //   useEffect(() => {
  //     const updateTheme = () => {
  //       const hour = new Date().getHours();
  //       setIsDark(hour >= 18 || hour < 6);
  //     };
  //     updateTheme();
  //     const timer = setInterval(updateTheme, 60 * 1000);
  //     return () => clearInterval(timer);
  //   }, []);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className={s.container}>
        <div className={`${s.card} ${s.errorCard}`}>
          <h1 className={s.errorTitle}>❌ 오류 발생</h1>
          <p className={s.errorText}>{error}</p>
          <button className={s.retryButton} onClick={checkBusCallStatus}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!callStatus) {
    return (
      <div className={s.container}>
        <div className={`${s.card} ${s.errorCard}`}>
          <h1 className={s.errorTitle}>❌ 데이터 없음</h1>
          <p className={s.errorText}>버스 상태 정보를 가져올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${s.container} ${isDark ? s.dark : ""}`}>
      <div
        className={`${s.card} ${
          callStatus.hasCall ? s.callActiveCard : s.callInactiveCard
        }`}
      >
        {callStatus.hasCall ? (
          <>
            <h1 className={s.callActiveTitle}>버스 호출됨</h1>
            {callStatus.busInfo && (
              <div className={s.busInfo}>
                <h2 className={s.busNumber}>{callStatus.busInfo.routeNo}번</h2>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className={s.callInactiveTitle}>호출 없음</h1>
          </>
        )}

        <div className={s.footer}>
          <p className={s.updateTime}>{new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
