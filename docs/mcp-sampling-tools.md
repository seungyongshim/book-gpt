# MCP Sampling Tools Documentation

This document describes the MCP (Model Context Protocol) Sampling Tools that have been implemented in the book-gpt application.

## Overview

The MCP Sampling Tools provide functionality similar to MCP sampling capabilities, allowing users to perform various text generation and analysis tasks with different sampling strategies. These tools are designed to simulate MCP-style operations within the application's function calling system.

## Available Tools

### 1. mcp_text_sampling

Performs MCP-style text sampling with configurable parameters.

**Description**: MCP 스타일 텍스트 샘플링을 수행합니다. 주어진 프롬프트에서 다양한 샘플링 전략을 사용하여 텍스트를 생성합니다.

**Parameters**:
- `prompt` (string, required): 샘플링할 프롬프트 텍스트
- `temperature` (number, optional): 샘플링 온도 (0.0-2.0). 높을수록 더 창의적이고 무작위적인 결과
- `max_tokens` (integer, optional): 생성할 최대 토큰 수 (1-4000)
- `top_p` (number, optional): Nucleus sampling 매개변수 (0.0-1.0)
- `top_k` (integer, optional): Top-K sampling 매개변수 (1-100)

**Example Usage**:
```json
{
  "prompt": "오늘은 좋은 날이에요",
  "temperature": 0.8,
  "max_tokens": 100,
  "top_p": 0.9,
  "top_k": 50
}
```

**Response**:
```json
{
  "sampled_text": "생성된 텍스트",
  "sampling_info": {
    "strategy": "nucleus_sampling",
    "parameters": { "temperature": 0.8, "top_p": 0.9, "top_k": 50, "max_tokens": 100 }
  },
  "input_prompt": "오늘은 좋은 날이에요",
  "metadata": {
    "generated_at": "2025-09-22T14:05:35.000Z",
    "sampling_method": "mcp_text_sampling"
  }
}
```

### 2. mcp_token_analysis

Performs token analysis on text with probability information.

**Description**: MCP 스타일 토큰 분석을 수행합니다. 텍스트를 토큰으로 분해하고 분석 정보를 제공합니다.

**Parameters**:
- `text` (string, required): 분석할 텍스트
- `include_probabilities` (boolean, optional): 토큰 확률 정보 포함 여부
- `tokenizer` (string, optional): 사용할 토크나이저 타입 (gpt-4, gpt-3.5, claude, generic)

**Example Usage**:
```json
{
  "text": "안녕하세요. 이것은 토큰 분석 테스트입니다.",
  "include_probabilities": true,
  "tokenizer": "gpt-4"
}
```

**Response**:
```json
{
  "tokens": ["안녕", "하세", "요.", "이것", "은", "토큰", "분석", "테스", "트입", "니다."],
  "token_count": 10,
  "character_count": 23,
  "tokenizer_used": "gpt-4",
  "compression_ratio": 2.3,
  "token_probabilities": [
    {"token": "안녕", "probability": 0.85, "log_probability": -0.16, "rank": 5},
    // ... more tokens
  ],
  "metadata": {
    "analyzed_at": "2025-09-22T14:05:35.000Z",
    "analysis_method": "mcp_token_analysis"
  }
}
```

### 3. mcp_sampling_strategies

Compares different sampling strategies and provides recommendations.

**Description**: MCP 샘플링 전략들을 비교하고 분석합니다. 다양한 샘플링 방법의 특성과 효과를 시뮬레이션합니다.

**Parameters**:
- `prompt` (string, required): 테스트할 프롬프트
- `strategies` (array, optional): 비교할 샘플링 전략들 (greedy, beam_search, nucleus, top_k, temperature)
- `num_samples` (integer, optional): 각 전략별 생성할 샘플 수 (1-10)

**Example Usage**:
```json
{
  "prompt": "오늘 점심 메뉴 추천해주세요.",
  "strategies": ["greedy", "nucleus", "temperature"],
  "num_samples": 3
}
```

**Response**:
```json
{
  "input_prompt": "오늘 점심 메뉴 추천해주세요.",
  "strategies_compared": ["greedy", "nucleus", "temperature"],
  "results": {
    "greedy": {
      "strategy_name": "greedy",
      "samples": [/* 3 samples */],
      "diversity_score": 0.2,
      "average_confidence": 0.85
    },
    // ... other strategies
  },
  "comparison_summary": [
    {"strategy": "greedy", "sample_count": 3, "avg_length": 45, "diversity": 0.2},
    // ... other summaries
  ],
  "recommendation": {
    "recommended_strategy": "nucleus",
    "reason": "nucleus 전략이 다양성(0.456)과 응답 품질의 균형이 가장 좋습니다."
  }
}
```

### 4. mcp_context_sampling

Performs context-aware sampling with relevance analysis.

**Description**: MCP 컨텍스트 기반 샘플링을 수행합니다. 주어진 컨텍스트에 따라 적절한 샘플링 전략을 선택하고 실행합니다.

**Parameters**:
- `context` (string, required): 샘플링에 사용할 컨텍스트
- `query` (string, required): 컨텍스트 기반으로 답변할 질의
- `context_window` (integer, optional): 사용할 컨텍스트 윈도우 크기 (토큰 수) (100-8000)
- `focus_mode` (string, optional): 샘플링 초점 모드 (precise, creative, balanced)

**Example Usage**:
```json
{
  "context": "오늘은 비가 오고 있습니다. 기온은 18도이고 습도가 높습니다. 우산을 챙기는 것이 좋겠습니다.",
  "query": "오늘 날씨는 어때요?",
  "context_window": 1000,
  "focus_mode": "balanced"
}
```

**Response**:
```json
{
  "response": "컨텍스트를 바탕으로 오늘 날씨는 어때요?에 대해 답변드리겠습니다...",
  "context_analysis": {
    "original_length": 58,
    "truncated_length": 58,
    "tokens_used": 43,
    "window_utilization": 0.043
  },
  "relevance_analysis": {
    "relevance_score": 0.7,
    "common_terms": ["오늘", "날씨"],
    "context_coverage": 0.15
  },
  "sampling_config": {
    "focus_mode": "balanced",
    "parameters": {
      "temperature": 0.7,
      "top_p": 0.9,
      "top_k": 50,
      "strategy": "balanced"
    },
    "context_window": 1000
  }
}
```

## Focus Modes

The `mcp_context_sampling` tool supports three focus modes:

- **precise**: Low temperature (0.3), focused sampling for accurate, conservative responses
- **creative**: High temperature (1.2), exploratory sampling for creative, diverse responses  
- **balanced**: Medium temperature (0.7), balanced approach between precision and creativity

## Integration

These tools are automatically registered when the application starts. They can be called by AI models during conversations when users request MCP sampling functionality or related text generation tasks.

## Testing

Comprehensive test coverage is provided in `src/services/__tests__/mcpSamplingTools.test.ts` with 16 test cases covering:

- Tool registration and availability
- Parameter validation and error handling
- Functionality of each tool
- Different modes and configurations
- Result formatting

## Usage in Chat

Users can request MCP sampling functionality in natural language, such as:

- "MCP 텍스트 샘플링 기능을 사용해서 [프롬프트]로 텍스트를 생성해주세요"
- "토큰 분석을 해주세요: [텍스트]"
- "다양한 샘플링 전략을 비교해주세요"
- "컨텍스트 기반 샘플링을 해주세요"

The AI assistant will automatically use the appropriate MCP sampling tools to fulfill these requests.