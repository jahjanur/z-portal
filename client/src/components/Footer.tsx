import { useMobileMenu } from "../contexts/MobileMenuContext";

export default function Footer() {
  const { mobileMenuOpen } = useMobileMenu();

  /* Hide footer when mobile hamburger menu is open so it doesn't show when scrolling the menu */
  if (mobileMenuOpen) {
    return null;
  }

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] z-50 w-full">
      <div className="flex flex-col items-center justify-center max-w-6xl gap-4 px-6 py-4 mx-auto sm:flex-row">
        <div className="text-sm text-[var(--color-text-muted)]">Made with ❤️ Zulbera</div>
      </div>
    </footer>
  );
}
