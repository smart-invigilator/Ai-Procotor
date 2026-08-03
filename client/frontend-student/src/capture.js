// Capture + stream service for the student client.
// Grabs webcam and (optionally) screen, encodes frames as JPEG, and streams
// them to the backend over Socket.IO using the event contract the server
// expects: student:join, frame:webcam, frame:screen, heartbeat.
import { io } from 'socket.io-client'
import { BASE } from './api'

export class CaptureService {
  constructor() {
    this.socket = null
    this.webcamStream = null
    this.screenStream = null
    this.webcamVideo = null
    this.screenVideo = null
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.timers = []
    this.onStatus = () => {}
    this.studentId = null
    this.fps = 6          // webcam frames/sec sent to server
    this.screenFps = 1    // screen frames/sec (lighter)
    this.jpegQuality = 0.5
  }

  async connect(token) {
    this.socket = io(BASE, { path: '/socket.io', transports: ['websocket'] })
    return new Promise((resolve, reject) => {
      this.socket.on('connect', async () => {
        const ack = await this.socket
          .timeout(5000)
          .emitWithAck('student:join', { token })
          .catch(() => ({ ok: false }))
        if (ack?.ok) {
          this.studentId = ack.studentId
          this.onStatus({ connected: true, studentId: ack.studentId })
          resolve(ack)
        } else {
          reject(new Error(ack?.error || 'join failed'))
        }
      })
      this.socket.on('disconnect', () => this.onStatus({ connected: false }))
    })
  }

  async startWebcam() {
    this.webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 }, audio: false,
    })
    this.webcamVideo = document.createElement('video')
    this.webcamVideo.srcObject = this.webcamStream
    this.webcamVideo.muted = true
    await this.webcamVideo.play()
    this.timers.push(setInterval(() => this._sendFrame('webcam'), 1000 / this.fps))
    this.timers.push(setInterval(() => this.socket?.emit('heartbeat', {}), 5000))
    this.onStatus({ webcam: true })
  }

  async startScreen() {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 5 }, audio: false,
    })
    this.screenVideo = document.createElement('video')
    this.screenVideo.srcObject = this.screenStream
    this.screenVideo.muted = true
    await this.screenVideo.play()
    // Stop streaming if the user ends the screen share
    this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      this.onStatus({ screen: false })
    })
    this.timers.push(setInterval(() => this._sendFrame('screen'), 1000 / this.screenFps))
    this.onStatus({ screen: true })
  }

  _sendFrame(kind) {
    const video = kind === 'webcam' ? this.webcamVideo : this.screenVideo
    if (!video || !this.socket || video.readyState < 2) return
    const w = kind === 'webcam' ? 640 : 960
    const h = kind === 'webcam' ? 480 : 540
    this.canvas.width = w
    this.canvas.height = h
    this.ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = this.canvas.toDataURL('image/jpeg', this.jpegQuality)
    const b64 = dataUrl.split(',')[1]
    this.socket.emit(kind === 'webcam' ? 'frame:webcam' : 'frame:screen', { image: b64 })
  }

  stop() {
    this.timers.forEach(clearInterval)
    this.timers = []
    this.webcamStream?.getTracks().forEach((t) => t.stop())
    this.screenStream?.getTracks().forEach((t) => t.stop())
    this.socket?.disconnect()
    this.socket = null
    this.onStatus({ connected: false, webcam: false, screen: false })
  }
}
