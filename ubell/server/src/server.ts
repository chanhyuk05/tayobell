import { PrismaClient } from "@prisma/client";
import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { WebSocketServer } from "ws";

import AIRoutes from "./routes/ai";
import BusRoutes from "./routes/bus";
// import BISRoutes from "./routes/bis";
// import SISRoutes from "./routes/sis";
import { addClient, removeClient } from "./routes/sis";
import StationRoutes from "./routes/station";
import { WebSocketMessage } from "./types/websocket";

dotenv.config();

const app: Application = express();
const prisma = new PrismaClient();
const PORT: number = parseInt(process.env.PORT || "3000", 10);

// 전역 WebSocket 서버 인스턴스
export let globalWss: WebSocketServer | null = null;

// CORS 설정
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use(express.static("public"));

// 라우트
// app.use("/api/bis", BISRoutes);
// app.use("/api/sis", SISRoutes);

app.use("/api/v2/station", StationRoutes);
app.use("/api/v2/bus", BusRoutes);
app.use("/api/v2/ai", AIRoutes);

// 기본 라우트
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "U-Bell API에 오신 것을 환영합니다!" });
});

// 에러 핸들링 미들웨어
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
});

// 404 핸들러
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({ error: "요청한 리소스를 찾을 수 없습니다." });
});

