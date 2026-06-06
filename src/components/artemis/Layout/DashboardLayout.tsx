import type { ReactNode } from "react";
import styles from "./DashboardLayout.module.css";

interface Props {
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function DashboardLayout({ header, left, center, right }: Props) {
  return (
    <div className={styles.shell}>
      {header}
      <main className={styles.main}>
        <aside className={styles.column}>{left}</aside>
        <section className={styles.column}>{center}</section>
        <aside className={styles.column}>{right}</aside>
      </main>
    </div>
  );
}
