import { connect } from 'cloudflare:sockets';
// Tencent Exmail uses implicit TLS on 465; this adapter never logs SMTP replies or credentials.
export async function sendCode(env: ConsoleEnv, recipient: string, code: string, purpose: 'login'|'register'|'reset' = 'login') {
 const socket = connect({ hostname: env.SMTP_HOST, port: 465 }, { secureTransport: 'on', allowHalfOpen: false });
 void socket.closed.catch(() => {});
 const timer = setTimeout(() => { void socket.close().catch(() => {}); }, 20_000);
 const reader = socket.readable.getReader(), writer = socket.writable.getWriter();
 const encoder = new TextEncoder(), decoder = new TextDecoder(); let buffer = '';
 async function reply(expected: number) {
  let count = 0;
  while (true) {
   let end = buffer.indexOf('\r\n');
   while (end < 0) {
    const part = await reader.read(); if (part.done) throw new Error('SMTP connection closed');
    buffer += decoder.decode(part.value, { stream: true });
    if (buffer.length > 16384) throw new Error('SMTP response too large'); end = buffer.indexOf('\r\n');
   }
   const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
   if (++count > 100 || !/^\d{3}[ -]/.test(line)) throw new Error('Invalid SMTP response');
   if (Number(line.slice(0, 3)) !== expected) throw new Error('SMTP command rejected');
   if (line[3] === ' ') return;
  }
 }
 async function command(text: string, expected: number) { await writer.write(encoder.encode(text + '\r\n')); await reply(expected); }
 try {
  await socket.opened; await reply(220); await command('EHLO telysta.com', 250);
  await command('AUTH LOGIN', 334); await command(btoa(env.SMTP_USER), 334); await command(btoa(env.SMTP_PASSWORD), 235);
  await command(`MAIL FROM:<${env.SMTP_USER}>`, 250); await command(`RCPT TO:<${recipient}>`, 250); await command('DATA', 354);
  const action = purpose === 'reset' ? 'password reset' : purpose === 'register' ? 'email verification for registration' : 'sign-in verification';
  const text = `Your Telysta ${action} code is ${code}. It expires in 5 minutes. If you did not request it, ignore this email.`;
  const message = [`From: Telysta <${env.SMTP_USER}>`, `To: <${recipient}>`, `Date: ${new Date().toUTCString()}`, `Message-ID: <${crypto.randomUUID()}@telysta.com>`, 'Subject: Telysta verification code', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', text, '', '.'].join('\r\n');
  await command(message, 250);
  // DATA acceptance means delivery was queued; a broken QUIT must not invalidate the sent code.
  try { await command('QUIT', 221); } catch { /* The server already accepted the message. */ }
 } finally { clearTimeout(timer); reader.releaseLock(); writer.releaseLock(); await socket.close().catch(() => {}); }
}
