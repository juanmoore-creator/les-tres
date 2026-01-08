import {
    getSession, login,
    fetchCategories, fetchProducts, fetchOffers,
    saveProduct, deleteProduct,
    saveCategory, deleteCategory,
    saveOffer, deleteOffer,
    logout, updateProductsOrder
} from './api.js';

let menuData = [];
let offersData = [];
let categoriesData = [];

export async function initAdmin() {
    setupEventListeners();
    await checkSessionAndLoad();
}

async function checkSessionAndLoad() {
    const session = await getSession();
    if (!session) {
        document.getElementById('modal-login').classList.add('active');
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    } else {
        document.body.classList.add('admin-mode');
        const container = document.getElementById('admin-tools-container');
        if (container) {
            container.innerHTML = `
                <button class="btn-add-floating" id="btn-add-floating">+</button>
            `;
            document.getElementById('btn-add-floating').addEventListener('click', openSelectorModal);

            // Show logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.style.display = 'block';
        }
        await fetchData();
        renderAll();
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
    updateCategorySelects();
    initSortable();
}

function renderMenu() {
    const container = document.getElementById('dynamic-categories');
    if (!container) return;
    container.innerHTML = '';
    categoriesData.forEach(cat => {
        // Sort products by 'posicion' if available, otherwise by API default (which we changed to position)
        // Ensure they are sorted just in case client-side sorting is needed, though API does it.
        const prods = menuData.filter(p => p.categoria === cat.nombre);

        const catDiv = document.createElement('div');
        catDiv.className = 'category-container';
        catDiv.innerHTML = `
            <div class="category-header">
                <h2>
                    ${cat.nombre} 
                    <button class="btn-edit-tool" data-cat-id="${cat.id}">✏️</button>
                    <button class="btn-save-order" data-cat-id="${cat.id}" style="display: none; margin-left: 10px; font-size: 0.8em; padding: 2px 8px;">Guardar Orden</button>
                </h2>
                <span class="toggle-icon">+</span>
            </div>
            <div class="category-content" id="category-content-${cat.id}">
                ${prods.length > 0 ? prods.map(item => renderProductRow(item)).join('') : '<p style="padding:20px; color:#666; font-size:13px">Sin productos todavía.</p>'}
            </div>
        `;

        catDiv.querySelector('.category-header').addEventListener('click', function (e) {
            if (e.target.classList.contains('btn-edit-tool') || e.target.classList.contains('btn-save-order')) return;
            this.parentElement.classList.toggle('active');
        });

        const editBtn = catDiv.querySelector('.btn-edit-tool');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCatModal(cat.id);
            });
        }

        container.appendChild(catDiv);
    });
}

function renderProductRow(item) {
    const star = item.es_especial ? `<div class="premium-tag">★ ESPECIAL PREMIUM</div>` : '';
    const stockClass = item.stock ? '' : 'out-of-stock';
    // Ensure data-id is present for SortableJS
    return `
        <div class="product-card ${stockClass}" id="prod-${item.id}" data-id="${item.id}">
            <div class="product-info">
                <span class="product-name">${item.nombre}</span>
                <span class="product-price">$${Number(item.precio).toLocaleString('es-AR')}</span>
                ${star}
                <button class="btn-edit-tool" style="margin-top:5px; width:fit-content" data-prod-id="${item.id}">✏️ Editar</button>
            </div>
        </div>`;
}

function renderOffers() {
    const list = document.getElementById('offers-list');
    if (!list) return;
    list.innerHTML = '';
    offersData.forEach(o => {
        const card = document.createElement('div');
        card.className = 'offer-card';
        if (!o.activa) card.style.opacity = '0.5';
        card.innerHTML = `
            <span>${o.texto}</span>
            <button class="btn-edit-tool" style="position:absolute; top:5px; right:5px" data-offer-id="${o.id}">✏️</button>
        `;
        list.appendChild(card);
    });

    list.querySelectorAll('.btn-edit-tool').forEach(btn => {
        btn.addEventListener('click', () => openOfferModal(btn.dataset.offerId));
    });
}

