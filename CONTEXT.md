# VatFlow

Point-of-sale VAT recording system for Ethiopian retail shops. Sellers record sales on mobile; admins manage catalog and reporting on web.

## Language

**Machine Code**:
The sequence number a shop's physical VAT-registration machine assigned to a product when it was registered. Persisted per product, unique per shop, entered/backfilled by the admin — not derived from `created_at` or any in-app ordering.
_Avoid_: Machine No (retired — was a computed, non-persisted placeholder based on row order before real machine data was available)

**Product**:
A catalog entry (name, default price, unit, Machine Code) that acts as a _template_ for sales — not a locked source of truth. Editing a Product's name or price never changes sale items already recorded under it.

**Sale Item**:
A line on a Sale, linked to a Product via `product_id`, but carrying its own `description` and `unit_price` captured at the moment of sale (both columns already existed in the schema for this purpose). Defaults from the linked Product when the line is created, then freely editable by the seller (free-market pricing, naming drift over the years). Reporting and VAT export always use the Sale Item's own `description`/`unit_price`, never the Product's current values.

**Backfill Import**:
The same sale-recording form (see Sale Item), opened from a second "Import" entry point, for reconciling sales already made this month before VatFlow recorded them (e.g. from the machine's own paper/Excel report), so the current month's reporting is complete. Scoped to the current month only — not a historical data migration. No separate mechanism: manual Product picker, editable `description`/`unit_price` per row, required receipt number and date, optional MRC number — identical to normal Sale entry.
_Avoid_: Historical import, data migration (this is not that — years of pre-VatFlow data are explicitly out of scope)
