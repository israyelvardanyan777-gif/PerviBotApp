"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, ImageIcon, Trash2, RefreshCw, Lock } from "lucide-react"
import Image from "next/image"

interface ImageItem {
  id: string
  filename: string
  path: string
  category: string
  uploadedAt: string
  status: "available" | "delivered"
  deliveredAt?: string
  orderId?: string
}

interface InventoryData {
  images: ImageItem[]
  total: number
  delivered: number
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")

  const [inventory, setInventory] = useState<InventoryData>({ images: [], total: 0, delivered: 0 })
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [category, setCategory] = useState("general")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const authStatus = localStorage.getItem("admin_authenticated")
    if (authStatus === "true") {
      setIsAuthenticated(true)
      fetchInventory()
    } else {
      setIsLoading(false)
    }
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
    setAuthError("")
    localStorage.setItem("admin_authenticated", "true")
    fetchInventory()
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("admin_authenticated")
    setPassword("")
  }

  const fetchInventory = async () => {
    try {
      const images = JSON.parse(localStorage.getItem("uploaded_images") || "[]")
      const available = images.filter((img: any) => img.status === "available")
      const delivered = images.filter((img: any) => img.status === "delivered")

      setInventory({
        images: available,
        total: available.length,
        delivered: delivered.length,
      })
    } catch (error) {
      console.error("Failed to fetch inventory:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files)
  }

  const uploadImages = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return

    setIsUploading(true)
    try {
      // Store images in localStorage for demo
      const existingImages = JSON.parse(localStorage.getItem("uploaded_images") || "[]")
      const newImages = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const reader = new FileReader()

        await new Promise((resolve) => {
          reader.onload = (e) => {
            const imageData = {
              id: Date.now() + i,
              filename: file.name,
              path: e.target?.result as string,
              category: category,
              uploadedAt: new Date().toISOString(),
              status: "available",
            }
            newImages.push(imageData)
            resolve(null)
          }
          reader.readAsDataURL(file)
        })
      }

      const allImages = [...existingImages, ...newImages]
      localStorage.setItem("uploaded_images", JSON.stringify(allImages))

      console.log(`Uploaded ${newImages.length} images`)
      fetchInventory()
      setSelectedFiles(null)

      const fileInput = document.getElementById("file-input") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const deleteImage = async (imageId: string) => {
    try {
      const images = JSON.parse(localStorage.getItem("uploaded_images") || "[]")
      const filteredImages = images.filter((img: any) => img.id !== imageId)
      localStorage.setItem("uploaded_images", JSON.stringify(filteredImages))
      fetchInventory()
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">🔧 Admin Panel 🔧</CardTitle>
            <CardDescription className="text-lg">Click the button below to enter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleLogin}
              className="w-full py-4 text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300"
            >
              <Lock className="h-6 w-6 mr-3" />🚀 ENTER ADMIN 🚀
            </Button>
            <div className="text-center text-lg font-medium text-white bg-black/20 rounded-lg p-3">
              ✅ No password needed - just click!
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Image Management</h1>
        <div className="flex gap-2">
          <Button onClick={fetchInventory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <Lock className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Available Images</p>
                <p className="text-2xl font-bold">{inventory.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{inventory.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Uploaded</p>
                <p className="text-2xl font-bold">{inventory.total + inventory.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Images</CardTitle>
          <CardDescription>Add images to your inventory for automatic delivery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., premium, standard, special"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-input">Select Images</Label>
              <Input id="file-input" type="file" multiple accept="image/*" onChange={handleFileSelect} />
            </div>
          </div>

          {selectedFiles && <div className="text-sm text-muted-foreground">Selected: {selectedFiles.length} files</div>}

          <Button onClick={uploadImages} disabled={!selectedFiles || isUploading} className="w-full">
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Images
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Image Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Image Inventory</CardTitle>
          <CardDescription>Manage your available product images</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading inventory...</div>
          ) : inventory.images.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No images in inventory. Upload some images to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {inventory.images.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square relative border rounded-lg overflow-hidden">
                    <Image src={image.path || "/placeholder.svg"} alt={image.filename} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="destructive" onClick={() => deleteImage(image.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <Badge variant="secondary" className="text-xs">
                      {image.category}
                    </Badge>
                    <p className="text-xs text-muted-foreground truncate">{image.filename}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
