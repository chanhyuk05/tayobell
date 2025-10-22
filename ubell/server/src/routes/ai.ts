import { Request, Response, Router } from "express";

import { aiService } from "../services/ai";
import { AIRequest } from "../types/openai";

const router = Router();

/**
 * AI 메시지 처리 엔드포인트
 */
router.post("/agent", async (req: Request, res: Response) => {
  try {
    const { message, model, temperature, max_tokens, information } = req.body;

    // 요청 유효성 검사
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "메시지가 필요합니다.",
        response: "올바른 메시지를 입력해주세요.",
        timestamp: new Date().toISOString(),
      });
    }

    // AI 요청 객체 생성
    const aiRequest: AIRequest = {
      message,
      model,
      temperature,
      max_tokens,
      information,
    };

    // AI 서비스 호출
    const aiResponse = await aiService.sendMessage(aiRequest);

    // 성공 응답
    res.json(aiResponse);
  } catch (error) {
    console.error("AI 라우트 에러:", error);

    // 에러 응답 생성
    const errorResponse = aiService.createErrorResponse(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * AI 서비스 상태 확인 엔드포인트
 * GET /api/v2/ai/status
 */
router.get("/status", (req: Request, res: Response) => {
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY;

    res.json({
      status: "ok",
      hasApiKey,
      timestamp: new Date().toISOString(),
      message: hasApiKey
        ? "AI 서비스가 정상적으로 설정되었습니다."
        : "OpenAI API 키가 설정되지 않았습니다.",
    });
  } catch (error) {
    console.error("AI 상태 확인 에러:", error);
    res.status(500).json({
      status: "error",
      message: "AI 서비스 상태를 확인할 수 없습니다.",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * AI 모델 정보 조회 엔드포인트
 * GET /api/v2/ai/models
 */
router.get("/models", (req: Request, res: Response) => {
  try {
    const models = [
      {
        id: "gpt-5-nano",
        name: "GPT-5 Nano",
        description: "가장 빠르고 효율적인 모델",
        max_tokens: 4096,
        cost_per_1k_tokens: 0.001,
      },
      {
        id: "gpt-4o",
        name: "GPT-4o",
        description: "고성능 멀티모달 모델",
        max_tokens: 128000,
        cost_per_1k_tokens: 0.005,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "경량화된 GPT-4o 모델",
        max_tokens: 128000,
        cost_per_1k_tokens: 0.00015,
      },
    ];

    res.json({
      models,
      default_model: "gpt-5-nano",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI 모델 정보 조회 에러:", error);
    res.status(500).json({
      error: "모델 정보를 조회할 수 없습니다.",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
