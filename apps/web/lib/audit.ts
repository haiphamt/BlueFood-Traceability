type AuditClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

export async function writeBatchAuditLog(
  client: AuditClient,
  input: {
    batchId: string;
    actorId: string | null;
    action: 'insert' | 'update' | 'delete';
    entityType: string;
    summary: string;
    oldData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
  }
) {
  const { error } = await client.from('audit_logs').insert({
    entity_type: input.entityType,
    entity_id: input.batchId,
    actor_id: input.actorId,
    action: input.action,
    summary: input.summary,
    old_data: input.oldData ?? null,
    new_data: input.newData ?? null,
  });

  return error?.message ?? null;
}

export function certificateAuditSummary(
  action: 'insert' | 'update' | 'delete',
  certificateType?: string | null,
  certificateNumber?: string | null
) {
  const label = [certificateType, certificateNumber].filter(Boolean).join(' ');
  const certLabel = label ? `chứng chỉ ${label}` : 'chứng chỉ';

  if (action === 'insert') return `Liên kết ${certLabel} vào lô hàng`;
  if (action === 'delete') return `Gỡ ${certLabel} khỏi lô hàng`;
  return `Cập nhật ${certLabel} của lô hàng`;
}
