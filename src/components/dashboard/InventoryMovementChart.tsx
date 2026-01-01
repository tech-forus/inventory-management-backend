import React, { useState, useRef } from 'react';
import { formatNumber } from '../../utils/formatters';

interface DayData {
  day: string;
  dayLabel: string;
  incoming: number;
  outgoing: number;
}

interface InventoryMovementChartProps {
  data: DayData[];
  loading?: boolean;
}

const InventoryMovementChart: React.FC<InventoryMovementChartProps> = ({ data, loading = false }) => {
  const [width, setWidth] = useState(600);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; incoming: number; outgoing: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      const updateWidth = () => {
        if (containerRef.current) {
          setWidth(containerRef.current.offsetWidth - 48); // 48px for padding (24px * 2) or similar adjustment to fit inside
        }
      };

      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Inventory Movement</h3>
        <p className="text-sm text-gray-500 mb-4">Incoming vs Outgoing stock over last 7 days</p>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  // Calculate totals for legend
  const totalIncoming = data.reduce((sum, day) => sum + day.incoming, 0);
  const totalOutgoing = data.reduce((sum, day) => sum + day.outgoing, 0);

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...data.map(day => Math.max(day.incoming, day.outgoing)),
    1
  );
  const yAxisMax = Math.ceil(maxValue * 1.2); // Add 20% padding
  const yAxisSteps = 5;
  const stepValue = yAxisMax / yAxisSteps;

  // Chart dimensions
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate points for lines
  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - (value / yAxisMax) * chartHeight;

  // Function to create smooth curve path using cubic Bezier curves
  const createSmoothPath = (values: number[]) => {
    if (values.length === 0) return '';
    if (values.length === 1) {
      const x = getX(0);
      const y = getY(values[0]);
      return `M ${x} ${y}`;
    }

    const points = values.map((value, index) => ({
      x: getX(index),
      y: getY(value),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const prev = i > 0 ? points[i - 1] : current;
      const afterNext = i < points.length - 2 ? points[i + 2] : next;

      // Calculate control points for smooth curve using Catmull-Rom spline approach
      const cp1x = current.x + (next.x - prev.x) / 6;
      const cp1y = current.y + (next.y - prev.y) / 6;
      const cp2x = next.x - (afterNext.x - current.x) / 6;
      const cp2y = next.y - (afterNext.y - current.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    return path;
  };

  // Generate smooth path data for incoming line
  const incomingPath = createSmoothPath(data.map(day => day.incoming));

  // Generate smooth path data for outgoing line
  const outgoingPath = createSmoothPath(data.map(day => day.outgoing));

  // Generate area paths (smooth curve + bottom line + close path)
  const incomingAreaPath = `${incomingPath} L ${getX(data.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;
  const outgoingAreaPath = `${outgoingPath} L ${getX(data.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative h-full"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-1">Inventory Movement</h3>
      <p className="text-sm text-gray-500 mb-4">Incoming vs Outgoing stock over last 7 days</p>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm text-gray-700">Incoming ({formatNumber(totalIncoming)})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-gray-700">Outgoing ({formatNumber(totalOutgoing)})</span>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto relative">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Y-axis grid lines and labels */}
          {Array.from({ length: yAxisSteps + 1 }).map((_, i) => {
            const value = stepValue * (yAxisSteps - i);
            const y = getY(value);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((day, index) => {
            const x = getX(index);
            return (
              <text
                key={index}
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {day.dayLabel}
              </text>
            );
          })}

          {/* Area fills */}
          <path
            d={incomingAreaPath}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="none"
          />
          <path
            d={outgoingAreaPath}
            fill="rgba(239, 68, 68, 0.2)"
            stroke="none"
          />

          {/* Lines */}
          <path
            d={incomingPath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={outgoingPath}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover indicator line */}
          {hoveredIndex !== null && (
            <line
              x1={getX(hoveredIndex)}
              y1={padding.top}
              x2={getX(hoveredIndex)}
              y2={height - padding.bottom}
              stroke="#9CA3AF"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />
          )}

          {/* Data points */}
          {data.map((day, index) => {
            const incomingX = getX(index);
            const incomingY = getY(day.incoming);
            const outgoingX = getX(index);
            const outgoingY = getY(day.outgoing);
            return (
              <g key={index}>
                {/* Invisible hover area */}
                <rect
                  x={getX(index) - chartWidth / (data.length - 1) / 2}
                  y={padding.top}
                  width={chartWidth / (data.length - 1)}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={(e) => {
                    if (containerRef.current) {
                      const containerRect = containerRef.current.getBoundingClientRect();
                      const x = getX(index);
                      setHoveredIndex(index);
                      setTooltip({
                        x: containerRect.left + x,
                        y: containerRect.top + padding.top,
                        day: day.dayLabel,
                        incoming: day.incoming,
                        outgoing: day.outgoing,
                      });
                    }
                  }}
                  onMouseMove={(e) => {
                    if (containerRef.current && hoveredIndex === index) {
                      const containerRect = containerRef.current.getBoundingClientRect();
                      const x = getX(index);
                      setTooltip({
                        x: containerRect.left + x,
                        y: containerRect.top + padding.top,
                        day: day.dayLabel,
                        incoming: day.incoming,
                        outgoing: day.outgoing,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setTooltip(null);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <circle
                  cx={incomingX}
                  cy={incomingY}
                  r="4"
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle
                  cx={outgoingX}
                  cy={outgoingY}
                  r="4"
                  fill="#EF4444"
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && containerRef.current && (
        <div
          className="absolute bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 z-50 pointer-events-none whitespace-nowrap"
          style={{
            left: `${tooltip.x - (containerRef.current.getBoundingClientRect().left)}px`,
            top: `${tooltip.y - (containerRef.current.getBoundingClientRect().top) + 25}px`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <div className="text-sm font-semibold text-gray-900 mb-1">{tooltip.day}</div>
          <div className="text-sm text-blue-600">in : {formatNumber(tooltip.incoming)}</div>
          <div className="text-sm text-red-600">out : {formatNumber(tooltip.outgoing)}</div>
        </div>
      )}
    </div>
  );
};

export default InventoryMovementChart;

