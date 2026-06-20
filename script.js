// Art & Craft E-Commerce Store Script
// Change this to your published Apps Script Web App URL:
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsF9eYhzdEhZVkxf-hpadq2CMh5W4b_b9prn8BTlh_LJfxfVUXkM9u7976ekkeNkre_w/exec';

// Public Google Sheets CSV Export URLs
const PRODUCTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRDS8sEBq_gU9vwsmUyRQP_r8Hwfy4kXi6RnVHujbmWUucFwee69idbtSD35V7Hy49Pa5mzNSfSvA3f/pub?gid=804020802&single=true&output=csv';
const SETTINGS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRDS8sEBq_gU9vwsmUyRQP_r8Hwfy4kXi6RnVHujbmWUucFwee69idbtSD35V7Hy49Pa5mzNSfSvA3f/pub?gid=872856396&single=true&output=csv';
const DELIVERY_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRDS8sEBq_gU9vwsmUyRQP_r8Hwfy4kXi6RnVHujbmWUucFwee69idbtSD35V7Hy49Pa5mzNSfSvA3f/pub?gid=923975257&single=true&output=csv';

let productsList = [];
let storeSettings = {
    'upi id': 'rimicreations22@upi',
    'whatsapp number': '919238287320',
    'store name': 'Rimi_Creations_22'
};
let deliveryRules = {
    'min delivery amount': '100',
    'free delivery threshold': '500',
    'delivery charge': '50'
};

let userCart = JSON.parse(localStorage.getItem('pink_craft_cart')) || [];
let orderHistory = JSON.parse(localStorage.getItem('pink_craft_history')) || [];
let currentSessionId = '';
let isOrderProcessed = false;
let searchFilter = '';

window.onload = async () => {
    generateNewSessionId();
    await fetchStoreData();
    loadProfileDetails();
    renderProductGrid();
    updateCartUI();
};

function generateNewSessionId() {
    currentSessionId = 'CRAFT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    isOrderProcessed = false;
}

// Custom CSV Parser
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
    
    return lines.slice(1).map(line => {
        const values = parseCSVRow(line);
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] !== undefined ? values[index] : '';
        });
        return obj;
    });
}

function parseCSVRow(rowText) {
    const result = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < rowText.length; i++) {
        const char = rowText[i];
        if (char === '"') {
            insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
            result.push(entry.trim());
            entry = '';
        } else {
            entry += char;
        }
    }
    result.push(entry.trim());
    return result;
}

