import { useState } from "react";
import Modal from "./Modal.jsx";
import { readCommand } from "../api/client.js";
export default function StaffCheckIn({ onClose }) {
  const [hash, setHash] = useState(""),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await readCommand("/staff/check-in", { ticketHash: hash.trim() }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Soát vé tại rạp" onClose={onClose}>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="ticket-hash">Mã đọc từ QR</label>
        <input
          id="ticket-hash"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          required
          pattern="[a-f0-9]{64}"
          autoComplete="off"
        />
        <button className="button button-primary" disabled={busy}>
          Xác nhận soát vé
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status">
          <h3>Soát vé thành công</h3>
          <p>
            {result.movie} · {result.cinema}
          </p>
          <p>Ghế {result.seats.map((s) => s.label).join(", ")}</p>
        </div>
      )}
    </Modal>
  );
}
