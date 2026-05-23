# BlueFood Traceability

Hệ thống quản lý và truy xuất nguồn gốc chuỗi cung ứng nông sản, thực phẩm sạch. Dự án bao gồm ứng dụng web quản trị, cổng thông tin nhà cung cấp, trang truy xuất công khai qua QR và ứng dụng mobile cho nhân viên cửa hàng thao tác online/offline.

Repository: https://github.com/haiphamt/BlueFood-Traceability

## Chức Năng Chính

- Quản trị sản phẩm, nhà cung cấp, lô hàng, vận chuyển, chứng chỉ và báo cáo trên web.
- Cổng nhà cung cấp cho phép nhà cung cấp quản lý hồ sơ, lô hàng, thành viên và chứng chỉ cần phê duyệt.
- Trang truy xuất công khai `/trace/[lotId]` cho người dùng quét QR mà không cần đăng nhập.
- Ứng dụng mobile cho nhân viên cửa hàng đăng nhập, quét QR, xác nhận nhận hàng, báo lỗi, đánh dấu đã bán và đồng bộ khi có kết nối lại.
- Ghi nhận audit log cho thay đổi trạng thái lô hàng và các thao tác quan trọng.
- Hỗ trợ anchor/verify dữ liệu sự kiện lên blockchain thông qua smart contract `BatchRegistry`.

## Công Nghệ Sử Dụng

| Thành phần          | Công nghệ                                       |
| ------------------- | ----------------------------------------------- |
| Monorepo            | pnpm workspace                                  |
| Web                 | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Mobile              | Expo React Native                               |
| Cơ sở dữ liệu       | Supabase PostgreSQL                             |
| Xác thực            | Supabase Auth                                   |
| Lưu trữ file        | Supabase Storage                                |
| Hàng đợi blockchain | BullMQ + Redis                                  |
| Smart contract      | Solidity, Hardhat                               |

## Cấu Trúc Thư Mục

```text
bluefood-app/
  apps/
    web/                    Ứng dụng web, API routes, portal, trang trace QR
    mobile/                 Ứng dụng Expo React Native cho nhân viên cửa hàng
  packages/
    shared/                 Hằng số, kiểu dữ liệu và schema dùng chung
    contracts/              Smart contract BatchRegistry và script deploy
  supabase/                 Script database cần kèm khi nộp source
    migrations/             Các file SQL tạo schema, trigger, policy
    seed.sql                Dữ liệu mẫu
    actual_public_data.sql  Dữ liệu public schema export từ môi trường test hiện tại
  package.json
  pnpm-workspace.yaml
  README.md
```

Lưu ý: khi đóng gói source để nộp, cần kèm thư mục `supabase/` chứa script database. Nếu thư mục này chưa có trong bản làm việc hiện tại, hãy bổ sung lại migration và seed SQL trước khi nén file zip.

## Yêu Cầu Môi Trường

- Node.js 20 trở lên.
- Corepack/pnpm.
- Supabase project.
- Expo Go hoặc môi trường chạy Expo cho mobile.
- Redis nếu cần chạy worker anchor blockchain.
- Tài khoản RPC blockchain nếu cần deploy/verify smart contract trên testnet.

Kiểm tra nhanh:

```powershell
node -v
corepack --version
```

## Cài Đặt Source

Từ thư mục gốc `bluefood-app/`:

```powershell
corepack enable
corepack pnpm install
```

Nếu chạy trên Windows PowerShell và pnpm yêu cầu cài đặt lại dependency, có thể dùng:

```powershell
$env:CI='true'; corepack pnpm install --no-frozen-lockfile
```

## Cấu Hình Biến Môi Trường

### Web

Tạo file `apps/web/.env.local` từ file mẫu:

```powershell
Copy-Item apps/web/.env.local.example apps/web/.env.local
```

Các biến quan trọng:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

