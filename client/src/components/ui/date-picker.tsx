import * as React from "react"
import { format, parse } from "date-fns"
import { pl } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

// ─── Date-only picker (for date fields) ────────────────────────────────────

interface DatePickerProps {
  value: string // yyyy-MM-dd or ""
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Wybierz datę",
  disabled = false,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const isValidDate = date && !isNaN(date.getTime())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-text-muted"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isValidDate
            ? format(date, "d MMMM yyyy", { locale: pl })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={isValidDate ? date : undefined}
          onSelect={(day) => {
            if (day) {
              onChange(format(day, "yyyy-MM-dd"))
            } else {
              onChange("")
            }
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── DateTime picker (for datetime-local fields) ───────────────────────────

interface DateTimePickerProps {
  value: string // ISO datetime or ""
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Wybierz datę i godzinę",
  disabled = false,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const date = value ? new Date(value) : undefined
  const isValidDate = date && !isNaN(date.getTime())

  // Extract time portion or default to "08:00"
  const timeValue = isValidDate
    ? format(date, "HH:mm")
    : "08:00"

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) {
      onChange("")
      setOpen(false)
      return
    }
    const [hours, minutes] = timeValue.split(":").map(Number)
    day.setHours(hours, minutes, 0, 0)
    onChange(day.toISOString())
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    if (!isValidDate) return
    const [hours, minutes] = newTime.split(":").map(Number)
    const updated = new Date(date)
    updated.setHours(hours, minutes, 0, 0)
    onChange(updated.toISOString())
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-text-muted"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isValidDate
            ? format(date, "d MMMM yyyy, HH:mm", { locale: pl })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={isValidDate ? date : undefined}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="border-t border-border px-3 py-2 flex items-center gap-2">
          <span className="text-sm text-text-muted">Godzina:</span>
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="w-auto"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
