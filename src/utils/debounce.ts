type Cancellable = {
  cancel: () => void;
};

export const debounce = <F extends Function>(
  fn: F,
  delay: number
): F & Cancellable => {
  let timer: NodeJS.Timeout;

  const caller = ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as unknown as F;

  (caller as F & Cancellable).cancel = () => clearTimeout(timer);
  return caller as F & Cancellable;
};