// 서버 시작
async function startServer(): Promise<void> {
  try {
    console.log("=".repeat(60));
    console.log("🚀 U-Bell 서버 시작 중...");
    console.log("=".repeat(60));

    await prisma.$connect();
    console.log("✅ 데이터베이스 연결 성공");

    const server = app.listen(PORT, () => {
      console.log("=".repeat(60));
      console.log("🎉 서버 시작 완료!");
      console.log("=".repeat(60));
      console.log("🌐 HTTP 서버:", `http://localhost:${PORT}`);
      console.log("🔌 WebSocket 서버:", `ws://localhost:${PORT}`);
      console.log("📊 API 엔드포인트:");
      console.log("   - GET  /api/v2/station/:id");
      console.log("   - POST /api/v2/ai");
      console.log("   - GET  /api/v2/ai/status");
      console.log("   - GET  /api/v2/ai/models");
      console.log("   - GET  /api/sis/status");
      console.log("⏰ 시작 시간:", new Date().toISOString());
      console.log("=".repeat(60));

      // 통합 WebSocket 서버 초기화
      globalWss = new WebSocketServer({ server });
      const wss = globalWss;

      wss.on("connection", (ws, req) => {
        const url = req.url;
        const clientIP = req.socket.remoteAddress;

        console.log("=".repeat(40));
        console.log("🔌 WebSocket 연결됨");
        console.log("=".repeat(40));
        console.log("🌐 URL:", url);
        console.log("📍 클라이언트 IP:", clientIP);
        console.log("⏰ 연결 시간:", new Date().toISOString());
        console.log("=".repeat(40));

        if (url === "/api/bis/ws") {
          // BIS WebSocket 처리
          console.log("✅ BIS WebSocket 클라이언트 연결됨");

          ws.send(
            JSON.stringify({
              type: "connection",
              message: "BIS WebSocket에 연결되었습니다.",
              timestamp: new Date().toISOString(),
            }),
          );

          ws.on("message", async (message) => {
            try {
              const data = JSON.parse(message.toString()) as WebSocketMessage;
              // console.log("BIS WebSocket 메시지 수신:", data);

              switch (data.type) {
                case "ping":
                  ws.send(
                    JSON.stringify({
                      type: "pong",
                      timestamp: new Date().toISOString(),
                    }),
                  );
                  break;
                case "busCall": {
                  const { stationId, routeNo } = data as {
                    stationId: string;
                    routeNo: string;
                  };

                  // console.log(stationId, routeNo);

                  const isStationBusExist = await prisma.bus.findMany({
                    where: {
                      stationId: stationId,
                    },
                  });
                  if (
                    isStationBusExist.length === 0 ||
                    !stationId ||
                    !routeNo
                  ) {
                    ws.send(
                      JSON.stringify({
                        type: "error",
                        message: "찾을 수 없는 버스 정보입니다.",
                        timestamp: new Date().toISOString(),
                      }),
                    );
                    return;
                  }

                  const busData = await prisma.busCall.findMany({
                    where: {
                      busId: `${stationId}-${routeNo}`,
                    },
                  });
                  if (busData.length === 0) {
                    await prisma.busCall.create({
                      data: {
                        busId: `${stationId}-${routeNo}`,
                        stationId: stationId,
                      },
                    });
                  }
                  ws.send(
                    JSON.stringify({
                      type: "busCall",
                      call: true,
                    }),
                  );
                  break;
                }

                case "busCallDelete": {
                  const { stationId: deleteStationId, routeNo: deleteRouteNo } =
                    data as { stationId: string; routeNo: string };
                  await prisma.busCall.delete({
                    where: {
                      busId_stationId: {
                        busId: deleteRouteNo,
                        stationId: deleteStationId,
                      },
                    },
                  });
                  ws.send(
                    JSON.stringify({
                      type: "busCallDelete",
                      call: false,
                    }),
                  );
                  break;
                }
                default:
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "알 수 없는 메시지 타입입니다.",
                      timestamp: new Date().toISOString(),
                    }),
                  );
              }
            } catch (error) {
              console.error("WebSocket 메시지 파싱 오류:", error);
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "잘못된 메시지 형식입니다.",
                  timestamp: new Date().toISOString(),
                }),
              );
            }
          });
        } else if (url === "/api/sis/ws") {
          // SIS WebSocket 처리
          console.log("✅ SIS WebSocket 클라이언트 연결됨");

          // SIS 클라이언트 목록에 추가
          addClient(ws);

          ws.send(
            JSON.stringify({
              type: "connection",
              message: "SIS WebSocket에 연결되었습니다.",
              timestamp: new Date().toISOString(),
            }),
          );

          ws.on("message", (message) => {
            // console.log("SIS WebSocket 메시지 수신:", message.toString());

            try {
              const data = JSON.parse(message.toString()) as WebSocketMessage;

              switch (data.type) {
                case "callEnd": {
                  const { stationId, routeNo } = data as {
                    stationId: string;
                    routeNo: string;
                  };

                  if (stationId && routeNo) {
                    // BusCall 데이터 삭제
                    prisma.busCall
                      .deleteMany({
                        where: {
                          busId: `${stationId}-${routeNo}`,
                          stationId: stationId,
                        },
                      })
                      .then(() => {
                        // console.log(
                        //   `BusCall 삭제 완료: ${stationId}-${routeNo}`,
                        // );

                        // BIS 클라이언트들에게도 호출 종료 알림 브로드캐스트
                        if (globalWss) {
                          globalWss.clients.forEach((client) => {
                            if (client.readyState === 1) {
                              // WebSocket.OPEN
                              client.send(
                                JSON.stringify({
                                  type: "busCallEnd",
                                  stationId: stationId,
                                  routeNo: routeNo,
                                  timestamp: new Date().toISOString(),
                                }),
                              );
                            }
                          });
                        }
                      })
                      .catch((error) => {
                        console.error("BusCall 삭제 중 오류:", error);
                      });
                  }
                  break;
                }

                default:
                // console.log("알 수 없는 SIS 메시지 타입:", data.type);
              }
            } catch (error) {
              console.error("SIS WebSocket 메시지 파싱 오류:", error);
            }
          });

          ws.on("close", () => {
            // SIS 클라이언트 목록에서 제거
            removeClient(ws);
            console.log("=".repeat(40));
            console.log("🔌 SIS WebSocket 연결 해제됨");
            console.log("=".repeat(40));
            console.log("⏰ 해제 시간:", new Date().toISOString());
            console.log("=".repeat(40));
          });
        }

        ws.on("close", () => {
          console.log("=".repeat(40));
          console.log("🔌 WebSocket 연결 해제됨");
          console.log("=".repeat(40));
          console.log("⏰ 해제 시간:", new Date().toISOString());
          console.log("=".repeat(40));
        });

        ws.on("error", (error) => {
          console.error("=".repeat(40));
          console.error("💥 WebSocket 오류 발생");
          console.error("=".repeat(40));
          console.error("⏰ 발생 시간:", new Date().toISOString());
          console.error(
            "🔍 오류 타입:",
            error instanceof Error ? error.constructor.name : typeof error,
          );
          console.error(
            "📝 오류 메시지:",
            error instanceof Error ? error.message : String(error),
          );
          console.error(
            "📚 스택 트레이스:",
            error instanceof Error ? error.stack : "없음",
          );
          console.error("=".repeat(40));
        });
      });

      // console.log("통합 WebSocket 서버가 초기화되었습니다.");
    });
  } catch (error) {
    console.error("=".repeat(60));
    console.error("💥 서버 시작 실패!");
    console.error("=".repeat(60));
    console.error("⏰ 실패 시간:", new Date().toISOString());
    console.error(
      "🔍 오류 타입:",
      error instanceof Error ? error.constructor.name : typeof error,
    );
    console.error(
      "📝 오류 메시지:",
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      "📚 스택 트레이스:",
      error instanceof Error ? error.stack : "없음",
    );
    console.error("=".repeat(60));
    console.error("❌ 서버를 종료합니다...");
    process.exit(1);
  }
}

startServer();

// WebSocket을 통해 BIS 클라이언트에게 메시지 브로드캐스트
export function broadcastToBISClients(message: unknown) {
  if (globalWss) {
    const messageStr = JSON.stringify(message);
    globalWss.clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        client.send(messageStr);
      }
    });
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
