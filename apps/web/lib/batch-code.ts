export function generateBatchCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `LOT-${year}${month}-${seq}`;
}
