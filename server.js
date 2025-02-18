const express = require('express');
const path = require('path');
const os = require('os');
const { db } = require('./firebase.config');
const { collection, addDoc, getDocs, query, where, doc, getDoc } = require('firebase/firestore');
const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Function to get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();

// Route for menu page
app.get('/menu/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        // Verify restaurant exists before serving the page
        const restaurantRef = doc(db, 'restaurants', restaurantId);
        const restaurantDoc = await getDoc(restaurantRef);
        
        if (!restaurantDoc.exists()) {
            return res.status(404).send('Restaurant not found');
        }
        
        res.sendFile(path.join(__dirname, 'view-menu.html'));
    } catch (error) {
        console.error('Error serving menu page:', error);
        res.status(500).send('Error loading menu page');
    }
});

// Route to get server IP
app.get('/ip', (req, res) => {
    res.json({ ip: localIP });
});

// API endpoint to save menu data
app.post('/api/save-menu', async (req, res) => {
    const { restaurantName, items } = req.body;
    
    try {
        // Add restaurant document
        const restaurantRef = await addDoc(collection(db, 'restaurants'), {
            name: restaurantName,
            createdAt: new Date()
        });
        
        // Add menu items
        const menuPromises = items.map(item => 
            addDoc(collection(db, 'menu_items'), {
                restaurantId: restaurantRef.id,
                name: item.name,
                price: parseFloat(item.price),
                createdAt: new Date()
            })
        );
        
        await Promise.all(menuPromises);
        
        res.json({ success: true, restaurantId: restaurantRef.id });
    } catch (error) {
        console.error('Error saving menu:', error);
        res.status(500).json({ success: false, error: 'Failed to save menu' });
    }
});

// API endpoint to get menu data
app.get('/api/menu/:restaurantId', async (req, res) => {
    const { restaurantId } = req.params;
    
    try {
        // Get restaurant document
        const restaurantRef = doc(db, 'restaurants', restaurantId);
        const restaurantDoc = await getDoc(restaurantRef);
        
        if (!restaurantDoc.exists()) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        
        // Get menu items
        const menuItemsRef = collection(db, 'menu_items');
        const q = query(menuItemsRef, where('restaurantId', '==', restaurantId));
        const menuSnapshot = await getDocs(q);
        
        const items = [];
        menuSnapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
                name: data.name,
                price: parseFloat(data.price).toFixed(2)
            });
        });
        
        res.json({
            restaurantName: restaurantDoc.data().name,
            items: items
        });
        
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

// Function to find an available port
function startServer(port) {
    app.listen(port, '0.0.0.0')
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is busy, trying ${port + 1}...`);
                startServer(port + 1);
            } else {
                console.error('Server error:', err);
            }
        })
        .on('listening', () => {
            console.log(`Server is running on http://localhost:${port}`);
            console.log(`For mobile access, use: http://${localIP}:${port}`);
        });
}

// Start server with initial port
startServer(5501); 