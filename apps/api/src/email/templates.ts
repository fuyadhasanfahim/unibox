// Minimal, inline-styled emails (email clients ignore <style> and external CSS).

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, body: string, cta: { label: string; url: string }, footnote: string) {
  return `<!doctype html><html><body style="margin:0;background:#0c0a09;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e7e5e4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#1c1917;border:1px solid #292524;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#fafaf9">unibox<span style="color:#a3e635">.</span></td></tr>
<tr><td style="padding-top:24px;font-size:22px;font-weight:700;color:#fafaf9">${title}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#a8a29e">${body}</td></tr>
<tr><td style="padding-top:28px"><a href="${cta.url}" style="display:inline-block;background:#a3e635;color:#0c0a09;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:10px">${cta.label}</a></td></tr>
<tr><td style="padding-top:28px;font-size:12px;line-height:1.6;color:#78716c">${footnote}<br>If the button does not work, paste this link into your browser:<br><span style="color:#a8a29e;word-break:break-all">${cta.url}</span></td></tr>
</table></td></tr></table></body></html>`;
}

export function invitationEmail(p: { url: string; organizationName: string; inviterName: string; role: string }) {
  const org = escape(p.organizationName);
  const inviter = escape(p.inviterName);
  return {
    subject: `${p.inviterName} invited you to ${p.organizationName} on Unibox`,
    html: layout(
      `Join ${org}`,
      `<strong style="color:#fafaf9">${inviter}</strong> invited you to join <strong style="color:#fafaf9">${org}</strong> as <strong style="color:#a3e635">${escape(p.role)}</strong>. Create your account to start answering WhatsApp, Messenger and Instagram from one inbox.`,
      { label: 'Accept invitation', url: p.url },
      'This invitation expires in 48 hours and can only be used once. Not expecting it? You can ignore this email.',
    ),
    text: `${p.inviterName} invited you to join ${p.organizationName} on Unibox as ${p.role}.\n\nAccept: ${p.url}\n\nThis link expires in 48 hours and works once.`,
  };
}

export function resetPasswordEmail(p: { url: string; name: string }) {
  return {
    subject: 'Reset your Unibox password',
    html: layout(
      'Reset your password',
      `Hi ${escape(p.name)}, we received a request to reset your password. Choose a new one with the button below.`,
      { label: 'Choose a new password', url: p.url },
      'This link expires in 30 minutes. If you did not ask for this, ignore this email: your password stays the same.',
    ),
    text: `Hi ${p.name},\n\nReset your Unibox password: ${p.url}\n\nThis link expires in 30 minutes. If you did not request it, ignore this email.`,
  };
}
