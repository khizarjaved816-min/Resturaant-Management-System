// ================= INITIAL STATE & DATA =================
const DEFAULT_MENU = [
    { id: 'm1', name: 'Zinger Deluxe Burger', category: 'Burgers', price: 590, desc: 'Crispy fried chicken thigh with spicy mayo and lettuce', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
    { id: 'm2', name: 'Smokey BBQ Beef Burger', category: 'Burgers', price: 750, desc: 'Grilled juicy beef patty with caramelized onions & BBQ sauce', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400' },
    { id: 'm3', name: 'Pepperoni Feast Pizza', category: 'Pizza', price: 1250, desc: 'Loaded with beef pepperoni and double mozzarella cheese', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400' },
    { id: 'm4', name: 'Loaded Cheese Fries', category: 'Fries', price: 380, desc: 'Golden crispy fries topped with melted cheddar cheese', image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400' },
    { id: 'm5', name: 'Chilled Mint Lemonade', category: 'Drinks', price: 220, desc: 'Refreshing lemon juice blended with fresh mint leaves', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400' }
];

let menu = JSON.parse(localStorage.getItem('ge_menu')) || DEFAULT_MENU;
let orders = JSON.parse(localStorage.getItem('ge_orders')) || [];
let cart = [];
let currentKdsFilter = 'ALL';
let currentCategory = 'All';

const PHONE_PATTERN = /^03\d{9}$/;           // Pakistani mobile: 03XXXXXXXXX
const ORDER_SEQ_KEY = 'ze_order_seq';        // Sequential order counter

// Escape user-provided text before inserting it into innerHTML (XSS protection)
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Save Menu to Storage
function saveMenu() {
    localStorage.setItem('ge_menu', JSON.stringify(menu));
}

// Save Orders to Storage
function saveOrders() {
    localStorage.setItem('ge_orders', JSON.stringify(orders));
}

// ================= APP INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    saveMenu();
    applyTheme(localStorage.getItem('ze_theme') || 'light');
    renderMenu(menu);
    updateCartBadge();
    renderKitchenQueue();
    updateAdminStats();

    // LISTEN FOR MULTI-TAB STORAGE CHANGES (Real-time Sync)
    window.addEventListener('storage', (e) => {
        if (e.key === 'ge_orders') {
            const oldOrdersCount = orders.length;
            orders = JSON.parse(e.newValue) || [];
            
            // Check if new order arrived
            if (orders.length > oldOrdersCount) {
                playOrderBeep();
            }

            renderKitchenQueue();
            updateAdminStats();
            renderAdminTable();
        }
    });
});

// ================= TOAST NOTIFICATIONS =================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    const text = document.createElement('span');
    text.textContent = message;

    toast.append(icon, text);
    container.appendChild(toast);

    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 3000);
}

// ================= DARK MODE =================
function applyTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    document.querySelector('#themeToggle i').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ze_theme', next);
    applyTheme(next);
}

// ================= TAB NAVIGATION =================
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (btn) btn.classList.add('active');

    if (tabId === 'kitchenTab') renderKitchenQueue();
    if (tabId === 'adminTab') {
        updateAdminStats();
        renderAdminTable();
    }
}

