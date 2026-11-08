const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Simpan konfigurasi kredensial di luar Google Drive (di profil lokal user)
const EXTERNAL_CONFIG_DIR = path.join(os.homedir(), '.doku');
const EXTERNAL_CONFIG_FILE = path.join(EXTERNAL_CONFIG_DIR, 'gotong_royong_doku.json');

// Pastikan direktori profil user ada
if (!fs.existsSync(EXTERNAL_CONFIG_DIR)) {
  try {
    fs.mkdirSync(EXTERNAL_CONFIG_DIR, { recursive: true });
  } catch (e) {}
}

const Doku = {
  getConfig: () => {
    let clientId = process.env.DOKU_CLIENT_ID || '';
    let secretKey = process.env.DOKU_SECRET_KEY || '';
    let isProduction = true; // Default production sesuai dashboard.doku.com/bo/dashboard

    if (fs.existsSync(EXTERNAL_CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(EXTERNAL_CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.clientId) clientId = parsed.clientId;
        if (parsed.secretKey) secretKey = parsed.secretKey;
        if (parsed.isProduction !== undefined) isProduction = parsed.isProduction;
      } catch (e) {}
    }

    return {
      clientId,
      secretKey,
      isProduction,
      isConfigured: Boolean(clientId && secretKey),
      origin: isProduction ? 'https://api.doku.com' : 'https://api-sandbox.doku.com'
    };
  },

  saveConfig: ({ clientId, secretKey, isProduction = true }) => {
    const configData = {
      clientId: (clientId || '').trim(),
      secretKey: (secretKey || '').trim(),
      isProduction: Boolean(isProduction),
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(EXTERNAL_CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf8');
    return Doku.getConfig();
  },

  generateSignature: ({ clientId, requestId, timestamp, target, body, secret, isResponse = false }) => {
    const digest = crypto.createHash('sha256').update(body).digest('base64');
    const parts = [
      `Client-Id:${clientId}`,
      `Request-Id:${requestId}`,
      `${isResponse ? 'Response' : 'Request'}-Timestamp:${timestamp}`,
      `Request-Target:${target}`,
      `Digest:${digest}`
    ];
    return `HMACSHA256=${crypto.createHmac('sha256', secret).update(parts.join('\n')).digest('base64')}`;
  },

  createCheckoutPayment: async (order, paymentMethods = null) => {
    const config = Doku.getConfig();
    if (!config.isConfigured) {
      throw new Error('Kredensial DOKU belum dikonfigurasi. Masukkan Client ID dan Secret Key dari https://dashboard.doku.com/bo/dashboard');
    }

    const target = '/checkout/v1/payment';
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString().slice(0, 19) + 'Z';
    const baseUrl = process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

    const orderPayload = {
      order: {
        invoice_number: order.order_id,
        amount: order.harga,
        currency: 'IDR',
        callback_url: `${baseUrl}/success/${order.order_id}`,
        callback_url_cancel: `${baseUrl}/checkout/${order.order_id}`,
        auto_redirect: true
      },
      payment: {
        payment_due_date: 60 // 60 menit masa berlaku
      },
      customer: {
        name: order.pembeli_nama,
        email: order.pembeli_email,
        phone: order.pembeli_wa
      }
    };

    if (paymentMethods && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
      orderPayload.payment.payment_method_types = paymentMethods;
    }

    const body = JSON.stringify(orderPayload);
    const signature = Doku.generateSignature({
      clientId: config.clientId,
      requestId,
      timestamp,
      target,
      body,
      secret: config.secretKey
    });

    const headers = {
      'Content-Type': 'application/json',
      'Client-Id': config.clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Signature': signature
    };

    const response = await fetch(config.origin + target, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15000)
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`DOKU response parsing failed (HTTP ${response.status}): ${responseText}`);
    }

    if (!response.ok || !data.response?.payment?.url) {
      const errMsg = data.error?.message || data.message || JSON.stringify(data);
      throw new Error(`DOKU Checkout gagal (HTTP ${response.status}): ${errMsg}`);
    }

    return {
      paymentUrl: data.response.payment.url,
      invoiceNumber: order.order_id,
      requestId,
      isQrisDedicated: Boolean(paymentMethods && paymentMethods.includes('QRIS'))
    };
  },

  // Khusus membuat transaksi QRIS Dinamis DOKU dengan Auto-Fallback aman
  createQrisPayment: async (order) => {
    try {
      return await Doku.createCheckoutPayment(order, ['QRIS']);
    } catch (err) {
      console.warn('QRIS Channel spesifik belum aktif di DOKU, beralih ke Hosted Checkout otomatis:', err.message);
      // Fallback ke Hosted Checkout umum (VA, Minimarket, dan QRIS jika sudah disetujui BI)
      return await Doku.createCheckoutPayment(order, null);
    }
  },

  // Cek Status Transaksi Resmi ke DOKU (Non-SNAP GET API)
  checkOrderStatus: async (invoiceNumber) => {
    const config = Doku.getConfig();
    if (!config.isConfigured) return null;

    const target = `/orders/v1/status/${invoiceNumber}`;
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString().slice(0, 19) + 'Z';

    const parts = [
      `Client-Id:${config.clientId}`,
      `Request-Id:${requestId}`,
      `Request-Timestamp:${timestamp}`,
      `Request-Target:${target}`
    ];
    const signature = `HMACSHA256=${crypto.createHmac('sha256', config.secretKey).update(parts.join('\n')).digest('base64')}`;

    const headers = {
      'Client-Id': config.clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Signature': signature
    };

    try {
      const response = await fetch(config.origin + target, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch (e) {
      console.warn('DOKU checkOrderStatus error:', e.message);
      return null;
    }
  },

  verifyNotification: (headers, rawBody) => {
    const config = Doku.getConfig();
    const clientId = headers['client-id'];
    const requestId = headers['request-id'];
    const timestamp = headers['request-timestamp'];
    const signatureHeader = headers['signature'];

    if (!clientId || !requestId || !timestamp || !signatureHeader) {
      return { valid: false, reason: 'Header notifikasi tidak lengkap' };
    }

    if (clientId !== config.clientId) {
      return { valid: false, reason: 'Client-Id tidak cocok' };
    }

    const expectedSignature = Doku.generateSignature({
      clientId: config.clientId,
      requestId,
      timestamp,
      target: '/api/doku/notification',
      body: rawBody,
      secret: config.secretKey
    });

    const actualBuf = Buffer.from(signatureHeader);
    const expectedBuf = Buffer.from(expectedSignature);

    if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
      return { valid: false, reason: 'Signature tidak valid' };
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (e) {
      return { valid: false, reason: 'Payload JSON tidak valid' };
    }

    return {
      valid: true,
      event,
      invoice: event.order?.invoice_number,
      amount: Number(event.order?.amount),
      status: event.transaction?.status
    };
  }
};

module.exports = { Doku };
