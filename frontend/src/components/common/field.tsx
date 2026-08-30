import type { ChangeEvent } from "react";

export default function Field({
  label,
  placeholder,
  type = "text",
  select = false,
  options = [],
  wide = false,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  select?: boolean;
  options?: string[];
  wide?: boolean;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {select ? (
        <select defaultValue="">
          <option value="" disabled>
            Select {label.toLowerCase()}
          </option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      )}
    </label>
  );
}
