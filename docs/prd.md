# Requirements Document

## 1. Application Overview

**Application Name**: Wulfrayn's DB (RPM Motors AI Sales Copilot)

**Version**: v75

**Description**: Comprehensive automotive dealership management web application with embedded AI assistant, deterministic Command Center, and external AI integration capabilities. Version 75 introduces critical Live Display fixes with full real-time sync, massively expanded Auction Guide and Car Knowledge Library with visual indicators, enhanced Partner Referrals with tracking and analytics, new Marketing and Social Media management pages, enhanced WhatsApp Notes and Invoicing features, AI Chatbot repositioned as core feature with expanded capabilities, new comprehensive Import Cars Guide covering multiple countries, full Theme Customisation system, site-wide AI feature expansion, and complete TypeScript/lint error fixes.

## 2. Users and Usage Scenarios

**Target Users**:
- Dealership Owner
- Sales Managers
- Sales Executives
- Inventory Managers
- Customer Service Representatives
- Finance Officers
- External AI assistants (via API key)
- Referring Partners

**Core Usage Scenarios**:
- Use AI Chatbot (core feature) for vehicle valuation, market analysis, negotiation coaching, inspection assistance
- View live inventory and inquiries on professional screening monitor with real-time sync
- Access comprehensive auction guide with grading systems, bidding strategies, visual grade charts
- Reference expanded car knowledge library with visual indicators for technical information
- Manage partner referrals with tracking, commission calculation, performance leaderboard
- Track marketing campaigns with ROI calculator and conversion funnel visualization
- Schedule social media posts with analytics comparison and engagement tracking
- Manage WhatsApp communications with templates, bulk messaging, contact groups
- Generate invoices with multiple templates, partial payment tracking, recurring invoices
- Customize site theme with color picker, font selector, live preview
- Access comprehensive import guide for cars from China, Japan, Germany, Italy, UK, USA, South Korea, Australia
- Use AI-powered features across all pages for deal assistance, inventory description, price suggestion
- All v74 core scenarios remain supported

## 3. Page Structure and Functionality

```
├── Login Page
├── Dashboard
├── AI Chatbot (CORE FEATURE — TOP OF SIDEBAR)
├── Command Center v2.0
├── Inventory Management
├── Customer & Leads
├── Quotations
├── Invoice Management (Enhanced)
├── Japanese Auction & Import
│   └── Auction Guide (Massively Expanded)
├── Social Media & Listings (Enhanced)
├── Marketing (New Enhanced Page)
├── WhatsApp Notes (Enhanced)
├── Analytics & Reports
├── Finance Options
├── Shipment Tracking
├── Expenses
├── Document Assistant
├── Vehicle Comparison Page
├── Dealers Management
├── Live Display (Fixed + Enhanced)
├── Scratchpad
├── Tasks
├── Car Knowledge Library (Massively Expanded)
├── Partner Referral Program (Enhanced)
├── Import Cars Guide (New Comprehensive Page)
├── API Key Management
├── External AI Integration Guide
├── Settings (Theme Customisation Added)
└── Source Code v75 (Complete Download)
```

### 3.1 AI Chatbot (CORE FEATURE — TOP OF SIDEBAR)

**Position**: First item in sidebar navigation, above all other pages

**Expanded Capabilities**:

**Vehicle Valuation AI**:
- Analyze vehicle condition, market demand, historical sales, competitor pricing
- Provide estimated market value range with confidence score
- Suggest optimal asking price for fastest sale vs maximum profit
- Compare with similar vehicles in inventory and market

**Market Analysis AI**:
- Analyze market trends, demand forecasts, seasonal patterns
- Identify trending models, price movements, competitor activity
- Provide actionable market insights and recommendations

**Negotiation Coach**:
- Provide negotiation strategies based on customer profile and vehicle
- Suggest counter-offers, closing techniques, objection handling
- Analyze deal probability and recommend next steps

**Inspection Assistant**:
- Guide through vehicle inspection checklist
- Identify common issues by make/model
- Suggest repair cost estimates
- Recommend inspection priorities

**Import Cost Calculator AI**:
- Calculate complete landed cost for imports from any country
- Analyze profitability, risk level, market demand
- Recommend bid strategy and target profit
- Compare import costs across different countries

**Competitor Pricing AI**:
- Analyze competitor pricing for similar vehicles
- Identify pricing gaps and opportunities
- Suggest competitive pricing strategy
- Track competitor inventory changes

**Customer Profiling AI**:
- Analyze customer behavior, preferences, budget
- Predict purchase probability and timeline
- Recommend best vehicles for customer
- Suggest follow-up timing and messaging

**Deal Scoring AI**:
- Score deals based on profitability, risk, customer fit
- Identify high-value deals requiring immediate attention
- Recommend deal prioritization
- Analyze deal pipeline health

**All v74 AI Copilot capabilities remain supported**

### 3.2 Live Display (Fixed + Enhanced)

