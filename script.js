let dados = JSON.parse(localStorage.getItem('fin_master_v3')) || [];
let categorias = JSON.parse(localStorage.getItem('fin_cats_v3')) || [
    { emoji: "💰", nome: "Salário" }, { emoji: "🛒", nome: "Mercado" }, 
    { emoji: "🏠", nome: "Moradia" }, { emoji: "🚗", nome: "Transporte" }
];
let metas = JSON.parse(localStorage.getItem('fin_metas_v3')) || [];
let lembretes = JSON.parse(localStorage.getItem('fin_lembretes_v3')) || [];
let chart = null;

const formatarR$ = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- NOTIFICAÇÕES (TOASTS) ---
function mostrarToast(msg, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
}

function verificarPendencias() {
    const hoje = new Date().toISOString().split('T')[0];
    const pendentes = lembretes.filter(l => !l.pago && l.data <= hoje);
    if (pendentes.length > 0) {
        setTimeout(() => mostrarToast(`Atenção: ${pendentes.length} conta(s) pendente(s)! ⏰`, 'danger'), 1000);
    }
}

// --- NAVEGAÇÃO E CARROSSEL ---
function mostrarTela(t) {
    document.querySelectorAll('.tela').forEach(el => el.classList.add('hidden'));
    const telaAlvo = document.getElementById('tela-' + t);
    if(telaAlvo) telaAlvo.classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.remove('active');
        if(btn.id === 'nav-' + t) btn.classList.add('active');
    });

    if(t === 'dashboard') { renderCarrosselMeses(); render(); }
    if(t === 'metas') renderMetas();
    if(t === 'lembretes') renderLembretes();
    if(t === 'config') renderCategorias();
    atualizarSelects();
}

function renderCarrosselMeses() {
    const carrossel = document.getElementById('carrossel-meses');
    const mesesAbv = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const mesAtual = new Date().getMonth();
    let selecionado = sessionStorage.getItem('mes_view') || mesAtual;

    let html = `<div class="mes-item ${selecionado == 'todos' ? 'active' : ''}" onclick="setMes('todos')">Todos</div>`;
    mesesAbv.forEach((m, i) => {
        html += `<div class="mes-item ${selecionado == i ? 'active' : ''}" onclick="setMes(${i})">${m}</div>`;
    });
    carrossel.innerHTML = html;
    
    const labelMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById('label-mes-selecionado').innerText = selecionado == 'todos' ? 'Ano Todo' : labelMeses[selecionado];
}

function setMes(m) {
    sessionStorage.setItem('mes_view', m);
    renderCarrosselMeses();
    render();
}

function scrollMeses(direcao) {
    const mesesArr = ["todos", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    let atual = sessionStorage.getItem('mes_view') || new Date().getMonth();
    let indexAtual = mesesArr.indexOf(atual == "todos" ? "todos" : parseInt(atual));
    let novoIndex = indexAtual + direcao;

    if (novoIndex >= 0 && novoIndex < mesesArr.length) {
        setMes(mesesArr[novoIndex]);
        document.getElementById('carrossel-meses').scrollBy({ left: direcao * 80, behavior: 'smooth' });
    }
}

// --- FINANÇAS ---
function salvar(tipo) {
    const p = tipo === 'entrada' ? 'ent' : 'sai';
    const v = document.getElementById(`v-${p}`);
    const d = document.getElementById(`d-${p}`);
    const c = document.getElementById(`cat-${p}`);
    if(!v.value || !d.value) return alert("Preencha os campos!");

    dados.push({
        id: Date.now(),
        tipo: tipo, desc: d.value, val: parseFloat(v.value), cat: c.value,
        mes: new Date().getMonth()
    });

    localStorage.setItem('fin_master_v3', JSON.stringify(dados));
    mostrarToast("Lançamento concluído!");
    v.value = ""; d.value = "";
    mostrarTela('dashboard');
}

function render() {
    const lista = document.getElementById('lista');
    const filtro = sessionStorage.getItem('mes_view') || new Date().getMonth();
    let e = 0, s = 0;
    lista.innerHTML = "";

    const filtrados = dados.filter(d => filtro === "todos" || d.mes == filtro);
    
    filtrados.sort((a,b) => b.id - a.id).forEach(d => {
        if(d.tipo === 'entrada') e += d.val; else s += d.val;
        lista.innerHTML += `
            <div class="item-transacao">
                <div style="display:flex; align-items:center; gap:10px">
                    <span style="font-size:1.2rem">${d.cat}</span>
                    <div><b>${d.desc}</b><br><small style="opacity:0.6">${new Date(d.id).toLocaleDateString()}</small></div>
                </div>
                <div style="text-align:right">
                    <strong style="color:${d.tipo==='entrada'?'var(--success)':'var(--danger)'}">${d.tipo==='entrada'?'+':'-'} ${formatarR$(d.val)}</strong>
                    <br><i class="fas fa-trash" onclick="deletarItem(${d.id})" style="cursor:pointer; font-size:0.7rem; opacity:0.3"></i>
                </div>
            </div>`;
    });

    document.getElementById('tot-ent').innerText = formatarR$(e);
    document.getElementById('tot-sai').innerText = formatarR$(s);
    document.getElementById('tot-saldo').innerText = formatarR$(e - s);
    
    const barra = document.getElementById('barra-progresso');
    if(barra) {
        const perc = e > 0 ? Math.max(0, Math.min(100, ((e - s) / e) * 100)) : 0;
        barra.style.width = perc + "%";
    }
    atualizarGrafico(e, s);
}

function atualizarGrafico(e, s) {
    const canvas = document.getElementById('meuGrafico');
    if(!canvas) return;
    if(chart) chart.destroy();
    chart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Ganhos', 'Gastos'],
            datasets: [{ data: [e, s], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0 }]
        },
        options: { maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom' } } }
    });
}