REDIS_URL=redis://localhost:6379
POLYGON_RPC_URL=https://your-rpc-url
BLOCKCHAIN_SUBMITTER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_POLYGONSCAN_BASE_URL=https://amoy.polygonscan.com
ANCHOR_WEBHOOK_SECRET=change-me
SUPABASE_WEBHOOK_SECRET=change-me
```

Những biến blockchain và Redis chỉ bắt buộc khi chạy chức năng anchor/worker blockchain. Các chức năng quản trị, truy xuất QR và mobile sync có thể chạy với Supabase env trước.

### Mobile

Tạo file `apps/mobile/.env` từ file mẫu:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Nội dung:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Khi chạy trên điện thoại thật trong cùng mạng LAN, đổi `localhost` thành IP của máy đang chạy web, vì điện thoại không truy cập được `localhost` của máy tính.

## Cài Đặt Cơ Sở Dữ Liệu

1. Tạo project mới trên Supabase.
2. Vào **SQL Editor** và chạy các script trong `supabase/migrations/` theo đúng thứ tự tên file.
3. Chạy `supabase/seed.sql` nếu chỉ cần dữ liệu mẫu, hoặc chạy `supabase/actual_public_data.sql` nếu muốn khôi phục dữ liệu nghiệp vụ đang test hiện tại.
4. Tạo các bucket Supabase Storage nếu script chưa tạo sẵn:
   - `product-images`
   - `batch-images`
   - `certificates`
   - `supplier-logos`
5. Tạo tài khoản demo trong **Authentication > Users**, sau đó gán profile tương ứng trong bảng `profiles`.

Các bảng chính dự án sử dụng:

| Bảng                                 | Mục đích                                                          |
| ------------------------------------ | ----------------------------------------------------------------- |
| `profiles`                           | Hồ sơ người dùng và phân quyền `admin`, `store_staff`, `supplier` |
| `products`                           | Dữ liệu master sản phẩm                                           |
| `suppliers`                          | Dữ liệu nhà cung cấp và hồ sơ portal                              |
| `stores`, `store_users`              | Cửa hàng và nhân viên cửa hàng                                    |
| `supplier_users`, `supplier_invites` | Thành viên và lời mời trong portal nhà cung cấp                   |
| `batches`                            | Lô hàng và trạng thái hiện tại                                    |
| `batch_events`                       | Lịch sử sự kiện chuỗi cung ứng của lô hàng                        |
| `certificates`                       | Chứng chỉ gắn với lô hàng và nhà cung cấp                         |
| `shipments`                          | Thông tin vận chuyển                                              |
| `audit_logs`                         | Nhật ký audit cho thay đổi quan trọng                             |
| `qr_scan_logs`                       | Lượt quét QR công khai                                            |
| `sync_mutations`                     | Chống trùng lặp khi mobile đồng bộ offline                        |
| `batch_blockchain`                   | Trạng thái anchor blockchain cho sự kiện                          |

Quy tắc nghiệp vụ cần đảm bảo trong database:

- `batch_events` và `audit_logs` là dữ liệu ghi thêm, không sửa/xóa tùy tiện.
- Mỗi thay đổi trạng thái lô hàng cần có audit log.
- Chứng chỉ phải gắn với lô hàng, nhà cung cấp upload ở trạng thái chờ duyệt và admin duyệt trước khi hiển thị công khai.
- Trang trace công khai chỉ hiển thị dữ liệu phù hợp cho người dùng cuối, không yêu cầu đăng nhập.

## Chạy Ứng Dụng Web

Từ thư mục gốc `bluefood-app/`:

```powershell
corepack pnpm dev:web
```

Mở trình duyệt tại:

```text
http://localhost:3000
```

Các route quan trọng:

| Route            | Chức năng                        |
| ---------------- | -------------------------------- |
| `/login`         | Đăng nhập                        |
| `/dashboard`     | Dashboard quản trị               |
| `/batches`       | Quản lý lô hàng                  |
| `/products`      | Quản lý sản phẩm master          |
| `/suppliers`     | Quản lý nhà cung cấp             |
| `/shipments`     | Quản lý vận chuyển               |
| `/certificates`  | Quản lý chứng chỉ                |
| `/audit-logs`    | Xem audit log                    |
| `/reports`       | Báo cáo và export CSV            |
| `/portal`        | Cổng nhà cung cấp                |
| `/trace/[lotId]` | Trang truy xuất công khai qua QR |

## Chạy Ứng Dụng Mobile

Từ thư mục gốc `bluefood-app/`:

```powershell
corepack pnpm --filter mobile start:lan
```

Nếu cần dùng tunnel:

```powershell
corepack pnpm --filter mobile start:tunnel
```

Trường hợp tunnel lỗi do ngrok/kết nối mạng, ưu tiên `start:lan` và đảm bảo điện thoại cùng mạng Wi-Fi với máy tính.

## Chạy Worker Blockchain

Worker chỉ cần khi muốn đẩy sự kiện lên blockchain:

```powershell
corepack pnpm --filter web worker
```

Biến môi trường cần có: `REDIS_URL`, `POLYGON_RPC_URL`, `BLOCKCHAIN_SUBMITTER_PRIVATE_KEY`, `CONTRACT_ADDRESS`, `ANCHOR_WEBHOOK_SECRET`.

## Smart Contract

Biên dịch contract:

```powershell
corepack pnpm --filter @bluefood/contracts compile
```

Deploy local:

```powershell
corepack pnpm --filter @bluefood/contracts deploy:local
```

Deploy testnet Amoy:

```powershell
corepack pnpm --filter @bluefood/contracts deploy:amoy
```

Sau khi deploy, cập nhật `CONTRACT_ADDRESS` trong `apps/web/.env.local`.

## Kiểm Tra

Chạy typecheck từng ứng dụng:

```powershell
corepack pnpm --filter web typecheck
corepack pnpm --filter mobile typecheck
```

Chạy typecheck toàn workspace:

```powershell
corepack pnpm typecheck
```

## Luồng Demo Để Kiểm Thử

1. Đăng nhập web bằng tài khoản admin.
2. Tạo hoặc chọn một lô hàng trong `/batches`.
3. Kiểm tra QR và mở trang công khai `/trace/[lotId]`.
4. Đăng nhập mobile bằng tài khoản nhân viên cửa hàng.
5. Quét QR lô hàng, xác nhận đã nhận hoặc báo lỗi.
6. Tắt mạng, tạo thao tác offline, sau đó bật mạng và đồng bộ lại.
7. Quay lại web kiểm tra trạng thái lô hàng, lịch sử sự kiện và audit log.
8. Đăng nhập portal nhà cung cấp, upload chứng chỉ gắn với lô hàng.
9. Đăng nhập admin để duyệt chứng chỉ, sau đó kiểm tra chứng chỉ trên trace công khai.

## Lưu Ý Khi Nộp Source

- Không commit `node_modules`, `.next`, `.expo`, `dist`, cache build, log, file `.env` thật hoặc khóa bí mật.
- Cần kèm README này và script database trong thư mục `supabase/`.
- Khi nộp theo yêu cầu đồ án, nên nén toàn bộ source code thành file zip riêng; không chỉ nộp mỗi đường link repository.
- File `.env.local.example` và `.env.example` được phép commit để giảng viên biết cần cấu hình biến nào.
