import { useEffect, useState } from "preact/hooks";

export function ManualPayments() {
  const [list, setList] = useState<any[]>([]);
  const [customAmt, setCustomAmt] = useState<Record<number, string>>({});

  const load = () => {
    fetch("/api/pay/admin/list").then(r => r.json()).then(d => setList(d.payments || []));
  };

  useEffect(load, []);

  const action = async (id: number, type: "accept"|"decline"|"custom") => {
    let body = {};
    if (type === "custom") {
      const usdAmt = Number(customAmt[id]);
      if (!usdAmt) return alert("Enter an amount");
      body = { custom_micro_usd: Math.round(usdAmt * 1000000) };
    }
    
    await fetch(`/api/pay/admin/${id}/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    load(); // Refresh list
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Manual Payments</h2>
      {list.length === 0 && <p>No pending payments.</p>}
      
      {list.map(p => (
        <div key={p.id} className="border p-4 rounded shadow-sm flex flex-col gap-2">
          <div className="flex justify-between">
            <strong>User: @{p.username}</strong>
            <span>{p.amount} {p.currency}</span>
          </div>
          <p>UTR: <code className="bg-gray-100 p-1">{p.utr}</code></p>
          
          <div className="flex gap-2 mt-2">
            <button onClick={() => action(p.id, "accept")} className="bg-green-600 text-white px-3 py-1 rounded">Accept</button>
            <button onClick={() => action(p.id, "decline")} className="bg-red-600 text-white px-3 py-1 rounded">Decline</button>
          </div>

          <div className="flex gap-2 items-center mt-2 border-t pt-2">
            <input 
              type="number" 
              placeholder="Custom $ amount" 
              value={customAmt[p.id] || ""} 
              onChange={e => setCustomAmt({ ...customAmt, [p.id]: e.currentTarget.value })}
              className="border p-1 rounded w-32"
            />
            <button onClick={() => action(p.id, "custom")} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Custom Add</button>
          </div>
        </div>
      ))}
    </div>
  );
}