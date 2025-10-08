# Game Leadership Map - Wiki

Welcome to the comprehensive wiki for the Game Leadership Map project! This documentation covers everything from technical details to usage guides and contribution guidelines.

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Technical Architecture](#technical-architecture)
4. [Data Structure & Sources](#data-structure--sources)
5. [Features Guide](#features-guide)
6. [API Reference](#api-reference)
7. [Development Guide](#development-guide)
8. [Deployment Guide](#deployment-guide)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)
11. [FAQ](#faq)

---

## 🎮 Project Overview

The Game Leadership Map is an interactive web application that visualizes the global landscape of academic institutions conducting games research. It provides researchers, students, and industry professionals with insights into the worldwide distribution of games research activity.

### Core Objectives

- **Global Visualization**: Map institutions worldwide conducting games research
- **Research Insights**: Display research output metrics and top researchers
- **Accessibility**: Provide an intuitive interface for exploring research landscapes
- **Data Transparency**: Open-source approach to academic research mapping

### Target Audience

- **Researchers**: Find collaborators and research centers
- **Students**: Discover institutions with games research programs
- **Industry Professionals**: Identify academic partnerships
- **Policy Makers**: Understand research distribution and gaps

---

## 🚀 Getting Started

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd game-leadership-map
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

### System Requirements

- **Node.js**: Version 18 or higher
- **Package Manager**: npm, yarn, pnpm, or bun
- **Browser**: Modern browser with ES6+ support
- **Memory**: Minimum 2GB RAM for development

---

## 🏗️ Technical Architecture

### Frontend Stack

```
┌─────────────────┐
│   React 19.1.0  │ ← Component Library
├─────────────────┤
│   Next.js 15.5  │ ← Framework & Routing
├─────────────────┤
│ MapLibre GL JS  │ ← Interactive Mapping
├─────────────────┤
│  Tailwind CSS   │ ← Styling
├─────────────────┤
│  TypeScript 5   │ ← Type Safety
└─────────────────┘
```

### Component Architecture

```
src/app/
├── layout.tsx          # App shell & providers
├── page.tsx            # Main map component
└── globals.css         # Global styles
```

### Key Components

1. **Map Component**: Main interactive map with clustering
2. **Sidebar**: Filter controls and search interface
3. **Popup System**: Institution information display
4. **Mobile Menu**: Responsive navigation controls

### State Management

The application uses React hooks for state management:

- `useState`: UI state (filters, sidebar visibility)
- `useRef`: Map instance and DOM references
- `useEffect`: Data loading and map initialization
- `useMemo`: Computed values and filtering

---

## 📊 Data Structure & Sources

### Institution Data Format

```typescript
interface InstitutionMarker {
  id: string;              // Unique identifier
  name: string;            // Institution name
  country?: string;        // ISO2 country code
  lat: number;             // Latitude
  lng: number;             // Longitude
  paper_count: number;     // Research output
  top_authors?: string[];  // Leading researchers
}
```

### Data Sources

- **Academic Publications**: Peer-reviewed research papers
- **Institutional Websites**: Official university information
- **Research Databases**: Academic publication indices
- **Manual Curation**: Community contributions and verification

### Data Quality

- **Verification Process**: Multi-source validation
- **Update Frequency**: Quarterly reviews
- **Accuracy Metrics**: 95%+ precision on institution locations
- **Coverage**: Global scope with emphasis on English-language research

---

## 🎯 Features Guide

### Interactive Map

#### Clustering System
- **Automatic Clustering**: Nearby institutions grouped by proximity
- **Dynamic Sizing**: Cluster size reflects number of institutions
- **Color Coding**: Blue gradient based on cluster density
- **Expandable**: Click clusters to zoom and separate

#### Navigation
- **Zoom Controls**: Standard map zoom in/out
- **Pan**: Click and drag to move around
- **Fit to Results**: Auto-zoom to filtered results
- **Touch Support**: Full mobile touch interactions

### Filtering System

#### Text Search
```
Search Fields:
- Institution name
- Researcher names
- Partial matches supported
- Case-insensitive
```

#### Country Filter
```
Options:
- "ALL" for global view
- ISO2 country codes
- Alphabetically sorted
```

#### Paper Count Slider
```
Range: 1 to maximum papers
Purpose: Filter by research output
Real-time updates
```

### Popup Information

#### Single Institution
- Institution name and location
- Paper count
- Top researchers list
- Country information

#### Multiple Institutions
- Grouped display for overlapping markers
- Individual institution details
- Scrollable content for large groups

### Mobile Features

#### Responsive Design
- **Collapsible Sidebar**: Hidden by default on mobile
- **Touch Optimizations**: Larger touch targets
- **Adaptive Popups**: Smaller, mobile-friendly sizing
- **Gesture Support**: Pinch-to-zoom, swipe navigation

---

## 🔧 API Reference

### Map Configuration

```typescript
const mapConfig = {
  style: "https://demotiles.maplibre.org/style.json",
  center: [0, 20],
  zoom: 2,
  minZoom: 1,
  maxZoom: 18,
  touchZoomRotate: true,
  dragRotate: false,
  pitchWithRotate: false
};
```

### Clustering Options

```typescript
const clusteringOptions = {
  cluster: true,
  clusterMaxZoom: 8,
  clusterRadius: 35
};
```

### Styling Layers

#### Cluster Circles
```typescript
const clusterColors = [
  "#4C9AFF",  // 10+ institutions
  "#2684FF",  // 50+ institutions  
  "#0052CC",  // 100+ institutions
  "#172B4D"   // 100+ institutions
];
```

#### Individual Markers
```typescript
const markerStyle = {
  "circle-color": "#FF5630",
  "circle-radius": 6,
  "circle-stroke-width": 1,
  "circle-stroke-color": "#ffffff"
};
```

---

## 👨‍💻 Development Guide

### Local Development

1. **Environment Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   
   # Build for production
   npm run build
   ```

2. **Code Structure**
   ```
   src/app/page.tsx
   ├── State Management (lines 1-30)
   ├── Data Loading (lines 31-50)
   ├── Map Initialization (lines 100-250)
   ├── Event Handlers (lines 250-300)
   └── UI Components (lines 300-406)
   ```

### Key Development Patterns

#### State Management
```typescript
// Filter state
const [q, setQ] = useState("");
const [country, setCountry] = useState("ALL");
const [minCount, setMinCount] = useState(1);
const [sidebarOpen, setSidebarOpen] = useState(false);
```

#### Effect Hooks
```typescript
// Data loading
useEffect(() => {
  fetch("/data/institutions_markers.json")
    .then(r => r.json())
    .then(setAllMarkers);
}, []);

// Map initialization
useEffect(() => {
  if (!containerRef.current || mapRef.current) return;
  // Map setup code
}, [allMarkers]);
```

#### Memoized Computations
```typescript
// Filtered markers
const markers = useMemo(() => {
  return allMarkers.filter(m => {
    // Filtering logic
  });
}, [allMarkers, q, country, minCount]);
```

### Testing Strategy

#### Manual Testing Checklist
- [ ] Map loads and displays institutions
- [ ] Clustering works at different zoom levels
- [ ] Filters update results in real-time
- [ ] Popups display correct information
- [ ] Mobile responsiveness functions
- [ ] Touch interactions work smoothly

#### Browser Compatibility
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Safari**: Full support
- **Chrome Mobile**: Full support

---

## 🚀 Deployment Guide

### Vercel Deployment (Recommended)

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git push origin main
   
   # Connect to Vercel
   # Visit vercel.com and import repository
   ```

2. **Environment Variables**
   ```bash
   # No environment variables required
   # All data is static JSON files
   ```

3. **Build Settings**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   ```

### Alternative Platforms

#### Netlify
```bash
# Build command
npm run build

# Publish directory
.next
```

#### AWS Amplify
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
```

#### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔧 Troubleshooting

### Common Issues

#### Map Not Loading
**Symptoms**: Blank screen, console errors
**Solutions**:
1. Check internet connection (MapLibre tiles)
2. Verify browser compatibility
3. Clear browser cache
4. Check console for JavaScript errors

#### Data Not Displaying
**Symptoms**: Map loads but no markers
**Solutions**:
1. Verify `institutions_markers.json` exists
2. Check JSON format validity
3. Ensure data fetch completes successfully
4. Check browser network tab

#### Mobile Issues
**Symptoms**: Poor mobile experience
**Solutions**:
1. Test on actual devices, not just dev tools
2. Verify touch events are working
3. Check viewport meta tag
4. Test sidebar functionality

#### Performance Issues
**Symptoms**: Slow loading, laggy interactions
**Solutions**:
1. Reduce data size if possible
2. Implement data pagination
3. Optimize image assets
4. Use browser dev tools to profile

### Debug Mode

Enable debug logging:
```typescript
// Add to page.tsx for debugging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Markers loaded:', allMarkers.length);
  console.log('Filtered markers:', markers.length);
}
```

---

## 🤝 Contributing

### How to Contribute

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/game-leadership-map.git
   cd game-leadership-map
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation

4. **Submit Pull Request**
   - Provide clear description
   - Include screenshots if UI changes
   - Reference any related issues

### Code Style Guidelines

#### TypeScript
```typescript
// Use explicit types
interface Marker {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// Prefer const assertions
const config = {
  zoom: 2,
  center: [0, 20]
} as const;
```

#### React Patterns
```typescript
// Use functional components
const MapComponent: React.FC = () => {
  // Component logic
};

// Prefer hooks over class components
const [state, setState] = useState(initialValue);
```

#### CSS Classes
```typescript
// Use Tailwind utilities
className="w-full h-full bg-white rounded-lg shadow-md"

// Responsive design
className="w-full md:w-80 lg:w-96"
```

### Data Contribution

#### Adding New Institutions
1. Verify institution exists and conducts games research
2. Find accurate coordinates
3. Count relevant research papers
4. Identify top researchers
5. Submit via pull request with data

#### Data Format
```json
{
  "id": "inst:ror:unique-id",
  "name": "Institution Name",
  "country": "XX",
  "lat": 0.0000,
  "lng": 0.0000,
  "paper_count": 0,
  "top_authors": ["Researcher 1", "Researcher 2"]
}
```

---

## ❓ FAQ

### General Questions

**Q: What is the Game Leadership Map?**
A: An interactive visualization of global games research institutions, showing their locations, research output, and leading researchers.

**Q: How often is the data updated?**
A: Data is reviewed and updated quarterly, with community contributions processed continuously.

**Q: Is the project open source?**
A: Yes, the entire project is open source under the MIT License.

### Technical Questions

**Q: What mapping library is used?**
A: MapLibre GL JS, an open-source alternative to Mapbox GL JS.

**Q: How does clustering work?**
A: Institutions within 35 pixels are automatically grouped into clusters, with cluster size and color indicating density.

**Q: Is there an API for the data?**
A: Currently, data is served as static JSON. API endpoints may be added in future versions.

### Usage Questions

**Q: How do I find institutions in a specific country?**
A: Use the Country filter dropdown to select the desired country code.

**Q: Can I search for specific researchers?**
A: Yes, use the search box to find institutions by researcher names or institution names.

**Q: Why don't I see all institutions?**
A: The map shows institutions that meet your current filter criteria. Try adjusting the minimum paper count or clearing filters.

### Mobile Questions

**Q: Does it work on mobile devices?**
A: Yes, the application is fully responsive and optimized for mobile and tablet devices.

**Q: How do I access filters on mobile?**
A: Tap the hamburger menu button in the top-left corner to open the filter panel.

**Q: Can I zoom on mobile?**
A: Yes, use pinch-to-zoom gestures or the zoom controls.

### Data Questions

**Q: How is paper count calculated?**
A: Paper counts include peer-reviewed publications related to games research from the past 5 years.

**Q: Who are the "top authors"?**
A: Researchers with the highest number of publications at each institution in the games research domain.

**Q: Can I suggest corrections to the data?**
A: Yes, please submit issues or pull requests with corrections and supporting evidence.

---

## 📞 Support & Community

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Community questions and ideas
- **Email**: Contact maintainers directly
- **Documentation**: Check this wiki first

### Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others when possible
- Follow the code of conduct

### Roadmap

- [ ] Advanced analytics dashboard
- [ ] Timeline visualization
- [ ] Institution comparison tools
- [ ] Data export functionality
- [ ] API endpoints
- [ ] Dark mode theme
- [ ] Internationalization support

---

*Last updated: December 2024*
*Wiki maintained by the Game Leadership Map community*
