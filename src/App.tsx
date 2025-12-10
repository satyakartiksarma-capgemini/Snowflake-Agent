import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as _uuidv4 } from 'uuid';
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";
import Header from "@/components/Header";
import Login from "@/components/Login";
import SelectSource from "@/components/SelectSource";

import InteractionMode from "./components/InteractionMode";
import { Routes, Route } from "react-router-dom";
import { AdminConfigEditor } from "./components/admin_v2"

// Update DisplayData to be a string type
type DisplayData = string | null;
interface MessageWithAgent {
  type: "human" | "ai";
  content: string;
  id: string;
  agent?: string;
  finalReportWithCitations?: boolean;
}

interface AgentMessage {
  parts: { text: string }[];
  role: string;
}

interface AgentResponse {
  content: AgentMessage;
  usageMetadata: {
    candidatesTokenCount: number;
    promptTokenCount: number;
    totalTokenCount: number;
  };
  author: string;
  actions: {
    stateDelta: {
      research_plan?: string;
      final_report_with_citations?: boolean;
    };
  };
}

interface ProcessedEvent {
  title: string;
  data: any;
}

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithAgent[]>([]);
  const [displayData, setDisplayData] = useState<DisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messageEvents, setMessageEvents] = useState<Map<string, ProcessedEvent[]>>(new Map());
  const [websiteCount, setWebsiteCount] = useState<number>(0);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const currentAgentRef = useRef('');
  const accumulatedTextRef = useRef("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentStep, setCurrentStep] = useState<"login" | "selectSource" | "workflow" | "interaction" | "welcome" | "chat">("login");



  const [headerStageName, setHeaderStageName] = useState("");
  const [headerFilePath, setHeaderFilePath] = useState("");

  //getting metadata

  const SF_BASE = import.meta.env.VITE_SF_BASE_URL!;
  const SF_DB = import.meta.env.VITE_SF_DATABASE!;
  const SF_SCHEMA = import.meta.env.VITE_SF_SCHEMA!;
  const SF_WAREHOUSE = import.meta.env.VITE_SF_WAREHOUSE!; // optional if using SQL API

  const AGENT_DEFAULT = import.meta.env.VITE_SF_AGENT_DEFAULT!;
  const AGENT_HUMAN = import.meta.env.VITE_SF_AGENT_HUMAN!;
  const AGENT_AUTO = import.meta.env.VITE_SF_AGENT_AUTO!;

  const SF_TOKEN = import.meta.env.VITE_SF_BEARER_TOKEN!;




  const [stages, setStages] = useState([
    { name: "Data Discovery", status: "Pending" },
    { name: "Schema Check", status: "Pending" },
    { name: "Ingestion Plan", status: "Pending" },
    { name: "Data Ingestion", status: "Pending" },
    { name: "Data Quality Checks", status: "Pending" },
    { name: "Reconciliation Checks", status: "Pending" },
    { name: "Metadata Updates", status: "Pending" },
  ]);

  const [toolNames, setToolNames] = useState<Set<string>>(new Set());

  const updateStageStatus = (stageName: string, status: "Pending" | "In Progress" | "Completed" | "Failed") => {
    setStages(prev =>
      prev.map(stage =>
        stage.name === stageName ? { ...stage, status } : stage
      )
    );
  };




  useEffect(() => {
    localStorage.setItem('conversation', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem('conversation');
    if (saved) setMessages(JSON.parse(saved));
  }, []);


  const retryWithBackoff = async (
    fn: () => Promise<any>,
    maxRetries: number = 10,
    maxDuration: number = 120000 // 2 minutes
  ): Promise<any> => {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (Date.now() - startTime > maxDuration) {
        throw new Error(`Retry timeout after ${maxDuration}ms`);
      }

      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

  // const createSession = async (): Promise<{userId: string, sessionId: string, appName: string}> => {
  //   const generatedSessionId = uuidv4();
  //   const response = await fetch(`/api/apps/app/users/u_999/sessions/${generatedSessionId}`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json"
  //     }
  //   });

  //   if (!response.ok) {
  //     throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
  //   }

  //   const data = await response.json();
  //   return {
  //     userId: data.userId,
  //     sessionId: data.id,
  //     appName: data.appName
  //   };
  // };

  const [selectedApiUrl, setSelectedApiUrl] = useState("");
  const [workflowType, setWorkflowType] = useState<string>("");
  const [interactionMode, setInteractionMode] = useState<string>("");
  const [isEyeVisible, setIsEyeVisible] = useState(false);
  const [headerLink, setHeaderLink] = useState<string>("");

  const handleApiSelect = (apiUrl: string) => {
    setSelectedApiUrl(apiUrl);
    console.log("Selected API URL:", apiUrl);
  };


  const handleWorkflowSelect = (type: string) => {
    setWorkflowType(type);
    console.log("Selected Workflow:", type);
  };


  const handleModeSelect = (mode: string) => {
    setInteractionMode(mode);
    console.log("Selected Interaction Mode:", mode);
  };


  const toggleEyeVisibility = () => {
    setIsEyeVisible((prev) => !prev);
  };







  // const checkBackendHealth = async (): Promise<boolean> => {
  //   try {
  //     // Use the docs endpoint or root endpoint to check if backend is ready


  //     const headers = {
  //       Authorization: "Bearer ", // Replace with secure token handling
  //       "Content-Type": "application/json",
  //       Accept: "text/event-stream"
  //     };
  // const response = await fetch(url, {
  //   method: "POST",
  //   headers: headers,
  //   body: JSON.stringify({
  //     agent: "SNOWFLAKE_INTELLIGENCE.AGENTS.HIL_SF_IDEA",
  //     messages: [{
  //       role: "user",
  //       content: [{
  //         type: "text",

  //       }]
  //     }],

  //     context: {
  //       warehouse: "MY_WH",
  //       database: "MY_DB",
  //       schema: "PUBLIC"
  //     },

  //     options: {
  //       allow_execution: true
  //     }

  //   }),
  // });
  // return response.ok;
  //   } catch (error) {
  //     console.log("Backend not ready yet:", error);
  //     return false;
  //   }
  // };


  // Function to extract text and metadata from SSE data

  const extractDataFromSSE = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      console.log('[SSE RAW PARSED]:', parsed);

      let textParts: string[] = [];
      let agent: string | undefined = undefined;
      let finalReportWithCitations: string | undefined = undefined;
      let functionCall: { name: string; args: any } | null = null;
      let functionResponse: { name: string; response: any } | null = null;
      let sources: any = null;
      let toolName: string | undefined = undefined;
      let hasThinking = false;

      // ✅ Extract text parts
      if (parsed.content && Array.isArray(parsed.content)) {
        textParts = parsed.content
          .filter((item: any) => item.type === 'text' && item.text)
          .map((item: any) => item.text);

        // Detect thinking
        hasThinking = parsed.content.some((item: any) => item.type === 'thinking');

        // Detect tool usage
        const toolUsePart = parsed.content.find((item: any) => item.type === 'tool_use');
        if (toolUsePart?.tool_use?.name) {
          toolName = toolUsePart.tool_use.name;
        }

        const toolResultPart = parsed.content.find((item: any) => item.type === 'tool_result');
        if (toolResultPart?.tool_result?.name) {
          toolName = toolResultPart.tool_result.name;
        }
      }

      // ✅ Extract functionCall and functionResponse if present
      if (parsed.content?.parts && Array.isArray(parsed.content.parts)) {
        const functionCallPart = parsed.content.parts.find((part: any) => part.functionCall);
        if (functionCallPart) {
          functionCall = {
            name: functionCallPart.functionCall.name,
            args: functionCallPart.functionCall.args || {},
          };
        }

        const functionResponsePart = parsed.content.parts.find((part: any) => part.functionResponse);
        if (functionResponsePart) {
          functionResponse = {
            name: functionResponsePart.functionResponse.name,
            response: functionResponsePart.functionResponse.response || {},
          };
        }
      }

      // ✅ Extract agent name (fallback if missing)
      if (parsed.author) {
        agent = parsed.author;
      } else if (!agent && toolName) {
        // Infer agent from tool name
        if (toolName.includes('Discovery')) agent = 'root_agent';
        else if (toolName.includes('Ingestion')) agent = 'ingestion_executor_agent';
        else agent = 'root_agent';
      }

      // ✅ Extract final report and sources
      if (parsed.actions?.stateDelta?.final_report_with_citations) {
        finalReportWithCitations = parsed.actions.stateDelta.final_report_with_citations;
      }
      if (parsed.actions?.stateDelta?.sources) {
        sources = parsed.actions.stateDelta.sources;
      }

      return {
        textParts,
        agent,
        finalReportWithCitations,
        functionCall,
        functionResponse,
        sources,
        toolName,
        hasThinking
      };
    } catch (error) {
      const truncatedData = data.length > 200 ? data.substring(0, 200) + '...' : data;
      console.error('Error parsing SSE data. Raw data (truncated): "', truncatedData, '". Error details:', error);
      return {
        textParts: [],
        agent: undefined,
        finalReportWithCitations: undefined,
        functionCall: null,
        functionResponse: null,
        sources: null,
        toolName: undefined,
        hasThinking: false
      };
    }
  };

  // Define getEventTitle here or ensure it's in scope from where it's used
  const getEventTitle = (agentName: string): string => {
    switch (agentName) {
      case "plan_generator":
        return "Planning Research Strategy";
      case "section_planner":
        return "Structuring Report Outline";
      case "section_researcher":
        return "Initial Web Research";
      case "research_evaluator":
        return "Evaluating Research Quality";
      case "EscalationChecker":
        return "Quality Assessment";
      case "enhanced_search_executor":
        return "Enhanced Web Research";
      case "research_pipeline":
        return "Executing Research Pipeline";
      case "iterative_refinement_loop":
        return "Refining Research";
      case "ingestion_planner_agent":
      case "root_agent":
        return "Interactive Planning";
      default:
        return `Processing (${agentName || 'Unknown Agent'})`;
    }
  };


  const processSseEventData = (jsonData: string, aiMessageId: string) => {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
    } catch (err) {
      console.error("Error parsing SSE JSON:", err);
      return;
    }

    if (parsed.status && parsed.message) {
      setMessageEvents(prev => new Map(prev).set(aiMessageId, [
        ...(prev.get(aiMessageId) ?? []),
        {
          title: "Agent Status Update",
          data: {
            type: "status",
            event: "response.status",
            status: parsed.status,
            message: parsed.message
          }
        }
      ]));
      return; // Skip adding textParts for status events
    }

    // ✅ Handle charts
    if (jsonData.includes("response.chart")) {
      try {
        if (parsed.chart_spec) {
          const chartSpec = JSON.parse(parsed.chart_spec);
          setMessageEvents(prev => new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            { title: "Chart", data: { type: "chart", spec: chartSpec } }
          ]));
        }
      } catch (err) {
        console.error("Error parsing chart event:", err);
      }
    }

    // ✅ Handle tables
    if (jsonData.includes("response.table")) {
      try {
        if (parsed.result_set && parsed.result_set.data && parsed.result_set.result_set_meta_data) {
          const columns = parsed.result_set.result_set_meta_data.row_type.map((col: any) => ({
            Header: col.name, accessor: col.name
          }));
          const dataRows = parsed.result_set.data.map((row: any) => {
            const obj: any = {};
            parsed.result_set.result_set_meta_data.row_type.forEach((col: any, idx: number) => {
              obj[col.name] = row[idx];
            });
            return obj;
          });
          setMessageEvents(prev => new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            { title: "Table", data: { type: "table", columns, rows: dataRows } }
          ]));
        }
      } catch (err) {
        console.error("Error parsing table event:", err);
      }
    }

    // ✅ Extract data
    const { textParts, agent, finalReportWithCitations, functionCall, functionResponse, sources } = extractDataFromSSE(jsonData);



    // ✅ Track current agent
    if (agent && agent !== currentAgentRef.current) {
      currentAgentRef.current = agent;
    }

    // ✅ Append AI response text
    if (textParts.length > 0) {
      for (const text of textParts) {
        accumulatedTextRef.current += text + " ";
        setMessages(prev => {
          const updated = prev.map(msg =>
            msg.id === aiMessageId
              ? { ...msg, content: accumulatedTextRef.current.trim(), agent: currentAgentRef.current || msg.agent }
              : msg
          );
          localStorage.setItem("conversation", JSON.stringify(updated));
          return updated;
        });
        setDisplayData(accumulatedTextRef.current.trim());
      }
    }

    // ✅ Add timeline event for text
    // if (textParts.length > 0 && agent !== "report_composer_with_citations") {
    //   const eventTitle = getEventTitle(agent);
    //   setMessageEvents(prev => new Map(prev).set(aiMessageId, [
    //     ...(prev.get(aiMessageId) ?? []),
    //     { title: eventTitle, data: { type: "text", content: textParts } }
    //   ]));
    // }

    // ✅ Add sources
    if (sources) {
      setMessageEvents(prev => new Map(prev).set(aiMessageId, [
        ...(prev.get(aiMessageId) || []),
        { title: "Retrieved Sources", data: { type: "sources", content: sources } }
      ]));
    }

    // ✅ Handle final report
    if (agent === "report_composer_with_citations" && finalReportWithCitations) {
      const finalReportMessageId = Date.now().toString() + "_final";
      setMessages(prev => {
        const updated = [
          ...prev,
          {
            type: "ai" as const,
            content: finalReportWithCitations as string,
            id: finalReportMessageId,
            agent: currentAgentRef.current,
            finalReportWithCitations: true
          }
        ];
        localStorage.setItem("conversation", JSON.stringify(updated));
        return updated;
      });
      setDisplayData(finalReportWithCitations as string);
    }




    const toolStageMap: Record<string, string> = {
      Data_Discovery: "Data Discovery",
      INGESTION_CODE_GENERATION: "Schema Check",
      DQ_TABLE_CHECK_HIL: "Data Quality Checks",
      Business_Glossary: "Metadata Updates",
      DATA_RECONCILIATION: "Reconciliation Checks",
      Schema_Checker: "Schema Check",
      Ingestion_Planner: "Ingestion Plan",
      Ingestion_Executor: "Data Ingestion",
      Quality_Checker: "Data Quality Checks",
      Reconciliation_Tool: "Reconciliation Checks",
      Metadata_Updater: "Metadata Updates",

      // ✅ Added mappings
      DQ_DISCOVERY_API: "Data Discovery",
      HIL_INGESTION_CODE_GENERATORS_API1: "Schema Check",
      EXECUTION_ENGINE: "Data Ingestion",
      BUSINESS_GLOSSARY: "Metadata Updates",

      // ✅ Newly requested tool names
      BUSINESS_GLOSSARY_PY: "",
      INGESTION_CODE_GENERATORS_API: "Schema Check",
      EXECUTION_ENGINE_PREVIEW: "Data Ingestion",
      DQ_TABLE_CHECK2: "Data Quality Checks"
    };








    let toolName: string | undefined;
    const toolUsePart = parsed.content?.find((item: any) => item.type === "tool_use");
    if (toolUsePart?.tool_use?.name) toolName = toolUsePart.tool_use.name;

    if (!toolName) {
      const toolResultPart = parsed.content?.find((item: any) => item.type === "tool_result");
      if (toolResultPart?.tool_result?.name) toolName = toolResultPart.tool_result.name;
    }


    if (toolName) {
      console.log("Tool Name", toolName)
      setToolNames(prev => new Set([...prev, toolName]));
      console.log("All Tool Names So Far:", Array.from(toolNames));
    }


    let stageKey: string | undefined;
    if (toolName === "INGESTION_CODE_GENERATION") {
      const executeCopy = parsed.content.find((item: any) => item.type === "tool_use")?.tool_use?.input?.execute_copy;
      if (executeCopy === false) {
        stageKey = "Schema Check";
      } else if (executeCopy === true) {
        stageKey = "Data Ingestion";
      } else {
        stageKey = "Ingestion Plan"; // fallback if objective mentions planning
      }
    } else {
      stageKey = toolName ? toolStageMap[toolName] : undefined;
    }

    if (stageKey) {
      setStages(prev =>
        prev.map(stage =>
          stage.name === stageKey ? { ...stage, status: "In Progress" } : stage
        )
      );
    }


    if (toolName === "FILE_SPLIT") {
      setStages(prev =>
        prev.map(stage =>
          stage.name === "Data Discovery" ? { ...stage, status: "Completed" } : stage
        )
      );
    }


    // ✅ Mark stage as Completed for any tool that has a mapping
    if (stageKey) {
      setStages(prev =>
        prev.map(stage =>
          stage.name === stageKey ? { ...stage, status: "Completed" } : stage
        )
      );
    }




    // const toolResultPart = parsed.content?.find((item: any) => item.type === "tool_result");
    // if (toolResultPart?.tool_result?.status === "success" && toolName && toolStageMap[toolName]) {
    //   setStages(prev =>
    //     prev.map(stage =>
    //       stage.name === toolStageMap[toolName] ? { ...stage, status: "Completed" } : stage
    //     )
    //   );
    // }

    // ✅ Add function call/response logs
    if (functionCall) {
      setMessageEvents(prev => new Map(prev).set(aiMessageId, [
        ...(prev.get(aiMessageId) ?? []),
        {
          title: `Agent Query: ${functionCall.name}`,
          data: {
            type: "functionCall",
            content: `Calling function: ${functionCall.name}\nArguments:\n${JSON.stringify(functionCall.args, null, 2)}`
          }
        }
      ]));
    }

    if (functionResponse) {
      setMessageEvents(prev => new Map(prev).set(aiMessageId, [
        ...(prev.get(aiMessageId) ?? []),
        {
          title: `Agent Response: ${functionResponse.name}`,
          data: {
            type: "functionResponse",
            content: `Function ${functionResponse.name} response:\n${JSON.stringify(functionResponse.response, null, 2)}`
          }
        }
      ]));
    }
  };


  const handleSubmit = useCallback(async (query: string, model: string, effort: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      // Create session if it doesn't exist
      // let currentUserId = userId;
      // let currentSessionId = sessionId;
      // let currentAppName = appName;

      // if (!currentSessionId || !currentUserId || !currentAppName) {
      //   console.log('Creating new session...');
      //   const sessionData = await retryWithBackoff(createSession);
      //   currentUserId = sessionData.userId;
      //   currentSessionId = sessionData.sessionId;
      //   currentAppName = sessionData.appName;

      //   setUserId(currentUserId);
      //   setSessionId(currentSessionId);
      //   setAppName(currentAppName);
      //   console.log('Session created successfully:', { currentUserId, currentSessionId, currentAppName });
      // }

      // Add user message to chat
      const userMessageId = Date.now().toString();
      setMessages(prev => [...prev, { type: "human", content: query, id: userMessageId }]);

      // Create AI message placeholder
      const aiMessageId = Date.now().toString() + "_ai";
      currentAgentRef.current = ''; // Reset current agent
      accumulatedTextRef.current = ''; // Reset accumulated text

      setMessages(prev => [...prev, {
        type: "ai",
        content: "",
        id: aiMessageId,
        agent: '',
      }]);

      // Send the message with retry logic
      const sendMessage = async (query: string) => {
        const HOST = 'PIHJDMO-SFCOECORTEX.snowflakecomputing.com';
        const DATABASE = 'D_CAPG_CORTEX_AI_DB';
        const SCHEMA = 'IDEA_REFACTOR_SOL';
        const AGENT = 'HIL_SF_IDEA';
        const url = `https://${HOST}/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT}:run`;




        let finalApiUrl = selectedApiUrl;

        // Check if URL already contains ":run"

        if (finalApiUrl === 'snowflake') {
          finalApiUrl = `${SF_BASE.replace(/\/+$/, '')}/api/v2/databases/${encodeURIComponent(SF_DB)}/schemas/${encodeURIComponent(SF_SCHEMA)}/agents/HIL_SF_IDEA:run`;
        } else if (finalApiUrl === 'realtime') {
          if (interactionMode === 'human') {
            finalApiUrl = `${SF_BASE.replace(/\/+$/, '')}/api/v2/databases/${encodeURIComponent(SF_DB)}/schemas/${encodeURIComponent(SF_SCHEMA)}/agents/HIL_SF_IDEA_API:run`;
          } else if (interactionMode === 'auto') {
            finalApiUrl = `${SF_BASE.replace(/\/+$/, '')}/api/v2/databases/${encodeURIComponent(SF_DB)}/schemas/${encodeURIComponent(SF_SCHEMA)}/agents/SF_IDEA_API:run`;
          }
        }


          // alert(finalApiUrl);

          const headers = {
            Authorization: `Bearer ${SF_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            "Connection": "keep-alive",
          };
          const response = await fetch(finalApiUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
              agent: "D_CAPG_CORTEX_AI_DB.IDEA_REFACTOR_SOL.HIL_SF_IDEA",

              messages: [
                ...messages.map(msg => ({
                  role: msg.type === "human" ? "user" : "assistant",
                  content: [{ type: "text", text: msg.content }]
                })),
                { role: "user", content: [{ type: "text", text: query }] }
              ],

              context: {
                warehouse: "W_CAPG_APAC_IND_DEMO_IDEA_REFACTOR_SOL_XS",
                database: "MY_DB",
                schema: "PUBLIC"
              },

              options: {
                allow_execution: true
              }
            }),
          });
          console.log('Fetch response:', response);
          if (!response.ok) {
            throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
          }

          return response;
        };

        const response = await retryWithBackoff(() => sendMessage(query));

        // Handle SSE streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        console.log("response:", response); // need to change the below code according to response coming from agents

        // make sure 
        let lineBuffer = "";
        let eventDataBuffer = "";
        console.log("reader:", reader);
        if (reader) {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();

            if (value) {
              lineBuffer += decoder.decode(value, { stream: true });
            }
            console.log('Line Buffer:', lineBuffer); // DEBUG: Log current line buffer
            let eolIndex;
            // Process all complete lines in the buffer, or the remaining buffer if 'done'
            while ((eolIndex = lineBuffer.indexOf('\n')) >= 0 || (done && lineBuffer.length > 0)) {
              let line: string;
              if (eolIndex >= 0) {
                line = lineBuffer.substring(0, eolIndex);
                lineBuffer = lineBuffer.substring(eolIndex + 1);
              } else { // Only if done and lineBuffer has content without a trailing newline
                line = lineBuffer;
                lineBuffer = "";
              }

              if (line.trim() === "") { // Empty line: dispatch event
                if (eventDataBuffer.length > 0) {
                  // Remove trailing newline before parsing
                  const jsonDataToParse = eventDataBuffer.endsWith('\n') ? eventDataBuffer.slice(0, -1) : eventDataBuffer;
                  console.log('[SSE DISPATCH EVENT]:', jsonDataToParse.substring(0, 200) + "...");
                  if (!jsonDataToParse.includes("[DONE]")) {  // DEBUG
                    processSseEventData(jsonDataToParse, aiMessageId);
                  }
                  eventDataBuffer = ""; // Reset for next event
                }
              } else if (line.startsWith('data:')) {
                eventDataBuffer += line.substring(5).trimStart() + '\n'; // Add newline as per spec for multi-line data
              } else if (line.startsWith(':')) {
                // Comment line, ignore
              } // Other SSE fields (event, id, retry) can be handled here if needed
            }

            if (done) {
              // If the loop exited due to 'done', and there's still data in eventDataBuffer
              // (e.g., stream ended after data lines but before an empty line delimiter)
              if (eventDataBuffer.length > 0) {
                const jsonDataToParse = eventDataBuffer.endsWith('\n') ? eventDataBuffer.slice(0, -1) : eventDataBuffer;
                console.log('[SSE DISPATCH FINAL EVENT]:', jsonDataToParse.substring(0, 200) + "..."); // DEBUG
                processSseEventData(jsonDataToParse, aiMessageId);
                eventDataBuffer = ""; // Clear buffer
              }
              break; // Exit the while(true) loop
            }
          }
        }

        setIsLoading(false);

      } catch (error) {
        console.error("Error:", error);
        // Update the AI message placeholder with an error message
        const aiMessageId = Date.now().toString() + "_ai_error";
        setMessages(prev => [...prev, {
          type: "ai",
          content: `Sorry, there was an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
          id: aiMessageId
        }]);
        setIsLoading(false);
      }
    }, [processSseEventData]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    const checkBackend = async () => {
      setIsCheckingBackend(true);

      // Check if backend is ready with retry logic
      const maxAttempts = 60; // 2 minutes with 2-second intervals
      let attempts = 0;

      while (attempts < maxAttempts) {
        // const isReady = await checkBackendHealth();
        const isReady = true;
        if (isReady) {
          setIsBackendReady(true);
          setIsCheckingBackend(false);
          return;
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
      }

      // If we get here, backend didn't come up in time
      setIsCheckingBackend(false);
      console.error("Backend failed to start within 2 minutes");
    };

    checkBackend();
  }, []);

  const handleCancel = useCallback(() => {
    setMessages([]);
    setDisplayData(null);
    setMessageEvents(new Map());
    setWebsiteCount(0);
    window.location.reload();
  }, []);

  // Scroll to bottom when messages update
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, []);



  const handleHeaderUpdate = (stage?: string, filePath?: string, link?: string) => {
    if (link) {
      setHeaderLink(link); // ✅ Update link if provided
      setHeaderStageName(""); // Clear stage
      setHeaderFilePath(""); // Clear file path
    } else {
      if (stage) setHeaderStageName(stage);
      if (filePath) setHeaderFilePath(filePath);
    }
  };



  function normalizeFilePath(input: string): string | null {
    if (!input) return null;
    let s = input.trim().replace(/^file\s*path\s*:\s*/i, "").trim();
    if (s.startsWith("@")) {
      return s.slice(1).trim();
    }
    return null;
  }




  const BackendLoadingScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="w-full max-w-2xl z-10 bg-white p-8 rounded-2xl border border-gray-300 shadow-lg">

        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
            ✨ Gemini FullStack - ADK 🚀
          </h1>

          <div className="flex flex-col items-center space-y-4">
            {/* Spinning animation */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-neutral-600 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>

            <div className="space-y-2">
              <p className="text-xl text-gray-300">
                Waiting for backend to be ready...
              </p>
              <p className="text-sm text-gray-400">
                This may take a moment on first startup
              </p>
            </div>

            {/* Animated dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const [streamBuffer, setStreamBuffer] = useState("");




  return (
    <div className="w-full h-screen bg-gray-100 text-gray-800 font-sans antialiased">
      <Routes>
        {/* Admin route */}
        <Route
          path="/admin"
          element={
            <AdminConfigEditor
              onClose={() => {
                // Go back if possible, else go home
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = "/";
                }
              }}
            />
          }
        />

        {/* Main app route (your existing step-based UI) */}
        <Route
          path="/"
          element={
            <>
              {currentStep === "login" && (
                <div className="w-full h-screen">
                  <Login onLoginSuccess={() => setCurrentStep("selectSource")} />
                </div>
              )}

              {currentStep === "selectSource" && (
                <SelectSource
                  onNext={() => setCurrentStep("interaction")}
                  onApiSelect={handleApiSelect}
                />
              )}

              {/* {currentStep === "workflow" && (
                <ChooseWorkflow
                  onNext={() => setCurrentStep("interaction")}
                  onBack={() => setCurrentStep("selectSource")}
                  onWorkflowSelect={handleWorkflowSelect}
                />
              )} */}

              {currentStep === "interaction" && (
                <InteractionMode
                  onNext={() => setCurrentStep("welcome")}
                  onBack={() => setCurrentStep("selectSource")}
                  onModeSelect={handleModeSelect}
                />
              )}

              {currentStep === "welcome" && (
                <div className="w-full h-screen flex items-center justify-center bg-[#f6f7f8]">
                  <WelcomeScreen
                    handleSubmit={(query) => {
                      handleSubmit(query, "defaultModel", "defaultEffort");

                      if (query.startsWith("http")) {
                        handleHeaderUpdate(undefined, undefined, query);
                      } else {
                        const match = query.match(/@(?:[^.]+\.)+([^.]+)\/([^/]+)/);
                        if (match) {
                          const stageName = match[1];
                          const fullPath = normalizeFilePath(query);
                          if (fullPath) {
                            handleHeaderUpdate(stageName, fullPath);
                          }
                        }
                      }

                      setCurrentStep("chat");
                    }}
                    isLoading={isLoading}
                    onCancel={handleCancel}
                  />
                </div>
              )}

              {currentStep === "chat" && (
                <main className="flex-1 flex flex-col overflow-hidden w-full">
                  <div
                    className={`flex-1 overflow-y-auto ${(messages.length === 0 || isCheckingBackend) ? "flex" : ""
                      }`}
                  >
                    {isCheckingBackend ? (
                      <BackendLoadingScreen />
                    ) : !isBackendReady ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="text-center space-y-4">
                          <h2 className="text-2xl font-bold text-red-400">
                            Backend Unavailable
                          </h2>
                          <p className="text-gray-300">
                            Unable to connect to backend services at localhost:8000
                          </p>
                          <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Header
                          appTitle="IDEA 2.0"
                          sectionTitle="Data Ingestion"
                          stageName={headerStageName}   // ✅ Corrected
                          fileName={headerFilePath || headerLink}
                          isEyeVisible={isEyeVisible}
                          onToggleEye={toggleEyeVisibility}
                          fileSize="321 B"
                        />

                        <div className="pt-[112px] flex-1 overflow-y-auto bg-gray-100 pb-[80px]">
                          <ChatMessagesView
                            messages={messages}
                            isLoading={isLoading}
                            scrollAreaRef={scrollAreaRef}
                            onSubmit={(query) => void handleSubmit(query, "defaultModel", "defaultEffort")}
                            onCancel={handleCancel}
                            displayData={displayData}
                            messageEvents={messageEvents}
                            websiteCount={websiteCount}
                            stages={stages as any}
                            onHeaderUpdate={handleHeaderUpdate}
                            isEyeVisible={isEyeVisible}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </main>
              )}
            </>
          }
        />
      </Routes>
    </div>
  );




}
