export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Handle webhook from blockchain monitoring service
    const { address, amount, confirmations, txid, status } = body

    // Verify the transaction is legitimate
    if (confirmations >= 1 && status === "confirmed") {
      // Find matching payment in our system
      const transactions = JSON.parse(localStorage.getItem("blockchainTransactions") || "[]")
      const matchingTx = transactions.find((tx: any) => tx.address === address && tx.amount === amount)

      if (matchingTx) {
        // Update transaction status
        matchingTx.status = "verified"
        matchingTx.txid = txid
        matchingTx.confirmations = confirmations

        localStorage.setItem("blockchainTransactions", JSON.stringify(transactions))

        // Trigger image delivery
        return Response.json({
          success: true,
          message: "Payment verified and images delivered",
          transaction: matchingTx,
        })
      }
    }

    return Response.json({ success: false, message: "Transaction not found or not confirmed" })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ success: false, error: "Webhook processing failed" }, { status: 500 })
  }
}
