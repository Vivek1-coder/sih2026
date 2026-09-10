import { useTranslation } from 'react-i18next';
import { ui } from "../../i18n";
import type { Priority } from "../../types/priority.type";

export default function PriorityBadge({ priority }: { priority: Priority }) {
  useTranslation();
  return (
    <span className={`priority-badge ${priority.toLowerCase()}`}>
      <span />
      {ui(priority)}
    </span>
  );
}