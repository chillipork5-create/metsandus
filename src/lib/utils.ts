import { Project, migrateProject } from '../types';

export const STORAGE_KEY = 'mets_projects_v2';

export function getProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    // Migrate old flat shape to new structured shape
    return parsed.map(migrateProject);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    console.warn('localStorage unavailable — project data will not persist between sessions.');
  }
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function formatDate(date: Date = new Date()) {
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
}

export function totalToWords(total: number) {
  const euros = Math.floor(total);
  const cents = Math.round((total - euros) * 100);
  const ones = ['', 'üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus', 'seitse', 'kaheksa', 'üheksa'];
  const teens = ['kümme', 'üksteist', 'kaksteist', 'kolmteist', 'neljateist', 'viisteist', 'kuusteist', 'seitseteist', 'kaheksateist', 'üheksateist'];
  const tens = ['', '', 'kakskümmend', 'kolmkümmend', 'nelikümmend', 'viiskümmend', 'kuuskümmend', 'seitsekümmend', 'kaheksakümmend', 'üheksakümmend'];

  function say(n: number): string {
    if (n === 0) return 'null';
    let r = '';
    if (n >= 1000) { const t = Math.floor(n / 1000); r += (t === 1 ? '' : ones[t]) + 'tuhat '; n %= 1000; }
    if (n >= 100) { r += ones[Math.floor(n / 100)] + 'sada '; n %= 100; }
    if (n >= 10 && n < 20) { r += teens[n - 10] + ' '; }
    else { if (n >= 20) { r += tens[Math.floor(n / 10)] + ' '; n %= 10; } if (n > 0) r += ones[n] + ' '; }
    return r.trim();
  }

  let res = say(euros) + ' euro';
  if (cents > 0) res += ' ja ' + say(cents) + ' senti';
  return res.charAt(0).toUpperCase() + res.slice(1);
}
