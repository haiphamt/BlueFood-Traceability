import { BatchCreateForm } from '@/components/batch-create-form';
import { requireRole } from '@/lib/auth';

export default async function NewBatchPage() {
  await requireRole(['admin']);

  return <BatchCreateForm />;
}
