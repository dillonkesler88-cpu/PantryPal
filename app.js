// PantryPal App - Main JavaScript functionality
class PantryPal {
    constructor() {
        this.pantryItems = this.loadFromStorage();
        this.currentTab = 'pantry';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderPantryItems();
        this.updateStats();
        this.generateRecipeSuggestions();
        this.setDefaultExpiryDate();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Add item form
        document.getElementById('addItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterItems(e.target.value);
        });

        // Receipt processing
        document.getElementById('processReceipt').addEventListener('click', () => {
            this.processReceipt();
        });

        // Modal functionality
        this.setupModalEvents();
    }

    setupModalEvents() {
        const modal = document.getElementById('itemModal');
        const closeBtn = document.querySelector('.close');
        const editForm = document.getElementById('editItemForm');
        const deleteBtn = document.getElementById('deleteItem');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateItem();
        });

        deleteBtn.addEventListener('click', () => {
            this.deleteItem();
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Update content based on tab
        if (tabName === 'pantry') {
            this.renderPantryItems();
            this.updateStats();
        } else if (tabName === 'recipes') {
            this.generateRecipeSuggestions();
        }
    }

    addItem() {
        const name = document.getElementById('itemName').value.trim();
        const quantity = document.getElementById('itemQuantity').value.trim();
        const expiry = document.getElementById('itemExpiry').value;
        const category = document.getElementById('itemCategory').value;

        if (!name || !quantity || !expiry) {
            this.showMessage('Please fill in all required fields', 'error');
            return;
        }

        const item = {
            id: Date.now().toString(),
            name: name,
            quantity: quantity,
            expiry: expiry,
            category: category || 'other',
            dateAdded: new Date().toISOString().split('T')[0]
        };

        this.pantryItems.push(item);
        this.saveToStorage();
        this.showMessage(`${name} added to pantry!`, 'success');
        this.clearForm();
        this.renderPantryItems();
        this.updateStats();
    }

    clearForm() {
        document.getElementById('addItemForm').reset();
        this.setDefaultExpiryDate();
    }

    setDefaultExpiryDate() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        document.getElementById('itemExpiry').value = nextWeek.toISOString().split('T')[0];
    }

    renderPantryItems() {
        const pantryList = document.getElementById('pantryList');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        if (this.pantryItems.length === 0) {
            pantryList.innerHTML = `
                <div class="empty-state">
                    <h3>Your pantry is empty</h3>
                    <p>Start by adding some items to track your food inventory!</p>
                </div>
            `;
            return;
        }

        const filteredItems = this.pantryItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm)
        );

        if (filteredItems.length === 0) {
            pantryList.innerHTML = `
                <div class="empty-state">
                    <h3>No items found</h3>
                    <p>Try adjusting your search terms.</p>
                </div>
            `;
            return;
        }

        pantryList.innerHTML = filteredItems.map(item => {
            const expiryStatus = this.getExpiryStatus(item.expiry);
            const daysUntilExpiry = this.getDaysUntilExpiry(item.expiry);
            
            return `
                <div class="pantry-item ${expiryStatus.class}">
                    <div class="item-header">
                        <div>
                            <div class="item-name">${item.name}</div>
                            <div class="item-category">${this.formatCategory(item.category)}</div>
                        </div>
                    </div>
                    <div class="item-details">
                        <div class="item-quantity">${item.quantity}</div>
                        <div class="item-expiry ${expiryStatus.class}">
                            ${this.formatExpiryDate(item.expiry, daysUntilExpiry)}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-edit" onclick="pantryApp.editItem('${item.id}')">Edit</button>
                        <button class="btn btn-used" onclick="pantryApp.markAsUsed('${item.id}')">Used</button>
                        <button class="btn btn-delete" onclick="pantryApp.confirmDelete('${item.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getExpiryStatus(expiryDate) {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            return { class: 'expired', status: 'expired' };
        } else if (daysUntilExpiry <= 3) {
            return { class: 'expiring-soon', status: 'expiring-soon' };
        } else {
            return { class: '', status: 'fresh' };
        }
    }

    getDaysUntilExpiry(expiryDate) {
        const today = new Date();
        const expiry = new Date(expiryDate);
        return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    }

    formatExpiryDate(expiryDate, daysUntilExpiry) {
        const date = new Date(expiryDate);
        const formattedDate = date.toLocaleDateString();
        
        if (daysUntilExpiry < 0) {
            return `Expired ${Math.abs(daysUntilExpiry)} days ago`;
        } else if (daysUntilExpiry === 0) {
            return 'Expires today';
        } else if (daysUntilExpiry === 1) {
            return 'Expires tomorrow';
        } else if (daysUntilExpiry <= 3) {
            return `Expires in ${daysUntilExpiry} days`;
        } else {
            return `Expires ${formattedDate}`;
        }
    }

    formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    updateStats() {
        const totalItems = this.pantryItems.length;
        const expiringSoon = this.pantryItems.filter(item => {
            const status = this.getExpiryStatus(item.expiry);
            return status.status === 'expiring-soon';
        }).length;
        const expired = this.pantryItems.filter(item => {
            const status = this.getExpiryStatus(item.expiry);
            return status.status === 'expired';
        }).length;

        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('expiringSoon').textContent = expiringSoon;
        document.getElementById('expired').textContent = expired;
    }

    filterItems(searchTerm) {
        this.renderPantryItems();
    }

    editItem(itemId) {
        const item = this.pantryItems.find(i => i.id === itemId);
        if (!item) return;

        document.getElementById('editItemId').value = itemId;
        document.getElementById('editItemName').value = item.name;
        document.getElementById('editItemQuantity').value = item.quantity;
        document.getElementById('editItemExpiry').value = item.expiry;
        document.getElementById('editItemCategory').value = item.category;

        document.getElementById('itemModal').style.display = 'block';
    }

    updateItem() {
        const itemId = document.getElementById('editItemId').value;
        const item = this.pantryItems.find(i => i.id === itemId);
        
        if (!item) return;

        item.name = document.getElementById('editItemName').value.trim();
        item.quantity = document.getElementById('editItemQuantity').value.trim();
        item.expiry = document.getElementById('editItemExpiry').value;
        item.category = document.getElementById('editItemCategory').value;

        this.saveToStorage();
        this.showMessage('Item updated successfully!', 'success');
        document.getElementById('itemModal').style.display = 'none';
        this.renderPantryItems();
        this.updateStats();
    }

    markAsUsed(itemId) {
        if (confirm('Mark this item as used? It will be removed from your pantry.')) {
            this.deleteItemById(itemId);
            this.showMessage('Item marked as used!', 'success');
        }
    }

    confirmDelete(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            this.deleteItemById(itemId);
            this.showMessage('Item deleted!', 'success');
        }
    }

    deleteItem() {
        const itemId = document.getElementById('editItemId').value;
        this.deleteItemById(itemId);
        this.showMessage('Item deleted!', 'success');
        document.getElementById('itemModal').style.display = 'none';
        this.renderPantryItems();
        this.updateStats();
    }

    deleteItemById(itemId) {
        this.pantryItems = this.pantryItems.filter(item => item.id !== itemId);
        this.saveToStorage();
        this.renderPantryItems();
        this.updateStats();
    }

    generateRecipeSuggestions() {
        const recipeContainer = document.getElementById('recipeSuggestions');
        const availableItems = this.pantryItems.map(item => item.name.toLowerCase());
        
        const recipes = [
            {
                name: "Pasta with Vegetables",
                description: "A simple and healthy pasta dish",
                ingredients: ["pasta", "tomato", "onion", "garlic"],
                difficulty: "Easy"
            },
            {
                name: "Stir Fry",
                description: "Quick and colorful vegetable stir fry",
                ingredients: ["rice", "vegetables", "soy sauce", "garlic"],
                difficulty: "Easy"
            },
            {
                name: "Salad Bowl",
                description: "Fresh mixed salad with your favorite vegetables",
                ingredients: ["lettuce", "tomato", "cucumber", "onion"],
                difficulty: "Easy"
            },
            {
                name: "Omelette",
                description: "Fluffy omelette with vegetables",
                ingredients: ["eggs", "milk", "vegetables", "cheese"],
                difficulty: "Easy"
            },
            {
                name: "Soup",
                description: "Warm and comforting vegetable soup",
                ingredients: ["vegetables", "broth", "onion", "garlic"],
                difficulty: "Medium"
            }
        ];

        const suggestedRecipes = recipes.filter(recipe => {
            return recipe.ingredients.some(ingredient => 
                availableItems.some(item => item.includes(ingredient))
            );
        });

        if (suggestedRecipes.length === 0) {
            recipeContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No recipe suggestions available</h3>
                    <p>Add more items to your pantry to get recipe suggestions!</p>
                </div>
            `;
            return;
        }

        recipeContainer.innerHTML = suggestedRecipes.map(recipe => `
            <div class="recipe-card">
                <h3>${recipe.name}</h3>
                <p>${recipe.description}</p>
                <div class="recipe-ingredients">
                    <strong>Ingredients needed:</strong> ${recipe.ingredients.join(', ')}
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem; color: #888;">
                    Difficulty: ${recipe.difficulty}
                </div>
            </div>
        `).join('');
    }

    processReceipt() {
        const receiptText = document.getElementById('receiptText').value.trim();
        if (!receiptText) {
            this.showMessage('Please enter some items from your receipt', 'error');
            return;
        }

        const items = receiptText.split('\n').filter(line => line.trim());
        let addedCount = 0;

        items.forEach(itemText => {
            const item = itemText.trim();
            if (item) {
                const newItem = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: item,
                    quantity: '1',
                    expiry: this.getDefaultExpiryDate(),
                    category: 'other',
                    dateAdded: new Date().toISOString().split('T')[0]
                };
                this.pantryItems.push(newItem);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            this.saveToStorage();
            this.showMessage(`${addedCount} items added from receipt!`, 'success');
            document.getElementById('receiptText').value = '';
            this.renderPantryItems();
            this.updateStats();
        }
    }

    getDefaultExpiryDate() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return nextWeek.toISOString().split('T')[0];
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('pantryPalItems');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading from storage:', error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('pantryPalItems', JSON.stringify(this.pantryItems));
        } catch (error) {
            console.error('Error saving to storage:', error);
            this.showMessage('Error saving data. Please try again.', 'error');
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pantryApp = new PantryPal();
});
