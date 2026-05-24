# BlueFood Traceability

He thong quan ly va truy xuat nguon goc chuoi cung ung nong san, thuc pham sach. Du an gom web quan tri, cong thong tin nha cung cap, trang truy xuat cong khai qua QR va ung dung mobile Expo cho nhan vien cua hang thao tac online/offline.

Repository: https://github.com/haiphamt/BlueFood-Traceability

## Chuc Nang Chinh

- Quan ly san pham, nha cung cap, lo hang, van chuyen, chung chi, audit log va bao cao tren web.
- Cong nha cung cap cho phep supplier quan ly ho so, lo hang, thanh vien, ghi chu va chung chi gan voi lo hang.
- Trang truy xuat cong khai `/trace/[lotId]` cho khach hang quet QR ma khong can dang nhap.
- Ung dung mobile cho `store_staff` dang nhap, quet QR, xac nhan da nhan, bao loi, dong bo offline khi co mang lai.
- Moi thay doi trang thai lo hang duoc ghi nhan vao audit log.
- Ho tro anchor/verify du lieu su kien len blockchain qua smart contract `BatchRegistry`.

## Cong Nghe

| Thanh phan | Cong nghe |
| --- | --- |
| Monorepo | pnpm workspace |
| Web | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Mobile | Expo React Native |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Blockchain queue | BullMQ + Redis |
| Smart contract | Solidity, Hardhat |

## Cau Truc Thu Muc

```text
bluefood-app/
  apps/
    web/        Next.js web, API routes, portal, trang trace QR
    mobile/     Expo React Native app cho nhan vien cua hang
  packages/
    shared/     Kieu du lieu va hang so dung chung
    contracts/  Smart contract BatchRegistry va script deploy
  supabase/
    migrations/             SQL schema, trigger, policy
    seed.sql                Du lieu mau
    actual_public_data.sql  Du lieu public schema export tu moi truong test
```

## Yeu Cau Moi Truong

- Node.js 20 tro len.
- Corepack va pnpm.
- Supabase project.
- Tai khoan Vercel de deploy web.
- Expo Go tren iPhone/Android de demo mobile.
- Redis/RPC blockchain chi can khi demo chuc nang anchor blockchain.

## Cai Dat Source

Tu thu muc goc `bluefood-app/`:

```powershell
corepack enable
corepack pnpm install
```

Kiem tra typecheck:

```powershell
corepack pnpm --filter web typecheck
corepack pnpm --filter mobile typecheck
```

## Cau Hinh Supabase

1. Tao Supabase project.
2. Vao SQL Editor va chay cac file trong `supabase/migrations/` theo thu tu:
   - `0001_initial_schema.sql`
   - `0002_blockchain.sql`
   - `0003_portal_store_extensions.sql`
3. Chay `supabase/seed.sql` neu can du lieu mau, hoac `supabase/actual_public_data.sql` neu muon khoi phuc du lieu test hien tai.
4. Kiem tra cac bucket Storage:
   - `product-images`
   - `batch-images`
   - `certificates`
   - `supplier-logos`
5. Tao user demo trong Supabase Auth va dam bao bang `profiles` co role phu hop: `admin`, `store_staff`, `supplier`.

## Deploy Web Len Vercel

Import repository:

```text
https://github.com/haiphamt/BlueFood-Traceability
```

Thiet lap Vercel project:

| Muc | Gia tri |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Install Command | `corepack pnpm install --frozen-lockfile` |
| Build Command | `corepack pnpm --filter web build` |

Them Environment Variables tren Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-bluefood.vercel.app

