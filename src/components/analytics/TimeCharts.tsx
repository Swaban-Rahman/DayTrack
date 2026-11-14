import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card } from '../common/Card';
import type { CategoryBreakdown, EstimatedVsActual } from '../../types';
import './TimeCharts.css';

interface TimeChartsProps {
  dailyHoursData: { date: string; hours: number }[];
  categoryData: CategoryBreakdown[];
  estimatedVsActualData: EstimatedVsActual[];
  weeklyTrendData: { date: string; completed: number; planned: number }[];
}

const CATEGORY_COLORS = ['#6c63ff', '#38bdf8', '#a78bfa', '#fb923c', '#4ade80', '#fbbf24', '#f87171'];

export const TimeCharts: React.FC<TimeChartsProps> = ({
  dailyHoursData,
  categoryData,
  estimatedVsActualData,
  weeklyTrendData
}) => {
  const pieData = categoryData.map((c) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: Math.round(c.minutes / 60 * 10) / 10
  })).filter((c) => c.value > 0);

  return (
    <div className="analytics-charts-grid">
      {/* Daily Tracked Hours Bar Chart */}
      <Card title="Tracked Hours Trend" subtitle="Daily productive work in hours">
        <div className="chart-container">
          {dailyHoursData.length === 0 ? (
            <p className="no-chart-data">No data recorded for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                  formatter={(val: any) => [`${val} hours`, 'Tracked']}
                />
                <Bar dataKey="hours" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Category Time Distribution */}
      <Card title="Time by Category" subtitle="Hours spent across categories">
        <div className="chart-container">
          {pieData.length === 0 ? (
            <p className="no-chart-data">No category data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                  formatter={(val: any) => [`${val} hrs`, 'Duration']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Estimated vs Actual Time Comparison */}
      <Card title="Estimated vs Actual Duration" subtitle="Comparison in minutes for recent tasks">
        <div className="chart-container">
          {estimatedVsActualData.length === 0 ? (
            <p className="no-chart-data">No tasks tracked yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={estimatedVsActualData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="taskTitle" stroke="var(--text-muted)" fontSize={11} tickFormatter={(t) => t.length > 10 ? `${t.slice(0, 10)}…` : t} />
                <YAxis stroke="var(--text-muted)" fontSize={12} unit="m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                  formatter={(val: any) => [`${val} mins`]}
                />
                <Legend />
                <Bar dataKey="estimated" name="Planned" fill="var(--border-light)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Weekly Productivity Trend Line Chart */}
      <Card title="Task Completion Trend" subtitle="Tasks planned vs completed">
        <div className="chart-container">
          {weeklyTrendData.length === 0 ? (
            <p className="no-chart-data">No trend data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="planned" name="Planned" stroke="var(--border-light)" strokeWidth={2} dot />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="var(--accent)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};
