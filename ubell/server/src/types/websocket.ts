/**
 * WebSocket 메시지 타입 정의
 */

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface PingMessage extends WebSocketMessage {
  type: "ping";
}

export interface PongMessage extends WebSocketMessage {
  type: "pong";
  timestamp: string;
}

export interface BusCallMessage extends WebSocketMessage {
  type: "busCall";
  stationId: string;
  routeNo: string;
}

export interface BusCallDeleteMessage extends WebSocketMessage {
  type: "busCallDelete";
  stationId: string;
  routeNo: string;
}

export interface CallEndMessage extends WebSocketMessage {
  type: "callEnd";
  stationId: string;
  routeNo: string;
}

export interface BusCallResponse extends WebSocketMessage {
  type: "busCall";
  call: boolean;
}

export interface BusCallDeleteResponse extends WebSocketMessage {
  type: "busCallDelete";
  call: boolean;
}

export interface BusCallEndMessage extends WebSocketMessage {
  type: "busCallEnd";
  stationId: string;
  routeNo: string;
  timestamp: string;
}

export interface ConnectionMessage extends WebSocketMessage {
  type: "connection";
  message: string;
  timestamp: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: "error";
  message: string;
  timestamp: string;
}
