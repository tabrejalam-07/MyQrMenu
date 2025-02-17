document.addEventListener('DOMContentLoaded', () => {
    const addItemBtn = document.getElementById('addItem');
    const removeItemBtn = document.getElementById('removeItem');
    const generateQRBtn = document.getElementById('generateQR');
    const downloadQRBtn = document.getElementById('downloadQR');
    const menuItemsContainer = document.getElementById('menuItems');
    const qrSection = document.getElementById('qrSection');

    // Function to get server IP address
    async function getServerIP() {
        try {
            const response = await fetch('/ip');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Error getting server IP:', error);
            return window.location.hostname;
        }
    }

    // Add new menu item with animation
    addItemBtn.addEventListener('click', () => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.style.opacity = '0';
        menuItem.style.transform = 'translateX(-20px)';
        menuItem.innerHTML = `
            <div class="item-details">
                <input type="text" placeholder="Food Item Name" class="input-field item-name">
                <input type="number" placeholder="Price" class="input-field item-price">
            </div>
        `;

        menuItemsContainer.appendChild(menuItem);
        
        // Trigger animation
        requestAnimationFrame(() => {
            menuItem.style.opacity = '1';
            menuItem.style.transform = 'translateX(0)';
        });
    });

    // Remove last menu item with animation
    removeItemBtn.addEventListener('click', () => {
        const menuItems = menuItemsContainer.getElementsByClassName('menu-item');
        if (menuItems.length > 1) {
            const lastItem = menuItems[menuItems.length - 1];
            lastItem.style.opacity = '0';
            lastItem.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                menuItemsContainer.removeChild(lastItem);
            }, 300);
        }
    });

    // Generate QR Code
    generateQRBtn.addEventListener('click', async () => {
        const restaurantName = document.getElementById('restaurantName').value;
        if (!restaurantName) {
            showAlert('Please enter restaurant name');
            return;
        }

        const menuItems = [];
        const itemElements = menuItemsContainer.getElementsByClassName('menu-item');
        
        for (let item of itemElements) {
            const name = item.querySelector('.item-name').value;
            const price = item.querySelector('.item-price').value;
            
            if (name && price) {
                menuItems.push({ name, price });
            }
        }

        if (menuItems.length === 0) {
            showAlert('Please add at least one menu item');
            return;
        }

        try {
            // Save menu data to database
            const response = await fetch('/api/save-menu', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    restaurantName,
                    items: menuItems
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error('Failed to save menu');
            }

            // Get the server IP and create the URL with restaurant ID
            const serverIP = await getServerIP();
            const menuUrl = `http://${serverIP}:5501/menu/${result.restaurantId}`;

            // Clear previous QR code
            const qrcodeContainer = document.getElementById('qrcode');
            qrcodeContainer.innerHTML = '';

            // Generate new QR code with proper size and error correction
            new QRCode(qrcodeContainer, {
                text: menuUrl,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Show QR section with animation
            qrSection.style.display = 'block';
            requestAnimationFrame(() => {
                qrSection.classList.add('visible');
            });

            console.log('Generated QR code for URL:', menuUrl);
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error generating QR code. Please try again.');
        }
    });

    // Download QR Code with animation
    downloadQRBtn.addEventListener('click', () => {
        const canvas = document.querySelector('#qrcode canvas');
        if (canvas) {
            // Add download animation
            downloadQRBtn.classList.add('downloading');
            
            const link = document.createElement('a');
            link.download = `${document.getElementById('restaurantName').value.replace(/\s+/g, '-')}-menu-qr.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            setTimeout(() => {
                downloadQRBtn.classList.remove('downloading');
            }, 1000);
        }
    });

    // Show alert function
    function showAlert(message) {
        const alert = document.createElement('div');
        alert.className = 'alert';
        alert.textContent = message;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff3d3d;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(alert);
        
        requestAnimationFrame(() => {
            alert.style.opacity = '1';
        });

        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(alert);
            }, 300);
        }, 3000);
    }
});