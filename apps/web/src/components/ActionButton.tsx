import styles from "./ActionButton.module.css";

type ActionButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
  icon?: string;
  href?: string;
  download?: string;
  variant?: "primary" | "danger";
};

export function ActionButton({ onClick, disabled, type = "button", children, icon, href, download, variant = "primary" }: ActionButtonProps) {
  const cls = [styles.btn, variant === "danger" ? styles.danger : ""].filter(Boolean).join(" ");

  if (href) {
    return (
      <a href={href} download={download} className={cls}>
        {icon && <span className={styles.icon}>{icon}</span>}
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
}
