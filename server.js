const express = require('express');
const path = require('path');
const os = require('os');
const mysql = require('mysql2');
const dbConfig = require('./db.config');
const app = express();

// Parse JSON bodies
app.use(express.json());

// First create a connection without database to create it if it doesn't exist
const initialConnection = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
});

// Create database if it doesn't exist
initialConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`, (err) => {
    if (err) {
        console.error('Error creating database:', err);
        return;
    }
    console.log('Database checked/created');
    
    // Close the initial connection
    initialConnection.end();

    // Create the main connection with the database
    const connection = mysql.createConnection(dbConfig);

    // Connect to MySQL
    connection.connect(error => {
        if (error) {
            console.error('Error connecting to database:', error);
            return;
        }
        console.log("Successfully connected to the database.");

        // Create restaurants table
        const createRestaurantsTable = `
            CREATE TABLE IF NOT EXISTS restaurants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        connection.query(createRestaurantsTable, (err) => {
            if (err) {
                console.error('Error creating restaurants table:', err);
                return;
            }
            console.log("Restaurants table checked/created successfully");

            // Create menu_items table after restaurants table is created
            const createMenuItemsTable = `
                CREATE TABLE IF NOT EXISTS menu_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    restaurant_id INT,
                    name VARCHAR(255) NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
                )
            `;

            connection.query(createMenuItemsTable, (err) => {
                if (err) {
                    console.error('Error creating menu_items table:', err);
                    return;
                }
                console.log("Menu items table checked/created successfully");
            });
        });
    });

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

    // Serve static files from the current directory
    app.use(express.static(__dirname));

    // Route for menu page
    app.get('/menu/:restaurantId', (req, res) => {
        res.sendFile(path.join(__dirname, 'view-menu.html'));
    });

    // Route to get server IP
    app.get('/ip', (req, res) => {
        res.json({ ip: localIP });
    });

    // API endpoint to save menu data
    app.post('/api/save-menu', async (req, res) => {
        const { restaurantName, items } = req.body;
        
        try {
            // Insert restaurant
            const [restaurantResult] = await connection.promise().query(
                'INSERT INTO restaurants (name) VALUES (?)',
                [restaurantName]
            );
            
            const restaurantId = restaurantResult.insertId;
            
            // Insert menu items
            for (const item of items) {
                await connection.promise().query(
                    'INSERT INTO menu_items (restaurant_id, name, price) VALUES (?, ?, ?)',
                    [restaurantId, item.name, item.price]
                );
            }
            
            res.json({ success: true, restaurantId });
        } catch (error) {
            console.error('Error saving menu:', error);
            res.status(500).json({ success: false, error: 'Failed to save menu' });
        }
    });

    // API endpoint to get menu data
    app.get('/api/menu/:restaurantId', async (req, res) => {
        const { restaurantId } = req.params;
        
        try {
            // Get restaurant name
            const [restaurants] = await connection.promise().query(
                'SELECT name as restaurantName FROM restaurants WHERE id = ?',
                [restaurantId]
            );
            
            if (restaurants.length === 0) {
                return res.status(404).json({ error: 'Restaurant not found' });
            }
            
            // Get menu items
            const [items] = await connection.promise().query(
                'SELECT name, price FROM menu_items WHERE restaurant_id = ?',
                [restaurantId]
            );
            
            res.json({
                restaurantName: restaurants[0].restaurantName,
                items: items.map(item => ({
                    name: item.name,
                    price: parseFloat(item.price).toFixed(2)
                }))
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
}); 