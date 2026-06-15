import { useState, useRef, useEffect, FormEvent } from "react";
import { 
  BookOpen, 
  Terminal, 
  Sparkles, 
  HelpCircle, 
  Layers, 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  Send, 
  RefreshCw, 
  ArrowRight, 
  Brain, 
  Info,
  Check,
  ChevronRight,
  MessageSquare,
  FileText,
  BadgeAlert,
  Settings,
  Wifi,
  WifiOff,
  Database,
  X,
  ChevronDown,
  ExternalLink,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BEST_PRACTICE_TEMPLATES, OFFLINE_EXAMPLES } from "./data";
import { PromptTemplate, ChatMessage, IdeaAnalysis, GeneratedPromptResult, OfflineExample } from "./types";
import { 
  localAnalyzeIdea, 
  localChatMentor, 
  localCompilePrompt, 
  testLocalConnection, 
  LocalLlmConfig, 
  ConnectionTestResult 
} from "./utils/localLlm";

export default function App() {
  // Global View Mode: "workbench" (Iterative Interactive API flow) or "offline" (3 flawed/perfect offline examples)
  const [activeTab, setActiveTab] = useState<"workbench" | "offline">("workbench");

  // --- LOCAL LLM CONNECTIVITY STATES ---
  const [localConfig, setLocalConfig] = useState<LocalLlmConfig>({
    enabled: false,
    endpoint: "http://localhost:11434/v1",
    model: "llama3"
  });
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isTestingLocal, setIsTestingLocal] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // --- EXPLANATION GUIDE MODAL TOUR ---
  const [showFlowModal, setShowFlowModal] = useState(false);

  // Automatically prompt the tour outline if this is the user's first time visiting
  useEffect(() => {
    const tourStatus = localStorage.getItem("prompt_academy_flow_seen_v2");
    if (!tourStatus) {
      setShowFlowModal(true);
    }
  }, []);

  const handleCloseFlowModal = () => {
    localStorage.setItem("prompt_academy_flow_seen_v2", "true");
    setShowFlowModal(false);
  };

  // --- WORKBENCH STATE ---
  const [rawIdea, setRawIdea] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<IdeaAnalysis | null>(null);

  // Mentor Refinement Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Template Selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("rtfc");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compiledResult, setCompiledResult] = useState<GeneratedPromptResult | null>(null);
  const [copiedPromptStatus, setCopiedPromptStatus] = useState(false);

  // Pre-configured basic ideas to help lazy users get started
  const PRESET_IDEAS = [
    "Write feedback on quarterly code submissions",
    "Synthesize user test transcripts into product bugs",
    "Draft a bi-weekly team progress newsletter",
    "Construct standard API integration unit tests"
  ];

  // --- OFFLINE EXAMPLES STATE ---
  const [selectedExampleId, setSelectedExampleId] = useState<string>("ex1");
  const currentExample = OFFLINE_EXAMPLES.find(ex => ex.id === selectedExampleId) || OFFLINE_EXAMPLES[0];
  const [copiedOfflineStatus, setCopiedOfflineStatus] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat widget to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: string) => {
    setRawIdea(preset);
  };

  // Step 1: Submit raw idea for AI Analysis
  const handleAnalyzeIdea = async () => {
    if (!rawIdea.trim()) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setCompiledResult(null); // reset downstream outputs

    try {
      let data;
      if (localConfig.enabled) {
        data = await localAnalyzeIdea(localConfig, rawIdea);
      } else {
        const response = await fetch("/api/analyze-idea", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: rawIdea }),
        });

        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to analyze your prompt idea.");
        }
      }

      setAnalysisResult(data);
      
      // Initialize chat with greeting and suggestion from analysis helper
      const initialGreetMsg: ChatMessage = {
        id: "intro-msg",
        role: "assistant",
        text: `Hello! I have analyzed your idea for **"${rawIdea}"**. Let's refine it together to make sure it's fully prepared for repeatable execution. Here's a key question: \n\n${data.suggestedQuestions?.[0] || "What specific format requirements should we enforce?"}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([initialGreetMsg]);

    } catch (err: any) {
      console.error(err);
      setAnalysisError(
        localConfig.enabled
          ? `Local LLM connection failed: ${err.message}. Please verify Ollama/LM Studio is running on "${localConfig.endpoint}" and CORS is active.`
          : (err.message || "Could not connect to the API. Is your Gemini API key configured?")
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Interactive Chat Messages
  const handleSendChatMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMsgText = chatInput;
    setChatInput("");
    setChatError(null);

    const newUserMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentHistory = [...chatMessages, newUserMsg];
    setChatMessages(currentHistory);
    setIsTyping(true);

    try {
      let responseText = "";

      if (localConfig.enabled) {
        responseText = await localChatMentor(
          localConfig,
          rawIdea,
          currentHistory,
          userMsgText
        );
      } else {
        // Map ChatMessage structure to API expectations
        const apiChatHistory = currentHistory.map(m => ({
          role: m.role === "user" ? "user" : "model",
          text: m.text
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: rawIdea,
            chatHistory: apiChatHistory,
            message: userMsgText
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "The mentor chat encountered an error.");
        }
        responseText = data.text;
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatError(
        localConfig.enabled
          ? `Local LLM generation failed: ${err.message}. Ensure endpoint "${localConfig.endpoint}" is running.`
          : (err.message || "Failed to transmit message to the mentor.")
      );
    } finally {
      setIsTyping(false);
    }
  };

  // Step 3: Compile finalized prompt template
  const handleCompilePrompt = async () => {
    if (!rawIdea) return;

    setIsCompiling(true);
    setCompileError(null);
    setCompiledResult(null);

    const templateObj = BEST_PRACTICE_TEMPLATES.find(t => t.id === selectedTemplateId);

    try {
      const apiChatHistory = chatMessages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        text: m.text
      }));

      let data;

      if (localConfig.enabled) {
        data = await localCompilePrompt(
          localConfig,
          rawIdea,
          chatMessages,
          templateObj?.name || selectedTemplateId,
          templateObj?.structure || ""
        );
      } else {
        const response = await fetch("/api/generate-templated-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: rawIdea,
            chatHistory: apiChatHistory,
            templateId: selectedTemplateId,
            templateName: templateObj?.name || selectedTemplateId,
            templateStructure: templateObj?.structure || ""
          })
        });

        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to compile the final prompt template.");
        }
      }

      setCompiledResult(data);
    } catch (err: any) {
      console.error(err);
      setCompileError(
        localConfig.enabled
          ? `Local compiler compilation failure: ${err.message}. Ensure your local model is loaded and responds as structured JSON.`
          : (err.message || "Failed to compile the template prompt. Please check your network.")
      );
    } finally {
      setIsCompiling(false);
    }
  };

  const handleTestLocalConnection = async () => {
    setIsTestingLocal(true);
    setTestResult(null);
    try {
      const result = await testLocalConnection(localConfig.endpoint);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        statusText: `Unexpected client testing crash: ${err.message}`,
        errorDetails: "Please ensure your endpoint string resembles: http://localhost:11434/v1"
      });
    } finally {
      setIsTestingLocal(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, isOffline: boolean) => {
    navigator.clipboard.writeText(text);
    if (isOffline) {
      setCopiedOfflineStatus(true);
      setTimeout(() => setCopiedOfflineStatus(false), 2000);
    } else {
      setCopiedPromptStatus(true);
      setTimeout(() => setCopiedPromptStatus(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-200 bg-white sticky top-0 backdrop-blur-md z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-md shadow-indigo-650/10 animate-fade-in">
              <BookOpen className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 id="app-title" className="text-lg font-bold tracking-tight text-slate-900">
                Prompt Architecture Academy
              </h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Educational Suite for Repeatable System Prompts</p>
            </div>
          </div>

          {/* Navigation and Settings Cluster */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            
            {/* View tab select */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1 shrink-0">
              <button
                id="btn-tab-workbench"
                onClick={() => { setActiveTab("workbench"); }}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "workbench"
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Dynamic Workbench
              </button>
              <button
                id="btn-tab-offline"
                onClick={() => { setActiveTab("offline"); }}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "offline"
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Offline Cases
              </button>
            </div>

            {/* Step-by-Step Flow Guide Trigger */}
            <button
              id="btn-trigger-flow-guide"
              onClick={() => setShowFlowModal(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-350 bg-white text-xs text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs font-medium"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>How It Works</span>
            </button>

            {/* Local LLM settings trigger */}
            <button
              id="btn-settings-toggle"
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                localConfig.enabled
                  ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100/60"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <Settings className={`w-4 h-4 ${localConfig.enabled ? "text-amber-600 animate-pulse" : "text-slate-500"}`} />
              <span>LLM: {localConfig.enabled ? "Local" : "Cloud"}</span>
              {localConfig.enabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>

          </div>
        </div>
      </header>

      {/* LOCAL LLM SETTINGS CONFIG DRAWER */}
      <AnimatePresence>
        {showSettingsPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-200 bg-slate-50/90 overflow-hidden relative z-30 shadow-inner"
          >
            <div className="max-w-7xl mx-auto px-4 py-5 font-sans">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Configuration form */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-600 animate-spin-slow" />
                      Local LLM Connection Setup
                    </h3>
                    <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-600">Activate:</span>
                      <button
                        onClick={() => setLocalConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          localConfig.enabled ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            localConfig.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Set up an OpenAI-compatible endpoint like <strong>Ollama</strong> or <strong>LM Studio</strong>. Requests will be executed directly from your browser client-side, bypassing standard cloud environments to guarantee perfect local execution.
                  </p>

                  <div className="grid grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1 font-mono">
                        Base URL Endpoint
                      </label>
                      <input
                        type="text"
                        value={localConfig.endpoint}
                        placeholder="http://localhost:11434/v1"
                        onChange={(e) => setLocalConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                        className="w-full text-xs font-mono p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1 font-mono">
                        Target Model ID
                      </label>
                      <input
                        type="text"
                        value={localConfig.model}
                        placeholder="llama3"
                        onChange={(e) => setLocalConfig(prev => ({ ...prev, model: e.target.value }))}
                        className="w-full text-xs font-mono p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setLocalConfig(prev => ({ ...prev, endpoint: "http://localhost:11434/v1", model: "llama3" }))}
                      className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-2 py-1 rounded transition-colors cursor-pointer font-mono"
                    >
                      Ollama Default
                    </button>
                    <button
                      onClick={() => setLocalConfig(prev => ({ ...prev, endpoint: "http://localhost:1234/v1", model: "default" }))}
                      className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-2 py-1 rounded transition-colors cursor-pointer font-mono"
                    >
                      LM Studio Default
                    </button>
                  </div>
                </div>

                {/* Connection Tester */}
                <div className="lg:col-span-7 bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wider font-mono text-[10px] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-650" />
                      CORS Interface Diagnostics
                    </span>
                    <button
                      onClick={handleTestLocalConnection}
                      disabled={isTestingLocal}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      {isTestingLocal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                      Test Link
                    </button>
                  </div>

                  {testResult ? (
                    <div className={`p-3.5 rounded-xl border leading-relaxed text-xs ${testResult.success ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"}`}>
                      <div className="flex items-center gap-2 font-bold mb-1.5">
                        {testResult.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className="text-xs">{testResult.success ? "Link Operational!" : "Diagnostic Verification Refused"}</span>
                      </div>
                      <p className="text-[11px] font-medium">{testResult.statusText}</p>
                      
                      {testResult.latency !== undefined && (
                        <div className="text-[10px] mt-2 font-mono text-emerald-800 bg-white/60 px-2 py-0.5 rounded border border-emerald-100 inline-block font-bold">
                          Ping time: {testResult.latency}ms
                        </div>
                      )}

                      {testResult.availableModels && testResult.availableModels.length > 0 && (
                        <div className="mt-3.5 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase block tracking-wider font-mono text-slate-600">
                            Discovered Local Models (Click to Assign):
                          </span>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {testResult.availableModels.map((m) => {
                              const isSelectedModel = localConfig.model === m;
                              return (
                                <button
                                  key={m}
                                  onClick={() => setLocalConfig(prev => ({ ...prev, model: m }))}
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer select-none ${
                                    isSelectedModel 
                                      ? "bg-indigo-600 text-white border-indigo-700 shadow-xs font-semibold scale-95" 
                                      : "bg-slate-50 hover:bg-slate-100 text-slate-705 border-slate-300"
                                  }`}
                                >
                                  {m}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {testResult.errorDetails && (
                        <div className="text-[10px] mt-2 text-rose-800 font-mono bg-white p-2.5 rounded-lg border border-rose-100 max-h-32 overflow-y-auto leading-normal whitespace-pre-wrap">
                          {testResult.errorDetails}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <Wifi className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                      <p className="text-[11px]">Click <strong>Test Link</strong> to analyze host communication status.</p>
                    </div>
                  )}

                  <div className="text-[9.5px] text-slate-505 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-normal">
                    <span className="font-bold text-slate-700 uppercase block mb-0.5">Troubleshooting Ollama CORS error:</span>
                    By default, Ollama blocks web browser requests. Run Ollama with origins enabled in your command line:
                    <code className="block bg-white border border-slate-200 px-2 py-1 rounded font-mono text-indigo-700 font-bold text-[9px] mt-1 select-all">
                      OLLAMA_ORIGINS="*" ollama serve
                    </code>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPLANATORY FLOW/WELCOME MODAL */}
      <AnimatePresence>
        {showFlowModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-250 shadow-2xl max-w-2xl w-full p-6 relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <button
                onClick={handleCloseFlowModal}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Prompt Scaffolding Workflow</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">MITIGATING AI GENERATION VARIANCE</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Basic, unstructured prompts provide unreliable outputs due to missing boundary rules, undefined dynamic placeholders, and poor target context modeling. Prompt Architecture Academy helps you engineer ideas through a structured pipeline:
                </p>

                {/* THE VISUAL TIMELINE FLOW DIAGRAM */}
                <div className="space-y-4 my-6">
                  {/* Node 1 */}
                  <div className="flex gap-4 items-start relative pb-4">
                    <div className="absolute left-[15px] top-[30px] bottom-0 w-0.5 bg-slate-200" />
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-indigo-500 font-bold text-xs text-indigo-650 flex items-center justify-center shrink-0 shadow-sm relative z-10">
                      1
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-1.5 flex-1 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-slate-900 uppercase">Input & Strategic Deconstruction</span>
                        <span className="text-[10px] font-mono font-semibold text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded">Phase I</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Submit any loose, simple prompt objective. Our analyzer immediately scans the query to flag corporate vulnerabilities, dynamic parameters, and potential hallucination entryways.
                      </p>
                    </div>
                  </div>

                  {/* Node 2 */}
                  <div className="flex gap-4 items-start relative pb-4">
                    <div className="absolute left-[15px] top-[30px] bottom-0 w-0.5 bg-slate-200" />
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border-2 border-emerald-500 font-bold text-xs text-emerald-600 flex items-center justify-center shrink-0 shadow-sm relative z-10">
                      2
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-1.5 flex-1 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-slate-900 uppercase">Interactive Mentor Refinement</span>
                        <span className="text-[10px] font-mono font-semibold text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded">Phase II</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Engage in continuous discussions with an on-demand prompt tutor to safely lock down exact dynamic metrics, specify constraints, and clarify expected response layouts.
                      </p>
                    </div>
                  </div>

                  {/* Node 3 */}
                  <div className="flex gap-4 items-start relative pb-4">
                    <div className="absolute left-[15px] top-[30px] bottom-0 w-0.5 bg-slate-200" />
                    <div className="w-8 h-8 rounded-full bg-amber-50 border-2 border-amber-500 font-bold text-xs text-amber-600 flex items-center justify-center shrink-0 shadow-sm relative z-10">
                      3
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-1.5 flex-1 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-slate-900 uppercase">Scaffolding Framework Compiler</span>
                        <span className="text-[10px] font-mono font-semibold text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded">Phase III</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Select a validated style blueprint (RTFC, CO-STAR, demonstrating few-shots, or logical reasoning sequences). The compiler synthesizes the base idea and dialogue tags securely into your target form.
                      </p>
                    </div>
                  </div>

                  {/* Node 4 */}
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-purple-50 border-2 border-purple-500 font-bold text-xs text-purple-600 flex items-center justify-center shrink-0 shadow-sm relative z-10">
                      4
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-1.5 flex-1 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-slate-900 uppercase">Annotation Side Notes</span>
                        <span className="text-[10px] font-mono font-semibold text-purple-600 px-1.5 py-0.5 bg-purple-50 rounded">Phase IV</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        The compiler lists highlights mapping sections of the code back to core theoretical standards (role priming, separator markers, parameter tags) explaining why they secure generation repeatability.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950 leading-relaxed font-sans">
                  <Zap className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Local Offline Model Compatibility:</strong> We support Local LLM compilation natively! Open LLM settings in the top header and configure a local instance (like Ollama or LM Studio) to keep your prompt engineering practice private and secure.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-150 mt-4 flex justify-end">
                <button
                  onClick={handleCloseFlowModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Enter Academy Workbench
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CORE WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* INTERACTIVE WORKBENCH TAB */}
        {activeTab === "workbench" && (
          <>
            {/* Left Panel: Inputs & Refinement */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Step 1: Idea Submission */}
              <div id="section-idea-gather" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Brain className="w-5 h-5" />
                  <h2 className="font-semibold text-base text-slate-900">1. Declare Your Prompt Idea</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  What activity do you repeat often? (e.g., generating bug logs, summarizing newsletters, drafting client update letters). Describe it in simple words.
                </p>

                {/* Preset helpers */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_IDEAS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectPreset(preset)}
                      className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-950 px-3 py-1.5 rounded-lg transition-colors text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <textarea
                    id="input-raw-idea"
                    value={rawIdea}
                    onChange={(e) => setRawIdea(e.target.value)}
                    placeholder="E.g., I want an LLM prompt to convert rough meeting transcripts into action items with tags and assignees..."
                    className="w-full h-24 max-h-40 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-650/20 transition-all font-sans text-slate-800"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-mono">
                      Repeatable workloads require parameters.
                    </span>
                    <button
                      id="btn-analyze-idea"
                      onClick={handleAnalyzeIdea}
                      disabled={isAnalyzing || !rawIdea.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          Deconstruct Idea
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Analysis Error Alert */}
                {analysisError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-250 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                    <BadgeAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-rose-900">API Gateway Notice:</span> {analysisError}
                      <p className="mt-1.5 text-rose-700 font-mono text-[11px]">
                        Tip: You can use the <strong className="underline cursor-pointer font-bold" onClick={() => setActiveTab("offline")}>Offline Case Studies Tab</strong> to explore highly rich prompt architectures with rationale completely client-side.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2 & 3: AI Analysis & Chat Mentoring */}
              <AnimatePresence mode="wait">
                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6"
                  >
                    {/* Structure Analysis summary */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <Terminal className="w-5 h-5" />
                        <h2 className="font-semibold text-base text-slate-900">2. Prompt Blueprint Strategy</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                          <div className="text-[10px] text-indigo-650 font-bold tracking-wider font-mono">SUGGESTED STRATEGY</div>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{analysisResult.suggestedApproach}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                          <div className="text-[10px] text-emerald-700 font-bold tracking-wider font-mono">EDUCATIONAL RATIONALE</div>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{analysisResult.rationale}</p>
                        </div>
                      </div>

                      {/* Ambiguities Checklist */}
                      <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 text-xs font-bold tracking-wider font-mono">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          AMBIGUITIES DISCOVERED (WHAT CAUSES AI HALLUCINATIONS)
                        </div>
                        <ul className="space-y-2">
                          {analysisResult.ambiguities.map((item, idx) => (
                            <li key={idx} className="text-xs text-amber-950 flex items-start gap-2">
                              <span className="text-amber-600 font-bold">●</span>
                              <span className="leading-normal">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Step 3: Refinement Interactive Chat widget */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-600">
                          <MessageSquare className="w-5 h-5" />
                          <h2 className="font-semibold text-base text-slate-900">3. Mentor Chat (Refinement Stage)</h2>
                        </div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-mono font-medium">
                          Active Mentor
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Discuss variables, specify custom constraints, or answer the mentor's clarifying questions so the final compiler compiles a perfect prompt.
                      </p>

                      {/* Chat box viewport */}
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 h-64 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[85%] ${
                              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                            }`}
                          >
                            <div
                              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm ${
                                msg.role === "user"
                                  ? "bg-indigo-600 text-white font-medium rounded-tr-none shadow-sm"
                                  : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm"
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 font-mono px-1">
                              {msg.role === "user" ? "Student" : "Mentor"} • {msg.timestamp}
                            </span>
                          </div>
                        ))}

                        {isTyping && (
                          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono py-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></span>
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></span>
                            <span>Mentor is thinking...</span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {chatError && (
                        <div className="p-2 border border-rose-250 bg-rose-50 text-rose-800 text-xs rounded-lg">
                          {chatError}
                        </div>
                      )}

                      {/* Msg Form */}
                      <form onSubmit={handleSendChatMessage} className="flex gap-2">
                        <input
                          id="chat-user-message"
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Reply to the mentor or clarify variables..."
                          className="flex-1 bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={isTyping || !chatInput.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>

                    {/* Step 4: Prompt Architecture Framework Select & Build */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <Layers className="w-5 h-5" />
                        <h2 className="font-semibold text-base text-slate-900">4. Apply Prompt Architecture Framework</h2>
                      </div>
                      <p className="text-sm text-slate-600">
                        Select a validated structural outline from the literature. We will cast your raw idea + mentor parameters into this framework.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {BEST_PRACTICE_TEMPLATES.map((tmpl) => {
                          const isSelected = tmpl.id === selectedTemplateId;
                          return (
                            <button
                              key={tmpl.id}
                              onClick={() => setSelectedTemplateId(tmpl.id)}
                              className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                                isSelected 
                                  ? "bg-white border-indigo-600 border-l-4 border-l-indigo-600 shadow-sm ring-1 ring-indigo-550/20"
                                  : "bg-slate-50 border-slate-200 hover:border-slate-350"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-xs sm:text-sm font-bold ${isSelected ? "text-indigo-600" : "text-slate-850"}`}>
                                  {tmpl.name}
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                                {tmpl.description}
                              </p>
                              
                              {/* Strengths & Weakness Preview */}
                              <div className="border-t border-slate-200/60 pt-2 mt-1 space-y-1 text-[10px]">
                                <div>
                                  <span className="text-emerald-700 font-semibold font-mono">BEST FOR:</span>{" "}
                                  <span className="text-slate-600 line-clamp-1">{tmpl.whenToUse}</span>
                                </div>
                                <div>
                                  <span className="text-rose-650 font-semibold font-mono">RISKS:</span>{" "}
                                  <span className="text-slate-600 line-clamp-1">{tmpl.weaknesses}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Compile Action Button */}
                      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                        <div className="text-[11px] text-slate-500 max-w-sm">
                          Our compiler integrates details discussed in the chat to stabilize the dynamic variables within the output prompt.
                        </div>
                        <button
                          id="btn-compile-prompt"
                          onClick={handleCompilePrompt}
                          disabled={isCompiling}
                          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isCompiling ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              Compiling Model Prompt...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Compile Prompt Template
                            </>
                          )}
                        </button>
                      </div>

                      {compileError && (
                        <div className="p-3 bg-rose-50 border border-rose-250 text-rose-800 text-xs rounded-xl">
                          {compileError}
                        </div>
                      )}
                    </div>

                  </motion.div>
                )}

                {!analysisResult && !isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-4 shadow-sm"
                  >
                    <div className="p-4 bg-slate-50 rounded-full border border-slate-100 text-indigo-600">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Start the Prompt Compiler Workbench</h3>
                      <p className="text-xs text-slate-505 max-w-sm mx-auto mt-1 leading-relaxed">
                        Input a rough prompt task idea on the left, click <strong>Deconstruct Idea</strong>, and the AI will guide you through the structural blueprinting sequence.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Panel: Output Template & Principles Sidebar */}
            <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">
              
              <AnimatePresence mode="wait">
                {isCompiling ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5 shadow-sm"
                  >
                    <div className="relative w-14 h-14 mx-auto">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                        <Terminal className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 text-sm">Injecting Architecture...</h3>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Our dynamic prompt compiler is analyzing your conversation context, stabilizing placeholders, applying the selected best-practice structure, and indexing markdown notes.
                      </p>
                    </div>
                  </motion.div>
                ) : compiledResult ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full filter blur-3xl opacity-60" />
                      
                      {/* Sub-header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-indigo-600" />
                          <span className="font-bold text-slate-950 font-mono text-xs uppercase tracking-wider">
                            COMPILATION SUCCESSFUL
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyText(compiledResult.completedPrompt, false)}
                          className="bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer font-medium shadow-sm"
                        >
                          {copiedPromptStatus ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-550" />
                              Copy Prompt
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display compiled template */}
                      <div className="space-y-4 relative z-10">
                        <div>
                          <label className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider font-mono">Generated Repeatable Prompt Template</label>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto selection:bg-indigo-150 selection:text-indigo-950">
                            {compiledResult.completedPrompt}
                          </div>
                        </div>

                        {/* Rationale overview */}
                        <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-150 space-y-2">
                          <div className="text-xs text-indigo-850 font-extrabold uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-indigo-600" />
                            Why This Template Structure Wins
                          </div>
                          <p className="text-xs text-indigo-950 leading-relaxed font-sans">
                            {compiledResult.overallWhy}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Annotation side notes */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <BookOpen className="w-5 h-5" />
                        <h2 className="font-semibold text-base text-slate-900">Prompt Design Annotations (Educational Notes)</h2>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Here is an in-depth breakdown of how the compiler applied prompt engineering principles to ensure your prompt behaves repeatably.
                      </p>

                      <div className="space-y-3">
                        {compiledResult.sideNotes.map((note, idx) => (
                          <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start gap-3">
                            <div className="text-[10px] font-mono font-semibold text-indigo-805 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded shrink-0">
                              Principle: {note.principle}
                            </div>
                            <div className="space-y-1 flex-1">
                              {note.targetSection && (
                                <div className="text-[10px] font-mono text-slate-600 italic bg-white px-2 py-0.5 rounded border border-slate-250 inline-block">
                                  Scope: "{note.targetSection}"
                                </div>
                              )}
                              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                                {note.note}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-500 text-center space-y-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-800">Compiler View Empty</div>
                    <ul className="text-[11px] text-slate-500 space-y-2 max-w-xs mx-auto text-left list-disc list-inside">
                      <li>Configure your prompt idea</li>
                      <li>Refine parameters via Chat with LLM</li>
                      <li>Select the desired scaffolding template</li>
                      <li>Click Compile to review annotations</li>
                    </ul>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* OFFLINE CASE STUDIES TAB */}
        {activeTab === "offline" && (
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Case Index selector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Layers className="w-5 h-5" />
                  <h2 className="font-semibold text-base text-slate-900">Select Static Example</h2>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Explore how common flawed, vulnerable prompts are engineered into bulletproof repeatable templates with zero web dependencies.
                </p>

                <div className="space-y-2 pt-2">
                  {OFFLINE_EXAMPLES.map((ex) => {
                    const isSelected = ex.id === selectedExampleId;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => setSelectedExampleId(ex.id)}
                        className={`w-full p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white border-indigo-600 border-l-4 border-l-indigo-600 shadow-sm ring-1 ring-indigo-500/10"
                            : "bg-slate-50 border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-slate-200/50 text-slate-500"
                          }`}>
                            {ex.category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Template: {ex.selectedTemplateId.toUpperCase()}
                          </span>
                        </div>
                        <h3 className={`text-sm font-bold mt-1 ${isSelected ? "text-indigo-600" : "text-slate-800"}`}>
                          {ex.title}
                        </h3>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar Educational Principles summary */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-semibold text-sm text-slate-900">The Anatomy of Repeatability</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Why do normal prompts break in production? 
                </p>
                <div className="space-y-2 pt-1 font-sans">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-normal">
                    <strong className="text-indigo-700 font-sans block mb-0.5 font-bold">1. Structural Parameters</strong>
                    Always define variables under descriptive custom uppercase placeholders. Placing raw details inside a repeatable script limits its usefulness.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-normal">
                    <strong className="text-amber-800 font-sans block mb-0.5 font-bold">2. Strict Delimiters</strong>
                    Use separators such as `---` or blocks like `### RAW TRANSCRIPT` so the AI contextually understands instruction boundaries apart from user variable data.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-normal">
                    <strong className="text-emerald-700 font-sans block mb-0.5 font-bold">3. Negative Constraints</strong>
                    Always specify what the model MUST NOT do. AI models default to conversational friendliness unless explicitly instructed otherwise.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Case details comparison details */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Flawed Prompt vs Templated Prompt comparison */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      {currentExample.title} Case Study
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Analyzing corporate repeatable workflows: Flawed inputs to flawless system instructions
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleCopyText(currentExample.templatedOutput, true)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-750 hover:text-slate-950 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    {copiedOfflineStatus ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied Template!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        Copy Engineered Prompt
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Flawed box: 5 columns */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider font-mono">
                      <AlertTriangle className="w-4 h-4" />
                      1. Flawed Original Prompt
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 text-xs text-slate-700 font-mono leading-relaxed h-full flex flex-col justify-between">
                      <p className="italic">"{currentExample.flawedPrompt}"</p>
                      <div className="mt-4 pt-3.5 border-t border-rose-100">
                        <div className="text-[10px] text-rose-800 font-bold uppercase mb-1.5 font-mono">Structural Flaws:</div>
                        <ul className="space-y-1">
                          {currentExample.analysis.flaws.map((flaw, idx) => (
                            <li key={idx} className="text-[10px] text-slate-600 flex items-start gap-1.5">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{flaw}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Cleaned Template box: 7 columns */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider font-mono">
                      <CheckCircle className="w-4 h-4" />
                      2. Engineered Template Prompt
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs sm:text-[13px] text-slate-750 font-mono whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
                      {currentExample.templatedOutput}
                    </div>
                  </div>
                </div>

                {/* Analysis breakdown */}
                <div className="bg-indigo-50/55 rounded-xl border border-indigo-100 p-4 space-y-3 mt-2">
                  <div className="text-xs text-indigo-850 font-extrabold uppercase tracking-wider font-mono flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" />
                    Educational Rationale Behind This Case
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] text-indigo-700 font-bold uppercase font-mono">Key Improvements Applied:</div>
                      <ul className="space-y-1 text-xs text-indigo-900 list-disc list-inside">
                        {currentExample.analysis.improvements.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-[10px] text-emerald-800 font-bold uppercase font-mono">Scientific Principle:</div>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans italic">
                        "{currentExample.analysis.rationale}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div>
            Prompt Architecture Academy &copy; All rights reserved.
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Powered by</span>
            <span className="text-slate-800 font-semibold px-1 py-0.5 bg-slate-100 rounded">Gemini LLM</span>
            <span>&</span>
            <span className="text-slate-800 font-semibold px-1 py-0.5 bg-slate-100 rounded">React + Tailwind</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
