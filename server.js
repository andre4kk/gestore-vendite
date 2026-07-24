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
  db.run(sql, [customer_order_id, customer_name, account_credentials, provider_order_id, status || 'Consegnato'], function(err) {
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

// Dashboard Frontend Single-Page con Tema Scuro Moderno
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="it" data-bs-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestione Ordini Account</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  <style>
    body {
      background-color: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    }
    .card-header {
      background-color: #1e293b;
      border-bottom: 1px solid #334155;
      border-radius: 12px 12px 0 0 !important;
    }
    .form-control, .form-select {
      background-color: #0f172a;
      border: 1px solid #334155;
      color: #f8fafc;
      border-radius: 8px;
    }
    .form-control:focus, .form-select:focus {
      background-color: #0f172a;
      border-color: #38bdf8;
      color: #f8fafc;
      box-shadow: 0 0 0 0.25rem rgba(56, 189, 248, 0.25);
    }
    .table {
      --bs-table-bg: transparent;
      --bs-table-color: #f8fafc;
      margin-bottom: 0;
    }
    .table th {
      background-color: #0f172a;
      color: #94a3b8;
      border-bottom: 1px solid #334155;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .table td {
      border-bottom: 1px solid #334155;
    }
    code.credential-box {
      background-color: #0f172a !important;
      color: #38bdf8 !important;
      border: 1px solid #334155;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      font-family: 'Fira Code', monospace;
      font-size: 0.875rem;
    }
    .badge-provider {
      background-color: #334155;
      color: #cbd5e1;
      font-weight: 500;
    }
  </style>
</head>
<body class="p-3 p-md-4">
  <div class="container-fluid" style="max-width: 1280px;">
    
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h3 class="fw-bold m-0 text-info"><i class="bi bi-box-seam me-2"></i>Gestore Ordini & Account</h3>
      <span class="badge bg-dark border border-secondary text-secondary px-3 py-2">Pro System v1.0</span>
    </div>

    <!-- Form Aggiunta -->
    <div class="card mb-4">
      <div class="card-header fw-bold text-light d-flex align-items-center">
        <i class="bi bi-plus-circle me-2 text-info"></i> Aggiungi Nuovo Ordine
      </div>
      <div class="card-body">
        <form id="orderForm" class="row g-3">
          <div class="col-md-3">
            <label class="form-label text-secondary small">N° Ordine Cliente</label>
            <input type="text" id="custOrder" class="form-control" placeholder="#1001" required>
          </div>
          <div class="col-md-3">
            <label class="form-label text-secondary small">Cliente (Nome / Contact)</label>
            <input type="text" id="custName" class="form-control" placeholder="Mario Rossi / @telegram" required>
          </div>
          <div class="col-md-3">
            <label class="form-label text-secondary small">N° Ordine Provider</label>
            <input type="text" id="provOrder" class="form-control" placeholder="PROV-9921">
          </div>
          <div class="col-md-3">
            <label class="form-label text-secondary small">Stato</label>
            <select id="status" class="form-select">
              <option value="Consegnato">Consegnato</option>
              <option value="In attesa">In attesa</option>
              <option value="Problema">Problema</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label text-secondary small">Credenziali Account (User / Pass / Note)</label>
            <textarea id="credentials" class="form-control" rows="2" placeholder="user:pass123 | Note extra..." required></textarea>
          </div>
          <div class="col-12 text-end">
            <button type="submit" class="btn btn-info px-4 fw-semibold"><i class="bi bi-check-lg me-1"></i>Salva Ordine</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Ricerca e Tabella -->
    <div class="card">
      <div class="card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <span class="fw-bold text-light"><i class="bi bi-list-task me-2 text-info"></i>Storico Ordini</span>
        <div class="input-group style="max-width: 300px;">
          <span class="input-group-text bg-dark border-secondary text-secondary"><i class="bi bi-search"></i></span>
          <input type="text" id="searchInput" class="form-control form-control-sm" placeholder="Cerca ordine, cliente, credenziali...">
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th>Ord. Cliente</th>
                <th>Cliente</th>
                <th>Credenziali</th>
                <th>Ord. Provider</th>
                <th>Stato</th>
                <th>Data</th>
                <th class="text-end">Azione</th>
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
      if(orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Nessun ordine trovato</td></tr>';
        return;
      }
      tbody.innerHTML = orders.map(o => \`
        <tr>
          <td><strong class="text-light">\${o.customer_order_id}</strong></td>
          <td><span class="text-slate-300">\${o.customer_name}</span></td>
          <td><code class="credential-box d-inline-block" style="white-space: pre-wrap;">\${o.account_credentials}</code></td>
          <td><span class="badge badge-provider">\${o.provider_order_id || 'N/D'}</span></td>
          <td>
            <span class="badge bg-\${o.status === 'Consegnato' ? 'success' : o.status === 'Problema' ? 'danger' : 'warning'} bg-opacity-20 text-\${o.status === 'Consegnato' ? 'success' : o.status === 'Problema' ? 'danger' : 'warning'} border border-\${o.status === 'Consegnato' ? 'success' : o.status === 'Problema' ? 'danger' : 'warning'} border-opacity-25 px-2 py-1">
              \${o.status}
            </span>
          </td>
          <td><small class="text-secondary">\${new Date(o.created_at).toLocaleString('it-IT')}</small></td>
          <td class="text-end">
            <button onclick="deleteOrder(\${o.id})" class="btn btn-outline-danger btn-sm border-0"><i class="bi bi-trash"></i></button>
          </td>
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
      if(confirm('Cancellare questo ordine dallo storico?')) {
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
