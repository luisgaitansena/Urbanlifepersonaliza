// --- CONFIGURACIÓN ---
// URL DIRECTA para obtener la hoja como CSV
const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRyGzk1QIOLgGgVHj2DNi8ofN_oqzQl7qa1_V4zYzW3oK0Q7kDhWw9GD0t_bFmDs5cjmG8YaWwPDCbM/pub?output=csv'; // ¡TU ENLACE DIRECTO!
// Tu número de WhatsApp completo (ej. 573101234567 para Colombia)
const WHATSAPP_PHONE_NUMBER = '573184950436'; // ¡REEMPLAZA ESTE CON TU NÚMERO DE TELÉFONO COMPLETO!
// ---------------------

// Referencias a elementos del DOM
const productListSection = document.getElementById('product-list');
const productDetailSection = document.getElementById('product-detail');
const cartSection = document.getElementById('cart-section');
const aboutUsSection = document.getElementById('about-us-section'); // Nueva referencia
const cartCountSpan = document.getElementById('cart-count');
const cartTotalSpan = document.getElementById('cart-total');
const cartItemsContainer = document.getElementById('cart-items');
const emptyCartMessage = cartItemsContainer.querySelector('.empty-cart-message');

// Botones de navegación principal y de subcategorías
const navButtons = document.querySelectorAll('.nav-button:not(.subcategory-button)');
const subcategoryNav = document.getElementById('subcategory-nav');
const subcategoryButtons = document.querySelectorAll('.subcategory-button');

// Botones de navegación y acción
const backToCatalogButton = document.getElementById('back-to-catalog');
const backToProductsFromCartButton = document.getElementById('back-to-products-from-cart');
const addToCartButton = document.getElementById('add-to-cart-button');
const buyNowButton = document.getElementById('buy-now-button');
const checkoutButton = document.getElementById('checkout-button');
const consultantButton = document.getElementById('consultant-button');
const consultantCartButton = document.getElementById('consultant-cart-button');

let allProducts = []; // Para almacenar todos los productos
let currentProduct = null; // Para el producto que se está viendo en detalle
let cart = {}; // Almacena los productos en el carrito { product_id: { product_data, quantity, selected_size, selected_color } }

// --- Funciones de Utilidad ---

// Función para limpiar y parsear el CSV (Versión más robusta)
const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '');

    if (nonEmptyLines.length === 0) return [];

    const headers = nonEmptyLines[0].split(',').map(header => header.trim().toLowerCase());
    const products = [];

    for (let i = 1; i < nonEmptyLines.length; i++) {
        const line = nonEmptyLines[i];
        const values = [];
        let inQuote = false;
        let currentField = '';

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                values.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        values.push(currentField.trim());

        if (values.length !== headers.length) {
            console.warn(`Saltando línea ${i + 1} debido a un número inconsistente de columnas. Esperadas: ${headers.length}, Encontradas: ${values.length}. Contenido: "${line}"`);
            continue;
        }

        const product = {};
        headers.forEach((header, index) => {
            let value = values[index];
            if (header === 'price' && value) {
                value = parseFloat(value.replace(/[^0-9.]/g, ''));
                if (isNaN(value)) value = 0;
            } else if (header === 'stock' && value) {
                value = parseInt(value, 10);
                if (isNaN(value)) value = 0;
            } else if (header === 'sizes' && value) {
                value = value.split(',').map(s => s.trim()).filter(s => s);
            } else if (header === 'colors' && value) {
                value = value.split(',').map(c => c.trim()).filter(c => c);
            } else if (header === 'sub_category' && value) {
                value = value.toLowerCase().trim();
            }
            product[header] = value;
        });

        if (product.product_id && product.name && product.price !== undefined && product.image_url) {
            products.push(product);
        } else {
            console.warn(`Saltando producto incompleto en línea ${i + 1} (faltan ID, nombre, precio o URL de imagen):`, product);
        }
    }
    return products;
};


