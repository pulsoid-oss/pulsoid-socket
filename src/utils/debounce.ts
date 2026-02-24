type Cancellable = {
  cancel: () => void;
};

export const debounce = <F extends Function>(
  fn: F,
  delay: number
): F & Cancellable => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const caller = ((...args: any[]) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  }) as unknown as F;

  (caller as F & Cancellable).cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return caller as F & Cancellable;
};
