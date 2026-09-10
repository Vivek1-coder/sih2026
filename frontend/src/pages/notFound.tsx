import { useTranslation } from "react-i18next";
import { ui } from "../i18n";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/header";

export default function NotFound() {
  useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <Header />
      <div className="not-found">
        <h1>{ui("notFound:page_not_found")}</h1>
        <p>{ui("notFound:lets_get_you_back_to_a_safe_place")}</p>
        <button className="button primary" onClick={() => navigate("/")}>
          {ui("notFound:return_home")}
        </button>
      </div>
    </>
  );
}
