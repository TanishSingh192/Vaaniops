// Deterministic rule-based intent engine used while Gnani Evon is not configured.
// Clearly labelled as SIMULATION in the UI.
export type Intent = {
  intent: "failed_upi_payment" | "duplicate_transaction" | "card_freeze" | "unknown";
  workflow: string | null;
  confidence: number;
  amount: number | null;
  language: "hi-IN" | "mr-IN" | "en-IN";
};

export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  const m = t.replace(/,/g, "").match(/(\d{2,7})/);
  const amount = m ? Number(m[1]) : null;
  const hindi = /(mere|kat|gaye|karo|hai|nahi|baar|kar do|lagta)/.test(t);
  const marathi = /(maza|majha|zala|kara|aahe|nahi zala)/.test(t);
  const language = marathi ? "mr-IN" : hindi ? "hi-IN" : "en-IN";
  if (/(do baar|twice|duplicate|same payment|don vela)/.test(t))
    return { intent: "duplicate_transaction", workflow: "duplicate_transaction", confidence: 0.9, amount, language };
  if (/(freeze|block|band|fraud|suspicious|chori)/.test(t))
    return { intent: "card_freeze", workflow: "card_fraud_freeze", confidence: 0.88, amount, language };
  if (/(upi|kat gaye|debited|nahi mila|not received|failed|deduct)/.test(t))
    return { intent: "failed_upi_payment", workflow: "upi_dispute_investigation", confidence: 0.92, amount, language };
  return { intent: "unknown", workflow: null, confidence: 0.3, amount, language };
}
