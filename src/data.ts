import { PromptTemplate, OfflineExample } from "./types";

export const BEST_PRACTICE_TEMPLATES: PromptTemplate[] = [
  {
    id: "rtfc",
    name: "RTFC Framework (Role-Task-Format-Constraints)",
    description: "The gold standard for standard automation and standard tasks. It establishes a strong foundational persona before giving explicit directives and bounds.",
    whenToUse: "Excellent for code generation, direct copy editing, data transformation, or any straightforward task where style is secondary to correct structural execution.",
    weaknesses: "Can feel rigid for highly creative writing, exploratory brain-storming, or subjective customer service interactions where detailed context and tone are dynamic.",
    structure: `[ROLE]
Briefly define the specific expertise or persona the AI should adopt.

[TASK]
Describe exactly what the AI must do or compute.

[FORMAT]
Define the exact presentation style (e.g., bullet points, JSON, markdown, interactive paragraphs).

[CONSTRAINTS]
List hard rules, limits, or negative instructions (what NOT to do).`
  },
  {
    id: "costar",
    name: "CO-STAR Framework",
    description: "A highly comprehensive, contextual template designed to ensure all external details (audience perception, style guides, exact objective) are strictly accounted for.",
    whenToUse: "Perfect for marketing copy, customer communication, long-form creative content, or external articles where user target segment and brand voice are critical.",
    weaknesses: "Requires significant configuration details. Can overcomplicate minor, low-context utility queries where a simple instruction is sufficient.",
    structure: `[CONTEXT]
Provide vital background information about the project or scenario.

[OBJECTIVE]
Define the specific goal or output expected from the LLM.

[STYLE]
Describe the writing genre or brand guidelines to mimic (e.g. analytical, journalistic, technical).

[TONE]
Set the emotional frequency of the interaction (e.g., friendly, diplomatic, direct).

[AUDIENCE]
Specify who is reading or receiving this output so the AI can adjust reading levels and complexity.

[RESPONSE]
Define the format, length, and delivery outline of the final response.`
  },
  {
    id: "fewshot",
    name: "Few-Shot Pattern (Demonstrations)",
    description: "Guides the AI by listing actual raw input examples paired with desired flawless outputs, establishing an immediate pattern recognition loop.",
    whenToUse: "Crucial for complex output styling, custom structured data mapping (e.g. parsing raw transcripts) or when the desired tone is hard to explain in pure prose instructions.",
    weaknesses: "Significantly increases the input prompt token length. Only as good as the examples you provide; bad examples yield bad results.",
    structure: `[ROLE & INSTRUCTIONS]
Define the task, objective, and general expectations.

[DEMONSTRATION EXAMPLES]
Input: <Example raw text 1>
Output: <Flawless desired result 1>

Input: <Example raw text 2>
Output: <Flawless desired result 2>

[TARGET TASK INPUT]
Input: <Actual raw user input for current transaction>`
  },
  {
    id: "cot",
    name: "Chain-of-Thought (Reasoning-First)",
    description: "Forces the LLM to write out its calculations, reasoning steps, or decision tree before rendering the final solution.",
    whenToUse: "Essential for advanced coding challenges, math processing, complex policy audits, and diagnostic troubleshooting where jumping straight to an answer causes logic errors.",
    weaknesses: "Increases response time and output token count. Not useful for simple memory recall or quick summaries where reasoning steps are trivial.",
    structure: `[CONTEXT & SPECIFICATION]
Provide the dataset, rule outline, or problem code.

[THINKING DIRECTIVES]
Command the model to explain its sequence of logic step-by-step. Use strict tags like <thinking>...</thinking>.

[EXECUTION TASK]
Render the final answer clearly after the logic is fully proven.`
  }
];

