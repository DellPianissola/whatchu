import { useState } from 'react'

export const useFilterSheet = ({ defaults, onCommit }) => {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(defaults)

  const openWith = (currentValues) => {
    setPending(currentValues)
    setOpen(true)
  }

  const setField = (key, value) => {
    setPending((prev) => ({ ...prev, [key]: value }))
  }

  const close = () => {
    onCommit(pending)
    setOpen(false)
  }

  const clear = () => {
    setPending(defaults)
    onCommit(defaults)
    setOpen(false)
  }

  return { open, pending, setPending, setField, openWith, close, clear }
}
