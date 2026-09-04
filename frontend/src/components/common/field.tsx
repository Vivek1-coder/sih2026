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
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label>{label}</label>

      {select ? (
        <select
          value={value ?? ""}
          onChange={onChange}
        >
          <option value="" disabled>
            Select {label.toLowerCase()}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
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