import client from './client'

export const financeApi = {
  revenue: {
    list: (params) => client.get('/finance/revenue/', { params }),
    summary: () => client.get('/finance/revenue/summary/'),
    monthlyChart: () => client.get('/finance/revenue/monthly_chart/'),
  },
  expenses: {
    list: (params) => client.get('/finance/expenses/', { params }),
    get: (id) => client.get(`/finance/expenses/${id}/`),
    create: (data) => client.post('/finance/expenses/', data),
    update: (id, data) => client.patch(`/finance/expenses/${id}/`, data),
    delete: (id) => client.delete(`/finance/expenses/${id}/`),
  },
  expenseCategories: {
    list: () => client.get('/finance/expense-categories/'),
    create: (data) => client.post('/finance/expense-categories/', data),
  },
  dailySummary: (params) => client.get('/finance/daily-summary/', { params }),
}
