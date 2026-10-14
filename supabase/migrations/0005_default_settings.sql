-- Required default settings (not demo data). Editable in /admin/settings.
-- Policy texts are TEMPLATES: have them reviewed before launch. Contact fields are empty until you configure them.
insert into public.business_settings (key, value, is_public) values
 ('society.name', '"Shiv Kailasa Society"', true),
 ('society.location', '"Nagpur, Maharashtra"', true),
 ('contact.phone', '""', true),
 ('contact.whatsapp', '""', true),
 ('contact.email', '""', true),
 ('contact.hours', '""', true),
 ('notice.banner', '""', true),
 ('booking.enabled', 'true', true),
 ('booking.auto_confirm', 'false', true),
 ('booking.min_lead_hours', '4', true),
 ('booking.max_advance_days', '14', true),
 ('booking.max_active_per_phone', '5', false),
 ('cancellation.customer_allowed', 'true', true),
 ('cancellation.min_hours_before', '6', true),
 ('reschedule.customer_allowed', 'true', true),
 ('reschedule.min_hours_before', '12', true),
 ('payments.methods', '["cash","upi"]', true),
 ('payments.note', '"Pay after the service is completed. No online payment is taken on this website."', true),
 ('policy.terms', '"Template - review before launch.\n\nBookings are requests until KaamSet confirms them. Prices shown are the prices at the time of booking. Service is available only to residents of Shiv Kailasa Society."', true),
 ('policy.privacy', '"Template - review before launch.\n\nWe collect your name, mobile number, flat/block and booking details only to deliver your service. We do not sell your data. Your bookings can be viewed only with your private access link."', true),
 ('policy.cancellation', '"Template - review before launch.\n\nYou can cancel or reschedule from My Bookings within the time limits shown there. After that, please contact us."', true),
 ('policy.payment', '"Template - review before launch.\n\nPayment is collected after the service is completed, using the methods listed on this site."', true)
on conflict (key) do nothing;
