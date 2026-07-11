import { NextRequest, NextResponse } from 'next/server';

const SOURCE_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  friend: 'A friend told me',
  other: 'Other',
};

export async function POST(req: NextRequest) {
  const form = await req.json();
  const { who, addChildCoaching, childCount, childAges, name, country, phone, source, message, _noEmail } = form;
  const whatsapp = phone; // field renamed in form but kept as whatsapp for email display

  const hasChildren = who === 'children' || who === 'both' || (who === 'parent' && addChildCoaching === 'yes');

  const coachingType =
    who === 'parent' && addChildCoaching !== 'yes'
      ? 'Parent coaching only'
      : who === 'children'
      ? 'Child / children coaching only'
      : 'Parent + Children coaching';

  const childrenRow = hasChildren
    ? `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#888;width:160px;vertical-align:top;">Number of children</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${childCount || '—'}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#888;vertical-align:top;">Child ages</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${(childAges as string[])?.join(', ') || '—'}</td>
      </tr>
    `
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#4a1a8a,#7c3bb5);padding:24px 28px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800;">New Inquiry — Guri Dagan</h1>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Contact form submission</p>
      </div>
      <div style="background:#f9f6ff;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e8e0ff;border-top:none;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;width:160px;">Coaching type</td>
            <td style="padding:8px 0;font-size:14px;font-weight:700;color:#5b2da0;">${coachingType}</td>
          </tr>
          ${childrenRow}
          <tr><td colspan="2" style="padding:4px 0;border-top:1px solid #e8e0ff;"></td></tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;">Name</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;">Country</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${country}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;">Phone</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${whatsapp}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;">Found via</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${SOURCE_LABELS[source] ?? source}</td>
          </tr>
        </table>

        <div style="margin-top:20px;padding:16px 18px;background:#fff;border-radius:10px;border:1px solid #e8e0ff;">
          <p style="font-size:11px;color:#aaa;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Message</p>
          <p style="font-size:14px;color:#333;line-height:1.7;margin:0;">${(message as string).replace(/\n/g, '<br>')}</p>
        </div>

        <div style="margin-top:18px;text-align:center;">
          <a href="tel:${whatsapp}"
             style="display:inline-block;background:#5b2da0;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
            Contact → ${whatsapp}
          </a>
        </div>
      </div>
    </div>
  `;

  if (_noEmail) {
    return NextResponse.json({ ok: true, email: 'skipped' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY is not set — email not sent');
    return NextResponse.json({ ok: true, email: 'skipped' });
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Guri Dagan Contact <onboarding@resend.dev>',
        // Both addresses: Resend shared domain only delivers to the account owner email.
        // rhussein612@gmail.com will work once a verified domain is added in Resend.
        to: ['rhussein612@gmail.com', 'ymo441993@gmail.com'],
        subject: `New Inquiry — ${name} from ${country}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('[contact] Resend rejected the email:', errText);
      return NextResponse.json({ ok: false, error: errText }, { status: 502 });
    }

    const resendData = await emailRes.json();
    console.log('[contact] Email sent, Resend id:', resendData?.id);
  } catch (e) {
    console.error('[contact] Email send failed:', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
