const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(el.dataset.paymentResult || null);

    const order = ref(null);
    const loading = ref(true);
    const paying = ref(false);
    const verifying = ref(false);
    const verifyMessage = ref('');

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-warning-subtle text-warning-emphasis' },
      paid: { label: '已付款', cls: 'bg-success-subtle text-success-emphasis' },
      failed: { label: '付款失敗', cls: 'bg-danger-subtle text-danger-emphasis' },
    };

    const paymentMessages = {
      success: { text: '付款成功！感謝您的購買。', cls: 'bg-success-subtle text-success-emphasis' },
      failed: { text: '付款失敗，請重試。', cls: 'bg-danger-subtle text-danger-emphasis' },
      verifying: { text: '正在向綠界確認付款結果，請稍候…', cls: 'bg-warning-subtle text-warning-emphasis' },
      cancel: { text: '付款已取消。', cls: 'bg-warning-subtle text-warning-emphasis' },
    };

    function submitEcpayForm(actionUrl, params) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = actionUrl;
      form.acceptCharset = 'UTF-8';
      for (const [key, value] of Object.entries(params)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value == null ? '' : String(value);
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    }

    async function payWithEcpay() {
      if (paying.value || !order.value) return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/ecpay', { method: 'POST' });
        submitEcpayForm(res.data.actionUrl, res.data.params);
      } catch (e) {
        Notification.show(e?.data?.message || '建立付款失敗', 'error');
        paying.value = false;
      }
    }

    async function verifyPayment(maxAttempts) {
      if (!order.value) return;
      verifying.value = true;
      const limit = maxAttempts || 20;
      for (let attempt = 1; attempt <= limit; attempt++) {
        try {
          const res = await apiFetch('/api/orders/' + order.value.id + '/payment-status');
          order.value = res.data.order;
          if (res.data.tradeStatus === '1' || order.value.status === 'paid') {
            paymentResult.value = 'success';
            verifying.value = false;
            Notification.show('付款成功', 'success');
            return;
          }
          if (res.data.tradeStatus === '10200095' || order.value.status === 'failed') {
            paymentResult.value = 'failed';
            verifying.value = false;
            Notification.show('付款失敗', 'error');
            return;
          }
          verifyMessage.value = `第 ${attempt} 次查詢：尚未收到付款結果，3 秒後再試…`;
        } catch (e) {
          verifyMessage.value = e?.data?.message || '查詢付款結果發生錯誤';
          break;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      verifying.value = false;
      if (order.value.status === 'pending') {
        verifyMessage.value = '仍未收到付款結果，您可以稍後再點選「重新查詢」。';
      }
    }

    function manualVerify() {
      verifyMessage.value = '';
      verifyPayment(10);
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
        loading.value = false;
        return;
      }
      loading.value = false;

      if (paymentResult.value === 'verifying' && order.value.status === 'pending') {
        verifyPayment();
      }
    });

    return {
      order,
      loading,
      paying,
      verifying,
      verifyMessage,
      paymentResult,
      statusMap,
      paymentMessages,
      payWithEcpay,
      manualVerify,
    };
  },
}).mount('#app');
