import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "genevieve-budget-compass-v2";
const LEGACY_KEY = "genevieve-budget-data";

const STARTER_CATEGORIES = [
  ["Housing", 0],
  ["Groceries", 0],
  ["Transport", 0],
  ["Utilities", 0],
  ["Health", 0],
  ["Pets", 0],
  ["Personal", 0],
  ["Savings", 0],
];

const emptyData = () => ({
  version: 2,
  months: {},
  categories: [],
  transactions: [],
});

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function shiftMonth(key, delta) {
  const d = parseMonth(key);
  d.setMonth(d.getMonth() + delta);
  return monthKey(d);
}

function formatMonth(key) {
  return parseMonth(key).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function statusFor(spent, budget) {
  if (!budget || budget <= 0) return "neutral";
  const ratio = spent / budget;
  if (ratio > 1) return "red";
  if (ratio >= 0.8) return "amber";
  return "green";
}

function loadStoredData() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return JSON.parse(current);

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return emptyData();
    const old = JSON.parse(legacy);
    const currentMonth = monthKey();
    return {
      version: 2,
      months: { [currentMonth]: { income: Number(old.income) || 0 } },
      categories: (old.categories || []).map((c) => ({
        id: c.id || uid("cat"),
        name: c.name,
        defaultBudget: Number(c.budget) || 0,
      })),
      transactions: (old.transactions || []).map((t) => ({
        ...t,
        id: t.id || uid("tx"),
        month: t.date?.slice(0, 7) || currentMonth,
      })),
    };
  } catch {
    return emptyData();
  }
}

