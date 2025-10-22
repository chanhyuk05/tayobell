import { Router } from "express";
import { Server } from "http";
// import cron from "node-cron";
import { WebSocket, WebSocketServer } from "ws";

import prisma from "../lib/prisma";

const router = Router();

// WebSocket 서버 인스턴스
// let wss: WebSocketServer;
export let connectedClients: WebSocket[] = [];

// 클라이언트 추가 함수
export function addClient(ws: WebSocket) {
  connectedClients.push(ws);
  // console.log(
  //   `SIS WebSocket 클라이언트 추가됨. 총 ${connectedClients.length}개`,
  // );
}

// 클라이언트 제거 함수
export function removeClient(ws: WebSocket) {
  connectedClients = connectedClients.filter((client) => client !== ws);
  // console.log(
  //   `SIS WebSocket 클라이언트 제거됨. 총 ${connectedClients.length}개`,
  // );
}

// WebSocket 서버 초기화 함수 (더 이상 사용하지 않음)
export function initializeWebSocket(_server: Server) {
  // console.log("SIS WebSocket은 server.ts에서 통합 관리됩니다.");
}

// 모든 연결된 클라이언트에게 브로드캐스트하는 함수
function broadcastToAll(message: unknown) {
  const messageStr = JSON.stringify(message);
  // console.log(
  //   `브로드캐스트 메시지: ${messageStr}, 연결된 클라이언트: ${connectedClients.length}개`,
  // );

  if (connectedClients.length === 0) {
    // console.log("연결된 WebSocket 클라이언트가 없습니다.");
    return;
  }

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// setInterval 사용 - 15초마다 실행
const _intervalId = setInterval(async () => {
  // console.log("setInterval 실행 중... (15초마다)");

  try {
    await checkCondition();
  } catch (error) {
    console.error("setInterval 실행 중 오류 발생:", error);
  }
}, 3000); // 15초 = 15000ms

// 조건 체크 함수 - Bus와 BusCall을 대조하여 조건 확인
async function checkCondition(): Promise<boolean> {
  try {
    // console.log("=== checkCondition 시작 ===");

    // 모든 Bus 데이터 조회
    const allBuses = await prisma.bus.findMany({
      select: {
        id: true,
        stationId: true,
        routeNo: true,
        arrivalTime: true,
        arrPrevStationCnt: true,
        updatedAt: true,
      },
    });

    // console.log(`전체 Bus 데이터 ${allBuses.length}개 조회 완료`);

    if (allBuses.length === 0) {
      // console.log("Bus 데이터가 없습니다.");
      return false;
    }

    // 먼저 모든 BusCall 조회하여 연결된 벨이 있는 버스 파악
    const allBusCalls = await prisma.busCall.findMany({
      select: {
        busId: true,
      },
    });

    const busCallSet = new Set(allBusCalls.map((call) => call.busId));
    // console.log(
    //   `연결된 벨이 있는 버스: ${allBusCalls.length}개 (${Array.from(busCallSet).join(", ")})`,
    // );

    const now = new Date();
    // console.log(`현재 시간: ${now.toISOString()}`);

    // updatedAt을 기준으로 현재 시간과의 차이를 계산하여 arrivalTime 업데이트
    const busesToDelete: string[] = [];
    const eligibleBuses = allBuses.filter((bus) => {
      const timeDiff = Math.floor(
        (now.getTime() - bus.updatedAt.getTime()) / 1000,
      ); // 초 단위
      const currentArrivalTime = Math.max(0, bus.arrivalTime - timeDiff); // 0 이하면 0으로 처리

      // arrivalTime이 0인 버스는 삭제 대상에 추가
      if (currentArrivalTime === 0 && bus.arrPrevStationCnt === 0) {
        busesToDelete.push(bus.id);
        // console.log(
        //   `버스 ${bus.id} (${bus.stationId}-${bus.routeNo}) - 삭제 대상으로 추가됨 (arrivalTime: 0)`,
        // );
        return false;
      }

      // 기존 조건: arrivalTime이 1-60초 사이이고, arrPrevStationCnt가 1인 경우
      const meetsTimeCondition =
        currentArrivalTime >= 1 &&
        currentArrivalTime <= 60 &&
        bus.arrPrevStationCnt === 1;

      // 벨 연결 조건: 해당 버스에 BusCall이 있는 경우
      const busCallId = `${bus.stationId}-${bus.routeNo}`;
      const hasBusCall = busCallSet.has(busCallId);

      // 두 조건 중 하나라도 만족하면 포함
      const isEligible = meetsTimeCondition && hasBusCall;

      // 조건을 만족하는 버스 상세 로그 출력
      if (isEligible) {
        // console.log(`버스 ${bus.id} (${bus.stationId}-${bus.routeNo}):`);
        // console.log(`  - 원본 arrivalTime: ${bus.arrivalTime}초`);
        // console.log(`  - 계산된 arrivalTime: ${currentArrivalTime}초`);
        // console.log(`  - arrPrevStationCnt: ${bus.arrPrevStationCnt}`);
        // console.log(`  - 시간 조건 만족: ${meetsTimeCondition ? "✅" : "❌"}`);
        // console.log(
        //   `  - 벨 연결 상태: ${hasBusCall ? "✅ 연결됨" : "❌ 없음"}`,
        // );
        // console.log(
        //   `  - 최종 포함 여부: ✅ (${meetsTimeCondition ? "시간조건" : ""}${meetsTimeCondition && hasBusCall ? "+" : ""}${hasBusCall ? "벨연결" : ""})`,
        // );
      }

      return isEligible;
    });

    // console.log(`조건을 만족하는 버스: ${eligibleBuses.length}개`);

    // arrivalTime이 0인 버스들과 연결된 BusCall 삭제
    if (busesToDelete.length > 0) {
      try {
        // 먼저 연결된 BusCall 삭제
        const _deletedBusCalls = await prisma.busCall.deleteMany({
          where: {
            busId: {
              in: busesToDelete,
            },
          },
        });
        // console.log(
        //   `연결된 ${deletedBusCalls.count}개 BusCall이 삭제되었습니다.`,
        // );

        // 그 다음 버스 삭제
        await prisma.bus.deleteMany({
          where: {
            id: {
              in: busesToDelete,
            },
          },
        });
        // console.log(
        //   `arrivalTime이 0인 ${busesToDelete.length}개 버스가 삭제되었습니다:`,
        //   busesToDelete,
        // );
      } catch (error) {
        console.error("버스 및 BusCall 삭제 중 오류 발생:", error);
      }
    }

    if (eligibleBuses.length === 0) {
      // console.log("시간 조건을 만족하거나 벨이 연결된 버스가 없습니다.");

      const message = {
        type: "bus_call_list",
        data: {
          eligibleBuses: [],
        },
      };

      broadcastToAll(message);

      return false;
    }

    // console.log("조건을 만족하는 버스 목록:");
    // eligibleBuses.forEach((bus) => {
    //   console.log(`  - ${bus.stationId}-${bus.routeNo} (ID: ${bus.id})`);
    // });

    // eligibleBuses에 포함된 버스들의 BusCall 상태 확인
    const busCallIds = eligibleBuses.map(
      (bus) => `${bus.stationId}-${bus.routeNo}`,
    );
    // console.log(`최종 선택된 버스 ID들: ${busCallIds.join(", ")}`);

    const matchingBusCalls = allBusCalls.filter((call) =>
      busCallIds.includes(call.busId),
    );

    // console.log(
    //   `최종 선택된 버스 중 벨이 연결된 버스: ${matchingBusCalls.length}개`,
    // );
    // if (matchingBusCalls.length > 0) {
    //   console.log("벨이 연결된 버스 목록:");
    //   matchingBusCalls.forEach((call) => {
    //     console.log(`  - ${call.busId}`);
    //   });
    // }

    // 조건을 만족하는 버스가 있으면 항상 WebSocket broadcast
    const message = {
      type: "bus_call_list",
      data: {
        eligibleBuses: eligibleBuses.map((bus) => {
          const busCallId = `${bus.stationId}-${bus.routeNo}`;
          const hasBusCall = matchingBusCalls.some(
            (call) => call.busId === busCallId,
          );

          return {
            id: bus.id,
            stationId: bus.stationId,
            routeNo: bus.routeNo,
            arrivalTime: bus.arrivalTime,
            arrPrevStationCnt: bus.arrPrevStationCnt,
            hasBusCall: hasBusCall,
          };
        }),
      },
    };

    broadcastToAll(message);

    // console.log(
    //   `총 ${eligibleBuses.length}개의 버스 (시간조건 + 벨연결)와 ${matchingBusCalls.length}개의 활성 BusCall을 WebSocket으로 전송했습니다.`,
    // );

    // 포함된 버스들의 조건별 분류 로그
    const timeConditionBuses = eligibleBuses.filter((bus) => {
      const timeDiff = Math.floor(
        (now.getTime() - bus.updatedAt.getTime()) / 1000,
      );
      const currentArrivalTime = Math.max(0, bus.arrivalTime - timeDiff);
      return (
        currentArrivalTime >= 1 &&
        currentArrivalTime <= 60 &&
        bus.arrPrevStationCnt === 1
      );
    });
    const bellConnectedBuses = eligibleBuses.filter((bus) =>
      busCallSet.has(`${bus.stationId}-${bus.routeNo}`),
    );

    // console.log(
    //   `  - 시간 조건만 만족: ${timeConditionBuses.filter((bus) => !busCallSet.has(`${bus.stationId}-${bus.routeNo}`)).length}개`,
    // );
    // console.log(
    //   `  - 벨 연결만 있음: ${bellConnectedBuses.filter((bus) => !timeConditionBuses.includes(bus)).length}개`,
    // );
    // console.log(
    //   `  - 시간조건 + 벨연결: ${bellConnectedBuses.filter((bus) => timeConditionBuses.includes(bus)).length}개`,
    // );

    // console.log("=== checkCondition 완료: true 반환 ===");
    return true;
  } catch (error) {
    // console.error("=== checkCondition 오류 발생 ===");
    // console.error("오류 내용:", error);
    return false;
  }
}

// REST API 엔드포인트들
router.get("/status", (req, res) => {
  res.json({
    status: "SIS 서비스가 정상적으로 실행 중입니다.",
    connectedClients: connectedClients.length,
    timestamp: new Date().toISOString(),
  });
});

export default router;
