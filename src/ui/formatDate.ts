export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match === null ? iso : `${match[3]}/${match[2]}/${match[1]}`;
}
