import { useTranslation } from 'react-i18next';
import { ui } from '../../i18n';
export type ProcessingStage = 'uploading' | 'processing' | 'extracting' | 'done';
const stages: ProcessingStage[] = ['uploading', 'processing', 'extracting', 'done'];
export default function ProgressIndicator({ stage, failed = false }: { stage: ProcessingStage; failed?: boolean }) {
  useTranslation();
  return <div className="processing-progress" aria-busy={!failed && stage !== 'done'}>
    <p role="status" aria-live="polite">{ui(failed ? 'errors:processingFailed' : `common:${stage}`)}</p>
    <ol aria-label={ui('common:processingStages')}>{stages.map((item, index) => <li key={item} className={index <= stages.indexOf(stage) ? 'reached' : ''} aria-current={item === stage ? 'step' : undefined}>{ui(`common:${item}`)}</li>)}</ol>
  </div>;
}
