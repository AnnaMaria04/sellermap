export function parseWbUrl(input: string): string | null {
  const patterns = [
    /wildberries\.ru\/catalog\/(\d+)/,
    /wb\.ru\/catalog\/(\d+)/,
    /^(\d{6,12})$/,
  ];

  for (const pattern of patterns) {
    const match = input.trim().match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function parseWbNmIdFromUrl(url: string): number | null {
  const id = parseWbUrl(url);
  return id ? Number(id) : null;
}
