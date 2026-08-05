# Supabase auth email templates (BOARD-007)

Branded set for Supabase → Authentication → Emails → Templates, pasted by
Brice on BOTH projects (mybuildervault-dev first; prod at first release).
Navy/gold/cream per the product design system. Copy-adapt from the
MyRealtyVault board-67 set (JSH PATTERNS, Rule of Three).

Subjects:
- Reset password — `Reset your MyBuilderVault password`
- Invite user — `Your MyBuilderVault workspace is ready`
- Magic link — `Your MyBuilderVault sign-in link`
- Change email — `Confirm your new email for MyBuilderVault`

Confirm-Signup is unused (invite/claim flows only) — leave default.

PAIRED PREREQUISITE: templates render regardless, but branded FROM requires
custom SMTP (Supabase → Project Settings → Auth → SMTP) pointed at Resend
with the verified mybuildervault.com domain — sender
`noreply@mybuildervault.com`, name `MyBuilderVault`. The "just reply"
lines become true once ImprovMX forwards noreply@/support@ to Brice.
