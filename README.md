# Prompt Architecture Academy 🏛️

An interactive, production-grade educational web application designed to level-up your prompt engineering skills. Learn to translate raw, basic ideas into durable, highly repeatable, and reliable system prompts using industry-standard scaffolding frameworks.

## 🚀 Key Features

*   **Dynamic Workbench**:
    *   **Phase 1 — Structural Analysis**: Evaluates your raw idea to identify ambiguities and potential hallucination vectors.
    *   **Phase 2 — LLM Mentor Chat**: Interactive inline clarification step to lock down dynamic placeholders (e.g., specific inputs, metrics, strict roles).
    *   **Phase 3 — Pattern Compiler**: Compiles your raw idea and chat history into one of four validated architectures: RTFC, CO-STAR, Few-Shot, or Chain-of-Thought.
    *   **Phase 4 — Blueprint Annotation**: Highlights specific blocks within the finalized prompt and explains the underlying prompt theory (role-priming, dynamic separators, negative constraints).
*   **Offline Case Studies**: Three interactive mock evaluations comparing raw, brittle original queries with optimized, structured production-ready templates.
*   **Universal Local LLM Gateway**: Connects the custom compiler to local offline models (like Ollama, LM Studio, or custom OpenAI-compatible endpoints) complete with a real-time connection debugger.
*   **Interactive Flow Guide**: An interactive visual walkthrough explaining how the blueprint workflow mitigates AI generation variance.

---

## 🛠️ Prompt Architectures Taught

1.  **RTFC (Role-Task-Format-Constraints)**: The industry standard for robust deterministic tasks, ensuring role authority and rigid boundaries.
2.  **CO-STAR (Context-Objective-Style-Tone-Audience-Response)**: Built for premium marketing copy and stakeholder correspondence where psychological framing and styling are crucial.
3.  **Few-Shot Demonstration**: Embeds concrete exemplars directly inside the context window to train linguistic behavior through illustration.
4.  **Chain-of-Thought (Reasoning-First)**: Forces the LLM to process intermediate logic gates before printing solutions—vital for diagnostic audits or code reviews.

---

## ⚙️ Installation & Local Setup

Deploy and run Prompt Architecture Academy completely local on your developer workstation.

### Prerequisite Dependencies
- [Node.js](https://nodejs.org) (v18 or higher recommended)
- [NPM](https://www.npmjs.com/) or Yarn/PNPM

### 1. Clone & Set Up Directory
```bash
# Clone the repository (or extract the bundle file)
cd prompt-architecture-academy

# Install the dependencies
npm install
```

### 2. Configure Environment Secrets
Create a `.env` file in your root folder:
```env
GEMINI_API_KEY="your-google-gemini-key-here"
PORT=3000
```
*Note: If you run offline local LLM models exclusively (e.g., Ollama or LM Studio), you can bypass saving standard Gemini keys.*

### 3. Start Development Mode
```bash
# Start server using standard tsx runtime
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Direct Production Compiled Build
```bash
# Standard compile
npm run build

# Boot compiled bundle standalone
npm start
```

---

## 🧪 Local LLM Integration Guidelines

To use local offline models, choose **Local LLM Mode** in the App header:
*   **Ollama Connection**:
    - Default Endpoint: `http://localhost:11434/v1`
    - Recommend Model name: `llama3`, `mistral`, or `gemma2`
    - *Note: Ensure your Ollama container is running with `OLLAMA_ORIGINS="*"` to avoid CORS issues, or use our server-side connection proxy.*
*   **LM Studio Connection**:
    - Default Endpoint: `http://localhost:1234/v1`
    - Model: Use whatever LLM you currently have loaded in your LM Studio application.
