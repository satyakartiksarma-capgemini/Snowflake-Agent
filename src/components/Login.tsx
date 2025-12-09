import React, { useState, useEffect } from "react";

type User = {
    userId: string;
    password: string;
};

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const storedUser = localStorage.getItem("loggedInUser");
        if (storedUser) {
            setLoggedInUser(storedUser);
            onLoginSuccess(); // Auto-navigate if already logged in
        }
    }, [onLoginSuccess]);

    const handleLogin = () => {
        if (userId === "Harini" && password === "abc1234") {
            setLoggedInUser("Harini");
            localStorage.setItem("loggedInUser", "Harini");
            setError("");
            onLoginSuccess();
            return;
        }

         if (userId === "admin" && password === "admin123") {
            setLoggedInUser("admin");
            localStorage.setItem("loggedInUser", "admin");
            setError("");
            onLoginSuccess();
            return;
        }

        const user = users.find((u) => u.userId === userId && u.password === password);
        if (user) {
            setLoggedInUser(user.userId);
            localStorage.setItem("loggedInUser", user.userId);
            setError("");
            onLoginSuccess();
        } else {
            setError("Invalid credentials");
        }
    };

    const handleSignup = () => {
        if (!userId || !password || !confirmPassword) {
            setError("Please fill all fields");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (users.find((u) => u.userId === userId)) {
            setError("User ID already exists");
            return;
        }

        // Add new user
        const newUser = { userId, password };
        setUsers([...users, newUser]);
        setError("");

        // Auto-login after signup
        setLoggedInUser(newUser.userId);
        localStorage.setItem("loggedInUser", newUser.userId);
        onLoginSuccess(); // Navigate to next section

        // Reset fields
        setUserId("");
        setPassword("");
        setConfirmPassword("");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f5f7f8] via-[#eef3f6] to-[#d5ebf3]">
            <div className="relative z-10 w-full max-w-sm bg-white border border-gray-200 shadow-xl rounded-md">
                <div className="text-center pt-6 pb-4">
                    <h1 className="text-2xl font-semibold text-[#1b5e92]">
                        {isSignup ? "Sign Up" : "Login"}
                    </h1>
                </div>
                <div className="px-6 pb-6">
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        User ID
                    </label>
                    <input
                        type="text"
                        placeholder="Enter user ID"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1b5e92]/40"
                    />
                    <label className="block text-sm font-semibold text-gray-700 mt-4 mb-1">
                        Password
                    </label>
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1b5e92]/40"
                    />
                    {isSignup && (
                        <>
                            <label className="block text-sm font-semibold text-gray-700 mt-4 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1b5e92]/40"
                            />
                        </>
                    )}
                    <button
                        onClick={isSignup ? handleSignup : handleLogin}
                        className="mt-6 w-full py-3 rounded-md bg-[#114e82] text-white font-medium hover:bg-[#0e3f68] transition shadow-sm cursor-pointer"
                    >
                        {isSignup ? "Sign Up" : "Login"}
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-3">
                        {isSignup ? "Already have an account?" : "Accessing for the first time?"}{" "}
                        <span
                            onClick={() => {
                                setIsSignup(!isSignup);
                                setError("");
                                setUserId("");
                                setPassword("");
                                setConfirmPassword("");
                            }}
                            className="text-[#1b5e92] underline cursor-pointer"
                        >
                            {isSignup ? "Login" : "Sign Up"}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
