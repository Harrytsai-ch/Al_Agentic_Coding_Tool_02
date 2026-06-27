const express = require('express');
const db = require('../database');
const router = express.Router();

// Helper to render with front layout
function renderFront(res, page, locals = {}) {
  res.render('pages/' + page, { layout: 'front', ...locals }, function (err, body) {
    if (err) return res.status(500).send(err.message);
    res.render('layouts/front', { body, ...locals });
  });
}

// Helper to render with admin layout
function renderAdmin(res, page, locals = {}) {
  res.render('pages/admin/' + page, locals, function (err, body) {
    if (err) return res.status(500).send(err.message);
    res.render('layouts/admin', { body, ...locals });
  });
}

// Front pages
router.get('/', function (req, res) {
  renderFront(res, 'index', { title: '首頁', pageScript: 'index' });
});

router.get('/products/:id', function (req, res) {
  renderFront(res, 'product-detail', {
    title: '商品詳情',
    pageScript: 'product-detail',
    productId: req.params.id
  });
});

router.get('/cart', function (req, res) {
  renderFront(res, 'cart', { title: '購物車', pageScript: 'cart' });
});

router.get('/checkout', function (req, res) {
  renderFront(res, 'checkout', { title: '結帳', pageScript: 'checkout' });
});

router.get('/login', function (req, res) {
  renderFront(res, 'login', { title: '登入', pageScript: 'login' });
});

router.get('/orders', function (req, res) {
  renderFront(res, 'orders', { title: '我的訂單', pageScript: 'orders' });
});

// ECPay OrderResultURL — browser POSTs here after payment (server notify is
// disabled in local mode). We look up the order by MerchantTradeNo and
// redirect to the order detail page which triggers QueryTradeInfo verification.
function handlePaymentReturn(req, res) {
  const body = req.body || {};
  const query = req.query || {};
  const merchantTradeNo = body.MerchantTradeNo || query.MerchantTradeNo || '';

  if (!merchantTradeNo) {
    return res.redirect('/orders');
  }

  const order = db
    .prepare('SELECT id FROM orders WHERE merchant_trade_no = ?')
    .get(merchantTradeNo);

  if (!order) {
    return res.redirect('/orders');
  }

  res.redirect(`/orders/${order.id}?payment=verifying`);
}

router.post('/orders/payment-return', handlePaymentReturn);
router.get('/orders/payment-return', handlePaymentReturn);

router.get('/orders/:id', function (req, res) {
  renderFront(res, 'order-detail', {
    title: '訂單詳情',
    pageScript: 'order-detail',
    orderId: req.params.id,
    paymentResult: req.query.payment || ''
  });
});

// Admin pages
router.get('/admin/products', function (req, res) {
  renderAdmin(res, 'products', {
    title: '商品管理',
    pageScript: 'admin-products',
    currentPath: '/admin/products'
  });
});

router.get('/admin/orders', function (req, res) {
  renderAdmin(res, 'orders', {
    title: '訂單管理',
    pageScript: 'admin-orders',
    currentPath: '/admin/orders'
  });
});

module.exports = router;
