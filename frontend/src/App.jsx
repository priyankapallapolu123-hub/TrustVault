
import { useState } from "react";
import Dashboard from "./Dashboard";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState("Document Owner");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loggedIn, setLoggedIn] = useState(
    Boolean(sessionStorage.getItem("trustvaultToken"))
  );

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Registration failed.");
      }

      setMessage("Registration successful! Please login.");
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setName("");
    } catch (err) {
      setError(err.message || "Unable to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid email or password.");
      }

      if (data.user.role !== role) {
        throw new Error("Selected role does not match your account role.");
      }

      sessionStorage.setItem("trustvaultToken", data.token);
      sessionStorage.setItem("trustvaultUser", JSON.stringify(data.user));

      setLoggedIn(true);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("trustvaultToken");
    sessionStorage.removeItem("trustvaultUser");
    setLoggedIn(false);
    setEmail("");
    setPassword("");
    setError("");
    setMessage("");
    setMode("login");
  };

  if (loggedIn) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="brand">
          <div className="brand-icon">🔐</div>
          <h1>TrustVault</h1>
        </div>

        <div className="hero-content">
          <h1>Your Documents.<br />Your Control.</h1>
          <p>
            A secure document management platform designed to protect
            confidential files and keep every access accountable.
          </p>

          <div className="feature-list">
            <p>✓ Secure document storage</p>
            <p>✓ Role-based access control</p>
            <p>✓ Complete activity tracking</p>
            <p>✓ Instant permission management</p>
          </div>
        </div>

        <p className="left-footer">
          Secure access. Complete accountability.
        </p>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>
            {mode === "login" ? "Welcome Back!" : "Create Your Account"}
          </h2>

          <p className="login-subtitle">
            {mode === "login"
              ? "Sign in to access your secure workspace."
              : "Register to start using TrustVault."}
          </p>

          {message && (
            <div style={{ color: "green", marginBottom: "15px" }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ color: "red", marginBottom: "15px" }}>
              {error}
            </div>
          )}

          <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
            {mode === "register" && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>
                {mode === "login" ? "Login As" : "Select Your Role"}
              </label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {mode === "login" && (
                  <option value="Administrator">Administrator</option>
                )}
                <option value="Document Owner">Document Owner</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "20px" }}>
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setMessage("");
              }}
              style={{
                border: "none",
                background: "none",
                color: "#2563eb",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
