// @ts-nocheck
import { ArrowLeft } from "lucide-react";
import { DropdownButton } from "./ui/dropdown";

export function InteractionModeSelector({ onSelect, onBack , userData, handleLogOut}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <DropdownButton userData={userData} handleLogOut={handleLogOut}/>
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 bg-indigo-100 hover:bg-blue-200 text-gray-700 rounded-full transition-colors duration-200 shadow-md flex"
        aria-label="Go back"
      >
        <ArrowLeft size={25} />
        <span className="text-sl font-semibold">Go Back</span>
      </button>



      <div className="w-full max-w-2xl z-10
                      bg-white/70 backdrop-blur-md 
                      p-8 rounded-2xl border border-gray-200 
                      shadow-2xl shadow-gray-200/50 
                      transition-all duration-300 hover:border-gray-300 text-center">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">Choose Interaction Mode</h2>
        <p className="text-gray-500 mb-6 text-center max-w-xl">
          Select how you'd like the agent to operate.<br />You can either approve each execution step-by-step or let it run the full pipeline autonomously.
        </p>
        <div className="flex gap-6 justify-center">
          <button
            onClick={() => onSelect("human_in_the_loop")}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Human-in-the-Loop
          </button>
          <button
            onClick={() => onSelect("set_and_go")}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
          >
            Set-and-Go
          </button>
        </div>
      </div>
    </div>
  );
}
