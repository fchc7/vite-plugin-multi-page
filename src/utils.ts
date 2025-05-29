export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createLogger(debug: boolean) {
  return (...args: any[]) => {
    if (debug) {
      console.log("[vite-plugin-multi-page]", ...args);
    }
  };
}
