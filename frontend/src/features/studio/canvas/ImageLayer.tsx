import { useEffect, useState } from 'react'
import { Image, Rect, Text } from 'react-konva'

interface ImageLayerProps {
  url: string
  width: number
  height: number
}

export function ImageLayer({ url, width, height }: ImageLayerProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    setImage(null)

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    img.onload = () => setImage(img)
    img.onerror = () => setFailed(true)

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [url])

  if (failed) {
    return (
      <>
        <Rect width={width} height={height} fill="#171717" />
        <Text
          text="Failed to load image"
          width={width}
          align="center"
          y={height / 2 - 10}
          fill="#737373"
          fontSize={14}
        />
      </>
    )
  }

  if (!image) return null

  return <Image image={image} width={width} height={height} listening={false} />
}
