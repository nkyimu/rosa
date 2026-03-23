interface MemberAvatarProps {
  address: string
  size?: number
}

/**
 * Deterministic avatar generator using Adinkra-inspired geometric patterns
 * Generates consistent, beautiful avatars from Ethereum addresses
 */
export function MemberAvatar({ address, size = 40 }: MemberAvatarProps) {
  // ROSA design tokens
  const COLORS = {
    cream: '#f5f4ef',
    rust: '#c85a3f',
    olive: '#6B7D5E',
    brown: '#2D2520',
    taupe: '#B7B0A2',
    celo: '#35D07F',
  }

  const COLOR_PALETTE = Object.values(COLORS)

  // Create a deterministic hash from the address
  function hashAddress(addr: string): number {
    const normalized = addr.toLowerCase().replace('0x', '')
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  // Pseudo-random number generator seeded by hash
  function seededRandom(seed: number, index: number): number {
    const x = Math.sin((seed + index) * 12.9898) * 43758.5453
    return x - Math.floor(x)
  }

  const hash = hashAddress(address)

  // Select background color deterministically
  const bgColorIndex = hash % COLOR_PALETTE.length
  const bgColor = COLOR_PALETTE[bgColorIndex]

  // Select accent colors (different from background)
  const accentIndex1 = (hash + 1) % COLOR_PALETTE.length
  const accentColor1 = COLOR_PALETTE[accentIndex1]
  const accentIndex2 = (hash + 2) % COLOR_PALETTE.length
  const accentColor2 = COLOR_PALETTE[accentIndex2]

  // Determine pattern type (0-4 for 5 Adinkra patterns)
  const patternType = Math.floor(seededRandom(hash, 0) * 5)

  // Determine stroke color (contrasting)
  const strokeColor = bgColor === COLORS.cream ? COLORS.brown : COLORS.cream

  /**
   * Adinkra Pattern 1: Gye Nyame (all-knowing eye)
   * Nested circles with center dot
   */
  function renderGyeNyame() {
    const cx = size / 2
    const cy = size / 2
    const r1 = size * 0.35
    const r2 = size * 0.2
    const r3 = size * 0.08

    return (
      <>
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke={accentColor1} strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke={accentColor2} strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r3} fill={accentColor1} />
      </>
    )
  }

  /**
   * Adinkra Pattern 2: Asase Ye Duru (earth is heavy)
   * Triangular grid pattern
   */
  function renderAsaseYeDuru() {
    const spacing = size / 3.5
    const triangles: JSX.Element[] = []

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = spacing + col * spacing * 0.8
        const y = spacing + row * spacing * 0.8

        // Alternate triangle colors
        const triangleColor = (row + col) % 2 === 0 ? accentColor1 : accentColor2
        const points = `${x},${y - spacing * 0.2} ${x - spacing * 0.15},${y + spacing * 0.1} ${x + spacing * 0.15},${y + spacing * 0.1}`

        triangles.push(
          <polygon key={`tri-${row}-${col}`} points={points} fill={triangleColor} opacity="0.7" />
        )
      }
    }
    return triangles
  }

  /**
   * Adinkra Pattern 3: Nkonsonkonson (binding chain)
   * Connected nodes in geometric arrangement
   */
  function renderNkonsonkonson() {
    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.25
    const dotRadius = size * 0.06

    // Create nodes in circular pattern
    const nodes: Array<{ x: number; y: number }> = []
    const numNodes = 6
    for (let i = 0; i < numNodes; i++) {
      const angle = (i / numNodes) * Math.PI * 2
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      nodes.push({ x, y })
    }

    // Draw connections
    const lines = nodes.map((node, i) => {
      const nextNode = nodes[(i + 1) % nodes.length]
      return (
        <line
          key={`line-${i}`}
          x1={node.x}
          y1={node.y}
          x2={nextNode.x}
          y2={nextNode.y}
          stroke={accentColor1}
          strokeWidth="1"
          opacity="0.6"
        />
      )
    })

    // Draw nodes
    const circles = nodes.map((node, i) => (
      <circle key={`node-${i}`} cx={node.x} cy={node.y} r={dotRadius} fill={accentColor2} />
    ))

    // Center circle
    const centerCircle = <circle cx={cx} cy={cy} r={dotRadius * 1.2} fill={accentColor1} />

    return [...lines, ...circles, centerCircle]
  }

  /**
   * Adinkra Pattern 4: Fihankra (household)
   * Stacked geometric squares
   */
  function renderFihankra() {
    const cx = size / 2
    const cy = size / 2
    const baseSize = size * 0.25

    const squares = [
      {
        size: baseSize * 2,
        color: accentColor1,
        opacity: 0.3,
      },
      {
        size: baseSize * 1.3,
        color: accentColor2,
        opacity: 0.6,
      },
      {
        size: baseSize,
        color: accentColor1,
        opacity: 1,
      },
    ]

    return squares.map((square, i) => (
      <rect
        key={`sq-${i}`}
        x={cx - square.size / 2}
        y={cy - square.size / 2}
        width={square.size}
        height={square.size}
        fill="none"
        stroke={square.color}
        strokeWidth="1.2"
        opacity={square.opacity}
      />
    ))
  }

  /**
   * Adinkra Pattern 5: Nyansa (wisdom)
   * Dot grid with varying opacity
   */
  function renderNyansa() {
    const gridSize = 4
    const dotRadius = size * 0.04
    const spacing = size / (gridSize + 1)
    const dots: JSX.Element[] = []

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = spacing * (col + 1)
        const y = spacing * (row + 1)

        // Create pattern where dots fade based on distance from center
        const cx = size / 2
        const cy = size / 2
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        const maxDist = Math.sqrt(cx ** 2 + cy ** 2)
        const opacity = 1 - dist / maxDist * 0.7

        const dotColor = (row + col) % 2 === 0 ? accentColor1 : accentColor2

        dots.push(
          <circle
            key={`dot-${row}-${col}`}
            cx={x}
            cy={y}
            r={dotRadius}
            fill={dotColor}
            opacity={opacity}
          />
        )
      }
    }
    return dots
  }

  // Select pattern based on deterministic hash
  const patterns = [
    renderGyeNyame(),
    renderAsaseYeDuru(),
    renderNkonsonkonson(),
    renderFihankra(),
    renderNyansa(),
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-block',
        border: `1.5px solid ${strokeColor}`,
      }}
    >
      {/* Background */}
      <rect width={size} height={size} fill={bgColor} />

      {/* Pattern */}
      <g>{patterns[patternType]}</g>
    </svg>
  )
}
