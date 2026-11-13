'use client';

import React, { createContext, useContext, useState } from 'react';

export type MatchPhase = 'auto' | 'teleop' | 'endgame';

interface MatchPhaseContextValue {
  currentTab: MatchPhase;
  setCurrentTab: (phase: MatchPhase) => void;
}

const MatchPhaseContext = createContext<MatchPhaseContextValue>({
  currentTab: 'auto',
  setCurrentTab: () => {},
});

export function MatchPhaseProvider({ children }: { children: React.ReactNode }) {
  const [currentTab, setCurrentTab] = useState<MatchPhase>('auto');

  return (
    <MatchPhaseContext.Provider value={{ currentTab, setCurrentTab }}>
      {children}
    </MatchPhaseContext.Provider>
  );
}

export function useMatchPhase() {
  return useContext(MatchPhaseContext);
}

