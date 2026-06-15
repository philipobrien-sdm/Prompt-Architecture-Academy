import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini Client with correct User-Agent
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY environment variable is not configured on AI Studio. Please set it in Settings > Secrets.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// 1. Analyze Idea Router
app.post("/api/analyze-idea", async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea || typeof idea !== "string" || idea.trim() === "") {
      res.status(400).json({ error: "Idea description is required and must be a string." });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = 
      "You are an expert prompt engineer and educational instructor at a prestigious Prompt Engineering Academy. " +
      "Your goal is to take a raw, basic idea for an LLM prompt (intended for a repeatable activity) and analyze its structural needs. " +
      "Determine a high-quality approach with rationale. " +
      "Identify exactly 2 or 3 critical ambiguities or missing aspects (e.g. lack of target audience, variables that change per run, specific constraints, or strict format rules). " +
      "Provide 2 or 3 high-impact questions to ask the user in an elegant interactive chat to resolve those ambiguities. " +
      "You MUST return the output strictly in the requested JSON schema structure.";

    const promptText = `Analyze the following basic idea for creating a repeatable/reusable prompt workflow:\n\n"${idea}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedApproach: {
              type: Type.STRING,
              description: "Brief summary of the best practice structural strategy for this specific task."
            },
            rationale: {
              type: Type.STRING,
              description: "Why this strategy is correct for repeatable/automated workloads (e.g., parameter stability, clear delimiters)."
            },
            ambiguities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A bulleted list of omissions or variables in the raw user idea that would cause inconsistencies."
            },
            suggestedQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Engaging and clear questions to clarify the output style, constraints, or input placeholders."
            }
          },
          required: ["suggestedApproach", "rationale", "ambiguities", "suggestedQuestions"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/analyze-idea:", error);
    res.status(500).json({ 
      error: error.message || "An unexpected error occurred while analyzing the prompt idea." 
    });
  }
});

// 2. Chat Assistant Router (Interim Interactive refining step)
app.post("/api/chat", async (req, res) => {
  try {
    const { idea, chatHistory, message } = req.body;
    if (!idea) {
      res.status(400).json({ error: "Idea is required to ground the chat context." });
      return;
    }

    const ai = getGeminiClient();

    // Construct history of prompt discussions
    const formattedHistory = chatHistory && Array.isArray(chatHistory) 
      ? chatHistory.map((item: any) => `${item.role === "user" ? "Student" : "Instructor"}: ${item.text}`).join("\n")
      : "";

    const systemInstruction = 
      "You are a friendly, highly skilled Prompt Engineering Mentor. " +
      "The user (a student) is designing a repeatable prompt workflow starting from this basic idea: " +
      `"${idea}"\n\n` +
      "Your objective is to clarify any loose ends regarding: \n" +
      "- What parameters are input each time (e.g., text blocks, files, data variables)\n" +
      "- Target audience, tone, formatting constraints, output length, or strict rules.\n" +
      "Ask exactly one polite, constructive question at a time to keep the exchange digestible. " +
      "Explain ideas clearly and show why they make a difference in repeatable tasks. " +
      "Keep answers warm, professional, encouraging, and under 150 words.";

    const promptText = `Here is our conversation history:\n${formattedHistory}\n\nStudent's latest message:\n"${message || ""}"\n\nMentor response:`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ 
      error: error.message || "An unexpected error occurred during the interactive chat session." 
    });
  }
});

// 3. Templated Prompt Generator Router
app.post("/api/generate-templated-prompt", async (req, res) => {
  try {
    const { idea, chatHistory, templateId, templateName, templateStructure } = req.body;
    if (!idea || !templateId) {
      res.status(400).json({ error: "Missing required fields (idea, templateId)." });
      return;
    }

    const ai = getGeminiClient();

    const formattedHistory = chatHistory && Array.isArray(chatHistory)
      ? chatHistory.map((item: any) => `${item.role === "user" ? "Student" : "Instructor"}: ${item.text}`).join("\n")
      : "No chat history.";

    const systemInstruction = 
      "You are an elite Prompt Engineering Compiler. " +
      "Your duty is to generate a pristine, ready-to-run, repeatable LLM Prompt using a designated prompt engineering template pattern. " +
      "The user's core idea is: " + `"${idea}"\n` +
      "The user clarified these preferences during a mentor chat: \n" + `${formattedHistory}\n` +
      `The selected template pattern is: "${templateName || templateId}"\n` +
      `The visual structural style of this template is:\n${templateStructure || ""}\n\n` +
      "Guidelines for the prompt:\n" +
      "- It must be a repeatable template. That means it must contain clear instructions, roles, constraints, and capital-letter parameters/variable tokens (e.g., [INPUT_DATA], [TONE], [CONTRAINTS]) that a user can easily substitute each time they run this prompt.\n" +
      "- Ensure there are clear delimiters (e.g., triple quotes, markdown blocks) surrounding instructions, rules, and input variables.\n\n" +
      "Guidelines for the side notes:\n" +
      "- Produce side notes analyzing specific sections of the generated prompt (aim for 3-5 notes).\n" +
      "- Each note must connect back to a substring/section of the prompt, detail the prompt engineering philosophy applied (e.g. role priming, system guidelines, delimiters, negative constraints), and explain why this improves quality and predictability.\n" +
      "- Produce a short 'overallWhy' statement justifying the template selection and structure.";

    const promptText = "Compile the customized template prompt and associated educational notes now.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            completedPrompt: {
              type: Type.STRING,
              description: "The complete repeatable template prompt containing uppercase placeholder tokens (e.g. [SUBMITTED_TRANSCRIPT]) and delimiters. Do not escape markdown format inside it."
            },
            sideNotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  targetSection: {
                    type: Type.STRING,
                    description: "Specific exact subtitle or line snippet from the completedPrompt being highlighted (e.g. '# ROLE & INSTRUCTIONS' or '### CONSTRAINTS')."
                  },
                  note: {
                    type: Type.STRING,
                    description: "Details of exactly how this section reduces AI hallucination, shapes output, or improves consistency across multiple runs."
                  },
                  principle: {
                    type: Type.STRING,
                    description: "The prompt-engineering terminology used (e.g. 'Role-priming', 'Negative reinforcement', 'Dynamic placeholders', 'Format stabilization')."
                  }
                },
                required: ["targetSection", "note", "principle"]
              },
              description: "Commentaries analyzing parts of the prompt code."
            },
            overallWhy: {
              type: Type.STRING,
              description: "A summary explanation of why this combined template approach fits the repeatability criteria beautifully."
            }
          },
          required: ["completedPrompt", "sideNotes", "overallWhy"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from prompt rendering engine.");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/generate-templated-prompt:", error);
    res.status(500).json({ 
      error: error.message || "An unexpected error occurred while compiling your finished template." 
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production statics
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
