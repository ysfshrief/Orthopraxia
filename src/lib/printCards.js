import QRCode from 'qrcode'

/*
  Generate printable ID cards with QR codes embedded as data URLs.
  No external CDN needed — QR is rendered locally via the qrcode package,
  so it works even in the isolated print window.
  items: [{ qrValue, name, subtitle, subColor, idLabel }]
*/
export async function printCards(items, { logoUrl = '/logo.png' } = {}) {
  // pre-generate all QR data URLs
  const withQr = await Promise.all(items.map(async it => {
    let dataUrl = ''
    try {
      dataUrl = await QRCode.toDataURL(String(it.qrValue), {
        width: 260, margin: 1, color: { dark: '#6B2318', light: '#ffffff' }
      })
    } catch (e) { dataUrl = '' }
    return { ...it, dataUrl }
  }))

  const cards = withQr.map(it => `
    <div class="c" style="border-color:${it.subColor || '#C99A3A'}">
      <div class="h">
        <img src="${logoUrl}" class="logo" onerror="this.style.display='none'"/>
        <span>Orthopraxia</span>
      </div>
      ${it.dataUrl ? `<img class="qr" src="${it.dataUrl}" alt="QR"/>` : '<div class="qr-fail">تعذّر توليد الكود</div>'}
      <div class="n">${escapeHtml(it.name || '')}</div>
      ${it.subtitle ? `<div class="t" style="background:${it.subColor || '#C99A3A'}">${escapeHtml(it.subtitle)}</div>` : ''}
      ${it.idLabel ? `<div class="id">${escapeHtml(it.idLabel)}</div>` : ''}
    </div>`).join('')

  const html = `<!doctype html><html dir="rtl"><head><meta charset="utf8">
  <title>طباعة الكارنيهات</title>
  <style>
    * { box-sizing: border-box; }
    body{font-family:'Segoe UI',Tahoma,sans-serif;display:flex;flex-wrap:wrap;gap:14px;padding:16px;background:#fff;justify-content:center}
    .c{width:240px;border:2px solid;border-radius:16px;padding:16px;text-align:center;page-break-inside:avoid;background:linear-gradient(160deg,#fffaf2,#f5e4c8)}
    .h{display:flex;align-items:center;justify-content:center;gap:6px;font-weight:900;color:#6B2318;margin-bottom:10px;font-size:15px}
    .h .logo{width:26px;height:26px;border-radius:50%;object-fit:cover}
    .qr{width:150px;height:150px;background:#fff;padding:8px;border-radius:12px;margin:0 auto;display:block}
    .qr-fail{color:#b23a2f;font-size:12px;padding:40px 0}
    .n{font-weight:900;font-size:17px;margin-top:10px;color:#3A241C}
    .t{color:#fff;display:inline-block;padding:4px 14px;border-radius:99px;margin-top:6px;font-size:12px;font-weight:700}
    .id{font-size:10px;color:#999;margin-top:5px;direction:ltr}
    @media print{ body{gap:10px;padding:8px} .c{border-width:1px;background:#fff} }
  </style></head><body>${cards}
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
  </body></html>`

  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  return true
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