// ================= MENU RENDERING & FILTERING =================
function renderMenu(items) {
    const grid = document.getElementById('menuGrid');
    if (items.length === 0) {
        grid.innerHTML = '<p class="empty-state">No dishes match your search in this category.</p>';
        return;
    }
    grid.innerHTML = items.map(item => `
        <div class="food-card">
            <img src="${escapeHtml(item.image)}" class="food-img" alt="${escapeHtml(item.name)}">
            <div class="food-info">
                <div class="food-title">${escapeHtml(item.name)}</div>
                <div class="food-desc">${escapeHtml(item.desc)}</div>
                <div class="food-bottom">
                    <span class="food-price">PKR ${escapeHtml(item.price)}</span>
                    <button class="btn btn-primary" onclick="addToCart('${escapeHtml(item.id)}')">
                        <i class="fa-solid fa-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Category and search are applied together, so neither one overrides the other
function applyMenuFilters() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const filtered = menu.filter(item => {
        const inCategory = currentCategory === 'All' || item.category === currentCategory;
        const matchesQuery = !query ||
            String(item.name || '').toLowerCase().includes(query) ||
            String(item.desc || '').toLowerCase().includes(query);
        return inCategory && matchesQuery;
    });
    renderMenu(filtered);
}

function filterCategory(category, btn) {
    currentCategory = category;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyMenuFilters();
}

function filterMenu() {
    applyMenuFilters();
}

// ================= CART SYSTEM =================
function addToCart(itemId) {
    const item = menu.find(m => m.id === itemId);
    if (!item) return;
    const existing = cart.find(c => c.id === itemId);

    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
    }

    updateCartBadge();
    showToast(`${item.name} added to cart`);
}

function updateCartBadge() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCountBadge').textContent = totalQty;
}

function toggleCartModal(show) {
    const modal = document.getElementById('cartModal');
    if (show) {
        renderCartItems();
        modal.classList.add('active');
    } else {
        modal.classList.remove('active');
    }
}

function renderCartItems() {
    const container = document.getElementById('cartItemsList');
    if (cart.length === 0) {
        container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
        updateCartTotals(0);
        return;
    }

    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        return `
            <div class="cart-item-row">
                <img src="${escapeHtml(item.image)}" class="cart-thumb" alt="${escapeHtml(item.name)}">
                <div class="cart-item-info">
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>PKR ${escapeHtml(item.price)} x ${item.qty} = PKR ${itemTotal}</small>
                </div>
                <div class="cart-item-actions">
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="changeQty('${escapeHtml(item.id)}', -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty('${escapeHtml(item.id)}', 1)">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart('${escapeHtml(item.id)}')">
                        <i class="fa-solid fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');

    updateCartTotals(subtotal);
}

function changeQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(c => c.id !== id);
    }
    updateCartBadge();
    renderCartItems();
}

function removeFromCart(id) {
    const item = cart.find(c => c.id === id);
    cart = cart.filter(c => c.id !== id);
    updateCartBadge();
    renderCartItems();
    if (item) showToast(`${item.name} removed from cart`);
}

function toggleFulfillmentFields() {
    const type = document.querySelector('input[name="fulfillment"]:checked').value;
    const fieldTable = document.getElementById('fieldTableNo');
    const fieldAddress = document.getElementById('fieldAddress');

    if (type === 'DINE_IN') {
        fieldTable.classList.remove('hidden');
        fieldAddress.classList.add('hidden');
    } else if (type === 'DELIVERY') {
        fieldTable.classList.add('hidden');
        fieldAddress.classList.remove('hidden');
    } else {
        fieldTable.classList.add('hidden');
        fieldAddress.classList.add('hidden');
    }
    renderCartItems();
}

function updateCartTotals(subtotal) {
    const fulfillment = document.querySelector('input[name="fulfillment"]:checked').value;
    const deliveryFee = (fulfillment === 'DELIVERY') ? 150 : 0;
    const total = subtotal + deliveryFee;

    document.getElementById('cartSubtotal').textContent = `PKR ${subtotal}`;
    document.getElementById('cartDelivery').textContent = `PKR ${deliveryFee}`;
    document.getElementById('cartTotal').textContent = `PKR ${total}`;
}

