import { prisma } from "@/lib/db/client";

export async function recordAudit(params: {
  organizationId: string;
  actor: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  requestId?: string;
}) {
  await prisma.auditEvent.create({
    data: {
      organizationId: params.organizationId,
      actor: params.actor,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      previousValue: params.previousValue !== undefined ? JSON.stringify(params.previousValue) : null,
      newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
      reason: params.reason,
      requestId: params.requestId,
    },
  });
}
