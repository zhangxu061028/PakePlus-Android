// 数据库操作
const DB_NAME = 'MyAccountingDB';
const DB_VERSION = 1;
const STORE_NAME = 'records';

let db;

// 打开数据库
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onupgradeneeded = function(event) {
            db = event.target.result;
            
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    autoIncrement: true,
                    keyPath: 'id'
                });
                
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('type', 'type', { unique: false });
            }
        };
        
        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };
    });
}

// 保存记录
function saveRecord(amount, type, note) {
    return openDB().then(function() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const record = {
                amount: amount,
                type: type,
                note: note,
                timestamp: Date.now()
            };
            
            const request = store.add(record);
            
            request.onsuccess = function() {
                resolve(request.result);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    });
}

// 获取所有记录
function getAllRecords() {
    return openDB().then(function() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.getAll();
            
            request.onsuccess = function() {
                // 按时间倒序排列
                const records = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(records);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    });
}

// 根据类型获取记录
function getRecordsByType(type) {
    return openDB().then(function() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            const index = store.index('type');
            const request = index.getAll(type);
            
            request.onsuccess = function() {
                // 按时间倒序排列
                const records = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(records);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    });
}

// UI操作
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const form = document.getElementById('form');
    const amountInput = document.getElementById('amount');
    const typeSelect = document.getElementById('type');
    const noteInput = document.getElementById('note');
    
    const balanceElement = document.getElementById('balance');
    const incomeElement = document.getElementById('income');
    const expenseElement = document.getElementById('expense');
    
    const recordsContainer = document.getElementById('records-container');
    
    const allBtn = document.getElementById('all');
    const incomeBtn = document.getElementById('income-btn');
    const expenseBtn = document.getElementById('expense-btn');
    
    // 表单提交事件
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const amount = parseFloat(amountInput.value);
        const type = typeSelect.value;
        const note = noteInput.value.trim();
        
        if (amount > 0) {
            saveRecord(amount, type, note).then(function() {
                // 清空输入框
                amountInput.value = '';
                noteInput.value = '';
                
                // 重新渲染
                renderRecords();
                updateStatistics();
            });
        }
    });
    
    // 筛选按钮点击事件
    allBtn.addEventListener('click', function() {
        activateFilterButton(this);
        renderRecords();
    });
    
    incomeBtn.addEventListener('click', function() {
        activateFilterButton(this);
        renderRecords('income');
    });
    
    expenseBtn.addEventListener('click', function() {
        activateFilterButton(this);
        renderRecords('expense');
    });
    
    // 初始化
    renderRecords();
    updateStatistics();
});

function activateFilterButton(button) {
    // 移除所有按钮的active类
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // 添加active类到当前按钮
    button.classList.add('active');
}

// 添加记录到UI
function addRecordToUI(record) {
    const recordsContainer = document.getElementById('records-container');
    
    const recordDiv = document.createElement('div');
    recordDiv.className = 'record-item';
    recordDiv.dataset.id = record.id;
    
    const date = new Date(record.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const leftDiv = document.createElement('div');
    leftDiv.innerHTML = `
        <div class="date">${formattedDate}</div>
        <div class="note">${record.note || '无备注'}</div>
    `;
    
    const rightDiv = document.createElement('div');
    if (record.type === 'income') {
        rightDiv.innerHTML = `<span class="amount-income">+${record.amount.toFixed(2)}</span>`;
    } else {
        rightDiv.innerHTML = `<span class="amount-expense">-${record.amount.toFixed(2)}</span>`;
    }
    
    recordDiv.appendChild(leftDiv);
    recordDiv.appendChild(rightDiv);
    
    recordsContainer.appendChild(recordDiv);
}

// 渲染记录（支持筛选）
function renderRecords(filterType = null) {
    const recordsContainer = document.getElementById('records-container');
    recordsContainer.innerHTML = '';
    
    if (filterType === null) {
        getAllRecords().then(function(records) {
            records.forEach(function(record) {
                addRecordToUI(record);
            });
        });
    } else {
        getRecordsByType(filterType).then(function(records) {
            records.forEach(function(record) {
                addRecordToUI(record);
            });
        });
    }
}

// 更新统计信息
function updateStatistics() {
    getAllRecords().then(function(records) {
        let totalBalance = 0;
        let totalIncome = 0;
        let totalExpense = 0;
        
        records.forEach(function(record) {
            if (record.type === 'income') {
                totalIncome += record.amount;
            } else {
                totalExpense += record.amount;
            }
        });
        
        totalBalance = totalIncome - totalExpense;
        
        document.getElementById('balance').textContent = totalBalance.toFixed(2);
        document.getElementById('income').textContent = totalIncome.toFixed(2);
        document.getElementById('expense').textContent = totalExpense.toFixed(2);
        
        // 渲染图表
        renderChart(totalIncome, totalExpense);
    });
}

// 渲染饼图
function renderChart(income, expense) {
    const ctx = document.getElementById('chart').getContext('2d');
    
    // 销毁旧图表（如果存在）
    if (window.myChart) {
        window.myChart.destroy();
    }
    
    window.myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['收入', '支出'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#2ecc71', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.formattedValue}元`;
                        }
                    }
                }
            }
        }
    });
}