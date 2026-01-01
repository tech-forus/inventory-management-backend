# Typography System - ERP Dashboard

## Font Family Recommendation

**Primary Font: Inter**

**Justification:**
- Designed specifically for computer screens with excellent readability at small sizes
- Superior numeric character design (0, 1, 6, 8, 9 are highly distinguishable)
- Optimized for UI text with balanced letter spacing
- Excellent weight range (300-700) for hierarchy
- Industry standard for enterprise dashboards (used by GitHub, Figma, Linear)
- Already loaded in project via Google Fonts

**Font Stack:**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

---

## Typography Scale

| Text Type | Font Size (px) | Weight | Line Height | Letter Spacing | Usage |
|-----------|---------------|--------|-------------|----------------|-------|
| **Page & Layout** |
| Page Title | 28.8px | 600 | 1.2 | -0.01em | Main page headings |
| Section Subtitle | 16.8px | 400 | 1.5 | 0 | Descriptions below titles |
| **Filters & Inputs** |
| Search Input | 15.6px | 500 | 1.4 | 0.05em | Search bar text |
| Dropdown Value | 15.6px | 500 | 1.4 | 0 | Selected dropdown option |
| Placeholder | 15.6px | 400 | 1.4 | 0.05em | Input placeholders |
| **Table** |
| Table Header | 14.4px | 600 | 1.4 | 0.1em | Column headers (uppercase) |
| Table Body - Primary | 16.8px | 600 | 1.4 | 0 | Item Name (main identifier) |
| Table Body - Secondary | 15.6px | 400 | 1.4 | 0 | SKU ID, Model, HSN Code |
| Brand Name | 15.6px | 600 | 1.4 | 0.05em | Brand column (uppercase) |
| **Numbers & Status** |
| Stock Quantity | 18px | 600 | 1.3 | 0 | Numeric values (200, 2,000) |
| Progress Bar Label | 14.4px | 500 | 1.4 | 0 | Labels near progress bars |
| Status Badge | 13.2px | 600 | 1.3 | 0.08em | IN STOCK, LOW STOCK (uppercase) |

---

## Spacing Rules

- **Base Font Size:** 19.2px (body/html) - 20% increase from 16px
- **Table Row Height:** 56-60px (min-height)
- **Table Text Line Height:** 1.4 (56% of font size)
- **Vertical Rhythm:** 4px base unit

---

## Tailwind Utility Classes

### Custom Typography Utilities

```css
/* Page & Layout */
.text-page-title {
  font-size: 28.8px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.text-section-subtitle {
  font-size: 16.8px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0;
}

/* Filters & Inputs */
.text-input {
  font-size: 15.6px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.05em;
}

.text-dropdown {
  font-size: 15.6px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0;
}

.text-placeholder {
  font-size: 15.6px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0.05em;
}

/* Table */
.text-table-header {
  font-size: 14.4px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.text-table-primary {
  font-size: 16.8px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
}

.text-table-secondary {
  font-size: 15.6px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0;
}

.text-brand {
  font-size: 15.6px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Numbers & Status */
.text-stock-quantity {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}

.text-progress-label {
  font-size: 14.4px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0;
}

.text-status-badge {
  font-size: 13.2px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

### Tailwind Arbitrary Values (Recommended)

For inline usage without custom classes:

```tsx
// Page Title
<h1 className="text-[28.8px] font-semibold leading-[1.2] tracking-[-0.01em]">SKU Management</h1>

// Section Subtitle
<p className="text-[16.8px] font-normal leading-[1.5]">Detailed tracking and administration</p>

// Search Input
<input className="text-[15.6px] font-medium leading-[1.4] tracking-[0.05em]" />

// Table Header
<th className="text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase">SKU ID</th>

// Table Body - Primary (Item Name)
<td className="text-[16.8px] font-semibold leading-[1.4]">LED Light 4 Driver 1000</td>

