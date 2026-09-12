# Batch 14: real public application pages

Public-only adaptation of project/payment, debt, invoice and Admin pages. Company buyer, local service address, fixed replacement usernames, tax/fee/bonus default constants are removed. Tax/fee/bonus require explicit Admin fields; group saves preserve unsaved other groups. Replacement grant/revoke uses existing lifecycle version/audit/session revocation route. Attachment ZIP now uses locked local fflate, not CDN code.

Cloud tests exercise the actual server, first Admin setup, login, UI configuration, user/payee creation, explicit permission, all Admin panels and employee pages. Test accounts/configuration are synthetic and not shipped as seeds. UI results must be read from CI; source syntax alone is not visual acceptance. No local installation, production data changes, real mail or deployment.
