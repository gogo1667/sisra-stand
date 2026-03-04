import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Item = {
  id: string
  name: string
  price: number
  category: 'main' | 'side' | 'drink'
}

type LineItem = {
  id: string
  name: string
  price: number
  quantity: number
}

const ITEMS: Item[] = [
  // mains
  { id: 'hotdog', name: 'Hot Dog', price: 3.0, category: 'main' },
  { id: 'brat', name: 'Brat', price: 4.0, category: 'main' },
  { id: 'porksteak', name: 'Pork Steak', price: 6.0, category: 'main' },
  { id: 'hamburger', name: 'Hamburger', price: 5.0, category: 'main' },
  { id: 'cheeseburger', name: 'Cheeseburger', price: 5.5, category: 'main' },
  // sides
  { id: 'beans', name: 'Beans', price: 1.5, category: 'side' },
  { id: 'coleslaw', name: 'Cole Slaw', price: 1.5, category: 'side' },
  { id: 'chips', name: 'Chips', price: 1.5, category: 'side' },
  // drinks
  { id: 'water', name: 'Water', price: 1.0, category: 'drink' },
  { id: 'soda', name: 'Soda', price: 2.0, category: 'drink' },
]

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

function App() {
  const [cart, setCart] = useState<Record<string, LineItem>>({})
  const [cashGiven, setCashGiven] = useState<string>('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const [sales, setSales] = useState<
    { timestamp: string; itemId: string; itemName: string; quantity: number; priceEach: number; total: number }[]
  >([])

  const cartItems = useMemo(() => Object.values(cart), [cart])

  const mains = useMemo(
    () => ITEMS.filter((i) => i.category === 'main').slice().sort((a, b) => a.name.localeCompare(b.name)),
    []
  )
  const sides = useMemo(
    () => ITEMS.filter((i) => i.category === 'side').slice().sort((a, b) => a.name.localeCompare(b.name)),
    []
  )
  const drinks = useMemo(
    () => ITEMS.filter((i) => i.category === 'drink').slice().sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  )

  const parsedCashGiven = parseFloat(cashGiven || '0')
  const isCashValid = !Number.isNaN(parsedCashGiven) && parsedCashGiven >= 0
  const changeDue = isCashValid ? parsedCashGiven - subtotal : 0

  const canCompleteSale = subtotal > 0 && isCashValid && parsedCashGiven >= subtotal

  const handleAddItem = (item: Item) => {
    setCart((prev) => {
      const existing = prev[item.id]
      const quantity = existing ? existing.quantity + 1 : 1
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity,
        },
      }
    })
  }

  const handleRemoveOne = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId]
      if (!existing) return prev
      const quantity = existing.quantity - 1
      if (quantity <= 0) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity },
      }
    })
  }

  const handleClearCart = () => {
    setCart({})
    setCashGiven('')
    setMenuOpen(false)
  }

  const handleCompleteSale = () => {
    if (!canCompleteSale || cartItems.length === 0) return

    const now = new Date().toISOString()
    const saleLines = cartItems.map((item) => ({
      timestamp: now,
      itemId: item.id,
      itemName: item.name,
      quantity: item.quantity,
      priceEach: item.price,
      total: item.price * item.quantity,
    }))

    setSales((prev) => [...prev, ...saleLines])
    setCart({})
    setCashGiven('')
    setMenuOpen(false)
  }

  const handleDownloadCsv = () => {
    if (sales.length === 0) return

    const header = ['timestamp', 'itemId', 'itemName', 'quantity', 'priceEach', 'total']
    const rows = sales.map((s) => [
      s.timestamp,
      s.itemId,
      s.itemName,
      s.quantity.toString(),
      s.priceEach.toFixed(2),
      s.total.toFixed(2),
    ])

    const csvLines = [header, ...rows].map((cols) =>
      cols
        .map((col) => {
          const str = String(col)
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
        })
        .join(',')
    )

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `sisra-sales-${today}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setMenuOpen(false)
  }

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    setMenuOpen(false)
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>SISRA Stand</h1>
        <div className="app-header-right">
          <button
            type="button"
            className="menu-trigger"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-icon">
              <span />
              <span />
              <span />
            </span>
          </button>
          {menuOpen && (
            <div className="app-menu">
              <button
                type="button"
                className="menu-item"
                onClick={handleToggleTheme}
              >
                {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={handleDownloadCsv}
                disabled={sales.length === 0}
              >
                Download CSV
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="layout">
        <section className="items-panel">
          <h2>Items</h2>
          <div className="item-groups">
            <div className="item-group">
              <div className="item-group-header">Main dishes</div>
              <div className="item-grid">
                {mains.map((item) => (
                  <button
                    key={item.id}
                    className="item-button"
                    type="button"
                    onClick={() => handleAddItem(item)}
                  >
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{formatCurrency(item.price)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="item-group">
              <div className="item-group-header">Side dishes</div>
              <div className="item-grid">
                {sides.map((item) => (
                  <button
                    key={item.id}
                    className="item-button"
                    type="button"
                    onClick={() => handleAddItem(item)}
                  >
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{formatCurrency(item.price)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="item-group">
              <div className="item-group-header">Drinks</div>
              <div className="item-grid">
                {drinks.map((item) => (
                  <button
                    key={item.id}
                    className="item-button"
                    type="button"
                    onClick={() => handleAddItem(item)}
                  >
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{formatCurrency(item.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="checkout-panel">
          <h2>Current Order</h2>

          <table className="cart-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Each</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr className="cart-placeholder-row">
                  <td colSpan={5} className="empty-cart">
                    No items yet. Tap buttons to add.
                  </td>
                </tr>
              ) : (
                cartItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{formatCurrency(item.price * item.quantity)}</td>
                    <td>
                      <button
                        type="button"
                        className="small-button"
                        onClick={() => handleRemoveOne(item.id)}
                      >
                        −
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Subtotal</td>
                <td>{formatCurrency(subtotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>

          <div className="payment-row">
            <label>
              Cash given
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder="0.00"
              />
            </label>

            <div className="change-display">
              <span>Change due</span>
              <strong>
                {subtotal === 0 || !isCashValid
                  ? formatCurrency(0)
                  : formatCurrency(Math.max(0, changeDue))}
              </strong>
              {isCashValid && parsedCashGiven < subtotal && subtotal > 0 && (
                <span className="warning">Not enough cash</span>
              )}
            </div>
          </div>

          <div className="actions-row">
            <button
              type="button"
              className="secondary-button"
              onClick={handleClearCart}
              disabled={cartItems.length === 0 && !cashGiven}
            >
              Clear
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleCompleteSale}
              disabled={!canCompleteSale}
            >
              Complete Sale
            </button>
          </div>

          <div className="sales-footer">
            <span>Sales this session: {sales.length} line(s)</span>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
