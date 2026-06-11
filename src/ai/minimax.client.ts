import axios, { AxiosInstance } from 'axios';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

export interface MinimaxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MinimaxRequest {
  model: string;
  messages: MinimaxMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' | 'text' };
}

export interface MinimaxResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MinimaxClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.minimax.baseUrl,
      timeout: config.minimax.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.minimax.apiKey}`,
      },
    });
  }

  async chat(request: MinimaxRequest): Promise<MinimaxResponse> {
    if (!config.minimax.apiKey) {
      throw new Error('MINIMAX_API_KEY 未配置');
    }
    try {
      const r = await this.client.post<MinimaxResponse>('/chat/completions', request);
      return r.data;
    } catch (e: any) {
      logger.error('Minimax API 调用失败', {
        status: e.response?.status,
        message: e.message,
        data: e.response?.data,
      });
      throw e;
    }
  }

  async chatJSON<T = any>(
    messages: MinimaxMessage[],
    options: Partial<MinimaxRequest> = {}
  ): Promise<{ data: T; usage: MinimaxResponse['usage'] }> {
    const r = await this.chat({
      model: config.minimax.model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      ...options,
    });
    const content = r.choices[0]?.message?.content || '{}';
    let parsed: T;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : ({} as T);
    }
    return { data: parsed, usage: r.usage };
  }

  async chatText(
    messages: MinimaxMessage[],
    options: Partial<MinimaxRequest> = {}
  ): Promise<{ text: string; usage: MinimaxResponse['usage'] }> {
    const r = await this.chat({
      model: config.minimax.model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      ...options,
    });
    return { text: r.choices[0]?.message?.content || '', usage: r.usage };
  }
}

export const minimaxClient = new MinimaxClient();
