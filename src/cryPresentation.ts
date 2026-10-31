import type { CryEvent } from './domain.ts';

export function cryResult(audio?: CryEvent['audioAnalysis']) {
  if (!audio?.cryDetected) return '울음 감지';
  if (audio.babyCryScore === null && audio.cryingScore === null) return '울음 감지';
  return (audio.babyCryScore ?? 0) >= (audio.cryingScore ?? 0) ? '아기 울음 감지' : '울음 신호 감지';
}
export function observationLabel(event: CryEvent) {
  if (event.observationState === 'interrupted') return '관측 중단 · 종료 미확인';
  if (event.durationSec !== undefined) return `울음 ${Math.floor(event.durationSec / 60)}분 ${event.durationSec % 60}초 · 구간 종료`;
  return event.observationState === 'crying' ? '울음 관측 중' : '구간 종료 미확인';
}

// Immediate guidance, independent of the experimental model's training history.
export const basicCryGuidance = [
  { actionKey: 'posture', title: '아이의 자세·상태 확인하기', explanation: '아이의 얼굴과 주변 상태를 먼저 살펴 주세요.', instructions: ['아이 얼굴이 가려져 있지 않은지 살펴 주세요.', '평소와 다른 불편한 모습이 있는지 확인해 주세요.'] },
  { actionKey: 'diaper', title: '기저귀 상태 확인하기', explanation: '젖거나 불편한 부분이 없는지 살펴 주세요.', instructions: ['기저귀 상태를 직접 확인해 주세요.', '옷이 조이거나 불편한 부분이 있는지 살펴 주세요.'] },
  { actionKey: 'hug', title: '안아주고 달래기', explanation: '아이를 부드럽게 안고 반응을 살펴 주세요.', instructions: ['머리와 목을 편안히 받쳐 주세요.', '작은 목소리로 말을 걸며 천천히 달래 주세요.'] },
  { actionKey: 'sleep', title: '수면 환경 조정하기', explanation: '주변 자극을 줄이고 편안한 환경을 만들어 주세요.', instructions: ['조명을 낮추고 주변 소음을 줄여 주세요.', '수면 공간에 불필요한 물건이 없는지 확인해 주세요.'] },
];
export function cryGuidance(event: CryEvent) { return event.recommendations?.length ? event.recommendations : basicCryGuidance; }
