import { useMemo, useState } from 'react'
import './App.css'

type Item = {
  id: string
  name: string
  price: number
}

type LineItem = {
  id: string
  name: string
  price: number
  quantity: number
}

const ITEMS: Item[] = [
  { id: 'hotdog', name: 'Hot Dog', price: 3.0 },
  { id: 'burger', name: 'Burger', price: 5.0 },
  { id: 'sprite', name: 'Sprite', price: 2.0 },
  { id: 'water', name: 'Water', price: 1.5 },
  { id: 'chips', name: 'Chips', price: 1.5 },
]

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

function App() {
  const [cart, setCart] = useState<Record<string, LineItem>>({})
  const [cashGiven, setCashGiven] = useState<string>('')
  const [sales, setSales] = useState<
    { timestamp: string; itemId: string; itemName: string; quantity: number; priceEach: number; total: number }[]
  >([])

  const cartItems = useMemo(() => Object.values(cart), [cart])

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
    // Reset cart but keep the cash field so you can see what you typed
    setCart({})
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
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>SISRA Stand</h1>
        <p>Tap items, take cash, see change, export CSV.</p>
      </header>

      <main className="layout">
        <section className="items-panel">
          <h2>Items</h2>
          <div className="item-grid">
            {ITEMS.map((item) => (
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
        </section>

        <section className="checkout-panel">
          <h2>Current Order</h2>

          {cartItems.length === 0 ? (
            <p className="empty-cart">No items yet. Tap buttons to add.</p>
          ) : (
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
                {cartItems.map((item) => (
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
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Subtotal</td>
                  <td>{formatCurrency(subtotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}

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
            <button
              type="button"
              className="secondary-button"
              onClick={handleDownloadCsv}
              disabled={sales.length === 0}
            >
              Download CSV
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
