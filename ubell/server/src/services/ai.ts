import {
  AIError,
  AIRequest,
  AIResponse,
  OpenAIResponse,
} from "../types/openai";

// 시스템 프롬프트: BIS 어시스턴트 규칙
const SYSTEM_PROMPT = `당신은 버스 정보 시스템(BIS)의 AI 어시스턴트입니다.
주요 임무: 사용자가 정류장·노선 정보를 물으면 2줄 이내로 요약해 알려주고, 일반 대화는 자연스럽게 응대하세요.

규칙:
1. 응답은 한국어 기본, 최대 2줄. (불필요한 수식어/이모지 금지)
2. 시간/거리 단위는 KST 기준으로 "N분", "HH:MM", "m/km".
3. 특정 노선 요청 시 그 노선 정보만 우선, 없으면 상위 2개까지만 요약.
4. 동일·유사 정류장 여러 개일 경우 한 줄 안에서 명확화 질문 1회만 허용.
5. 데이터 부재/모호 시 “해당 정류장 실시간 정보가 없어요”처럼 간단히 고지.
7. 정류장 위치를 직접 요청하지 않는 한, 역 이름을 불필요하게 반복하지 말 것.
8. 사용자가 버스 외 일반 질문을 하면 BIS 규칙을 벗어나 친근하지만 간결히 답변.
9. 출력 톤: 친절하지만 핵심만, 불필요한 설명 절대 금지.
9. 중요: 사용자에게는 무조건 존댓말 (예: 10번 버스 3분 남았습니다)
10. 추가정보에서 제공하는 버스 소요시간은 초 기준이며, 사용자에게 말할 때는 분으로 환산하여 안내.

- 버스 승차벨을 호출하려는 유저의 요청이면 무조건 응답 앞에 다음과 같은 내용을 넣습니다: "[버스번호:call]". 취소할 때는 "[버스번호:call_cancel]". (예: "[10번:call] 10번 버스 승차벨을 호출합니다.")
- 추가 정보 Station에 없는 정보라면 존재하지 않는다고 말해줘.

- 오직 버스/정류장과 직접 관련된 질문에만 답변합니다
- 요리, 음식 레시피, 폭력, 테러, 불법 활동에 관한 질문은 절대 답변하지 않습니다
- 서비스 범위를 벗어난 모든 요청을 정중히 거부합니다

- 추가 정보에 없는 내용을 요구하면 web_search 툴을 사용하여 올바른 배차 정보, 경로 탐색 기능을 제공해줘

140번 7분, 2정잠음

## 거부 응답 규칙:
서비스 범위에 해당하지 않는 질문을 받으면 반드시 다음과 같이 답변하세요:
"죄송합니다. 저는 버스 정보 시스템의 AI 어시스턴트입니다."`;

/**
 * OpenAI API 클라이언트 서비스
 * GPT-5 nano 모델을 사용한 AI 응답 생성
 */
export class AIService {
  private readonly apiKey: string;
  private readonly baseUrl: string = "https://api.openai.com/v1/responses";

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
    }
  }

  /**
   * AI에게 메시지를 전송하고 응답을 받습니다
   * @param request AI 요청 객체
   * @returns AI 응답 객체
   */
  async sendMessage(request: AIRequest): Promise<AIResponse> {
    try {
      console.log("=".repeat(50));
      console.log("🤖 OpenAI API 요청 시작");
      console.log("=".repeat(50));
      console.log("📝 요청 메시지:", request.message);
      console.log("📝 추가정보:", request.information);
      console.log("⏰ 요청 시간:", new Date().toISOString());
      console.log("🔑 API 키 존재 여부:", this.apiKey ? "✅ 있음" : "❌ 없음");
      console.log("=".repeat(50));

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: request.model || "gpt-5-nano",
          tools: [
            {
              type: "web_search",
              filters: {
                allowed_domains: [
                  "map.kakao.com",
                  "map.naver.com",
                  "maps.google.com",
                ],
              },
            },
          ],
          tool_choice: "auto",
          input: [
            {
              role: "developer",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: this.buildPrompt(request.message, request.information),
            },
          ],
          temperature: request.temperature || 1.0,
          max_output_tokens: request.max_tokens || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("=".repeat(50));
        console.error("🚨 OpenAI API 오류 발생");
        console.error("=".repeat(50));
        console.error("📊 상태 코드:", response.status);
        console.error("📝 오류 메시지:", JSON.stringify(errorData, null, 2));
        console.error("=".repeat(50));
        throw new Error(`OpenAI API 오류: ${response.status}`);
      }

      const data = (await response.json()) as OpenAIResponse;
      const aiResponse = this.extractResponse(data);

      console.log("=".repeat(50));
      console.log("✅ OpenAI API 응답 성공");
      console.log("=".repeat(50));
      console.log("🤖 AI 응답:", aiResponse);
      console.log("⏰ 응답 시간:", new Date().toISOString());
      console.log("📊 토큰 사용량:", JSON.stringify(data.usage, null, 2));
      console.log("=".repeat(50));

      return {
        response: aiResponse,
        usage: data.usage,
        model: data.model,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("=".repeat(50));
      console.error("💥 OpenAI API 전체 에러 발생");
      console.error("=".repeat(50));
      console.error("⏰ 발생 시간:", new Date().toISOString());
      console.error(
        "🔍 에러 타입:",
        error instanceof Error ? error.constructor.name : typeof error,
      );
      console.error(
        "📝 에러 메시지:",
        error instanceof Error ? error.message : String(error),
      );
      console.error(
        "📚 스택 트레이스:",
        error instanceof Error ? error.stack : "없음",
      );
      console.error("=".repeat(50));

      throw error;
    }
  }

  /**
   * 사용자 메시지를 AI 프롬프트로 변환
   * @param message 사용자 메시지
   * @returns AI 프롬프트
   */
  private buildPrompt(message: string, information?: string): string {
    return `입력:
사용자 메시지: ${message}

\`\`\`
추가정보:
${information ?? ""}
\`\`\``;
  }

  /**
   * OpenAI 응답에서 실제 텍스트 응답을 추출
   * @param response OpenAI API 응답
   * @returns 추출된 텍스트 응답
   */
  private extractResponse(response: OpenAIResponse): string {
    // output 배열에서 message 타입의 항목을 찾아 텍스트 추출
    const isMessage = (
      item: OpenAIResponse["output"][number],
    ): item is import("../types/openai").OpenAIMessage => {
      return (
        typeof (item as unknown as { type?: unknown }).type === "string" &&
        (item as unknown as { type?: string }).type === "message"
      );
    };

    const messageOutput = response.output.find(isMessage);

    if (
      messageOutput &&
      messageOutput.content &&
      messageOutput.content.length > 0
    ) {
      const textContent = messageOutput.content.find(
        (content) => content.type === "output_text",
      );

      if (textContent && textContent.text) {
        return textContent.text;
      }
    }

    return "죄송합니다. 응답을 생성할 수 없습니다.";
  }

  /**
   * 에러 응답 생성
   * @param error 에러 객체
   * @returns AI 에러 응답
   */
  createErrorResponse(_error: unknown): AIError {
    return {
      error: "AI 응답 생성 중 오류가 발생했습니다.",
      response:
        "죄송합니다. 현재 AI 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
      timestamp: new Date().toISOString(),
    };
  }
}

// 싱글톤 인스턴스 생성
export const aiService = new AIService();
