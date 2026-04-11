'use client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'GESTOR' | 'ANALISTA';
  companyId?: string;
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('infrapulse_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('infrapulse_token');
}

export function setSession(token: string, user: User) {
  localStorage.setItem('infrapulse_token', token);
  localStorage.setItem('infrapulse_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('infrapulse_token');
  localStorage.removeItem('infrapulse_user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
