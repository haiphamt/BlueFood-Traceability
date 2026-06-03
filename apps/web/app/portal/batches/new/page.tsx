import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PortalBatchCreateForm } from '@/components/portal/portal-batch-create-form';
import { canEditPortal, requirePortalContext } from '@/lib/portal';

export default async function PortalNewBatchPage() {
  const { supabase, currentSupplier, hasMembership, portalRole } = await requirePortalContext();

  if (!hasMembership || !currentSupplier) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="portal-page-title">Tạo lô hàng</h1>
          <p className="mt-1 text-sm portal-muted">Tài khoản của bạn chưa được liên kết với nhà cung cấp.</p>
        </div>
        <Link href="/portal/batches" className="portal-button-secondary inline-flex">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  if (!canEditPortal(portalRole)) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="portal-page-title">Tạo lô hàng</h1>
          <p className="mt-1 text-sm portal-muted">Chỉ owner hoặc manager của nhà cung cấp mới được tạo lô hàng.</p>
        </div>
        <Link href="/portal/batches" className="portal-button-secondary inline-flex">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, unit')
    .order('name');

  return (
    <div className="max-w-[980px] space-y-5">
      <div className="flex items-center gap-2 text-sm portal-muted">
        <Link href="/portal/batches" className="portal-link">
          Lô hàng
        </Link>
        <ChevronRight size={14} />
        <span className="font-semibold text-white">Tạo mới</span>
      </div>

      <div>
        <h1 className="portal-page-title">Tạo lô hàng mới</h1>
        <p className="mt-1 text-sm portal-muted">
          Lô hàng sẽ được gắn với nhà cung cấp {currentSupplier.name} và tạo mã QR truy xuất tự động.
        </p>
      </div>

      {(products ?? []).length === 0 ? (
        <div className="portal-card portal-card-pad">
          <p className="text-sm font-semibold text-[#ffb77a]">
            Chưa có sản phẩm nào để tạo lô hàng. Vui lòng liên hệ admin để cấu hình danh mục sản phẩm.
          </p>
        </div>
      ) : (
        <PortalBatchCreateForm
          supplier={{
            id: currentSupplier.id,
            name: currentSupplier.name,
            province: currentSupplier.province,
          }}
          products={(products ?? []).map((product: any) => ({
            id: product.id,
            name: product.name,
            unit: product.unit,
          }))}
        />
      )}
    </div>
  );
}