function updateCategorySelects() {
    const select = document.getElementById('edit-category');
    if (select) {
        select.innerHTML = categoriesData.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    }
}

function initSortable() {
    categoriesData.forEach(cat => {
        const el = document.getElementById(`category-content-${cat.id}`);
        if (el) {
            new Sortable(el, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onUpdate: function (evt) {
                    const btn = document.querySelector(`.btn-save-order[data-cat-id="${cat.id}"]`);
                    if (btn) btn.style.display = 'inline-block';
                }
            });
        }
    });
}

// Modal Functions relying on globals for simplicity in this refactor step, 
// or I can attach them to window if HTML calls them, 
// BUT in current plan HTML doesn't call them directly except via listeners setup here.
// However, the original HTML has `onclick="openSelectorModal()"` etc.
// I need to replace those `onclick` handlers in the HTML or attach them here.
// Since I will rewrite admin.html, I can remove onclicks and use IDs.

function setupEventListeners() {
    // Delegated listener for products
    const dynamicCats = document.getElementById('dynamic-categories');
    if (dynamicCats) {
        dynamicCats.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-edit-tool') && e.target.dataset.prodId) {
                openEditModal(e.target.dataset.prodId);
            } else if (e.target.classList.contains('btn-save-order')) {
                const catId = e.target.dataset.catId;
                const container = document.getElementById(`category-content-${catId}`);
                const items = container.querySelectorAll('.product-card');
                const orderedProducts = [];
                items.forEach((item, index) => {
                    orderedProducts.push({
                        id: item.dataset.id,
                        posicion: index
                    });
                });

                // Show loading state or modify button text
                const originalText = e.target.innerText;
                e.target.innerText = 'Guardando...';

                const { error } = await updateProductsOrder(orderedProducts);

                if (error) {
                    alert('Error al guardar el orden: ' + error.message);
                    e.target.innerText = originalText;
                } else {
                    // Success feedback
                    e.target.style.display = 'none';
                    e.target.innerText = originalText;
                    // Optional: show a toast or small notification
                    // Since we hide the button, that's enough feedback + maybe a nice alert?
                    // Let's just follow the task: hide button.
                }
            }
        });
    }

    // Modal buttons
    document.getElementById('login-btn-enter')?.addEventListener('click', handleLoginClick);
    document.getElementById('save-prod-btn')?.addEventListener('click', handleSaveProductClick);
    document.getElementById('delete-prod-btn')?.addEventListener('click', handleDeleteProductClick);

    document.getElementById('save-cat-btn')?.addEventListener('click', handleSaveCatClick);
    document.getElementById('delete-cat-btn')?.addEventListener('click', handleDeleteCatClick);

    document.getElementById('save-offer-btn')?.addEventListener('click', handleSaveOfferClick);
    document.getElementById('delete-offer-btn')?.addEventListener('click', handleDeleteOfferClick);

    // Cancel buttons for all modals
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Selector modal buttons
    document.getElementById('btn-new-prod')?.addEventListener('click', () => openEditModal(null));
    document.getElementById('btn-new-cat')?.addEventListener('click', () => openCatModal(null));
    document.getElementById('btn-new-offer')?.addEventListener('click', () => openOfferModal(null));

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', handleLogoutClick);
}

async function handleLogoutClick() {
    await logout();
    location.reload();
}

// Handlers
async function handleLoginClick() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const { error } = await login(email, pass);
    if (error) alert("Credenciales incorrectas"); else location.reload();
}

async function handleSaveProductClick() {
    const payload = {
        nombre: document.getElementById('edit-name').value,
        precio: Number(document.getElementById('edit-price').value),
        categoria: document.getElementById('edit-category').value,
        stock: document.getElementById('edit-stock').checked,
        es_especial: document.getElementById('edit-special').checked
    };
    const id = document.getElementById('edit-id').value;
    if (id) payload.id = id; // Add ID for update

    const { error } = await saveProduct(payload); // payload must include ID for update? check api.js
    // api.js saveProduct expects param 'product'.
    // const { id, ...data } = product; 
    // if (id) ... from('productos').update(data).eq('id', id)
    // So payload needs 'id' if updating.

    if (error) alert(error.message); else { closeModals(); await fetchData(); renderAll(); }
}

