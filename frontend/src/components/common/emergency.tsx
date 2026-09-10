import { useTranslation } from 'react-i18next';
import { ui } from "../../i18n";
import { Zap } from "lucide-react";

export default function Emergency() {
  useTranslation();
  return (
    <button className="emergency">
      <Zap size={16} />{ui("emergency:emergency_help")}<span>→</span>
    </button>
  );
}