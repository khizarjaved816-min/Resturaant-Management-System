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

// ================= TAB NAVIGATION =================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabId === 'kitchenTab') renderKitchenQueue();
    if (tabId === 'adminTab') {
        updateAdminStats();
        renderAdminTable();
    }
}

// ================= MENU RENDERING & FILTERING =================
function renderMenu(items) {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = items.map(item => `
        <div class="food-card">
            <img src="${item.image}" class="food-img" alt="${item.name}">
            <div class="food-info">
                <div class="food-title">${item.name}</div>
                <div class="food-desc">${item.desc}</div>
                <div class="food-bottom">
                    <span class="food-price">PKR ${item.price}</span>
                    <button class="btn btn-primary" onclick="addToCart('${item.id}')">
                        <i class="fa-solid fa-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterCategory(category) {
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (category === 'All') {
        renderMenu(menu);
    } else {
        const filtered = menu.filter(item => item.category === category);
        renderMenu(filtered);
    }
}

function filterMenu() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = menu.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.desc.toLowerCase().includes(query)
    );
    renderMenu(filtered);
}

// ================= CART SYSTEM =================
function addToCart(itemId) {
    const item = menu.find(m => m.id === itemId);
    const existing = cart.find(c => c.id === itemId);

    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
    }

    updateCartBadge();
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
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">Your cart is empty.</p>';
        updateCartTotals(0);
        return;
    }

    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        return `
            <div class="cart-item-row">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>PKR ${item.price} x ${item.qty}</small>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
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
        alert('Please add items to cart before placing an order!');
        return;
    }

    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const fulfillment = document.querySelector('input[name="fulfillment"]:checked').value;
    const notes = document.getElementById('custNotes').value.trim();

    if (!name || !phone) {
        alert('Please fill out Name and Phone Number.');
        return;
    }

    let locationInfo = '';
    if (fulfillment === 'DINE_IN') {
        locationInfo = document.getElementById('custTable').value.trim() || 'Table #Unassigned';
    } else if (fulfillment === 'DELIVERY') {
        locationInfo = document.getElementById('custAddress').value.trim();
        if (!locationInfo) {
            alert('Please enter delivery address.');
            return;
        }
    } else {
        locationInfo = 'Counter Pickup';
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const deliveryFee = (fulfillment === 'DELIVERY') ? 150 : 0;

    const newOrder = {
        id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
        customer: name,
        phone: phone,
        fulfillment: fulfillment,
        location: locationInfo,
        notes: notes,
        items: [...cart],
        totalAmount: subtotal + deliveryFee,
        status: 'PENDING',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    orders.unshift(newOrder);
    saveOrders();
    playOrderBeep();

    cart = [];
    updateCartBadge();
    toggleCartModal(false);

    alert(`Order Placed Successfully! Your Order ID is ${newOrder.id}`);
}

// ================= KITCHEN DISPLAY SYSTEM (KDS) =================
function renderKitchenQueue() {
    const grid = document.getElementById('kitchenGrid');
    
    let filteredOrders = orders;
    if (currentKdsFilter !== 'ALL') {
        filteredOrders = orders.filter(o => o.status === currentKdsFilter);
    }

    // Update nav badge count for pending
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    document.getElementById('kitchenBadge').textContent = pendingCount;

    if (filteredOrders.length === 0) {
        grid.innerHTML = '<p style="color:#777;">No active orders in this queue status.</p>';
        return;
    }

    grid.innerHTML = filteredOrders.map(order => `
        <div class="order-ticket ${order.status}">
            <div class="ticket-header">
                <span class="ticket-id">${order.id}</span>
                <span class="ticket-type">${order.fulfillment}</span>
            </div>
            <div class="ticket-body">
                <div class="ticket-meta">
                    <strong>${order.customer}</strong> (${order.phone})<br>
                    <i class="fa-solid fa-location-dot"></i> ${order.location} | <i class="fa-solid fa-clock"></i> ${order.time}
                </div>
                <ul class="ticket-items">
                    ${order.items.map(i => `<li><span>${i.name}</span> <strong>x${i.qty}</strong></li>`).join('')}
                </ul>
                ${order.notes ? `<div class="ticket-notes"><i class="fa-solid fa-comment"></i> Note: ${order.notes}</div>` : ''}
            </div>
            <div class="ticket-footer">
                ${order.status === 'PENDING' ? `<button class="btn btn-primary btn-block" onclick="updateOrderStatus('${order.id}', 'PREPARING')">Start Preparing</button>` : ''}
                ${order.status === 'PREPARING' ? `<button class="btn btn-success btn-block" onclick="updateOrderStatus('${order.id}', 'READY')">Mark Ready</button>` : ''}
                ${order.status === 'READY' ? `<button class="btn btn-secondary btn-block" onclick="updateOrderStatus('${order.id}', 'COMPLETED')">Complete Order</button>` : ''}
            </div>
        </div>
    `).join('');
}

function filterKds(status) {
    currentKdsFilter = status;
    document.querySelectorAll('.kds-filter').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
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
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
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
            <td><strong>${order.id}</strong></td>
            <td>${order.customer}</td>
            <td>${order.fulfillment}</td>
            <td>PKR ${order.totalAmount}</td>
            <td><span class="status-tag status-${order.status}">${order.status}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem;" onclick="deleteOrder('${order.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function addNewMenuItem(e) {
    e.preventDefault();

    const name = document.getElementById('itemName').value;
    const category = document.getElementById('itemCategory').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const image = document.getElementById('itemImage').value;
    const desc = document.getElementById('itemDesc').value;

    const newItem = {
        id: 'm' + (menu.length + 1),
        name,
        category,
        price,
        image,
        desc
    };

    menu.push(newItem);
    saveMenu();
    renderMenu(menu);

    document.getElementById('addMenuForm').reset();
    alert('New item added to Menu successfully!');
}

function deleteOrder(orderId) {
    if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
        orders = orders.filter(o => o.id !== orderId);
        saveOrders();
        renderKitchenQueue();
        updateAdminStats();
        renderAdminTable();
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