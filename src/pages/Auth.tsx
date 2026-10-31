import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Heart } from 'lucide-react';
import { Button, IconButton, Notice } from '../components';
import { useApp } from '../context';
import { AuthFrame } from '../components/AuthFrame';
export function Auth() { const { path, go, login, busy } = useApp(); const isLogin = path === '/login'; const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false); const [error, setError] = useState(''); return <AuthFrame><IconButton label="시작 화면으로" onClick={() => go('/welcome')}><ArrowLeft size={20}/></IconButton><div className="auth-heading"><span className="round-icon big"><Heart size={26}/></span><h1>{isLogin ? '다시 만나 반가워요' : '회원가입'}</h1><p>{isLogin ? '아이의 하루를 함께 살펴볼까요?' : '간단한 정보로 시작해요'}</p></div><form onSubmit={async (e) => { e.preventDefault(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError('올바른 이메일 주소를 입력해 주세요.');
    return;
} if (password.length < 8) {
    setError('비밀번호를 8자 이상 입력해 주세요.');
    return;
} setError(''); await login(email.toLowerCase().trim()); }}><label className="field">이메일<input type="email" autoComplete="email" placeholder="baby@aicoo.com" required value={email} onChange={e => setEmail(e.target.value)}/></label><label className="field">비밀번호 (8자 이상)<span className="password-field"><input type={show ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="비밀번호를 입력해 주세요" minLength={8} required value={password} onChange={e => setPassword(e.target.value)}/><button type="button" aria-label={show ? '비밀번호 숨기기' : '비밀번호 표시'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>{error && <p className="form-error" role="alert">{error}</p>}<Button className="full" disabled={busy}>{busy ? '준비하고 있어요…' : isLogin ? '로그인' : '회원가입'}<ArrowRight size={18}/></Button></form><p className="auth-switch">{isLogin ? '처음이신가요?' : '이미 계정이 있으신가요?'} <button onClick={() => go(isLogin ? '/signup' : '/login')}>{isLogin ? '회원가입' : '로그인'}</button></p><Notice>프론트엔드 체험 화면입니다. 실제 계정은 생성되지 않으며, 비밀번호는 저장하지 않아요.</Notice></AuthFrame>; }