// Table Body - Secondary
<td className="text-[15.6px] font-normal leading-[1.4]">HHEZELRSSR5H2T</td>

// Brand Name
<span className="text-[15.6px] font-semibold leading-[1.4] tracking-[0.05em] uppercase">TECHFORUS</span>

// Stock Quantity
<span className="text-[18px] font-semibold leading-[1.3]">2,000</span>

// Status Badge
<span className="text-[13.2px] font-semibold leading-[1.3] tracking-[0.08em] uppercase">IN STOCK</span>
```

---

## Implementation Examples

### Table Row Structure

```tsx
<tr className="min-h-[56px]">
  {/* SKU ID - Secondary */}
  <td className="px-10 py-8 text-center">
    <span className="text-[13px] font-normal leading-[1.4]">
      HHEZELRSSR5H2T
    </span>
  </td>
  
  {/* Item Name - Primary */}
  <td className="px-10 py-8 text-center">
    <span className="text-[14px] font-semibold leading-[1.4]">
      LED Light 4 Driver 1000
    </span>
  </td>
  
  {/* Model Number - Secondary */}
  <td className="px-10 py-8 text-center">
    <span className="text-[13px] font-normal leading-[1.4]">
      JDJ30021HH
    </span>
  </td>
  
  {/* Brand - Brand Style */}
  <td className="px-10 py-8 text-center">
    <span className="text-[13px] font-semibold leading-[1.4] tracking-[0.05em] uppercase">
      TECHFORUS
    </span>
  </td>
  
  {/* Stock Quantity - Numbers */}
  <td className="px-10 py-8 text-center">
    <span className="text-[15px] font-semibold leading-[1.3]">
      2,000
    </span>
  </td>
  
  {/* Status Badge */}
  <td className="px-10 py-8 text-center">
    <span className="text-[11px] font-semibold leading-[1.3] tracking-[0.08em] uppercase">
      IN STOCK
    </span>
  </td>
</tr>
```

### Table Header

```tsx
<thead>
  <tr className="bg-slate-50/70 border-b border-slate-100">
    <th className="px-10 py-7 text-[12px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-center">
      SKU ID
    </th>
    <th className="px-10 py-7 text-[12px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-center">
      ITEM NAME
    </th>
    {/* ... */}
  </tr>
</thead>
```

### Search Input

```tsx
<input
  type="text"
  placeholder="SEARCH SKU ID, ITEM NAME..."
  className="text-[13px] font-medium leading-[1.4] tracking-[0.05em] placeholder:text-[13px] placeholder:font-normal placeholder:tracking-[0.05em]"
/>
```

### Dropdown Select

```tsx
<select className="text-[13px] font-medium leading-[1.4]">
  <option>ALL PRODUCT CATEGORIES</option>
</select>
```

---

## CSS Implementation (Alternative)

If using pure CSS instead of Tailwind arbitrary values:

```css
/* Base */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Page & Layout */
.page-title {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
}

/* Table */
.table-header {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.table-primary {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.table-secondary {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
}

/* Numbers */
.stock-quantity {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

/* Status */
.status-badge {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

---

## Notes

1. **Numeric Readability:** Inter's numeric characters are optimized for quick scanning. The 15px size for stock quantities ensures numbers like "2,000" and "10,000" are instantly distinguishable.

2. **Table Row Height:** Minimum 56px ensures comfortable reading with 1.4 line-height. Adjust padding (py-8 = 32px) to maintain visual balance.

3. **Letter Spacing:** Slight negative tracking (-0.01em) on page titles improves readability at larger sizes. Increased tracking (0.1em) on uppercase headers improves scan speed.

4. **Weight Hierarchy:** 600 (semibold) for emphasis, 400 (normal) for body text. Avoid 700 (bold) except for critical alerts.

5. **Implementation:** Use Tailwind arbitrary values `text-[13px]` for precise control. Avoid rem/em units to maintain consistency across zoom levels.

