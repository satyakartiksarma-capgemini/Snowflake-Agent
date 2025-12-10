// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Mic } from "lucide-react";

interface InputFormProps {
  onSubmit: (query: string, stageName?: string, filePath?: string) => void;
  isLoading: boolean;
  context?: 'homepage' | 'chat';
  onHeaderUpdate?: (stageName?: string, filePath?: string) => void;
}

export function InputForm({ onSubmit, isLoading, context = 'homepage', onHeaderUpdate }: InputFormProps) {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Initialize SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };








  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const value = inputValue.trim();
    if (!value || isLoading) return;

    if (value.startsWith("http")) {
      onSubmit(value);
      onHeaderUpdate?.(undefined, value);
      setInputValue("");
      return;
    }

    // normalize "file path:" label if present
    const normalized = value.replace(/^file\s*path\s*:\s*/i, "").trim();

    if (normalized.includes("@")) {
      const atPos = normalized.indexOf("@");
      const afterAt = normalized.slice(atPos + 1).trim();

      // stage same as before (last dot-segment before first '/')
      const stageMatch = (`@${afterAt}`).match(/@(?:[^.]+\.)+([^.]+)\/([^/]+)/);
      const stageName = stageMatch ? stageMatch[1] : undefined;

      const fullPath = afterAt; // entire string after '@'

      onSubmit(value, stageName, fullPath);
      onHeaderUpdate?.(stageName, fullPath);
      setInputValue("");
      return;
    }

    onSubmit(value);
    setInputValue("");
  };









  const placeholderText =
    context === 'chat'
      ? "Respond to the Agent, refine the plan, or type 'Looks good'..."
      : "Ask me anything... e.g., A report on the latest Google I/O";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholderText}
          className="w-full rounded-full bg-white text-gray-800 px-4 py-3 pr-24 shadow focus:outline-none"
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-4">
          {/* Mic Button */}
          <button
            type="button"
            className={`cursor-pointer ${isListening ? "text-red-500" : "text-gray-500 hover:text-blue-600"}`}
            onClick={handleMicClick}
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="text-blue-600 hover:text-blue-800 cursor-pointer"

          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </form>
  );
}
