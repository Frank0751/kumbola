// ============================================================
// KumBola — brand constants, pricing & platform reference data
// Source: KumBola Grant Proposal (KoomBei Digital × WasteCure)
// ============================================================

export const APP_NAME = 'KumBola'
export const APP_TAGLINE = 'Kum Bola — kill trash'
export const SUPPORT_EMAIL = 'hello@kumbola.com'
export const SUPPORT_PHONE = '+233 55 000 0000'
export const USSD_CODE = '*920*88#'
export const DRIVER_COMMISSION = 0.15 // platform keeps 15%, driver keeps 85%
export const RECYCLABLES_BONUS_PER_KG = 0.5
export const PLAN_PICKUP_TARIFF = 9.97 // blended per-pickup tariff (GHS)

export const MUNICIPALITIES = [
  { id: 'suame', name: 'Suame', phase: 'Pilot', population: 136290 },
  { id: 'kwabre_east', name: 'Kwabre East', phase: 'Pilot', population: 296814 },
  { id: 'oforikrom', name: 'Oforikrom', phase: 'Pilot', population: 213126 },
  { id: 'asokwa', name: 'Asokwa', phase: 'Year 2', population: null as number | null },
  { id: 'old_tafo', name: 'Old Tafo', phase: 'Year 2', population: null as number | null },
  { id: 'kwadaso', name: 'Kwadaso', phase: 'Year 2', population: null as number | null },
] as const

export const MUNICIPALITY_NAMES = MUNICIPALITIES.map((m) => m.name)

// One-off pickup pricing (GHS)
export const ONE_OFF_PRICES: Record<string, number> = {
  small_sack: 6,
  standard_bin: 12,
  bulky: 25,
}

export const WASTE_SIZES: {
  id: 'small_sack' | 'standard_bin' | 'bulky'
  label: string
  hint: string
  estKg: number
}[] = [
  { id: 'small_sack', label: 'Small sack', hint: 'One refuse sack, ~15 kg', estKg: 15 },
  { id: 'standard_bin', label: 'Standard bin', hint: '240 L bin or 2–3 sacks, ~40 kg', estKg: 40 },
  { id: 'bulky', label: 'Bulky load', hint: 'Furniture, mattresses, rubble, ~250 kg', estKg: 250 },
]

// Static plan cards for marketing (DB remains source of truth in-app)
export const PLAN_CARDS = [
  {
    id: 'individual_weekly', name: 'Individual Weekly', price: 45, per: 'month',
    pickups: '≈ 4 pickups / month', badge: 'Most popular',
    target: 'Most households',
    features: ['One 240-litre bin or 3 sacks a week', 'Fixed, published tariff', 'Proof-of-disposal receipt', 'Priority dispatch'],
  },
  {
    id: 'compound_shared', name: 'Compound Shared', price: 30, per: 'month / household',
    pickups: '≈ 2 pickups / month', badge: 'Best value',
    target: 'Compound houses',
    features: ['Share a bin with your compound', 'About GHS 1 a day', 'Twice-weekly collection', 'Colour-coded sacks included'],
  },
  {
    id: 'premium_twice_weekly', name: 'Premium Twice-Weekly', price: 80, per: 'month',
    pickups: '≈ 9 pickups / month', badge: null as string | null,
    target: 'Larger households',
    features: ['Collection every 3–4 days', 'Two recyclables runs weekly', 'Priority same-day pickup', 'Quarterly impact report'],
  },
  {
    id: 'payg', name: 'Pay-As-You-Go', price: 24, per: 'month avg · GHS 6 / sack',
    pickups: 'Book whenever you need', badge: 'No commitment',
    target: 'Low-income & irregular users',
    features: ['GHS 6 per small sack', 'No monthly commitment', 'Cash at registered agents', 'Full platform protection'],
  },
  {
    id: 'business', name: 'Business', price: 300, per: 'month',
    pickups: '3 pickups / week', badge: null as string | null,
    target: 'Shops, chop bars, hostels & schools',
    features: ['Scheduled commercial collection', 'Compliance records & invoices', 'Dedicated business support', 'Monthly tonnage dashboard'],
  },
  {
    id: 'institutional', name: 'Institutional Zone', price: 15000, per: 'month / zone',
    pickups: 'Zone-wide service', badge: 'City partners',
    target: 'Assembly zones, markets & estates',
    features: ['Dedicated operator crews', 'Live city dashboard included', 'Geofenced disposal verification', 'Monthly SLA reporting'],
  },
]

// Five-step job cycle (Table 3 of the proposal)
export const HOW_IT_WORKS = [
  { step: 1, title: 'Book', icon: 'smartphone', text: 'Book on the web app (USSD, WhatsApp & agents coming soon). Choose a plan or a one-off pickup.' },
  { step: 2, title: 'Dispatch', icon: 'radar', text: 'The platform assigns the nearest vetted Aboboyaa operator. You see name, photo, plate and arrival time.' },
  { step: 3, title: 'Collect', icon: 'trash-2', text: 'The operator collects and confirms with your pickup code. Sorted recyclables are logged by weight.' },
  { step: 4, title: 'Verify disposal', icon: 'shield-check', text: 'GPS geofence, timestamped photo and site ticket prove the load reached an approved site.' },
  { step: 5, title: 'Pay', icon: 'wallet', text: 'The operator is paid 85% by mobile money the same day. You get a receipt; the city dashboard updates.' },
]

