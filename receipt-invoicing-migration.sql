-- Distinguish received money awaiting an invoice from non-invoiced receipts.
-- An associated invoice_id still takes precedence as an already-issued invoice.
alter table public.cash_receipts
  add column if not exists invoice_required boolean not null default false;
comment on column public.cash_receipts.invoice_required is
  'True when this received amount must be invoiced; invoice_id identifies the issued invoice when available.';
