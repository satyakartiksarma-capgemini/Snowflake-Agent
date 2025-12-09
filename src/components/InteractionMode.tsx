import React from "react";
import { AiOutlineFileText } from "react-icons/ai";

interface InteractionModeProps {
     onNext: () => void;
     onBack: () => void;
     onModeSelect: (mode: string) => void;
}

const InteractionMode: React.FC<InteractionModeProps> = ({ onNext, onBack, onModeSelect }) => {
     return (
          <div className="min-h-screen w-full bg-[#f6f7f8] flex flex-col items-center px-6 py-10">

               {/* BACK BUTTON */}
               <div className="w-full max-w-5xl mb-10">
                    <button className="text-[#0e3f68] text-sm font-medium flex items-center gap-1 cursor-pointer" onClick={onBack}>
                         ← Back
                    </button>
               </div>
               {/* CENTERED CARD */}
               <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-10 text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold text-[#1b5e92] mb-2">
                         Choose Interaction Mode
                    </h1>
                    <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                         Select how you would like the agent to operate. You can either approve
                         each execution step by step or let it rune the full pipeline autonomously
                    </p>
                    {/* BUTTON 1 */}
                    <button className="w-full mb-4 py-3 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                         onClick={() => {
                              onModeSelect("human");
                              onNext();
                         }}
                    >
                         <AiOutlineFileText className="text-black text-xl" />
                         <span className="text-black font-medium">Human in loop</span>
                    </button>
                    {/* BUTTON 2 */}
                    <button className="w-full py-3 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                         onClick={() => {
                              onModeSelect("auto");
                              onNext();
                         }}
                    >
                         <AiOutlineFileText className="text-black text-xl" />
                         <span className="text-black font-medium">Set and Go</span>
                    </button>
               </div>
          </div>
     );
};
export default InteractionMode;