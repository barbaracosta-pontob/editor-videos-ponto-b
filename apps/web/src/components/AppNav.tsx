import Link from "next/link";
import styles from "./AppNav.module.css";

type AppNavProps = {
  breadcrumb?: string;
  children?: React.ReactNode;
  className?: string;
};

export function AppNav({ breadcrumb, children, className }: AppNavProps) {
  return (
    <div className={[styles.topbar, className].filter(Boolean).join(" ")}>
      <Link href="/" className={styles.logo}>
        Ponto B <span>Editor de Vídeos</span>
      </Link>
      {breadcrumb && (
        <>
          <span className={styles.sep}>›</span>
          <span className={styles.page}>{breadcrumb}</span>
        </>
      )}
      <div className={styles.spacer} />
      {children}
    </div>
  );
}