// Nueva función para obtener X productos aleatorios por categoría
const getRandomProductsPerCategory = (products, countPerCategory = 2) => {
    const categorizedProducts = {};
    products.forEach(p => {
        // Usar la categoría "Ropa" o la subcategoría si es "Ropa" y tiene subcategoría
        const categoryKey = p.category === 'Ropa' && p.sub_category ? p.sub_category : p.category;
        if (categoryKey) {
            if (!categorizedProducts[categoryKey]) {
                categorizedProducts[categoryKey] = [];
            }
            categorizedProducts[categoryKey].push(p);
        }
    });

    const randomProducts = [];
    for (const category in categorizedProducts) {
        const categoryItems = categorizedProducts[category];
        // Shuffle (mezclar) los productos de la categoría
        for (let i = categoryItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [categoryItems[i], categoryItems[j]] = [categoryItems[j], categoryItems[i]];
        }
        // Tomar los primeros 'countPerCategory' productos
        randomProducts.push(...categoryItems.slice(0, countPerCategory));
    }
    return randomProducts;
};


// Función para obtener productos de Google Sheet
const fetchProducts = async () => {
    productListSection.innerHTML = '<p class="loading-message">Cargando productos...</p>';

    try {
        const response = await fetch(sheetURL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - Verifique que la hoja de cálculo esté publicada en la web como CSV.`);
        }
        const csvText = await response.text();
        allProducts = parseCSV(csvText);
        
        // Mostrar productos aleatorios por categoría al cargar la página (Inicio)
        displayProductsForHomepage();

    } catch (error) {
        console.error('Error al cargar los productos:', error);
        productListSection.innerHTML = '<p class="error-message">Error al cargar los productos. Por favor, asegúrate de que tu Google Sheet esté publicado en la web como CSV y que el ID sea correcto.</p><p class="error-details">Detalle: ' + error.message + '</p>';
    }
};

// Función para mostrar productos en el DOM
const displayProducts = (productsToDisplay) => {
    productListSection.innerHTML = '';
    if (productsToDisplay.length === 0) {
        productListSection.innerHTML = '<p class="no-products-message">No se encontraron productos en esta categoría o la hoja está vacía/incorrecta.</p>';
        return;
    }

    productsToDisplay.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-id', product.product_id);

        productCard.innerHTML = `
            <img src="${product.image_url}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/200?text=Imagen+No+Disponible';"/>
            <h3>${product.name}</h3>
            <p class="product-price">$${product.price.toLocaleString('es-CO')}</p>
            <button class="view-detail-button" data-id="${product.product_id}">Ver Detalles</button>
        `;
        productListSection.appendChild(productCard);
    });
};

// Función para mostrar productos en la página de inicio (aleatorios por categoría)
const displayProductsForHomepage = () => {
    const randomProducts = getRandomProductsPerCategory(allProducts);
    displayProducts(randomProducts);
    aboutUsSection.classList.remove('hidden'); // Asegurarse de que "Quiénes somos" esté visible en Inicio
    productListSection.classList.remove('hidden');
    productDetailSection.classList.add('hidden');
    cartSection.classList.add('hidden');
    subcategoryNav.classList.add('hidden'); // Ocultar subcategorías en Inicio
};

// Función para mostrar detalles de un producto
const showProductDetail = (productId) => {
    currentProduct = allProducts.find(p => p.product_id === productId);
    if (!currentProduct) {
        console.error('Producto no encontrado:', productId);
        return;
    }

    document.getElementById('detail-image').src = currentProduct.image_url;
    document.getElementById('detail-image').alt = currentProduct.name;
    document.getElementById('detail-name').textContent = currentProduct.name;
    document.getElementById('detail-id').textContent = currentProduct.product_id;
    document.getElementById('detail-description').textContent = currentProduct.description || 'Sin descripción.';
    document.getElementById('detail-price').textContent = currentProduct.price.toLocaleString('es-CO');

    const detailOptionsDiv = document.getElementById('detail-options');
    detailOptionsDiv.innerHTML = '';

    // Mostrar opciones de tallas si existen
    if (currentProduct.sizes && currentProduct.sizes.length > 0) {
        const sizesDiv = document.createElement('div');
        sizesDiv.innerHTML = '<label for="select-size">Talla:</label><select id="select-size"></select>';
        const selectSize = sizesDiv.querySelector('#select-size');
        currentProduct.sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            selectSize.appendChild(option);
        });
        detailOptionsDiv.appendChild(sizesDiv);
    }

    // Mostrar opciones de colores si existen
    if (currentProduct.colors && currentProduct.colors.length > 0) {
        const colorsDiv = document.createElement('div');
        colorsDiv.innerHTML = '<label for="select-color">Color:</label><select id="select-color"></select>';
        const selectColor = colorsDiv.querySelector('#select-color');
        currentProduct.colors.forEach(color => {
            const option = document.createElement('option');
            option.value = color;
            option.textContent = color;
            selectColor.appendChild(option);
        });
        detailOptionsDiv.appendChild(colorsDiv);
    }

    // Mostrar u ocultar botones según disponibilidad de stock
    const isAvailable = currentProduct.stock === undefined || currentProduct.stock > 0;
    addToCartButton.style.display = isAvailable ? 'block' : 'none';
    buyNowButton.style.display = isAvailable ? 'block' : 'none';
    consultantButton.style.display = 'block'; // El consultor siempre está disponible

    if (!isAvailable) {
        const stockMessage = document.createElement('p');
        stockMessage.className = 'out-of-stock-message';
        stockMessage.textContent = 'Producto agotado.';
        detailOptionsDiv.appendChild(stockMessage);
    }


    productListSection.classList.add('hidden');
    cartSection.classList.add('hidden');
    aboutUsSection.classList.add('hidden'); // Ocultar "Quiénes somos" en detalle
    subcategoryNav.classList.add('hidden'); // Ocultar subcategorías en detalle
    productDetailSection.classList.remove('hidden');
};

// --- Funciones de Carrito ---

const updateCartCount = () => {
    let totalItems = 0;
    for (const productId in cart) {
        totalItems += cart[productId].quantity;
    }
    cartCountSpan.textContent = totalItems;
};

const addToCart = () => {
    if (!currentProduct) return;

    const selectedSize = document.getElementById('select-size') ? document.getElementById('select-size').value : 'N/A';
    const selectedColor = document.getElementById('select-color') ? document.getElementById('select-color').value : 'N/A';

    const cartItemId = `${currentProduct.product_id}-${selectedSize}-${selectedColor}`;

    if (cart[cartItemId]) {
        cart[cartItemId].quantity++;
    } else {
        cart[cartItemId] = {
            ...currentProduct,
            quantity: 1,
            selected_size: selectedSize,
            selected_color: selectedColor,
            cart_item_id: cartItemId
        };
    }
    updateCartCount();
    alert(`"${currentProduct.name}" añadido al carrito.`);
    console.log('Carrito actual:', cart);
};

const renderCart = () => {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    const cartItemsArray = Object.values(cart);

    if (cartItemsArray.length === 0) {
        emptyCartMessage.style.display = 'block';
    } else {
        emptyCartMessage.style.display = 'none';
        cartItemsArray.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <img src="${item.image_url}" alt="${item.name}" />
                <div class="cart-item-info">
                    <h3>${item.name}</h3>
                    <p>ID: ${item.product_id}</p>
                    ${item.selected_size !== 'N/A' ? `<p>Talla: ${item.selected_size}</p>` : ''}
                    ${item.selected_color !== 'N/A' ? `<p>Color: ${item.selected_color}</p>` : ''}
                    <p>Cantidad: ${item.quantity}</p>
                    <p class="price">$${(item.price * item.quantity).toLocaleString('es-CO')}</p>
                </div>
                <button class="remove-from-cart" data-id="${item.cart_item_id}">Eliminar</button>
            `;
            cartItemsContainer.appendChild(itemDiv);
            total += item.price * item.quantity;
        });
    }
    cartTotalSpan.textContent = total.toLocaleString('es-CO');
};

