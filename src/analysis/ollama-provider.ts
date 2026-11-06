import { z } from 'zod';
import { AnalysisOutputSchema, type AnalysisOutput, type Post } from '@/types';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct';

const ANALYSIS_PROMPT = `You are analyzing social media content for professional reputation review. The user is reviewing their own history before a job interview.

CRITICAL INSTRUCTIONS:
- NEVER claim to predict hiring outcomes
- NEVER describe content as "disqualifying"
- NEVER invent policy violations
- Focus on factual, evidence-based assessment
- Consider context: sarcasm, quotes, condemnation vs endorsement, historical content
- Distinguish the author's own statements from shared/quoted content
- Be conservative: respectful disagreement and ordinary expression are not concerns

Assess the post for:
A. General professional concerns (threats, harassment, discriminatory abuse, explicit sexual content, excessive vulgarity, employer disparagement, confidential disclosure, workplace safety concerns)
B. Faith-based organizational context (abuse toward religious communities, celebration of harmful conduct, potential policy conflicts - but NEVER invent policies)

Return ONLY valid JSON matching this exact schema:
{
  "priority": "high" | "medium" | "low" | "none",
  "priority_score": 0-100,
  "professional_assessment": {
    "threats_violence": boolean,
    "harassment_bullying": boolean,
    "discriminatory_abuse": boolean,
    "explicit_sexual": boolean,
    "vulgar_hostile": boolean,
    "employer_disparagement": boolean,
    "confidential_disclosure": boolean,
    "workplace_safety_concerns": boolean,
    "abusive_arguments": boolean,
    "other_concerns": string | null
  },
  "faith_context_assessment": {
    "religious_abuse": boolean,
    "celebration_of_harm": boolean,
    "policy_conflicts": string[],
    "other_concerns": string | null
  },
  "supporting_excerpts": string[],
  "specific_concern": string | null,
  "rationale": string,
  "severity": "critical" | "high" | "medium" | "low" | null,
  "confidence": 0.0-1.0,
  "context_notes": string | null,
  "uncertainty": string | null,
  "policy_grounding": string | null,
  "suggested_action": "review" | "consider_editing" | "consider_visibility" | "no_action",
  "media_reviewed": false
}

Post to analyze:
Platform: {platform}
Type: {record_type}
Text: {text}
Timestamp: {timestamp}
Context: {context}`;

interface OllamaResponse {
  model: string;
  created_at: string;
  response?: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaProvider {
  private host: string;
  private model: string;

  constructor(host?: string, model?: string) {
    this.host = host || OLLAMA_HOST;
    this.model = model || OLLAMA_MODEL;
  }

  async checkHealth(): Promise<{ available: boolean; model: string }> {
    try {
      const response = await fetch(`${this.host}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { available: false, model: this.model };
      }

      const data = await response.json();
      const modelExists = data.models?.some((m: any) => 
        m.name === this.model || m.name.startsWith(this.model.split(':')[0])
      );

      return { available: modelExists, model: this.model };
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return { available: false, model: this.model };
    }
  }

  async analyzePost(post: Post, policyDocument?: string): Promise<AnalysisOutput> {
    const context = [
      post.shared_content ? 'Shared content present' : null,
      post.owner_commentary ? 'User commentary present' : null,
      post.conversation_context ? 'Conversation context available' : null,
      post.import_warnings ? `Warnings: ${post.import_warnings}` : null,
    ]
      .filter(Boolean)
      .join('; ');

    const prompt = ANALYSIS_PROMPT
      .replace('{platform}', post.platform)
      .replace('{record_type}', post.record_type)
      .replace('{text}', post.text || '[No text content]')
      .replace('{timestamp}', post.timestamp ? new Date(post.timestamp).toISOString() : 'Unknown')
      .replace('{context}', context || 'None');

    const finalPrompt = policyDocument
      ? `${prompt}\n\nEmployee Policy Reference:\n${policyDocument}`
      : prompt;

    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: finalPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
          },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      const content = data.response || data.message?.content || '';

      return this.parseAndValidateOutput(content, post.text || '');
    } catch (error) {
      console.error('Ollama analysis error:', error);
      throw error;
    }
  }

  private parseAndValidateOutput(content: string, originalText: string): AnalysisOutput {
    let jsonStr = content.trim();
    
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.supporting_excerpts && Array.isArray(parsed.supporting_excerpts)) {
        parsed.supporting_excerpts = parsed.supporting_excerpts.filter((excerpt: string) => {
          if (!excerpt || typeof excerpt !== 'string') return false;
          const normalized = excerpt.toLowerCase().trim();
          const textNormalized = originalText.toLowerCase();
          return textNormalized.includes(normalized) || normalized.length < 10;
        });
      }

      const validated = AnalysisOutputSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error('Failed to parse Ollama output:', error);
      console.error('Raw output:', content);
      
      return {
        priority: 'none',
        professional_assessment: {
          threats_violence: false,
          harassment_bullying: false,
          discriminatory_abuse: false,
          explicit_sexual: false,
          vulgar_hostile: false,
          employer_disparagement: false,
          confidential_disclosure: false,
          workplace_safety_concerns: false,
          abusive_arguments: false,
          other_concerns: null,
        },
        faith_context_assessment: {
          religious_abuse: false,
          celebration_of_harm: false,
          policy_conflicts: [],
          other_concerns: null,
        },
        supporting_excerpts: [],
        specific_concern: 'Analysis failed - malformed model output',
        rationale: 'The AI model returned invalid output',
        severity: null,
        confidence: 0,
        context_notes: null,
        uncertainty: 'Analysis could not be completed',
        policy_grounding: null,
        suggested_action: 'review',
        media_reviewed: false,
      };
    }
  }

  async analyzeBatch(
    posts: Post[],
    onProgress?: (current: number, total: number) => void,
    policyDocument?: string
  ): Promise<Map<string, AnalysisOutput>> {
    const results = new Map<string, AnalysisOutput>();
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      try {
        const result = await this.analyzePost(post, policyDocument);
        results.set(post.id, result);
        
        if (onProgress) {
          onProgress(i + 1, posts.length);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to analyze post ${post.id}:`, error);
      }
    }

    return results;
  }
}