**Critical Fixes**:
- Fix offline status — implement proper Supabase real-time subscriptions
- Stock section displays ALL live inventory with real-time updates
- Requirements/Inquiries section displays ALL live inquiries fully synced with database
- Real-time sync using Supabase subscriptions (not polling)
- All data updates immediately without page reload

**Enhanced Display Modes**:
- Grid View: vehicle cards with images
- List View: compact rows
- Table View: detailed columns
- Slideshow Mode: auto-rotate through vehicles
- Split View: stock on left, inquiries on right

**Announcement Ticker**:
- Scrolling ticker at top or bottom
- Display custom announcements, promotions, urgent messages
- Admin can add/edit/remove announcements
- Adjustable ticker speed

**Color Themes**:
- Dark Mode (default)
- Light Mode
- Branded Mode (uses dealership brand colors)
- Theme selector in display settings

**Font Size Controls**:
- Small, Medium, Large, Extra Large options
- Adjustable for better visibility from distance

**Auto-Rotate Sections**:
- Automatically cycle through: Available Vehicles → Reserved Vehicles → Inquiries → Requirements
- Configurable rotation interval (30s, 60s, 120s)
- Manual override to pause rotation

**Clock Display**:
- Digital clock showing current time
- Date display
- Timezone selector

**Dealership Branding**:
- Display dealership logo
- Custom brand colors
- Custom header text
- Contact information display

**All v74 Live Display features remain supported**

### 3.3 Auction Guide (Massively Expanded)

**Location**: Under Japanese Auction & Import section

**Expanded Content**:

**Grading Systems**:
- JDM Auction Sheet Grading: 4.5, 4, 3.5, 3, 2, 1, R, RA with detailed explanations
- USS Grading System: specific criteria and examples
- TAA Grading System: specific criteria and examples
- CAA Grading System: specific criteria and examples
- JU Grading System: specific criteria and examples
- Visual Grade Charts: color-coded charts showing grade meanings
- Condition Code Explanations: A1, A2, B, C, D, E, F, G, H, S, U, W, X, XX
- Interior Grade System: A, B, C, D
- Exterior Grade System: detailed panel-by-panel grading

**Bidding Strategies**:
- Pre-Auction Research: how to analyze auction sheets, market research
- Bid Timing: early vs late bidding strategies
- Proxy Bidding: how to set maximum bids
- Live Bidding: real-time bidding tactics
- Bid Increments: understanding increment rules by price range
- Winning Strategies: psychological tactics, competitor analysis
- Risk Management: when to walk away, setting limits
- Budget Planning: calculating total costs before bidding

**Auction House Comparisons**:
- USS (Used Car System Solutions): locations, fees, vehicle types, pros/cons
- TAA (Toyota Auto Auction): locations, fees, vehicle types, pros/cons
- CAA (Car Auction Arai): locations, fees, vehicle types, pros/cons
- JU (Japan Used Car Exporters Association): locations, fees, vehicle types, pros/cons
- HAA (Hanaten Auto Auction): locations, fees, vehicle types, pros/cons
- Comparison table: fees, vehicle quality, accessibility, buyer support

**Post-Auction Procedures**:
- Payment Process: payment methods, deadlines, penalties
- Vehicle Collection: pickup procedures, storage fees
- Export Documentation: required documents, processing time
- Shipping Arrangements: freight forwarders, container booking
- Insurance: marine insurance, coverage options
- Customs Clearance: import procedures by destination country

**Import Documentation**:
- Export Certificate: how to obtain, processing time
- Bill of Lading: understanding B/L, types (original, telex, seaway)
- Commercial Invoice: required information, format
- Packing List: contents, format
- Deregistration Certificate: Japanese vehicle deregistration
- Inspection Certificate: pre-shipment inspection
- Certificate of Origin: when required, how to obtain
- Import Permit: destination country requirements

**Common Pitfalls**:
- Hidden Damage: how to spot undisclosed damage on auction sheets
- Mileage Fraud: red flags, verification methods
- Grade Inflation: understanding auction house grading differences
- Repair History: identifying repaired vehicles
- Flood Damage: detection methods
- Accident History: frame damage indicators
- Odometer Tampering: verification techniques
- Title Issues: salvage, rebuilt, branded titles

**Visual Grade Charts**:
- Color-coded grade comparison chart
- Condition rating visual scale
- Panel damage diagram with codes
- Interior condition photo examples
- Exterior condition photo examples

### 3.4 Car Knowledge Library (Massively Expanded)

**Visual Indicators**: All tabs use emoji/icons for better visual recognition

**New Tabs**:

**Tab 29: Fluid Check Guide** 🛢️
- Engine Oil: check procedure, dipstick reading, oil types, change intervals
- Transmission Fluid: check procedure, color indicators, change intervals
- Coolant: check procedure, color meanings, mixing rules
- Brake Fluid: check procedure, DOT ratings, change intervals
- Power Steering Fluid: check procedure, types
- Windshield Washer Fluid: types, mixing ratios
- Differential Oil: check procedure, types
- Visual diagrams for each fluid location

