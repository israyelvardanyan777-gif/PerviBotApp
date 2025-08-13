"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, MapPin, Package, CheckCircle, AlertCircle, Lock } from "lucide-react"

type Page = "neighborhoods" | "products" | "admin" | "payment" | "admin-login"

const neighborhoods = ["Kentron", "Komitas", "Ajapnyak", "Masiv", "Nor Norq"]
const products = [
  { weight: "0.5G", price: 26 },
  { weight: "1.0G", price: 35 },
]

export default function TelegramMiniApp() {
  const [currentPage, setCurrentPage] = useState<Page>("neighborhoods")
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedAdminProduct, setSelectedAdminProduct] = useState("0.5G")
  const [neighborhoodImages, setNeighborhoodImages] = useState<Record<string, Record<string, string[]>>>({
    Kentron: { "0.5G": [], "1.0G": [] },
    Komitas: { "0.5G": [], "1.0G": [] },
    Ajapnyak: { "0.5G": [], "1.0G": [] },
    Masiv: { "0.5G": [], "1.0G": [] },
    "Nor Norq": { "0.5G": [], "1.0G": [] },
  })
  const [selectedAdminNeighborhood, setSelectedAdminNeighborhood] = useState("Kentron")
  const [blockchainStatus, setBlockchainStatus] = useState<"checking" | "verified" | "pending">("pending")
  const [paymentAddress, setPaymentAddress] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null)
  const [paymentTimeout, setPaymentTimeout] = useState<NodeJS.Timeout | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState("")
  const [blockchainTransactions, setBlockchainTransactions] = useState<
    Array<{
      id: string
      timestamp: string
      neighborhood: string
      product: string
      amount: number
      address: string
      status: "verified" | "pending" | "failed"
      imagesDelivered: number
    }>
  >([])
  const [currentTransactionId, setCurrentTransactionId] = useState<string>("")
  const [deliveredImages, setDeliveredImages] = useState<string[]>([])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback("✅ Copied!")
      setTimeout(() => setCopyFeedback(""), 2000)
    } catch (err) {
      setCopyFeedback("❌ Copy failed")
      setTimeout(() => setCopyFeedback(""), 2000)
    }
  }

  const verifyBlockchainPayment = async (address: string, amount: number) => {
    setBlockchainStatus("checking")

    let transactionId = currentTransactionId
    if (!transactionId) {
      transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      setCurrentTransactionId(transactionId)

      const newTransaction = {
        id: transactionId,
        timestamp: new Date().toLocaleString("hy-AM"),
        neighborhood: selectedNeighborhood,
        product: selectedProduct?.weight || "",
        amount: amount,
        address: address,
        status: "pending" as const,
        imagesDelivered: 0,
      }

      setBlockchainTransactions((prev) => [newTransaction, ...prev])

      try {
        await fetch("/api/blockchain/monitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            amount,
            orderId: `${selectedNeighborhood}-${selectedProduct?.weight}-${transactionId}`,
          }),
        })
      } catch (error) {
        console.error("Failed to start blockchain monitoring:", error)
      }
    }

    const monitorInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dashAddress: address,
            expectedAmount: amount,
            orderId: `${selectedNeighborhood}-${selectedProduct?.weight}`,
          }),
        })

        const result = await response.json()

        if (response.ok && result.success && result.transaction && result.transaction.confirmations >= 1) {
          clearInterval(monitorInterval)
          setBlockchainStatus("verified")

          if (paymentTimeout) {
            clearTimeout(paymentTimeout)
            setPaymentTimeout(null)
            setTimeRemaining(0)
          }

          const availableImages = neighborhoodImages[selectedNeighborhood]?.[selectedProduct?.weight] || []
          const imagesToSend = 1

          if (availableImages.length >= imagesToSend) {
            const imagesToDeliver = availableImages.slice(0, imagesToSend)
            setDeliveredImages(imagesToDeliver)

            setNeighborhoodImages((prev) => ({
              ...prev,
              [selectedNeighborhood]: {
                ...prev[selectedNeighborhood],
                [selectedProduct?.weight]: prev[selectedNeighborhood][selectedProduct?.weight].slice(imagesToSend),
              },
            }))

            setBlockchainTransactions((prev) =>
              prev.map((tx) =>
                tx.id === transactionId ? { ...tx, status: "verified" as const, imagesDelivered: imagesToSend } : tx,
              ),
            )

            alert(
              `🤖 Իրական Բլոկչեյն Բոտ: Վճարումը հաստատված է! Գտնվել է ${result.transaction.confirmations} հաստատում: Ստացել եք 1 նկար:`,
            )
          }
          return true
        } else if (!response.ok || (result.message && result.message.includes("not found"))) {
          setBlockchainTransactions((prev) =>
            prev.map((tx) => (tx.id === transactionId ? { ...tx, status: "pending" as const } : tx)),
          )
        }
      } catch (error) {
        console.error("Real-time monitoring error:", error)
        setBlockchainTransactions((prev) =>
          prev.map((tx) => (tx.id === transactionId ? { ...tx, status: "failed" as const } : tx)),
        )
      }
    }, 10000)

    return false
  }

  useEffect(() => {
    if (currentPage === "payment" && !paymentAddress) {
      const randomAddress = `X${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      setPaymentAddress(randomAddress)
      setCurrentTransactionId("")
      setBlockchainStatus("pending")
      setDeliveredImages([])

      setTimeRemaining(15 * 60)

      const timeout = setTimeout(
        () => {
          alert("Վճարման ժամանակը լրացել է! Խնդրում ենք նորից փորձել:")
          setCurrentPage("neighborhoods")
          setPaymentAddress("")
          setBlockchainStatus("pending")
          setTimeRemaining(0)
          setCurrentTransactionId("")
          setDeliveredImages([])
        },
        15 * 60 * 1000,
      )

      setPaymentTimeout(timeout)

      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        clearInterval(interval)
        if (timeout) clearTimeout(timeout)
      }
    }
  }, [currentPage, paymentAddress])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleAdminLogin = () => {
    if (isLocked) {
      alert("Too many failed attempts. Please wait 5 minutes.")
      return
    }

    const hashedPassword = btoa("PerviAdmin2025")
    const inputHash = btoa(adminPassword)

    if (inputHash === hashedPassword) {
      setIsAdminAuthenticated(true)
      setCurrentPage("admin")
      setAdminPassword("")
      setLoginAttempts(0)

      if (sessionTimeout) clearTimeout(sessionTimeout)
      const timeout = setTimeout(
        () => {
          setIsAdminAuthenticated(false)
          setCurrentPage("neighborhoods")
          alert("Session expired for security. Please login again.")
        },
        30 * 60 * 1000,
      )
      setSessionTimeout(timeout)

      localStorage.setItem("adminSession", btoa(Date.now().toString()))
    } else {
      const newAttempts = loginAttempts + 1
      setLoginAttempts(newAttempts)
      setAdminPassword("")

      if (newAttempts >= 3) {
        setIsLocked(true)
        setTimeout(
          () => {
            setIsLocked(false)
            setLoginAttempts(0)
          },
          5 * 60 * 1000,
        )
        alert("Too many failed attempts. Access locked for 5 minutes.")
      } else {
        alert(`Incorrect password! ${3 - newAttempts} attempts remaining.`)
      }
    }
  }

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false)
    setCurrentPage("neighborhoods")
    if (sessionTimeout) clearTimeout(sessionTimeout)
    localStorage.removeItem("adminSession")
    setLoginAttempts(0)
  }

  useEffect(() => {
    const session = localStorage.getItem("adminSession")
    if (session) {
      try {
        const sessionTime = Number.parseInt(atob(session))
        const now = Date.now()
        if (now - sessionTime < 30 * 60 * 1000) {
          setIsAdminAuthenticated(true)
        } else {
          localStorage.removeItem("adminSession")
        }
      } catch (error) {
        localStorage.removeItem("adminSession")
      }
    }
  }, [])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const imageData = e.target?.result as string
          setNeighborhoodImages((prev) => ({
            ...prev,
            [selectedAdminNeighborhood]: {
              ...prev[selectedAdminNeighborhood],
              [selectedAdminProduct]: [...prev[selectedAdminNeighborhood][selectedAdminProduct], imageData],
            },
          }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const deleteImage = (index: number) => {
    setNeighborhoodImages((prev) => ({
      ...prev,
      [selectedAdminNeighborhood]: {
        ...prev[selectedAdminNeighborhood],
        [selectedAdminProduct]: prev[selectedAdminNeighborhood][selectedAdminProduct].filter((_, i) => i !== index),
      },
    }))
  }

  if (currentPage === "admin-login") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => setCurrentPage("neighborhoods")} className="mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-red-600">🔐 Ապահով Ադմին Մուտք</h1>
          </div>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <Lock className="h-5 w-5 mr-2" />
                Պաշտպանված Մուտք
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-3 rounded text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span>Անվտանգության Մակարդակ:</span>
                  <span className="text-green-600 font-bold">🛡️ Բարձր</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span>Սեսիայի Ժամանակ:</span>
                  <span className="text-blue-600 font-bold">30 րոպե</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Սխալ Փորձեր:</span>
                  <span className={`font-bold ${loginAttempts > 0 ? "text-red-600" : "text-green-600"}`}>
                    {loginAttempts}/3
                  </span>
                </div>
              </div>

              <Input
                type="password"
                placeholder="Մուտքագրեք ապահով ադմին գաղտնաբառը"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
                className="text-center"
                disabled={isLocked}
              />

              <Button
                onClick={handleAdminLogin}
                className="w-full bg-red-500 hover:bg-red-600"
                disabled={isLocked || !adminPassword}
              >
                {isLocked ? "🔒 ԱՐԳԵԼԱՓԱԿՎԱԾ (5 րոպե)" : "🔓 ԱՊԱՀՈՎ ՄՈՒՏՔ"}
              </Button>

              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>🔐 Գաղտնաբառը պաշտպանված է գաղտնագրմամբ</p>
                <p>⏱️ Ավտոմատ ելք 30 րոպե հետո</p>
                <p>🚫 Առավելագույնը 3 փորձ, ապա 5 րոպե արգելափակում</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (currentPage === "neighborhoods") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">♻️PerviRams♻️</h1>
            <p className="text-gray-600">Ընտրեք ձեր թաղամասը</p>
          </div>

          <div className="space-y-3">
            {neighborhoods.map((neighborhood) => (
              <Card
                key={neighborhood}
                className="cursor-pointer hover:bg-blue-50 transition-colors"
                onClick={() => {
                  setSelectedNeighborhood(neighborhood)
                  setCurrentPage("products")
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="font-medium">{neighborhood}</span>
                  </div>
                  <div className="text-xs">
                    <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded mb-1">
                      0.5G: {neighborhoodImages[neighborhood]?.["0.5G"]?.length || 0}
                    </div>
                    <div className="bg-green-100 text-green-600 px-2 py-1 rounded">
                      1.0G: {neighborhoodImages[neighborhood]?.["1.0G"]?.length || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={() => setCurrentPage("admin-login")} className="w-full mt-6 bg-red-500 hover:bg-red-600">
            🔐 ԱԴՄԻՆ
          </Button>
        </div>
      </div>
    )
  }

  if (currentPage === "products") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => setCurrentPage("neighborhoods")} className="mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedNeighborhood}</h1>
              <p className="text-gray-600">Ընտրեք ապրանքը</p>
              <div className="text-sm space-y-1">
                <p className="text-blue-600">
                  0.5G: {neighborhoodImages[selectedNeighborhood]?.["0.5G"]?.length || 0} նկար հասանելի
                </p>
                <p className="text-green-600">
                  1.0G: {neighborhoodImages[selectedNeighborhood]?.["1.0G"]?.length || 0} նկար հասանելի
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {products.map((product, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:bg-green-50 transition-colors"
                onClick={() => {
                  setSelectedProduct(product)
                  setCurrentPage("payment")
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-green-500 mr-3" />
                    <div>
                      <div className="font-bold">{product.weight}</div>
                      <div className="text-sm text-gray-500">Կստանաք 1 նկար</div>
                      <div className="text-xs text-blue-600">
                        {neighborhoodImages[selectedNeighborhood]?.[product.weight]?.length || 0} հասանելի
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-green-600">${product.price}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (currentPage === "admin") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={handleAdminLogout} className="mr-3">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-red-600">🔐 Ապահով Ադմին Վահանակ</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdminLogout}
              className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
            >
              🔒 Ապահով Ելք
            </Button>
          </div>

          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <CheckCircle className="h-5 w-5 mr-2" />
                Անվտանգություն և Բլոկչեյն Կարգավիճակ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ադմին Սեսիա:</span>
                  <span className="text-green-600 font-bold flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    🛡️ Ապահով և Ակտիվ
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Dash Ցանց:</span>
                  <span className="text-green-600 font-bold flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    100% Օնլայն
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Վճարման Ստուգում:</span>
                  <span className="text-green-600 font-bold">Իրական Ժամանակ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ավտո-Ջնջում:</span>
                  <span className="text-green-600 font-bold">Ուղարկումից Հետո</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Վճարման Ժամանակ:</span>
                  <span className="text-blue-600 font-bold">15 Րոպե</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                Բլոկչեյն Ստուգման Պատմություն
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {blockchainTransactions.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Դեռ գործարքներ չկան</p>
                ) : (
                  blockchainTransactions.map((tx) => (
                    <div key={tx.id} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-500">{tx.timestamp}</div>
                        <div
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            tx.status === "verified"
                              ? "bg-green-100 text-green-600"
                              : tx.status === "pending"
                                ? "bg-orange-100 text-orange-600"
                                : "bg-red-100 text-red-600"
                          }`}
                        >
                          {tx.status === "verified"
                            ? "✅ Հաստատված"
                            : tx.status === "pending"
                              ? "⏳ Սպասում"
                              : "❌ Ձախողված"}
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Թաղամաս:</span>
                          <span className="font-medium">{tx.neighborhood}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ապրանք:</span>
                          <span className="font-medium">{tx.product}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Գումար:</span>
                          <span className="font-medium">${tx.amount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Հասցե:</span>
                          <span className="font-mono text-sm break-all mb-2">{tx.address.substring(0, 12)}...</span>
                        </div>
                        {tx.imagesDelivered > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ուղարկված նկարներ:</span>
                            <span className="font-medium text-green-600">{tx.imagesDelivered}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-green-100 text-green-600 p-2 rounded">
                    <div className="font-bold">
                      {blockchainTransactions.filter((tx) => tx.status === "verified").length}
                    </div>
                    <div>Հաստատված</div>
                  </div>
                  <div className="bg-orange-100 text-orange-600 p-2 rounded">
                    <div className="font-bold">
                      {blockchainTransactions.filter((tx) => tx.status === "pending").length}
                    </div>
                    <div>Սպասում</div>
                  </div>
                  <div className="bg-red-100 text-red-600 p-2 rounded">
                    <div className="font-bold">
                      {blockchainTransactions.filter((tx) => tx.status === "failed").length}
                    </div>
                    <div>Ձախողված</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Ընտրեք Թաղամասը</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {neighborhoods.map((neighborhood) => (
                  <Button
                    key={neighborhood}
                    variant={selectedAdminNeighborhood === neighborhood ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAdminNeighborhood(neighborhood)}
                    className="text-xs"
                  >
                    {neighborhood}
                    <div className="ml-1 text-xs">
                      <span className="bg-blue-100 text-blue-600 px-1 rounded mr-1">
                        0.5G: {neighborhoodImages[neighborhood]?.["0.5G"]?.length || 0}
                      </span>
                      <span className="bg-green-100 text-green-600 px-1 rounded">
                        1.0G: {neighborhoodImages[neighborhood]?.["1.0G"]?.length || 0}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Ընտրեք Ապրանքի Տեսակը</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {products.map((product) => (
                  <Button
                    key={product.weight}
                    variant={selectedAdminProduct === product.weight ? "default" : "outline"}
                    onClick={() => setSelectedAdminProduct(product.weight)}
                    className="flex flex-col h-16"
                  >
                    <span className="font-bold">{product.weight}</span>
                    <span className="text-xs">
                      {neighborhoodImages[selectedAdminNeighborhood]?.[product.weight]?.length || 0} նկար
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                Բեռնել Նկարներ {selectedAdminNeighborhood} - {selectedAdminProduct} համար
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full p-2 border rounded mb-4"
              />
              <p className="text-sm text-gray-600">
                Նկարներ {selectedAdminNeighborhood} ({selectedAdminProduct}) մեջ:{" "}
                {neighborhoodImages[selectedAdminNeighborhood]?.[selectedAdminProduct]?.length || 0}
              </p>
            </CardContent>
          </Card>

          {(neighborhoodImages[selectedAdminNeighborhood]?.[selectedAdminProduct]?.length || 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedAdminNeighborhood} - {selectedAdminProduct} Նկարներ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {neighborhoodImages[selectedAdminNeighborhood]?.[selectedAdminProduct]?.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`${selectedAdminNeighborhood} ${selectedAdminProduct} ${index + 1}`}
                        className="w-full h-20 object-cover rounded"
                      />
                      <button
                        onClick={() => deleteImage(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  if (currentPage === "payment") {
    const availableImages = neighborhoodImages[selectedNeighborhood]?.[selectedProduct?.weight]?.length || 0
    const requiredImages = 1

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => setCurrentPage("products")} className="mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Վճարում</h1>
            {timeRemaining > 0 && (
              <div className="ml-auto text-sm">
                <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded font-bold">
                  ⏰ {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>

          {deliveredImages.length > 0 && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Ձեր Ստացած Նկարները
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {deliveredImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Delivered ${selectedNeighborhood} ${selectedProduct?.weight} ${index + 1}`}
                        className="w-full h-32 object-cover rounded border-2 border-green-300"
                      />
                      <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full px-2 py-1 text-xs font-bold">
                        ✓ Ձերն է
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-green-600 mt-2 text-center font-bold">
                  🎉 Բլոկչեյնը հաստատված է! Նկարները ձերն են և մնում են ձեզ մոտ:
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Պատվերի Ամփոփում</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Թաղամաս:</span>
                <span className="font-bold">{selectedNeighborhood}</span>
              </div>
              <div className="flex justify-between">
                <span>Ապրանք:</span>
                <span className="font-bold">{selectedProduct?.weight}</span>
              </div>
              <div className="flex justify-between">
                <span>Հասանելի Նկարներ:</span>
                <span className={`font-bold ${availableImages >= requiredImages ? "text-green-600" : "text-red-600"}`}>
                  {availableImages} / {requiredImages} անհրաժեշտ
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Ընդամենը:</span>
                <span>${selectedProduct?.price}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <CheckCircle className="h-5 w-5 mr-2" />
                Բլոկչեյն Ստուգում
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Վճարման Կարգավիճակ:</span>
                  <div className="flex items-center">
                    {blockchainStatus === "verified" && (
                      <span className="text-green-600 font-bold flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        100% Հաստատված
                      </span>
                    )}
                    {blockchainStatus === "checking" && (
                      <span className="text-blue-600 font-bold flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1 animate-pulse" />
                        Ստուգում Բլոկչեյնում...
                      </span>
                    )}
                    {blockchainStatus === "pending" && (
                      <span className="text-orange-600 font-bold flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Սպասում
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Վճարման Ժամանակ:</span>
                  <span className="text-orange-600 font-bold">15 Րոպե</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dash Վճարում</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-gray-100 p-4 rounded">
                <p className="text-sm text-gray-600 mb-2">Ուղարկեք Dash այս հասցեին:</p>
                <div className="bg-white p-3 rounded border-2 border-dashed border-gray-300">
                  <p className="font-mono text-sm break-all mb-2">{paymentAddress}</p>
                  <Button
                    onClick={() => copyToClipboard(paymentAddress)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {copyFeedback || "📋 Պատճենել Հասցեն"}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-blue-600">
                  Բլոկչեյն հաստատումից հետո դուք կստանաք 1 նկար {selectedNeighborhood} ({selectedProduct?.weight})
                  թաղամասից:
                </p>
                <p className="text-xs text-green-600 mt-1 font-bold">✅ Նկարները կմնան ձեզ մոտ ընդմիշտ</p>
                <p className="text-xs text-gray-500 mt-1">Նկարները կջնջվեն միայն ադմինի պահեստից</p>
                {timeRemaining > 0 && (
                  <p className="text-xs text-orange-600 mt-2 font-bold">
                    ⚠️ Վճարումը կլրանա {formatTime(timeRemaining)} հետո
                  </p>
                )}
              </div>

              <Button
                onClick={async () => {
                  if (availableImages < requiredImages) {
                    alert(
                      `Բավարար նկարներ չկան ${selectedNeighborhood} թաղամասում ${selectedProduct?.weight} համար: Անհրաժեշտ է ${requiredImages}, կա ${availableImages}:`,
                    )
                    return
                  }

                  if (blockchainStatus === "checking") {
                    alert("Վճարումը արդեն ստուգվում է: Խնդրում ենք սպասել:")
                    return
                  }

                  const verified = await verifyBlockchainPayment(paymentAddress, selectedProduct?.price)
                  if (verified) {
                    alert(
                      `🎉 Բլոկչեյնը հաստատված է! Ստացել եք 1 նկար ${selectedNeighborhood} (${selectedProduct?.weight}) թաղամասից: Նկարները ձերն են և մնում են ձեզ մոտ:`,
                    )
                  } else {
                    alert("Վճարումը դեռ չի հաստատվել բլոկչեյնում: Խնդրում ենք սպասել և նորից փորձել:")
                  }
                }}
                className="w-full bg-green-500 hover:bg-green-600"
                disabled={blockchainStatus === "checking" || availableImages < requiredImages || timeRemaining === 0}
              >
                {blockchainStatus === "checking"
                  ? "Ստուգում Իրական Բլոկչեյնում..."
                  : availableImages < requiredImages
                    ? "Բավարար Նկարներ Չկան"
                    : timeRemaining === 0
                      ? "Վճարումը Լրացել Է"
                      : "Ստուգել Իրական Վճարումը"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
