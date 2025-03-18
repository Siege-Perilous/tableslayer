import type { StageExports } from '@tableslayer/ui';

export const initializeStage = (stage: StageExports, setLoading: (isLoading: boolean) => void) => {
  const interval = setInterval(() => {
    if (stage) {
      setLoading(false);
      clearInterval(interval);
    }
  }, 50);
};