**Tab 30: Battery & EV Range Guide** 🔋
- Battery Health Check: voltage testing, load testing
- Battery Types: lead-acid, AGM, lithium-ion
- EV Battery Degradation: causes, prevention, impact on range
- Range Calculation: factors affecting range, estimation methods
- Charging Guide: Level 1, Level 2, DC Fast Charging
- Battery Warranty: coverage, claims process
- Cold Weather Impact: range reduction, battery care
- Battery Replacement Cost: by vehicle model

**Tab 31: NCAP Safety Ratings** ⭐
- Euro NCAP: rating system, test procedures, star ratings
- JNCAP: rating system, test procedures
- ANCAP: rating system, test procedures
- IIHS (USA): Top Safety Pick criteria
- NHTSA (USA): 5-star rating system
- Rating Comparison Table: by vehicle model
- Safety Feature Importance: airbags, ESC, AEB, etc.

**Tab 32: Common Faults by Model** ⚠️
- Toyota: common issues by model (Corolla, Camry, Prius, Land Cruiser, etc.)
- Honda: common issues by model (Civic, Accord, CR-V, etc.)
- Nissan: common issues by model (Altima, X-Trail, Leaf, etc.)
- Suzuki: common issues by model (Swift, Cultus, Wagon R, etc.)
- Mitsubishi: common issues by model (Lancer, Outlander, Pajero, etc.)
- Mazda: common issues by model (Mazda3, CX-5, etc.)
- Subaru: common issues by model (Impreza, Forester, etc.)
- Repair Cost Estimates: by issue type

**Tab 33: Service Interval Guide** 🔧
- Service Schedule by Mileage: 5k, 10k, 20k, 40k, 60k, 80k, 100k km
- Service Schedule by Time: 6 months, 1 year, 2 years, 3 years
- Major Service Items: timing belt, spark plugs, filters, fluids
- Minor Service Items: oil change, filter replacement
- Inspection Items: brakes, suspension, steering, exhaust
- Service Cost Estimates: by vehicle type

**Tab 34: Tyre Pressure Chart** 🚗
- Recommended Pressure by Vehicle Model: comprehensive table
- Pressure Units: PSI, BAR, kPa conversion
- Load Adjustment: pressure changes for heavy loads
- Temperature Impact: pressure changes with temperature
- TPMS: tire pressure monitoring system explanation
- Pressure Check Procedure: step-by-step guide

**Tab 35: Suspension Types** 🛞
- MacPherson Strut: design, pros/cons, common vehicles
- Double Wishbone: design, pros/cons, common vehicles
- Multi-Link: design, pros/cons, common vehicles
- Torsion Beam: design, pros/cons, common vehicles
- Air Suspension: design, pros/cons, common vehicles
- Adaptive Suspension: how it works, benefits
- Visual Diagrams: for each suspension type

**Tab 36: Paint Codes Guide** 🎨
- Paint Code Location: by manufacturer
- Color Code Decoding: understanding manufacturer codes
- Popular Colors: by make/model
- Paint Types: solid, metallic, pearl, matte
- Touch-Up Paint: how to match, application tips
- Repaint Detection: how to identify repaints

**Enhanced Existing Tabs** (add more detail and visual indicators):
- All existing 28 tabs from v74 retain content
- Add emoji/icon to each tab title for visual recognition
- Add more visual diagrams, charts, comparison tables
- Add color-coded severity indicators where applicable

### 3.5 Partner Referral Program (Enhanced)

**New Features**:

**Referral Link Generator**:
- Generate unique referral links for each partner
- Track clicks and conversions via link
- Display link performance metrics
- QR code generator for offline sharing

**Referral Tracking Status**:
- Status options: Pending, Contacted, Converted, Lost
- Status timeline showing progression
- Notes field for each referral
- Automatic status updates based on actions

**Commission Calculator**:
- Input vehicle sale price
- Automatically calculate commission based on tier structure
- Display breakdown: base commission, bonus, total
- Export calculation as PDF

**Performance Leaderboard**:
- Rank partners by: total commission earned, referrals converted, conversion rate
- Display top 10 partners
- Filter by time period: this month, this quarter, this year, all time
- Visual badges for top performers

**Payout History**:
- Display all past payouts with: date, amount, payment method, status
- Filter by partner, date range, status
- Export payout history as CSV
- Mark payouts as Paid/Pending/Failed

**Referral Source Analytics**:
- Breakdown by partner niche: PPF shops, detailing studios, insurance agents, etc.
- Conversion rate by source
- Average commission by source
- Visual charts: pie chart, bar chart

**Email Template Generator**:
- Pre-built templates: welcome email, referral confirmation, commission notification, payout notification
- Customizable placeholders: partner name, commission amount, referral details
- Send email directly from platform
- Track email open/click rates

**All v74 Partner Referral features remain supported**

### 3.6 Marketing (New Enhanced Page)

**Campaign Tracker**:
- List all marketing campaigns with: name, platform, start date, end date, budget, status
- Add/edit/delete campaigns
- Filter by platform, status, date range
- Campaign performance summary

