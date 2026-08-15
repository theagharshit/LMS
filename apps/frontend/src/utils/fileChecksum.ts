export const sha256File = async (file: File): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  return `sha256-${hex}`;
};
