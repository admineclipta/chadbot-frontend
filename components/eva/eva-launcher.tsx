"use client";

import { Button, Chip } from "@heroui/react";
import { Sparkles } from "lucide-react";
import styles from "./eva-ui.module.css";

interface EvaLauncherProps {
  unreadCount: number;
  isOpen: boolean;
  onOpen: () => void;
}

export default function EvaLauncher({ unreadCount, isOpen, onOpen }: EvaLauncherProps) {
  return (
    <div className={styles.launcherDock}>
      <div className={styles.launcherWrap}>
        <Button
          isIconOnly
          radius="full"
          className={`${styles.launcherButton} ${isOpen ? styles.launcherOpen : ""}`}
          onPress={onOpen}
          aria-label="Abrir Eva"
        >
          <Sparkles className={`h-6 w-6 ${isOpen ? styles.launcherIconPulse : styles.launcherIconFloat}`} />
        </Button>
        {unreadCount > 0 && (
          <Chip
            color="danger"
            size="sm"
            className={styles.launcherBadge}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Chip>
        )}
      </div>
    </div>
  );
}
