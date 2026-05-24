<p align="center">
  <a href="https://www.uit.edu.vn/" title="Trường Đại học Công nghệ Thông tin">
    <img src="https://i.imgur.com/WmMnSRt.png" alt="Trường Đại học Công nghệ Thông tin | University of Information Technology">
  </a>
</p>
<h1 align="center"><b>IS208.Q21 - QUẢN LÝ DỰ ÁN CÔNG NGHỆ THÔNG TIN</b></h1>

## BẢNG MỤC LỤC
* [Giới thiệu môn học](#giới-thiệu-môn-học)
* [Giới thiệu đồ án môn học](#giới-thiệu-đồ-án-môn-học)
* [Thành viên nhóm](#thành-viên-nhóm)
* [Cài đặt phần mềm](#cài-đặt-phần-mềm)
* [Khởi chạy dự án](#khởi-chạy-dự-án)
* [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
* [Triển khai](#triển-khai)
* [Công nghệ sử dụng](#công-nghệ-sử-dụng)

## GIỚI THIỆU MÔN HỌC
* **Tên môn học**: Quản lý dự án công nghệ thông tin
* **Mã môn học**: IS208.Q21
* **Năm học**: HK2 2025-2026
* **Giảng viên hướng dẫn:** ThS. **Tạ Việt Phương**
* **Email:** *phuongtv@uit.edu.vn*

---

## GIỚI THIỆU ĐỒ ÁN MÔN HỌC
* **Tên đề tài:** BlueFood Traceability - Hệ thống quản lý và truy xuất nguồn gốc chuỗi cung ứng nông sản sạch
* **Repository:** https://github.com/haiphamt/BlueFood-Traceability
* **Website triển khai:** https://bluefood.vercel.app

BlueFood Traceability hỗ trợ doanh nghiệp quản lý sản phẩm, nhà cung cấp, lô hàng, vận chuyển, chứng chỉ, audit log và báo cáo trong chuỗi cung ứng thực phẩm sạch. Hệ thống có trang truy xuất nguồn gốc công khai qua mã QR cho khách hàng, cổng thông tin nhà cung cấp và ứng dụng mobile cho nhân viên cửa hàng thao tác online/offline.

Các chức năng chính:

* Quản lý sản phẩm, nhà cung cấp, lô hàng, vận chuyển, chứng chỉ và báo cáo.
* Tạo mã QR công khai cho từng lô hàng để người dùng truy xuất nguồn gốc.
* Cổng nhà cung cấp cho phép supplier quản lý hồ sơ, lô hàng, ghi chú và chứng chỉ gắn với lô hàng.
* Ứng dụng mobile Expo cho nhân viên cửa hàng quét QR, xác nhận đã nhận hàng, báo lỗi và đồng bộ dữ liệu khi có kết nối lại.
* Ghi nhận lịch sử sự kiện chuỗi cung ứng và audit log cho các thay đổi quan trọng.
* Hỗ trợ cơ chế anchor/verify dữ liệu lên blockchain thông qua smart contract.

---

## THÀNH VIÊN NHÓM
| STT | MSSV | Họ và Tên | Github | Email |
|-----|:----:|-----------|--------|-------|
| 1 | 24520306 | Phạm Công Định | - | 24520306@gm.uit.edu.vn |
| 2 | 24520309 | Đặng Bá Đông | - | 24520309@gm.uit.edu.vn |
| 3 | 24520442 | Phạm Tuấn Hải | - | 24520442@gm.uit.edu.vn |
| 4 | 24520483 | Nguyễn Trọng Hiệp | - | 24520483@gm.uit.edu.vn |
| 5 | 24520677 | Nguyễn Hoàng Huy | - | 24520677@gm.uit.edu.vn |

---

## CÀI ĐẶT PHẦN MỀM
- [x] [Git](https://git-scm.com/)
- [x] [Node.js 20+](https://nodejs.org/)
- [x] [Corepack](https://nodejs.org/api/corepack.html)
- [x] [pnpm](https://pnpm.io/)
- [x] [Supabase](https://supabase.com/)
- [x] [Expo Go](https://expo.dev/go)
- [x] [Vercel](https://vercel.com/)

### Cài đặt Node.js và pnpm

Kiểm tra phiên bản Node.js:

```powershell
node -v
```

Bật Corepack và cài dependencies:

```powershell
corepack enable
corepack pnpm install
```

---

## KHỞI CHẠY DỰ ÁN

### Cấu trúc thư mục

```text
bluefood-app/
  apps/
    web/        Next.js web, API routes, portal supplier, trang trace QR
    mobile/     Expo React Native app cho nhân viên cửa hàng
  packages/
    shared/     Kiểu dữ liệu và hằng số dùng chung
    contracts/  Smart contract BatchRegistry và script deploy
  supabase/
    migrations/             SQL schema, trigger, policy
    seed.sql                Dữ liệu mẫu
    actual_public_data.sql  Dữ liệu public schema export từ môi trường test
```

### Bước 1: Cài đặt dependencies

Tại thư mục gốc `bluefood-app/`:

```powershell
corepack enable
corepack pnpm install
```

### Bước 2: Cấu hình môi trường cho web

Tạo file môi trường cho web:

```powershell
Copy-Item apps/web/.env.local.example apps/web/.env.local
```

Cập nhật các biến bắt buộc:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Bước 3: Cấu hình môi trường cho mobile

Tạo file môi trường cho mobile:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Khi chạy local:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Khi demo với web đã deploy:

```env
EXPO_PUBLIC_API_URL=https://bluefood.vercel.app
```

### Bước 4: Chạy web local

```powershell
corepack pnpm dev:web
```

Web chạy tại:

```text
http://localhost:3000
```

### Bước 5: Chạy mobile bằng Expo Go

```powershell
cd apps/mobile
npx expo start --tunnel --port 8082
```

Mở Expo Go trên iPhone hoặc Android và quét QR trong terminal. Khi `EXPO_PUBLIC_API_URL` trỏ về Vercel, điện thoại không cần cùng Wi-Fi với máy tính để gọi API.

### Bước 6: Kiểm tra typecheck và build

```powershell
corepack pnpm --filter web typecheck
corepack pnpm --filter web build
corepack pnpm --filter mobile typecheck
```

---

## CƠ SỞ DỮ LIỆU

Dự án sử dụng Supabase PostgreSQL. Các script database nằm trong thư mục `supabase/`.

Thứ tự chạy database khi dựng môi trường mới:

1. Chạy các migration trong `supabase/migrations/` theo thứ tự tên file.
2. Chạy `supabase/seed.sql` để nạp dữ liệu mẫu.
3. Nếu cần khôi phục dữ liệu test thực tế, chạy thêm `supabase/actual_public_data.sql`.

Các bucket Storage cần có trên Supabase:

| Bucket | Mục đích |
| --- | --- |
| `product-images` | Lưu ảnh sản phẩm |
| `batch-images` | Lưu ảnh lô hàng |
| `certificates` | Lưu file chứng chỉ |
| `supplier-logos` | Lưu logo nhà cung cấp |

Các role tài khoản chính:

| Role | Mô tả |
| --- | --- |
| `admin` | Quản trị hệ thống web |
| `store_staff` | Nhân viên cửa hàng thao tác trên mobile và web giới hạn |
| `supplier` | Nhà cung cấp sử dụng portal |

---

## TRIỂN KHAI

### Web Vercel

Website production:

```text
https://bluefood.vercel.app
```

Cấu hình Vercel:

| Mục | Giá trị |
| --- | --- |
| Framework Preset | Next.js |
| Install Command | `corepack pnpm install --frozen-lockfile` |
| Build Command | `corepack pnpm --filter web build` |
| Output Directory | `apps/web/.next` |

Các biến môi trường cần cấu hình trên Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://bluefood.vercel.app
APP_URL=https://bluefood.vercel.app
```

Các biến cho blockchain/worker nếu demo phần anchor:

```env
POLYGON_RPC_URL=https://your-rpc-url
BLOCKCHAIN_SUBMITTER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_POLYGONSCAN_BASE_URL=https://amoy.polygonscan.com
REDIS_URL=rediss://your-redis-url
ANCHOR_WEBHOOK_SECRET=change-me
SUPABASE_WEBHOOK_SECRET=change-me
```

### Mobile Expo Go

Ứng dụng mobile được demo bằng Expo Go. Không bắt buộc build IPA/APK cho phạm vi đồ án nếu chỉ cần chứng minh app chạy được trên iOS.

File `apps/mobile/.env` khi demo:

```env
EXPO_PUBLIC_API_URL=https://bluefood.vercel.app
```

Chạy tunnel:

```powershell
cd apps/mobile
npx expo start --tunnel --port 8082
```

---

## CÔNG NGHỆ SỬ DỤNG

| Thành phần | Công nghệ |
| --- | --- |
| Monorepo | pnpm workspace |
| Web | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Mobile | Expo React Native |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Blockchain queue | BullMQ, Redis |
| Smart contract | Solidity, Hardhat |
| Deploy web | Vercel |

### Route chính

| Route | Chức năng |
| --- | --- |
| `/login` | Đăng nhập |
| `/dashboard` | Dashboard quản trị |
| `/batches` | Quản lý lô hàng |
| `/products` | Quản lý sản phẩm |
| `/suppliers` | Quản lý nhà cung cấp |
| `/shipments` | Quản lý vận chuyển |
| `/certificates` | Quản lý chứng chỉ |
| `/audit-logs` | Nhật ký audit |
| `/reports` | Báo cáo và export CSV |
| `/portal` | Cổng nhà cung cấp |
| `/trace/[lotId]` | Trang truy xuất công khai qua QR |

### Smart contract

Biên dịch contract:

```powershell
corepack pnpm --filter @bluefood/contracts compile
```

Deploy lên Polygon Amoy:

```powershell
corepack pnpm --filter @bluefood/contracts deploy:amoy
```

Chạy worker anchor blockchain:

```powershell
corepack pnpm --filter web worker
```

---

## LƯU Ý KHI NỘP ĐỒ ÁN

* Không commit `node_modules`, `.next`, `.expo`, `dist`, log, file `.env` thật hoặc khóa bí mật.
* Source nộp cần bao gồm toàn bộ mã nguồn, file README và script database trong thư mục `supabase/`.
* Nếu nộp file zip, nên nén toàn bộ thư mục `bluefood-app/` sau khi loại bỏ cache build và dependency cục bộ.
* File `.env.local.example` và `.env.example` được commit để người chấm biết cần cấu hình biến môi trường nào.
