import { Zap } from "lucide-react";

export default function Emergency() {
  return (
    <button className="emergency">
      <Zap size={16} /> Emergency help <span>→</span>
    </button>
  );
}