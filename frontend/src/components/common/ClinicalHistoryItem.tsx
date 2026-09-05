import type { LucideIcon } from "lucide-react";

interface ClinicalHistoryItemProps {
  icon: LucideIcon;
  heading: string;
  exp: string;
}

export default function ClinicalHistoryItem({
  icon: Icon,
  heading,
  exp,
}: ClinicalHistoryItemProps) {
  return (
    <div className="flex items-start">
      <div className="flex gap-3 w-full items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg  text-blue-600">
          <Icon size={18} />
        </div>
        <p className="text-sm font-semibold text-slate-700">{heading}</p>
      </div>

      <p className="text-sm leading-relaxed text-slate-500">{exp}</p>
    </div>
  );
}
