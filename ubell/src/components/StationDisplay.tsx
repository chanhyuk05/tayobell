import { useStationData } from '@/shared/hooks/useStationData';

interface StationDisplayProps {
  stationId: string;
}

export default function StationDisplay({ stationId }: StationDisplayProps) {
  const { stationData, loading, error, refetch } = useStationData(stationId);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return (
      <div>
        <p>오류: {error}</p>
        <button onClick={refetch}>다시 시도</button>
      </div>
    );
  }

  if (!stationData) {
    return <div>데이터가 없습니다.</div>;
  }

  return (
    <div>
      <h2>{stationData.name}</h2>
      <div>
        <button onClick={refetch}>수동 새로고침</button>
      </div>
      <div>
        {stationData.buses.map((bus) => (
          <div key={bus.id} style={{ 
            border: '1px solid #ccc', 
            margin: '10px 0', 
            padding: '10px',
            borderRadius: '8px'
          }}>
            <h3>{bus.name}번 ({bus.routeType})</h3>
            <p>도착 예정: {bus.arrivalTime}분</p>
            <p>남은 정거장: {bus.remainingStops}개</p>
            <p>호출 상태: {bus.isCalled ? '호출됨' : '미호출'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
