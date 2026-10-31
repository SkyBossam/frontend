import { RefreshCw } from 'lucide-react';
import { useApp } from '../context';

export function RecordSyncStatus() {
  const { authenticated, data, recordsLoading, recordsError, refreshRecords, busy } = useApp();
  if (!authenticated || data.demo) return null;
  return <div className={'record-sync-status' + (recordsError ? ' has-error' : '')} role="status">
    <span>{recordsError ? `서버 기록을 불러오지 못했어요. ${recordsError} 표시 중인 기록은 최신이 아닐 수 있어요.` : recordsLoading ? '울음·하루 기록을 불러오는 중이에요…' : '울음·하루 기록'}</span>
    <button type="button" onClick={() => void refreshRecords()} disabled={recordsLoading || busy}><RefreshCw size={14}/>{recordsError ? '다시 불러오기' : '새로고침'}</button>
  </div>;
}
