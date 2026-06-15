
# Prompt Architecture Academy 🏛️


An interactive, production-grade educational web application designed to level-up your prompt engineering skills. Learn to translate raw, basic ideas into durable, highly repeatable, and reliable system prompts using industry-standard scaffolding frameworks.
<img width="684" height="735" alt="Screenshot 2026-06-15 124722" src="https://github.com/user-attachments/assets/b2771d07-c192-4bb4-961e-428ad2d4303a" />
## 🚀 Key Features


*   **Dynamic Workbench**:
    *   **Phase 1 — Structural Analysis**: Evaluates your raw idea to identify ambiguities and potential hallucination vectors.
    *   **Phase 2 — LLM Mentor Chat**: Interactive inline clarification step to lock down dynamic placeholders (e.g., specific inputs, metrics, strict roles).
    *   **Phase 3 — Pattern Compiler**: Compiles your raw idea and chat history into one of four validated architectures: RTFC, CO-STAR, Few-Shot, or Chain-of-Thought.
    *   **Phase 4 — Blueprint Annotation**: Highlights specific blocks within the finalized prompt and explains the underlying prompt theory (role-priming, dynamic separators, negative constraints).
*   **Offline Case Studies**: Three interactive mock evaluations comparing raw, brittle original queries with optimized, structured production-ready templates.
*   **Universal Local LLM Gateway**: Connects the custom compiler to local offline models (like Ollama, LM Studio, or custom OpenAI-compatible endpoints) complete with a real-time connection debugger.
*   **Interactive Flow Guide**: An interactive visual walkthrough explaining how the blueprint workflow mitigates AI generation variance.

<img width="626" height="480" alt="Screenshot 2026-06-15 124015" src="https://github.com/user-attachments/assets/4eb9173f-d47f-4b9f-b52c-20d3ef729555" />
<img width="617" height="571" alt="Screenshot 2026-06-15 124021" src="https://github.com/user-attachments/assets/44a34da4-6524-4dbf-b899-68a8dfa7e338" />
<img width="621" height="462" alt="Screenshot 2026-06-15 124030" src="https://github.com/user-attachments/assets/89f61971-3e1c-43cf-8ce1-0d96bce56cf4" />
<img width="610" height="677" alt="Screenshot 2026-06-15 124037" src="https://github.com/user-attachments/assets/1af4a1b0-8ccf-405a-ace2-d28ceb887a21" />
<img width="613" height="741" alt="Screenshot 2026-06-15 124103" src="https://github.com/user-attachments/assets/d5d49fdb-7001-4a31-bf61-fe4053ac70eb" />
<img width="615" height="807" alt="Screenshot 2026-06-15 124111" src="https://github.com/user-attachments/assets/cae741f5-4358-4583-8e76-aaa10984f538" />
---

## 🛠️ Prompt Architectures Taught

1.  **RTFC (Role-Task-Format-Constraints)**: The industry standard for robust deterministic tasks, ensuring role authority and rigid boundaries.
2.  **CO-STAR (Context-Objective-Style-Tone-Audience-Response)**: Built for premium marketing copy and stakeholder correspondence where psychological framing and styling are crucial.
3.  **Few-Shot Demonstration**: Embeds concrete exemplars directly inside the context window to train linguistic behavior through illustration.
4.  **Chain-of-Thought (Reasoning-First)**: Forces the LLM to process intermediate logic gates before printing solutions—vital for diagnostic audits or code reviews.

---

## System Prompt Used In The Application
As an example of the power of these structured prompts, you can see thatt he application itself is built around a CO-STAR prompt which ensures predictable processing and outputs that can be easily used to create a GUI

### CONTEXT
A student at the Prompt Engineering Academy has submitted a loose, unstructured workflow concept (e.g., "help me write emails" or "summarize code reviews") that they want to transform into a repeatable, variance-resistant utility template. 

### OBJECTIVE
Deconstruct the student's raw idea to identify upstream ambiguities and output parameters that would cause prompt drift or hallucinations. Formulate a concrete scaffolding template strategy, isolate missing variables, and draft clarification questions to secure reliable outputs across multiple runs.

### STYLE
Professional, academic, highly structured, and analytical. Emphasize standard prompt engineering terms like role-priming, markdown delimiters, and boundary markers.

### TONE
Encouraging, authoritative, objective, and intellectually rigorous.

### AUDIENCE
The Prompt Academy backend compiler and UI interface. This output will programmatically feed the interactive workbench.

### RESPONSE FORMAT
A single, minified, valid JSON block. The response must fit the schema provided in the [RESPONSE_SCHEMA] block with no markdown encapsulation or auxiliary text.

[RESPONSE_SCHEMA]
{
  "suggestedApproach": "String summarizing the strategic formatting layout suitable for this prompt task.",
  "rationale": "String highlighting how this design stabilizes variables and controls generation variance.",
  "ambiguities": ["List item 1 containing explicit structural omission", "List item 2..."],
  "suggestedQuestions": ["Dialogue question 1 designed to resolve omission", "Dialogue question 2..."]
}

[STUDENT_INPUT]
"{{STUDENT_RAW_IDEA}}"

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
<img width="1304" height="386" alt="Screenshot 2026-06-15 125545" src="https://github.com/user-attachments/assets/17429277-fa12-435f-a4f1-6da2fc782038" />
To use local offline models, choose **Local LLM Mode** in the App header:
*   **Ollama Connection**:
    - Default Endpoint: `http://localhost:11434/v1`
    - Recommend Model name: `llama3`, `mistral`, or `gemma2`
    - *Note: Ensure your Ollama container is running with `OLLAMA_ORIGINS="*"` to avoid CORS issues, or use our server-side connection proxy.*
*   **LM Studio Connection**:
    - Default Endpoint: `http://localhost:1234/v1`
    - Model: Use whatever LLM you currently have loaded in your LM Studio application.
