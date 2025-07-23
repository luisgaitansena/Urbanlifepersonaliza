// --- CONFIGURACIÓN ---
const GOOGLE_SHEET_ID = 'https://docs.google.com/spreadsheets/d/1bh8zFAQxE7B7mLhmzkGblp3udws4u2xW76_4U32zCGk/edit?usp=sharing'; // ID de tu Google Sheet
const WHATSAPP_PHONE_NUMBER = '573184920436'; // ¡REEMPLAZA ESTE CON TU NÚMERO DE TELÉFONO COMPLETO, ej. 573101234567 para Colombia!

// --- SELECTORES DE ELEMENTOS HTML ---
const productListSection = document.getElementById('product-list');
const productDetailSection = document.getElementById('product-detail');
const cartSection = document.getElementById('cart-section');

const backToCatalogButton = document.getElementById('back-to-catalog');
const backToProductsFromCartButton = document.getElementById('back-to-products-from-cart');
const navButtons = document.querySelectorAll('.nav-button');
const cartCountSpan = document.getElementById('cart-count');

// Elementos del detalle de producto
const detailImage = document.getElementById('detail-image');
const detailName = document.getElementById('detail-name');
const detailId = document.getElementById('detail-id');
const detailDescription = document.getElementById('detail-description');
const detailPrice = document.getElementById('detail-price');
const detailOptions = document.getElementById('detail-options');
const addToCartButton = document.getElementById('add-to-cart-button');
const buyNowButton = document.getElementById('buy-now-button');
const consultantButton = document.getElementById('consultant-button');

// Elementos del carrito
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalSpan = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');
const consultantCartButton = document.getElementById('consultant-cart-button');

// --- VARIABLES GLOBALES ---
let allProducts = []; // Para almacenar todos los productos
let cart = JSON.parse(localStorage.getItem('urbanlife_cart')) || []; // Cargar carrito de localStorage
let selectedProduct = null; // Para el producto que se está viendo en detalle

// --- FUNCIONES DE UTILIDAD ---

// Formatea un número como moneda (ej. 120000 -> $120.000)
const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(price).replace('COP', '').trim(); // Elimina "COP" y el espacio extra
};

// Muestra u oculta secciones
const showSection = (sectionToShow) => {
    [productListSection, productDetailSection, cartSection].forEach(section => {
        section.classList.add('hidden');
    });
    sectionToShow.classList.remove('hidden');
};

