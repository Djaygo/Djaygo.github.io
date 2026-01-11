export function getServerUrl(): string {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('tankBattleServerUrl');
    if (saved) return saved;
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }

  return 'http://localhost:3001';
}

export function saveServerUrl(url: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('tankBattleServerUrl', url);
  }
}