async function handleDeleteProductClick() {
    if (!confirm("¿Borrar producto?")) return;
    const id = document.getElementById('edit-id').value;
    const { error } = await deleteProduct(id);
    if (error) alert(error.message); else { closeModals(); await fetchData(); renderAll(); }
}

async function handleSaveCatClick() {
    const nombre = document.getElementById('cat-name').value.toLowerCase().trim();
    if (!nombre) return;
    const payload = { nombre };
    const id = document.getElementById('cat-id').value;
    if (id) payload.id = id;

    const { error } = await saveCategory(payload);
    if (error) alert(error.message); else { closeModals(); await fetchData(); renderAll(); }
}

async function handleDeleteCatClick() {
    if (!confirm("¿Borrar categoría?")) return;
    const id = document.getElementById('cat-id').value;
    const { error } = await deleteCategory(id);
    if (error) alert(error.message); else { closeModals(); await fetchData(); renderAll(); }
}

async function handleSaveOfferClick() {
    const payload = {
        texto: document.getElementById('offer-text').value,
        activa: document.getElementById('offer-active').checked
    };
    const id = document.getElementById('offer-id').value;
    if (id) payload.id = id;

    const { error } = await saveOffer(payload);
    if (error) alert(error.message); else { closeModals(); await fetchData(); renderAll(); }
}

async function handleDeleteOfferClick() {
    if (!confirm("¿Borrar oferta?")) return;
    const id = document.getElementById('offer-id').value;
    const { error } = await deleteOffer(id);
    if (error) alert(error.message); else { closeModals(); await fetchData(); renderAll(); }
}


// UI Helpers
function openSelectorModal() { document.getElementById('modal-selector').classList.add('active'); }
function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }

function openEditModal(id) {
    closeModals();
    if (categoriesData.length === 0) return alert("Crea una categoría primero");
    const modal = document.getElementById('modal-edit');
    const item = id ? menuData.find(x => x.id === id) : null;
    document.getElementById('edit-id').value = id || '';
    document.getElementById('edit-name').value = item ? item.nombre : '';
    document.getElementById('edit-price').value = item ? item.precio : '';
    document.getElementById('edit-category').value = item ? item.categoria : categoriesData[0].nombre;
    document.getElementById('edit-stock').checked = item ? item.stock : true;
    document.getElementById('edit-special').checked = item ? item.es_especial : false;
    document.getElementById('modal-title').innerText = id ? 'Editar Producto' : 'Nuevo Producto';

    // Toggle delete button visibility
    const delBtn = document.getElementById('delete-prod-btn');
    if (delBtn) delBtn.style.display = id ? 'block' : 'none';

    modal.classList.add('active');
}

function openCatModal(id) {
    closeModals();
    const modal = document.getElementById('modal-cat');
    const cat = id ? categoriesData.find(x => x.id === id) : null;
    document.getElementById('cat-id').value = id || '';
    document.getElementById('cat-name').value = cat ? cat.nombre : '';
    document.getElementById('cat-modal-title').innerText = id ? 'Editar Categoría' : 'Nueva Categoría';

    const delBtn = document.getElementById('delete-cat-btn');
    if (delBtn) delBtn.style.display = id ? 'block' : 'none';

    modal.classList.add('active');
}

function openOfferModal(id) {
    closeModals();
    const modal = document.getElementById('modal-offer');
    const offer = id ? offersData.find(x => x.id === id) : null;
    document.getElementById('offer-id').value = id || '';
    document.getElementById('offer-text').value = offer ? offer.texto : '';
    document.getElementById('offer-active').checked = offer ? offer.activa : true;
    document.getElementById('offer-modal-title').innerText = id ? 'Editar Oferta' : 'Nueva Oferta';

    const delBtn = document.getElementById('delete-offer-btn');
    if (delBtn) delBtn.style.display = id ? 'block' : 'none';

    modal.classList.add('active');
}
