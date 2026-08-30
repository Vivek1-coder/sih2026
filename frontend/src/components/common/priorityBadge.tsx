import type { Priority } from "../../types/priority.type";

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority-badge ${priority.toLowerCase()}`}>
      <span />
      {priority}
    </span>
  );
}