import { useState, useRef, useEffect } from 'react'
import api from '../services/api'

function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`d-flex ${isUser ? 'justify-content-end' : 'justify-content-start'} mb-2`}>
      <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
        {content}
      </div>
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your Healthify coach. Ask me about meals, calories, or recipes!' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [cooldownLeft, setCooldownLeft] = useState(0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Tick cooldown timer
  useEffect(() => {
    if (!cooldownUntil) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now())/1000))
      setCooldownLeft(left)
      if (left <= 0) setCooldownUntil(0)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [cooldownUntil])

  const send = async () => {
    if (cooldownUntil && Date.now() < cooldownUntil) {
      // Silent ignore during cooldown to avoid spamming
      return
    }
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      // Filter out the initial greeting message and only send actual conversation
      const conversationHistory = [...messages, userMsg].filter((m, i) => {
        // Skip the first message if it's the initial assistant greeting
        if (i === 0 && m.role === 'assistant' && m.content.includes("I'm your Healthify coach")) {
          return false
        }
        return true
      })
      const { data } = await api.post('/chat', { messages: conversationHistory })
      console.log('Chat response:', data)
      const reply = data?.content || 'Stay hydrated and include greens in your meals today!'
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      if (data?.meta?.rate_limited || data?.meta?.cooled) {
        // set client cooldown for ~30s
        setCooldownUntil(Date.now() + 30_000)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const onAttachClick = () => fileRef.current?.click()

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file || loading) return
    if (cooldownUntil && Date.now() < cooldownUntil) return
    setLoading(true)
    try {
      // Show a placeholder user message
      setMessages((m) => [...m, { role: 'user', content: `Sent a photo: ${file.name}` }])
      const form = new FormData()
      form.append('image', file)
      const { data } = await api.post('/chat/image', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const reply = data?.content || 'I analyzed the photo.'
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      if (data?.meta?.rate_limited || data?.meta?.cooled) {
        setCooldownUntil(Date.now() + 30_000)
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to analyze the photo. Please try a different image.'
      setMessages((m) => [...m, { role: 'assistant', content: msg }])
    } finally {
      setLoading(false)
      // reset input so selecting the same file again triggers change
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="card card-healthy p-3 chat-box-glow" style={{height: '70vh'}}>
      <div className="d-flex align-items-center justify-content-between px-1 pb-2">
        <h5 className="mb-0 section-title"><span className="emoji">🥦</span> <span>Healthy Coach</span></h5>
        <div className="d-flex align-items-center gap-2">
          {cooldownUntil && Date.now() < cooldownUntil ? (
            <span className="badge bg-warning text-dark">Cooling down: {cooldownLeft}s</span>
          ) : null}
          <span className="badge bg-success">{loading ? 'Typing…' : 'Online'}</span>
        </div>
      </div>
      <div className="flex-grow-1 overflow-auto mb-3" style={{minHeight: 0}}>
        {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
        {loading && (
          <div className="d-flex justify-content-start mb-2">
            <div className="chat-bubble assistant">
              <span className="typing" aria-label="assistant typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input">
        <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" onChange={onPickImage} />
        <button className="btn-attach" type="button" onClick={onAttachClick} disabled={loading || (cooldownUntil && Date.now() < cooldownUntil)}>
          📎 Attach Photo
        </button>
        <textarea
          className="form-control chat-textarea"
          rows={1}
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask something healthy..."
        />
        <button className="btn-send" onClick={send} disabled={loading || (cooldownUntil && Date.now() < cooldownUntil)}>
          {loading ? 'Thinking…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
