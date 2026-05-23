import { CertificateWizard } from '@/components/portal/certificate-wizard';
import { requirePortalContext } from '@/lib/portal';

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function NewPortalCertificatePage() {
  const { supabase, supplierIds } = await requirePortalContext();
  const { data: batches } = supplierIds.length > 0
    ? await supabase
      .from('batches')
      .select('id, batch_code, products(name)')
      .in('supplier_id', supplierIds)
      .order('created_at', { ascending: false })
    : { data: [] };

  const batchOptions = (batches ?? []).map((batch: any) => ({
    id: batch.id,
    batchCode: batch.batch_code,
    productName: firstRelation<any>(batch.products)?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="portal-page-title">Upload chứng chỉ mới</h1>
        <p className="mt-1 text-sm portal-muted">Chứng chỉ phải gắn với một lô hàng và cần admin duyệt trước khi active.</p>
      </div>
      <CertificateWizard batches={batchOptions} />
    </div>
  );
}
