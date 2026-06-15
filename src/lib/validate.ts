export function validateDiameter(val: number | string): string | null {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n) || n <= 0) return 'Diameeter peab olema positiivne arv';
  if (n > 400) return 'Diameeter ei saa olla üle 400 cm';
  return null;
}
export function validateCount(val: number | string): string | null {
  const n = typeof val === 'string' ? parseInt(String(val)) : val;
  if (isNaN(n) || n <= 0) return 'Arv peab olema positiivne täisarv';
  if (n > 10000) return 'Arv tundub ebarealistlikult suur';
  return null;
}
export function validateAge(val: number | string): string | null {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n) || n <= 0) return 'Vanus peab olema positiivne arv';
  if (n > 500) return 'Vanus tundub ebarealistlikult suur';
  return null;
}
export function validateArea(val: number | string): string | null {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n) || n <= 0) return 'Pindala peab olema positiivne arv';
  return null;
}
export function validateG(val: number | string): string | null {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n) || n < 0) return 'Rinnaspindala ei saa olla negatiivne';
  if (n > 200) return 'G tundub ebarealistlikult suur';
  return null;
}
export function validateHeight(val: number | string): string | null {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n) || n <= 0) return 'Kõrgus peab olema positiivne arv';
  if (n > 60) return 'Kõrgus tundub ebarealistlikult suur';
  return null;
}
export function validatePerimeter(val: number | string): string | null {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n) || n <= 0) return 'Ümbermõõt peab olema positiivne arv';
  return null;
}
