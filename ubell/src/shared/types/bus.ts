export interface Bus {
  id: string;
  name: string; // 56-1번
  routeType: "일반버스" | "마을버스" | "광역버스" | "급행버스";
  arrivalTime: number; // 도착 시간
  remainingStops: number; // 남은 정류장 수
  isCalled: boolean; // 호출 상태
}

export interface Station {
  name: string;
  buses: Bus[];
}