POLYGON_RPC_URL=https://your-rpc-url
BLOCKCHAIN_SUBMITTER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_POLYGONSCAN_BASE_URL=https://amoy.polygonscan.com
REDIS_URL=rediss://your-redis-url
ANCHOR_WEBHOOK_SECRET=change-me
SUPABASE_WEBHOOK_SECRET=change-me
SLACK_WEBHOOK_URL=
```

Trong do bat buoc cho web demo chinh la:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Sau khi deploy xong, cap nhat `NEXT_PUBLIC_APP_URL` thanh domain Vercel that, vi QR public va mobile se goi API theo domain nay.

## Cau Hinh Mobile Expo Go

Mobile demo bang Expo Go, khong can build IPA/APK cho do an. Sau khi web da deploy len Vercel, tao file `apps/mobile/.env`:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Noi dung can tro ve domain Vercel:

```env
EXPO_PUBLIC_API_URL=https://your-bluefood.vercel.app
```

Chay mobile bang tunnel:

```powershell
cd apps/mobile
npx expo start --tunnel --port 8082
```

Mo Expo Go tren iPhone va quet QR trong terminal. Khi `EXPO_PUBLIC_API_URL` da tro ve Vercel, dien thoai khong can chung Wi-Fi voi may tinh de goi API web.

Neu tunnel loi do ngrok/mang, co the dung LAN de test tam:

```powershell
npx expo start --lan --port 8082
```

## Chay Local De Phat Trien

Local chi dung khi phat trien, khong phai cau hinh demo chinh.

Web:

```powershell
corepack pnpm dev:web
```

Mobile LAN local:

```powershell
corepack pnpm --filter mobile start:lan
```

Khi chay local tren dien thoai that, `EXPO_PUBLIC_API_URL` phai la IP cua may tinh, vi dien thoai khong truy cap duoc `localhost` cua may tinh.

## Route Chinh

| Route | Chuc nang |
| --- | --- |
| `/login` | Dang nhap |
| `/dashboard` | Dashboard quan tri |
| `/batches` | Quan ly lo hang |
| `/products` | Quan ly san pham master |
| `/suppliers` | Quan ly nha cung cap |
| `/shipments` | Quan ly van chuyen |
| `/certificates` | Quan ly chung chi |
| `/audit-logs` | Audit log |
| `/reports` | Bao cao va export CSV |
| `/portal` | Cong nha cung cap |
| `/trace/[lotId]` | Trang truy xuat cong khai qua QR |

## Smart Contract Va Worker

Bien dich contract:

```powershell
corepack pnpm --filter @bluefood/contracts compile
```

Deploy testnet Amoy:

```powershell
corepack pnpm --filter @bluefood/contracts deploy:amoy
```

Worker anchor blockchain:

```powershell
corepack pnpm --filter web worker
```

Worker can `REDIS_URL`, `POLYGON_RPC_URL`, `BLOCKCHAIN_SUBMITTER_PRIVATE_KEY`, `CONTRACT_ADDRESS`, `ANCHOR_WEBHOOK_SECRET`.

## Luong Demo De Kiem Thu

1. Mo web Vercel va dang nhap admin.
2. Tao hoac chon lo hang trong `/batches`.
3. Mo trang public `/trace/[lotId]` va kiem tra QR.
4. Mo Expo Go, dang nhap bang tai khoan `store_staff`.
5. Quet QR lo hang, xac nhan da nhan hoac bao loi.
6. Tat mang tren dien thoai, tao thao tac offline, bat mang lai va dong bo.
7. Quay lai web Vercel kiem tra trang thai lo hang, lich su su kien va audit log.
8. Dang nhap portal supplier, them note/chung chi gan voi lo hang.
9. Dang nhap admin kiem tra chung chi va trang trace cong khai.

## Luu Y Khi Nop Do An

- Khong commit `node_modules`, `.next`, `.expo`, `dist`, log, file `.env` that hoac khoa bi mat.
- Can kem source code, README va script database trong thu muc `supabase/`.
- Neu nop zip, nen nen toan bo thu muc `bluefood-app/` sau khi da loai bo cache build va dependency.
- File `.env.local.example` va `.env.example` duoc commit de nguoi cham biet can cau hinh bien nao.
