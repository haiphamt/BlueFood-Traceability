-- BlueFood demo seed data
-- Run after schema.sql. This seed avoids auth user creation.

insert into public.suppliers (id, name, contact_email, phone, address, province, certification_summary)
values
  ('00000000-0000-4000-8000-000000000101', 'Da Lat Farm', 'contact@dalatfarm.vn', '0901000001', 'Phuong 7, Da Lat', 'Lam Dong', 'VietGAP'),
  ('00000000-0000-4000-8000-000000000102', 'Green Valley', 'hello@greenvalley.vn', '0901000002', 'Don Duong', 'Lam Dong', 'GlobalGAP'),
  ('00000000-0000-4000-8000-000000000103', 'Mekong Roots', 'farm@mekongroots.vn', '0901000003', 'Cai Be', 'Tien Giang', 'Organic')
on conflict (id) do nothing;

insert into public.stores (id, name, address, province)
values
  ('00000000-0000-4000-8000-000000000151', 'BlueFood Quan 7', 'Nguyen Van Linh, Quan 7', 'Ho Chi Minh'),
  ('00000000-0000-4000-8000-000000000152', 'BlueFood Thu Duc', 'Vo Van Ngan, Thu Duc', 'Ho Chi Minh'),
  ('00000000-0000-4000-8000-000000000153', 'BlueFood Da Nang', 'Hai Chau, Da Nang', 'Da Nang')
on conflict (id) do nothing;

insert into public.products (id, name, category, unit, shelf_life_days)
values
  ('00000000-0000-4000-8000-000000000201', 'Rau xa lach Romaine', 'Rau xanh', 'kg', 7),
  ('00000000-0000-4000-8000-000000000202', 'Ca chua bi', 'Rau qua', 'kg', 10),
  ('00000000-0000-4000-8000-000000000203', 'Dau tay huu co', 'Trai cay', 'kg', 5),
  ('00000000-0000-4000-8000-000000000204', 'Khoai lang tim', 'Cu qua', 'kg', 20)
on conflict (id) do nothing;

insert into public.batches (
  id, batch_code, product_id, supplier_id, quantity, unit, status,
  harvest_date, expiration_date, origin_location, qr_url, notes
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    'LOT-2604-0182',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101',
    240,
    'kg',
    'in_transit',
    '2026-05-09',
    '2026-05-16',
    'Da Lat Farm',
    'http://localhost:3000/trace/LOT-2604-0182',
    'Bao quan 4-8C'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    'LOT-2604-0181',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000102',
    180,
    'kg',
    'received_at_store',
    '2026-05-08',
    '2026-05-18',
    'Green Valley',
    'http://localhost:3000/trace/LOT-2604-0181',
    'Da nhan tai cua hang'
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    'LOT-2604-0179',
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000101',
    95,
    'kg',
    'quality_checked',
    '2026-05-08',
    '2026-05-13',
    'Da Lat Farm',
    'http://localhost:3000/trace/LOT-2604-0179',
    'Cho cap nhat chung chi'
  ),
  (
    '00000000-0000-4000-8000-000000000304',
    'LOT-2604-0176',
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000103',
    400,
    'kg',
    'sold',
    '2026-05-01',
    '2026-05-21',
    'Mekong Roots',
    'http://localhost:3000/trace/LOT-2604-0176',
    'Da ban het'
  )
on conflict (id) do nothing;

insert into public.certificates (
  id, batch_id, certificate_type, issuer, certificate_number, issued_at, expires_at, file_url
)
values
  (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000301',
    'VietGAP',
    'VietGAP Authority',
    'VG-2026-0182',
    '2026-01-01',
    '2027-01-01',
    'https://example.com/certificates/vg-2026-0182.pdf'
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000302',
    'GlobalGAP',
    'GlobalGAP Authority',
    'GG-2026-0181',
    '2026-01-15',
    '2027-01-15',
    'https://example.com/certificates/gg-2026-0181.pdf'
  )
on conflict (id) do nothing;

insert into public.shipments (
  id, batch_id, from_location, to_location, vehicle_code, transporter_name,
  planned_departure_at, planned_arrival_at, actual_departure_at, status
)
values
  (
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000301',
    'Da Lat Farm',
    'BlueFood Quan 7',
    'BF-27',
    'BlueFood Logistics',
    '2026-05-09T04:00:00+07:00',
    '2026-05-09T15:00:00+07:00',
    '2026-05-09T04:10:00+07:00',
    'in_transit'
  )
on conflict (id) do nothing;

insert into public.batch_events (
  id, batch_id, event_type, occurred_at, location_name, temperature_c, note, shipment_id, certificate_id
)
values
  (
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000301',
    'created',
    '2026-05-09T08:00:00+07:00',
    'Da Lat Farm',
    null,
    'Created batch',
    null,
    null
  ),
  (
    '00000000-0000-4000-8000-000000000602',
    '00000000-0000-4000-8000-000000000301',
    'harvested',
    '2026-05-09T08:30:00+07:00',
    'Da Lat Farm',
    null,
    'Harvested romaine lettuce',
    null,
    null
  ),
  (
    '00000000-0000-4000-8000-000000000603',
    '00000000-0000-4000-8000-000000000301',
    'packed',
    '2026-05-09T11:10:00+07:00',
    'BlueFood Packing Station',
    6,
    'Packed with VietGAP certificate',
    null,
    '00000000-0000-4000-8000-000000000401'
  ),
  (
    '00000000-0000-4000-8000-000000000604',
    '00000000-0000-4000-8000-000000000301',
    'in_transit',
    '2026-05-09T12:05:00+07:00',
    'Highway checkpoint',
    6,
    'Cold-chain vehicle BF-27',
    '00000000-0000-4000-8000-000000000501',
    null
  )
on conflict (id) do nothing;

insert into public.qr_scan_logs (batch_id, batch_code, source, user_agent)
values
  ('00000000-0000-4000-8000-000000000301', 'LOT-2604-0182', 'public_qr', 'Seed Browser'),
  ('00000000-0000-4000-8000-000000000301', 'LOT-2604-0182', 'public_qr', 'Seed Browser'),
  ('00000000-0000-4000-8000-000000000302', 'LOT-2604-0181', 'public_qr', 'Seed Browser');