**ROI Calculator**:
- Input: ad spend, leads generated, conversions, average sale value
- Calculate: cost per lead, cost per acquisition, ROI percentage, profit
- Display visual ROI chart
- Compare ROI across campaigns

**Ad Spend Tracker**:
- Track spending by: platform (Facebook, Instagram, Google, etc.), campaign, date
- Display total spend: today, this week, this month, this year
- Budget alerts when approaching limit
- Export spend report as CSV

**Lead Source Attribution**:
- Track lead source: Facebook Ad, Instagram Ad, Google Ad, Referral, Walk-in, etc.
- Display lead count by source
- Conversion rate by source
- Visual pie chart showing source distribution

**Conversion Funnel Visualization**:
- Display funnel stages: Impression → Click → Lead → Contact → Test Drive → Sale
- Show conversion rate at each stage
- Identify drop-off points
- Visual funnel diagram

**A/B Test Notes**:
- Record A/B test details: test name, variants, hypothesis, results
- Track test performance metrics
- Store learnings and recommendations
- Search and filter past tests

**Competitor Analysis**:
- Track competitor: name, location, inventory size, pricing strategy, strengths, weaknesses
- Add notes on competitor activities
- Compare competitor pricing for similar vehicles
- SWOT analysis template

**Market Share Tracker**:
- Estimate market share by: brand, body type, price range
- Track changes over time
- Visual market share chart
- Identify growth opportunities

### 3.7 Social Media & Listings (Enhanced)

**Post Scheduler/Calendar**:
- Visual calendar showing scheduled posts
- Drag-and-drop to reschedule posts
- Schedule posts for: Facebook, Instagram, LinkedIn, Twitter
- Bulk schedule multiple posts
- Post status: Draft, Scheduled, Published, Failed

**Platform Analytics Comparison**:
- Compare performance across platforms: reach, engagement, clicks, conversions
- Display metrics side-by-side
- Visual comparison charts
- Identify best-performing platform

**Hashtag Library**:
- Store frequently used hashtags
- Organize hashtags by category: brand, model, body type, general
- Copy hashtag sets with one click
- Track hashtag performance

**Caption Templates**:
- Pre-built caption templates for: new arrival, price drop, sold, testimonial, promotion
- Customizable placeholders: vehicle name, price, features
- Save custom templates
- Quick-insert template into post

**Content Calendar**:
- Plan content themes by week/month
- Assign content types: vehicle listing, testimonial, behind-the-scenes, promotion
- Track content balance
- Visual calendar view

**Engagement Rate Tracker**:
- Track engagement rate by post, platform, time period
- Display average engagement rate
- Identify high-performing content types
- Visual engagement trend chart

**Best Posting Times Guide**:
- Display recommended posting times by platform
- Based on audience activity data
- Customizable by dealership timezone
- Visual heatmap showing best times

**All v74 Social Media features remain supported**

### 3.8 WhatsApp Notes (Enhanced)

**Message Templates Library**:
- Pre-built templates: greeting, follow-up, quotation, test drive confirmation, thank you
- Customizable placeholders: customer name, vehicle name, price
- Save custom templates
- Quick-insert template into message

**Bulk Message Composer**:
- Select multiple contacts
- Compose single message to send to all
- Preview message before sending
- Track delivery status

**Contact Groups**:
- Create contact groups: hot leads, warm leads, cold leads, past customers
- Add/remove contacts from groups
- Send bulk messages to groups
- Group performance analytics

**Follow-up Reminders**:
- Set reminder for follow-up with customer
- Reminder triggers notification at specified time
- Display upcoming reminders on dashboard
- Mark reminders as complete

**Message Analytics**:
- Track: messages sent, messages received, response rate, average response time
- Display analytics by time period
- Visual charts showing message trends
- Identify most active contacts

**Auto-Response Templates**:
- Set auto-response for common inquiries: business hours, location, pricing
- Trigger auto-response based on keywords
- Customize auto-response message
- Track auto-response usage

### 3.9 Invoice Management (Enhanced)

**Invoice Templates**:
- Multiple template styles: Classic, Modern, Minimal, Detailed
- Template preview before selection
- Customizable template elements: logo position, color scheme, font
- Save custom templates

**Partial Payment Tracking**:
- Record partial payments with: date, amount, payment method
- Display remaining balance
- Payment history timeline
- Send payment reminder for remaining balance

**Payment Reminders**:
- Automatic reminders for overdue invoices
- Reminder schedule: 3 days before due, on due date, 3 days after due, 7 days after due
- Customizable reminder message
- Track reminder delivery status

**Recurring Invoices**:
- Set invoice to recur: monthly, quarterly, annually
- Automatic invoice generation on schedule
- Notification when recurring invoice is generated
- Edit/cancel recurring invoice schedule

**Invoice Analytics**:
- Display metrics: total invoiced, total paid, total outstanding, average payment time
- Filter by date range, customer, status
- Visual charts: revenue trend, payment status distribution
- Export analytics report

