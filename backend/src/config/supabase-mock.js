// Mock Supabase client for development/testing
const mockProducts = [
    {
        id: 1,
        name: 'Gaming Laptop',
        description: 'High-performance gaming laptop',
        price: 1200,
        category_id: 2,
        category_name: "Physical Products",
        category_icon: "Physical Product.png",
        image: "gaming-laptop.jpg"
    },
    {
        id: 2,
        name: 'USB-C Cable',
        description: 'Premium USB-C charging cable',
        price: 25,
        category_id: 2,
        category_name: "Physical Products",
        category_icon: "Physical Product.png",
        image: "usb-c-cable.jpg"
    },
    {
        id: 3,
        name: 'WordPress Plugin',
        description: 'Premium WordPress plugin license',
        price: 50,
        category_id: 1,
        category_name: "Digital Products",
        category_icon: "Digital-Product.png",
        image: "wordpress-plugin.jpg"
    }
];

const mockCategories = [
    { id: 1, name: "Digital Products", icon: "Digital-Product.png" },
    { id: 2, name: "Physical Products", icon: "Physical Product.png" },
    { id: 3, name: "Men's Fashion", icon: "Mens-fashion.png" },
    { id: 4, name: "Women's Fashion", icon: "Womens-fashion.png" },
];

const mockOrders = [
    { id: 1, user_id: 1, total: 1250, status: 'completed', created_at: new Date().toISOString() }
];

const mockUsers = [
    { id: 1, email: 'user@example.com', name: 'Test User', role: 'customer' },
    { id: 2, email: 'admin@example.com', name: 'Admin', role: 'admin' }
];

const mockSupabase = {
    from: (table) => ({
        select: (columns = '*') => ({
            data: null,
            error: null,
            then: async (callback) => {
                let data = [];
                
                if (table === 'products') {
                    data = mockProducts;
                } else if (table === 'categories') {
                    data = mockCategories;
                } else if (table === 'orders') {
                    data = mockOrders;
                } else if (table === 'users') {
                    data = mockUsers;
                }
                
                callback({ data, error: null });
                return { data, error: null };
            }
        }),
        insert: (records) => ({
            then: async (callback) => {
                callback({ data: records, error: null });
                return { data: records, error: null };
            }
        }),
        update: (updates) => ({
            eq: (column, value) => ({
                then: async (callback) => {
                    callback({ data: updates, error: null });
                    return { data: updates, error: null };
                }
            })
        }),
        delete: () => ({
            eq: (column, value) => ({
                then: async (callback) => {
                    callback({ data: { deleted: true }, error: null });
                    return { data: { deleted: true }, error: null };
                }
            })
        })
    }),
    auth: {
        signUp: async (user) => ({ data: user, error: null }),
        signInWithPassword: async (credentials) => ({ 
            data: { user: mockUsers[1], session: { access_token: 'mock-token' } }, 
            error: null 
        }),
        signOut: async () => ({ error: null })
    }
};

module.exports = mockSupabase;
