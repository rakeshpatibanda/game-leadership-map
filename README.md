# Game Leadership Map

A comprehensive interactive map visualization of games research institutions worldwide, showing the global landscape of academic institutions contributing to games research and their top researchers.

## 🎮 Overview

The Game Leadership Map is a data-driven web application that visualizes institutions conducting games research across the globe. The map displays research institutions as interactive markers, clustered by geographic proximity, with detailed information about each institution's research output and leading authors.

### Key Features

- **Interactive World Map**: Powered by MapLibre GL, providing smooth zooming, panning, and clustering
- **Research Data Visualization**: Shows institutions with their paper counts and top researchers
- **Advanced Filtering**: Filter by institution name, country, and minimum paper count
- **Smart Clustering**: Automatic clustering of nearby institutions with expandable clusters
- **Responsive Design**: Clean, modern interface optimized for desktop and mobile
- **Real-time Search**: Instant filtering as you type with support for institution names and author names

## 📸 Screenshot

![Game Leadership Map](public/website-screenshot.png)
*Interactive map showing games research institutions worldwide with clustering and filtering capabilities*

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd game-leadership-map
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Technology Stack

- **Framework**: [Next.js 15.5.4](https://nextjs.org/) with App Router
- **Frontend**: React 19.1.0 with TypeScript 5
- **Mapping**: [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/) for interactive maps
- **Styling**: Tailwind CSS 4 for responsive design
- **Build Tool**: Turbopack for fast development builds

## 📊 Data Structure

The application uses a JSON dataset (`public/data/institutions_markers.json`) containing institutional research data:

```typescript
type Marker = {
  id: string;           // Unique identifier (e.g., "inst:ror:01aff2v68")
  name: string;         // Institution name
  country?: string;     // ISO2 country code (e.g., "CA", "US", "NL")
  lat: number;          // Latitude coordinate
  lng: number;          // Longitude coordinate
  paper_count: number;  // Number of research papers
  top_authors?: string[]; // Array of top researchers
}
```

### Sample Data Entry
```json
{
  "id": "inst:ror:01aff2v68",
  "name": "University of Waterloo",
  "country": "CA",
  "lat": 43.4668,
  "lng": -80.51639,
  "paper_count": 49,
  "top_authors": [
    "Lennart E. Nacke",
    "Gustavo F. Tondello",
    "Mark Hancock",
    "Rina R. Wehbe",
    "John Harris"
  ]
}
```

## 🎯 Features in Detail

### Interactive Map
- **Base Map**: Uses MapLibre's demo style for consistent, professional appearance
- **Clustering**: Automatic clustering of nearby markers with dynamic cluster sizing
- **Zoom Controls**: Navigation controls in the top-right corner
- **Responsive Clusters**: Different colors and sizes based on cluster density

### Filtering System
- **Text Search**: Search by institution name or author names
- **Country Filter**: Dropdown to filter by specific countries
- **Paper Count Slider**: Minimum paper count threshold filter
- **Reset Function**: One-click reset to clear all filters

### Data Visualization
- **Color Coding**: 
  - Blue clusters for grouped institutions
  - Red markers for individual institutions
  - Gradient colors based on cluster size
- **Popup Information**: Detailed popups showing:
  - Institution name and location
  - Paper count
  - Top researchers
  - Support for stacked markers

### User Experience
- **Auto-zoom**: Automatically fits view to filtered results
- **Smooth Animations**: 700ms easing for map transitions
- **Loading States**: Proper loading indicators during data fetch
- **Error Handling**: Graceful error handling for data loading failures

## 📁 Project Structure

```
game-leadership-map/
├── public/
│   └── data/
│       └── institutions_markers.json  # Research data
├── src/
│   └── app/
│       ├── globals.css               # Global styles
│       ├── layout.tsx                # App layout
│       └── page.tsx                  # Main map component
├── package.json                      # Dependencies
├── next.config.ts                    # Next.js configuration
├── tailwind.config.js                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
└── README.md                         # This file
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server

### Code Architecture

The main component (`src/app/page.tsx`) is organized into several key sections:

1. **State Management**: React hooks for data, filters, and map state
2. **Data Loading**: Effect hook for fetching institution data
3. **Map Initialization**: MapLibre GL setup with clustering and styling
4. **Filter Logic**: Computed values for filtering and country options
5. **Event Handlers**: Click handlers for clusters and individual markers
6. **UI Components**: Sidebar with filter controls and map container

### Key Implementation Details

- **Clustering**: Uses MapLibre's built-in clustering with custom styling
- **GeoJSON**: Converts marker data to GeoJSON format for map rendering
- **Performance**: Efficient filtering with useMemo hooks
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy with zero configuration

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

### Build Command
```bash
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Add proper error handling
- Test on multiple screen sizes
- Ensure accessibility compliance

## 📈 Future Enhancements

- [ ] Add data export functionality
- [ ] Implement advanced analytics dashboard
- [ ] Add timeline visualization for research trends
- [ ] Support for additional research metrics
- [ ] Dark mode theme
- [ ] Mobile-optimized touch interactions
- [ ] Data update automation
- [ ] Institution comparison tools

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [MapLibre GL](https://maplibre.org/)
- Research data curated from academic publications
- Inspired by the global games research community

## 📞 Support

For questions, issues, or contributions, please:
- Open an issue on GitHub
- Contact the maintainers
- Check the documentation

---

**Made with ❤️ for the games research community**
