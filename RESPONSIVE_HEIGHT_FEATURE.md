# Responsive Calendar Height Feature

## Overview
The calendar now dynamically adjusts its height based on the window size and available space, ensuring optimal viewing experience across different screen sizes and window configurations.

## Key Features

### 🔄 Dynamic Height Adjustment
- **Viewport-based sizing**: Uses `clamp()` and `vh` units for responsive height
- **Container awareness**: Adapts to available space in Obsidian panels
- **Automatic resizing**: Responds to window resize events

### 📏 Minimum Height Constraints
- **Day readability**: Ensures dates remain readable with minimum heights
- **Flexible scaling**: Scales up and down while maintaining usability
- **Progressive degradation**: Gracefully handles very small screens

## Responsive Breakpoints

### 📱 Very Small Screens (≤400px)
- **Grid height**: 200px - 300px (35vh max)
- **Day height**: 1.8rem minimum
- **Font size**: 0.75em for compact display
- **Optimized spacing**: Reduced padding and margins

### 📱 Small Screens (401px - 600px)
- **Grid height**: 250px - 400px (40vh max)
- **Day height**: 2rem minimum
- **Font size**: 0.8em
- **Mobile-optimized**: No gaps between cells

### 📊 Medium Screens (601px - 900px)
- **Grid height**: 350px - 500px (45vh max)
- **Day height**: 2.2rem minimum
- **Font size**: 0.9em
- **Tablet-friendly**: Balanced sizing

### 🖥️ Large Screens (901px - 1199px)
- **Grid height**: 400px - 650px (50vh max)
- **Day height**: 2.8rem minimum
- **Font size**: Default (1em)
- **Desktop-optimized**: Comfortable viewing

### 🖥️ Very Large Screens (≥1200px)
- **Grid height**: 450px - 700px (55vh max)
- **Day height**: 3.2rem minimum
- **Enhanced spacing**: Maximum comfort

## Height-Based Adjustments

### Short Windows (≤600px height)
- **Compact mode**: Reduces calendar to 35vh max
- **Smaller days**: 1.8rem minimum height
- **Optimized for**: Horizontal layouts, split screens

### Tall Windows (≥800px height)
- **Expanded mode**: Uses up to 60vh of available space
- **Comfortable sizing**: Standard day heights
- **Optimized for**: Vertical layouts, full screens

## CSS Implementation

### Grid Container
```css
.calendar-grid {
  height: clamp(300px, 50vh, 600px);
  max-height: 60vh;
  grid-template-rows: auto repeat(6, 1fr);
}
```

### Responsive Days
```css
.calendar-day {
  min-height: 2.5rem;
  height: 100%;
  box-sizing: border-box;
}
```

### Dynamic Scaling
- **clamp()**: Ensures height stays within practical bounds
- **vh units**: Scales with viewport height
- **min-height**: Prevents days from becoming unreadable
- **Flexbox**: Maintains proportional scaling

## Benefits

### 👁️ Better Visibility
- Always readable dates regardless of screen size
- Optimal use of available space
- Prevents scrolling in most cases

### 📱 Multi-Device Support
- Works seamlessly on phones, tablets, and desktops
- Adapts to Obsidian's panel resizing
- Handles window splitting and multi-monitor setups

### 🎯 User Experience
- **Intuitive**: Calendar feels native to the available space
- **Consistent**: Maintains usability across all sizes
- **Responsive**: Smooth transitions when resizing

## Testing Scenarios

1. **Mobile portrait**: Very compact, all dates visible
2. **Mobile landscape**: Optimized for width constraints
3. **Tablet**: Balanced size for touch interaction
4. **Desktop**: Full-featured comfortable view
5. **Split-screen**: Adapts to reduced available space
6. **Obsidian panels**: Works in sidebars and main areas

The calendar now provides an optimal viewing experience regardless of how you use Obsidian!