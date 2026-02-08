let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let myGoal = localStorage.getItem('finance-goal') || 1000;
let currentType = 'income';
let currentFilter = 'all';

// Elementos DOM
const balanceDisplay = document.getElementById('balance');
const list = document.getElementById('transactions');
const modal = document.getElementById('modal-overlay');
const form = document.getElementById('transaction-form');
const aiMessage = document.getElementById('ai-message');

// Funções do Modal
window.openModal = (type) => {
    currentType = type;
    modal.classList.remove('modal-hidden');
    document.getElementById('modal-title').innerText = type === 'income' ? "Novo Saldo" : "Novo Gasto";
    document.getElementById('btn-submit').style.background = type === 'income' ? "#10b981" : "#ef4444";
};
window.closeModal = () => { modal.classList.add('modal-hidden'); form.reset(); };

// Filtros e Metas
window.filterBy = (cat) => {
    currentFilter = cat;
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(cat) || (cat === 'all' && btn.innerText === 'Todos'));
    });
    render();
};

window.setGoal = () => {
    const v = prompt("Qual sua meta de gastos mensal?", myGoal);
    if(v) { myGoal = v; localStorage.setItem('finance-goal', v); render(); }
};

// WhatsApp e QR Code
window.exportToWhatsApp = () => {
    let total = transactions.reduce((acc, t) => acc + t.amount, 0);
    let texto = `*FinancePro Ultra*%0A*Saldo:* R$ ${total.toFixed(2)}%0A%0A*Últimos Gastos:*%0A`;
    transactions.slice(-3).forEach(t => texto += `- ${t.text}: R$ ${Math.abs(t.amount)}%0A`);
    window.open(`https://wa.me/?text=${texto}`);
};

window.toggleQR = () => {
    const qrModal = document.getElementById('qr-modal');
    const qrImg = document.getElementById('qr-img');
    if(qrModal.classList.contains('modal-hidden')) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`;
        qrModal.classList.remove('modal-hidden');
    } else { qrModal.classList.add('modal-hidden'); }
};

// Lógica de Dados
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = {
        id: Date.now(),
        text: document.getElementById('desc').value,
        category: document.getElementById('category').value,
        amount: currentType === 'income' ? Math.abs(document.getElementById('val').value) : -Math.abs(document.getElementById('val').value),
        date: new Date().toLocaleDateString('pt-BR')
    };
    transactions.push(t);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    render();
    closeModal();
    // Notificação instantânea
    aiMessage.innerText = `${t.amount > 0 ? '✅ Ganhou' : '🔴 Gastou'} R$ ${Math.abs(t.amount).toFixed(2)} em ${t.text}`;
});

function render() {
    list.innerHTML = '';
    let total = 0, expenses = 0;
    transactions.forEach(t => { 
        total += t.amount; 
        if(t.amount < 0) expenses += Math.abs(t.amount); 
    });

    const filtered = currentFilter === 'all' ? transactions : transactions.filter(t => t.category === currentFilter);
    filtered.slice().reverse().forEach(t => {
        const li = document.createElement('li');
        li.className = 'timeline-item';
        li.innerHTML = `<div class="transaction-info"><div class="category-icon">${t.category.split(' ')[0]}</div>
            <div><strong>${t.text}</strong><br><small>${t.date}</small></div></div>
            <span class="${t.amount > 0 ? 'val-in' : 'val-out'}">R$ ${Math.abs(t.amount).toFixed(2)}</span>`;
        list.appendChild(li);
    });

    balanceDisplay.innerText = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    const p = Math.min((expenses / myGoal) * 100, 100);
    document.getElementById('goal-fill').style.width = p + "%";
    document.getElementById('goal-percent').innerText = Math.floor(p) + "%";
    document.getElementById('goal-fill').style.background = p > 80 ? "#ef4444" : "#6366f1";
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        // 1. Checa se já tem uma atualização esperando (caso você tenha aberto o app agora)
        if (reg.waiting) {
            showUpdateBanner();
        }

        // 2. Checa se uma atualização chegou enquanto o app está aberto
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    showUpdateBanner();
                }
            });
        });
    });

    // Função para mostrar o banner
    function showUpdateBanner() {
        const banner = document.getElementById('update-banner');
        if (banner) {
            banner.classList.remove('modal-hidden');
            // Opcional: vibrar o celular (se o navegador permitir)
            if (navigator.vibrate) navigator.vibrate(200);
        }
    }
}

// No topo do seu main.js, defina a versão atual
const APP_VERSION = 10; // Mude aqui toda vez que fizer deploy

async function forceUpdateCheck() {
    const btn = document.getElementById('update-icon');
    btn.style.animation = "spin 1s linear infinite";

    try {
        // Busca um arquivo de texto simples no seu servidor para ver a versão nova
        const response = await fetch('version.txt', { cache: 'no-store' });
        const latestVersion = await response.text();

        if (parseInt(latestVersion) > APP_VERSION) {
            alert("✨ Nova versão " + latestVersion + " encontrada! Atualizando...");
            // Limpa o cache e recarrega
            const cachesKeys = await caches.keys();
            await Promise.all(cachesKeys.map(key => caches.delete(key)));
            window.location.reload(true);
        } else {
            alert("✅ Você já está na versão mais recente (" + APP_VERSION + ")");
        }
    } catch (error) {
        alert("Ops! Verifique sua conexão.");
    } finally {
        btn.style.animation = "none";
    }
}