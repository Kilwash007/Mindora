// Turns Safaricom's technical result messages into plain language.
export function friendlyPaymentError(resultDesc) {
  const text = (resultDesc || '').toLowerCase()
  if (text.includes('cancel')) {
    return 'The payment was cancelled on your phone. You can try again whenever you are ready.'
  }
  if (text.includes('timeout') || text.includes('no response') || text.includes('cannot be reached')) {
    return "We didn't get a response from your phone. Make sure it is on and has network, then try again and enter your M-Pesa PIN when prompted."
  }
  if (text.includes('insufficient') || text.includes('balance')) {
    return 'Your M-Pesa balance was not enough for this payment. Please top up and try again.'
  }
  if (text.includes('pin') || text.includes('initiator')) {
    return 'The M-Pesa PIN entered was not accepted. Please try again.'
  }
  return 'The payment did not go through. Please try again.'
}
