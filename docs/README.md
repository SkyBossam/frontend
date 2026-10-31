# BabySense 프론트엔드 UI 명세서

> 기준: 최종 확정된 보라·노랑 파스텔 모바일 목업 및 대화에서 합의한 기능. v1.0 / 2026-11-01

## 범위와 페이지 구조
- 주요 탭 4개: **홈(/home)**, **우리 아이(/children)**, **모니터링(/monitor)**, **더보기(/more)**. 하위 화면은 탭 내 스택 페이지 또는 모달로 표시.
- **카메라 연결 온보딩 화면은 구현하지 않음.** 실시간 모니터링 화면과 스트림 연결·끊김 상태 표시는 유지. 스트림 URL/권한 설정은 백엔드 혹은 별도 설정에서 주입.
- 울음 감지 → 상세 → AI 행동 추천 → 시도 행동 선택 → 아이 반응 선택 → 저장 완료를 핵심 UX로 구현.
- 아이 여러 명 지원 여부가 미확정이므로 모델은 `childId`를 가지며 UI는 1명으로 시작. 다중 아동 정렬은 확장 항목.
- 실내 온·습도 센서는 선택 연동. 미연결 항목에 임의 수치를 표시하지 않음.
- 긴급 알림 음소거 정책은 확정 전까지 **위험 알림 음소거 토글을 제공하지 않음**. 영상 음소거와는 별도.

## 파일 목록
| 파일 | 라우트/용도 |
|---|---|
| pages/01-welcome.md | `/welcome` 스플래시 |
| pages/02-sign-up.md | `/signup` 가입·로그인 |
| pages/03-child-setup.md | `/onboarding/child` 아이 등록 |
| pages/04-alert-setup.md | `/onboarding/notifications` 알림 설정 |
| pages/05-dashboard.md | `/home` 홈 기본·위험 상태 |
| pages/06-daily-summary.md | `/home/summary` 하루 요약 |
| pages/07-child-management.md | `/children` 아이 관리 허브 |
| pages/08-routine.md | `/children/routines` 루틴 |
| pages/09-cry-list.md | `/children/cries` 울음 관리 |
| pages/10-cry-detail.md | `/children/cries/:eventId` 울음 상세 |
| pages/11-recommendations.md | `/children/cries/:eventId/recommendations` 행동 추천 |
| pages/12-action-log.md | `/children/cries/:eventId/actions` 시도 행동 기록 |
| pages/13-response.md | `/children/cries/:eventId/response` 반응 선택 |
| pages/14-complete.md | `/children/cries/:eventId/complete` 저장 완료 |
| pages/15-monitor.md | `/monitor` 실시간 웹캠·위험 점검 |
| pages/16-alert-detail.md | 공통 위험 알림 상세 모달 |
| pages/17-more.md | `/more` 설정·로그아웃 |
| shared-design-system.md | 디자인 토큰·공통 컴포넌트 |
| data-contracts.md | 타입·API 계약 예시 |
| acceptance-tests.md | 주요 플로우 인수 기준 |

## MVP 개발 순서
1. 공통 토큰/레이아웃/내비게이션 및 Mock API
2. 회원가입·아이 등록·알림 설정
3. 홈·아이 관리·루틴·하루 요약
4. 울음 목록 → 상세 → 추천 → 행동 → 반응 → 저장
5. 모니터링·위험 상세 팝업·연결 예외 처리
6. 접근성·반응형·상태별 테스트

## 공통 규칙
- 위험 수준은 `immediate | caution | stable | unknown`. 표시 시 **아이콘+색상+텍스트**를 함께 사용.
- 위험 알림은 열람/닫기/확인하러 가기만으로 `resolved`가 되지 않음. `acknowledged`와 `resolved`는 분리.
- 울음 원인 후보는 **AI 추정**으로만 표현. '배고픔'은 울음 원인 후보이지 별도의 수유 기록 기능이 아님. '아픔'은 진단으로 표시하지 않음.
- 센서 미연결·판정 불가는 '안정' 처리 금지.
- 예시 데이터의 아이 이름·날짜·확률·측정치는 시연용이며 실서비스에는 서버 데이터만 노출.
