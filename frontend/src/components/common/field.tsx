import { useTranslation } from 'react-i18next';
import { ui } from "../../i18n";
interface FieldProps {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
  select?: boolean;
  options?: string[];
  wide?: boolean;
}

export default function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  select = false,
  options = [],
  wide = false,
}: FieldProps) {
  useTranslation();
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label>{ui(label)}</label>

      {select ? (
        <select
          value={value ?? ""}
          onChange={onChange}
        >
          <option value="" disabled>{ui("field:select")} {ui(label)}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={ui(option)}
            >
              {ui(option)}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={onChange}
        />
      )}
    </div>
  );
}