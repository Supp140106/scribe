import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import bgImage from "../Images/background.png";

export default function Login() {
  const navigate = useNavigate();

  // If redirected back from server with ?token=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      // clear the query string and go to the app
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const googleAuth = () => {
    window.open(`${import.meta.env.VITE_API_URL}/auth/google`, "_self");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-md shadow-lg w-full max-w-md text-center border border-white/60">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Welcome to Skribble</h1>

        <button
          onClick={googleAuth}
          className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition duration-300"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>


      </div>
    </div>
  );
}
