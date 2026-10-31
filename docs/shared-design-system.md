# 공통 디자인 시스템

## 디자인 방향
보라색(신뢰·편안함) + 노란색(따뜻함·행동 유도) 기반의 파스텔 육아 앱. 화면은 흰색 카드, 라벤더 배경, 라운드 16~24px, 그림자 약하게. 목업의 색상은 근삿값이며 최종 개발 전 디자이너 확인 필요.

```css
:root {
  --purple-600:#7660D9; --purple-500:#927DE4; --purple-100:#EEE8FF;
  --yellow-400:#FFE38A; --yellow-100:#FFF5D5;
  --bg:#F8F6FF; --surface:#FFFFFF; --text:#27233B; --muted:#77728D;
  --danger:#E95F72; --danger-bg:#FFF0F2;
  --warning:#D99422; --warning-bg:#FFF6DE;
  --success:#278A68; --success-bg:#E8F8F1;
  --border:#E8E3F4;
  --radius-card:20px; --radius-button:16px;
  --shadow:0 5px 20px rgba(67,50,124,.07);
}
```

## 타입·간격
- 모바일 우선 360~430px 기준; 태블릿/데스크톱에서는 콘텐츠 최대너비 480px 또는 대시보드 2열 대응.
- 제목 22~24px/700, 섹션 17~18px/700, 본문 14~16px, 보조 12~13px(핵심 안전 정보는 최소 14px 권장).
- 8px 간격 체계(4,8,12,16,24,32). 터치 목표 44×44px 이상.
- 기본 버튼: 보라색 배경, 흰 글자. 권장 행동 강조: 노란색 배경, 진한 글자. 파괴/긴급: 위험색+텍스트, 대비 WCAG AA 점검.

## 공통 컴포넌트
`AppShell`, `BottomTabBar`, `TopBar`, `PrimaryButton`, `SecondaryButton`, `StatusChip`, `ChildProfileCard`, `AlertBanner`, `VideoPreview`, `RoutineItem`, `TimelineItem`, `SuggestionCard`, `RadioChoice`, `CheckboxChoice`, `EmptyState`, `LoadingSkeleton`, `ErrorRetry`, `ConfirmModal`, `Toast`.

## 내비게이션
- 하단 탭 홈/우리 아이/모니터링/더보기. 흐름 중 하단 탭 생략 가능; 상단 뒤로가기 제공.
- 위험 상세는 현재 화면 위 모달/바텀시트로 열되 직접 URL 진입도 허용.
- 저장 전 이탈 시 입력값 유지 또는 이탈 확인. 알림에서 진입하면 해당 `eventId`로 이동.
- 비로그인 사용자는 `/welcome`으로 리다이렉트. 초기 등록 완료 사용자는 `/home`으로.

## 모든 페이지 공통 상태
로딩, 데이터 없음, API 오류, 권한 없음, 네트워크 끊김, 오프라인/재연결, 긴 문구 줄바꿈. 화면 읽기 지원 label과 라이브 영역 사용. 아이 이미지·영상은 개인정보이므로 접근제어, 최소 저장, 마스킹 정책 적용.
