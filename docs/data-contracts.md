# 프론트 데이터 계약 초안 (백엔드 협의용)

```ts
type Severity = 'immediate'|'caution'|'stable'|'unknown';
type DetectionType = 'cry'|'face_covered'|'edge_proximity'|'movement'|'camera_obstructed'|'connection_lost';
type DetectionStatus = 'new'|'acknowledged'|'checking'|'resolved'|'unverifiable';
type CryResponse = 'stopped'|'reduced'|'continues'|'unknown';
type RoutineType = 'sleep'|'wake'|'play'|'soothe'|'custom';
type ActionState = 'attempted'|'not_attempted';
interface Child {id:string; name:string; birthDate:string; photoUrl?:string; }
interface DetectionEvent { id:string; childId:string; type:DetectionType; severity:Severity; status:DetectionStatus; startedAt:string; endedAt?:string; durationSec?:number; lastUpdatedAt:string; summary:string; verifiable:boolean; }
interface CauseCandidate { key:'sleepiness'|'hunger'|'discomfort'|'illness_check'|'other'; label:string; score?:number; disclaimer:string; }
interface SuggestedAction {id:string; title:string; explanation:string; instructions:string[]; reason?:string; priority:number; }
interface ActionAttempt { actionId:string; state:ActionState; note?:string; }
interface CryFeedback { eventId:string; attempts:ActionAttempt[]; response:CryResponse; createdAt:string; }
interface Routine { id:string; childId:string; type:RoutineType; title:string; scheduledAt?:string; completedAt?:string; status:'todo'|'in_progress'|'done'; }
interface SensorReading { type:'temperature'|'humidity'|'noise'; value?:number; unit:string; connected:boolean; measuredAt?:string; }
interface Monitoring { childId:string; streamStatus:'live'|'loading'|'offline'|'unverifiable'; streamUrl?:string; audioEnabled:boolean; safety:{posture:'observed'|'unknown'; face:'clear'|'possibly_covered'|'unknown'; edge:'near'|'not_near'|'unknown'; objects:'detected'|'not_detected'|'unknown';}; sensors:SensorReading[]; }
```

## API 제안 (확정 아님)
| Method | Endpoint | 용도 |
|---|---|---|
| POST | `/auth/signup`, `/auth/login` | 인증 |
| GET/POST/PATCH | `/children`, `/children/:id` | 아이 정보 |
| GET/PATCH | `/preferences/notifications` | 알림 설정 |
| GET | `/dashboard?childId=` | 헤드라인·우선순위·요약 |
| GET | `/children/:id/summary?date=` | 하루 요약 |
| GET/POST/PATCH | `/children/:id/routines` | 루틴 |
| GET | `/children/:id/events?type=cry` | 울음 목록 |
| GET | `/events/:id` | 감지 상세 |
| GET | `/events/:id/recommendations` | AI 원인 후보·행동 추천 |
| POST | `/events/:id/feedback` | 행동·반응 저장 (중복 제출 방지 키) |
| GET | `/children/:id/monitoring` | 스트림 메타·감지 상태 |
| PATCH | `/events/:id/acknowledgement` | 보호자 확인 상태 |
| PATCH | `/events/:id/resolution` | 실제 현장 확인 결과 |

실시간 이벤트는 SSE/WebSocket 우선. 추천 응답 없을 때 일반적인 확인 체크리스트로 안전하게 폴백. AI 점수는 검증된 경우에만 표시하며 확률처럼 오인될 임의 퍼센트 금지.
