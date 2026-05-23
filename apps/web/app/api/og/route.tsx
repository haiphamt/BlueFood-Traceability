import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lotId = searchParams.get('lot') ?? '';

  const supabase = createPublicClient();
  const { data } = await supabase
    .from('batches')
    .select('batch_code, products(name), suppliers(name)')
    .eq('batch_code', lotId)
    .single();

  const product = Array.isArray(data?.products) ? data.products[0] : data?.products;
  const supplier = Array.isArray(data?.suppliers) ? data.suppliers[0] : data?.suppliers;
  const productName = (product as { name?: string } | null)?.name ?? 'BlueFood Trace';
  const supplierName = (supplier as { name?: string } | null)?.name ?? 'Truy xuat nguon goc';
  const displayLot = data?.batch_code ?? lotId;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#1a3c2e',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 34, fontWeight: 800 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: '#52b788',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a3c2e',
            }}
          >
            B
          </div>
          <div style={{ display: 'flex' }}>BlueFood</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: '#52b788', fontSize: 30, fontFamily: 'monospace', fontWeight: 700 }}>
            {displayLot}
          </div>
          <div style={{ display: 'flex', marginTop: 18, maxWidth: 920, fontSize: 72, lineHeight: 1.05, fontWeight: 850 }}>
            {productName}
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 34, color: 'rgba(255,255,255,0.82)' }}>
            {supplierName}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.72)' }}>
          Truy xuat nguon goc · Polygon PoS
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
