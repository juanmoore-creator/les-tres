import { fetchCategories, fetchProducts, fetchOffers } from './api.js';

let menuData = [];
let offersData = [];
let categoriesData = [];
let cart = {};

export async function initClient() {
    await fetchData();
    renderAll();
    setupEventListeners();

    // Service Worker registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW register success'))
                .catch(err => console.error('SW register failed', err));
        });
    }
}

async function fetchData() {
    try {
        const { data: cats, error: ec } = await fetchCategories();
        if (ec) throw ec;
        categoriesData = cats;

        const { data: prods, error: ep } = await fetchProducts();
        if (ep) throw ep;
        menuData = prods;

        const { data: offers, error: eo } = await fetchOffers();
        if (eo) throw eo;
        offersData = offers;

        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
        const content = document.getElementById('menu-content');
        if (content) content.style.display = 'block';
    } catch (e) {
        console.error(e);
        const loader = document.getElementById('loader');
        if (loader) loader.innerText = "Error de conexión 💀";
    }
}

function renderAll() {
    renderMenu();
    renderOffers();
}

function renderMenu() {
    const container = document.getElementById('dynamic-categories');
    if (!container) return;
    container.innerHTML = '';
    categoriesData.forEach(cat => {
        const prods = menuData.filter(p => p.categoria === cat.nombre);
        if (prods.length === 0) return;

        const catDiv = document.createElement('div');
        catDiv.className = 'category-container';
        catDiv.innerHTML = `
            <div class="category-header">
                <h2>${cat.nombre}</h2>
                <span class="toggle-icon">+</span>
            </div>
            <div class="category-content">
                ${prods.map(item => renderProductCard(item)).join('')}
            </div>
        `;

        catDiv.querySelector('.category-header').addEventListener('click', function () {
            this.parentElement.classList.toggle('active');
        });
        container.appendChild(catDiv);
    });
}

function renderProductCard(item) {
    const star = item.es_especial ? `<div class="premium-tag">★ ESPECIAL PREMIUM</div>` : '';
    const stockClass = item.stock ? '' : 'out-of-stock';

    return `
        <div class="product-card ${stockClass}" id="prod-${item.id}" data-id="${item.id}">
            <div class="product-info">
                <span class="product-name">${item.nombre}</span>
                <span class="product-price">$${Number(item.precio).toLocaleString('es-AR')}</span>
                ${star}
            </div>
            <div class="stepper">
                <button class="step-btn btn-minus" ${!item.stock ? 'disabled' : ''}>-</button>
                <span class="qty-val" id="qty-${item.id}">${cart[item.id] || 0}</span>
                <button class="step-btn btn-plus" ${!item.stock ? 'disabled' : ''}>+</button>
            </div>
        </div>`;
}

function renderOffers() {
    const list = document.getElementById('offers-list');
    if (!list) return;
    list.innerHTML = '';
    offersData.filter(o => o.activa).forEach(o => {
        const card = document.createElement('div');
        card.className = 'offer-card';
        card.innerHTML = `<span>${o.texto}</span>`;
        if (list) list.appendChild(card);
    });
}

function setupEventListeners() {
    const container = document.getElementById('dynamic-categories');
    if (container) {
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-minus')) {
                const id = e.target.closest('.product-card').dataset.id;
                updateQty(id, -1);
            }
            if (e.target.classList.contains('btn-plus')) {
                const id = e.target.closest('.product-card').dataset.id;
                updateQty(id, 1);
            }
        });
    }

    const sendBtn = document.querySelector('.btn-send');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendToWhatsApp);
    }
}

function updateQty(id, delta) {
    cart[id] = Math.max(0, (cart[id] || 0) + delta);
    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.innerText = cart[id];
    calculate();
}

function calculate() {
    let total = 0;
    let standardEmps = 0;
    for (let id in cart) {
        if (cart[id] === 0) continue;
        const item = menuData.find(x => x.id === id);
        if (!item) continue;
        if (item.categoria.includes('empanada') && Number(item.precio) === 2300) standardEmps += cart[id];
        else total += cart[id] * Number(item.precio);
    }
    total += Math.floor(standardEmps / 12) * 25000 + (standardEmps % 12) * 2300;
    const el = document.getElementById('total-val');
    if (el) el.innerText = total.toLocaleString('es-AR');
    return total;
}

function sendToWhatsApp() {
    const name = document.getElementById('cust-name').value;
    const addr = document.getElementById('cust-address').value;
    if (!name || !addr) return alert("Completa tus datos");
    let itemsMsg = "";
    for (let id in cart) {
        if (cart[id] > 0) itemsMsg += `*${cart[id]}x* ${menuData.find(x => x.id === id).nombre}\n`;
    }
    if (!itemsMsg) return alert("Carrito vacío");
    const msg = `*🍕 NUEVO PEDIDO - LES 3*\n\n${itemsMsg}\n💰 *TOTAL: $${calculate().toLocaleString('es-AR')}*\n👤 *Cliente:* ${name}\n📍 *Dirección:* ${addr}`;
    window.open(`https://wa.me/542257537475?text=${encodeURIComponent(msg)}`);
}
