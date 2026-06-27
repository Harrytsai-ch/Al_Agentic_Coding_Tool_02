const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const orders = ref([]);
    const loading = ref(true);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-warning-subtle text-warning-emphasis' },
      paid: { label: '已付款', cls: 'bg-success-subtle text-success-emphasis' },
      failed: { label: '付款失敗', cls: 'bg-danger-subtle text-danger-emphasis' },
    };

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders');
        orders.value = res.data.orders;
      } catch (e) {
        orders.value = [];
      } finally {
        loading.value = false;
      }
    });

    return { orders, loading, statusMap };
  }
}).mount('#app');
