# Arca UI / UX Specification

## Design Intent
Arca should feel like a premium private asset vault rather than a generic admin interface. The product must be elegant, calm, and highly readable, with strong restraint in both layout and interaction design.

Core feeling:
- quiet
- minimal
- premium
- intentional
- modern

Avoid:
- dashboard clutter
- loud accent colors
- heavy gradients
- playful or childish iconography
- cramped utility-panel layouts

## Visual Direction
### Color System
Use a restrained neutral-first palette:
- near-black
- charcoal
- soft gray
- warm off-white
- muted white

Accent color:
- one restrained accent only
- use for active states, focus, and subtle emphasis
- do not build the interface around bright multi-color surfaces

### Surfaces
- Soft contrast between page background and cards
- Thin borders
- Light shadow depth
- Rounded corners with consistency across cards, dialogs, drawers, and inputs

### Typography
- Clean sans-serif
- Strong, crisp headings
- Small refined metadata text
- Controlled line lengths
- Clear contrast between primary labels and secondary metadata

### Motion
- Use gentle transitions only where they improve comprehension
- Lightbox open/close should feel polished
- Sidebar drawers and detail panels should slide smoothly
- Avoid decorative animation loops

## Layout System
### Global App Shell
Protected pages should use:
- top navigation bar
- main content area
- category-specific left sidebar on library pages

### Navigation
Primary navigation items:
- Dashboard
- Images
- Documents
- Videos
- Settings

Navigation should be easy to access from category pages without making the layout feel busy.

## Page Specifications
### Login Page
**Intent**
- Full-screen, minimal, centered
- No marketing-heavy content
- Strong first impression of quiet confidence

**Structure**
- subtle background
- centered card
- wordmark
- short supporting line
- email input
- password input
- sign-in button
- optional forgot-password link

### Dashboard
**Intent**
- Act as a clean library selector, not a statistics dashboard

**Structure**
- top bar
- centered title/subtitle
- three premium category cards
- subtle storage summary beneath or below fold

**Category Cards**
Must communicate:
- category name
- short description
- file count
- storage used
- recent visual hint or thumbnail region

### Images Page
**Intent**
- Gallery-first
- Calm browsing with instant URL utility

**Structure**
- narrow sidebar
- wide grid content
- top row with count, view toggle, and upload

**Grid Behavior**
- generous spacing
- card hover states
- preview-first composition
- actions should not overwhelm thumbnails

### Videos Page
**Intent**
- Similar to images, but emphasize poster frames and duration

**Card Behavior**
- play overlay
- stable aspect ratio
- avoid auto-playing thumbnails

### Documents Page
**Intent**
- Cleaner and more utility-oriented than image/video galleries

**Default View**
- list/table first
- readable rows
- icons and metadata aligned for scan speed

### Settings Page
**Intent**
- Quiet operational visibility, not a dense system console

**Sections**
- account
- storage
- media domain
- service status
- default visibility
- theme

## Component Requirements
### Sidebar
Should contain:
- search
- upload CTA
- folders
- tags
- sort controls
- usage summary
- category-specific filters

Desktop:
- fixed or sticky within page shell

Mobile:
- collapsible drawer/sheet

### File Cards
#### Image Cards
- preview image
- filename
- metadata line
- copy URL action
- overflow menu

#### Video Cards
- poster
- play indicator
- filename
- duration, size, date
- copy URL action
- overflow menu

#### Document Rows/Cards
- file icon
- filename
- type
- size
- date
- copy URL
- download
- overflow

### Upload Modal
Must feel focused and premium, not technical.

Include:
- drag-and-drop zone
- file picker
- selected items list
- folder selector
- tags field
- visibility selector
- upload progress
- file-level error state
- success state with copy URL

### File Details Drawer
- right-side slide-in panel
- consistent spacing
- grouped metadata
- primary actions near top
- destructive actions visually separated

### Lightbox
#### Image Lightbox
- dark translucent backdrop
- strong centering
- minimal chrome
- visible but restrained controls

#### Video Lightbox
- premium player shell
- keyboard support
- actions aligned consistently with image lightbox

## Interaction Design
### Copy URL
- always within one click from:
  - file card/row
  - lightbox
  - details drawer
- show subtle toast: `URL copied.`

### Delete
- require confirmation dialog
- explain permanence calmly
- keep destructive action visually distinct

### Search
- debounce input
- show filtering feedback quickly
- keep empty-result messaging refined and clear

### Bulk Upload
- allow multiple files
- show queue and per-file progress
- do not block successful files because one file fails validation

## Responsive Behavior
### Desktop
- ideal experience
- persistent sidebar
- grid/list layouts with comfortable density

### Tablet
- reduced columns
- collapsible filter/sidebar behavior

### Mobile
- category cards stack vertically
- sidebar becomes sheet/drawer
- actions cannot depend on hover
- copy URL and upload remain prominent

## Accessibility Requirements
- full keyboard navigation
- visible focus states
- proper labels on all buttons and inputs
- dialogs trap focus
- lightbox supports `Esc`, `ArrowLeft`, `ArrowRight`
- sufficient color contrast
- icon-only buttons need accessible labels
- image previews should use filename fallback if no alt-like text exists

## Empty States
### Dashboard
- Show the three categories even at zero state
- Include gentle prompt toward first upload

### Images
- `No images stored yet.`
- `Upload your first image to start building your visual library.`

### Videos
- `No videos stored yet.`
- `Upload a clip and keep its public URL ready for reuse.`

### Documents
- `No documents stored yet.`
- `Store PDFs and important files in one clean library.`

## Loading States
- page skeletons
- grid skeletons
- list row skeletons
- upload progress bars
- details drawer loading placeholder
- lightbox loading placeholder

## Error Messaging Tone
Error messages should be:
- clear
- calm
- concise
- non-technical unless in development mode

Examples:
- `This file type is not supported.`
- `This file is larger than the upload limit.`
- `Upload failed. Please try again.`
- `Could not copy URL.`

## UX Guardrails
- Do not overload cards with too many always-visible actions.
- Do not use dense tables everywhere; documents may use list/table, but media pages should feel editorial.
- Do not let filters visually dominate the content area.
- Do not design the dashboard as an analytics cockpit.
- Do not hide core actions behind obscure gestures.

## Outcome Standard
If the UI feels like a calm premium shelf for personal assets, with public URL copy always close at hand, the design is aligned. If it feels like a generic SaaS admin panel, it is off-spec.
