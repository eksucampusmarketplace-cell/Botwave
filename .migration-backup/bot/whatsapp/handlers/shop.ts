/**
 * E-Commerce (Shop) handler for WhatsApp.
 * Commands: !shop, !buy <product>, !cart, !checkout
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url?: string;
  active: boolean;
}

interface CartItem {
  product_id: string;
  quantity: number;
}

export interface ShopResult {
  text: string;
  imageUrl?: string;
}

const PAGE_SIZE = 10;

export async function handleShopCommand(
  sessionId: string,
  messageText: string,
  userJid: string,
  ownerJid: string
): Promise<ShopResult | null> {
  const text = messageText.trim().toLowerCase();

  if (text === '!shop') return listProducts(sessionId);
  if (text.startsWith('!buy ')) return buyProduct(sessionId, text.slice(5).trim(), userJid);
  if (text === '!cart') return viewCart(sessionId, userJid);
  if (text === '!checkout') return checkout(sessionId, userJid, ownerJid);

  return null;
}

async function listProducts(sessionId: string): Promise<ShopResult> {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', sessionId)
    .eq('active', true)
    .eq('platform', 'whatsapp')
    .limit(PAGE_SIZE);

  if (error || !products || products.length === 0) {
    return { text: 'No products available right now.' };
  }

  let text = '*Shop*\n\n';
  (products as Product[]).forEach((p, i) => {
    const stockText = p.stock === -1 ? 'Unlimited' : `${p.stock} left`;
    text += `${i + 1}. *${p.name}* — ${p.price.toFixed(2)}\n`;
    if (p.description) text += `   ${p.description}\n`;
    text += `   Stock: ${stockText}\n`;
    text += `   _Buy: !buy ${p.name}_\n\n`;
  });

  text += `Showing ${products.length} products. Use !buy <name> to add to cart.`;

  return { text };
}

async function buyProduct(sessionId: string, productName: string, userJid: string): Promise<ShopResult> {
  // Find product by name (case-insensitive)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', sessionId)
    .eq('active', true)
    .eq('platform', 'whatsapp')
    .ilike('name', productName);

  if (!products || products.length === 0) {
    return { text: `Product "${productName}" not found. Use !shop to see available products.` };
  }

  const product = products[0] as Product;

  // Check stock
  if (product.stock !== -1 && product.stock <= 0) {
    return { text: `Sorry, *${product.name}* is out of stock.` };
  }

  // Add to cart (upsert)
  const { data: existing } = await supabase
    .from('carts')
    .select('*')
    .eq('user_jid', userJid)
    .eq('product_id', product.id)
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    await supabase
      .from('carts')
      .update({ quantity: existing.quantity + 1 })
      .eq('user_jid', userJid)
      .eq('product_id', product.id)
      .eq('session_id', sessionId);
  } else {
    await supabase
      .from('carts')
      .insert({
        user_jid: userJid,
        product_id: product.id,
        session_id: sessionId,
        quantity: 1,
      });
  }

  // Decrement stock if not unlimited
  if (product.stock !== -1) {
    await supabase
      .from('products')
      .update({ stock: product.stock - 1 })
      .eq('id', product.id);
  }

  return {
    text: `Added *${product.name}* to your cart! (${product.price.toFixed(2)})\nUse !cart to view your cart or !checkout to order.`,
    imageUrl: product.image_url,
  };
}

async function viewCart(sessionId: string, userJid: string): Promise<ShopResult> {
  const { data: cartItems } = await supabase
    .from('carts')
    .select('*, products(*)')
    .eq('user_jid', userJid)
    .eq('session_id', sessionId);

  if (!cartItems || cartItems.length === 0) {
    return { text: 'Your cart is empty. Use !shop to browse products.' };
  }

  let text = '*Your Cart*\n\n';
  let total = 0;

  for (const item of cartItems) {
    const product = item.products as unknown as Product;
    if (!product) continue;
    const subtotal = product.price * item.quantity;
    total += subtotal;
    text += `- *${product.name}* x${item.quantity} — ${subtotal.toFixed(2)}\n`;
  }

  text += `\n*Total: ${total.toFixed(2)}*\n`;
  text += `\nUse !checkout to place your order.`;

  return { text };
}

async function checkout(sessionId: string, userJid: string, ownerJid: string): Promise<ShopResult> {
  const { data: cartItems } = await supabase
    .from('carts')
    .select('*, products(*)')
    .eq('user_jid', userJid)
    .eq('session_id', sessionId);

  if (!cartItems || cartItems.length === 0) {
    return { text: 'Your cart is empty. Nothing to checkout.' };
  }

  let total = 0;
  const items: { name: string; quantity: number; price: number }[] = [];

  for (const item of cartItems) {
    const product = item.products as unknown as Product;
    if (!product) continue;
    const subtotal = product.price * item.quantity;
    total += subtotal;
    items.push({ name: product.name, quantity: item.quantity, price: subtotal });
  }

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_jid: userJid,
      session_id: sessionId,
      items,
      total,
      status: 'pending',
    })
    .select()
    .single();

  if (orderError) {
    console.error('[WA-SHOP] Order creation failed:', orderError);
    return { text: 'Failed to create order. Please try again.' };
  }

  // Clear cart
  await supabase
    .from('carts')
    .delete()
    .eq('user_jid', userJid)
    .eq('session_id', sessionId);

  let text = '*Order Confirmed!*\n\n';
  text += `Order ID: ${order.id.slice(0, 8)}\n`;
  for (const item of items) {
    text += `- ${item.name} x${item.quantity} — ${item.price.toFixed(2)}\n`;
  }
  text += `\n*Total: ${total.toFixed(2)}*\n`;
  text += `\nThe seller has been notified. They will contact you soon.`;

  return { text };
}