// Impact numbers from the proposal (static, marketing)
export const IMPACT = {
  cityWastePerDay: 2000,          // tonnes
  informalShare: 61.5,            // % of households relying on informal collectors (Suame)
  targetHouseholds: 20000,
  targetPeople: 72000,
  targetBusinesses: 600,
  drivers: 127,
  tonnesVerified: 26195,
  recyclablesTonnes: 1478,
  co2Avoided: 2619,
  driverIncomeGhs: 11584072,
  grantPerTonne: 66,
  commissionPercent: 15,
  breakEvenMonth: 27,
  operatorEarningsMin: 2296,
  operatorEarningsMax: 3296,
  minimumWageMultiple: 5.8,
}

export const PROBLEM_STATS = [
  { value: '2,000 t', label: 'waste generated daily in Greater Kumasi', source: 'KMA via GBC, 2026' },
  { value: '61.5%', label: 'of Suame households rely on informal collectors', source: 'Ampong et al., 2024' },
  { value: '16%', label: 'of metropolitan waste ends in unapproved dumps', source: 'KMA Composite Budget, 2026' },
  { value: '14–16 mo', label: 'until the Oti landfill is full without new cells', source: 'MyJoyOnline, 2026' },
]

export const DIFFERENTIATORS = [
  { title: 'Tricycle-first', text: 'Aboboyaa reach the lanes and compound houses that compactor trucks cannot enter.', icon: 'truck' },
  { title: 'Proof of disposal', text: 'No operator is paid until GPS, photo and site ticket confirm an approved site.', icon: 'shield-check' },
  { title: 'Open marketplace', text: 'Existing operators join as partners with licences, PPE and NHIS — not competitors.', icon: 'handshake' },
  { title: 'Fair economics', text: 'A transparent 15% commission. Drivers keep 85% and are paid daily by mobile money.', icon: 'wallet' },
  { title: 'Inclusive by design', text: 'USSD, agent and cash channels keep the service within reach of every household.', icon: 'users' },
  { title: 'City data', text: 'Live heatmaps and verified tonnage give assemblies the evidence they lack.', icon: 'bar-chart-3' },
]

export const FAQS = [
  { q: 'What does “KumBola” mean?', a: '“Kum” is Twi for kill and “bola” is Twi for refuse — so the name means “kill trash”, with a nod to founder Frank Koomson’s family name.' },
  { q: 'Is KumBola a government or KMA project?', a: 'No. KumBola is an independent public-private platform built and operated by KoomBei Digital × WasteCure. KMA and the Suame, Kwabre East and Oforikrom assemblies are valued partners under MoU — alongside the Tricycle Riders Association and KNUST researchers — but no single assembly owns or runs the service.' },
  { q: 'How do I book a pickup?', a: 'Right here on the web app: sign up, choose a plan or a one-off pickup, and pay by mobile money. USSD, WhatsApp and community-agent booking are on the roadmap so any phone can use KumBola.' },
  { q: 'How do drivers get paid?', a: 'Drivers keep 85% of every fare and are paid by mobile money the same day. A per-kilogram bonus is paid for clean segregated recyclables. Payments are released only after disposal is verified.' },
  { q: 'What is “proof of disposal”?', a: 'Every job ends at an approved site. The driver app records arrival inside a GPS geofence, a timestamped photo and the site ticket. If these don’t match, the operator isn’t paid — illegal dumping stops being profitable.' },
  { q: 'Which areas do you serve?', a: 'Pilot municipalities are Suame, Kwabre East and Oforikrom. Asokwa, Old Tafo and Kwadaso follow in Year 2.' },
  { q: 'Can I pay cash?', a: 'Yes — cash is accepted at registered community agents and logged on the platform, so you still get full protection and receipts.' },
]

/**
 * Coalition of partners. KumBola is an independent platform built and owned by
 * KoomBei Digital × WasteCure; KMA and the local assemblies are valued PARTNERS
 * (MoU), not owners or sole operators.
 */
export const PARTNERS = [
  { name: 'KoomBei Digital', role: 'Technology lead' },
  { name: 'WasteCure Limited', role: 'Implementation lead' },
  { name: 'Suame · Kwabre East · Oforikrom', role: 'Partner assemblies (MoU)' },
  { name: 'KMA', role: 'Partner assembly (MoU)' },
  { name: 'Tricycle Riders Assn.', role: 'Operator voice' },
  { name: 'KNUST Research', role: 'Independent evaluation' },
]

export const DEMO_ACCOUNTS = [
  { email: 'customer@kumbola.com', label: 'Household customer', name: 'Ama Serwaa', icon: 'home' },
  { email: 'driver@kumbola.com', label: 'Aboboyaa driver', name: 'Kwame Osei', icon: 'truck' },
  { email: 'business@kumbola.com', label: 'Business customer', name: 'Jollof Junction', icon: 'store' },
  { email: 'admin@kumbola.com', label: 'City admin', name: 'City Sanitation Desk', icon: 'landmark' },
]

export const MOMO_NETWORKS = ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money']

export function priceForSize(size: string): number {
  return ONE_OFF_PRICES[size] ?? 12
}

export function sizeLabel(size: string): string {
  return WASTE_SIZES.find((s) => s.id === size)?.label ?? size
}
