import { ChatMessage, IdeaAnalysis, GeneratedPromptResult } from "../types";

export interface LocalLlmConfig {
  enabled: boolean;
  endpoint: string;
  model: string;
}

export interface ConnectionTestResult {
  success: boolean;
  statusText: string;
  latency?: number;
  availableModels?: string[];
  errorDetails?: string;
}

/**
 * Attempts to ping the local LLM endpoint and discover available models.
 */
export async function testLocalConnection(endpoint: string): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  const sanitizedUrl = endpoint.replace(/\/+$/, "");

  try {
    // 1. Try fetching available models first (OpenAI-compatible structure)
    const response = await fetch(`${sanitizedUrl}/models`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      const availableModels: string[] = [];
      
      if (data && Array.isArray(data.data)) {
        data.data.forEach((m: any) => {
          if (m.id) availableModels.push(m.id);
        });
      }

      return {
        success: true,
        statusText: "Connection confirmed! Detected an OpenAI-compatible locally hosted API.",
        latency,
        availableModels,
      };
    }
  } catch (err: any) {
    // Retry with alternate endpoint layout or continue to fail
  }

  // Fallback 2: Check standard Ollama raw api (for users putting just base URL)
  try {
    const rawOllamaResponse = await fetch(`${sanitizedUrl}/api/tags`, {
      method: "GET",
    });
    
    if (rawOllamaResponse.ok) {
      const data = await rawOllamaResponse.json();
      const availableModels: string[] = [];
      if (data && Array.isArray(data.models)) {
        data.models.forEach((m: any) => {
          if (m.name) availableModels.push(m.name);
        });
      }

      return {
        success: true,
        statusText: "Connection confirmed! Detected Ollama API endpoint tags.",
        latency: Date.now() - startTime,
        availableModels,
      };
    }
  } catch (e) {}

  return {
    success: false,
    statusText: "Verification failed. Could not establish communication with local server.",
    errorDetails: 
      "Be sure that your local server (Ollama, LM Studio, or LocalAI) is currently booted and CORS settings allow requests. " +
      "For example, execute your terminal with: OLLAMA_ORIGINS=\"*\" ollama serve",
  };
}

/**
 * Executes a completion from a locally configured OpenAI-compatible endpoint.
 */
async function callLocalChat(
  config: LocalLlmConfig,
  systemInstruction: string,
  userPrompt: string,
  history: ChatMessage[] = []
): Promise<string> {
  const sanitizedUrl = config.endpoint.replace(/\/+$/, "");
  
  // Format history messages
  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map(msg => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.text,
    })),
    { role: "user", content: userPrompt }
  ];

  const response = await fetch(`${sanitizedUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "default",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const rawError = await response.text();
    throw new Error(`Local LLM Server returned status ${response.status}: ${rawError}`);
  }

  const result = await response.json();
  const outputText = result?.choices?.[0]?.message?.content;
  if (!outputText) {
    throw new Error("Received an empty completion response from your local LLM.");
  }

  return outputText;
}

/**
 * Helper to clean Markdown JSON blocks
 */
function cleanAndParseJson(text: string): any {
  let cleaned = text.trim();
  // Strip out markdown formatting if returned
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Regex fallback to find nested arrays or objects if text surrounds it
    const mathObj = cleaned.match(/\{[\s\S]*\}/);
    if (mathObj) {
      try {
        return JSON.parse(mathObj[0]);
      } catch (innerErr) {
        throw new Error("Could not parse output as valid JSON. Prompt: " + cleaned);
      }
    }
    throw new Error("The local LLM response failed to compile into a validated JSON structure.");
  }
}

/**
 * Phase 1 Local LLM: Analyze Idea
 */
export async function localAnalyzeIdea(config: LocalLlmConfig, idea: string): Promise<IdeaAnalysis> {
  const systemInstruction = 
    "You are an expert prompt engineer and educational instructor. " +
    "Analyze the following basic idea for creating a repeatable/reusable prompt workflow. " +
    "You MUST respond ONLY with a clean, standard JSON payload matching this exact schema: " +
    `{
      "suggestedApproach": "string summary of the strategy",
      "rationale": "explaining why this fits repeatable patterns",
      "ambiguities": ["critical flaw 1", "critical flaw 2"],
      "suggestedQuestions": ["clarification question 1", "clarification question 2"]
    } \nDo not include any conversational intro or outro text. Output raw JSON only.`;

  const prompt = `Analyze this prompt idea:\n\n"${idea}"`;
  const rawResponse = await callLocalChat(config, systemInstruction, prompt);
  return cleanAndParseJson(rawResponse) as IdeaAnalysis;
}

/**
 * Phase 2 Local LLM: Mentor Chat Response
 */
export async function localChatMentor(
  config: LocalLlmConfig,
  idea: string,
  chatHistory: ChatMessage[],
  latestMsg: string
): Promise<string> {
  const systemInstruction = 
    "You are a friendly, highly skilled Prompt Engineering Mentor. " +
    "The user is planning a repeatable prompt template beginning with this base concept: " +
    `"${idea}"\n` +
    "Discuss variables, format constraints, and negative boundaries. Ask strictly one short, constructive question at a time. Do not compile the prompt yet. Keep answers encouraging, clear, and under 120 words.";

  const historyPrompt = chatHistory.map(m => `${m.role === "user" ? "Student" : "Instructor"}: ${m.text}`).join("\n");
  const userPrompt = `History:\n${historyPrompt}\n\nStudent's latest response: "${latestMsg}"\n\nGenerate your reply:`;
  return await callLocalChat(config, systemInstruction, userPrompt);
}

/**
 * Phase 3 Local LLM: Compile Final Prompt
 */
export async function localCompilePrompt(
  config: LocalLlmConfig,
  idea: string,
  chatHistory: ChatMessage[],
  templateName: string,
  templateStructure: string
): Promise<GeneratedPromptResult> {
  const systemInstruction = 
    "You are an elite Prompt Engineering Compiler in a training academy. " +
    "You must generate a pristine, ready-to-run repeatable template prompt using the provided structural layout. " +
    "Your output MUST be a valid JSON payload matching this schema exactly: " +
    `{
      "completedPrompt": "The full prompt containing placeholders in brackets like [RAW_DATA]",
      "sideNotes": [
        {
          "targetSection": "Substring or header exactly matching details in the completedPrompt",
          "note": "How this mitigates variance or handles edge-cases",
          "principle": "E.g., Role-priming or delimiters"
        }
      ],
      "overallWhy": "A short summary explaining why this configuration is optimized."
    } \nOutput only valid JSON. Avoid wrapping inside other blocks.`;

  const conversationHistoryText = chatHistory.map(m => `${m.role === "user" ? "Student" : "Instructor"}: ${m.text}`).join("\n");
  const userPrompt = 
    `Core Idea: "${idea}"\n` +
    `Refinement History:\n${conversationHistoryText}\n\n` +
    `Pattern Name: "${templateName}"\n` +
    `Pattern Skeleton Structure:\n${templateStructure}\n\n` +
    "Compile the template and return the validated JSON now.";

  const rawResponse = await callLocalChat(config, systemInstruction, userPrompt);
  return cleanAndParseJson(rawResponse) as GeneratedPromptResult;
}
