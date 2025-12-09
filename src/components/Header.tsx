
import React, { useEffect, useState } from "react";
import { Bell, Settings as SettingsIcon, Eye, EyeOff,Home } from "lucide-react";
import { useNavigate } from "react-router-dom";


interface UserInfo {
  name: string;
  role: string;
}

interface HeaderProps {
  appTitle?: string;
  sectionTitle?: string;
  stageName?: string;
  fileName?: string;
  fileSize?: string;
  isEyeVisible: boolean;
  onToggleEye: () => void;

}

const Header: React.FC<HeaderProps> = ({
  appTitle = "IDEA 2.0",
  sectionTitle = "Data Ingestion",
  stageName = "",
  fileName = "",
  fileSize = "0B",
  isEyeVisible,
  onToggleEye
}) => {
  const [user, setUser] = useState<UserInfo | null>(null);

  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchUser = async () => {
      const userData: UserInfo = {
        name: localStorage.getItem("loggedInUser") || "",
        role: "User role",
      };
      setUser(userData);
    };

    fetchUser();
  }, []);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex flex-col w-full"
      style={{ backgroundColor: "#1E5A8C", color: "#FFFFFF" }}
    >
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left Section */}
        <div className="flex items-center space-x-3">
          <button className="text-xl"   onClick={() => window.location.reload()}>
            <Home className="w-6 h-6 text-white cursor-pointer" />
          </button>
          <span className="font-bold text-lg">{appTitle}</span>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4 gap-3">
          <button className="text-xl">
            <Bell className="w-6 h-6 text-white cursor-pointer" />
          </button>
          <button className="text-xl">
            <SettingsIcon className="w-6 h-6 text-white cursor-pointer" onClick={()=>{ navigate("/admin");}}/>
          </button>
          {user && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-black">
                {getInitials(user.name)}
              </div>
              <div className="text-sm">
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Ingestion Section */}
      <div className="flex items-center justify-between bg-white px-4 py-3 border-b text-black">
        {/* Left: Section Title */}
        <div className="text-xl font-semibold text-gray-700">
          {sectionTitle}
        </div>

        {/* Center: Stage, File path, Size */}
        <div className="flex space-x-6 text-sm justify-evenly gap-[40px]">


          {fileName ? (
            <>
              {fileName.startsWith("http") ? (
                <>Input Source: <a href={fileName} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">{fileName}</a></>
              ) : (
                <>
                  <span className="text-[#1E5A8C]">Stage: <span className="text-black">{stageName}</span></span>
                  <span className="text-[#1E5A8C] ml-4">File path: <span className="text-black"> {fileName}</span></span>
                </>
              )}
            </>
          ) : (
            <span>No input provided</span>
          )}

        </div>


        <div className="flex items-center space-x-4">

          <button onClick={onToggleEye} className="p-2 cursor-pointer">
            {isEyeVisible ? (
              <Eye className="w-6 h-6 text-gray-700" /> // Eye open
            ) : (
              <EyeOff className="w-6 h-6 text-gray-700" /> // Eye closed
            )}
          </button>

          <button
            className="bg-white text-[#1E5A8C] px-3 py-1 rounded hover:bg-[#1E5A8C] hover:text-white transition-colors cursor-pointer"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            + New session
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
