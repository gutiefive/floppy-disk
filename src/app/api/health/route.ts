import { NextResponse } from 'next/server';
import { OllamaProvider } from '@/analysis/ollama-provider';

export async function GET() {
  try {
    const provider = new OllamaProvider();
    const health = await provider.checkHealth();

    return NextResponse.json({
      database: true,
      ollama: health.available,
      model: health.model,
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      database: true,
      ollama: false,
      model: process.env.OLLAMA_MODEL || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
