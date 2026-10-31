# 프론트 데이터 계약

## 현재 울음·하루 기록 API

`/api/v1/children/{childId}/care-history`를 사용자 Bearer 토큰과 `X-Workspace-Id`로 호출합니다.

- `GET ?kind=cries|routines|sleepRecords|feedback&limit=100&cursor=...`: `{items,nextCursor}`. 어댑터는 마지막 페이지까지 읽습니다. 새로 읽기에 실패하면 기존 사본을 유지합니다.
- `PUT` + `Idempotency-Key`: `{routines,deletedRoutines,sleepRecords,deletedSleepRecords,feedback}`. 한 요청의 변경은 원자적으로 저장됩니다. 같은 사용자 동작의 재시도는 같은 키를 사용합니다.
- 루틴·수면 생성은 클라이언트 UUID, 수정·삭제는 조회한 `version`을 보냅니다. 버전이 달라지면 `409 CARE_RECORD_CHANGED`입니다.
- 울음은 읽기 전용이며 기기에서 자동 수집합니다. 원인·분석 결과를 임의로 생성하지 않습니다. 종료가 없는 기록은 `durationSec: null`입니다.
- 피드백은 `{eventId,actions,note,response}`이며 서버가 저장 시각을 부여합니다. 한 보호자의 울음별 대응 결과는 중복 저장하지 않습니다. 모델 학습용 `/sky-eye/feedback`과는 별도입니다.
- 수면과 루틴은 `routine:read/write`, 울음과 대응 결과는 `cry:read/feedback` 권한을 확인합니다. 다른 아이나 체험 기록은 업로드하지 않습니다.
- DB 시각은 UTC이고 화면의 날짜·시간은 Asia/Seoul 기준입니다. DB 저장을 확인한 뒤에만 완료 화면으로 이동합니다.

실제 타입과 변환은 `src/careHistory.ts`, 호출은 `src/api/deviceClient.ts`를 기준으로 합니다.

## 초기 기획 당시 제안 (아래 항목 전체가 현재 화면과 연결된 것은 아님)

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