// Fetch products, settings, and delivery rules from Public CSV URLs
async function fetchStoreData() {
    try {
        const productsResponse = await fetch(PRODUCTS_CSV_URL);
        const productsText = await productsResponse.text();
        const parsedProducts = parseCSV(productsText);
        
        if (parsedProducts && parsedProducts.length > 0) {
            productsList = parsedProducts;
        }

        const settingsResponse = await fetch(SETTINGS_CSV_URL);
        const settingsText = await settingsResponse.text();
        const parsedSettings = parseCSV(settingsText);
        parsedSettings.forEach(row => {
            const key = (row['key'] || '').toLowerCase().trim();
            const value = row['value'];
            if (key) storeSettings[key] = value;
        });

        const deliveryResponse = await fetch(DELIVERY_CSV_URL);
        const deliveryText = await deliveryResponse.text();
        const parsedDelivery = parseCSV(deliveryText);
        parsedDelivery.forEach(row => {
            const key = (row['key'] || '').toLowerCase().trim();
            const value = row['value'];
            if (key) deliveryRules[key] = value;
        });

        const brandTitle = document.getElementById('brand-title-id');
        if (brandTitle && storeSettings['store name']) {
            brandTitle.innerText = storeSettings['store name'];
        }
    } catch (err) {
        console.error("Failed fetching configuration from Public Sheets CSV:", err);
        productsList = [
            { 'product code': 'AC001', 'product name': 'Clay Handwork Pot', 'product mrp': '600', 'product discounted price': '450', 'product description': 'Terracotta handpainted flower pot.', 'product image 1': 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=500' },
            { 'product code': 'AC002', 'product name': 'Macrame Dreamcatcher', 'product mrp': '400', 'product discounted price': '299', 'product description': 'Pink dreamcatcher with premium feathers.', 'product image 1': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500' }
        ];
    } finally {
        const loader = document.getElementById('app-loading-screen');
        if (loader) loader.classList.add('hidden');
    }
}

// Render dynamic products based on pink design guidelines
function renderProductGrid() {
    const grid = document.getElementById('product-grid-container');
    if (!grid) return;
    
    const filtered = productsList.filter(p => {
        const title = (p['product name'] || '').toLowerCase();
        const desc = (p['product description'] || '').toLowerCase();
        const query = searchFilter.toLowerCase();
        return title.includes(query) || desc.includes(query);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">कोई प्रोडक्ट नहीं मिला 🌸</p>`;
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const code = p['product code'] || '';
        const name = p['product name'] || 'Craft Item';
        const mrp = parseFloat(p['product mrp']) || 0;
        const discountPrice = parseFloat(p['product discounted price']) || mrp;
        const desc = p['product description'] || '';
        
        const image = p['product image 1'] || p['product image 2'] || p['product image 3'] || 'https://placehold.co/400?text=Art+Craft';
        const offPercentage = mrp > discountPrice ? Math.round(((mrp - discountPrice) / mrp) * 100) : 0;
        const inCart = userCart.some(item => item.code === code);

        return `
            <div class="product-card" id="card-${code}">
                <div class="card-image-box" onclick="openImageLightbox('${image}')" style="cursor: zoom-in;">
                    ${offPercentage > 0 ? `<div class="badge-discount">${offPercentage}% OFF</div>` : ''}
                    <img src="${image}" alt="${name}" loading="lazy">
                </div>
                <div class="card-details">
                    <h3>${name}</h3>
                    <p class="desc">${desc}</p>
                    <div class="price-container">
                        <div>
                            <span class="price-discounted">₹${discountPrice}</span>
                            ${offPercentage > 0 ? `<span class="price-original">₹${mrp}</span>` : ''}
                        </div>
                        <button class="btn-add-cart ${inCart ? 'added' : ''}" id="btn-add-${code}" onclick="toggleCartItem('${code}')">
                            <i class="fas ${inCart ? 'fa-check' : 'fa-plus'}"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Add/Remove item to shopping cart
function toggleCartItem(code) {
    const product = productsList.find(p => p['product code'] === code);
    if (!product) return;

    const idx = userCart.findIndex(item => item.code === code);
    if (idx === -1) {
        userCart.push({
            code: product['product code'],
            name: product['product name'],
            price: parseFloat(product['product discounted price']) || parseFloat(product['product mrp']),
            image: product['product image 1'] || product['product image 2'] || product['product image 3'] || 'https://placehold.co/100?text=Craft',
            qty: 1
        });
    } else {
        userCart.splice(idx, 1);
    }

    localStorage.setItem('pink_craft_cart', JSON.stringify(userCart));
    updateCartUI();
    renderProductGrid();
    if (!document.getElementById('modal-cart-details').classList.contains('hidden')) {
        renderCartListItems();
    }
}

// Update floating bar and badge elements
function updateCartUI() {
    const totalItems = userCart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = userCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    const freeThreshold = parseFloat(deliveryRules['free-delivery-threshold'] || deliveryRules['free delivery threshold']) || 500;
    const deliveryFee = parseFloat(deliveryRules['delivery-charge'] || deliveryRules['delivery charge']) || 50;
    
    const finalDeliveryCharge = (subtotal >= freeThreshold || subtotal === 0) ? 0 : deliveryFee;
    const grandTotal = subtotal + finalDeliveryCharge;

    document.getElementById('cart-badge-count-id').innerText = totalItems;
    document.getElementById('floating-item-count').innerText = `${totalItems} Items`;
    document.getElementById('floating-cart-total-price').innerText = `₹${grandTotal}`;
    
    const floatingBar = document.getElementById('floating-cart-bar-id');
    if (floatingBar) {
        floatingBar.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    const summarySubtotal = document.getElementById('summary-subtotal-price');
    if (summarySubtotal) summarySubtotal.innerText = `₹${subtotal}`;
    
    const summaryDelivery = document.getElementById('summary-delivery-charge');
    if (summaryDelivery) {
        summaryDelivery.innerText = finalDeliveryCharge === 0 ? 'FREE' : `₹${finalDeliveryCharge}`;
        summaryDelivery.style.color = finalDeliveryCharge === 0 ? '#38b000' : 'var(--text-deep)';
    }

    const summaryGrandTotal = document.getElementById('summary-grand-total-price');
    if (summaryGrandTotal) summaryGrandTotal.innerText = `₹${grandTotal}`;

    const minOrderVal = parseFloat(deliveryRules['min-delivery-amount'] || deliveryRules['min delivery amount']) || 100;
    const checkoutBtn = document.getElementById('btn-start-checkout-id');
    const errorMsg = document.getElementById('error-min-order-msg');
    
    if (subtotal < minOrderVal && subtotal > 0) {
        if (checkoutBtn) checkoutBtn.classList.add('disabled-btn');
        if (errorMsg) {
            errorMsg.innerText = `ऑर्डर के लिए कम से कम ₹${minOrderVal} का सामान होना चाहिए।`;
            errorMsg.classList.remove('hidden');
        }
    } else {
        if (checkoutBtn) checkoutBtn.classList.remove('disabled-btn');
        if (errorMsg) errorMsg.classList.add('hidden');
    }
}

// Navigation Tabs Handling
function setNavigationTab(tab) {
    document.querySelectorAll('.nav-link-item').forEach(item => item.classList.remove('active'));
    
    const selectedTab = document.getElementById(`nav-${tab}-tab`);
    if (selectedTab) selectedTab.classList.add('active');
    
    openStoreModal(tab);
}

// Modal Toggle Handling
function openStoreModal(type) {
    document.getElementById('modal-overlay-container').classList.add('active');
    
    const list = ['cart-details', 'checkout-wizard', 'order-history', 'user-profile'];
    list.forEach(t => {
        const sheet = document.getElementById('modal-' + t);
        if (sheet) {
            sheet.classList.toggle('hidden', t !== (type === 'cart' ? 'cart-details' : type === 'history' ? 'order-history' : type === 'profile' ? 'user-profile' : type));
        }
    });

    if (type === 'cart') renderCartListItems();
    if (type === 'history') renderOrderHistory();
    if (type === 'checkout') renderWizardStep();
}

function closeStoreModal() {
    document.getElementById('modal-overlay-container').classList.remove('active');
    document.querySelectorAll('.nav-link-item').forEach(item => item.classList.remove('active'));
}

function handleOutsideModalClick(e) {
    if (e.target.id === 'modal-overlay-container') {
        closeStoreModal();
    }
}

// Render dynamic lists inside cart modal
function renderCartListItems() {
    const listContainer = document.getElementById('cart-items-list-container');
    if (!listContainer) return;

    if (userCart.length === 0) {
        listContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px 10px;">आपका कार्ट खाली है 🌸</p>`;
        return;
    }

    listContainer.innerHTML = userCart.map(item => {
        return `
            <div class="cart-item-row" id="cart-row-${item.code}">
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₹${item.price}</p>
                </div>
                <div class="quantity-stepper">
                    <button onclick="changeQtyValue('${item.code}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQtyValue('${item.code}', 1)">+</button>
                </div>
                <div class="btn-item-delete" onclick="toggleCartItem('${item.code}')">
                    <i class="fas fa-trash-alt"></i>
                </div>
            </div>`;
    }).join('');
}

function changeQtyValue(code, delta) {
    const idx = userCart.findIndex(item => item.code === code);
    if (idx !== -1) {
        userCart[idx].qty = Math.max(1, userCart[idx].qty + delta);
        localStorage.setItem('pink_craft_cart', JSON.stringify(userCart));
        updateCartUI();
        renderCartListItems();
    }
}

// Profiles Sync & localStorage persistence
function saveLeadDetailsInMemory() {
    const data = {
        name: document.getElementById('input-user-name') ? document.getElementById('input-user-name').value : '',
        mobile: document.getElementById('input-user-mobile') ? document.getElementById('input-user-mobile').value : ''
    };
    localStorage.setItem('pink_craft_profile', JSON.stringify(data));
    
    // Keep profile tab fields in sync
    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.value = data.name;
    const profileMobile = document.getElementById('profile-mobile');
    if (profileMobile) profileMobile.value = data.mobile;

    // Lead Generation trigger
    if (data.name && data.mobile.length === 10) {
        syncLeadToSpreadsheet('Incomplete');
    }
}

function saveProfileDirectly() {
    const data = {
        name: document.getElementById('profile-name') ? document.getElementById('profile-name').value : '',
        mobile: document.getElementById('profile-mobile') ? document.getElementById('profile-mobile').value : ''
    };
    localStorage.setItem('pink_craft_profile', JSON.stringify(data));
    
    // Populate checkout fields in sync
    const checkoutName = document.getElementById('input-user-name');
    if (checkoutName) checkoutName.value = data.name;
    const checkoutMobile = document.getElementById('input-user-mobile');
    if (checkoutMobile) checkoutMobile.value = data.mobile;
}

function loadProfileDetails() {
    const data = JSON.parse(localStorage.getItem('pink_craft_profile'));
    if (data) {
        const checkoutName = document.getElementById('input-user-name');
        if (checkoutName) checkoutName.value = data.name || '';
        const checkoutMobile = document.getElementById('input-user-mobile');
        if (checkoutMobile) checkoutMobile.value = data.mobile || '';

        const profileName = document.getElementById('profile-name');
        if (profileName) profileName.value = data.name || '';
        const profileMobile = document.getElementById('profile-mobile');
        if (profileMobile) profileMobile.value = data.mobile || '';
    }
}

// Clear Profile Data
function clearProfileData() {
    if (confirm("क्या आप अपना सारा प्रोफाइल डेटा हटाना चाहते हैं?")) {
        localStorage.removeItem('pink_craft_profile');
        location.reload();
    }
}

// Checkout Wizard Trigger
function initiateCheckoutWizard() {
    generateNewSessionId();
    openStoreModal('checkout');
}

function renderWizardStep() {
    buildOrderInvoiceSummary();
}

// Background Sheet lead update
async function syncLeadToSpreadsheet(status) {
    const subtotal = userCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const freeThreshold = parseFloat(deliveryRules['free-delivery-threshold'] || deliveryRules['free delivery threshold']) || 500;
    const deliveryFee = parseFloat(deliveryRules['delivery-charge'] || deliveryRules['delivery charge']) || 50;
    const finalDeliveryCharge = (subtotal >= freeThreshold || subtotal === 0) ? 0 : deliveryFee;
    const grandTotal = subtotal + finalDeliveryCharge;
    
    const cartItemsString = userCart.map(item => `${item.name} (${item.qty}x)`).join(', ');

    const payload = {
        sessionId: currentSessionId,
        name: document.getElementById('input-user-name') ? document.getElementById('input-user-name').value : '',
        mobile: document.getElementById('input-user-mobile') ? document.getElementById('input-user-mobile').value : '',
        altMobile: '',
        email: '',
        pincode: '',
        city: '',
        state: '',
        address: '',
        landmark: '',
        items: cartItemsString,
        total: grandTotal,
        status: status
    };

    try {
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Lead sync failed:", e);
    }
}

// Invoice Summary box markup
function buildOrderInvoiceSummary() {
    const box = document.getElementById('checkout-invoice-summary-box');
    if (!box) return;
    
    const subtotal = userCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const freeThreshold = parseFloat(deliveryRules['free-delivery-threshold'] || deliveryRules['free delivery threshold']) || 500;
    const deliveryFee = parseFloat(deliveryRules['delivery-charge'] || deliveryRules['delivery charge']) || 50;
    const finalDeliveryCharge = (subtotal >= freeThreshold || subtotal === 0) ? 0 : deliveryFee;
    const grandTotal = subtotal + finalDeliveryCharge;

    const itemsSummary = userCart.map(item => `<li>${item.name} - <b>${item.qty}x</b> (₹${item.price * item.qty})</li>`).join('');

    box.innerHTML = `
        <h4 style="margin-bottom: 10px; color: var(--primary-dark-pink);">बिल का विवरण (Bill Invoice)</h4>
        <ul style="padding-left: 18px; margin-bottom: 12px;">${itemsSummary}</ul>
        <div style="border-top: 1px solid rgba(255, 101, 132, 0.15); padding-top: 10px; margin-top: 10px; font-size: 0.9rem;">
            <p><b>सब्-टोटल:</b> ₹${subtotal}</p>
            <p><b>डिलीवरी शुल्क:</b> ${finalDeliveryCharge === 0 ? 'FREE' : `₹${finalDeliveryCharge}`}</p>
            <p style="font-size: 1.1rem; color: var(--primary-dark-pink); margin-top: 5px;"><b>कुल भुगतान राशि: ₹${grandTotal}</b></p>
        </div>`;
}

// Final Action: complete purchase & WhatsApp dispatch
async function dispatchOrderToWhatsApp() {
    const name = document.getElementById('input-user-name').value.trim();
    const mobile = document.getElementById('input-user-mobile').value.trim();
    
    if (!name || mobile.length !== 10) {
        alert("कृपया अपना सही नाम और 10-अंकों का व्हाट्सएप नंबर दर्ज करें।");
        return;
    }

    if (isOrderProcessed) return;
    
    isOrderProcessed = true;
    const btn = document.getElementById('btn-submit-whatsapp-order');
    if (btn) {
        btn.classList.add('disabled-btn');
        btn.innerText = "ऑर्डर भेजा जा रहा है...";
    }

    const subtotal = userCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const freeThreshold = parseFloat(deliveryRules['free-delivery-threshold'] || deliveryRules['free delivery threshold']) || 500;
    const deliveryFee = parseFloat(deliveryRules['delivery-charge'] || deliveryRules['delivery charge']) || 50;
    const finalDeliveryCharge = (subtotal >= freeThreshold || subtotal === 0) ? 0 : deliveryFee;
    const grandTotal = subtotal + finalDeliveryCharge;

    const itemsText = userCart.map(item => `- ${item.name} (Qty: ${item.qty})`).join('\n');
    
    await syncLeadToSpreadsheet('Completed');

    const newOrder = {
        id: currentSessionId,
        date: new Date().toLocaleDateString('hi-IN'),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        total: grandTotal,
        itemsCount: userCart.reduce((s, i) => s + i.qty, 0)
    };
    orderHistory.push(newOrder);
    localStorage.setItem('pink_craft_history', JSON.stringify(orderHistory));

    let messageText = `*NEW ORDER RECEIVED 🌸*\n`;
    messageText += `------------------------------------\n`;
    messageText += `*Order ID:* ${currentSessionId}\n`;
    messageText += `*Name:* ${name}\n`;
    messageText += `*Mobile:* ${mobile}\n`;
    messageText += `------------------------------------\n`;
    messageText += `*Items ordered:*\n${itemsText}\n`;
    messageText += `------------------------------------\n`;
    messageText += `*Total Amount:* ₹${grandTotal}\n`;
    messageText += `*UPI ID for Payment:* ${storeSettings['upi id'] || 'rimicreations22@upi'}\n`;
    messageText += `------------------------------------\n`;
    messageText += `*Please confirm order quickly!*`;

    const encodedMessage = encodeURIComponent(messageText);
    const ownerWaNumber = storeSettings['whatsapp number'] || '919238287320';
    const waUrl = `https://wa.me/${ownerWaNumber}?text=${encodedMessage}`;

    userCart = [];
    localStorage.setItem('pink_craft_cart', JSON.stringify(userCart));
    updateCartUI();
    renderProductGrid();

    window.open(waUrl, '_blank');
    closeStoreModal();
}

// Render local history orders list
function renderOrderHistory() {
    const container = document.getElementById('order-history-list-container');
    if (!container) return;

    if (orderHistory.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px 10px;">कोई पुराना ऑर्डर नहीं मिला 🌸</p>`;
        return;
    }

    container.innerHTML = [...orderHistory].reverse().map(order => {
        return `
            <div class="history-order-card">
                <div class="history-order-head">
                    <span>Order #${order.id}</span>
                    <span>₹${order.total}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-muted);">
                    Date: ${order.date} | Time: ${order.time}
                </p>
                <p style="font-size: 0.85rem; font-weight: 600; margin-top: 5px;">
                    Total items: ${order.itemsCount}
                </p>
            </div>`;
    }).join('');
}

// Handle product searches
function handleSearch(query) {
    searchFilter = query;
    renderProductGrid();
}

// Image Zoom Lightbox Functions
function openImageLightbox(imageUrl) {
    const lightbox = document.getElementById('image-lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-zoomed-image');
    if (lightbox && lightboxImg) {
        lightboxImg.src = imageUrl;
        lightbox.style.display = 'flex';
    }
}

// Close Image Lightbox Zoom
function closeImageLightbox() {
    const lightbox = document.getElementById('image-lightbox-modal');
    if (lightbox) {
        lightbox.style.display = 'none';
    }
}
