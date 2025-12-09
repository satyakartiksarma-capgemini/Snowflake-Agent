import { Button } from "@/components/ui/button";
import { InputForm } from "@/components/InputForm";
 
interface WelcomeScreenProps {
  handleSubmit: (query: string) => void;
  isLoading: boolean;
  onCancel: () => void;
}
 
export function WelcomeScreen({
  handleSubmit,
  isLoading,
  onCancel,
}: WelcomeScreenProps) {
  return (
    // This container fills the space provided by its parent layout (e.g., the left panel in a split view)
    // and centers its content (the card) within itself.
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#f5f7f8] via-[#eef3f6] to-[#d5ebf3]">
     
      {/* The "Card" Container */}
      {/* This div now holds the card's styling: background, blur, padding, border, shadow, and hover effect */}
      <div className="w-full max-w-2xl z-10
                      transition-all duration-300 hover:border-neutral-600">
       
        {/* Header section of the card */}
        <div className="text-center space-y-5">
          <h1 className="text-3xl font-semibold text-[#1b5e92] flex items-center justify-center gap-3">
       Hi {localStorage.getItem("loggedInUser")} </h1> <h3 className="text-xl font-semibold text-black flex items-center justify-center gap-3">Your Data Ingestion Agent is online.</h3>
         
        </div>
 
        {/* Input form section of the card */}
        <div className="mt-8">
          <InputForm onSubmit={handleSubmit} isLoading={isLoading} context="homepage" />
          {isLoading && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={onCancel}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-700/50" // Enhanced cancel button
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}