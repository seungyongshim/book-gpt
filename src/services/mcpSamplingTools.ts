import { StoredTool } from './types';

// MCP (Model Context Protocol) Sampling Tools
// These tools provide sampling functionality similar to MCP sampling capabilities

export const mcpSamplingTools: StoredTool[] = [
  {
    id: 'mcp-text-sampling',
    name: 'mcp_text_sampling',
    description: 'MCP 스타일 텍스트 샘플링을 수행합니다. 주어진 프롬프트에서 다양한 샘플링 전략을 사용하여 텍스트를 생성합니다.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '샘플링할 프롬프트 텍스트'
        },
        temperature: {
          type: 'number',
          description: '샘플링 온도 (0.0-2.0). 높을수록 더 창의적이고 무작위적인 결과',
          minimum: 0.0,
          maximum: 2.0
        },
        max_tokens: {
          type: 'integer',
          description: '생성할 최대 토큰 수',
          minimum: 1,
          maximum: 4000
        },
        top_p: {
          type: 'number',
          description: 'Nucleus sampling 매개변수 (0.0-1.0)',
          minimum: 0.0,
          maximum: 1.0
        },
        top_k: {
          type: 'integer',
          description: 'Top-K sampling 매개변수',
          minimum: 1,
          maximum: 100
        }
      },
      required: ['prompt']
    },
    executeCode: `
// MCP 텍스트 샘플링 시뮬레이션
const { prompt, temperature = 1.0, max_tokens = 100, top_p = 0.9, top_k = 50 } = args;

if (!prompt || typeof prompt !== 'string') {
  throw new Error('prompt는 필수 문자열 매개변수입니다.');
}

// 샘플링 파라미터 검증
if (temperature < 0 || temperature > 2) {
  throw new Error('temperature는 0.0과 2.0 사이여야 합니다.');
}

if (top_p < 0 || top_p > 1) {
  throw new Error('top_p는 0.0과 1.0 사이여야 합니다.');
}

// MCP 샘플링 시뮬레이션 로직
const samplingInfo = {
  strategy: 'nucleus_sampling',
  parameters: {
    temperature,
    top_p,
    top_k,
    max_tokens
  }
};

// 실제 MCP에서는 모델을 통해 텍스트를 생성하지만, 
// 여기서는 시뮬레이션된 응답을 반환합니다.
const simulatedResponse = generateSimulatedResponse(prompt, temperature, max_tokens);

return {
  sampled_text: simulatedResponse,
  sampling_info: samplingInfo,
  input_prompt: prompt,
  metadata: {
    generated_at: new Date().toISOString(),
    sampling_method: 'mcp_text_sampling'
  }
};

function generateSimulatedResponse(prompt, temp, maxTokens) {
  // 온도에 따른 응답 변화 시뮬레이션
  const baseResponses = [
    "이는 흥미로운 주제입니다. 더 자세히 알아보겠습니다.",
    "좋은 질문이네요. 이에 대해 설명드리겠습니다.",
    "이 문제에 대한 다양한 관점을 고려해보겠습니다.",
    "제가 이해한 바로는 다음과 같습니다.",
    "이 주제와 관련하여 몇 가지 중요한 점들이 있습니다."
  ];
  
  let response = baseResponses[Math.floor(Math.random() * baseResponses.length)];
  
  // 온도가 높을수록 더 창의적이고 긴 응답
  if (temp > 1.2) {
    response += " 창의적이고 혁신적인 접근을 통해 새로운 아이디어를 탐구해보겠습니다.";
  } else if (temp < 0.5) {
    response = response.split('.')[0] + "."; // 더 간결하게
  }
  
  // max_tokens에 따른 길이 조절
  const words = response.split(' ');
  const targetWords = Math.min(words.length, Math.floor(maxTokens * 0.75)); // 토큰 ≈ 단어 * 0.75
  
  return words.slice(0, targetWords).join(' ');
}
`,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  {
    id: 'mcp-token-analysis',
    name: 'mcp_token_analysis',
    description: 'MCP 스타일 토큰 분석을 수행합니다. 텍스트를 토큰으로 분해하고 분석 정보를 제공합니다.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '분석할 텍스트'
        },
        include_probabilities: {
          type: 'boolean',
          description: '토큰 확률 정보 포함 여부',
          default: false
        },
        tokenizer: {
          type: 'string',
          description: '사용할 토크나이저 타입',
          enum: ['gpt-4', 'gpt-3.5', 'claude', 'generic'],
          default: 'gpt-4'
        }
      },
      required: ['text']
    },
    executeCode: `
const { text, include_probabilities = false, tokenizer = 'gpt-4' } = args;

if (!text || typeof text !== 'string') {
  throw new Error('text는 필수 문자열 매개변수입니다.');
}

// 간단한 토큰화 시뮬레이션 (실제로는 tiktoken 등을 사용)
function simpleTokenize(text, tokenizerType) {
  // 공백, 구두점 기준으로 대략적인 토큰화
  const words = text.split(/\\s+/);
  const tokens = [];
  
  for (const word of words) {
    if (word.length > 4) {
      // 긴 단어는 서브워드로 분할
      const chunks = Math.ceil(word.length / 4);
      for (let i = 0; i < chunks; i++) {
        const start = i * 4;
        const end = Math.min(start + 4, word.length);
        tokens.push(word.slice(start, end));
      }
    } else {
      tokens.push(word);
    }
  }
  
  return tokens;
}

function generateTokenProbabilities(tokens) {
  return tokens.map(token => ({
    token,
    probability: 0.3 + Math.random() * 0.7, // 0.3-1.0 사이 랜덤
    log_probability: Math.log(0.3 + Math.random() * 0.7),
    rank: Math.floor(Math.random() * 1000) + 1
  }));
}

const tokens = simpleTokenize(text, tokenizer);
const tokenCount = tokens.length;
const characterCount = text.length;

const result = {
  tokens,
  token_count: tokenCount,
  character_count: characterCount,
  tokenizer_used: tokenizer,
  compression_ratio: characterCount / tokenCount,
  metadata: {
    analyzed_at: new Date().toISOString(),
    analysis_method: 'mcp_token_analysis'
  }
};

if (include_probabilities) {
  result.token_probabilities = generateTokenProbabilities(tokens);
}

return result;
`,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  {
    id: 'mcp-sampling-strategies',
    name: 'mcp_sampling_strategies',
    description: 'MCP 샘플링 전략들을 비교하고 분석합니다. 다양한 샘플링 방법의 특성과 효과를 시뮬레이션합니다.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '테스트할 프롬프트'
        },
        strategies: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['greedy', 'beam_search', 'nucleus', 'top_k', 'temperature']
          },
          description: '비교할 샘플링 전략들',
          default: ['greedy', 'nucleus', 'temperature']
        },
        num_samples: {
          type: 'integer',
          description: '각 전략별 생성할 샘플 수',
          minimum: 1,
          maximum: 10,
          default: 3
        }
      },
      required: ['prompt']
    },
    executeCode: `
const { prompt, strategies = ['greedy', 'nucleus', 'temperature'], num_samples = 3 } = args;

if (!prompt || typeof prompt !== 'string') {
  throw new Error('prompt는 필수 문자열 매개변수입니다.');
}

if (!Array.isArray(strategies) || strategies.length === 0) {
  throw new Error('strategies는 비어있지 않은 배열이어야 합니다.');
}

function generateSamplesByStrategy(prompt, strategy, numSamples) {
  const samples = [];
  
  for (let i = 0; i < numSamples; i++) {
    let sample;
    
    switch (strategy) {
      case 'greedy':
        // 그리디: 항상 가장 확률 높은 토큰 선택 (결정적)
        sample = "가장 확률이 높은 표준적인 응답입니다.";
        break;
        
      case 'beam_search':
        // 빔 서치: 여러 후보 중 최적 선택
        sample = "빔 서치를 통한 균형잡힌 고품질 응답입니다.";
        break;
        
      case 'nucleus':
        // Nucleus (top-p): 누적 확률 기준
        const nucleusVariations = [
          "nucleus sampling으로 생성된 다양하고 일관된 응답입니다.",
          "top-p 방식의 창의적이면서도 관련성 높은 답변입니다.",
          "누적 확률 기반으로 선택된 자연스러운 결과입니다."
        ];
        sample = nucleusVariations[i % nucleusVariations.length];
        break;
        
      case 'top_k':
        // Top-K: 상위 K개 토큰 중에서만 선택
        const topKVariations = [
          "top-k sampling을 통한 제한적이지만 안정적인 응답입니다.",
          "상위 후보 중에서 선택된 신뢰할 수 있는 답변입니다.",
          "k개 후보로 제한하여 생성된 일관성 있는 결과입니다."
        ];
        sample = topKVariations[i % topKVariations.length];
        break;
        
      case 'temperature':
        // Temperature: 온도에 따른 변화
        const temps = [0.3, 0.7, 1.2];
        const temp = temps[i % temps.length];
        if (temp < 0.5) {
          sample = "낮은 온도로 생성된 보수적이고 정확한 응답입니다.";
        } else if (temp > 1.0) {
          sample = "높은 온도로 생성된 창의적이고 독창적인 응답입니다!";
        } else {
          sample = "적당한 온도로 생성된 균형잡힌 응답입니다.";
        }
        break;
        
      default:
        sample = "알 수 없는 전략으로 생성된 기본 응답입니다.";
    }
    
    samples.push({
      text: sample,
      sample_id: i + 1,
      confidence: 0.6 + Math.random() * 0.4,
      metadata: {
        strategy_params: getStrategyParams(strategy),
        generated_at: new Date().toISOString()
      }
    });
  }
  
  return samples;
}

function getStrategyParams(strategy) {
  switch (strategy) {
    case 'greedy': return { type: 'deterministic' };
    case 'beam_search': return { beam_width: 5, length_penalty: 1.0 };
    case 'nucleus': return { top_p: 0.9, temperature: 1.0 };
    case 'top_k': return { k: 50, temperature: 1.0 };
    case 'temperature': return { temperature: 1.0 };
    default: return {};
  }
}

const results = {};
const comparison = [];

for (const strategy of strategies) {
  const samples = generateSamplesByStrategy(prompt, strategy, num_samples);
  results[strategy] = {
    strategy_name: strategy,
    samples,
    diversity_score: calculateDiversityScore(samples),
    average_confidence: samples.reduce((sum, s) => sum + s.confidence, 0) / samples.length
  };
  
  comparison.push({
    strategy,
    sample_count: samples.length,
    avg_length: samples.reduce((sum, s) => sum + s.text.length, 0) / samples.length,
    diversity: results[strategy].diversity_score
  });
}

function calculateDiversityScore(samples) {
  // 간단한 다양성 점수 계산 (텍스트 길이와 내용 기반)
  const lengths = samples.map(s => s.text.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
  return Math.min(variance / 100, 1.0); // 0-1 범위로 정규화
}

return {
  input_prompt: prompt,
  strategies_compared: strategies,
  results,
  comparison_summary: comparison,
  recommendation: getBestStrategy(comparison),
  metadata: {
    analysis_completed_at: new Date().toISOString(),
    total_samples_generated: strategies.length * num_samples
  }
};

function getBestStrategy(comparison) {
  // 다양성과 평균 길이를 고려한 추천
  const sorted = comparison.sort((a, b) => (b.diversity + b.avg_length / 100) - (a.diversity + a.avg_length / 100));
  return {
    recommended_strategy: sorted[0].strategy,
    reason: \`\${sorted[0].strategy} 전략이 다양성(\${sorted[0].diversity.toFixed(3)})과 응답 품질의 균형이 가장 좋습니다.\`
  };
}
`,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  {
    id: 'mcp-context-sampling',
    name: 'mcp_context_sampling',
    description: 'MCP 컨텍스트 기반 샘플링을 수행합니다. 주어진 컨텍스트에 따라 적절한 샘플링 전략을 선택하고 실행합니다.',
    parameters: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description: '샘플링에 사용할 컨텍스트'
        },
        query: {
          type: 'string',
          description: '컨텍스트 기반으로 답변할 질의'
        },
        context_window: {
          type: 'integer',
          description: '사용할 컨텍스트 윈도우 크기 (토큰 수)',
          minimum: 100,
          maximum: 8000,
          default: 2000
        },
        focus_mode: {
          type: 'string',
          enum: ['precise', 'creative', 'balanced'],
          description: '샘플링 초점 모드',
          default: 'balanced'
        }
      },
      required: ['context', 'query']
    },
    executeCode: `
const { context, query, context_window = 2000, focus_mode = 'balanced' } = args;

if (!context || typeof context !== 'string') {
  throw new Error('context는 필수 문자열 매개변수입니다.');
}

if (!query || typeof query !== 'string') {
  throw new Error('query는 필수 문자열 매개변수입니다.');
}

// 컨텍스트 처리 및 윈도우 적용
function truncateContext(context, maxTokens) {
  const words = context.split(/\\s+/);
  const estimatedTokens = words.length * 0.75; // 대략적인 토큰 추정
  
  if (estimatedTokens <= maxTokens) {
    return context;
  }
  
  const targetWords = Math.floor(maxTokens / 0.75);
  return words.slice(0, targetWords).join(' ') + '...';
}

// 포커스 모드에 따른 샘플링 파라미터 결정
function getSamplingParams(mode) {
  switch (mode) {
    case 'precise':
      return {
        temperature: 0.3,
        top_p: 0.8,
        top_k: 20,
        strategy: 'focused'
      };
    case 'creative':
      return {
        temperature: 1.2,
        top_p: 0.95,
        top_k: 80,
        strategy: 'exploratory'
      };
    case 'balanced':
    default:
      return {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 50,
        strategy: 'balanced'
      };
  }
}

// 컨텍스트 관련성 분석
function analyzeContextRelevance(context, query) {
  const contextWords = context.toLowerCase().split(/\\s+/);
  const queryWords = query.toLowerCase().split(/\\s+/);
  
  const commonWords = queryWords.filter(word => 
    contextWords.includes(word) && word.length > 2
  );
  
  const relevanceScore = commonWords.length / queryWords.length;
  
  return {
    relevance_score: relevanceScore,
    common_terms: commonWords,
    context_coverage: commonWords.length / contextWords.length
  };
}

const truncatedContext = truncateContext(context, context_window);
const samplingParams = getSamplingParams(focus_mode);
const relevanceAnalysis = analyzeContextRelevance(context, query);

// 컨텍스트 기반 응답 생성 시뮬레이션
function generateContextualResponse(context, query, params, relevance) {
  let response;
  
  if (relevance.relevance_score > 0.3) {
    // 높은 관련성
    response = \`컨텍스트를 바탕으로 \${query}에 대해 답변드리겠습니다. \${relevance.common_terms.join(', ')} 등의 관련 정보를 확인했습니다.\`;
  } else {
    // 낮은 관련성
    response = \`제공된 컨텍스트에서 \${query}와 직접적으로 관련된 정보는 제한적이지만, 가능한 범위에서 답변을 제공하겠습니다.\`;
  }
  
  // 포커스 모드에 따른 응답 스타일 조정
  switch (params.strategy) {
    case 'focused':
      response += " 정확하고 구체적인 정보를 중심으로 설명드립니다.";
      break;
    case 'exploratory':
      response += " 다양한 관점과 창의적인 해석을 포함하여 폭넓게 탐구해보겠습니다.";
      break;
    case 'balanced':
      response += " 균형잡힌 관점에서 종합적으로 검토해보겠습니다.";
      break;
  }
  
  return response;
}

const generatedResponse = generateContextualResponse(
  truncatedContext, 
  query, 
  samplingParams, 
  relevanceAnalysis
);

return {
  response: generatedResponse,
  context_analysis: {
    original_length: context.length,
    truncated_length: truncatedContext.length,
    tokens_used: Math.floor(truncatedContext.split(/\\s+/).length * 0.75),
    window_utilization: Math.floor(truncatedContext.split(/\\s+/).length * 0.75) / context_window
  },
  relevance_analysis: relevanceAnalysis,
  sampling_config: {
    focus_mode,
    parameters: samplingParams,
    context_window
  },
  metadata: {
    generated_at: new Date().toISOString(),
    method: 'mcp_context_sampling',
    query_processed: query
  }
};
`,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];