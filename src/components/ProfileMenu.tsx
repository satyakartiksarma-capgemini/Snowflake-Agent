
// ProfileMenu.tsx
import React, { useState, useRef, useEffect } from "react";
import { AiOutlineUser } from "react-icons/ai";
import { BiDotsVerticalRounded } from "react-icons/bi";
import { useNavigate } from "react-router-dom";

interface ProfileMenuProps {
    className?: string;
    onLogout?: () => void;
    onMyProfile?: () => void;
    onSessions?: () => void; // if you don't need this, you can remove it
    onAdmin?: () => void;     // <-- new: navigate to Admin when clicked
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
    className,
    onLogout,
    onMyProfile,
    onAdmin,
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const handleLogout =
        onLogout ||
        (() => {
            localStorage.removeItem("loggedInUser");
            window.location.reload();
        });

    const handleProfile = onMyProfile || (() => { });
    const handleAdmin = onAdmin || (() => { });

    return (
        <div className={className} ref={containerRef}>
            <button
                onClick={() => setOpen(!open)}
                className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition flex items-center"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <AiOutlineUser className="text-xl text-gray-700" />
                <BiDotsVerticalRounded className="text-xl text-gray-500" />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1"
                >
                    <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                            setOpen(false);
                            handleProfile();
                        }}
                    >
                        My profile
                    </button>

                     <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                            setOpen(false);
                            handleProfile();
                        }}
                    >
                        Sessions
                    </button>


                    {localStorage.getItem("loggedInUser") === "admin" && (
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                                setOpen(false);
                                handleAdmin();
                                navigate("/admin");
                            }}
                        >
                            Admin
                        </button>
                    )}


                    <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 cursor-pointer"
                        onClick={() => {
                            setOpen(false);
                            handleLogout();
                        }}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileMenu;
