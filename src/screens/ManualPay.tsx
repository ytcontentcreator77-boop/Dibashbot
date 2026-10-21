import { useEffect, useState } from "preact/hooks";

export function ManualPay() {
  const [methods, setMethods] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/pay/methods").then(r => r.json()).then(d => {
      setMethods(d.methods);
      if (d.methods.length > 0) setSelected(d.methods[0]);
    });
  }, []);

  const submit = async (e: Event) => {
    e.preventDefault();
    setMsg("Submitting...");
    
    // Assuming your app handles auth via Telegram initData elsewhere
    const res = await fetch("/api/pay/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method_id: selected.id, amount: Number(amount), utr, user_id: 1 }) // Replace 1 with actual User ID
    });
    
    const data = await res.json();
    if (data.ok) {
      setMsg(data.auto ? "Payment auto-approved! Balance added." : "Payment submitted! Waiting for admin approval.");
    } else {
      setMsg("Error: " + data.error);
    }
  };

  if (!selected) return <div>Loading...</div>;

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Pay with {selected.name}</h2>
      
      <div className="bg-gray-100 p-4 rounded">
        <p className="text-sm text-gray-600 mb-2">{selected.description}</p>
        {selected.qr_key && <img src={`/files/${selected.qr_key}`} alt="QR Code" className="w-48 h-48 mx-auto" />}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input 
          type="number" 
          placeholder={`Amount (${selected.currency})`} 
          value={amount} onChange={e => setAmount(e.currentTarget.value)}
          className="border p-2 rounded" required 
        />
        <input 
          type="text" 
          placeholder="UTR / Transaction ID" 
          value={utr} onChange={e => setUtr(e.currentTarget.value)}
          className="border p-2 rounded" required 
        />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded font-bold">
          Submit Payment
        </button>
      </form>
      
      {msg && <p className="text-center font-medium mt-2">{msg}</p>}
    </div>
  );
}