**Expense Tracking**:
- Record expenses with: date, category, amount, description, receipt
- Link expenses to vehicles or invoices
- Display total expenses by category, time period
- Export expense report

**Profit Margin Calculator**:
- Input: vehicle cost, expenses, selling price
- Calculate: gross profit, net profit, profit margin percentage
- Display profit breakdown
- Compare profit across vehicles

**Tax Calculation**:
- Automatic tax calculation based on: GST rate, FED rate, withholding tax rate
- Display tax breakdown on invoice
- Customizable tax rates in settings
- Tax summary report

**All v74 Invoice features remain supported**

### 3.10 Import Cars Guide (New Comprehensive Page)

**Overview**: Complete guide for importing cars from different countries with step-by-step instructions, cost breakdowns, documentation checklists, timeline estimates, and visual examples.

**Country Sections**:

**China** 🇨🇳
- Popular Brands: BYD, Chery, SAIC, MG, Great Wall, Geely
- Popular Models: BYD Seal, BYD Atto 3, Chery Tiggo 8, MG ZS EV, Great Wall Haval H6
- Import Process: finding suppliers, negotiating, shipping, customs clearance
- Cost Breakdown: FOB price, freight, insurance, customs duty, sales tax, clearing charges
- Regulations: Pakistani import regulations for Chinese vehicles, compliance requirements
- Documentation Checklist: commercial invoice, packing list, bill of lading, certificate of origin, import permit
- Timeline Estimate: 4-8 weeks from order to delivery
- Visual Examples: photos of popular models, shipping containers, documentation samples

**Japan** 🇯🇵
- Popular Brands: Toyota, Honda, Nissan, Mazda, Subaru, Mitsubishi
- Popular Models: Toyota Prius, Honda Fit, Nissan Note, Mazda Demio, Subaru Impreza
- JDM Imports: auction buying process, auction house selection, bidding strategies
- Compliance: Japanese vehicle standards, deregistration process, export certificate
- Cost Breakdown: auction price, auction fees, freight, insurance, customs duty, sales tax
- Documentation Checklist: auction sheet, export certificate, bill of lading, deregistration certificate
- Timeline Estimate: 6-10 weeks from auction to delivery
- Visual Examples: auction sheet samples, vehicle photos, shipping process

**Germany** 🇩🇪
- Popular Brands: BMW, Mercedes-Benz, Audi, Volkswagen, Porsche
- Popular Models: BMW 3 Series, Mercedes C-Class, Audi A4, VW Golf, Porsche 911
- Grey Market: parallel imports, dealer vs private seller
- Compliance: European vehicle standards, left-hand drive considerations
- Cost Breakdown: purchase price, freight, insurance, customs duty, sales tax, compliance modifications
- Documentation Checklist: purchase invoice, registration document, bill of lading, certificate of conformity
- Timeline Estimate: 8-12 weeks from purchase to delivery
- Visual Examples: vehicle photos, documentation samples

**Italy** 🇮🇹
- Popular Brands: Ferrari, Lamborghini, Alfa Romeo, Fiat, Maserati
- Popular Models: Ferrari 488, Lamborghini Huracan, Alfa Romeo Giulia
- Specialist Imports: exotic car import process, specialist dealers
- Compliance: European vehicle standards, left-hand drive considerations
- Cost Breakdown: purchase price, freight, insurance, customs duty, sales tax, compliance modifications
- Documentation Checklist: purchase invoice, registration document, bill of lading, certificate of conformity
- Timeline Estimate: 8-12 weeks from purchase to delivery
- Visual Examples: exotic car photos, documentation samples

**UK** 🇬🇧
- Popular Brands: Jaguar, Land Rover, Bentley, Rolls-Royce, McLaren
- Popular Models: Range Rover, Jaguar F-Pace, Bentley Continental
- Right-Hand Drive: advantage for Pakistani market
- Compliance: UK vehicle standards, MOT certificate
- Cost Breakdown: purchase price, freight, insurance, customs duty, sales tax
- Documentation Checklist: purchase invoice, V5C registration document, bill of lading, MOT certificate
- Timeline Estimate: 6-10 weeks from purchase to delivery
- Visual Examples: vehicle photos, documentation samples

**USA** 🇺🇸
- Popular Brands: Ford, Chevrolet, Dodge, Tesla, Cadillac
- Popular Models: Ford Mustang, Chevrolet Camaro, Dodge Challenger, Tesla Model 3
- Muscle Cars: import process for classic and modern muscle cars
- Compliance Challenges: left-hand drive, 25-year import rule, emissions standards
- Cost Breakdown: purchase price, freight, insurance, customs duty, sales tax, compliance modifications
- Documentation Checklist: purchase invoice, title document, bill of lading, EPA/DOT compliance documents
- Timeline Estimate: 8-12 weeks from purchase to delivery
- Visual Examples: muscle car photos, documentation samples