function deletarItem(id) {
    if(confirm("Excluir?")) {
        dados = dados.filter(d => d.id !== id);
        localStorage.setItem('fin_master_v3', JSON.stringify(dados));
        render();
    }
}

// --- METAS ---
function salvarMeta() {
    const n = document.getElementById('meta-nome').value;
    const v = parseFloat(document.getElementById('meta-valor').value);
    const a = parseFloat(document.getElementById('meta-ja-tenho').value) || 0;
    if(!n || isNaN(v)) return alert("Preencha os campos!");
    metas.push({ id: Date.now(), nome: n, valor: v, atual: a });
    localStorage.setItem('fin_metas_v3', JSON.stringify(metas));
    mostrarToast("Meta salva!");
    renderMetas();
}

function renderMetas() {
    const lista = document.getElementById('lista-metas');
    lista.innerHTML = metas.map(m => {
        const p = Math.min(100, (m.atual / m.valor) * 100).toFixed(1);
        const falta = Math.max(0, m.valor - m.atual);
        return `
            <div class="meta-card-vip">
                <div class="meta-header"><strong>${m.nome}</strong><span style="color:var(--primary)">${p}%</span></div>
                <div class="meta-valores"><span>${formatarR$(m.atual)}</span><span>${formatarR$(m.valor)}</span></div>
                <div class="progress-bar-bg" style="height:10px; margin:10px 0"><div class="progress-bar-fill" style="width:${p}%; background:linear-gradient(90deg, var(--primary), #a855f7)"></div></div>
                <div class="meta-footer">
                    <small>${falta > 0 ? 'Falta ' + formatarR$(falta) : 'Meta Batida! 🎉'}</small>
                    <div style="display:flex; gap:10px">
                        <button onclick="aporteRapido(${m.id})" class="btn-aporte">+</button>
                        <button onclick="excluirMeta(${m.id})" class="btn-trash-meta"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function aporteRapido(id) {
    const v = prompt("Quanto deseja adicionar?");
    if(v) {
        const meta = metas.find(m => m.id === id);
        meta.atual += parseFloat(v.replace(',','.'));
        localStorage.setItem('fin_metas_v3', JSON.stringify(metas));
        renderMetas();
    }
}

function excluirMeta(id) {
    metas = metas.filter(m => m.id !== id);
    localStorage.setItem('fin_metas_v3', JSON.stringify(metas));
    renderMetas();
}

// --- LEMBRETES ---
function salvarLembrete() {
    const t = document.getElementById('lembrete-titulo').value;
    const d = document.getElementById('lembrete-data').value;
    if(!t || !d) return alert("Preencha tudo!");
    lembretes.push({ id: Date.now(), titulo: t, data: d, pago: false });
    localStorage.setItem('fin_lembretes_v3', JSON.stringify(lembretes));
    mostrarToast("Lembrete agendado!");
    renderLembretes();
}

function renderLembretes() {
    const lista = document.getElementById('lista-lembretes');
    lista.innerHTML = lembretes.sort((a,b) => new Date(a.data) - new Date(b.data)).map(l => `
        <div class="item-transacao" style="border-left: 5px solid ${l.pago ? '#64748b' : 'var(--danger)'}">
            <div>
                <b style="${l.pago ? 'text-decoration:line-through; opacity:0.5' : ''}">${l.titulo}</b><br>
                <small>Vence: ${new Date(l.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</small>
            </div>
            <div style="display:flex; gap:15px">
                <i class="fas fa-check-circle" onclick="marcarPago(${l.id})" style="color:var(--success); cursor:pointer; font-size:1.2rem"></i>
                <i class="fas fa-trash" onclick="excluirLembrete(${l.id})" style="opacity:0.3; cursor:pointer"></i>
            </div>
        </div>
    `).join('');
}

function marcarPago(id) {
    const l = lembretes.find(x => x.id === id);
    l.pago = !l.pago;
    localStorage.setItem('fin_lembretes_v3', JSON.stringify(lembretes));
    renderLembretes();
}

function excluirLembrete(id) {
    lembretes = lembretes.filter(x => x.id !== id);
    localStorage.setItem('fin_lembretes_v3', JSON.stringify(lembretes));
    renderLembretes();
}

// --- CONFIG ---
function atualizarSelects() {
    const html = categorias.map(c => `<option value="${c.emoji}">${c.emoji} ${c.nome}</option>`).join('');
    ['cat-ent', 'cat-sai'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = html; });
}

function addCategoria() {
    const e = document.getElementById('nova-cat-emoji').value;
    const n = document.getElementById('nova-cat-nome').value;
    if(e && n) {
        categorias.push({ emoji: e, nome: n });
        localStorage.setItem('fin_cats_v3', JSON.stringify(categorias));
        renderCategorias();
    }
}

function renderCategorias() {
    document.getElementById('lista-categorias').innerHTML = categorias.map((c,i) => `
        <div class="item-transacao"><span>${c.emoji} ${c.nome}</span><i class="fas fa-times" onclick="removerCat(${i})" style="color:var(--danger)"></i></div>
    `).join('');
}

function removerCat(i) {
    categorias.splice(i,1);
    localStorage.setItem('fin_cats_v3', JSON.stringify(categorias));
    renderCategorias();
}

function toggleTheme() { document.body.classList.toggle('dark-mode'); }
function limparTudo() { if(confirm("Apagar tudo?")) { localStorage.clear(); location.reload(); } }

window.onload = () => {
    mostrarTela('dashboard');
    verificarPendencias();
};