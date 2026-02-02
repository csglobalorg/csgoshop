const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const { getIconForCategory } = require('../utils/categoryIconMap');

// Get all products (with role-based pricing and category info)
const getProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = supabase.from('products').select('*, categories(name)');

    if (category) {
      query = query.eq('category_id', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, error } = await query.eq('is_active', true);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Filter pricing based on user role and add category icons
    const filteredProducts = products.map(product => {
      const categoryName = product.categories?.name || 'Physical Products';
      const categoryIcon = getIconForCategory(categoryName);
      
      const filtered = {
        id: product.id,
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        category_name: categoryName,
        category_icon: categoryIcon,
        sku: product.sku,
        stock: product.stock,
        images: product.images,
        sell_price: product.sell_price
      };

      // Show factory price only to Admin/Members
      if (req.user && ['super_admin', 'internal_member'].includes(req.user.role)) {
        filtered.factory_price = product.factory_price;
        filtered.profit = product.profit;
        filtered.profit_percentage = ((product.profit / product.factory_price) * 100).toFixed(2);
      }

      return filtered;
    });

    res.json(filteredProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Add category icon
    const categoryName = product.categories?.name || 'Physical Products';
    product.category_name = categoryName;
    product.category_icon = getIconForCategory(categoryName);

    // Filter based on role
    if (req.user && !['super_admin', 'internal_member'].includes(req.user.role)) {
      delete product.factory_price;
      delete product.profit;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create product (Super Admin only)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      category_id,
      description,
      factory_price,
      sell_price,
      sku,
      stock,
      images = []
    } = req.body;

    if (!name || !category_id || !factory_price || !sell_price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const profit = sell_price - factory_price;

    const { data: product, error } = await supabase
      .from('products')
      .insert([
        {
          id: uuidv4(),
          name,
          category_id,
          description,
          factory_price,
          sell_price,
          profit,
          sku: sku || uuidv4(),
          stock: stock || 0,
          images,
          created_by: req.user.id,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product (Super Admin only)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Calculate profit if prices updated
    if (updates.factory_price || updates.sell_price) {
      const factory = updates.factory_price;
      const sell = updates.sell_price;
      if (factory && sell) {
        updates.profit = sell - factory;
      }
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete product (Super Admin only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
