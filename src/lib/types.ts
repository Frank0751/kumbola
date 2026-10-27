// ============================================================
// KumBola — shared TypeScript types
// ============================================================

export type Role = 'customer' | 'driver' | 'admin'
export type AccountType = 'household' | 'business' | 'institution'
export type WasteSize = 'small_sack' | 'standard_bin' | 'bulky'
export type WasteKind = 'general' | 'recyclables' | 'business' | 'institutional'
export type BookingType = 'one_off' | 'plan'
export type BookingStatus = 'pending' | 'assigned' | 'collected' | 'verified' | 'cancelled'
export type PreferredTime = 'now' | 'today' | 'tomorrow'

export interface Profile {
  id: string
  role: Role
  full_name: string
  phone: string | null
  email: string | null
  account_type: AccountType | null
  plan_id: string | null
  plan_credits: number
  municipality: string | null
  address: string | null
  wallet_balance: number
  vehicle_plate: string | null
  vehicle_type: string | null
  base_municipality: string | null
  rating: number
  rating_count: number
  total_jobs: number
  total_earnings: number
  is_online: boolean
  license_verified: boolean
  created_at: string
}

export interface Plan {
  id: string
  name: string
  description: string | null
  price_ghs: number
  pickups_per_month: number
  target: string | null
  is_active: boolean
  sort_order: number
}

export interface DisposalSite {
  id: string
  name: string
  type: 'landfill' | 'transfer_station' | 'recycling' | 'aggregation'
  lat: number
  lng: number
  geofence_radius_m: number
  municipality: string | null
  is_active: boolean
}

export interface Booking {
  id: string
  reference: string
  customer_id: string
  driver_id: string | null
  booking_type: BookingType
  plan_id: string | null
  waste_size: WasteSize
  waste_kind: WasteKind
  estimated_kg: number
  municipality: string
  address: string
  pickup_code: string
  preferred_time: PreferredTime
  notes: string | null
  amount_ghs: number
  driver_payout_ghs: number
  commission_ghs: number
  used_credit: boolean
  status: BookingStatus
  created_at: string
  assigned_at: string | null
  collected_at: string | null
  verified_at: string | null
  cancelled_at: string | null
  // joined
  customer?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'municipality' | 'account_type'>
  driver?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'rating' | 'vehicle_plate' | 'vehicle_type'> | null
  verification?: DisposalVerification | null
}

export interface DisposalVerification {
  id: string
  booking_id: string
  driver_id: string
  site_id: string
  weight_kg: number
  recyclables_kg: number
  lat: number | null
  lng: number | null
  distance_m: number | null
  within_geofence: boolean
  photo_url: string | null
  site_ticket: string | null
  method: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  site?: DisposalSite | null
}

export interface Transaction {
  id: string
  user_id: string
  booking_id: string | null
  type: 'payment' | 'payout' | 'bonus' | 'topup' | 'subscription' | 'commission'
  amount_ghs: number
  method: string
  network: string | null
  reference: string | null
  note: string | null
  created_at: string
}

export interface AppNotification {
  id: string
  user_id: string
  title: string
  body: string | null
  kind: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  created_at: string
}

export interface DumpingReport {
  id: string
  municipality: string
  location_text: string
  description: string | null
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'reviewing' | 'resolved'
  created_at: string
  reporter_name: string | null
}

// ---------- API payloads ----------

export interface SessionPayload {
  access_token: string
  refresh_token: string
  expires_at: number // epoch seconds
  profile: Profile
}

export interface MePayload {
  profile: Profile
  plan: Plan | null
  notifications: AppNotification[]
  unread: number
}

export interface CustomerDashboardPayload {
  bookings: Booking[]
  transactions: Transaction[]
}

export interface DriverDashboardPayload {
  available: Booking[]
  active: Booking | null
  history: Booking[]
  transactions: Transaction[]
  onlineDrivers: number
  leaderboard: { id: string; full_name: string; rating: number; total_jobs: number; total_earnings: number; vehicle_plate: string | null }[]
}

export interface AdminDashboardPayload {
  kpis: {
    households: number
    businesses: number
    drivers: number
    onlineDrivers: number
    bookingsToday: number
    tonnesVerified: number
    recyclablesKg: number
    verificationRate: number
    revenueCommission: number
    driverPayouts: number
    pendingJobs: number
    openReports: number
    walletFloat: number
  }
  daily: { date: string; bookings: number; tonnes: number }[]
  byMunicipality: { municipality: string; tonnes: number; bookings: number }[]
  byStatus: { status: BookingStatus; count: number }[]
  revenueMix: { label: string; value: number }[]
  drivers: Profile[]
  recentBookings: Booking[]
  reports: DumpingReport[]
  sites: DisposalSite[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
