import { Link } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-card">
        <h1>Expense Splitter</h1>
        <p>
          Manage shared expenses easily and know who owes whom.
        </p>

        <div className="landing-buttons">
          <Link to="/login" className="landing-btn login-btn">
            Login
          </Link>
          <Link to="/register" className="landing-btn register-btn">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