function saveStoredData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function App() {
  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [txCategory, setTxCategory] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const importRef = useRef(null);

  useEffect(() => {
    setData(loadStoredData());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveStoredData(data);
  }, [data, loaded]);

  useEffect(() => {
    const current = monthKey();
    if (selectedMonth === current) setTxDate(new Date().toISOString().slice(0, 10));
    else setTxDate(`${selectedMonth}-01`);
  }, [selectedMonth]);

  const monthRecord = data.months[selectedMonth] || { income: 0 };
  const income = Number(monthRecord.income) || 0;

  const monthTransactions = useMemo(
    () => data.transactions.filter((t) => (t.month || t.date?.slice(0, 7)) === selectedMonth),
    [data.transactions, selectedMonth]
  );

  const rows = useMemo(
    () =>
      data.categories.map((category) => {
        const budgetOverride = monthRecord.budgets?.[category.id];
        const budget = budgetOverride === undefined ? Number(category.defaultBudget) || 0 : Number(budgetOverride) || 0;
        const spent = monthTransactions
          .filter((t) => t.categoryId === category.id)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        return { ...category, budget, spent, status: statusFor(spent, budget) };
      }),
    [data.categories, monthRecord.budgets, monthTransactions]
  );

  const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const cashRemaining = income - totalSpent;
  const unallocated = income - totalBudget;
  const plannedRemaining = totalBudget - totalSpent;
  const overallStatus = income > 0 ? statusFor(totalSpent, income) : statusFor(totalSpent, totalBudget);

  const insights = useMemo(() => {
    const list = [];
    const overspent = rows.filter((r) => r.budget > 0 && r.spent > r.budget).sort((a, b) => b.spent - b.budget - (a.spent - a.budget));
    overspent.forEach((r) => list.push({ status: "red", text: `${r.name} is ${money(r.spent - r.budget)} over its plan.` }));

    rows
      .filter((r) => r.budget > 0 && r.spent <= r.budget && r.spent / r.budget >= 0.8)
      .forEach((r) => list.push({ status: "amber", text: `${r.name} has ${money(r.budget - r.spent)} remaining in its plan.` }));

    if (income > 0 && unallocated < 0) {
      list.unshift({ status: "red", text: `Your category plans exceed income by ${money(Math.abs(unallocated))}.` });
    } else if (income > 0 && unallocated > 0) {
      list.push({ status: "green", text: `${money(unallocated)} of income is not yet assigned to a category.` });
    }

    if (income > 0 && totalSpent > income) {
      list.unshift({ status: "red", text: `Recorded spending is ${money(totalSpent - income)} above recorded income for this month.` });
    }

    if (!list.length) {
      list.push({ status: "green", text: rows.length ? "No category is currently near or over its plan." : "Add categories to start building your monthly plan." });
    }
    return list.slice(0, 6);
  }, [rows, income, unallocated, totalSpent]);

  function updateMonth(patch) {
    setData((prev) => ({
      ...prev,
      months: {
        ...prev.months,
        [selectedMonth]: { ...(prev.months[selectedMonth] || {}), ...patch },
      },
    }));
  }

  function setIncome(value) {
    updateMonth({ income: value === "" ? 0 : Number(value) });
  }

  function addCategory() {
    const name = newCategoryName.trim();
    const budget = Number(newCategoryBudget) || 0;
    if (!name) return;
    setData((prev) => ({
      ...prev,
      categories: [...prev.categories, { id: uid("cat"), name, defaultBudget: budget }],
    }));
    setNewCategoryName("");
    setNewCategoryBudget("");
    setShowAddCategory(false);
  }

  function addStarterCategories() {
    setData((prev) => {
      const existing = new Set(prev.categories.map((c) => c.name.toLowerCase()));
      const additions = STARTER_CATEGORIES.filter(([name]) => !existing.has(name.toLowerCase())).map(([name, defaultBudget]) => ({
        id: uid("cat"),
        name,
        defaultBudget,
      }));
      return { ...prev, categories: [...prev.categories, ...additions] };
    });
  }

  function updateCategory(category, name, budget) {
    const cleanName = name.trim();
    if (!cleanName) return;
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === category.id ? { ...c, name: cleanName, defaultBudget: Number(budget) || 0 } : c)),
    }));
    setEditingCategory(null);
  }

  function setMonthBudget(categoryId, value) {
    updateMonth({
      budgets: {
        ...(monthRecord.budgets || {}),
        [categoryId]: Number(value) || 0,
      },
    });
  }

  function useDefaultBudget(categoryId) {
    const budgets = { ...(monthRecord.budgets || {}) };
    delete budgets[categoryId];
    updateMonth({ budgets });
  }

  function deleteCategory(categoryId) {
    const category = data.categories.find((c) => c.id === categoryId);
    if (!window.confirm(`Delete ${category?.name || "this category"} and all of its recorded transactions?`)) return;
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== categoryId),
      transactions: prev.transactions.filter((t) => t.categoryId !== categoryId),
    }));
  }

  function addTransaction() {
    const amount = Number(txAmount);
    if (!txCategory || !amount || amount <= 0 || !txDate) return;
    const txMonth = txDate.slice(0, 7);
    setData((prev) => ({
      ...prev,
      transactions: [
        ...prev.transactions,
        {
          id: uid("tx"),
          categoryId: txCategory,
          amount,
          note: txNote.trim(),
          date: txDate,
          month: txMonth,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setTxAmount("");
    setTxNote("");
    if (txMonth !== selectedMonth) setSelectedMonth(txMonth);
  }

  function deleteTransaction(id) {
    setData((prev) => ({ ...prev, transactions: prev.transactions.filter((t) => t.id !== id) }));
  }

  function copyPlanFromPreviousMonth() {
    const previous = shiftMonth(selectedMonth, -1);
    const previousRecord = data.months[previous];
    if (!previousRecord) return;
    updateMonth({
      income: previousRecord.income || 0,
      budgets: { ...(previousRecord.budgets || {}) },
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genevieve-budget-backup-${selectedMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.transactions) || typeof parsed.months !== "object") throw new Error("Invalid backup");
      if (!window.confirm("Replace the current budget with this backup?")) return;
      setData({ ...emptyData(), ...parsed, version: 2 });
    } catch {
      window.alert("That file is not a valid GENEVIEVE Budget Compass backup.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  function resetAll() {
    if (!window.confirm("Clear all budget data on this device? This cannot be undone unless you exported a backup.")) return;
    setData(emptyData());
    localStorage.removeItem(LEGACY_KEY);
  }

  if (!loaded) return null;

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">GENEVIEVE · BUDGET COMPASS</p>
          <h1>See the month clearly.</h1>
          <p className="hero-copy">Plan it, record it, and see what is changing before money disappears into the month.</p>
        </div>
        <div className="privacy-pill"><ShieldCheck size={15} /> Stored on this device</div>
      </header>

      <section className="month-switcher" aria-label="Choose budget month">
        <button className="icon-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))} aria-label="Previous month"><ArrowLeft size={18} /></button>
        <div><span className="small-label">Budget month</span><strong>{formatMonth(selectedMonth)}</strong></div>
        <button className="icon-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))} aria-label="Next month"><ArrowRight size={18} /></button>
      </section>

      <section className={`summary-card status-${overallStatus}`}>
        <div className="summary-row income-row">
          <span><span className="small-label">Income</span><small>for {formatMonth(selectedMonth)}</small></span>
          <label className="money-input-wrap"><span>$</span><input type="number" inputMode="decimal" min="0" step="0.01" value={income || ""} onChange={(e) => setIncome(e.target.value)} placeholder="0.00" aria-label="Monthly income" /></label>
        </div>
        <div className="metric-grid">
          <article><span className="small-label">Planned</span><strong>{money(totalBudget)}</strong><small>{income > 0 ? `${money(unallocated)} unallocated` : "Across categories"}</small></article>
          <article><span className="small-label">Spent</span><strong>{money(totalSpent)}</strong><small>{money(plannedRemaining)} vs plan</small></article>
          <article className="metric-focus"><span className="small-label">Cash remaining</span><strong className={cashRemaining < 0 ? "negative" : ""}>{money(cashRemaining)}</strong><small>Income minus recorded spending</small></article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head"><div><p className="section-kicker">Plan</p><h2>Categories</h2></div><button className="text-button" onClick={() => setShowAddCategory((v) => !v)}><Plus size={15} /> Add</button></div>

        {showAddCategory && (
          <div className="panel form-grid">
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category name" />
            <input type="number" inputMode="decimal" min="0" step="0.01" value={newCategoryBudget} onChange={(e) => setNewCategoryBudget(e.target.value)} placeholder="Default monthly plan ($)" />
            <button className="primary-button" onClick={addCategory}><Plus size={15} /> Create category</button>
          </div>
        )}

        {!data.categories.length ? (
          <div className="empty-state"><CircleDollarSign size={28} /><strong>Build your monthly map</strong><p>Add your own categories or start with a simple set and change them anytime.</p><button className="secondary-button" onClick={addStarterCategories}>Add starter categories</button></div>
        ) : (
          <div className="category-list">
            {rows.map((category) => {
              const percent = category.budget > 0 ? Math.min(100, (category.spent / category.budget) * 100) : 0;
              const open = expandedCategory === category.id;
              const categoryTransactions = monthTransactions.filter((t) => t.categoryId === category.id).sort((a, b) => b.date.localeCompare(a.date));
              const overridden = monthRecord.budgets?.[category.id] !== undefined;
              return (
                <article className="category-card" key={category.id}>
                  <button className="category-top" onClick={() => setExpandedCategory(open ? null : category.id)}>
                    <span className={`status-dot ${category.status}`} />
                    <span className="category-name">{category.name}</span>
                    <span className="category-amount"><b>{money(category.spent)}</b> / {money(category.budget)}</span>
                    {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                  </button>
                  <div className="progress-track"><div className={`progress-fill ${category.status}`} style={{ width: `${percent}%` }} /></div>
                  {open && (
                    <div className="category-detail">
                      <div className="budget-editor">
                        <label><span className="small-label">Plan for this month</span><input type="number" min="0" step="0.01" value={category.budget} onChange={(e) => setMonthBudget(category.id, e.target.value)} /></label>
                        {overridden && <button className="mini-button" onClick={() => useDefaultBudget(category.id)}><RotateCcw size={13} /> Use default</button>}
                        <button className="mini-button" onClick={() => setEditingCategory(category)}><Pencil size={13} /> Edit category</button>
                        <button className="mini-button danger" onClick={() => deleteCategory(category.id)}><Trash2 size={13} /> Delete</button>
                      </div>
                      {editingCategory?.id === category.id && <CategoryEditor category={editingCategory} onSave={updateCategory} onCancel={() => setEditingCategory(null)} />}
                      <div className="transaction-list">
                        {!categoryTransactions.length && <p className="muted-line">No spending recorded here for {formatMonth(selectedMonth)}.</p>}
                        {categoryTransactions.map((tx) => <div className="transaction-row" key={tx.id}><span><b>{tx.note || category.name}</b><small>{new Date(`${tx.date}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</small></span><span className="transaction-amount">{money(tx.amount)}<button className="trash-button" onClick={() => deleteTransaction(tx.id)} aria-label="Delete transaction"><Trash2 size={13} /></button></span></div>)}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {!!data.categories.length && (
        <section className="section-block">
          <div className="section-head"><div><p className="section-kicker">Record</p><h2>Add spending</h2></div></div>
          <div className="panel spend-form">
            <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)}><option value="">Choose category</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input type="number" inputMode="decimal" min="0" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="Amount ($)" />
            <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            <input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="What was it? (optional)" />
            <button className="primary-button" onClick={addTransaction}><Wallet size={15} /> Record spend</button>
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="section-head"><div><p className="section-kicker">Notice early</p><h2>Budget signals</h2></div></div>
        <div className="insight-list">{insights.map((insight, index) => <div className="insight" key={`${insight.text}-${index}`}><span className={`status-dot ${insight.status}`} /><span>{insight.text}</span></div>)}</div>
      </section>

      <section className="section-block tools-block">
        <div className="section-head"><div><p className="section-kicker">Keep control</p><h2>Backup & month tools</h2></div></div>
        <div className="tool-grid">
          <button className="secondary-button" onClick={copyPlanFromPreviousMonth} disabled={!data.months[shiftMonth(selectedMonth, -1)]}><RotateCcw size={15} /> Copy previous plan</button>
          <button className="secondary-button" onClick={exportData}><Download size={15} /> Export backup</button>
          <button className="secondary-button" onClick={() => importRef.current?.click()}><Upload size={15} /> Import backup</button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => importData(e.target.files?.[0])} />
        </div>
        <p className="storage-note">This version does not send your budget to a server. Data is saved in this browser on this device. Export a backup before clearing browser data or moving devices.</p>
        <button className="clear-button" onClick={resetAll}>Clear all local data</button>
      </section>

      <footer><span>GENEVIEVE App™</span><small>Budget Compass · V2</small></footer>
    </main>
  );
}

function CategoryEditor({ category, onSave, onCancel }) {
  const [name, setName] = useState(category.name);
  const [budget, setBudget] = useState(category.defaultBudget || "");
  return (
    <div className="inline-editor">
      <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Category name" />
      <input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Default monthly budget" />
      <button className="mini-button" onClick={() => onSave(category, name, budget)}>Save default</button>
      <button className="mini-button" onClick={onCancel}>Cancel</button>
    </div>
  );
}