const removeFromCart = (cartItemId) => {
    if (cart[cartItemId]) {
        delete cart[cartItemId];
        updateCartCount();
        renderCart();
    }
};


// --- Integración con WhatsApp ---

const generateWhatsAppMessage = (type) => {
    let message = `¡Hola! Me gustaría hacer un pedido desde tu catálogo web.`;
    let itemsSummary = '';
    let total = 0;

    if (type === 'buy_now' && currentProduct) {
        const selectedSize = document.getElementById('select-size') ? document.getElementById('select-size').value : 'N/A';
        const selectedColor = document.getElementById('select-color') ? document.getElementById('select-color').value : 'N/A';
        itemsSummary = `\nProducto: ${currentProduct.name} (ID: ${currentProduct.product_id})\n`;
        if (selectedSize !== 'N/A') itemsSummary += `Talla: ${selectedSize}\n`;
        if (selectedColor !== 'N/A') itemsSummary += `Color: ${selectedColor}\n`;
        itemsSummary += `Cantidad: 1\n`;
        itemsSummary += `Precio unitario: $${currentProduct.price.toLocaleString('es-CO')}\n`;
        total = currentProduct.price;
        message += itemsSummary + `Total: $${total.toLocaleString('es-CO')}`;
    } else if (type === 'checkout') {
        const cartItemsArray = Object.values(cart);
        if (cartItemsArray.length === 0) {
            alert('Tu carrito está vacío. No se puede finalizar la compra.');
            return '';
        }
        itemsSummary = '\nMis productos:\n';
        cartItemsArray.forEach(item => {
            itemsSummary += `- ${item.name} (ID: ${item.product_id})\n`;
            if (item.selected_size !== 'N/A') itemsSummary += `  Talla: ${item.selected_size}\n`;
            if (item.selected_color !== 'N/A') itemsSummary += `  Color: ${item.selected_color}\n`;
            itemsSummary += `  Cantidad: ${item.quantity}\n`;
            itemsSummary += `  Subtotal: $${(item.price * item.quantity).toLocaleString('es-CO')}\n`;
            total += item.price * item.quantity;
        });
        message += itemsSummary + `\nTotal de mi compra: $${total.toLocaleString('es-CO')}\n\n¡Espero tu confirmación!`;
    } else if (type === 'consultant') {
         message = '¡Hola! Me gustaría hablar con un consultor sobre los productos de su catálogo.';
         if (currentProduct) {
            message += ` Estoy interesado en el producto: ${currentProduct.name} (ID: ${currentProduct.product_id}).`;
         }
    } else if (type === 'consultant_cart') {
         message = '¡Hola! Me gustaría hablar con un consultor sobre mi carrito de compras.';
         const cartItemsArray = Object.values(cart);
         if (cartItemsArray.length > 0) {
            itemsSummary = '\nLos productos en mi carrito son:\n';
            cartItemsArray.forEach(item => {
                itemsSummary += `- ${item.name} (ID: ${item.product_id}) x ${item.quantity}\n`;
            });
            message += itemsSummary;
         }
    }

    return `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
};

// --- Event Listeners ---

// Navegación por categorías principales
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const category = button.getAttribute('data-category');

        // Ocultar todas las secciones
        productListSection.classList.add('hidden');
        productDetailSection.classList.add('hidden');
        cartSection.classList.add('hidden');
        aboutUsSection.classList.add('hidden'); // Ocultar "Quiénes somos" por defecto
        subcategoryNav.classList.add('hidden'); // Ocultar subcategorías por defecto

        // Remover clase 'active' de todos los botones para reestablecer
        navButtons.forEach(btn => btn.classList.remove('active-category'));
        subcategoryButtons.forEach(btn => btn.classList.remove('active-subcategory'));
        
        button.classList.add('active-category'); // Marcar el botón activo

        if (category === 'Carrito') {
            renderCart();
            cartSection.classList.remove('hidden');
        } else if (category === 'all') { // Cuando se hace clic en "Inicio"
            displayProductsForHomepage();
            aboutUsSection.classList.remove('hidden'); // Mostrar "Quiénes somos"
        } else if (category === 'Ropa') {
            // Mostrar los botones de subcategoría de ropa
            subcategoryNav.classList.remove('hidden');
            // Mostrar todos los productos de ropa inicialmente
            const filteredProducts = allProducts.filter(p => p.category === category);
            displayProducts(filteredProducts);
            productListSection.classList.remove('hidden');
        } else {
            // Para otras categorías, ocultar subcategorías y mostrar productos
            const filteredProducts = allProducts.filter(p => p.category === category);
            displayProducts(filteredProducts);
            productListSection.classList.remove('hidden');
        }
    });
});

// Navegación por subcategorías (específicas para Ropa)
subcategoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        const mainCategory = button.getAttribute('data-category'); // Debería ser 'Ropa'
        const subcategory = button.getAttribute('data-subcategory');

        // Remover clase 'active' de todos los botones de subcategoría para reestablecer
        subcategoryButtons.forEach(btn => btn.classList.remove('active-subcategory'));
        button.classList.add('active-subcategory'); // Marcar el botón de subcategoría activo

        let filteredProducts = [];
        if (subcategory === 'all') {
            // Si es 'Todas las Ropa', filtra solo por la categoría principal
            filteredProducts = allProducts.filter(p => p.category === mainCategory);
        } else {
            // Filtra por categoría principal Y subcategoría
            filteredProducts = allProducts.filter(p => 
                p.category === mainCategory && 
                p.sub_category === subcategory
            );
        }
        displayProducts(filteredProducts);
        productListSection.classList.remove('hidden');
        productDetailSection.classList.add('hidden');
        cartSection.classList.add('hidden');
        aboutUsSection.classList.add('hidden'); // Ocultar "Quiénes somos" en subcategoría
    });
});


// Delegación de eventos para botones "Ver Detalles"
productListSection.addEventListener('click', (event) => {
    if (event.target.classList.contains('view-detail-button')) {
        const productId = event.target.getAttribute('data-id');
        showProductDetail(productId);
    }
});

backToCatalogButton.addEventListener('click', () => {
    productDetailSection.classList.add('hidden');
    // Volver a la página de inicio o a la vista de la categoría Ropa si estaba activa
    const ropaButton = document.querySelector('.nav-button[data-category="Ropa"]');
    if (ropaButton && ropaButton.classList.contains('active-category')) {
        const filteredProducts = allProducts.filter(p => p.category === 'Ropa');
        displayProducts(filteredProducts);
        subcategoryNav.classList.remove('hidden');
        productListSection.classList.remove('hidden');
        aboutUsSection.classList.add('hidden'); // Asegurarse de que esté oculto
    } else {
        displayProductsForHomepage(); // Vuelve a la página de inicio con productos aleatorios
    }
});

backToProductsFromCartButton.addEventListener('click', () => {
    cartSection.classList.add('hidden');
    // Volver a la página de inicio o a la vista de la categoría Ropa si estaba activa
    const ropaButton = document.querySelector('.nav-button[data-category="Ropa"]');
    if (ropaButton && ropaButton.classList.contains('active-category')) {
         const filteredProducts = allProducts.filter(p => p.category === 'Ropa');
         displayProducts(filteredProducts);
        subcategoryNav.classList.remove('hidden');
        productListSection.classList.remove('hidden');
        aboutUsSection.classList.add('hidden'); // Asegurarse de que esté oculto
    } else {
        displayProductsForHomepage(); // Vuelve a la página de inicio con productos aleatorios
    }
});

addToCartButton.addEventListener('click', addToCart);

buyNowButton.addEventListener('click', () => {
    const whatsappLink = generateWhatsAppMessage('buy_now');
    if (whatsappLink) window.open(whatsappLink, '_blank');
});

checkoutButton.addEventListener('click', () => {
    const whatsappLink = generateWhatsAppMessage('checkout');
    if (whatsappLink) window.open(whatsappLink, '_blank');
});

consultantButton.addEventListener('click', () => {
    const whatsappLink = generateWhatsAppMessage('consultant');
    if (whatsappLink) window.open(whatsappLink, '_blank');
});

consultantCartButton.addEventListener('click', () => {
    const whatsappLink = generateWhatsAppMessage('consultant_cart');
    if (whatsappLink) window.open(whatsappLink, '_blank');
});

// Delegación de eventos para botones "Eliminar" del carrito
cartItemsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-from-cart')) {
        const cartItemId = event.target.getAttribute('data-id');
        removeFromCart(cartItemId);
    }
});

// --- Inicialización ---
fetchProducts(); // Carga los productos y llama a displayProductsForHomepage()
updateCartCount(); // Actualizar el contador del carrito al cargar

// Función para mantener la clase 'active-category' (aunque ya está integrada en navButtons listener)
const setActiveButton = (category) => {
    navButtons.forEach(btn => {
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active-category');
        } else {
            btn.classList.remove('active-category');
        }
    });
};