// ================= PLACE ORDER =================
function placeOrder() {
    if (cart.length === 0) {
        showToast('Please add items to cart before placing an order!', 'error');
        return;
    }

    const name = document.getElementById('custName').value.trim();
    // Allow the user to type spaces/dashes (e.g. 0300-1234567) but store digits only
    const phone = document.getElementById('custPhone').value.replace(/[\s-]/g, '');
    const fulfillment = document.querySelector('input[name="fulfillment"]:checked').value;
    const notes = document.getElementById('custNotes').value.trim();

    if (!name || !phone) {
        showToast('Please fill out Name and Phone Number.', 'error');
        return;
    }

    if (!PHONE_PATTERN.test(phone)) {
        showToast('Please enter a valid Pakistani mobile number (03XXXXXXXXX).', 'error');
        return;
    }

    let locationInfo = '';
    if (fulfillment === 'DINE_IN') {
        locationInfo = document.getElementById('custTable').value.trim();
        if (!locationInfo) {
            showToast('Please enter your table number for Dine-In.', 'error');
            return;
        }
    } else if (fulfillment === 'DELIVERY') {
        locationInfo = document.getElementById('custAddress').value.trim();
        if (!locationInfo) {
            showToast('Please enter delivery address.', 'error');
            return;
        }
    } else {
        locationInfo = 'Counter Pickup';
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const deliveryFee = (fulfillment === 'DELIVERY') ? 150 : 0;

    const now = new Date();
    const newOrder = {
        id: generateOrderId(),
        customer: name,
        phone: phone,
        fulfillment: fulfillment,
        location: locationInfo,
        notes: notes,
        items: [...cart],
        totalAmount: subtotal + deliveryFee,
        status: 'PENDING',
        createdAt: now.toISOString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    orders.unshift(newOrder);
    saveOrders();
    playOrderBeep();

    cart = [];
    updateCartBadge();
    resetCustomerForm();
    toggleCartModal(false);

    showToast(`Order placed successfully! Your Order ID is ${newOrder.id}`);
}

// Sequential, unique order IDs. The counter lives in localStorage so it survives
// reloads and is shared between tabs. It is seeded above any existing order number
// (old versions used random 4-digit IDs) so a new ID never collides with an old one.
function generateOrderId() {
    const stored = parseInt(localStorage.getItem(ORDER_SEQ_KEY), 10) || 0;
    const highestExisting = orders.reduce((max, o) => {
        const num = parseInt(String(o.id).replace(/^ORD-/, ''), 10);
        return Number.isFinite(num) ? Math.max(max, num) : max;
    }, 0);
    const next = Math.max(stored, highestExisting) + 1;
    localStorage.setItem(ORDER_SEQ_KEY, String(next));
    return 'ORD-' + next;
}

function resetCustomerForm() {
    ['custName', 'custPhone', 'custTable', 'custAddress', 'custNotes'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.querySelector('input[name="fulfillment"][value="DINE_IN"]').checked = true;
    toggleFulfillmentFields();
}

// Old orders (from the original version) have no createdAt; they are never counted as "today"
function isToday(order) {
    if (!order.createdAt) return false;
    const created = new Date(order.createdAt);
    if (isNaN(created)) return false;
    return created.toDateString() === new Date().toDateString();
}

// ================= KITCHEN DISPLAY SYSTEM (KDS) =================
function renderKitchenQueue() {
    const grid = document.getElementById('kitchenGrid');
    
    // "All Orders" means all ACTIVE orders; completed ones live under their own filter
    let filteredOrders;
    if (currentKdsFilter === 'ALL') {
        filteredOrders = orders.filter(o => o.status !== 'COMPLETED');
    } else {
        filteredOrders = orders.filter(o => o.status === currentKdsFilter);
    }

    // Update nav badge count for pending
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    document.getElementById('kitchenBadge').textContent = pendingCount;

    if (filteredOrders.length === 0) {
        grid.innerHTML = '<p class="empty-state">No orders in this queue status.</p>';
        return;
    }

    grid.innerHTML = filteredOrders.map(order => {
        const id = escapeHtml(order.id);
        return `
        <div class="order-ticket ${escapeHtml(order.status)}">
            <div class="ticket-header">
                <span class="ticket-id">${id}</span>
                <span class="ticket-type">${escapeHtml(order.fulfillment)}</span>
            </div>
            <div class="ticket-body">
                <div class="ticket-meta">
                    <strong>${escapeHtml(order.customer)}</strong> (${escapeHtml(order.phone)})<br>
                    <i class="fa-solid fa-location-dot"></i> ${escapeHtml(order.location)} | <i class="fa-solid fa-clock"></i> ${escapeHtml(order.time)}
                </div>
                <ul class="ticket-items">
                    ${(order.items || []).map(i => `<li><span>${escapeHtml(i.name)}</span> <strong>x${escapeHtml(i.qty)}</strong></li>`).join('')}
                </ul>
                ${order.notes ? `<div class="ticket-notes"><i class="fa-solid fa-comment"></i> Note: ${escapeHtml(order.notes)}</div>` : ''}
            </div>
            <div class="ticket-footer">
                ${order.status === 'PENDING' ? `<button class="btn btn-primary btn-block" onclick="updateOrderStatus('${id}', 'PREPARING')">Start Preparing</button>` : ''}
                ${order.status === 'PREPARING' ? `<button class="btn btn-success btn-block" onclick="updateOrderStatus('${id}', 'READY')">Mark Ready</button>` : ''}
                ${order.status === 'READY' ? `<button class="btn btn-secondary btn-block" onclick="updateOrderStatus('${id}', 'COMPLETED')">Complete Order</button>` : ''}
                ${order.status === 'COMPLETED' ? `<span class="ticket-done"><i class="fa-solid fa-circle-check"></i> Order completed</span>` : ''}
            </div>
        </div>
    `;
    }).join('');
}

function filterKds(status, btn) {
    currentKdsFilter = status;
    document.querySelectorAll('.kds-filter').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderKitchenQueue();
}

function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        saveOrders();
        renderKitchenQueue();
        updateAdminStats();
        renderAdminTable();
    }
}

// ================= ADMIN DASHBOARD & CRUD =================
function updateAdminStats() {
    const todaysOrders = orders.filter(isToday);
    const totalOrders = todaysOrders.length;
    const totalSales = todaysOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

    document.getElementById('statTotalOrders').textContent = totalOrders;
    document.getElementById('statTotalSales').textContent = `PKR ${totalSales}`;
    document.getElementById('statPendingOrders').textContent = pendingOrders;
}

function renderAdminTable() {
    const tbody = document.getElementById('adminOrderTable');
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No order records found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${escapeHtml(order.id)}</strong></td>
            <td>${escapeHtml(order.customer)}</td>
            <td>${escapeHtml(order.fulfillment)}</td>
            <td>PKR ${escapeHtml(order.totalAmount)}</td>
            <td><span class="status-tag status-${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem;" onclick="deleteOrder('${escapeHtml(order.id)}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function addNewMenuItem(e) {
    e.preventDefault();

    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const image = document.getElementById('itemImage').value.trim();
    const desc = document.getElementById('itemDesc').value.trim();

    if (!name) {
        showToast('Please enter an item name.', 'error');
        return;
    }

    if (!Number.isFinite(price) || price <= 0) {
        showToast('Price must be a number greater than zero.', 'error');
        return;
    }

    const newItem = {
        id: generateMenuId(),
        name,
        category,
        price,
        image,
        desc
    };

    menu.push(newItem);
    saveMenu();
    applyMenuFilters();

    document.getElementById('addMenuForm').reset();
    showToast('New item added to menu successfully!');
}

// Time-based IDs never repeat, unlike 'm' + (menu.length + 1) which collided after deletions
function generateMenuId() {
    let id = 'm' + Date.now();
    while (menu.some(m => m.id === id)) {
        id = 'm' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }
    return id;
}

function deleteOrder(orderId) {
    if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
        orders = orders.filter(o => o.id !== orderId);
        saveOrders();
        renderKitchenQueue();
        updateAdminStats();
        renderAdminTable();
        showToast(`Order ${orderId} deleted`);
    }
}

// ================= AUDIO NOTIFICATION (Web Audio API) =================
function playOrderBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz Pitch
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.3); // Play for 300ms
    } catch (err) {
        console.log('Audio playback initialized on user interaction.');
    }
}