// ========== State Management ==========
const state = {
    transactions: [],
    subscriptions: [],
    payments: [],
    savingsGoal: null,
    previousBalance: 0
};

// ========== LocalStorage ==========
function saveState() {
    localStorage.setItem('financeTracker', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('financeTracker');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.transactions = parsed.transactions || [];
        state.subscriptions = parsed.subscriptions || [];
        state.payments = parsed.payments || [];
        state.savingsGoal = parsed.savingsGoal || null;
        state.previousBalance = parsed.previousBalance || 0;
    }
}

// ========== Utility Functions ==========
function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// ========== Notification System ==========
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const textEl = notification.querySelector('.notification-text');
    const iconEl = notification.querySelector('.notification-icon');
    
    textEl.textContent = message;
    iconEl.textContent = type === 'success' ? '✓' : type === 'warning' ? '!' : 'i';
    
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 4000);
}

document.querySelector('.notification-close').addEventListener('click', () => {
    document.getElementById('notification').classList.add('hidden');
});

// ========== Navigation ==========
function switchTab(tabName) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tabName) {
            link.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.dataset.tab);
    });
});

// ========== Calculate Totals ==========
function calculateTotals() {
    const income = state.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = state.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expenses, balance: income - expenses };
}

// ========== Update Dashboard ==========
function updateDashboard() {
    const totals = calculateTotals();
    
    // Check if balance changed
    if (totals.balance !== state.previousBalance) {
        const diff = totals.balance - state.previousBalance;
        if (state.previousBalance !== 0 && diff !== 0) {
            const message = diff > 0 
                ? `Balance increased by ${formatCurrency(diff)}!`
                : `Balance decreased by ${formatCurrency(Math.abs(diff))}`;
            showNotification(message, diff > 0 ? 'success' : 'warning');
        }
        state.previousBalance = totals.balance;
        saveState();
    }
    
    // Update overview cards
    document.getElementById('total-income').textContent = formatCurrency(totals.income);
    document.getElementById('total-expenses').textContent = formatCurrency(totals.expenses);
    document.getElementById('current-balance').textContent = formatCurrency(totals.balance);
    
    // Update recent transactions
    const recentContainer = document.getElementById('recent-transactions');
    const recentTransactions = state.transactions.slice(-5).reverse();
    
    if (recentTransactions.length === 0) {
        recentContainer.innerHTML = '<p class="empty-state">No transactions yet. Add your first transaction!</p>';
    } else {
        recentContainer.innerHTML = recentTransactions.map(t => createTransactionHTML(t)).join('');
    }

    // Update savings goal progress
    renderSavingsGoal();
}

// ========== Savings Goal ==========
document.getElementById('savings-goal-form').addEventListener('submit', (e) => {
    e.preventDefault();

    state.savingsGoal = {
        name: document.getElementById('savings-goal-name').value,
        amount: parseFloat(document.getElementById('savings-goal-amount').value)
    };
    saveState();

    renderSavingsGoal();
    e.target.reset();

    showNotification(`Savings goal set: ${state.savingsGoal.name}`);
});

