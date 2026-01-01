import React, { useState } from 'react';

interface MonthlyData {
  month: string;
  incoming: number;
  outgoing: number;
}

interface StockFlowAnalysisChartProps {
  data: MonthlyData[];
  loading?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INCOMING_COLOR = '#36D399'; // accent-teal
const OUTGOING_COLOR = '#5C67F4'; // accent-blue

const StockFlowAnalysisChart: React.FC<StockFlowAnalysisChartProps> = ({ data, loading = false }) => {
  const [hoveredBar, setHoveredBar] = useState<{ month: string; type: 'incoming' | 'outgoing'; value: number; x: number; y: number } | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-80">
          <div className="w-8 h-8 border-4 border-active-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-text-primary mb-1">Stock Flow Analysis</h3>
        <p className="text-sm text-text-secondary mb-4">Incoming Stock vs Outgoing Sales</p>
        <div className="flex items-center justify-center h-80">
          <p className="text-text-secondary">No data available</p>
        </div>
      </div>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.incoming, d.outgoing)),
    1000 // Minimum scale
  );
  
  // Round up to nearest 1500 for nice Y-axis ticks
  const yMax = Math.ceil(maxValue / 1500) * 1500;
  const yTicks = [0, 1500, 3000, 4500, 6000].filter(tick => tick <= yMax);
  if (yMax > 6000) {
    yTicks.push(yMax);
  }

  const chartWidth = 600;
  const chartHeight = 300;
  const padding = { top: 40, right: 40, bottom: 40, left: 60 };
  const chartAreaWidth = chartWidth - padding.left - padding.right;
  const chartAreaHeight = chartHeight - padding.top - padding.bottom;
  const barGroupWidth = chartAreaWidth / data.length;
  const barWidth = barGroupWidth * 0.35; // Each bar takes 35% of group width, leaving 30% gap
  const barSpacing = barGroupWidth * 0.15; // Space between bars in a group

  const getBarHeight = (value: number) => {
    return (value / yMax) * chartAreaHeight;
  };

  const getBarX = (monthIndex: number, type: 'incoming' | 'outgoing') => {
    const groupCenterX = padding.left + (monthIndex + 0.5) * barGroupWidth;
    if (type === 'incoming') {
      return groupCenterX - barWidth - barSpacing / 2;
    } else {
      return groupCenterX + barSpacing / 2;
    }
  };

  const handleBarMouseEnter = (e: React.MouseEvent<SVGRectElement>, month: string, type: 'incoming' | 'outgoing', value: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredBar({
      month,
      type,
      value,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleBarMouseLeave = () => {
    setHoveredBar(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
      <h3 className="text-lg font-bold text-text-primary mb-1">Stock Flow Analysis</h3>
      <p className="text-sm text-text-secondary mb-6">Incoming Stock vs Outgoing Sales</p>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: INCOMING_COLOR }} />
          <span className="text-sm text-text-primary">Incoming</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: OUTGOING_COLOR }} />
          <span className="text-sm text-text-primary">Outgoing</span>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Grid lines */}
          {yTicks.map((tick) => {
            const y = padding.top + chartAreaHeight - (tick / yMax) * chartAreaHeight;
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-text-secondary"
                >
                  {tick.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((monthData, index) => {
            const incomingHeight = getBarHeight(monthData.incoming);
            const outgoingHeight = getBarHeight(monthData.outgoing);
            const incomingX = getBarX(index, 'incoming');
            const outgoingX = getBarX(index, 'outgoing');
            const incomingY = padding.top + chartAreaHeight - incomingHeight;
            const outgoingY = padding.top + chartAreaHeight - outgoingHeight;

            return (
              <g key={monthData.month}>
                {/* Incoming bar */}
                <rect
                  x={incomingX}
                  y={incomingY}
                  width={barWidth}
                  height={incomingHeight}
                  fill={INCOMING_COLOR}
                  onMouseEnter={(e) => handleBarMouseEnter(e, monthData.month, 'incoming', monthData.incoming)}
                  onMouseLeave={handleBarMouseLeave}
                  className="cursor-pointer transition-opacity duration-200"
                  style={{
                    opacity: hoveredBar && hoveredBar.month === monthData.month && hoveredBar.type !== 'incoming' ? 0.5 : 1,
                  }}
                />
                {/* Outgoing bar */}
                <rect
                  x={outgoingX}
                  y={outgoingY}
                  width={barWidth}
                  height={outgoingHeight}
                  fill={OUTGOING_COLOR}
                  onMouseEnter={(e) => handleBarMouseEnter(e, monthData.month, 'outgoing', monthData.outgoing)}
                  onMouseLeave={handleBarMouseLeave}
                  className="cursor-pointer transition-opacity duration-200"
                  style={{
                    opacity: hoveredBar && hoveredBar.month === monthData.month && hoveredBar.type !== 'outgoing' ? 0.5 : 1,
                  }}
                />
                {/* Month label */}
                <text
                  x={padding.left + (index + 0.5) * barGroupWidth}
                  y={chartHeight - padding.bottom + 20}
                  textAnchor="middle"
                  className="text-xs fill-text-secondary"
                >
                  {monthData.month}
                </text>
              </g>
            );
          })}

          {/* Y-axis line */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={chartHeight - padding.bottom}
            stroke="#9CA3AF"
            strokeWidth="2"
          />

          {/* X-axis line */}
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={chartWidth - padding.right}
            y2={chartHeight - padding.bottom}
            stroke="#9CA3AF"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredBar && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 z-50 pointer-events-none"
          style={{
            left: `${hoveredBar.x}px`,
            top: `${hoveredBar.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-sm font-semibold text-text-primary">
            {hoveredBar.month} - {hoveredBar.type === 'incoming' ? 'Incoming' : 'Outgoing'}: {hoveredBar.value.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockFlowAnalysisChart;
