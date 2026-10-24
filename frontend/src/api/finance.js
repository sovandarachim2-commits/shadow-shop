import client from './client'

export const financeApi = {
  revenue: {
    list: (params) => client.get('/finance/revenue/', { params }),
    filterCounts: (params) => client.get('/finance/revenue/filter_counts/', { params }),
    summary: () => client.get('/finance/revenue/summary/'),
    monthlyChart: () => client.get('/finance/revenue/monthly_chart/'),
  },
  expenses: {
    list: (params) => client.get('/finance/expenses/', { params }),
    get: (id) => client.get(`/finance/expenses/${id}/`),
    create: (data) => client.post('/finance/expenses/', data),
    update: (id, data) => client.patch(`/finance/expenses/${id}/`, data),
    delete: (id) => client.delete(`/finance/expenses/${id}/`),
    history: (id) => client.get(`/finance/expenses/${id}/history/`),
  },
  expenseCategories: {
    list: (params) => client.get('/finance/expense-categories/', { params }),
    create: (data) => client.post('/finance/expense-categories/', data),
    update: (id, data) => client.patch(`/finance/expense-categories/${id}/`, data),
    delete: (id) => client.delete(`/finance/expense-categories/${id}/`),
  },
  dailySummary: (params) => client.get('/finance/daily-summary/', { params }),
}
