'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  active: boolean;
  created_at: string;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/user/products', { credentials: 'include' });
    const data = await res.json();
    if (res.status === 403) {
      setError(data.error || 'Upgrade required');
    } else if (data.success) {
      setProducts(data.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleCreate = async () => {
    setError('');
    if (!name || !price) { setError('Name and price are required'); return; }

    const res = await fetch('/api/user/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name,
        description,
        price: Number(price),
        stock: stock ? Number(stock) : -1,
      }),
    });

    const data = await res.json();
    if (!data.success) { setError(data.error); return; }

    setProducts([data.data, ...products]);
    setName('');
    setDescription('');
    setPrice('');
    setStock('');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/user/products?id=${id}`, { method: 'DELETE', credentials: 'include' });
    setProducts(products.filter((p) => p.id !== id));
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Shop / E-Commerce
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Sell products directly through WhatsApp conversations
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                {showHelp ? 'Hide Guide' : '? How It Works'}
              </button>
              {!error && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                >
                  {showForm ? 'Cancel' : '+ Add Product'}
                </button>
              )}
            </div>
          </div>

          {/* How it works guide */}
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-5 rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>How E-Commerce Works</h3>
              <div className="space-y-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p>Add products here, and your customers can browse, order, and checkout entirely through WhatsApp messages. No website needed.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>The customer flow:</p>
                    <div className="space-y-2">
                      {[
                        { step: '1', cmd: '!shop', desc: 'Customer sees your product catalog with prices' },
                        { step: '2', cmd: '!buy T-Shirt', desc: 'Adds the T-Shirt to their cart' },
                        { step: '3', cmd: '!cart', desc: 'Views everything in their cart with total' },
                        { step: '4', cmd: '!checkout', desc: 'Places the order. You get notified.' },
                      ].map((s) => (
                        <div key={s.step} className="flex gap-2 items-start">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{s.step}</span>
                          <div>
                            <code className="text-emerald-400">{s.cmd}</code>
                            <p style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>As the shop owner you:</p>
                    <ul className="space-y-1.5">
                      <li>Add products with name, price, description, and stock from this page</li>
                      <li>Set stock to unlimited or a specific number</li>
                      <li>Stock decreases automatically when orders are placed</li>
                      <li>You get a WhatsApp notification when someone places an order</li>
                      <li>Manage products (add/remove) anytime from this dashboard</li>
                    </ul>
                    <div className="mt-3 p-2 rounded-lg" style={{ background: 'var(--bg)' }}>
                      <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Tip: Pair with chatbot flows for an automated ordering experience</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {error && !showForm ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">🛒</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                E-commerce features require Boss plan.
              </p>
              <a href="/dashboard/pricing" className="inline-block mt-3 px-4 py-2 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors">
                View Plans
              </a>
            </div>
          ) : null}

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl mb-6 border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              {error && showForm && (
                <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Product Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. BotWave T-Shirt"
                      className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                      style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Price (NGN) <span style={{ color: 'var(--text-muted)' }}>customers see this in !shop</span>
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                      style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Description <span style={{ color: 'var(--text-muted)' }}>(shown when customer asks about the product)</span></label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Product description... customers see this when they view details"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Stock <span style={{ color: 'var(--text-muted)' }}>(leave empty for unlimited, or enter a number)</span>
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                </div>
                <button
                  onClick={handleCreate}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  Add Product
                </button>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : !error && products.length === 0 && !showForm ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">🛍️</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No products yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Add products and your customers can browse and order via WhatsApp
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Customers use <code className="text-emerald-400">!shop</code> to browse, <code className="text-emerald-400">!buy [item]</code> to order
              </p>
            </div>
          ) : !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-xl border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                      <p className="text-xl font-bold text-emerald-400 mt-1">
                        {'\u20A6'}{p.price.toLocaleString()}
                      </p>
                      {p.description && (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Stock: {p.stock === -1 ? 'Unlimited' : p.stock}
                        </p>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${p.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {p.active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:text-red-400 hover:border-red-500/30 shrink-0"
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Bot commands info - always visible */}
          {!error && (
            <div className="mt-8 p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>WhatsApp Shopping Commands</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { cmd: '!shop', desc: 'Browse product catalog' },
                  { cmd: '!buy [item]', desc: 'Add item to cart' },
                  { cmd: '!cart', desc: 'View cart and total' },
                  { cmd: '!checkout', desc: 'Place order' },
                ].map((c) => (
                  <div key={c.cmd} className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                    <code className="text-xs text-emerald-400 font-mono">{c.cmd}</code>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
