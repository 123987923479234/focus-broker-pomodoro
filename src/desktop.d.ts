declare global {
  interface Window {
    desktopApp?: {
      name: string;
      platform: string;
    };
  }
}

export {};
