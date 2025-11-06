import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Log in</h1>

        <button
          onClick={googleAuth}
          className="w-full flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium transition duration-300"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>

        <p className="text-gray-600 text-sm mt-6">
          Don’t have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Sign up with Google
          </Link>
        </p>
      </div>
    </div>
  );
}
