"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValue } from "framer-motion"
import { useTheme } from "next-themes"

interface ParticleTextProps {
  text: string
}

class Particle {
  x: number
  y: number
  originX: number
  originY: number
  vx: number
  vy: number
  color: string
  size: number
  ease: number
  friction: number

  constructor(x: number, y: number, color: string) {
    // Start particles at random positions for an initial assembly animation
    this.x = x + (Math.random() - 0.5) * 500
    this.y = y + (Math.random() - 0.5) * 500
    this.originX = x
    this.originY = y
    this.vx = 0
    this.vy = 0
    this.color = color
    this.size = 1.5 // Size of the particle
    this.ease = 0.1 + Math.random() * 0.05 // Stronger pull to origin
    this.friction = 0.75 + Math.random() * 0.05 // Higher friction to prevent springy bouncing
  }

  update(mouse: { x: number; y: number; radius: number }) {
    // Repulsive force from mouse
    const dx = mouse.x - this.x
    const dy = mouse.y - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < mouse.radius) {
      const force = (mouse.radius - distance) / mouse.radius
      const angle = Math.atan2(dy, dx)
      // Accelerate away from mouse (increased multiplier for explosive effect)
      this.vx -= Math.cos(angle) * force * 30
      this.vy -= Math.sin(angle) * force * 30
    }

    // Spring force towards origin
    this.vx += (this.originX - this.x) * this.ease
    this.vy += (this.originY - this.y) * this.ease
    
    // Apply friction to dampen the movement
    this.vx *= this.friction
    this.vy *= this.friction

    // Update position
    this.x += this.vx
    this.y += this.vy
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function ParticleText({ text }: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    let particles: Particle[] = []
    let animationFrameId: number

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 120, // Interaction radius (increased for bigger scatter)
    }

    const init = () => {
      // Resize canvas to parent container
      const parent = canvas.parentElement
      if (!parent) return
      
      const width = Math.floor(parent.clientWidth)
      const height = Math.floor(parent.clientHeight)
      if (width === 0 || height === 0) return;

      // Adjust for high DPI displays for crisp rendering
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      
      // Ensure canvas CSS matches parent dimensions
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      particles = []

      // Offscreen canvas to measure and draw the text exactly
      const offscreenCanvas = document.createElement("canvas")
      const offCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true })
      if (!offCtx) return

      offscreenCanvas.width = width
      offscreenCanvas.height = height

      // Render text into the offscreen canvas
      const fontSize = Math.min(width / text.length * 1.6, height * 0.9) // Increased multiplier for maximum size
      offCtx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`
      offCtx.letterSpacing = `${fontSize * 0.08}px` // Add space between letters
      offCtx.fillStyle = "white"
      offCtx.textAlign = "center"
      offCtx.textBaseline = "middle"
      // Draw text exactly in the center using stroke to create an outline (border) effect
      offCtx.lineWidth = 8; // Adjust thickness of the text border
      offCtx.strokeStyle = "white";
      offCtx.strokeText(text, width / 2, height / 2)

      const imageData = offCtx.getImageData(0, 0, width, height)
      const data = imageData.data

      // Sample pixels to create particles
      const step = 3 // Decreased step for much higher resolution and smoother curves (like 'O')
      
      const isDark = resolvedTheme === "dark" || document.documentElement.classList.contains("dark")
      const particleColor = isDark 
        ? "rgba(255, 255, 255, 0.8)" 
        : "rgba(15, 23, 42, 0.8)"; // Slate 900 for light mode to match text

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4
          const alpha = data[index + 3]

          if (alpha > 128) { // If pixel is solid enough
            const p = new Particle(x, y, particleColor)
            p.size = 1.0 // Smaller particles for higher density
            particles.push(p)
          }
        }
      }
    }

    const animate = () => {
      // Clear canvas on every frame
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Update and draw all particles
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mouse)
        particles[i].draw(ctx)
      }
      
      animationFrameId = requestAnimationFrame(animate)
    }

    // Wait for fonts to load so the text measurement is accurate
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(init).then(animate);
    } else {
      init();
      animate();
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mouse.x = x
      mouse.y = y
      mouseX.set(x)
      mouseY.set(y)
    }

    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    // Add event listeners
    window.addEventListener("resize", init)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)
    
    // Support touch interactions
    const handleTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
      const y = e.touches[0].clientY - rect.top
      mouse.x = x
      mouse.y = y
      mouseX.set(x)
      mouseY.set(y)
    }
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener("resize", init)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      canvas.removeEventListener("touchmove", handleTouchMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [text, mouseX, mouseY, resolvedTheme])

  return (
    <div 
      className="w-full h-32 md:h-48 lg:h-64 relative flex justify-center items-center overflow-hidden my-4"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 cursor-none touch-none"
      />
      {/* Custom Cursor */}
      <motion.div
        className="hidden md:flex pointer-events-none absolute z-50 rounded-full border border-foreground/30 items-center justify-center bg-background/10 backdrop-blur-[1px]"
        animate={{
          width: isHovering ? 48 : 0,
          height: isHovering ? 48 : 0,
          opacity: isHovering ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
        style={{
          left: mouseX,
          top: mouseY,
          x: "-50%",
          y: "-50%",
        }}
      >
        <div className={`size-1.5 bg-foreground rounded-full transition-opacity duration-300 ${isHovering ? "opacity-100" : "opacity-0"}`} />
      </motion.div>
    </div>
  )
}
