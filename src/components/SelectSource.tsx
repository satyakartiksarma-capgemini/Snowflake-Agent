
import React, { useMemo, useState } from "react";
import { AiOutlineDatabase, AiOutlineApi } from "react-icons/ai";
import { FaSnowflake } from "react-icons/fa";
import { FiServer } from "react-icons/fi";
import ProfileMenu from "@/components/ProfileMenu"; // adjust path

interface SelectSourceProps {
  onNext: () => void;
  onApiSelect: (apiUrl: string) => void;
}

const SelectSource: React.FC<SelectSourceProps> = ({ onNext, onApiSelect }) => {
  const [menuOpen /* not needed now, handled inside ProfileMenu */] = useState(false);

  const isAdmin = (localStorage.getItem("loggedInUser") || "").toLowerCase() === "admin";

  const sources = useMemo(
    () => [
      {
        name: "Snowflake Stage",
        description: "Connect to your Snowflake Stage to load data",
        icon: <FaSnowflake className="text-[#1b5e92] text-2xl" />,
        apiUrl: `snowflake`,
      },
      {
        name: "Custom Source",
        description: "Stream data in real time by integrating with API",
        icon: <FiServer className="text-[#1b5e92] text-2xl" />,
        apiUrl: "streaming",
      },
      {
        name: "Databases",
        description: "Create a source integration for specific needs",
        icon: <AiOutlineDatabase className="text-[#1b5e92] text-2xl" />,
        apiUrl: "https://dummyapi.com/database",
      },
      {
        name: "Realtime API",
        description: "Connect to your API to load the data",
        icon: <AiOutlineApi className="text-[#1b5e92] text-2xl" />,
        apiUrl: "realtime",
      },
    ],
    []
  );
type MenuItem = { label: string; onClick: () => void };
  const adminExtraItems: MenuItem[] = useMemo(() => {
    if (!isAdmin) return [];
    return [
      {
        label: "Admin",
        onClick: () => {
          // Let parent handle navigation by selecting a pseudo source "admin"
          onApiSelect("admin");
          onNext(); // or navigate immediately in parent based on "admin"
        },
      },
    ];
  }, [isAdmin, onApiSelect, onNext]);

  const handleSelect = (apiUrl: string) => {
    onApiSelect(apiUrl);
    onNext();
  };

  return (
    <div className="min-h-screen w-full bg-[#f6f7f8] px-6 py-6 relative">
      {/* TOP RIGHT PROFILE MENU (as a separate component) */}
      <div className="absolute top-4 right-6">
        <ProfileMenu
          className="relative"
          onMyProfile={() => {}}
          onSessions={() => {}}
          // Fallback logout behavior is in ProfileMenu; you can pass your own:
          onLogout={() => {
            localStorage.removeItem("loggedInUser");
            window.location.reload();
          }}
          
        />
      </div>

      {/* PAGE TITLE */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1b5e92] mt-2">Select your Data Source</h1>
        <p className="text-gray-600 mt-2 mb-10 text-sm">
          Choose a method to connect and load your data into the system
        </p>
      </div>

      {/* CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {sources.map((source) => (
          <div
            key={source.name}
            className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 cursor-pointer hover:shadow-md transition"
            onClick={() => {
              handleSelect(source.apiUrl);
              onNext();
            }}
          >
            <div className="w-12 h-12 bg-[#1b5e92]/15 rounded-full flex items-center justify-center mb-4">
              {source.icon}
            </div>
            <h2 className="text-lg font-semibold text-[#1b5e92]">{source.name}</h2>
            <p className="mt-1 text-gray-500 text-sm">{source.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectSource;
