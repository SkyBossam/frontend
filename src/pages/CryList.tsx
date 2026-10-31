import { useState } from 'react';
import { EmptyState, PageHeader, Tip } from '../components';
import { useApp } from '../context';
import { filterEvents } from '../domain';
import { Filters } from '../components/Filters';
import { CryRow } from '../components/Overview';
export function CryList() { const { data, go } = useApp(); const [filter, setFilter] = useState('all'); const events = filterEvents(data.cries, data.child!.id, filter); return <div className="narrow-page"><PageHeader title="울음 관리" subtitle="작은 신호를 이해하고, 함께 돌봐요" onBack={() => go('/children')}/><Filters value={filter} onChange={setFilter}/><div className="list-count">울음 기록 <strong>{events.length}</strong><span>최근 기록순</span></div><section className="card cry-list">{events.length ? events.map(e => <CryRow key={e.id} event={e}/>) : <EmptyState title="울음 기록이 없어요" description="감지된 울음과 대응 결과를 여기에 모아드릴게요."/>}</section><Tip>울음의 원인은 하나로 단정할 수 없어요. 아이의 상태를 직접 살피며 필요한 돌봄을 찾아주세요.</Tip></div>; }
