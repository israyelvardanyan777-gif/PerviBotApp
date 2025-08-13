import { type NextRequest, NextResponse } from "next/server"

const imageInventory: any[] = []

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("images") as File[]
    const category = (formData.get("category") as string) || "general"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    const uploadedFiles = []

    for (const file of files) {
      if (file.size === 0) continue

      const timestamp = Date.now()
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      const imagePath = `/placeholder.svg?height=600&width=600&query=product-${category}-${filename}`

      const imageData = {
        id: timestamp + Math.random(),
        filename,
        path: imagePath,
        size: file.size,
        category,
        uploadedAt: new Date().toISOString(),
        status: "available",
      }

      uploadedFiles.push(imageData)
      imageInventory.push(imageData)
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedFiles.length,
      files: uploadedFiles,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