**South Korea** 🇰🇷
- Popular Brands: Hyundai, Kia, Genesis
- Popular Models: Hyundai Tucson, Kia Sportage, Genesis G70
- Import Process: finding dealers, negotiating, shipping
- Compliance: Korean vehicle standards
- Cost Breakdown: purchase price, freight, insurance, customs duty, sales tax
- Documentation Checklist: purchase invoice, registration document, bill of lading, certificate of origin
- Timeline Estimate: 6-10 weeks from purchase to delivery
- Visual Examples: vehicle photos, documentation samples

**Australia** 🇦🇺
- Popular Brands: Holden, Ford Australia, Toyota Australia
- Popular Models: Holden Commodore, Ford Falcon, Toyota HiLux (utes and 4x4s)
- Right-Hand Drive: advantage for Pakistani market
- Compliance: Australian vehicle standards
- Cost Breakdown: purchase price, freight, insurance, customs duty, sales tax
- Documentation Checklist: purchase invoice, registration document, bill of lading, compliance certificate
- Timeline Estimate: 8-12 weeks from purchase to delivery
- Visual Examples: ute and 4x4 photos, documentation samples

**General Import Information**:
- Freight Options: container shipping, RoRo (Roll-on/Roll-off)
- Insurance: marine insurance, coverage types
- Customs Clearance: Pakistani customs process, required documents
- Compliance Modifications: right-hand drive conversion (if needed), emissions compliance
- Import Duties: calculation method, duty slabs by engine capacity
- Timeline Factors: shipping route, customs processing time, documentation preparation

### 3.11 Settings — Theme Customisation (New)

**Theme Editor**:

**Color Picker**:
- Primary Color: main brand color
- Secondary Color: accent color
- Background Color: page background
- Card Color: card/panel background
- Text Color: primary text color
- Border Color: border and divider color
- Each color has color picker with hex/RGB input

**Dark/Light/Custom Mode Toggle**:
- Dark Mode: dark background, light text
- Light Mode: light background, dark text
- Custom Mode: user-defined colors
- Toggle switches between modes

**Font Family Selector**:
- Dropdown with font options: Montserrat, Inter, Roboto, Open Sans, Lato, Poppins
- Live preview of selected font
- Apply to entire site

**Border Radius Slider**:
- Slider to adjust border radius: 0px (sharp) to 20px (rounded)
- Live preview on sample card
- Apply to all UI elements

**Sidebar Color Customisation**:
- Separate color picker for sidebar background
- Sidebar text color picker
- Sidebar active item color picker

**Live Preview**:
- Preview panel showing sample UI elements with applied theme
- Preview updates in real-time as user adjusts settings
- Preview includes: buttons, cards, inputs, sidebar, header

**Save/Reset/Export Theme**:
- Save Theme: save current theme settings to database
- Reset Theme: revert to default theme
- Export Theme: export theme as JSON file
- Import Theme: import theme from JSON file

**Apply Changes**:
- Changes apply immediately to live site via CSS variables
- No page reload required
- Theme persists across sessions

### 3.12 AI Features Expansion (Site-Wide)

**AI Deal Assistant**:
- Available on Quotations and Vehicle Details pages
- Analyze deal profitability, risk, customer fit
- Recommend pricing strategy, negotiation tactics
- Predict deal closure probability

**AI Inventory Describer**:
- Available on Inventory Management page
- Generate vehicle descriptions automatically
- Create compelling marketing copy
- Highlight unique selling points

**AI Price Suggester**:
- Available on Inventory Management and Vehicle Details pages
- Suggest optimal asking price based on market data
- Recommend price adjustments for slow-moving inventory
- Analyze competitor pricing

**AI Customer Matcher**:
- Available on Customer & Leads page
- Match customers with suitable vehicles from inventory
- Recommend vehicles based on customer preferences and budget
- Predict customer purchase probability

**AI Report Generator**:
- Available on Analytics & Reports page
- Generate comprehensive reports on command
- Analyze sales trends, inventory performance, profit margins
- Provide actionable insights and recommendations

**AI Auction Evaluator**:
- Available on Japanese Auction & Import page
- Evaluate auction vehicles for purchase potential
- Analyze auction grade, condition, market demand
- Recommend bid strategy and target price

### 3.13 Source Code v75 (Complete Download)

**Functionality**:
- Generate complete source code zip for version 75
- Include ALL files: frontend, backend, database schema, configuration, documentation
- No missing files
- Organized folder structure
- README with setup instructions
- Download button on Source Code page
- File size and file count displayed
- Version number clearly labeled

### 3.14 Error Fixes

**TypeScript/Lint Errors**:
- Check and fix all TypeScript type errors across entire codebase
- Fix all ESLint warnings and errors
- Ensure strict type checking passes
- Fix unused imports and variables
- Fix missing return types
- Fix implicit any types
- Fix React hooks dependency warnings
- Ensure code follows consistent style guide

## 4. Business Rules and Logic