export const OFFLINE_EXAMPLES: OfflineExample[] = [
  {
    id: "ex1",
    title: "Employee Performance Review",
    category: "Corporate Management",
    selectedTemplateId: "rtfc",
    flawedPrompt: "Write a performance review for my employee John who is a software engineer. He is doing a good job but sometimes misses deadlines. Keep it nice.",
    templatedOutput: `# ROLE
You are a Lead Software Engineering Manager and an empathetic, professional career coach with 15+ years of experience in talent development.

# TASK
Write a constructive, structured annual performance review for [EMPLOYEE_NAME] who occupies the role of [ROLE_TITLE].
Analyze their key accomplishments and address their core growth areas constructively.

# FORMAT
Provide the review in clean Markdown using three specific headers:
1. **Key Strengths**: Highlight reliable positive habits, technical impacts, or collaboration.
2. **Growth Opportunities**: Address the specific concerns using supportive, growth-mindset phrasing.
3. **Actionable Action Plan**: List exactly 3 SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) designed to support improvement.

# CONSTRAINTS
- NEVER use generic, discouraging adjectives like "lazy", "bad", or "failing". Use constructive, performance-focused feedback (e.g., "opportunity to improve delivery estimate reliability").
- Do NOT sound overly clinical; maintain a supportive yet formal professional tone.
- Restrict the total word count to 400 words maximum.

---
# INPUT VARIABLES FOR THIS RUN:
- Employee Name: John
- Role Title: Mid-Level Software Engineer
- Known Strengths: Strong technical coding execution, high teamwork collaboration scores, and helpful code reviews.
- Known Weaknesses: Occasional delivery delays, estimated deadlines are sometimes missed due to over-engineering.`,
    analysis: {
      flaws: [
        "Lacked a professional role definition, resulting in generic 'nice' sentences without corporate-level mentorship structure.",
        "The output format was undefined, making it unpredictable (could result in a short paragraph, a long email, or an bullet list).",
        "Had no guardrails or negative constraints to ban counter-productive language or control word bounds."
      ],
      improvements: [
        "Primed the model with an expert role ('Lead Software Engineering Manager with 15+ years coaching experience').",
        "Divided feedback into precise, predictable Markdown structures (Strengths, Growth Opportunities, actionable SMART goals).",
        "Configured distinct uppercase placeholder tokens so the user can easily repeat this prompt for Sarah, Alex, or any other staff members."
      ],
      rationale: "For a highly repetitive clinical task like annual performance reviews, introducing standardized metrics and SMART action plans helps eliminate bias, ensures consistent delivery format, and saves managers cumulative hours of manual formatting."
    }
  },
  {
    id: "ex2",
    title: "Raw Meeting Transcript Summarization",
    category: "Office Productivity & Admin",
    selectedTemplateId: "costar",
    flawedPrompt: "Can you summarize these meeting notes? Try to pull out the main points and action items. Make it look nice and clean. [insert transcripts here]",
    templatedOutput: `# CONTEXT
We are an agile product team wrapping up our weekly synchronization session. Our team is rapid, collaborative, and highly action-oriented. We need clear, reliable task summaries to maintain operational velocity.

# OBJECTIVE
Synthesize the provided raw, unedited, spoken meeting transcript into high-density reference minutes. 
The summary must prioritize actionable tracking and accurate decision log preservation.

# STYLE
Professional, structured, high-density bulleted report card. Completely eliminate spoken verbal filler, casual greetings, or conversational pleasantries.

# TONE
Objective, clear, actionable, and encouraging.

# AUDIENCE
The product manager, lead engineers, and business stakeholders who need to review tasks at a glance and track active commitments.

# RESPONSE
Render the summary using the following layout:
1. **Overview**: Maximum 3 sentences capturing the core alignment.
2. **Key Decisions**: Bullet points listing any final agreements or pivots approved during the session.
3. **Action Item Board**: A markdown table with columns: [Action Item] | [Owner] | [Potential Blocker / Details].

---
# RAW TRANSCRIPT TO SYNTHESIZE:
[INSERT_RAW_TRANSCRIPT_HERE]`,
    analysis: {
      flaws: [
        "Words like 'nice and clean' are subjective and interpreted differently by models across different runs.",
        "No context was provided regarding who the meeting was for or the fast-paced agile style needed.",
        "Didn't instruct the model to cleanse verbal fillers, which often results in cluttering text with trivial greetings or conversational filler."
      ],
      improvements: [
        "Provided solid context showing team structure and speed requirements.",
        "Replaced subjective qualifiers with target audience constraints ('product manager, lead engineers, who need to review tasks at a glance').",
        "Guaranteed a precise output schema using a markdown table configuration for the Action Items."
      ],
      rationale: "Meeting transcription tools generate highly messy, spoken-filler text. Using a rigorous CO-STAR structure forces the AI to instantly purge conversational clutter and deliver strict itemized rows, which is useful when integrating automation templates."
    }
  },
  {
    id: "ex3",
    title: "Weekly Markdown Status Report",
    category: "Executive Reports",
    selectedTemplateId: "fewshot",
    flawedPrompt: "Turn my weekly notes into a status update report to send my boss. Here is what I did: fixed database, helped sales team, wrote tests.",
    templatedOutput: `# ROLE & INSTRUCTIONS
You are an executive Chief of Staff. Your task is to transform raw, casual bullet points into an elegant, high-impact Weekly Status Report formatted in clean markdown.

# DEMONSTRATION EXAMPLES
### EXAMPLE 1
**User Casual Input:**
"fixed login button bug, called 3 prospects, started writing documentation, had a team coffee"

**Desired Flawless Output:**
### Weekly Accomplishments
- **Technical Progress**: Resolved persistent critical authentication state issue on the user login viewport, restoring standard access.
- **Client Relations**: Initiated direct outbound outreach with three high-priority accounts to explore configuration needs.
- **Documentation**: Formulated the architecture layout and drafted initial functional requirements papers for internal knowledge reuse.

### EXAMPLE 2
**User Casual Input:**
"ran testing scripts found 10 bugs, finished slides for quarterly sync, fixed backend crash"

**Desired Flawless Output:**
### Weekly Accomplishments
- **Quality Assurance**: Executed automated regression tests, successfully identifying and cataloging 10 secondary rendering bugs.
- **Strategy & Strategy**: Finalized the executive review sliding deck for the upcoming Quarterly General Alignment presentation.
- **Infrastructure**: Patched a fatal main memory exception on the backend database container, stabilizing client traffic.

---
# YOUR TARGET CASUAL INPUT:
[USER_CASUAL_NOTES_HERE]`,
    analysis: {
      flaws: [
        "The AI doesn't know what level of professional upgrade or corporate translation the user wants.",
        "Small trivial details like 'had a team coffee' might be given equal visual weight as 'fixed backend crash' due to lack of comparative weight.",
        "Without strict structures, the output format shifts between paragraphs and random bullet types weekly."
      ],
      improvements: [
        "Provided explicit Few-Shot exemplars demonstrating how to translate low-context casual notes into elevated executive summaries.",
        "Established direct category groupings (such as Quality Assurance, Infrastructure) that highlight business-impact wording.",
        "Cleanly isolated target inputs from structural definitions using precise markdown syntax separators."
      ],
      rationale: "Few-Shot prompting is the single most effective way to teach a model a highly specific linguistic style or format. It eliminates 'hallucinated guidelines' by visually showing the model the precise translation mapping."
    }
  }
];
