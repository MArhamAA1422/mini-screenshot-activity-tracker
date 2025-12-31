export const validateLogin = (email: string, password: string): string | null => {
  if (!email.trim()) return "Email is required"
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Invalid email format"
  if (!password) return "Password is required"
  if (password.length < 4) return "Password length should be at least 4"
  return null
}

export const validateSignup = (data: {
  ownerName: string
  ownerEmail: string
  companyName: string
  password: string
  planId: number
}): string | null => {
  if (!data.ownerName.trim() || data.ownerName.length < 2) {
    return "Owner name must be at least 2 characters"
  }

  if (!data.ownerEmail.trim()) {
    return "Email is required"
  }

  if (!/^\S+@\S+\.\S+$/.test(data.ownerEmail)) {
    return "Invalid email format"
  }

  if (!data.companyName.trim() || data.companyName.length < 2) {
    return "Company name must be at least 2 characters"
  }

  if (!data.password || data.password.length < 4) {
    return "Password must be at least 4 characters"
  }

  if (![1, 2, 3].includes(data.planId)) {
    return "Please select a valid plan"
  }

  return null
}

export const validateEmployee = (data: {
  name: string
  email: string
  password: string
  screenshotInterval: number
}): string | null => {
  if (!data.name.trim() || data.name.length < 2) {
    return "Employee name must be at least 2 characters"
  }

  if (!data.email.trim()) {
    return "Email is required"
  }

  if (!/^\S+@\S+\.\S+$/.test(data.email)) {
    return "Invalid email format"
  }

  if (!data.password || data.password.length < 4) {
    return "Password must be at least 4 characters"
  }

  if (![5, 10].includes(data.screenshotInterval)) {
    return "Screenshot interval must be 5 or 10 minutes"
  }

  return null
}
