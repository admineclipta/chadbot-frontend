"use client";

import { Button, Card, CardBody } from "@heroui/react";
import { Check, X } from "lucide-react";
import type { EvaPendingAction } from "@/lib/api-types";
import styles from "./eva-ui.module.css";

interface EvaActionCardProps {
  action: EvaPendingAction;
  canManageActions: boolean;
  loading?: boolean;
  status?: "pending" | "confirming" | "canceling" | "rejected" | "applied";
  onConfirm: (actionId: string) => void;
  onCancel: (actionId: string) => void;
}

export default function EvaActionCard({
  action,
  canManageActions,
  loading,
  status = "pending",
  onConfirm,
  onCancel,
}: EvaActionCardProps) {
  const isConfirming = status === "confirming";
  const isCanceling = status === "canceling";
  const isRejected = status === "rejected";
  const isApplied = status === "applied";
  const isBusy = Boolean(loading) || isConfirming || isCanceling;

  return (
    <Card className={styles.actionCard}>
      <CardBody className="gap-3 p-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Accion propuesta: {action.type}
          </p>
          <p className={styles.actionSummary}>{action.summary}</p>
        </div>

        <pre className={styles.actionPayload}>
          {JSON.stringify(action.draftPayload ?? {}, null, 2)}
        </pre>

        {isRejected ? (
          <div className={styles.actionRejectedState}>
            <p className={styles.actionRejectedLabel}>Propuesta rechazada</p>
          </div>
        ) : isApplied ? (
          <div className={styles.actionAppliedState}>
            <p className={styles.actionAppliedLabel}>Cambios aplicados</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              color="success"
              isLoading={isConfirming}
              isDisabled={isBusy || !canManageActions}
              startContent={!isBusy ? <Check className="h-4 w-4" /> : undefined}
              onPress={() => onConfirm(action.actionId)}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              Confirmar
            </Button>
            <Button
              size="sm"
              color="danger"
              variant="flat"
              isLoading={isCanceling}
              isDisabled={isBusy || !canManageActions}
              startContent={!isCanceling ? <X className="h-4 w-4" /> : undefined}
              onPress={() => onCancel(action.actionId)}
            >
              Cancelar
            </Button>
          </div>
        )}
        {!canManageActions && (
          <p className={styles.permissionHint}>
            No tienes permisos para confirmar o cancelar acciones de Eva.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
