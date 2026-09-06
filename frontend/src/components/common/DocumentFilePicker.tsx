import { useRef } from 'react';
import { Upload } from 'lucide-react';

export default function DocumentFilePicker({ onFiles, disabled = false, label, multiple = false }: {
  onFiles: (files: File[]) => void; disabled?: boolean; label: string; multiple?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="document-file-picker">
    <input ref={input} className="visually-hidden" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
      multiple={multiple} disabled={disabled} aria-label={label} onChange={event => {
        const files = Array.from(event.target.files ?? []);
        if (files.length) onFiles(files);
        event.target.value = '';
      }}/>
    <button type="button" className="button primary" disabled={disabled} onClick={() => input.current?.click()}><Upload size={17} aria-hidden="true"/>{label}</button>
  </div>;
}
