import React from "react";
import { AiOutlineFileText } from "react-icons/ai";


interface ChooseWorkflowProps {
     onNext: () => void;
     onBack: () => void;
     onWorkflowSelect: (workflowType: string) => void;
}



const ChooseWorkflow: React.FC<ChooseWorkflowProps> = ({ onNext, onBack, onWorkflowSelect }) => {
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
                         Choose Your Workflow
                    </h1>
                    <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                         Select a processing mode to suit your needs. For precise control, handle files
                         individually; for maximum efficiency, process multiple files simultaneously.
                    </p>
                    {/* BUTTON 1 */}
                    <button className="w-full mb-4 py-3 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition" onClick={() => { onWorkflowSelect("individual"); onNext() }}>
                         <AiOutlineFileText className="text-black text-xl" />
                         <span className="text-black font-medium">Process Individual File</span>
                    </button>
                    {/* BUTTON 2 */}
                    <button className="w-full py-3 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                         onClick={() => {
                              onWorkflowSelect("all");
                              onNext();
                         }}
                    >
                         <AiOutlineFileText className="text-black text-xl" />
                         <span className="text-black font-medium">Run All Files</span>
                    </button>
               </div>
          </div>
     );
};
export default ChooseWorkflow;