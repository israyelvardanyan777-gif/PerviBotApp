import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId } = await request.json()

    if (!amount || !orderId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Generate a unique Dash address for this order
    const dashAddress = generateDashAddress(orderId)

    const qrCodeUrl = `/placeholder.svg?height=256&width=256&query=dash-qr-${dashAddress}-${amount}`

    return NextResponse.json({
      dashAddress,
      amount,
      qrCode: qrCodeUrl,
      orderId,
    })
  } catch (error) {
    console.error("Address generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateDashAddress(orderId: string): string {
  const timestamp = Date.now().toString()
  const mockAddresses = [
    "XdQJdyEbTqQpan8KjZiEjTkgZKjQhHUwSa",
    "XmNhN4o3h2M8YKAoKGMnAewokcuAibjEUP",
    "XpYjWyEbTqQpan8KjZiEjTkgZKjQhHUwSa",
  ]

  const index = (orderId.length + Number.parseInt(timestamp.slice(-1))) % mockAddresses.length
  return mockAddresses[index] + timestamp.slice(-6) // Add timestamp for uniqueness
}
