import { useEffect, useState } from "react";

import { Bus } from "../types";

export function useBusSelection(buses: Bus[], disabled = false) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    console.log("🎯 useBusSelection 이벤트 등록 - disabled:", disabled);

    if (disabled) {
      console.log("🎯 useBusSelection 비활성화됨");
      return; // 비활성화된 경우 키보드 이벤트 등록하지 않음
    }

    let timeoutId: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key;
      console.log("🎯 useBusSelection 키 입력:", key);

      // 2번이나 8번을 누르면 0번 인덱스부터 시작
      if (key === "2" || key === "8") {
        console.log("🎯 2/8키 처리 - 현재 selectedIndex:", selectedIndex);

        if (selectedIndex === null) {
          console.log("🎯 첫 선택 - 0번 인덱스 설정");
          setSelectedIndex(0);
        } else {
          if (key === "2") {
            const nextIndex = Math.min(buses.length - 1, selectedIndex + 1);
            console.log("🎯 2키 - 다음 인덱스:", nextIndex);
            setSelectedIndex(nextIndex);
          }
          if (key === "8") {
            const prevIndex = Math.max(0, selectedIndex - 1);
            console.log("🎯 8키 - 이전 인덱스:", prevIndex);
            setSelectedIndex(prevIndex);
          }
        }
      }

      if (key === "Enter") {
        const selectedBus = buses[selectedIndex || 0];
        console.log("🎯 Enter키 - 호출할 버스:", selectedBus);
      }

      // 5초 타이머 리셋
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log("🎯 5초 타이머 만료 - 선택 해제");
        setSelectedIndex(null);
      }, 5000);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      clearTimeout(timeoutId);
    };
  }, [buses, selectedIndex, disabled]);

  return {
    selectedIndex,
    setSelectedIndex,
    selectedBus: selectedIndex !== null ? buses[selectedIndex] || null : null,
  };
}
