# WebSocket 가이드라인

## 개요
U-Bell 서버는 Express.js와 ws 라이브러리를 사용하여 WebSocket 서버를 제공합니다. BIS(버스 정보 시스템)와 SIS(스마트 정보 시스템) 두 개의 WebSocket 엔드포인트를 지원합니다.

## WebSocket 엔드포인트

### 1. BIS WebSocket (`/api/bis/ws`)
버스 정보 시스템용 WebSocket 연결

**연결 URL**: `ws://localhost:3000/api/bis/ws`

**지원 메시지 타입**:
- `ping`: 연결 상태 확인
- `busCall`: 버스 호출 요청
- `busCallDelete`: 버스 호출 삭제

**메시지 형식**:
```json
// ping 요청
{
  "type": "ping"
}

// busCall 요청
{
  "type": "busCall",
  "stationId": "정류장ID",
  "routeNo": "노선번호"
}

// busCallDelete 요청
{
  "type": "busCallDelete",
  "stationId": "정류장ID",
  "routeNo": "노선번호"
}
```

**응답 형식**:
```json
// 연결 성공
{
  "type": "connection",
  "message": "BIS WebSocket에 연결되었습니다.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// pong 응답
{
  "type": "pong",
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// busCall 응답
{
  "type": "busCall",
  "call": true
}

// 에러 응답
{
  "type": "error",
  "message": "에러 메시지",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. SIS WebSocket (`/api/sis/ws`)
스마트 정보 시스템용 WebSocket 연결

**연결 URL**: `ws://localhost:3000/api/sis/ws`

**자동 메시지**:
- 연결 시: 연결 성공 메시지
- 매분마다: 조건을 만족하는 버스 호출 목록

**응답 형식**:
```json
// 연결 성공
{
  "type": "connection",
  "message": "SIS WebSocket에 연결되었습니다.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// 버스 호출 목록
{
  "type": "bus_call_list",
  "data": {
    "busCallId": ["정류장ID-노선번호"]
  }
}
```

## 클라이언트 연결 예시

### JavaScript/TypeScript
```typescript
// BIS WebSocket 연결
const bisWs = new WebSocket('ws://localhost:3000/api/bis/ws');

bisWs.onopen = () => {
  console.log('BIS WebSocket 연결됨');
};

bisWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('수신된 메시지:', data);
};

// 버스 호출 요청
bisWs.send(JSON.stringify({
  type: 'busCall',
  stationId: '12345',
  routeNo: '100'
}));

// SIS WebSocket 연결
const sisWs = new WebSocket('ws://localhost:3000/api/sis/ws');

sisWs.onopen = () => {
  console.log('SIS WebSocket 연결됨');
};

sisWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'bus_call_list') {
    console.log('버스 호출 목록:', data.data.busCallId);
  }
};
```

### React Hook 예시
```typescript
import { useEffect, useRef } from 'react';

export const useWebSocket = (url: string) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket 연결됨');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('메시지 수신:', data);
    };

    ws.current.onclose = () => {
      console.log('WebSocket 연결 해제됨');
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { sendMessage };
};
```

## 서버 브로드캐스트

### BIS 클라이언트에게 브로드캐스트
```typescript
import { broadcastToBISClients } from '../server';

// 모든 BIS 클라이언트에게 메시지 전송
broadcastToBISClients({
  type: 'busUpdate',
  data: { /* 버스 정보 */ }
});
```

### SIS 클라이언트에게 브로드캐스트
```typescript
import { broadcastToAll } from './routes/sis';

// 모든 SIS 클라이언트에게 메시지 전송
broadcastToAll({
  type: 'notification',
  data: { /* 알림 정보 */ }
});
```

## 에러 처리

### 연결 실패
- 네트워크 오류 시 자동 재연결 로직 구현 권장
- 연결 상태 모니터링 및 사용자에게 알림

### 메시지 전송 실패
- WebSocket 상태 확인 후 전송
- 재시도 로직 구현 권장

## 보안 고려사항

1. **CORS 설정**: 허용된 도메인에서만 연결 가능
2. **메시지 검증**: 모든 수신 메시지의 유효성 검사
3. **연결 제한**: 필요시 연결 수 제한 구현
4. **인증**: 필요시 JWT 토큰 기반 인증 추가

## 모니터링

### 로그 확인
```bash
# 서버 로그에서 WebSocket 연결 상태 확인
tail -f server.log | grep "WebSocket"
```

### 연결 상태 확인
```bash
# SIS 상태 확인
curl http://localhost:3000/api/sis/status
```

## 성능 최적화

1. **연결 풀링**: 불필요한 연결 해제/재연결 방지
2. **메시지 배치**: 여러 메시지를 하나로 묶어 전송
3. **하트비트**: 주기적인 ping/pong으로 연결 상태 유지
4. **메시지 큐**: 연결이 끊어진 경우 메시지 큐에 저장

## 문제 해결

### 일반적인 문제들
1. **연결이 자주 끊어짐**: 네트워크 설정 확인, 하트비트 구현
2. **메시지 전송 실패**: WebSocket 상태 확인, 재연결 로직 구현
3. **메모리 누수**: 연결 해제 시 이벤트 리스너 정리

### 디버깅
```typescript
// WebSocket 상태 확인
console.log('WebSocket 상태:', ws.readyState);
// 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
```
