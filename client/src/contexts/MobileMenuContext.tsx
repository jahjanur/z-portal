import React, { createContext, useContext, useState } from "react";

const MobileMenuContext = createContext<{
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
} | null>(null);

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <MobileMenuContext.Provider value={{ mobileMenuOpen, setMobileMenuOpen }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  return ctx ?? { mobileMenuOpen: false, setMobileMenuOpen: () => {} };
}
