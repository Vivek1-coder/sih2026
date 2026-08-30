import { useNavigate } from "react-router-dom";
import Header from "../components/layout/header";

export default  function NotFound() {
  const navigate = useNavigate();
  return (
    <>
      <Header />
      <div className="not-found">
        <h1>Page not found</h1>
        <p>Let’s get you back to a safe place.</p>
        <button className="button primary" onClick={() => navigate("/")}>
          Return home
        </button>
      </div>
    </>
  );
}