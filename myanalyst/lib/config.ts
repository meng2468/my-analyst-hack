export const getBackendUrl = () => {
  // In development, use localhost:7860
  // In production, you can set this via environment variable
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7860';
}; 