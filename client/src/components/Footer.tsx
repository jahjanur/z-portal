import { useMobileMenu } from "../contexts/MobileMenuContext";

export default function Footer() {
  const { mobileMenuOpen } = useMobileMenu();

  /* Hide footer when the mobile drawer is open */
  if (mobileMenuOpen) {
    return null;
  }

  return (
    <footer className="relative z-10 hidden w-full bg-transparent py-5 md:block">
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        © {new Date().getFullYear()} Zulbera · Made with <span aria-hidden="true">❤️</span> by Zulbera
      </p>
    </footer>
  );
}