// Genera el enlace de WhatsApp
const generateWhatsAppLink = (message) => {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodedMessage}`;
};

// --- GESTIÓN DE DATOS (Google Sheets) ---

const fetchProducts = async () => {
    productListSection.innerHTML = '<p class="loading-message">Cargando productos...</p>'; // Mostrar mensaje de carga
    // URL para obtener la hoja como CSV (hoja 1, ID 0)
    const sheetURL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
    try {
        const response = await fetch(sheetURL);
        const csvText = await response.text();

        // Parsea el CSV
        allProducts = parseCSV(csvText);
        displayProducts(allProducts);
        updateCartCount(); // Asegura que el contador del carrito se actualice al cargar
        if (allProducts.length === 0) {
             productListSection.innerHTML = '<p class="loading-message">No se encontraron productos en la hoja de cálculo.</p>';
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        productListSection.innerHTML = '<p class="loading-message">Error al cargar los productos. Asegúrate de que la hoja de cálculo esté publicada y el ID sea correcto.</p>';
    }
};

// Función para parsear CSV robusta
const parseCSV = (csv) => {
    const lines = csv.split('\n').filter(line => line.trim() !== ''); // Filtrar líneas vacías
    if (lines.length < 2) return []; // No hay suficientes datos (solo encabezados o nada)

    // Limpiar comillas y espacios de los encabezados, y eliminar BOM si existe
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').replace(/^\ufeff/, ''));
    const products = [];

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        // Usar una expresión regular más robusta para manejar comas dentro de comillas
        const values = currentLine.match(/(?:\"([^\"]*)\"|([^,]*))(?:,|$)/g)
            .map(v => v.replace(/,$/, '')) // Eliminar coma final
            .map(v => v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v); // Eliminar comillas si las hay

        if (values.length !== headers.length) {
            console.warn(`Saltando línea ${i + 1} debido a un número inconsistente de columnas: ${currentLine}`);
            continue;
        }

        const product = {};
        headers.forEach((header, index) => {
            let value = values[index] ? values[index].trim() : '';
            // Limpiar caracteres no deseados que a veces vienen del CSV (como \r)
            product[header.replace(/\r/g, '')] = value.replace(/\r/g, '');
        });

        // Procesar campos específicos
        product.price = parseFloat(product.price) || 0;
        // Asegurar que image_url siempre sea un string vacío si es null/undefined
        product.image_url = product.image_url || 'https://via.placeholder.com/300?text=Imagen+No+Disponible';
        product.sizes = product.sizes ? product.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
        product.colors = product.colors ? product.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
        product.stock = parseInt(product.stock) || 0; // Convertir stock a número

        products.push(product);
    }
    return products;
};


// --- RENDERIZADO DE PRODUCTOS ---

const displayProducts = (productsToDisplay) => {
    productListSection.innerHTML = ''; // Limpia el contenido actual
    if (productsToDisplay.length === 0) {
        productListSection.innerHTML = '<p class="loading-message">No hay productos en esta categoría.</p>';
        return;
    }

    productsToDisplay.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.dataset.productId = product.product_id;

        productCard.innerHTML = `
            <img src="${product.image_url}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300?text=Imagen+No+Disponible';">
            <h3>${product.name}</h3>
            <p class="price">$${formatPrice(product.price)}</p>
            <button class="buy-button view-detail">Ver Detalle</button>
        `;

        productCard.querySelector('.view-detail').addEventListener('click', () => showProductDetail(product.product_id));
        productListSection.appendChild(productCard);
    });
};

const showProductDetail = (productId) => {
    selectedProduct = allProducts.find(p => p.product_id === productId);

    if (!selectedProduct) {
        alert('Producto no encontrado.');
        return;
    }

    detailImage.src = selectedProduct.image_url;
    detailImage.alt = selectedProduct.name;
    // Fallback para imagen rota en detalle
    detailImage.onerror = function() {
        this.onerror = null;
        this.src = 'https://via.placeholder.com/400?text=Imagen+No+Disponible';
    };

    detailName.textContent = selectedProduct.name;
    detailId.textContent = selectedProduct.product_id;
    detailDescription.textContent = selectedProduct.description;
    detailPrice.textContent = formatPrice(selectedProduct.price);

    // Opciones de talla/color
    detailOptions.innerHTML = ''; // Limpiar opciones anteriores
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
        const sizeSelect = document.createElement('select');
        sizeSelect.id = 'select-size';
        sizeSelect.innerHTML = '<option value="">Selecciona una talla</option>';
        selectedProduct.sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            sizeSelect.appendChild(option);
        });
        const sizeLabel = document.createElement('label');
        sizeLabel.htmlFor = 'select-size';
        sizeLabel.textContent = 'Talla:';
        detailOptions.appendChild(sizeLabel);
        detailOptions.appendChild(sizeSelect);
    }

    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
        const colorSelect = document.createElement('select');
        colorSelect.id = 'select-color';
        colorSelect.innerHTML = '<option value="">Selecciona un color</option>';
        selectedProduct.colors.forEach(color => {
            const option = document.createElement('option');
            option.value = color;
            option.textContent = color;
            colorSelect.appendChild(option);
        });
        const colorLabel = document.createElement('label');
        colorLabel.htmlFor = 'select-color';
        colorLabel.textContent = 'Color:';
        detailOptions.appendChild(colorLabel);
        detailOptions.appendChild(colorSelect);
    }

    showSection(productDetailSection);
};

// --- GESTIÓN DEL CARRITO ---

const updateCartCount = () => {
    cartCountSpan.textContent = cart.reduce((total, item) => total + item.quantity, 0);
};

const addToCart = () => {
    if (!selectedProduct) return;

    let selectedSize = '';
    let selectedColor = '';

    if (selectedProduct.sizes.length > 0) { // Si hay tallas disponibles para este producto
        const sizeSelect = document.getElementById('select-size');
        selectedSize = sizeSelect.value;
        if (!selectedSize) {
            alert('Por favor, selecciona una talla.');
            return;
        }
    }
    if (selectedProduct.colors.length > 0) { // Si hay colores disponibles para este producto
        const colorSelect = document.getElementById('select-color');
        selectedColor = colorSelect.value;
        if (!selectedColor) {
            alert('Por favor, selecciona un color.');
            return;
        }
    }

    // Identificador único para el ítem del carrito (ID de producto + opciones)
    const cartItemId = `${selectedProduct.product_id}-${selectedSize}-${selectedColor}`;

    const existingItem = cart.find(item => item.id === cartItemId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: cartItemId,
            product_id: selectedProduct.product_id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            image_url: selectedProduct.image_url,
            size: selectedSize,
            color: selectedColor,
            quantity: 1
        });
    }
    localStorage.setItem('urbanlife_cart', JSON.stringify(cart));
    updateCartCount();
    alert(`"${selectedProduct.name}" añadido al carrito.`);
    showSection(productListSection); // Regresa al catálogo después de añadir
};

const displayCart = () => {
    cartItemsContainer.innerHTML = ''; // Limpiar carrito
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
        cartTotalSpan.textContent = formatPrice(0);
        checkoutButton.disabled = true;
        return;
    }

    checkoutButton.disabled = false;

    cart.forEach(item => {
        const cartItemDiv = document.createElement('div');
        cartItemDiv.classList.add('cart-item');
        cartItemDiv.dataset.id = item.id;

        const optionsText = [item.size, item.color].filter(Boolean).join(' / '); // Filtra opciones vacías

        cartItemDiv.innerHTML = `
            <img src="${item.image_url}" alt="${item.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/80?text=No+Img';">
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-options">${optionsText}</p>
            </div>
            <div class="item-actions">
                <input type="number" value="${item.quantity}" min="1" data-id="${item.id}">
                <button class="remove-button" data-id="${item.id}">Eliminar</button>
            </div>
            <p class="item-price">$${formatPrice(item.price * item.quantity)}</p>
        `;

        cartItemDiv.querySelector('input[type="number"]').addEventListener('change', updateCartItemQuantity);
        cartItemDiv.querySelector('.remove-button').addEventListener('click', removeCartItem);
        cartItemsContainer.appendChild(cartItemDiv);
        total += item.price * item.quantity;
    });

    cartTotalSpan.textContent = formatPrice(total);
};

const updateCartItemQuantity = (event) => {
    const itemId = event.target.dataset.id;
    let newQuantity = parseInt(event.target.value);

    if (isNaN(newQuantity) || newQuantity < 1) {
        newQuantity = 1; // Asegura que la cantidad sea al menos 1
        event.target.value = 1;
    }

    const itemIndex = cart.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity = newQuantity;
        localStorage.setItem('urbanlife_cart', JSON.stringify(cart));
        displayCart(); // Volver a renderizar para actualizar totales
        updateCartCount();
    }
};

const removeCartItem = (event) => {
    const itemId = event.target.dataset.id;
    cart = cart.filter(item => item.id !== itemId);
    localStorage.setItem('urbanlife_cart', JSON.stringify(cart));
    displayCart();
    updateCartCount();
};

// --- GESTIÓN DE ENLACES DE WHATSAPP ---

const handleSingleProductBuy = () => {
    if (!selectedProduct) return;

    let selectedSize = '';
    let selectedColor = '';

    const sizeSelect = document.getElementById('select-size');
    const colorSelect = document.getElementById('select-color');

    // Validar selección solo si el producto tiene opciones
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
        selectedSize = sizeSelect.value;
        if (!selectedSize) {
            alert('Por favor, selecciona una talla.');
            return;
        }
    }
    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
        selectedColor = colorSelect.value;
        if (!selectedColor) {
            alert('Por favor, selecciona un color.');
            return;
        }
    }

    const optionsText = [selectedSize, selectedColor].filter(Boolean).join(' / ');
    const message = `Hola! 👋 Estoy interesado en el siguiente producto de tu catálogo Urbanlife:\n\n*Producto:* ${selectedProduct.name}\n*ID:* ${selectedProduct.product_id}\n*Precio:* $${formatPrice(selectedProduct.price)}\n${optionsText ? `*Opciones:* ${optionsText}\n` : ''}\nPor favor, dame más información o ayúdame a concretar la compra. ¡Gracias!`;
    window.open(generateWhatsAppLink(message), '_blank');
};

const handleCheckout = () => {
    if (cart.length === 0) {
        alert('Tu carrito está vacío.');
        return;
    }

    let orderMessage = "Hola! 👋 Me gustaría hacer el siguiente pedido de tu catálogo Urbanlife:\n\n";
    let total = 0;

    cart.forEach((item, index) => {
        const optionsText = [item.size, item.color].filter(Boolean).join(' / ');
        orderMessage += `${index + 1}. *${item.name}*\n   Cantidad: ${item.quantity}\n   ${optionsText ? `Opciones: ${optionsText}\n` : ''}   Precio Unitario: $${formatPrice(item.price)}\n   Subtotal: $${formatPrice(item.price * item.quantity)}\n\n`;
        total += item.price * item.quantity;
    });

    orderMessage += `*Total a Pagar: $${formatPrice(total)}*\n\n`;
    orderMessage += "Por favor, confírmame los detalles y los pasos para el pago. ¡Gracias!";

    window.open(generateWhatsAppLink(orderMessage), '_blank');

    // Opcional: limpiar el carrito después de enviar el pedido
    cart = [];
    localStorage.setItem('urbanlife_cart', JSON.stringify(cart));
    updateCartCount();
    displayCart();
    alert('Tu pedido ha sido enviado a WhatsApp. Revisa tu chat para finalizar la compra.');
    showSection(productListSection); // Regresar al catálogo principal
};

const handleConsultantChat = () => {
    const message = "Hola! 👋 Necesito ayuda con el catálogo Urbanlife. ¿Podrías asistirme, por favor?";
    window.open(generateWhatsAppLink(message), '_blank');
};


// --- EVENT LISTENERS ---

// Navegación por categorías
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active')); // Desactiva todos
        button.classList.add('active'); // Activa el clickeado

        const category = button.dataset.category;
        if (category === 'Carrito') {
            displayCart();
            showSection(cartSection);
        } else {
            const filteredProducts = category === 'all' ? allProducts : allProducts.filter(p => p.category === category);
            displayProducts(filteredProducts);
            showSection(productListSection);
        }
    });
});

// Botones de navegación Volver
backToCatalogButton.addEventListener('click', () => showSection(productListSection));
backToProductsFromCartButton.addEventListener('click', () => showSection(productListSection));

// Botones de acción en detalle de producto
addToCartButton.addEventListener('click', addToCart);
buyNowButton.addEventListener('click', handleSingleProductBuy);
consultantButton.addEventListener('click', handleConsultantChat);

// Botones de acción en el carrito
checkoutButton.addEventListener('click', handleCheckout);
consultantCartButton.addEventListener('click', handleConsultantChat);


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartCount(); // Asegura que el contador se actualice al cargar
    // Activa el botón "Todos" por defecto al cargar
    document.querySelector('.nav-button[data-category="all"]').classList.add('active');
});
