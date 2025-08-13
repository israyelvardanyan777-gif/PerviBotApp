"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, Copy, Download, AlertCircle } from "lucide-react"
import Image from "next/image"

interface PaymentProcessorProps {
  amount: number
  orderId: string
  onPaymentComplete: (images: string[]) => void
}

interface PaymentData {
  dashAddress: string
  amount: number
  qrCode: string
  orderId: string
}

export function PaymentProcessor({ amount, orderId, onPaymentComplete }: PaymentProcessorProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "confirmed" | "failed">("pending")
  const [deliveredImages, setDeliveredImages] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generatePaymentAddress()
  }, [amount, orderId])

  useEffect(() => {
    if (paymentData && paymentStatus === "pending") {
      const interval = setInterval(() => {
        checkPayment()
      }, 10000) // Check every 10 seconds

      return () => clearInterval(interval)
    }
  }, [paymentData, paymentStatus])

  const generatePaymentAddress = async () => {
    try {
      const mockPaymentData: PaymentData = {
        dashAddress: `Xr${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        amount: amount,
        qrCode: `/placeholder.svg?height=200&width=200&query=Dash QR Code Payment ${amount}`,
        orderId: orderId,
      }

      setPaymentData(mockPaymentData)
      setError(null)
    } catch (error) {
      console.error("Failed to generate payment address:", error)
      setError("Failed to generate payment address. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const checkPayment = async () => {
    if (!paymentData || isVerifying) return

    setIsVerifying(true)
    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashAddress: paymentData.dashAddress,
          expectedAmount: paymentData.amount,
          orderId: paymentData.orderId,
        }),
      })

      const result = await response.json()

      if (result.success && result.images) {
        setPaymentStatus("confirmed")
        setDeliveredImages(result.images)
        onPaymentComplete(result.images)
      } else {
        console.log("Payment not confirmed yet:", result.message)
      }
    } catch (error) {
      console.error("Payment verification failed:", error)
      setError("Payment verification failed. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const copyAddress = async () => {
    if (paymentData?.dashAddress) {
      try {
        await navigator.clipboard.writeText(paymentData.dashAddress)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.log("Address:", paymentData.dashAddress)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const downloadImage = (imageUrl: string, index: number) => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `product-image-${index + 1}.png`
    link.click()
  }

  if (isLoading) {
    return (
      <Card className="animate-in fade-in-50 duration-300">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 font-medium">Generating payment address...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardContent className="flex items-center justify-center p-8 text-center">
          <div>
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
            <Button onClick={generatePaymentAddress} variant="outline" className="mt-4 bg-transparent">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (paymentStatus === "confirmed") {
    return (
      <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:bg-gradient-to-r dark:from-green-950 dark:to-emerald-950 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3 animate-in zoom-in-50 duration-300" />
            <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">Payment Confirmed! 🎉</div>
            <p className="text-green-600 dark:text-green-400">Your images are ready for download</p>
          </CardContent>
        </Card>

        <Card className="animate-in slide-in-from-bottom-3 duration-300 delay-150">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Your Images
            </CardTitle>
            <CardDescription>Click to download your product images</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliveredImages.map((imageUrl, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow duration-200 animate-in slide-in-from-left-3"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center space-x-4">
                  <Image
                    src={imageUrl || "/placeholder.svg"}
                    alt={`Product image ${index + 1}`}
                    width={60}
                    height={60}
                    className="rounded-lg shadow-sm"
                  />
                  <span className="font-medium text-lg">Image {index + 1}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadImage(imageUrl, index)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
      <Card className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-5"></div>
        <CardHeader className="relative bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardTitle className="text-xl font-bold">💎 Dash Payment</CardTitle>
          <CardDescription className="text-blue-100">
            Send exactly ${amount} worth of DASH to complete your order
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-6 p-6">
          {paymentData && (
            <>
              <div className="text-center animate-in zoom-in-50 duration-300">
                <div className="relative inline-block">
                  <Image
                    src={paymentData.qrCode || "/placeholder.svg"}
                    alt="Payment QR Code"
                    width={200}
                    height={200}
                    className="mx-auto border-2 border-gray-200 rounded-xl shadow-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl"></div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 font-medium">📱 Scan with your Dash wallet</p>
              </div>

              <div className="space-y-3 animate-in slide-in-from-bottom-3 duration-300 delay-150">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">💳 Dash Address:</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg text-xs break-all font-mono border">
                    {paymentData.dashAddress}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyAddress}
                    className="hover:scale-105 transition-transform duration-200 bg-transparent"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "✅" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-lg border animate-in slide-in-from-bottom-3 duration-300 delay-300">
                <span className="font-bold text-lg">💰 Amount:</span>
                <Badge className="text-lg font-bold px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600">
                  ${paymentData.amount}
                </Badge>
              </div>
            </>
          )}

          <div className="text-center space-y-4 animate-in fade-in-50 duration-300 delay-500">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              {isVerifying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-green-500" />
                  <span className="font-medium">🔍 Checking for payment...</span>
                </>
              ) : (
                <span className="font-medium">⏳ Waiting for payment confirmation...</span>
              )}
            </div>

            <Button
              onClick={checkPayment}
              disabled={isVerifying}
              className="w-full py-3 text-lg font-bold bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 hover:from-green-600 hover:via-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />🔄 Verifying Payment...
                </>
              ) : (
                "✅ Check Payment Status"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
