import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Download, Plus, Eye, Pencil, Package, Home } from 'lucide-react';
import { ProductsFilter } from '@/components/products-filter';
import { ProductsPagination } from '@/components/products-pagination';

const PAGE_SIZE = 10;

interface PageProps {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}

function formatShelfLife(days: number | null): string {
  if (!days) return '—';
  if (days >= 365) return `${Math.round(days / 365)} Năm`;
  if (days >= 30) return `${Math.round(days / 30)} Tháng`;
  return `${days} Ngày`;
}

const CATEGORY_BADGE: Record<string, string> = {
  'Thủy sản':  'admin-badge-green',
  'Rau xanh':  'admin-badge-green',
  'Rau quả':   'admin-badge-green',
  'Trái cây':  'admin-badge-green',
  'Củ quả':    'admin-badge-blue',
  'Thịt':      'admin-badge-red',
  'Gia cầm':   'admin-badge-orange',
  'Khác':      'admin-badge-muted',
};

export default async function ProductsPage({ searchParams }: PageProps) {
  await requireRole(['admin']);
  const { category, sort, page: pageParam } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10));
  const offset = (currentPage - 1) * PAGE_SIZE;

  let countQuery = supabase.from('products').select('*', { count: 'exact', head: true });
  if (category) countQuery = countQuery.eq('category', category);
  const { count: total } = await countQuery;

  const ascending = sort === 'name';
  const sortField = sort === 'name' ? 'name' : 'created_at';
  let dataQuery = supabase
    .from('products')
    .select('*')
    .order(sortField, { ascending })
    .range(offset, offset + PAGE_SIZE - 1);
  if (category) dataQuery = dataQuery.eq('category', category);
  const { data: products } = await dataQuery;

  const productIds = (products ?? []).map((p: any) => p.id);
  const { data: batchRows } = productIds.length > 0
    ? await supabase.from('batches').select('product_id').in('product_id', productIds)
    : { data: [] };

  const batchCount: Record<string, number> = {};
  for (const b of batchRows ?? []) {
    batchCount[(b as any).product_id] = (batchCount[(b as any).product_id] ?? 0) + 1;
  }

  const { data: catRows } = await supabase.from('products').select('category').order('category');
  const uniqueCategories = Array.from(new Set((catRows ?? []).map((c: any) => c.category as string)));

  const totalCount = total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const from = totalCount > 0 ? offset + 1 : 0;
  const to = Math.min(offset + PAGE_SIZE, totalCount);
  const exportParams = new URLSearchParams();
  if (category) exportParams.set('category', category);
  if (sort) exportParams.set('sort', sort);
  const exportQuery = exportParams.toString();
  const exportHref = `/api/products/export${exportQuery ? `?${exportQuery}` : ''}`;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* Breadcrumb + header */}
      <div>
        <div className="admin-breadcrumb">
          <Home size={13} />
          <span>/</span>
          <span className="admin-breadcrumb-current">Sản phẩm</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="admin-page-title">
            Sản phẩm
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href={exportHref}
              className="admin-secondary-button"
            >
              <Download size={15} />
              Xuất dữ liệu
            </Link>
            <Link
              href="/products/new"
              className="admin-primary-button"
            >
              <Plus size={15} />
              Thêm sản phẩm mới
            </Link>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="admin-card">

        {/* Toolbar */}
        <div
          className="admin-card-toolbar flex flex-wrap items-center justify-between gap-4 px-4 py-3"
        >
          <ProductsFilter categories={uniqueCategories} />
          <span className="admin-muted-strong text-[12px]">
            {totalCount > 0 ? `${from}–${to} của ${totalCount} sản phẩm` : 'Không có sản phẩm'}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="admin-table-head-row">
                <th className="admin-th">Tên sản phẩm</th>
                <th className="admin-th">Danh mục</th>
                <th className="admin-th">Đơn vị</th>
                <th className="admin-th">Hạn sử dụng</th>
                <th className="admin-th text-right">Số lô</th>
                <th className="admin-th text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {!products || products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-muted-strong px-4 py-16 text-center text-sm">
                    Không tìm thấy sản phẩm nào
                  </td>
                </tr>
              ) : (
                products.map((p: any) => {
                  const badge = CATEGORY_BADGE[p.category] ?? 'admin-badge-muted';
                  return (
                    <tr
                      key={p.id}
                      className="admin-row group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="admin-icon-tile w-9 h-9 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={16} />
                            )}
                          </div>
                          <span className="admin-ink text-sm font-semibold">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`admin-badge ${badge}`}
                        >
                          {p.category}
                        </span>
                      </td>
                      <td className="admin-muted px-4 py-3 text-sm">{p.unit}</td>
                      <td className="admin-muted px-4 py-3 text-sm">{formatShelfLife(p.shelf_life_days)}</td>
                      <td className="admin-ink px-4 py-3 text-sm font-medium text-right">
                        {batchCount[p.id] ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/products/${p.id}/edit`}
                            className="admin-icon-button p-1.5"
                            title="Xem / Chỉnh sửa"
                          >
                            <Eye size={15} />
                          </Link>
                          <Link
                            href={`/products/${p.id}/edit`}
                            className="admin-icon-button p-1.5"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="admin-card-footer px-4 py-3 flex items-center justify-between">
          <span className="admin-muted-strong text-[13px]">Trang {currentPage}</span>
          <ProductsPagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}
