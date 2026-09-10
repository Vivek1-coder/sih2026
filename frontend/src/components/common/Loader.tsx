import { useTranslation } from 'react-i18next';
import { ui } from '../../i18n';

export default function Loader({ label = 'common:loading', fullPage = false, size = 18, className = '' }: {
  label?: string; fullPage?: boolean; size?: number; className?: string;
}) {
  useTranslation();
  return <span className={`shared-loader ${fullPage ? 'full-page-loader' : ''} ${className}`} role="status" aria-live="polite" aria-busy="true">
    <span className="shared-spinner" style={{ width: size, height: size }} aria-hidden="true" />
    <span>{ui(label)}</span>
  </span>;
}
