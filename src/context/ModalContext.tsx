/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  isAddListingOpen: boolean;
  openAddListing: () => void;
  closeAddListing: () => void;
  isSOSOpen: boolean;
  openSOS: () => void;
  closeSOS: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [isSOSOpen, setIsSOSOpen] = useState(false);

  const openAddListing = () => setIsAddListingOpen(true);
  const closeAddListing = () => setIsAddListingOpen(false);
  const openSOS = () => setIsSOSOpen(true);
  const closeSOS = () => setIsSOSOpen(false);

  return (
    <ModalContext.Provider value={{
      isAddListingOpen,
      openAddListing,
      closeAddListing,
      isSOSOpen,
      openSOS,
      closeSOS
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModals must be used within a ModalProvider');
  return context;
}
