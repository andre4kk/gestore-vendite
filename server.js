const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database SQLite
const db = new sqlite3.Database('/data/orders.db', (err) => {
  if (err) console.error('Errore connessione DB:', err.message);
  else console.log('Connesso al database SQLite.');
});

// Creazione Tabella
db.run(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_order_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  account_credentials TEXT NOT NULL,
  provider_order_id TEXT,
  status TEXT DEFAULT 'Inviato',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// API
app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/orders', (req, res) => {
  const { customer_order_id, customer_name, account_credentials, provider_order_id, status } = req.body;
  const sql = `INSERT INTO orders (customer_order_id, customer_name, account_credentials, provider_order_id, status) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [customer_order_id, customer_name, account_credentials, provider_order_id, status || 'Inviato'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.delete('/api/orders/:id', (req, res) => {
  db.run('DELETE FROM orders WHERE id = ?', req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: true });
  });
});

// Dashboard Frontend Single-Page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestione Ordini Account</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light p-4">
  <div class="container-fluid" style="max-width: 1200px;">
    <h2 class="mb-4 text-primary">📦 Gestore Ordini & Account</h2>

    <!-- Form Aggiunta -->
    <div class="card shadow-sm mb-4">
      <div class="card-header bg-white fw-bold">Aggiungi Nuovo Ordine</div>
      <div class="card-body">
        <form id="orderForm" class="row g-3">
          <div class="col-md-3">
            <label class="form-label">N° Ordine Cliente</label>
            <input type="text" id="custOrder" class="form-control" placeholder="#1001" required>
          </div>
          <div class="col-md-3">
            <label class="form-label">Cliente (Nome / Contact)</label>
            <input type="text" id="custName" class="form-control" placeholder="Mario Rossi / @telegram" required>
          </div>
          <div class="col-md-3">
            <label class="form-label">N° Ordine Provider</label>
            <input type="text" id="provOrder" class="form-control" placeholder="PROV-9921">
          </div>
          <div class="col-md-3">
            <label class="form-label">Stato</label>
            <select id="status" class="form-select">
              <option value="Consegnato">Consegnato</option>
              <option value="In attesa">In attesa</option>
              <option value="Problema">Problema</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label">Credenziali Account (User / Pass / Note)</label>
            <textarea id="credentials" class="form-control" rows="2" placeholder="user:pass123 | Note extra..." required></textarea>
          </div>
          <div class="col-12 text-end">
            <button type="submit" class="btn btn-success">Salva Ordine</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Ricerca e Tabella -->
    <div class="card shadow-sm">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <span class="fw-bold">Storico Ordini</span>
        <input type="text" id="searchInput" class="form-control form-control-sm w-25" placeholder="Cerca...">
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Ord. Cliente</th>
                <th>Cliente</th>
                <th>Credenziali</th>
                <th>Ord. Provider</th>
                <th>Stato</th>
                <th>Data</th>
                <th>Azione</th>
              </tr>
            </thead>
            <tbody id="ordersTable"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function loadOrders() {
      const res = await fetch('/api/orders');
      const data = await res.json();
      window.allOrders = data;
      renderTable(data);
    }

    function renderTable(orders) {
      const tbody = document.getElementById('ordersTable');
      tbody.innerHTML = orders.map(o => \`
        <tr>
          <td><strong>\${o.customer_order_id}</strong></td>
          <td>\${o.customer_name}</td>
          <td><code class="text-dark bg-light p-1 rounded d-inline-block" style="white-space: pre-wrap;">\${o.account_credentials}</code></td>
          <td><span class="badge bg-secondary">\${o.provider_order_id || 'N/D'}</span></td>
          <td><span class="badge bg-\${o.status === 'Consegnato' ? 'success' : o.status === 'Problema' ? 'danger' : 'warning'}">\${o.status}</span></td>
          <td><small class="text-muted">\${new Date(o.created_at).toLocaleString('it-IT')}</small></td>
          <td><button onclick="deleteOrder(\${o.id})" class="btn btn-outline-danger btn-sm">Elimina</button></td>
        </tr>
      \`).join('');
    }

    document.getElementById('orderForm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_order_id: document.getElementById('custOrder').value,
          customer_name: document.getElementById('custName').value,
          account_credentials: document.getElementById('credentials').value,
          provider_order_id: document.getElementById('provOrder').value,
          status: document.getElementById('status').value
        })
      });
      document.getElementById('orderForm').reset();
      loadOrders();
    };

    async function deleteOrder(id) {
      if(confirm('Cancellare questo ordine?')) {
        await fetch('/api/orders/' + id, { method: 'DELETE' });
        loadOrders();
      }
    }

    document.getElementById('searchInput').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = window.allOrders.filter(o => 
        o.customer_order_id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.account_credentials.toLowerCase().includes(q) ||
        (o.provider_order_id && o.provider_order_id.toLowerCase().includes(q))
      );
      renderTable(filtered);
    };

    loadOrders();
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));