function renderSavingsGoal() {
    const container = document.getElementById('savings-goal-display');
    const goal = state.savingsGoal;

    if (!goal) {
        container.innerHTML = '<p class="empty-state">No savings goal set yet. Set one above to start tracking your progress!</p>';
        return;
    }

    const balance = calculateTotals().balance;
    const saved = Math.max(0, balance);
    const percent = goal.amount > 0 ? Math.min(100, (saved / goal.amount) * 100) : 0;
    const remaining = Math.max(0, goal.amount - saved);
    const isReached = saved >= goal.amount && goal.amount > 0;

    container.innerHTML = `
        <div class="savings-goal-info">
            <div class="savings-goal-title">
                <span class="item-name">${goal.name}</span>
                <button class="btn btn-danger" onclick="clearSavingsGoal()">Clear</button>
            </div>
            <div class="savings-goal-amounts">
                <span>${formatCurrency(saved)} of ${formatCurrency(goal.amount)}</span>
                <span class="savings-goal-percent">${percent.toFixed(0)}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill${isReached ? ' reached' : ''}" style="width: ${percent}%"></div>
            </div>
            <div class="savings-goal-status">
                ${isReached
                    ? `🎉 Goal reached! You've saved enough for ${goal.name}.`
                    : `💰 ${formatCurrency(remaining)} left to reach your goal.`}
            </div>
        </div>
    `;
}

function clearSavingsGoal() {
    state.savingsGoal = null;
    saveState();
    renderSavingsGoal();
    showNotification('Savings goal cleared', 'warning');
}

// ========== Create Transaction HTML ==========
function createTransactionHTML(transaction) {
    const isIncome = transaction.type === 'income';
    return `
        <div class="transaction-item">
            <div class="item-info">
                <div class="item-name">${transaction.description}</div>
                <div class="item-meta">${transaction.category} • ${formatDate(transaction.date)}</div>
            </div>
            <div class="item-actions">
                <span class="item-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'}${formatCurrency(transaction.amount)}
                </span>
                <button class="btn btn-danger" onclick="deleteTransaction('${transaction.id}')">Delete</button>
            </div>
        </div>
    `;
}

// ========== Add Transaction ==========
document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const transaction = {
        id: generateId(),
        type: document.getElementById('transaction-type').value,
        amount: parseFloat(document.getElementById('transaction-amount').value),
        description: document.getElementById('transaction-description').value,
        category: document.getElementById('transaction-category').value,
        date: document.getElementById('transaction-date').value
    };
    
    state.transactions.push(transaction);
    saveState();
    
    updateDashboard();
    renderAllTransactions();
    
    e.target.reset();
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    
    showNotification(`Transaction added: ${transaction.description}`);
});

// ========== Delete Transaction ==========
function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    updateDashboard();
    renderAllTransactions();
    showNotification('Transaction deleted', 'warning');
}

// ========== Render All Transactions ==========
function renderAllTransactions() {
    const container = document.getElementById('all-transactions');
    const filterType = document.getElementById('filter-type').value;
    
    let filtered = state.transactions;
    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No transactions found</p>';
    } else {
        container.innerHTML = filtered.slice().reverse().map(t => createTransactionHTML(t)).join('');
    }
}

document.getElementById('filter-type').addEventListener('change', renderAllTransactions);

// ========== AI Budget Generator ==========
document.getElementById('generate-budget').addEventListener('click', () => {
    const totals = calculateTotals();
    const monthlyIncome = totals.income;
    const monthlyExpenses = totals.expenses;
    
    if (monthlyIncome === 0 && state.transactions.length === 0) {
        showNotification('Add some transactions first to generate a budget', 'warning');
        return;
    }
    
    // AI-powered budget calculation (simulated)
    const dailyBudget = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / 30 : 0;
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100) : 0;
    
    // Category-wise spending analysis
    const categorySpending = {};
    state.transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });
    
    const topCategory = Object.entries(categorySpending)
        .sort((a, b) => b[1] - a[1])[0];
    
    let budgetHTML = `
        <div class="budget-item">
            <span class="label">📅 Recommended Daily Budget</span>
            <span class="value">${formatCurrency(Math.max(0, dailyBudget))}</span>
        </div>
        <div class="budget-item">
            <span class="label">💰 Monthly Income</span>
            <span class="value">${formatCurrency(monthlyIncome)}</span>
        </div>
        <div class="budget-item">
            <span class="label">💸 Monthly Expenses</span>
            <span class="value">${formatCurrency(monthlyExpenses)}</span>
        </div>
        <div class="budget-item">
            <span class="label">📊 Savings Rate</span>
            <span class="value">${savingsRate.toFixed(1)}%</span>
        </div>
    `;
    
    if (topCategory) {
        budgetHTML += `
            <div class="budget-item">
                <span class="label">🎯 Top Spending Category</span>
                <span class="value">${topCategory[0]} (${formatCurrency(topCategory[1])})</span>
            </div>
        `;
    }
    
    // AI Tips
    const tips = [];
    if (savingsRate < 20) {
        tips.push('💡 Try to save at least 20% of your income for long-term financial goals.');
    }
    if (dailyBudget < 0) {
        tips.push('⚠️ You are spending more than you earn. Review your expenses and cut back on non-essentials.');
    }
    if (topCategory && topCategory[1] > monthlyExpenses * 0.3) {
        tips.push(`🔍 ${topCategory[0]} accounts for over 30% of your spending. Consider reducing this.`);
    }
    if (tips.length === 0) {
        tips.push('✅ Great job! Your finances look healthy. Keep tracking and maintaining your budget.');
    }
    
    budgetHTML += `<div class="budget-tip">${tips.join('<br><br>')}</div>`;
    
    document.getElementById('budget-content').innerHTML = budgetHTML;
    showNotification('AI budget generated successfully!');
});

// ========== Subscriptions ==========
document.getElementById('subscription-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const subscription = {
        id: generateId(),
        name: document.getElementById('subscription-name').value,
        amount: parseFloat(document.getElementById('subscription-amount').value),
        cycle: document.getElementById('subscription-cycle').value,
        nextBilling: document.getElementById('subscription-date').value,
        category: document.getElementById('subscription-category').value
    };
    
    state.subscriptions.push(subscription);
    saveState();
    
    renderSubscriptions();
    e.target.reset();
    
    showNotification(`Subscription added: ${subscription.name}`);
});

function renderSubscriptions() {
    const container = document.getElementById('subscriptions-list');
    
    // Calculate totals
    let monthlyTotal = 0;
    state.subscriptions.forEach(sub => {
        if (sub.cycle === 'monthly') monthlyTotal += sub.amount;
        else if (sub.cycle === 'yearly') monthlyTotal += sub.amount / 12;
        else if (sub.cycle === 'weekly') monthlyTotal += sub.amount * 4;
    });
    
    document.getElementById('subscriptions-monthly').textContent = formatCurrency(monthlyTotal);
    document.getElementById('subscriptions-yearly').textContent = formatCurrency(monthlyTotal * 12);
    document.getElementById('subscriptions-count').textContent = state.subscriptions.length;
    
    if (state.subscriptions.length === 0) {
        container.innerHTML = '<p class="empty-state">No subscriptions added yet</p>';
    } else {
        container.innerHTML = state.subscriptions.map(sub => `
            <div class="subscription-item">
                <div class="item-info">
                    <div class="item-name">${sub.name}</div>
                    <div class="item-meta">
                        <span class="sub-category">${sub.category}</span>
                        • ${sub.cycle} • Next: ${formatDate(sub.nextBilling)}
                    </div>
                </div>
                <div class="item-actions">
                    <span class="item-amount expense">${formatCurrency(sub.amount)}</span>
                    <button class="btn btn-danger" onclick="deleteSubscription('${sub.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
}

