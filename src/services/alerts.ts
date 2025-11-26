export async function sendWhatsAppAlert(message: string, toPhone?: string) {
  const token = import.meta.env.VITE_WHATSAPP_TOKEN
  const phoneId = import.meta.env.VITE_WHATSAPP_PHONE_ID
  const to = toPhone || import.meta.env.VITE_WHATSAPP_TO
  if (!token || !phoneId || !to) return
  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      })
    })
  } catch {}
}

export function buildLowStockMessage(itemName: string, qty: number, min?: number) {
  if (min && qty < min) return `ALERTA: ${itemName} abaixo do mínimo (${qty} < ${min})`
  return `Atenção: ${itemName} está acabando (qtd: ${qty})`
}

