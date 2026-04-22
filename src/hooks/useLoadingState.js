import { useState } from 'react';

export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  return { isLoading, setIsLoading };
};