function deleteSubscription(id) {
    state.subscriptions = state.subscriptions.filter(s => s.id !== id);
    saveState();
    renderSubscriptions();
    showNotification('Subscription removed', 'warning');
}

// ========== Upcoming Payments ==========
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const payment = {
        id: generateId(),
        name: document.getElementById('payment-name').value,
        amount: parseFloat(document.getElementById('payment-amount').value),
        dueDate: document.getElementById('payment-date').value,
        status: document.getElementById('payment-status').value,
        notes: document.getElementById('payment-notes').value
    };
    
    state.payments.push(payment);
    saveState();
    
    renderPayments();
    e.target.reset();
    document.getElementById('payment-status').value = 'pending';
    
    showNotification(`Payment added: ${payment.name}`);
});

function renderPayments() {
    const container = document.getElementById('payments-list');
    const today = new Date().toISOString().split('T')[0];
    
    const pending = state.payments.filter(p => p.status === 'pending').length;
    const completed = state.payments.filter(p => p.status === 'completed').length;
    const totalDue = state.payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);
    
    document.getElementById('payments-pending').textContent = pending;
    document.getElementById('payments-completed').textContent = completed;
    document.getElementById('payments-total-due').textContent = formatCurrency(totalDue);
    
    if (state.payments.length === 0) {
        container.innerHTML = '<p class="empty-state">No upcoming payments added</p>';
    } else {
        container.innerHTML = state.payments
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(payment => {
                const isOverdue = payment.status === 'pending' && payment.dueDate < today;
                const isUpcoming = payment.status === 'pending' && payment.dueDate >= today;
                const statusClass = payment.status === 'completed' ? 'completed' : isOverdue ? 'overdue' : '';
                
                return `
                    <div class="payment-item ${statusClass}">
                        <div class="item-info">
                            <div class="item-name">${payment.name}</div>
                            <div class="item-meta">
                                Due: ${formatDate(payment.dueDate)}
                                ${payment.notes ? '• ' + payment.notes : ''}
                                <span class="status-badge ${payment.status === 'completed' ? 'completed' : isOverdue ? 'overdue' : 'pending'}">
                                    ${payment.status === 'completed' ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                                </span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <span class="item-amount expense">${formatCurrency(payment.amount)}</span>
                            ${payment.status === 'pending' ? `
                                <button class="btn btn-check" onclick="markPaymentComplete('${payment.id}')">✓ Done</button>
                            ` : ''}
                            <button class="btn btn-danger" onclick="deletePayment('${payment.id}')">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
    }
}

function markPaymentComplete(id) {
    const payment = state.payments.find(p => p.id === id);
    if (payment) {
        payment.status = 'completed';
        saveState();
        renderPayments();
        showNotification(`Payment completed: ${payment.name}`);
    }
}

function deletePayment(id) {
    state.payments = state.payments.filter(p => p.id !== id);
    saveState();
    renderPayments();
    showNotification('Payment removed', 'warning');
}

// ========== Initialize App ==========
function init() {
    loadState();
    
    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-date').value = today;
    document.getElementById('subscription-date').value = today;
    document.getElementById('payment-date').value = today;
    
    updateDashboard();
    renderAllTransactions();
    renderSubscriptions();
    renderPayments();
}

// Start the app
init();
