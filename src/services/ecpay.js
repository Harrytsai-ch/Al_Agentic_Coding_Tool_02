const crypto = require('crypto');
const querystring = require('querystring');

const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID || '3002607';
const HASH_KEY = process.env.ECPAY_HASH_KEY || 'pwFHCqoQZGmho4w6';
const HASH_IV = process.env.ECPAY_HASH_IV || 'EkRm7iFT261dpevs';
const ENV = process.env.ECPAY_ENV || 'staging';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

const IS_PRODUCTION = ENV === 'production';
const AIO_CHECKOUT_URL = IS_PRODUCTION
  ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
  : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
const QUERY_TRADE_URL = IS_PRODUCTION
  ? 'https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5'
  : 'https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5';

function ecpayUrlEncode(source) {
  let encoded = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');
  encoded = encoded.toLowerCase();
  const replacements = {
    '%2d': '-', '%5f': '_', '%2e': '.', '%21': '!',
    '%2a': '*', '%28': '(', '%29': ')',
  };
  for (const [from, to] of Object.entries(replacements)) {
    encoded = encoded.split(from).join(to);
  }
  return encoded;
}

function generateCheckMacValue(params) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== 'CheckMacValue')
  );
  const sorted = Object.keys(filtered).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const paramStr = sorted.map((k) => `${k}=${filtered[k]}`).join('&');
  const raw = `HashKey=${HASH_KEY}&${paramStr}&HashIV=${HASH_IV}`;
  const encoded = ecpayUrlEncode(raw);
  return crypto.createHash('sha256').update(encoded, 'utf8').digest('hex').toUpperCase();
}

function verifyCheckMacValue(params) {
  const received = params.CheckMacValue || '';
  const calculated = generateCheckMacValue(params);
  const a = Buffer.from(received);
  const b = Buffer.from(calculated);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateMerchantTradeNo() {
  // Max 20 chars, alphanumeric only, permanently unique.
  // Format: F + 10-digit unix timestamp + 5 random uppercase alphanumeric chars = 16 chars
  const ts = Math.floor(Date.now() / 1000).toString();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `F${ts}${rand}`;
}

function formatMerchantTradeDate(date = new Date()) {
  // Taiwan local time (UTC+8), format: yyyy/MM/dd HH:mm:ss
  const tw = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${tw.getUTCFullYear()}/${pad(tw.getUTCMonth() + 1)}/${pad(tw.getUTCDate())} ${pad(tw.getUTCHours())}:${pad(tw.getUTCMinutes())}:${pad(tw.getUTCSeconds())}`;
}

function sanitizeItemName(name) {
  // Remove forbidden chars; WAF blocks certain system keywords / special chars
  return String(name)
    .replace(/[\x00-\x1F#|`;<>]/g, ' ')
    .trim()
    .slice(0, 200);
}

function buildCheckoutParams({ merchantTradeNo, amount, itemNames, tradeDesc }) {
  const names = Array.isArray(itemNames) ? itemNames : [itemNames];
  const itemName = names.map(sanitizeItemName).filter(Boolean).join('#').slice(0, 400);
  const params = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDate(),
    PaymentType: 'aio',
    TotalAmount: String(amount),
    TradeDesc: ecpayUrlEncode(String(tradeDesc || '花店商品訂單').slice(0, 100)),
    ItemName: itemName,
    ReturnURL: `${BASE_URL}/api/orders/ecpay/notify`,
    OrderResultURL: `${BASE_URL}/orders/payment-return`,
    ClientBackURL: `${BASE_URL}/orders`,
    ChoosePayment: 'ALL',
    EncryptType: '1',
  };
  params.CheckMacValue = generateCheckMacValue(params);
  return { actionUrl: AIO_CHECKOUT_URL, params };
}

async function queryTradeInfo(merchantTradeNo) {
  const params = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
  };
  params.CheckMacValue = generateCheckMacValue(params);

  const body = querystring.stringify(params);
  const res = await fetch(QUERY_TRADE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ECPay query failed: HTTP ${res.status} ${text}`);
  }

  const parsed = querystring.parse(text);
  const plain = {};
  for (const [k, v] of Object.entries(parsed)) {
    plain[k] = Array.isArray(v) ? v[0] : v;
  }

  if (!verifyCheckMacValue(plain)) {
    throw new Error('ECPay query CheckMacValue verification failed');
  }

  return plain;
}

module.exports = {
  config: {
    merchantId: MERCHANT_ID,
    env: ENV,
    baseUrl: BASE_URL,
    aioCheckoutUrl: AIO_CHECKOUT_URL,
    queryTradeUrl: QUERY_TRADE_URL,
  },
  ecpayUrlEncode,
  generateCheckMacValue,
  verifyCheckMacValue,
  generateMerchantTradeNo,
  formatMerchantTradeDate,
  buildCheckoutParams,
  queryTradeInfo,
};
