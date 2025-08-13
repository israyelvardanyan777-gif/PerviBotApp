import { type NextRequest, NextResponse } from "next/server"

declare global {
  var imageInventory: any[]
}

// Initialize with some sample images if empty
if (!global.imageInventory) {
  global.imageInventory = [
    {
      id: 1,
      filename: "product-sample-1.png",
      path: "/product-sample-1.png",
      size: 150000,
      category: "premium",
      uploadedAt: new Date().toISOString(),
      status: "available",
    },
    {
      id: 2,
      filename: "product-sample-2.png",
      path: "/product-sample-2.png",
      size: 180000,
      category: "premium",
      uploadedAt: new Date().toISOString(),
      status: "available",
    },
    {
      id: 3,
      filename: "abstract-product-display.png",
      path: "/abstract-product-display.png",
      size: 200000,
      category: "standard",
      uploadedAt: new Date().toISOString(),
      status: "available",
    },
    {
      id: 4,
      filename: "product-sample-4.png",
      path: "/product-sample-4.png",
      size: 175000,
      category: "premium",
      uploadedAt: new Date().toISOString(),
      status: "available",
    },
    {
      id: 5,
      filename: "product-sample-5.png",
      path: "/product-sample-5.png",
      size: 165000,
      category: "standard",
      uploadedAt: new Date().toISOString(),
      status: "available",
    },
  ]
}

export async function GET() {
  try {
    const inventory = global.imageInventory || []
    const availableImages = inventory.filter((img: any) => img.status === "available")

    return NextResponse.json({
      images: availableImages,
      total: availableImages.length,
      delivered: inventory.filter((img: any) => img.status === "delivered").length,
    })
  } catch (error) {
    console.error("Inventory fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { imageIds } = await request.json()

    if (!imageIds || !Array.isArray(imageIds)) {
      return NextResponse.json({ error: "Invalid image IDs" }, { status: 400 })
    }

    global.imageInventory = global.imageInventory.map((img: any) => {
      if (imageIds.includes(img.id)) {
        return {
          ...img,
          status: "delivered",
          deliveredAt: new Date().toISOString(),
        }
      }
      return img
    })

    return NextResponse.json({
      success: true,
      message: `${imageIds.length} images marked as delivered`,
    })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 })
  }
}
