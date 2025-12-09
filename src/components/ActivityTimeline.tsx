import React from "react";
 
interface TimelineEvent {
  title: string;
  data: { type: string; content: string };
}
 
export const AgentTimeline: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-h-[400px] overflow-y-auto border">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-blue-500">●</span> Agent Timeline
      </h2>
      <div className="space-y-4">
        {events.map((event, idx) => (
          <div key={idx} className="border rounded-md p-3 bg-gray-50">
            <p className="font-medium text-gray-800">{event.title}</p>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
              {event.data.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};