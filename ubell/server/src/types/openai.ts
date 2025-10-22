/**
 * OpenAI API 응답 구조 타입 정의
 * GPT-5 nano 모델의 응답 구조를 기반으로 작성
 */

export interface OpenAIBilling {
  payer: string;
}

export interface OpenAIInputTokensDetails {
  cached_tokens: number;
}

export interface OpenAIOutputTokensDetails {
  reasoning_tokens: number;
}

export interface OpenAIUsage {
  input_tokens: number;
  input_tokens_details: OpenAIInputTokensDetails;
  output_tokens: number;
  output_tokens_details: OpenAIOutputTokensDetails;
  total_tokens: number;
}

export interface OpenAITextFormat {
  type: string;
}

export interface OpenAIText {
  format: OpenAITextFormat;
  verbosity: string;
}

export interface OpenAIReasoning {
  effort: string;
  summary: string | null;
}

export interface OpenAILogprob {
  token: string;
  logprob: number;
  bytes: number[] | null;
  top_logprobs: OpenAILogprob[] | null;
}

export interface OpenAIAnnotation {
  type: string;
  text: string;
  start_index: number;
  end_index: number;
  logprobs: OpenAILogprob[] | null;
}

export interface OpenAIContent {
  type: string;
  annotations: OpenAIAnnotation[];
  logprobs: OpenAILogprob[] | null;
  text: string;
}

export interface OpenAIMessage {
  id: string;
  type: string;
  status: string;
  content: OpenAIContent[];
  role: string;
}

export interface OpenAIReasoningStep {
  id: string;
  type: string;
  summary: any[];
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
  background: boolean;
  billing: OpenAIBilling;
  error: string | null;
  incomplete_details: any | null;
  instructions: any | null;
  max_output_tokens: number | null;
  max_tool_calls: number | null;
  model: string;
  output: (OpenAIReasoningStep | OpenAIMessage)[];
  parallel_tool_calls: boolean;
  previous_response_id: string | null;
  prompt_cache_key: string | null;
  reasoning: OpenAIReasoning;
  safety_identifier: string | null;
  service_tier: string;
  store: boolean;
  temperature: number;
  text: OpenAIText;
  tool_choice: string;
  tools: any[];
  top_logprobs: number;
  top_p: number;
  truncation: string;
  usage: OpenAIUsage;
  user: string | null;
  metadata: Record<string, any>;
}

/**
 * AI 요청/응답을 위한 간소화된 타입
 */
export interface AIRequest {
  message: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  information?: string;
}

export interface AIResponse {
  response: string;
  usage?: OpenAIUsage;
  model?: string;
  timestamp: string;
}

export interface AIError {
  error: string;
  response: string;
  timestamp: string;
}
