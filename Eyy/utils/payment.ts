import { paymentAPI } from '../lib/api'

export async function initiateInvoice(amount: number, description?: string) {
  const payload: any = { 
    amount, 
    method: 'invoice', 
    description: description || `Payment of ₱${amount}`,
    currency: 'PHP'
  }
  return await paymentAPI.createPayment(payload)
}

export async function initiateEwallet(amount: number, channel: string = 'PAYMAYA') {
  const payload: any = { 
    amount, 
    method: 'ewallet', 
    channel,
    currency: 'PHP'
  }
  return await paymentAPI.createPayment(payload)
}

export async function initiateCardCharge(amount: number, token_id: string) {
  const payload: any = { 
    amount, 
    method: 'credit_card', 
    token_id,
    currency: 'PHP'
  }
  return await paymentAPI.createPayment(payload)
}

export async function getPaymentStatus(paymentId: string) {
  return await paymentAPI.getPaymentById(paymentId)
}
