"use client";

import { Tooltip } from "@heroui/react";
import { PieChart } from "lucide-react";
import styles from "./eva-ui.module.css";

interface EvaUsagePillProps {
  usage: EvaUsageDisplay | null;
}

export interface EvaUsageDisplay {
  consumedValue: number;
  remainingValue: number;
  limitValue: number;
  percentageUsed: number;
  tooltipLabel: string;
}

function getUsageColor(percentageUsed: number): string {
  const clamped = Math.max(0, Math.min(100, percentageUsed));
  const hue = Math.round((1 - clamped / 100) * 145);
  return `hsl(${hue}, 82%, 45%)`;
}

export default function EvaUsagePill({ usage }: EvaUsagePillProps) {
  if (!usage) return null;

  const consumedValue = Math.max(0, usage.consumedValue || 0);
  const remainingValue = Math.max(0, usage.remainingValue || 0);
  const limitValue = Math.max(0, usage.limitValue || 0);
  const percentageUsed = Math.max(0, Math.min(100, usage.percentageUsed || 0));
  const usageColor = getUsageColor(percentageUsed);

  return (
    <Tooltip
      content={
        <div className="text-xs">
          <p className="font-semibold">{usage.tooltipLabel}</p>
          <p>Usado: {consumedValue.toLocaleString()}</p>
          <p>Restante: {remainingValue.toLocaleString()}</p>
          <p>Límite: {limitValue.toLocaleString()}</p>
          <p>Porcentaje: {percentageUsed.toFixed(1)}%</p>
        </div>
      }
      placement="left"
    >
      <div
        className={styles.usageRing}
        style={{
          backgroundImage: `conic-gradient(${usageColor} ${percentageUsed}%, transparent ${percentageUsed}%)`,
        }}
      >
        <div className={styles.usageInner}>
          <PieChart className="h-3.5 w-3.5" style={{ color: usageColor }} />
        </div>
      </div>
    </Tooltip>
  );
}
