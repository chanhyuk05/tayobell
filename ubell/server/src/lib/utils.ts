// 거리 계산 (Haversine 공식 사용)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 지구의 반지름 (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km 단위
}

// 버스 평균 속도 (km/h)
const AVERAGE_BUS_SPEED = 25;

// 거리를 기반으로 예상 소요 시간 계산 (분 단위)
export function calculateEstimatedTime(distanceKm: number): number {
  return Math.round((distanceKm / AVERAGE_BUS_SPEED) * 60);
}

// 두 지점 간의 거리를 미터 단위로 반환
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateDistance(lat1, lon1, lat2, lon2) * 1000;
}

// 정류장 순서를 기반으로 남은 정류장 수 계산
export function calculateRemainingStops(
  currentStopIndex: number,
  totalStops: number
): number {
  return Math.max(0, totalStops - currentStopIndex - 1);
}
