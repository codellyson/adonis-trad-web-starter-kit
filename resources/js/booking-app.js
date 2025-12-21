function createBookingApp(config = {}) {
  const { businessSlug, csrfToken, staffCount = 0 } = config
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    selectedService: null,
    selectedStaffId: '',
    selectedDate: '',
    selectedTime: '',
    timeSlots: [],
    loadingSlots: false,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    submitting: false,
    minDate: new Date().toISOString().split('T')[0],

    datePickerOpen: false,
    calMonth: today.getMonth(),
    calYear: today.getFullYear(),
    timeFilter: 'all',

    selectService(id, name, price, duration) {
      this.selectedService = { id, name, price, duration }
      this.selectedTime = ''
      this.timeSlots = []
      if (this.selectedDate) {
        this.fetchTimeSlots()
      }
    },

    async fetchTimeSlots() {
      if (!this.selectedService || !this.selectedDate) return
      this.loadingSlots = true
      this.timeSlots = []
      try {
        let url = `/book/${businessSlug}/service/${this.selectedService.id}/slots?date=${this.selectedDate}`
        if (this.selectedStaffId) {
          url += `&staffId=${this.selectedStaffId}`
        }
        const res = await fetch(url)
        const data = await res.json()
        this.timeSlots = data.slots || []
      } catch (e) {
        console.error(e)
      }
      this.loadingSlots = false
    },

    formatTime(time) {
      if (!time) return ''
      const [h, m] = time.split(':')
      const hour = parseInt(h)
      const suffix = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${m} ${suffix}`
    },

    formatDisplayDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr + 'T00:00:00')
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    },

    formatFullDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr + 'T00:00:00')
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    },

    get calMonthYearDisplay() {
      return new Date(this.calYear, this.calMonth).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    },

    get calendarDays() {
      const days = []
      const firstDay = new Date(this.calYear, this.calMonth, 1)
      const lastDay = new Date(this.calYear, this.calMonth + 1, 0)
      const startingDay = firstDay.getDay()
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)

      for (let i = 0; i < startingDay; i++) {
        days.push({ date: null, day: null })
      }

      for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = new Date(this.calYear, this.calMonth, i)
        const dateStr = this.formatDateValue(date)
        const isPast = date < todayDate

        days.push({
          date: dateStr,
          day: i,
          disabled: isPast,
          today: date.getTime() === todayDate.getTime(),
          selected: dateStr === this.selectedDate,
        })
      }

      return days
    },

    get filteredTimeSlots() {
      if (this.timeFilter === 'all') return this.timeSlots

      return this.timeSlots.filter((slot) => {
        const hour = parseInt(slot.time.split(':')[0])
        if (this.timeFilter === 'morning') return hour >= 6 && hour < 12
        if (this.timeFilter === 'afternoon') return hour >= 12 && hour < 17
        if (this.timeFilter === 'evening') return hour >= 17 && hour < 24
        return true
      })
    },

    formatDateValue(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },

    pickDate(dateStr) {
      this.selectedDate = dateStr
      this.datePickerOpen = false
      this.selectedTime = ''
      this.timeSlots = []
      this.fetchTimeSlots()
    },

    prevCalMonth() {
      if (this.calMonth === 0) {
        this.calMonth = 11
        this.calYear--
      } else {
        this.calMonth--
      }
    },

    nextCalMonth() {
      if (this.calMonth === 11) {
        this.calMonth = 0
        this.calYear++
      } else {
        this.calMonth++
      }
    },

    goToToday() {
      const todayDate = new Date()
      this.calMonth = todayDate.getMonth()
      this.calYear = todayDate.getFullYear()
      const dateStr = this.formatDateValue(todayDate)
      this.pickDate(dateStr)
    },

    clearDateSelection() {
      this.selectedDate = ''
      this.selectedTime = ''
      this.timeSlots = []
      this.datePickerOpen = false
    },

    async submitBooking() {
      if (this.submitting) return
      this.submitting = true
      try {
        const res = await fetch(`/book/${businessSlug}/service/${this.selectedService.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          body: JSON.stringify({
            date: this.selectedDate,
            time: this.selectedTime,
            customerName: this.customerName,
            customerEmail: this.customerEmail,
            customerPhone: this.customerPhone,
            staffId: this.selectedStaffId || undefined,
          }),
        })
        const data = await res.json()
        if (data.redirect) {
          window.location.href = data.redirect
        }
      } catch (e) {
        console.error(e)
        alert('Something went wrong. Please try again.')
      }
      this.submitting = false
    },
  }
}

if (typeof window !== 'undefined') {
  window.createBookingApp = createBookingApp
}

