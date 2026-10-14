import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth/admin';
import { applyFilters, csvCell, parseFilters } from '@/lib/admin/bookings-query';

export const dynamic = 'force-dynamic';
const COLS = ['reference', 'created_at', 'booking_date', 'slot_label', 'service_name', 'service_price_inr', 'customer_name', 'customer_phone', 'flat_identifier', 'status', 'payment_status', 'cancellation_reason'] as const;

export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });
  const f = parseFilters(new URL(req.url).searchParams);
  const { data, error } = await applyFilters(admin.supabase.from('bookings').select(COLS.join(',')), f)
    .order('booking_date', { ascending: false }).limit(5000);
  if (error) return new NextResponse('Export failed', { status: 500 });
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  await admin.supabase.rpc('admin_log_export', { p_filters: { ...f, page: undefined }, p_rows: rows.length });
  const csv = [COLS.join(','), ...rows.map((r) => COLS.map((c) => csvCell(r[c])).join(','))].join('\r\n');
  return new NextResponse('\uFEFF' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="kaamset-bookings-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
}
