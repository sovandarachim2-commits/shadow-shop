import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const sizes = [180, 192, 512]
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(scriptDir, '..', 'public')

function crc32(buffer) {
  let crc = ~0
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  const crc = Buffer.alloc(4)

  length.writeUInt32BE(data.length, 0)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)

  return Buffer.concat([length, typeBuffer, data, crc])
}

function pngEncode(width, height, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function roundedRect(x, y, width, height, radius, px, py) {
  const dx = Math.max(x - px, 0, px - (x + width))
  const dy = Math.max(y - py, 0, py - (y + height))

  if (dx === 0 && dy === 0) {
    const nearX = px < x + radius || px > x + width - radius
    const nearY = py < y + radius || py > y + height - radius

    if (!nearX || !nearY) return true

    const cx = px < x + radius ? x + radius : x + width - radius
    const cy = py < y + radius ? y + radius : y + height - radius
    return Math.hypot(px - cx, py - cy) <= radius
  }

  return Math.hypot(dx, dy) <= radius
}

function strokeSegment(px, py, x1, y1, x2, y2, width) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  const cx = x1 + t * dx
  const cy = y1 + t * dy

  return Math.hypot(px - cx, py - cy) <= width / 2
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const scale = size / 512

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) / scale
      const py = (y + 0.5) / scale
      const index = (y * size + x) * 4
      let color = [233, 30, 99, 255]

      if (Math.hypot(px - 256, py - 256) <= 164) {
        color = [236, 66, 122, 255]
      }

      const bagBody =
        roundedRect(118, 236, 276, 160, 20, px, py) ||
        (py >= 136 && py <= 236 && px >= 168 && px <= 344 && Math.hypot(px - 256, py - 224) <= 88)

      if (bagBody) color = [255, 255, 255, 255]

      const handle =
        strokeSegment(px, py, 202, 224, 202, 236, 30) ||
        strokeSegment(px, py, 310, 224, 310, 236, 30) ||
        (py <= 236 && py >= 170 && Math.abs(Math.hypot(px - 256, py - 224) - 54) <= 15)

      if (handle) color = [233, 30, 99, 255]

      if (strokeSegment(px, py, 215, 300, 256, 324, 22) || strokeSegment(px, py, 256, 324, 297, 300, 22)) {
        color = [233, 30, 99, 255]
      }

      if (Math.hypot(px - 202, py - 276) <= 11 || Math.hypot(px - 310, py - 276) <= 11) {
        color = [233, 30, 99, 255]
      }

      rgba[index] = color[0]
      rgba[index + 1] = color[1]
      rgba[index + 2] = color[2]
      rgba[index + 3] = color[3]
    }
  }

  return pngEncode(size, size, rgba)
}

for (const size of sizes) {
  fs.writeFileSync(path.join(outputDir, `app-icon-${size}.png`), render(size))
}