### 4.1 Live Display Real-Time Sync
- Live Display uses Supabase real-time subscriptions (not polling)
- Stock section subscribes to rpm_vehicles table changes
- Inquiries section subscribes to rpm_inquiries table changes
- All data updates immediately without page reload
- Subscription reconnects automatically if connection lost
- Display shows \"Live\" indicator when connected, \"Offline\" when disconnected

### 4.2 AI Chatbot Position
- AI Chatbot must appear as FIRST item in sidebar navigation
- Position enforced in frontend routing configuration
- Sidebar navigation array must have AI Chatbot as first element

### 4.3 Auction Guide Content
- All auction house information must be accurate and up-to-date
- Visual grade charts must use color coding: green (excellent), yellow (good), orange (fair), red (poor)
- Bidding strategies must be practical and actionable
- Common pitfalls must include real-world examples

### 4.4 Car Knowledge Library Visual Indicators
- Each tab title must include relevant emoji/icon
- Visual diagrams must be clear and labeled
- Color-coded severity indicators: green (safe), yellow (caution), red (danger)
- All technical information must be accurate

### 4.5 Partner Referral Tracking
- Referral status automatically updates when related actions occur (e.g., lead created → Contacted, sale completed → Converted)
- Commission calculation uses current tier structure at time of sale
- Referral links are unique per partner and tracked via URL parameters
- Payout history is immutable once marked as Paid

### 4.6 Marketing Campaign ROI
- ROI calculation: ((Revenue - Ad Spend) / Ad Spend) × 100
- Cost per lead: Ad Spend / Leads Generated
- Cost per acquisition: Ad Spend / Conversions
- All calculations update in real-time as data changes

### 4.7 Social Media Post Scheduling
- Scheduled posts are stored in database with scheduled_time field
- Background job checks for posts due to publish every 5 minutes
- Post status changes from Scheduled to Published when posted
- Failed posts are marked as Failed with error message

### 4.8 WhatsApp Message Templates
- Templates support placeholders: {customer_name}, {vehicle_name}, {price}, {date}, {time}
- Placeholders are replaced with actual values when message is sent
- Templates are stored per user and can be shared across team

### 4.9 Invoice Partial Payments
- Partial payments are recorded with date, amount, payment method
- Remaining balance calculated automatically: Total Amount - Sum of Partial Payments
- Invoice status changes to Paid when remaining balance reaches zero
- Payment reminders only sent for invoices with outstanding balance

### 4.10 Recurring Invoices
- Recurring invoices are generated automatically on schedule
- New invoice inherits all details from original invoice except invoice number and date
- Invoice number is auto-incremented
- Notification sent to admin when recurring invoice is generated

### 4.11 Import Cars Guide Content
- All cost breakdowns must include: FOB/purchase price, freight, insurance, customs duty, sales tax, clearing charges, total landed cost
- Timeline estimates must be realistic and account for potential delays
- Documentation checklists must be complete and country-specific
- Visual examples must be high-quality and representative

### 4.12 Theme Customisation
- Theme settings are stored in database per user
- Theme changes apply via CSS variables (--primary-color, --background-color, etc.)
- CSS variables are injected into :root element on page load
- Theme persists across sessions and devices for logged-in user
- Default theme is used for non-logged-in users

### 4.13 AI Feature Availability
- All AI features require active AI service (Gemini API)
- If AI service is unavailable, show error message and disable AI features
- AI responses are cached for 5 minutes to reduce API calls
- AI confidence scores are displayed for all predictions and recommendations

### 4.14 Source Code Generation
- Source code zip includes: all React components, all TypeScript files, all CSS files, Supabase schema SQL, environment variables template, package.json, README.md, setup instructions
- Zip file is generated on-demand when user clicks download
- File size is calculated and displayed before download
- Version number is embedded in zip filename: wulfrayn-db-v75.zip

### 4.15 Error Handling
- All TypeScript errors must be resolved before deployment
- All ESLint errors must be resolved before deployment
- Console warnings are logged but do not block deployment
- Error boundaries catch React errors and display fallback UI

### 4.16 All v74 Business Rules
- All business rules from v74 remain in effect unless explicitly overridden by v75 rules

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| Live Display Supabase subscription fails | Show \"Offline\" indicator, attempt reconnection every 30 seconds, fall back to polling if subscription unavailable |
| AI Chatbot API call fails | Show error message, allow retry, log error for investigation |
| Auction Guide visual chart fails to load | Show text-based grade explanation, provide download link for chart |
| Car Knowledge Library tab content missing | Show \"Content not available\" message, notify admin |
| Partner referral link click not tracked | Log warning, allow manual referral entry |
| Commission calculation error | Show error message, allow manual commission entry, log error |
| Marketing campaign ROI calculation with zero ad spend | Show \"Cannot calculate ROI with zero ad spend\" message |
| Social media post scheduling fails | Show error message, save post as Draft, allow manual retry |
| WhatsApp bulk message exceeds platform limit | Split into multiple batches, show progress indicator |
| Invoice partial payment exceeds remaining balance | Show error message, prevent payment entry |
| Recurring invoice generation fails | Log error, notify admin, allow manual invoice creation |
| Import Cars Guide country section missing | Show \"Guide not available for this country\" message |
| Theme customisation color picker fails to load | Fall back to text input for hex color codes |
| Theme changes not applying | Force CSS variable refresh, clear browser cache, reload page |
| AI feature unavailable due to API limit | Show \"AI service temporarily unavailable\" message, disable AI features |
| Source code zip generation fails | Show error message, allow retry, notify admin |
| TypeScript error in production | Error boundary catches error, display fallback UI, log error for investigation |
| All v74 exceptions remain applicable | Handle as defined in v74 PRD |

