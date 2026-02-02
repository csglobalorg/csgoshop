const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

const PAYMENT_METHODS = {
  BKASH: 'bkash',
  NAGAD: 'nagad',
  ROCKET: 'rocket',
  BANK_TRANSFER: 'bank_transfer'
};

// Create order
const createOrder = async (req, res) => {
  try {
    const { items, delivery_address, payment_method, phone } = req.body;

    if (!items || !delivery_address || !payment_method || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Object.values(PAYMENT_METHODS).includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Calculate total
    let total = 0;
    for (let item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('sell_price')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        return res.status(404).json({ error: `Product ${item.product_id} not found` });
      }

      total += product.sell_price * item.quantity;
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert([
        {
          id: uuidv4(),
          user_id: req.user.id,
          items,
          total,
          status: 'pending_payment',
          payment_method,
          delivery_address,
          phone,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Order created',
      order,
      payment_instructions: getPaymentInstructions(payment_method)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get orders (based on role)
const getOrders = async (req, res) => {
  try {
    let query = supabase.from('orders').select('*');

    // Filter by user if not admin
    if (req.user.role === 'public_user') {
      query = query.eq('user_id', req.user.id);
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check permission
    if (req.user.role === 'public_user' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit payment (customer)
const submitPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { txn_id } = req.body;

    if (!txn_id) {
      return res.status(400).json({ error: 'Transaction ID required' });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'public_user' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        txn_id,
        status: 'payment_pending_verification',
        payment_submitted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Payment submitted for verification',
      order: updatedOrder
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify payment (Super Admin only)
const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, notes } = req.body;

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status: verified ? 'paid' : 'payment_failed',
        payment_verified_at: new Date().toISOString(),
        verification_notes: notes,
        verified_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: `Payment ${verified ? 'verified' : 'rejected'}`,
      order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update order status (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPaymentInstructions = (method) => {
  const instructions = {
    bkash: {
      method: 'bKash',
      steps: [
        'Open bKash App or go to *247#',
        'Select "Send Money"',
        'Enter CSGO SHOP Account: 01XXXXXXXXX',
        'Enter Amount',
        'Confirm Transaction',
        'Copy Transaction ID (TXN ID)',
        'Submit TXN ID in the order'
      ]
    },
    nagad: {
      method: 'Nagad',
      steps: [
        'Open Nagad App',
        'Select "Send Money"',
        'Enter CSGO SHOP Account: 88016XXXXXXXXX',
        'Enter Amount',
        'Confirm Transaction',
        'Copy Transaction ID (TXN ID)',
        'Submit TXN ID in the order'
      ]
    },
    rocket: {
      method: 'Rocket',
      steps: [
        'Open Rocket App or dial *711#',
        'Select "Send Money"',
        'Enter CSGO SHOP Account: 018XXXXXXXXX',
        'Enter Amount',
        'Confirm Transaction',
        'Copy Transaction ID (TXN ID)',
        'Submit TXN ID in the order'
      ]
    },
    bank_transfer: {
      method: 'Bank Transfer',
      steps: [
        'Bank: Bank Name',
        'Account: Account Number',
        'Routing: Routing Number',
        'Account Holder: CSGO SHOP',
        'Transfer Amount',
        'Note: Include Order ID in description',
        'Submit Transaction Reference'
      ]
    }
  };

  return instructions[method];
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  submitPayment,
  verifyPayment,
  updateOrderStatus,
  PAYMENT_METHODS
};
