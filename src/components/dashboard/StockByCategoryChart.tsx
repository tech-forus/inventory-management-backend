import React, { useState } from 'react';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface StockByCategoryChartProps {
  data: CategoryData[];
  loading?: boolean;
}

const COLORS = ['#F45B69', '#EC5A7D', '#673AB7', '#5C67F4', '#36D399', '#6A4C93'];

const StockByCategoryChart: React.FC<StockByCategoryChartProps> = ({ data, loading = false }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-active-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-text-primary mb-1">Stock by Category</h3>
        <p className="text-sm text-text-secondary mb-4">Distribution of SKUs across top categories</p>
        <div className="flex items-center justify-center h-64">
          <p className="text-text-secondary">No data available</p>
        </div>
      </div>
    );
  }

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate angles for donut chart
  let currentAngle = -90; // Start from top
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculate path for donut segment
    const radius = 80;
    const innerRadius = 50;
    const centerX = 120;
    const centerY = 120;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const x3 = centerX + innerRadius * Math.cos(endAngleRad);
    const y3 = centerY + innerRadius * Math.sin(endAngleRad);
    const x4 = centerX + innerRadius * Math.cos(startAngleRad);
    const y4 = centerY + innerRadius * Math.sin(startAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage,
      startAngle,
      endAngle,
      index,
    };
  });

  const handleMouseEnter = (e: React.MouseEvent<SVGPathElement>, index: number, label: string, value: number) => {
    setHoveredIndex(index);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      label,
      value,
    });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltip(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative h-full">
      <h3 className="text-lg font-bold text-text-primary mb-1">Stock by Category</h3>
      <p className="text-sm text-text-secondary mb-6">Distribution of SKUs across top categories</p>

      <div className="flex items-center justify-center">
        <svg width="240" height="240" viewBox="0 0 240 240" className="overflow-visible">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.pathData}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.5}
              onMouseEnter={(e) => handleMouseEnter(e, index, segment.name, segment.value)}
              onMouseLeave={handleMouseLeave}
              className="cursor-pointer transition-opacity duration-200"
              style={{
                filter: hoveredIndex === index ? 'brightness(1.1)' : 'none',
              }}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-text-primary">{item.name}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 z-50 pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-sm font-semibold text-text-primary">
            {tooltip.label} : {tooltip.value.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockByCategoryChart;