## 6. Acceptance Criteria

1. User logs in, navigates to sidebar, sees AI Chatbot as FIRST item above all other pages
2. User clicks AI Chatbot, asks \"What's the market value of a 2020 Toyota Corolla?\", AI performs vehicle valuation, displays estimated value range with confidence score and reasoning
3. User navigates to Live Display page, sees \"Live\" indicator, stock section displays ALL vehicles from inventory in real-time, inquiries section displays ALL inquiries in real-time, data updates automatically without page reload when inventory or inquiries change in database
4. User navigates to Japanese Auction & Import section, clicks Auction Guide, sees massively expanded content with grading systems, bidding strategies, auction house comparisons, visual grade charts, all content is accurate and detailed
5. User navigates to Car Knowledge Library, sees 36 tabs (28 from v74 + 8 new tabs), each tab has emoji/icon in title, clicks \"Fluid Check Guide\" tab, sees detailed fluid check procedures with visual diagrams, clicks \"NCAP Safety Ratings\" tab, sees rating systems and comparison table
6. User navigates to Partner Referral Program, clicks \"Generate Referral Link\" for partner, unique link is generated, user copies link, link tracks clicks and conversions, user views Performance Leaderboard, sees top 10 partners ranked by commission earned
7. User navigates to Marketing page, creates new campaign, enters campaign details, clicks \"Calculate ROI\", ROI is calculated and displayed with visual chart, user views Conversion Funnel, sees funnel stages with conversion rates
8. User navigates to Social Media page, clicks \"Schedule Post\", selects date/time and platform, post is scheduled, post appears in calendar view, at scheduled time post status changes to Published
9. User navigates to WhatsApp Notes, clicks \"Message Templates\", selects template, template is inserted with placeholders, user replaces placeholders with actual values, sends message, message is tracked in analytics
10. User navigates to Invoice Management, creates invoice, selects \"Modern\" template, adds partial payment, remaining balance is calculated automatically, sets invoice as recurring (monthly), next month invoice is auto-generated
11. User navigates to Import Cars Guide, clicks \"China\" section, sees popular brands/models, import process steps, cost breakdown, documentation checklist, timeline estimate, visual examples, all information is comprehensive and accurate
12. User navigates to Settings, clicks \"Theme Customisation\", adjusts primary color using color picker, changes font family, adjusts border radius slider, sees live preview update in real-time, clicks \"Save Theme\", theme changes apply immediately to entire site without page reload
13. User navigates to Inventory Management, clicks vehicle, clicks \"AI Price Suggester\", AI analyzes market data and suggests optimal asking price with reasoning
14. User navigates to Source Code page, clicks \"Download v75\", complete source code zip is generated and downloaded, zip includes ALL files with no missing files, README includes setup instructions
15. Developer runs TypeScript type check, all type errors are resolved, runs ESLint, all lint errors are resolved, code passes strict type checking

## 7. Out of Scope for This Release

- Mobile apps (iOS and Android)
- Multi-branch operations
- Multi-company support
- Real-time collaboration features (multi-user editing)
- Video call integration
- Blockchain-based vehicle history verification
- Automated market price updates from external sources
- Multi-language support beyond English
- Voice input for AI Chatbot
- AI training on custom dealership data
- Customer-facing portal or mobile app
- Online booking system for customers
- Automated email marketing campaigns
- SMS notifications
- Integration with accounting software
- Payroll management
- Employee performance tracking
- Test drive scheduling system
- Customer loyalty program
- Advanced notification filtering
- Push notifications to mobile devices
- Dealer performance leaderboards
- Multi-dealer collaboration features
- Command Center voice commands
- Command Center mobile app
- OAuth integration for external AI
- GraphQL API
- WebSocket support for real-time API
- API versioning beyond v1
- Bulk create listings from audio/video files
- Automatic translation of extracted data
- Integration with WhatsApp Business API for direct message import
- Live sync push notifications
- Automatic application update without user confirmation
- Version rollback functionality
- Scratchpad collaboration features
- Task time tracking
- Task Gantt chart view
- Car Knowledge Library user-generated content
- Partner referral program partner portal login
- Custom assistant profile marketplace
- Social media direct posting (scheduling only)
- WhatsApp direct integration (notes only)
- Invoice payment gateway integration
- Expense receipt OCR
- Import Cars Guide real-time shipping tracking
- Theme marketplace for sharing themes
- All v74 out-of-scope items remain out-of-scope