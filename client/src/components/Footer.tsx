import { useMobileMenu } from "../contexts/MobileMenuContext";

export default function Footer() {
  const { mobileMenuOpen } = useMobileMenu();

  /* Hide footer when the mobile drawer is open */
  if (mobileMenuOpen) {
    return null;
  }

  return (
    <footer className="relative z-10 hidden w-full border-t border-[var(--color-border)] bg-[var(--color-bg)] md:block">
      <div className="mx-auto flex max-w-[1920px] flex-col items-center justify-between gap-2 px-6 py-5 text-center sm:flex-row sm:text-left">
        <p className="text-xs text-[var(--color-text-muted)]">
          © {new Date().getFullYear()} Zulbera. All rights reserved.
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Made with <span aria-hidden="true">❤️</span> by Zulbera
        </p>
      </div>
    </footer>
  );
}
